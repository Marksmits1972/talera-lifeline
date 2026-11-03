/**
 * TALERA V61 inline Vertelmodus staging.
 * Read-only proxy of the existing V61 worker; patch only returned /tell and
 * RH19 presentation HTML on this separate staging origin.
 * No database migration, account change, API key, or live V61 deployment.
 */
const BASE_NAME='talera-pwa-v61-opslag-onder-instellingen-20261101';
const BUILD='v61-inline-vertelmodus-r5-ios-native-fallback-20261103';


// One persistent listening preference shared by My Life and Presentation.
// This is intentionally initialized before the TALERA More menu renders.
const GLOBAL_AUDIO_PREF_SCRIPT = String.raw`<script id="talera-v61-listening-pref">
(()=>{
  if(window.__taleraAudioControls?.isEnabled)return;
  const KEY='talera-v61-listening-enabled';
  const read=()=>{try{return localStorage.getItem(KEY)==='on'}catch(e){return false}};
  const write=on=>{try{localStorage.setItem(KEY,on?'on':'off')}catch(e){}};
  const controls={
    isEnabled:read,
    enable(){write(true);window.__taleraInlineTryAutoPlay?.(true)},
    disable(){write(false);window.__taleraInlineStopAudio?.()}
  };
  window.__taleraAudioControls=controls;
  document.addEventListener('talera:enable-listening',()=>controls.enable());
})();
</script>`;
function installGlobalAudioPref(html){
  if(html.includes('id="talera-v61-listening-pref"'))return html;
  return html.replace('</head>',GLOBAL_AUDIO_PREF_SCRIPT+'</head>');
}

function taleraInlineDispose(){
  const s=taleraInline;
  taleraInline=null;
  if(!s)return;
  if(s.timer)clearInterval(s.timer);
  if(s.audio){
    s.audio.onplay=s.audio.onpause=s.audio.onended=null;
    s.audio.onseeking=s.audio.onseeked=s.audio.ontimeupdate=null;
    s.audio.pause();s.audio.removeAttribute('src');
    // Keep the same audio element attached for the next memory on iOS.
  }
  if(s.video){s.video.pause();s.video.removeAttribute('src');s.video.remove()}
  if(s.panel)s.panel.remove();
  if(s.voiceUrl)URL.revokeObjectURL(s.voiceUrl);
  if(s.videoUrl)URL.revokeObjectURL(s.videoUrl);
}

function taleraInlineSync(s){
  if(!s||s!==taleraInline||runtime.currentMemory()?.id!==s.memory.id)return;
  const audioMs=Math.max(0,Math.round((Number(s.audio.currentTime)||0)*1000));
  let cue=null;
  for(const c of s.cues){if(c.t<=audioMs+15)cue=c;else break}
  if(cue&&Number.isInteger(cue.index)&&cue.index>=0&&cue.index<s.frames.length){
    if(s.memory._photoIndex!==cue.index)window.__taleraV31SelectPhoto?.(s.memory.id,cue.index);
    const selected=s.frames[cue.index];
    if(selected?.kind==='video'){
      void taleraInlineLoadVideo(s,selected,cue,audioMs);
    }else if(s.video){
      s.video.pause();s.video.remove();s.video=null;
      if(s.videoUrl){URL.revokeObjectURL(s.videoUrl);s.videoUrl=null}
      s.videoKey='';
    }
  }
  const secs=Math.floor(audioMs/1000);
  if(s.clock)s.clock.textContent=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
}

async function taleraInlineLoadVideo(s,frame,cue,ms){
  if(!s||s!==taleraInline)return;
  if(s.videoKey!==frame.key){
    if(s.video){s.video.pause();s.video.remove();s.video=null}
    if(s.videoUrl){URL.revokeObjectURL(s.videoUrl);s.videoUrl=null}
    s.videoKey=frame.key;
    const video=document.createElement('video');
    video.className='talera-v61-inline-video';
    video.setAttribute('playsinline','');video.playsInline=true;
    video.muted=true;video.defaultMuted=true;video.controls=false;
    video.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:12;pointer-events:none';
    stage.appendChild(video);s.video=video;
    try{
      const url=await store.mediaUrl(frame.key);
      if(s!==taleraInline||s.video!==video||s.videoKey!==frame.key){
        if(url)URL.revokeObjectURL(url);
        video.remove();return;
      }
      if(!url)throw Error('Videobestand ontbreekt');
      s.videoUrl=url;video.src=url;
    }catch(error){
      if(s.video===video){video.remove();s.video=null;s.videoKey=''}
      console.warn('TALERA inline-video niet geladen',error);
      return;
    }
  }
  const video=s.video;if(!video||s!==taleraInline)return;
  const target=Math.max(0,((Number(cue.videoAtMs)||0)+(ms-cue.t))/1000);
  if(video.readyState>=1){
    const limit=Number.isFinite(video.duration)&&video.duration>0?Math.max(0,video.duration-.05):target;
    if(Math.abs(video.currentTime-Math.min(limit,target))>.35){
      try{video.currentTime=Math.min(limit,target)}catch(e){}
    }
  }
  if(s.audio.paused||s.audio.ended){if(!video.paused)video.pause()}
  else if(video.paused)void video.play().catch(()=>{});
}

