/* Read-only private archive bridge: Free's existing stories + saved comments.
 * Does not post comments socially, alter IndexedDB or add a second database.
 */
const DB_NAME='talera-lifeline-dev-local-v1';
const COMMENT_PREFIX='talera-thread-archive-v1:';
const requestResult=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('local_read_failed'))});
const idHex=arr=>[...arr].map(n=>n.toString(16).padStart(2,'0')).join('');
const encode=new TextEncoder();
const MAX=1048576;
export async function listLocalPremiumRecords({indexedDB,dbName=DB_NAME}={}){
 if(!indexedDB)throw Error('indexeddb_unavailable');
 const db=await new Promise((resolve,reject)=>{
  const req=indexedDB.open(dbName,1);
  req.onupgradeneeded=()=>{req.transaction.abort();reject(Error('free_archive_not_found'))};
  req.onerror=()=>reject(req.error||Error('local_archive_unavailable'));
  req.onsuccess=()=>resolve(req.result);
 });
 try{
  if(!db.objectStoreNames.contains('stories')||!db.objectStoreNames.contains('files'))throw Error('free_archive_incomplete');
  const tx=db.transaction(['stories','files'],'readonly');
  const [stories,files]=await Promise.all([requestResult(tx.objectStore('stories').getAll()),requestResult(tx.objectStore('files').getAll())]);
  if(stories.length>200000||files.length>200000)throw Error('archive_too_large');
  const records=[];
  for(const story of stories){
   if(typeof story?.id!=='string'||!story.id||story.id.length>192||!Array.isArray(story.items||[]))throw Error('invalid_free_story');
   records.push({kind:'story',sourceKey:'story:'+story.id,record:story});
  }
  for(const file of files){
   if(typeof file?.key!=='string'||!file.key.startsWith(COMMENT_PREFIX))continue;
   if(!(file.blob instanceof Blob)||file.blob.size>10000)throw Error('invalid_comment_archive');
   let row;
   try{row=JSON.parse(await file.blob.text())}catch{throw Error('invalid_comment_archive')}
   if(typeof row?.localId!=='string'||!row.localId||row.localId.length>192||
      typeof row.comment?.id!=='string'||typeof row.comment?.body!=='string')throw Error('invalid_comment_archive');
   const expected=COMMENT_PREFIX+encodeURIComponent(row.localId)+':'+encodeURIComponent(row.comment.id);
   if(file.key!==expected)throw Error('comment_archive_key_mismatch');
   records.push({kind:'comment_archive',sourceKey:file.key,record:row});
  }
  return records;
 }finally{db.close()}
}
export async function createPremiumRecordSnapshot(source,{crypto}={}){
 if(!crypto?.subtle||!['story','comment_archive'].includes(source?.kind)||typeof source?.sourceKey!=='string')throw Error('invalid_private_record');
 const payload={schema:'talera-premium-record/1',kind:source.kind,sourceKey:source.sourceKey,record:source.record};
 const data=encode.encode(JSON.stringify(payload));
 if(data.byteLength<1||data.byteLength>MAX)throw Error('record_too_large');
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',data));
 const uuid=[...digest.slice(0,16)];uuid[6]=(uuid[6]&15)|64;uuid[8]=(uuid[8]&63)|128;
 const hex=idHex(uuid),id=[hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
 return {id,kind:source.kind,bytes:data,sha256:idHex(digest)};
}
export async function uploadPremiumRecord({snapshot,fetcher=fetch}={}){
 const url='/api/premium/cloud/records/'+snapshot.kind+'/'+snapshot.id;
 const response=await fetcher(url,{method:'PUT',credentials:'same-origin',cache:'no-store',
  headers:{'content-type':'application/json','x-content-sha256':snapshot.sha256},body:snapshot.bytes});
 if(!response?.ok)return {ok:false,reason:'http_failure',status:response?.status||0};
 const json=await response.json().catch(()=>null);
 return json?.ok===true?json:{ok:false,reason:'upload_not_confirmed'};
}
