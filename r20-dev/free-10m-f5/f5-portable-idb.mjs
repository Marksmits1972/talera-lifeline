// TALERA Free F5: origin-scoped, fail-closed backup/restore adapter.
// NOT injected into approved /tell, /present or home. No network and no media cloud.
// A later explicit user-triggered UI is required before any production restore.
import {createFreeArchive,decodeFreeArchive} from './f5-portable-archive.mjs';
import {requireName,openExisting,readAll,restoreRowsAtomic,verifyLibraryMediaIntegrity,verifyRestoredLibraryReadback} from './f5-library-persistence.mjs';
export async function exportExistingFreeLibrary(databaseName){
 const db=await openExisting(databaseName,false);
 try{
  const {stories,files}=await readAll(db);
  if(!stories.length)throw Error('TALERA_RESTORE_NO_STORIES_FOUND');
  verifyLibraryMediaIntegrity({stories,files});
  return await createFreeArchive({stories,files,sourceScope:databaseName,
   sourceOrigin:typeof location==='object'?location.origin:null,
   createdAt:new Date().toISOString()});
 }finally{db.close()}
}
async function preview(decoded,name,allowOtherOrigin){
 // Another TALERA software version may use a different browser origin,
 // but a DIFFERENT private account must not be imported as a version update.
 // Historical unscoped archives remain an explicit legacy migration only.
 if(decoded.sourceScope!==name&&
    decoded.sourceScope!=='talera-lifeline-dev-local-v1')
  throw Error('TALERA_RESTORE_OTHER_ACCOUNT_BLOCKED');
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
// One temporary, read-only iPhone photo diagnosis INSIDE the existing
// "Bestand controleren" action. Only the FIRST photo of at most six real
// memories is inspected from each source. No extra screen, account, media,
// IndexedDB write, transcode, deletion, upload, or player change.
const PHOTO_DIAGNOSTIC_MAX_STORIES=6;
async function localImageStatus(blob){
 if(!(blob instanceof Blob)||!blob.size)return 'ontbreekt';
 if(blob.size>30*1024*1024)return 'te-groot';
 if(typeof Image!=='function')return 'onbekend';
 let url=null;
 try{
  url=URL.createObjectURL(blob);
  return await new Promise(resolve=>{
   const image=new Image();
   let completed=false,timeout=null;
   const finish=value=>{
    if(completed)return;completed=true;
    if(timeout!==null)clearTimeout(timeout);
    image.onload=image.onerror=null;
    resolve(value);
   };
   timeout=setTimeout(()=>finish('tijdslimiet'),5000);
   image.onload=()=>finish(image.naturalWidth>0?'leesbaar':'niet-leesbaar');
   image.onerror=()=>finish('niet-leesbaar');
   image.src=url;
   if(image.complete&&image.naturalWidth>0)finish('leesbaar');
  });
 }catch(_){return 'niet-leesbaar'}
 finally{if(url)URL.revokeObjectURL(url)}
}
async function imageSignature(blob){
 if(!(blob instanceof Blob)||blob.size<12)return 'onbekend';
 try{
  const h=new Uint8Array(await blob.slice(0,20).arrayBuffer());
  const word=(from,n)=>String.fromCharCode(...h.slice(from,from+n));
  if(h[0]===255&&h[1]===216&&h[2]===255)return 'jpeg';
  if(h[0]===137&&word(1,3)==='PNG')return 'png';
  if(word(0,4)==='RIFF'&&word(8,4)==='WEBP')return 'webp';
  if(word(0,4)==='GIF8')return 'gif';
  if(word(4,4)==='ftyp'){
   const brand=word(8,4).toLowerCase();
   if(['heic','heix','hevc','hevx'].includes(brand))return 'heic';
   if(['mif1','msf1','heif'].includes(brand))return 'heif';
   if(['avif','avis'].includes(brand))return 'avif';
  }
 }catch(_){}
 return 'onbekend';
}
function signatureDisagrees(type,signature){
 const mime=String(type||'').toLowerCase().split(';')[0].trim();
 if(!mime||signature==='onbekend')return false;
 const families={
  'image/jpeg':['jpeg'],'image/png':['png'],'image/webp':['webp'],
  'image/gif':['gif'],'image/heic':['heic','heif'],
  'image/heif':['heic','heif'],'image/avif':['avif']
 };
 return Array.isArray(families[mime])&&!families[mime].includes(signature);
}
async function inspectLocalPhotoSnapshot(snapshot){
 const files=new Map(snapshot.files.map(row=>[row.key,row.blob]));
 const first=Array.isArray(snapshot.stories)?snapshot.stories
  .filter(story=>Array.isArray(story.items)&&story.items.some(item=>item?.kind==='photo'))
  .slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))
  .slice(0,PHOTO_DIAGNOSTIC_MAX_STORIES):[];
 const records=[];
 for(const story of first){
  const item=story.items.find(x=>x?.kind==='photo');
  const original=files.get(item.key),mobile=files.get(item.key+':phone-v1');
  const [source,mobileView,signature]=await Promise.all([
   localImageStatus(original),localImageStatus(mobile),imageSignature(original)
  ]);
  records.push(Object.freeze({
   date:/^\d{4}-\d{2}-\d{2}$/.test(story.date||'')?story.date:'onbekende datum',
   original:source,mobile:mobileView,
   type:typeof original?.type==='string'?original.type.slice(0,50):'',
   signature,
   typeMismatch:signatureDisagrees(original?.type,signature)
  }));
 }
 return Object.freeze({checked:records.length,records});
}
async function compareReadOnlyPhotoSources(decoded,name){
 const db=await openExisting(name,true);
 let existing;
 try{existing=await readAll(db)}finally{db.close()}
 // Neither source is modified; images are decoded in memory then released.
 const archive=await inspectLocalPhotoSnapshot(decoded);
 const library=await inspectLocalPhotoSnapshot(existing);
 return Object.freeze({archive,library,readOnly:true,filesUploaded:false});
}

