import baseWorker from "./worker.js";

const ORB_V26_STYLE = String.raw`
/* TALERA ORB v26 — stronger cloud contrast, clearer openings, more visible motion. Directly on worker.js. */
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
  border-radius:48% 52% 47% 53% / 53% 46% 54% 47%!important;
  background:#6fabc6!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    0 18px 50px rgba(15,39,71,.09),
    0 0 20px rgba(73,158,205,.25),
    0 0 44px rgba(73,158,205,.13)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.12 + var(--voice)*.045))!important;
  transition:transform .18s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb26Pulse 5.8s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.4s!important}
.core::before,.core::after{display:none!important;content:none!important}

.orb-v26-svg{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  display:block;
  overflow:visible;
  pointer-events:none;
}
.orb-v26-light,
.orb-v26-cloud-deep,
.orb-v26-cloud-white-a,
.orb-v26-cloud-white-b,
.orb-v26-wisp{
  transform-box:fill-box;
  transform-origin:center;
  will-change:transform,opacity;
}
.orb-v26-light{animation:taleraOrb26Light 6.2s ease-in-out infinite}
.orb-v26-cloud-deep{animation:taleraOrb26Deep 8.2s ease-in-out infinite alternate}
.orb-v26-cloud-white-a{animation:taleraOrb26CloudA 7.0s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v26-cloud-white-b{animation:taleraOrb26CloudB 5.6s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v26-wisp{animation:taleraOrb26Wisp 4.5s ease-in-out infinite alternate}
.core.active .orb-v26-light,.core.listening .orb-v26-light{animation-duration:4.4s}
.core.active .orb-v26-cloud-deep,.core.listening .orb-v26-cloud-deep{animation-duration:5.8s}
.core.active .orb-v26-cloud-white-a,.core.listening .orb-v26-cloud-white-a{animation-duration:4.8s}
.core.active .orb-v26-cloud-white-b,.core.listening .orb-v26-cloud-white-b{animation-duration:3.9s}
.core.active .orb-v26-wisp,.core.listening .orb-v26-wisp{animation-duration:3.2s}

.status::after{
  content:"  · v26";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}

@keyframes taleraOrb26Pulse{
  0%,18%,100%{scale:.985;border-radius:48% 52% 47% 53% / 53% 46% 54% 47%}
  41%{scale:1.017;border-radius:52% 48% 53% 47% / 47% 54% 46% 53%}
  52%{scale:1.034}
  63%{scale:1.003}
  73%{scale:1.018}
}
@keyframes taleraOrb26Light{
  0%{transform:translate(-24%,-18%) scale(.90);opacity:.68}
  21%{transform:translate(-3%,-20%) scale(1.08);opacity:.96}
  45%{transform:translate(22%,-2%) scale(1.16);opacity:.86}
  68%{transform:translate(13%,22%) scale(1.03);opacity:1}
  84%{transform:translate(-10%,16%) scale(.98);opacity:.84}
  100%{transform:translate(-24%,-18%) scale(.90);opacity:.68}
}
@keyframes taleraOrb26Deep{
  0%{transform:translate(14%,-11%) scale(1.13) rotate(1.4deg);opacity:.64}
  31%{transform:translate(-10%,-1%) scale(1.22) rotate(-1.3deg);opacity:.82}
  64%{transform:translate(-15%,12%) scale(1.15) rotate(-2deg);opacity:.70}
  100%{transform:translate(10%,5%) scale(1.21) rotate(1deg);opacity:.86}
}
@keyframes taleraOrb26CloudA{
  0%{transform:translate(-18%,-12%) scale(1.08) rotate(-2deg);opacity:.80}
  27%{transform:translate(6%,-9%) scale(1.18) rotate(.7deg);opacity:.98}
  53%{transform:translate(17%,7%) scale(1.10) rotate(1.8deg);opacity:.84}
  78%{transform:translate(-2%,17%) scale(1.21) rotate(-.9deg);opacity:1}
  100%{transform:translate(-15%,3%) scale(1.13) rotate(.4deg);opacity:.88}
}
@keyframes taleraOrb26CloudB{
  0%{transform:translate(16%,-15%) scale(1.15) rotate(2.4deg);opacity:.54}
  29%{transform:translate(-7%,-2%) scale(1.24) rotate(-1.1deg);opacity:.75}
  61%{transform:translate(-17%,13%) scale(1.16) rotate(-2.1deg);opacity:.58}
  100%{transform:translate(11%,6%) scale(1.23) rotate(1.2deg);opacity:.78}
}
@keyframes taleraOrb26Wisp{
  0%{transform:translate(-18%,10%) scale(1.08) rotate(-3.6deg);opacity:.36}
  47%{transform:translate(17%,-11%) scale(1.20) rotate(2.6deg);opacity:.68}
  100%{transform:translate(-3%,-18%) scale(1.11) rotate(-1deg);opacity:.44}
}
`;

