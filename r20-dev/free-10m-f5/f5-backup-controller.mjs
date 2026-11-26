const t=(key,params)=>window.TaleraLanguage.t(key,params);
// Browser-only voluntary Free backup UI. Only GET /api/me checks the session;
// archives and original media never leave local IndexedDB or reach a server.
// This module runs only on the separately authenticated /__f5/backup route.
import {
 exportExistingFreeLibrary,previewFreeLibraryRestore,restoreFreeLibrary
} from '/__f5/f5-portable-idb.mjs';
import {inspectFreeArchive} from '/__f5/f5-portable-archive.mjs';
const el=id=>document.getElementById(id);
const root=el('talera-free-backup'),db=root?.dataset.database;
if(!/^talera-free-local-[a-f0-9]{32}-v1$/.test(db||''))
 throw Error('TALERA_BACKUP_MISSING_VERIFIED_SCOPE');
const make=el('make-backup'),save=el('save-backup'),exportStatus=el('export-status');
const chooser=el('restore-file'),cross=el('other-origin'),preview=el('preview-restore');
const confirm=el('confirm-restore'),restore=el('run-restore'),status=el('restore-status');
const selected=el('selected-file'),checkStep=el('backup-step-check'),finalStep=el('backup-step-confirm');
const backupName='TALERA-back-up.talera';
const restoreDetails=el('restore-details'),exportDetails=el('export-details');
const restoreHint=el('restore-hint');
const mb=n=>(n/1048576).toFixed(1)+' MB';
function setDetails(details,lines){
 details.open=false;details.hidden=!lines;
 details.querySelector('output').textContent=lines||'';
}
// Aggregate the existing archive manifest; no extra reads of original media.
// A fresh export contains all records from the account's local library snapshot.
// Content identity uses the complete ordered SHA-256 chunk list, not file names.
function storageSummary(summary,totalBytes){
 const p=summary.parsed;
 const field=(node,key)=>node?.[0]==='obj'?node[1].find(entry=>entry[0]===key)?.[1]:undefined;
 const str=node=>node?.[0]==='str'?node[1]:undefined;
 const originals=new Map();let links=0;
 for(const story of p.stories){
  const items=field(story,'items');
  if(items?.[0]!=='arr')continue;
  for(const item of items[1]){
   const key=str(field(item,'key')),kind=str(field(item,'kind'));
   if(!key)continue;
   links++;
   if(!originals.has(key))originals.set(key,['photo','video','audio'].includes(kind)?kind:'other');
  }
 }
 const categories=['photo','video','audio','other','mobile','editor','unlinked'];
 const counts=Object.fromEntries(categories.map(k=>[k,0]));
 const bytes=Object.fromEntries(categories.map(k=>[k,0]));
 const owners=new Map();
 const walk=(node,category)=>{
  if(!Array.isArray(node))return;
  if(node[0]==='bin'){if(!owners.has(node[1]))owners.set(node[1],category);}
  else if(node[0]==='arr')for(const value of node[1])walk(value,category);
  else if(node[0]==='obj')for(const entry of node[1])walk(entry[1],category);
 };
 for(const row of p.files){
  const key=str(field(row,'key'));
  const category=originals.get(key)||(key?.endsWith(':phone-v1')&&originals.has(key.slice(0,-9))?'mobile':
   key?.startsWith('talera-v4-work:')?'editor':'unlinked');
  counts[category]++;walk(row,category);
 }
 for(const story of p.stories)walk(story,'other');
 const seen=new Set();let copies=0,duplicateBytes=0;
 for(let i=0;i<p.binaries.length;i++){
  const bin=p.binaries[i];
  bytes[owners.get(i)||'other']+=bin.length;
  const sig=bin.length+':'+(bin.sha256Chunks?bin.sha256Chunks.join(','):bin.sha256);
  if(bin.aliasOf===undefined){
   if(seen.has(sig)){copies++;duplicateBytes+=bin.length;}else seen.add(sig);
  }
 }
 return [
  t('backup.detail.summary',{count:p.stories.length,links,originals:originals.size}),
  t('backup.detail.photos',{count:counts.photo,size:mb(bytes.photo)}),
  t('backup.detail.videos',{count:counts.video,size:mb(bytes.video)}),
  t('backup.detail.audio',{count:counts.audio,size:mb(bytes.audio)}),
  t('backup.detail.mobile',{count:counts.mobile,size:mb(bytes.mobile)}),
  t('backup.detail.editor',{count:counts.editor,size:mb(bytes.editor)}),
  t('backup.detail.unlinked',{count:counts.unlinked,size:mb(bytes.unlinked)}),
  t('backup.detail.other',{size:mb(bytes.other),metadata:mb(totalBytes-summary.binaryBytes)}),
  t('backup.detail.copies',{count:copies,size:mb(duplicateBytes)}),
  t('backup.detail.saved',{size:mb(summary.savedBytes||0),count:summary.sharedEntries||0}),
  t('backup.detail.explanation',{})
 ].join('\n');
}
let downloadUrl=null,preparedFile=null,shareUnavailable=false,review=null,reviewFile=null,reviewCross=null;
const message=(element,text)=>{element.textContent=text;};
// Read-only browser diagnosis on the EXISTING status area. No new button,
// screen, media fixture, permanent state, or upload. First photo per memory.
function readOnlyPhotoLine(label,source){
 if(!source?.checked)return t('backup.detail.photoNone',{label});
 return t('backup.detail.photoList',{label,records:source.records.map(row=>{
   const date=row.date==='onbekende datum'?t('backup.detail.photoUnknownDate'):row.date;
   const type=row.type||t('backup.detail.photoUnknownType');
   return t(row.typeMismatch?'backup.detail.photoRowMismatch':'backup.detail.photoRowClean',{date,original:row.original,type,signature:row.signature,mobile:row.mobile});
  }).join('; ')});
}
function readOnlyPhotoText(result){
 if(result?.photoAudit){
  const checked=result.photoAudit;
  return '\n'+t('backup.detail.photoLocal',{archive:readOnlyPhotoLine(t('backup.detail.archiveLabel'),checked.archive),
    library:readOnlyPhotoLine(t('backup.detail.libraryLabel'),checked.library)});
 }
 if(result?.photoAuditUnavailable)return '\n'+t('backup.detail.photoUnavailable');
 return '';
}

