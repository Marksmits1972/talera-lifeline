import baseWorker from "./worker.js";

const ORB_V20_STYLE = String.raw`
/* TALERA ORB v20 — cloud-structure calibration build. Directly on worker.js. */
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
  background:
    radial-gradient(ellipse at 17% 26%,rgba(242,251,255,.62) 0 8%,rgba(192,224,240,.24) 22%,transparent 38%),
    radial-gradient(ellipse at 72% 20%,rgba(205,234,247,.44) 0 9%,rgba(116,175,208,.20) 24%,transparent 42%),
    radial-gradient(ellipse at 34% 77%,rgba(229,245,251,.48) 0 10%,rgba(128,184,214,.21) 26%,transparent 45%),
    radial-gradient(ellipse at 78% 73%,rgba(74,135,175,.28) 0 11%,rgba(52,101,138,.13) 31%,transparent 51%),
    linear-gradient(136deg,#bdddea 0%,#91bfd6 33%,#6ca3c2 65%,#497b9d 100%)!important;
  background-size:132% 132%,126% 126%,134% 134%,128% 128%,100% 100%!important;
  background-position:34% 32%,62% 32%,36% 68%,66% 66%,50% 50%!important;
  box-shadow:
    0 18px 54px rgba(15,39,71,.10),
    0 0 18px rgba(100,176,215,.34),
    0 0 42px rgba(100,176,215,.22),
    0 0 72px rgba(100,176,215,.10),
    inset 10px 9px 24px rgba(255,255,255,.10),
    inset -16px -19px 30px rgba(15,39,71,.12)!important;
  transform:scale(calc(.985 + var(--awake)*.135 + var(--voice)*.055))!important;
  transition:transform .22s cubic-bezier(.18,.72,.2,1)!important;
  animation:
    taleraOrb20Shape 7.6s ease-in-out infinite,
    taleraOrb20Heartbeat 5.6s cubic-bezier(.42,0,.30,1) infinite,
    taleraOrb20Aura 6.8s ease-in-out infinite!important;
}
.core.active,.core.listening{
  animation-duration:5.2s,4.2s,5.0s!important;
}

/* Sharper irregular cloud islands. Less blur than v19 so the cloud edges stay readable. */
.core::before{
  content:""!important;
  display:block!important;
  position:absolute!important;
  width:158%!important;
  height:158%!important;
  left:-29%!important;
  top:-29%!important;
  border-radius:45% 55% 48% 52% / 56% 43% 57% 44%!important;
  background:
    radial-gradient(ellipse at 14% 19%,rgba(255,255,255,.90) 0 6%,rgba(239,250,254,.74) 12%,rgba(209,235,247,.38) 22%,rgba(177,211,231,.12) 31%,transparent 39%),
    radial-gradient(ellipse at 48% 13%,rgba(246,253,255,.82) 0 7%,rgba(221,241,250,.62) 15%,rgba(172,211,233,.28) 25%,transparent 37%),
    radial-gradient(ellipse at 78% 37%,rgba(229,246,252,.76) 0 8%,rgba(184,222,241,.50) 17%,rgba(109,172,207,.24) 28%,transparent 41%),
    radial-gradient(ellipse at 64% 77%,rgba(242,251,254,.86) 0 8%,rgba(214,238,249,.58) 17%,rgba(147,197,223,.26) 29%,transparent 42%),
    radial-gradient(ellipse at 25% 72%,rgba(250,253,255,.80) 0 7%,rgba(221,240,249,.54) 16%,rgba(143,193,219,.24) 27%,transparent 40%),
    radial-gradient(ellipse at 39% 44%,rgba(74,136,176,.34) 0 8%,rgba(54,108,146,.24) 18%,transparent 31%),
    radial-gradient(ellipse at 76% 62%,rgba(53,112,151,.30) 0 9%,rgba(43,89,125,.18) 20%,transparent 34%),
    radial-gradient(ellipse at 51% 52%,rgba(236,249,253,.34) 0 12%,rgba(145,199,225,.18) 24%,transparent 41%)!important;
  background-size:65% 58%,68% 62%,70% 66%,67% 62%,66% 60%,50% 46%,48% 44%,78% 72%!important;
  background-repeat:no-repeat!important;
  background-position:1% 6%,37% 1%,65% 22%,55% 66%,5% 62%,28% 34%,70% 55%,39% 38%!important;
  background-blend-mode:screen,screen,screen,screen,screen,multiply,multiply,screen!important;
  filter:blur(1.8px)!important;
  opacity:.98!important;
  animation:taleraOrb20CloudSheets 8.8s ease-in-out infinite alternate!important;
  pointer-events:none!important;
  z-index:1!important;
}
.core.active::before,.core.listening::before{
  animation-duration:5.8s!important;
}

/* Flashlight kept, but reduced and moved off-centre so clouds remain the main event. */
.core::after{
  content:""!important;
  display:block!important;
  position:absolute!important;
  width:54%!important;
  height:54%!important;
  left:23%!important;
  top:23%!important;
  border-radius:50%!important;
  background:
    radial-gradient(circle at 50% 50%,
      rgba(255,255,255,.94) 0 5%,
      rgba(255,251,238,.84) 8%,
      rgba(242,251,255,.68) 14%,
      rgba(206,235,248,.39) 25%,
      rgba(137,195,224,.16) 39%,
      transparent 60%),
    radial-gradient(ellipse at 52% 50%,rgba(255,255,255,.28) 0 16%,rgba(180,222,241,.14) 34%,transparent 58%)!important;
  filter:blur(2.4px)!important;
  opacity:.76!important;
  box-shadow:0 0 22px rgba(244,252,255,.28)!important;
  animation:taleraOrb20Flashlight 8.4s cubic-bezier(.45,.05,.40,.96) infinite!important;
  pointer-events:none!important;
  z-index:2!important;
}
.core.active::after,.core.listening::after{
  animation-duration:6.0s!important;
  opacity:.84!important;
}

.status::after{
  content:"  · v20";
  font-size:9px;
  opacity:.32;
  vertical-align:middle;
}

@keyframes taleraOrb20Shape{
  0%,100%{border-radius:47% 53% 49% 51% / 52% 46% 54% 48%}
  30%{border-radius:52% 48% 46% 54% / 48% 55% 45% 52%}
  64%{border-radius:48% 52% 54% 46% / 55% 47% 53% 45%}
}

@keyframes taleraOrb20Heartbeat{
  0%,12%,100%{scale:.972}
  30%{scale:.993}
  40%{scale:1.048}
  50%{scale:.992}
  61%{scale:1.030}
  74%{scale:.984}
}

@keyframes taleraOrb20Aura{
  0%,100%{
    box-shadow:0 18px 54px rgba(15,39,71,.10),0 0 18px rgba(100,176,215,.30),0 0 42px rgba(100,176,215,.18),0 0 72px rgba(100,176,215,.08),inset 10px 9px 24px rgba(255,255,255,.10),inset -16px -19px 30px rgba(15,39,71,.12);
  }
  45%{
    box-shadow:0 20px 58px rgba(15,39,71,.11),0 0 25px rgba(100,176,215,.44),0 0 54px rgba(100,176,215,.28),0 0 82px rgba(100,176,215,.14),inset 10px 9px 24px rgba(255,255,255,.11),inset -16px -19px 30px rgba(15,39,71,.12);
  }
}

@keyframes taleraOrb20CloudSheets{
  0%{
    transform:translate(-8%,-6%) scale(1.02) rotate(-.9deg);
    background-position:1% 6%,37% 1%,65% 22%,55% 66%,5% 62%,28% 34%,70% 55%,39% 38%;
  }
  27%{
    transform:translate(2%,-3%) scale(1.07) rotate(.35deg);
    background-position:11% 13%,45% 8%,57% 31%,62% 57%,12% 52%,36% 41%,62% 63%,45% 46%;
  }
  55%{
    transform:translate(7%,4%) scale(1.04) rotate(.8deg);
    background-position:6% 23%,52% 15%,62% 42%,53% 71%,20% 60%,31% 49%,73% 49%,38% 55%;
  }
  78%{
    transform:translate(-1%,8%) scale(1.09) rotate(-.35deg);
    background-position:18% 10%,34% 19%,70% 29%,64% 63%,8% 70%,43% 37%,60% 58%,52% 42%;
  }
  100%{
    transform:translate(-6%,2%) scale(1.05) rotate(.15deg);
    background-position:7% 18%,49% 4%,58% 37%,51% 59%,18% 55%,35% 45%,68% 65%,43% 50%;
  }
}

@keyframes taleraOrb20Flashlight{
  0%{transform:translate(-25%,-20%) scale(.88);opacity:.58}
  22%{transform:translate(-5%,-13%) scale(1.00);opacity:.82}
  45%{transform:translate(24%,-5%) scale(1.06);opacity:.76}
  67%{transform:translate(17%,22%) scale(.95);opacity:.84}
  84%{transform:translate(-12%,20%) scale(1.02);opacity:.70}
  100%{transform:translate(-25%,-20%) scale(.88);opacity:.58}
}
`;

function enhance(html){
  return html.replace('</head>','<style>'+ORB_V20_STYLE+'</style></head>');
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
    headers.set('x-talera-orb-app','organic-v20-direct-cloud-calibration');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