function taleraInlineInstallAudioControls(){
  // The same setting is created on My Life and on Presentation.
  // Safari may need a real tap before playing unmuted audio.
  const canListen=()=>Boolean(window.__taleraAudioControls?.isEnabled?.());
  const playCurrent=(restart=false)=>{
    const s=taleraInline;
    if(!s?.audio||!canListen()||!s.audio.paused||s._playPending)return;
    if(s.audio.ended){
      if(!restart)return;
      try{s.audio.currentTime=0}catch(e){}
    }
    s._playPending=true;
    try{
      const promise=s.audio.play();
      Promise.resolve(promise).catch(err=>{
        if(s===taleraInline)s.blockedByBrowser=err?.name==='NotAllowedError';
      }).finally(()=>{s._playPending=false});
    }catch(e){s._playPending=false}
  };
  const stopCurrent=()=>{
    const s=taleraInline;
    if(s?.audio&&!s.audio.paused)s.audio.pause();
    if(s?.video&&!s.video.paused)s.video.pause();
  };
  window.__taleraInlineTryAutoPlay=playCurrent;
  window.__taleraInlineStopAudio=stopCurrent;
  // Do not introduce another player button: a tap on the photograph itself
  // can unlock native Safari audio after autoplay was denied.
  const retryOnPhotoGesture=e=>{
    if(!taleraInline?.audio||!canListen()||!taleraInline.audio.paused)return;
    if(e.target?.closest?.('button,a,input,select,textarea,[role="button"],.talera-share-shell'))return;
    playCurrent();
  };
  document.addEventListener('pointerup',retryOnPhotoGesture,{passive:true});
  document.addEventListener('touchend',retryOnPhotoGesture,{passive:true});
  window.addEventListener('storage',e=>{
    if(e.key!=='talera-v61-listening-enabled')return;
    if(canListen())playCurrent();else stopCurrent();
  });
}

async function present(memory){
  if(!stage||!memory)return;
  if(activeId===memory.id)return;
  disposePresentation();
  activeId=memory.id;
  const own=++serial;
  const voice=memory._zeroItems.find(x=>x.kind==='audio');
  if(!voice)return;
  let blob;
  try{blob=await store.blob(voice.key)}catch(e){}
  if(activeId!==memory.id||serial!==own||runtime.currentMemory()?.id!==memory.id)return;
  if(!(blob instanceof Blob)||!blob.size){console.warn('TALERA: originele stemopname ontbreekt');return}
  // Reuse one media element across memories: on iOS this preserves the
  // user's first audio interaction better than creating a new player per story.
  const audio=window.__taleraInlineSharedAudio||document.createElement('audio');
  if(!window.__taleraInlineSharedAudio)window.__taleraInlineSharedAudio=audio;
  audio.preload='auto';audio.playsInline=true;audio.style.display='none';
  if(audio.parentElement!==stage)stage.appendChild(audio);
  const voiceUrl=URL.createObjectURL(blob);
  audio.src=voiceUrl;
  audio.muted=false;audio.volume=1;
  const frames=memory._zeroFrames||[];
  const cues=(memory._taleraNarrationCues||[]).filter(c=>Number.isFinite(Number(c.t))&&Number.isInteger(c.index)&&c.index>=0&&c.index<frames.length).map(c=>({t:Math.max(0,Number(c.t)),index:c.index,videoAtMs:Math.max(0,Number(c.videoAtMs)||0)})).sort((a,b)=>a.t-b.t);
  const s={memory,frames,cues,audio,voiceUrl,timer:null,video:null,videoKey:'',videoUrl:null,_playPending:false};
  taleraInline=s;
  const tick=()=>taleraInlineSync(s);
  const stopTimer=()=>{if(s.timer){clearInterval(s.timer);s.timer=null}};
  audio.onplay=()=>{stopTimer();tick();s.timer=setInterval(tick,90)};
  audio.onpause=()=>{stopTimer();tick()};
  audio.onended=()=>{stopTimer();tick()};
  audio.onseeking=tick;
  audio.onseeked=tick;
  audio.ontimeupdate=tick;
  tick();
  window.__taleraInlineTryAutoPlay?.();
}

async function showSimpleVideo(memory,frameData){
  if(!stage||!frameData)return;
  const id=memory.id+'|'+frameData.key;
  if(localVideo?.dataset.key===id)return;
  if(localVideo){localVideo.pause();localVideo.remove();localVideo=null}
  const element=document.createElement('video');
  element.className='talera-v61-inline-video';
  element.dataset.key=id;element.setAttribute('playsinline','');
  element.playsInline=true;element.controls=true;element.preload='metadata';
  element.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:12;object-fit:cover;background:#183347';
  (stage.parentElement||stage).appendChild(element);localVideo=element;
  try{
    const url=await store.mediaUrl(frameData.key);
    if(localVideo!==element||runtime.currentMemory()?.id!==memory.id){if(url)URL.revokeObjectURL(url);element.remove();return}
    if(!url)throw Error('Video ontbreekt');
    element.src=url;void element.play().catch(()=>{});
    const owned=loaded.get(memory.id)||[];owned.push(url);loaded.set(memory.id,owned);
  }catch(e){console.warn('TALERA inline-video niet beschikbaar',e)}
}

