export const swipeHotfixScript = String.raw`
(()=>{
  const style=document.getElementById('talera-interaction-fixes');
  if(!style)return;

  /* The cloned photo-book pages still carry the .photo-layer class. The existing
     !important transform rules on .photo-layer / .photo-book-page were therefore
     overriding the inline translate3d values written on every pointermove. That made
     the pages sit on top of each other: a tiny touch could reveal the next image,
     while the visible strip did not actually follow the finger.

     Remove those two transform locks at runtime, while keeping the base photo layers
     fixed. The gesture script can then move the temporary pages 1:1 with the finger. */
  style.textContent=style.textContent
    .replace('.photo-layer{', '.photo-layer:not(.photo-book-page){')
    .replace('  transform:translate3d(0,0,0)!important;\n  transition:none!important;', '  transition:none!important;');
})();
`;
