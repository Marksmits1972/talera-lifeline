export const intentResponseStyle = String.raw`
/* TALERA — intent-responsive presentation layer.
   Wide life scan = lighter/smaller timeline + softer photo blending.
   Close inspection = taller/clearer timeline + more direct photo response. */
:root{
  --talera-intent-progress:0;
  --talera-timeline-height:118px;
  --talera-timeline-rest-opacity:.20;
  --talera-timeline-glass-opacity:.58;
  --talera-needle-height:46px;
  --talera-focus-scale:.92;
  --talera-focus-font-size:10px;
  --talera-photo-blend:220ms;
}
.timeline{
  height:var(--talera-timeline-height)!important;
  min-height:var(--talera-timeline-height)!important;
  transition:height .22s cubic-bezier(.22,.61,.36,1)!important;
}
.timeline::before{opacity:var(--talera-timeline-glass-opacity)!important;transition:opacity .22s ease!important}
.timeline:not(.is-active) canvas{opacity:var(--talera-timeline-rest-opacity)!important}
.timeline .center-needle{
  height:var(--talera-needle-height)!important;
  min-height:0!important;
  max-height:none!important;
  top:calc(50% - (var(--talera-needle-height) / 2))!important;
}
.timeline .focus{
  font-size:var(--talera-focus-font-size)!important;
  transform:translateZ(0) scale(var(--talera-focus-scale))!important;
}
.timeline.is-active .focus{transform:translateZ(0) scale(calc(var(--talera-focus-scale) + .07))!important}
.photo-layer:not(.photo-book-page){
  transition:opacity var(--talera-photo-blend) cubic-bezier(.22,.61,.36,1)!important;
}
html.talera-timeline-moving .photo-layer:not(.photo-book-page){will-change:opacity!important}
@media (max-height:700px){
  .timeline{height:var(--talera-timeline-height)!important;min-height:var(--talera-timeline-height)!important}
}
`;

export const intentResponseScript = String.raw`
(()=>{
  const surface=document.getElementById('surface')||document.querySelector('.timeline');
  const root=document.documentElement;
  if(!surface||!root)return;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>t*t*(3-2*t);

  let visualZoom=0;
  let raf=0;
  let snapTimer=0;
  let restTimer=0;
  let pinchStartDist=0;
  let pinchStartZoom=0;
  const pts=new Map();

  function setMoving(on,delay=0){
    clearTimeout(restTimer);
    if(on){root.classList.add('talera-timeline-moving');return}
    restTimer=setTimeout(()=>root.classList.remove('talera-timeline-moving'),delay);
  }

  function apply(z){
    visualZoom=clamp(z,0,5);
    const raw=visualZoom/5;
    const p=smooth(raw);

    const height=lerp(118,188,p);
    const restOpacity=lerp(.20,.44,p);
    const glassOpacity=lerp(.58,.94,p);
    const needleHeight=lerp(46,96,p);
    const focusScale=lerp(.92,1.035,p);
    const focusFont=lerp(10,12,p);
    const photoBlend=lerp(220,105,p);

    root.style.setProperty('--talera-intent-progress',raw.toFixed(4));
    root.style.setProperty('--talera-timeline-height',height.toFixed(1)+'px');
    root.style.setProperty('--talera-timeline-rest-opacity',restOpacity.toFixed(3));
    root.style.setProperty('--talera-timeline-glass-opacity',glassOpacity.toFixed(3));
    root.style.setProperty('--talera-needle-height',needleHeight.toFixed(1)+'px');
    root.style.setProperty('--talera-focus-scale',focusScale.toFixed(3));
    root.style.setProperty('--talera-focus-font-size',focusFont.toFixed(2)+'px');
    root.style.setProperty('--talera-photo-blend',photoBlend.toFixed(0)+'ms');
    root.dataset.taleraZoom=visualZoom.toFixed(2);
  }

  function animateTo(target,duration=280){
    cancelAnimationFrame(raf);
    const from=visualZoom;
    const start=performance.now();
    const ease=t=>1-Math.pow(1-t,3);
    const frame=now=>{
      const t=clamp((now-start)/duration,0,1);
      apply(lerp(from,target,ease(t)));
      if(t<1)raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);
  }

  function scheduleSnap(){
    clearTimeout(snapTimer);
    snapTimer=setTimeout(()=>animateTo(Math.round(visualZoom),280),170);
  }

  apply(0);

  surface.addEventListener('pointerdown',e=>{
    if(e.target.closest&&e.target.closest('button'))return;
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    setMoving(true);
    if(pts.size===2){
      const p=[...pts.values()];
      pinchStartDist=Math.max(20,Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y));
      pinchStartZoom=visualZoom;
    }
  },{passive:true,capture:true});

  surface.addEventListener('pointermove',e=>{
    if(!pts.has(e.pointerId))return;
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size!==2)return;
    const p=[...pts.values()];
    const dist=Math.max(20,Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y));
    apply(clamp(pinchStartZoom+Math.log(dist/pinchStartDist)*1.8,0,5));
  },{passive:true,capture:true});

  const pointerEnd=e=>{
    pts.delete(e.pointerId);
    if(pts.size===0){scheduleSnap();setMoving(false,900)}
    else if(pts.size===1){
      /* A pinch ending in one remaining finger starts a fresh potential pinch baseline. */
      pinchStartZoom=visualZoom;
    }
  };
  surface.addEventListener('pointerup',pointerEnd,{passive:true,capture:true});
  surface.addEventListener('pointercancel',pointerEnd,{passive:true,capture:true});

  surface.addEventListener('wheel',e=>{
    setMoving(true);
    if(Math.abs(e.deltaX)<=Math.abs(e.deltaY)*.75){
      apply(clamp(visualZoom-e.deltaY*.004,0,5));
      scheduleSnap();
    }
    setMoving(false,900);
  },{passive:true,capture:true});
})();
`;
