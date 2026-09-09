import baseWorker from "./worker.js";

const ORB_V29_STYLE = String.raw`
/* TALERA ORB v29 — broken cloud fields, natural clearings, direct on worker.js. */
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
  background:#6da7c3!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    0 18px 50px rgba(15,39,71,.09),
    0 0 20px rgba(76,160,205,.24),
    0 0 46px rgba(76,160,205,.12)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.12 + var(--voice)*.045))!important;
  transition:transform .18s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb29Pulse 5.7s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.3s!important}
.core::before,.core::after{display:none!important;content:none!important}

.orb-v29-svg{position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible;pointer-events:none}
.orb-v29-light,.orb-v29-deep-a,.orb-v29-deep-b,.orb-v29-cloud-a,.orb-v29-cloud-b,.orb-v29-cloud-c,.orb-v29-wisp{
  transform-box:fill-box;transform-origin:center;will-change:transform,opacity;
}
.orb-v29-light{animation:taleraOrb29Light 6.8s ease-in-out infinite}
.orb-v29-deep-a{animation:taleraOrb29DeepA 9.2s ease-in-out infinite alternate}
.orb-v29-deep-b{animation:taleraOrb29DeepB 11.4s ease-in-out infinite alternate}
.orb-v29-cloud-a{animation:taleraOrb29CloudA 7.6s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v29-cloud-b{animation:taleraOrb29CloudB 6.4s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v29-cloud-c{animation:taleraOrb29CloudC 8.4s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v29-wisp{animation:taleraOrb29Wisp 5.2s ease-in-out infinite alternate}
.core.active .orb-v29-light,.core.listening .orb-v29-light{animation-duration:4.7s}
.core.active .orb-v29-deep-a,.core.listening .orb-v29-deep-a{animation-duration:6.2s}
.core.active .orb-v29-deep-b,.core.listening .orb-v29-deep-b{animation-duration:7.2s}
.core.active .orb-v29-cloud-a,.core.listening .orb-v29-cloud-a{animation-duration:5.0s}
.core.active .orb-v29-cloud-b,.core.listening .orb-v29-cloud-b{animation-duration:4.3s}
.core.active .orb-v29-cloud-c,.core.listening .orb-v29-cloud-c{animation-duration:5.5s}
.core.active .orb-v29-wisp,.core.listening .orb-v29-wisp{animation-duration:3.6s}

.status::after{content:"  · v29";font-size:9px;opacity:.34;vertical-align:middle}

@keyframes taleraOrb29Pulse{
  0%,18%,100%{scale:.985;border-radius:49% 51% 48% 52% / 52% 47% 53% 48%}
  41%{scale:1.017;border-radius:52% 48% 53% 47% / 47% 54% 46% 53%}
  52%{scale:1.034}
  63%{scale:1.003}
  73%{scale:1.018}
}
@keyframes taleraOrb29Light{
  0%{transform:translate(-8%,-6%) scale(.96);opacity:.70}
  28%{transform:translate(5%,-9%) scale(1.05);opacity:.96}
  56%{transform:translate(12%,5%) scale(1.10);opacity:.86}
  80%{transform:translate(-2%,12%) scale(1.02);opacity:.98}
  100%{transform:translate(-8%,-6%) scale(.96);opacity:.70}
}
@keyframes taleraOrb29DeepA{
  0%{transform:translate(10%,-7%) scale(1.08) rotate(1deg);opacity:.64}
  36%{transform:translate(-7%,1%) scale(1.16) rotate(-1.1deg);opacity:.80}
  70%{transform:translate(-10%,8%) scale(1.11) rotate(-1.5deg);opacity:.70}
  100%{transform:translate(7%,4%) scale(1.17) rotate(.7deg);opacity:.84}
}
@keyframes taleraOrb29DeepB{
  0%{transform:translate(-9%,6%) scale(1.10) rotate(-1.4deg);opacity:.38}
  44%{transform:translate(8%,-4%) scale(1.17) rotate(1.0deg);opacity:.54}
  100%{transform:translate(-2%,-8%) scale(1.12) rotate(-.4deg);opacity:.44}
}
@keyframes taleraOrb29CloudA{
  0%{transform:translate(-12%,-8%) scale(1.05) rotate(-2.4deg);opacity:.80}
  30%{transform:translate(5%,-6%) scale(1.13) rotate(.5deg);opacity:.96}
  58%{transform:translate(12%,6%) scale(1.08) rotate(1.5deg);opacity:.84}
  82%{transform:translate(-2%,13%) scale(1.15) rotate(-.8deg);opacity:1}
  100%{transform:translate(-10%,2%) scale(1.10) rotate(.3deg);opacity:.88}
}
@keyframes taleraOrb29CloudB{
  0%{transform:translate(12%,-10%) scale(1.10) rotate(2.2deg);opacity:.48}
  32%{transform:translate(-6%,-1%) scale(1.18) rotate(-1deg);opacity:.70}
  64%{transform:translate(-13%,10%) scale(1.12) rotate(-1.8deg);opacity:.57}
  100%{transform:translate(9%,5%) scale(1.17) rotate(.9deg);opacity:.73}
}
@keyframes taleraOrb29CloudC{
  0%{transform:translate(-6%,10%) scale(1.08) rotate(-1.1deg);opacity:.40}
  47%{transform:translate(9%,-7%) scale(1.15) rotate(1.4deg);opacity:.58}
  100%{transform:translate(-3%,-10%) scale(1.10) rotate(-.5deg);opacity:.46}
}
@keyframes taleraOrb29Wisp{
  0%{transform:translate(-14%,8%) scale(1.04) rotate(-3.2deg);opacity:.28}
  50%{transform:translate(14%,-9%) scale(1.14) rotate(2.4deg);opacity:.50}
  100%{transform:translate(-1%,-14%) scale(1.07) rotate(-.8deg);opacity:.34}
}
`;

