export const timelineVisualStateStyle = String.raw`
/* TALERA — single-owner visual state for the presentation timeline.
   This layer NEVER changes timeline geometry, date mapping, direct grip, scale
   selection, speed response or snapping. It only controls visual emphasis. */

.memory-space .date,#memoryDate{display:none!important}
.zoom-hint,#zoomHint{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}

/* REST is the canonical visual baseline, even if a legacy is-active class is present. */
.timeline canvas,
.timeline.is-active canvas{
  opacity:.30!important;
  filter:saturate(.64) contrast(.76) brightness(.90)!important;
  transition:opacity .18s ease,filter .18s ease!important;
}
.timeline .center-needle,
.timeline.is-active .center-needle{
  opacity:.34!important;
  filter:none!important;
  transition:opacity .18s ease,filter .18s ease!important;
}
.timeline .focus,
.timeline.is-active .focus{
  opacity:.40!important;
  transform:translateZ(0) scale(.97)!important;
  filter:none!important;
  transition:opacity .18s ease,transform .18s ease,filter .18s ease!important;
}

/* ENGAGED and the short timeline afterglow share the same clear ruler treatment. */
.timeline.is-timeline-engaged canvas,
.timeline.is-timeline-afterglow canvas{
  opacity:1!important;
  filter:saturate(1.18) contrast(1.34) brightness(1.12) drop-shadow(0 0 3px rgba(255,255,255,.42))!important;
}

/* The marker/date can remain visible longer than the ruler. */
.timeline.is-timeline-engaged .center-needle,
.timeline.is-marker-afterglow .center-needle{
  opacity:1!important;
  filter:brightness(1.18) drop-shadow(0 0 3px rgba(255,255,255,.92)) drop-shadow(0 2px 8px rgba(15,39,71,.42))!important;
}
.timeline.is-timeline-engaged .focus,
.timeline.is-marker-afterglow .focus{
  opacity:1!important;
  transform:translateZ(0) scale(1.035)!important;
  filter:brightness(1.12) drop-shadow(0 0 4px rgba(255,255,255,.55)) drop-shadow(0 2px 11px rgba(15,39,71,.34))!important;
}

@media (pointer:coarse){
  .timeline canvas,
  .timeline.is-active canvas{
    opacity:.24!important;
    filter:saturate(.58) contrast(.72) brightness(.88)!important;
  }
  .timeline .center-needle,
  .timeline.is-active .center-needle{opacity:.30!important;filter:none!important}
  .timeline .focus,
  .timeline.is-active .focus{opacity:.34!important;transform:translateZ(0) scale(.97)!important;filter:none!important}

  .timeline.is-timeline-engaged canvas,
  .timeline.is-timeline-afterglow canvas{
    opacity:1!important;
    filter:saturate(1.22) contrast(1.40) brightness(1.17) drop-shadow(0 0 4px rgba(255,255,255,.58))!important;
  }
  .timeline.is-timeline-engaged .center-needle,
  .timeline.is-marker-afterglow .center-needle{
    opacity:1!important;
    filter:brightness(1.27) drop-shadow(0 0 4px rgba(255,255,255,1)) drop-shadow(0 2px 9px rgba(15,39,71,.48))!important;
  }
  .timeline.is-timeline-engaged .focus,
  .timeline.is-marker-afterglow .focus{
    opacity:1!important;
    transform:translateZ(0) scale(1.045)!important;
    filter:brightness(1.20) drop-shadow(0 0 5px rgba(255,255,255,.70)) drop-shadow(0 2px 12px rgba(15,39,71,.40))!important;
  }
}
`;

export const timelineVisualStateScript = String.raw`
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

  /* Window-level release handling prevents a captured/cancelled iPhone pointer
     from leaving the presentation visually active forever. */
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
`;
