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
const NAVIGATION_STYLE=String.raw`<style id="talera-unified-navigation">
/* Exact three-tab structure and iconography from the approved timeline. */
body nav[aria-label="TALERA navigatie"]{visibility:hidden!important}
#taleraPageNav.bottom-nav,#taleraTellNav.bottom-nav{
 width:100%!important;max-width:880px!important;margin:0 auto!important;
 display:flex!important;align-items:center!important;justify-content:space-around!important;
 height:calc(65px + env(safe-area-inset-bottom,0px))!important;
 min-height:calc(65px + env(safe-area-inset-bottom,0px))!important;
 max-height:none!important;
 padding:0 7px calc(3px + env(safe-area-inset-bottom,0px))!important;
 border:0!important;border-top:1px solid #e8e9ef!important;
 background:#fff!important;opacity:1!important;visibility:visible!important;
 box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
 filter:none!important;overflow:visible!important;box-sizing:border-box!important
}
#taleraPageNav.bottom-nav{position:fixed!important;z-index:2147483640!important;bottom:0!important;left:0!important;right:0!important}
#taleraTellNav.bottom-nav{position:relative!important;z-index:5!important;flex:0 0 auto!important}
#taleraPageNav .nav-item,#taleraTellNav .nav-item{
 position:relative!important;display:flex!important;flex:1 1 0!important;
 flex-direction:column!important;justify-content:center!important;align-items:center!important;
 gap:4px!important;min-width:0!important;height:100%!important;min-height:0!important;
 padding:0!important;margin:0!important;text-decoration:none!important;
 background:transparent!important;border:0!important;border-radius:0!important;
 font:650 11px/1.2 -apple-system,BlinkMacSystemFont,sans-serif!important;
 color:#67758b!important;opacity:1!important;visibility:visible!important;
 text-shadow:none!important;filter:none!important
}
#taleraPageNav .nav-item.selected,#taleraTellNav .nav-item.selected{
 color:#2478ca!important;font-weight:780!important
}
#taleraPageNav .nav-item.selected::before,#taleraTellNav .nav-item.selected::before{
 content:''!important;position:absolute!important;top:6px!important;
 width:95%!important;max-width:130px!important;height:26px!important;
 background:#e6f1fd!important;border-radius:18px!important;
 box-shadow:none!important;z-index:0!important
}
#taleraPageNav .nav-icon,#taleraTellNav .nav-icon{
 height:23px!important;position:relative!important;z-index:1!important;
 font-size:21px!important;line-height:23px!important;color:inherit!important
}
#taleraPageNav .nav-item span:last-child,#taleraTellNav .nav-item span:last-child{
 position:relative!important;z-index:1!important;color:inherit!important
}
#taleraPageNav .nav-item:focus-visible,#taleraTellNav .nav-item:focus-visible{
 outline:2px solid #2478ca!important;outline-offset:-3px!important;border-radius:10px!important
}
</style>`;
const ORIGINAL_TIMELINE_NAV=(String(HOME_HTML).match(/<nav class="bottom-nav" aria-label="Hoofdnavigatie TALERA">[\s\S]*?<\/nav>/)||[])[0]||'';
function unifiedFooter(page){
 const original=[...ORIGINAL_TIMELINE_NAV.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(match=>match[0]);
 if(original.length!==3)throw Error('De oorspronkelijke TALERA-navigatie ontbreekt.');
 const selected=page==='tell'?0:page==='timeline'?1:2;
 const links=original.map((html,index)=>{
  let link=html.replace(/class="nav-item(?: selected)?"/,'class="nav-item'+(index===selected?' selected':'')+'"');
  link=link.replace(/ aria-current="page"/g,'');
  if(index===selected)link=link.replace('class="nav-item selected"','class="nav-item selected" aria-current="page"');
  return link.replace('href="/present?visual=weekend-amsterdam"','href="/present"');
 });
 const id=page==='tell'?'taleraTellNav':'taleraPageNav';
 return '<nav class="bottom-nav" id="'+id+'" aria-label="Hoofdnavigatie TALERA">'+links.join('')+'</nav>';
}
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
function addBridge(html){
  // RH19 handles its own story and photo rendering. The wrapper adds only
  // three-page navigation and an exact reference-ID selector.
  return html.includes("</body>")?html.replace("</body>",NAVIGATION_STYLE+unifiedFooter("present")+bridge+memoryNavigation+"</body>"):html;
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
    if(path==="/"||path==="/index.html")return reply(pwaShell(String(HOME_HTML).replace("<script>",REFERENCE_CATALOG_SCRIPT+MEMORY_STORE_SCRIPT+"<script>").replace("</body>",TIMELINE_REPOSITION_SCRIPT+"</body>")),method,"text/html; charset=utf-8");
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
        .replace(/<nav aria-label="Hoofdnavigatie">[\s\S]*?<\/nav>/,unifiedFooter('tell'))
        .replace("</body>",BULK_FREE_SCRIPT+FREE_DATE_PICKER+NAVIGATION_STYLE+"</body>");
      return reply(pwaShell(tell),method,"text/html; charset=utf-8");
    }
    if(path==="/storylab-clean"||path==="/storylab-clean/"){
      const r=await r19Worker.fetch(targetRequest(request,path),env,ctx);
      if(method==="HEAD"||!r.ok||!(r.headers.get("content-type")||"").includes("text/html"))return r;
      const warning=String.raw`<div role="status" style="position:fixed;z-index:2147483639;left:8px;right:8px;top:calc(59px + env(safe-area-inset-top,0px));padding:7px 9px;text-align:center;border-radius:12px;background:#0f2747e8;color:#fff;font:600 11px sans-serif;pointer-events:none">Proefversie: opslaan en publiceren zijn uitgeschakeld.</div>`;
      return reply(pwaShell((await r.text()).replace("<body>","<body>"+warning).replace("</body>",tellBridge+"</body>")),method,"text/html; charset=utf-8",r.status);
    }
    return reply("Niet gevonden.",method,"text/plain; charset=utf-8",404);
  }
};
