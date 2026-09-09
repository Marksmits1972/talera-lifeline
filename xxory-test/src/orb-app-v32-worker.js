import baseWorker from "./worker.js";

const ORB_V32_STYLE = String.raw`
/* TALERA ORB v32 — stronger continuous cloud fields with clearer natural gaps. Directly on worker.js. */
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
  background:#6fa7c3!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    0 18px 50px rgba(15,39,71,.09),
    0 0 20px rgba(79,164,209,.23),
    0 0 48px rgba(79,164,209,.13)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.12 + var(--voice)*.045))!important;
  transition:transform .18s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb32Pulse 5.7s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.35s!important}
.core::before,.core::after{display:none!important;content:none!important}

.orb-v32-svg{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  display:block;
  overflow:visible;
  pointer-events:none;
}
.orb-v32-light,
.orb-v32-deep,
.orb-v32-cloud-a,
.orb-v32-cloud-b,
.orb-v32-veil{
  transform-box:fill-box;
  transform-origin:center;
  will-change:transform,opacity;
}
.orb-v32-light{animation:taleraOrb32Light 7.2s ease-in-out infinite}
.orb-v32-deep{animation:taleraOrb32Deep 11.8s ease-in-out infinite alternate}
.orb-v32-cloud-a{animation:taleraOrb32CloudA 9.6s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v32-cloud-b{animation:taleraOrb32CloudB 7.8s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v32-veil{animation:taleraOrb32Veil 6.2s ease-in-out infinite alternate}
.core.active .orb-v32-light,.core.listening .orb-v32-light{animation-duration:5.0s}
.core.active .orb-v32-deep,.core.listening .orb-v32-deep{animation-duration:7.8s}
.core.active .orb-v32-cloud-a,.core.listening .orb-v32-cloud-a{animation-duration:6.4s}
.core.active .orb-v32-cloud-b,.core.listening .orb-v32-cloud-b{animation-duration:5.2s}
.core.active .orb-v32-veil,.core.listening .orb-v32-veil{animation-duration:4.2s}

.status::after{content:"  · v32";font-size:9px;opacity:.34;vertical-align:middle}

@keyframes taleraOrb32Pulse{
  0%,18%,100%{scale:.985;border-radius:49% 51% 48% 52% / 52% 47% 53% 48%}
  41%{scale:1.016;border-radius:51% 49% 52% 48% / 48% 53% 47% 52%}
  52%{scale:1.031}
  63%{scale:1.003}
  73%{scale:1.017}
}
@keyframes taleraOrb32Light{
  0%{transform:translate(-10%,-8%) scale(.97);opacity:.76}
  27%{transform:translate(3%,-11%) scale(1.05);opacity:1}
  53%{transform:translate(12%,3%) scale(1.10);opacity:.90}
  78%{transform:translate(-1%,12%) scale(1.02);opacity:1}
  100%{transform:translate(-10%,-8%) scale(.97);opacity:.76}
}
@keyframes taleraOrb32Deep{
  0%{transform:translate(8%,-6%) scale(1.14) rotate(.7deg);opacity:.64}
  40%{transform:translate(-7%,1%) scale(1.20) rotate(-.8deg);opacity:.82}
  72%{transform:translate(-10%,8%) scale(1.16) rotate(-1.2deg);opacity:.70}
  100%{transform:translate(6%,3%) scale(1.19) rotate(.5deg);opacity:.84}
}
@keyframes taleraOrb32CloudA{
  0%{transform:translate(-10%,-7%) scale(1.10) rotate(-1.1deg);opacity:.92}
  30%{transform:translate(4%,-5%) scale(1.16) rotate(.4deg);opacity:1}
  58%{transform:translate(10%,5%) scale(1.11) rotate(1deg);opacity:.94}
  82%{transform:translate(-1%,10%) scale(1.17) rotate(-.6deg);opacity:1}
  100%{transform:translate(-8%,2%) scale(1.13) rotate(.2deg);opacity:.96}
}
@keyframes taleraOrb32CloudB{
  0%{transform:translate(10%,-9%) scale(1.12) rotate(1.4deg);opacity:.62}
  34%{transform:translate(-5%,-1%) scale(1.19) rotate(-.7deg);opacity:.82}
  67%{transform:translate(-11%,8%) scale(1.13) rotate(-1.3deg);opacity:.68}
  100%{transform:translate(7%,4%) scale(1.18) rotate(.6deg);opacity:.86}
}
@keyframes taleraOrb32Veil{
  0%{transform:translate(-11%,6%) scale(1.06) rotate(-1.8deg);opacity:.30}
  50%{transform:translate(10%,-7%) scale(1.14) rotate(1.4deg);opacity:.52}
  100%{transform:translate(-1%,-11%) scale(1.09) rotate(-.5deg);opacity:.36}
}
`;

