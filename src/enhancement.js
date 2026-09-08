export const enhancementStyle = String.raw`
/* =========================================================
   TALERA / LIFELINE — MASTER-ALIGNED PRESENTATION
   Keeps approved V16/V21/V22 behaviour and adds:
   - timeline blur only behind timeline
   - blur fades out gradually, no hard lower edge
   - horizontal swipe works from photo/story area
   ========================================================= */

:root{
  --talera-deep:#0F2747;
  --talera-soft:#5B8FB9;
  --talera-light:#DCEAF6;
  --talera-warm:#E7A98B;
  --talera-neutral:#F7F4EF;
  --talera-text:#3E4A59;
}

html,body{
  margin:0 !important;
  width:100% !important;
  height:100% !important;
  overflow:hidden !important;
  background:var(--talera-neutral) !important;
}

.app{
  width:100% !important;
  height:100dvh !important;
  overflow:hidden !important;
  display:grid !important;
  grid-template-rows:minmax(0,1fr) 60px !important;
  background:var(--talera-neutral) !important;
}

main{
  position:relative !important;
  width:100% !important;
  height:100% !important;
  min-height:0 !important;
  overflow:hidden !important;
  display:block !important;
  background:var(--talera-neutral) !important;
}

.memory-space{
  position:absolute !important;
  inset:0 !important;
  width:100% !important;
  height:100% !important;
  min-width:0 !important;
  min-height:0 !important;
  margin:0 !important;
  border:0 !important;
  border-radius:0 !important;
  overflow:hidden !important;
  background:var(--talera-neutral) !important;
  box-shadow:none !important;
}

.photo-stage{
  position:absolute !important;
  inset:0 !important;
  z-index:1 !important;
  overflow:hidden !important;
  background:var(--talera-neutral) !important;
}

.photo-layer{
  position:absolute !important;
  inset:0 !important;
  opacity:0;
  transform:translate3d(4%,0,0) scale(1.01);
  transition:opacity .30s ease, transform .38s cubic-bezier(.22,.72,.25,1) !important;
  will-change:opacity,transform;
}
.photo-layer.is-front{
  opacity:1;
  transform:translate3d(0,0,0) scale(1);
}

.photo-backdrop{
  display:block !important;
  position:absolute !important;
  inset:-46px !important;
  width:calc(100% + 92px) !important;
  height:calc(100% + 92px) !important;
  object-fit:cover !important;
  object-position:center center !important;
  filter:blur(30px) saturate(.90) brightness(1.04) !important;
  opacity:.62 !important;
  transform:scale(1.10) !important;
}

.example-photo{
  position:absolute !important;
  z-index:2 !important;
  inset:0 !important;
  width:100% !important;
  height:100% !important;
  max-width:none !important;
  display:block !important;
  object-fit:contain !important;
  object-position:center center !important;
  filter:none !important;
  opacity:1 !important;
  background:transparent !important;
}

.memory-space::before{ display:none !important; content:none !important; }
.memory-space::after{
  content:"" !important;
  display:block !important;
  position:absolute !important;
  inset:0 !important;
  z-index:2 !important;
  pointer-events:none !important;
  background:linear-gradient(180deg,
    rgba(247,244,239,0) 0%,
    rgba(247,244,239,0) 55%,
    rgba(247,244,239,.06) 66%,
    rgba(247,244,239,.18) 76%,
    rgba(247,244,239,.52) 90%,
    rgba(247,244,239,.84) 100%) !important;
}

/* Timeline remains the original interactive surface. */
.timeline{
  position:absolute !important;
  z-index:20 !important;
  left:0 !important;
  right:0 !important;
  top:0 !important;
  width:100% !important;
  height:clamp(190px,24dvh,212px) !important;
  min-height:190px !important;
  overflow:hidden !important;
  isolation:isolate !important;
  background:transparent !important;
  border:0 !important;
  box-shadow:none !important;
  touch-action:none !important;
  user-select:none !important;
}

/* Blur only the image behind the timeline. The mask makes the blur
   dissolve gradually toward the real sharp photo below. */
.timeline::before{
  content:"" !important;
  display:block !important;
  position:absolute !important;
  inset:0 !important;
  z-index:0 !important;
  pointer-events:none !important;
  backdrop-filter:blur(14px) saturate(.96) !important;
  -webkit-backdrop-filter:blur(14px) saturate(.96) !important;
  background:rgba(247,244,239,.035) !important;
  -webkit-mask-image:linear-gradient(to bottom,
    #000 0%,
    #000 50%,
    rgba(0,0,0,.94) 62%,
    rgba(0,0,0,.70) 76%,
    rgba(0,0,0,.34) 90%,
    transparent 100%) !important;
  mask-image:linear-gradient(to bottom,
    #000 0%,
    #000 50%,
    rgba(0,0,0,.94) 62%,
    rgba(0,0,0,.70) 76%,
    rgba(0,0,0,.34) 90%,
    transparent 100%) !important;
}
.timeline::after{ display:none !important; content:none !important; }
.timeline canvas{
  position:relative !important;
  z-index:2 !important;
  opacity:1 !important;
  filter:none !important;
}
.center-needle{ z-index:3 !important; }
.focus{ z-index:4 !important; }
.zoom-hint{ z-index:5 !important; }
.debug-panel{ z-index:20 !important; }

.memory-story-scroll{
  position:absolute !important;
  inset:0 !important;
  z-index:8 !important;
  overflow-y:auto !important;
  overflow-x:hidden !important;
  -webkit-overflow-scrolling:touch !important;
  overscroll-behavior-y:contain !important;
  scrollbar-width:none !important;
  touch-action:pan-y pan-x !important;
}
.memory-story-scroll::-webkit-scrollbar{ display:none !important; }
.memory-photo-air{
  height:62% !important;
  min-height:260px !important;
  pointer-events:none !important;
}
.memory-sheet{
  position:relative !important;
  min-height:78% !important;
  padding:58px 22px 96px !important;
  color:var(--talera-deep) !important;
  opacity:1 !important;
  transform:translateY(0) !important;
  background:linear-gradient(180deg,
    rgba(247,244,239,0) 0px,
    rgba(247,244,239,.18) 44px,
    rgba(247,244,239,.52) 102px,
    rgba(247,244,239,.88) 172px,
    rgba(247,244,239,.98) 238px,
    rgb(247,244,239) 286px) !important;
  text-shadow:none !important;
  transition:opacity .22s ease, transform .28s ease, background .30s ease !important;
}
.memory-sheet.story-switching{
  opacity:.16 !important;
  transform:translateY(7px) !important;
}
.memory-sheet::before{
  content:"↑" !important;
  position:absolute !important;
  top:24px !important;
  left:22px !important;
  font-size:14px !important;
  color:rgba(15,39,71,.44) !important;
  text-shadow:none !important;
}
.memory-sheet .date{
  color:rgba(15,39,71,.68) !important;
  font-size:13px !important;
  line-height:1.2 !important;
  font-weight:720 !important;
  margin:0 0 8px !important;
  letter-spacing:.01em !important;
  text-shadow:none !important;
}
.memory-sheet .story{
  color:var(--talera-deep) !important;
  font-size:17px !important;
  line-height:1.43 !important;
  font-weight:620 !important;
  max-width:35ch !important;
  white-space:pre-line !important;
  text-shadow:none !important;
}
.memory-sheet .story-more{
  margin-top:18px !important;
  padding-top:16px !important;
  border-top:1px solid rgba(15,39,71,.10) !important;
  color:var(--talera-text) !important;
  font-size:16px !important;
  line-height:1.58 !important;
  font-weight:430 !important;
  max-width:39ch !important;
  white-space:pre-line !important;
  text-shadow:none !important;
}
.memory-story-scroll.is-reading .memory-sheet{
  color:var(--talera-deep) !important;
  text-shadow:none !important;
  background:linear-gradient(180deg,
    rgba(247,244,239,.90) 0px,
    rgba(247,244,239,.98) 92px,
    rgb(247,244,239) 145px) !important;
}
.memory-story-scroll.is-reading .memory-sheet::before,
.memory-story-scroll.is-reading .memory-sheet .date,
.memory-story-scroll.is-reading .memory-sheet .story{
  color:var(--talera-deep) !important;
  text-shadow:none !important;
}

nav{
  position:relative !important;
  z-index:30 !important;
  width:100% !important;
  height:60px !important;
  min-height:60px !important;
  max-height:60px !important;
  margin:0 !important;
  padding:4px 20px 4px !important;
  display:grid !important;
  grid-template-columns:1fr 1fr 1fr !important;
  align-items:end !important;
  overflow:hidden !important;
  background:rgba(247,244,239,.98) !important;
  border-top:1px solid rgba(15,39,71,.07) !important;
  box-shadow:none !important;
  backdrop-filter:blur(12px) !important;
  -webkit-backdrop-filter:blur(12px) !important;
}
nav::before,nav::after{ display:none !important; content:none !important; }
.nav-item{
  border:0 !important;
  background:transparent !important;
  color:rgba(62,74,89,.58) !important;
  display:flex !important;
  flex-direction:column !important;
  align-items:center !important;
  justify-content:flex-end !important;
  gap:2px !important;
  min-height:38px !important;
  padding:0 0 2px !important;
  font-size:9px !important;
  box-shadow:none !important;
  text-shadow:none !important;
  border-radius:0 !important;
  width:auto !important;
  height:auto !important;
}
.nav-item.active{ color:var(--talera-deep) !important; font-weight:650 !important; }
.nav-item > span:last-child{ display:inline !important; }
.more{ width:22px !important; color:currentColor !important; letter-spacing:3px !important; font-size:18px !important; line-height:1 !important; }
.tell{
  justify-self:center !important;
  width:50px !important;
  height:50px !important;
  border:0 !important;
  border-radius:50% !important;
  color:var(--talera-white,#FFFEFC) !important;
  background:var(--talera-deep) !important;
  box-shadow:0 9px 23px rgba(15,39,71,.17) !important;
  font-size:11px !important;
  font-weight:650 !important;
}
`;

export const enhancementScript = String.raw`
(() => {
  const story = document.getElementById('memoryStoryScroll');
  const surface = document.getElementById('surface');
  if (!story || !surface) return;

  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let mode = null;

  story.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerId = e.pointerId;
    startX = lastX = e.clientX;
    startY = e.clientY;
    mode = null;
  }, {passive:true});

  story.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointerId) return;
    const dxTotal = e.clientX - startX;
    const dyTotal = e.clientY - startY;

    if (!mode && (Math.abs(dxTotal) > 9 || Math.abs(dyTotal) > 9)) {
      mode = Math.abs(dxTotal) > Math.abs(dyTotal) * 1.18 ? 'horizontal' : 'vertical';
    }
    if (mode !== 'horizontal') return;

    e.preventDefault();
    const dx = e.clientX - lastX;
    lastX = e.clientX;

    surface.dispatchEvent(new WheelEvent('wheel', {
      deltaX: -dx,
      deltaY: 0,
      bubbles: true,
      cancelable: true
    }));
  }, {passive:false});

  const end = (e) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    mode = null;
  };

  story.addEventListener('pointerup', end, {passive:true});
  story.addEventListener('pointercancel', end, {passive:true});
})();
`;
