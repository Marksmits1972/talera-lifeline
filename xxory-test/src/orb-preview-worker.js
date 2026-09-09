import baseWorker from "./worker.js";

const ORB_STYLE = String.raw`
/* TALERA ORB V1 — isolated organic visual layer, 2026-09-09 */
:root{
  --orb-shell:#7fb4d5;
  --orb-deep:#4f8fbc;
  --orb-milk:#edf7fd;
}
.core-wrap{
  isolation:isolate;
  perspective:600px;
}
.halo{
  width:116%!important;
  height:116%!important;
  border-radius:50%!important;
  background:radial-gradient(circle,
    rgba(218,236,248,.52) 0%,
    rgba(184,216,237,.24) 42%,
    rgba(167,206,232,.10) 61%,
    transparent 76%)!important;
  filter:blur(10px)!important;
  opacity:.68!important;
  animation:orbHaloBreath 9.6s ease-in-out infinite!important;
  transform-origin:center;
}
.core,.core.active{
  width:78%!important;
  height:78%!important;
  overflow:hidden!important;
  isolation:isolate;
  border-radius:49% 51% 47% 53% / 52% 47% 53% 48%!important;
  background:
    radial-gradient(ellipse at 34% 31%,rgba(255,255,255,.66) 0 10%,rgba(247,252,255,.28) 24%,transparent 44%),
    radial-gradient(ellipse at 67% 70%,rgba(57,123,171,.28),transparent 49%),
    radial-gradient(ellipse at 42% 74%,rgba(224,241,251,.35),transparent 44%),
    linear-gradient(145deg,#eaf5fc 0%,#beddef 39%,#86b9d8 68%,#5b98c3 100%)!important;
  box-shadow:
    0 24px 58px rgba(40,91,130,.13),
    inset -18px -22px 38px rgba(37,92,133,.13),
    inset 14px 12px 28px rgba(255,255,255,.28)!important;
  transform:scale(calc(1 + var(--awake)*.12 + var(--voice)*.03))!important;
  scale:1;
  transition:transform .52s cubic-bezier(.2,.72,.2,1),filter .5s ease!important;
  animation:orbBreath 8.4s ease-in-out infinite,orbMorph 13.7s ease-in-out infinite!important;
  filter:saturate(calc(1 + var(--voice)*.07)) brightness(calc(1 + var(--voice)*.025))!important;
  will-change:transform,border-radius,filter;
}
.core.listening{
  animation-duration:6.8s,11.8s!important;
}
.core::before,.core::after{display:none!important}
.orb-layer{position:absolute;pointer-events:none;will-change:transform,opacity;transform-origin:center}
.orb-flow-a{
  inset:-23%;z-index:1;border-radius:43% 57% 52% 48% / 55% 45% 58% 42%;
  background:
    radial-gradient(ellipse at 28% 36%,rgba(255,255,255,.46) 0 12%,rgba(230,244,253,.22) 23%,transparent 43%),
    radial-gradient(ellipse at 63% 30%,rgba(224,241,252,.30) 0 14%,transparent 39%),
    radial-gradient(ellipse at 65% 72%,rgba(61,127,176,.24) 0 15%,transparent 44%),
    conic-gradient(from 35deg at 53% 50%,transparent 0 18%,rgba(255,255,255,.18) 26%,transparent 39% 58%,rgba(75,144,190,.18) 69%,transparent 82%);
  filter:blur(9px);
  opacity:calc(.72 + var(--voice)*.08);
  mix-blend-mode:soft-light;
  animation:orbFlowA 16.8s ease-in-out infinite alternate;
}
.orb-flow-b{
  inset:-18%;z-index:2;border-radius:56% 44% 46% 54% / 48% 58% 42% 52%;
  background:
    radial-gradient(ellipse at 39% 63%,rgba(244,251,255,.48) 0 11%,rgba(226,242,251,.18) 25%,transparent 43%),
    radial-gradient(ellipse at 71% 54%,rgba(48,113,164,.25) 0 12%,transparent 40%),
    radial-gradient(ellipse at 52% 22%,rgba(255,255,255,.26) 0 10%,transparent 36%),
    conic-gradient(from 210deg at 48% 54%,transparent 0 21%,rgba(255,255,255,.16) 31%,transparent 47% 66%,rgba(55,125,174,.16) 76%,transparent 91%);
  filter:blur(11px);
  opacity:calc(.66 + var(--voice)*.09);
  mix-blend-mode:screen;
  animation:orbFlowB 21.4s ease-in-out infinite alternate;
}
.orb-light{
  z-index:3;width:72%;height:64%;left:4%;top:3%;border-radius:50%;
  background:radial-gradient(ellipse,rgba(255,255,255,.66) 0%,rgba(245,252,255,.30) 28%,rgba(224,241,251,.10) 52%,transparent 72%);
  filter:blur(12px);
  opacity:calc(.58 + var(--voice)*.13);
  mix-blend-mode:screen;
  animation:orbLightDrift 14.6s ease-in-out infinite;
}
.orb-depth{
  z-index:2;width:54%;height:45%;right:-2%;bottom:1%;border-radius:50%;
  background:radial-gradient(ellipse,rgba(52,116,165,.30),rgba(68,137,183,.12) 45%,transparent 72%);
  filter:blur(14px);
  opacity:.66;
  animation:orbDepthDrift 18.2s ease-in-out infinite alternate;
}
.orb-grain{
  inset:0;z-index:5;border-radius:inherit;
  background-image:
    radial-gradient(circle at 20% 30%,rgba(255,255,255,.20) 0 .55px,transparent .8px),
    radial-gradient(circle at 72% 66%,rgba(42,101,145,.13) 0 .5px,transparent .8px),
    radial-gradient(circle at 47% 18%,rgba(255,255,255,.13) 0 .45px,transparent .75px);
  background-size:7px 7px,9px 9px,11px 11px;
  opacity:.24;
  mix-blend-mode:soft-light;
  animation:orbGrainDrift 22s linear infinite;
}
.stage.has-photo .halo{
  opacity:.58!important;
  background:radial-gradient(circle,rgba(227,241,250,.48),rgba(197,222,239,.20) 44%,rgba(168,204,229,.08) 61%,transparent 75%)!important;
}
@keyframes orbBreath{
  0%,100%{scale:.995}
  45%{scale:1.008}
  62%{scale:1.004}
}
@keyframes orbMorph{
  0%,100%{border-radius:49% 51% 47% 53% / 52% 47% 53% 48%}
  28%{border-radius:52% 48% 51% 49% / 47% 54% 46% 53%}
  61%{border-radius:47% 53% 49% 51% / 54% 46% 55% 45%}
  82%{border-radius:51% 49% 53% 47% / 49% 52% 48% 51%}
}
@keyframes orbHaloBreath{
  0%,100%{transform:scale(.99);opacity:.62}
  48%{transform:scale(1.035);opacity:.71}
  70%{transform:scale(1.018);opacity:.67}
}
@keyframes orbFlowA{
  0%{transform:translate(-4%,-2%) rotate(-5deg) scale(1.02)}
  37%{transform:translate(2%,4%) rotate(5deg) scale(1.08)}
  72%{transform:translate(5%,-1%) rotate(11deg) scale(1.04)}
  100%{transform:translate(-1%,3%) rotate(17deg) scale(1.09)}
}
@keyframes orbFlowB{
  0%{transform:translate(5%,3%) rotate(7deg) scale(1.07)}
  36%{transform:translate(-4%,-2%) rotate(-3deg) scale(1.02)}
  74%{transform:translate(-1%,5%) rotate(-11deg) scale(1.08)}
  100%{transform:translate(4%,-4%) rotate(-17deg) scale(1.03)}
}
@keyframes orbLightDrift{
  0%,100%{transform:translate(-5%,-4%) scale(1.02)}
  24%{transform:translate(14%,7%) scale(1.12)}
  49%{transform:translate(25%,24%) scale(.96)}
  73%{transform:translate(5%,30%) scale(1.08)}
}
@keyframes orbDepthDrift{
  0%{transform:translate(4%,5%) scale(1)}
  48%{transform:translate(-12%,-7%) scale(1.12)}
  100%{transform:translate(-3%,-14%) scale(1.03)}
}
@keyframes orbGrainDrift{
  to{background-position:21px 14px,-18px 26px,33px -22px}
}
@media(prefers-reduced-motion:reduce){
  .core,.core.active,.halo,.orb-layer{animation-duration:30s!important;animation-iteration-count:infinite!important}
}
`;

