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
// Frame-zero cover is ONE still image; decoder never plays, enters DOM or stores a new memory.
export const CLOSED_COVER=String.raw`async function taleraClosedMakeCover(memory,frame,index,urls){
  if(!frame||frame.kind!=='video'||frame.url)return;
  let src=null;
  try{
    src=await store.mediaUrl(frame.key);
    if(!src)return;
    const blob=await new Promise(resolve=>{
      const v=document.createElement('video');
      let done=false,timeout=null;
      const finish=blob=>{
        if(done)return;done=true;clearTimeout(timeout);
        v.onloadedmetadata=v.onloadeddata=v.oncanplay=v.onseeked=v.onerror=null;
        v.pause();v.removeAttribute('src');v.load();resolve(blob||null);
      };
      const draw=()=>{
        if(v.readyState<2||!v.videoWidth||!v.videoHeight)return;
        try{
          const factor=Math.min(1,720/Math.max(v.videoWidth,v.videoHeight));
          const c=document.createElement('canvas');
          c.width=Math.max(1,Math.round(v.videoWidth*factor));
          c.height=Math.max(1,Math.round(v.videoHeight*factor));
          c.getContext('2d').drawImage(v,0,0,c.width,c.height);
          c.toBlob(finish,'image/jpeg',.78);
        }catch(e){finish(null)}
      };
      v.muted=true;v.defaultMuted=true;v.playsInline=true;
      v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');
      v.preload='auto';v.onloadeddata=v.oncanplay=v.onseeked=draw;
      v.onloadedmetadata=()=>{
        try{v.currentTime=Math.min(.001,Number.isFinite(v.duration)&&v.duration>0?v.duration/2:.001)}catch(e){}
        draw();
      };
      v.onerror=()=>finish(null);
      timeout=setTimeout(()=>finish(null),6000);
      v.src=src;v.load();
    });
    if(!blob?.size||!loaded.has(memory.id))return;
    const cover=URL.createObjectURL(blob);
    urls.push(cover);memory.previewImage=cover;memory.photos[index]=cover;
    if(memory._photoIndex===index){
      memory.image=cover;
      if(runtime.currentMemory()?.id===memory.id)window.__taleraV31SelectPhoto?.(memory.id,index,false);
    }
  }catch(e){console.warn('TALERA videostill niet beschikbaar',e)}
  finally{if(src)URL.revokeObjectURL(src)}
}`;

