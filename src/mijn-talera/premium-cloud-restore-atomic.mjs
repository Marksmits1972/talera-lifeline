/* TALERA Premium - guarded, all-or-nothing restore of a small EU cloud archive
 * into the EXISTING Free IndexedDB database. Explicit approval is handled by the
 * PWA button before invoking this function. No overwrite and no network writes.
 * Large archives require a separate resumable restore design.
 */
import {previewPremiumCloudRestore} from './premium-cloud-restore-preview.mjs';
import {fetchPremiumManifestIds} from './premium-sync-audit.mjs';

export const CLOUD_RESTORE_ATOMIC_LIMIT=64*1024*1024;
const DB='talera-lifeline-dev-local-v1',PREFIX='talera-thread-archive-v1:';
const TYPES=new Set(['image/jpeg','image/png','image/webp','image/heic','audio/mpeg','audio/mp4','audio/webm','video/mp4','video/webm']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX=/^[0-9a-f]{64}$/i;
const PART=8*1024*1024;
const makeError=(message)=>new Error(message);
const requestResult=req=>new Promise((resolve,reject)=>{
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||makeError('local_storage_error'));
});
const txDone=tx=>new Promise((resolve,reject)=>{
 tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||makeError('restore_transaction_failed'));
 tx.onabort=()=>reject(tx.error||makeError('restore_transaction_aborted'));
});
const hash=async (crypto,buffer)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(x=>x.toString(16).padStart(2,'0')).join('');
const stable=()=>{throw makeError('cloud_archive_changed')};
function ensureRecord(source,expectedKind,expectedId){
 if(source?.schema!=='talera-premium-record/1'||source.kind!==expectedKind||
   typeof source.sourceKey!=='string'||!source.record||typeof source.record!=='object'||Array.isArray(source.record))
  stable();
 if(expectedKind==='story'){
  const s=source.record;
  if(!s.id||typeof s.id!=='string'||s.id.length>192||!Array.isArray(s.items||[])||
    source.sourceKey!=='story:'+s.id)stable();
  for(const item of s.items||[])if(typeof item?.key!=='string'||!item.key||item.key.length>240)stable();
  return {store:'stories',key:s.id,value:s};
 }
 const x=source.record,c=x.comment;
 if(typeof x.localId!=='string'||!x.localId||x.localId.length>192||
   typeof c?.id!=='string'||!c.id||c.id.length>128||
   typeof c.body!=='string'||c.body.length>5000||
   typeof c.display_name!=='string'||c.display_name.length>160||
   !Number.isFinite(Number(c.created_at))||Number(c.created_at)<0)stable();
 const key=PREFIX+encodeURIComponent(x.localId)+':'+encodeURIComponent(c.id);
 if(key!==source.sourceKey||key.length>1024)stable();
 const normalized={localId:x.localId,comment:{
  id:c.id,display_name:c.display_name,body:c.body,created_at:Number(c.created_at),
  parent_id:typeof c.parent_id==='string'?c.parent_id.slice(0,128):null,guest:!!c.guest
 }};
 return {store:'files',key,value:{key,blob:new Blob([JSON.stringify(normalized)],{type:'application/json'})},localId:x.localId};
}
async function readBounded(response,maxBytes){
 if(!response?.ok||!response.body)throw makeError('cloud_download_failed');
 const reader=response.body.getReader(),chunks=[];let count=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;
   count+=value.byteLength;
   if(count>maxBytes){await reader.cancel();throw makeError('cloud_file_too_large')}
   chunks.push(value);
  }
 }finally{reader.releaseLock()}
 const bytes=new Uint8Array(count);let at=0;
 for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength}
 return bytes;
}
async function getJson(fetcher,path){
 const response=await fetcher(path,{method:'GET',credentials:'same-origin',cache:'no-store'});
 if(!response?.ok)throw makeError('cloud_download_failed');
 return response.json();
}
async function readMedia(fetcher,crypto,item,active){
 const url='/api/premium/cloud/media/'+item.media_id;
 const buffers=[];
 for(let at=0;at<item.byte_size;at+=PART){
  if(!active())throw makeError('account_changed');
  const end=Math.min(item.byte_size,at+PART);
  const response=await fetcher(url,{method:'GET',credentials:'same-origin',cache:'no-store',
   headers:{range:'bytes='+at+'-'+(end-1)}});
  if(response?.status!==206||response.headers.get('content-range')!=='bytes '+at+'-'+(end-1)+'/'+item.byte_size)
   throw makeError('invalid_cloud_range');
  const bytes=await readBounded(response,end-at);
  if(bytes.byteLength!==end-at)throw makeError('incomplete_cloud_file');
  buffers.push(bytes);
 }
 const blob=new Blob(buffers,{type:item.content_type});
 if(blob.size!==item.byte_size)throw makeError('incomplete_cloud_file');
 // This atomic phase is explicitly capped to small objects; WebCrypto checks the
 // entire content against the original SHA-256 in the cloud manifest.
 if(await hash(crypto,await blob.arrayBuffer())!==item.sha256)throw makeError('cloud_checksum_mismatch');
 return {store:'files',key:item.source_key,value:{key:item.source_key,blob}};
}
async function assertEmptyDatabase(indexedDB){
 const db=await new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB,1);
  r.onupgradeneeded=()=>{
   for(const [store,key] of [['stories','id'],['files','key']])
    if(!r.result.objectStoreNames.contains(store))r.result.createObjectStore(store,{keyPath:key});
  };
  r.onsuccess=()=>resolve(r.result);
  r.onerror=()=>reject(r.error||makeError('local_storage_unavailable'));
  r.onblocked=()=>reject(makeError('local_storage_busy'));
 });
 try{
  if(!db.objectStoreNames.contains('stories')||!db.objectStoreNames.contains('files'))throw makeError('unexpected_free_database');
  const tx=db.transaction(['stories','files'],'readonly');
  const counts=await Promise.all(['stories','files'].map(name=>requestResult(tx.objectStore(name).count())));
  if(counts.some(count=>count!==0))throw makeError('local_archive_not_empty');
 }finally{db.close()}
}
export async function restorePremiumCloudAtomic({
 indexedDB,crypto,fetcher,expectedAccountId,accountMatches=()=>false,online=()=>true,approval=false
}={}){
 if(!approval)return {phase:'approval_required',restored:false};
 if(!indexedDB||!crypto?.subtle||typeof fetcher!=='function'||!UUID.test(expectedAccountId||''))
  return {phase:'not_enabled',restored:false};
 const active=()=>online()&&accountMatches()===true;
 if(!active())return {phase:'not_enabled',restored:false};
 // The cloud preview is server-entitlement gated and never opens IndexedDB.
 const preview=await previewPremiumCloudRestore({fetcher,expectedAccountId,online});
 if(preview.phase!=='manifest_available'||!preview.originalKeysVerified) return {phase:'not_ready',restored:false,preview};
 // New device only. Never merge with or overwrite an existing local Free archive.
 await assertEmptyDatabase(indexedDB);
 const [media,records]=await Promise.all([
  fetchPremiumManifestIds(fetcher,'media'),fetchPremiumManifestIds(fetcher,'records')
 ]);
 if(!active())return {phase:'not_enabled',restored:false};
 if(media.size!==preview.media||records.size!==preview.stories+preview.comments)
  throw makeError('cloud_archive_changed');
 let total=0;
 for(const item of media.values()){
  if(typeof item.source_key!=='string'||!item.source_key||item.source_key.length>240||item.source_key.startsWith(PREFIX)||
   !TYPES.has(item.content_type)||!Number.isSafeInteger(item.byte_size)||item.byte_size<1||
   item.digest_kind!=='full-sha256'||!HEX.test(item.sha256||''))
   throw makeError('cloud_restore_not_supported');
  total+=item.byte_size;
 }
 for(const item of records.values()){
  if(!['story','comment_archive'].includes(item.kind)||!HEX.test(item.sha256||'')||
   !Number.isSafeInteger(item.byte_size)||item.byte_size<1||item.byte_size>1048576)
   throw makeError('invalid_cloud_record');
  total+=item.byte_size;
 }
 if(total>CLOUD_RESTORE_ATOMIC_LIMIT) return {phase:'archive_too_large_for_atomic_restore',restored:false,bytes:total};
 const entries=[],storyIds=new Set(),fileKeys=new Set();
 for(const item of records.values()){
  if(!active())throw makeError('account_changed');
  const response=await fetcher('/api/premium/cloud/records/'+item.kind+'/'+item.record_id,
   {method:'GET',credentials:'same-origin',cache:'no-store'});
  const bytes=await readBounded(response,1048576);
  if(bytes.byteLength!==item.byte_size||await hash(crypto,bytes)!==item.sha256)
   throw makeError('cloud_checksum_mismatch');
  let parsed;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}
  catch{throw makeError('invalid_cloud_record')}
  const entry=ensureRecord(parsed,item.kind,item.record_id);
  if(entry.store==='stories'){
   if(storyIds.has(entry.key))throw makeError('duplicate_cloud_story');
   storyIds.add(entry.key);
  }else{
   if(fileKeys.has(entry.key))throw makeError('duplicate_cloud_comment');
   fileKeys.add(entry.key);
  }
  entries.push(entry);
 }
 for(const item of media.values()){
  if(fileKeys.has(item.source_key))throw makeError('duplicate_cloud_file');
  fileKeys.add(item.source_key);
  entries.push(await readMedia(fetcher,crypto,item,active));
 }
 if(!active())throw makeError('account_changed');
 for(const entry of entries.filter(x=>x.store==='stories')){
  for(const file of entry.value.items||[])if(!fileKeys.has(file.key))throw makeError('story_media_missing');
 }
 for(const entry of entries.filter(x=>x.store==='files'&&x.localId)){
  if(!storyIds.has(entry.localId))throw makeError('comment_story_missing');
 }
 // Permissions may have been revoked while content was downloading.
 // Recheck the live signed-in account, Premium entitlement and consent
 // immediately before writing anything to Free IndexedDB.
 const [rightsAgain,consentAgain]=await Promise.all([
  getJson(fetcher,'/api/me/entitlements'),getJson(fetcher,'/api/premium/cloud/consent')
 ]);
 if(rightsAgain?.accountId!==expectedAccountId||
    rightsAgain?.rights?.permissions?.cloud_storage!==true||
    rightsAgain?.rights?.available?.cloud_storage!==true||
    consentAgain?.consent?.enabled!==true||!active())throw makeError('cloud_permission_changed');
 // Only one IndexedDB transaction writes the entire verified archive.
 // Use add(), never put(), replacement or partial commits.
 await assertEmptyDatabase(indexedDB);
 if(!active())throw makeError('account_changed');
 const db=await new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB,1);
  r.onsuccess=()=>resolve(r.result);
  r.onerror=()=>reject(r.error||makeError('local_storage_unavailable'));
 });
 try{
  const tx=db.transaction(['stories','files'],'readwrite');
  const done=txDone(tx);
  try{for(const entry of entries)tx.objectStore(entry.store).add(entry.value)}
  catch(error){try{tx.abort()}catch{};throw error}
  await done;
 }finally{db.close()}
 return {phase:'restored',restored:true,stories:storyIds.size,
  comments:entries.filter(x=>x.localId).length,media:media.size};
}
