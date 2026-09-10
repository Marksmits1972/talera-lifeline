export const navigationIntentStyle = String.raw`
/* TALERA — continuous search-intent layer.
   Fast horizontal search = coarse time context.
   Slow precise search = progressively finer time context.
   The existing six timeline scales remain calm presentation steps. */
:root{
  --talera-search-intent:0;
  --talera-search-speed:0;
}
.timeline.talera-orienting canvas{
  opacity:.72!important;
  filter:saturate(.90) contrast(.96) brightness(.98)!important;
  transition:opacity .16s ease,filter .16s ease!important;
}
.timeline.talera-searching canvas{
  opacity:.86!important;
  transition:opacity .16s ease,filter .16s ease!important;
}
.timeline.talera-refining canvas{
  opacity:1!important;
  filter:saturate(1.06) contrast(1.10) brightness(1.04)!important;
  transition:opacity .18s ease,filter .18s ease!important;
}
`;

export const navigationIntentScript = String.raw`
(()=>{
  const surface=document.getElementById('surface')||document.querySelector('.timeline');
  const timeline=document.querySelector('.timeline');
  const root=document.documentElement;
  if(!surface||!timeline||!root)return;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>t*t*(3-2*t);

  /* Mirrors the existing continuous zoom coordinate (0..5).  It is kept in
     step with native pinch/wheel and with the synthetic intent corrections
     below, so the current timeline renderer remains the single time engine. */
  let engineZoom=parseFloat(root.dataset.taleraZoom||'0')||0;
  let pid=null;
  let startX=0,startY=0,lastX=0,lastY=0,lastT=0,startT=0;
  let mode=null;
  let speedEma=0;
  let intentEma=.5;
  let stableIntent=.5;
  let pendingIntent=.5;
  let pendingSince=0;
  let lastCorrection=0;
  let refineTimer=0;

  const INTENT_DWELL=115;       // label/scale direction must stay stable briefly
  const CORRECTION_INTERVAL=28; // cap zoom corrections to keep motion fluid
  const MAX_ZOOM_STEP=.105;     // no abrupt jumps between presentation levels

  function setState(name){
    timeline.classList.toggle('talera-orienting',name==='orienting');
    timeline.classList.toggle('talera-searching',name==='searching');
    timeline.classList.toggle('talera-refining',name==='refining');
  }

  function intentFromSpeed(speed,gesturePx,ageMs){
    /* px/ms thresholds are deliberately broad. Fast strokes collapse toward
       overview; slow, short corrections progressively invite detail. */
    let target;
    if(speed>=1.15) target=.03;
    else if(speed>=.72) target=.18;
    else if(speed>=.40) target=.38;
    else if(speed>=.22) target=.58;
    else if(speed>=.11) target=.76;
    else target=.92;

    /* A very young gesture should not immediately interpret landing jitter as
       precision. It earns fine intent only after a little time/distance. */
    if(ageMs<70&&gesturePx<18) target=Math.min(target,.58);
    if(gesturePx<42&&ageMs>140&&speed<.20) target=Math.max(target,.82);
    if(gesturePx<20&&ageMs>220&&speed<.10) target=Math.max(target,.94);
    return target;
  }

  function zoomFromIntent(intent){
    /* Nonlinear map gives much more usable room to year/month/week refinement
       while preserving a strong helicopter overview for fast travel. */
    const p=smooth(clamp(intent,0,1));
    return 5*p;
  }

  function dispatchZoomDelta(deltaZoom){
    if(Math.abs(deltaZoom)<.002)return;
    const step=clamp(deltaZoom,-MAX_ZOOM_STEP,MAX_ZOOM_STEP);
    engineZoom=clamp(engineZoom+step,0,5);

    /* Existing Worker wheel logic uses zoomPos -= deltaY * .004.  Feeding the
       same renderer a small synthetic vertical delta changes resolution without
       creating a second timeline or changing the fixed center-needle model. */
    const deltaY=-(step/.004);
    surface.dispatchEvent(new WheelEvent('wheel',{
      deltaX:0,deltaY,bubbles:false,cancelable:true
    }));
  }

  function updateStableIntent(raw,now){
    intentEma=lerp(intentEma,raw,.22);
    const band=Math.round(intentEma*10)/10;
    const pendingBand=Math.round(pendingIntent*10)/10;
    if(band!==pendingBand){
      pendingIntent=intentEma;
      pendingSince=now;
      return;
    }
    if(now-pendingSince>=INTENT_DWELL){
      stableIntent=lerp(stableIntent,intentEma,.34);
    }
  }

  function applyIntent(now,gesturePx,ageMs){
    updateStableIntent(intentFromSpeed(speedEma,gesturePx,ageMs),now);
    root.style.setProperty('--talera-search-intent',stableIntent.toFixed(3));
    root.style.setProperty('--talera-search-speed',speedEma.toFixed(3));

    if(stableIntent<.30)setState('orienting');
    else if(stableIntent<.72)setState('searching');
    else setState('refining');

    if(now-lastCorrection<CORRECTION_INTERVAL)return;
    lastCorrection=now;
    const targetZoom=zoomFromIntent(stableIntent);
    const gain=stableIntent>.72?.16:.12;
    dispatchZoomDelta((targetZoom-engineZoom)*gain);
  }

  function scheduleRestRefine(){
    clearTimeout(refineTimer);
    /* Rest itself is useful evidence, but not permission to teleport to day
       detail. We approach detail in two calm stages, so visible scale labels
       have time to settle and become readable. */
    refineTimer=setTimeout(()=>{
      if(pid!==null)return;
      stableIntent=Math.max(stableIntent,.78);
      setState('refining');
      dispatchZoomDelta((zoomFromIntent(stableIntent)-engineZoom)*.22);
      refineTimer=setTimeout(()=>{
        if(pid!==null)return;
        stableIntent=Math.max(stableIntent,.90);
        dispatchZoomDelta((zoomFromIntent(stableIntent)-engineZoom)*.20);
      },170);
    },135);
  }

  surface.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(e.target.closest&&e.target.closest('button'))return;
    /* Leave two-finger pinch entirely to the existing native zoom logic. */
    if(pid!==null)return;
    clearTimeout(refineTimer);
    pid=e.pointerId;
    startX=lastX=e.clientX;startY=lastY=e.clientY;
    startT=lastT=performance.now();
    mode=null;speedEma=0;
    pendingSince=startT;
  },{passive:true,capture:true});

  surface.addEventListener('pointermove',e=>{
    if(e.pointerId!==pid)return;
    const now=performance.now();
    const dxTotal=e.clientX-startX,dyTotal=e.clientY-startY;
    if(!mode&&(Math.abs(dxTotal)>7||Math.abs(dyTotal)>7)){
      mode=Math.abs(dxTotal)>Math.abs(dyTotal)*1.05?'horizontal':'other';
    }
    if(mode!=='horizontal')return;

    const dt=Math.max(8,now-lastT);
    const inst=Math.abs(e.clientX-lastX)/dt;
    speedEma=speedEma?lerp(speedEma,inst,.30):inst;
    lastX=e.clientX;lastY=e.clientY;lastT=now;
    const gesturePx=Math.abs(dxTotal);
    applyIntent(now,gesturePx,now-startT);
  },{passive:true,capture:true});

  function endPointer(e){
    if(e.pointerId!==pid)return;
    pid=null;mode=null;speedEma=0;
    scheduleRestRefine();
  }
  surface.addEventListener('pointerup',endPointer,{passive:true,capture:true});
  surface.addEventListener('pointercancel',endPointer,{passive:true,capture:true});

  /* Keep the mirror aligned when the user deliberately pinches or uses a
     trackpad/wheel. This does not replace native zoom; it only follows it. */
  const pts=new Map();
  let pinchDist=0,pinchZoom=engineZoom;
  surface.addEventListener('pointerdown',e=>{
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===2){
      const p=[...pts.values()];
      pinchDist=Math.max(20,Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y));
      pinchZoom=engineZoom;
      clearTimeout(refineTimer);
    }
  },{passive:true,capture:true});
  surface.addEventListener('pointermove',e=>{
    if(!pts.has(e.pointerId))return;
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size!==2)return;
    const p=[...pts.values()];
    const dist=Math.max(20,Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y));
    engineZoom=clamp(pinchZoom+Math.log(dist/pinchDist)*1.8,0,5);
  },{passive:true,capture:true});
  const drop=e=>pts.delete(e.pointerId);
  surface.addEventListener('pointerup',drop,{passive:true,capture:true});
  surface.addEventListener('pointercancel',drop,{passive:true,capture:true});

  surface.addEventListener('wheel',e=>{
    if(!e.isTrusted)return;
    if(Math.abs(e.deltaX)<=Math.abs(e.deltaY)*.75){
      engineZoom=clamp(engineZoom-e.deltaY*.004,0,5);
    }
  },{passive:true,capture:true});

  setState('searching');
})();
`;
