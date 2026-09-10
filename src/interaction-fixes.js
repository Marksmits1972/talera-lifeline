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
`;
