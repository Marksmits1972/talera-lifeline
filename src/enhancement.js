export const enhancementStyle = String.raw`
/* =========================================================
   LIFELINE — REFERENCE COMPOSITION
   One fullscreen photograph. Timeline, story and controls
   live directly on top of that photograph. No blur, veil,
   panel, duplicated backdrop or separate navigation strip.
   Timeline mechanics remain untouched.
   ========================================================= */

html,body{
  margin:0 !important;
  width:100% !important;
  height:100% !important;
  overflow:hidden !important;
  background:#0F2747 !important;
}

.app{
  position:relative !important;
  display:block !important;
  width:100% !important;
  height:100dvh !important;
  overflow:hidden !important;
  background:#0F2747 !important;
}

/* Main and photo cover the complete app, including the area behind the controls. */
main{
  position:absolute !important;
  inset:0 !important;
  display:block !important;
  width:100% !important;
  height:100% !important;
  min-height:0 !important;
  overflow:hidden !important;
  background:transparent !important;
}

.memory-space{
  position:absolute !important;
  inset:0 !important;
  width:100% !important;
  height:100% !important;
  margin:0 !important;
  border:0 !important;
  border-radius:0 !important;
  overflow:hidden !important;
  background:#0F2747 !important;
  box-shadow:none !important;
}

.photo-stage{
  position:absolute !important;
  inset:0 !important;
  width:100% !important;
  height:100% !important;
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

/* Only the real photograph is visible. No second blurred copy. */
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
  background:transparent !important;
}

/* No atmospheric veil at this stage. */
.memory-space::before,
.memory-space::after{
  display:none !important;
  content:none !important;
}

/* Timeline floats directly inside the photograph. */
.timeline{
  position:absolute !important;
  z-index:20 !important;
  left:0 !important;
  right:0 !important;
  top:0 !important;
  width:100% !important;
  height:clamp(158px,21dvh,188px) !important;
  min-height:158px !important;
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
.timeline::after{
  display:none !important;
  content:none !important;
}

/* The existing canvas remains fully functional; visually it becomes a light overlay. */
.timeline canvas{
  position:relative !important;
  z-index:2 !important;
  opacity:1 !important;
  filter:brightness(0) invert(1) drop-shadow(0 1px 3px rgba(8,24,44,.34)) !important;
}

.center-needle{
  z-index:3 !important;
  background:rgba(255,255,255,.94) !important;
  box-shadow:0 1px 5px rgba(8,24,44,.30) !important;
}
.center-needle::before{
  background:#fff !important;
  box-shadow:0 0 0 3px rgba(255,255,255,.20),0 1px 6px rgba(8,24,44,.30) !important;
}

.focus{
  z-index:4 !important;
  color:#234566 !important;
  background:rgba(255,255,255,.94) !important;
  border:0 !important;
  box-shadow:0 4px 14px rgba(8,24,44,.15) !important;
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
  font-weight:750 !important;
}
.zoom-hint{ z-index:5 !important; }

/* Vertical story layer: large title-like first sentence and natural body copy. */
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
  height:61% !important;
  min-height:300px !important;
  pointer-events:none;
}

.memory-sheet{
  position:relative !important;
  min-height:80% !important;
  padding:44px 30px 124px !important;
  color:#fff !important;
  background:transparent !important;
  text-shadow:0 2px 13px rgba(8,24,44,.46) !important;
  transition:opacity .22s ease, transform .28s ease !important;
}

.memory-sheet::before{
  content:"↑" !important;
  position:absolute !important;
  left:30px !important;
  top:17px !important;
  color:rgba(255,255,255,.90) !important;
  font-size:20px !important;
  text-shadow:0 2px 10px rgba(8,24,44,.42) !important;
}

.memory-sheet .date{
  color:#fff !important;
  font-size:15px !important;
  line-height:1.25 !important;
  font-weight:760 !important;
  margin:0 0 12px !important;
  letter-spacing:.01em !important;
  text-shadow:0 2px 12px rgba(8,24,44,.48) !important;
}

.memory-sheet .story{
  color:#fff !important;
  font-size:clamp(28px,7vw,36px) !important;
  line-height:1.06 !important;
  font-weight:760 !important;
  letter-spacing:-.02em !important;
  max-width:16ch !important;
  margin:0 !important;
  white-space:pre-line !important;
  text-shadow:0 2px 14px rgba(8,24,44,.50) !important;
}

.memory-sheet .story-more{
  color:rgba(255,255,255,.94) !important;
  margin-top:22px !important;
  padding-top:0 !important;
  border-top:0 !important;
  font-size:17px !important;
  line-height:1.58 !important;
  font-weight:430 !important;
  max-width:38ch !important;
  white-space:pre-line !important;
  text-shadow:0 2px 12px rgba(8,24,44,.54) !important;
}

.memory-story-scroll.is-reading .memory-sheet,
.memory-story-scroll.is-reading .memory-sheet::before,
.memory-story-scroll.is-reading .memory-sheet .date,
.memory-story-scroll.is-reading .memory-sheet .story,
.memory-story-scroll.is-reading .memory-sheet .story-more{
  color:#fff !important;
  background:transparent !important;
  text-shadow:0 2px 13px rgba(8,24,44,.50) !important;
}

/* Bottom navigation floats over the same image. It no longer owns a row. */
nav{
  position:absolute !important;
  left:0 !important;
  right:0 !important;
  bottom:max(8px,env(safe-area-inset-bottom)) !important;
  z-index:30 !important;
  height:64px !important;
  min-height:64px !important;
  max-height:64px !important;
  margin:0 !important;
  padding:0 18px !important;
  display:grid !important;
  grid-template-columns:1fr 1fr 1fr !important;
  align-items:center !important;
  background:transparent !important;
  border:0 !important;
  box-shadow:none !important;
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
  overflow:visible !important;
  pointer-events:none;
}
nav::before,
nav::after{ display:none !important; content:none !important; }
nav > *{ pointer-events:auto; }

.nav-item{
  width:48px !important;
  height:48px !important;
  min-height:48px !important;
  justify-self:start !important;
  align-self:center !important;
  padding:0 !important;
  border-radius:50% !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  background:rgba(8,24,44,.58) !important;
  color:#fff !important;
  box-shadow:0 4px 14px rgba(8,24,44,.22) !important;
  text-shadow:none !important;
  font-size:0 !important;
}
.nav-item:last-child{ justify-self:end !important; }
.nav-item > span:last-child{ display:none !important; }
.nav-item.active{ color:#fff !important; }
.timeline-icon{ color:#fff !important; }
.more{ color:#fff !important; font-size:18px !important; letter-spacing:2px !important; }

.tell{
  justify-self:center !important;
  width:54px !important;
  height:54px !important;
  border-radius:50% !important;
  border:0 !important;
  background:rgba(255,255,255,.93) !important;
  color:var(--talera-deep) !important;
  box-shadow:0 5px 16px rgba(8,24,44,.24) !important;
  font-size:10px !important;
  font-weight:720 !important;
}

@media (max-height:700px){
  .timeline{ height:148px !important; min-height:148px !important; }
  .memory-photo-air{ height:58% !important; min-height:230px !important; }
  .memory-sheet{ padding:40px 24px 112px !important; }
  .memory-sheet::before{ left:24px !important; }
  .memory-sheet .story{ font-size:28px !important; }
}
`;

/* No extra JavaScript is added in this reference pass.
   Existing V16/V23 behaviour controls dragging, zooming,
   snapping, photo transitions and story movement. */
export const enhancementScript = "";