function taleraV61RecordMark(index,force){
  const s=taleraZeroSession;
  if(!s||!s.recorder||s.recorder.state!=='recording'||!Number.isInteger(index)||index<0)return;
  const now=performance.now();
  const ms=Math.max(0,Math.round(now-s.started-s.paused));
  const last=s.cues[s.cues.length-1];
  if(last?.index===index&&!force)return;
  const cue={t:ms,index};
  const video=document.querySelector('#frame > video');
  if(video&&Number.isFinite(video.currentTime))cue.videoAtMs=Math.max(0,Math.round(video.currentTime*1000));
  s.cues.push(cue);
}

function openZeroPlayer(g){
  if(taleraZeroSession)return;
  const frame=$('frame');
  if(!frame){showError('Het fotovak is niet beschikbaar');return}
  const panel=document.createElement('section');
  panel.id='taleraV61RecControls';
  panel.setAttribute('aria-label','TALERA Vertelmodus');
  panel.innerHTML='<div class="talera-v61-rec-top"><strong>Vertellen</strong><button type="button" id="taleraV61RecClose">Klaar</button></div><p id="taleraV61RecStatus" role="status" hidden></p><div class="talera-v61-rec-actions"><button type="button" id="taleraV61RecStart">● Opnemen</button><button type="button" id="taleraV61RecPause" hidden>Pauze</button><button type="button" id="taleraV61RecStop" hidden>Stop</button></div><div class="talera-v61-rec-bottom"><span id="taleraV61RecClock" hidden>00:00</span><button type="button" id="taleraV61RecPlay" hidden>▶ Terugluisteren</button><audio id="taleraV61RecPreview" hidden></audio></div>';
  document.body.appendChild(panel);
  document.body.classList.add('talera-v61-inline-recording');
  const el=id=>panel.querySelector('#'+id);
  const status=el('taleraV61RecStatus'),start=el('taleraV61RecStart'),pause=el('taleraV61RecPause'),stop=el('taleraV61RecStop'),close=el('taleraV61RecClose');
  const clock=el('taleraV61RecClock'),preview=el('taleraV61RecPreview'),playback=el('taleraV61RecPlay');
  const feedback=text=>{status.textContent=text;status.hidden=!text};
  const updatePlayback=()=>{playback.textContent=preview.paused?'▶ Terugluisteren':'Ⅱ Pauze'};
  playback.onclick=()=>{if(preview.paused){void preview.play().catch(()=>feedback('Afspelen is niet beschikbaar.'))}else preview.pause()};
  preview.addEventListener('play',updatePlayback);
  preview.addEventListener('pause',updatePlayback);
  preview.addEventListener('ended',updatePlayback);
  const s={g,panel,frame,stream:null,recorder:null,parts:[],cues:[],started:0,paused:0,pauseStart:0,saving:false,clockTimer:null,observer:null,skipClickUntil:0};
  taleraZeroSession=s;
  if(g.voice&&assets.get(g.voice)){preview.src=originalUrl(g.voice);playback.hidden=false}
  const elapsed=()=>Math.max(0,performance.now()-s.started-s.paused-(s.pauseStart?performance.now()-s.pauseStart:0));
  const updateClock=()=>{const n=Math.floor(elapsed()/1000);clock.textContent=String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')};
  const videoAdjust=()=>{
    const v=frame.querySelector(':scope > video');if(!v)return;
    v.muted=true;v.defaultMuted=true;v.controls=false;v.playsInline=true;v.setAttribute('playsinline','');
    if(s.recorder?.state==='recording')void v.play().catch(()=>{});
    else if(!v.paused)v.pause();
  };
  s.observer=new MutationObserver(videoAdjust);
  s.observer.observe(frame,{childList:true});
  const onTouchStart=e=>{if(e.touches.length===1)s.touch={x:e.touches[0].clientX,y:e.touches[0].clientY}};
  const onTouchEnd=e=>{
    if(!s.touch)return;
    const dx=e.changedTouches[0].clientX-s.touch.x,dy=e.changedTouches[0].clientY-s.touch.y;
    s.touch=null;if(Math.abs(dx)>30||Math.abs(dy)>30)s.skipClickUntil=Date.now()+600;
  };
  const onClick=e=>{if(Date.now()<s.skipClickUntil||e.target.closest('button,video'))return;if(g.media.length>1)stepPhoto(g,1)};
  frame.addEventListener('touchstart',onTouchStart,{passive:true,capture:true});
  frame.addEventListener('touchend',onTouchEnd,{passive:true,capture:true});
  frame.addEventListener('click',onClick);
  const cleanMedia=()=>{
    if(s.clockTimer){clearInterval(s.clockTimer);s.clockTimer=null}
    if(s.stream){s.stream.getTracks().forEach(t=>t.stop());s.stream=null}
    videoAdjust();
  };
  const finish=()=>{
    if(s.saving||s.recorder&&s.recorder.state!=='inactive'){status.textContent='Stop eerst je opname en wacht tot deze is bewaard.';return}
    cleanMedia();
    s.observer?.disconnect();
    frame.removeEventListener('touchstart',onTouchStart,true);
    frame.removeEventListener('touchend',onTouchEnd,true);
    frame.removeEventListener('click',onClick);
    preview.pause();panel.remove();document.body.classList.remove('talera-v61-inline-recording');
    taleraZeroSession=null;
    if($('draft'))$('draft').textContent=g.voice?'Opname als concept bewaard':'Concept bewaard op dit toestel';
  };
  close.onclick=finish;
  start.onclick=async()=>{
    if(s.recorder?.state==='recording'){stop.click();return}
    if(s.recorder||s.saving)return;
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){status.textContent='Deze browser ondersteunt opnemen niet.';return}
    start.disabled=true;preview.pause();feedback('');
    try{
      s.stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(x=>MediaRecorder.isTypeSupported(x));
      const r=new MediaRecorder(s.stream,mime?{mimeType:mime}:undefined);
      s.recorder=r;s.parts=[];s.started=performance.now();s.paused=0;s.pauseStart=0;
      s.cues=g.media.length?[{t:0,index:idx}]:[];
      const v=frame.querySelector(':scope > video');
      if(v&&s.cues.length)s.cues[0].videoAtMs=Math.max(0,Math.round((v.currentTime||0)*1000));
      r.ondataavailable=e=>{if(e.data?.size)s.parts.push(e.data)};
      r.onerror=()=>{feedback('Opnemen mislukt. De vorige opname is behouden.');cleanMedia();s.recorder=null;start.textContent='● Opnemen';start.disabled=false;pause.hidden=true;stop.hidden=true;clock.hidden=true};
      r.onstop=async()=>{
        s.saving=true;start.disabled=true;start.textContent='Opslaan…';feedback('');
        const duration=Math.max(0,Math.round(elapsed())),type=r.mimeType||mime||'audio/webm';
        const blob=new Blob(s.parts,{type});
        cleanMedia();s.recorder=null;pause.hidden=true;stop.hidden=true;clock.hidden=true;
        if(!blob.size){feedback('Geen opname ontvangen. De vorige opname blijft bestaan.');s.saving=false;start.textContent='● Opnemen';start.disabled=false;return}
        const id=uid(),file=new File([blob],'mijn-stem.'+(type.includes('mp4')?'m4a':'webm'),{type});
        const old={voice:g.voice,cues:g.voiceCues,duration:g.voiceDurationMs,wave:g.voiceWave};
        try{
          await writeFiles([[id,file]]);
          assets.set(id,file);
          g.voice=id;g.voiceCues=s.cues.map(c=>({...c}));g.voiceDurationMs=duration;g.voiceWave=[];
          await saveDraft();
          preview.src=originalUrl(id);playback.hidden=false;feedback('');
          if(old.voice&&old.voice!==id){try{await deleteFiles([old.voice]);revoke(old.voice);assets.delete(old.voice)}catch(e){}}
        }catch(e){
          g.voice=old.voice;g.voiceCues=old.cues;g.voiceDurationMs=old.duration;g.voiceWave=old.wave;
          status.textContent='Bewaren niet gelukt: '+e.message+'. De vorige opname is behouden.';
        }finally{s.saving=false;start.textContent='● Opnemen';start.disabled=false}
      };
      r.start(1000);start.textContent='■ Stop';start.hidden=false;start.disabled=false;pause.hidden=true;stop.hidden=true;clock.hidden=false;
      feedback('');
      videoAdjust();s.clockTimer=setInterval(updateClock,350);
    }catch(e){cleanMedia();s.recorder=null;start.disabled=false;status.textContent='Microfoon niet beschikbaar: '+e.message}
  };
  pause.onclick=()=>{
    const r=s.recorder;if(!r)return;
    if(r.state==='recording'){
      r.pause();s.pauseStart=performance.now();pause.textContent='Hervatten';
      status.textContent='Opname gepauzeerd.';videoAdjust();
    }else if(r.state==='paused'){
      s.paused+=performance.now()-s.pauseStart;s.pauseStart=0;r.resume();
      taleraV61RecordMark(idx,true);pause.textContent='Pauze';
      status.textContent='Opname hervat.';videoAdjust();
    }
  };
  stop.onclick=()=>{if(s.recorder&&s.recorder.state!=='inactive'){s.saving=true;stop.disabled=true;start.disabled=true;s.recorder.stop();feedback('')}};
  videoAdjust();
}