const ORB_V29_SVG = String.raw`<svg class="orb-v29-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="orb29Base" cx="30%" cy="24%" r="94%">
      <stop offset="0%" stop-color="#e3f2f8"/>
      <stop offset="24%" stop-color="#b4d7e5"/>
      <stop offset="56%" stop-color="#79adc7"/>
      <stop offset="83%" stop-color="#5a8fae"/>
      <stop offset="100%" stop-color="#3d6c8d"/>
    </radialGradient>
    <radialGradient id="orb29LightField" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="14%" stop-color="#fbfeff" stop-opacity=".96"/>
      <stop offset="34%" stop-color="#eaf8fc" stop-opacity=".76"/>
      <stop offset="60%" stop-color="#c6e5f2" stop-opacity=".36"/>
      <stop offset="100%" stop-color="#8fc4de" stop-opacity="0"/>
    </radialGradient>

    <filter id="orb29CloudWhite" x="-45%" y="-45%" width="190%" height="190%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.020" numOctaves="4" seed="29" stitchTiles="stitch" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="B" result="rough"/>
      <feGaussianBlur in="rough" stdDeviation="1.15"/>
    </filter>
    <filter id="orb29CloudFine" x="-45%" y="-45%" width="190%" height="190%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.020 0.034" numOctaves="3" seed="67" stitchTiles="stitch" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="B" result="rough"/>
      <feGaussianBlur in="rough" stdDeviation=".75"/>
    </filter>
    <filter id="orb29CloudDeep" x="-45%" y="-45%" width="190%" height="190%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.013 0.022" numOctaves="3" seed="41" stitchTiles="stitch" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="B" result="rough"/>
      <feGaussianBlur in="rough" stdDeviation="1.0"/>
    </filter>
    <filter id="orb29Wisp" x="-45%" y="-45%" width="190%" height="190%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.028 0.050" numOctaves="3" seed="83" stitchTiles="stitch" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="B" result="rough"/>
      <feGaussianBlur in="rough" stdDeviation=".65"/>
    </filter>
  </defs>

  <rect x="-3" y="-3" width="206" height="206" fill="url(#orb29Base)"/>

  <!-- Broad light fields behind the cloud masses: one main clearing and one secondary. -->
  <g class="orb-v29-light">
    <ellipse cx="70" cy="67" rx="57" ry="45" fill="url(#orb29LightField)"/>
    <ellipse cx="141" cy="136" rx="47" ry="38" fill="url(#orb29LightField)" opacity=".72"/>
  </g>

  <!-- Deep banks are split into separate masses instead of continuous bands. -->
  <g class="orb-v29-deep-a" fill="#315f7e" filter="url(#orb29CloudDeep)">
    <path d="M-15 61 C18 39 49 45 70 54 C91 63 113 49 137 46 C159 43 181 50 211 65 L211 92 C181 85 157 88 136 96 C113 105 94 94 74 89 C49 82 24 88 -15 101 Z" opacity=".52"/>
    <path d="M-18 142 C16 125 42 129 67 139 C91 149 112 146 137 136 C160 127 183 129 214 144 L214 174 C181 160 159 162 137 174 C115 185 91 181 69 171 C43 160 17 164 -18 178 Z" opacity=".48"/>
  </g>
  <g class="orb-v29-deep-b" fill="#3a6d8b" filter="url(#orb29CloudDeep)">
    <path d="M18 105 C39 94 58 98 76 107 C96 117 110 116 128 106 C149 95 166 95 187 105 C168 112 151 119 137 128 C116 141 96 139 76 130 C58 122 38 121 18 125 Z" opacity=".34"/>
  </g>

  <!-- Broken white cloud fields: clustered, irregular, multiple directions. -->
  <g class="orb-v29-cloud-a" fill="#fbfeff" filter="url(#orb29CloudWhite)">
    <path d="M-14 39 C13 22 33 24 52 33 C65 39 76 39 90 31 C111 19 129 21 145 31 C153 36 164 39 179 36 C190 34 201 37 214 47 L214 67 C190 60 173 63 158 71 C139 81 119 78 101 68 C86 60 72 59 55 69 C37 80 16 77 -14 67 Z" opacity=".74"/>
    <path d="M13 117 C31 103 48 104 65 113 C79 121 92 123 106 116 C122 107 137 107 151 115 C165 122 178 122 194 116 C183 132 171 140 157 143 C140 147 127 142 113 136 C98 130 86 132 73 140 C56 151 38 149 22 140 C15 136 10 128 13 117 Z" opacity=".54"/>
  </g>

  <g class="orb-v29-cloud-b" fill="#ffffff" filter="url(#orb29CloudFine)">
    <path d="M-8 82 C12 70 30 70 47 78 C60 84 72 85 85 79 C101 72 116 73 130 81 C144 89 157 89 172 82 C184 77 197 78 211 87 L211 102 C194 96 178 97 164 104 C148 112 133 111 118 103 C104 96 90 96 77 103 C60 112 44 111 29 103 C15 96 3 97 -8 102 Z" opacity=".52"/>
    <path d="M34 155 C50 145 64 146 78 153 C89 159 99 160 111 154 C124 147 137 147 149 154 C160 160 173 161 190 155 C181 169 168 177 154 178 C139 180 127 174 115 168 C104 162 94 163 82 170 C65 180 50 177 39 170 C34 166 31 160 34 155 Z" opacity=".50"/>
  </g>

  <g class="orb-v29-cloud-c" fill="#eaf7fc" filter="url(#orb29CloudWhite)">
    <path d="M31 22 C47 14 61 17 73 25 C86 34 98 35 111 28 C125 20 139 21 154 30 C140 39 126 43 112 42 C98 41 86 38 74 41 C59 45 46 42 35 35 C30 31 28 26 31 22 Z" opacity=".42"/>
    <path d="M116 182 C131 173 145 174 158 182 C170 189 181 190 195 184 C188 197 176 204 163 204 C148 203 137 198 126 194 C119 191 115 187 116 182 Z" opacity=".36"/>
  </g>

  <g class="orb-v29-wisp" fill="#ffffff" filter="url(#orb29Wisp)">
    <path d="M5 131 C27 120 47 122 66 131 C82 138 99 139 116 132 C134 124 150 124 170 132 C148 138 131 145 114 149 C95 153 77 150 61 145 C42 139 24 138 5 143 Z" opacity=".30"/>
  </g>
</svg>`;

function enhance(html){
  const mountScript = '<script>(function(){var svg='+JSON.stringify(ORB_V29_SVG)+';function mount(){document.querySelectorAll(".core").forEach(function(core){if(core.getAttribute("data-orb-v29")==="1")return;core.setAttribute("data-orb-v29","1");core.innerHTML=svg;});}mount();var root=document.getElementById("app")||document.body;new MutationObserver(mount).observe(root,{childList:true,subtree:true});})();</scr'+'ipt>';
  return html.replace('</head>','<style>'+ORB_V29_STYLE+'</style></head>').replace('</body>',mountScript+'</body>');
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
    headers.set('x-talera-orb-app','organic-v29-broken-cloud-fields');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
