// Browser-only voluntary Free backup UI. No fetch, upload or account mutations.
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
let downloadUrl=null,review=null,reviewFile=null,reviewCross=null;
const message=(element,text)=>{element.textContent=text;};
const failText=e=>e instanceof Error?e.message:String(e);
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
 message(status,'Het herstelbestand moet eerst opnieuw gecontroleerd worden.');
}
chooser.addEventListener('change',invalidate);
cross.addEventListener('change',invalidate);
confirm.addEventListener('change',()=>{
 restore.disabled=!(review?.safeToRestore&&confirm.checked&&reviewFile===chooser.files?.[0]&&reviewCross===cross.checked);
});
make.addEventListener('click',async()=>{
 make.disabled=true;
 if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=null}
 save.hidden=true;save.removeAttribute('href');
 message(exportStatus,'De lokale herinneringen worden gecontroleerd. Er wordt niets verzonden.');
 try{
  await assertCurrentAccount();
  const archive=await exportExistingFreeLibrary(db);
  downloadUrl=URL.createObjectURL(archive);
  save.href=downloadUrl;
  save.download='talera-free-'+new Date().toISOString().slice(0,10)+'.talera';
  save.hidden=false;
  message(exportStatus,'Back-up lokaal gemaakt ('+(archive.size/1048576).toFixed(1)+
   ' MiB). Tik nu op "Bewaar back-upbestand" en controleer zelf in Bestanden dat de download echt is opgeslagen. Dit bestand is niet versleuteld.');
 }catch(e){message(exportStatus,'Back-up niet gemaakt: '+failText(e))}
 finally{make.disabled=false}
});
preview.addEventListener('click',async()=>{
 invalidate();confirm.checked=false;
 const file=chooser.files?.[0];
 if(!file){message(status,'Kies eerst een .talera-bestand.');return}
 preview.disabled=true;
 message(status,'Bestand en originele mediabytes worden gecontroleerd. Er wordt niets geïmporteerd.');
 try{
  await assertCurrentAccount();
  const result=await previewFreeLibraryRestore(file,db,{allowOtherOrigin:cross.checked});
  review=result;reviewFile=file;reviewCross=cross.checked;
  message(status,'Gecontroleerd: '+result.storyCount+' herinnering(en), '+
   result.mediaStoreEntries+' media-/werkrecords. '+
   (result.crossOrigin?'Archief van andere of niet aantoonbare herkomst. ':'')+
   (result.safeToRestore?'Geen dubbele ID’s aangetroffen. Je kunt expliciet bevestigen.':
    'Conflict met bestaande herinneringen of media: herstel geblokkeerd.'));
 }catch(e){message(status,'Controle gestopt (niets gewijzigd): '+failText(e))}
 finally{preview.disabled=false}
});
restore.addEventListener('click',async()=>{
 const file=chooser.files?.[0];
 if(!review?.safeToRestore||!confirm.checked||file!==reviewFile||cross.checked!==reviewCross)
  return invalidate();
 restore.disabled=true;confirm.disabled=true;preview.disabled=true;
 message(status,'Herstel loopt. Sluit deze pagina niet voordat het is afgerond.');
 try{
  await assertCurrentAccount();
  const result=await restoreFreeLibrary(file,db,{allowOtherOrigin:cross.checked,confirmed:true});
  message(status,'Herstel voltooid: '+result.restoredStories+' herinnering(en), '+
   result.restoredMediaEntries+' records toegevoegd. Controleer nu zelf je herinneringen op Mijn leven. De originele bron is niet verwijderd.');
  review=null;
 }catch(e){
  message(status,'Herstel gestopt; bestaande inhoud wordt niet overschreven: '+failText(e));
  review=null;
 }finally{confirm.disabled=false;preview.disabled=false}
});
window.addEventListener('pagehide',()=>{if(downloadUrl)URL.revokeObjectURL(downloadUrl)});
make.disabled=false;
preview.disabled=false;
root.dataset.ready='yes';