const RECORD_CSS = '\n<style id="talera-v61-inline-record-css">'+
'body.talera-v61-inline-recording{overflow:hidden!important}'+
'body.talera-v61-inline-recording #frame{background:#fbfaf7!important}'+
'body.talera-v61-inline-recording #app .work.talera-compact-work #frame{display:flex!important;align-items:center!important;justify-content:center!important;position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;z-index:2000!important;background:#fbfaf7!important;overflow:hidden!important}'+
'body.talera-v61-inline-recording #frame>img,body.talera-v61-inline-recording #frame>video{width:100%!important;height:100%!important;object-fit:contain!important;max-height:none!important;max-width:none!important}'+
'body.talera-v61-inline-recording #frame .empty{color:#4f6b76!important;background:transparent!important}'+
'#taleraV61RecControls{position:fixed;z-index:2200;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));background:rgba(255,255,255,.98);color:#183b50;border-radius:21px;border:1px solid rgba(218,225,227,.95);padding:12px 15px;box-shadow:0 8px 27px rgba(18,48,64,.12);font:500 14px/1.4 system-ui}'+
'#taleraV61RecControls .talera-v61-rec-top,#taleraV61RecControls .talera-v61-rec-actions{display:flex;align-items:center;justify-content:space-between;gap:10px}'+
'#taleraV61RecControls .talera-v61-rec-top strong{font:750 15px system-ui;letter-spacing:.01em}'+
'#taleraV61RecControls .talera-v61-rec-top button{background:#f7f8f6;border:1px solid #e2e7e8;color:#163b50;border-radius:20px;padding:8px 17px;font:650 14px system-ui;min-height:40px}'+
'#taleraV61RecControls p{margin:8px 0;color:#a34a30;font-size:12px}'+
'#taleraV61RecControls .talera-v61-rec-actions{margin-top:11px}'+
'#taleraV61RecControls .talera-v61-rec-actions button{width:100%;min-height:52px;border:0;border-radius:15px;background:#16455b;color:#fff;font:700 16px system-ui;letter-spacing:.01em}'+
'#taleraV61RecControls .talera-v61-rec-bottom{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:0}'+
'#taleraV61RecControls .talera-v61-rec-bottom:has(button:not([hidden])){margin-top:9px}'+
'#taleraV61RecControls #taleraV61RecClock:not([hidden]){display:block;font:650 13px system-ui;font-variant-numeric:tabular-nums;color:#56717a}'+
'#taleraV61RecControls #taleraV61RecPlay{border:0;background:transparent;color:#16455b;padding:9px 14px;font:650 14px system-ui;min-height:38px}'+
'#taleraV61RecControls [hidden]{display:none!important}</style>\n';

