export const organicOrbStyle = String.raw`
/* TALERA Organic ORB v1 — isolated visual layer */
:root{
  --orb-voice:0;
  --orb-scale:1;
  --orb-flow-back-opacity:.50;
  --orb-flow-mid-opacity:.39;
  --orb-flow-front-opacity:.26;
  --orb-light-opacity:.68;
  --orb-saturation:1.01;
  --orb-brightness:1;
}
.core-wrap{
  width:min(62vw,268px)!important;
  aspect-ratio:1!important;
  isolation:isolate!important;
}
.core-wrap.photo-mode{
  transform:translateY(-8vh) scale(.88)!important;
}
.core-wrap .halo{
  width:114%!important;
  height:114%!important;
  border-radius:50%!important;
  background:radial-gradient(circle,
    rgba(220,234,246,.28) 0%,
    rgba(186,215,238,.18) 36%,
    rgba(142,190,224,.08) 58%,
    transparent 74%)!important;
  filter:blur(11px)!important;
  opacity:.72!important;
  transform:scale(1)!important;
  animation:orbAtmosphere 11.5s ease-in-out infinite!important;
  pointer-events:none!important;
  -webkit-backdrop-filter:blur(4px)!important;
  backdrop-filter:blur(4px)!important;
  -webkit-mask-image:radial-gradient(circle,#000 0 46%,rgba(0,0,0,.72) 57%,rgba(0,0,0,.24) 68%,transparent 78%)!important;
  mask-image:radial-gradient(circle,#000 0 46%,rgba(0,0,0,.72) 57%,rgba(0,0,0,.24) 68%,transparent 78%)!important;
}
.core-wrap .core{
  width:80%!important;
  height:80%!important;
  position:relative!important;
  overflow:visible!important;
  border-radius:50%!important;
  background:transparent!important;
  box-shadow:none!important;
  filter:none!important;
  animation:none!important;
  transform:scale(var(--orb-scale))!important;
  transition:filter .45s ease!important;
  will-change:transform!important;
}
.core-wrap .core::before,.core-wrap .core::after{display:none!important;content:none!important}
.orb-body{
  position:absolute;
  inset:0;
  overflow:hidden;
  border-radius:48% 52% 46% 54% / 52% 47% 53% 48%;
  background:
    radial-gradient(circle at 34% 29%,rgba(255,255,255,.96) 0 7%,rgba(239,248,255,.76) 17%,rgba(220,237,250,.38) 34%,transparent 54%),
    radial-gradient(circle at 67% 68%,rgba(76,142,190,.38),rgba(91,143,185,.18) 35%,transparent 61%),
    radial-gradient(circle at 48% 50%,#dcebf6 0%,#b9d7ec 42%,#79abd0 76%,#4d84b1 108%);
  box-shadow:
    0 24px 62px rgba(15,39,71,.10),
    inset -18px -20px 38px rgba(42,103,151,.13),
    inset 14px 10px 32px rgba(255,255,255,.44);
  animation:orbBreathe 8.4s ease-in-out infinite,orbShape 13.7s ease-in-out infinite;
  transform-origin:center;
  will-change:transform,border-radius;
}
.orb-body::after{
  content:"";
  position:absolute;
  inset:0;
  border-radius:inherit;
  background:radial-gradient(circle at 50% 45%,transparent 0 48%,rgba(70,131,178,.12) 72%,rgba(32,91,139,.14) 100%);
  box-shadow:inset 0 0 28px rgba(255,255,255,.18);
  pointer-events:none;
  z-index:8;
}
.orb-soft-core{
  position:absolute;
  inset:8%;
  border-radius:50%;
  background:
    radial-gradient(circle at 43% 39%,rgba(250,253,255,.50),transparent 31%),
    radial-gradient(circle at 62% 61%,rgba(77,142,191,.16),transparent 46%);
  filter:blur(13px);
  opacity:.88;
  z-index:1;
}
.orb-flow{
  position:absolute;
  inset:-26%;
  border-radius:44% 56% 50% 50% / 52% 45% 55% 48%;
  pointer-events:none;
  will-change:transform,opacity;
}
.orb-flow-back{
  z-index:2;
  opacity:var(--orb-flow-back-opacity);
  background:
    radial-gradient(ellipse at 28% 35%,rgba(255,255,255,.72) 0 8%,rgba(239,248,255,.38) 18%,transparent 40%),
    radial-gradient(ellipse at 69% 62%,rgba(47,112,164,.28) 0 13%,rgba(97,161,207,.14) 29%,transparent 49%),
    radial-gradient(ellipse at 48% 78%,rgba(255,255,255,.33),transparent 31%);
  filter:blur(12px);
  animation:orbFlowBack 19s ease-in-out infinite alternate;
}
.orb-flow-mid{
  z-index:3;
  opacity:var(--orb-flow-mid-opacity);
  background:
    conic-gradient(from 212deg at 48% 51%,transparent 0 12%,rgba(255,255,255,.33) 18%,transparent 28%,rgba(60,128,180,.24) 42%,transparent 55%,rgba(235,247,255,.27) 68%,transparent 82%),
    radial-gradient(ellipse at 62% 33%,rgba(255,255,255,.30),transparent 34%);
  filter:blur(9px);
  mix-blend-mode:soft-light;
  animation:orbFlowMid 15.5s cubic-bezier(.45,.05,.55,.95) infinite alternate;
}
.orb-flow-front{
  z-index:4;
  opacity:var(--orb-flow-front-opacity);
  background:
    radial-gradient(ellipse at 38% 66%,rgba(247,252,255,.48) 0 6%,rgba(230,243,253,.20) 21%,transparent 40%),
    radial-gradient(ellipse at 72% 42%,rgba(56,123,175,.18) 0 11%,transparent 34%),
    radial-gradient(ellipse at 50% 49%,transparent 0 31%,rgba(255,255,255,.15) 44%,transparent 59%);
  filter:blur(7px);
  mix-blend-mode:screen;
  animation:orbFlowFront 12.8s ease-in-out infinite alternate;
}
.orb-light-drift{
  position:absolute;
  z-index:5;
  width:92%;
  height:92%;
  left:-7%;
  top:-5%;
  border-radius:50%;
  background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.72) 0 7%,rgba(245,251,255,.38) 18%,rgba(222,239,252,.14) 36%,transparent 58%);
  filter:blur(8px);
  opacity:var(--orb-light-opacity);
  mix-blend-mode:screen;
  animation:orbLightDrift 16.5s ease-in-out infinite alternate;
  pointer-events:none;
  will-change:transform;
}
.orb-grain{
  position:absolute;
  inset:0;
  z-index:6;
  border-radius:inherit;
  opacity:.075;
  mix-blend-mode:soft-light;
  pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.72' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.62'/%3E%3C/svg%3E");
  background-size:155px 155px;
  animation:orbGrainDrift 17s linear infinite alternate;
}
.core.listening .orb-body{
  filter:saturate(var(--orb-saturation)) brightness(var(--orb-brightness));
}
.stage.has-photo .core-wrap .halo{
  opacity:.82!important;
  background:radial-gradient(circle,rgba(236,247,255,.30) 0%,rgba(198,224,242,.18) 39%,rgba(111,167,208,.07) 60%,transparent 75%)!important;
}
@keyframes orbBreathe{
  0%,100%{transform:scale(.990)}
  28%{transform:scale(1.006)}
  54%{transform:scale(1.018)}
  76%{transform:scale(1.003)}
}
@keyframes orbShape{
  0%,100%{border-radius:48% 52% 46% 54% / 52% 47% 53% 48%}
  24%{border-radius:51% 49% 54% 46% / 47% 54% 46% 53%}
  51%{border-radius:46% 54% 49% 51% / 55% 46% 54% 45%}
  77%{border-radius:53% 47% 45% 55% / 49% 55% 45% 51%}
}
@keyframes orbAtmosphere{
  0%,100%{transform:scale(.995);opacity:.68}
  50%{transform:scale(1.025);opacity:.78}
}
@keyframes orbFlowBack{
  0%{transform:translate3d(-5%,-2%,0) rotate(-7deg) scale(1.03)}
  50%{transform:translate3d(4%,5%,0) rotate(6deg) scale(1.08)}
  100%{transform:translate3d(7%,-4%,0) rotate(14deg) scale(1.01)}
}
@keyframes orbFlowMid{
  0%{transform:translate3d(5%,-6%,0) rotate(18deg) scale(1.04)}
  48%{transform:translate3d(-4%,3%,0) rotate(-5deg) scale(1.09)}
  100%{transform:translate3d(-7%,7%,0) rotate(-19deg) scale(1.02)}
}
@keyframes orbFlowFront{
  0%{transform:translate3d(-4%,6%,0) rotate(-12deg) scale(1.05)}
  52%{transform:translate3d(6%,-3%,0) rotate(8deg) scale(1.01)}
  100%{transform:translate3d(2%,-7%,0) rotate(19deg) scale(1.08)}
}
@keyframes orbLightDrift{
  0%{transform:translate3d(3%,0,0) scale(.95)}
  30%{transform:translate3d(18%,12%,0) scale(1.05)}
  61%{transform:translate3d(8%,28%,0) scale(.98)}
  100%{transform:translate3d(31%,18%,0) scale(1.08)}
}
@keyframes orbGrainDrift{
  0%{background-position:0 0}
  100%{background-position:31px 19px}
}
@media(prefers-reduced-motion:reduce){
  .orb-body,.core-wrap .halo,.orb-flow,.orb-light-drift,.orb-grain{animation-duration:36s!important}
}
`;

