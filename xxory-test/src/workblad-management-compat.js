export const WORKBLAD_MANAGEMENT_COMPAT_SCRIPT = String.raw`<script id="talera-management-compat">
(() => {
  function removeLegacyCleanup(){
    const panel=document.getElementById('talera-story-photo-cleanup-panel');
    if(panel)panel.remove();
    const style=document.getElementById('talera-story-photo-cleanup-style');
    if(style)style.remove();
  }
  removeLegacyCleanup();
  addEventListener('pageshow',removeLegacyCleanup);
  new MutationObserver(removeLegacyCleanup).observe(document.documentElement,{subtree:true,childList:true});
})();
</scr`+`ipt>`;