function patchPresent(html){
  const marker='<script id="talera-zero-memory-adapter">';
  const begin=html.indexOf(marker);
  if(begin<0)return {html,changed:false,reason:'no-local-rh19'};
  const end=html.indexOf('</script>',begin);
  if(end<0)return {html,changed:false,reason:'missing-script-end'};
  let block=html.slice(begin,end);
  const p=block.indexOf('async function present(memory){');
  const q=block.indexOf(' async function showSimpleVideo(memory,frameData){',p);
  const v=block.indexOf('function activate(memory){',q);
  if(p<0||q<0||v<0||!block.includes("frame.src='/vertelmodus-embed?mode=present'"))return{html,changed:false,reason:'upstream-changed'};
  const injected=['let taleraInline=null;',taleraInlineDispose.toString(),taleraInlineSync.toString(),taleraInlineLoadVideo.toString(),taleraInlineInstallAudioControls.toString(),'taleraInlineInstallAudioControls();',present.toString()].join('\n');
  block=block.slice(0,p)+injected+'\n '+showSimpleVideo.toString()+'\n '+block.slice(v);
  block=block.replace('function disposePresentation(){','function disposePresentation(){\n taleraInlineDispose();');
  // A video is still one original media item. A tiny still image is a
  // rendition associated with that item's ID, in the SAME TaleraMemories
  // IndexedDB files store (the :phone-v1 key is already used for renditions).
  const photoRead="if(item.kind==='photo'){\n           try{url=await (store.displayUrl?store.displayUrl(item.key):store.mediaUrl(item.key))}catch(e){}\n         }";
  if(!block.includes(photoRead))return{html,changed:false,reason:'video-poster-hydrate-upstream-changed'};
  block=block.replace(photoRead,photoRead+"\n         if(item.kind==='video'){\n           try{const poster=await store.blob(item.key+':phone-v1');if(poster instanceof Blob&&poster.size&&String(poster.type).startsWith('image/'))url=URL.createObjectURL(poster)}catch(e){}\n         }");
  const oldCover="photos.push(item.kind==='video'?videoPoster:(url||placeholder));";
  if(!block.includes(oldCover))return{html,changed:false,reason:'video-poster-cover-upstream-changed'};
  block=block.replace(oldCover,"photos.push(item.kind==='video'?(url||videoPoster):(url||placeholder));");
  block=block.replace('if(localVideo)locate(localVideo);','if(localVideo&&localVideo.parentElement!==stage)locate(localVideo);');
  if(block.includes("frame.src='/vertelmodus-embed?mode=present'")||!block.includes('taleraInlineSync'))return{html,changed:false,reason:'patch-incomplete'};
  return {html:html.slice(0,begin)+block+html.slice(end),changed:true,reason:'inline-presentation'};
}

