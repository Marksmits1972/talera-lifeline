// TALERA Free: visual-only voice surface, adapted from the existing organic V79 ORB.
// No audio output, media mutation, new recording, network or persisted amplitude.
function taleraMountVoiceOrb(host,{recording=false}={}){
  var TEX=224;
  var HEART_X=.57, HEART_Y=.47;
  /* TALERA warm accent #E7A98B */
  var HEART_R=231, HEART_G=169, HEART_B=139;

  function clamp(v,a,b){return v<a?a:(v>b?b:v)}
  function mix(a,b,t){return a+(b-a)*t}
  function smoothstep(a,b,x){var t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}
  function hash2(x,y,s){var n=x*127.1+y*311.7+s*74.7;var v=Math.sin(n)*43758.5453123;return v-Math.floor(v)}
  function fade(t){return t*t*(3-2*t)}
  function noise2(x,y,s){
    var x0=Math.floor(x),y0=Math.floor(y),tx=x-x0,ty=y-y0;
    var a=hash2(x0,y0,s),b=hash2(x0+1,y0,s),c=hash2(x0,y0+1,s),d=hash2(x0+1,y0+1,s);
    var ux=fade(tx),uy=fade(ty);
    return mix(mix(a,b,ux),mix(c,d,ux),uy);
  }
  function fbm(x,y,s){
    var v=0,a=.56,f=1,n=0;
    for(var i=0;i<4;i++){v+=noise2(x*f,y*f,s+i*23)*a;n+=a;f*=1.96;a*=.48}
    return v/n;
  }

  function makeLayer(seed,kind){
    var c=document.createElement('canvas');
    c.width=TEX;c.height=TEX;
    var xctx=c.getContext('2d',{alpha:true});
    var img=xctx.createImageData(TEX,TEX),d=img.data;

    for(var py=0;py<TEX;py++){
      var ny=py/(TEX-1);
      for(var px=0;px<TEX;px++){
        var nx=px/(TEX-1);
        var x=(nx-.5)*2.72,y=(ny-.5)*2.72;

        var qx=fbm(x*.62+1.7,y*.58-2.2,seed+3)-.5;
        var qy=fbm(x*.58-2.4,y*.66+1.4,seed+7)-.5;
        var wx=x+qx*.64+qy*.22,wy=y+qy*.60-qx*.20;

        var macro=fbm(wx*.70,wy*.66,seed+11);
        var mid=fbm(wx*1.42+2.2,wy*1.30-1.6,seed+31);
        var fine=fbm(wx*2.55-1.9,wy*2.28+2.1,seed+53);
        var mass=macro*.61+mid*.29+fine*.10;

        var hole=fbm(wx*.76+3.1,wy*.71-2.8,seed+71);
        var opening=smoothstep(.548,.716,hole);

        var ridgeN=fbm(wx*2.28-2.0,wy*2.06+1.7,seed+89);
        var ridge=1-Math.abs(ridgeN*2-1);
        var filament=smoothstep(.770,.942,ridge);

        var threshold=kind===0?.487:(kind===1?.507:.532);
        var body=smoothstep(threshold-.050,threshold+.118,mass);
        var soft=smoothstep(threshold-.114,threshold+.010,mass)*(1-body*.50);
        var dense=smoothstep(threshold+.025,threshold+.155,mass);

        var alphaBase=kind===0?.64:(kind===1?.74:.50);
        var alpha=(body*.70+soft*.21+filament*(kind===2?.28:.07))*alphaBase;
        alpha*=1-opening*.90;
        alpha*=.80+dense*.20;
        if(alpha<.020)alpha=0;

        var field=macro*.60+mid*.40;
        var midGate=smoothstep(.470,.500,field);
        var lightGate=smoothstep(.555,.585,field);

        var deepR=kind===0?8:(kind===1?14:20);
        var deepG=kind===0?42:(kind===1?58:70);
        var deepB=kind===0?104:(kind===1?126:148);
        var midR=kind===0?38:(kind===1?52:64);
        var midG=kind===0?112:(kind===1?136:150);
        var midB=kind===0?198:(kind===1?214:226);
        var iceR=kind===0?150:(kind===1?170:188);
        var iceG=kind===0?207:(kind===1?222:234);
        var iceB=kind===0?244:(kind===1?250:253);

        var R=mix(deepR,midR,midGate),G=mix(deepG,midG,midGate),B=mix(deepB,midB,midGate);
        R=mix(R,iceR,lightGate);G=mix(G,iceG,lightGate);B=mix(B,iceB,lightGate);

        var depth=fbm(wx*1.02+1.8,wy*.95-2.3,seed+107);
        var shadow=smoothstep(.44,.66,depth)*(body*.74+soft*.18);
        R=mix(R,6,shadow*.62);G=mix(G,28,shadow*.62);B=mix(B,72,shadow*.62);

        var glint=smoothstep(.65,.84,macro)*(1-shadow)*.10;
        R=mix(R,214,glint);G=mix(G,239,glint);B=mix(B,252,glint);

        /* V79: subtle 8% contrast lift around the existing palette midpoint.
           Geometry, alpha, motion and edge treatment remain unchanged from v78. */
        var contrast=1.08;
        R=clamp((R-128)*contrast+128,0,255);
        G=clamp((G-128)*contrast+128,0,255);
        B=clamp((B-128)*contrast+128,0,255);

        var i=(py*TEX+px)*4;
        d[i]=R;d[i+1]=G;d[i+2]=B;d[i+3]=Math.round(clamp(alpha,0,.88)*255);
      }
    }
    xctx.putImageData(img,0,0);
    return c;
  }

  function drawHeartGlow(ctx,x,y,radius,alpha){
    var g=ctx.createRadialGradient(x,y,0,x,y,radius);
    g.addColorStop(0,'rgba('+HEART_R+','+HEART_G+','+HEART_B+','+alpha+')');
    g.addColorStop(.38,'rgba('+HEART_R+','+HEART_G+','+HEART_B+','+(alpha*.72)+')');
    g.addColorStop(.72,'rgba('+HEART_R+','+HEART_G+','+HEART_B+','+(alpha*.24)+')');
    g.addColorStop(1,'rgba('+HEART_R+','+HEART_G+','+HEART_B+',0)');
    ctx.fillStyle=g;
    ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
  }

  const root=document.createElement('div');
  root.className='talera-voice-orb';
  root.style.cssText='position:absolute;inset:0;z-index:2;display:grid;place-items:center;background:#fbfaf7;pointer-events:none;overflow:hidden';
  const core=document.createElement('div');
  core.style.cssText='width:min(56%,220px,36vh);aspect-ratio:1;position:relative;border-radius:50%;box-shadow:0 10px 32px rgba(16,48,88,.055),0 0 30px rgba(54,132,196,.18),0 0 78px rgba(54,132,196,.075)';
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=TEX;
  canvas.style.cssText='display:block;width:100%;height:100%;border-radius:50%';
  canvas.setAttribute('aria-hidden','true');
  core.appendChild(canvas);root.appendChild(core);
  const timing=document.createElement('div');
  timing.style.cssText='position:absolute;bottom:9%;left:50%;transform:translateX(-50%);width:min(65%,220px);font:500 13px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;color:#35516b;text-align:center;font-variant-numeric:tabular-nums';
  const time=document.createElement('span');
  time.textContent=recording?'00:00':'00:00 / —';
  const guide=document.createElement('span');
  guide.style.cssText='display:block;font-size:11px;opacity:.75;margin-top:5px';
  const progress=document.createElement('progress');
  progress.max=1;progress.value=0;
  progress.style.cssText='display:block;width:100%;height:4px;accent-color:#325f91;margin-bottom:7px';
  progress.setAttribute('aria-hidden','true');
  const setGuide=()=>{try{window.TaleraI18n?.setText(guide,'core.tell.voiceOrbGuide')}catch(_){}};
  function mode(isRecording){
    recording=isRecording;progress.style.display=isRecording?'none':'block';guide.style.display=isRecording?'block':'none';time.hidden=isRecording;
    if(isRecording)setGuide();
  }
  // Inline display is required because native progress styles may override hidden.
  timing.append(progress,time,guide);root.appendChild(timing);host.appendChild(root);
  mode(recording);
  let ctx=null,layers=null;
  try{ctx=canvas.getContext('2d',{alpha:true});if(ctx)layers=[makeLayer(31,0),makeLayer(113,1),makeLayer(227,2)]}catch(_){}
  if(!layers)core.style.background='radial-gradient(circle at 54% 46%,#e7a98b 0%,#a1cde9 17%,#347dd1 47%,#103c82 78%,#8bc2e9 100%)';
  let disposed=false,energy=0,flowClock=0,last=0,hasDrawn=false;
  let microphone=null,source=null,analyser=null,sample=null,raf=0,decodeGeneration=0,levels=null,playbackBlob=null;
  function drawLayer(tex,cx,cy,size,rot,alpha,sx,sy){
    ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);ctx.scale(sx,sy);ctx.globalAlpha=alpha;
    ctx.drawImage(tex,-size/2,-size/2,size,size);ctx.restore();
  }
  function paint(raw,now=performance.now(),quiet=false){
    if(disposed)return;
    const target=quiet?0:clamp(Math.pow(Math.max(0,raw-.009),.72)*1.7,0,.82);
    const dt=last?Math.min(.12,Math.max(.015,(now-last)/1000)):.05;last=now;
    energy=quiet?0:energy+(target-energy)*Math.min(1,dt*(target>energy?12:5));
    if(energy<.003)energy=0;
    if(hasDrawn&&energy===0&&root.dataset.level==='0.000')return;
    root.dataset.level=energy.toFixed(3);
    flowClock+=dt*energy*3;
    core.style.transform='scale('+(1+energy*.18).toFixed(3)+')';
    if(!ctx||!layers)return;
    hasDrawn=true;
    const [back,front,filaments]=layers;
    const w=canvas.width,h=canvas.height,r=Math.min(w,h)*.495;
    const cx=w/2,cy=h/2,hx=w*HEART_X,hy=h*HEART_Y;
    const heartBreath=.5+.5*Math.sin(flowClock*2);
    const heartLevel=.44+heartBreath*.56,hs=.88+heartBreath*.20,baseAlpha=.11+heartLevel*.11;
    ctx.clearRect(0,0,w,h);ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
    drawHeartGlow(ctx,hx-r*.018*hs,hy+r*.008*hs,r*.28*hs,baseAlpha*.68);
    drawHeartGlow(ctx,hx-r*.045*hs,hy-r*.026*hs,r*.155*hs,baseAlpha*1.15);
    drawHeartGlow(ctx,hx+r*.038*hs,hy-r*.036*hs,r*.175*hs,baseAlpha*1.08);
    drawHeartGlow(ctx,hx+r*.012*hs,hy+r*.050*hs,r*.145*hs,baseAlpha*.95);
    drawHeartGlow(ctx,hx-r*.055*hs,hy+r*.052*hs,r*.118*hs,baseAlpha*.72);
    const amp=1+energy*.7623,s=r*2.49;
    const breathe1=.94+Math.sin(flowClock*.48)*(.046+energy*.01694);
    const breathe2=.97+Math.sin(flowClock*.61+1.8)*(.041+energy*.01936);
    drawLayer(back,cx+Math.sin(flowClock*.57)*r*.145*amp,cy+Math.cos(flowClock*.47)*r*.122*amp,s*1.08,Math.sin(flowClock*.31)*(.15+energy*.09075),1,breathe1,1.04/breathe1);
    drawLayer(front,cx+Math.sin(flowClock*.84+2.1)*r*.185*amp,cy+Math.cos(flowClock*.68+1.2)*r*.158*amp,s*.99,-.10+Math.sin(flowClock*.42+1.2)*(.20+energy*.11132),1,breathe2,1.035/breathe2);
    drawLayer(filaments,cx+Math.sin(flowClock*.73+3.7)*r*.148*amp,cy+Math.cos(flowClock*.88+2.5)*r*.140*amp,s*1.02,.13+Math.sin(flowClock*.53+3.1)*(.23+energy*.11132),.82,1.02,.98);
    ctx.restore();ctx.beginPath();ctx.arc(cx,cy,r-1.5,0,Math.PI*2);
    ctx.strokeStyle='rgba(132,190,232,.46)';ctx.lineWidth=1.5;ctx.stroke();
  }
  function clock(seconds){
    const n=Math.max(0,Math.floor(Number(seconds)||0));
    return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  }
  function recordClock(seconds){time.textContent=clock(seconds)}
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
    time.textContent=clock(at)+' / '+(duration?clock(duration):'—');
    progress.value=duration?Math.min(1,at/duration):0;
    const quiet=audio.paused||audio.ended||audio.seeking||audio.readyState<2||document.hidden;
    const raw=levels?.amplitude[Math.floor(at*(levels?.rate||20))]||0;
    paint(quiet?0:raw,performance.now(),quiet);
  }
  function destroy(){
    if(disposed)return;stopMic();disposed=true;decodeGeneration++;levels=null;playbackBlob=null;root.remove();
  }
  // Visual failure must never interrupt an existing audio or save operation.
  const safe=fn=>(...args)=>{try{return fn(...args)}catch(_){}};
  safe(paint)(0);
  return {prepareMic:safe(prepareMic),startMic:safe(startMic),stopMic:safe(stopMic),
    preparePlayback:async blob=>{try{await preparePlayback(blob)}catch(_){}},
    playbackTick:safe(playbackTick),destroy:safe(destroy)};
}
