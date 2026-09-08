export const interactionFixStyle = String.raw`
/* TALERA mobile interaction refinement — 2026-09-08
   - photo browsing must stay visually calm
   - timeline wake styling is shown on touch devices only after deliberate timeline intent
   - photo layers crossfade without position/scale lag */

.photo-layer{
  transform:none!important;
  transition:opacity .10s linear!important;
  will-change:opacity!important;
}
.photo-layer.is-front{transform:none!important}

@media (pointer:coarse){
  /* Existing .is-active may still be toggled by low-level touch events.
     On phones/tablets we ignore it visually until .touch-intent is present. */
  .timeline.is-active:not(.touch-intent) canvas{
    opacity:.26!important;
    filter:saturate(.55) contrast(.70) brightness(.86)!important;
  }
  .timeline.is-active:not(.touch-intent) .center-needle{
    opacity:.32!important;
    filter:none!important;
  }
  .timeline.is-active:not(.touch-intent) .focus{
    opacity:.36!important;
    transform:translateZ(0) scale(.97)!important;
    filter:none!important;
  }
  .timeline.is-active:not(.touch-intent)::after{opacity:.10!important}

  .timeline.is-active.touch-intent canvas{
    opacity:1!important;
    filter:saturate(1.22) contrast(1.42) brightness(1.20) drop-shadow(0 0 4px rgba(255,255,255,.62))!important;
  }
  .timeline.is-active.touch-intent .center-needle{
    opacity:1!important;
    filter:brightness(1.28) drop-shadow(0 0 4px rgba(255,255,255,1)) drop-shadow(0 2px 9px rgba(15,39,71,.48))!important;
  }
  .timeline.is-active.touch-intent .focus{
    opacity:1!important;
    transform:translateZ(0) scale(1.045)!important;
    filter:brightness(1.20) drop-shadow(0 0 5px rgba(255,255,255,.70)) drop-shadow(0 2px 12px rgba(15,39,71,.40))!important;
  }
  .timeline.is-active.touch-intent::after{opacity:1!important}
}
`;

export const interactionFixScript = String.raw`
(()=>{
  const timeline=document.querySelector('.timeline');
  const stage=document.getElementById('photoStage');
  const photos=Array.from(document.querySelectorAll('.example-photo'));
  const coarse=matchMedia('(pointer:coarse)').matches;

  /* On touch devices, only a deliberate gesture ON the visible timeline wakes it.
     Ordinary photo browsing may move time underneath, but does not light up the timeline. */
  if(timeline&&coarse){
    const pts=new Map();
    let restTimer=0;
    const sleep=()=>{
      clearTimeout(restTimer);
      restTimer=setTimeout(()=>timeline.classList.remove('touch-intent'),850);
    };
    timeline.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse')return;
      const r=timeline.getBoundingClientRect();
      pts.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,inBand:e.clientY>=r.top+r.height*.28&&e.clientY<=r.top+r.height*.90});
      if(pts.size>=2){
        timeline.classList.add('touch-intent');
        clearTimeout(restTimer);
      }
    },{passive:true,capture:true});
    timeline.addEventListener('pointermove',e=>{
      const p=pts.get(e.pointerId);if(!p)return;
      p.x=e.clientX;p.y=e.clientY;
      if(pts.size>=2){timeline.classList.add('touch-intent');clearTimeout(restTimer);return;}
      const dx=Math.abs(e.clientX-p.startX),dy=Math.abs(e.clientY-p.startY);
      if(p.inBand&&dx>8&&dx>dy*.85){
        timeline.classList.add('touch-intent');
        clearTimeout(restTimer);
      }
    },{passive:true,capture:true});
    const end=e=>{pts.delete(e.pointerId);if(pts.size===0)sleep()};
    timeline.addEventListener('pointerup',end,{passive:true,capture:true});
    timeline.addEventListener('pointercancel',end,{passive:true,capture:true});
  }

  /* The previous implementation changed src and opacity before the fitted geometry
     had been recalculated. On a phone that can produce one painted frame at the old
     geometry: the tiny 'shake' seen after a swipe. Refit synchronously on src mutation. */
  function fitNow(img){
    if(!img||!stage||!img.complete||!img.naturalWidth||!img.naturalHeight)return;
    const layer=img.closest('.photo-layer');
    const blur=layer&&layer.querySelector('.photo-aligned-blur');
    const r=stage.getBoundingClientRect(),boxW=r.width,boxH=r.height;
    if(!boxW||!boxH)return;
    const containScale=Math.min(boxW/img.naturalWidth,boxH/img.naturalHeight);
    const containW=img.naturalWidth*containScale,containH=img.naturalHeight*containScale;
    const targetH=Math.min(boxH,Math.max(containH,boxH*.68));
    const zoom=Math.min(1.82,Math.max(1,targetH/containH));
    const h=containH*zoom,w=containW*zoom,left=(boxW-w)/2,top=(boxH-h)/2;
    [img,blur].forEach(node=>{
      if(!node)return;
      node.style.inset='auto';
      node.style.width=w.toFixed(1)+'px';
      node.style.height=h.toFixed(1)+'px';
      node.style.left=left.toFixed(1)+'px';
      node.style.top=top.toFixed(1)+'px';
      node.style.transform='none';
    });
  }
  photos.forEach(img=>{
    new MutationObserver(()=>fitNow(img)).observe(img,{attributes:true,attributeFilter:['src']});
    img.addEventListener('load',()=>fitNow(img),{passive:true});
  });
})();
`;