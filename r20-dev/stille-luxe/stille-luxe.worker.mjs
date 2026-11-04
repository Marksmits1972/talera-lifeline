/* TALERA Stille luxe isolated V9 staging.
 * Strictly presentation/branding: no storage, story, audio, edit, swipe or premium writes.
 * V9 continues unchanged behind a single service binding.
 */
const BRAND_CSS = "/* TALERA Stille luxe | 04-11-2026 | ONE compact design-system source.\n   Deliberately does not style photo/video surfaces, player clocks or swipe layers. */\n:root{\n  --talera-white:#FFFFFF;--talera-ivory:#F7F5F0;\n  --talera-ink:#304653;--talera-muted:#718D9A;\n  --talera-mist:#B5C6CD;--talera-lime:#B8D943;\n  --ink:#304653;--deep:#304653;--blue:#304653;\n  --muted:#718D9A;--light:#B5C6CD;--soft:#F7F5F0;\n  --neutral:#FFFFFF;--white:#FFFFFF;--cream:#F7F5F0;\n  --talera-radius-sm:8px;--talera-radius-md:12px;\n  --talera-radius-lg:16px;--talera-gap:12px;\n}\nhtml,body{background-color:#FFFFFF;color:#304653;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,system-ui,sans-serif;}\n:where(.app,.viewport,.screen,.timeline-page,.detail,.detail-list,.preview,.preview-description,.ages,.work,.sheet,.menu-panel,.settings-panel){background-color:#FFFFFF;}\n:where(.logo,h1,h2,h3,.page-title,.memory-title,.story-name,.preview-title,.sheet h2){color:#304653;}\n:where(.subtle,.muted,.hint,.caption,.meta,.story-loc,.detail-subtle,.month-mark,.age-info small){color:#718D9A;}\n:where(.topbar,header:not(.presentation-header)){background-color:#FFFFFF;}\nbutton,input,textarea,select{font-family:inherit;}\n:where(button,[role='button']){letter-spacing:0;font-weight:600;}\n:where(.primary,.btn-primary,.primary-button,button.primary,button[data-primary],#v30DateSave){background-color:#304653;color:#FFFFFF;border:1px solid #304653;border-radius:12px;}\n:where(.secondary,.btn-secondary,.secondary-button,button.secondary){background-color:#FFFFFF;color:#304653;border:1px solid #B5C6CD;border-radius:12px;}\n:where(.tertiary,.btn-tertiary,.text-button){background-color:transparent;color:#304653;border-color:transparent;}\n:where(input:not([type='checkbox']):not([type='radio']),textarea,select){color:#304653;border-color:#B5C6CD;border-radius:12px;}\n:where(input,textarea,select):focus-visible{outline:2px solid #718D9A;outline-offset:2px;}\n:where(.card,.memory-card,.story,.preview,.detail-list){box-shadow:none;}\n:where(.card,.memory-card,.detail-list,.preview){border-color:#B5C6CD;}\n:where(.logo){font-weight:650;letter-spacing:.13em;}\nbody{font-size:16px;line-height:1.45;}\nh1,.page-title{font-size:clamp(23px,5vw,29px);font-weight:680;line-height:1.2;letter-spacing:-.025em;}\nh2,.memory-title{font-size:clamp(19px,4.6vw,23px);font-weight:650;line-height:1.25;letter-spacing:-.015em;}\n:where(.date,.date-label,.meta){font-size:13px;line-height:1.4;}\n:where(.hint,.caption,.small-label){font-size:12px;line-height:1.4;}\n@media(max-width:420px){\n  :where(.sheet,.menu-panel,.settings-panel){max-width:100%;}\n  :where(input,textarea,select){max-width:100%;min-width:0;}\n  :where(.app,.viewport,.screen){max-width:100vw;}\n}\n/* No global !important overrides of presentation, media, narration or swipe. */";
const PALETTE = Object.freeze({
  white:'#FFFFFF', ivory:'#F7F5F0', ink:'#304653',
  muted:'#718D9A', mist:'#B5C6CD', lime:'#B8D943'
});
const HTML_PATHS = new Set(['/', '/mijn-leven','/tell','/tell/','/meer','/instellingen','/settings','/login','/account','/hub','/privacy','/messages','/ontvangen']);
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
const REGEX = new RegExp(OLD.map(([x])=>x.replace('#','\\#')).join('|'),'gi');
function rewriteStyleBlock(html){
  // Harmonize existing style declarations IN PLACE rather than a giant second
  // !important override tree. Leave scripts/player content byte-for-byte alone.
  return html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (whole, attrs, body) => {
    if(/(?:talera-v8|narration|photo-strip|player-clock|presentation)/i.test(attrs)) return whole;
    return '<style'+attrs+'>'+body.replace(REGEX, c=>OLD.find(([v])=>v===c.toLowerCase())?.[1]||c)+'</style>';
  });
}
function updateHtml(html){
  let output=rewriteStyleBlock(html);
  output=output.replace(/(<meta\s+name=["']theme-color["']\s+content=["'])[^"']+(["'])/i,'$1#FFFFFF$2');
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
  const unzipped=new Uint8Array(await new Response(raw).body.pipeThrough(new DecompressionStream('deflate')).arrayBuffer());
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
  const deflate=new Uint8Array(await new Response(output).body.pipeThrough(new CompressionStream('deflate')).arrayBuffer());
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
    for(let off=0;off<bytes.length;off+=8192)
      chunks.push(btoa(String.fromCharCode(...bytes.subarray(off,off+8192))));
    // Encode as one PNG in SVG; no geometry redrawn.
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#FFFFFF"/><image x="0" y="0" width="512" height="512" href="data:image/png;base64,'+chunks.join('')+'"/></svg>';
    return new Response(svg,{headers:{'content-type':'image/svg+xml','cache-control':'public, max-age=3600','x-talera-brand':'original-v3-panel-recolor'}});
  }
  return new Response(bytes,{headers:{'content-type':'image/png','cache-control':'public, max-age=3600','x-talera-brand':'original-v3-panel-recolor'}});
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
        const m=await upstream.json();
        m.background_color=PALETTE.white;m.theme_color=PALETTE.white;
        m.icons=[
          {src:'/talera-stille-luxe-icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
          {src:'/talera-stille-luxe-icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'}
        ];
        return new Response(JSON.stringify(m),{headers:{'content-type':'application/manifest+json','cache-control':'no-store'}});
      }catch(e){return upstream;}
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