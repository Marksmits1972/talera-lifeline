// TALERA: new life-line home screen paired with ORIGINAL r19h2.
// This worker is deliberately isolated and read-only. Never publish under the r19 reference Worker name.
import r19Worker from "../../src/reference-r19h2-carousel-combined-worker.js";
import HOME_HTML from "./visual-v8-photo-space.html";
import { MEMORY_STORE_SCRIPT } from "./memory-store.js";
import { TELL_PAGE_HTML } from "./tell-local-page.js";
import { BULK_FREE_STYLE, BULK_FREE_MARKUP, BULK_FREE_SCRIPT } from "./bulk-free.js";
import { FREE_DATE_PICKER } from "./free-date-picker.js";
import { TIMELINE_REPOSITION_SCRIPT } from "./timeline-reposition.js";
import { DEMO_MEMORIES } from "./demo-memories.js";
import { PWA_ICONS } from "./pwa-icons.js";
import { BRAND_PNG_BASE64, BRAND_ICON_SVG } from "./pwa-brand.js";
import { PWA_UPDATE_SCRIPT } from "./pwa-update.js";
import { FREE_TELL_POLISH_STYLE } from "./free-tell-polish.js";
import { LOCAL_RH19_ADAPTER } from "./local-rh19-adapter.js";
import { TALERA_I18N_SCRIPT } from "./i18n.js";
import { NAVIGATION_STYLE, NAV_SLOT, renderNavigation } from "./navigation.js";

const VERSION="talera-lifeline-v13-phone-display-unified-nav-20261016-r4";
const PWA_MANIFEST=JSON.stringify({name:"TALERA — Mijn levenslijn",short_name:"TALERA",description:"Door je leven reizen en herinneringen beleven",id:"/",start_url:"/",scope:"/",display:"standalone",background_color:"#ffffff",theme_color:"#ffffff",icons:[{src:"/talera-brand-v9.svg",sizes:"any",type:"image/svg+xml",purpose:"any"},{src:"/pwa-192.png",sizes:"192x192",type:"image/png",purpose:"any"},{src:"/pwa-512.png",sizes:"512x512",type:"image/png",purpose:"any"}]});
const PWA_SW=String.raw`self.addEventListener("install",()=>self.skipWaiting());self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));self.addEventListener("fetch",event=>{if(event.request.mode!=="navigate")return;event.respondWith(fetch(event.request).catch(()=>new Response("<!doctype html><html lang=nl><meta name=viewport content=width=device-width,initial-scale=1><title>TALERA offline</title><body style=font-family:system-ui;padding:2rem><h1>TALERA</h1><p>Je bent offline. Probeer opnieuw wanneer je verbinding hebt.</p></body></html>",{status:503,headers:{"content-type":"text/html; charset=utf-8"}})))});`;

