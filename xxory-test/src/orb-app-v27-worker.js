import baseWorker from "./worker.js";

const ORB_V27_STYLE = String.raw`
/* TALERA ORB v27 — broad cloud fields and two clearings. Directly on worker.js. */
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
  background:#6ea8c3!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:0 18px 50px rgba(15,39,71,.09),0 0 22px rgba(73,158,205,.23),0 0 46px rgba(73,158,205,.12)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.12 + var(--voice)*.045))!important;
  transition:transform .18s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb27Pulse 5.8s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.4s!important}
.core::before,.core::after{display:none!important;content:none!important}

.orb-v27-svg{position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible;pointer-events:none}
.orb-v27-light,.orb-v27-deep,.orb-v27-field-a,.orb-v27-field-b,.orb-v27-wisp{
  transform-box:fill-box;transform-origin:center;will-change:transform,opacity;
}
.orb-v27-light{animation:taleraOrb27Light 7.0s ease-in-out infinite}
.orb-v27-deep{animation:taleraOrb27Deep 8.6s ease-in-out infinite alternate}
.orb-v27-field-a{animation:taleraOrb27FieldA 7.4s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v27-field-b{animation:taleraOrb27FieldB 6.2s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v27-wisp{animation:taleraOrb27Wisp 5.0s ease-in-out infinite alternate}
.core.active .orb-v27-light,.core.listening .orb-v27-light{animation-duration:4.8s}
.core.active .orb-v27-deep,.core.listening .orb-v27-deep{animation-duration:5.9s}
.core.active .orb-v27-field-a,.core.listening .orb-v27-field-a{animation-duration:5.0s}
.core.active .orb-v27-field-b,.core.listening .orb-v27-field-b{animation-duration:4.2s}
.core.active .orb-v27-wisp,.core.listening .orb-v27-wisp{animation-duration:3.5s}

.status::after{content:"  · v27";font-size:9px;opacity:.34;vertical-align:middle}

@keyframes taleraOrb27Pulse{
  0%,18%,100%{scale:.985;border-radius:48% 52% 47% 53% / 53% 46% 54% 47%}
  41%{scale:1.017;border-radius:52% 48% 53% 47% / 47% 54% 46% 53%}
  52%{scale:1.034}
  63%{scale:1.003}
  73%{scale:1.018}
}
@keyframes taleraOrb27Light{
  0%{transform:translate(-10%,-8%) scale(.96);opacity:.72}
  28%{transform:translate(4%,-10%) scale(1.05);opacity:.96}
  55%{transform:translate(13%,4%) scale(1.10);opacity:.86}
  79%{transform:translate(-1%,13%) scale(1.02);opacity:1}
  100%{transform:translate(-10%,-8%) scale(.96);opacity:.72}
}
@keyframes taleraOrb27Deep{
  0%{transform:translate(13%,-9%) scale(1.10) rotate(1.2deg);opacity:.66}
  35%{transform:translate(-8%,-1%) scale(1.18) rotate(-1.2deg);opacity:.84}
  68%{transform:translate(-12%,9%) scale(1.13) rotate(-1.7deg);opacity:.72}
  100%{transform:translate(8%,4%) scale(1.19) rotate(.8deg);opacity:.86}
}
@keyframes taleraOrb27FieldA{
  0%{transform:translate(-15%,-10%) scale(1.05) rotate(-3deg);opacity:.78}
  30%{transform:translate(5%,-7%) scale(1.13) rotate(-1deg);opacity:.96}
  58%{transform:translate(14%,6%) scale(1.08) rotate(1.4deg);opacity:.84}
  82%{transform:translate(-2%,15%) scale(1.16) rotate(-1.5deg);opacity:1}
  100%{transform:translate(-12%,2%) scale(1.10) rotate(.4deg);opacity:.88}
}
@keyframes taleraOrb27FieldB{
  0%{transform:translate(14%,-12%) scale(1.10) rotate(2.8deg);opacity:.50}
  32%{transform:translate(-6%,-2%) scale(1.19) rotate(-1.2deg);opacity:.70}
  64%{transform:translate(-15%,11%) scale(1.12) rotate(-2deg);opacity:.57}
  100%{transform:translate(10%,5%) scale(1.18) rotate(1deg);opacity:.73}
}
@keyframes taleraOrb27Wisp{
  0%{transform:translate(-16%,9%) scale(1.04) rotate(-4deg);opacity:.34}
  50%{transform:translate(16%,-10%) scale(1.15) rotate(2.8deg);opacity:.58}
  100%{transform:translate(-2%,-16%) scale(1.08) rotate(-1deg);opacity:.40}
}
`;

