import baseWorker from "./worker.js";

const ORB_V30_STYLE = String.raw`
/* TALERA ORB v30 — cloud masses, not stripes. Directly on worker.js. */
.core-wrap{position:relative!important;width:min(58vw,250px)!important;min-width:190px!important;min-height:190px!important;aspect-ratio:1/1!important;display:grid!important;place-items:center!important;overflow:visible!important}
.halo{display:none!important}
.core,.core.active,.core.listening{
  display:block!important;width:80%!important;height:80%!important;position:relative!important;opacity:1!important;visibility:visible!important;overflow:hidden!important;isolation:isolate!important;
  border-radius:49% 51% 48% 52% / 52% 47% 53% 48%!important;
  background:#76abc5!important;background-image:none!important;border:0!important;outline:0!important;
  box-shadow:0 18px 50px rgba(15,39,71,.09),0 0 22px rgba(73,158,205,.20),0 0 48px rgba(73,158,205,.10)!important;
  filter:none!important;transform:scale(calc(.99 + var(--awake)*.12 + var(--voice)*.045))!important;transition:transform .18s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb30Pulse 5.8s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.4s!important}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v30-svg{position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible;pointer-events:none}
.orb-v30-light,.orb-v30-deep,.orb-v30-mass-a,.orb-v30-mass-b,.orb-v30-mass-c{transform-box:fill-box;transform-origin:center;will-change:transform,opacity}
.orb-v30-light{animation:taleraOrb30Light 7.4s ease-in-out infinite}
.orb-v30-deep{animation:taleraOrb30Deep 10.2s ease-in-out infinite alternate}
.orb-v30-mass-a{animation:taleraOrb30MassA 8.8s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v30-mass-b{animation:taleraOrb30MassB 7.4s cubic-bezier(.45,.05,.40,.96) infinite alternate}
.orb-v30-mass-c{animation:taleraOrb30MassC 6.4s ease-in-out infinite alternate}
.core.active .orb-v30-light,.core.listening .orb-v30-light{animation-duration:5.0s}
.core.active .orb-v30-deep,.core.listening .orb-v30-deep{animation-duration:6.8s}
.core.active .orb-v30-mass-a,.core.listening .orb-v30-mass-a{animation-duration:5.8s}
.core.active .orb-v30-mass-b,.core.listening .orb-v30-mass-b{animation-duration:4.9s}
.core.active .orb-v30-mass-c,.core.listening .orb-v30-mass-c{animation-duration:4.2s}
.status::after{content:"  · v30";font-size:9px;opacity:.34;vertical-align:middle}
@keyframes taleraOrb30Pulse{0%,18%,100%{scale:.985;border-radius:49% 51% 48% 52% / 52% 47% 53% 48%}41%{scale:1.017;border-radius:51% 49% 52% 48% / 48% 53% 47% 52%}52%{scale:1.032}63%{scale:1.003}73%{scale:1.017}}
@keyframes taleraOrb30Light{0%{transform:translate(-8%,-7%) scale(.97);opacity:.76}29%{transform:translate(5%,-9%) scale(1.05);opacity:.95}56%{transform:translate(12%,4%) scale(1.09);opacity:.86}81%{transform:translate(-1%,12%) scale(1.02);opacity:.98}100%{transform:translate(-8%,-7%) scale(.97);opacity:.76}}
@keyframes taleraOrb30Deep{0%{transform:translate(8%,-6%) scale(1.06) rotate(1deg);opacity:.58}48%{transform:translate(-7%,4%) scale(1.12) rotate(-1deg);opacity:.72}100%{transform:translate(5%,7%) scale(1.08) rotate(.6deg);opacity:.64}}
@keyframes taleraOrb30MassA{0%{transform:translate(-10%,-7%) scale(1.03) rotate(-2deg);opacity:.82}34%{transform:translate(4%,-4%) scale(1.09) rotate(.7deg);opacity:.96}68%{transform:translate(8%,7%) scale(1.05) rotate(1.4deg);opacity:.86}100%{transform:translate(-6%,4%) scale(1.08) rotate(-.5deg);opacity:.92}}
@keyframes taleraOrb30MassB{0%{transform:translate(9%,-8%) scale(1.05) rotate(2deg);opacity:.52}39%{transform:translate(-5%,1%) scale(1.11) rotate(-1deg);opacity:.70}74%{transform:translate(-9%,8%) scale(1.07) rotate(-1.5deg);opacity:.60}100%{transform:translate(6%,4%) scale(1.10) rotate(.8deg);opacity:.72}}
@keyframes taleraOrb30MassC{0%{transform:translate(-8%,7%) scale(1.02) rotate(-2.6deg);opacity:.34}50%{transform:translate(9%,-7%) scale(1.09) rotate(2deg);opacity:.52}100%{transform:translate(-1%,-9%) scale(1.05) rotate(-.8deg);opacity:.40}}
`;

