import previousWorker from "./orb-app-v10-worker.js";

const SAFETY_STYLE = String.raw`
/* TALERA ORB app v11 — never hide the visible core before WebGL has a chance to render. */
.core,.core.active,.core.listening{
  width:100%!important;
  height:100%!important;
  position:relative!important;
  background:transparent!important;
  box-shadow:none!important;
  border:0!important;
  border-radius:0!important;
  overflow:visible!important;
  isolation:isolate!important;
  animation:none!important;
  transform:none!important;
  filter:none!important;
}
.core::before{
  content:""!important;
  display:block!important;
  position:absolute!important;
  inset:8%!important;
  border-radius:50%!important;
  background:radial-gradient(circle at 40% 34%,rgba(225,240,249,.96) 0%,rgba(183,216,234,.94) 42%,rgba(112,166,199,.92) 74%,rgba(79,130,167,.88) 100%)!important;
  box-shadow:0 18px 48px rgba(15,39,71,.08)!important;
  filter:none!important;
  transform:none!important;
  z-index:1!important;
  opacity:.82!important;
}
.core::after{display:none!important;content:none!important}
.talera-organic-orb{
  z-index:2!important;
  opacity:1!important;
  visibility:visible!important;
}
.core.talera-webgl-fallback::before{
  opacity:1!important;
}
`;

function enhance(html){
  return html.replace('</head>','<style>'+SAFETY_STYLE+'</style></head>');
}

export default {
  async fetch(request,env,ctx){
    const response=await previousWorker.fetch(request,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(request.method==='HEAD'||!type.includes('text/html'))return response;
    const html=await response.text();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control','no-store');
    headers.set('x-talera-orb-app','organic-v11-safe-underlay');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
