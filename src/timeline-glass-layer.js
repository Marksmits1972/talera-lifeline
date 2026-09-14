export const timelineGlassLayerStyle = String.raw`
/* TALERA — compact top timeline glass layer.
   Visual composition only: the timeline element keeps its proven size/touch area,
   so navigation, direct grip, scale behaviour, marker/date logic and canvas math
   remain untouched. Only the painted timeline is lifted inside that area and the
   glass treatment ends sooner, revealing more of the photo. */

/* Lift the painted ruler without changing canvas dimensions or pointer geometry. */
.timeline canvas{
  transform:translateY(-18px)!important;
  transform-origin:center top!important;
}
.timeline .center-needle{
  margin-top:-18px!important;
}

/* Rest state: very light, colour-preserving glass; no grey fill. */
.timeline::before{
  height:calc(100% - 18px)!important;
  background:transparent!important;
  backdrop-filter:blur(4px) saturate(1.18)!important;
  -webkit-backdrop-filter:blur(4px) saturate(1.18)!important;
  -webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 52%,rgba(0,0,0,.86) 66%,rgba(0,0,0,.48) 80%,rgba(0,0,0,.16) 92%,transparent 100%)!important;
  mask-image:linear-gradient(to bottom,#000 0%,#000 52%,rgba(0,0,0,.86) 66%,rgba(0,0,0,.48) 80%,rgba(0,0,0,.16) 92%,transparent 100%)!important;
  opacity:.38!important;
  transition:opacity .16s ease,backdrop-filter .16s ease,-webkit-backdrop-filter .16s ease!important;
}
.timeline::after{
  background:transparent!important;
  opacity:0!important;
}

/* Only while the timeline is being used (and its short afterglow): stronger glass. */
.timeline.is-active::before,
.timeline.is-timeline-afterglow::before{
  backdrop-filter:blur(9px) saturate(1.20) contrast(1.025)!important;
  -webkit-backdrop-filter:blur(9px) saturate(1.20) contrast(1.025)!important;
  opacity:.76!important;
}
.timeline.is-active::after,
.timeline.is-timeline-afterglow::after{
  background:transparent!important;
  opacity:0!important;
}
`;