const ORB_V26_SVG = String.raw`<svg class="orb-v26-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="orb26Base" cx="28%" cy="23%" r="92%">
      <stop offset="0%" stop-color="#e4f3f8"/>
      <stop offset="24%" stop-color="#b2d6e5"/>
      <stop offset="55%" stop-color="#78acc7"/>
      <stop offset="82%" stop-color="#5c91b0"/>
      <stop offset="100%" stop-color="#3f6f91"/>
    </radialGradient>

    <radialGradient id="orb26LightField" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="12%" stop-color="#fcfeff" stop-opacity=".96"/>
      <stop offset="29%" stop-color="#e9f7fc" stop-opacity=".76"/>
      <stop offset="50%" stop-color="#c6e5f2" stop-opacity=".40"/>
      <stop offset="76%" stop-color="#8fc5df" stop-opacity=".12"/>
      <stop offset="100%" stop-color="#8fc5df" stop-opacity="0"/>
    </radialGradient>

    <filter id="orb26CloudWhite" x="-45%" y="-45%" width="190%" height="190%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0085 0.0145" numOctaves="4" seed="19" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 0 0 0 .04 .28 .74 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.18" result="soft"/>
      <feFlood flood-color="#fbfeff" flood-opacity=".98" result="color"/>
      <feComposite in="color" in2="soft" operator="in"/>
    </filter>

    <filter id="orb26CloudWhiteFine" x="-45%" y="-45%" width="190%" height="190%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.014 0.026" numOctaves="3" seed="53" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 0 0 .03 .18 .50 .84 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.14" result="soft"/>
      <feFlood flood-color="#ffffff" flood-opacity=".78" result="color"/>
      <feComposite in="color" in2="soft" operator="in"/>
    </filter>

    <filter id="orb26CloudBlue" x="-45%" y="-45%" width="190%" height="190%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0105 0.0185" numOctaves="3" seed="31" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 0 .03 .16 .46 .76 .94 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.28" result="soft"/>
      <feFlood flood-color="#2f6283" flood-opacity=".70" result="color"/>
      <feComposite in="color" in2="soft" operator="in"/>
    </filter>

    <filter id="orb26Wisp" x="-46%" y="-46%" width="192%" height="192%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.020 0.050" numOctaves="3" seed="71" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped">
        <feFuncA type="table" tableValues="0 0 0 0 0 0 .08 .34 .72 1"/>
      </feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.12" result="soft"/>
      <feFlood flood-color="#ffffff" flood-opacity=".64" result="color"/>
      <feComposite in="color" in2="soft" operator="in"/>
    </filter>
  </defs>

  <!-- No SVG circle/clip edge: the parent .core itself clips the artwork, avoiding the thin white rim. -->
  <rect x="-3" y="-3" width="206" height="206" fill="url(#orb26Base)"/>

  <!-- Broad internal light fields sit behind all cloud layers. Sparse clouds create clearings where this light breaks through. -->
  <g class="orb-v26-light">
    <ellipse cx="77" cy="72" rx="54" ry="48" fill="url(#orb26LightField)"/>
    <ellipse cx="145" cy="120" rx="43" ry="37" fill="url(#orb26LightField)" opacity=".72"/>
    <ellipse cx="92" cy="151" rx="31" ry="27" fill="url(#orb26LightField)" opacity=".46"/>
  </g>

  <g class="orb-v26-cloud-deep">
    <rect x="-50" y="-50" width="300" height="300" filter="url(#orb26CloudBlue)"/>
  </g>

  <g class="orb-v26-cloud-white-a">
    <rect x="-54" y="-54" width="308" height="308" filter="url(#orb26CloudWhite)"/>
  </g>

  <g class="orb-v26-cloud-white-b">
    <rect x="-58" y="-58" width="316" height="316" filter="url(#orb26CloudWhiteFine)"/>
  </g>

  <g class="orb-v26-wisp">
    <rect x="-62" y="-62" width="324" height="324" filter="url(#orb26Wisp)"/>
  </g>
</svg>`;

function enhance(html){
  const mountScript = '<script>(function(){var svg='+JSON.stringify(ORB_V26_SVG)+';function mount(){document.querySelectorAll(".core").forEach(function(core){if(core.getAttribute("data-orb-v26")==="1")return;core.setAttribute("data-orb-v26","1");core.innerHTML=svg;});}mount();var root=document.getElementById("app")||document.body;new MutationObserver(mount).observe(root,{childList:true,subtree:true});})();</scr'+'ipt>';
  return html
    .replace('</head>','<style>'+ORB_V26_STYLE+'</style></head>')
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
    headers.set('x-talera-orb-app','organic-v26-clearings-contrast-motion');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};