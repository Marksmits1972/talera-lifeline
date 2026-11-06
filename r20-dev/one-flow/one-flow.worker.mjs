// TALERA closed-memory core. ONE native V9 presenter, ONE playback state machine.
// No secondary player, no hidden video priming, no old unified-tail adapter.
// The existing V13 wheel owns swipes BETWEEN memory IDs; never within one.
export const CORE_MARKER='TALERA_CLOSED_MEMORY_CORE_20261106';
export function unseenPhotos(frames,cues){
  const shown=new Set((cues||[]).map(c=>c.mediaId));
  return (frames||[]).map((frame,index)=>({frame,index}))
    .filter(({frame})=>frame.kind==='photo'&&!shown.has(frame.key));
}

export const CLOSED_VOICE_END=String.raw`function taleraInlineVoiceEnded(s){
  // ONE lifecycle: narration -> finish muted clip -> unseen photos -> originals -> done.
  // s is the EXISTING native presenter. Only its audio clock owns narrated cues.
  if(s!==taleraInline||s.phase!=='narration'||runtime.currentMemory()?.id!==s.memory.id)return;
  if(s.timer){clearInterval(s.timer);s.timer=null}
  const shown=new Set(s.cues.map(c=>c.mediaId));
  const remaining=s.frames.map((frame,index)=>({frame,index}))
    .filter(({frame})=>frame.kind==='photo'&&!shown.has(frame.key));
  const last=s.cues[s.cues.length-1];
  const lastFrame=last&&s.frames[last.index];
  const lastVideo=lastFrame?.kind==='video'&&s.videoKey===lastFrame.key?s.video:null;
  s.phase='tail';
  let cursor=0;
  const active=()=>s===taleraInline&&s.phase==='tail'&&
    runtime.currentMemory()?.id===s.memory.id;
  const stop=()=>{
    if(s.ordinaryTimer){clearTimeout(s.ordinaryTimer);s.ordinaryTimer=null}
  };
  const fail=e=>{
    if(!active())return;
    stop();s.phase='error';
    console.warn('TALERA herinnering kan niet volledig afspelen',e);
  };
  const next=()=>{
    if(!active())return;
    stop();
    if(cursor<remaining.length){
      // Internal programmatic photo cue; never a swipe or tap.
      const {index}=remaining[cursor++];
      taleraInlineCleanVideo(s);
      taleraInlineSetFrame(s,index);
      s.ordinaryTimer=setTimeout(next,4000);
      return;
    }
    // No phase-reset trick and NO handoff to another storytelling engine.
    taleraInlineCleanVideo(s);
    s.replayFrames=s.frames.filter(f=>f.kind==='video');
    s.replayIndex=-1;
    if(!s.replayFrames.length){s.phase='done';return}
    s.phase='originals';
    taleraInlineReplayNext(s); // Existing V9 media function, original file at t=0.
  };
  if(lastVideo&&!lastVideo.ended&&lastVideo.readyState>=1&&
     Number.isFinite(lastVideo.duration)&&
     lastVideo.duration-lastVideo.currentTime>.08){
    lastVideo.muted=true;lastVideo.defaultMuted=true;
    lastVideo.onended=()=>{if(active())next()};
    lastVideo.onerror=()=>fail(new Error('Gedempte video ontbreekt'));
    if(lastVideo.paused)Promise.resolve(lastVideo.play()).catch(fail);
  }else next();
}`;

