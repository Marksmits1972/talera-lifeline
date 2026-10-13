// TALERA Life Space + r19h2 prototype integration (isolated, non-production).
// Original 50 demo memories were checked: all ids/dates/stories/photos match.
import r19Worker from "../../src/reference-r19h2-carousel-combined-worker.js";
import LIFE_HTML from "./index.html";

const HOST = String.raw`<!doctype html><html lang="nl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0c1924">
<title>TALERA — Life Space + r19h2</title>
<style>
*{box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden;margin:0;background:#0c1924}
body{position:fixed;inset:0}
iframe{position:fixed;inset:0;width:100%;height:100%;border:0;transition:opacity .2s ease;display:block}
#space{z-index:1;opacity:1;pointer-events:auto}
#r19{z-index:2;opacity:0;pointer-events:none;visibility:hidden;background:#fafbfd}
body.present #space{opacity:0;pointer-events:none;visibility:hidden}
body.present #r19{opacity:1;pointer-events:auto;visibility:visible}
#back{display:none;position:fixed;z-index:5;right:30px;bottom:calc(270px + env(safe-area-inset-bottom,0px));
 width:76px;height:76px;border-radius:50%;border:2px solid #fffd;background:#315f87;color:white;
 align-items:center;justify-content:center;box-shadow:0 5px 18px #0005;cursor:pointer;touch-action:manipulation}
body.present #back{display:flex}
#back svg{width:27px;height:27px}
#loading{position:fixed;z-index:6;top:50%;left:50%;transform:translate(-50%,-50%);
 background:#123047e8;color:#fff;border-radius:14px;padding:12px 16px;
 font:600 14px -apple-system,BlinkMacSystemFont,sans-serif;pointer-events:none}
#loading[hidden]{display:none}
@media(max-width:430px){#back{width:60px;height:60px;right:18px;bottom:calc(218px + env(safe-area-inset-bottom,0px))}}
@media(prefers-reduced-motion:reduce){iframe{transition:none}}
</style></head><body>
<iframe id="space" src="/space?integrated=1" title="TALERA Life Space"></iframe>
<iframe id="r19" src="/present" title="TALERA r19h2 presentatie"></iframe>
<button id="back" aria-label="Terug naar Life Space" title="Terug naar Life Space">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"
 stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/></svg></button>
<div id="loading" role="status" aria-live="polite" hidden>Verhaal openen…</div>
<script>
(()=>{
 const space=document.getElementById('space'),r19=document.getElementById('r19');
 const loading=document.getElementById('loading');
 let selected=null,ready=false,pending=false;
 function sync(){
   if(!pending||!ready||selected===null)return;
   try{
     if(r19.contentWindow.location.pathname!=='/present'){
       ready=false;r19.src='/present';return;
     }
   }catch(e){ready=false;r19.src='/present';return;}
   r19.contentWindow.postMessage({type:'talera-combine-select',id:selected},location.origin);
 }
 function open(id){
   if(!Number.isInteger(id)||id<1||id>50)return;
   selected=id;pending=true;loading.hidden=false;
   document.body.classList.add('present');sync();
 }
 function back(){
   document.body.classList.remove('present');pending=false;loading.hidden=true;
   space.contentWindow.postMessage({type:'talera-combine-back',id:selected},location.origin);
 }
 document.getElementById('back').addEventListener('click',back);
 window.addEventListener('keydown',e=>{if(e.key==='Escape')back()});
 r19.addEventListener('load',()=>{
   ready=false;
   try{r19.contentWindow.postMessage({type:'talera-combine-ping'},location.origin)}catch(e){}
 });
 window.addEventListener('message',e=>{
   if(e.origin!==location.origin||!e.data||typeof e.data!=='object')return;
   if(e.source===space.contentWindow){
     if(e.data.type==='talera-combine-open')open(Number(e.data.id));
     return;
   }
   if(e.source!==r19.contentWindow)return;
   if(e.data.type==='talera-combine-ready'){ready=true;sync()}
   if(e.data.type==='talera-combine-selected'&&Number(e.data.id)===selected){pending=false;loading.hidden=true}
 });
})();
</script></body></html>`;

