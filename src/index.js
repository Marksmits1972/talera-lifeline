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
import { liveMemoryIntegrationStyle, liveMemoryIntegrationScript } from "./live-memory-integration.js";
import { memoryPresentationControlsStyle, memoryPresentationControlsScript } from "./memory-presentation-controls.js";
import { timelineVisualStateStyle, timelineVisualStateScript } from "./timeline-visual-state.js";
import { timelineGlassLayerStyle } from "./timeline-glass-layer.js";
import { timelinePhotoSelectionScript } from "./timeline-photo-selection.js";
import { bottomCommandLayerStyle } from "./bottom-command-layer.js";
import { shareExperienceStyle, shareExperienceScript } from "./share-experience.js";

const TELL_ORIGIN = "https://xxory-test.mark-a39.workers.dev";
const TALERA_TIMELINE_DEPLOY_REV = "whatsapp-demo-handoff-v4-20260915";

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
  version:'runtime-bridge-v2',
  lifeStart:LIFE_START,
  lifeEnd:LIFE_END,
  msDay:MS_DAY,
  totalDays:TOTAL_DAYS,
  currentMemory(){return MEMORIES.find(m=>m.id===activeMemoryId)||nearestMemory(centerMs)},
  nearestMemory(ms=centerMs){
    const value=Number(ms);
    return nearestMemory(Number.isFinite(value)?value:centerMs);
  },
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
  settleNearestPhoto(){
    const memory=nearestMemory(centerMs);
    if(memory)settlePhoto(memory);
    return memory;
  },
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

const listenButtonOutlineStyle = String.raw`
.talera-memory-audio{
  right:20px!important;
  bottom:112px!important;
  width:46px!important;
  min-width:46px!important;
  height:46px!important;
  padding:0!important;
  border:1.5px solid rgba(255,255,255,.88)!important;
  background:rgba(15,39,71,.07)!important;
  box-shadow:0 3px 13px rgba(15,39,71,.18)!important;
  backdrop-filter:blur(4px)!important;
  -webkit-backdrop-filter:blur(4px)!important;
}
.talera-memory-audio .audio-symbol{
  width:100%!important;
  height:100%!important;
  background:transparent!important;
  color:#fff!important;
  box-shadow:none!important;
  text-shadow:0 1px 4px rgba(15,39,71,.48)!important;
  font-size:15px!important;
}
.talera-memory-audio.is-playing{
  border-color:rgba(231,169,139,.96)!important;
  background:rgba(15,39,71,.14)!important;
  box-shadow:0 4px 14px rgba(15,39,71,.20)!important;
}
.talera-memory-audio.is-loading{opacity:.72!important}
.talera-memory-audio.is-error{border-color:rgba(231,169,139,.92)!important;box-shadow:0 3px 13px rgba(15,39,71,.18)!important}
@media(max-width:430px){
  .talera-memory-audio{right:18px!important;bottom:104px!important;width:44px!important;min-width:44px!important;height:44px!important}
}
`;

const HTML = BASE_HTML
  .replace("</head>", `<style id="talera-immersive-photo">${enhancementStyle}</style><style id="talera-interaction-fixes">${interactionFixStyle}</style><style id="talera-timeline-visual-state">${timelineVisualStateStyle}</style><style id="talera-timeline-glass-layer">${timelineGlassLayerStyle}</style><style id="talera-live-memory-integration">${liveMemoryIntegrationStyle}</style><style id="talera-memory-presentation-controls">${memoryPresentationControlsStyle}</style><style id="talera-listen-button-outline">${listenButtonOutlineStyle}</style><style id="talera-bottom-command-layer">${bottomCommandLayerStyle}</style><style id="talera-share-experience">${shareExperienceStyle}</style></head>`)
  .replace("</body>", `<script id="talera-live-memory-integration-controller">${liveMemoryIntegrationScript}</script><script id="talera-memory-presentation-controls-controller">${memoryPresentationControlsScript}</script><script id="talera-presentation-controller">${presentationControllerScript}</script><script id="talera-timeline-visual-state-controller">${timelineVisualStateScript}</script><script id="talera-timeline-photo-selection-controller">${timelinePhotoSelectionScript}</script><script id="talera-share-experience-controller">${shareExperienceScript}</script></body>`);

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
