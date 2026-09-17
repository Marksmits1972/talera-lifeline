import { timelineAdaptiveContrastStyle, timelineAdaptiveContrastScript } from "./timeline-adaptive-contrast.js";

export const timelineVisualStateStyle = timelineAdaptiveContrastStyle + String.raw`
/* TALERA — single-owner visual state for the presentation timeline.
   This layer NEVER changes timeline geometry, date mapping, direct grip, scale
   selection, speed response or snapping. It only controls visual emphasis. */

.memory-space .date,#memoryDate{display:none!important}
.zoom-hint,#zoomHint{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}

/* REST: always visible, always secondary to the photo. */
.timeline canvas,
.timeline.is-active canvas{
  opacity:var(--timeline-rest-opacity,.46)!important;
  filter:var(--timeline-rest-filter,saturate(.82) contrast(.98) brightness(.90) drop-shadow(0 0 1px rgba(255,255,255,.88)) drop-shadow(0 1px 1px rgba(15,39,71,.20)))!important;
  transition:opacity .20s ease,filter .22s ease!important;
}

.timeline .center-needle,
.timeline.is-active .center-needle{
  opacity:.78!important;
  filter:drop-shadow(0 1px 3px rgba(255,255,255,.58)) drop-shadow(0 1px 2px rgba(15,39,71,.18))!important;
  transition:opacity .18s ease,filter .18s ease!important;
}

/* Date badge is never dimmed. Geometry is owned only by timeline-glass-layer. */
.timeline .focus,
.timeline.is-active .focus,
.timeline.is-timeline-engaged .focus,
.timeline.is-marker-afterglow .focus{
  opacity:1!important;
  color:var(--talera-deep)!important;
  background:rgba(255,254,252,.97)!important;
  border:1px solid rgba(91,143,185,.20)!important;
  box-shadow:0 5px 16px rgba(15,39,71,.18)!important;
  filter:none!important;
  transition:opacity .18s ease,filter .18s ease!important;
}

/* ACTIVE + short AFTERGLOW: navigation becomes unmistakably foreground. */
.timeline.is-timeline-engaged canvas,
.timeline.is-timeline-afterglow canvas{
  opacity:1!important;
  filter:saturate(1.28) contrast(1.52) brightness(1.18) drop-shadow(0 0 4px rgba(255,255,255,.72)) drop-shadow(0 2px 3px rgba(15,39,71,.32))!important;
}

.timeline.is-timeline-engaged .center-needle,
.timeline.is-marker-afterglow .center-needle{
  opacity:1!important;
  filter:brightness(1.22) drop-shadow(0 0 4px rgba(255,255,255,.98)) drop-shadow(0 2px 8px rgba(15,39,71,.46))!important;
}

@media (pointer:coarse){
  .timeline canvas,
  .timeline.is-active canvas{
    opacity:var(--timeline-rest-opacity,.46)!important;
    filter:var(--timeline-rest-filter,saturate(.82) contrast(.98) brightness(.90) drop-shadow(0 0 1px rgba(255,255,255,.90)) drop-shadow(0 1px 1px rgba(15,39,71,.20)))!important;
  }
  .timeline .center-needle,
  .timeline.is-active .center-needle{
    opacity:.76!important;
    filter:drop-shadow(0 1px 3px rgba(255,255,255,.62)) drop-shadow(0 1px 2px rgba(15,39,71,.20))!important;
  }

  .timeline.is-timeline-engaged canvas,
  .timeline.is-timeline-afterglow canvas{
    opacity:1!important;
    filter:saturate(1.32) contrast(1.60) brightness(1.22) drop-shadow(0 0 5px rgba(255,255,255,.82)) drop-shadow(0 2px 4px rgba(15,39,71,.36))!important;
  }
  .timeline.is-timeline-engaged .center-needle,
  .timeline.is-marker-afterglow .center-needle{
    opacity:1!important;
    filter:brightness(1.30) drop-shadow(0 0 5px rgba(255,255,255,1)) drop-shadow(0 2px 9px rgba(15,39,71,.50))!important;
  }
}
`;