const ORB_V32_SVG = String.raw`<svg class="orb-v32-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="orb32Base" cx="31%" cy="24%" r="94%">
      <stop offset="0%" stop-color="#d9edf6"/>
      <stop offset="24%" stop-color="#a8cee0"/>
      <stop offset="56%" stop-color="#70a4c1"/>
      <stop offset="83%" stop-color="#4f85a7"/>
      <stop offset="100%" stop-color="#376684"/>
    </radialGradient>

    <radialGradient id="orb32LightField" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="12%" stop-color="#fbfeff" stop-opacity=".98"/>
      <stop offset="30%" stop-color="#eaf7fc" stop-opacity=".78"/>
      <stop offset="56%" stop-color="#c8e7f3" stop-opacity=".34"/>
      <stop offset="100%" stop-color="#8fc4de" stop-opacity="0"/>
    </radialGradient>

    <filter id="orb32CloudA" x="-55%" y="-55%" width="210%" height="210%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0068 0.0112" numOctaves="4" seed="17" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 0 0 0 .03 .20 .68 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.20" result="soft"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.020 0.030" numOctaves="2" seed="47" result="detail"/>
      <feDisplacementMap in="soft" in2="detail" scale="10" xChannelSelector="R" yChannelSelector="B" result="warped"/>
      <feFlood flood-color="#fbfeff" flood-opacity=".98" result="color"/>
      <feComposite in="color" in2="warped" operator="in"/>
    </filter>

    <filter id="orb32CloudB" x="-55%" y="-55%" width="210%" height="210%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0092 0.0148" numOctaves="3" seed="59" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 0 0 .02 .14 .46 .82 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.15" result="soft"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.025 0.036" numOctaves="2" seed="73" result="detail"/>
      <feDisplacementMap in="soft" in2="detail" scale="8" xChannelSelector="R" yChannelSelector="B" result="warped"/>
      <feFlood flood-color="#ffffff" flood-opacity=".70" result="color"/>
      <feComposite in="color" in2="warped" operator="in"/>
    </filter>

    <filter id="orb32Deep" x="-55%" y="-55%" width="210%" height="210%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0073 0.0118" numOctaves="3" seed="31" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 0 .02 .10 .34 .66 .90 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.30" result="soft"/>
      <feFlood flood-color="#285a79" flood-opacity=".72" result="color"/>
      <feComposite in="color" in2="soft" operator="in"/>
    </filter>

    <filter id="orb32Veil" x="-55%" y="-55%" width="210%" height="210%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.014 0.029" numOctaves="3" seed="83" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 0 0 .02 .12 .40 .76 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.12" result="soft"/>
      <feFlood flood-color="#ffffff" flood-opacity=".54" result="color"/>
      <feComposite in="color" in2="soft" operator="in"/>
    </filter>
  </defs>

  <rect x="-3" y="-3" width="206" height="206" fill="url(#orb32Base)"/>

  <!-- Same v31 engine, but cloud thresholds/contrast are deliberately stronger. -->
  <g class="orb-v32-light">
    <ellipse cx="72" cy="70" rx="64" ry="54" fill="url(#orb32LightField)"/>
    <ellipse cx="145" cy="132" rx="49" ry="43" fill="url(#orb32LightField)" opacity=".68"/>
  </g>

  <g class="orb-v32-deep">
    <rect x="-55" y="-55" width="310" height="310" filter="url(#orb32Deep)"/>
  </g>

  <g class="orb-v32-cloud-a">
    <rect x="-58" y="-58" width="316" height="316" filter="url(#orb32CloudA)"/>
  </g>

  <g class="orb-v32-cloud-b">
    <rect x="-62" y="-62" width="324" height="324" filter="url(#orb32CloudB)"/>
  </g>

  <g class="orb-v32-veil">
    <rect x="-66" y="-66" width="332" height="332" filter="url(#orb32Veil)"/>
  </g>
</svg>`;

function enhance(html){
  const mountScript = '<script>(function(){var svg='+JSON.stringify(ORB_V32_SVG)+';function mount(){document.querySelectorAll(".core").forEach(function(core){if(core.getAttribute("data-orb-v32")==="1")return;core.setAttribute("data-orb-v32","1");core.innerHTML=svg;});}mount();var root=document.getElementById("app")||document.body;new MutationObserver(mount).observe(root,{childList:true,subtree:true});})();</scr'+'ipt>';
  return html.replace('</head>','<style>'+ORB_V32_STYLE+'</style></head>').replace('</body>',mountScript+'</body>');
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
    headers.set('x-talera-orb-app','organic-v32-stronger-continuous-clouds');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
