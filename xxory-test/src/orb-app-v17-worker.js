import baseWorker from "./worker.js";

const ORB_V17_STYLE = String.raw`
/* TALERA ORB v17 — same stable direct integration; more translucent organic material. */
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
  overflow:hidden!important;
  border-radius:48% 52% 49% 51% / 52% 47% 53% 48%!important;
  background:
    radial-gradient(ellipse at 31% 27%,rgba(247,252,255,.76) 0 6%,rgba(225,240,249,.38) 15%,transparent 31%),
    radial-gradient(ellipse at 69% 33%,rgba(211,232,244,.32) 0 13%,rgba(151,194,219,.22) 29%,transparent 52%),
    radial-gradient(ellipse at 35% 71%,rgba(225,240,248,.32) 0 13%,rgba(117,168,199,.22) 34%,transparent 57%),
    radial-gradient(ellipse at 73% 72%,rgba(84,142,179,.34) 0 12%,rgba(72,126,162,.16) 30%,transparent 49%),
    radial-gradient(circle at 50% 48%,#b5d5e6 0%,#92bdd4 37%,#72a7c5 67%,#517f9f 100%)!important;
  box-shadow:
    0 16px 46px rgba(15,39,71,.09),
    inset 9px 8px 24px rgba(255,255,255,.15),
    inset -13px -16px 25px rgba(15,39,71,.075)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.11 + var(--voice)*.03))!important;
  transition:transform .35s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb17Body 9s ease-in-out infinite!important;
}
.core::before{
  content:""!important;
  display:block!important;
  position:absolute!important;
  width:118%!important;
  height:118%!important;
  left:-9%!important;
  top:-9%!important;
  border-radius:46% 54% 52% 48% / 55% 44% 56% 45%!important;
  background:
    radial-gradient(ellipse at 27% 31%,rgba(247,252,255,.46) 0 8%,rgba(225,241,249,.22) 20%,transparent 39%),
    radial-gradient(ellipse at 62% 28%,rgba(220,238,247,.34) 0 9%,rgba(174,210,229,.20) 24%,transparent 45%),
    radial-gradient(ellipse at 70% 63%,rgba(207,230,242,.29) 0 11%,rgba(91,151,188,.18) 31%,transparent 51%),
    radial-gradient(ellipse at 33% 72%,rgba(233,245,250,.24) 0 10%,rgba(117,172,203,.18) 30%,transparent 53%)!important;
  filter:blur(9px)!important;
  opacity:.88!important;
  transform:translate(-3%,-2%) scale(1.02)!important;
  animation:taleraOrb17Clouds 13s ease-in-out infinite alternate!important;
  pointer-events:none!important;
}
.core::after{
  content:""!important;
  display:block!important;
  position:absolute!important;
  width:96%!important;
  height:96%!important;
  left:2%!important;
  top:2%!important;
  border-radius:50%!important;
  background:
    radial-gradient(ellipse at 36% 35%,rgba(255,255,255,.46) 0 5%,rgba(245,252,255,.18) 14%,transparent 30%),
    radial-gradient(ellipse at 57% 55%,rgba(238,248,252,.20) 0 9%,transparent 29%),
    radial-gradient(ellipse at 71% 70%,rgba(224,240,248,.18) 0 7%,rgba(91,151,188,.10) 23%,transparent 42%)!important;
  filter:blur(4px)!important;
  opacity:.76!important;
  transform:translate(-4%,-4%)!important;
  animation:taleraOrb17Light 11s ease-in-out infinite alternate!important;
  box-shadow:inset 0 0 0 1px rgba(72,126,160,.06)!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v17";
  font-size:9px;
  opacity:.28;
  vertical-align:middle;
}
@keyframes taleraOrb17Body{
  0%,100%{border-radius:48% 52% 49% 51% / 52% 47% 53% 48%}
  34%{border-radius:51% 49% 52% 48% / 49% 53% 47% 51%}
  67%{border-radius:49% 51% 47% 53% / 53% 49% 51% 47%}
}
@keyframes taleraOrb17Clouds{
  0%{transform:translate(-5%,-3%) scale(1.01) rotate(-.4deg);opacity:.76}
  48%{transform:translate(4%,1%) scale(1.055) rotate(.35deg);opacity:.92}
  100%{transform:translate(-1%,5%) scale(1.025) rotate(-.15deg);opacity:.82}
}
@keyframes taleraOrb17Light{
  0%{transform:translate(-6%,-5%) scale(.97);opacity:.58}
  45%{transform:translate(5%,-1%) scale(1.035);opacity:.78}
  100%{transform:translate(0%,5%) scale(.99);opacity:.66}
}
`;

function enhance(html){
  return html.replace('</head>','<style>'+ORB_V17_STYLE+'</style></head>');
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
    headers.set('x-talera-orb-app','organic-v17-direct-base-material');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
