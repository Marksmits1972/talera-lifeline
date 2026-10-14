// TALERA: new life-line home screen paired with ORIGINAL r19h2.
// This worker is deliberately isolated and read-only. Never publish under the r19 reference Worker name.
import r19Worker from "../../src/reference-r19h2-carousel-combined-worker.js";
import HOME_HTML from "./index.html";
import { DEMO_MEMORIES } from "./demo-memories.js";

const VERSION="talera-lifeline-main-r19h2-dev-20261014";
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
const bridge=String.raw`<style id="talera-lifeline-return-style">
#taleraReturnToLife{position:fixed;z-index:2147483640;right:14px;top:calc(12px + env(safe-area-inset-top,0px));background:#fffefaee;
 color:#0f2747;border:1px solid #c4d4e2;border-radius:26px;box-shadow:0 3px 17px #0f27471d;
 font:700 12px -apple-system,BlinkMacSystemFont,sans-serif;padding:10px 15px;cursor:pointer}
</style>
<button id="taleraReturnToLife" type="button" aria-label="Terug naar mijn levenslijn">← Levenslijn</button>
<script id="talera-lifeline-r19-bridge">
(function(){
 const returnBtn=document.getElementById('taleraReturnToLife');
 if(returnBtn) returnBtn.addEventListener('click',()=>{location.href='/'});
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
function addBridge(html){
  // Inject only on the isolated /present route. The original RH19 files remain unchanged.
  if(!html.includes("</body>"))return html;
  return html.replace("</body>",bridge+"</body>");
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
      return reply(addBridge(await r.text()),method,"text/html; charset=utf-8",r.status);
    }
    if(path==="/tell"||path==="/tell/"||path==="/storylab-clean"||path==="/storylab-clean/"){
      const r=await r19Worker.fetch(targetRequest(request,path),env,ctx);
      if(method==="HEAD"||!r.ok||!(r.headers.get("content-type")||"").includes("text/html"))return r;
      const warning=String.raw`<div role="status" style="position:fixed;z-index:2147483640;left:8px;right:8px;top:env(safe-area-inset-top,0px);padding:8px 14px;text-align:center;border-radius:12px;background:#0f2747;color:#fff;font:600 12px sans-serif;pointer-events:none">TALERA proefversie — opslaan en publiceren zijn uitgeschakeld.</div>`;
      return reply((await r.text()).replace("<body>","<body>"+warning),method,"text/html; charset=utf-8",r.status);
    }
    return reply("Niet gevonden.",method,"text/plain; charset=utf-8",404);
  }
};