const failText=e=>{
 const raw=e instanceof Error?e.message:String(e);
 if(/ACCOUNT_CHANGED|SESSION_EXPIRED|SESSION_UNVERIFIED/.test(raw))
  return t('backup.status.accountChanged');
 if(/EXPLICIT_CONSENT|DIFFERENT_ORIGIN/.test(raw))
  return t('backup.status.consent');
 // The iPhone may fail at the manifest, a media checksum, or Files I/O.
 // Display ONLY bounded invariant codes from the archive implementation:
 // never expose story titles, account hashes, media IDs, paths, or file bytes.
 // The actual archive/IndexedDB stays read-only during this inspection.
 if(/^TALERA_ARCHIVE_[A-Z0-9_]{3,60}$/.test(raw))
  return t('backup.status.archiveFailure',{code:raw.slice('TALERA_ARCHIVE_'.length)});
 if(e?.name==='NotReadableError'||e?.name==='NotFoundError'||e?.name==='AbortError')
  return t('backup.status.safariRead');
 if(e?.name==='QuotaExceededError'||e?.name==='RangeError')
  return t('backup.status.memoryLimit');
 if(/CHECKSUM|INVALID_MANIFEST|INVALID_ORIGIN/.test(raw))
  return t('backup.status.otherCheck');
 if(/DATABASE_NOT_FOUND|NO_INDEXEDDB|NO_STORIES_FOUND/.test(raw))
  return t('backup.status.noMemory');
 if(/EXISTING_CONTENT|DUPLICATE/.test(raw))
  return t('backup.status.existing');
 return t('backup.status.retry');
};
// The backup page may stay open while the user switches accounts in another tab.
// Revalidate the currently signed-in server identity before any local file read
// or write. Only an account ID is fetched: original media never leaves IndexedDB.
async function assertCurrentAccount(){
 const response=await fetch('/api/me',{method:'GET',credentials:'same-origin',
  cache:'no-store',redirect:'error',headers:{accept:'application/json'}});
 if(!response.ok)throw Error('TALERA_BACKUP_SESSION_EXPIRED_REOPEN');
 const result=await response.json();
 const accountId=result?.account?.id;
 if(typeof accountId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId))
  throw Error('TALERA_BACKUP_SESSION_UNVERIFIED');
 const bytes=new TextEncoder().encode('TALERA_FREE_BROWSER_MEMORY_V1:'+accountId.toLowerCase());
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 const hash=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
 if(db!=='talera-free-local-'+hash.slice(0,32)+'-v1')
  throw Error('TALERA_BACKUP_ACCOUNT_CHANGED_REOPEN');
}

