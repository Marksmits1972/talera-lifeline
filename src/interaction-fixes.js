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

/* VISUAL-ONLY CHROME REFINEMENT R3.
   The timeline/date relationship is changed visually only; timeline math stays untouched. */
.app .timeline{
  top:-18px!important;
}
.app .timeline canvas{
  transform:translateY(-26px)!important;
  transform-origin:center top!important;
}
.app .timeline .center-needle{
  transform:translate(-1px,-26px)!important;
}
.app .timeline::before{
  height:calc(100% - 10px)!important;
  backdrop-filter:blur(11px) saturate(1.05)!important;
  -webkit-backdrop-filter:blur(11px) saturate(1.05)!important;
  -webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 44%,rgba(0,0,0,.84) 58%,rgba(0,0,0,.50) 72%,rgba(0,0,0,.18) 86%,transparent 100%)!important;
  mask-image:linear-gradient(to bottom,#000 0%,#000 44%,rgba(0,0,0,.84) 58%,rgba(0,0,0,.50) 72%,rgba(0,0,0,.18) 86%,transparent 100%)!important;
}
.app .timeline::after{
  height:calc(100% - 14px)!important;
}

/* Keep title contrast, but let the photograph recover before the navigation starts. */
.app .memory-sheet{
  background:linear-gradient(180deg,
    rgba(10,24,40,0) 0px,
    rgba(10,24,40,.08) 48px,
    rgba(10,24,40,.18) 110px,
    rgba(10,24,40,.26) 170px,
    rgba(10,24,40,.18) 215px,
    rgba(10,24,40,.08) 255px,
    rgba(10,24,40,0) 300px
  )!important;
}

/* Bottom navigation is a glass overlay on the photograph, not a separate grey panel. */
.app nav{
  background:rgba(15,39,71,.015)!important;
  border:0!important;
  box-shadow:none!important;
  backdrop-filter:blur(8px) saturate(1.16)!important;
  -webkit-backdrop-filter:blur(8px) saturate(1.16)!important;
}
.app nav::before{
  display:block!important;
  content:""!important;
  position:absolute!important;
  left:0!important;
  right:0!important;
  top:-64px!important;
  bottom:0!important;
  height:auto!important;
  z-index:0!important;
  pointer-events:none!important;
  background:linear-gradient(180deg,rgba(15,39,71,0) 0%,rgba(15,39,71,.012) 38%,rgba(15,39,71,.028) 70%,rgba(15,39,71,.04) 100%)!important;
  backdrop-filter:blur(16px) saturate(1.18)!important;
  -webkit-backdrop-filter:blur(16px) saturate(1.18)!important;
  -webkit-mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.14) 26%,rgba(0,0,0,.48) 54%,rgba(0,0,0,.82) 78%,#000 100%)!important;
  mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.14) 26%,rgba(0,0,0,.48) 54%,rgba(0,0,0,.82) 78%,#000 100%)!important;
}
.app .nav-item,
.app .tell{
  position:relative!important;
  z-index:2!important;
}
`;