function removeEditorShareBeforePublish(html){
  // The editor is a draft, never a share entry point. Only the social button
  // on the published presentation can initiate sharing.
  const start="  if(isEditor){\n    document.body.classList.add('talera-editor-share-mode');\n    function installEditorShare(){";
  const idx=html.indexOf(start);
  const terminator='  // Public integration bridge: no client event may be interpreted as permission to share.';
  const fin=html.indexOf(terminator,idx);
  if(idx<0||fin<0)return {html,changed:false};
  let out=html.slice(0,idx)+"  if(isEditor)document.body.classList.add('talera-editor-share-mode');\n"+html.slice(fin);
  const eventStart=out.indexOf("  document.addEventListener('talera:share-from-editor',e=>{");
  const eventEnd=out.indexOf("  if(isEditor)",eventStart);
  if(eventStart>=0&&eventEnd>eventStart)out=out.slice(0,eventStart)+out.slice(eventEnd);
  const css='<style id="talera-v61-postpublish-sharing">body.talera-editor-share-mode #app .work.talera-compact-work .work-tools{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important}body.talera-editor-share-mode [data-talera-editor-share]{display:none!important}</style>';
  out=out.replace('</head>',css+'</head>');
  return {html:out,changed:true};
}


/**
 * Capture one lightweight still from the original video with no duplicate
 * video file, no external upload and no new data store.
 * On iOS Safari a muted playing <video> often decodes reliably when a
 * detached, preload-only <video> does not.
 */
async function taleraV61MakeVideoPreview(file){
  if(!file||!file.size)return null;
  const objectUrl=URL.createObjectURL(file);
  const video=document.createElement('video');
  video.muted=true;
  video.defaultMuted=true;
  video.autoplay=true;
  video.playsInline=true;
  video.preload='auto';
  video.setAttribute('muted','');
  video.setAttribute('autoplay','');
  video.setAttribute('playsinline','');
  video.style.cssText='position:fixed;left:-10px;top:-10px;width:2px;height:2px;opacity:0;pointer-events:none;z-index:-1';
  return new Promise(resolve=>{
    let settled=false,drawing=false;
    const timer=setTimeout(()=>finish(null),12000);
    function finish(image){
      if(settled)return;
      settled=true;clearTimeout(timer);
      video.onloadedmetadata=video.onloadeddata=video.onseeked=video.oncanplay=video.ontimeupdate=video.onerror=null;
      video.pause();video.removeAttribute('src');video.remove();
      try{video.load()}catch(e){}
      URL.revokeObjectURL(objectUrl);
      resolve(image instanceof Blob&&image.size?image:null);
    }
    async function paint(){
      if(settled||drawing||video.readyState<2||!video.videoWidth||!video.videoHeight)return;
      drawing=true;
      try{
        const image=await drawnPreview(video,video.videoWidth,video.videoHeight);
        if(image?.size)finish(image);
        else drawing=false;
      }catch(e){drawing=false}
    }
    video.onloadedmetadata=()=>{
      if(Number.isFinite(video.duration)&&video.duration>.15){
        try{video.currentTime=Math.min(.15,video.duration/3)}catch(e){}
      }
      void video.play().catch(()=>{});
      if(typeof video.requestVideoFrameCallback==='function'){
        try{video.requestVideoFrameCallback(()=>void paint())}catch(e){}
      }
    };
    video.onloadeddata=()=>void paint();
    video.onseeked=()=>void paint();
    video.oncanplay=()=>void paint();
    video.ontimeupdate=()=>void paint();
    video.onerror=()=>finish(null);
    document.body.appendChild(video);
    video.src=objectUrl;
    video.load();
  });
}
function taleraV61AttachNativeCovers(){
  // Visible native Safari video fallback. Original video stays under one media ID.
  document.querySelectorAll('.tile[data-id]').forEach(tile=>{
    const id=tile.dataset.id,file=assets.get(id);
    if(!file||kind(file)!=='video'||previewBlobs.has(id)||tile.querySelector('video.talera-v61-native-cover'))return;
    const v=document.createElement('video');
    v.className='talera-v61-native-cover';
    v.muted=true;v.defaultMuted=true;v.playsInline=true;v.preload='auto';v.controls=false;
    v.setAttribute('muted','');v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.setAttribute('aria-hidden','true');
    v.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;opacity:0;z-index:1';
    let pending=false;
    const capture=async()=>{
      if(pending||!v.isConnected||!assets.has(id)||previewBlobs.has(id)||v.readyState<2||!v.videoWidth||!v.videoHeight)return;
      pending=true;v.style.opacity='1';v.pause();
      try{
        const image=await drawnPreview(v,v.videoWidth,v.videoHeight);
        if(image?.size&&assets.has(id)&&!previewBlobs.has(id)){
          previewBlobs.set(id,image);refreshPreview(id);
          try{await writeFiles([['preview:'+id,image]])}catch(e){console.warn('TALERA videominiatuurcache',e)}
        }
      }catch(e){console.warn('TALERA video-frame niet beschikbaar',e)}
      finally{pending=false}
    };
    v.addEventListener('loadedmetadata',()=>{
      if(Number.isFinite(v.duration)&&v.duration>.2){try{v.currentTime=Math.min(.15,v.duration/3)}catch(e){}}
      void v.play().then(()=>setTimeout(()=>{if(v.isConnected){v.pause();void capture()}},250)).catch(()=>{});
    },{once:true});
    for(const e of ['loadeddata','seeked','canplay','timeupdate'])v.addEventListener(e,()=>void capture());
    v.addEventListener('error',()=>{v.remove();console.warn('TALERA: Safari kon de video niet voorvertonen')},{once:true});
    tile.appendChild(v);v.src=originalUrl(id);v.load();
  });
}

