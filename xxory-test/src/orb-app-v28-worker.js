import baseWorker from "./worker.js";

const ORB_V28_STYLE = String.raw`
/* TALERA ORB v28 — v26 texture + v27 scale/flow, with broken cloud fields. Directly on worker.js. */
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
  animation:taleraOrb28Pulse 5.8s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.4s!important}
.core::before,.core::after{display:none!important;content:none!important}

.orb-v28-svg{position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible;pointer-events:none}
.orb-v28-light,.orb-v28-deep,.orb-v28-field-a,.orb-v28-field-b,.orb-v28-wisp{
  transform-box:fill-box;transform-origin:center;will-change:transform,opacity;
}
.orb-v28-light{animation:taleraOrb28Light 7.2s ease-in-out infinite}
.orb-v28-deep{animation:taleraOrb28Deep 8.8s ease-in-out infinite alternate}
.orb-v28-field-a{animation:taleraOrb28FieldA 7.5s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v28-field-b{animation:taleraOrb28FieldB 6.3s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v28-wisp{animation:taleraOrb28Wisp 5.0s ease-in-out infinite alternate}
.core.active .orb-v28-light,.core.listening .orb-v28-light{animation-duration:4.9s}
.core.active .orb-v28-deep,.core.listening .orb-v28-deep{animation-duration:6.0s}
.core.active .orb-v28-field-a,.core.listening .orb-v28-field-a{animation-duration:5.1s}
.core.active .orb-v28-field-b,.core.listening .orb-v28-field-b{animation-duration:4.3s}
.core.active .orb-v28-wisp,.core.listening .orb-v28-wisp{animation-duration:3.5s}

.status::after{content:"  · v28";font-size:9px;opacity:.34;vertical-align:middle}

@keyframes taleraOrb28Pulse{
  0%,18%,100%{scale:.985;border-radius:48% 52% 47% 53% / 53% 46% 54% 47%}
  41%{scale:1.017;border-radius:52% 48% 53% 47% / 47% 54% 46% 53%}
  52%{scale:1.034}
  63%{scale:1.003}
  73%{scale:1.018}
}
@keyframes taleraOrb28Light{
  0%{transform:translate(-9%,-7%) scale(.97);opacity:.74}
  27%{transform:translate(4%,-9%) scale(1.05);opacity:.96}
  55%{transform:translate(12%,4%) scale(1.10);opacity:.88}
  80%{transform:translate(-2%,12%) scale(1.02);opacity:1}
  100%{transform:translate(-9%,-7%) scale(.97);opacity:.74}
}
@keyframes taleraOrb28Deep{
  0%{transform:translate(12%,-9%) scale(1.10) rotate(1.1deg);opacity:.64}
  35%{transform:translate(-9%,-1%) scale(1.18) rotate(-1.2deg);opacity:.84}
  68%{transform:translate(-12%,10%) scale(1.13) rotate(-1.8deg);opacity:.72}
  100%{transform:translate(8%,4%) scale(1.18) rotate(.8deg);opacity:.86}
}
@keyframes taleraOrb28FieldA{
  0%{transform:translate(-13%,-9%) scale(1.05) rotate(-2.0deg);opacity:.80}
  30%{transform:translate(5%,-6%) scale(1.12) rotate(-.4deg);opacity:.97}
  58%{transform:translate(13%,6%) scale(1.08) rotate(1.1deg);opacity:.86}
  82%{transform:translate(-2%,14%) scale(1.15) rotate(-1.0deg);opacity:1}
  100%{transform:translate(-11%,2%) scale(1.10) rotate(.3deg);opacity:.90}
}
@keyframes taleraOrb28FieldB{
  0%{transform:translate(13%,-11%) scale(1.09) rotate(2.0deg);opacity:.52}
  32%{transform:translate(-6%,-2%) scale(1.18) rotate(-.8deg);opacity:.72}
  64%{transform:translate(-14%,10%) scale(1.11) rotate(-1.6deg);opacity:.58}
  100%{transform:translate(9%,5%) scale(1.17) rotate(.8deg);opacity:.75}
}
@keyframes taleraOrb28Wisp{
  0%{transform:translate(-15%,8%) scale(1.04) rotate(-3.2deg);opacity:.34}
  50%{transform:translate(15%,-9%) scale(1.14) rotate(2.2deg);opacity:.58}
  100%{transform:translate(-2%,-15%) scale(1.08) rotate(-.8deg);opacity:.40}
}
`;

