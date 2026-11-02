/* Read-only remote restoration proof for the SAME local Free archive.
 * The verified Premium session / consent / owner preflight happens before reads.
 * Never deletes, restores over, or changes a single local record.
 */
import {auditPremiumSync} from './premium-sync-audit.mjs';
import {listLocalPremiumMedia,createPremiumManifest} from './premium-indexeddb-bridge.mjs';
import {listLocalPremiumRecords,createPremiumRecordSnapshot} from './premium-records-bridge.mjs';
import {createLargeMediaManifest,LARGE_THRESHOLD,LARGE_PART_BYTES} from './premium-large-media.mjs';
const hash=async(crypto,bytes)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
async function bytesBounded(response,limit){
 if(!response?.body)throw Error('missing_remote_body');
 const reader=response.body.getReader(),parts=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('oversized_remote_body')}parts.push(value)}
 }finally{reader.releaseLock()}
 const out=new Uint8Array(size);let offset=0;
 for(const part of parts){out.set(part,offset);offset+=part.byteLength}
 return out;
}
export async function verifyPremiumRemoteBytes({indexedDB,crypto,fetcher,expectedAccountId,ownerMatches,online=()=>true}={}){
 const allowed=()=>typeof ownerMatches==='function'&&ownerMatches()===true&&online();
 const result=await auditPremiumSync({indexedDB,crypto,fetcher,expectedAccountId,ownerMatches,online});
 if(result.phase!=='manifest_matched')return {...result,verifiedObjects:false};
 if(!allowed())return {phase:'not_enabled',verifiedObjects:false};
 const [media,records]=await Promise.all([listLocalPremiumMedia({indexedDB}),listLocalPremiumRecords({indexedDB})]);
 let verifiedMedia=0,verifiedRecords=0;
 const get=async(url,headers)=>{
  if(!allowed())throw Error('verification_interrupted');
  return fetcher(url,{method:'GET',credentials:'same-origin',cache:'no-store',headers});
 };
 try{
  for(const file of media){
   if(!allowed())throw Error('verification_interrupted');
   const manifest=file.size>LARGE_THRESHOLD?
    await createLargeMediaManifest(file,{crypto}):await createPremiumManifest(file,{crypto});
   const path='/api/premium/cloud/media/'+manifest.mediaId;
   for(let start=0;start<file.size;start+=LARGE_PART_BYTES){
    if(!allowed())throw Error('verification_interrupted');
    const end=Math.min(file.size,start+LARGE_PART_BYTES);
    const [local,remote]=await Promise.all([
     file.blob.slice(start,end).arrayBuffer(),
     get(path,{range:'bytes='+start+'-'+(end-1)})
    ]);
    if(remote.status!==206||remote.headers.get('content-range')!=='bytes '+start+'-'+(end-1)+'/'+file.size)
     throw Error('invalid_remote_range');
    const remoteBytes=await bytesBounded(remote,end-start);
    if(remoteBytes.byteLength!==end-start||await hash(crypto,local)!==await hash(crypto,remoteBytes))
     throw Error('remote_media_mismatch');
   }
   verifiedMedia++;
  }
  for(const record of records){
   if(!allowed())throw Error('verification_interrupted');
   const snapshot=await createPremiumRecordSnapshot(record,{crypto});
   const response=await get('/api/premium/cloud/records/'+snapshot.kind+'/'+snapshot.id);
   if(response.status!==200)throw Error('remote_record_missing');
   const bytes=await bytesBounded(response,1048576);
   if(bytes.byteLength!==snapshot.bytes.length||await hash(crypto,bytes)!==snapshot.sha256)
    throw Error('remote_record_mismatch');
   verifiedRecords++;
  }
 }catch(error){
  return {phase:'needs_attention',verifiedObjects:false,verifiedMedia,verifiedRecords,
   reason:error?.message||'restore_verification_failed'};
 }
 return {phase:'readback_verified',verifiedObjects:true,verifiedMedia,verifiedRecords};
}
