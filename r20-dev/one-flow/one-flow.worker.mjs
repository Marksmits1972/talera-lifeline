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
      if(s!==taleraInline)return;
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
  if(!entry?.primed)return null;
  s.taleraUnifiedPrepared.delete(frame.key);
  s.taleraUnifiedReplayUrl=entry.url;
  entry.video.pause();
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
  // Target only the existing inline presenter, not its voice recorder.
  const nativeVideoStart=result.indexOf('function taleraInlinePlayMedia(s,frame,muted,finished){');
  const nativeVideoEnd=result.indexOf('function taleraInlineReplayNext(s){',nativeVideoStart);
  if(nativeVideoStart<0||nativeVideoEnd<0)return {html,status:'anchor-unmatched'};
  const nativeVideo=result.slice(nativeVideoStart,nativeVideoEnd);
  const oldCreate="const video=document.createElement('video');";
  const oldUrl="const url=await store.mediaUrl(frame.key);";
  if(nativeVideo.split(oldCreate).length!==2||nativeVideo.split(oldUrl).length!==2)
    return {html,status:'anchor-unmatched'};
  const changedVideo=nativeVideo
    .replace(oldCreate,"const video=taleraUnifiedTakePrimed(s,frame)||document.createElement('video');")
    .replace(oldUrl,"const url=s.taleraUnifiedReplayUrl||await store.mediaUrl(frame.key);s.taleraUnifiedReplayUrl=null;");
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
