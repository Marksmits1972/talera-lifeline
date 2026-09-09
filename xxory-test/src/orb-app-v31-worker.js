import baseWorker from "./worker.js";

const ORB_V31_STYLE = String.raw`
/* TALERA ORB v31 — continuous organic cloud fields with natural gaps. Directly on worker.js. */
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
  border-radius:49% 51% 48% 52% / 52% 47% 53% 48%!important;
  background:#79adc7!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    0 18px 50px rgba(15,39,71,.09),
    0 0 20px rgba(79,164,209,.22),
    0 0 48px rgba(79,164,209,.12)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.12 + var(--voice)*.045))!important;
  transition:transform .18s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb31Pulse 5.7s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.35s!important}
.core::before,.core::after{display:none!important;content:none!important}

.orb-v31-svg{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  display:block;
  overflow:visible;
  pointer-events:none;
}
.orb-v31-light,
.orb-v31-deep,
.orb-v31-cloud-a,
.orb-v31-cloud-b,
.orb-v31-veil{
  transform-box:fill-box;
  transform-origin:center;
  will-change:transform,opacity;
}
.orb-v31-light{animation:taleraOrb31Light 7.2s ease-in-out infinite}
.orb-v31-deep{animation:taleraOrb31Deep 11.8s ease-in-out infinite alternate}
.orb-v31-cloud-a{animation:taleraOrb31CloudA 9.6s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v31-cloud-b{animation:taleraOrb31CloudB 7.8s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v31-veil{animation:taleraOrb31Veil 6.2s ease-in-out infinite alternate}
.core.active .orb-v31-light,.core.listening .orb-v31-light{animation-duration:5.0s}
.core.active .orb-v31-deep,.core.listening .orb-v31-deep{animation-duration:7.8s}
.core.active .orb-v31-cloud-a,.core.listening .orb-v31-cloud-a{animation-duration:6.4s}
.core.active .orb-v31-cloud-b,.core.listening .orb-v31-cloud-b{animation-duration:5.2s}
.core.active .orb-v31-veil,.core.listening .orb-v31-veil{animation-duration:4.2s}

.status::after{content:"  · v31";font-size:9px;opacity:.34;vertical-align:middle}

@keyframes taleraOrb31Pulse{
  0%,18%,100%{scale:.985;border-radius:49% 51% 48% 52% / 52% 47% 53% 48%}
  41%{scale:1.016;border-radius:51% 49% 52% 48% / 48% 53% 47% 52%}
  52%{scale:1.031}
  63%{scale:1.003}
  73%{scale:1.017}
}
@keyframes taleraOrb31Light{
  0%{transform:translate(-10%,-8%) scale(.97);opacity:.70}
  27%{transform:translate(3%,-11%) scale(1.05);opacity:.96}
  53%{transform:translate(12%,3%) scale(1.10);opacity:.84}
  78%{transform:translate(-1%,12%) scale(1.02);opacity:1}
  100%{transform:translate(-10%,-8%) scale(.97);opacity:.70}
}
@keyframes taleraOrb31Deep{
  0%{transform:translate(8%,-6%) scale(1.14) rotate(.7deg);opacity:.56}
  40%{transform:translate(-7%,1%) scale(1.20) rotate(-.8deg);opacity:.72}
  72%{transform:translate(-10%,8%) scale(1.16) rotate(-1.2deg);opacity:.62}
  100%{transform:translate(6%,3%) scale(1.19) rotate(.5deg);opacity:.76}
}
@keyframes taleraOrb31CloudA{
  0%{transform:translate(-10%,-7%) scale(1.10) rotate(-1.1deg);opacity:.84}
  30%{transform:translate(4%,-5%) scale(1.16) rotate(.4deg);opacity:.96}
  58%{transform:translate(10%,5%) scale(1.11) rotate(1deg);opacity:.86}
  82%{transform:translate(-1%,10%) scale(1.17) rotate(-.6deg);opacity:1}
  100%{transform:translate(-8%,2%) scale(1.13) rotate(.2deg);opacity:.90}
}
@keyframes taleraOrb31CloudB{
  0%{transform:translate(10%,-9%) scale(1.12) rotate(1.4deg);opacity:.48}
  34%{transform:translate(-5%,-1%) scale(1.19) rotate(-.7deg);opacity:.66}
  67%{transform:translate(-11%,8%) scale(1.13) rotate(-1.3deg);opacity:.54}
  100%{transform:translate(7%,4%) scale(1.18) rotate(.6deg);opacity:.70}
}
@keyframes taleraOrb31Veil{
  0%{transform:translate(-11%,6%) scale(1.06) rotate(-1.8deg);opacity:.26}
  50%{transform:translate(10%,-7%) scale(1.14) rotate(1.4deg);opacity:.46}
  100%{transform:translate(-1%,-11%) scale(1.09) rotate(-.5deg);opacity:.31}
}
`;

