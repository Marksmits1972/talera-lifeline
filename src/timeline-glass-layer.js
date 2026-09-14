export const timelineGlassLayerStyle = String.raw`
/* TALERA — isolated frosted-glass presentation layer for the top timeline.
   This file may be tuned later without touching timeline mechanics or state logic. */

.timeline canvas{
  transform:translateY(-26px)!important;
  transform-origin:center top!important;
}
.timeline .center-needle{
  margin-top:-26px!important;
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
