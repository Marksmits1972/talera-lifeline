import baseWorker from "./worker.js";

const ORB_V19_STYLE = String.raw`
/* TALERA ORB v19 — expressive calibration build. Directly on worker.js; no ORB version stacking. */
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
  border-radius:46% 54% 49% 51% / 53% 45% 55% 47%!important;
  background:
    radial-gradient(ellipse at 18% 22%,rgba(250,254,255,.78) 0 5%,rgba(221,241,250,.38) 14%,transparent 30%),
    radial-gradient(ellipse at 66% 24%,rgba(222,241,250,.58) 0 9%,rgba(136,188,217,.30) 23%,transparent 43%),
    radial-gradient(ellipse at 30% 66%,rgba(243,250,253,.62) 0 11%,rgba(174,211,231,.34) 25%,transparent 46%),
    radial-gradient(ellipse at 73% 68%,rgba(188,222,239,.48) 0 12%,rgba(74,137,177,.34) 29%,transparent 50%),
    radial-gradient(ellipse at 48% 48%,#c5e1ed 0%,#8bbbd4 31%,#6399ba 61%,#3f6f91 100%)!important;
  background-size:128% 128%,124% 124%,132% 132%,126% 126%,100% 100%!important;
  background-position:35% 33%,60% 35%,38% 66%,66% 64%,50% 50%!important;
  box-shadow:
    0 18px 54px rgba(15,39,71,.10),
    0 0 34px rgba(106,178,216,.25),
    inset 10px 9px 25px rgba(255,255,255,.12),
    inset -17px -20px 31px rgba(15,39,71,.12)!important;
  filter:none!important;
  transform:scale(calc(.985 + var(--awake)*.135 + var(--voice)*.055))!important;
  transition:transform .22s cubic-bezier(.18,.72,.2,1)!important;
  animation:
    taleraOrb19Shape 7.4s ease-in-out infinite,
    taleraOrb19Heartbeat 5.6s cubic-bezier(.42,0,.30,1) infinite,
    taleraOrb19BaseFlow 9.6s ease-in-out infinite alternate!important;
}
.core.active,.core.listening{
  animation-duration:5.2s,4.1s,6.8s!important;
  box-shadow:
    0 20px 60px rgba(15,39,71,.11),
    0 0 42px rgba(106,178,216,.32),
    inset 10px 9px 25px rgba(255,255,255,.13),
    inset -17px -20px 31px rgba(15,39,71,.13)!important;
}

/* High-contrast cloud field: deliberately strong so the effect can be calibrated visually. */
.core::before{
  content:""!important;
  display:block!important;
  position:absolute!important;
  width:154%!important;
  height:154%!important;
  left:-27%!important;
  top:-27%!important;
  border-radius:44% 56% 50% 50% / 56% 43% 57% 44%!important;
  background:
    radial-gradient(ellipse at 18% 24%,rgba(255,255,255,.82) 0 7%,rgba(232,247,252,.56) 15%,rgba(171,215,236,.24) 29%,transparent 43%),
    radial-gradient(ellipse at 56% 18%,rgba(240,251,255,.70) 0 8%,rgba(198,229,243,.44) 20%,rgba(107,171,207,.24) 34%,transparent 48%),
    radial-gradient(ellipse at 82% 51%,rgba(224,243,251,.66) 0 10%,rgba(153,204,228,.42) 24%,rgba(64,128,169,.22) 39%,transparent 54%),
    radial-gradient(ellipse at 31% 78%,rgba(250,253,255,.74) 0 9%,rgba(211,235,246,.48) 21%,rgba(113,176,208,.23) 36%,transparent 52%),
    radial-gradient(ellipse at 66% 76%,rgba(218,239,249,.58) 0 10%,rgba(134,190,218,.34) 25%,rgba(54,113,153,.18) 40%,transparent 55%),
    radial-gradient(ellipse at 48% 48%,rgba(247,252,255,.42) 0 13%,rgba(157,205,229,.22) 30%,transparent 52%)!important;
  background-size:72% 68%,78% 73%,76% 82%,80% 74%,78% 78%,94% 94%!important;
  background-repeat:no-repeat!important;
  background-position:2% 8%,55% 2%,73% 49%,2% 70%,57% 72%,44% 42%!important;
  filter:blur(6px)!important;
  opacity:1!important;
  animation:taleraOrb19CloudStorm 7.2s ease-in-out infinite alternate!important;
  pointer-events:none!important;
}
.core.active::before,.core.listening::before{
  animation-duration:4.8s!important;
}

/* Deliberately obvious moving internal light / flashlight. */
.core::after{
  content:""!important;
  display:block!important;
  position:absolute!important;
  width:68%!important;
  height:68%!important;
  left:16%!important;
  top:16%!important;
  border-radius:50%!important;
  background:
    radial-gradient(circle at 50% 50%,
      rgba(255,255,255,1) 0 5%,
      rgba(255,252,241,.98) 7%,
      rgba(251,254,255,.95) 10%,
      rgba(230,247,253,.72) 20%,
      rgba(173,220,241,.42) 33%,
      rgba(91,166,207,.18) 48%,
      transparent 68%),
    radial-gradient(ellipse at 50% 50%,rgba(255,255,255,.58) 0 13%,rgba(205,235,248,.30) 32%,rgba(110,178,213,.12) 49%,transparent 67%)!important;
  filter:blur(2px)!important;
  opacity:1!important;
  box-shadow:0 0 32px rgba(247,253,255,.42)!important;
  animation:taleraOrb19Flashlight 6.1s cubic-bezier(.45,.05,.40,.96) infinite!important;
  pointer-events:none!important;
}
.core.active::after,.core.listening::after{
  animation-duration:4.3s!important;
}

.status::after{
  content:"  · v19";
  font-size:9px;
  opacity:.32;
  vertical-align:middle;
}

@keyframes taleraOrb19Shape{
  0%,100%{border-radius:46% 54% 49% 51% / 53% 45% 55% 47%}
  28%{border-radius:52% 48% 45% 55% / 47% 56% 44% 53%}
  61%{border-radius:47% 53% 55% 45% / 56% 48% 52% 44%}
  82%{border-radius:51% 49% 48% 52% / 46% 53% 47% 54%}
}

/* Intentionally stronger double heartbeat. */
@keyframes taleraOrb19Heartbeat{
  0%,12%,100%{scale:.970}
  28%{scale:.992}
  38%{scale:1.052}
  48%{scale:.990}
  59%{scale:1.034}
  72%{scale:.982}
}

@keyframes taleraOrb19BaseFlow{
  0%{background-position:35% 33%,60% 35%,38% 66%,66% 64%,50% 50%}
  35%{background-position:47% 41%,50% 28%,48% 55%,56% 74%,50% 50%}
  68%{background-position:29% 48%,68% 44%,31% 61%,73% 51%,50% 50%}
  100%{background-position:43% 28%,54% 47%,50% 72%,58% 57%,50% 50%}
}

@keyframes taleraOrb19CloudStorm{
  0%{
    transform:translate(-10%,-7%) scale(1.02) rotate(-1.1deg);
    background-position:2% 8%,55% 2%,73% 49%,2% 70%,57% 72%,44% 42%;
  }
  27%{
    transform:translate(3%,-4%) scale(1.10) rotate(.55deg);
    background-position:17% 17%,44% 12%,61% 41%,16% 58%,64% 60%,52% 50%;
  }
  55%{
    transform:translate(8%,5%) scale(1.05) rotate(1.15deg);
    background-position:8% 26%,62% 19%,55% 61%,22% 69%,51% 73%,41% 57%;
  }
  78%{
    transform:translate(-1%,9%) scale(1.12) rotate(-.45deg);
    background-position:22% 12%,49% 28%,70% 52%,7% 52%,67% 63%,55% 45%;
  }
  100%{
    transform:translate(-7%,2%) scale(1.07) rotate(.25deg);
    background-position:10% 20%,63% 7%,58% 45%,19% 73%,48% 66%,47% 53%;
  }
}

@keyframes taleraOrb19Flashlight{
  0%{transform:translate(-31%,-26%) scale(.82);opacity:.72}
  18%{transform:translate(-10%,-20%) scale(1.04);opacity:1}
  39%{transform:translate(27%,-7%) scale(1.13);opacity:.94}
  58%{transform:translate(20%,24%) scale(.96);opacity:1}
  78%{transform:translate(-12%,27%) scale(1.10);opacity:.90}
  100%{transform:translate(-31%,-26%) scale(.82);opacity:.72}
}
`;

function enhance(html){
  return html.replace('</head>','<style>'+ORB_V19_STYLE+'</style></head>');
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
    headers.set('x-talera-orb-app','organic-v19-direct-expressive-calibration');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
