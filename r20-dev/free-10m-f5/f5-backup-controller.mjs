// Browser-only voluntary Free backup UI. Only GET /api/me checks the session;
// archives and original media never leave local IndexedDB or reach a server.
// This module runs only on the separately authenticated /__f5/backup route.
import {
 exportExistingFreeLibrary,previewFreeLibraryRestore,restoreFreeLibrary
} from '/__f5/f5-portable-idb.mjs';
import {inspectFreeArchive,expandFreeArchiveForLegacy} from '/__f5/f5-portable-archive.mjs';
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
const legacy=el('legacy-backup'),legacyHint=el('legacy-backup-hint');
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
  'Herinneringen: '+p.stories.length+'; mediakoppelingen: '+links+'; unieke originele media-ID’s: '+originals.size+'.',
  'Originele foto’s: '+counts.photo+' ('+mb(bytes.photo)+')',
  'Originele video’s: '+counts.video+' ('+mb(bytes.video)+')',
  'Originele geluidsbestanden: '+counts.audio+' ('+mb(bytes.audio)+')',
  'Mobiele versies: '+counts.mobile+' ('+mb(bytes.mobile)+')',
  'Editorrecords: '+counts.editor+' ('+mb(bytes.editor)+')',
  'Niet direct gekoppelde bestandsrecords: '+counts.unlinked+' ('+mb(bytes.unlinked)+')',
  'Overige binaire gegevens: '+mb(bytes.other)+'; bestandsadministratie: '+mb(totalBytes-summary.binaryBytes),
  'Extra binaire kopieën met identieke inhoud: '+copies+' ('+mb(duplicateBytes)+').',
  'Verliesvrij bespaard in deze back-up: '+mb(summary.savedBytes||0)+' ('+(summary.sharedEntries||0)+' gedeelde inhoudsverwijzingen).',
  (summary.sharedEntries>0?'De media-omvang hierboven telt alle oorspronkelijke verwijzingen; het back-upbestand bevat gedeelde bytes slechts eenmaal.':
   copies>0?'In dit back-upbestand zijn de identieke bytes per bestandsrecord opgenomen, zoals vereist door de oudere herstelsoftware.':
   'Dit back-upbestand bevat geen aangetoonde extra identieke binaire kopieën.')+
  ' Dit is geen meting van fysieke iPhone-opslag. Niets wordt verwijderd.'
 ].join('\n');
}
let downloadUrl=null,preparedFile=null,shareUnavailable=false,review=null,reviewFile=null,reviewCross=null;
const message=(element,text)=>{element.textContent=text;};
// Read-only browser diagnosis on the EXISTING status area. No new button,
// screen, media fixture, permanent state, or upload. First photo per memory.
function readOnlyPhotoLine(label,source){
 if(!source?.checked)return label+": geen eerste foto's gecontroleerd.";
 return label+' — eerste foto per herinnering: '+
  source.records.map(row=>{
   const date=row.date==='onbekende datum'?'onbekende datum':row.date;
   const types=row.type||'onbekend type';
   return date+': origineel '+row.original+' ('+types+
    ', inhoud '+row.signature+'), mobiele foto '+row.mobile+
    (row.typeMismatch?' [bestandstype wijkt af van inhoud]':'');
  }).join('; ')+'.';
}
function readOnlyPhotoText(result){
 if(result?.photoAudit){
  const checked=result.photoAudit;
  return '\nAlleen lokaal onderzocht, NIETS teruggezet. '+
    readOnlyPhotoLine('Back-upbestand',checked.archive)+'\n'+
    readOnlyPhotoLine('Huidige bibliotheek',checked.library);
 }
 if(result?.photoAuditUnavailable)
  return '\nDe aanvullende lokale fotocontrole kon niet worden uitgevoerd; niets gewijzigd.';
 return '';
}

