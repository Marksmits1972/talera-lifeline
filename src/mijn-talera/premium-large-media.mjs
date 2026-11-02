/* TALERA Free -> Premium: bounded, resumable upload of large media.
 * Only local Blob slices (8 MiB) are hashed/sent; never load the entire video.
 * Existing local stories/files are never modified.
 */
export const LARGE_PART_BYTES=8*1024*1024;
export const LARGE_MEDIA_LIMIT=2*1024*1024*1024;
export const LARGE_THRESHOLD=25*1024*1024;
const digest=async(crypto,bytes)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
const encoder=new TextEncoder();
const uuidFromDigest=hex=>{
 const arr=[...hex.match(/.{2}/g).slice(0,16)].map(x=>parseInt(x,16));
 arr[6]=(arr[6]&15)|64;arr[8]=(arr[8]&63)|128;
 const id=arr.map(x=>x.toString(16).padStart(2,'0')).join('');
 return [id.slice(0,8),id.slice(8,12),id.slice(12,16),id.slice(16,20),id.slice(20)].join('-');
};
const fetchJson=async(fetcher,path,init)=>{
 const response=await fetcher(path,{credentials:'same-origin',cache:'no-store',...init});
 const body=await response?.json().catch(()=>null);
 if(!response?.ok||body?.ok!==true)throw Error(body?.reason||'multipart_request_failed');
 return body;
};
export async function createLargeMediaManifest(media,{crypto}={}){
 const blob=media?.blob;
 if(!(blob instanceof Blob)||!crypto?.subtle||typeof media?.key!=='string'||typeof media?.mime!=='string')throw Error('invalid_large_media');
 if(blob.size<=LARGE_THRESHOLD||blob.size>LARGE_MEDIA_LIMIT)throw Error('large_media_size_not_supported');
 const parts=[],count=Math.ceil(blob.size/LARGE_PART_BYTES);
 for(let number=1;number<=count;number++){
  const start=(number-1)*LARGE_PART_BYTES,end=Math.min(blob.size,start+LARGE_PART_BYTES);
  const bytes=await blob.slice(start,end).arrayBuffer();
  parts.push({part_number:number,byte_size:bytes.byteLength,sha256:await digest(crypto,bytes)});
 }
 const canonical={byteSize:blob.size,contentType:media.mime,partSize:LARGE_PART_BYTES,
  parts:parts.map(x=>({partNumber:x.part_number,byteSize:x.byte_size,sha256:x.sha256}))};
 const fingerprint=await digest(crypto,encoder.encode(JSON.stringify(canonical)));
 const idHash=await digest(crypto,encoder.encode(media.key+':'+media.mime+':'+blob.size+':'+fingerprint));
 return {mediaId:uuidFromDigest(idHash),key:media.key,mime:media.mime,size:blob.size,
  large:true,fingerprint,parts};
}
export async function uploadLargePremiumMedia({media,manifest,fetcher=fetch,crypto,ownerMatches=()=>true}={}){
 if(!crypto?.subtle||!manifest?.large||media?.blob?.size!==manifest.size)throw Error('invalid_large_upload');
 const permitted=()=>ownerMatches()===true;
 if(!permitted())return {ok:false,reason:'account_changed'};
 const base='/api/premium/cloud/multipart/'+manifest.mediaId;
 const started=await fetchJson(fetcher,base+'/start',{method:'POST',
  headers:{'content-type':'application/json'},body:JSON.stringify({
   byteSize:manifest.size,contentType:manifest.mime,fingerprint:manifest.fingerprint,sourceKey:manifest.key})});
 if(started.reason==='already_stored')return {ok:true,reason:'already_stored'};
 if(started.partSize!==LARGE_PART_BYTES||started.partCount!==manifest.parts.length)throw Error('invalid_upload_session');
 const status=await fetchJson(fetcher,base+'/status',{method:'GET'});
 if(status.partCount!==manifest.parts.length||!Array.isArray(status.uploaded))throw Error('invalid_upload_status');
 const existing=new Map();
 for(const part of status.uploaded){
  if(!Number.isInteger(part.number)||existing.has(part.number))throw Error('invalid_upload_status');
  existing.set(part.number,part.sha256);
 }
 for(const part of manifest.parts){
  if(!permitted())return {ok:false,reason:'account_changed'};
  if(existing.has(part.part_number)){
   if(existing.get(part.part_number)!==part.sha256)throw Error('part_conflict');
   continue;
  }
  const start=(part.part_number-1)*LARGE_PART_BYTES;
  const bytes=await media.blob.slice(start,start+part.byte_size).arrayBuffer();
  // Never trust that a Blob has remained unchanged since its first scan.
  if(bytes.byteLength!==part.byte_size||await digest(crypto,bytes)!==part.sha256)throw Error('local_media_changed');
  await fetchJson(fetcher,base+'/part/'+part.part_number,{method:'PUT',
   headers:{'content-type':'application/octet-stream','x-content-sha256':part.sha256},body:bytes});
 }
 if(!permitted())return {ok:false,reason:'account_changed'};
 const completed=await fetchJson(fetcher,base+'/complete',{method:'POST'});
 if(completed.reason!=='stored'||completed.digestKind!=='part-sha256-v1'||completed.byteSize!==manifest.size)throw Error('completion_not_verified');
 return {ok:true,reason:'stored'};
}