const ORB_V28_SVG = String.raw`<svg class="orb-v28-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="orb28Base" cx="30%" cy="24%" r="94%">
      <stop offset="0%" stop-color="#e5f3f8"/>
      <stop offset="25%" stop-color="#b4d6e5"/>
      <stop offset="56%" stop-color="#78acc7"/>
      <stop offset="83%" stop-color="#5a8eae"/>
      <stop offset="100%" stop-color="#3d6b8c"/>
    </radialGradient>
    <radialGradient id="orb28LightField" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="14%" stop-color="#fbfeff" stop-opacity=".96"/>
      <stop offset="34%" stop-color="#eaf8fc" stop-opacity=".76"/>
      <stop offset="60%" stop-color="#c5e4f1" stop-opacity=".36"/>
      <stop offset="100%" stop-color="#8fc4de" stop-opacity="0"/>
    </radialGradient>

    <filter id="orb28CloudField" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.008 0.019" numOctaves="4" seed="23" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped"><feFuncA type="table" tableValues="0 0 0 0 0 .05 .25 .58 .88 1"/></feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.16" result="soft"/>
      <feFlood flood-color="#fbfeff" flood-opacity=".94" result="color"/>
      <feComposite in="color" in2="soft" operator="in" result="cloud"/>
      <feComposite in="cloud" in2="SourceAlpha" operator="in"/>
    </filter>

    <filter id="orb28CloudFine" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.013 0.030" numOctaves="3" seed="61" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped"><feFuncA type="table" tableValues="0 0 0 0 0 .04 .18 .46 .78 1"/></feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.12" result="soft"/>
      <feFlood flood-color="#ffffff" flood-opacity=".75" result="color"/>
      <feComposite in="color" in2="soft" operator="in" result="cloud"/>
      <feComposite in="cloud" in2="SourceAlpha" operator="in"/>
    </filter>

    <filter id="orb28CloudDeep" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.010 0.020" numOctaves="3" seed="37" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped"><feFuncA type="table" tableValues="0 0 0 .02 .10 .28 .56 .80 .95 1"/></feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.22" result="soft"/>
      <feFlood flood-color="#2d5f80" flood-opacity=".68" result="color"/>
      <feComposite in="color" in2="soft" operator="in" result="cloud"/>
      <feComposite in="cloud" in2="SourceAlpha" operator="in"/>
    </filter>

    <filter id="orb28Wisp" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.018 0.052" numOctaves="3" seed="79" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
      <feComponentTransfer in="alpha" result="shaped"><feFuncA type="table" tableValues="0 0 0 0 0 .04 .18 .46 .80 1"/></feComponentTransfer>
      <feGaussianBlur in="shaped" stdDeviation="0.10" result="soft"/>
      <feFlood flood-color="#ffffff" flood-opacity=".58" result="color"/>
      <feComposite in="color" in2="soft" operator="in" result="cloud"/>
      <feComposite in="cloud" in2="SourceAlpha" operator="in"/>
    </filter>
  </defs>

  <rect x="-3" y="-3" width="206" height="206" fill="url(#orb28Base)"/>

  <!-- Two broad clearings: one main opening and one softer secondary opening. -->
  <g class="orb-v28-light">
    <ellipse cx="70" cy="68" rx="58" ry="44" fill="url(#orb28LightField)"/>
    <ellipse cx="139" cy="132" rx="48" ry="38" fill="url(#orb28LightField)" opacity=".68"/>
  </g>

  <!-- Deep banks keep the broad scale of v27 but use irregular paths instead of smooth ribbons. -->
  <g class="orb-v28-deep">
    <path d="M-18 58 C7 31,31 25,56 33 C79 40,93 27,121 29 C148 31,171 45,217 38 L223 89 C192 86,176 102,148 98 C118 94,100 109,73 104 C43 98,24 111,-18 103 Z" fill="#335f7d" filter="url(#orb28CloudDeep)" opacity=".88"/>
    <path d="M-20 128 C8 110,32 117,56 126 C79 135,102 119,127 121 C157 123,180 145,220 136 L224 183 C192 176,170 191,143 184 C113 176,94 191,66 182 C38 173,16 186,-20 176 Z" fill="#335f7d" filter="url(#orb28CloudDeep)" opacity=".70"/>
  </g>

  <!-- Main fields are broad, but broken into cloud clusters with scalloped irregular edges. -->
  <g class="orb-v28-field-a">
    <path d="M-28 34 C-2 13,26 14,47 28 C64 39,77 27,96 24 C119 20,133 36,151 37 C169 38,186 24,226 31 L226 72 C196 70,181 85,158 79 C137 74,120 88,99 82 C76 76,58 92,34 83 C14 75,-4 87,-28 79 Z" fill="#fff" filter="url(#orb28CloudField)"/>
    <path d="M-24 86 C1 67,23 74,43 84 C61 94,78 77,99 78 C120 79,137 97,158 92 C178 87,193 75,226 85 L226 126 C201 119,180 136,157 128 C134 120,119 138,96 130 C72 122,54 139,31 131 C10 124,-8 137,-24 128 Z" fill="#fff" filter="url(#orb28CloudField)" opacity=".92"/>
    <path d="M-18 146 C8 127,29 136,49 147 C70 159,87 142,108 143 C130 144,145 160,167 157 C185 154,200 143,222 150 L222 191 C194 184,176 198,151 191 C130 185,114 201,91 194 C67 187,50 201,28 193 C9 186,-7 195,-18 189 Z" fill="#fff" filter="url(#orb28CloudField)" opacity=".82"/>
  </g>

  <g class="orb-v28-field-b">
    <path d="M-13 55 C11 44,30 48,46 58 C62 68,77 57,94 54 C111 51,125 61,141 64 C159 67,176 60,212 55 L214 80 C186 79,170 90,149 86 C129 83,113 94,95 90 C75 86,58 97,37 91 C17 86,3 91,-13 88 Z" fill="#fff" filter="url(#orb28CloudFine)"/>
    <path d="M-10 117 C13 103,34 109,51 119 C69 130,84 116,102 115 C121 114,136 127,155 126 C173 125,188 113,214 117 L214 145 C190 141,174 153,153 149 C133 145,118 157,98 152 C77 147,60 160,39 153 C20 147,5 154,-10 149 Z" fill="#fff" filter="url(#orb28CloudFine)" opacity=".82"/>
  </g>

  <g class="orb-v28-wisp">
    <path d="M-22 103 C15 89,47 99,73 104 C101 109,127 98,157 99 C181 100,199 106,222 105 L222 118 C196 118,180 123,154 120 C126 117,102 128,74 122 C44 116,16 124,-22 118 Z" fill="#fff" filter="url(#orb28Wisp)"/>
    <path d="M-18 157 C9 146,34 152,57 158 C80 164,101 154,126 155 C153 157,176 167,218 159 L218 171 C184 175,160 171,134 170 C106 168,86 178,58 171 C31 165,8 174,-18 170 Z" fill="#fff" filter="url(#orb28Wisp)" opacity=".68"/>
  </g>
</svg>`;

function enhance(html){
  const mountScript = '<script>(function(){var svg='+JSON.stringify(ORB_V28_SVG)+';function mount(){document.querySelectorAll(".core").forEach(function(core){if(core.getAttribute("data-orb-v28")==="1")return;core.setAttribute("data-orb-v28","1");core.innerHTML=svg;});}mount();var root=document.getElementById("app")||document.body;new MutationObserver(mount).observe(root,{childList:true,subtree:true});})();</scr'+'ipt>';
  return html.replace('</head>','<style>'+ORB_V28_STYLE+'</style></head>').replace('</body>',mountScript+'</body>');
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
    headers.set('x-talera-orb-app','organic-v28-clustered-cloud-fields-clearings');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};