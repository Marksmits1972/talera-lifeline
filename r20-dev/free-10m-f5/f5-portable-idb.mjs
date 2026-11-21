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
export async function previewFreeLibraryRestore(archive,databaseName,{allowOtherOrigin=false}={}){
 requireName(databaseName,true);
 // Verify checksum & every media reference BEFORE even inspecting target state.
 const decoded=await decodeFreeArchive(archive);
 verifyLibraryMediaIntegrity(decoded);
 return preview(decoded,databaseName,allowOtherOrigin===true);
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
