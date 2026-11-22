// Browser-only voluntary Free backup UI. Only GET /api/me checks the session;
// archives and original media never leave local IndexedDB or reach a server.
// This module runs only on the separately authenticated /__f5/backup route.
import {
 exportExistingFreeLibrary,previewFreeLibraryRestore,restoreFreeLibrary
} from '/__f5/f5-portable-idb.mjs';
const el=id=>document.getElementById(id);
const root=el('talera-free-backup'),db=root?.dataset.database;
if(!/^talera-free-local-[a-f0-9]{32}-v1$/.test(db||''))
 throw Error('TALERA_BACKUP_MISSING_VERIFIED_SCOPE');
const make=el('make-backup'),save=el('save-backup'),exportStatus=el('export-status');
const chooser=el('restore-file'),cross=el('other-origin'),preview=el('preview-restore');
const confirm=el('confirm-restore'),restore=el('run-restore'),status=el('restore-status');
const selected=el('selected-file'),checkStep=el('backup-step-check'),finalStep=el('backup-step-confirm');
let downloadUrl=null,review=null,reviewFile=null,reviewCross=null;
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
 if(/CHECKSUM|INVALID_MANIFEST|INVALID_ORIGIN|ARCHIVE_/.test(raw))
  return 'Bestand beschadigd of ongeldig. Kies een ander back-upbestand.';
 if(/DATABASE_NOT_FOUND|NO_INDEXEDDB|NO_STORIES_FOUND/.test(raw))
  return 'Geen lokale herinneringen gevonden. Open eerst Mijn leven.';
 if(/EXISTING_CONTENT|DUPLICATE/.test(raw))
  return 'Deze herinneringen staan al in de app. Er is niets veranderd.';
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
 confirm.checked=false;finalStep.hidden=true;
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
make.addEventListener('click',async()=>{
 make.disabled=true;
 if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=null}
 save.hidden=true;save.removeAttribute('href');
 message(exportStatus,'Back-up maken…');
 try{
  await assertCurrentAccount();
  const archive=await exportExistingFreeLibrary(db);
  downloadUrl=URL.createObjectURL(archive);
  save.href=downloadUrl;
  save.download='talera-free-'+new Date().toISOString().slice(0,19).replace(/[T:]/g,'-')+'.talera';
  save.hidden=false;
  message(exportStatus,'Back-up klaar ('+(archive.size/1048576).toFixed(1)+
   ' MB). Tik op "Bewaar bestand" en controleer de download in Bestanden.');
 }catch(e){message(exportStatus,'Back-up niet gemaakt: '+failText(e))}
 finally{make.disabled=false}
});
preview.addEventListener('click',async()=>{
 invalidate();confirm.checked=false;
 const file=chooser.files?.[0];
 if(!file){message(status,'Kies een back-upbestand.');return}
 preview.disabled=true;
 message(status,'Bestand controleren…');
 try{
  await assertCurrentAccount();
  const result=await previewFreeLibraryRestore(file,db,{allowOtherOrigin:cross.checked,inspectPhotos:true});
  review=result;reviewFile=file;reviewCross=cross.checked;
  finalStep.hidden=!result.safeToRestore;
  status.style.whiteSpace='pre-line';
  message(status,'Gecontroleerd: '+result.storyCount+' herinnering(en). '+
   (result.crossOrigin?'Back-up uit een andere TALERA-versie. ':'')+
   (result.safeToRestore?'Geen dubbele gegevens. Ga nu door met stap 3 om terug te zetten.':
    'Conflict met bestaande gegevens: deze herinneringen staan al in TALERA. Er is niets gewijzigd of teruggezet.')+
   readOnlyPhotoText(result));
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
  review=null;finalStep.hidden=true;confirm.checked=false;
 }catch(e){
  message(status,'Terugzetten gestopt. Bestaande herinneringen blijven staan. '+failText(e));
  review=null;finalStep.hidden=true;confirm.checked=false;
 }finally{confirm.disabled=false;preview.disabled=!chooser.files?.[0]}
});
window.addEventListener('pagehide',()=>{if(downloadUrl)URL.revokeObjectURL(downloadUrl)});
make.disabled=false;
showFileSelection();
root.dataset.ready='yes';
