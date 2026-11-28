// TALERA Free: owner-approved visual-only blue voice symbol (28-11-2026).
// Same recorder, local signal analysis and independent narrator. No new audio, storage or network.
function taleraMountVoiceOrb(host,{recording=false}={}){
  function clamp(v,a,b){return v<a?a:(v>b?b:v)}
  const root=document.createElement('div');
  root.className='talera-voice-orb';
  root.style.cssText='position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,#101f35,#14283e);pointer-events:none;overflow:hidden';
  const visual=document.createElement('div');
  visual.className='talera-voice-orb-visual';
  visual.style.cssText='position:absolute;left:0;right:0;top:12%;bottom:22%;display:grid;place-items:center';
  visual.setAttribute('aria-hidden','true');
  const symbol=document.createElement('div');
  symbol.className='talera-voice-orb-symbol';
  symbol.style.cssText='position:relative;width:min(82%,320px,100vh,var(--talera-orb-height,65vh));aspect-ratio:1;display:grid;place-items:center';
  const rings=[];
  for(const [size,alpha] of [[94,.18],[79,.28],[64,.44]]){
    const ring=document.createElement('div');
    ring.className='talera-voice-orb-ring';
    ring.style.cssText='position:absolute;width:'+size+'%;height:'+size+'%;top:50%;left:50%;transform:translate(-50%,-50%);border:1.5px solid #6298cc;border-radius:50%;box-sizing:border-box;opacity:'+alpha;
    rings.push({node:ring,alpha});symbol.appendChild(ring);
  }
  const core=document.createElement('div');
  core.className='talera-voice-orb-core';
  core.style.cssText='position:relative;width:55%;aspect-ratio:1;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle at 48% 44%,#73c9f0 0%,#367eb5 48%,#18375e 100%);box-shadow:0 0 18px rgba(74,150,209,.14)';
  const wave=document.createElement('div');
  wave.className='talera-voice-orb-wave';
  wave.style.cssText='width:72%;height:52%;display:flex;align-items:center;justify-content:space-between';
  const profile=[.21,.42,.75,.44,1,.65,.31,.71,.46,.21];
  const bars=profile.map((height,index)=>{
    const bar=document.createElement('span');bar.className='talera-voice-orb-bar';
    bar.style.cssText='display:block;width:5.6%;height:'+(height*74)+'%;background:#f7fcff;border-radius:999px;transform-origin:center;box-shadow:0 0 5px rgba(247,252,255,.28)';
    wave.appendChild(bar);return bar;
  });
  core.appendChild(wave);symbol.appendChild(core);visual.appendChild(symbol);root.appendChild(visual);
  const timing=document.createElement('div');
  timing.className='talera-voice-orb-timing';
  timing.style.cssText='position:absolute;bottom:16%;left:50%;transform:translateX(-50%);width:min(calc(100% - 48px),540px);font:500 13px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;color:#dbe7f4;text-align:center;font-variant-numeric:tabular-nums';
  const time=document.createElement('div');
  time.className='talera-voice-orb-times';
  time.style.cssText='display:flex;justify-content:space-between;gap:8px';
  const elapsed=document.createElement('span');elapsed.textContent='00:00';
  const total=document.createElement('span');total.textContent='—';
  time.append(elapsed,total);
  const guide=document.createElement('span');
  guide.style.cssText='display:block;font-size:11px;color:#adbed2';
  const progress=document.createElement('progress');
  progress.max=1;progress.value=0;
  progress.className='talera-voice-orb-progress';
  progress.style.cssText='display:block;width:100%;height:4px;appearance:none;-webkit-appearance:none;accent-color:#72b9e8;border:0;border-radius:999px;overflow:hidden;background:#3c506a;margin:0 0 7px';
  progress.setAttribute('aria-hidden','true');
  const progressStyle=document.createElement('style');
  progressStyle.textContent='.talera-voice-orb-progress::-webkit-progress-bar{background:#3c506a;border-radius:999px}.talera-voice-orb-progress::-webkit-progress-value{background:linear-gradient(90deg,#357eb9,#89cdef);border-radius:999px}.talera-voice-orb-progress::-moz-progress-bar{background:linear-gradient(90deg,#357eb9,#89cdef);border-radius:999px}';
  timing.append(progress,time,guide);root.appendChild(timing);root.appendChild(progressStyle);host.appendChild(root);
  const setGuide=()=>{try{window.TaleraI18n?.setText(guide,'core.tell.voiceOrbGuide')}catch(_){}};
  const editor=host.id==='frame';
  // The actual floating controls own their geometry. Reserve their entire top edge,
  // not a hard-coded percentage or just the right-hand share button.
  let layoutObserver=null,layoutMutation=null,layoutFrame=0,lastLayout=-Infinity;
  let watched=[];
  function controls(){
    if(!document.getElementById)return [];
    const result=[document.getElementById(editor?'taleraV61RecControls':'talera-clean-social')];
    if(!editor)result.push(document.getElementById('memoryCaption'));
    return result.filter(Boolean);
  }
  function layout(){
    if(disposed||!root.getBoundingClientRect)return;
    const area=root.getBoundingClientRect();
    if(!area.width||!area.height)return;
    let edge=area.bottom;
    const nodes=controls();
    if(nodes.length!==watched.length||nodes.some((n,i)=>n!==watched[i])){
      for(const node of watched)layoutObserver?.unobserve(node);
      watched=nodes;for(const node of watched)layoutObserver?.observe(node);
      if(layoutMutation){layoutMutation.disconnect();layoutMutation.observe(document.body,{childList:true,subtree:true});
        for(const node of watched)layoutMutation.observe(node,{attributes:true,attributeFilter:['class','style','hidden']});}
    }
    for(const node of nodes){
      const rect=node.getBoundingClientRect();
      if(rect.width<=0||rect.height<=0||rect.right<=area.left||rect.left>=area.right||rect.bottom<=area.top||rect.top>=area.bottom)continue;
      const css=window.getComputedStyle?.(node);
      if(css&&(css.display==='none'||css.visibility==='hidden'))continue;
      // A fully-open reading sheet belongs to the existing text UI; do not move or cover it.
      if(node.id==='memoryCaption'&&rect.top<=area.top+Math.min(150,area.height*.24))continue;
      edge=Math.min(edge,rect.top);
    }
    const bottom=Math.max(16,area.bottom-edge+16);
    const top=Math.min(108,Math.max(12,area.height*.14));
    timing.style.bottom=bottom+'px';
    visual.style.top=top+'px';
    const reserve=Math.ceil(timing.getBoundingClientRect().height||32)+16;
    visual.style.bottom=(bottom+reserve)+'px';
    const height=Math.max(0,area.height-top-bottom-reserve);
    symbol.style.setProperty('--talera-orb-height',height+'px');
  }
  function queueLayout(){
    if(disposed||layoutFrame)return;
    layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;layout()});
  }
  function mode(isRecording){
    recording=isRecording;progress.style.display=isRecording?'none':'block';guide.style.display=isRecording?'block':'none';
    time.hidden=isRecording;time.style.display=isRecording?'none':'flex';
    if(isRecording)setGuide();layout();
  }
  let disposed=false,energy=0,flowClock=0,last=0,hasDrawn=false;
  let microphone=null,source=null,analyser=null,sample=null,raf=0,decodeGeneration=0,levels=null,playbackBlob=null;
  function paint(raw,now=performance.now(),quiet=false){
    if(disposed)return;
    if(now-lastLayout>=250||now<lastLayout){lastLayout=now;layout()}
    const target=quiet?0:clamp(Math.pow(Math.max(0,raw-.009),.72)*1.7,0,.82);
    const dt=last?Math.min(.12,Math.max(.015,(now-last)/1000)):.05;last=now;
    energy=quiet?0:energy+(target-energy)*Math.min(1,dt*(target>energy?12:5));
    if(energy<.003)energy=0;
    if(hasDrawn&&energy===0&&root.dataset.level==='0.000')return;
    root.dataset.level=energy.toFixed(3);hasDrawn=true;
    flowClock+=dt*energy*6;
    core.style.transform='scale('+(1+energy*.045).toFixed(3)+')';
    rings.forEach(({node,alpha},i)=>{
      node.style.opacity=(alpha+energy*(.065+i*.025)).toFixed(3);
      node.style.transform='translate(-50%,-50%) scale('+(1+energy*(.045+i*.016)).toFixed(3)+')';
    });
    bars.forEach((bar,i)=>{
      const movement=.76+energy*(.27+.25*Math.sin(flowClock*1.8+i*1.37));
      bar.style.height=(profile[i]*100*movement).toFixed(2)+'%';
    });
  }
  // Observe local control layout only while this voice-only surface exists.
  // No independent timer, renderer or audio player is created.
  if(root.getBoundingClientRect){
    if(typeof ResizeObserver==='function'){layoutObserver=new ResizeObserver(queueLayout);layoutObserver.observe(root)}
    if(typeof MutationObserver==='function'){
      layoutMutation=new MutationObserver(records=>{
        if(records.some(r=>watched.includes(r.target))||controls().some((n,i)=>n!==watched[i])||controls().length!==watched.length)queueLayout();
      });
      layoutMutation.observe(document.body,{childList:true,subtree:true});
    }
    window.addEventListener?.('resize',queueLayout);
    window.visualViewport?.addEventListener('resize',queueLayout);
    document.addEventListener?.('scroll',queueLayout,true);
    document.addEventListener?.('transitionend',queueLayout,true);
  }
  mode(recording);
  function clock(seconds){
    const n=Math.max(0,Math.floor(Number(seconds)||0));
    return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  }
  function recordClock(seconds){elapsed.textContent=clock(seconds)}
  function stopMic(){
    if(raf)cancelAnimationFrame(raf);raf=0;
    try{source?.disconnect()}catch(_){}
    try{analyser?.disconnect()}catch(_){}
    source=null;analyser=null;sample=null;
    const old=microphone;microphone=null;
    if(old)try{void old.close().catch(()=>{})}catch(_){}
    paint(0,performance.now(),true);
  }
  function prepareMic(){
    stopMic();mode(true);recordClock(0);levels=null;playbackBlob=null;decodeGeneration++;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)return;
      microphone=new Audio();
      void microphone.resume().catch(()=>{});
    }catch(_){}
  }
  function startMic(stream,recorder){
    if(disposed||!microphone)return;
    try{
      source=microphone.createMediaStreamSource(stream);
      analyser=microphone.createAnalyser();analyser.fftSize=1024;
      sample=new Float32Array(analyser.fftSize);source.connect(analyser);
      // Never connect the microphone to an audible destination.
      let lastDraw=0;
      const tick=now=>{
        if(disposed||!analyser||recorder.state==='inactive')return;
        raf=requestAnimationFrame(tick);
        if(now-lastDraw<45)return;lastDraw=now;
        if(recorder.state!=='recording'||document.hidden){paint(0,now,true);return}
        try{
          analyser.getFloatTimeDomainData(sample);
          let sum=0;for(const v of sample)sum+=v*v;
          paint(Math.sqrt(sum/sample.length),now);
        }catch(_){stopMic()}
      };
      raf=requestAnimationFrame(tick);
    }catch(_){stopMic()}
  }
  // Decode only the original local audio in an offline, non-playing context.
  // Analyse in RAM at 8 kHz (roughly 20 samples of amplitude/sec); retain
  // no PCM, no saved waveform and never route/claim the existing audio player.
  async function preparePlayback(blob){
    stopMic();mode(false);
    if(blob&&blob===playbackBlob)return;
    levels=null;playbackBlob=blob;
    const generation=++decodeGeneration;
    try{
      const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
      if(!Offline||!(blob instanceof Blob)||!blob.size)return;
      const context=new Offline(1,1,8000);
      const decoded=await context.decodeAudioData(await blob.arrayBuffer());
      if(disposed||generation!==decodeGeneration)return;
      const stride=Math.max(1,Math.round(decoded.sampleRate/20));
      const amplitude=new Float32Array(Math.ceil(decoded.length/stride));
      for(let channel=0;channel<decoded.numberOfChannels;channel++){
        const data=decoded.getChannelData(channel);
        for(let i=0;i<amplitude.length;i++){
          let sum=0,count=0;
          for(let j=i*stride;j<Math.min((i+1)*stride,data.length);j++){sum+=data[j]*data[j];count++}
          amplitude[i]=Math.max(amplitude[i],Math.sqrt(sum/Math.max(1,count)));
        }
      }
      levels={amplitude,rate:decoded.sampleRate/stride,duration:decoded.duration};
    }catch(_){/* Audio playback is independent. Unsupported analysis stays quiet. */}
  }
  function playbackTick(audio,fallbackDuration=0){
    if(disposed||!audio)return;
    const duration=Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:levels?.duration||fallbackDuration;
    const at=Math.max(0,Number(audio.currentTime)||0);
    elapsed.textContent=clock(at);total.textContent=duration?clock(duration):'—';
    progress.value=duration?Math.min(1,at/duration):0;
    const quiet=audio.paused||audio.ended||audio.seeking||audio.readyState<2||document.hidden;
    const raw=levels?.amplitude[Math.floor(at*(levels?.rate||20))]||0;
    paint(quiet?0:raw,performance.now(),quiet);
  }
  function destroy(){
    if(disposed)return;stopMic();disposed=true;decodeGeneration++;levels=null;playbackBlob=null;
    if(layoutFrame)cancelAnimationFrame(layoutFrame);layoutFrame=0;
    layoutObserver?.disconnect();layoutMutation?.disconnect();watched=[];
    window.removeEventListener?.('resize',queueLayout);
    window.visualViewport?.removeEventListener('resize',queueLayout);
    document.removeEventListener?.('scroll',queueLayout,true);
    document.removeEventListener?.('transitionend',queueLayout,true);
    root.remove();
  }
  // Visual failure must never interrupt an existing audio or save operation.
  const safe=fn=>(...args)=>{try{return fn(...args)}catch(_){}};
  safe(paint)(0);
  return {prepareMic:safe(prepareMic),startMic:safe(startMic),stopMic:safe(stopMic),
    preparePlayback:async blob=>{try{await preparePlayback(blob)}catch(_){}},
    playbackTick:safe(playbackTick),destroy:safe(destroy)};
}
