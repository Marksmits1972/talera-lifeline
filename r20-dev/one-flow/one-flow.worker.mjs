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
  const withHelper=html.slice(0,at)+INLINE_TAIL+'\n'+html.slice(at);
  return {html:withHelper.replace(AUDIO_END_BEFORE,AUDIO_END_AFTER),status:'installed'};
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
