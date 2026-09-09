import baseWorker from "./worker.js";

const ORB_V18_STYLE = String.raw`
/* TALERA ORB v18 — clean direct integration: richer living cycle, moving inner light, stronger heartbeat-breath. */
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
  border-radius:47% 53% 50% 50% / 52% 46% 54% 48%!important;
  background:
    radial-gradient(ellipse at 25% 24%,rgba(247,252,255,.54) 0 5%,rgba(225,240,249,.23) 16%,transparent 33%),
    radial-gradient(ellipse at 70% 31%,rgba(213,234,245,.28) 0 11%,rgba(153,198,221,.18) 29%,transparent 51%),
    radial-gradient(ellipse at 32% 72%,rgba(231,243,249,.26) 0 12%,rgba(112,168,201,.19) 35%,transparent 57%),
    radial-gradient(ellipse at 74% 73%,rgba(78,137,176,.29) 0 11%,rgba(64,116,153,.14) 31%,transparent 50%),
    radial-gradient(circle at 49% 48%,#b2d4e6 0%,#91bdd5 36%,#6fa6c5 67%,#4c7c9e 100%)!important;
  background-size:118% 118%,122% 122%,126% 126%,120% 120%,100% 100%!important;
  background-position:44% 43%,54% 47%,48% 55%,54% 54%,50% 50%!important;
  box-shadow:
    0 16px 48px rgba(15,39,71,.085),
    inset 8px 7px 22px rgba(255,255,255,.12),
    inset -13px -16px 25px rgba(15,39,71,.075),
    0 0 26px rgba(128,186,218,.12)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.11 + var(--voice)*.03))!important;
  transition:transform .30s cubic-bezier(.18,.72,.2,1)!important;
  animation-name:taleraOrb18Shape,taleraOrb18Pulse,taleraOrb18BaseDrift!important;
  animation-duration:8.4s,8.4s,15s!important;
  animation-timing-function:ease-in-out,cubic-bezier(.42,0,.30,1),ease-in-out!important;
  animation-iteration-count:infinite,infinite,infinite!important;
}
.core.active,.core.listening{
  animation-duration:5.8s,5.8s,10s!important;
}

/* Main internal cloud body: several translucent masses slowly cross through each other. */
.core::before{
  content:""!important;
  display:block!important;
  position:absolute!important;
  width:138%!important;
  height:138%!important;
  left:-19%!important;
  top:-19%!important;
  border-radius:45% 55% 51% 49% / 55% 44% 56% 45%!important;
  background:
    radial-gradient(ellipse at 22% 29%,rgba(248,253,255,.48) 0 7%,rgba(228,243,250,.26) 18%,rgba(182,216,234,.12) 31%,transparent 46%),
    radial-gradient(ellipse at 59% 25%,rgba(236,248,253,.38) 0 8%,rgba(193,224,239,.24) 23%,rgba(126,180,210,.11) 38%,transparent 53%),
    radial-gradient(ellipse at 76% 57%,rgba(223,240,248,.33) 0 10%,rgba(151,197,220,.21) 25%,rgba(83,144,181,.11) 42%,transparent 56%),
    radial-gradient(ellipse at 35% 72%,rgba(244,250,253,.32) 0 9%,rgba(191,220,235,.22) 24%,rgba(108,165,198,.12) 40%,transparent 56%),
    radial-gradient(ellipse at 52% 52%,rgba(205,232,245,.20) 0 14%,rgba(115,171,203,.12) 34%,transparent 55%)!important;
  background-size:76% 72%,82% 76%,80% 84%,82% 78%,92% 92%!important;
  background-repeat:no-repeat!important;
  background-position:8% 9%,63% 8%,68% 59%,4% 65%,45% 43%!important;
  filter:blur(7px)!important;
  opacity:.94!important;
  animation:taleraOrb18CloudCycle 12.5s ease-in-out infinite alternate!important;
  pointer-events:none!important;
}
.core.active::before,.core.listening::before{
  animation-duration:8.2s!important;
  opacity:.98!important;
}

/* Moving internal flashlight: a compact white core with a larger pale-blue transmission halo. */
.core::after{
  content:""!important;
  display:block!important;
  position:absolute!important;
  width:62%!important;
  height:62%!important;
  left:17%!important;
  top:17%!important;
  border-radius:50%!important;
  background:
    radial-gradient(circle at 48% 48%,
      rgba(255,255,255,.98) 0 5%,
      rgba(250,254,255,.90) 8%,
      rgba(229,245,252,.58) 20%,
      rgba(177,216,236,.28) 35%,
      rgba(113,174,207,.10) 51%,
      transparent 68%),
    radial-gradient(ellipse at 54% 51%,rgba(255,255,255,.38) 0 12%,rgba(220,240,250,.18) 31%,transparent 62%)!important;
  filter:blur(3px)!important;
  opacity:.86!important;
  box-shadow:0 0 22px rgba(239,249,255,.22)!important;
  animation:taleraOrb18Flashlight 10.8s cubic-bezier(.45,.05,.40,.96) infinite alternate!important;
  pointer-events:none!important;
}
.core.active::after,.core.listening::after{
  animation-duration:7.2s!important;
  opacity:.94!important;
}

.status::after{
  content:"  · v18";
  font-size:9px;
  opacity:.28;
  vertical-align:middle;
}

/* The silhouette itself changes only a little: alive, never jelly-like. */
@keyframes taleraOrb18Shape{
  0%,100%{border-radius:47% 53% 50% 50% / 52% 46% 54% 48%}
  31%{border-radius:50% 50% 47% 53% / 49% 54% 46% 51%}
  63%{border-radius:48% 52% 53% 47% / 54% 48% 52% 46%}
}

/* A clearly perceptible but calm heart/breath pulse. The independent `scale` property combines with voice/awake transform. */
@keyframes taleraOrb18Pulse{
  0%,18%,100%{scale:.988}
  43%{scale:1.010}
  52%{scale:1.030}
  61%{scale:1.004}
  69%{scale:1.016}
  79%{scale:1.000}
}

/* Slow base-material drift keeps the surface from reading as a fixed painted gradient. */
@keyframes taleraOrb18BaseDrift{
  0%,100%{background-position:44% 43%,54% 47%,48% 55%,54% 54%,50% 50%}
  38%{background-position:49% 47%,49% 43%,53% 50%,49% 58%,50% 50%}
  72%{background-position:41% 49%,58% 51%,45% 51%,58% 49%,50% 50%}
}

@keyframes taleraOrb18CloudCycle{
  0%{
    transform:translate(-6%,-4%) scale(1.00) rotate(-.45deg);
    background-position:8% 9%,63% 8%,68% 59%,4% 65%,45% 43%;
  }
  34%{
    transform:translate(3%,-1%) scale(1.045) rotate(.20deg);
    background-position:18% 17%,53% 15%,61% 51%,12% 55%,51% 47%;
  }
  68%{
    transform:translate(5%,5%) scale(1.02) rotate(.48deg);
    background-position:14% 27%,60% 21%,57% 63%,18% 59%,47% 53%;
  }
  100%{
    transform:translate(-2%,6%) scale(1.055) rotate(-.10deg);
    background-position:23% 18%,49% 26%,64% 55%,8% 51%,54% 48%;
  }
}

@keyframes taleraOrb18Flashlight{
  0%{transform:translate(-28%,-24%) scale(.88);opacity:.72}
  26%{transform:translate(-6%,-14%) scale(1.00);opacity:.92}
  52%{transform:translate(24%,2%) scale(1.08);opacity:1}
  76%{transform:translate(8%,25%) scale(.96);opacity:.88}
  100%{transform:translate(-20%,13%) scale(1.03);opacity:.94}
}
`;

function enhance(html){
  return html.replace('</head>','<style>'+ORB_V18_STYLE+'</style></head>');
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
    headers.set('x-talera-orb-app','organic-v18-direct-living-light');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
