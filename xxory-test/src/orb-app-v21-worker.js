import baseWorker from "./worker.js";

const ORB_V21_STYLE = String.raw`
/* TALERA ORB v21 — living cloud layers calibration. Directly on worker.js. */
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
  width:80%!important;
  height:80%!important;
  position:relative!important;
  opacity:1!important;
  visibility:visible!important;
  overflow:hidden!important;
  isolation:isolate!important;
  border-radius:47% 53% 49% 51% / 52% 46% 54% 48%!important;

  /* Layer A: slow deep cloud body. Large masses drift independently. */
  background:
    radial-gradient(ellipse at 14% 20%,rgba(246,252,255,.66) 0 7%,rgba(210,234,246,.34) 17%,rgba(151,194,218,.14) 30%,transparent 43%),
    radial-gradient(ellipse at 77% 18%,rgba(221,241,250,.52) 0 9%,rgba(150,198,222,.27) 21%,rgba(79,140,178,.12) 34%,transparent 46%),
    radial-gradient(ellipse at 25% 78%,rgba(232,246,252,.54) 0 10%,rgba(158,201,224,.28) 22%,rgba(82,143,178,.14) 35%,transparent 48%),
    radial-gradient(ellipse at 78% 73%,rgba(70,128,166,.34) 0 10%,rgba(47,96,133,.20) 24%,transparent 43%),
    radial-gradient(ellipse at 45% 48%,rgba(67,126,164,.24) 0 11%,rgba(47,94,129,.14) 24%,transparent 39%),
    linear-gradient(137deg,#c5e1ed 0%,#95c2d7 31%,#6ea5c3 63%,#48799a 100%)!important;
  background-size:138% 132%,134% 136%,142% 138%,132% 136%,128% 126%,100% 100%!important;
  background-position:24% 24%,73% 24%,28% 72%,72% 70%,46% 48%,50% 50%!important;
  background-repeat:no-repeat!important;
  box-shadow:
    0 18px 54px rgba(15,39,71,.10),
    0 0 20px rgba(100,176,215,.40),
    0 0 48px rgba(100,176,215,.25),
    0 0 82px rgba(100,176,215,.12),
    inset 10px 9px 24px rgba(255,255,255,.10),
    inset -16px -19px 30px rgba(15,39,71,.12)!important;
  transform:scale(calc(.985 + var(--awake)*.135 + var(--voice)*.055))!important;
  transition:transform .22s cubic-bezier(.18,.72,.2,1)!important;
  animation:
    taleraOrb21Shape 7.6s ease-in-out infinite,
    taleraOrb21Heartbeat 5.6s cubic-bezier(.42,0,.30,1) infinite,
    taleraOrb21DeepFlow 17s ease-in-out infinite alternate,
    taleraOrb21Aura 7.2s ease-in-out infinite!important;
}
.core.active,.core.listening{
  animation-duration:5.2s,4.2s,11.5s,5.2s!important;
}

/* Layer B: mid-depth cloud ribbons. Sharper, asymmetric, and faster than Layer A. */
.core::before{
  content:""!important;
  display:block!important;
  position:absolute!important;
  width:162%!important;
  height:162%!important;
  left:-31%!important;
  top:-31%!important;
  border-radius:43% 57% 49% 51% / 57% 42% 58% 43%!important;
  background:
    radial-gradient(ellipse at 10% 18%,rgba(255,255,255,.86) 0 5%,rgba(239,250,254,.72) 10%,rgba(204,231,245,.34) 18%,rgba(159,202,225,.11) 27%,transparent 35%),
    radial-gradient(ellipse at 43% 10%,rgba(249,254,255,.78) 0 6%,rgba(223,242,250,.60) 13%,rgba(166,207,230,.28) 23%,transparent 34%),
    radial-gradient(ellipse at 82% 32%,rgba(231,247,253,.74) 0 7%,rgba(190,224,241,.48) 15%,rgba(114,176,209,.22) 25%,transparent 37%),
    radial-gradient(ellipse at 70% 77%,rgba(246,252,255,.82) 0 6%,rgba(216,238,249,.56) 14%,rgba(145,195,220,.24) 25%,transparent 37%),
    radial-gradient(ellipse at 19% 76%,rgba(253,255,255,.78) 0 6%,rgba(223,241,250,.54) 13%,rgba(144,194,220,.23) 23%,transparent 35%),
    radial-gradient(ellipse at 49% 43%,rgba(56,112,151,.38) 0 6%,rgba(43,88,124,.24) 15%,transparent 27%),
    radial-gradient(ellipse at 75% 58%,rgba(48,103,142,.34) 0 7%,rgba(37,78,112,.20) 16%,transparent 29%),
    radial-gradient(ellipse at 31% 55%,rgba(244,252,255,.44) 0 9%,rgba(168,213,234,.22) 18%,transparent 31%)!important;
  background-size:62% 48%,67% 52%,65% 58%,63% 54%,61% 50%,46% 40%,44% 38%,65% 56%!important;
  background-position:-2% 7%,34% -1%,69% 20%,57% 69%,1% 66%,31% 35%,71% 53%,27% 46%!important;
  background-repeat:no-repeat!important;
  background-blend-mode:screen,screen,screen,screen,screen,multiply,multiply,screen!important;
  filter:blur(1.1px)!important;
  opacity:.96!important;
  mix-blend-mode:normal!important;
  animation:taleraOrb21MidFlow 9.2s cubic-bezier(.45,.05,.40,.96) infinite alternate!important;
  pointer-events:none!important;
  z-index:1!important;
}
.core.active::before,.core.listening::before{
  animation-duration:6.0s!important;
  opacity:1!important;
}

/* Layer C: front mist plus a softer moving lamp. Individual backgrounds move on different paths. */
.core::after{
  content:""!important;
  display:block!important;
  position:absolute!important;
  width:122%!important;
  height:122%!important;
  left:-11%!important;
  top:-11%!important;
  border-radius:46% 54% 50% 50% / 53% 46% 54% 47%!important;
  background:
    radial-gradient(ellipse at 18% 25%,rgba(255,255,255,.48) 0 5%,rgba(235,249,254,.31) 11%,transparent 24%),
    radial-gradient(ellipse at 76% 68%,rgba(245,253,255,.42) 0 6%,rgba(211,238,249,.25) 13%,transparent 27%),
    radial-gradient(ellipse at 48% 76%,rgba(235,249,253,.34) 0 6%,rgba(180,220,239,.18) 14%,transparent 27%),
    radial-gradient(circle at 50% 50%,rgba(255,255,255,.82) 0 3.5%,rgba(255,251,240,.70) 6%,rgba(234,248,253,.50) 11%,rgba(183,222,240,.24) 19%,rgba(116,180,212,.09) 29%,transparent 43%)!important;
  background-size:58% 46%,54% 44%,52% 42%,45% 45%!important;
  background-position:2% 9%,69% 65%,31% 73%,37% 31%!important;
  background-repeat:no-repeat!important;
  filter:blur(1.4px)!important;
  opacity:.76!important;
  mix-blend-mode:screen!important;
  animation:taleraOrb21FrontFlow 6.4s ease-in-out infinite!important;
  pointer-events:none!important;
  z-index:2!important;
}
.core.active::after,.core.listening::after{
  animation-duration:4.6s!important;
  opacity:.84!important;
}

.status::after{
  content:"  · v21";
  font-size:9px;
  opacity:.32;
  vertical-align:middle;
}

@keyframes taleraOrb21Shape{
  0%,100%{border-radius:47% 53% 49% 51% / 52% 46% 54% 48%}
  30%{border-radius:52% 48% 46% 54% / 48% 55% 45% 52%}
  64%{border-radius:48% 52% 54% 46% / 55% 47% 53% 45%}
}

@keyframes taleraOrb21Heartbeat{
  0%,12%,100%{scale:.972}
  30%{scale:.993}
  40%{scale:1.048}
  50%{scale:.992}
  61%{scale:1.030}
  74%{scale:.984}
}

@keyframes taleraOrb21Aura{
  0%,100%{
    box-shadow:0 18px 54px rgba(15,39,71,.10),0 0 18px rgba(100,176,215,.34),0 0 44px rgba(100,176,215,.21),0 0 78px rgba(100,176,215,.10),inset 10px 9px 24px rgba(255,255,255,.10),inset -16px -19px 30px rgba(15,39,71,.12);
  }
  48%{
    box-shadow:0 20px 58px rgba(15,39,71,.11),0 0 26px rgba(100,176,215,.48),0 0 58px rgba(100,176,215,.30),0 0 92px rgba(100,176,215,.15),inset 10px 9px 24px rgba(255,255,255,.11),inset -16px -19px 30px rgba(15,39,71,.12);
  }
}

@keyframes taleraOrb21DeepFlow{
  0%{background-position:24% 24%,73% 24%,28% 72%,72% 70%,46% 48%,50% 50%}
  28%{background-position:33% 29%,66% 18%,35% 64%,78% 61%,40% 54%,50% 50%}
  57%{background-position:18% 35%,79% 31%,22% 79%,65% 76%,53% 42%,50% 50%}
  82%{background-position:31% 18%,61% 35%,38% 68%,76% 80%,44% 45%,50% 50%}
  100%{background-position:20% 30%,76% 16%,31% 75%,68% 63%,50% 55%,50% 50%}
}

@keyframes taleraOrb21MidFlow{
  0%{
    transform:translate(-9%,-6%) scale(1.02) rotate(-1.0deg);
    background-position:-2% 7%,34% -1%,69% 20%,57% 69%,1% 66%,31% 35%,71% 53%,27% 46%;
  }
  22%{
    transform:translate(4%,-4%) scale(1.08) rotate(.45deg);
    background-position:12% 14%,43% 8%,58% 30%,66% 58%,13% 55%,39% 44%,62% 64%,38% 52%;
  }
  48%{
    transform:translate(8%,5%) scale(1.04) rotate(1.0deg);
    background-position:4% 24%,55% 16%,64% 41%,52% 74%,23% 63%,28% 52%,76% 46%,45% 60%;
  }
  73%{
    transform:translate(-2%,9%) scale(1.10) rotate(-.55deg);
    background-position:20% 9%,31% 21%,74% 26%,68% 64%,6% 73%,46% 36%,59% 59%,55% 41%;
  }
  100%{
    transform:translate(-7%,1%) scale(1.05) rotate(.20deg);
    background-position:7% 20%,50% 3%,57% 38%,50% 60%,19% 55%,34% 47%,69% 66%,42% 49%;
  }
}

@keyframes taleraOrb21FrontFlow{
  0%{
    transform:translate(-5%,-4%) scale(.98) rotate(-.6deg);
    background-position:2% 9%,69% 65%,31% 73%,37% 31%;
    opacity:.66;
  }
  20%{
    transform:translate(4%,-7%) scale(1.02) rotate(.3deg);
    background-position:13% 18%,61% 54%,41% 68%,50% 23%;
    opacity:.82;
  }
  43%{
    transform:translate(7%,2%) scale(1.05) rotate(.8deg);
    background-position:22% 28%,75% 49%,34% 57%,65% 38%;
    opacity:.72;
  }
  66%{
    transform:translate(1%,8%) scale(1.01) rotate(-.2deg);
    background-position:8% 35%,65% 73%,49% 66%,57% 61%;
    opacity:.86;
  }
  84%{
    transform:translate(-7%,5%) scale(1.04) rotate(-.8deg);
    background-position:17% 16%,57% 62%,26% 79%,31% 55%;
    opacity:.74;
  }
  100%{
    transform:translate(-5%,-4%) scale(.98) rotate(-.6deg);
    background-position:2% 9%,69% 65%,31% 73%,37% 31%;
    opacity:.66;
  }
}
`;

function enhance(html){
  return html.replace('</head>','<style>'+ORB_V21_STYLE+'</style></head>');
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
    headers.set('x-talera-orb-app','organic-v21-direct-living-cloud-layers');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
