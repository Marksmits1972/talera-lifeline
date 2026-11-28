// TALERA Free F5: zelfstandige VERTELmotor. Geen presentatie- of Story Player-functies.
// Dit onderdeel wordt alleen door de herinneringstype-router aangeroepen.
// Alleen originele media-ID's en bestanden komen uit de accountgebonden bibliotheek.
function taleraIndependentNarrationPlan(memory){
  const frames=Array.isArray(memory?._zeroFrames)?memory._zeroFrames:[];
  const original=Array.isArray(memory?._taleraNarrationCues)?memory._taleraNarrationCues:[];
  const ids=new Map(frames.map((frame,index)=>[frame.key,index]));
  const cues=[];
  for(const cue of original){
    const t=Number(cue?.t);
    if(!Number.isFinite(t)||t<0)continue;
    const hasId=typeof cue?.mediaId==='string'&&cue.mediaId.length>0;
    const index=hasId?ids.get(cue.mediaId):Number(cue?.index);
    // Never use a stale index when the original ID cannot be found.
    if(hasId&&!ids.has(cue.mediaId))
      throw Error('Het oorspronkelijke media-ID van de vertelopname ontbreekt.');
    if(!Number.isInteger(index)||index<0||index>=frames.length)continue;
    cues.push({t:Math.round(t),index,mediaId:frames[index].key,
      videoAtMs:Math.max(0,Number(cue.videoAtMs)||0)});
  }
  cues.sort((a,b)=>a.t-b.t);
  if(frames.length&&!cues.length)
    cues.push({t:0,index:0,mediaId:frames[0].key,videoAtMs:0});
  if(cues.length&&cues[0].t>0)
    cues.unshift({...cues[0],t:0,videoAtMs:0});
  const used=new Set(cues.map(c=>c.mediaId));
  const remainingPhotos=frames.filter(f=>f.kind==='photo'&&!used.has(f.key));
  const videos=[],visited=new Set();
  for(const cue of cues){
    const f=frames[cue.index];
    if(f?.kind==='video'&&!visited.has(f.key)){
      visited.add(f.key);videos.push(f);
    }
  }
  return {frames,cues,remainingPhotos,videos};
}
function taleraCreateIndependentNarrator({stage,store,runtime}){
  let active=null,generation=0;
  // The sole audible output is shared with ordinary videos, NEVER the motors.
  const sharedAudible=window.__taleraF5SharedAudible;
  if(!sharedAudible)throw Error('TALERA enkele geluidsvoorziening ontbreekt');
  // TALERA narrator has its OWN audible playback policy. Reading the
  // presenter's global listening switch can silently mute BOTH the original
  // voice and the original video, and violates the 100%-independent motor.
  // Only video previews DURING the voice are intentionally muted.
  function setAudible(media){
    media.muted=false;media.defaultMuted=false;media.volume=1;
    media.removeAttribute('muted');
  }
  function prepareNativePlayback(s){
    // On iOS standalone PWAs the default audio-session category may obey the
    // silent switch, even when HTMLMediaElement.muted === false. Only while
    // this narration owns the screen, request the native playback category.
    try{
      const native=typeof navigator==='undefined'?null:navigator.audioSession;
      if(!native||typeof native.type!=='string')return;
      if(!s.nativeAudioSession&&native.type!=='playback')
        s.nativeAudioSession={native,previous:native.type};
      if(native.type!=='playback')native.type='playback';
    }catch(error){
      console.warn('TALERA iPhone narrator audio session unavailable',error);
    }
  }
  function restoreNativePlayback(s){
    const prior=s.nativeAudioSession;
    if(!prior)return;
    try{
      if(prior.native.type==='playback')
        prior.native.type=prior.previous;
    }catch(error){
      console.warn('TALERA iPhone narrator audio session restore unavailable',error);
    }
    s.nativeAudioSession=null;
  }
  function highlightNarratorDot(s,index){
    if(!isCurrent(s)||!Number.isInteger(index)||index<0)return;
    // Only the existing dots DOM is reused; no ordinary motor method,
    // timer, callback or presentation state is invoked.
    const dots=document.querySelectorAll?.('.talera-photo-dot')||[];
    if(dots.length!==s.plan.frames.length)return;
    dots.forEach((dot,i)=>dot.classList.toggle('active',i===index));
  }
  const isCurrent=s=>active===s&&s.generation===generation&&
    runtime.currentMemory()?.id===s.id;
  function clearButton(s){
    if(s.button){s.button.remove();s.button=null}
    s.retry=null;
  }
  function offerPlay(s,media){
    if(!isCurrent(s)||s.swipeSuspended)return;
    // Only a REAL iOS NotAllowedError shows this non-interactive reminder.
    // The real tap is captured on the EXISTING presentation surface below.
    if(!s.button){
      const hint=document.createElement('div');
      hint.id='talera-f5-narrator-sound-hint';
      window.TaleraI18n.setText(hint,'core.media.narratorSoundHint');
      hint.setAttribute('role','status');
      hint.style.cssText='position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 128px);transform:translateX(-50%);z-index:40;padding:9px 15px;border-radius:20px;background:rgba(7,26,61,.80);color:white;font:500 14px/1.35 -apple-system,BlinkMacSystemFont,sans-serif;white-space:nowrap;max-width:calc(100vw - 32px);pointer-events:none;-webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px)';
      document.body.appendChild(hint);s.button=hint;
    }
    s.retry=()=>{
      if(!isCurrent(s)||s.swipeSuspended||!sharedAudible.isOwner(s))return;
      prepareNativePlayback(s);setAudible(media);
      // A user gesture must invoke play() right here: no awaits or timers.
      Promise.resolve(media.play()).then(()=>clearButton(s)).catch(error=>{
        if(!isCurrent(s))return;
        if(error?.name==='NotAllowedError')offerPlay(s,media);
        else if(error?.name!=='AbortError')
          console.warn('TALERA vertelgeluid kan niet starten',error);
      });
    };
  }
  // A cold iOS document can interrupt its very first play() while the
  // underlying source is being prepared. The original implementation ignored
  // AbortError forever; with a voice-driven clock that also freezes all photos.
  // Re-try at most twice on the SAME audio node, never on a swipe, page hide,
  // memory change or intentional pause. Then offer the existing tap unlock.
  function recoverInterruptedStart(s,media){
    if(!isCurrent(s)||s.audio!==media||!media.paused||media.ended||
       s.swipeSuspended||document.hidden)return;
    if(s.interruptedRetries>=2){offerPlay(s,media);return}
    s.interruptedRetries++;
    if(s.interruptedRetryTimer)clearTimeout(s.interruptedRetryTimer);
    s.interruptedRetryTimer=setTimeout(()=>{
      s.interruptedRetryTimer=null;
      if(isCurrent(s)&&s.audio===media&&media.paused&&!media.ended&&
         !s.swipeSuspended&&!document.hidden)
        attemptPlay(s,media);
    },220);
  }
  function attemptPlay(s,media){
    if(!isCurrent(s)||!media||s.swipeSuspended)return;
    prepareNativePlayback(s);
    setAudible(media);
    try{Promise.resolve(media.play()).then(()=>{
      s.interruptedRetries=0;
      clearButton(s);
    }).catch(error=>{
      if(!isCurrent(s))return;
      if(error?.name==='NotAllowedError')offerPlay(s,media);
      else if(error?.name==='AbortError')recoverInterruptedStart(s,media);
      else console.warn('TALERA vertelgeluid niet gestart',error);
    })}
    catch(error){
      if(error?.name==='NotAllowedError')offerPlay(s,media);
      else if(error?.name==='AbortError')recoverInterruptedStart(s,media);
      else console.warn('TALERA vertelgeluid niet gestart',error);
    }
  }
  function removeVideo(s){
    if(!s.video)return;
    const v=s.video;s.video=null;s.videoId='';
    v.onloadedmetadata=v.oncanplay=v.onended=v.onerror=null;
    try{v.pause();v.removeAttribute('src');v.load()}catch(error){}
    v.remove();
    if(s.videoUrl){URL.revokeObjectURL(s.videoUrl);s.videoUrl=null}
  }
  // Pause ONLY the independent narrator's active video as soon as an actual
  // horizontal swipe is recognized. The established RH19 strip still owns
  // all gesture movement and memory selection; the video is not dragged.
  function bindSwipeSuspension(s){
    const eligible=e=>e.isPrimary!==false&&
      (e.pointerType!=='mouse'||e.button===0)&&
      !!e.target?.closest?.('#memoryStoryScroll')&&
      !e.target?.closest?.('a,button,input,textarea,select,nav,[role="button"],.talera-memory-audio');
    s.onSwipePointerDown=e=>{
      if(!isCurrent(s)||!eligible(e))return;
      s.swipePointer={id:e.pointerId,x:e.clientX,y:e.clientY};
    };
    s.onSwipePointerMove=e=>{
      const p=s.swipePointer;
      if(!p||p.id!==e.pointerId||!isCurrent(s))return;
      const dx=e.clientX-p.x,dy=e.clientY-p.y;
      if(Math.abs(dx)<13||Math.abs(dx)<Math.abs(dy)*1.2)return;
      s.swipePointer=null;
      if(!s.video||s.swipeSuspended)return;
      s.swipeSuspended=true;
      s.swipeWasPlaying=!!s.audio&&!s.audio.paused&&!s.audio.ended;
      if(s.audio&&!s.audio.paused)s.audio.pause();
      if(s.video&&!s.video.paused)s.video.pause();
      s.layer.style.visibility='hidden';
    };
    s.onSwipePointerEnd=e=>{
      if(s.swipePointer?.id===e.pointerId)s.swipePointer=null;
    };
    s.onSwipeWheelMotion=e=>{
      if(e.detail?.active!==false||!s.swipeSuspended)return;
      s.swipeSuspended=false;
      if(!isCurrent(s))return;
      s.layer.style.visibility='';
      if(s.swipeWasPlaying)attemptPlay(s,s.audio);
      s.swipeWasPlaying=false;
    };
    document.addEventListener('pointerdown',s.onSwipePointerDown,{capture:true,passive:true});
    document.addEventListener('pointermove',s.onSwipePointerMove,{capture:true,passive:true});
    document.addEventListener('pointerup',s.onSwipePointerEnd,{capture:true,passive:true});
    document.addEventListener('pointercancel',s.onSwipePointerEnd,{capture:true,passive:true});
    document.addEventListener('talera:wheel-motion',s.onSwipeWheelMotion);
  }
  function stop(){
    generation++;
    const s=active;active=null;
    if(!s)return;
    for(const [event,handler] of [
      ['pointerdown',s.onSwipePointerDown],['pointermove',s.onSwipePointerMove],
      ['pointerup',s.onSwipePointerEnd],['pointercancel',s.onSwipePointerEnd],
      ['talera:wheel-motion',s.onSwipeWheelMotion]
    ])if(handler)document.removeEventListener(event,handler,event!=='talera:wheel-motion');
    if(s.timer)clearInterval(s.timer);
    if(s.postTimer)clearTimeout(s.postTimer);
    if(s.interruptedRetryTimer)clearTimeout(s.interruptedRetryTimer);
    if(s.audio){
      s.audio.onplay=s.audio.onpause=s.audio.onended=null;
      s.audio.ontimeupdate=s.audio.onseeking=s.audio.onseeked=null;
      s.audio.onplaying=null;
      sharedAudible.release(s);
      // Reparent the SAME existing node, never detach/destroy it.
      if(s.audio.parentElement!==document.body)document.body.appendChild(s.audio);
    }
    s.voiceOrb?.destroy();
    if(s.voiceUrl)URL.revokeObjectURL(s.voiceUrl);
    removeVideo(s);clearButton(s);
    if(s.tapTarget&&s.onSoundTap)s.tapTarget.removeEventListener('click',s.onSoundTap,true);
    if(s.tapTarget&&s.onSoundTouchStart)s.tapTarget.removeEventListener('touchstart',s.onSoundTouchStart,true);
    if(s.tapTarget&&s.onSoundTouchEnd)s.tapTarget.removeEventListener('touchend',s.onSoundTouchEnd,true);
    for(const url of s.createdUrls)URL.revokeObjectURL(url);
    restoreNativePlayback(s);
    s.layer.remove();
    if(s.hostPositionChanged&&s.host.style.position==='relative')
      s.host.style.position=s.hostPosition;
    document.body.classList.remove('talera-v61-narration-visual');
    document.removeEventListener('visibilitychange',s.visibilityChange);
  }
  async function urlFor(s,frame,originalVideo=false){
    if(!isCurrent(s)||!frame?.key)return null;
    if(!originalVideo&&frame.kind==='photo'&&frame.url)return frame.url;
    let url=await store.mediaUrl(frame.key);
    if(!isCurrent(s)){if(url)URL.revokeObjectURL(url);return null}
    if(url)s.createdUrls.add(url);
    return url;
  }
  function displayPhoto(s,frame){
    removeVideo(s);
    s.photo.hidden=false;
    s.photo.alt='';
    const token=++s.frameSerial;
    void urlFor(s,frame).then(url=>{
      if(!isCurrent(s)||token!==s.frameSerial||!url)return;
      s.photo.src=url;
    }).catch(error=>console.warn('TALERA vertelfoto niet bereikbaar',error));
  }
  function syncSilentVideo(s,cue,frame,audioMs){
    if(!isCurrent(s)||s.phase!=='voice')return;
    if(s.videoId!==frame.key){
      removeVideo(s);
      s.photo.hidden=true;
      const video=document.createElement('video');
      video.className='talera-v61-inline-video talera-independent-narrator-video';
      video.setAttribute('playsinline','');
      video.setAttribute('webkit-playsinline','');
      video.playsInline=true;video.preload='auto';
      video.muted=true;video.defaultMuted=true;video.controls=false;
      video.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none';
      s.layer.appendChild(video);
      s.video=video;s.videoId=frame.key;
      const serial=++s.videoSerial;
      const syncStart=()=>{
        if(!isCurrent(s)||s.video!==video||s.videoSerial!==serial)return;
        const now=Math.max(0,(Number(s.audio?.currentTime)||0)*1000);
        const offset=(Number(cue.videoAtMs)||0)+Math.max(0,now-cue.t);
        const wanted=Math.max(0,offset/1000);
        const max=Number.isFinite(video.duration)&&video.duration>0?
          Math.max(0,video.duration-0.05):wanted;
        if(wanted>0.15)try{video.currentTime=Math.min(wanted,max)}catch(error){}
        if(!s.audio?.paused&&!s.audio?.ended)
          Promise.resolve(video.play()).catch(()=>{});
      };
      video.onloadedmetadata=syncStart;
      video.oncanplay=()=>{if(!s.audio?.paused&&!video.ended)
        Promise.resolve(video.play()).catch(()=>{})};
      void urlFor(s,frame,true).then(url=>{
        if(!isCurrent(s)||s.video!==video||!url)return;
        s.videoUrl=url;video.src=url;video.load();
      }).catch(error=>console.warn('TALERA gedempte vertelvideo niet bereikbaar',error));
      return;
    }
    const video=s.video;
    if(!video)return;
    if(s.audio?.paused||s.audio?.ended){if(!video.paused)video.pause();return}
    if(video.paused&&!video.ended&&!video.seeking)
      Promise.resolve(video.play()).catch(()=>{});
    // The voice remains the only clock. Correct large drift, not every frame.
    const target=((Number(cue.videoAtMs)||0)+Math.max(0,audioMs-cue.t))/1000;
    if(video.readyState>=2&&!video.seeking&&Number.isFinite(video.duration)&&
      Math.abs(video.currentTime-target)>0.75)
      try{video.currentTime=Math.min(Math.max(0,target),Math.max(0,video.duration-0.05))}
      catch(error){}
  }
  function drawCue(s,audioMs){
    if(!isCurrent(s)||s.phase!=='voice')return;
    let cue=s.plan.cues[0];
    for(const next of s.plan.cues){if(next.t<=audioMs+15)cue=next;else break}
    if(!cue)return;
    const frame=s.plan.frames[cue.index];
    if(!frame)return;
    if(s.currentId!==frame.key){
      s.currentId=frame.key;
      highlightNarratorDot(s,cue.index);
      if(frame.kind==='photo')displayPhoto(s,frame);
      else if(frame.kind==='video')syncSilentVideo(s,cue,frame,audioMs);
    }else if(frame.kind==='video')syncSilentVideo(s,cue,frame,audioMs);
  }
  function voiceTick(s){
    if(!isCurrent(s)||s.phase!=='voice'||!s.audio)return;
    const ms=Math.max(0,Math.round((Number(s.audio.currentTime)||0)*1000));
    drawCue(s,ms);
    s.voiceOrb?.playbackTick(s.audio,s.voiceDuration);
    if(s.video){
      if(s.audio.paused){if(!s.video.paused)s.video.pause()}
    }
  }
  // Original soundtrack uses the SAME already-authorized audio element as the
  // voice. iOS may refuse a new unmuted video element without another gesture.
  async function playOriginalVideo(s,frame,done){
    if(!isCurrent(s))return;
    removeVideo(s);clearButton(s);
    highlightNarratorDot(s,s.plan.frames.findIndex(x=>x.key===frame.key));
    s.photo.hidden=true;
    const video=document.createElement('video');
    video.className='talera-v61-inline-video talera-independent-original-video';
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    video.playsInline=true;video.preload='auto';video.controls=false;
    video.muted=true;video.defaultMuted=true;
    video.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none';
    s.layer.appendChild(video);
    s.video=video;s.videoId=frame.key;
    const serial=++s.videoSerial;
    const soundtrack=s.audio; // The original voice player, not a new element.
    if(!soundtrack){
      console.warn('TALERA oorspronkelijke vertel-audiospeler ontbreekt');
      return;
    }
    const current=()=>isCurrent(s)&&s.phase==='originals'&&
      s.video===video&&s.videoSerial===serial&&s.audio===soundtrack;
    function syncPicture(){
      if(!current()||video.readyState<1)return;
      const seconds=Math.max(0,Number(soundtrack.currentTime)||0);
      if(!video.seeking&&Math.abs((Number(video.currentTime)||0)-seconds)>0.3)
        try{video.currentTime=Math.min(seconds,
          Number.isFinite(video.duration)&&video.duration>0?
          Math.max(0,video.duration-0.04):seconds)}catch(error){}
      if(soundtrack.paused||soundtrack.ended){
        if(!video.paused)video.pause();
      }else if(video.paused&&!video.ended){
        Promise.resolve(video.play()).catch(error=>{
          if(current()&&error?.name!=='AbortError')
            console.warn('TALERA gedempt videobeeld kon niet starten',error);
        });
      }
    }
    function finished(){
      if(!current())return;
      soundtrack.onended=soundtrack.ontimeupdate=soundtrack.onplaying=null;
      try{soundtrack.pause()}catch(error){}
      done();
    }
    soundtrack.onplay=syncPicture;
    soundtrack.onpause=null;
    soundtrack.ontimeupdate=syncPicture;
    soundtrack.onplaying=syncPicture;
    soundtrack.onended=finished;
    video.onloadedmetadata=video.oncanplay=syncPicture;
    video.onended=()=>{if(current()&&soundtrack.ended)finished()};
    const url=await urlFor(s,frame,true);
    if(!current()||!url)return;
    s.videoUrl=url;video.src=url;video.load();
    // The SAME shared sound node plays original video soundtrack after voice.
    sharedAudible.claim(s,url);setAudible(soundtrack);
    // claim() resets old event handlers, so install original-video handlers after it.
    soundtrack.onplay=syncPicture;
    soundtrack.onpause=null;
    soundtrack.ontimeupdate=syncPicture;
    soundtrack.onplaying=syncPicture;
    soundtrack.onended=finished;
    // On supported iOS versions this continues automatically after voice.
    // Preserve the fallback if an iOS version still demands another gesture.
    attemptPlay(s,soundtrack);
  }
  function nextAfterVoice(s){
    if(!isCurrent(s))return;
    clearButton(s);
    s.voiceOrb?.playbackTick(s.audio,s.voiceDuration);
    if(s.timer){clearInterval(s.timer);s.timer=null}
    if(s.audio){
      s.audio.onplay=s.audio.onpause=s.audio.onended=null;
      s.audio.ontimeupdate=s.audio.onseeking=s.audio.onseeked=null;
      s.audio.onplaying=null;
      // Reuse the already-audible player for the later original videos.
    }
    removeVideo(s);
    s.phase='remaining';s.postIndex=0;
    function next(){
      if(!isCurrent(s))return;
      if(s.postIndex<s.plan.remainingPhotos.length){
        const frame=s.plan.remainingPhotos[s.postIndex++];
        highlightNarratorDot(s,s.plan.frames.findIndex(x=>x.key===frame.key));
        displayPhoto(s,frame);
        s.postTimer=setTimeout(next,4000);
        return;
      }
      s.phase='originals';let i=0;
      const replay=()=>{
        if(!isCurrent(s))return;
        if(i>=s.plan.videos.length){s.phase='complete';return}
        void playOriginalVideo(s,s.plan.videos[i++],replay);
      };
      replay();
    }
    next();
  }
  async function open(memory){
    if(!memory?._zeroItems?.some(item=>item.kind==='audio')){stop();return}
    if(active?.id===memory.id)return;
    stop();
    const plan=taleraIndependentNarrationPlan(memory);
    const voice=memory._zeroItems.find(item=>item.kind==='audio');
    const voiceOnly=!memory._zeroItems.some(item=>item.kind==='photo'||item.kind==='video')&&!plan.frames.length;
    const id=memory.id,run=++generation;
    // Render the SAME independent narrator INSIDE the already approved
    // photo stage so iPhone compositing cannot cover its reading sheet.
    const host=stage;
    const layer=document.createElement('div');
    layer.className='talera-independent-narrator-layer';
    layer.style.cssText='position:absolute;inset:0;overflow:hidden;z-index:3;pointer-events:none';
    const photo=document.createElement('img');
    photo.className='talera-independent-narrator-photo';
    photo.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none';
    layer.appendChild(photo);
    const oldPosition=host.style.position;
    const changePosition=getComputedStyle(host).position==='static';
    if(changePosition)host.style.position='relative';
    host.appendChild(layer);
    const s={id,generation:run,plan,layer,photo,host,
      hostPosition:oldPosition,hostPositionChanged:changePosition,
      phase:'loading',audio:null,voiceUrl:null,video:null,videoId:'',videoUrl:null,
      nativeAudioSession:null,voiceOrb:null,voiceDuration:Math.max(0,Number(memory._taleraNarrationDurationMs)||0)/1000,
      videoSerial:0,frameSerial:0,currentId:'',timer:null,postTimer:null,
      postIndex:0,button:null,createdUrls:new Set(),
      interruptedRetries:0,interruptedRetryTimer:null,
      swipePointer:null,swipeSuspended:false,swipeWasPlaying:false,
      visibilityChange:null,resumeOnVisible:false,tapTarget:null,onSoundTap:null,
      onSoundTouchStart:null,onSoundTouchEnd:null,soundTouch:null,retry:null};
    // iOS may preserve this exact PWA document when it goes to background.
    // Pause on hide, but resume only media that had been playing before hide.
    // A rejected Safari autoplay attempt uses the existing single-tap hint.
    s.visibilityChange=()=>{
      if(!isCurrent(s))return;
      if(document.hidden){
        s.resumeOnVisible=!!s.audio&&!s.audio.paused&&!s.audio.ended&&
          (s.phase==='voice'||s.phase==='originals');
        s.audio?.pause();s.video?.pause();
      }else if(s.resumeOnVisible){
        s.resumeOnVisible=false;
        if(s.audio&&!s.audio.ended&&!s.swipeSuspended&&
           (s.phase==='voice'||s.phase==='originals'))
          attemptPlay(s,s.audio);
      }
    };
    document.addEventListener('visibilitychange',s.visibilityChange);
    active=s;
    bindSwipeSuspension(s);
    s.tapTarget=document.getElementById('memoryStoryScroll');
    s.onSoundTap=event=>{
      if(!isCurrent(s)||!s.retry||s.swipeSuspended||
         event.target?.closest?.('a,button,[role=button],input,select,textarea'))return;
      event.preventDefault();event.stopImmediatePropagation();
      s.retry();
    };
    s.tapTarget?.addEventListener('click',s.onSoundTap,{capture:true});
    // iOS narrated gesture surfaces may cancel synthetic click events even
    // after an actual tap. touchend is a genuine Safari user activation.
    // Only a short, single-finger TAP may unlock; horizontal/vertical
    // swipes remain owned by the existing RH19 timeline and photo strip.
    s.onSoundTouchStart=e=>{
      if(!isCurrent(s)||!s.retry||e.touches?.length!==1)return;
      const t=e.touches[0];
      s.soundTouch={id:t.identifier,x:t.clientX,y:t.clientY};
    };
    s.onSoundTouchEnd=e=>{
      const start=s.soundTouch;s.soundTouch=null;
      if(!start||!isCurrent(s)||!s.retry||s.swipeSuspended||
         e.target?.closest?.('a,button,[role=button],input,select,textarea'))return;
      const t=Array.from(e.changedTouches||[]).find(t=>t.identifier===start.id);
      if(!t||Math.hypot(t.clientX-start.x,t.clientY-start.y)>12)return;
      if(e.cancelable)e.preventDefault();
      e.stopImmediatePropagation();
      s.retry(); // Same synchronous trusted Safari gesture.
    };
    s.tapTarget?.addEventListener('touchstart',s.onSoundTouchStart,{capture:true,passive:true});
    s.tapTarget?.addEventListener('touchend',s.onSoundTouchEnd,{capture:true,passive:false});
    document.body.classList.add('talera-v61-narration-visual');
    const blob=await store.blob(voice.key);
    if(!isCurrent(s))return;
    if(!(blob instanceof Blob)||!blob.size){
      console.warn('TALERA: oorspronkelijke stemopname ontbreekt',id);
      s.phase='missing';
      if(plan.frames.length)displayPhoto(s,plan.frames[0]);
      return;
    }
    if(voiceOnly){
      photo.hidden=true;
      try{
        s.voiceOrb=taleraMountVoiceOrb(layer);
        void s.voiceOrb.preparePlayback(blob);
      }catch(error){console.warn('TALERA voice visualization unavailable',error)}
    }
    s.voiceUrl=URL.createObjectURL(blob);
    const audio=sharedAudible.claim(s,s.voiceUrl);
    layer.appendChild(audio);s.audio=audio;
    prepareNativePlayback(s);
    setAudible(audio);
    s.phase='voice';
    audio.onplay=()=>{if(!isCurrent(s)||s.phase!=='voice')return;
      if(s.timer)clearInterval(s.timer);
      voiceTick(s);s.timer=setInterval(()=>voiceTick(s),90)};
    audio.onpause=()=>{if(s.timer){clearInterval(s.timer);s.timer=null}
      if(s.video&&!s.video.paused)s.video.pause();
      s.voiceOrb?.playbackTick(audio,s.voiceDuration)};
    audio.onended=()=>{voiceTick(s);nextAfterVoice(s)};
    audio.ontimeupdate=()=>voiceTick(s);
    audio.onseeking=()=>voiceTick(s);
    audio.onseeked=()=>voiceTick(s);
    drawCue(s,0);
    s.voiceOrb?.playbackTick(audio,s.voiceDuration);
    attemptPlay(s,audio);
  }
  return {open,stop,plan:taleraIndependentNarrationPlan};
}