function invalidate(){
 review=null;reviewFile=null;reviewCross=null;restore.disabled=true;
 confirm.checked=false;confirm.disabled=true;finalStep.hidden=true;
 message(restoreHint,'');setDetails(restoreDetails,'');
 message(status,chooser.files?.[0]?t('backup.status.selectionChanged'):'');
}
function showFileSelection(){
 const file=chooser.files?.[0];
 selected.textContent=file?t('backup.status.fileSelected',{filename:file.name}):t('backup.status.noFile');
 selected.dataset.selected=file?'yes':'no';
 checkStep.hidden=!file;
 preview.disabled=!file;
}
chooser.addEventListener('change',()=>{
 cross.checked=false;
 invalidate();
 showFileSelection();
});
cross.addEventListener('change',invalidate);
confirm.addEventListener('change',()=>{
 restore.disabled=!(review?.safeToRestore&&confirm.checked&&reviewFile===chooser.files?.[0]&&reviewCross===cross.checked);
});
make.addEventListener('click',async()=>{
 make.disabled=true;
 if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=null}
 save.hidden=true;save.removeAttribute('href');preparedFile=null;shareUnavailable=false;setDetails(exportDetails,'');
 message(exportStatus,t('backup.status.creating'));
 try{
  await assertCurrentAccount();
  const archive=await exportExistingFreeLibrary(db);
  // Fail closed BEFORE offering a download if iOS assembled extra or missing
  // Blob bytes. Checks exact manifest size + checksum, without changing media.
  // This never uploads, rewrites, or restores the owner's local memories.
  const summary=await inspectFreeArchive(archive);
  await assertCurrentAccount();
  try{setDetails(exportDetails,storageSummary(summary,archive.size));}catch(_){}
  preparedFile=new File([archive],backupName,{type:'application/octet-stream'});
  downloadUrl=URL.createObjectURL(preparedFile);
  save.href=downloadUrl;
  save.download=backupName;
  save.hidden=false;
  message(exportStatus,t('backup.status.ready',{size:(archive.size/1048576).toFixed(1)}));
 }catch(e){message(exportStatus,t('backup.status.createFailed',{reason:failText(e)}))}
 finally{make.disabled=false}
});
// iPhone PWA cannot silently write into the external Files app. Prefer the
// native share/save sheet when it accepts this exact prepared file. Preserve
// the download fallback, but never claim a download replaced an old file.
save.addEventListener('click',async event=>{
 if(!preparedFile){event.preventDefault();return}
 const payload={files:[preparedFile]};
 let supported=false;
 try{
  supported=!shareUnavailable&&typeof navigator.share==='function'&&
   typeof navigator.canShare==='function'&&navigator.canShare(payload);
 }catch(_){}
 if(!supported){
  message(exportStatus,t('backup.status.download',{filename:backupName}));
  return;
 }
 event.preventDefault();
 try{
  await navigator.share(payload);
  message(exportStatus,t('backup.status.checkSaved',{filename:backupName}));
 }catch(e){
  if(e?.name==='AbortError'){
   message(exportStatus,t('backup.status.cancelled'));
   return;
  }
  shareUnavailable=true;
  message(exportStatus,t('backup.status.shareUnavailable'));
 }
});
preview.addEventListener('click',async()=>{
 invalidate();confirm.checked=false;
 const file=chooser.files?.[0];
 if(!file){message(status,t('backup.status.chooseFile'));return}
 preview.disabled=true;
 message(status,t('backup.status.checking'));
 try{
  await assertCurrentAccount();
  const chosenCross=cross.checked;
  const result=await previewFreeLibraryRestore(file,db,{allowOtherOrigin:chosenCross,inspectPhotos:true});
  let analysis='';
  try{analysis='\n\n'+storageSummary(await inspectFreeArchive(file),file.size);}
  catch(_){analysis='\n\n'+t('backup.status.summaryUnavailable')}
  // A changed selection invalidates the old result, even during a slow check.
  if(file!==chooser.files?.[0]||chosenCross!==cross.checked)return invalidate();
  const allPresent=result.alreadyPresentStories===result.storyCount&&result.storyCount>0&&
   result.identicalMediaEntries===result.mediaStoreEntries&&result.conflictingMediaEntries===0;
  const blocked=Boolean(result.conflictingRecordKinds?.length);
  const reviewKey=result.currentStoryCount===1?(blocked?'backup.detail.reviewOneBlocked':'backup.detail.reviewOne'):(blocked?'backup.detail.reviewManyBlocked':'backup.detail.reviewMany');
  setDetails(restoreDetails,t(reviewKey,{current:result.currentStoryCount,present:result.alreadyPresentStories,
   conflicts:result.conflictingMediaEntries,identical:result.identicalMediaEntries,technical:result.ignoredTechnicalEntries,
   kinds:blocked?[...new Set(result.conflictingRecordKinds)].join(', '):''})+
   analysis+readOnlyPhotoText(result));
  review=result;reviewFile=file;reviewCross=chosenCross;
  finalStep.hidden=false;confirm.disabled=!result.safeToRestore;restore.disabled=true;
  status.style.whiteSpace='pre-line';
  message(status,t(result.storyCount===1?'backup.status.reviewOne':'backup.status.reviewMany',{count:result.storyCount,size:mb(file.size),conflicts:result.conflictingMediaEntries}));
  message(restoreHint,result.safeToRestore?t('backup.status.safe'):
   allPresent?t('backup.status.allPresent'):
   t('backup.status.conflict'));
 }catch(e){message(status,t('backup.status.checkStopped',{reason:failText(e)}))}
 finally{preview.disabled=!chooser.files?.[0]}
});
restore.addEventListener('click',async()=>{
 const file=chooser.files?.[0];
 if(!review?.safeToRestore||!confirm.checked||file!==reviewFile||cross.checked!==reviewCross)
  return invalidate();
 restore.disabled=true;confirm.disabled=true;preview.disabled=true;
 message(status,t('backup.status.restoring'));
 try{
  await assertCurrentAccount();
  const result=await restoreFreeLibrary(file,db,{allowOtherOrigin:cross.checked,confirmed:true});
  message(status,t(result.restoredStories===1?'backup.status.restoredOne':'backup.status.restoredMany',{count:result.restoredStories}));
  review=null;confirm.checked=false;confirm.disabled=true;restore.disabled=true;
  message(restoreHint,t('backup.status.restoredHint'));
 }catch(e){
  message(status,t('backup.status.restoreStopped',{reason:failText(e)}));
  review=null;finalStep.hidden=true;confirm.checked=false;
 }finally{confirm.disabled=!review?.safeToRestore;preview.disabled=!chooser.files?.[0]}
});
window.addEventListener('pagehide',()=>{if(downloadUrl)URL.revokeObjectURL(downloadUrl)});
make.disabled=false;
showFileSelection();
root.dataset.ready='yes';