function once(html,from,to){
  if(!from||html.split(from).length!==2)return null;
  return html.replace(from,to);
}
function block(html,from,until,replace){
  const a=html.indexOf(from),b=html.indexOf(until,a+from.length);
  if(a<0||b<0||html.indexOf(from,a+1)>=0||html.indexOf(until,b+1)>=0)return null;
  return html.slice(0,a)+replace+'\n'+html.slice(b);
}
export function applyClosedCore(html){
  if(typeof html!=='string')return {html,status:'not-html'};
  if(html.includes(CORE_MARKER))return {html,status:'already-installed'};
  // All anchors belong to the approved V9 script. Abort atomically on drift.
  const voiceStart='function taleraInlineVoiceEnded(s){';
  const voiceEnd='function taleraInlineOrdinaryStep(s,index){';
  const photo='function showPhoto(memory,index,manual=false){';
  const manualGuard="function showPhoto(memory,index,manual=false){\n    if(manual&&memory?._zeroItems?.some(item=>item.kind==='audio'))return;";
  const nativeRetry="  const retry=e=>{\n    const s=taleraInline;";
  const noSwipeRetry="  const retry=e=>{\n    const s=taleraInline;\n    if(s?.engine==='narrated')return;";
  const nativeClick="    if(s?.engine!=='narrated'||s.phase!=='narration')return;";
  const allPhasesClick="    if(!runtime.currentMemory()?._zeroItems?.some(item=>item.kind==='audio'))return;";
  const hydrate="       memory._photoIndex=0;\n       memory.image=photos[0]||placeholder;";
  const stableCover="       memory._photoIndex=0;\n       const firstCue=(memory._taleraNarrationCues||[]).slice().sort((a,b)=>(Number(a.t)||0)-(Number(b.t)||0))\n         .find(c=>Number.isInteger(c?.index)&&frames[c.index]&&['photo','video'].includes(frames[c.index].kind));\n       const coverIndex=firstCue?firstCue.index:0;\n       if(memory._zeroItems?.some(x=>x.kind==='audio'))memory.previewImage=photos[coverIndex]||photos[0]||placeholder;\n       memory.image=photos[0]||placeholder;";
  const oldAssign="if(tile.index===index)return;";
  const newAssign="if(tile.index===index&&tile.el.dataset.url===(mem?.previewImage||mem?.thumbnail||mem?.image))return;";
  const voiceHint="    const hint=document.createElement('div');\n    hint.className='talera-v61-audio-permission-hint';\n    hint.textContent='Tik op de foto om het geluid te starten';";
  const liveVoiceHint="    const hint=document.createElement('button');\n    hint.type='button';\n    hint.className='talera-v61-audio-permission-hint';\n    hint.textContent='▶ Beluister';";
  const videoHint="          const hint=document.createElement('div');\n          hint.textContent='Tik op de foto om het geluid te starten';";
  const liveVideoHint="          const hint=document.createElement('button');\n          hint.type='button';\n          hint.textContent='▶ Beluister';";
  const styleVoice="pointer-events:none';\n    (stage.parentElement||stage).appendChild(hint);s.hint=hint;";
  const activeVoice="pointer-events:auto;cursor:pointer';\n    hint.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();tryVoice(s)});\n    (stage.parentElement||stage).appendChild(hint);s.hint=hint;";
  const styleVideo="pointer-events:none';\n          (stage.parentElement||stage).appendChild(hint);s.hint=hint;";
  const activeVideo="pointer-events:auto;cursor:pointer';\n          hint.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();tryPlay()});\n          (stage.parentElement||stage).appendChild(hint);s.hint=hint;";
  let result=block(html,voiceStart,voiceEnd,CLOSED_VOICE_END);
  if(!result)return {html,status:'anchor-unmatched:voice'};
  for(const [from,to,reason] of [
    [photo,manualGuard,'manual-photo'],
    [nativeRetry,noSwipeRetry,'swipe-resume'],
    [nativeClick,allPhasesClick,'story-tap'],
    [hydrate,stableCover,'stable-cover'],
    [oldAssign,newAssign,'wheel-cover'],
    [voiceHint,liveVoiceHint,'voice-fallback'],
    [videoHint,liveVideoHint,'video-fallback'],
    [styleVoice,activeVoice,'voice-button'],
    [styleVideo,activeVideo,'video-button'],
  ]){
    const next=once(result,from,to);
    if(next===null)return {html,status:'anchor-unmatched:'+reason};
    result=next;
  }
  // The native functions are edited IN PLACE; no event listeners, hidden
  // media elements, iframe players, alternate photo wheels, or tail adapters.
  result=result.replace(voiceStart,CLOSED_VOICE_END.slice(0,voiceStart.length));
  result=result.replace('/* TALERA V13: V3 continuous wheel is sole owner of photo gestures and position. */',
    '/* '+CORE_MARKER+': V13 wheel selects one memory record per swipe. */');
  if(!result.includes(CORE_MARKER))return {html,status:'anchor-unmatched:marker'};
  return {html:result,status:'installed'};
}

export default {
  async fetch(request,env){
    if(!env?.STYLE_BASE?.fetch)return new Response('TALERA V9 servicebinding ontbreekt',{status:503});
    const upstream=await env.STYLE_BASE.fetch(request);
    const path=new URL(request.url).pathname;
    if(request.method!=='GET'||path!=='/present'||!upstream.ok||
      !(upstream.headers.get('content-type')||'').includes('text/html'))return upstream;
    const {html,status}=applyClosedCore(await upstream.text());
    if(status!=='installed'&&status!=='already-installed')
      return new Response('TALERA gesloten cyclus niet veilig te activeren: '+status,{status:503});
    const headers=new Headers(upstream.headers);
    for(const key of ['etag','content-length','content-encoding'])headers.delete(key);
    headers.set('cache-control','no-store');
    headers.set('x-talera-closed-core',status);
    return new Response(html,{status:upstream.status,statusText:upstream.statusText,headers});
  }
};
