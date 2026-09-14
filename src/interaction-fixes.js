export const interactionFixStyle = String.raw`
/* TALERA — cleaned presentation interaction CSS.
   Base photo layers stay fixed; only temporary PhotoBook pages translate. */
.photo-layer:not(.photo-book-page){
  transform:none!important;
  transition:opacity .14s linear!important;
  will-change:opacity!important;
}
.photo-layer.is-front:not(.photo-book-page){transform:none!important}
.memory-story-scroll{touch-action:pan-y!important}
.photo-book-overlay{
  position:absolute!important;
  inset:0!important;
  z-index:40!important;
  overflow:hidden!important;
  pointer-events:none!important;
  contain:layout paint size!important;
}
.photo-book-page{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  opacity:1!important;
  transition:none!important;
  will-change:transform!important;
  overflow:hidden!important;
  backface-visibility:hidden!important;
  -webkit-backface-visibility:hidden!important;
}
.photo-book-page.is-settling{
  transition:transform .28s cubic-bezier(.22,.72,.25,1)!important;
}

/* VISUAL-ONLY CHROME REFINEMENT R2.
   Keep timeline scale/navigation untouched; only reposition the chrome.
   Higher-specificity selectors intentionally override later generic styles. */
.app .timeline{
  top:-18px!important;
}
.app .timeline::before{
  height:calc(100% - 4px)!important;
  backdrop-filter:blur(11px) saturate(1.05)!important;
  -webkit-backdrop-filter:blur(11px) saturate(1.05)!important;
  -webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 48%,rgba(0,0,0,.86) 61%,rgba(0,0,0,.54) 74%,rgba(0,0,0,.22) 87%,transparent 100%)!important;
  mask-image:linear-gradient(to bottom,#000 0%,#000 48%,rgba(0,0,0,.86) 61%,rgba(0,0,0,.54) 74%,rgba(0,0,0,.22) 87%,transparent 100%)!important;
}
.app .timeline::after{
  height:calc(100% - 8px)!important;
}

/* Let the photograph continue visually through the bottom navigation.
   One soft glass layer extends upward so there is no hard horizontal seam. */
.app nav{
  background:transparent!important;
  border:0!important;
  box-shadow:none!important;
  backdrop-filter:none!important;
  -webkit-backdrop-filter:none!important;
}
.app nav::before{
  display:block!important;
  content:""!important;
  position:absolute!important;
  left:0!important;
  right:0!important;
  top:-54px!important;
  bottom:0!important;
  height:auto!important;
  z-index:0!important;
  pointer-events:none!important;
  background:linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.008) 28%,rgba(15,39,71,.018) 58%,rgba(15,39,71,.035) 100%)!important;
  backdrop-filter:blur(19px) saturate(1.20) brightness(1.03)!important;
  -webkit-backdrop-filter:blur(19px) saturate(1.20) brightness(1.03)!important;
  -webkit-mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.12) 24%,rgba(0,0,0,.44) 48%,rgba(0,0,0,.78) 70%,#000 100%)!important;
  mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.12) 24%,rgba(0,0,0,.44) 48%,rgba(0,0,0,.78) 70%,#000 100%)!important;
}
.app .nav-item,
.app .tell{
  position:relative!important;
  z-index:2!important;
}
`;