const ORB_V31_SVG = String.raw`<svg class="orb-v31-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="orb31Base" cx="31%" cy="24%" r="94%">
      <stop offset="0%" stop-color="#e3f2f8"/>
      <stop offset="25%" stop-color="#b2d5e4"/>
      <stop offset="57%" stop-color="#78abc6"/>
      <stop offset="84%" stop-color="#5a8eae"/>
      <stop offset="100%" stop-color="#3f6d8e"/>
    </radialGradient>

    <radialGradient id="orb31LightField" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity=".98"/>
      <stop offset="14%" stop-color="#fbfeff" stop-opacity=".90"/>
      <stop offset="34%" stop-color="#eaf7fc" stop-opacity=".60"/>
      <stop offset="60%" stop-color="#c5e4f1" stop-opacity=".26"/>
      <stop offset="100%" stop-color="#8fc4de" stop-opacity="0"/>
    </radialGradient>

    <filter id="orb31CloudA" x="-55%" y="-55%" width="210%" height="210%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0065 0.0105" numOctaves="4" seed="17" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 0 0 .02 .12 .42 .82 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.35" result="soft"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.019 0.028" numOctaves="2" seed="47" result="detail"/>
      <feDisplacementMap in="soft" in2="detail" scale="8" xChannelSelector="R" yChannelSelector="B" result="warped"/>
      <feFlood flood-color="#f7fcff" flood-opacity=".91" result="color"/>
      <feComposite in="color" in2="warped" operator="in"/>
    </filter>

    <filter id="orb31CloudB" x="-55%" y="-55%" width="210%" height="210%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0085 0.0135" numOctaves="3" seed="59" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 0 .01 .08 .28 .60 .88 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.24" result="soft"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.024 0.034" numOctaves="2" seed="73" result="detail"/>
      <feDisplacementMap in="soft" in2="detail" scale="6" xChannelSelector="R" yChannelSelector="B" result="warped"/>
      <feFlood flood-color="#ffffff" flood-opacity=".52" result="color"/>
      <feComposite in="color" in2="warped" operator="in"/>
    </filter>

    <filter id="orb31Deep" x="-55%" y="-55%" width="210%" height="210%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.007 0.011" numOctaves="3" seed="31" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 .01 .05 .16 .42 .72 .93 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.42" result="soft"/>
      <feFlood flood-color="#2e6284" flood-opacity=".58" result="color"/>
      <feComposite in="color" in2="soft" operator="in"/>
    </filter>

    <filter id="orb31Veil" x="-55%" y="-55%" width="210%" height="210%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.013 0.027" numOctaves="3" seed="83" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 0 0 .03 .16 .46 .80 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.16" result="soft"/>
      <feFlood flood-color="#ffffff" flood-opacity=".46" result="color"/>
      <feComposite in="color" in2="soft" operator="in"/>
    </filter>
  </defs>

  <rect x="-3" y="-3" width="206" height="206" fill="url(#orb31Base)"/>

  <!-- Light fields sit behind the continuous cloud fields; natural noise gaps become the clearings. -->
  <g class="orb-v31-light">
    <ellipse cx="73" cy="72" rx="62" ry="52" fill="url(#orb31LightField)"/>
    <ellipse cx="143" cy="130" rx="48" ry="42" fill="url(#orb31LightField)" opacity=".60"/>
  </g>

  <g class="orb-v31-deep">
    <rect x="-55" y="-55" width="310" height="310" filter="url(#orb31Deep)"/>
  </g>

  <g class="orb-v31-cloud-a">
    <rect x="-58" y="-58" width="316" height="316" filter="url(#orb31CloudA)"/>
  </g>

  <g class="orb-v31-cloud-b">
    <rect x="-62" y="-62" width="324" height="324" filter="url(#orb31CloudB)"/>
  </g>

  <g class="orb-v31-veil">
    <rect x="-66" y="-66" width="332" height="332" filter="url(#orb31Veil)"/>
  </g>
</svg>`;

function enhance(html){
  const mountScript = '<script>(function(){var svg='+JSON.stringify(ORB_V31_SVG)+';function mount(){document.querySelectorAll(".core").forEach(function(core){if(core.getAttribute("data-orb-v31")==="1")return;core.setAttribute("data-orb-v31","1");core.innerHTML=svg;});}mount();var root=document.getElementById("app")||document.body;new MutationObserver(mount).observe(root,{childList:true,subtree:true});})();</scr'+'ipt>';
  return html.replace('</head>','<style>'+ORB_V31_STYLE+'</style></head>').replace('</body>',mountScript+'</body>');
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
    headers.set('x-talera-orb-app','organic-v31-continuous-cloud-fields');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
