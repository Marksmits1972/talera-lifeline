// TALERA: new life-line home screen paired with ORIGINAL r19h2.
// This worker is deliberately isolated and read-only. Never publish under the r19 reference Worker name.
import r19Worker from "../../src/reference-r19h2-carousel-combined-worker.js";
import HOME_HTML from "./visual-v3.html";
import { DEMO_MEMORIES } from "./demo-memories.js";

const VERSION="talera-lifeline-visual-v3-connected-20261014";
// Screenshot-faithful illustration; only this isolated demo uses the image.
// The approved RH19 presentation implementation is never edited.
const VISUAL_PREVIEW_PHOTO=(String(HOME_HTML).match(/<img class="preview-image" src="(data:image\/jpeg;base64,[^"]+)"/)||[])[1]||"";
function reply(body,method,contentType,status=200){
  return new Response(method==="HEAD"?null:body,{status,headers:{
    "content-type":contentType,"cache-control":"no-store","x-talera-build":VERSION,
    "x-content-type-options":"nosniff"
  }});
}
function targetRequest(request,path){
  const url=new URL(request.url);
  url.pathname=path;
  return new Request(url.toString(),request);
}
// Separate page: the unmodified RH19 presentation remains its own route.
const bridge=String.raw`<style id="talera-independent-presentation-navigation">
body nav[aria-label="TALERA navigatie"]{visibility:hidden!important}
#taleraPageNav{position:fixed;z-index:2147483640;bottom:0;left:0;right:0;max-width:880px;margin:auto;
 display:flex;align-items:center;justify-content:space-around;gap:7px;min-height:calc(60px + env(safe-area-inset-bottom,0px));
 padding:7px 12px calc(7px + env(safe-area-inset-bottom,0px));
 background:#fffdfa;border-top:1px solid rgba(15,39,71,.14);
 font:650 12px -apple-system,BlinkMacSystemFont,sans-serif;box-sizing:border-box}
#taleraPageNav a{display:block;flex:1;text-decoration:none;text-align:center;padding:12px 5px;border-radius:18px;color:#0f2747}
#taleraPageNav a[aria-current="page"]{background:#dceaf6;font-weight:800}
</style>
<nav id="taleraPageNav" aria-label="Hoofdpagina's van TALERA">
<a href="/">⌂ Levenslijn</a><a href="/present" aria-current="page">▣ Presenteren</a><a href="/tell">✎ Vertellen</a>
</nav>
<script id="talera-lifeline-r19-bridge">
(function(){
 const id=Number(new URLSearchParams(location.search).get('memory'));
 if(!Number.isInteger(id)||id<1||id>50)return;
 let attempts=0;
 function selectOriginal(){
   const runtime=window.__taleraTimelineRuntime;
   if(!runtime){
     if(++attempts<30)setTimeout(selectOriginal,60);
     return;
   }
   const m=runtime.findMemory({memoryId:String(id)});
   if(!m)return;
   runtime.setCenter(m.ms);
   runtime.writeMemory(m);
   runtime.draw();
 }
 selectOriginal();
})();
</script>`;
const tellBridge=String.raw`<style id="talera-independent-tell-navigation">
#taleraTellNav{position:fixed;z-index:2147483640;top:calc(7px + env(safe-area-inset-top,0px));left:10px;right:10px;
 display:flex;justify-content:space-around;gap:6px;align-items:center;max-width:520px;margin:auto;
 padding:6px;background:#fffdfaf5;color:#0f2747;border:1px solid #d4dde5;border-radius:25px;
 box-shadow:0 3px 18px #0f274725;font:650 11px -apple-system,BlinkMacSystemFont,sans-serif}
#taleraTellNav a,#taleraTellNav span{flex:1;text-align:center;padding:8px 4px;border-radius:17px;
 color:#0f2747;text-decoration:none;white-space:nowrap}
#taleraTellNav [aria-current="page"]{background:#dceaf6;font-weight:800}
</style>
<nav id="taleraTellNav" aria-label="Hoofdpagina's van TALERA">
<a href="/">⌂ Levenslijn</a><a href="/present">▣ Presenteren</a><span aria-current="page">✎ Vertellen</span>
</nav>`;
function addBridge(html, request){
  // Only the dedicated test worker is decorated; the original RH19 files are untouched.
  if(!html.includes("</body>"))return html;
  let enhanced=html.replace("</body>",bridge+"</body>");
  const visual=new URL(request.url).searchParams.get("visual");
  if(visual==="weekend-amsterdam" && VISUAL_PREVIEW_PHOTO){
    // The screenshot's Amsterdam story is only an illustration, not one of RH19's 50 memories.
    // Register a temporary in-browser preview so that tapping the photo shows that SAME
    // story and photo on the established RH19 presentation screen, without saving data.
    const handoff=String.raw`<script id="talera-visual-demo-handoff">
(function(){
 const image=__TALERA_VISUAL_IMAGE__;
 const memory={
   id:51001, at:"2024-05-12T12:00:00",
   ms:new Date("2024-05-12T12:00:00").getTime(),
   story:"Weekend in Amsterdam",
   fullStory:"Een spontaan weekendje weg met Lisa. Door de Jordaan, goed eten, veel gelachen en de mooiste zonsondergang aan de grachten.",
   image:image, photos:[image], _photoIndex:0
 };
 let attempts=0;
 function showVisualMemory(){
   const runtime=window.__taleraTimelineRuntime;
   if(!runtime){
     if(++attempts<60)setTimeout(showVisualMemory,70);
     return;
   }
   runtime.registerMemory(memory);
   runtime.setCenter(memory.ms);
   runtime.writeMemory(memory);
   runtime.draw();
 }
 showVisualMemory();
})();
</script>`.replace("__TALERA_VISUAL_IMAGE__",JSON.stringify(VISUAL_PREVIEW_PHOTO));
    enhanced=enhanced.replace("</body>",handoff+"</body>");
  }
  return enhanced;
}
export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url),path=url.pathname,method=request.method;
    // No writes to reference D1/R2, no matter which client route is called.
    if(method!=="GET"&&method!=="HEAD")
      return reply("Dit is een alleen-lezen proefversie. Opslaan en publiceren zijn nog niet gekoppeld.",method,"text/plain; charset=utf-8",403);
    if(path==="/"||path==="/index.html")return reply(String(HOME_HTML),method,"text/html; charset=utf-8");
    if(path==="/api/demo-memories"){
      return reply(JSON.stringify(DEMO_MEMORIES),method,"application/json; charset=utf-8");
    }
    if(path==="/present"||path==="/present/"){
      const r=await r19Worker.fetch(targetRequest(request,"/"),env,ctx);
      if(method==="HEAD"||!r.ok||!(r.headers.get("content-type")||"").includes("text/html"))return r;
      return reply(addBridge(await r.text(),request),method,"text/html; charset=utf-8",r.status);
    }
    if(path==="/tell"||path==="/tell/"||path==="/storylab-clean"||path==="/storylab-clean/"){
      const r=await r19Worker.fetch(targetRequest(request,path),env,ctx);
      if(method==="HEAD"||!r.ok||!(r.headers.get("content-type")||"").includes("text/html"))return r;
      const warning=String.raw`<div role="status" style="position:fixed;z-index:2147483639;left:8px;right:8px;top:calc(59px + env(safe-area-inset-top,0px));padding:7px 9px;text-align:center;border-radius:12px;background:#0f2747e8;color:#fff;font:600 11px sans-serif;pointer-events:none">Proefversie: opslaan en publiceren zijn uitgeschakeld.</div>`;
      return reply((await r.text()).replace("<body>","<body>"+warning).replace("</body>",tellBridge+"</body>"),method,"text/html; charset=utf-8",r.status);
    }
    return reply("Niet gevonden.",method,"text/plain; charset=utf-8",404);
  }
};
