import {t} from './copy.browser.js';
import {createRecorder} from './recorder.js';
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
  const recorder=createRecorder({save:audio=>exclusive(async()=>{await saveAudio(audio);if(!audio.incomplete)await loadAudio();}),onError:error=>notice(error.name==='QuotaExceededError'?t('storageFull'):error.message),onLevel:level=>buttons.forEach(button=>button.classList.toggle('free-speaking',level>.025)),onState:phase=>{
    active=['permission','recording','paused','saving'].includes(phase);
    for(const button of buttons){button.classList.toggle('recording',active);button.disabled=['permission','saving'].includes(phase);button.setAttribute('aria-label',t(active?'audioStop':'audioStart'));}
    pause.hidden=!['recording','paused'].includes(phase);pause.textContent=t(phase==='paused'?'audioResume':'audioPause');stop.hidden=!['recording','paused'].includes(phase);
    status.textContent=t({permission:'audioPermission',recording:'audioRecording',paused:'audioPaused',saving:'audioSaving',saved:'audioSaved',error:'audioFailed'}[phase]||'audioReady');
    document.getElementById('timelinePublish').disabled=active;
    if(phase==='saved')loadAudio().catch(error=>notice(error.message));
  }});
  window.__taleraFreeRecording=recorder;
  window.__taleraFreeRecord=async()=>{try{if(recorder.busy()){recorder.stop();return;}if(getStory().audioId&&!confirm(t('audioReplace')))return;player.pause();await recorder.start();}catch(error){notice(error.message);}};
  pause.onclick=()=>recorder.phase()==='paused'?recorder.resume():recorder.pause();stop.onclick=()=>recorder.stop();root.querySelector('#freeType').onclick=()=>window.__taleraFreeOpenText?.();
  // The idle recorder owns the orb copy; typing remains a separate, visible action.
  const label=document.getElementById('photoVoiceTitle');if(label){const update=()=>{if(!active&&label.textContent!==t('audioStart'))label.textContent=t('audioStart');};new MutationObserver(update).observe(label,{childList:true});update();}
  const sub=document.getElementById('photoVoiceSub');if(sub){const update=()=>{if(sub.textContent!==t('audioLocalHelp'))sub.textContent=t('audioLocalHelp');};new MutationObserver(update).observe(sub,{childList:true});update();}
  const baseLabel=document.getElementById('micLabel');if(baseLabel){const update=()=>{if(baseLabel.textContent!==t('audioStart'))baseLabel.textContent=t('audioStart');};new MutationObserver(update).observe(baseLabel,{childList:true});update();}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)recorder.stop(true);});window.addEventListener('pagehide',()=>recorder.stop(true));
  window.addEventListener('beforeunload',event=>{if(recorder.busy()){event.preventDefault();event.returnValue='';}});
  window.addEventListener('pageshow',()=>{if(!recorder.busy())loadAudio().catch(()=>{});});
  loadAudio().catch(error=>notice(error.message));
  document.getElementById('freeDelete')?.addEventListener('click',async()=>{if(recorder.busy()){notice(t('audioFinishFirst'));return;}if(confirm(t('deleteConfirm'))){await exclusive(()=>storage.delete(getStory().id));localStorage.removeItem('talera.free.draft');location.href='/';}});
}
export function installTimelineExperience({runtime,storage,registerPhoto=()=>{},releasePhoto=()=>{}}){
  const root=document.createElement('section');root.id='freePlayback';root.innerHTML=`<div id="freePhotoNav"><button id="freePrevious" aria-label="${t('previousPhoto')}">‹</button><span id="freePhotoCount"></span><button id="freeNext" aria-label="${t('nextPhoto')}">›</button></div><button id="freeListen">${t('listen')}</button><audio controls preload="none" hidden></audio><p id="freePlaybackStatus" role="status"></p>`;document.body.append(root);
  const player=root.querySelector('audio'),listen=root.querySelector('#freeListen'),count=root.querySelector('#freePhotoCount'),nav=root.querySelector('#freePhotoNav');let generation=0,urls=[],selected='',photoIndex=0,audioUrl='';
  function clear(){generation++;player.pause();player.removeAttribute('src');player.hidden=true;urls.forEach(url=>{releasePhoto(url);URL.revokeObjectURL(url);});urls=[];if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl='';}
  async function showPhoto(memory,index=0){
    const token=++generation,story=await storage.story(memory.storyId);if(token!==generation||!story)return;
    photoIndex=(index+story.photos.length)%story.photos.length;const media=await storage.media(story.photos[photoIndex]?.id);if(token!==generation)return;if(!media)throw new Error(t('missingPhoto'));
    const url=URL.createObjectURL(media.blob);urls.push(url);registerPhoto(url,media.blob);memory.image=url;runtime.settlePhoto(memory);count.textContent=(photoIndex+1)+' / '+story.photos.length;nav.hidden=story.photos.length<2;
    // Keep only the active and prior image so fading images never point at revoked URLs.
    while(urls.length>2){const old=urls.shift();releasePhoto(old);URL.revokeObjectURL(old);}
  }
  runtime.subscribe(memory=>{if(selected===memory.storyId)return;clear();selected=memory.storyId;photoIndex=0;listen.hidden=!memory.audioId;root.querySelector('#freePlaybackStatus').textContent=memory.datePrecision==='unknown'?t('unknownTimelineDate'):'';showPhoto(memory).catch(error=>{root.querySelector('#freePlaybackStatus').textContent=error.message;});});
  root.querySelector('#freePrevious').onclick=()=>showPhoto(runtime.currentMemory(),photoIndex-1);root.querySelector('#freeNext').onclick=()=>showPhoto(runtime.currentMemory(),photoIndex+1);
  listen.onclick=async()=>{const memory=runtime.currentMemory(),token=generation,item=await storage.media(memory.audioId);if(!item||token!==generation)return;if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=URL.createObjectURL(item.blob);player.src=audioUrl;player.hidden=false;listen.hidden=true;root.querySelector('#freePlaybackStatus').textContent=item.incomplete?t('audioInterrupted'):'';player.play().catch(()=>{});};
  window.addEventListener('pagehide',clear);
  window.addEventListener('pageshow',event=>{if(event.persisted){selected='';runtime.writeMemory(runtime.currentMemory());}});
}
export async function installDeviceExperience({beforeReload=async()=>{}}={}){
  const button=document.getElementById('freeDeviceOpen');if(!button)return;
  const dialog=document.createElement('dialog');dialog.id='freeDevice';dialog.innerHTML=`<h2>${t('deviceTitle')}</h2><p>${t('deviceHelp')}</p><p id="freeOfflineStatus"></p><p id="freeStorageUsage"></p><button id="freePersist">${t('protectStorage')}</button><p>${t('storageWarning')}</p><button id="freeDeviceClose">${t('storageClose')}</button>`;document.body.append(dialog);
  button.onclick=async()=>{document.getElementById('moreModal')?.classList.remove('open');document.getElementById('freeStorageInfo')?.close();dialog.showModal();try{const estimate=await navigator.storage?.estimate?.(),persisted=await navigator.storage?.persisted?.();dialog.querySelector('#freeStorageUsage').textContent=(estimate?Math.round(estimate.usage/1024/1024)+' MB '+t('storageUsed'):t('storageEstimateMissing'))+(persisted?' '+t('storageProtected'):'');}catch{}let cached=false;try{if(await caches.has('talera-free-integrated-v4')){const cache=await caches.open('talera-free-integrated-v4');cached=Boolean(await cache.match('/tell'))&&Boolean(await cache.match('/local/experience.js'));}}catch{}dialog.querySelector('#freeOfflineStatus').textContent=t(cached?'offlineReady':'offlinePending');};
  dialog.querySelector('#freeDeviceClose').onclick=()=>dialog.close();dialog.querySelector('#freePersist').onclick=async()=>{let result=false;try{result=await navigator.storage?.persist?.();}catch{}dialog.querySelector('#freeStorageUsage').textContent=t(result?'storageProtected':'storageNotProtected');};
  if('serviceWorker' in navigator){
    let requested=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(requested)location.reload();});
    navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(registration=>{
      const update=document.createElement('button');update.id='freeUpdate';update.type='button';update.textContent=t('updateReady');update.hidden=true;document.body.append(update);
      const show=()=>{update.hidden=!registration.waiting||!navigator.serviceWorker.controller;};
      update.onclick=async()=>{try{if(window.__taleraFreeRecording?.busy())throw new Error(t('audioFinishFirst'));await beforeReload();if(registration.waiting){requested=true;registration.waiting.postMessage({type:'ACTIVATE'});}}catch(error){const notice=document.getElementById('notice');notice.textContent=error.message;notice.classList.add('show');setTimeout(()=>notice.classList.remove('show'),4500);}};
      show();registration.addEventListener('updatefound',()=>registration.installing?.addEventListener('statechange',show));
      return navigator.serviceWorker.ready;
    }).then(()=>window.dispatchEvent(new Event('talera-offline-ready'))).catch(()=>{});
  }
}
