// TALERA Free: the existing account-local bookcase I/O, without a new database.
// All original stories/files, media IDs, Blob/File bytes and atomic write rules remain unchanged.
// Only the library knows the physical IndexedDB schema; no media cloud or player code.
const SOURCE_LEGACY='talera-lifeline-dev-local-v1';
const PRIVATE=/^talera-free-local-[a-f0-9]{32}-v1$/;
export const requireName=(name,restoring)=>{
 if(typeof name!=='string'||!(PRIVATE.test(name)||(!restoring&&name===SOURCE_LEGACY)))
  throw Error('TALERA_RESTORE_DATABASE_NOT_ALLOWED');
};
function requestResult(request){
 return new Promise((resolve,reject)=>{
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error('TALERA_RESTORE_INDEXEDDB_REQUEST'));
 });
}
export async function openExisting(name,restoring){
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
export async function readAll(db){
 const tx=db.transaction(['stories','files'],'readonly');
 const stories=requestResult(tx.objectStore('stories').getAll());
 const files=requestResult(tx.objectStore('files').getAll());
 return {stories:await stories,files:await files};
}

// Fail-closed relationship check for the ORIGINAL media within the single
// account-local library. Cache/manifest records need not be Blob originals.
// Existing legacy index-only voice cues are still supported without migration.
export function verifyLibraryMediaIntegrity({stories,files}={}){
 if(!Array.isArray(stories)||!Array.isArray(files))
  throw Error('TALERA_LIBRARY_INVALID_SNAPSHOT');
 const filesByKey=new Map();
 for(const row of files){
  if(typeof row?.key!=='string'||!row.key||filesByKey.has(row.key))
   throw Error('TALERA_LIBRARY_INVALID_OR_DUPLICATE_FILE_ID');
  filesByKey.set(row.key,row);
 }
 const seenStories=new Set();
 let originalsChecked=0,explicitCuesChecked=0;
 for(const story of stories){
  if(typeof story?.id!=='string'||!story.id||seenStories.has(story.id))
   throw Error('TALERA_LIBRARY_INVALID_OR_DUPLICATE_STORY_ID');
  seenStories.add(story.id);
  const items=story.items??[];
  if(!Array.isArray(items))throw Error('TALERA_LIBRARY_INVALID_STORY_MEDIA');
  const visuals=new Set();
  let visualCount=0;
  for(const item of items){
   const key=item?.key;
   if(typeof key!=='string'||!key||!filesByKey.has(key))
    throw Error('TALERA_LIBRARY_MISSING_ORIGINAL_MEDIA_ID');
   const original=filesByKey.get(key)?.blob;
   if(!(original instanceof Blob)||!Number.isSafeInteger(original.size)||original.size<=0)
    throw Error('TALERA_LIBRARY_MISSING_OR_EMPTY_ORIGINAL_MEDIA');
   originalsChecked++;
   if(item.kind==='photo'||item.kind==='video'){
    visuals.add(key);
    visualCount++;
   }
  }
  const cues=story.narrationCues??[];
  if(!Array.isArray(cues))throw Error('TALERA_LIBRARY_INVALID_VOICE_CUES');
  for(const cue of cues){
   // Match the existing narrator: permanent mediaId overrides an old index.
   // Legacy index-only cues stay supported, but must resolve to a real frame.
   const time=Number(cue?.t);
   if(!Number.isFinite(time)||time<0)
    throw Error('TALERA_LIBRARY_INVALID_VOICE_CUE_TIME');
   const ref=cue?.mediaId;
   if(ref!==undefined&&ref!==null&&ref!==''){
    if(typeof ref!=='string'||!visuals.has(ref))
     throw Error('TALERA_LIBRARY_INVALID_VOICE_MEDIA_ID');
    explicitCuesChecked++;
   }else{
    const index=Number(cue?.index);
    if(!Number.isInteger(index)||index<0||index>=visualCount)
     throw Error('TALERA_LIBRARY_INVALID_VOICE_MEDIA_INDEX');
   }
  }
 }
 return Object.freeze({stories:stories.length,originalsChecked,
  explicitCuesChecked});
}

export async function restoreRowsAtomic(db,decoded){
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
}
