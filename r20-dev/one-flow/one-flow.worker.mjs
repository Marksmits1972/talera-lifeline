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
/* Swipe endings are NOT user intent to play video. A tracked photo TAP or
   explicit listening action can prime the originals, never a dragging gesture. */
const taleraUnifiedVerifiedTaps=new WeakSet();
let taleraUnifiedPointer=null,taleraUnifiedTouch=null;
const taleraUnifiedMoved=(g,x,y)=>Math.hypot(x-g.x,y-g.y)>12;
const taleraUnifiedTapTarget=e=>Boolean(e.target?.closest?.('#photoStage,#memoryStoryScroll'));
function taleraUnifiedWasStationaryTap(e){
  return taleraUnifiedVerifiedTaps.has(e)&&taleraUnifiedTapTarget(e);
}
document.addEventListener('pointerdown',e=>{
  if(e.isPrimary===false)return;
  taleraUnifiedPointer={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
},{capture:true,passive:true});
document.addEventListener('pointermove',e=>{
  const g=taleraUnifiedPointer;
  if(g&&g.id===e.pointerId&&taleraUnifiedMoved(g,e.clientX,e.clientY))g.moved=true;
},{capture:true,passive:true});
document.addEventListener('pointerup',e=>{
  const g=taleraUnifiedPointer;taleraUnifiedPointer=null;
  if(!g||g.id!==e.pointerId||g.moved||taleraUnifiedMoved(g,e.clientX,e.clientY))return;
  taleraUnifiedVerifiedTaps.add(e);
  if(taleraUnifiedTapTarget(e))taleraUnifiedPrimeCurrent();
},{capture:true,passive:true});
document.addEventListener('pointercancel',()=>{taleraUnifiedPointer=null},{capture:true,passive:true});
document.addEventListener('touchstart',e=>{
  const t=e.changedTouches?.[0];
  if(!t||e.touches?.length!==1){taleraUnifiedTouch=null;return}
  taleraUnifiedTouch={id:t.identifier,x:t.clientX,y:t.clientY,moved:false};
},{capture:true,passive:true});
document.addEventListener('touchmove',e=>{
  const g=taleraUnifiedTouch;
  if(!g)return;
  if(e.touches?.length!==1){g.moved=true;return}
  const t=Array.from(e.touches||[]).find(t=>t.identifier===g.id);
  if(t&&taleraUnifiedMoved(g,t.clientX,t.clientY))g.moved=true;
},{capture:true,passive:true});
document.addEventListener('touchend',e=>{
  const g=taleraUnifiedTouch;taleraUnifiedTouch=null;
  if(!g||g.moved)return;
  const t=Array.from(e.changedTouches||[]).find(t=>t.identifier===g.id);
  if(!t||taleraUnifiedMoved(g,t.clientX,t.clientY))return;
  taleraUnifiedVerifiedTaps.add(e);
  if(taleraUnifiedTapTarget(e))taleraUnifiedPrimeCurrent();
},{capture:true,passive:true});
document.addEventListener('touchcancel',()=>{taleraUnifiedTouch=null},{capture:true,passive:true});
document.addEventListener('talera:enable-listening',taleraUnifiedPrimeCurrent,true);
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
  result=result.slice(0,nativeVideoStart)+changedVideo+result.slice(nativeVideoEnd);
  // Original V9 also resumes video on every pointerup/touchend; do not
  // equate the end of a swipe with a deliberate tap on the photo.
  const audioStart=result.indexOf('function taleraInlineInstallAudioControls(){');
  const audioEnd=result.indexOf('async function present(memory){',audioStart);
  if(audioStart<0||audioEnd<0)return {html,status:'anchor-unmatched'};
  const audioSource=result.slice(audioStart,audioEnd);
  const oldRetry="  const retry=e=>{\n    const s=taleraInline;";
  const newRetry="  const retry=e=>{\n    if(!taleraUnifiedWasStationaryTap(e))return;\n    const s=taleraInline;";
  const oldClickGuard="    if(s?.engine!=='narrated'||s.phase!=='narration')return;";
  const newClickGuard="    if(s?.engine!=='narrated')return;";
  if(audioSource.split(oldRetry).length!==2||audioSource.split(oldClickGuard).length!==2)
    return {html,status:'anchor-unmatched'};
  result=result.slice(0,audioStart)+audioSource
    .replace(oldRetry,newRetry).replace(oldClickGuard,newClickGuard)+result.slice(audioEnd);
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
    .replace("  const retry=e=>{\n    if(!taleraUnifiedWasStationaryTap(e))return;\n    const s=taleraInline;",
      "  const retry=e=>{\n    const s=taleraInline;")
    .replace("    if(s?.engine!=='narrated')return;",
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