const ORB_V27_SVG = String.raw`<svg class="orb-v27-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="orb27Base" cx="30%" cy="24%" r="94%">
      <stop offset="0%" stop-color="#e5f3f8"/>
      <stop offset="25%" stop-color="#b4d6e5"/>
      <stop offset="56%" stop-color="#78acc7"/>
      <stop offset="83%" stop-color="#5a8eae"/>
      <stop offset="100%" stop-color="#3d6b8c"/>
    </radialGradient>
    <radialGradient id="orb27LightField" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="14%" stop-color="#fbfeff" stop-opacity=".96"/>
      <stop offset="34%" stop-color="#eaf8fc" stop-opacity=".76"/>
      <stop offset="60%" stop-color="#c5e4f1" stop-opacity=".36"/>
      <stop offset="100%" stop-color="#8fc4de" stop-opacity="0"/>
    </radialGradient>

    <filter id="orb27CloudField" x="-55%" y="-55%" width="210%" height="210%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.006 0.020" numOctaves="4" seed="23" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped"><feFuncA type="table" tableValues="0 0 0 0 .02 .12 .42 .78 .97 1"/></feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.20" result="soft"/>
      <feFlood flood-color="#fbfeff" flood-opacity=".92" result="color"/>
      <feComposite in="color" in2="soft" operator="in" result="cloud"/>
      <feComposite in="cloud" in2="SourceAlpha" operator="in"/>
    </filter>

    <filter id="orb27CloudFine" x="-55%" y="-55%" width="210%" height="210%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.009 0.030" numOctaves="3" seed="61" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped"><feFuncA type="table" tableValues="0 0 0 0 .02 .10 .34 .66 .90 1"/></feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.14" result="soft"/>
      <feFlood flood-color="#ffffff" flood-opacity=".72" result="color"/>
      <feComposite in="color" in2="soft" operator="in" result="cloud"/>
      <feComposite in="cloud" in2="SourceAlpha" operator="in"/>
    </filter>

    <filter id="orb27CloudDeep" x="-55%" y="-55%" width="210%" height="210%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.007 0.021" numOctaves="3" seed="37" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped"><feFuncA type="table" tableValues="0 0 0 .02 .10 .30 .58 .82 .96 1"/></feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.24" result="soft"/>
      <feFlood flood-color="#2d5f80" flood-opacity=".68" result="color"/>
      <feComposite in="color" in2="soft" operator="in" result="cloud"/>
      <feComposite in="cloud" in2="SourceAlpha" operator="in"/>
    </filter>

    <filter id="orb27Wisp" x="-55%" y="-55%" width="210%" height="210%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.055" numOctaves="3" seed="79" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped"><feFuncA type="table" tableValues="0 0 0 0 0 .05 .20 .50 .82 1"/></feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.10" result="soft"/>
      <feFlood flood-color="#ffffff" flood-opacity=".58" result="color"/>
      <feComposite in="color" in2="soft" operator="in" result="cloud"/>
      <feComposite in="cloud" in2="SourceAlpha" operator="in"/>
    </filter>
  </defs>

  <rect x="-3" y="-3" width="206" height="206" fill="url(#orb27Base)"/>

  <!-- Two broad clearings, no small lamp-spots. -->
  <g class="orb-v27-light">
    <ellipse cx="69" cy="68" rx="58" ry="44" fill="url(#orb27LightField)"/>
    <ellipse cx="139" cy="133" rx="49" ry="39" fill="url(#orb27LightField)" opacity=".70"/>
  </g>

  <!-- Deep cloud banks: broad diagonal fields instead of separate spots. -->
  <g class="orb-v27-deep">
    <ellipse cx="118" cy="70" rx="116" ry="40" transform="rotate(-17 118 70)" fill="#335f7d" filter="url(#orb27CloudDeep)"/>
    <ellipse cx="78" cy="144" rx="108" ry="37" transform="rotate(13 78 144)" fill="#335f7d" filter="url(#orb27CloudDeep)" opacity=".76"/>
  </g>

  <!-- Main cloud fields: long, overlapping bands. -->
  <g class="orb-v27-field-a">
    <ellipse cx="74" cy="54" rx="126" ry="34" transform="rotate(-11 74 54)" fill="#fff" filter="url(#orb27CloudField)"/>
    <ellipse cx="132" cy="111" rx="120" ry="31" transform="rotate(9 132 111)" fill="#fff" filter="url(#orb27CloudField)" opacity=".92"/>
    <ellipse cx="67" cy="167" rx="104" ry="27" transform="rotate(-8 67 167)" fill="#fff" filter="url(#orb27CloudField)" opacity=".82"/>
  </g>

  <g class="orb-v27-field-b">
    <ellipse cx="138" cy="39" rx="92" ry="21" transform="rotate(15 138 39)" fill="#fff" filter="url(#orb27CloudFine)"/>
    <ellipse cx="68" cy="98" rx="106" ry="23" transform="rotate(-18 68 98)" fill="#fff" filter="url(#orb27CloudFine)" opacity=".86"/>
    <ellipse cx="138" cy="158" rx="96" ry="22" transform="rotate(12 138 158)" fill="#fff" filter="url(#orb27CloudFine)" opacity=".78"/>
  </g>

  <g class="orb-v27-wisp">
    <ellipse cx="104" cy="88" rx="115" ry="13" transform="rotate(-6 104 88)" fill="#fff" filter="url(#orb27Wisp)"/>
    <ellipse cx="88" cy="137" rx="103" ry="12" transform="rotate(8 88 137)" fill="#fff" filter="url(#orb27Wisp)" opacity=".72"/>
  </g>
</svg>`;

function enhance(html){
  const mountScript = '<script>(function(){var svg='+JSON.stringify(ORB_V27_SVG)+';function mount(){document.querySelectorAll(".core").forEach(function(core){if(core.getAttribute("data-orb-v27")==="1")return;core.setAttribute("data-orb-v27","1");core.innerHTML=svg;});}mount();var root=document.getElementById("app")||document.body;new MutationObserver(mount).observe(root,{childList:true,subtree:true});})();</scr'+'ipt>';
  return html.replace('</head>','<style>'+ORB_V27_STYLE+'</style></head>').replace('</body>',mountScript+'</body>');
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
    headers.set('x-talera-orb-app','organic-v27-cloud-fields-clearings');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};