export const timelineVisualStateScript = timelineAdaptiveContrastScript + String.raw`
(()=>{
  const timeline=document.querySelector('.timeline');
  if(!timeline)return;

  document.querySelectorAll('.zoom-hint,#zoomHint').forEach(node=>node.remove());

  const activePointers=new Set();
  let timelineTimer=0;
  let markerTimer=0;

  const clearTimers=()=>{
    clearTimeout(timelineTimer);
    clearTimeout(markerTimer);
    timelineTimer=0;
    markerTimer=0;
  };

  const enterEngaged=()=>{
    clearTimers();
    timeline.classList.remove('is-active');
    timeline.classList.add('is-timeline-engaged','is-timeline-afterglow','is-marker-afterglow');
  };

  const enterAfterglow=()=>{
    clearTimers();
    timeline.classList.remove('is-timeline-engaged','is-active');
    timeline.classList.add('is-timeline-afterglow','is-marker-afterglow');
    timelineTimer=setTimeout(()=>{
      timeline.classList.remove('is-timeline-afterglow','is-active');
    },3000);
    markerTimer=setTimeout(()=>{
      timeline.classList.remove('is-marker-afterglow','is-active');
    },8000);
  };

  const forceRest=()=>{
    activePointers.clear();
    clearTimers();
    timeline.classList.remove('is-active','is-timeline-engaged','is-timeline-afterglow','is-marker-afterglow');
  };

  timeline.classList.remove('is-active');
  timeline.addEventListener('pointerdown',e=>{
    activePointers.add(e.pointerId);
    enterEngaged();
  },{passive:true});

  const releasePointer=e=>{
    if(!activePointers.has(e.pointerId))return;
    activePointers.delete(e.pointerId);
    if(activePointers.size===0)enterAfterglow();
  };

  window.addEventListener('pointerup',releasePointer,{passive:true});
  window.addEventListener('pointercancel',releasePointer,{passive:true});

  timeline.addEventListener('wheel',e=>{
    if(!e.isTrusted)return;
    enterEngaged();
    enterAfterglow();
  },{passive:true});

  window.addEventListener('blur',()=>{
    if(activePointers.size)enterAfterglow();
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)forceRest();
  },{passive:true});
  window.addEventListener('pagehide',forceRest,{passive:true});
})();

/* Photo-carousel watchdog.
   The live-memory integration already owns the normal automatic carousel and the
   presentation controller owns finger-following swipes. This small watchdog only
   steps in when the automatic carousel has not moved for several seconds, so it
   never competes with a carousel that is already running. */
(()=>{
  const runtime=window.__taleraTimelineRuntime;
  const surface=document.getElementById('surface');
  const story=document.getElementById('memoryStoryScroll');
  if(!runtime||!surface)return;

  let lastMemoryId='';
  let lastIndex=-1;
  let lastMovement=Date.now();
  let interacting=false;
  const WATCH_MS=900;
  const STALE_MS=5200;

  function current(){return runtime.currentMemory&&runtime.currentMemory()}
  function usable(memory){return Boolean(memory&&memory._taleraLive&&Array.isArray(memory.photos)&&memory.photos.length>1)}
  function forceLayer(layer,src,opacity){
    if(!layer||!src)return;
    layer.style.opacity=String(opacity);
    [layer.querySelector('.photo-backdrop'),layer.querySelector('.photo-aligned-blur'),layer.querySelector('.example-photo')].forEach(node=>{if(node&&node.src!==src)node.src=src});
  }
  function updateDots(memory){
    const dots=Array.from(document.querySelectorAll('.talera-photo-dot'));
    dots.forEach((dot,index)=>dot.classList.toggle('active',index===(memory._photoIndex||0)));
  }
  function show(memory,index){
    if(!usable(memory))return;
    const count=memory.photos.length;
    memory._photoIndex=((index%count)+count)%count;
    memory.image=memory.photos[memory._photoIndex];
    try{runtime.settlePhoto(memory)}catch(e){}
    forceLayer(document.getElementById('photoLayerA'),memory.image,1);
    forceLayer(document.getElementById('photoLayerB'),memory.image,0);
    const strip=document.querySelector('.talera-photo-strip.is-visible');
    if(strip)strip.querySelectorAll('.talera-photo-strip-page').forEach(page=>forceLayer(page,memory.image,1));
    updateDots(memory);
    lastIndex=memory._photoIndex||0;
    lastMovement=Date.now();
  }
  function markInteraction(active){
    interacting=active;
    lastMovement=Date.now();
  }
  [surface,story].filter(Boolean).forEach(node=>{
    node.addEventListener('pointerdown',()=>markInteraction(true),{passive:true});
    node.addEventListener('pointerup',()=>markInteraction(false),{passive:true});
    node.addEventListener('pointercancel',()=>markInteraction(false),{passive:true});
  });
  document.addEventListener('visibilitychange',()=>{lastMovement=Date.now()},{passive:true});

  setInterval(()=>{
    const memory=current();
    if(!usable(memory)){lastMemoryId='';lastIndex=-1;lastMovement=Date.now();return}
    const index=Number(memory._photoIndex||0);
    if(memory.id!==lastMemoryId){lastMemoryId=memory.id;lastIndex=index;lastMovement=Date.now();return}
    if(index!==lastIndex){lastIndex=index;lastMovement=Date.now();updateDots(memory);return}
    if(interacting||document.hidden)return;
    if(Date.now()-lastMovement<STALE_MS)return;
    show(memory,index+1);
  },WATCH_MS);
})();
`;