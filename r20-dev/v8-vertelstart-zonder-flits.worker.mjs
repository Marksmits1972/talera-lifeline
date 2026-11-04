/* TALERA V8: only a seamless first-frame handoff; V7 remains intact.
   No changes to narration, swipe, player timing, local media storage or edit screens. */
const HANDOFF_STYLE="/* Keep the already visible RH19 memory photo on screen until the real first\n   image inside the original, unchanged narrated player has loaded. */\niframe.talera-zero-present-frame:not(.talera-v8-image-ready){\n  opacity:0!important;\n  pointer-events:none!important;\n}\niframe.talera-zero-present-frame.talera-v8-image-ready{\n  opacity:1!important;\n}\niframe.talera-zero-present-frame{transition:opacity 110ms ease!important}";
const HANDOFF_SCRIPT="(()=>{\n'use strict';\n// The original player first boots with sample images, then receives INIT.\n// Only reveal it after the ACTUAL first narrated image is ready to paint.\nfunction reveal(frame){\n if(!frame?.isConnected)return;\n requestAnimationFrame(()=>requestAnimationFrame(()=>{\n   if(frame.isConnected)frame.classList.add('talera-v8-image-ready');\n }));\n}\nwindow.addEventListener('message',event=>{\n if(event.origin!==location.origin||\n    event.data?.taleraZero!==true||\n    event.data.type!=='INITIALIZED')return;\n const frame=Array.from(document.querySelectorAll('iframe.talera-zero-present-frame'))\n   .find(el=>el.contentWindow===event.source);\n if(!frame||frame.classList.contains('talera-v8-image-ready'))return;\n let media;\n try{\n  const view=frame.contentDocument?.getElementById('view');\n  media=view?.querySelector('img:not(.talera-video-preview),.talera-video-preview,video');\n }catch(e){reveal(frame);return}\n if(!media){reveal(frame);return}\n const isImage=media.tagName==='IMG';\n const ready=()=>isImage?(media.complete&&media.naturalWidth>0):media.readyState>=2;\n if(ready()){reveal(frame);return}\n let finished=false;\n const finish=()=>{\n   if(finished)return;finished=true;\n   media.removeEventListener('load',finish);\n   media.removeEventListener('loadeddata',finish);\n   media.removeEventListener('error',finish);\n   reveal(frame);\n };\n media.addEventListener(isImage?'load':'loadeddata',finish,{once:true});\n media.addEventListener('error',finish,{once:true});\n if(ready())finish();\n // Keep the native playback controls reachable if a browser never fires a load event.\n setTimeout(finish,4000);\n},true);\n})();";
export default {
 async fetch(request,env){
  if(!env?.V7_BASE?.fetch)return new Response('Werkende TALERA V7-servicebinding ontbreekt',{status:503});
  const upstream=await env.V7_BASE.fetch(request);
  const url=new URL(request.url);
  if(request.method!=='GET'||!upstream.ok||
    !['/','/mijn-leven','/present','/present/'].includes(url.pathname)||
    !(upstream.headers.get('content-type')||'').includes('text/html'))return upstream;
  const original=await upstream.text();
  if(!original.includes('</head>')||!original.includes('</body>'))return new Response(original,{status:upstream.status,headers:upstream.headers});
  const html=original.replace('</head>','<style id="talera-v8-handoff-style">'+HANDOFF_STYLE+'</style></head>')
    .replace('</body>','<script id="talera-v8-handoff-script">'+HANDOFF_SCRIPT+'</script></body>');
  const headers=new Headers(upstream.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
  headers.set('cache-control','no-store');
  headers.set('x-talera-v8-first-frame','image-ready-handoff');
  return new Response(html,{status:upstream.status,statusText:upstream.statusText,headers});
 }
};