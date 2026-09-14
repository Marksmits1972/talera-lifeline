export const timelineGlassLayerStyle = String.raw`
/* TALERA — compact frosted timeline glass.
   Visual layer only. The proven timeline geometry, touch mapping, direct grip,
   scale behaviour, marker/date logic and canvas dimensions remain untouched. */

/* Lift only the painted ruler inside the existing proven touch area. */
.timeline canvas{
  transform:translateY(-26px)!important;
  transform-origin:center top!important;
}
.timeline .center-needle{
  margin-top:-26px!important;
}

/* REST: almost-clear frosted glass. The underlying photo keeps its colour. */
.timeline::before{
  height:calc(100% - 30px)!important;
  background:rgba(255,255,255,.008)!important;
  backdrop-filter:blur(1.5px) saturate(1.30) brightness(1.01)!important;
  -webkit-backdrop-filter:blur(1.5px) saturate(1.30) brightness(1.01)!important;
  -webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 48%,rgba(0,0,0,.78) 63%,rgba(0,0,0,.38) 78%,rgba(0,0,0,.10) 91%,transparent 100%)!important;
  mask-image:linear-gradient(to bottom,#000 0%,#000 48%,rgba(0,0,0,.78) 63%,rgba(0,0,0,.38) 78%,rgba(0,0,0,.10) 91%,transparent 100%)!important;
  opacity:.20!important;
  transition:opacity .20s ease,backdrop-filter .20s ease,-webkit-backdrop-filter .20s ease!important;
}
.timeline::after{
  background:transparent!important;
  opacity:0!important;
}

/*
   Safari/iPhone can occasionally leave enhancement.js' is-active class present
   after a touch sequence. is-active must therefore NOT determine the visual
   resting state. The dedicated afterglow class below remains the sole timeline
   illumination owner and expires after the proven ~3 second window.
*/
.timeline.is-active canvas{
  opacity:.36!important;
  filter:saturate(.72) contrast(.84) brightness(.94)!important;
}
.timeline.is-active .center-needle{
  opacity:.40!important;
  filter:none!important;
}
.timeline.is-active .focus{
  opacity:.44!important;
  transform:translateZ(0) scale(.97)!important;
  filter:none!important;
}
.timeline.is-active::before{
  backdrop-filter:blur(1.5px) saturate(1.30) brightness(1.01)!important;
  -webkit-backdrop-filter:blur(1.5px) saturate(1.30) brightness(1.01)!important;
  opacity:.20!important;
}
.timeline.is-active::after{
  background:transparent!important;
  opacity:0!important;
}

/* ACTIVE + short AFTERGLOW: clearer ruler and slightly stronger frosted glass. */
.timeline.is-timeline-afterglow canvas{
  opacity:1!important;
  filter:saturate(1.16) contrast(1.30) brightness(1.10) drop-shadow(0 0 3px rgba(255,255,255,.38))!important;
}
.timeline.is-timeline-afterglow::before{
  backdrop-filter:blur(7px) saturate(1.26) brightness(1.01) contrast(1.02)!important;
  -webkit-backdrop-filter:blur(7px) saturate(1.26) brightness(1.01) contrast(1.02)!important;
  opacity:.60!important;
}
.timeline.is-timeline-afterglow::after{
  background:transparent!important;
  opacity:0!important;
}

/* Marker/date may keep their longer, proven afterglow independently. */
.timeline.is-marker-afterglow .center-needle{
  opacity:1!important;
  filter:brightness(1.18) drop-shadow(0 0 3px rgba(255,255,255,.92)) drop-shadow(0 2px 8px rgba(15,39,71,.42))!important;
}
.timeline.is-marker-afterglow .focus{
  opacity:1!important;
  transform:translateZ(0) scale(1.035)!important;
  filter:brightness(1.12) drop-shadow(0 0 4px rgba(255,255,255,.55)) drop-shadow(0 2px 11px rgba(15,39,71,.34))!important;
}

@media (pointer:coarse){
  .timeline.is-active canvas{
    opacity:.26!important;
    filter:saturate(.62) contrast(.76) brightness(.91)!important;
  }
  .timeline.is-active .center-needle{opacity:.32!important;filter:none!important}
  .timeline.is-active .focus{opacity:.36!important;transform:translateZ(0) scale(.97)!important;filter:none!important}

  .timeline.is-timeline-afterglow canvas{
    opacity:1!important;
    filter:saturate(1.20) contrast(1.36) brightness(1.14) drop-shadow(0 0 4px rgba(255,255,255,.52))!important;
  }
  .timeline.is-marker-afterglow .center-needle{
    opacity:1!important;
    filter:brightness(1.25) drop-shadow(0 0 4px rgba(255,255,255,1)) drop-shadow(0 2px 9px rgba(15,39,71,.46))!important;
  }
  .timeline.is-marker-afterglow .focus{
    opacity:1!important;
    transform:translateZ(0) scale(1.04)!important;
    filter:brightness(1.17) drop-shadow(0 0 5px rgba(255,255,255,.66)) drop-shadow(0 2px 12px rgba(15,39,71,.38))!important;
  }
}
`;
