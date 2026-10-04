import {t} from './copy.browser.js';
import {createRecorder} from './recorder.js';
import {compactCollection} from './media.js';
import {installPresentation} from './presentation.browser.js';
import {createSpeech} from './speech.browser.js';
export function installTellExperience({getStory,saveAudio,notice,exclusive,storage}){
  const root=document.createElement('section');root.id='freeAudio';root.setAttribute('aria-label',t('audioTitle'));
  root.innerHTML=`<p id="freeAudioStatus" role="status"></p><div class="free-audio-actions"><button id="freePause" hidden></button><button id="freeStop" hidden>${t('audioStop')}</button><button id="freeType">${t('typeInstead')}</button></div><audio id="freeAudioPlayer" controls preload="metadata" hidden></audio>`;
  const screen=document.getElementById('screen');
  const place=()=>document.querySelector(screen.classList.contains('has-photo')?'.photo-voice':'.mic-zone')?.append(root);
  new MutationObserver(place).observe(screen,{attributes:true,attributeFilter:['class']});place();
  const player=root.querySelector('audio'),pause=root.querySelector('#freePause'),stop=root.querySelector('#freeStop'),status=root.querySelector('#freeAudioStatus');let playbackUrl='',active=false;
  const buttons=['mic','storyTrigger'].map(id=>document.getElementById(id)).filter(Boolean);
  async function loadAudio(){
    const item=getStory().audioId?await storage.media(getStory().audioId):null;
    player.pause();player.removeAttribute('src');if(playbackUrl)URL.revokeObjectURL(playbackUrl);playbackUrl='';player.hidden=!item;
    if(item){playbackUrl=URL.createObjectURL(item.blob);player.src=playbackUrl;status.textContent=t(item.incomplete?'audioInterrupted':'audioSaved');}
  }
  const speech=createSpeech({onText:text=>{const field=document.getElementById('storyText');field.value+=(field.value.trim()?' ':'')+text;field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));},onStatus:text=>status.textContent=text,onError:notice});
  window.__taleraFreeSpeech=speech;
  const recorder=createRecorder({onStream:stream=>speech.start(stream).catch(error=>notice('Tekst omzetten is niet beschikbaar. Je opname blijft bewaard.')),save:audio=>exclusive(async()=>{await saveAudio(audio);if(!audio.incomplete)await loadAudio();}),onError:error=>notice(error.name==='QuotaExceededError'?t('storageFull'):error.message),onLevel:level=>buttons.forEach(button=>button.classList.toggle('free-speaking',level>.025)),onState:phase=>{
    if(phase==='saving')speech.stop();if(phase==='paused')speech.pause();if(phase==='recording')speech.resume();
    active=['permission','recording','paused','saving'].includes(phase);
    for(const button of buttons){button.classList.toggle('recording',active);button.disabled=['permission','saving'].includes(phase);button.setAttribute('aria-label',t(active?'audioStop':'audioStart'));}
    pause.hidden=!['recording','paused'].includes(phase);pause.textContent=t(phase==='paused'?'audioResume':'audioPause');stop.hidden=!['recording','paused'].includes(phase);
    status.textContent=t({permission:'audioPermission',recording:'audioRecording',paused:'audioPaused',saving:'audioSaving',saved:'audioSaved',error:'audioFailed'}[phase]||'audioReady');
    for(const id of ['photoVoiceTitle','micLabel']){const label=document.getElementById(id);if(label)label.textContent=active?'Vertel je verhaal':t('audioStart');}
    document.getElementById('timelinePublish').disabled=active;
    if(phase==='saved')loadAudio().catch(error=>notice(error.message));
  }});
  window.__taleraFreeRecording=recorder;
  window.__taleraFreeRecord=async()=>{try{if(recorder.busy()){recorder.stop();return;}if(speech.busy()){notice('Je gesproken tekst wordt nog verwerkt.');return;}if(getStory().audioId&&!confirm(t('audioReplace')))return;player.pause();await recorder.start();}catch(error){notice(error.message);}};
  pause.onclick=()=>recorder.phase()==='paused'?recorder.resume():recorder.pause();stop.onclick=()=>recorder.stop();root.querySelector('#freeType').onclick=()=>window.__taleraFreeOpenText?.();
  // The idle recorder owns the orb copy; typing remains a separate, visible action.
  const label=document.getElementById('photoVoiceTitle');if(label){const update=()=>{const text=active?'Vertel je verhaal':t('audioStart');if(label.textContent!==text)label.textContent=text;};new MutationObserver(update).observe(label,{childList:true});update();}
  const sub=document.getElementById('photoVoiceSub');if(sub){const update=()=>{if(sub.textContent!=='')sub.textContent='';};new MutationObserver(update).observe(sub,{childList:true});update();}
  const baseLabel=document.getElementById('micLabel');if(baseLabel){const update=()=>{const text=active?'Vertel je verhaal':t('audioStart');if(baseLabel.textContent!==text)baseLabel.textContent=text;};new MutationObserver(update).observe(baseLabel,{childList:true});update();}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)recorder.stop(true);});window.addEventListener('pagehide',()=>recorder.stop(true));
  window.addEventListener('beforeunload',event=>{if(recorder.busy()||speech.busy()){event.preventDefault();event.returnValue='';}});
  window.addEventListener('pageshow',()=>{if(!recorder.busy())loadAudio().catch(()=>{});});
  loadAudio().catch(error=>notice(error.message));
  document.getElementById('freeDelete')?.addEventListener('click',async()=>{if(recorder.busy()){notice(t('audioFinishFirst'));return;}if(confirm(t('deleteConfirm'))){await exclusive(()=>storage.delete(getStory().id));localStorage.removeItem('talera.free.draft');location.href='/';}});
}
export const installTimelineExperience=installPresentation;
export async function installDeviceExperience({beforeReload=async()=>{},storage,exclusive=task=>task()}={}){
  const button=document.getElementById('freeDeviceOpen');if(!button)return;
  const dialog=document.createElement('dialog');dialog.id='freeDevice';dialog.innerHTML=`<h2>${t('deviceTitle')}</h2><p>${t('deviceHelp')}</p><p id="freeOfflineStatus"></p><p id="freeStorageUsage"></p><button id="freePersist">${t('protectStorage')}</button><p>${t('storageWarning')}</p><button id="freeCompact">${t('compactExisting')}</button><p id="freeCompactStatus" role="status"></p><button id="freeDeviceClose">${t('storageClose')}</button>`;document.body.append(dialog);
  button.onclick=async()=>{document.getElementById('moreModal')?.classList.remove('open');document.getElementById('freeStorageInfo')?.close();dialog.showModal();try{const estimate=await navigator.storage?.estimate?.(),persisted=await navigator.storage?.persisted?.();dialog.querySelector('#freeStorageUsage').textContent=(estimate?Math.round(estimate.usage/1024/1024)+' MB '+t('storageUsed'):t('storageEstimateMissing'))+(persisted?' '+t('storageProtected'):'');}catch{}let cached=false;try{if(await caches.has('talera-free-guided-reader-v8')){const cache=await caches.open('talera-free-guided-reader-v8');cached=Boolean(await cache.match('/tell'))&&Boolean(await cache.match('/local/experience.js'));}}catch{}dialog.querySelector('#freeOfflineStatus').textContent=t(cached?'offlineReady':'offlinePending');};
  dialog.querySelector('#freeDeviceClose').onclick=()=>dialog.close();dialog.querySelector('#freePersist').onclick=async()=>{let result=false;try{result=await navigator.storage?.persist?.();}catch{}dialog.querySelector('#freeStorageUsage').textContent=t(result?'storageProtected':'storageNotProtected');};
  dialog.querySelector('#freeCompact').onclick=async()=>{
    if(!storage||!confirm(t('compactConfirm')))return;
    const button=dialog.querySelector('#freeCompact'),status=dialog.querySelector('#freeCompactStatus');button.disabled=true;
    try{await beforeReload();status.textContent=t('compactBusy');const result=await exclusive(()=>compactCollection(storage));status.textContent=t('compactDone')+' '+Math.round(result.before/1024)+' → '+Math.round(result.after/1024)+' KB';}
    catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  };
  if('serviceWorker' in navigator){
    let requested=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(requested)location.reload();});
    navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(registration=>{
      const update=document.createElement('button');update.id='freeUpdate';update.type='button';update.textContent=t('updateReady');update.hidden=true;document.body.append(update);
      const show=()=>{update.hidden=!registration.waiting||!navigator.serviceWorker.controller;};
      update.onclick=async()=>{try{if(window.__taleraFreeRecording?.busy())throw new Error(t('audioFinishFirst'));await beforeReload();if(registration.waiting){requested=true;registration.waiting.postMessage({type:'ACTIVATE'});}}catch(error){const notice=document.getElementById('notice');notice.textContent=error.message;notice.classList.add('show');setTimeout(()=>notice.classList.remove('show'),4500);}};
      const automatically=async()=>{show();if(!registration.waiting||!navigator.serviceWorker.controller||window.__taleraFreeRecording?.busy()||window.__taleraFreeSpeech?.busy()||document.querySelector('.modal.open,dialog[open]')||document.activeElement?.matches('input,textarea'))return;try{await beforeReload();if(registration.waiting){requested=true;registration.waiting.postMessage({type:'ACTIVATE'});}}catch{}};
      automatically();registration.addEventListener('updatefound',()=>registration.installing?.addEventListener('statechange',automatically));
      document.addEventListener('focusout',()=>setTimeout(automatically,300));
      return navigator.serviceWorker.ready;
    }).then(()=>window.dispatchEvent(new Event('talera-offline-ready'))).catch(()=>{});
  }
}