async function taleraV61KeepVideoPosters(group,row){
  // Only a tiny JPEG sidecar. Video remains in the original TaleraMemories
  // item and is always loaded by its media ID in the player.
  const items=Array.isArray(row?.items)?row.items:[];
  const images=[];
  for(let i=0;i<(group?.media||[]).length;i++){
    const id=group.media[i],item=items[i],file=assets.get(id),poster=previewBlobs.get(id);
    if(item?.kind==='video'&&item.key&&kind(file)==='video'&&poster instanceof Blob&&poster.size&&poster.type.startsWith('image/')){
      images.push({key:item.key+':phone-v1',blob:poster});
    }
  }
  if(!images.length)return;
  const db=await dbOpen();
  try{
    const tx=db.transaction('files','readwrite'),finished=done(tx),store=tx.objectStore('files');
    for(const image of images)store.put(image);
    await finished;
  }finally{db.close()}
}

function patchTell(html){
  const a=html.indexOf('function openZeroPlayer(g){');
  if(a<0)return{html,changed:false,reason:'no-tell'};
  const b=html.indexOf('\nfunction review(g){',a);
  const needle="if($('pos'))$('pos').textContent=(idx+1)+' / '+g.media.length}";
  if(b<0||!html.includes(needle))return{html,changed:false,reason:'upstream-changed'};
  const updated=html.slice(0,a)+taleraV61RecordMark.toString()+'\n'+openZeroPlayer.toString()+html.slice(b);
  const patched=updated.replace(needle,"if($('pos'))$('pos').textContent=(idx+1)+' / '+g.media.length;taleraV61RecordMark(idx)}");
  if(!patched.includes('taleraV61RecControls'))return{html,changed:false,reason:'patch-incomplete'};
  const withoutPrematureShare=removeEditorShareBeforePublish(patched);
  if(!withoutPrematureShare.changed)return{html,changed:false,reason:'share-source-changed'};
  let page=withoutPrematureShare.html;
  const oldThumbFn='async function makeVideoPreview(file){';
  const start=page.indexOf(oldThumbFn),end=page.indexOf('let activeThumbs=0;',start);
  if(start<0||end<0)return{html,changed:false,reason:'thumbnail-upstream-changed'};
  page=page.slice(0,start)+taleraV61MakeVideoPreview.toString()+'\n'+page.slice(end);
  const call="const preview=kind(file)==='video'?await makeVideoPreview(file):await makePhotoPreview(file);if(!preview||!preview.size||!assets.has(id))return;previewBlobs.set(id,preview);refreshPreview(id)";
  if(!page.includes(call))return{html,changed:false,reason:'thumbnail-queue-upstream-changed'};
  page=page.replace(call,"const videoItem=kind(file)==='video';const preview=videoItem?await taleraV61MakeVideoPreview(file):await makePhotoPreview(file);if(!preview||!preview.size||!assets.has(id))return;previewBlobs.set(id,preview);refreshPreview(id);if(videoItem){try{await writeFiles([['preview:'+id,preview]])}catch(e){console.warn('TALERA videovoorbeeld niet bewaard',e)}}");

  const tileStart=page.indexOf('function tileHtml(id,gid){');
  const tileEnd=page.indexOf('\n/* V7 draft deletion.',tileStart);
  if(tileStart<0||tileEnd<0)return{html,changed:false,reason:'video-tile-upstream-changed'};
  const originalTile=page.slice(tileStart,tileEnd);
  const newTile=originalTile.replace("const f=assets.get(id),k=kind(f);return","const f=assets.get(id),k=kind(f);if(k==='video'&&!previewBlobs.has(id))requestAnimationFrame(taleraV61AttachNativeCovers);return");
  if(newTile===originalTile)return{html,changed:false,reason:'video-tile-hook-changed'};
  page=page.slice(0,tileStart)+taleraV61AttachNativeCovers.toString()+'\n'+newTile+page.slice(tileEnd);
  const thumbRefresh="if(img)img.src=src";
  if(!page.includes(thumbRefresh))return{html,changed:false,reason:'video-refresh-hook-changed'};
  page=page.replace(thumbRefresh,"if(img)img.src=src;const native=tile.querySelector('video.talera-v61-native-cover');if(native){native.pause();native.removeAttribute('src');native.remove()}");
  const oldFrame="kind(f)==='video'?'<video src=\"'+escapeHtml(originalUrl(g.media[idx]))+'\" poster=\"'+escapeHtml(u)+'\" controls playsinline preload=\"none\"></video>'";
  const newFrame="kind(f)==='video'?'<video src=\"'+escapeHtml(originalUrl(g.media[idx]))+'\" '+(previewBlobs.has(g.media[idx])?'poster=\"'+escapeHtml(u)+'\" ':'')+'controls playsinline preload=\"metadata\"></video>'";
  if(!page.includes(oldFrame))return{html,changed:false,reason:'video-work-frame-changed'};
  page=page.replace(oldFrame,newFrame);
  // At most one hardware video decoder, while allowing three lightweight
  // photo thumbnail jobs in parallel. Original storage is asynchronous.
  const originalQueueHead="let activeThumbs=0;const waitingThumbs=[];function pumpThumbs(){while(activeThumbs<3&&waitingThumbs.length){const [id,file]=waitingThumbs.shift();activeThumbs++;";
  const originalQueueTail="finally{activeThumbs--;pumpThumbs()}";
  if(!page.includes(originalQueueHead)||!page.includes(originalQueueTail))return{html,changed:false,reason:'video-queue-upstream-changed'};
  page=page.replace(originalQueueHead,"let activeThumbs=0,activeVideoThumbs=0;const waitingThumbs=[];function pumpThumbs(){while(activeThumbs<3&&waitingThumbs.length){const next=waitingThumbs.findIndex(([id,file])=>kind(file)!=='video'||activeVideoThumbs<1);if(next<0)break;const [id,file]=waitingThumbs.splice(next,1)[0];const taskIsVideo=kind(file)==='video';activeThumbs++;if(taskIsVideo)activeVideoThumbs++;");
  page=page.replace(originalQueueTail,"finally{activeThumbs--;if(taskIsVideo)activeVideoThumbs--;pumpThumbs()}");
  const css='<style id="talera-v61-native-video-cover-css">.tile{position:relative}.tile>.video{position:relative;z-index:3}.tile>video.talera-v61-native-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;z-index:1}</style>';
  page=page.replace('</head>',css+'</head>');
  // The old Player's postMessage bridge must not run without an iframe.
  page=page.replace("s.child.contentWindow){s.child.contentWindow.postMessage","s.child?.contentWindow){s.child.contentWindow.postMessage");
  const pub='async function publish(g){';
  if(!page.includes(pub))return{html,changed:false,reason:'publish-upstream-changed'};
  page=page.replace(pub,taleraV61KeepVideoPosters.toString()+'\n'+pub);
  const cleanup="const remove=[...g.media,...(g.voice?[g.voice]:[])];";
  if(!page.includes(cleanup))return{html,changed:false,reason:'publish-cleanup-upstream-changed'};
  page=page.replace(cleanup,"try{await taleraV61KeepVideoPosters(g,persisted)}catch(e){console.warn('TALERA videovoorbeeld later herstellen',e)}"+cleanup);
  // This script is owned by the original editor; keep its stores and media IDs.
  return{html:page.replace('</head>',RECORD_CSS+'</head>'),changed:true,reason:'inline-recording-video-posters-one-store'};
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/__v61-vertelmodus/health'){
      return Response.json({ok:true,build:BUILD,base:BASE_NAME,staging:true,noDataMigration:true});
    }
    if(!env?.V61_BASE?.fetch)return new Response('V61 service binding ontbreekt',{status:503});
    const upstream=await env.V61_BASE.fetch(request);
    if(request.method!=='GET'||!upstream.ok||!(upstream.headers.get('content-type')||'').includes('text/html'))return upstream;
    const html=await upstream.text();
    const result=html.includes('<script id="talera-zero-memory-adapter">')?patchPresent(html):
      html.includes('function openZeroPlayer(g){')?patchTell(html):{html,changed:false,reason:'not-applicable'};
    const headers=new Headers(upstream.headers);
    headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
    headers.set('cache-control','no-store');
    headers.set('x-talera-v61-vertelmodus',result.reason);
    // Create listening preference on both the home timeline and presentation.
    // Otherwise the existing Meer > Settings toggle only works on /present.
    const appRoutes=['/','/mijn-leven','/present','/tell'];
    const output=(appRoutes.includes(url.pathname)&&result.html.includes('</head>'))
      ?installGlobalAudioPref(result.html):result.html;
    return new Response(output,{status:upstream.status,statusText:upstream.statusText,headers});
  }
};