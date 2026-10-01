import {t} from './copy.browser.js';
import {createBackup,readBackup} from './backup.js';
export function installBackup({storage,beforeExport,exclusive}){
  const dialog=document.createElement('dialog');dialog.id='freeBackup';dialog.setAttribute('aria-labelledby','freeBackupTitle');
  dialog.innerHTML=`<h2 id="freeBackupTitle">${t('backupTitle')}</h2><p id="backupDescription"></p><ol id="backupSteps" hidden></ol><p id="backupStatus" role="status" aria-live="polite"></p><p id="backupDetail"></p><div id="backupActions"></div><input id="backupFile" type="file" accept=".talera,application/octet-stream" hidden>`;
  const style=document.createElement('style');style.textContent='#freeBackup{box-sizing:border-box;width:calc(100% - 32px);max-width:460px;max-height:85dvh;overflow:auto;border:0;border-radius:22px;padding:24px;background:#F7F4EF;color:#0F2747;font:15px/1.5 system-ui}#freeBackup::backdrop{background:rgba(0,0,0,.5)}#freeBackup h2{font-size:23px;margin:0 0 16px}#freeBackup p:empty{display:none}#backupActions{display:grid;gap:10px;margin-top:20px}#backupActions button{font:700 15px system-ui;min-height:46px;border:0;border-radius:14px;padding:12px;background:#173851;color:white}#backupActions button.secondary{background:#E7EDF2;color:#173851}#backupDetail{font-size:13px;overflow-wrap:anywhere}#backupStatus{font-weight:650}';
  document.body.append(style,dialog);
  const description=dialog.querySelector('#backupDescription'),status=dialog.querySelector('#backupStatus'),detail=dialog.querySelector('#backupDetail'),actions=dialog.querySelector('#backupActions'),input=dialog.querySelector('#backupFile');
  const steps=dialog.querySelector('#backupSteps');
  const isIOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
  let prepared=null,imported=null,busy=false;
  function buttons(items){actions.replaceChildren();for(const [label,fn,secondary] of items){const button=document.createElement('button');button.type='button';button.textContent=t(label);if(secondary)button.className='secondary';button.onclick=fn;actions.append(button);}}
  function date(value){return new Date(value).toLocaleString('nl-NL');}
  function open(){if(!dialog.open)dialog.showModal();}
  function close(){if(!busy)dialog.close();}
  function noteSaved(){
    const last=localStorage.getItem('talera.free.backupConfirmed');
    detail.textContent=last?t('backupConfirmed')+date(localStorage.getItem('talera.free.backupConfirmedAt')||last):t('backupNone');
    const changed=localStorage.getItem('talera.free.collectionChanged');
    if(last&&changed&&Number(changed)>Date.parse(last))detail.textContent+=' '+t('backupOutdated');
  }
  function menu(intro=false){
    steps.hidden=true;
    description.textContent=intro?t('backupIntro')+' '+t('backupExplanation'):t('backupExplanation')+' '+t('backupSnapshot');
    status.textContent='';noteSaved();
    buttons([['backupMake',prepare],['backupRestore',()=>input.click(),true],[intro?'backupLater':'backupClose',close,true]]);open();
  }
  function confirmSaved(){
    status.textContent=t(isIOS&&!steps.hidden?'backupIOSConfirm':'backupConfirm');
    buttons([['backupYes',()=>{
      // Confirmation is user-reported; the share API cannot prove a file was saved.
      localStorage.setItem('talera.free.backupConfirmed',prepared.createdAt);
      localStorage.setItem('talera.free.backupConfirmedAt',new Date().toISOString());
      menu();
    }],['backupNotYet',showPrepared,true]]);
  }
  function download(){
    const url=URL.createObjectURL(prepared.file),link=document.createElement('a');link.href=url;link.download=prepared.file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);confirmSaved();
  }
  async function save(){
    // Called directly from a click: no await before navigator.share (iPhone activation).
    try{
      busy=true;await navigator.share({files:[prepared.file],title:'TALERA reservekopie'});busy=false;confirmSaved();
    }catch(error){busy=false;status.textContent=t(error.name==='AbortError'?'backupCancelled':'backupShareFailed');buttons([['backupSave',save],['backupDownload',download,true],['backupClose',close,true]]);}
  }
  function showPrepared(){
    description.textContent=t('backupReady');status.textContent='';detail.textContent=prepared.file.name+' · '+prepared.storyCount+' herinneringen · '+prepared.photoCount+' foto’s · '+(prepared.audioCount||0)+' opnames · '+(prepared.file.size/1024/1024).toFixed(1)+' MB';
    let share=false;try{share=Boolean(navigator.share&&navigator.canShare?.({files:[prepared.file]}));}catch{}
    steps.replaceChildren();steps.hidden=!(isIOS&&share);
    if(isIOS&&share){description.textContent=t('backupIOSReady');for(const key of ['backupIOSStep1','backupIOSStep2','backupIOSStep3']){const item=document.createElement('li');item.textContent=t(key);steps.append(item);}}
    if(!share)description.textContent=t('backupDownloadHelp');
    buttons([[share?'backupSave':'backupDownload',share?save:download],['backupClose',close,true]]);
  }
  async function prepare(){
    if(busy)return;busy=true;status.textContent=t('backupWorking');buttons([]);
    try{await beforeExport();prepared=await exclusive(()=>createBackup(storage));busy=false;showPrepared();}
    catch(error){busy=false;menu();status.textContent=error.message||t('backupFailure');}
  }
  input.onchange=async()=>{
    const file=input.files?.[0];input.value='';if(!file||busy)return;
    busy=true;imported=null;steps.hidden=true;status.textContent=t('backupChecking');buttons([]);
    try{
      imported=await readBackup(file);busy=false;description.textContent=t('backupReplace');status.textContent=t('backupImportReady')+date(imported.createdAt);
      detail.textContent=imported.stories.length+' herinneringen · '+imported.media.filter(item=>item.kind!=='audio').length+' foto’s · '+imported.media.filter(item=>item.kind==='audio').length+' opnames';
      buttons([['backupApply',restore],['backupClose',close,true]]);
    }catch(error){busy=false;menu();status.textContent=error.message||t('backupInvalid');}
  };
  async function restore(){
    if(busy||!imported)return;busy=true;status.textContent=t('backupRestoring');buttons([]);
    try{
      if(window.__taleraStoryLabMedia?.isUploading())throw new Error(t('photoBusy'));
      await exclusive(()=>storage.restore(imported));
      localStorage.removeItem('talera.free.draft');localStorage.setItem('talera.free.backupIntroSeen','1');
      localStorage.removeItem('talera.free.backupConfirmed');localStorage.removeItem('talera.free.backupConfirmedAt');localStorage.setItem('talera.free.collectionChanged',String(Date.now()));
      location.replace('/?revision=integrated-v1');
    }catch(error){busy=false;menu();status.textContent=error.name==='QuotaExceededError'?t('storageFull'):error.message||t('backupFailure');}
  }
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  for(const id of ['backupTellOpen','backupTimelineOpen'])document.getElementById(id)?.addEventListener('click',()=>{
    document.getElementById('moreModal')?.classList.remove('open');document.getElementById('freeStorageInfo')?.close();menu();
  });
  window.addEventListener('talera-free-saved',event=>{
    localStorage.setItem('talera.free.collectionChanged',String(Date.now()));
    if(event.detail?.hasPhotos&&event.detail?.complete&&!localStorage.getItem('talera.free.backupIntroSeen')){
      localStorage.setItem('talera.free.backupIntroSeen','1');menu(true);
    }
  });
}