export const CLOSED_MEDIA=String.raw`function taleraInlinePlayMedia(s,frame,muted,finished){
  if(s!==taleraInline||!frame)return;
  taleraInlineCleanVideo(s);
  const serial=s.videoSerial;
  const audioOwner=s.engine==='narrated'&&s.phase==='originals'&&s.audio&&!muted;
  const video=document.createElement('video');
  video.className='talera-v61-inline-video';
  video.playsInline=true;video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');
  video.preload='auto';video.controls=false;
  video.muted=muted||audioOwner;video.defaultMuted=muted||audioOwner;video.volume=1;
  // Safari Low Power Mode shows its OWN giant play overlay for <video autoplay>,
  // and may reject autoplay entirely. Use explicit .play() below (same native
  // viewport), with one Beluister fallback if a real gesture is required.
  if(video.muted)video.setAttribute('muted','');
  // Originals must paint above the fixed photo-cover; buttons remain above at z-index 65.
  video.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:'+(audioOwner?30:12)+';pointer-events:none';
  (stage.parentElement||stage).appendChild(video);
  s.video=video;s.videoKey=frame.key;
  let completed=false;
  const done=()=>{
    if(completed||s!==taleraInline||s.video!==video)return;
    completed=true;finished?.();
  };
  const consent=(target)=>{
    if(s.hint)return;
    s.blockedByBrowser=true;
    const button=document.createElement('button');
    button.type='button';button.className='talera-v61-audio-permission-hint';
    button.textContent='▶ Beluister';
    button.style.cssText='position:absolute;left:50%;bottom:22%;transform:translateX(-50%);z-index:65;padding:9px 15px;border:0;border-radius:15px;background:rgba(250,250,247,.94);color:#173d52;font:650 13px system-ui;pointer-events:auto';
    button.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      // A browser-blocked image must never leave only the soundtrack running.
      // The ONE user gesture re-enables both existing native media nodes together.
      const starts=audioOwner&&s.audio?[video.play(),s.audio.play()]:[target.play()];
      Promise.all(starts.map(p=>Promise.resolve(p))).then(()=>{
        if(s===taleraInline&&s.hint===button){
          button.remove();s.hint=null;s.blockedByBrowser=false;
        }
      }).catch(()=>{});
    });
    (stage.parentElement||stage).appendChild(button);s.hint=button;
  };
  let visualStartPending=false;
  const playVideo=()=>{
    if(s!==taleraInline||s.video!==video||!video.paused||visualStartPending||s.blockedByBrowser)return;
    visualStartPending=true;
    Promise.resolve(video.play()).then(()=>{
      visualStartPending=false;
      if(!audioOwner&&s.hint){s.hint.remove();s.hint=null}
    }).catch(e=>{
      visualStartPending=false;
      if(s!==taleraInline||s.video!==video)return;
      if(e?.name==='NotAllowedError'){
        // Never report progress with sound while the video is only its preview frame.
        if(audioOwner&&s.audio&&!s.audio.paused)s.audio.pause();
        consent(video);
      }else if(e?.name!=='AbortError')console.warn('TALERA videobeeld niet gestart',e);
    });
  };
  video.onended=()=>{if(!audioOwner)done()};
  video.onerror=()=>{
    if(s!==taleraInline||s.video!==video)return;
    console.warn('TALERA originele video niet afspeelbaar');
    if(s.engine==='narrated')s.phase='error';else done();
  };
  void (async()=>{
    try{
      const url=await store.mediaUrl(frame.key);
      if(s!==taleraInline||s.video!==video||s.videoSerial!==serial){
        if(url)URL.revokeObjectURL(url);return;
      }
      if(!url)throw Error('Originele video ontbreekt');
      s.videoUrl=url;video.src=url;
      if(!audioOwner){
        s.closedAudioSoundtrack=false;
        video.onloadedmetadata=playVideo;
        playVideo();
        return;
      }
      // The SAME native audio element plays both the recorded WAV and the
      // original video soundtrack. No second audible media permission needed.
      // The native video plane displays the image muted, synced to this audio.
      const audio=s.audio;
      s.closedAudioSoundtrack=true;
      audio.pause();audio.src=url;audio.muted=false;audio.volume=1;
      audio.onended=done;
      audio.onplay=playVideo;
      audio.onpause=()=>{
        // Ignore a queued pause event from the previous WAV when the new soundtrack is already running.
        if(audio.paused&&!audio.ended&&s===taleraInline&&s.video===video)video.pause();
      };
      audio.ontimeupdate=()=>{
        if(s!==taleraInline||s.video!==video)return;
        // Recovery from a late metadata/event handoff; never treat audio time as video proof.
        if(!audio.paused&&video.paused&&!s.blockedByBrowser)playVideo();
        if(video.readyState<2||video.seeking)return;
        const target=Math.max(0,Number(audio.currentTime)||0);
        if(Math.abs((video.currentTime||0)-target)>.4){
          try{video.currentTime=Math.min(target,Math.max(0,(video.duration||0)-.02))}catch(e){}
        }
      };
      video.onloadedmetadata=playVideo;
      video.oncanplay=()=>{if(!audio.paused)playVideo()};
      const playSound=()=>{
        if(s!==taleraInline||s.video!==video)return;
        Promise.resolve(audio.play()).then(()=>{
          playVideo();
          if(s.hint){s.hint.remove();s.hint=null;s.blockedByBrowser=false}
        }).catch(e=>{
          if(e?.name==='NotSupportedError'){
            // Codec fallback is the original V9 audible-video behavior.
            s.closedAudioSoundtrack=false;
            video.muted=false;video.defaultMuted=false;video.removeAttribute('muted');
            video.onended=done;
            Promise.resolve(video.play()).catch(err=>{
              if(err?.name==='NotAllowedError')consent(video);
              else console.warn('TALERA geluid niet gestart',err);
            });
          }else if(e?.name==='NotAllowedError')consent(audio);
          else console.warn('TALERA geluid niet gestart',e);
        });
      };
      playVideo();playSound();
    }catch(e){
      if(s===taleraInline&&s.video===video){
        console.warn('TALERA videobestand niet beschikbaar',e);
        if(s.engine==='narrated')s.phase='error';else done();
      }
    }
  })();
}`;

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
  const stableCover="       memory._photoIndex=0;\n       const firstCue=(memory._taleraNarrationCues||[]).slice().sort((a,b)=>(Number(a.t)||0)-(Number(b.t)||0))\n         .find(c=>Number.isInteger(c?.index)&&frames[c.index]&&['photo','video'].includes(frames[c.index].kind));\n       const coverIndex=firstCue?firstCue.index:0;\n       if(memory._zeroItems?.some(x=>x.kind==='audio'))memory.previewImage=photos[coverIndex]||photos[0]||placeholder;\n       memory.image=photos[0]||placeholder;\n       if(frames[coverIndex]?.kind==='video'&&!frames[coverIndex].url)\n         void taleraClosedMakeCover(memory,frames[coverIndex],coverIndex,urls);";
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
  const nativeHydrate=' async function hydrate(memory){';
  const withCover=once(result,nativeHydrate,CLOSED_COVER+'\n'+nativeHydrate);
  if(withCover===null)return {html,status:'anchor-unmatched:cover-decoder'};
  result=withCover;
  // One native video surface, but the existing WAV audio element also
  // plays every original video's sound. The video itself remains muted.
  const videoStart='function taleraInlinePlayMedia(s,frame,muted,finished){';
  const videoEnd='function taleraInlineReplayNext(s){';
  const changedVideo=block(result,videoStart,videoEnd,CLOSED_MEDIA);
  if(changedVideo===null)return {html,status:'anchor-unmatched:video-core'};
  result=changedVideo;
  const originalSettings="      else if(s.phase==='originals'&&s.video){\n        s.video.muted=!enabled();\n        if(s.video.paused)void s.video.play().catch(err=>{\n          if(err?.name==='NotAllowedError'&&enabled())informGesture(s);\n        });\n      }";
  const closedSettings="      else if(s.phase==='originals'&&s.video){\n        if(s.closedAudioSoundtrack){\n          s.video.muted=true;s.audio.muted=!enabled();\n          if(s.audio.paused)void s.audio.play().catch(err=>{if(err?.name==='NotAllowedError'&&enabled())informGesture(s)});\n        }else{\n          s.video.muted=!enabled();\n          if(s.video.paused)void s.video.play().catch(err=>{if(err?.name==='NotAllowedError'&&enabled())informGesture(s)});\n        }\n      }";
  const settings=once(result,originalSettings,closedSettings);
  if(settings===null)return {html,status:'anchor-unmatched:settings'};
  result=settings;
  const originalVisibility="    }else if(s.engine==='narrated'&&s.phase==='narration')tryVoice(s);\n    else if(s.video?.paused&&!s.video.ended)void s.video.play().catch(()=>{});";
  const closedVisibility="    }else if(s.engine==='narrated'&&s.phase==='narration')tryVoice(s);\n    else if(s.phase==='originals'&&s.closedAudioSoundtrack){\n      if(s.audio?.paused&&!s.audio.ended)void s.audio.play().catch(()=>{});\n      if(s.video?.paused&&!s.video.ended)void s.video.play().catch(()=>{});\n    }else if(s.video?.paused&&!s.video.ended)void s.video.play().catch(()=>{});";
  const visibility=once(result,originalVisibility,closedVisibility);
  if(visibility===null)return {html,status:'anchor-unmatched:visibility'};
  result=visibility;
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
