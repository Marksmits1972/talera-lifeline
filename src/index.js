import { chunk1 } from "./html/chunk1.js";
import { chunk2 } from "./html/chunk2.js";
import { chunk3 } from "./html/chunk3.js";
import { chunk4 } from "./html/chunk4.js";
import { chunk5 } from "./html/chunk5.js";
import { chunk6 } from "./html/chunk6.js";
import { chunk7 } from "./html/chunk7.js";
import { chunk8 } from "./html/chunk8.js";
import { chunk9 } from "./html/chunk9.js";
import { enhancementStyle } from "./enhancement.js";
import { interactionFixStyle } from "./interaction-fixes.js";
import { presentationControllerScript } from "./presentation-controller.js";
import { fastFlickFallbackScript } from "./fast-flick-fallback.js";
import { liveMemoryIntegrationStyle, liveMemoryIntegrationScript } from "./live-memory-integration.js";

const BASE_HTML = [
  ...chunk1,
  ...chunk2,
  ...chunk3,
  ...chunk4,
  ...chunk5,
  ...chunk6,
  ...chunk7,
  ...chunk8,
  ...chunk9,
].join("\n");

const timelineAfterglowStyle = String.raw`
.zoom-hint,#zoomHint{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
.timeline.is-timeline-afterglow canvas{opacity:1!important;filter:saturate(1.16) contrast(1.34) brightness(1.13) drop-shadow(0 0 3px rgba(255,255,255,.42))!important}
.timeline.is-timeline-afterglow::after{opacity:.92!important}
.timeline.is-marker-afterglow .center-needle{opacity:1!important;filter:brightness(1.18) drop-shadow(0 0 3px rgba(255,255,255,.92)) drop-shadow(0 2px 8px rgba(15,39,71,.42))!important}
.timeline.is-marker-afterglow .focus{opacity:1!important;transform:translateZ(0) scale(1.035)!important;filter:brightness(1.12) drop-shadow(0 0 4px rgba(255,255,255,.55)) drop-shadow(0 2px 11px rgba(15,39,71,.34))!important}
@media (pointer:coarse){
  .timeline.is-timeline-afterglow canvas{opacity:1!important;filter:saturate(1.22) contrast(1.42) brightness(1.20) drop-shadow(0 0 4px rgba(255,255,255,.62))!important}
  .timeline.is-timeline-afterglow::after{opacity:1!important}
  .timeline.is-marker-afterglow .center-needle{opacity:1!important;filter:brightness(1.28) drop-shadow(0 0 4px rgba(255,255,255,1)) drop-shadow(0 2px 9px rgba(15,39,71,.48))!important}
  .timeline.is-marker-afterglow .focus{opacity:1!important;transform:translateZ(0) scale(1.045)!important;filter:brightness(1.20) drop-shadow(0 0 5px rgba(255,255,255,.70)) drop-shadow(0 2px 12px rgba(15,39,71,.40))!important}
}
`;

const timelineAfterglowScript = String.raw`
(()=>{
  const timeline=document.querySelector('.timeline');
  document.querySelectorAll('.zoom-hint,#zoomHint').forEach(node=>node.remove());
  if(!timeline)return;
  let timelineTimer=0,markerTimer=0,pointerCount=0;
  const wake=()=>{
    clearTimeout(timelineTimer);clearTimeout(markerTimer);
    timeline.classList.add('is-timeline-afterglow','is-marker-afterglow');
  };
  const holdAfterRelease=()=>{
    clearTimeout(timelineTimer);clearTimeout(markerTimer);
    timeline.classList.add('is-timeline-afterglow','is-marker-afterglow');
    timelineTimer=setTimeout(()=>timeline.classList.remove('is-timeline-afterglow'),3000);
    markerTimer=setTimeout(()=>timeline.classList.remove('is-marker-afterglow'),8000);
  };
  timeline.addEventListener('pointerdown',()=>{pointerCount+=1;wake()},{passive:true});
  const release=()=>{
    pointerCount=Math.max(0,pointerCount-1);
    if(pointerCount===0)holdAfterRelease();
  };
  timeline.addEventListener('pointerup',release,{passive:true});
  timeline.addEventListener('pointercancel',release,{passive:true});
  timeline.addEventListener('wheel',e=>{
    if(!e.isTrusted)return;
    wake();
    holdAfterRelease();
  },{passive:true});
})();
`;

const HTML = BASE_HTML
  .replace("</head>", `<style id="talera-immersive-photo">${enhancementStyle}</style><style id="talera-interaction-fixes">${interactionFixStyle}</style><style id="talera-timeline-afterglow">${timelineAfterglowStyle}</style><style id="talera-live-memory-integration">${liveMemoryIntegrationStyle}</style></head>`)
  .replace("</body>", `<script id="talera-live-memory-integration-controller">${liveMemoryIntegrationScript}</script><script id="talera-presentation-controller">${presentationControllerScript}</script><script id="talera-fast-flick-fallback">${fastFlickFallbackScript}</script><script id="talera-timeline-afterglow-controller">${timelineAfterglowScript}</script></body>`);

export default {
  async fetch() {
    return new Response(HTML, {
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "no-store",
        "x-talera-timeline-ui": "linked-memories-multiphoto-v1",
      },
    });
  },
};
