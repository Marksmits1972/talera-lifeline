export const enhancementStyle = String.raw`
/* =========================================================
   LIFELINE — CLEAN VISUAL BASELINE
   Deliberately simple: one sharp fullscreen photograph with
   the existing timeline floating directly on top of it.
   No timeline blur, veil, panel or duplicated photo backdrop.
   ========================================================= */

html,body{ background:#0F2747 !important; }
.app{ position:relative; background:transparent !important; }
main{
  position:relative !important;
  display:block !important;
  min-height:0;
  height:100%;
  overflow:hidden;
  background:transparent !important;
}

/* The active photograph IS the canvas. */
.memory-space{
  position:absolute !important;
  inset:0 !important;
  width:100% !important;
  height:100% !important;
  margin:0 !important;
  overflow:hidden !important;
  background:#0F2747 !important;
}
.photo-stage{
  position:absolute !important;
  inset:0 !important;
  z-index:1 !important;
  overflow:hidden !important;
  background:#0F2747 !important;
}
.photo-layer{
  position:absolute !important;
  inset:0 !important;
  overflow:hidden !important;
  transition:opacity .34s ease, transform .42s cubic-bezier(.22,.72,.25,1) !important;
  will-change:opacity,transform;
}
.photo-backdrop{ display:none !important; }
.example-photo{
  position:absolute !important;
  inset:0 !important;
  left:0 !important;
  top:0 !important;
  width:100% !important;
  height:100% !important;
  max-width:none !important;
  display:block !important;
  object-fit:cover !important;
  object-position:center center !important;
  filter:none !important;
  opacity:1 !important;
  transform:none !important;
  background:transparent !important;
}
.memory-space::before,
.memory-space::after{ display:none !important; content:none !important; }

/* Existing timeline mechanics, now literally floating on the photograph. */
.timeline{
  position:absolute !important;
  z-index:20 !important;
  left:0 !important;
  right:0 !important;
  top:0 !important;
  height:clamp(154px,20dvh,184px) !important;
  min-height:154px !important;
  overflow:hidden !important;
  isolation:isolate;
  background:transparent !important;
  border:0 !important;
  box-shadow:none !important;
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
  touch-action:none;
}
.timeline::before,
.timeline::after{ display:none !important; content:none !important; }
.timeline canvas{
  position:relative !important;
  z-index:2 !important;
  filter:none !important;
  opacity:1 !important;
}
.center-needle{ z-index:3 !important; }
.focus{
  z-index:4 !important;
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
}
.zoom-hint{ z-index:5 !important; }

/* Story remains vertically movable, directly over the same photograph. */
.memory-story-scroll{
  position:absolute !important;
  inset:0 !important;
  z-index:8 !important;
  overflow-y:auto !important;
  overflow-x:hidden !important;
  -webkit-overflow-scrolling:touch;
  overscroll-behavior-y:contain;
  scrollbar-width:none;
  touch-action:pan-y;
}
.memory-story-scroll::-webkit-scrollbar{ display:none; }
.memory-photo-air{
  height:63% !important;
  min-height:285px !important;
  pointer-events:none;
}
.memory-sheet{
  position:relative !important;
  min-height:86% !important;
  padding:46px 22px 112px !important;
  color:#fff !important;
  background:transparent !important;
  text-shadow:0 2px 14px rgba(8,24,44,.42) !important;
  transition:opacity .24s ease, transform .30s ease !important;
}
.memory-sheet::before{
  content:"↑" !important;
  top:22px !important;
  color:rgba(255,255,255,.76) !important;
  text-shadow:0 1px 8px rgba(8,24,44,.35) !important;
}
.memory-sheet .date,
.memory-sheet .story,
.memory-sheet .story-more{
  color:#fff !important;
  text-shadow:0 2px 14px rgba(8,24,44,.42) !important;
}
.memory-sheet .date{ font-size:13px !important; font-weight:720 !important; margin-bottom:8px !important; }
.memory-sheet .story{ font-size:17px !important; line-height:1.44 !important; font-weight:620 !important; max-width:35ch !important; }
.memory-sheet .story-more{ font-size:16px !important; line-height:1.62 !important; }
.memory-story-scroll.is-reading .memory-sheet{
  color:#fff !important;
  background:transparent !important;
  text-shadow:0 2px 14px rgba(8,24,44,.42) !important;
}
.memory-story-scroll.is-reading .memory-sheet::before,
.memory-story-scroll.is-reading .memory-sheet .date,
.memory-story-scroll.is-reading .memory-sheet .story{
  color:#fff !important;
}

/* No separate lower colour bar: controls remain visually over the photograph. */
nav{
  position:relative !important;
  z-index:30 !important;
  isolation:isolate;
  overflow:visible !important;
  margin-top:0 !important;
  background:transparent !important;
  border:0 !important;
  box-shadow:none !important;
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
}
nav::before,
nav::after{ display:none !important; content:none !important; }
.nav-item{
  color:rgba(255,255,255,.88) !important;
  text-shadow:0 1px 8px rgba(8,24,44,.40) !important;
}
.nav-item.active{ color:#fff !important; }
.tell{
  background:rgba(255,255,255,.92) !important;
  color:var(--talera-deep) !important;
  box-shadow:0 7px 20px rgba(8,24,44,.24) !important;
}

@media (max-height:700px){
  .timeline{ height:148px !important; min-height:148px !important; }
  .memory-photo-air{ height:59% !important; min-height:230px !important; }
  .memory-sheet{ padding-top:42px !important; }
}
`;

/* No extra presentation JavaScript in this baseline.
   All timeline, snapping, zooming, photo switching and story
   behaviour continue to come from the existing application code. */
export const enhancementScript = "";