export const organicOrbScript = String.raw`
(function(){
  var runtime={scale:1,voice:0,lastRate:1,raf:0};
  function rootNumber(name,fallback){
    var raw=getComputedStyle(document.documentElement).getPropertyValue(name);
    var value=parseFloat(raw);
    return Number.isFinite(value)?value:fallback;
  }
  function decorate(){
    var wrap=document.querySelector('.core-wrap');
    if(!wrap)return null;
    var core=wrap.querySelector('.core');
    if(!core)return null;
    if(core.dataset.organicOrb!=='v1'){
      core.dataset.organicOrb='v1';
      core.innerHTML='<div class="orb-body"><div class="orb-soft-core"></div><div class="orb-flow orb-flow-back"></div><div class="orb-flow orb-flow-mid"></div><div class="orb-flow orb-flow-front"></div><div class="orb-light-drift"></div><div class="orb-grain"></div></div>';
    }
    return core;
  }
  function tuneAnimationRate(core,rate){
    if(!core||Math.abs(rate-runtime.lastRate)<.025)return;
    runtime.lastRate=rate;
    if(typeof core.querySelectorAll!=='function')return;
    var nodes=core.querySelectorAll('.orb-flow,.orb-light-drift');
    for(var i=0;i<nodes.length;i++){
      if(typeof nodes[i].getAnimations!=='function')continue;
      var animations=nodes[i].getAnimations();
      for(var j=0;j<animations.length;j++)animations[j].playbackRate=rate;
    }
  }
  function frame(){
    var core=decorate();
    var awake=Math.max(0,Math.min(1,rootNumber('--awake',0)));
    var rawVoice=Math.max(0,Math.min(1,rootNumber('--voice',0)));
    var voiceEase=rawVoice>runtime.voice?0.12:0.045;
    runtime.voice+=(rawVoice-runtime.voice)*voiceEase;
    var target=1+(awake*.15)+(runtime.voice*.018);
    var scaleEase=target>runtime.scale?0.10:0.035;
    runtime.scale+=(target-runtime.scale)*scaleEase;
    document.documentElement.style.setProperty('--orb-voice',runtime.voice.toFixed(3));
    document.documentElement.style.setProperty('--orb-scale',runtime.scale.toFixed(4));
    document.documentElement.style.setProperty('--orb-flow-back-opacity',(.50+runtime.voice*.07).toFixed(3));
    document.documentElement.style.setProperty('--orb-flow-mid-opacity',(.39+runtime.voice*.09).toFixed(3));
    document.documentElement.style.setProperty('--orb-flow-front-opacity',(.26+runtime.voice*.08).toFixed(3));
    document.documentElement.style.setProperty('--orb-light-opacity',(.68+runtime.voice*.10).toFixed(3));
    document.documentElement.style.setProperty('--orb-saturation',(1.01+runtime.voice*.11).toFixed(3));
    document.documentElement.style.setProperty('--orb-brightness',(1+runtime.voice*.035).toFixed(3));
    tuneAnimationRate(core,1+(runtime.voice*.35));
    runtime.raf=requestAnimationFrame(frame);
  }
  var observer=new MutationObserver(function(){decorate()});
  var app=document.getElementById('app');
  if(app)observer.observe(app,{childList:true,subtree:true});
  decorate();
  frame();
})();
`;
