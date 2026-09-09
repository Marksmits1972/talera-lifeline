import previousWorker from "./orb-app-v14-worker.js";

const SOLID_ORB_STYLE = String.raw`
/* TALERA ORB app v15 — visible organic core is CSS-native; WebGL is enhancement only. */
.core-wrap{
  position:relative!important;
  width:min(58vw,250px)!important;
  min-width:190px!important;
  min-height:190px!important;
  aspect-ratio:1/1!important;
  display:grid!important;
  place-items:center!important;
  overflow:visible!important;
  isolation:isolate!important;
}
.core-wrap::before{
  content:""!important;
  display:block!important;
  position:absolute!important;
  width:78%!important;
  height:78%!important;
  left:11%!important;
  top:11%!important;
  border-radius:48% 52% 50% 50% / 51% 47% 53% 49%!important;
  background:
    radial-gradient(circle at 31% 26%,rgba(249,253,255,.98) 0 7%,rgba(225,240,249,.80) 17%,transparent 34%),
    radial-gradient(circle at 66% 38%,rgba(244,251,255,.70) 0 9%,rgba(188,218,235,.48) 26%,transparent 47%),
    radial-gradient(circle at 39% 70%,rgba(218,237,247,.66) 0 12%,rgba(124,174,205,.32) 35%,transparent 56%),
    radial-gradient(circle at 72% 73%,rgba(101,157,191,.52) 0 13%,transparent 39%),
    radial-gradient(circle at 47% 48%,#b9d8e9 0%,#8bbbd5 42%,#669cbe 72%,#4e7fa3 100%)!important;
  box-shadow:
    0 18px 50px rgba(15,39,71,.10),
    inset 13px 10px 30px rgba(255,255,255,.22),
    inset -14px -18px 28px rgba(15,39,71,.08)!important;
  opacity:1!important;
  visibility:visible!important;
  z-index:5!important;
  transform:scale(.99)!important;
  animation:taleraCssOrbBody 9s ease-in-out infinite!important;
  pointer-events:none!important;
}
.core-wrap::after{
  content:""!important;
  display:block!important;
  position:absolute!important;
  width:66%!important;
  height:66%!important;
  left:17%!important;
  top:17%!important;
  border-radius:50%!important;
  background:
    radial-gradient(circle at 32% 38%,rgba(255,255,255,.72) 0 7%,rgba(233,246,252,.34) 22%,transparent 43%),
    radial-gradient(circle at 70% 62%,rgba(231,244,251,.34) 0 8%,rgba(115,169,201,.20) 29%,transparent 49%)!important;
  filter:blur(5px)!important;
  opacity:.78!important;
  visibility:visible!important;
  z-index:6!important;
  animation:taleraCssOrbLight 11s ease-in-out infinite alternate!important;
  pointer-events:none!important;
}
/* v14's JS-created flat fallback is no longer needed; the CSS core above is always present. */
.talera-orb-fallback{opacity:0!important;visibility:hidden!important}
.talera-orb-live{z-index:12!important}
.talera-orb-canvas{z-index:13!important}
@keyframes taleraCssOrbBody{
  0%,100%{transform:scale(.985) rotate(-.15deg);border-radius:48% 52% 50% 50% / 51% 47% 53% 49%}
  34%{transform:scale(1.008) rotate(.20deg);border-radius:50% 50% 48% 52% / 49% 52% 48% 51%}
  68%{transform:scale(.997) rotate(-.08deg);border-radius:49% 51% 52% 48% / 52% 48% 51% 49%}
}
@keyframes taleraCssOrbLight{
  0%{transform:translate(-5%,-3%) scale(.96);opacity:.62}
  45%{transform:translate(6%,2%) scale(1.04);opacity:.84}
  100%{transform:translate(-1%,6%) scale(.99);opacity:.70}
}
`;

function enhance(html){
  return html.replace('</head>','<style>'+SOLID_ORB_STYLE+'</style></head>');
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
    headers.set('x-talera-orb-app','organic-v15-css-solid');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
