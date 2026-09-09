import baseWorker from "./worker.js";

const ORB_V16_STYLE = String.raw`
/* TALERA ORB v16 — clean direct integration on the base vertel worker. */
.core-wrap{
  position:relative!important;
  width:min(58vw,250px)!important;
  min-width:190px!important;
  min-height:190px!important;
  aspect-ratio:1/1!important;
  display:grid!important;
  place-items:center!important;
  overflow:visible!important;
}
.halo{display:none!important}
.core,.core.active,.core.listening{
  display:block!important;
  width:78%!important;
  height:78%!important;
  position:relative!important;
  opacity:1!important;
  visibility:visible!important;
  border-radius:49% 51% 50% 50% / 51% 48% 52% 49%!important;
  overflow:hidden!important;
  background:
    radial-gradient(circle at 30% 25%,rgba(252,254,255,.98) 0 7%,rgba(231,244,250,.82) 16%,transparent 31%),
    radial-gradient(circle at 66% 35%,rgba(241,249,253,.76) 0 10%,rgba(190,220,236,.52) 27%,transparent 48%),
    radial-gradient(circle at 38% 70%,rgba(219,237,246,.70) 0 12%,rgba(124,174,205,.34) 36%,transparent 58%),
    radial-gradient(circle at 73% 73%,rgba(94,151,187,.50) 0 13%,transparent 40%),
    radial-gradient(circle at 48% 48%,#beddea 0%,#93bfd6 42%,#6ca2c1 72%,#4d7fa4 100%)!important;
  box-shadow:
    0 18px 50px rgba(15,39,71,.11),
    inset 13px 10px 30px rgba(255,255,255,.24),
    inset -14px -18px 28px rgba(15,39,71,.08)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.11 + var(--voice)*.03))!important;
  transition:transform .35s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb16Breath 8.5s ease-in-out infinite!important;
}
.core::before{
  content:""!important;
  display:block!important;
  position:absolute!important;
  width:68%!important;height:68%!important;
  left:16%!important;top:16%!important;
  border-radius:50%!important;
  background:
    radial-gradient(circle at 30% 36%,rgba(255,255,255,.72) 0 8%,rgba(235,247,252,.35) 23%,transparent 44%),
    radial-gradient(circle at 71% 64%,rgba(230,243,250,.36) 0 9%,rgba(111,166,198,.22) 31%,transparent 50%)!important;
  filter:blur(4px)!important;
  opacity:.82!important;
  animation:taleraOrb16Light 10s ease-in-out infinite alternate!important;
}
.core::after{
  content:""!important;
  display:block!important;
  position:absolute!important;
  inset:0!important;
  border-radius:inherit!important;
  box-shadow:inset 0 0 0 1px rgba(72,126,160,.10)!important;
  background:transparent!important;
}
.status::after{
  content:"  · v16";
  font-size:9px;
  opacity:.28;
  vertical-align:middle;
}
@keyframes taleraOrb16Breath{
  0%,100%{border-radius:49% 51% 50% 50% / 51% 48% 52% 49%}
  50%{border-radius:51% 49% 48% 52% / 49% 52% 48% 51%}
}
@keyframes taleraOrb16Light{
  0%{transform:translate(-5%,-3%) scale(.96);opacity:.64}
  50%{transform:translate(6%,2%) scale(1.04);opacity:.86}
  100%{transform:translate(-1%,6%) scale(.99);opacity:.70}
}
`;

function enhance(html){
  return html.replace('</head>','<style>'+ORB_V16_STYLE+'</style></head>');
}

export default {
  async fetch(request,env,ctx){
    const response=await baseWorker.fetch(request,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(request.method==='HEAD'||!type.includes('text/html'))return response;
    const html=await response.text();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control','no-store');
    headers.set('x-talera-orb-app','organic-v16-direct-base');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
