export const timelineGlassLayerStyle = String.raw`
/* TALERA — isolated frosted-glass presentation layer for the top timeline.
   This file owns timeline presentation geometry only; mechanics stay untouched. */

.timeline canvas{
  transform:translateY(-26px)!important;
  transform-origin:center top!important;
}

/* The needle stays centred on the fixed timeline position, but its visible line
   stops just above the date badge. */
.timeline .center-needle{
  margin-top:-26px!important;
  bottom:54px!important;
}

/* Single geometry owner for the date badge: horizontally centred on the needle,
   vertically BELOW the complete ruler/labels so the timeline remains unobscured. */
main .timeline .focus,
main .timeline.is-active .focus,
main .timeline.is-timeline-engaged .focus,
main .timeline.is-timeline-afterglow .focus,
main .timeline.is-marker-afterglow .focus{
  left:50%!important;
  top:auto!important;
  bottom:12px!important;
  transform:translateX(-50%)!important;
}

/* REST: photo remains dominant; glass is only a quiet readability aid. */
.timeline::before{
  height:calc(100% - 34px)!important;
  background:rgba(255,255,255,.01)!important;
  backdrop-filter:blur(2px) saturate(1.22)!important;
  -webkit-backdrop-filter:blur(2px) saturate(1.22)!important;
  -webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 46%,rgba(0,0,0,.76) 61%,rgba(0,0,0,.38) 76%,rgba(0,0,0,.12) 89%,transparent 100%)!important;
  mask-image:linear-gradient(to bottom,#000 0%,#000 46%,rgba(0,0,0,.76) 61%,rgba(0,0,0,.38) 76%,rgba(0,0,0,.12) 89%,transparent 100%)!important;
  opacity:.20!important;
  transition:opacity .18s ease,backdrop-filter .18s ease,-webkit-backdrop-filter .18s ease!important;
}
.timeline::after{
  background:transparent!important;
  opacity:0!important;
}

/* ACTIVE: navigation is foreground, but still made from the photo beneath it. */
.timeline.is-timeline-engaged::before,
.timeline.is-timeline-afterglow::before{
  background:rgba(255,255,255,.018)!important;
  backdrop-filter:blur(10px) saturate(1.20) contrast(1.035)!important;
  -webkit-backdrop-filter:blur(10px) saturate(1.20) contrast(1.035)!important;
  opacity:.68!important;
}
.timeline.is-timeline-engaged::after,
.timeline.is-timeline-afterglow::after{
  background:transparent!important;
  opacity:0!important;
}
`;
