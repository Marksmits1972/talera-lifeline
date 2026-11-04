/* TALERA V5: restore direct native /tell access. No editor patching whatsoever. */
const PENCIL_JS="(()=>{\n'use strict';\nconst paths=['/','/mijn-leven','/present','/present/'];\nif(!paths.includes(location.pathname))return;\nlet tries=0;\nfunction mount(){\n const rt=window.__taleraTimelineRuntime;\n if(!rt||typeof rt.currentMemory!=='function'){\n  if(++tries<60)setTimeout(mount,100);\n  return;\n }\n if(document.getElementById('talera-v5-editor-pencil'))return;\n const pencil=document.createElement('button');\n pencil.id='talera-v5-editor-pencil';\n pencil.type='button';\n pencil.textContent='✎';\n pencil.setAttribute('aria-label','Actieve herinnering bewerken');\n pencil.title='Herinnering bewerken';\n pencil.addEventListener('click',()=>{\n   const current=rt.currentMemory();\n   // Only truly persisted own memories can be edited by the existing editor.\n   // The timeline's generated example IDs are not records in TaleraMemories.\n   const recordId=current?._taleraLocal?current.storyId:\n     current?._taleraLive&&current._manageToken?current.storyId:null;\n   if(!recordId)return;\n   if(current._taleraLive&&current._manageToken){\n      location.assign('/tell?edit='+encodeURIComponent(recordId)+'#token='+encodeURIComponent(current._manageToken));\n   }else{\n      location.assign('/tell?edit='+encodeURIComponent(recordId));\n   }\n });\n document.body.append(pencil);\n for(const el of document.querySelectorAll('#talera-v30-edit,.talera-memory-edit')){\n   el.style.setProperty('display','none','important');\n }\n}\nif(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});\nelse mount();\n})();";
const PENCIL_CSS="#talera-v5-editor-pencil{position:fixed!important;top:var(--talera-v27-back-y,116px)!important;right:15px!important;z-index:63!important;width:45px!important;height:45px!important;display:grid!important;place-items:center!important;border:1px solid rgba(255,255,255,.7)!important;border-radius:50%!important;background:rgba(18,46,63,.52)!important;color:#fff!important;font:500 23px/1 system-ui!important;backdrop-filter:blur(9px)!important;-webkit-backdrop-filter:blur(9px)!important;box-shadow:0 2px 8px rgba(0,0,0,.12)!important;touch-action:manipulation!important;cursor:pointer!important}";
export default {
 async fetch(request,env){
  if(!env?.R20_BASE?.fetch)return new Response('Goedgekeurde R20 servicebinding ontbreekt',{status:503});
  const upstream=await env.R20_BASE.fetch(request);
  if(request.method!=='GET'||!upstream.ok)return upstream;
  const url=new URL(request.url);
  // In particular, /tell and /tell?edit=... must pass through untouched.
  if(!['/','/mijn-leven','/present','/present/'].includes(url.pathname))return upstream;
  if(!(upstream.headers.get('content-type')||'').includes('text/html'))return upstream;
  const original=await upstream.text();
  if(!original.includes('</head>')||!original.includes('</body>')){
   return new Response(original,{status:upstream.status,statusText:upstream.statusText,headers:upstream.headers});
  }
  const html=original
    .replace('</head>','<style id="talera-v5-pencil-style">'+PENCIL_CSS+'</style></head>')
    .replace('</body>','<script id="talera-v5-pencil-script">'+PENCIL_JS+'</script></body>');
  const headers=new Headers(upstream.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
  headers.set('cache-control','no-store');
  headers.set('x-talera-dev-version','v5-direct-native-editor');
  return new Response(html,{status:upstream.status,statusText:upstream.statusText,headers});
 }
};