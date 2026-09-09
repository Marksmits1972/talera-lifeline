import baseWorker from "./worker.js";

const ORB_V23_STYLE = String.raw`
/* TALERA ORB v23 — clean rebuild. Old gradient-cloud architecture is disabled. */
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

/* The base worker keeps interaction/state. Its old ORB artwork is switched off here. */
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
  background:transparent!important;
  background-image:none!important;
  box-shadow:
    0 18px 52px rgba(15,39,71,.10),
    0 0 20px rgba(92,168,210,.28),
    0 0 46px rgba(92,168,210,.16)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.12 + var(--voice)*.045))!important;
  transition:transform .22s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb23Pulse 6.3s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.8s!important}
.core::before,.core::after{display:none!important;content:none!important}

.orb-v23-svg{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  display:block;
  overflow:hidden;
  pointer-events:none;
}
.orb-v23-cloud-a,
.orb-v23-cloud-b,
.orb-v23-wisp,
.orb-v23-light{
  transform-box:fill-box;
  transform-origin:center;
  will-change:transform,opacity;
}
.orb-v23-cloud-a{animation:taleraOrb23CloudA 16s ease-in-out infinite alternate}
.orb-v23-cloud-b{animation:taleraOrb23CloudB 11s ease-in-out infinite alternate}
.orb-v23-wisp{animation:taleraOrb23Wisp 8.5s ease-in-out infinite alternate}
.orb-v23-light{animation:taleraOrb23Light 9.5s ease-in-out infinite}
.core.active .orb-v23-cloud-a,.core.listening .orb-v23-cloud-a{animation-duration:11s}
.core.active .orb-v23-cloud-b,.core.listening .orb-v23-cloud-b{animation-duration:7.6s}
.core.active .orb-v23-wisp,.core.listening .orb-v23-wisp{animation-duration:5.8s}
.core.active .orb-v23-light,.core.listening .orb-v23-light{animation-duration:6.5s}

.status::after{
  content:"  · v23";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}

@keyframes taleraOrb23Pulse{
  0%,18%,100%{scale:.986;border-radius:49% 51% 48% 52% / 52% 47% 53% 48%}
  43%{scale:1.018;border-radius:51% 49% 52% 48% / 48% 53% 47% 52%}
  54%{scale:1.034}
  64%{scale:1.004}
  73%{scale:1.018}
}
@keyframes taleraOrb23CloudA{
  0%{transform:translate(-5%,-3%) scale(1.08) rotate(-1deg);opacity:.76}
  35%{transform:translate(3%,-1%) scale(1.13) rotate(.5deg);opacity:.88}
  68%{transform:translate(6%,4%) scale(1.09) rotate(1deg);opacity:.80}
  100%{transform:translate(-2%,6%) scale(1.14) rotate(-.4deg);opacity:.90}
}
@keyframes taleraOrb23CloudB{
  0%{transform:translate(6%,-5%) scale(1.10) rotate(1deg);opacity:.52}
  40%{transform:translate(-4%,2%) scale(1.16) rotate(-.7deg);opacity:.68}
  75%{transform:translate(-6%,6%) scale(1.11) rotate(-1.2deg);opacity:.58}
  100%{transform:translate(4%,1%) scale(1.15) rotate(.6deg);opacity:.70}
}
@keyframes taleraOrb23Wisp{
  0%{transform:translate(-7%,4%) scale(1.04) rotate(-2deg);opacity:.36}
  50%{transform:translate(6%,-4%) scale(1.12) rotate(1.6deg);opacity:.55}
  100%{transform:translate(-1%,-7%) scale(1.07) rotate(-.6deg);opacity:.42}
}
@keyframes taleraOrb23Light{
  0%{transform:translate(-20%,-18%) scale(.88);opacity:.56}
  24%{transform:translate(-3%,-12%) scale(1.02);opacity:.75}
  51%{transform:translate(20%,1%) scale(1.10);opacity:.68}
  74%{transform:translate(8%,20%) scale(.96);opacity:.78}
  100%{transform:translate(-20%,-18%) scale(.88);opacity:.56}
}
`;