export async function previewFreeLibraryRestore(archive,databaseName,{allowOtherOrigin=false,inspectPhotos=false}={}){
 requireName(databaseName,true);
 // Verify checksum & every media reference BEFORE even inspecting target state.
 const decoded=await decodeFreeArchive(archive);
 verifyLibraryMediaIntegrity(decoded);
 const review=await preview(decoded,databaseName,allowOtherOrigin===true);
 // Only this owner's explicit conflicting-preview operation performs an
 // optional diagnostic; the restore API and safe-to-restore behavior do not.
 if(inspectPhotos!==true||review.safeToRestore)return review;
 try{
  return {...review,photoAudit:await compareReadOnlyPhotoSources(decoded,databaseName)};
 }catch(_){
  // Never turn a successful collision safety check into an unsafe import
  // just because Safari could not inspect an image.
  return {...review,photoAuditUnavailable:true};
 }
}
// Emergency recovery ONLY when the owner selects the ORIGINAL .talera file
// and explicitly confirms repairing media in the SAME account-bound library.
// No story creation, schema changes, alternate app, media migration or player edit.
const PHOTO_REPAIR_MAX_ITEMS=24;
const PHOTO_REPAIR_MAX_BYTES=128*1024*1024;
const PHOTO_REPAIR_PER_ITEM_MAX=30*1024*1024;
const compatibleStory=(source,target)=>{
 if(source?.id!==target?.id||source?.date!==target?.date||
    source?.time!==target?.time)return false;
 const a=source.items,b=target.items;
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;
 // Refuse remapping, reordering or edits: matching ID ALONE is not enough.
 return a.every((item,i)=>JSON.stringify(item)===JSON.stringify(b[i]));
};
const blobFileMeta=blob=>({
 size:blob?.size,type:blob?.type,
 isFile:typeof File==='function'&&blob instanceof File,
 name:typeof File==='function'&&blob instanceof File?blob.name:null,
 lastModified:typeof File==='function'&&blob instanceof File?blob.lastModified:null
});
const sameBlobFileMeta=(a,b)=>JSON.stringify(blobFileMeta(a))===JSON.stringify(blobFileMeta(b));
const sameStoredFileRow=(a,b)=>{
 if(a?.key!==b?.key)return false;
 const plain=row=>Object.keys(row||{}).filter(k=>k!=='blob').sort().map(k=>[k,row[k]]);
 return JSON.stringify(plain(a))===JSON.stringify(plain(b))&&
  sameBlobFileMeta(a?.blob,b?.blob);
};
async function prepareDamagedOriginalPhotoRepair(decoded,existing){
 const archiveStories=new Map(decoded.stories.map(s=>[s.id,s]));
 const originalFiles=new Map(decoded.files.map(f=>[f.key,f]));
 const presentFiles=new Map(existing.files.map(f=>[f.key,f]));
 const work=[];
 let totalBytes=0;
 for(const currentStory of existing.stories){
  const sourceStory=archiveStories.get(currentStory.id);
  if(!sourceStory)continue; // Never add absent stories.
  if(!compatibleStory(sourceStory,currentStory))
   throw Error('TALERA_REPAIR_STORY_DETAILS_OR_MEDIA_ORDER_DIFFER');
  for(const item of currentStory.items){
   if(item.kind!=='photo')continue;
   const sourceRow=originalFiles.get(item.key);
   const currentRow=presentFiles.get(item.key);
   if(!sourceRow||!currentRow||!(sourceRow.blob instanceof Blob)||
      !(currentRow.blob instanceof Blob))
    throw Error('TALERA_REPAIR_ORIGINAL_FILE_RECORD_MISSING');
   if(!sameStoredFileRow({...sourceRow,blob:currentRow.blob},currentRow))
    throw Error('TALERA_REPAIR_MEDIA_ROW_METADATA_MISMATCH');
   const currentStatus=await localImageStatus(currentRow.blob);
   if(currentStatus==='leesbaar')continue;
   // A timeout, unknown format, large file or empty Blob is not proof that
   // overwriting is safe. Require actual iPhone image.onerror.
   if(currentStatus!=='niet-leesbaar')
    throw Error('TALERA_REPAIR_LOCAL_PHOTO_NOT_PROVEN_BAD');
   const mobile=presentFiles.get(item.key+':phone-v1');
   if(mobile)throw Error('TALERA_REPAIR_MOBILE_VARIANT_ALREADY_EXISTS');
   if(sourceRow.blob.size<=0||sourceRow.blob.size>PHOTO_REPAIR_PER_ITEM_MAX)
    throw Error('TALERA_REPAIR_ARCHIVE_FILE_SIZE_NOT_SUPPORTED');
   if(sourceRow.blob.type!==currentRow.blob.type||
      sourceRow.blob.type!==String(item.mime||sourceRow.blob.type))
    throw Error('TALERA_REPAIR_ORIGINAL_MEDIA_TYPE_MISMATCH');
   const signature=await imageSignature(sourceRow.blob);
   if(signature==='onbekend'||signatureDisagrees(sourceRow.blob.type,signature)||
      await localImageStatus(sourceRow.blob)!=='leesbaar')
    throw Error('TALERA_REPAIR_ARCHIVE_PHOTO_NOT_PROVEN_READABLE');
   totalBytes+=sourceRow.blob.size;
   if(totalBytes>PHOTO_REPAIR_MAX_BYTES||work.length>=PHOTO_REPAIR_MAX_ITEMS)
    throw Error('TALERA_REPAIR_TOO_MUCH_MEDIA_AT_ONCE');
   // Reown the real camera bytes as a standalone File/Blob. Preserve name,
   // MIME, timestamps, record fields and key; never convert photo content.
   const source=sourceRow.blob;
   const bytes=new Uint8Array(await source.arrayBuffer());
   if(bytes.length!==source.size)throw Error('TALERA_REPAIR_ARCHIVE_READ_MISMATCH');
   const owned=typeof File==='function'&&source instanceof File?
    new File([bytes],source.name,{type:source.type,lastModified:source.lastModified}):
    new Blob([bytes],{type:source.type});
   if(!sameBlobFileMeta(source,owned)||await localImageStatus(owned)!=='leesbaar')
    throw Error('TALERA_REPAIR_OWNED_PHOTO_UNREADABLE');
   work.push({story:currentStory,original:currentRow,
    replacement:{...currentRow,blob:owned},source});
  }
 }
 if(!work.length)throw Error('TALERA_REPAIR_NO_PROVEN_BAD_PHOTOS');
 return work;
}
async function verifyRepairReadback(db,work){
 for(const row of work){
  const t=db.transaction('files','readonly');
  const stored=await new Promise((resolve,reject)=>{
   const req=t.objectStore('files').get(row.original.key);
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||Error('TALERA_REPAIR_READBACK_FAILURE'));
  });
  if(!sameStoredFileRow(row.replacement,stored)||
     await localImageStatus(stored.blob)!=='leesbaar')
   throw Error('TALERA_REPAIR_STORED_PHOTO_NOT_READABLE');
  for(let offset=0;offset<row.source.size;offset+=4*1024*1024){
   const end=Math.min(row.source.size,offset+4*1024*1024);
   const [a,b]=await Promise.all([
    row.source.slice(offset,end).arrayBuffer(),
    stored.blob.slice(offset,end).arrayBuffer()
   ]);
   const first=new Uint8Array(a),second=new Uint8Array(b);
   if(first.length!==second.length||first.some((byte,i)=>byte!==second[i]))
    throw Error('TALERA_REPAIR_PHOTO_BYTE_MISMATCH');
  }
 }
}
export async function repairVerifiedUnreadablePhotos(archive,databaseName,
 {allowOtherOrigin=false,confirmed=false}={}){
 if(confirmed!==true)throw Error('TALERA_REPAIR_EXPLICIT_CONFIRMATION_REQUIRED');
 requireName(databaseName,true);
 const decoded=await decodeFreeArchive(archive);
 verifyLibraryMediaIntegrity(decoded);
 // Stronger than ordinary cross-version restore: never repair another
 // account scope even when the owner allows other software versions.
 if(decoded.sourceScope!==databaseName)
  throw Error('TALERA_REPAIR_DIFFERENT_PRIVATE_ACCOUNT_BLOCKED');
 const conflicts=await preview(decoded,databaseName,allowOtherOrigin===true);
 if(conflicts.safeToRestore||!conflicts.alreadyPresentStories)
  throw Error('TALERA_REPAIR_NO_EXISTING_MATCHING_STORIES');
 const db=await openExisting(databaseName,true);
 try{
  const existing=await readAll(db);
  const work=await prepareDamagedOriginalPhotoRepair(decoded,existing);
  // Verify all candidates from the real backup BEFORE any write. One single
  // transaction updates ONLY damaged original image rows; any failed guard
  // aborts every write and preserves all stories, originals and other media.
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(['stories','files'],'readwrite');
   let done=false;
   const finish=error=>{if(done)return;done=true;error?reject(error):resolve()};
   tx.oncomplete=()=>finish(null);
   tx.onabort=()=>finish(tx.error||Error('TALERA_REPAIR_ATOMIC_ABORT'));
   tx.onerror=()=>{};
   const stories=tx.objectStore('stories'),files=tx.objectStore('files');
   const fail=message=>{try{tx.abort()}catch{}finish(Error(message))};
   for(const entry of work){
    const s=stories.get(entry.story.id);
    s.onerror=()=>fail('TALERA_REPAIR_STORY_RECHECK_FAILED');
    s.onsuccess=()=>{
     if(!compatibleStory(entry.story,s.result)){
      fail('TALERA_REPAIR_STORY_CHANGED_DURING_CONFIRMATION');return
     }
     const request=files.get(entry.original.key);
     request.onerror=()=>fail('TALERA_REPAIR_FILE_RECHECK_FAILED');
     request.onsuccess=()=>{
      if(!sameStoredFileRow(entry.original,request.result)){
       fail('TALERA_REPAIR_FILE_CHANGED_DURING_CONFIRMATION');return
      }
      files.put(entry.replacement);
     };
    };
   }
  });
  // Do not claim a verified repair if Safari still cannot open the media
  // after IndexedDB readback, even when byte-for-byte equality succeeds.
  await verifyRepairReadback(db,work);
  return {repairedPhotos:work.length,storiesChanged:0,otherMediaChanged:0,
   originalMediaIdsPreserved:true,sourceArchivePreserved:true,
   iPhoneReadbackPassed:true};
 }finally{db.close()}
}

export async function restoreFreeLibrary(archive,databaseName,
 {allowOtherOrigin=false,confirmed=false}={}){
 if(confirmed!==true)throw Error('TALERA_RESTORE_EXPLICIT_CONFIRMATION_REQUIRED');
 requireName(databaseName,true);
 const decoded=await decodeFreeArchive(archive);
 verifyLibraryMediaIntegrity(decoded);
 const review=await preview(decoded,databaseName,allowOtherOrigin===true);
 if(!review.safeToRestore)throw Error('TALERA_RESTORE_EXISTING_CONTENT_MUST_NOT_BE_OVERWRITTEN');
 const db=await openExisting(databaseName,true);
 try{
  await restoreRowsAtomic(db,decoded);
  const returned=await readAll(db);
  // Treat restore as successful only after complete record, original
  // media byte, File metadata, media order and cue readback equality.
  await verifyRestoredLibraryReadback(decoded,returned);
  return {restoredStories:decoded.stories.length,
   restoredMediaEntries:decoded.files.length,
   sourcePreserved:true,existingRecordsOverwritten:false,
   readbackPassed:true,physicalIPhoneValidated:false};
 }finally{db.close()}
}
