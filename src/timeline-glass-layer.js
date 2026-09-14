export const timelineGlassLayerStyle = String.raw`
/* TALERA — isolated frosted-glass presentation layer for the top timeline.
   This file owns presentation geometry only; timeline mechanics remain untouched. */

/* The timeline is its own interaction plane and must stay above the story/photo
   swipe surface. The photo swipe controller owns only the layer underneath. */
.timeline{
  overflow:visible!important;
  z-index:20!important;
}

.timeline canvas{
  transform:translateY(-26px)!important;
  transform-origin:center top!important;
}

/* Keep the fixed needle aligned with the ruler and end it exactly where the
   date badge begins. */
.timeline .center-needle{
  margin-top:-26px!important;
  bottom:42px!important;
}

/* Single geometry owner for the date badge. The full ruler and its labels stay
   unobstructed; the badge sits centred under the needle and may overlap the
   first few pixels of the photograph instead of covering timeline information. */
main .timeline .focus,
main .timeline.is-active .focus,
main .timeline.is-timeline-engaged .focus,
main .timeline.is-timeline-afterglow .focus,
main .timeline.is-marker-afterglow .focus{
  left:50%!important;
  top:calc(100% - 42px)!important;
  bottom:auto!important;
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

/* Reuse the existing transparent ::after layer as the one and only hit surface
   for timeline gestures. It belongs to .timeline, so pointer events bubble into
   the proven #surface motor; the photo swipe layer underneath never owns this
   region. No second gesture controller is introduced. */
.timeline::after{
  top:0!important;
  left:0!important;
  right:0!important;
  height:100%!important;
  z-index:6!important;
  pointer-events:auto!important;
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