const SPACE_BRIDGE=String.raw`<script id="talera-combine-space-bridge">
(()=>{
 if(window.parent===window||new URLSearchParams(location.search).get('integrated')!=='1')return;
 const original=window.openStorySmooth;
 if(typeof original!=='function'||typeof data==='undefined')return;
 // Replace only the simplified Life Space story opening action.
 // Keep the globe, camera, photo layers and timeline unchanged.
 window.openStorySmooth=function(i){
   const index=Number(i),m=Number.isInteger(index)?data[index]:null;
   if(!m)return original(i);
   window.parent.postMessage({type:'talera-combine-open',id:m.id},location.origin);
 };
 const openButton=document.getElementById('storyBtn');
 if(openButton&&typeof nearestMemoryToFocus==='function'){
   openButton.onclick=()=>window.openStorySmooth(nearestMemoryToFocus());
 }
 window.addEventListener('message',e=>{
   if(e.origin===location.origin&&e.source===window.parent&&e.data?.type==='talera-combine-back')window.focus();
 });
})();
</script>`;

const R19_BRIDGE=String.raw`<script id="talera-combine-r19-bridge">
(()=>{
 if(window.parent===window)return;
 const runtime=window.__taleraTimelineRuntime;
 if(!runtime)return;
 window.addEventListener('message',e=>{
   if(e.origin!==location.origin||e.source!==window.parent)return;
   if(e.data?.type==='talera-combine-ping'){
     window.parent.postMessage({type:'talera-combine-ready'},location.origin);return;
   }
   if(e.data?.type!=='talera-combine-select')return;
   const id=Number(e.data.id);
   if(!Number.isInteger(id)||id<1||id>50)return;
   const memory=runtime.findMemory({memoryId:String(id)});
   if(!memory)return;
   runtime.setCenter(memory.ms);
   runtime.writeMemory(memory);
   runtime.draw();
   window.parent.postMessage({type:'talera-combine-selected',id:id},location.origin);
 });
 window.parent.postMessage({type:'talera-combine-ready'},location.origin);
})();
</script>`;

function htmlResponse(text,request){
 return new Response(request.method==='HEAD'?null:text,{
   headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store',
     'x-talera-prototype':'life-space-r19h2-combined-v1'}
 });
}
function rootRequest(request){
 const url=new URL(request.url);url.pathname='/';
 return new Request(url.toString(),request);
}
export default {
 async fetch(request,env,ctx){
   const url=new URL(request.url),path=url.pathname;
   const backend=path==='/tell'||path.startsWith('/tell/')||
      path.startsWith('/api/')||path.startsWith('/storylab');
   if(request.method!=='GET'&&request.method!=='HEAD'){
     // Read-only experiment: never forward writes to original r19 or Story Lab.
     // Enable saving only after configuring separate test D1/R2 resources.
     return new Response(backend?'Demo is alleen-lezen: opslaan is nog niet aangesloten.':'Method Not Allowed',{
       status:backend?403:405,
       headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}
     });
   }
   if(path==='/'||path==='/index.html')return htmlResponse(HOST,request);
   if(path==='/space'||path==='/space/'){
     const html=String(LIFE_HTML);
     return htmlResponse(url.searchParams.get('integrated')==='1'
       ?html.replace('</body>',SPACE_BRIDGE+'</body>'):html,request);
   }
   if(path==='/present'||path==='/present/'){
     const response=await r19Worker.fetch(rootRequest(request),env,ctx);
     if(request.method==='HEAD'||!response.ok||
       !(response.headers.get('content-type')||'').includes('text/html'))return response;
     const headers=new Headers(response.headers);
     headers.delete('content-length');headers.set('cache-control','no-store');
     headers.set('x-talera-prototype','life-space-r19h2-combined-v1');
     return new Response((await response.text()).replace('</body>',R19_BRIDGE+'</body>'),
       {status:response.status,headers});
   }
   if(backend)return r19Worker.fetch(request,env,ctx);
   return new Response('Not Found',{status:404});
 }
};