const ORB_V23_SVG = String.raw`<svg class="orb-v23-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="orb23Clip"><circle cx="100" cy="100" r="98"/></clipPath>
    <radialGradient id="orb23Base" cx="34%" cy="28%" r="82%">
      <stop offset="0%" stop-color="#dceef6"/>
      <stop offset="30%" stop-color="#a8cee0"/>
      <stop offset="66%" stop-color="#79abc6"/>
      <stop offset="100%" stop-color="#507f9f"/>
    </radialGradient>
    <radialGradient id="orb23Lamp" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity=".95"/>
      <stop offset="16%" stop-color="#fbfdff" stop-opacity=".78"/>
      <stop offset="38%" stop-color="#d9eef7" stop-opacity=".38"/>
      <stop offset="72%" stop-color="#8fc1d9" stop-opacity=".10"/>
      <stop offset="100%" stop-color="#8fc1d9" stop-opacity="0"/>
    </radialGradient>

    <filter id="orb23CloudWhite" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.010 0.016" numOctaves="4" seed="17" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 .04 .18 .48 .78 .96 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.65" result="soft"/>
      <feFlood flood-color="#f6fcff" flood-opacity=".86" result="color"/>
      <feComposite in="color" in2="soft" operator="in"/>
    </filter>

    <filter id="orb23CloudBlue" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.013 0.021" numOctaves="3" seed="31" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 .02 .10 .28 .52 .76 .92 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.8" result="soft"/>
      <feFlood flood-color="#3f7395" flood-opacity=".55" result="color"/>
      <feComposite in="color" in2="soft" operator="in"/>
    </filter>

    <filter id="orb23Wisp" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.020 0.050" numOctaves="3" seed="47" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 0 .03 .14 .38 .66 .88"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.45" result="soft"/>
      <feFlood flood-color="#ffffff" flood-opacity=".62" result="color"/>
      <feComposite in="color" in2="soft" operator="in"/>
    </filter>
  </defs>

  <g clip-path="url(#orb23Clip)">
    <circle cx="100" cy="100" r="100" fill="url(#orb23Base)"/>

    <g class="orb-v23-cloud-b">
      <rect x="-22" y="-22" width="244" height="244" filter="url(#orb23CloudBlue)"/>
    </g>

    <g class="orb-v23-cloud-a">
      <rect x="-24" y="-24" width="248" height="248" filter="url(#orb23CloudWhite)"/>
    </g>

    <g class="orb-v23-wisp">
      <rect x="-28" y="-28" width="256" height="256" filter="url(#orb23Wisp)"/>
    </g>

    <g class="orb-v23-light">
      <circle cx="93" cy="88" r="34" fill="url(#orb23Lamp)"/>
      <circle cx="93" cy="88" r="7" fill="#fffdf7" opacity=".42"/>
    </g>

    <circle cx="100" cy="100" r="97" fill="none" stroke="#72a9c8" stroke-opacity=".13" stroke-width="1.1"/>
  </g>
</svg>`;

function enhance(html){
  const mountScript = '<script>(function(){var svg='+JSON.stringify(ORB_V23_SVG)+';function mount(){document.querySelectorAll(".core").forEach(function(core){if(core.getAttribute("data-orb-v23")==="1")return;core.setAttribute("data-orb-v23","1");core.innerHTML=svg;});}mount();var root=document.getElementById("app")||document.body;new MutationObserver(mount).observe(root,{childList:true,subtree:true});})();<\/script>';
  return html
    .replace('</head>','<style>'+ORB_V23_STYLE+'</style></head>')
    .replace('</body>',mountScript+'</body>');
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
    headers.set('x-talera-orb-app','organic-v23-clean-svg-cloud-rebuild');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
