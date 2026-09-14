export const interactionFixStyle = String.raw`
/* TALERA — clean presentation interaction CSS.
   Base photo layers stay fixed. A single persistent three-page strip is the
   only layer allowed to translate during direct photo swiping. */
.photo-layer:not(.talera-photo-strip-page){
  transform:none!important;
  transition:opacity .14s linear!important;
  will-change:opacity!important;
}
.photo-layer.is-front:not(.talera-photo-strip-page){transform:none!important}
.memory-story-scroll{touch-action:pan-y!important}
.talera-photo-strip{
  position:absolute!important;
  inset:0!important;
  z-index:40!important;
  overflow:hidden!important;
  pointer-events:none!important;
  contain:layout paint size!important;
  visibility:hidden!important;
}
.talera-photo-strip.is-visible{visibility:visible!important}
.talera-photo-strip-page{
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
`;
