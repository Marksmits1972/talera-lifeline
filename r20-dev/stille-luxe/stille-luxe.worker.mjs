const BRAND_CSS = "/* TALERA Stille luxe | 04-11-2026 | ONE compact design-system source.\n   Deliberately does not style photo/video surfaces, player clocks or swipe layers. */\n:root{\n  --talera-white:#FFFFFF;--talera-ivory:#F7F5F0;\n  --talera-ink:#304653;--talera-muted:#718D9A;\n  --talera-mist:#B5C6CD;--talera-lime:#B8D943;\n  --ink:#304653;--deep:#304653;--blue:#304653;\n  --muted:#718D9A;--light:#B5C6CD;--soft:#F7F5F0;\n  --neutral:#FFFFFF;--white:#FFFFFF;--cream:#F7F5F0;\n  --talera-radius-sm:8px;--talera-radius-md:12px;\n  --talera-radius-lg:16px;--talera-gap:12px;\n}\nhtml,body{background-color:#FFFFFF;color:#304653;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,system-ui,sans-serif;}\n:is(.app,.viewport,.screen,.timeline-page,.detail,.detail-list,.preview,.preview-description,.ages,.work,.sheet,.menu-panel,.settings-panel){background-color:#FFFFFF;}\n:is(.logo,h1,h2,h3,.page-title,.memory-title,.story-name,.preview-title,.sheet h2){color:#304653;}\n/* Photo-overlay copy must remain readable; unlike regular page text, it is white. */\n.hero-caption,.hero-caption h1,.hero-caption small{color:#FFFFFF;}\n:is(.subtle,.muted,.hint,.caption,.meta,.story-loc,.detail-subtle,.month-mark,.age-info small){color:#718D9A;}\n:is(.topbar,header:not(.presentation-header):not(.mast)){background-color:#FFFFFF;}\n/* Approved 04-11 photo-led home variant: dark top safe area, transparent mast on photo. */\nhtml[data-talera-hero=\"true\"],html[data-talera-hero=\"true\"] body{background-color:#FFFFFF;}\nhtml[data-talera-hero=\"true\"] .hero{background:#304653;}\nhtml[data-talera-hero=\"true\"] .mast{background:transparent;color:#FFFFFF;}\nhtml[data-talera-hero=\"true\"] .mast .logo{color:#FFFFFF;text-shadow:0 1px 5px #304653;}\nhtml[data-talera-hero=\"true\"] .mast .logo::before{background-color:#FFFFFF;border-radius:5px;}\nbutton,input,textarea,select{font-family:inherit;}\n:is(button,[role='button']){letter-spacing:0;font-weight:600;}\n:is(.primary,.btn-primary,.primary-button,button.primary,button[data-primary],#v30DateSave){background-color:#304653;color:#FFFFFF;border:1px solid #304653;border-radius:12px;}\n:is(.secondary,.btn-secondary,.secondary-button,button.secondary){background-color:#FFFFFF;color:#304653;border:1px solid #B5C6CD;border-radius:12px;}\n:is(.tertiary,.btn-tertiary,.text-button){background-color:transparent;color:#304653;border-color:transparent;}\n:is(input:not([type='checkbox']):not([type='radio']),textarea,select){color:#304653;border-color:#B5C6CD;border-radius:12px;}\n:is(input,textarea,select):focus-visible{outline:2px solid #718D9A;outline-offset:2px;}\n:is(.card,.memory-card,.story,.preview,.detail-list){box-shadow:none;}\n:is(.card,.memory-card,.detail-list,.preview){border-color:#B5C6CD;}\n:is(.logo){font-weight:650;letter-spacing:.13em;display:inline-flex;align-items:center;gap:7px;}\n.logo::before{content:'';display:inline-block;flex:0 0 24px;width:24px;height:24px;background:url('/talera-stille-luxe-icon-180.png') center/contain no-repeat;}\nbody{font-size:16px;line-height:1.45;}\nh1,.page-title{font-size:clamp(23px,5vw,29px);font-weight:680;line-height:1.2;letter-spacing:-.025em;}\nh2,.memory-title{font-size:clamp(19px,4.6vw,23px);font-weight:650;line-height:1.25;letter-spacing:-.015em;}\n:is(.date,.date-label,.meta){font-size:13px;line-height:1.4;}\n:is(.hint,.caption,.small-label){font-size:12px;line-height:1.4;}\n@media(max-width:420px){\n  :is(.sheet,.menu-panel,.settings-panel){max-width:100%;}\n  :is(input,textarea,select){max-width:100%;min-width:0;}\n  :is(.app,.viewport,.screen){max-width:100vw;}\n}\n/* Legacy UI selectors observed in V56/R20: visual states only. */\n.topbar,.bottom-nav{background:#FFFFFF;border-color:#B5C6CD;}\n.hamburger-lines,.hamburger-lines::before,.hamburger-lines::after{background:#304653;}\n.nav-item{color:#718D9A;}\n.nav-item.selected{color:#304653;}\n.nav-item.selected::before{background:#F7F5F0;box-shadow:none;border-radius:14px;}\n.age-row.selected,.story.active{background:#F7F5F0;}\n.age-row.selected .age-pin,.month-point.active{background:#718D9A;border-color:#B5C6CD;box-shadow:none;}\n.age-row.selected .age-photo{outline:1.5px solid #718D9A;}\n.month-mark.active{color:#304653;}\n.age-track,.month-line,.mini-tick{background:#B5C6CD;}\n.timeline{background:#FFFFFF;border-color:#B5C6CD;}\n.detail-list,.preview{background:#FFFFFF;border:1px solid #B5C6CD;box-shadow:none;}\n.sheetHead h2{color:#304653;font-size:24px;line-height:1.25;}\n.sheetHead p{color:#718D9A;}\n.closeSheet{background:#F7F5F0;color:#304653;}\n/* Following style round: native editor, date dialogue and controls, colors only. */\n#app .work.talera-compact-work.talera-r16-editor .talera-v14-heading #title{color:#304653!important;}\n#app .work.talera-compact-work.talera-r16-editor #details .talera-tags-toggle{color:#718D9A!important;}\n#app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar #publish{background-color:#304653!important;color:#FFFFFF!important;box-shadow:none!important;}\n#app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar :is(#speak,#write){color:#304653!important;}\n#v30DateBox{background:#FFFFFF;color:#304653;border-radius:16px;}\n#v30DateBox h2{color:#304653;}\n#v30DateBox :is(#v13ExactDate,#v13Year,#v13Month,#v13Season){background-color:#F7F5F0;color:#304653;border-color:#B5C6CD;}\n#v30DateBox :is(#v13Expand,#v13BackToDate){color:#718D9A;}\n#v30DateBox #v30DateSave{background:#304653;color:#FFFFFF;border-color:#304653;}\n#v30DateBox #v30DateCancel{background:#FFFFFF;color:#304653;border-color:#B5C6CD;}\n/* Protected photo, narration, player, slide and swipe layers remain untouched. */";
const PALETTE = Object.freeze({
  white:'#FFFFFF', ivory:'#F7F5F0', ink:'#304653',
  muted:'#718D9A', mist:'#B5C6CD', lime:'#B8D943'
});
const HTML_PATHS = new Set(['/', '/mijn-leven','/mijn-leven/','/tell','/tell/','/meer','/instellingen','/settings','/login','/account','/hub','/privacy','/messages','/ontvangen','/meldingen','/samen','/gedeeld','/tijdlijn']);
const OLD = [
 ['#1d2b4b','#304653'],['#0f2747','#304653'],['#173d52','#304653'],
 ['#193852','#304653'],['#183856','#304653'],['#193f52','#304653'],
 ['#173e56','#304653'],['#102e54','#304653'],['#0b6cce','#304653'],
 ['#337cca','#304653'],['#216fad','#304653'],['#1268bf','#304653'],
 ['#5b8fb9','#718D9A'],['#77839a','#718D9A'],['#60738a','#718D9A'],
 ['#647181','#718D9A'],['#e7a98b','#B5C6CD'],['#dceaf6','#B5C6CD'],
 ['#e9f3ff','#F7F5F0'],['#edf5fc','#F7F5F0'],['#f7f4ef','#FFFFFF'],
 ['#f5f1ea','#FFFFFF'],['#fbfaf7','#FFFFFF'],['#faf9f6','#FFFFFF'],
 ['#fffdfa','#FFFFFF'],['#fffefa','#FFFFFF'],['#f8f9f7','#FFFFFF']
];
OLD.push(
 ['#1e2a46','#304653'],['#2a76c5','#304653'],['#2577c9','#304653'],
 ['#0866d5','#304653'],['#2584df','#718D9A'],['#2986dc','#718D9A'],
 ['#3689df','#718D9A'],['#3384d6','#718D9A'],['#e8f3ff','#F7F5F0'],
 ['#ecf5ff','#F7F5F0'],['#eaf4ff','#F7F5F0'],['#e6f1fd','#F7F5F0'],
 ['#e6f1ff','#F7F5F0'],['#dbeeff','#B5C6CD']
);
const REGEX = new RegExp(OLD.map(([x])=>x.replace('#','\\#')).join('|'),'gi');
function rewriteStyleBlock(html){
  // Protect all JavaScript including embedded style templates, the narration
  // engine, and the presentation renderer. Process actual CSS blocks only.
  const protectedSelector=/(?:photoStage|photoLayer|story-synced-photo|talera-v61-narration|talera-v61-inline-record|taleraV61Rec|player-clock|presentatie|presentation|\.baseStage|#frame\b|\.recording|\.swipe)/i;
  const color=c=>OLD.find(([v])=>v===c.toLowerCase())?.[1]||c;
  return html.split(/(<script\b[^>]*>[\s\S]*?<\/script\s*>)/gi).map(part=>{
    if(/^<script\b/i.test(part))return part;
    return part.replace(/<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi,(whole,attrs,body)=>{
      if(/(?:talera-v8|narration|photo-strip|player-clock|presentation)/i.test(attrs))return whole;
      // Only rewrite declaration values of safe ordinary-UI selectors.
      // Never rewrite the protected photo/player/recording CSS even if
      // it shares a stylesheet with a navigation rule.
      const safe=body.replace(/([^{}]+)\{([^{}]*)\}/g,(rule,sel,declarations)=>{
        if(protectedSelector.test(sel))return rule;
        return sel+'{'+declarations.replace(REGEX,color)+'}';
      });
      return '<style'+attrs+'>'+safe+'</style>';
    });
  }).join('');
}
function updateHtml(html){
  let output=rewriteStyleBlock(html);
  // Hero is an image-led welcome surface; other ordinary screens remain white.
  const hasHero=/<(?:div|section)\b[^>]*class=["'][^"']*\bhero-caption\b/i.test(html);
  if(hasHero&&!output.includes('data-talera-hero="true"'))
    output=output.replace(/<html\b/i,'<html data-talera-hero="true"');
  const theme=hasHero?'#304653':'#FFFFFF';
  output=output.replace(/(<meta\s+name=["']theme-color["']\s+content=["'])[^"']+(["'])/i,'$1'+theme+'$2');
  // The Home Screen launcher must request the SAME translucent mode as
  // /present. Previously the launcher explicitly forced 'default'; on iOS
  // this can persist for subsequent navigation, leaving a dark status-bar
  // block ABOVE the supposedly full-bleed photograph. Do not change layout,
  // photographs, gestures or media; keep ordinary-page body background white.
  output=output.replace(/(<meta\s+name=["']apple-mobile-web-app-status-bar-style["']\s+content=["'])[^"']+(["'])/i,'$1black-translucent$2');
  if(!/name=["']apple-mobile-web-app-status-bar-style["']/i.test(output))
    output=output.replace('</head>','<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n</head>');

  const head='<!-- TALERA STILLE LUXE, central compact style -->\n<style id="talera-stille-luxe">' + BRAND_CSS + '</style>\n';
  if(!output.includes('id="talera-stille-luxe"')&&output.includes('</head>'))
    output=output.replace('</head>',head+'</head>');
  return output;
}
function u32(d,o){return ((d[o]*16777216+d[o+1]*65536+d[o+2]*256+d[o+3])>>>0);}
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function put32(a,n){a.push((n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255);}
function pngChunk(type,data){const ascii=Array.from(type).map(c=>c.charCodeAt(0));const out=[];put32(out,data.length);out.push(...ascii,...data);put32(out,crc([...ascii,...data]));return out;}
function paeth(a,b,c){const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;}
async function recolorPng(response){
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.length<33||String.fromCharCode(...bytes.subarray(1,4))!=='PNG')return null;
  const width=u32(bytes,16),height=u32(bytes,20),depth=bytes[24],type=bytes[25],interlace=bytes[28];
  if(depth!==8||![2,6].includes(type)||interlace!==0||width>1024||height>1024)return null;
  const idat=[];let size=0;
  for(let off=8;off+12<=bytes.length;){
    const len=u32(bytes,off),name=String.fromCharCode(...bytes.subarray(off+4,off+8));
    if(len>bytes.length-off-12)break;
    if(name==='IDAT'){idat.push(bytes.subarray(off+8,off+8+len));size+=len;}
    off+=len+12;
    if(name==='IEND')break;
  }
  if(!size)return null;
  const raw=new Uint8Array(size);let offset=0;
  for(const p of idat){raw.set(p,offset);offset+=p.length;}
  const unzipped=new Uint8Array(await new Response(new Response(raw).body.pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  const bpp=type===2?3:4,stride=width*bpp;
  if(unzipped.length!==(stride+1)*height)return null;
  const pixels=new Uint8Array(stride*height);
  for(let y=0;y<height;y++){
    const filter=unzipped[y*(stride+1)],start=y*(stride+1)+1,dst=y*stride;
    if(filter>4)return null;
    for(let j=0;j<stride;j++){
      const l=j>=bpp?pixels[dst+j-bpp]:0,up=y?pixels[dst-stride+j]:0,
        ul=y&&j>=bpp?pixels[dst-stride+j-bpp]:0;
      const predictor=filter===1?l:filter===2?up:filter===3?Math.floor((l+up)/2):filter===4?paeth(l,up,ul):0;
      pixels[dst+j]=(unzipped[start+j]+predictor)&255;
    }
  }
  const picks=[[48,70,83],[113,141,154],[181,198,205]];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*stride+x*bpp,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
    // Recolor only original chromatic blue panels, preserve whites,
    // their rounded corners, exact route and every pixel's position.
    const chroma=Math.min(b-r,b-g);
    if(b<g||b-r<16||b-g<5||r>225&&g>225)continue;
    const xf=x/width;
    let target;
    if(xf<.515)target=picks[0];
    else if(xf>.68&&g>118)target=picks[2];
    else target=picks[1];
    const edge=Math.max(0,Math.min(1,(b-r-10)/27));
    for(let k=0;k<3;k++)pixels[i+k]=Math.round(255*(1-edge)+target[k]*edge);
  }
  const output=new Uint8Array((stride+1)*height);
  for(let y=0;y<height;y++)output.set(pixels.subarray(y*stride,(y+1)*stride),y*(stride+1)+1);
  const deflate=new Uint8Array(await new Response(new Response(output).body.pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
  const out=[137,80,78,71,13,10,26,10];
  out.push(...pngChunk('IHDR',bytes.subarray(16,29)));
  // Large IDAT chunks would overflow spread; split by 12 KiB.
  for(let k=0;k<deflate.length;k+=12288)out.push(...pngChunk('IDAT',deflate.subarray(k,k+12288)));
  out.push(...pngChunk('IEND',new Uint8Array()));
  return new Uint8Array(out);
}
function iconSource(path){
  if(/(?:512)/.test(path))return '/talera-brand-v3-512.png';
  if(/(?:192)/.test(path))return '/talera-brand-v3-192.png';
  return '/talera-brand-v3-180.png';
}
function isIcon(path){return /^(\/(?:talera-brand-v3-(?:180|192|512)\.png|talera-brand-v9\.(?:svg|png)|talera-stille-luxe-icon-(?:180|192|512)\.png|pwa-(?:192|512)\.png|apple-touch-icon(?:-precomposed)?\.png|favicon\.png))$/.test(path);}
async function icon(request,env,path){
  const source=new URL(request.url);source.pathname=iconSource(path);source.search='';
  const original=await env.V9_BASE.fetch(new Request(source.toString(),{method:'GET'}));
  if(!original.ok||(original.headers.get('content-type')||'').includes('text/html'))return original;
  let bytes;
  try{bytes=await recolorPng(original);}catch(e){return new Response('Logo herkleuren niet beschikbaar',{status:503});}
  if(!bytes)return new Response('Originele logo-asset heeft onverwacht formaat',{status:503});
  if(path.endsWith('.svg')){
    const chunks=[];
    for(let off=0;off<bytes.length;off+=8190)
      chunks.push(btoa(String.fromCharCode(...bytes.subarray(off,off+8190))));
    // Encode as one PNG in SVG; no geometry redrawn.
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#FFFFFF"/><image x="0" y="0" width="512" height="512" href="data:image/png;base64,'+chunks.join('')+'"/></svg>';
    return new Response(svg,{headers:{'content-type':'image/svg+xml','cache-control':'public, max-age=3600','x-talera-brand':'original-v3-panel-recolor'}});
  }
  return new Response(bytes,{headers:{'content-type':'image/png','cache-control':'public, max-age=3600','x-talera-brand':'original-v3-panel-recolor'}});
}
/* Restored confirmed photo-behind-status-bar presentation head (4 Nov 20:27).
 * No R20 presentation body or playback code changes. */
const PRESENTATION_BOTTOM_TINT_JS = "(() => {\n  'use strict';\n  if (window.__taleraPresentEdgeTint) return;\n  window.__taleraPresentEdgeTint = true;\n\n  // Presentation only: pure-black photo-frame footer.\n  // Opened reading sheet: its existing opaque bottom paper colour.\n  const BLACK = '#000000';\n  const PAPER_FALLBACK = '#F7F4EF';\n  // The V28 story paper took 155 CSS px to fade. Only for this staging\n  // use a 90px fade; change the bottom iOS tint at 75px, when the\n  // paper is already ~93% opaque. Keep the black edge during early dragging.\n  // The heading becomes dark later to avoid grey text over bare photo.\n  const SHEET_FADE_PX = 90;\n  const FOOTER_PAPER_AT_PX = 75;\n  const doc = document.documentElement;\n  let applied = '';\n  let paper = PAPER_FALLBACK;\n  let lastReading = false;\n  const debug = typeof location !== 'undefined' &&\n    new URLSearchParams(location.search).has('taleraTintTest');\n  const tick = () => typeof performance !== 'undefined' && performance.now\n    ? performance.now() : Date.now();\n  let eventAt = tick();\n  let debugEl = null;\n\n  function showRequest(color, reason) {\n    if (!debug || !document.body) return;\n    if (!debugEl) {\n      debugEl = document.createElement('div');\n      debugEl.id = 'talera-edge-tint-test';\n      debugEl.style.cssText = 'position:fixed;bottom:calc(110px + env(safe-area-inset-bottom,0px));' +\n        'right:10px;z-index:99999;pointer-events:none;background:#FFFFFF;' +\n        'color:#304653;padding:7px 10px;border-radius:8px;' +\n        'border:1px solid #B5C6CD;font:11px/1.35 system-ui,sans-serif;max-width:210px';\n      document.body.appendChild(debugEl);\n    }\n    debugEl.textContent = 'Onderrand ' + color + ' · ' + reason +\n      ' · aanvraag ' + Math.round(Math.max(0, tick() - eventAt)) + ' ms';\n  }\n\n  function setBottomColor(color, reason) {\n    if (!/^#[0-9a-fA-F]{6}$/.test(color)) color = PAPER_FALLBACK;\n    if (color !== applied) {\n      applied = color;\n      // Only the native iOS colour request needs JavaScript.\n      // The visible background is switched INSTANTLY by preloaded CSS\n      // according to html[data-talera-present-reading].\n      const theme = document.querySelector('meta[name=\"theme-color\"]');\n      if (theme) theme.setAttribute('content', color);\n    }\n    showRequest(color, reason);\n  }\n\n  function isReading() {\n    const scroll = document.getElementById('memoryStoryScroll');\n    // Ignore the existing V14/V26 \"reading\" class for the footer: those\n    // classes activate at 2/18px, before the pane becomes opaque.\n    return !!(scroll && scroll.scrollTop >= FOOTER_PAPER_AT_PX);\n  }\n\n  function syncSheetAppearance() {\n    const scroll = document.getElementById('memoryStoryScroll');\n    const y = scroll ? Math.max(0, scroll.scrollTop) : 0;\n    const p = Math.min(1, y / SHEET_FADE_PX);\n    const alpha = p * p * (3 - 2 * p);\n    // Keep the original V28 title contrast in phase with faster paper.\n    const ink = Math.min(1, Math.max(0, (alpha - .46) / .44));\n    const rgb = [255, 255, 255].map((v, i) =>\n      Math.round(v + ([15, 39, 71][i] - v) * ink));\n    doc.style.setProperty('--talera-present-sheet-alpha', alpha.toFixed(4));\n    doc.style.setProperty('--talera-present-sheet-title', 'rgb(' + rgb.join(',') + ')');\n    doc.style.setProperty('--talera-present-sheet-shadow', Math.max(0, 1 - ink).toFixed(3));\n  }\n\n  function sheetPaperColor() {\n    // The V9 presentation uses --story-neutral for the OPAQUE final colour\n    // of the raised reading sheet (rather than ordinary pure white).\n    // Read that same source token; no separate approximation or photo sampling.\n    const space = document.querySelector('.memory-space');\n    if (space) {\n      const raw = getComputedStyle(space).getPropertyValue('--story-neutral').trim();\n      const parts = raw.split(',').map(x => Number(x.trim()));\n      if (parts.length === 3 && parts.every(x => Number.isInteger(x) && x >= 0 && x <= 255)) {\n        return '#' + parts.map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();\n      }\n    }\n    const card = document.getElementById('memoryCaption');\n    if (card) {\n      // Other V9 screen variants may have an explicit solid card background.\n      const value = getComputedStyle(card).backgroundColor || '';\n      const match = /^rgba?\\(\\s*(\\d+)[, ]+\\s*(\\d+)[, ]+\\s*(\\d+)(?:[, /]+\\s*([\\d.]+))?\\s*\\)$/.exec(value);\n      if (match && (match[4] === undefined || Number(match[4]) === 1)) {\n        return '#' + [1,2,3].map(i => Number(match[i]).toString(16).padStart(2, '0')).join('').toUpperCase();\n      }\n    }\n    return PAPER_FALLBACK;\n  }\n\n  function sync() {\n    // Keep the photo border black while the paper is translucent. Change\n    // it only when the shorter fade is already almost complete.\n    eventAt = tick();\n    syncSheetAppearance();\n    const reading = isReading();\n    if (lastReading !== reading) {\n      lastReading = reading;\n      doc.setAttribute('data-talera-present-reading', reading ? 'true' : 'false');\n    }\n    setBottomColor(reading ? paper : BLACK, reading ? 'tekstpaneel' : 'foto');\n  }\n  function preparePaper() {\n    // One initial read from V9's own sheet token, not during a gesture.\n    paper = sheetPaperColor();\n    const rgb = [0,2,4].map(i => parseInt(paper.slice(i+1,i+3),16)).join(',');\n    doc.style.setProperty('--talera-present-paper-rgb', rgb);\n    doc.setAttribute('data-talera-present-reading','false');\n  }\n  function install() {\n    const scroll = document.getElementById('memoryStoryScroll');\n    const space = document.querySelector('.memory-space');\n    preparePaper();\n    if (scroll) scroll.addEventListener('scroll', sync, {passive:true});\n    if (space) new MutationObserver(sync).observe(space, {\n      attributes:true, attributeFilter:['class','style']\n    });\n    window.addEventListener('pageshow', sync, {passive:true});\n    document.addEventListener('visibilitychange', sync);\n    sync();\n  }\n  if (document.readyState === 'loading')\n    document.addEventListener('DOMContentLoaded', install, {once:true});\n  else install();\n})();";
const PRESENTATION_BOTTOM_TINT_CSS = "html{--talera-present-paper-rgb:247,244,239;--talera-present-edge-color:#000000}\nhtml,body{background-color:#000000!important;transition:background-color 0s linear!important}\nhtml[data-talera-present-reading=\"true\"],html[data-talera-present-reading=\"true\"] body{background-color:rgb(var(--talera-present-paper-rgb))!important}\n/* Only the already-present reading sheet: shorten the existing V28 paper\n   and matching title-color transition, without changing stage/layout/swipes. */\n#memoryCaption{\n  --talera-v28-paper-alpha:var(--talera-present-sheet-alpha,0)!important;\n  --talera-v28-title-color:var(--talera-present-sheet-title,#FFFFFF)!important;\n  --talera-v28-shadow:var(--talera-present-sheet-shadow,1)!important;\n}";
function restorePresentationStatusArea(html){
  return html.replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/i,head=>{
    function setMeta(name,value){
      const tag=new RegExp('<meta\\b(?=[^>]*\\bname\\s*=\\s*["\\x27]'+name+'["\\x27])[^>]*>','gi');
      let found=false;
      head=head.replace(tag,raw=>{
        found=true;
        if(/\bcontent\s*=\s*["'][^"']*["']/i.test(raw))
          return raw.replace(/(\bcontent\s*=\s*["'])[^"']*(["'])/i,(_,a,b)=>a+value+b);
        return raw.replace(/\s*\/?>$/, ' content="'+value+'">');
      });
      if(!found)head=head.replace(/<\/head\s*>/i,'<meta name="'+name+'" content="'+value+'">\n</head>');
    }
    setMeta('apple-mobile-web-app-capable','yes');
    setMeta('apple-mobile-web-app-status-bar-style','black-translucent');
    setMeta('theme-color','#000000');
    if(!head.includes('id="talera-present-bottom-tint"')) {
      const extra='<style id="talera-present-bottom-tint">'+PRESENTATION_BOTTOM_TINT_CSS+'</style>\n'+
        '<script id="talera-present-bottom-tint-script">'+PRESENTATION_BOTTOM_TINT_JS+'</script>\n';
      head=head.replace(/<\/head\s*>/i,extra+'</head>');
    }
    return head;
  });
}
export default {
  async fetch(request,env){
    if(!env?.V9_BASE?.fetch)return new Response('V9-herstelbasis ontbreekt',{status:503});
    const url=new URL(request.url),path=url.pathname;
    if(request.method==='GET'&&isIcon(path))return icon(request,env,path);
    const upstream=await env.V9_BASE.fetch(request);
    if(request.method!=='GET'||!upstream.ok)return upstream;
    if(path==='/manifest.webmanifest'){
      try{
        const m=JSON.parse(await upstream.clone().text());
        m.background_color=PALETTE.white;m.theme_color=PALETTE.white;
        m.icons=[
          {src:'/talera-stille-luxe-icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
          {src:'/talera-stille-luxe-icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'}
        ];
        return new Response(JSON.stringify(m),{headers:{'content-type':'application/manifest+json','cache-control':'no-store'}});
      }catch(e){return upstream;}
    }
    // Restore native standalone viewport geometry on /present. Only <head>
    // metadata changes; photo stage, recordings, timelines and scripts remain identical.
    if((path==='/present'||path==='/present/') &&
        (upstream.headers.get('content-type')||'').toLowerCase().includes('text/html')){
      const html=await upstream.text();
      const changed=restorePresentationStatusArea(html);
      const headers=new Headers(upstream.headers);
      for(const h of ['content-length','content-encoding','etag'])headers.delete(h);
      headers.set('cache-control','no-store');
      headers.set('x-talera-present-status','photo-under-system-bar');
      return new Response(changed,{status:upstream.status,statusText:upstream.statusText,headers});
    }
    if(!HTML_PATHS.has(path)||(upstream.headers.get('content-type')||'').toLowerCase().indexOf('text/html')<0)return upstream;
    const html=await upstream.text();
    const changed=updateHtml(html);
    const headers=new Headers(upstream.headers);
    for(const h of ['content-length','content-encoding','etag'])headers.delete(h);
    headers.set('cache-control','no-store');
    headers.set('x-talera-style','stille-luxe-v9-20261104');
    return new Response(changed,{status:upstream.status,statusText:upstream.statusText,headers});
  }
};