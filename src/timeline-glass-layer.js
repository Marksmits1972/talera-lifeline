export const timelineGlassLayerStyle = String.raw`
/* TALERA — isolated frosted-glass presentation layer for the top timeline.
   This file may be tuned later without touching timeline mechanics or state logic. */

/* Reclaim photo space by lifting only the painted ruler inside the unchanged
   proven touch area. Canvas dimensions and pointer geometry stay untouched. */
.timeline canvas{
  transform:translateY(-26px)!important;
  transform-origin:center top!important;
}
.timeline .center-needle{
  margin-top:-26px!important;
}

/* REST: almost-clear colour-preserving frosted glass. */
.timeline::before{
  height:calc(100% - 34px)!important;
  background:rgba(255,255,255,.01)!important;
  backdrop-filter:blur(2px) saturate(1.22)!important;
  -webkit-backdrop-filter:blur(2px) saturate(1.22)!important;
  -webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 46%,rgba(0,0,0,.76) 61%,rgba(0,0,0,.38) 76%,rgba(0,0,0,.12) 89%,transparent 100%)!important;
  mask-image:linear-gradient(to bottom,#000 0%,#000 46%,rgba(0,0,0,.76) 61%,rgba(0,0,0,.38) 76%,rgba(0,0,0,.12) 89%,transparent 100%)!important;
  opacity:.18!important;
  transition:opacity .18s ease,backdrop-filter .18s ease,-webkit-backdrop-filter .18s ease!important;
}
.timeline::after{
  background:transparent!important;
  opacity:0!important;
}

/* During direct use and the short afterglow the SAME glass becomes stronger.
   No grey fill is introduced; the underlying photo colour remains the source. */
.timeline.is-timeline-engaged::before,
.timeline.is-timeline-afterglow::before{
  background:rgba(255,255,255,.014)!important;
  backdrop-filter:blur(8px) saturate(1.18)!important;
  -webkit-backdrop-filter:blur(8px) saturate(1.18)!important;
  opacity:.54!important;
}
.timeline.is-timeline-engaged::after,
.timeline.is-timeline-afterglow::after{
  background:transparent!important;
  opacity:0!important;
}
`;
