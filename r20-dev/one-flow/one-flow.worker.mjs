// A single, fail-closed adapter for the *existing* approved V9 inline presenter.
// No route replacement, secondary player, storage writes, or recorder changes.
export const AUDIO_END_BEFORE = 'audio.onended=()=>{stopTimer();tick();taleraInlineVoiceEnded(s)};';
export const AUDIO_END_AFTER = 'audio.onended=()=>{stopTimer();tick();taleraUnifiedNarrationEnded(s)};';
export const INSERT_BEFORE = 'function taleraInlineVoiceEnded(s){';
export const INSTALL_MARKER = 'function taleraUnifiedNarrationEnded(s){';

export function remainingMedia(frames,cues){
  const shown=new Set((cues||[]).map(c=>c.mediaId));
  return (frames||[]).map((f,index)=>({frame:f,index})).filter(x=>x.frame.kind==='photo'&&!shown.has(x.frame.key));
}

// After unshown photos, delegate ALL original videos to the proven V9 replay (with sound).
// This function is executed inside the existing TALERA /present script closure.
// Existing TALERA functions, photo plane, video element and timer stay authoritative.
export const INLINE_TAIL = `/* One native TALERA viewport, recorded media IDs, no second player. */
/* iOS Safari: a NEW audible video after a timeout needs another tap.
   Preload each original clip once, activate that same element inside the
   FIRST genuine tap, then reuse it in V9's EXISTING native video viewport.
   No extra visible player, no gesture replay and no storage writes. */
async function taleraUnifiedWarmVideos(s){
  const pool=new Map();
  s.taleraUnifiedPrepared=pool;
  for(const frame of s.frames){
    if(frame.kind!=='video'||pool.has(frame.key))continue;
    let url=null;
    try{
      url=await store.mediaUrl(frame.key);
      if(s!==taleraInline){if(url)URL.revokeObjectURL(url);return}
      if(!url)continue;
      const video=document.createElement('video');
      video.playsInline=true;
      video.setAttribute('playsinline','');
      video.setAttribute('webkit-playsinline','');
      video.preload='auto';video.controls=false;
      video.muted=false;video.defaultMuted=false;video.volume=0;
      video.style.cssText='position:absolute;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
      (stage.parentElement||stage).appendChild(video);
      video.src=url;video.load();
      pool.set(frame.key,{video,url,primed:false,pending:false});
    }catch(e){
      if(url)URL.revokeObjectURL(url);
      console.warn('TALERA videovoorbereiding overgeslagen',e);
    }
  }
}
function taleraUnifiedPrimeCurrent(){
  const s=taleraInline;
  if(!s||s.engine!=='narrated'||!s.taleraUnifiedPrepared||s.phase==='done')return;
  for(const entry of s.taleraUnifiedPrepared.values()){
    if(entry.primed||entry.pending)continue;
    entry.pending=true;
    const video=entry.video;
    // Play is invoked SYNCHRONOUSLY inside the original user gesture.
    // It has zero volume and is paused immediately after permission is granted.
    video.volume=0;video.muted=false;
    let result;
    try{result=video.play()}
    catch(e){entry.pending=false;continue}
    Promise.resolve(result).then(()=>{
      // The native original-video round may have adopted this element while
      // Safari's first play() was still resolving. Never pause that replay.
      if(s!==taleraInline||entry.released)return;
      video.pause();
      try{video.currentTime=0}catch(e){}
      entry.primed=true;
    }).catch(()=>{}).finally(()=>{entry.pending=false});
  }
}
/* A narrated memory is CLOSED: taps on its image never change media or
   unlock any clip. Only the app's explicit Beluister/listening action (which
   runs in the original user gesture) can authorize original video sound.
   In particular, SWIPES must not call video.play() on prepared clips. */
/* The existing visible "Luister" / automatic-listening BUTTONS are valid
   audio gestures. This does not add a player or make the story photo tappable. */
document.addEventListener('click',e=>{
  if(e.target?.closest?.('.talera-audio-consent,.talera-memory-audio'))taleraUnifiedPrimeCurrent();
},true);
document.addEventListener('talera:enable-listening',taleraUnifiedPrimeCurrent,true);

/* ONE cached cover for the FIRST VISUAL CUE (photo or video frame 0)
   of each narrated memory. V13 reads previewImage; no extra timeline item. */
const taleraSwipeCovers=new Map();
let taleraSwipeCoverDbPromise=null;
function taleraSwipeCoverFirst(memory){
  if(!memory?._taleraLocal||!memory._zeroItems?.some(x=>x.kind==='audio'))return null;
  const visual=memory._zeroItems.filter(x=>x.kind==='photo'||x.kind==='video');
  const cues=Array.isArray(memory._taleraNarrationCues)?memory._taleraNarrationCues.slice():[];
  cues.sort((a,b)=>(Number(a?.t)||0)-(Number(b?.t)||0));
  // Use the first VISUAL cue, not the first photograph in the story.
  // A video-first story is represented by a JPEG extracted from video t=0.
  for(const cue of cues){
    const x=typeof cue?.mediaId==='string'?visual.find(item=>item.key===cue.mediaId):visual[Number(cue?.index)];
    if((x?.kind==='photo'||x?.kind==='video')&&x.key)return x;
  }
  // Old narrated stories without cues start at their first visual item.
  return visual[0]||null;
}
function taleraSwipeCoverDB(){
  if(taleraSwipeCoverDbPromise)return taleraSwipeCoverDbPromise;
  taleraSwipeCoverDbPromise=new Promise(resolve=>{
    try{
      if(!window.indexedDB){resolve(null);return}
      const r=window.indexedDB.open('talera-narrated-swipe-covers-v1',1);
      r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('covers'))
        r.result.createObjectStore('covers',{keyPath:'id'})};
      r.onsuccess=()=>resolve(r.result);
      r.onerror=()=>resolve(null);r.onblocked=()=>resolve(null);
    }catch(e){resolve(null)}
  });
  return taleraSwipeCoverDbPromise;
}
async function taleraSwipeCoverRead(id){
  const db=await taleraSwipeCoverDB();
  if(!db)return null;
  return new Promise(resolve=>{
    try{
      const r=db.transaction('covers','readonly').objectStore('covers').get(id);
      r.onsuccess=()=>resolve(r.result||null);
      r.onerror=()=>resolve(null);
    }catch(e){resolve(null)}
  });
}
async function taleraSwipeCoverSave(id,photoKey,blob){
  const db=await taleraSwipeCoverDB();
  if(!db)return;
  await new Promise(resolve=>{
    try{
      const tx=db.transaction('covers','readwrite');
      tx.oncomplete=resolve;tx.onerror=resolve;tx.onabort=resolve;
      tx.objectStore('covers').put({id,photoKey,blob});
    }catch(e){resolve()}
  });
}
function taleraSwipeCoverApply(memory,photoKey,blob){
  const entry=taleraSwipeCovers.get(memory.id);
  if(!entry||entry.key!==photoKey||entry.url||
     taleraSwipeCoverFirst(memory)?.key!==photoKey||!blob?.size)return;
  const url=URL.createObjectURL(blob);
  entry.url=url;
  memory.previewImage=url;
  // The V13 wheel may hold a different timeline object from the presenter.
  const wheel=window.__taleraPhotoBook?.list?.().find(x=>x.id===memory.id);
  if(wheel)wheel.previewImage=url;
}
function taleraSwipeCoverResize(src){
  return new Promise(resolve=>{
    if(!src){resolve(null);return}
    const image=new Image();
    let done=false;
    const finish=blob=>{
      if(done)return;
      done=true;image.onload=null;image.onerror=null;resolve(blob||null);
    };
    image.onerror=()=>finish(null);
    image.onload=()=>{
      try{
        const w=image.naturalWidth,h=image.naturalHeight;
        if(!w||!h){finish(null);return}
        const r=Math.min(1,720/Math.max(w,h));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(w*r));
        canvas.height=Math.max(1,Math.round(h*r));
        const ctx=canvas.getContext('2d',{alpha:false});
        if(!ctx){finish(null);return}
        ctx.drawImage(image,0,0,canvas.width,canvas.height);
        canvas.toBlob(finish,'image/jpeg',.76);
      }catch(e){finish(null)}
    };
    image.decoding='async';image.src=src;
    if(image.complete&&image.naturalWidth)image.onload();
  });
}
/* Decode ONE video frame into a thumbnail, while paused and muted.
   This temporary decoder is never attached as a player, never calls play(),
   never changes the already approved narrated-video playback. */
function taleraSwipeCoverVideoFrame(src){
  return new Promise(resolve=>{
    if(!src){resolve(null);return}
    let done=false,video=null,timeout=null;
    const finish=blob=>{
      if(done)return;done=true;
      clearTimeout(timeout);
      if(video){
        video.onloadedmetadata=video.onloadeddata=video.oncanplay=video.onseeked=video.onerror=null;
        video.pause();video.removeAttribute('src');video.load();
      }
      resolve(blob||null);
    };
    const capture=()=>{
      if(done||!video||video.readyState<2||!video.videoWidth||!video.videoHeight)return;
      try{
        const ratio=Math.min(1,720/Math.max(video.videoWidth,video.videoHeight));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(video.videoWidth*ratio));
        canvas.height=Math.max(1,Math.round(video.videoHeight*ratio));
        const ctx=canvas.getContext('2d',{alpha:false});
        if(!ctx){finish(null);return}
        ctx.drawImage(video,0,0,canvas.width,canvas.height);
        canvas.toBlob(blob=>finish(blob),'image/jpeg',.76);
      }catch(e){finish(null)}
    };
    try{
      video=document.createElement('video');
      video.muted=true;video.defaultMuted=true;video.volume=0;
      video.playsInline=true;video.setAttribute('playsinline','');
      video.setAttribute('webkit-playsinline','');
      video.preload='auto';
      video.onloadeddata=capture;
      video.oncanplay=capture;
      video.onseeked=capture;
      video.onloadedmetadata=()=>{
        // On some iPhone versions a zero-time seek explicitly asks Safari
        // to decode the first frame even when the file is not playing.
        try{
          if(video.readyState<2)video.currentTime=Math.min(.001,
            Number.isFinite(video.duration)&&video.duration>0?video.duration/2:.001);
        }catch(e){}
        capture();
      };
      video.onerror=()=>finish(null);
      timeout=setTimeout(()=>finish(null),6500);
      video.src=src;
      video.load();
    }catch(e){finish(null)}
  });
}
function taleraSwipeCoverGenerate(memory,first,entry){
  if(entry.creating||entry.url)return;
  const frame=first.kind==='photo'?memory._zeroFrames?.find(x=>x.kind==='photo'&&x.key===first.key):null;
  entry.creating=true;
  const run=async()=>{
    // Never decode or draw during a finger gesture or the V13 landing.
    if(window.__taleraBandRolling||window.__taleraTimelineRuntime?.isMoving?.()){
      setTimeout(run,160);return;
    }
    let src=frame?.url||null,temporary=false;
    try{
      if(!src){
        // Adjacent narrated stories have NOT been opened/hydrated yet.
        // Fetch ONLY the first selected visual asset, not the full media set.
        src=first.kind==='video'?await store.mediaUrl(first.key):
          await (store.displayUrl?store.displayUrl(first.key):store.mediaUrl(first.key));
        temporary=!!src;
      }
      if(!src)throw Error('Eerste beeld nog niet beschikbaar');
      const blob=first.kind==='video'?await taleraSwipeCoverVideoFrame(src):
        await taleraSwipeCoverResize(src);
      if(blob&&taleraSwipeCovers.get(memory.id)===entry){
        taleraSwipeCoverApply(memory,first.key,blob);
        // Persist one cover per narrated memory, not a new media frame.
        void taleraSwipeCoverSave(memory.id,first.key,blob);
      }
    }catch(e){
      // A missing optional preview may not block native V9 story playback.
      console.warn('TALERA omslagfoto niet klaar',e);
    }finally{
      entry.creating=false;
      if(temporary&&typeof src==='string'&&src.startsWith('blob:'))
        URL.revokeObjectURL(src);
    }
  };
  if(typeof window.requestIdleCallback==='function')
    window.requestIdleCallback(run,{timeout:1100});
  else setTimeout(run,120);
}
function taleraSwipeCoverEnsure(memory,create=false){
  const first=taleraSwipeCoverFirst(memory);
  if(!first)return;
  let entry=taleraSwipeCovers.get(memory.id);
  if(entry&&entry.key!==first.key){
    if(memory.previewImage===entry.url)delete memory.previewImage;
    if(entry.url)URL.revokeObjectURL(entry.url);
    entry=null;
  }
  if(!entry){
    entry={key:first.key,url:null,loading:false,checked:false,create:false,creating:false};
    taleraSwipeCovers.set(memory.id,entry);
  }
  if(create)entry.create=true;
  if(entry.checked){
    if(entry.create&&!entry.url)taleraSwipeCoverGenerate(memory,first,entry);
    return;
  }
  if(entry.loading)return;
  entry.loading=true;
  void taleraSwipeCoverRead(memory.id).then(saved=>{
    if(taleraSwipeCovers.get(memory.id)!==entry)return;
    entry.checked=true;entry.loading=false;
    if(saved?.photoKey===first.key&&saved.blob?.size)
      taleraSwipeCoverApply(memory,first.key,saved.blob);
    else if(entry.create)taleraSwipeCoverGenerate(memory,first,entry);
  }).catch(()=>{entry.checked=true;entry.loading=false;
    if(entry.create)taleraSwipeCoverGenerate(memory,first,entry)});
}
function taleraSwipeCoverObserve(memories){
  // Only nearby timeline items: no mass-loading thousands of phone photos.
  const list=memories.slice().sort((a,b)=>a.ms-b.ms);
  let lastId=null;
  const inspect=()=>{
    const current=window.__taleraTimelineRuntime?.currentMemory?.();
    if(!current||current.id===lastId)return;
    lastId=current.id;
    let index=list.findIndex(x=>x.id===current.id);
    if(index<0){
      index=list.findIndex(x=>x.ms>=current.ms);
      if(index<0)index=list.length-1;
    }
    for(let i=Math.max(0,index-2);i<=Math.min(list.length-1,index+2);i++)
      // Create missing first-VISUAL covers BEFORE visiting the neighbor.
      // Merely reading cached covers left the first swipe through blank tiles.
      taleraSwipeCoverEnsure(list[i],true);
  };
  window.__taleraTimelineRuntime?.subscribe?.(inspect);
  inspect();
}
if(typeof window!=='undefined'&&window.addEventListener)
  window.addEventListener('pagehide',()=>{
    for(const e of taleraSwipeCovers.values())if(e.url)URL.revokeObjectURL(e.url);
    taleraSwipeCovers.clear();
  },{once:true});
/* VISUAL ONLY: approved V9 hides every photo-strip while narration owns
   the image. V13's ORIGINAL wheel still tracks the finger on every pointermove,
   but remains invisible until landing. Expose ONLY its already-moving strip
   during an actual horizontal drag; never on a stationary tap. */
(function taleraUnifiedRevealWheelDuringSwipe(){
  const styleId='talera-unified-wheel-visual-style';
  const motionClass='talera-unified-wheel-in-motion';
  if(document.head?.appendChild&&!document.getElementById?.(styleId)){
    const css=document.createElement('style');
    css.id=styleId;
    css.textContent='body.talera-v61-narration-visual.talera-unified-wheel-in-motion #photoStage .talera-photo-strip.talera-wheel-strip.is-visible{display:block!important;visibility:visible!important;opacity:1!important}';
    document.head.appendChild(css);
  }
  let gesture=null;
  document.addEventListener('pointerdown',e=>{
    if(e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
    if(!e.target?.closest?.('#memoryStoryScroll'))return;
    if(e.target.closest('button,a,input,textarea,select,nav,[role="button"],.talera-memory-audio'))return;
    gesture={id:e.pointerId,x:e.clientX,y:e.clientY,shown:false};
  },{capture:true,passive:true});
  document.addEventListener('pointermove',e=>{
    const g=gesture;
    if(!g||g.id!==e.pointerId||g.shown)return;
    const dx=e.clientX-g.x,dy=e.clientY-g.y;
    if(Math.abs(dx)<13||Math.abs(dx)<Math.abs(dy)*1.05)return;
    // The native V13 wheel owns the gesture and must already be rolling.
    if(!window.__taleraBandRolling)return;
    g.shown=true;
    document.body.classList.add(motionClass);
  },{capture:true,passive:true});
  document.addEventListener('pointerup',e=>{
    if(gesture?.id===e.pointerId)gesture=null;
  },{capture:true,passive:true});
  document.addEventListener('pointercancel',e=>{
    if(gesture?.id===e.pointerId)gesture=null;
  },{capture:true,passive:true});
  document.addEventListener('talera:wheel-motion',e=>{
    if(e.detail?.active===false){
      gesture=null;
      document.body.classList.remove(motionClass);
    }
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){
      gesture=null;
      document.body.classList.remove(motionClass);
    }
  },{passive:true});
})();
/* Restores the permission prompt as a REAL button. The gesture resumes
   this memory's EXISTING native audio/video element, never advances photos
   and never creates a second player. The picture itself stays untappable. */
function taleraUnifiedCreateListeningButton(s){
  const button=document.createElement('button');
  button.type='button';
  button.className='talera-v61-audio-permission-hint';
  button.setAttribute('aria-label','Ingesproken herinnering afspelen');
  button.textContent='▶ Beluister';
  button.style.cssText='position:absolute;left:50%;bottom:22%;transform:translateX(-50%);z-index:65;padding:9px 15px;border:0;border-radius:15px;background:rgba(250,250,247,.94);color:#173d52;font:650 13px system-ui;pointer-events:auto;cursor:pointer;touch-action:manipulation';
  button.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    if(s!==taleraInline||s.engine!=='narrated')return;
    // Do everything synchronously in the actual iPhone user gesture.
    taleraUnifiedPrimeCurrent();
    const target=s.phase==='narration'?s.audio:s.phase==='originals'?s.video:null;
    if(target){
      target.addEventListener('playing',()=>{
        if(s===taleraInline&&s.hint===button){
          button.remove();s.hint=null;s.blockedByBrowser=false;
        }
      },{once:true});
    }
    if(window.__taleraAudioControls?.isEnabled?.())
      window.__taleraInlineTryAutoPlay?.();
    else
      window.__taleraAudioControls?.enable?.();
  });
  return button;
}
function taleraUnifiedTakePrimed(s,frame){
  if(s.phase!=='originals')return null;
  const entry=s.taleraUnifiedPrepared?.get(frame.key);
  // Same native media element for the WAV narration and every audible
  // original video. Safari ties audible-play permission to the element:
  // merely remembering the setting 'sound on' does not authorize a new one.
  // This is an in-place source handoff, NOT a second player or timeline frame.
  const shared=s.engine==='narrated'&&s.audio?.tagName==='VIDEO'?s.audio:null;
  if(shared){
    if(entry){
      s.taleraUnifiedPrepared.delete(frame.key);
      entry.released=true;
      entry.video.pause();entry.video.removeAttribute('src');entry.video.remove();
      s.taleraUnifiedReplayUrl=entry.url;
    }
    shared.pause();
    shared.onplay=shared.onpause=shared.onended=null;
    shared.ontimeupdate=shared.onseeking=shared.onseeked=null;
    try{shared.currentTime=0}catch(e){}
    s.taleraUnifiedReplayHandoff={key:frame.key,reused:true,
      sameAudibleElement:true,gesturePrimed:Boolean(entry?.primed)};
    return shared;
  }
  if(!entry)return null;
  // Reuse the PRELOADED original even when narration auto-started without
  // a new user gesture. Creating a different video here loses the existing
  // media element and forces a second decode / Safari authorization attempt.
  s.taleraUnifiedPrepared.delete(frame.key);
  entry.released=true;
  s.taleraUnifiedReplayUrl=entry.url;
  s.taleraUnifiedReplayHandoff={
    key:frame.key,reused:true,gesturePrimed:entry.primed===true
  };
  if(!entry.video.paused)entry.video.pause();
  try{entry.video.currentTime=0}catch(e){}
  return entry.video;
}
function taleraUnifiedDropPrepared(s){
  if(!s)return;
  if(s.taleraUnifiedPrepared){
    for(const entry of s.taleraUnifiedPrepared.values()){
      entry.video.pause();entry.video.removeAttribute('src');entry.video.remove();
      if(entry.url)URL.revokeObjectURL(entry.url);
    }
    s.taleraUnifiedPrepared.clear();
  }
  s.taleraUnifiedPrepared=null;
}
function taleraUnifiedNarrationEnded(s){
  if(s!==taleraInline||s.phase!=='narration'||runtime.currentMemory()?.id!==s.memory.id)return;
  if(s.timer){clearInterval(s.timer);s.timer=null}
  const spoken=new Set(s.cues.map(c=>c.mediaId));
  const remaining=s.frames.map((frame,index)=>({frame,index}))
    .filter(x=>x.frame.kind==='photo'&&!spoken.has(x.frame.key));
  const last=s.cues.length?s.cues[s.cues.length-1]:null;
  const lastFrame=last&&s.frames[last.index];
  const lastVideo=lastFrame?.kind==='video'&&s.videoKey===lastFrame.key?s.video:null;
  const tail={remaining,cursor:0,photoUntil:0,remainingMs:0};
  s.taleraUnifiedTail=tail;
  s.phase='unifiedTail';
  function active(){
    return s===taleraInline&&s.phase==='unifiedTail'&&
      runtime.currentMemory()?.id===s.memory.id&&s.taleraUnifiedTail===tail;
  }
  function stopPhotoTimer(){
    if(s.ordinaryTimer){clearTimeout(s.ordinaryTimer);s.ordinaryTimer=null}
  }
  function issue(error){
    console.warn('TALERA: dit beeld kon niet worden afgespeeld',error);
    // No silently skipped media: stop and retain the last correctly visible ID.
    stopPhotoTimer();
    s.phase='unifiedTailError';
    s.taleraUnifiedError=String(error?.message||error||'Onbekend bestand');
  }
  function next(){
    if(!active())return;
    stopPhotoTimer();
    if(tail.cursor>=remaining.length){
      // Resume the original, proven V9 video round. Every original video
      // starts at 0 and uses V9's existing sound/listening controls.
      // No new DOM player, duplicate silent video round or media copy.
      s.phase='narration';
      taleraInlineVoiceEnded(s);
      return;
    }
    const {frame,index}=remaining[tail.cursor++];
    if(frame.kind==='photo'){
      taleraInlineCleanVideo(s);
      taleraInlineSetFrame(s,index);
      tail.photoUntil=performance.now()+4000;
      tail.remainingMs=4000;
      s.ordinaryTimer=setTimeout(next,4000);
      return;
    }
    issue(new Error('Onbekend mediaformaat'));
  }
  // Document visibility cannot silently consume photo time in the background.
  if(!s.taleraUnifiedVisibilityHook){
    const onVisibility=()=>{
      if(!active())return;
      if(document.hidden){
        if(s.ordinaryTimer){
          tail.remainingMs=Math.max(0,tail.photoUntil-performance.now());
          stopPhotoTimer();
        }
        if(s.video&&!s.video.paused)s.video.pause();
      }else{
        if(tail.photoUntil&&tail.cursor<=remaining.length&&tail.remainingMs>0&&!s.ordinaryTimer&&!s.video){
          tail.photoUntil=performance.now()+tail.remainingMs;
          s.ordinaryTimer=setTimeout(next,tail.remainingMs);
        }else if(s.video?.paused&&!s.video.ended){
          s.video.muted=true;
          Promise.resolve(s.video.play()).catch(issue);
        }
      }
    };
    document.addEventListener('visibilitychange',onVisibility,{signal:s.taleraUnifiedAbort?.signal});
    s.taleraUnifiedVisibilityHook=onVisibility;
  }
  // Keep playing the video already visible at the exact moment speech ends.
  if(lastVideo&&!lastVideo.ended&&lastVideo.readyState>=1&&
     Number.isFinite(lastVideo.duration)&&lastVideo.duration-lastVideo.currentTime>.08){
    lastVideo.muted=true;lastVideo.defaultMuted=true;
    lastVideo.onended=()=>{if(active())next()};
    lastVideo.onerror=()=>issue(new Error('Video ontbreekt'));
    if(lastVideo.paused)Promise.resolve(lastVideo.play()).catch(issue);
    return;
  }
  next();
}
`;

