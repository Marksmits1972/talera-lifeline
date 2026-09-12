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
import { memoryPresentationControlsStyle, memoryPresentationControlsScript } from "./memory-presentation-controls.js";

const TELL_ORIGIN = "https://xxory-test.mark-a39.workers.dev";
const TALERA_TIMELINE_DEPLOY_REV = "listen-layer-r5-server-audio-confirmed-force-20260912-0855";

const TIMELINE_RUNTIME_BRIDGE = String.raw`
const taleraIntegrationListeners=new Set();
const taleraWriteMemoryBase=writeMemory;
writeMemory=function(memory){
  taleraWriteMemoryBase(memory);
  taleraIntegrationListeners.forEach(fn=>{try{fn(memory)}catch(e){}});
};
function taleraRebuildDensity(){
  EVENT_OFFSETS.splice(0,EVENT_OFFSETS.length,...MEMORIES.map(m=>(m.ms-LIFE_START)/MS_DAY));
  dayCounts.fill(0);
  for(const offset of EVENT_OFFSETS){
    const day=Math.floor(offset);
    if(day>=0&&day<TOTAL_DAYS)dayCounts[day]++;
  }
}
window.__taleraTimelineRuntime={
  version:'runtime-bridge-v1',
  lifeStart:LIFE_START,
  lifeEnd:LIFE_END,
  msDay:MS_DAY,
  totalDays:TOTAL_DAYS,
  currentMemory(){return MEMORIES.find(m=>m.id===activeMemoryId)||nearestMemory(centerMs)},
  activeMemoryId(){return activeMemoryId},
  centerMs(){return centerMs},
  isMoving(){return userIsMoving},
  registerMemory(memory){
    if(!memory)return null;
    const existing=MEMORIES.findIndex(m=>m.storyId&&memory.storyId&&m.storyId===memory.storyId);
    if(existing>=0){
      const old=MEMORIES[existing];
      memory._photoIndex=old._photoIndex||0;
      if(Array.isArray(memory.photos)&&memory.photos[memory._photoIndex])memory.image=memory.photos[memory._photoIndex];
      MEMORIES.splice(existing,1,memory);
    }else{
      MEMORIES.push(memory);
    }
    MEMORIES.sort((a,b)=>a.ms-b.ms);
    taleraRebuildDensity();
    return memory;
  },
  setCenter(ms){centerMs=Number(ms)||centerMs;keepCenterValid();return centerMs},
  writeMemory(memory){writeMemory(memory)},
  draw(){draw()},
  settlePhoto(memory){settlePhoto(memory)},
  subscribe(fn){
    if(typeof fn!=='function')return ()=>{};
    taleraIntegrationListeners.add(fn);
    return ()=>taleraIntegrationListeners.delete(fn);
  }
};
`;

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
].join("\n").replace(
  "writeMemory(nearestMemory(centerMs));\nresize();\n})();",
  `${TIMELINE_RUNTIME_BRIDGE}\nwriteMemory(nearestMemory(centerMs));\nresize();\n})();`
);

const timelineAfterglowStyle = String.raw`
.memory-space .date,#memoryDate{display:none!important}
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
  .replace("</head>", `<style id="talera-immersive-photo">${enhancementStyle}</style><style id="talera-interaction-fixes">${interactionFixStyle}</style><style id="talera-timeline-afterglow">${timelineAfterglowStyle}</style><style id="talera-live-memory-integration">${liveMemoryIntegrationStyle}</style><style id="talera-memory-presentation-controls">${memoryPresentationControlsStyle}</style></head>`)
  .replace("</body>", `<script id="talera-live-memory-integration-controller">${liveMemoryIntegrationScript}</script><script id="talera-memory-presentation-controls-controller">${memoryPresentationControlsScript}</script><script id="talera-presentation-controller">${presentationControllerScript}</script><script id="talera-fast-flick-fallback">${fastFlickFallbackScript}</script><script id="talera-timeline-afterglow-controller">${timelineAfterglowScript}</script></body>`);

async function proxyLinkedMemory(request) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/linked/")) return null;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: { "allow": "GET, HEAD" } });
  }

  const allowed = /^\/api\/linked\/stories\/[^/]+(?:\/media\/[^/]+|\/audio)?$/;
  if (!allowed.test(url.pathname)) {
    return new Response(JSON.stringify({ error: "Niet gevonden." }), {
      status: 404,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const targetPath = url.pathname.replace(/^\/api\/linked/, "/api/integration");
  const headers = new Headers();
  const auth = request.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  const range = request.headers.get("range");
  if (range) headers.set("range", range);
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch) headers.set("if-none-match", ifNoneMatch);

  let upstream;
  try {
    upstream = await fetch(TELL_ORIGIN + targetPath, {
      method: request.method,
      headers,
      redirect: "follow",
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "De herinnering kon niet vanuit de tijdlijn worden opgehaald." }), {
      status: 502,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const out = new Headers(upstream.headers);
  out.delete("access-control-allow-origin");
  out.delete("access-control-allow-headers");
  out.delete("access-control-allow-methods");
  out.delete("content-security-policy");
  out.set("cache-control", upstream.headers.get("content-type")?.startsWith("image/") ? "private, max-age=120" : "no-store");
  out.set("x-talera-linked-proxy", TALERA_TIMELINE_DEPLOY_REV);

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: out,
  });
}

export default {
  async fetch(request) {
    const linked = await proxyLinkedMemory(request);
    if (linked) return linked;

    return new Response(HTML, {
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "no-store",
        "x-talera-timeline-ui": TALERA_TIMELINE_DEPLOY_REV,
      },
    });
  },
};
