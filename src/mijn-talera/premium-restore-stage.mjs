/* TALERA Premium - stage large private media in origin-private file storage.
 * The existing Free IndexedDB is never used until every cloud object passes
 * integrity checks. Reuse only complete, reverified staged objects on retry.
 * No second database, no network writes, no public URLs.
 */
import {createLargeMediaManifest,LARGE_THRESHOLD} from './premium-large-media.mjs';
export const RESTORE_CHUNK_BYTES=8*1024*1024;
export const RESTORE_STAGING_LIMIT=4*1024*1024*1024;
const ROOT='talera-premium-restore-stage-v1';
const MEDIA_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH=/^[a-f0-9]{64}$/i;
const fail=x=>{throw Error(x)};
const hex=buffer=>[...new Uint8Array(buffer)].map(v=>v.toString(16).padStart(2,'0')).join('');
async function bounded(response,limit){
 if(response?.status!==206||!response.body)fail('invalid_remote_range');
 const reader=response.body.getReader(),chunks=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;
  total+=value.byteLength;if(total>limit){await reader.cancel();fail('remote_chunk_too_large')}chunks.push(value)}
 }finally{reader.releaseLock()}
 const out=new Uint8Array(total);let at=0;
 for(const chunk of chunks){out.set(chunk,at);at+=chunk.byteLength}
 if(total!==limit)fail('remote_chunk_incomplete');
 return out;
}
export function validateStagedMedia(item){
 return MEDIA_ID.test(item?.media_id||'')&&
  typeof item.source_key==='string'&&item.source_key.length>0&&item.source_key.length<=240&&
  Number.isSafeInteger(item.byte_size)&&item.byte_size>0&&item.byte_size<=2*1024*1024*1024&&
  typeof item.content_type==='string'&&HASH.test(item.sha256||'')&&
  (item.digest_kind==='full-sha256'||item.digest_kind==='part-sha256-v1');
}
async function validateBlob(blob,item,crypto){
 if(blob.size!==item.byte_size)return false;
 if(item.digest_kind==='full-sha256'){
  if(blob.size>25*1024*1024)return false; // Never digest a multi-GB file in memory.
  const actual=hex(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()));
  return actual===item.sha256;
 }
 if(blob.size<=LARGE_THRESHOLD)return false;
 const verified=await createLargeMediaManifest({key:item.source_key,mime:item.content_type,
  size:blob.size,blob},{crypto});
 return verified.mediaId===item.media_id&&verified.fingerprint===item.sha256;
}
export async function createPremiumRestoreStage({storage,crypto,fetcher,accountId,active,onProgress=()=>{}}={}){
 if(!storage?.getDirectory||!crypto?.subtle||typeof fetcher!=='function'||!MEDIA_ID.test(accountId||''))
  throw Error('private_staging_unavailable');
 const root=await storage.getDirectory();
 const shared=await root.getDirectoryHandle(ROOT,{create:true});
 const scope=await shared.getDirectoryHandle(accountId,{create:true});
 let current=0;
 const stage=async item=>{
  if(!active())fail('account_changed');
  if(!validateStagedMedia(item))fail('invalid_media_manifest');
  const handle=await scope.getFileHandle(item.media_id,{create:true});
  let previous=await handle.getFile();
  if(previous.size===item.byte_size){
   try{if(await validateBlob(previous,item,crypto)){current+=previous.size;
    onProgress({bytes:current,key:item.source_key,resumed:true});
    return {store:'files',key:item.source_key,value:{key:item.source_key,blob:previous}};
   }}catch{}
  }
  // A partially written file has no trusted checkpoint. Restart this file only.
  // Other completely verified videos can still be reused after interruption.
  const writer=await handle.createWritable({keepExistingData:false});
  try{
   for(let offset=0;offset<item.byte_size;offset+=RESTORE_CHUNK_BYTES){
    if(!active())fail('account_changed');
    const end=Math.min(item.byte_size,offset+RESTORE_CHUNK_BYTES);
    const res=await fetcher('/api/premium/cloud/media/'+item.media_id,{
     method:'GET',credentials:'same-origin',cache:'no-store',
     headers:{range:'bytes='+offset+'-'+(end-1)}
    });
    if(res?.status!==206||res.headers.get('content-range')!=='bytes '+offset+'-'+(end-1)+'/'+item.byte_size)
      fail('invalid_remote_range');
    const bytes=await bounded(res,end-offset);
    if(!active())fail('account_changed');
    await writer.write(bytes);
    current+=bytes.byteLength;
    onProgress({bytes:current,key:item.source_key,resumed:false});
   }
   await writer.close();
  }catch(error){
   try{await writer.abort()}catch{}
   throw error;
  }
  previous=await handle.getFile();
  if(!active())fail('account_changed');
  if(!await validateBlob(previous,item,crypto)){
   try{await scope.removeEntry(item.media_id)}catch{}
   fail('cloud_media_checksum_mismatch');
  }
  return {store:'files',key:item.source_key,value:{key:item.source_key,blob:previous}};
 };
 const cleanup=async items=>{
  for(const item of items){
   if(MEDIA_ID.test(item.media_id||''))try{await scope.removeEntry(item.media_id)}catch{}
  }
  try{await shared.removeEntry(accountId)}catch{}
 };
 return {stage,cleanup};
}
