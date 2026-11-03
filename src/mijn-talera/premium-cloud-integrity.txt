/* TALERA Premium: compare the authenticated private cloud bytes with their
 * stored manifest checksums, without opening or writing Free IndexedDB.
 * This verifies cloud integrity, NOT equality with an unavailable local original.
 */
import {previewPremiumCloudRestore} from './premium-cloud-restore-preview.mjs';
import {fetchPremiumManifestIds} from './premium-sync-audit.mjs';
import {createPremiumManifest} from './premium-indexeddb-bridge.mjs';

const PART=8*1024*1024,MAX=2*1024*1024*1024,SMALL=25*1024*1024;
const HEX=/^[0-9a-f]{64}$/i,UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encoder=new TextEncoder();
const digest=async(crypto,value)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',value))]
 .map(v=>v.toString(16).padStart(2,'0')).join('');
const uuidFromHex=hex=>{
 const values=[...hex.match(/.{2}/g).slice(0,16)].map(x=>parseInt(x,16));
 values[6]=(values[6]&15)|64;values[8]=(values[8]&63)|128;
 const s=values.map(v=>v.toString(16).padStart(2,'0')).join('');
 return [s.slice(0,8),s.slice(8,12),s.slice(12,16),s.slice(16,20),s.slice(20)].join('-');
};
async function bounded(response,max){
 if(!response?.body)throw Error('cloud_response_missing');
 const reader=response.body.getReader(),parts=[];let size=0;
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;
   if(size>max){await reader.cancel();throw Error('cloud_response_too_large')}
   parts.push(value);
  }
 }finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;
 for(const part of parts){bytes.set(part,offset);offset+=part.byteLength}
 return bytes;
}
async function getJson(fetcher,path){
 const response=await fetcher(path,{method:'GET',credentials:'same-origin',cache:'no-store'});
 if(!response?.ok)throw Error('cloud_access_unavailable');
 return response.json();
}
async function readRange(fetcher,path,start,end,total,active){
 if(!active())throw Error('account_changed');
 const response=await fetcher(path,{method:'GET',credentials:'same-origin',cache:'no-store',
  headers:{range:'bytes='+start+'-'+(end-1)}});
 if(response?.status!==206||response.headers?.get('content-range')!=='bytes '+start+'-'+(end-1)+'/'+total)
  throw Error('invalid_cloud_range');
 const bytes=await bounded(response,end-start);
 if(bytes.length!==end-start)throw Error('incomplete_cloud_media');
 return bytes;
}
export async function verifyPremiumCloudBytesReadOnly({
 fetcher,crypto,expectedAccountId,accountMatches=()=>false,online=()=>true,onProgress=()=>{}
}={}){
 if(typeof fetcher!=='function'||!crypto?.subtle||!UUID.test(expectedAccountId||''))
  return {phase:'not_enabled',cloudBytesVerified:false};
 const active=()=>accountMatches()===true&&online()===true;
 if(!active())return {phase:'not_enabled',cloudBytesVerified:false};
 let verifiedMedia=0,verifiedRecords=0,verifiedBytes=0;
 try{
  const preview=await previewPremiumCloudRestore({fetcher,expectedAccountId,online});
  if(preview.phase!=='manifest_available'||!preview.originalKeysVerified||
    !(preview.atomicRestoreEligible||preview.largeRestoreEligible))
   return {phase:'not_ready',cloudBytesVerified:false,preview};
  const [media,records]=await Promise.all([
   fetchPremiumManifestIds(fetcher,'media'),fetchPremiumManifestIds(fetcher,'records')
  ]);
  if(media.size!==preview.media||records.size!==preview.stories+preview.comments)
   throw Error('cloud_archive_changed');
  for(const item of media.values()){
   if(!active())throw Error('account_changed');
   const size=item.byte_size,key=item.source_key,kind=item.digest_kind;
   if(typeof key!=='string'||key.length<1||key.length>240||
      !Number.isSafeInteger(size)||size<1||size>MAX||!HEX.test(item.sha256||''))
    throw Error('invalid_cloud_manifest');
   const path='/api/premium/cloud/media/'+item.media_id,parts=[],raw=[];
   for(let at=0,n=1;at<size;at+=PART,n++){
    const end=Math.min(size,at+PART);
    const bytes=await readRange(fetcher,path,at,end,size,active);
    if(kind==='part-sha256-v1')
     parts.push({partNumber:n,byteSize:bytes.length,sha256:await digest(crypto,bytes)});
    else if(kind==='full-sha256'&&size<=SMALL)raw.push(bytes);
    else throw Error('unsupported_cloud_digest');
   }
   if(!active())throw Error('account_changed');
   if(kind==='full-sha256'){
    const blob=new Blob(raw,{type:item.content_type});
    if(blob.size!==size||await digest(crypto,await blob.arrayBuffer())!==item.sha256)
     throw Error('cloud_checksum_mismatch');
    const actual=await createPremiumManifest({key,blob},{crypto});
    if(actual.mediaId!==item.media_id)throw Error('cloud_media_identity_mismatch');
   }else{
    if(size<=SMALL)throw Error('invalid_cloud_manifest');
    const canonical={byteSize:size,contentType:item.content_type,partSize:PART,parts};
    const fingerprint=await digest(crypto,encoder.encode(JSON.stringify(canonical)));
    if(fingerprint!==item.sha256)throw Error('cloud_checksum_mismatch');
    const idHash=await digest(crypto,encoder.encode(key+':'+item.content_type+':'+size+':'+fingerprint));
    if(uuidFromHex(idHash)!==item.media_id)throw Error('cloud_media_identity_mismatch');
   }
   verifiedMedia++;verifiedBytes+=size;onProgress({verifiedMedia,verifiedRecords,verifiedBytes});
  }
  for(const item of records.values()){
   if(!active())throw Error('account_changed');
   if(!Number.isSafeInteger(item.byte_size)||item.byte_size<1||item.byte_size>1048576||
     !HEX.test(item.sha256||'')||!['story','comment_archive'].includes(item.kind))
    throw Error('invalid_cloud_record');
   const response=await fetcher('/api/premium/cloud/records/'+item.kind+'/'+item.record_id,
    {method:'GET',credentials:'same-origin',cache:'no-store'});
   if(response?.status!==200)throw Error('cloud_record_unavailable');
   const bytes=await bounded(response,item.byte_size);
   if(bytes.byteLength!==item.byte_size||await digest(crypto,bytes)!==item.sha256)
    throw Error('cloud_checksum_mismatch');
   verifiedRecords++;verifiedBytes+=bytes.byteLength;
   onProgress({verifiedMedia,verifiedRecords,verifiedBytes});
  }
  if(!active())throw Error('account_changed');
  const [rights,consent]=await Promise.all([
   getJson(fetcher,'/api/me/entitlements'),getJson(fetcher,'/api/premium/cloud/consent')
  ]);
  if(rights?.accountId!==expectedAccountId||rights.rights?.permissions?.cloud_storage!==true||
   rights.rights?.available?.cloud_storage!==true||consent?.consent?.enabled!==true)
   throw Error('cloud_permission_changed');
  return {phase:'cloud_bytes_verified',cloudBytesVerified:true,
   verifiedMedia,verifiedRecords,verifiedBytes,localOriginalsCompared:false,archiveComplete:false};
 }catch(error){
  return {phase:'needs_attention',cloudBytesVerified:false,verifiedMedia,verifiedRecords,
   verifiedBytes,reason:error?.message||'cloud_verification_failed'};
 }
}