export function applyUnifiedTail(html){
  if(typeof html!=='string')return {html,status:'not-html'};
  if(html.includes(INSTALL_MARKER))return {html,status:'already-installed'};
  const tokens=[AUDIO_END_BEFORE,INSERT_BEFORE,
    'function taleraInlineSetFrame(s,index){',
    'function taleraInlinePlayMedia(s,frame,muted,finished){',
    'function taleraInlineCleanVideo(s){'];
  for(const t of tokens){
    const at=html.indexOf(t);
    if(at<0||html.indexOf(t,at+1)>=0)return {html,status:'anchor-unmatched'};
  }
  if(html.indexOf(INSERT_BEFORE)>=html.indexOf(AUDIO_END_BEFORE))return {html,status:'anchor-unmatched'};
  const at=html.indexOf(INSERT_BEFORE);
  let result=html.slice(0,at)+INLINE_TAIL+'\n'+html.slice(at);
  // Add only two guarded hooks to the existing V9 presenter (not recorder).
  const nativeCoverHydrated="loaded.set(memory.id,urls);";
  const nativeCoverRegistered="runtime.registerMemories(memories);";
  // V13 wheel previously skipped reassigning a tile with an unchanged index.
  // When a narrated cover arrives AFTER that tile's first render, its stale
  // placeholder remained until navigating away. Invalidate ONLY if the cover
  // URL changed; normal photo memories keep the original assign shortcut.
  // Native RH19 still exposes showPhoto() to its legacy tap handler, even
  // AFTER the last narrated video has ended. Close that entry point at the
  // SOURCE, rather than relying on a document click guard that iOS can miss.
  // The narration engine calls __taleraV31SelectPhoto with manual=false and
  // therefore retains complete authority over its own timed media frames.
  const nativeManualPhoto="function showPhoto(memory,index,manual=false){";
  const sealedManualPhoto="function showPhoto(memory,index,manual=false){\n    if(manual&&memory?._zeroItems?.some(item=>item.kind==='audio'))return;";
  // Native V9 uses a reusable hidden audio element for the voice.
  // Use a VIDEO element instead: it supports the same audio-only WAV, and
  // can display the original clip on the SAME authorized element later.
  // Only this one existing V9 constructor is changed.
  const nativeVoiceElement="const audio=window.__taleraInlineSharedAudio||document.createElement('audio');";
  const newVoiceElement="const audio=window.__taleraInlineSharedAudio||document.createElement('video');";
  const nativeVoiceInline="audio.preload='auto';audio.playsInline=true;audio.style.display='none';";
  const newVoiceInline="audio.preload='auto';audio.playsInline=true;audio.setAttribute('playsinline','');audio.setAttribute('webkit-playsinline','');audio.style.display='none';";
  const nativeWheelAssign="if(tile.index===index)return;";
  const newWheelAssign="if(tile.index===index&&!(mem?._zeroItems?.some(x=>x.kind==='audio')&&mem.previewImage&&tile.el.dataset.url!==mem.previewImage))return;";
  if(result.split(nativeCoverHydrated).length!==2||
     result.split(nativeCoverRegistered).length!==2||
     result.split(nativeWheelAssign).length!==2||
     result.split(nativeManualPhoto).length!==2||
     result.split(nativeVoiceElement).length!==2||
     result.split(nativeVoiceInline).length!==2)return {html,status:'anchor-unmatched'};
  result=result.replace(nativeVoiceElement,newVoiceElement);
  result=result.replace(nativeVoiceInline,newVoiceInline);
  result=result.replace(nativeManualPhoto,sealedManualPhoto);
  result=result.replace(nativeCoverHydrated,nativeCoverHydrated+"taleraSwipeCoverEnsure(memory,true);");
  result=result.replace(nativeCoverRegistered,nativeCoverRegistered+"taleraSwipeCoverObserve(memories);");
  result=result.replace(nativeWheelAssign,newWheelAssign);
  // Target only the existing inline presenter, not its voice recorder.
  const nativeVideoStart=result.indexOf('function taleraInlinePlayMedia(s,frame,muted,finished){');
  const nativeVideoEnd=result.indexOf('function taleraInlineReplayNext(s){',nativeVideoStart);
  if(nativeVideoStart<0||nativeVideoEnd<0)return {html,status:'anchor-unmatched'};
  const nativeVideo=result.slice(nativeVideoStart,nativeVideoEnd);
  const oldCreate="const video=document.createElement('video');";
  const oldUrl="const url=await store.mediaUrl(frame.key);";
  const oldSource="s.videoUrl=url;video.src=url;";
  if(nativeVideo.split(oldCreate).length!==2||
     nativeVideo.split(oldUrl).length!==2||
     nativeVideo.split(oldSource).length!==2)
    return {html,status:'anchor-unmatched'};
  const changedVideo=nativeVideo
    .replace(oldCreate,"const video=taleraUnifiedTakePrimed(s,frame)||document.createElement('video');")
    .replace(oldUrl,"const url=s.taleraUnifiedReplayUrl||await store.mediaUrl(frame.key);s.taleraUnifiedReplayUrl=null;")
    // On Safari, reassigning the SAME blob: URL can reset a previously
    // authorized video into a fresh media resource and block its sound.
    .replace(oldSource,"s.videoUrl=url;if(video.src!==url)video.src=url;");
  const beforeVideoHint="          const hint=document.createElement('div');\n          hint.textContent='Tik op de foto om het geluid te starten';\n          hint.style.cssText='position:absolute;left:50%;bottom:22%;transform:translateX(-50%);z-index:20;padding:9px 15px;border-radius:15px;background:rgba(250,250,247,.94);color:#173d52;font:650 13px system-ui;pointer-events:none';";
  const afterVideoHint="          const hint=taleraUnifiedCreateListeningButton(s);";
  if(changedVideo.split(beforeVideoHint).length!==2)return {html,status:'anchor-unmatched'};
  const safeVideo=changedVideo.replace(beforeVideoHint,afterVideoHint);
  result=result.slice(0,nativeVideoStart)+safeVideo+result.slice(nativeVideoEnd);
  // Original V9 also resumes video on every pointerup/touchend; do not
  // equate the end of a swipe with a deliberate tap on the photo.
  const audioStart=result.indexOf('function taleraInlineInstallAudioControls(){');
  const audioEnd=result.indexOf('async function present(memory){',audioStart);
  if(audioStart<0||audioEnd<0)return {html,status:'anchor-unmatched'};
  const audioSource=result.slice(audioStart,audioEnd);
  const beforeVoiceHint="    const hint=document.createElement('div');\n    hint.className='talera-v61-audio-permission-hint';\n    hint.textContent='Tik op de foto om het geluid te starten';\n    hint.style.cssText='position:absolute;left:50%;bottom:22%;transform:translateX(-50%);z-index:20;padding:9px 15px;border-radius:15px;background:rgba(250,250,247,.94);color:#173d52;font:650 13px system-ui;pointer-events:none';";
  const afterVoiceHint="    const hint=taleraUnifiedCreateListeningButton(s);";
  if(audioSource.split(beforeVoiceHint).length!==2)return {html,status:'anchor-unmatched'};
  const oldRetry="  const retry=e=>{\n    const s=taleraInline;";
  const newRetry="  const retry=e=>{\n    const s=taleraInline;\n    if(s?.engine==='narrated')return;";
  const oldClickGuard="    if(s?.engine!=='narrated'||s.phase!=='narration')return;";
  const newClickGuard="    if(s?.engine!=='narrated'&&!(runtime.currentMemory()?._zeroItems?.some(x=>x.kind==='audio')))return;";
  if(audioSource.split(oldRetry).length!==2||audioSource.split(oldClickGuard).length!==2)
    return {html,status:'anchor-unmatched'};
  result=result.slice(0,audioStart)+audioSource
    .replace(oldRetry,newRetry).replace(oldClickGuard,newClickGuard)
    .replace(beforeVoiceHint,afterVoiceHint)+result.slice(audioEnd);
  const presentAnchor="  taleraInline=s;\n  if(hasVoice){";
  const disposalAnchor="function taleraInlineDispose(){\n  const s=taleraInline;\n  taleraInline=null;";
  if(result.split(presentAnchor).length!==2||result.split(disposalAnchor).length!==2)
    return {html,status:'anchor-unmatched'};
  result=result.replace(presentAnchor,"  taleraInline=s;\n  if(hasVoice)await taleraUnifiedWarmVideos(s);\n  if(s!==taleraInline)return;\n  if(hasVoice){");
  result=result.replace(disposalAnchor,disposalAnchor+"\n  taleraUnifiedDropPrepared(s);");
  return {html:result.replace(AUDIO_END_BEFORE,AUDIO_END_AFTER),status:'installed'};
}

