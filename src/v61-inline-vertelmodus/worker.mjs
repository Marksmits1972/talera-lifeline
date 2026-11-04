/**
 * TALERA V61 inline Vertelmodus staging.
 * Read-only proxy of the existing V61 worker; patch only returned /tell and
 * RH19 presentation HTML on this separate staging origin.
 * No database migration, account change, API key, or live V61 deployment.
 */
const BASE_NAME='talera-pwa-v61-opslag-onder-instellingen-20261101';
const BUILD='v61-r18-presentatie-fotos-tap-en-2500ms-r12-locked-20261104';


// One persistent listening preference shared by My Life and Presentation.
// This is intentionally initialized before the TALERA More menu renders.
const GLOBAL_AUDIO_PREF_SCRIPT = String.raw`<script id="talera-v61-listening-pref">
(()=>{
  if(window.__taleraAudioControls?.isEnabled)return;
  const KEY='talera-v61-listening-enabled';
  // R7 silently defaulted audio OFF. On this staging environment we reset
  // that faulty initial state ON once. After R8, an intentional OFF stays OFF.
  const REV='talera-v61-listening-intent-r8';
  const read=()=>{try{
    const explicit=localStorage.getItem(REV);
    return explicit==='off'?false:true;
  }catch(e){return true}};
  const write=on=>{try{
    localStorage.setItem(REV,on?'on':'off');
    localStorage.setItem(KEY,on?'on':'off');
  }catch(e){}};
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
  // Ordinary TALERA recovers its untouched native photo/strip layers.
  document.body.classList.remove('talera-v61-narration-visual');
  if(!s)return;
  if(s.timer)clearInterval(s.timer);
  clearTimeout(s.ordinaryTimer);
  if(s.audio){
    s.audio.onplay=s.audio.onpause=s.audio.onended=null;
    s.audio.onseeking=s.audio.onseeked=s.audio.ontimeupdate=null;
    s.audio.pause();s.audio.removeAttribute('src');
    // Keep the same audio element attached for the next memory on iOS.
  }
  taleraInlineCleanVideo(s);
  if(s.panel)s.panel.remove();
  if(s.voiceUrl)URL.revokeObjectURL(s.voiceUrl);
  if(s.warmImages)s.warmImages.length=0;
  if(s.hint)s.hint.remove();
}

function taleraInlineSync(s){
  if(!s||s!==taleraInline||s.phase!=='narration'||runtime.currentMemory()?.id!==s.memory.id||!s.audio)return;
  const audioMs=Math.max(0,Math.round((Number(s.audio.currentTime)||0)*1000));
  let cue=null;
  for(const c of s.cues){if(c.t<=audioMs+15)cue=c;else break}
  if(cue&&Number.isInteger(cue.index)&&cue.index>=0&&cue.index<s.frames.length){
    if(s.memory._photoIndex!==cue.index)window.__taleraV31SelectPhoto?.(s.memory.id,cue.index);
    const selected=s.frames[cue.index];
    if(selected?.kind==='video'){
      void taleraInlineLoadVideo(s,selected,cue,audioMs);
    }else if(s.video){
      taleraInlineCleanVideo(s);
    }
  }
  const secs=Math.floor(audioMs/1000);
  if(s.clock)s.clock.textContent=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
}

async function taleraInlineLoadVideo(s,frame,cue,ms){
  if(!s||s!==taleraInline||s.phase!=='narration')return;
  const targetAt=voiceMs=>{
    const offset=Math.max(0,(Number(cue.videoAtMs)||0));
    return Math.max(0,(offset+Math.max(0,voiceMs-cue.t))/1000);
  };
  const tryMutedPlay=video=>{
    if(s!==taleraInline||s.video!==video||s.phase!=='narration')return;
    if(s.audio?.paused||s.audio?.ended){if(!video.paused)video.pause();return}
    if(video.ended||!video.paused||s.videoPlayPending||video.seeking)return;
    s.videoPlayPending=true;
    try{
      Promise.resolve(video.play()).catch(e=>{
        if(e?.name!=='AbortError')console.warn('TALERA gedempte video nog niet klaar',e);
      }).finally(()=>{s.videoPlayPending=false});
    }catch(e){s.videoPlayPending=false}
  };
  if(s.videoKey!==frame.key){
    taleraInlineCleanVideo(s);
    const serial=s.videoSerial;
    const video=document.createElement('video');
    video.className='talera-v61-inline-video';
    video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');
    video.playsInline=true;video.preload='auto';
    video.muted=true;video.defaultMuted=true;video.controls=false;
    video.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:12;pointer-events:none';
    (stage.parentElement||stage).appendChild(video);s.video=video;s.videoKey=frame.key;
    // Seek once, on metadata, to the current audio position. Seeking every
    // 90ms during decode used to cause repeated iPhone freezes/stuttering.
    video.onloadedmetadata=()=>{
      if(s!==taleraInline||s.video!==video||s.videoSerial!==serial)return;
      const audioMs=Math.max(0,(Number(s.audio?.currentTime)||0)*1000);
      const wanted=targetAt(audioMs);
      const limit=Number.isFinite(video.duration)&&video.duration>0
        ?Math.max(0,video.duration-.05):wanted;
      if(wanted>.15){
        try{video.currentTime=Math.min(wanted,limit)}catch(e){}
      }
      tryMutedPlay(video);
    };
    video.onseeked=()=>tryMutedPlay(video);
    video.oncanplay=()=>tryMutedPlay(video);
    try{
      const url=await store.mediaUrl(frame.key);
      if(s!==taleraInline||s.video!==video||s.videoSerial!==serial){
        if(url)URL.revokeObjectURL(url);
        video.remove();return;
      }
      if(!url)throw Error('Originele video ontbreekt');
      s.videoUrl=url;video.src=url;
      video.load();
    }catch(e){
      if(s===taleraInline&&s.video===video)taleraInlineCleanVideo(s);
      console.warn('TALERA originele video kon niet geladen worden',e);
    }
    return;
  }
  const video=s.video;
  if(!video||s!==taleraInline)return;
  if(s.audio?.paused||s.audio?.ended){if(!video.paused)video.pause();return}
  // Correct only substantial, sustained drift. Do not fight iOS buffering.
  if(video.readyState>=2&&!video.seeking&&!video.ended){
    const target=targetAt(ms),duration=video.duration;
    const bounded=Number.isFinite(duration)&&duration>0
      ?Math.min(target,Math.max(0,duration-.05)):target;
    if(Math.abs((video.currentTime||0)-bounded)>2.25
       &&ms-(s.videoLastCorrectionAt||0)>2200){
      s.videoLastCorrectionAt=ms;
      try{video.currentTime=bounded}catch(e){}
    }
  }
  tryMutedPlay(video);
}

function taleraInlineCleanVideo(s){
  s.videoSerial=(s.videoSerial||0)+1;
  if(s.video){
    s.video.onended=s.video.onerror=s.video.onloadedmetadata=null;
    s.video.pause();s.video.removeAttribute('src');s.video.remove();s.video=null;
  }
  if(s.videoUrl){URL.revokeObjectURL(s.videoUrl);s.videoUrl=null}
  s.videoKey='';s.videoPlayPending=false;
  s.videoLastCorrectionAt=-Infinity;
}
function taleraInlineSetFrame(s,index){
  if(s!==taleraInline||runtime.currentMemory()?.id!==s.memory.id||index<0||index>=s.frames.length)return;
  s.ordinaryIndex=index;
  if(s.memory._photoIndex!==index)window.__taleraV31SelectPhoto?.(s.memory.id,index);
}
function taleraInlinePlayMedia(s,frame,muted,finished){
  if(s!==taleraInline||!frame)return;
  taleraInlineCleanVideo(s);
  const serial=s.videoSerial;
  const video=document.createElement('video');
  video.className='talera-v61-inline-video';
  video.playsInline=true;video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');
  video.preload='auto';video.controls=false;video.muted=muted;video.defaultMuted=muted;video.volume=1;
  video.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:12;pointer-events:none';
  (stage.parentElement||stage).appendChild(video);
  s.video=video;s.videoKey=frame.key;
  const tryPlay=()=>{
    if(s!==taleraInline||s.video!==video)return;
    Promise.resolve(video.play()).then(()=>{
      if(s.hint){s.hint.remove();s.hint=null}
    }).catch(e=>{
      if(e?.name==='NotAllowedError'){
        s.blockedByBrowser=true;
        if(!s.hint){
          const hint=document.createElement('div');
          hint.className='talera-v61-audio-permission-hint';
          hint.textContent='Tik op de foto om het geluid te starten';
          hint.style.cssText='position:absolute;left:50%;bottom:22%;transform:translateX(-50%);z-index:20;padding:9px 15px;border-radius:15px;background:rgba(250,250,247,.94);color:#173d52;font:650 13px system-ui;pointer-events:none';
          (stage.parentElement||stage).appendChild(hint);s.hint=hint;
        }
      }else console.warn('TALERA videoweergave niet gestart',e);
    });
  };
  video.onended=()=>{if(s===taleraInline&&s.video===video)finished?.()};
  video.onerror=()=>{if(s===taleraInline&&s.video===video){console.warn('TALERA originele video niet afspeelbaar');finished?.()}};
  void (async()=>{
    try{
      const url=await store.mediaUrl(frame.key);
      if(s!==taleraInline||s.video!==video||s.videoSerial!==serial){
        if(url)URL.revokeObjectURL(url);return;
      }
      if(!url)throw Error('Videobestand ontbreekt');
      s.videoUrl=url;video.src=url;
      video.onloadedmetadata=tryPlay;
      tryPlay();
    }catch(e){console.warn('TALERA videobestand ontbreekt',e);if(s===taleraInline&&s.video===video)finished?.()}
  })();
}
function taleraInlineReplayNext(s){
  if(s!==taleraInline||s.phase!=='originals')return;
  const frame=s.replayFrames[++s.replayIndex];
  if(!frame){taleraInlineCleanVideo(s);s.phase='done';return}
  const index=s.frames.indexOf(frame);
  if(index>=0)taleraInlineSetFrame(s,index);
  taleraInlinePlayMedia(s,frame,!window.__taleraAudioControls?.isEnabled?.(),()=>taleraInlineReplayNext(s));
}
function taleraInlineVoiceEnded(s){
  if(s!==taleraInline||s.phase!=='narration')return;
  if(s.timer){clearInterval(s.timer);s.timer=null}
  taleraInlineCleanVideo(s);
  s.replayFrames=s.frames.filter(f=>f.kind==='video');
  if(!s.replayFrames.length){s.phase='done';return}
  s.phase='originals';s.replayIndex=-1;
  taleraInlineReplayNext(s);
}
function taleraInlineOrdinaryStep(s,index){
  if(s!==taleraInline||s.phase!=='ordinary')return;
  clearTimeout(s.ordinaryTimer);s.ordinaryTimer=null;
  taleraInlineCleanVideo(s);
  if(!s.frames.length)return;
  index=(index+s.frames.length)%s.frames.length;
  taleraInlineSetFrame(s,index);
  const frame=s.frames[index];
  if(frame.kind==='video'){
    taleraInlinePlayMedia(s,frame,!window.__taleraAudioControls?.isEnabled?.(),()=>{
      // End of video does not advance the ordinary presentation; only tapping does.
    });
  }else if(s.frames.length>1&&s.frames.every(f=>f.kind==='photo')){
    // Only an ordinary, photo-only presentation uses the 2.5s slideshow.
    // Any manual tap resets this timeout. Narrated memories keep their
    // ORIGINAL voice-clock cue engine, and mixed/video stories never change.
    s.ordinaryTimer=setTimeout(()=>{
      if(s!==taleraInline||s.phase!=='ordinary'
         ||runtime.currentMemory()?.id!==s.memory.id)return;
      if(document.hidden||runtime.isMoving()){
        taleraInlineOrdinaryStep(s,s.ordinaryIndex);
        return;
      }
      taleraInlineOrdinaryStep(s,s.ordinaryIndex+1);
    },2500);
  }
}
function taleraInlineInstallOrdinaryPhotoTap(){
  // The RH19 storySurface click handler does not cover the main image stage
  // for local memories. A single capture handler handles this photo-only case.
  document.addEventListener('click',event=>{
    const s=taleraInline;
    if(!s||s.engine!=='ordinary'||s.phase!=='ordinary'||s.frames.length<=1
       ||!s.frames.every(frame=>frame.kind==='photo'))return;
    if(!event.target?.closest?.('#photoStage'))return;
    if(event.target.closest('button,a,input,select,textarea,video,audio,nav,.timeline,[role="button"],.talera-share-shell'))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    taleraInlineOrdinaryStep(s,s.ordinaryIndex+1);
  },true);
}
function taleraInlineStartOrdinary(s){
  if(s!==taleraInline)return;
  if(s.audio&&!s.audio.paused)s.audio.pause();
  if(s.timer){clearInterval(s.timer);s.timer=null}
  s.phase='ordinary';
  taleraInlineOrdinaryStep(s,0);
}

function taleraInlineInstallAudioControls(){
  const enabled=()=>Boolean(window.__taleraAudioControls?.isEnabled?.());
  const informGesture=s=>{
    if(s.hint||s!==taleraInline)return;
    const hint=document.createElement('div');
    hint.className='talera-v61-audio-permission-hint';
    hint.textContent='Tik op de foto om het geluid te starten';
    hint.style.cssText='position:absolute;left:50%;bottom:22%;transform:translateX(-50%);z-index:20;padding:9px 15px;border-radius:15px;background:rgba(250,250,247,.94);color:#173d52;font:650 13px system-ui;pointer-events:none';
    (stage.parentElement||stage).appendChild(hint);s.hint=hint;
  };
  const clearHint=s=>{if(s?.hint){s.hint.remove();s.hint=null}};
  const tryVoice=s=>{
    if(!s?.audio||s!==taleraInline||s.phase!=='narration')return;
    s.audio.muted=!enabled();
    if(!s.audio.paused)return;
    if(s._playPending)return;
    s._playPending=true;
    try{
      Promise.resolve(s.audio.play()).then(()=>{
        if(s===taleraInline){s.blockedByBrowser=false;clearHint(s)}
      }).catch(err=>{
        if(s===taleraInline&&err?.name==='NotAllowedError'){
          s.blockedByBrowser=true;
          if(enabled())informGesture(s);
        }
      }).finally(()=>{s._playPending=false});
    }catch(e){s._playPending=false}
  };
  const playCurrent=()=>{
    const s=taleraInline;if(!s)return;
    // Listening changes only the VOLUME, never which motor controls photos.
    if(s.engine==='narrated'){
      if(s.phase==='narration')tryVoice(s);
      else if(s.phase==='originals'&&s.video){
        s.video.muted=!enabled();
        if(s.video.paused)void s.video.play().catch(err=>{
          if(err?.name==='NotAllowedError'&&enabled())informGesture(s);
        });
      }
    }else if(s.video){
      s.video.muted=!enabled();
      if(s.video.paused&&!s.video.ended)void s.video.play().catch(()=>{});
    }
    if(!enabled()){s.blockedByBrowser=false;clearHint(s)}
  };
  const silence=()=>playCurrent();
  window.__taleraInlineTryAutoPlay=playCurrent;
  window.__taleraInlineStopAudio=silence;
  const retry=e=>{
    const s=taleraInline;
    if(!s||!enabled()||e.target?.closest?.('button,a,input,select,textarea,[role="button"],.talera-share-shell'))return;
    if(s.engine==='narrated'&&s.phase==='narration'&&s.audio?.paused){
      tryVoice(s);
    }else if(s.video?.paused&&!s.video.ended){
      s.video.muted=false;
      void s.video.play().then(()=>clearHint(s)).catch(()=>{});
    }
  };
  document.addEventListener('pointerup',retry,{passive:true});
  // iOS supports touchend on devices that do not dispatch pointerup.
  document.addEventListener('touchend',retry,{passive:true});
  document.addEventListener('click',e=>{
    const s=taleraInline;
    if(s?.engine!=='narrated'||s.phase!=='narration')return;
    if(!e.target?.closest?.('#photoStage,#memoryStoryScroll'))return;
    if(e.target?.closest?.('button,a,input,select,textarea,[role="button"]'))return;
    // Prevent the ordinary RH19 tap-to-next-photo handler from taking over.
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  window.addEventListener('storage',e=>{
    if(e.key==='talera-v61-listening-enabled')playCurrent();
  });
  document.addEventListener('visibilitychange',()=>{
    const s=taleraInline;if(!s)return;
    if(document.hidden){
      s.audio?.pause();s.video?.pause();
    }else if(s.engine==='narrated'&&s.phase==='narration')tryVoice(s);
    else if(s.video?.paused&&!s.video.ended)void s.video.play().catch(()=>{});
  });
}

async function present(memory){
  if(!stage||!memory)return;
  if(activeId===memory.id){
    const s=taleraInline;
    if(s?.engine==='ordinary'&&Number.isInteger(memory._photoIndex)&&
       s.ordinaryIndex!==memory._photoIndex)taleraInlineOrdinaryStep(s,memory._photoIndex);
    else if(s?.engine==='narrated'&&s.phase==='narration'&&
       s.cues.length&&memory._photoIndex!==s.cues[0].index){
      // Existing RH19 gesture handlers are not a second storytelling engine.
      taleraInlineSync(s);
    }
    return;
  }
  disposePresentation();
  // One visible RH19 image only for narrated memories: the original photo
  // layer A is the image owner, while the existing native video appears only
  // for video cues. The ordinary mode retains all normal navigation layers.
  const hasRecordedVoice=!!memory._zeroItems?.some(x=>x.kind==='audio');
  document.body.classList.toggle('talera-v61-narration-visual',hasRecordedVoice);
  activeId=memory.id;
  const own=++serial;
  const voice=memory._zeroItems.find(x=>x.kind==='audio');
  let blob=null;
  if(voice){try{blob=await store.blob(voice.key)}catch(e){}}
  if(activeId!==memory.id||serial!==own||runtime.currentMemory()?.id!==memory.id)return;
  const frames=memory._zeroFrames||[];
  const raw=Array.isArray(memory._taleraNarrationCues)?memory._taleraNarrationCues:[];
  const idIndex=new Map(frames.map((f,i)=>[f.key,i]));
  const cues=raw.map(c=>{
    const time=Number(c?.t);
    if(!Number.isFinite(time)||time<0)return null;
    const byId=typeof c.mediaId==='string'&&c.mediaId.length>0;
    const index=byId?idIndex.get(c.mediaId):Number(c?.index);
    if(!Number.isInteger(index)||index<0||index>=frames.length)return null;
    const videoAtMs=Math.max(0,Number(c.videoAtMs)||0);
    return{t:Math.round(time),index,mediaId:frames[index].key,videoAtMs};
  }).filter(Boolean).sort((a,b)=>a.t-b.t);
  const hasVoice=blob instanceof Blob&&blob.size>0;
  if(!hasVoice)document.body.classList.remove('talera-v61-narration-visual');
  // Older voice records without cues play with their first image held still.
  // The engine still remains narrated: never replace it with an auto slideshow.
  if(hasVoice&&frames.length&&!cues.length)cues.push({t:0,index:0,mediaId:frames[0].key,videoAtMs:0});
  if(hasVoice&&cues.length&&cues[0].t>0)cues.unshift({t:0,index:cues[0].index,mediaId:cues[0].mediaId,videoAtMs:0});
  const s={memory,frames,cues,audio:null,voiceUrl:null,timer:null,video:null,videoKey:'',videoUrl:null,
    videoSerial:0,ordinaryTimer:null,ordinaryIndex:0,engine:hasVoice?'narrated':'ordinary',
    phase:'ready',replayFrames:[],replayIndex:-1,blockedByBrowser:false,hint:null,_playPending:false};
  taleraInline=s;
  if(hasVoice){
    s.warmImages=frames.map(frame=>{
      const src=frame.url;
      if(!src)return null;
      const image=new Image();image.decoding='async';image.src=src;
      if(typeof image.decode==='function')void image.decode().catch(()=>{});
      return image;
    }).filter(Boolean);
  }
  if(hasVoice){
    const audio=window.__taleraInlineSharedAudio||document.createElement('audio');
    window.__taleraInlineSharedAudio=audio;
    audio.preload='auto';audio.playsInline=true;audio.style.display='none';
    if(audio.parentElement!==stage)stage.appendChild(audio);
    s.voiceUrl=URL.createObjectURL(blob);
    audio.src=s.voiceUrl;audio.muted=!window.__taleraAudioControls?.isEnabled?.();audio.volume=1;s.audio=audio;
    const tick=()=>{if(s===taleraInline&&s.phase==='narration')taleraInlineSync(s)};
    const stopTimer=()=>{if(s.timer){clearInterval(s.timer);s.timer=null}};
    audio.onplay=()=>{if(s.phase==='narration'){stopTimer();tick();s.timer=setInterval(tick,90)}};
    audio.onpause=()=>{stopTimer();if(s.phase==='narration'&&s.video)s.video.pause()};
    audio.onended=()=>{stopTimer();tick();taleraInlineVoiceEnded(s)};
    audio.ontimeupdate=tick;audio.onseeking=tick;audio.onseeked=tick;
    s.phase='narration';
    if(s.frames.length)taleraInlineSetFrame(s,s.cues[0]?.index||0);
    taleraInlineSync(s);
    window.__taleraInlineTryAutoPlay?.();
  }else taleraInlineStartOrdinary(s);
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
  if(last?.mediaId===s.g.media[index]&&!force)return;
  const mediaId=s.g.media[index];
  if(typeof mediaId!=='string'||!mediaId)return;
  const cue={t:ms,index,mediaId};
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
    if(!s.touch||!e.changedTouches?.length)return;
    const dx=e.changedTouches[0].clientX-s.touch.x,dy=e.changedTouches[0].clientY-s.touch.y;
    s.touch=null;
    if(Math.abs(dx)>30||Math.abs(dy)>30)s.skipClickUntil=Date.now()+600;
    // During narration, handle the swipe once in the capture phase. Native
    // iOS video surfaces may never generate a synthetic click or bubble the
    // touchend to the editor's ordinary swipe listener. Keep one media cue.
    if(s.recorder?.state==='recording'&&g.media.length>1
       &&Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){
      e.stopImmediatePropagation();
      stepPhoto(g,dx<0?1:-1);
    }
  };
  const onClick=e=>{if(Date.now()<s.skipClickUntil||e.target.closest('button'))return;if(g.media.length>1)stepPhoto(g,1)};
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
  const stopRecording=()=>{
    const r=s.recorder;
    if(!r||s.saving||!['recording','paused'].includes(r.state))return;
    s.saving=true;
    start.disabled=true;start.textContent='Opname bewaren…';
    try{
      r.stop();
      feedback('Je opname wordt bewaard…');
    }catch(e){
      s.saving=false;start.disabled=false;
      start.textContent='■ Stoppen';
      feedback('Stoppen lukte niet. Tik nogmaals: '+e.message);
    }
  };
  // Safari sometimes suppresses a synthetic click after the full-screen
  // picture's touch gestures. A direct touchend also reaches Stoppen.
  start.addEventListener('touchend',e=>{
    if(s.recorder&&['recording','paused'].includes(s.recorder.state)&&!s.saving){
      e.preventDefault();e.stopPropagation();stopRecording();
    }
  },{passive:false});
  start.onclick=async()=>{
    if(s.recorder&&['recording','paused'].includes(s.recorder.state)){stopRecording();return}
    if(s.recorder||s.saving){feedback('Je opname wordt bewaard…');return}
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){status.textContent='Deze browser ondersteunt opnemen niet.';return}
    start.disabled=true;start.textContent='Microfoon openen…';preview.pause();feedback('Microfoon voorbereiden…');
    try{
      s.stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(x=>MediaRecorder.isTypeSupported(x));
      const r=new MediaRecorder(s.stream,mime?{mimeType:mime}:undefined);
      s.recorder=r;s.parts=[];s.started=performance.now();s.paused=0;s.pauseStart=0;
      // Every new voice starts at photo/video #1, even if editing previously stopped elsewhere.
      if(g.media.length&&idx!==0)stepPhoto(g,-idx);
      s.cues=g.media.length?[{t:0,index:0,mediaId:g.media[0]}]:[];
      const v=frame.querySelector(':scope > video');
      if(v&&s.cues.length)s.cues[0].videoAtMs=Math.max(0,Math.round((v.currentTime||0)*1000));
      r.ondataavailable=e=>{if(e.data?.size)s.parts.push(e.data)};
      r.onerror=()=>{feedback('Opnemen mislukt. De vorige opname is behouden.');cleanMedia();s.recorder=null;s.saving=false;start.textContent='● Opnemen';start.disabled=false;pause.hidden=true;stop.hidden=true;clock.hidden=true};
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
      r.start(1000);start.textContent='■ Stoppen';start.hidden=false;start.disabled=false;pause.hidden=true;stop.hidden=true;clock.hidden=false;
      feedback('');
      videoAdjust();s.clockTimer=setInterval(updateClock,350);
    }catch(e){cleanMedia();s.recorder=null;s.saving=false;start.textContent='● Opnemen';start.disabled=false;feedback('Microfoon niet beschikbaar: '+e.message)}
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
  stop.onclick=stopRecording;
  videoAdjust();
}

const RECORD_CSS = '\n<style id="talera-v61-inline-record-css">'+
'body.talera-v61-inline-recording{overflow:hidden!important}'+
'body.talera-v61-inline-recording #frame{background:#fbfaf7!important}'+
'body.talera-v61-inline-recording #app .work.talera-compact-work #frame{display:flex!important;align-items:center!important;justify-content:center!important;position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;z-index:2000!important;background:#fbfaf7!important;overflow:hidden!important}'+
'body.talera-v61-inline-recording #frame>img,body.talera-v61-inline-recording #frame>video{width:100%!important;height:100%!important;object-fit:contain!important;max-height:none!important;max-width:none!important}'+
'body.talera-v61-inline-recording #frame>video{pointer-events:none!important;touch-action:none!important}'+
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
  const injected=['let taleraInline=null;',taleraInlineDispose.toString(),taleraInlineSync.toString(),taleraInlineLoadVideo.toString(),taleraInlineCleanVideo.toString(),taleraInlineSetFrame.toString(),taleraInlinePlayMedia.toString(),taleraInlineReplayNext.toString(),taleraInlineVoiceEnded.toString(),taleraInlineOrdinaryStep.toString(),taleraInlineInstallOrdinaryPhotoTap.toString(),taleraInlineStartOrdinary.toString(),taleraInlineInstallAudioControls.toString(),present.toString(),'taleraInlineInstallAudioControls();taleraInlineInstallOrdinaryPhotoTap();'].join('\n');
  block=block.slice(0,p)+injected+'\n '+block.slice(v);
  block=block.replace('function disposePresentation(){','function disposePresentation(){\n taleraInlineDispose();');
  const oldActivate="   const hasVoice=memory._zeroItems.some(x=>x.kind==='audio');\n   if(hasVoice){\n     void present(memory);\n     return;\n   }\n   if(currentPresentation)disposePresentation();\n   const selected=memory._zeroFrames?.[memory._photoIndex||0];\n   if(selected?.kind==='video'){void showSimpleVideo(memory,selected);return}\n   if(localVideo){localVideo.pause();localVideo.remove();localVideo=null}";
  if(!block.includes(oldActivate))return{html,changed:false,reason:'activation-upstream-changed'};
  block=block.replace(oldActivate,"   void present(memory);");
  // A video is still one original media item. A tiny still image is a
  // rendition associated with that item's ID, in the SAME TaleraMemories
  // IndexedDB files store (the :phone-v1 key is already used for renditions).
  const photoRead="if(item.kind==='photo'){\n           try{url=await (store.displayUrl?store.displayUrl(item.key):store.mediaUrl(item.key))}catch(e){}\n         }";
  if(!block.includes(photoRead))return{html,changed:false,reason:'video-poster-hydrate-upstream-changed'};
  block=block.replace(photoRead,photoRead+"\n         if(item.kind==='video'){\n           try{const poster=await store.blob(item.key+':phone-v1');if(poster instanceof Blob&&poster.size&&String(poster.type).startsWith('image/'))url=URL.createObjectURL(poster)}catch(e){}\n         }");
  // The already-existing RH19 photograph layer reads _taleraFrames,
  // while the V61 adapter hydrates _zeroFrames. Both must reference the
  // SAME array of canonical media IDs; no duplicate files or viewer.
  const frameAssignment='memory._zeroFrames=frames;';
  if(!block.includes(frameAssignment))return{html,changed:false,reason:'rh19-frame-contract-changed'};
  block=block.replace(frameAssignment,'memory._zeroFrames=frames;memory._taleraFrames=frames;');
  const oldCover="photos.push(item.kind==='video'?videoPoster:(url||placeholder));";
  if(!block.includes(oldCover))return{html,changed:false,reason:'video-poster-cover-upstream-changed'};
  block=block.replace(oldCover,"photos.push(item.kind==='video'?(url||videoPoster):(url||placeholder));");
  block=block.replace('if(localVideo)locate(localVideo);','if(localVideo&&localVideo.parentElement!==stage)locate(localVideo);');
  if(block.includes("frame.src='/vertelmodus-embed?mode=present'")||!block.includes('taleraInlineSync'))return{html,changed:false,reason:'patch-incomplete'};
  let page=html.slice(0,begin)+block+html.slice(end);
  const hostNeedle="return function(memory){\n      if(!ensure())return;";
  const nativeReplacement="return function(memory){\n      if(memory?._taleraLocal&&memory._zeroItems?.some(x=>x.kind==='audio')){hide();return}\n      if(!ensure())return;";
  if(!page.includes(hostNeedle)||page.split(hostNeedle).length!==2)
    return{html,changed:false,reason:'rh19-sync-host-contract-changed'};
  page=page.replace(hostNeedle,nativeReplacement);
  // Narrated RH19 uses photoLayerA as its ONE visible image. Other native
  // layers stay intact but are visually inactive until ordinary mode.
  const ownerCSS='<style id="talera-v61-r12-one-photo-owner">'
    +'body.talera-v61-narration-visual #photoStage>#photoLayerB,'
    +'body.talera-v61-narration-visual #photoStage .talera-photo-strip,'
    +'body.talera-v61-narration-visual #photoStage .talera-story-synced-photo'
    +'{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}'
    +'body.talera-v61-narration-visual #photoStage>#photoLayerA'
    +'{display:block!important;visibility:visible!important;opacity:1!important;transform:none!important}'
    +'</style>';
  // R18 presentation-only visual polish. This changes no media handlers.
  const presentationSkin='<style id="talera-v61-r18-presentation-chrome">'
    +'body .talera-v61-audio-permission-hint{display:none!important}'
    +'body:not(.talera-recipient-presentation) #talera-v30-edit'
    +'{background:rgba(250,252,255,.16)!important;'
    +'border:1px solid rgba(255,255,255,.82)!important;'
    +'color:#fff!important;box-shadow:0 3px 12px rgba(13,30,42,.11)!important;'
    +'backdrop-filter:blur(18px) saturate(1.18)!important;-webkit-backdrop-filter:blur(18px) saturate(1.18)!important}'
    +'</style>';
  if(!page.includes('</head>'))return{html,changed:false,reason:'missing-head'};
  page=page.replace('</head>',ownerCSS+presentationSkin+'</head>');
  return{html:page,changed:true,reason:'r18-photo-only-presentation'};
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


async function taleraV61PersistMediaIds(g,persisted){
  // Canonical media references are assigned by TaleraMemories.save().
  // Amend ONLY story metadata in the SAME IndexedDB stories store; never
  // re-upload/copy an original video or create a second library.
  if(!g.voice)return persisted;
  const source=Array.isArray(g.voiceCues)?g.voiceCues:[];
  const items=(persisted.items||[]).filter(item=>item.kind==='photo'||item.kind==='video');
  if(items.length!==g.media.length)throw Error('De mediavolgorde kon niet veilig worden vastgelegd.');
  const mapped=[];
  for(const cue of source){
    const fromId=typeof cue?.mediaId==='string'&&cue.mediaId.length;
    const index=fromId?g.media.indexOf(cue.mediaId):Number(cue?.index);
    if(!Number.isInteger(index)||index<0||index>=items.length||!items[index]?.key)
      throw Error('Een foto of video uit de opname is verwijderd. Herstel deze of spreek opnieuw in.');
    const time=Math.max(0,Math.round(Number(cue.t)||0));
    const row={t:time,index,mediaId:items[index].key};
    if(Number.isFinite(Number(cue.videoAtMs))&&Number(cue.videoAtMs)>=0)
      row.videoAtMs=Math.round(Number(cue.videoAtMs));
    mapped.push(row);
  }
  mapped.sort((a,b)=>a.t-b.t);
  if(items.length&&mapped.length&&mapped[0].t!==0)
    throw Error('De beginfoto ontbreekt in het opgenomen tijdschema.');
  const updated={...persisted,narrationCues:mapped,narrationSchema:'media-id-v1'};
  const db=await dbOpen();
  try{
    const tx=db.transaction('stories','readwrite'),complete=done(tx);
    tx.objectStore('stories').put(updated);
    await complete;
  }finally{db.close()}
  const verify=await mem.get(persisted.id);
  if(!verify||verify.narrationSchema!=='media-id-v1'
    ||JSON.stringify(verify.narrationCues)!==JSON.stringify(mapped))
    throw Error('Het tijdschema met media-ID’s kon niet worden teruggelezen.');
  return verify;
}


let taleraV9MediaMutating=false;
async function taleraV9RemoveMedia(g,id){
  if(taleraV9MediaMutating||!g.media.includes(id))return;
  if(taleraZeroSession||recorder&&recorder.state!=='inactive'){
    showError('Stop eerst je opname voordat je een beeld verwijdert.');return;
  }
  const tied=Boolean(g.voice&&Array.isArray(g.voiceCues)&&g.voiceCues.some(
    c=>c?.mediaId===id||(!c?.mediaId&&g.media[Number(c.index)]===id)
  ));
  if(tied){
    if(document.getElementById('taleraV9MediaConfirm'))return;
    const sheet=document.createElement('div');
    sheet.id='taleraV9MediaConfirm';sheet.setAttribute('role','dialog');
    sheet.setAttribute('aria-modal','true');
    sheet.setAttribute('aria-label','Beeld verwijderen');
    sheet.innerHTML='<div class="talera-v7-delete-sheet"><h2>Beeld verwijderen?</h2>'
      +'<p>Dit beeld hoort bij je ingesproken verhaal. Na verwijderen moet je opnieuw inspreken.</p>'
      +'<div class="talera-v7-delete-actions"><button type="button" data-answer="no">Annuleren</button>'
      +'<button type="button" data-answer="yes">Verwijderen</button></div></div>';
    document.body.append(sheet);
    const yes=await new Promise(resolve=>{
      sheet.querySelector('[data-answer="no"]').onclick=()=>resolve(false);
      sheet.querySelector('[data-answer="yes"]').onclick=()=>resolve(true);
      sheet.addEventListener('click',e=>{if(e.target===sheet)resolve(false)});
    });
    sheet.remove();
    if(!yes)return;
  }
  taleraV9MediaMutating=true;
  const previous={media:[...g.media],voice:g.voice,cues:g.voiceCues,duration:g.voiceDurationMs,wave:g.voiceWave};
  try{
    await queue;await savingOriginals;
    g.media=g.media.filter(k=>k!==id);
    if(tied){g.voice='';g.voiceCues=[];g.voiceDurationMs=0;g.voiceWave=[]}
    await saveDraft();
    const candidates=[id,...(tied&&previous.voice?[previous.voice]:[])];
    const unused=candidates.filter(k=>!groups.some(x=>x.media.includes(k)||x.voice===k));
    if(unused.length){
      try{await deleteFiles(unused.flatMap(k=>[k,'preview:'+k]))}
      catch(e){console.warn('TALERA oud voorbeeld later opruimen',e)}
      for(const k of unused){
        revoke(k);assets.delete(k);
        const cached=previewUrls.get(k);if(cached)URL.revokeObjectURL(cached);
        previewUrls.delete(k);previewBlobs.delete(k);
      }
    }
    errorMsg='';
    open('work',g.id);
  }catch(e){
    g.media=previous.media;g.voice=previous.voice;g.voiceCues=previous.cues;
    g.voiceDurationMs=previous.duration;g.voiceWave=previous.wave;
    showError('Dit beeld kon niet worden verwijderd: '+e.message);
  }finally{taleraV9MediaMutating=false}
}
function taleraV9EditorMediaControls(g){
  const panel=document.querySelector('.talera-work-tiles');
  const grid=panel?.querySelector('.tiles');
  if(!grid)return;
  // Keep every original TALERA tile as a DIRECT grid child. Wrapping a
  // percentage-height tile in a new aspect-ratio div made Safari shrink
  // thumbnails to tiny images while the delete buttons stayed full size.
  for(const [i,tile] of [...grid.querySelectorAll(':scope > .tile')].entries()){
    const row=String(Math.floor(i/3)+1),column=String(i%3+1);
    tile.style.gridRow=row;tile.style.gridColumn=column;
    const remove=document.createElement('button');
    remove.type='button';remove.className='talera-v9-remove-media';
    remove.style.gridRow=row;remove.style.gridColumn=column;
    remove.textContent='×';remove.setAttribute('aria-label','Beeld verwijderen');
    remove.title='Beeld verwijderen';
    remove.onclick=e=>{e.preventDefault();e.stopPropagation();void taleraV9RemoveMedia(g,tile.dataset.id)};
    grid.append(remove);
  }
  if(g.media.length>=6)return;
  const input=document.createElement('input');
  input.type='file';input.accept='image/*,video/*';input.multiple=true;input.hidden=true;
  input.id='taleraV9AddMediaInput';
  input.onchange=()=>{
    const files=[...(input.files||[])];input.value='';
    if(files.length)void importPhotos(files,g.id);
  };
  const add=document.createElement('button');
  add.type='button';add.className='talera-v9-add-media';
  add.textContent='+';add.setAttribute('aria-label','Foto of video toevoegen');
  add.title='Beeld toevoegen';
  add.onclick=()=>{if(!taleraZeroSession&&!taleraV9MediaMutating)input.click()};
  grid.append(add);panel.append(input);
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
  page=page.replace(pub,taleraV61KeepVideoPosters.toString()+'\n'+taleraV61PersistMediaIds.toString()+'\n'+pub);
  const cleanup="const remove=[...g.media,...(g.voice?[g.voice]:[])];";
  if(!page.includes(cleanup))return{html,changed:false,reason:'publish-cleanup-upstream-changed'};
  page=page.replace(cleanup,"await taleraV61PersistMediaIds(g,persisted);try{await taleraV61KeepVideoPosters(g,persisted)}catch(e){console.warn('TALERA videovoorbeeld later herstellen',e)}"+cleanup);

  // Keep the original import, media IDs and design sizes. Only make the
  // currently opened concept editable and remove the verbose overview copy.
  const importStart="async function importPhotos(chosen){\n if(!chosen.length)return;\n if(chosen.length>25)";
  const importTarget="async function importPhotos(chosen,targetGroupId=''){\n if(!chosen.length)return;\n const target=targetGroupId?groups.find(g=>g.id===targetGroupId):null;\n if(targetGroupId&&!target){showError('Deze herinnering is niet meer beschikbaar.');return}\n if(target&&chosen.length>6-target.media.length){\n   showError('Er passen nog '+(6-target.media.length)+' beelden bij deze herinnering. Maximaal zes.');return;\n }\n if(target&&(taleraZeroSession||taleraV9MediaMutating)){\n   showError('Stop eerst de opname voordat je foto’s toevoegt.');return;\n }\n if(chosen.length>25)";
  const importGroups="  const made=makeGroups(rows);for(const g of made){g.date=today();g.precision='exact';g.dateSource='creation';g.dateConfirmed=true}groups.push(...made);importsPending++;";
  const appendToExisting="  // In an open memory, append to THAT memory instead of creating a new group.\n  // Keep the same draft media IDs and the one existing IndexedDB store.\n  if(target){\n    if(target.media.length+entries.length>6)\n      throw Error('Deze herinnering kan maximaal zes beelden bevatten.');\n    const prior=[...target.media];\n    target.media.push(...entries.map(([id])=>id));\n    importsPending++;\n    savingOriginals=savingOriginals.then(()=>writeFiles(entries));\n    const saved=saveDraft();\n    open('work',target.id);\n    afterImportMedia(entries);notifyImportStatus();\n    saved.then(()=>{importsPending=Math.max(0,importsPending-1);notifyImportStatus()})\n      .catch(e=>{\n        importsPending=Math.max(0,importsPending-1);\n        target.media=prior;\n        showError('De toegevoegde beelden zijn nog niet veilig bewaard: '+e.message);\n        notifyImportStatus();\n      });\n    return;\n  }\n  const made=makeGroups(rows);for(const g of made){g.date=today();g.precision='exact';g.dateSource='creation';g.dateConfirmed=true}groups.push(...made);importsPending++;";
  if(!page.includes(importStart)||!page.includes(importGroups))
    return{html,changed:false,reason:'r9-import-upstream-changed'};
  page=page.replace(importStart,importTarget);
  page=page.replace(importGroups,appendToExisting);
  const overviewAt=page.indexOf('function overview(){');
  const overviewEnd=page.indexOf('\nlet dragGhost=',overviewAt);
  if(overviewAt<0||overviewEnd<0)return{html,changed:false,reason:'r9-overview-upstream-changed'};
  let overview=page.slice(overviewAt,overviewEnd);
  const para=overview.indexOf('<p class="p">');
  const paraEnd=overview.indexOf('</p>',para);
  if(para<0||paraEnd<0||!overview.slice(para,paraEnd).includes('Kloppen de foto'))
    return{html,changed:false,reason:'r9-overview-copy-changed'};
  overview=overview.slice(0,para)+overview.slice(paraEnd+4);
  overview=overview.replace("'+count+' beelden</span>","</span>");
  overview=overview.replace('Je werk is nog niet op de tijdlijn geplaatst.','');
  overview=overview.replace('Open herinnering →','Open →');
  overview=overview.replace("g.media.length+' beelden · '+(g.existing?'Bewerken':'Concept')","''");
  page=page.slice(0,overviewAt)+overview+page.slice(overviewEnd);
  const importStatus="node.hidden=false;node.textContent=importsPending?'Originele bestanden bewaren…':'Je werk is nog niet op de tijdlijn geplaatst.'";
  if(!page.includes(importStatus))return{html,changed:false,reason:'r9-status-upstream-changed'};
  page=page.replace(importStatus,"node.hidden=!importsPending;node.textContent=importsPending?'Beelden bewaren…':''");
  const workTilesHook="tiles.querySelectorAll('.tile').forEach(enableDrag);";
  if(!page.includes(workTilesHook))return{html,changed:false,reason:'r9-tiles-upstream-changed'};
  page=page.replace(workTilesHook,workTilesHook+'taleraV9EditorMediaControls(g);');
  // Helpers execute INSIDE the original editor closure, sharing its state.
  const workAnchor='function taleraCompactWorkbench(g){';
  if(!page.includes(workAnchor))return{html,changed:false,reason:'r9-editor-upstream-changed'};
  page=page.replace(workAnchor,
    'let taleraV9MediaMutating=false;\n'
    +taleraV9RemoveMedia.toString()+'\n'
    +taleraV9EditorMediaControls.toString()+'\n'
    +workAnchor);
  const cssR9='<style id="talera-v61-r9-controls-css">'
    +'#app .work.talera-compact-work .talera-work-tiles .tile{min-width:0!important;width:100%!important;aspect-ratio:1/1!important;height:auto!important}'
    +'#app .work.talera-compact-work .talera-work-tiles .tile>img{width:100%!important;height:100%!important;object-fit:cover!important}'
    +'#app .work.talera-compact-work .talera-v9-remove-media{position:relative;align-self:start;justify-self:end;margin:5px;z-index:5;width:28px;height:28px;min-width:28px;max-width:28px;border:0;border-radius:50%;background:rgba(255,255,255,.97);color:#173b52;box-shadow:0 1px 5px #1234;font:650 20px/1 system-ui;padding:0;touch-action:manipulation}'
    +'#app .work.talera-compact-work .talera-v9-add-media{display:grid;place-items:center;aspect-ratio:1;width:100%;border:2px dashed #bdd1d9;border-radius:13px;background:#f1f6f8;color:#20516b;font:450 42px/1 system-ui;touch-action:manipulation}'
    +'#taleraV61RecControls{z-index:9990!important;pointer-events:auto!important}'
    +'#taleraV61RecControls #taleraV61RecStart{touch-action:manipulation;pointer-events:auto!important;-webkit-tap-highlight-color:transparent;user-select:none}'
    +'#app .group-header .tag,#app #cards .card-head>span{display:none!important}'
    +'</style>';
  page=page.replace('</head>',cssR9+'</head>');

  // This script is owned by the original editor; keep its stores and media IDs.
  return{html:page.replace('</head>',RECORD_CSS+'</head>'),changed:true,reason:'inline-recording-video-posters-one-store'};
}


const V13_DATE_HANDLERS="\nlet v13Mode='exact';\nfunction v13Today(){\n const d=new Date();return String(d.getFullYear())+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');\n}\nfunction v13SetMode(mode){\n v13Mode=['exact','month','year','season'].includes(mode)?mode:'exact';\n const isExact=v13Mode==='exact';\n $('v13ExactLine').hidden=!isExact;\n $('v13Partial').hidden=isExact;\n $('v13Expand').hidden=!isExact;\n $('v13BackToDate').hidden=isExact;\n $('v13YearLine').hidden=isExact;\n $('v13MonthLine').hidden=v13Mode!=='month';\n $('v13SeasonLine').hidden=v13Mode!=='season';\n for(const button of dialog.querySelectorAll('[data-v13-mode]')){\n   button.setAttribute('aria-pressed',String(button.dataset.v13Mode===v13Mode));\n }\n $('v13Error').hidden=true;\n}\nfunction create(){\n if(dialog)return;\n dialog=document.createElement('div');\n dialog.id='v30DateModal';dialog.hidden=true;\n dialog.innerHTML='<section id=\"v30DateBox\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"v30DateHeading\">'\n  +'<h2 id=\"v30DateHeading\">Wanneer was dit?</h2>'\n  +'<div id=\"v30DateFields\">'\n  +'<label id=\"v13ExactLine\">Datum<input id=\"v13ExactDate\" type=\"date\" lang=\"nl-NL\" min=\"1900-01-01\"></label>'\n  +'<button id=\"v13Expand\" type=\"button\">Ik weet de exacte dag niet</button>'\n  +'<div id=\"v13Partial\" hidden>'\n  +'<div id=\"v13ModeButtons\" role=\"group\" aria-label=\"Wat weet je nog?\">'\n  +'<button type=\"button\" data-v13-mode=\"month\">Maand</button>'\n  +'<button type=\"button\" data-v13-mode=\"year\">Jaar</button>'\n  +'<button type=\"button\" data-v13-mode=\"season\">Seizoen</button>'\n  +'</div>'\n  +'<div id=\"v13PartialFields\">'\n  +'<label id=\"v13YearLine\">Jaar<input id=\"v13Year\" type=\"number\" inputmode=\"numeric\" min=\"1900\" max=\"2100\" placeholder=\"Bijv. 1984\"></label>'\n  +'<label id=\"v13MonthLine\" hidden>Maand<select id=\"v13Month\"></select></label>'\n  +'<label id=\"v13SeasonLine\" hidden>Seizoen<select id=\"v13Season\"><option value=\"lente\">Lente</option><option value=\"zomer\">Zomer</option><option value=\"herfst\">Herfst</option><option value=\"winter\">Winter</option></select></label>'\n  +'</div></div>'\n  +'<button id=\"v13BackToDate\" type=\"button\" hidden>Ik weet de exacte datum</button>'\n  +'<p id=\"v13Error\" role=\"alert\" hidden></p></div>'\n  +'<div id=\"v30DateActions\"><button id=\"v30DateCancel\" type=\"button\">Annuleren</button><button id=\"v30DateSave\" type=\"button\">Bewaren</button></div>'\n  +'</section>';\n document.body.append(dialog);\n $('v13ExactDate').max=v13Today();\n $('v13Year').max=String(new Date().getFullYear());\n monthNames.forEach((label,index)=>{\n   const option=document.createElement('option');\n   option.value=String(index+1).padStart(2,'0');option.textContent=label;\n   $('v13Month').append(option);\n });\n $('v13Expand').onclick=()=>v13SetMode('year');\n $('v13BackToDate').onclick=()=>v13SetMode('exact');\n for(const button of dialog.querySelectorAll('[data-v13-mode]')){\n   button.onclick=()=>v13SetMode(button.dataset.v13Mode);\n }\n $('v30DateCancel').onclick=()=>dialog.hidden=true;\n dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.hidden=true});\n dialog.addEventListener('keydown',e=>{\n   if(e.key==='Escape'){e.preventDefault();dialog.hidden=true}\n });\n $('v30DateSave').onclick=()=>{\n   const year=String($('v13Year').value||'').trim();\n   const month=$('v13Month').value;\n   const season=$('v13Season').value;\n   const seasonMonth={lente:'03',zomer:'06',herfst:'09',winter:'12'};\n   const date=v13Mode==='exact'?$('v13ExactDate').value:\n     year+'-'+(v13Mode==='month'?month:v13Mode==='season'?seasonMonth[season]:'01')+'-01';\n   const d=new Date(date+'T12:00:00');\n   const valid=/^\\d{4}-\\d{2}-\\d{2}$/.test(date)&&Number.isFinite(+d)\n    &&d.getFullYear()===+date.slice(0,4)&&d.getMonth()+1===+date.slice(5,7)\n    &&d.getDate()===+date.slice(8,10)\n    &&date>= '1900-01-01' && date<=v13Today();\n   if(!valid){\n     $('v13Error').textContent='Kies een geldige datum.';\n     $('v13Error').hidden=false;return;\n   }\n   const precision=$('precision');\n   if(!precision){$('v13Error').textContent='Datumveld niet beschikbaar.';$('v13Error').hidden=false;return}\n   // Use the EXISTING editor save and date model. No new storage format.\n   $('dateToggle')?.onclick?.();\n   precision.value=v13Mode;\n   precision.dispatchEvent(new Event('change',{bubbles:true}));\n   const input=v13Mode==='exact'?$('date'):v13Mode==='month'?$('month'):$('year');\n   if(!input){$('v13Error').textContent='Probeer opnieuw.';$('v13Error').hidden=false;return}\n   input.value=v13Mode==='exact'?date:v13Mode==='month'?date.slice(0,7):date.slice(0,4);\n   input.dispatchEvent(new Event('input',{bubbles:true}));\n   input.dispatchEvent(new Event('change',{bubbles:true}));\n   if(v13Mode==='season'&&$('season')){\n     $('season').value=season;\n     $('season').dispatchEvent(new Event('change',{bubbles:true}));\n   }\n   $('v10DateDone')?.click();\n   dialog.hidden=true;\n };\n v13SetMode('exact');\n}\nfunction show(){\n create();\n const precision=$('precision')?.value||'exact';\n const saved=$('date')?.value||$('month')?.value||$('year')?.value||'';\n const year=/^\\d{4}/.test(saved)?saved.slice(0,4):String(new Date().getFullYear());\n const month=/^\\d{4}-\\d{2}/.test(saved)?saved.slice(5,7):'01';\n const day=/^\\d{4}-\\d{2}-\\d{2}$/.test(saved)?saved.slice(8,10):'01';\n $('v13Year').value=year;\n $('v13Month').value=month;\n $('v13Season').value=$('season')?.value||'lente';\n $('v13ExactDate').value=precision==='exact'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(saved)\n   ?saved : precision==='month' ?year+'-'+month+'-01' : precision==='year'?year+'-01-01':'';\n v13SetMode(precision);\n dialog.hidden=false;\n}\ndocument.addEventListener('click',e=>{\n if(e.target.closest('#dateToggle,#v10ChangeDate')){\n   e.preventDefault();e.stopImmediatePropagation();show();\n }else if(e.target.closest('#publish')&&/nog te kiezen|not chosen|aún|choisir|noch/i.test($('dateToggle')?.textContent||'')){\n   e.preventDefault();e.stopImmediatePropagation();show();\n }\n},true);\n";
const V13_DATE_CSS="<style id=\"talera-v61-r13-simple-date\">\n#v30DateBox{width:min(100%,410px);padding:24px;border-radius:23px}\n#v30DateBox h2{font-size:25px;line-height:1.15;margin:0 0 23px}\n#v30DateFields{display:block}\n#v30DateFields [hidden]{display:none!important}\n#v30DateFields label{font-size:14px;font-weight:700;display:grid;gap:9px}\n#v30DateFields #v13ExactDate,#v30DateFields #v13Year,#v30DateFields #v13Month,#v30DateFields #v13Season{\n  width:100%;min-width:0;height:56px;box-sizing:border-box;\n  border:1px solid #c5d6df;border-radius:13px;background:white;color:#173e56;\n  font:650 18px system-ui;padding:10px 13px;appearance:auto;\n}\n#v13Expand,#v13BackToDate{\n  display:block;background:transparent;border:0;color:#3c6983;\n  font:650 14px system-ui;text-align:left;padding:15px 0 3px;min-height:43px;\n}\n#v13ModeButtons{display:flex;gap:8px;margin:0 0 17px}\n#v13ModeButtons button{\n  flex:1;min-width:0;background:#f1f5f7;color:#32566a;border:1px solid #d4e0e6;\n  border-radius:11px;min-height:44px;padding:8px 5px;font:650 14px system-ui;\n}\n#v13ModeButtons button[aria-pressed=\"true\"]{background:#193f58;border-color:#193f58;color:#fff}\n#v13PartialFields{display:grid;grid-template-columns:1fr 1fr;gap:12px}\n#v13PartialFields label{min-width:0}\n#v13PartialFields #v13YearLine:only-child{grid-column:1/-1}\n#v13Error{color:#b34032!important;font:600 14px system-ui!important;margin:12px 0 0!important}\n#v30DateActions{margin-top:20px;grid-template-columns:1fr 1.5fr}\n#v30DateActions button{min-height:51px}\n#v30DateSave{font-weight:750}\n</style>";
function patchDateUx(html){
  const begin='<script id="talera-v30-tell-js">';
  const a=html.indexOf(begin);
  const b=a>=0?html.indexOf('</script>',a):-1;
  if(a<0||b<0)return{html,changed:false,reason:'date-ui-original-not-found'};
  const old=html.slice(a+begin.length,b);
  const start=old.indexOf('function create(){');
  const end=old.indexOf('let video=null;',start);
  if(start<0||end<0||!old.includes("v30DateSave")||!old.includes("v30Mode"))
    return{html,changed:false,reason:'date-ui-contract-drift'};
  const patched=old.slice(0,start)+V13_DATE_HANDLERS+'\n'+old.slice(end);
  let page=html.slice(0,a+begin.length)+patched+html.slice(b);
  page=page.replace('</head>',V13_DATE_CSS+'</head>');
  return{html:page,changed:true,reason:'r13-simple-date-ui'};
}


const V14_EDITOR_CSS="<style id=\"talera-v61-r17-subtle-remove\">\n/* R16 is a visual-only editor experiment: no media grid or playback selectors. */\n#app .work.talera-compact-work.talera-r16-editor #details{\n  background:transparent!important;border:0!important;border-radius:0!important;\n  box-shadow:none!important;padding:0!important;margin:0 0 5px!important;\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-v14-heading{\n  padding:3px 1px 2px!important;margin:0!important;gap:0!important;\n  background:transparent!important;border:0!important;border-radius:0!important;\n  box-shadow:none!important;\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-v14-heading>.field{\n  display:block!important;margin:0!important;padding:0!important;border:0!important;\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-v14-heading>.field::after{\n  display:none!important;content:none!important;\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-v14-heading #title{\n  width:100%!important;height:auto!important;min-height:36px!important;\n  background:transparent!important;border:0!important;border-radius:0!important;\n  box-shadow:none!important;margin:0!important;padding:2px 0 5px!important;\n  font:590 23px/1.3 -apple-system,BlinkMacSystemFont,system-ui,sans-serif!important;\n  color:#192e3a!important;letter-spacing:-.035em!important;\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-v14-heading #title::placeholder{\n  color:#71808b!important;opacity:1!important;font-weight:450!important;\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-v14-heading #dateToggle{\n  width:auto!important;max-width:100%!important;align-self:flex-start!important;\n  height:auto!important;min-height:34px!important;border:0!important;\n  border-radius:0!important;box-shadow:none!important;\n  background:transparent!important;padding:5px 0!important;margin:0!important;\n  text-align:left!important;text-decoration:none!important;\n  font:560 14px/1.4 -apple-system,BlinkMacSystemFont,system-ui,sans-serif!important;\n  color:#33546a!important;\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-v14-heading #dateToggle::after{\n  content:none!important;display:none!important;\n}\n#app .work.talera-compact-work.talera-r16-editor #details>.talera-tags-v20{\n  padding:0!important;margin:4px 0 0!important;border:0!important;background:none!important;\n}\n#app .work.talera-compact-work.talera-r16-editor #details .talera-tags-toggle{\n  min-height:38px!important;padding:7px 0!important;margin:0!important;\n  font:530 13px/1.4 -apple-system,BlinkMacSystemFont,system-ui,sans-serif!important;\n  color:#436b83!important;\n}\n#app .work.talera-compact-work.talera-r16-editor .work-tools.talera-r16-toolbar{\n  display:grid!important;\n  grid-template-columns:minmax(0,1fr) minmax(0,1fr) 1px minmax(110px,1.65fr)!important;\n  gap:5px!important;align-items:center!important;\n  width:100%!important;box-sizing:border-box!important;\n  padding:8px 0 2px!important;\n  margin:8px 0 12px!important;\n  background:transparent!important;border:0!important;border-top:1px solid #e1e8ed!important;\n  border-radius:0!important;box-shadow:none!important;\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar .talera-r16-divider{\n  align-self:center;justify-self:center;width:1px;height:27px;background:#dbe3e9;\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar button{\n  box-sizing:border-box!important;min-width:0!important;\n  height:53px!important;min-height:53px!important;max-height:53px!important;\n  padding:5px 3px!important;margin:0!important;\n  display:flex!important;flex-direction:column!important;gap:3px!important;\n  justify-content:center!important;align-items:center!important;\n  border:0!important;border-radius:10px!important;\n  background:transparent!important;box-shadow:none!important;\n  color:#294a60!important;text-shadow:none!important;\n  font:590 12px/1.15 -apple-system,BlinkMacSystemFont,system-ui,sans-serif!important;\n  letter-spacing:0!important;touch-action:manipulation!important;\n  -webkit-tap-highlight-color:transparent!important;\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar button svg{\n  display:block;width:21px;height:21px;flex-shrink:0;stroke:currentColor;\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar #write{\n  background:transparent!important;color:#3b596a!important;\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar #publish{\n  display:flex!important;flex-direction:row!important;gap:7px!important;\n  width:100%!important;min-height:43px!important;height:43px!important;\n  max-height:43px!important;align-self:center!important;\n  padding:5px 9px!important;margin:0!important;\n  background:#163e59!important;color:#fff!important;\n  border:0!important;border-radius:13px!important;\n  box-shadow:none!important;\n  font:640 13px/1.2 -apple-system,BlinkMacSystemFont,system-ui,sans-serif!important;\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar #publish svg{\n  width:15px;height:15px;\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar button:active{background:#f1f5f8!important}\n#app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar #publish:active{background:#0f3049!important}\n#app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar button:focus-visible{\n  outline:2px solid #24799f!important;outline-offset:2px!important;\n}\n#app>.submit.talera-r16-empty-publish{display:none!important}\n@media(max-width:349px){\n  #app .work.talera-compact-work.talera-r16-editor .work-tools.talera-r16-toolbar{\n    grid-template-columns:minmax(0,1fr) minmax(0,1fr) 1px minmax(105px,1.45fr)!important;\n  }\n  #app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar #publish{font-size:12px!important;gap:4px!important}\n}\n\n#app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar #speak::before,\n#app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar #write::before{\n  content:\"\";display:block;width:21px;height:21px;flex-shrink:0;\n  background:currentColor;\n  -webkit-mask-position:center;-webkit-mask-size:contain;-webkit-mask-repeat:no-repeat;\n  mask-position:center;mask-size:contain;mask-repeat:no-repeat;\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar #speak::before{\n  -webkit-mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%229%22%20y%3D%222.5%22%20width%3D%226%22%20height%3D%2212%22%20rx%3D%223%22%2F%3E%3Cpath%20d%3D%22M5.5%2010.5v2a6.5%206.5%200%200%200%2013%200v-2M12%2019v3m-4%200h8%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E\");\n  mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%229%22%20y%3D%222.5%22%20width%3D%226%22%20height%3D%2212%22%20rx%3D%223%22%2F%3E%3Cpath%20d%3D%22M5.5%2010.5v2a6.5%206.5%200%200%200%2013%200v-2M12%2019v3m-4%200h8%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E\");\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar #write::before{\n  -webkit-mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m15%205%204%204M4%2020l4.5-1%2011-11a2.8%202.8%200%200%200-4-4l-11%2011L4%2020Z%22%2F%3E%3C%2Fsvg%3E\");\n  mask-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m15%205%204%204M4%2020l4.5-1%2011-11a2.8%202.8%200%200%200-4-4l-11%2011L4%2020Z%22%2F%3E%3C%2Fsvg%3E\");\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar #publish::after{\n  content:\"→\";font:600 18px/1 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;\n  margin-left:1px;display:inline-block;\n}\n\n/* R17 only: visually smaller photo removal mark. The original 44px\n   transparent hit target retains the same click handler and media order.\n   No tile, grid, aspect ratio, presenter, recorder or storage changes. */\n#app .work.talera-compact-work.talera-r16-editor .talera-v9-remove-media{\n  position:relative!important;\n  align-self:start!important;\n  justify-self:end!important;\n  width:44px!important;height:44px!important;\n  min-width:44px!important;max-width:44px!important;\n  min-height:44px!important;max-height:44px!important;\n  margin:0!important;padding:0!important;\n  border:0!important;border-radius:0!important;\n  background:transparent!important;\n  box-shadow:none!important;\n  color:#173747!important;\n  font:600 21px/1 -apple-system,BlinkMacSystemFont,system-ui,sans-serif!important;\n  text-shadow:0 1px 2px rgba(255,255,255,.94),0 -1px 2px rgba(255,255,255,.94),0 0 4px #fff!important;\n  touch-action:manipulation!important;\n  -webkit-tap-highlight-color:transparent!important;\n}\n#app .work.talera-compact-work.talera-r16-editor .talera-v9-remove-media:focus-visible{\n  outline:2px solid #234c64!important;\n  outline-offset:-4px!important;\n  border-radius:7px!important;\n}\n</style>";
const V14_EDITOR_HELPER="function taleraV14SimplifyHeader(g){\n  const details=$('details'),title=$('title'),date=$('dateToggle');\n  if(!details||!title||!date||details.querySelector('.talera-v14-heading'))return;\n  const titleLabel=title.closest('label.field');\n  if(!titleLabel||titleLabel.parentElement!==details)return;\n  const header=document.createElement('div');\n  header.className='talera-v14-heading';\n  header.setAttribute('role','group');\n  header.setAttribute('aria-label','Titel en datum');\n  details.insertBefore(header,titleLabel);\n  header.appendChild(titleLabel);\n  header.appendChild(date);\n  const sourceHint=$('v10SourceHint');\n  if(sourceHint)header.appendChild(sourceHint);\n  // The hint is only a placeholder, never a user title or saved value.\n  title.placeholder='Bedenk een titel…';\n  title.setAttribute('aria-label','Titel van je herinnering, optioneel');\n  const speak=$('speak'),write=$('write'),publish=$('publish');\n  if(speak)speak.textContent='Vertellen';\n  if(write)write.textContent='Schrijven';\n  if(publish)publish.textContent='Plaatsen op tijdlijn';\n}\nfunction taleraV16InstallToolbar(g){\n  const work=main.querySelector('.work.talera-compact-work');\n  const toolbar=work?.querySelector('.work-tools');\n  const speak=$('speak'),write=$('write'),publish=$('publish');\n  const footer=document.querySelector('#app>.submit');\n  if(!work||!toolbar||!speak||!write||!publish||!footer\n     ||toolbar.classList.contains('talera-r16-toolbar'))return;\n  // Move original elements, never clone them: original click handlers remain.\n  work.classList.add('talera-r16-editor');\n  toolbar.classList.add('talera-r16-toolbar');\n  // Pure CSS icons survive TALERA's own translation updates.\n  speak.textContent='Vertellen';\n  write.textContent='Schrijven';\n  publish.textContent='Plaatsen';\n  speak.setAttribute('aria-label','Vertellen');\n  write.setAttribute('aria-label','Schrijven');\n  publish.setAttribute('aria-label','Plaatsen op tijdlijn');\n  const divider=document.createElement('span');\n  divider.className='talera-r16-divider';divider.setAttribute('aria-hidden','true');\n  toolbar.appendChild(divider);\n  toolbar.appendChild(publish);\n  footer.classList.add('talera-r16-empty-publish');\n}";
function patchEditorChrome(html){
 const anchor='function workView(){',a=html.indexOf(anchor);
 const b=a>=0?html.indexOf('</script>',a):-1;
 if(a<0||b<0)return{html,changed:false,reason:'r14-original-editor-not-found'};
 let block=html.slice(a,b);
 const caller='setupV20Tags(g,details);setupV10(g,details,frame,footer);taleraCompactWorkbench(g);if(errorMsg)showError(errorMsg)';
 const proposed="const proposedTitle=()=>validDay(g.date)?'Herinnering · '+dateLabel(g):'Mijn herinnering';";
 if(!block.includes(caller)||!block.includes(proposed))
   return{html,changed:false,reason:'r14-editor-contract-drift'};
 block=V14_EDITOR_HELPER+'\n'+block;
 block=block.replace(caller,'setupV20Tags(g,details);setupV10(g,details,frame,footer);taleraCompactWorkbench(g);taleraV14SimplifyHeader(g);taleraV16InstallToolbar(g);if(errorMsg)showError(errorMsg)');
 // The date is visible just below the title. Do not duplicate it in the
 // autogenerated display name. Custom titles and published fallbacks stay intact.
 block=block.replace(proposed,"const proposedTitle=()=> ''; // Only the placeholder suggests a title");
 let page=html.slice(0,a)+block+html.slice(b);
 if(!page.includes('</head>'))return{html,changed:false,reason:'r14-head-missing'};
 page=page.replace('</head>',V14_EDITOR_CSS+'</head>');
 return{html:page,changed:true,reason:'r16-compact-unified-toolbar'};
}


function patchOptionalTitle(html,pathname){
  let page=html;
  const replace=(a,b)=>{
    if(page.split(a).length!==2)return false;
    page=page.replace(a,b);return true;
  };
  // Same existing IndexedDB, permitting truly title-free memories.
  if(!replace(" if(!title)throw Error('Vul eerst een titel in.');",
              " /* Een titel is optioneel; beeld, stem of tekst blijft verplicht. */"))
    return{html,changed:false,reason:'r15-store-title-validator-changed'};
  if(pathname==='/tell'){
    if(!replace("const title=g.title.trim()||'Herinnering · '+dateLabel(g);",
                "const title=g.title.trim();"))
      return{html,changed:false,reason:'r15-publish-title-contract-changed'};
  }
  if(pathname==='/present'){
    if(!replace("const title=String(row.title||'Mijn herinnering').slice(0,140);",
                "const title=String(row.title||'').slice(0,140);"))
      return{html,changed:false,reason:'r15-presentation-title-contract-changed'};
  }
  if(pathname==='/'||pathname==='/mijn-leven'){
    const replacements=[
      ["text(m.title||'Mijn herinnering')","text(m.title||'')"],
      ["title:String(m.title||'Mijn herinnering')","title:String(m.title||'')"],
      ["row.title||tr('Herinnering','Memory')","row.title||''"],
      ["$('heroTitle').textContent=o.title||'Een leven vol verhalen'",
       "$('heroTitle').textContent=o.title||''"]
    ];
    if(!replacements.every(([a])=>page.split(a).length===2))
      return{html,changed:false,reason:'r15-home-titles-contract-changed'};
    for(const [a,b] of replacements)page=page.replace(a,b);
  }
  return{html:page,changed:true,reason:'r15-optional-story-title'};
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
    let finalResult=url.pathname==='/tell'&&result.changed?patchDateUx(result.html):result;
    if(url.pathname==='/tell'&&finalResult.changed)finalResult=patchEditorChrome(finalResult.html);
    if(['/','/mijn-leven','/present','/tell'].includes(url.pathname)&&finalResult.html.includes('talera-memory-store-v1')){
      const optional=patchOptionalTitle(finalResult.html,url.pathname);
      if(!optional.changed)return new Response('De broncode voor optionele titels is gewijzigd; R15 is veilig gestopt.',{status:503});
      finalResult=optional;
    }
    const headers=new Headers(upstream.headers);
    headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
    headers.set('cache-control','no-store');
    headers.set('x-talera-v61-vertelmodus',finalResult.reason);
    // Create listening preference on both the home timeline and presentation.
    // Otherwise the existing Meer > Settings toggle only works on /present.
    const appRoutes=['/','/mijn-leven','/present','/tell'];
    const output=(appRoutes.includes(url.pathname)&&finalResult.html.includes('</head>'))
      ?installGlobalAudioPref(finalResult.html):finalResult.html;
    return new Response(output,{status:upstream.status,statusText:upstream.statusText,headers});
  }
};