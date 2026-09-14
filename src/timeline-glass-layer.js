export const timelineGlassLayerStyle = String.raw`
/* TALERA — top timeline glass layer only.
   Purely visual: no timeline geometry, canvas size, touch mapping, scale,
   marker or date logic is changed here. */
.timeline::before{
  height:calc(100% + 8px)!important;
  background:transparent!important;
  backdrop-filter:blur(8px) saturate(1.10)!important;
  -webkit-backdrop-filter:blur(8px) saturate(1.10)!important;
  -webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 58%,rgba(0,0,0,.92) 70%,rgba(0,0,0,.62) 82%,rgba(0,0,0,.24) 93%,transparent 100%)!important;
  mask-image:linear-gradient(to bottom,#000 0%,#000 58%,rgba(0,0,0,.92) 70%,rgba(0,0,0,.62) 82%,rgba(0,0,0,.24) 93%,transparent 100%)!important;
  opacity:.58!important;
  transition:opacity .16s ease,backdrop-filter .16s ease,-webkit-backdrop-filter .16s ease!important;
}
.timeline::after{
  background:transparent!important;
  opacity:0!important;
}
.timeline.is-active::before,
.timeline.is-timeline-afterglow::before{
  backdrop-filter:blur(14px) saturate(1.15) contrast(1.035)!important;
  -webkit-backdrop-filter:blur(14px) saturate(1.15) contrast(1.035)!important;
  opacity:.92!important;
}
.timeline.is-active::after,
.timeline.is-timeline-afterglow::after{
  background:transparent!important;
  opacity:0!important;
}
`;
