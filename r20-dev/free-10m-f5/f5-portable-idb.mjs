// TALERA Free F5: origin-scoped, fail-closed backup/restore adapter.
// NOT injected into approved /tell, /present or home. No network and no media cloud.
// A later explicit user-triggered UI is required before any production restore.
import {createFreeArchive,decodeFreeArchive} from './f5-portable-archive.mjs';
const SOURCE_LEGACY='talera-lifeline-dev-local-v1';
const PRIVATE=/^talera-free-local-[a-f0-9]{32}-v1$/;
const requireName=(name,restoring)=>{
 if(typeof name!=='string'||!(PRIVATE.test(name)||(!restoring&&name===SOURCE_LEGACY)))
  throw Error('TALERA_RESTORE_DATABASE_NOT_ALLOWED');
};
function requestResult(request){
 return new Promise((resolve,reject)=>{
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error('TALERA_RESTORE_INDEXEDDB_REQUEST'));
 });
}
async function openExisting(name,restoring){
 requireName(name,restoring);
 if(typeof indexedDB==='undefined')throw Error('TALERA_RESTORE_NO_INDEXEDDB');
 if(typeof indexedDB.databases==='function'){
  const names=await indexedDB.databases();
  if(!names.some(x=>x.name===name))
   throw Error('TALERA_RESTORE_DATABASE_NOT_FOUND');
 }
 return new Promise((resolve,reject)=>{
  let settled=false;
  const fail=e=>{if(!settled){settled=true;reject(e)}};
  const req=indexedDB.open(name,1);
  // IMPORTANT: opening a missing database must NEVER create an empty
  // replacement that could be mistaken for a previous iPhone memory library.
  req.onupgradeneeded=()=>{try{req.transaction.abort()}catch{}
    fail(Error('TALERA_RESTORE_NO_NEW_DATABASE_ALLOWED'))};
  req.onerror=()=>fail(req.error||Error('TALERA_RESTORE_OPEN_FAILED'));
  req.onblocked=()=>fail(Error('TALERA_RESTORE_BLOCKED'));
  req.onsuccess=()=>{
   const db=req.result;
   if(settled){db.close();return}
   if(!db.objectStoreNames.contains('stories')||!db.objectStoreNames.contains('files')
      ||db.version!==1){db.close();fail(Error('TALERA_RESTORE_SCHEMA_MISMATCH'));return}
   settled=true;resolve(db);
  };
 });
}
async function readAll(db){
 const tx=db.transaction(['stories','files'],'readonly');
 const stories=requestResult(tx.objectStore('stories').getAll());
 const files=requestResult(tx.objectStore('files').getAll());
 return {stories:await stories,files:await files};
}
export async function exportExistingFreeLibrary(databaseName){
 const db=await openExisting(databaseName,false);
 try{
  const {stories,files}=await readAll(db);
  if(!stories.length)throw Error('TALERA_RESTORE_NO_STORIES_FOUND');
  return await createFreeArchive({stories,files,sourceScope:databaseName,
   sourceOrigin:typeof location==='object'?location.origin:null,
   createdAt:new Date().toISOString()});
 }finally{db.close()}
}
async function preview(decoded,name,allowOtherOrigin){
 const sourceMatches=decoded.sourceScope===name &&
   decoded.sourceOrigin===location.origin;
 if(!sourceMatches&&!allowOtherOrigin)
  throw Error('TALERA_RESTORE_DIFFERENT_ORIGIN_REQUIRES_EXPLICIT_CONSENT');
 const db=await openExisting(name,true);
 try{
  const existing=await readAll(db);
  const stories=new Set(existing.stories.map(x=>x.id));
  const files=new Set(existing.files.map(x=>x.key));
  const collisionStories=decoded.stories.filter(x=>stories.has(x.id)).map(x=>x.id);
  const collisionFiles=decoded.files.filter(x=>files.has(x.key)).map(x=>x.key);
  return {
   sourceScope:decoded.sourceScope,sourceOrigin:decoded.sourceOrigin,
   targetScope:name,crossOrigin:!sourceMatches,
   storyCount:decoded.stories.length,mediaStoreEntries:decoded.files.length,
   alreadyPresentStories:collisionStories.length,
   alreadyPresentMediaEntries:collisionFiles.length,
   safeToRestore:collisionStories.length===0&&collisionFiles.length===0,
   // Names/keys stay local to caller. No logging or server telemetry.
   collisionStories,collisionFiles
  };
 }finally{db.close()}
}
export async function previewFreeLibraryRestore(archive,databaseName,{allowOtherOrigin=false}={}){
 requireName(databaseName,true);
 // Verify checksum & every media reference BEFORE even inspecting target state.
 const decoded=await decodeFreeArchive(archive);
 return preview(decoded,databaseName,allowOtherOrigin===true);
}
export async function restoreFreeLibrary(archive,databaseName,
 {allowOtherOrigin=false,confirmed=false}={}){
 if(confirmed!==true)throw Error('TALERA_RESTORE_EXPLICIT_CONFIRMATION_REQUIRED');
 requireName(databaseName,true);
 const decoded=await decodeFreeArchive(archive);
 const review=await preview(decoded,databaseName,allowOtherOrigin===true);
 if(!review.safeToRestore)throw Error('TALERA_RESTORE_EXISTING_CONTENT_MUST_NOT_BE_OVERWRITTEN');
 const db=await openExisting(databaseName,true);
 try{
  // One atomic IndexedDB transaction for both stores: fail/QuotaExceeded
  // aborts the WHOLE import, never deletes or replaces existing media/stories.
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(['stories','files'],'readwrite');
   let finished=false;
   const finish=(err)=>{
    if(finished)return;finished=true;
    err?reject(err):resolve();
   };
   tx.oncomplete=()=>finish(null);
   tx.onabort=()=>finish(tx.error||Error('TALERA_RESTORE_ATOMIC_IMPORT_ABORTED'));
   tx.onerror=()=>{};
   try{
    const s=tx.objectStore('stories'),f=tx.objectStore('files');
    for(const row of decoded.stories)s.add(row);
    for(const row of decoded.files)f.add(row);
   }catch(error){try{tx.abort()}catch{}finish(error)}
  });
  const returned=await readAll(db);
  const foundStories=new Set(returned.stories.map(x=>x.id));
  const foundFiles=new Set(returned.files.map(x=>x.key));
  if(!decoded.stories.every(x=>foundStories.has(x.id))||
     !decoded.files.every(x=>foundFiles.has(x.key)))
   throw Error('TALERA_RESTORE_READBACK_INCOMPLETE');
  return {restoredStories:decoded.stories.length,
   restoredMediaEntries:decoded.files.length,
   sourcePreserved:true,existingRecordsOverwritten:false,
   readbackPassed:true,physicalIPhoneValidated:false};
 }finally{db.close()}
}
