export const timelinePhotoSelectionScript = String.raw`
(()=>{
  const timeline=document.querySelector('.timeline');
  if(!timeline)return;

  let raf=0;
  let releaseTimer=0;

  const settleNearest=()=>{
    const runtime=window.__taleraTimelineRuntime;
    if(!runtime||typeof runtime.settleNearestPhoto!=='function')return;
    runtime.settleNearestPhoto();
  };

  const schedule=()=>{
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(settleNearest);
  };

  /* Presentation-only follower: never owns the gesture, never changes centerMs,
     scale, speed or pointer capture. It only makes the nearest memory photo the
     single visible photo while the proven timeline motor moves underneath. */
  timeline.addEventListener('pointerdown',schedule,{passive:true});
  timeline.addEventListener('pointermove',schedule,{passive:true});

  const finish=()=>{
    clearTimeout(releaseTimer);
    schedule();
    /* Re-assert after the existing story settle window so no stale journey
       preview can survive a release when the nearest memory stayed the same. */
    releaseTimer=setTimeout(settleNearest,190);
  };

  window.addEventListener('pointerup',finish,{passive:true});
  window.addEventListener('pointercancel',finish,{passive:true});

  timeline.addEventListener('wheel',()=>{
    schedule();
    clearTimeout(releaseTimer);
    releaseTimer=setTimeout(settleNearest,180);
  },{passive:true});
})();
`;