// One immutable RH19 reference catalog shared by the time line and the
// original RH19 presentation. Personal memories remain in IndexedDB.
const REFERENCE_CATALOG_SCRIPT='<script id="talera-reference-catalog">window.__taleraReferenceMemories='+JSON.stringify(DEMO_MEMORIES).replace(/</g,'\\u003c')+'</script>';
function reply(body,method,contentType,status=200){
  return new Response(method==="HEAD"?null:body,{status,headers:{
    "content-type":contentType,"cache-control":"no-store","x-talera-build":VERSION,
    "x-content-type-options":"nosniff"
  }});
}
// Only rewrite HTML markup, never touch browser storage, installed app IDs or user-uploaded blobs.
function pwaShell(html){
  const icon='<link rel="apple-touch-icon" href="/talera-brand-v9.png"><link rel="icon" type="image/png" href="/talera-brand-v9.png">';
  let result=String(html).replace(/<link\s+[^>]*rel="apple-touch-icon"[^>]*>/gi,"").replace(/<link\s+[^>]*rel="icon"[^>]*>/gi,"");
  if(result.includes("</head>"))result=result.replace("</head>",icon+TALERA_I18N_SCRIPT+"</head>");
  const updater=PWA_UPDATE_SCRIPT.replace("__TALERA_BUILD_VERSION__",VERSION);
  return result.includes("</body>")?result.replace("</body>",updater+"</body>"):result;
}
function targetRequest(request,path){
  const url=new URL(request.url);
  url.pathname=path;
  return new Request(url.toString(),request);
}
// Separate page: the unmodified RH19 presentation remains its own route.
const bridge=String.raw`<script id="talera-lifeline-r19-bridge">
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
const memoryNavigation=String.raw`<script id="talera-memory-id-navigation">
(function(){
 const nav=document.getElementById('taleraPageNav');
 const runtime=window.__taleraTimelineRuntime;
 if(!nav||!runtime)return;
 function currentId(){
  const m=runtime.currentMemory();if(!m)return '';
  return m.storyId&&String(m.storyId).startsWith('local-')?m.storyId:'ref-'+m.id;
 }
 nav.querySelector('a[href="/"]')?.addEventListener('click',function(){
  const id=currentId();if(id)this.href='/?memory='+encodeURIComponent(id);
 });
 nav.querySelector('a[href="/tell"]')?.addEventListener('click',function(){
  const m=runtime.currentMemory();
  if(m&&m.storyId&&String(m.storyId).startsWith('local-'))this.href='/tell?edit='+encodeURIComponent(m.storyId);
 });
})();
</script>`;
function addBridge(html){
  // RH19 handles its own story and photo rendering. The wrapper adds only
  // three-page navigation and an exact reference-ID selector.
  return html.includes("</body>")?html.replace("</body>",NAVIGATION_STYLE+renderNavigation("present")+bridge+memoryNavigation+"</body>"):html;
}
export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url),path=url.pathname,method=request.method;
    // No writes to reference D1/R2, no matter which client route is called.
    if(method!=="GET"&&method!=="HEAD")
      return reply("Dit is een alleen-lezen proefversie. Opslaan en publiceren zijn nog niet gekoppeld.",method,"text/plain; charset=utf-8",403);
    if(path==="/api/version")return reply(JSON.stringify({version:VERSION,app:"TALERA",localOnly:true}),method,"application/json; charset=utf-8");
    if(path==="/manifest.webmanifest")return reply(PWA_MANIFEST,method,"application/manifest+json; charset=utf-8");
    if(path==="/talera-brand-v9.svg")return reply(BRAND_ICON_SVG,method,"image/svg+xml; charset=utf-8");
    if(path==="/talera-brand-v9.png"||path==="/apple-touch-icon.png"||path==="/favicon.png"){
      const bin=atob(BRAND_PNG_BASE64);
      return reply(Uint8Array.from(bin,c=>c.charCodeAt(0)),method,"image/png");
    }
    if(path==="/sw.js")return reply(PWA_SW,method,"text/javascript; charset=utf-8");
    const icon=path.match(/^\/(?:pwa-(192|512)|apple-touch-icon)\.png$/);
    if(icon){
      const size=icon[1]||"180",bin=atob(PWA_ICONS[size]);
      return reply(Uint8Array.from(bin,c=>c.charCodeAt(0)),method,"image/png");
    }
    if(path==="/"||path==="/index.html")return reply(pwaShell(String(HOME_HTML).replace(NAV_SLOT,renderNavigation("timeline")).replace("<script>",REFERENCE_CATALOG_SCRIPT+MEMORY_STORE_SCRIPT+"<script>").replace("</body>",TIMELINE_REPOSITION_SCRIPT+"</body>")),method,"text/html; charset=utf-8");
    if(path==="/api/demo-memories"){
      return reply(JSON.stringify(DEMO_MEMORIES),method,"application/json; charset=utf-8");
    }
    if(path==="/present"||path==="/present/"){
      const r=await r19Worker.fetch(targetRequest(request,"/"),env,ctx);
      if(method==="HEAD"||!r.ok||!(r.headers.get("content-type")||"").includes("text/html"))return r;
      let presentation=addBridge(await r.text());
      // One adapter for all locally stored memories; RH19 remains the renderer.
      presentation=presentation.replace("</body>",MEMORY_STORE_SCRIPT+LOCAL_RH19_ADAPTER+"</body>");
      return reply(pwaShell(presentation),method,"text/html; charset=utf-8",r.status);
    }
    if(path==="/tell"||path==="/tell/"){
      const tell=String(TELL_PAGE_HTML)
        .replace("__MEMORY_STORE__",MEMORY_STORE_SCRIPT)
        .replace("</head>",'<style id="talera-free-bulk-style">'+BULK_FREE_STYLE+"</style>"+FREE_TELL_POLISH_STYLE+"</head>")
        .replace('<section class="card" id="mediaSection"',BULK_FREE_MARKUP+'<section class="card" id="mediaSection"')
        .replace(NAV_SLOT,renderNavigation('tell'))
        .replace("</body>",BULK_FREE_SCRIPT+FREE_DATE_PICKER+NAVIGATION_STYLE+"</body>");
      return reply(pwaShell(tell),method,"text/html; charset=utf-8");
    }
    if(path==="/storylab-clean"||path==="/storylab-clean/"){
      const r=await r19Worker.fetch(targetRequest(request,path),env,ctx);
      if(method==="HEAD"||!r.ok||!(r.headers.get("content-type")||"").includes("text/html"))return r;
      const warning=String.raw`<div role="status" style="position:fixed;z-index:2147483639;left:8px;right:8px;top:calc(59px + env(safe-area-inset-top,0px));padding:7px 9px;text-align:center;border-radius:12px;background:#0f2747e8;color:#fff;font:600 11px sans-serif;pointer-events:none">Proefversie: opslaan en publiceren zijn uitgeschakeld.</div>`;
      return reply(pwaShell((await r.text()).replace("<body>","<body>"+warning).replace("</body>",NAVIGATION_STYLE+renderNavigation("tell")+"</body>")),method,"text/html; charset=utf-8",r.status);
    }
    return reply("Niet gevonden.",method,"text/plain; charset=utf-8",404);
  }
};
