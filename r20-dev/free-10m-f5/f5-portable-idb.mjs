// TALERA Free F5: origin-scoped, fail-closed backup/restore adapter.
// NOT injected into approved /tell, /present or home. No network and no media cloud.
// A later explicit user-triggered UI is required before any production restore.
import {createFreeArchive,decodeFreeArchive} from './f5-portable-archive.mjs';
import {requireName,openExisting,readAll,restoreRowsAtomic,verifyLibraryMediaIntegrity,verifyRestoredLibraryReadback,identicalLibraryFile} from './f5-library-persistence.mjs';
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
// Only redundant editor administration may be omitted from portable recovery.
// Do not touch the existing editor records, real drafts or original media.
// Validate the archive in full before applying this narrow restore boundary.
function isRedundantEditorRecord(row){
 if(!row||Object.keys(row).sort().join(',')!=='blob,key')return false;
 if(row.key==='talera-v4-work:manifest')
  return Array.isArray(row.blob)&&row.blob.length===0;
 if(row.key!=='talera-v4-work:duplicate-index-v7')return false;
 const value=row.blob;
 if(!value||Object.getPrototypeOf(value)!==Object.prototype)return false;
 return Object.entries(value).every(([key,entry])=>
  /^local-[a-z0-9-]+:[a-z0-9-]+$/i.test(key)&&
  entry&&Object.getPrototypeOf(entry)===Object.prototype&&
  Object.keys(entry).sort().join(',')==='signature,size,updated'&&
  typeof entry.signature==='string'&&entry.signature.length>0&&
  Number.isSafeInteger(entry.size)&&entry.size>=0&&
  typeof entry.updated==='string'&&Number.isFinite(Date.parse(entry.updated)));
}
function portableRestoreSnapshot(decoded){
 const refs=new Set(decoded.stories.flatMap(story=>(story.items||[]).map(item=>item.key)));
 const catalog=decoded.files.find(row=>row.key==='talera-v4-work:manifest');
 // Nonempty or unknown draft state must retain its complete original records.
 const noDrafts=!catalog||(Array.isArray(catalog.blob)&&catalog.blob.length===0);
 const files=decoded.files.filter(row=>!(
  noDrafts&&!refs.has(row.key)&&isRedundantEditorRecord(row)));
 return {...decoded,files,ignoredTechnicalEntries:decoded.files.length-files.length};
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
  const files=new Map(existing.files.map(x=>[x.key,x]));
  const collisionStories=decoded.stories.filter(x=>stories.has(x.id)).map(x=>x.id);
  const collisionFiles=[],identicalFiles=[];
  for(const row of decoded.files){
   if(!files.has(row.key))continue;
   if(await identicalLibraryFile(row,files.get(row.key)))identicalFiles.push(row.key);
   else collisionFiles.push(row.key);
  }
  return {
   sourceScope:decoded.sourceScope,sourceOrigin:decoded.sourceOrigin,
   targetScope:name,crossOrigin:!sourceMatches,
   storyCount:decoded.stories.length,mediaStoreEntries:decoded.files.length,
   ignoredTechnicalEntries:decoded.ignoredTechnicalEntries||0,
   alreadyPresentStories:collisionStories.length,
   alreadyPresentMediaEntries:collisionFiles.length+identicalFiles.length,
   identicalMediaEntries:identicalFiles.length,
   conflictingMediaEntries:collisionFiles.length,
   conflictingRecordKinds:collisionFiles.map(key=>{
    const current=files.get(key),prefix='talera-v4-work:';
    const used=existing.stories.some(story=>(story.items||[]).some(item=>item.key===key||item.key+':phone-v1'===key));
    if(used)return 'bestand van bestaande herinnering';
    if(key===prefix+'manifest')return Array.isArray(current?.blob)&&current.blob.length===0?'lege conceptlijst':'conceptlijst';
    if(key===prefix+'duplicate-index-v7')return 'tijdelijke duplicatenindex';
    if(key.startsWith(prefix+'preview:'))return 'tijdelijke conceptminiatuur';
    if(key.startsWith(prefix))return 'conceptbestand';
    if(key.startsWith('local-'))return 'losstaand herinneringsbestand';
    return 'overig opslagrecord';
   }),
   currentStoryCount:existing.stories.length,
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
 const original=await decodeFreeArchive(archive);
 verifyLibraryMediaIntegrity(original);
 const decoded=portableRestoreSnapshot(original);
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
export async function restoreFreeLibrary(archive,databaseName,
 {allowOtherOrigin=false,confirmed=false}={}){
 if(confirmed!==true)throw Error('TALERA_RESTORE_EXPLICIT_CONFIRMATION_REQUIRED');
 requireName(databaseName,true);
 const original=await decodeFreeArchive(archive);
 verifyLibraryMediaIntegrity(original);
 const decoded=portableRestoreSnapshot(original);
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
