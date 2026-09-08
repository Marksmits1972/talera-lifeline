export const enhancementStyle = String.raw`
/* =========================================================
   TALERA / LIFELINE — MASTER-ALIGNED PRESENTATION

   Preserves the approved timeline architecture and restores
   the visual/interaction agreements from the project master:
   - fullscreen photographic memory area
   - timeline over the photograph, without its own panel/blur
   - full photo remains recognisable via contain
   - same photo softly fills the background
   - horizontal = through life
   - vertical = deeper into active memory
   - story moves into a calm neutral reading zone
   - bottom navigation remains a reserved 60px row
   - no new viewport hacks
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

/* Keep the approved v16-style screen architecture: content + reserved nav. */
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

/* =========================================================
   PHOTOBOOK MEMORY CANVAS
   ========================================================= */
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

/* v22 agreement: same image softly fills the full background. */
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

/* The recognisable photo itself is never hard-cropped. */
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

/* No general dark overlay over the photograph. */
.memory-space::before{ display:none !important; content:none !important; }

/* Only the lower edge dissolves gently into the story/reading space. */
.memory-space::after{
  content:"" !important;
  display:block !important;
  position:absolute !important;
  inset:0 !important;
  z-index:2 !important;
  pointer-events:none !important;
  background:linear-gradient(
    180deg,
    rgba(247,244,239,0) 0%,
    rgba(247,244,239,0) 55%,
    rgba(247,244,239,.06) 66%,
    rgba(247,244,239,.18) 76%,
    rgba(247,244,239,.52) 90%,
    rgba(247,244,239,.84) 100%
  ) !important;
}

/* =========================================================
   TIMELINE — SAME FUNCTION, NEW COMPOSITION
   Directly over the photograph. No pane, veil or blur yet.
   ========================================================= */
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
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
  touch-action:none !important;
  user-select:none !important;
}
.timeline::before,
.timeline::after{
  display:none !important;
  content:none !important;
}
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

/* =========================================================
   STORYFLOW / LIFEBOOK
   Horizontal = through life. Vertical = into this memory.
   ========================================================= */
.memory-story-scroll{
  position:absolute !important;
  inset:0 !important;
  z-index:8 !important;
  overflow-y:auto !important;
  overflow-x:hidden !important;
  -webkit-overflow-scrolling:touch !important;
  overscroll-behavior-y:contain !important;
  scrollbar-width:none !important;
  touch-action:pan-y !important;
}
.memory-story-scroll::-webkit-scrollbar{ display:none !important; }

/* Start photo-first: title begins near the lower part of the image. */
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
  background:linear-gradient(
    180deg,
    rgba(247,244,239,0) 0px,
    rgba(247,244,239,.18) 44px,
    rgba(247,244,239,.52) 102px,
    rgba(247,244,239,.88) 172px,
    rgba(247,244,239,.98) 238px,
    rgb(247,244,239) 286px
  ) !important;
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

/* As the user scrolls upward, reading becomes calmer and lighter. */
.memory-story-scroll.is-reading .memory-sheet{
  color:var(--talera-deep) !important;
  text-shadow:none !important;
  background:linear-gradient(
    180deg,
    rgba(247,244,239,.90) 0px,
    rgba(247,244,239,.98) 92px,
    rgb(247,244,239) 145px
  ) !important;
}
.memory-story-scroll.is-reading .memory-sheet::before,
.memory-story-scroll.is-reading .memory-sheet .date,
.memory-story-scroll.is-reading .memory-sheet .story{
  color:var(--talera-deep) !important;
  text-shadow:none !important;
}

/* =========================================================
   BOTTOM NAVIGATION — RESERVED 60PX, NOT LOST
   ========================================================= */
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
nav::before,
nav::after{ display:none !important; content:none !important; }
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
.nav-item.active{
  color:var(--talera-deep) !important;
  font-weight:650 !important;
}
.nav-item > span:last-child{ display:inline !important; }
.more{
  width:22px !important;
  color:currentColor !important;
  letter-spacing:3px !important;
  font-size:18px !important;
  line-height:1 !important;
}
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

/* No live viewport-height workaround is introduced here. */
`;

/* The approved application JavaScript remains authoritative.
   No presentation script is injected here, so timeline drag,
   pinch zoom, snapping, nearest-memory selection, 50-memory
   dataset, photo crossfades, story reset and zoom hint continue
   to come from the existing v16/v21/v22-derived application. */
export const enhancementScript = "";