const failText=e=>{
 const raw=e instanceof Error?e.message:String(e);
 if(/ACCOUNT_CHANGED|SESSION_EXPIRED|SESSION_UNVERIFIED/.test(raw))
  return 'Je account is gewijzigd. Open Back-ups opnieuw.';
 if(/EXPLICIT_CONSENT|DIFFERENT_ORIGIN/.test(raw))
  return 'Vink eerst aan dat de back-up uit een andere TALERA-versie mag komen.';
 // The iPhone may fail at the manifest, a media checksum, or Files I/O.
 // Display ONLY bounded invariant codes from the archive implementation:
 // never expose story titles, account hashes, media IDs, paths, or file bytes.
 // The actual archive/IndexedDB stays read-only during this inspection.
 if(/^TALERA_ARCHIVE_[A-Z0-9_]{3,60}$/.test(raw))
  return 'Bestand beschadigd of ongeldig (controlecode: '+
   raw.slice('TALERA_ARCHIVE_'.length)+'). Er is niets gewijzigd.';
 if(e?.name==='NotReadableError'||e?.name==='NotFoundError'||e?.name==='AbortError')
  return 'Safari kon het gekozen bestand niet volledig lezen (controlecode: BESTAND_LEZEN). Er is niets gewijzigd.';
 if(e?.name==='QuotaExceededError'||e?.name==='RangeError')
  return 'De bestandscontrole liep tegen een geheugenlimiet aan (controlecode: GEHEUGEN). Er is niets gewijzigd.';
 if(/CHECKSUM|INVALID_MANIFEST|INVALID_ORIGIN/.test(raw))
  return 'Bestand beschadigd of ongeldig (controlecode: ANDERE_CONTROLE). Er is niets gewijzigd.';
 if(/DATABASE_NOT_FOUND|NO_INDEXEDDB|NO_STORIES_FOUND/.test(raw))
  return 'Geen lokale herinneringen gevonden. Open eerst Mijn leven.';
 if(/EXISTING_CONTENT|DUPLICATE/.test(raw))
  return 'Er zijn bestaande herinneringen of afwijkende bestandsrecords. Er is niets overschreven.';
 return 'Controleer het bestand en probeer opnieuw.';
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
 message(status,chooser.files?.[0]?'Keuze gewijzigd. Controleer het bestand opnieuw.':'');
}
function showFileSelection(){
 const file=chooser.files?.[0];
 selected.textContent=file?'Gekozen bestand: '+file.name:'Nog geen back-upbestand gekozen.';
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
function setLegacyAvailable(available){
 legacy.hidden=!available;legacy.disabled=!available;legacyHint.hidden=!available;
}
function clearPrepared(){
 if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=null}
 save.hidden=true;save.removeAttribute('href');preparedFile=null;shareUnavailable=false;
}
function prepareDownload(archive,summary,name){
 const details=storageSummary(summary,archive.size);
 const next=new File([archive],name,{type:'application/octet-stream'});
 const url=URL.createObjectURL(next);
 clearPrepared();
 preparedFile=next;downloadUrl=url;
 save.href=url;save.download=name;save.hidden=false;
 setDetails(exportDetails,details);
 setLegacyAvailable(summary.sharedEntries>0);
}
make.addEventListener('click',async()=>{
 make.disabled=true;setLegacyAvailable(false);
 clearPrepared();setDetails(exportDetails,'');
 message(exportStatus,'Back-up maken…');
 try{
  await assertCurrentAccount();
  const archive=await exportExistingFreeLibrary(db);
  // Fail closed BEFORE offering a download if iOS assembled extra or missing
  // Blob bytes. Checks exact manifest size + checksum, without changing media.
  // This never uploads, rewrites, or restores the owner's local memories.
  const summary=await inspectFreeArchive(archive);
  await assertCurrentAccount();
  prepareDownload(archive,summary,backupName);
  message(exportStatus,'Back-up klaar ('+(archive.size/1048576).toFixed(1)+
   ' MB). Tik op "Bewaar bestand". Kies in Bestanden dezelfde eigen map en bevestig Vervang als je al een TALERA-back-up hebt.');
 }catch(e){message(exportStatus,'Back-up niet gemaakt: '+failText(e))}
 finally{make.disabled=false}
});
// The compact prepared archive is verified and expanded only on explicit
// user action. Use a distinct filename only for this exceptional recovery
// copy, so it cannot accidentally replace the user's normal compact backup.
legacy.addEventListener('click',async()=>{
 if(!preparedFile||make.disabled||legacy.disabled)return;
 const source=preparedFile;
 make.disabled=true;legacy.disabled=true;save.hidden=true;
 message(exportStatus,'Herstelbestand voor oudere software maken…');
 try{
  await assertCurrentAccount();
  const archive=await expandFreeArchiveForLegacy(source);
  const summary=await inspectFreeArchive(archive);
  if(summary.parsed.schema!=='talera-free-lossless-local-2'||summary.sharedEntries!==0)
   throw Error('TALERA_ARCHIVE_UNSUPPORTED_VERSION');
  await assertCurrentAccount();
  prepareDownload(archive,summary,'TALERA-herstel-oudere-versie.talera');
  message(exportStatus,'Herstelbestand voor oudere software klaar ('+mb(archive.size)+'). Tik op "Bewaar bestand". Je gewone back-up in Bestanden wordt niet gewijzigd.');
 }catch(e){
  // Account changes invalidate the prepared archive, rather than leaving
  // a formerly authorized file link active in the current account.
  if(/ACCOUNT_CHANGED|SESSION_EXPIRED|SESSION_UNVERIFIED/.test(String(e?.message))){
   clearPrepared();setDetails(exportDetails,'');setLegacyAvailable(false);
  }else{
   save.hidden=!preparedFile;setLegacyAvailable(!!preparedFile);
  }
  message(exportStatus,'Herstelbestand niet gemaakt: '+failText(e));
 }finally{make.disabled=false}
});
// iPhone PWA cannot silently write into the external Files app. Prefer the
// native share/save sheet when it accepts this exact prepared file. Preserve
// the download fallback, but never claim a download replaced an old file.
save.addEventListener('click',async event=>{
 if(!preparedFile){event.preventDefault();return}
 const filename=preparedFile.name;
 const payload={files:[preparedFile]};
 let supported=false;
 try{
  supported=!shareUnavailable&&typeof navigator.share==='function'&&
   typeof navigator.canShare==='function'&&navigator.canShare(payload);
 }catch(_){}
 if(!supported){
  message(exportStatus,'Download aangeboden als '+filename+
   '. De browser kan een extra kopie maken. Controleer Bestanden; vervang de vorige back-up pas als het nieuwe bestand veilig is bewaard.');
  return;
 }
 event.preventDefault();
 try{
  await navigator.share(payload);
  message(exportStatus,'Bewaar de back-up in je eigen map in Bestanden. Controleer of '+filename+' daar is bijgewerkt. TALERA kan dit niet zelfstandig controleren.');
 }catch(e){
  if(e?.name==='AbortError'){
   message(exportStatus,'Bewaren geannuleerd. De bestaande back-up is niet door TALERA gewijzigd. Tik opnieuw op "Bewaar bestand".');
   return;
  }
  shareUnavailable=true;
  message(exportStatus,'Opslaan via het deelvenster is niet beschikbaar. Tik opnieuw op "Bewaar bestand" voor een download. Controleer daarna Bestanden.');
 }
});
preview.addEventListener('click',async()=>{
 invalidate();confirm.checked=false;
 const file=chooser.files?.[0];
 if(!file){message(status,'Kies een back-upbestand.');return}
 preview.disabled=true;
 message(status,'Bestand controleren…');
 try{
  await assertCurrentAccount();
  const chosenCross=cross.checked;
  const result=await previewFreeLibraryRestore(file,db,{allowOtherOrigin:chosenCross,inspectPhotos:true});
  let analysis='';
  try{analysis='\n\n'+storageSummary(await inspectFreeArchive(file),file.size);}
  catch(_){analysis='\n\nOpslagoverzicht niet beschikbaar.'}
  // A changed selection invalidates the old result, even during a slow check.
  if(file!==chooser.files?.[0]||chosenCross!==cross.checked)return invalidate();
  const allPresent=result.alreadyPresentStories===result.storyCount&&result.storyCount>0&&
   result.identicalMediaEntries===result.mediaStoreEntries&&result.conflictingMediaEntries===0;
  setDetails(restoreDetails,'Huidige bibliotheek: '+result.currentStoryCount+' herinnering(en).\n'+
   'Bestaande herinneringen: '+result.alreadyPresentStories+'\n'+
   'Afwijkende bestandsrecords: '+result.conflictingMediaEntries+'\n'+
   'Identieke bestandsrecords veilig herbruikbaar: '+result.identicalMediaEntries+'\n'+
   'Technische editorrecords zonder herinneringen of conceptinhoud: '+result.ignoredTechnicalEntries+
   (result.conflictingRecordKinds?.length?'\nTerugzetten is geblokkeerd door: '+[...new Set(result.conflictingRecordKinds)].join(', ')+'.':'')+
   '\nEr is niets gewijzigd of teruggezet.'+analysis+readOnlyPhotoText(result));
  review=result;reviewFile=file;reviewCross=chosenCross;
  finalStep.hidden=false;confirm.disabled=!result.safeToRestore;restore.disabled=true;
  status.style.whiteSpace='pre-line';
  message(status,'Bestand is in orde.\nGecontroleerd: '+result.storyCount+' herinnering(en).\n'+
   'Bestandsgrootte: '+mb(file.size)+'\nBestandsafwijkingen: '+result.conflictingMediaEntries);
  message(restoreHint,result.safeToRestore?'Geen dubbele gegevens. Bevestig hieronder om terug te zetten.':
   allPresent?'Alle herinneringen uit deze back-up zijn al aanwezig. Terugzetten is niet nodig.':
   'Conflict met bestaande gegevens. Terugzetten is geblokkeerd om je herinneringen te beschermen.');
 }catch(e){message(status,'Controle gestopt (niets gewijzigd): '+failText(e))}
 finally{preview.disabled=!chooser.files?.[0]}
});
restore.addEventListener('click',async()=>{
 const file=chooser.files?.[0];
 if(!review?.safeToRestore||!confirm.checked||file!==reviewFile||cross.checked!==reviewCross)
  return invalidate();
 restore.disabled=true;confirm.disabled=true;preview.disabled=true;
 message(status,'Herinneringen worden teruggezet. Wacht tot dit klaar is.');
 try{
  await assertCurrentAccount();
  const result=await restoreFreeLibrary(file,db,{allowOtherOrigin:cross.checked,confirmed:true});
  message(status,'Herstel voltooid: '+result.restoredStories+' herinnering(en) toegevoegd. Controleer ze bij Mijn leven.');
  review=null;confirm.checked=false;confirm.disabled=true;restore.disabled=true;
  message(restoreHint,'Herstel voltooid. Controleer je herinneringen bij Mijn leven.');
 }catch(e){
  message(status,'Terugzetten gestopt. Bestaande herinneringen blijven staan. '+failText(e));
  review=null;finalStep.hidden=true;confirm.checked=false;
 }finally{confirm.disabled=!review?.safeToRestore;preview.disabled=!chooser.files?.[0]}
});
window.addEventListener('pagehide',()=>{if(downloadUrl)URL.revokeObjectURL(downloadUrl)});
make.disabled=false;
showFileSelection();
root.dataset.ready='yes';
