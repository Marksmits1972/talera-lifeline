import baseWorker from "./worker.js";

const ORB_V24_STYLE = String.raw`
/* TALERA ORB v24 — clean SVG cloud test with stronger clearings and visible motion. */
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
  background:transparent!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    0 18px 52px rgba(15,39,71,.09),
    0 0 22px rgba(84,163,208,.25),
    0 0 50px rgba(84,163,208,.15)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.12 + var(--voice)*.045))!important;
  transition:transform .20s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb24Pulse 6.0s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.6s!important}
.core::before,.core::after{display:none!important;content:none!important}

.orb-v24-svg{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  display:block;
  overflow:hidden;
  pointer-events:none;
}
.orb-v24-light,
.orb-v24-cloud-deep,
.orb-v24-cloud-white-a,
.orb-v24-cloud-white-b,
.orb-v24-wisp{
  transform-box:fill-box;
  transform-origin:center;
  will-change:transform,opacity;
}
.orb-v24-light{animation:taleraOrb24Light 7.4s ease-in-out infinite}
.orb-v24-cloud-deep{animation:taleraOrb24Deep 9.6s ease-in-out infinite alternate}
.orb-v24-cloud-white-a{animation:taleraOrb24CloudA 8.2s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v24-cloud-white-b{animation:taleraOrb24CloudB 6.7s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v24-wisp{animation:taleraOrb24Wisp 5.2s ease-in-out infinite alternate}
.core.active .orb-v24-light,.core.listening .orb-v24-light{animation-duration:5.0s}
.core.active .orb-v24-cloud-deep,.core.listening .orb-v24-cloud-deep{animation-duration:6.4s}
.core.active .orb-v24-cloud-white-a,.core.listening .orb-v24-cloud-white-a{animation-duration:5.4s}
.core.active .orb-v24-cloud-white-b,.core.listening .orb-v24-cloud-white-b{animation-duration:4.4s}
.core.active .orb-v24-wisp,.core.listening .orb-v24-wisp{animation-duration:3.6s}

.status::after{
  content:"  · v24";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}

@keyframes taleraOrb24Pulse{
  0%,18%,100%{scale:.986;border-radius:49% 51% 48% 52% / 52% 47% 53% 48%}
  42%{scale:1.016;border-radius:51% 49% 52% 48% / 48% 53% 47% 52%}
  53%{scale:1.032}
  64%{scale:1.004}
  73%{scale:1.017}
}
@keyframes taleraOrb24Light{
  0%{transform:translate(-18%,-13%) scale(.92);opacity:.66}
  22%{transform:translate(-3%,-18%) scale(1.04);opacity:.88}
  47%{transform:translate(18%,-2%) scale(1.12);opacity:.78}
  70%{transform:translate(10%,18%) scale(1.00);opacity:.92}
  100%{transform:translate(-18%,-13%) scale(.92);opacity:.66}
}
@keyframes taleraOrb24Deep{
  0%{transform:translate(10%,-8%) scale(1.10) rotate(1.0deg);opacity:.56}
  34%{transform:translate(-7%,0%) scale(1.17) rotate(-1.0deg);opacity:.72}
  67%{transform:translate(-11%,9%) scale(1.12) rotate(-1.6deg);opacity:.61}
  100%{transform:translate(7%,3%) scale(1.18) rotate(.8deg);opacity:.76}
}
@keyframes taleraOrb24CloudA{
  0%{transform:translate(-13%,-9%) scale(1.06) rotate(-1.7deg);opacity:.78}
  28%{transform:translate(4%,-7%) scale(1.15) rotate(.5deg);opacity:.92}
  55%{transform:translate(13%,5%) scale(1.09) rotate(1.5deg);opacity:.82}
  78%{transform:translate(-1%,13%) scale(1.17) rotate(-.7deg);opacity:.95}
  100%{transform:translate(-11%,2%) scale(1.11) rotate(.3deg);opacity:.84}
}
@keyframes taleraOrb24CloudB{
  0%{transform:translate(12%,-11%) scale(1.12) rotate(2deg);opacity:.48}
  30%{transform:translate(-5%,-2%) scale(1.20) rotate(-.9deg);opacity:.67}
  61%{transform:translate(-13%,10%) scale(1.13) rotate(-1.8deg);opacity:.54}
  100%{transform:translate(8%,5%) scale(1.19) rotate(1deg);opacity:.70}
}
@keyframes taleraOrb24Wisp{
  0%{transform:translate(-14%,8%) scale(1.05) rotate(-3deg);opacity:.34}
  48%{transform:translate(13%,-8%) scale(1.16) rotate(2.1deg);opacity:.60}
  100%{transform:translate(-2%,-14%) scale(1.09) rotate(-.8deg);opacity:.41}
}
`;

