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

// Compare every restored record to the already-verified archive after the
// IndexedDB transaction commits. Large original media are checked in bounded
// chunks; no media is sent to a server, copied into a second library or changed.
export async function verifyRestoredLibraryReadback(expected,actual){
 const bad=()=>{throw Error('TALERA_RESTORE_READBACK_MISMATCH')};
 if(!Array.isArray(expected?.stories)||!Array.isArray(expected?.files)||
    !Array.isArray(actual?.stories)||!Array.isArray(actual?.files))bad();
 const chunkBytes=4*1024*1024;
 const same=async(a,b,depth=0)=>{
  if(depth>=48)bad();
  if(a instanceof Blob||b instanceof Blob){
   if(!(a instanceof Blob)||!(b instanceof Blob)||
      a.size!==b.size||a.type!==b.type)bad();
   const aFile=typeof File==='function'&&a instanceof File;
   const bFile=typeof File==='function'&&b instanceof File;
   if(aFile!==bFile||(aFile&&(a.name!==b.name||a.lastModified!==b.lastModified)))bad();
   for(let start=0;start<a.size;start+=chunkBytes){
    const end=Math.min(a.size,start+chunkBytes);
    const left=new Uint8Array(await a.slice(start,end).arrayBuffer());
    const right=new Uint8Array(await b.slice(start,end).arrayBuffer());
    if(left.length!==right.length)bad();
    for(let i=0;i<left.length;i++)if(left[i]!==right[i])bad();
   }
   return;
  }
  if(a instanceof Date||b instanceof Date){
   if(!(a instanceof Date)||!(b instanceof Date)||a.getTime()!==b.getTime())bad();
   return;
  }
  if(a instanceof ArrayBuffer||b instanceof ArrayBuffer){
   if(!(a instanceof ArrayBuffer)||!(b instanceof ArrayBuffer)||
      a.byteLength!==b.byteLength)bad();
   const left=new Uint8Array(a),right=new Uint8Array(b);
   for(let i=0;i<left.length;i++)if(left[i]!==right[i])bad();
   return;
  }
  if(a===null||b===null||typeof a!=='object'||typeof b!=='object'){
   if(!Object.is(a,b))bad();
   return;
  }
  if(Array.isArray(a)||Array.isArray(b)){
   if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)bad();
   for(let i=0;i<a.length;i++)await same(a[i],b[i],depth+1);
   return;
  }
  const keysA=Object.keys(a).sort(),keysB=Object.keys(b).sort();
  if(keysA.length!==keysB.length||keysA.some((key,i)=>key!==keysB[i]))bad();
  for(const key of keysA)await same(a[key],b[key],depth+1);
 };
 const gotStories=new Map(actual.stories.map(row=>[row.id,row]));
 const gotFiles=new Map(actual.files.map(row=>[row.key,row]));
 for(const row of expected.stories){
  if(!gotStories.has(row.id))bad();
  await same(row,gotStories.get(row.id));
 }
 for(const row of expected.files){
  if(!gotFiles.has(row.key))bad();
  await same(row,gotFiles.get(row.key));
 }
 return Object.freeze({storyCount:expected.stories.length,fileCount:expected.files.length,exact:true});
}

export async function restoreRowsAtomic(db,decoded){
  // The chosen iPhone .talera File can be disk-backed. Its Blob slices are
  // perfectly readable during an immediate checksum/readback, but retaining
  // those slices in IndexedDB can leave later WebKit object URLs unreadable.
  // Make an owned, byte-exact copy of photos and image previews BEFORE opening
  // the write transaction. Never transcode, rename, migrate or touch players.
  const photoKeys=new Set(decoded.stories.flatMap(story=>
    (story.items||[]).filter(item=>item?.kind==='photo').map(item=>item.key)));
  const ownedFiles=[];
  for(const row of decoded.files){
   const original=row?.blob;
   if(!(original instanceof Blob)||
      !(photoKeys.has(row.key)||String(original.type).startsWith('image/'))){
    ownedFiles.push(row);continue;
   }
   // A Uint8Array, not a Blob slice, severs the storage object's dependency
   // on the picker/File-provider lifetime. Fail before writing on read errors.
   const bytes=new Uint8Array(await original.arrayBuffer());
   if(bytes.byteLength!==original.size)
    throw Error('TALERA_RESTORE_PHOTO_COPY_SIZE_MISMATCH');
   const isFile=typeof File==='function'&&original instanceof File;
   const owned=isFile?
    new File([bytes],original.name,{type:original.type,lastModified:original.lastModified}):
    new Blob([bytes],{type:original.type});
   if(owned.size!==original.size||owned.type!==original.type||
      (isFile&&(owned.name!==original.name||
        owned.lastModified!==original.lastModified)))
    throw Error('TALERA_RESTORE_PHOTO_COPY_METADATA_MISMATCH');
   ownedFiles.push({...row,blob:owned});
  }
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
    for(const row of ownedFiles)f.add(row);
   }catch(error){try{tx.abort()}catch{}finish(error)}
  });
}