export function restoreApprovedV9(patched){
  if(typeof patched!=='string')return patched;
  return patched
    .replace("const audio=window.__taleraInlineSharedAudio||document.createElement('video');",
      "const audio=window.__taleraInlineSharedAudio||document.createElement('audio');")
    .replace("audio.preload='auto';audio.playsInline=true;audio.setAttribute('playsinline','');audio.setAttribute('webkit-playsinline','');audio.style.display='none';",
      "audio.preload='auto';audio.playsInline=true;audio.style.display='none';")
    .replace("function showPhoto(memory,index,manual=false){\n    if(manual&&memory?._zeroItems?.some(item=>item.kind==='audio'))return;",
      "function showPhoto(memory,index,manual=false){")
    .replace("if(tile.index===index&&!(mem?._zeroItems?.some(x=>x.kind==='audio')&&mem.previewImage&&tile.el.dataset.url!==mem.previewImage))return;",
      "if(tile.index===index)return;")
    .replace("runtime.registerMemories(memories);taleraSwipeCoverObserve(memories);",
      "runtime.registerMemories(memories);")
    .replace("loaded.set(memory.id,urls);taleraSwipeCoverEnsure(memory,true);",
      "loaded.set(memory.id,urls);")
    .replace("          const hint=taleraUnifiedCreateListeningButton(s);","          const hint=document.createElement('div');\n          hint.textContent='Tik op de foto om het geluid te starten';\n          hint.style.cssText='position:absolute;left:50%;bottom:22%;transform:translateX(-50%);z-index:20;padding:9px 15px;border-radius:15px;background:rgba(250,250,247,.94);color:#173d52;font:650 13px system-ui;pointer-events:none';")
    .replace("    const hint=taleraUnifiedCreateListeningButton(s);","    const hint=document.createElement('div');\n    hint.className='talera-v61-audio-permission-hint';\n    hint.textContent='Tik op de foto om het geluid te starten';\n    hint.style.cssText='position:absolute;left:50%;bottom:22%;transform:translateX(-50%);z-index:20;padding:9px 15px;border-radius:15px;background:rgba(250,250,247,.94);color:#173d52;font:650 13px system-ui;pointer-events:none';")
    .replace("  const retry=e=>{\n    const s=taleraInline;\n    if(s?.engine==='narrated')return;",
      "  const retry=e=>{\n    const s=taleraInline;")
    .replace("    if(s?.engine!=='narrated'&&!(runtime.currentMemory()?._zeroItems?.some(x=>x.kind==='audio')))return;",
      "    if(s?.engine!=='narrated'||s.phase!=='narration')return;")
    .replace(INLINE_TAIL+'\n','')
    .replace(AUDIO_END_AFTER,AUDIO_END_BEFORE)
    .replace("const video=taleraUnifiedTakePrimed(s,frame)||document.createElement('video');",
      "const video=document.createElement('video');")
    .replace("s.videoUrl=url;if(video.src!==url)video.src=url;",
      "s.videoUrl=url;video.src=url;")
    .replace("const url=s.taleraUnifiedReplayUrl||await store.mediaUrl(frame.key);s.taleraUnifiedReplayUrl=null;",
      "const url=await store.mediaUrl(frame.key);")
    .replace("  taleraInline=s;\n  if(hasVoice)await taleraUnifiedWarmVideos(s);\n  if(s!==taleraInline)return;\n  if(hasVoice){",
      "  taleraInline=s;\n  if(hasVoice){")
    .replace("function taleraInlineDispose(){\n  const s=taleraInline;\n  taleraInline=null;\n  taleraUnifiedDropPrepared(s);",
      "function taleraInlineDispose(){\n  const s=taleraInline;\n  taleraInline=null;");
}

export default {
  async fetch(request,env){
    if(!env?.STYLE_BASE?.fetch)return new Response('Goedgekeurde TALERA V9 service-binding ontbreekt',{status:503});
    const upstream=await env.STYLE_BASE.fetch(request);
    const path=new URL(request.url).pathname;
    if(request.method!=='GET'||path!=='/present'||!upstream.ok||
      !(upstream.headers.get('content-type')||'').includes('text/html'))return upstream;
    const {html,status}=applyUnifiedTail(await upstream.text());
    if(status==='anchor-unmatched')return new Response('TALERA V9 presentatie gewijzigd: veilige test gestopt',{status:503});
    const headers=new Headers(upstream.headers);
    for(const key of ['etag','content-length','content-encoding'])headers.delete(key);
    headers.set('cache-control','no-store');
    headers.set('x-talera-clean-one-memory',status);
    return new Response(html,{status:upstream.status,statusText:upstream.statusText,headers});
  }
};