const ORB_V24_SVG = String.raw`<svg class="orb-v24-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="orb24Clip"><circle cx="100" cy="100" r="100"/></clipPath>

    <radialGradient id="orb24Base" cx="32%" cy="25%" r="86%">
      <stop offset="0%" stop-color="#dff0f7"/>
      <stop offset="28%" stop-color="#a8cfe0"/>
      <stop offset="62%" stop-color="#78a9c4"/>
      <stop offset="100%" stop-color="#4a7898"/>
    </radialGradient>

    <radialGradient id="orb24LightField" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity=".96"/>
      <stop offset="15%" stop-color="#fbfeff" stop-opacity=".86"/>
      <stop offset="34%" stop-color="#dff2fa" stop-opacity=".56"/>
      <stop offset="60%" stop-color="#b4d9ea" stop-opacity=".22"/>
      <stop offset="100%" stop-color="#8fc2dc" stop-opacity="0"/>
    </radialGradient>

    <filter id="orb24CloudWhite" x="-38%" y="-38%" width="176%" height="176%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.008 0.014" numOctaves="4" seed="19" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 0 0 .03 .20 .62 .93 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.32" result="soft"/>
      <feFlood flood-color="#f8fdff" flood-opacity=".92" result="color"/>
      <feComposite in="color" in2="soft" operator="in"/>
    </filter>

    <filter id="orb24CloudWhiteFine" x="-38%" y="-38%" width="176%" height="176%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.013 0.024" numOctaves="3" seed="53" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 0 .02 .10 .34 .68 .92 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.24" result="soft"/>
      <feFlood flood-color="#ffffff" flood-opacity=".68" result="color"/>
      <feComposite in="color" in2="soft" operator="in"/>
    </filter>

    <filter id="orb24CloudBlue" x="-38%" y="-38%" width="176%" height="176%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.010 0.018" numOctaves="3" seed="31" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 .02 .10 .30 .58 .82 .96 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.45" result="soft"/>
      <feFlood flood-color="#356989" flood-opacity=".58" result="color"/>
      <feComposite in="color" in2="soft" operator="in"/>
    </filter>

    <filter id="orb24Wisp" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.018 0.046" numOctaves="3" seed="71" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 0 0 .05 .20 .50 .82 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.22" result="soft"/>
      <feFlood flood-color="#ffffff" flood-opacity=".54" result="color"/>
      <feComposite in="color" in2="soft" operator="in"/>
    </filter>
  </defs>

  <g clip-path="url(#orb24Clip)">
    <circle cx="100" cy="100" r="101" fill="url(#orb24Base)"/>

    <!-- Light sits behind the clouds so clearings reveal it instead of the lamp floating on top. -->
    <g class="orb-v24-light">
      <ellipse cx="85" cy="79" rx="47" ry="42" fill="url(#orb24LightField)"/>
      <ellipse cx="137" cy="126" rx="35" ry="31" fill="url(#orb24LightField)" opacity=".46"/>
    </g>

    <g class="orb-v24-cloud-deep">
      <rect x="-32" y="-32" width="264" height="264" filter="url(#orb24CloudBlue)"/>
    </g>

    <g class="orb-v24-cloud-white-a">
      <rect x="-34" y="-34" width="268" height="268" filter="url(#orb24CloudWhite)"/>
    </g>

    <g class="orb-v24-cloud-white-b">
      <rect x="-38" y="-38" width="276" height="276" filter="url(#orb24CloudWhiteFine)"/>
    </g>

    <g class="orb-v24-wisp">
      <rect x="-40" y="-40" width="280" height="280" filter="url(#orb24Wisp)"/>
    </g>
  </g>
</svg>`;

function enhance(html){
  const mountScript = '<script>(function(){var svg='+JSON.stringify(ORB_V24_SVG)+';function mount(){document.querySelectorAll(".core").forEach(function(core){if(core.getAttribute("data-orb-v24")==="1")return;core.setAttribute("data-orb-v24","1");core.innerHTML=svg;});}mount();var root=document.getElementById("app")||document.body;new MutationObserver(mount).observe(root,{childList:true,subtree:true});})();<\\/script>';
  return html
    .replace('</head>','<style>'+ORB_V24_STYLE+'</style></head>')
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
    headers.set('x-talera-orb-app','organic-v24-svg-clearings-motion');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
