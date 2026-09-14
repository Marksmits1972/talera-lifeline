export const timelinePhotoSelectionScript = String.raw`
(()=>{
  const timeline=document.querySelector('.timeline');
  const stage=document.getElementById('photoStage');
  const layerA=document.getElementById('photoLayerA');
  const layerB=document.getElementById('photoLayerB');
  if(!timeline||!stage||!layerA||!layerB)return;

  const activePointers=new Set();
  let releaseTimer=0;

  const runtime=()=>window.__taleraTimelineRuntime;
  const settleNearest=()=>{
    const r=runtime();
    if(!r||typeof r.settleNearestPhoto!=='function')return;
    r.settleNearestPhoto();
  };

  /* The legacy journey preview calculates a continuous A/B blend. For timeline
     navigation we now treat that value only as a nearest-photo decision: the
     layer with >=50% weight wins completely. The photo-book swipe overlay is a
     different system and is deliberately untouched. */
  const normalizeBasePair=()=>{
    const a=Number.parseFloat(layerA.style.opacity||getComputedStyle(layerA).opacity||'0');
    const b=Number.parseFloat(layerB.style.opacity||getComputedStyle(layerB).opacity||'0');
    if(!Number.isFinite(a)||!Number.isFinite(b))return;
    if((a>=.999&&b<=.001)||(b>=.999&&a<=.001))return;
    if(a<=.001&&b<=.001)return;

    const winner=a>=b?layerA:layerB;
    const loser=winner===layerA?layerB:layerA;
    winner.style.opacity='1';
    winner.style.transform='translate3d(0,0,0) scale(1)';
    loser.style.opacity='0';
  };

  const observer=new MutationObserver(normalizeBasePair);
  observer.observe(layerA,{attributes:true,attributeFilter:['style']});
  observer.observe(layerB,{attributes:true,attributeFilter:['style']});

  timeline.addEventListener('pointerdown',e=>{
    activePointers.add(e.pointerId);
    normalizeBasePair();
  },{passive:true});

  const finish=e=>{
    if(!activePointers.has(e.pointerId))return;
    activePointers.delete(e.pointerId);
    if(activePointers.size)return;
    clearTimeout(releaseTimer);
    /* Canonical settle: one photo, selected by the memory closest to the fixed
       date marker. Re-assert after the existing story switch window as well. */
    settleNearest();
    releaseTimer=setTimeout(settleNearest,190);
  };

  window.addEventListener('pointerup',finish,{passive:true});
  window.addEventListener('pointercancel',finish,{passive:true});

  timeline.addEventListener('wheel',()=>{
    normalizeBasePair();
    clearTimeout(releaseTimer);
    releaseTimer=setTimeout(settleNearest,180);
  },{passive:true});
})();
`;