const ORB_V30_SVG = String.raw`<svg class="orb-v30-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
<defs>
  <radialGradient id="orb30Base" cx="30%" cy="25%" r="92%"><stop offset="0%" stop-color="#dff0f7"/><stop offset="27%" stop-color="#afd3e3"/><stop offset="58%" stop-color="#78acc7"/><stop offset="84%" stop-color="#5b90af"/><stop offset="100%" stop-color="#426f90"/></radialGradient>
  <radialGradient id="orb30Light" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffffff" stop-opacity=".98"/><stop offset="18%" stop-color="#f8fdff" stop-opacity=".86"/><stop offset="42%" stop-color="#dceff7" stop-opacity=".48"/><stop offset="72%" stop-color="#a8d1e5" stop-opacity=".14"/><stop offset="100%" stop-color="#8fc4de" stop-opacity="0"/></radialGradient>
  <filter id="orb30SoftMass" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.020 0.028" numOctaves="3" seed="41" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="11" xChannelSelector="R" yChannelSelector="B" result="warped"/>
    <feGaussianBlur in="warped" stdDeviation="1.6"/>
  </filter>
  <filter id="orb30FineMass" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.026 0.035" numOctaves="3" seed="73" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="B" result="warped"/>
    <feGaussianBlur in="warped" stdDeviation="1.1"/>
  </filter>
  <filter id="orb30DeepMass" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.017 0.024" numOctaves="3" seed="17" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="B" result="warped"/>
    <feGaussianBlur in="warped" stdDeviation="1.8"/>
  </filter>
</defs>
<rect x="-3" y="-3" width="206" height="206" fill="url(#orb30Base)"/>
<g class="orb-v30-light"><ellipse cx="73" cy="70" rx="49" ry="39" fill="url(#orb30Light)"/><ellipse cx="143" cy="132" rx="36" ry="30" fill="url(#orb30Light)" opacity=".62"/></g>
<g class="orb-v30-deep" filter="url(#orb30DeepMass)" fill="#3e718f">
  <ellipse cx="139" cy="68" rx="53" ry="28" opacity=".35"/><ellipse cx="72" cy="132" rx="47" ry="25" opacity=".28"/><ellipse cx="153" cy="163" rx="43" ry="22" opacity=".30"/>
</g>
<g class="orb-v30-mass-a" filter="url(#orb30SoftMass)" fill="#f6fcff">
  <ellipse cx="58" cy="54" rx="39" ry="21" opacity=".72"/><ellipse cx="88" cy="62" rx="44" ry="24" opacity=".68"/><ellipse cx="111" cy="50" rx="31" ry="18" opacity=".54"/>
  <ellipse cx="129" cy="112" rx="45" ry="23" opacity=".52"/><ellipse cx="163" cy="102" rx="32" ry="18" opacity=".44"/>
</g>
<g class="orb-v30-mass-b" filter="url(#orb30FineMass)" fill="#ffffff">
  <ellipse cx="48" cy="112" rx="34" ry="18" opacity=".42"/><ellipse cx="77" cy="121" rx="39" ry="21" opacity=".48"/><ellipse cx="103" cy="109" rx="28" ry="16" opacity=".34"/>
  <ellipse cx="113" cy="160" rx="38" ry="19" opacity=".38"/><ellipse cx="149" cy="151" rx="31" ry="17" opacity=".34"/><ellipse cx="174" cy="166" rx="27" ry="15" opacity=".28"/>
</g>
<g class="orb-v30-mass-c" filter="url(#orb30FineMass)" fill="#f9fdff">
  <ellipse cx="34" cy="77" rx="25" ry="12" opacity=".28"/><ellipse cx="157" cy="53" rx="29" ry="14" opacity=".26"/><ellipse cx="177" cy="129" rx="25" ry="13" opacity=".24"/><ellipse cx="55" cy="170" rx="29" ry="15" opacity=".25"/>
</g>
</svg>`;

function enhance(html){
  const mountScript='<script>(function(){var svg='+JSON.stringify(ORB_V30_SVG)+';function mount(){document.querySelectorAll(".core").forEach(function(core){if(core.getAttribute("data-orb-v30")==="1")return;core.setAttribute("data-orb-v30","1");core.innerHTML=svg;});}mount();var root=document.getElementById("app")||document.body;new MutationObserver(mount).observe(root,{childList:true,subtree:true});})();</scr'+'ipt>';
  return html.replace('</head>','<style>'+ORB_V30_STYLE+'</style></head>').replace('</body>',mountScript+'</body>');
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
    headers.set('x-talera-orb-app','organic-v30-cloud-masses');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