const ORB_SCRIPT = String.raw`
(function(){
  function decorateOrb(root){
    var scope=root||document;
    var cores=scope.querySelectorAll?scope.querySelectorAll('.core'):[];
    cores.forEach(function(core){
      if(core.dataset.orbV1==='1')return;
      core.dataset.orbV1='1';
      var names=['orb-flow-a','orb-flow-b','orb-depth','orb-light','orb-grain'];
      names.forEach(function(name){
        var layer=document.createElement('span');
        layer.className='orb-layer '+name;
        layer.setAttribute('aria-hidden','true');
        core.appendChild(layer);
      });
    });
  }

  var app=document.getElementById('app');
  decorateOrb(document);
  if(app){
    new MutationObserver(function(){decorateOrb(app)}).observe(app,{childList:true,subtree:true});
  }

  var params=new URLSearchParams(location.search);
  if(params.get('orbDemo')==='1'){
    var root=document.documentElement;
    var phases=[
      {awake:0,voice:0,duration:4200},
      {awake:0,voice:0,duration:2600},
      {awake:1,voice:.22,duration:1800},
      {awake:1,voice:.72,duration:3000},
      {awake:1,voice:.32,duration:2200},
      {awake:0,voice:0,duration:3600}
    ];
    var index=0;
    function next(){
      var phase=phases[index%phases.length];
      root.style.setProperty('--awake',String(phase.awake));
      root.style.setProperty('--voice',String(phase.voice));
      index++;
      setTimeout(next,phase.duration);
    }
    next();
  }
})();
`;

function enhanceHtml(html) {
  let out = html;
  const styleClose = "</style>";
  const bodyClose = "</body>";
  if (out.includes(styleClose)) out = out.replace(styleClose, ORB_STYLE + "\n" + styleClose);
  if (out.includes(bodyClose)) out = out.replace(bodyClose, "<script>" + ORB_SCRIPT + "</script>" + bodyClose);
  return out;
}

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    const contentType = response.headers.get("content-type") || "";
    if (request.method === "HEAD" || !contentType.includes("text/html")) return response;

    const html = await response.text();
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("x-talera-orb", "organic-v1");
    return new Response(enhanceHtml(html), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
