import baseWorker from "./worker.js";

const ORB_V42_STYLE = String.raw`
/* TALERA ORB v42 — v41 edge fractal, calmer cloud body and capped voice response. Directly on worker.js. */
.core-wrap{position:relative!important;width:min(58vw,250px)!important;min-width:190px!important;min-height:190px!important;aspect-ratio:1/1!important;display:grid!important;place-items:center!important;overflow:visible!important}
.halo{display:none!important}
.core,.core.active,.core.listening{display:block!important;width:80%!important;height:80%!important;position:relative!important;opacity:1!important;visibility:visible!important;overflow:hidden!important;isolation:isolate!important;border-radius:49% 51% 48% 52% / 52% 47% 53% 48%!important;background:#6fa5c1!important;background-image:none!important;border:0!important;outline:0!important;box-shadow:0 18px 50px rgba(15,39,71,.09),0 0 20px rgba(79,164,209,.22),0 0 54px rgba(79,164,209,.12)!important;filter:none!important;transform:scale(calc(.99 + var(--awake)*.12 + var(--voice)*.05))!important;transition:transform .18s cubic-bezier(.18,.72,.2,1)!important;animation:taleraOrb42Pulse 5.3s ease-in-out infinite!important}
.core.active,.core.listening{animation-duration:4s!important}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v42-canvas{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important;pointer-events:none!important}
.status::after{content:"  · v42";font-size:9px;opacity:.34;vertical-align:middle}
@keyframes taleraOrb42Pulse{0%,16%,100%{scale:.982;border-radius:49% 51% 48% 52% / 52% 47% 53% 48%}38%{scale:1.017;border-radius:51% 49% 52% 48% / 48% 53% 47% 52%}50%{scale:1.035}62%{scale:1.002}73%{scale:1.020}}
`;

const ORB_V42_SCRIPT = String.raw`<script>(function(){
  var LOW=142;
  function hash2(x,y,s){var n=x*127.1+y*311.7+s*74.7;return (Math.sin(n)*43758.5453123)%1}
  function h01(x,y,s){var v=hash2(x,y,s);return v<0?v+1:v}
  function fade(t){return t*t*(3-2*t)}
  function mix(a,b,t){return a+(b-a)*t}
  function noise2(x,y,s){var x0=Math.floor(x),y0=Math.floor(y),tx=x-x0,ty=y-y0;var a=h01(x0,y0,s),b=h01(x0+1,y0,s),c=h01(x0,y0+1,s),d=h01(x0+1,y0+1,s),ux=fade(tx),uy=fade(ty);return mix(mix(a,b,ux),mix(c,d,ux),uy)}
  function fbm(x,y,s){var v=0,a=.58,f=1,n=0;for(var o=0;o<4;o++){v+=noise2(x*f,y*f,s+o*23)*a;n+=a;f*=1.98;a*=.48}return v/n}
  function smoothstep(a,b,x){var t=(x-a)/(b-a);if(t<0)t=0;else if(t>1)t=1;return t*t*(3-2*t)}
  function gauss(x,y,cx,cy,rx,ry){var dx=(x-cx)/rx,dy=(y-cy)/ry;return Math.exp(-(dx*dx+dy*dy)*2.1)}

  function mountCore(core){
    if(core.getAttribute('data-orb-v42')==='1')return;
    core.setAttribute('data-orb-v42','1');
    core.innerHTML='';
    var canvas=document.createElement('canvas');canvas.className='orb-v42-canvas';canvas.setAttribute('aria-hidden','true');core.appendChild(canvas);
    var ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
    var off=document.createElement('canvas');off.width=LOW;off.height=LOW;
    var octx=off.getContext('2d',{alpha:true}),img=octx.createImageData(LOW,LOW),data=img.data,last=0;

    function resize(){
      var r=core.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
      var w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
    }
    resize();window.addEventListener('resize',resize,{passive:true});

    function render(now){
      requestAnimationFrame(render);if(now-last<42)return;last=now;resize();
      var t=now/1000,cs=getComputedStyle(core);
      var awake=parseFloat(cs.getPropertyValue('--awake'))||0;
      var voiceRaw=parseFloat(cs.getPropertyValue('--voice'))||0;
      var voice=Math.min(.55,Math.max(0,voiceRaw));
      var live=1+awake*.15+voice*.12;

      var c1x=.36+Math.sin(t*.145)*.046,c1y=.36+Math.cos(t*.125)*.034;
      var c2x=.70+Math.cos(t*.14+1.15)*.034,c2y=.66+Math.sin(t*.12+.72)*.030;

      for(var py=0;py<LOW;py++){
        var ny=py/(LOW-1);
        for(var px=0;px<LOW;px++){
          var nx=px/(LOW-1),dx=nx-.5,dy=ny-.5,rr=Math.sqrt(dx*dx+dy*dy),i=(py*LOW+px)*4;
          if(rr>.515){data[i+3]=0;continue}

          var baseX=nx*1.64,baseY=ny*1.61;
          var warp=fbm(baseX*.67+1.8,baseY*.64-2.4,43)-.5;
          var warp2=fbm(baseX*.72-3.1,baseY*.60+2.7,71)-.5;

          var ax=baseX+t*.0175*live+warp*.25;
          var ay=baseY+t*.0048*live+warp2*.22;
          var aMacro=fbm(ax*.56,ay*.58,101),aBody=fbm(ax*.91+1.2,ay*.88-.7,13);
          var deckA=aMacro*.43+aBody*.57;

          var bx=baseX-t*.0125*live-warp2*.23+2.4;
          var by=baseY+t*.0072*live+warp*.20-1.6;
          var bMacro=fbm(bx*.53,by*.56,151),bBody=fbm(bx*.88,by*.92,181);
          var deckB=bMacro*.46+bBody*.54;

          var deck=Math.max(deckA,deckB);
          var connector=fbm(baseX*.46+t*.004*live+3.2,baseY*.49-t*.003*live-2.1,211);
          deck=Math.max(deck,connector*.90);

          var clearNoise=fbm(baseX*.64-t*.0028,baseY*.61+t*.0023,137);
          var clear1=gauss(nx,ny,c1x,c1y,.255,.200)*(.72+clearNoise*.40);
          var clear2=gauss(nx,ny,c2x,c2y,.165,.130)*(.76+clearNoise*.30);
          var baseDensity=deck-clear1*.30-clear2*.19;

          var edgeN1=fbm(baseX*2.18+warp*.18+t*.0080*live,baseY*2.06-warp2*.16-t*.0062*live,257)-.5;
          var edgeN2=fbm(baseX*3.25-warp2*.10-t*.0050*live+1.7,baseY*3.02+warp*.10+t*.0042*live-2.2,283)-.5;
          var edgeNoise=edgeN1*.72+edgeN2*.28;

          var boundaryDistance=Math.abs(baseDensity-.548);
          var boundaryBand=1-smoothstep(.025,.125,boundaryDistance);
          var edgeDensity=baseDensity+edgeNoise*.145*boundaryBand;

          var softCloud=smoothstep(.455,.555,edgeDensity);
          var cloud=smoothstep(.505,.590,edgeDensity);
          var shoulder=smoothstep(.430,.548,deck);
          softCloud=Math.max(softCloud,shoulder*.64);

          var deep=fbm(baseX*.62+t*.0044,baseY*.60-t*.0038,89);
          var deepCloud=smoothstep(.50,.67,deep);

          var edge=smoothstep(.50,.18,rr),br=100+edge*11,bg=158+edge*11,bb=191+edge*11;

          var opening1=smoothstep(.14,.64,clear1)*(1-cloud*.97);
          var opening2=smoothstep(.16,.62,clear2)*(1-cloud*.98);
          var lamp1=gauss(nx,ny,c1x,c1y,.300,.235);
          var lamp2=gauss(nx,ny,c2x,c2y,.190,.150)*.40;
          var lamp=Math.max(lamp1*opening1,lamp2*opening2)*(.47+.06*Math.sin(t*.62)+awake*.06+voice*.04);

          var edgeTexture=(edgeNoise*.5+.5)*boundaryBand*softCloud*(1-cloud*.20);
          var white=softCloud*.25+cloud*(.34+.045*aBody)+edgeTexture*.075;
          var shade=deepCloud*(1-softCloud)*.25+cloud*deepCloud*.13;

          var rim1=smoothstep(.16,.50,clear1)*softCloud*(1-cloud*.80);
          var rim2=smoothstep(.18,.48,clear2)*softCloud*(1-cloud*.82)*.52;
          var rim=(rim1+rim2)*.14;

          var R=br,G=bg,B=bb;
          R=R*(1-shade)+48*shade;G=G*(1-shade)+101*shade;B=B*(1-shade)+138*shade;
          R=R*(1-white)+226*white;G=G*(1-white)+239*white;B=B*(1-white)+246*white;
          R=R*(1-rim)+244*rim;G=G*(1-rim)+249*rim;B=B*(1-rim)+252*rim;
          R=R*(1-lamp)+252*lamp;G=G*(1-lamp)+254*lamp;B=B*(1-lamp)+255*lamp;

          var vign=1-smoothstep(.31,.515,rr)*.17;R*=vign;G*=vign;B*=vign;
          data[i]=Math.max(0,Math.min(255,R));data[i+1]=Math.max(0,Math.min(255,G));data[i+2]=Math.max(0,Math.min(255,B));data[i+3]=255;
        }
      }

      octx.putImageData(img,0,0);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(off,0,0,canvas.width,canvas.height);

      var g=ctx.createRadialGradient(canvas.width*.31,canvas.height*.25,0,canvas.width*.31,canvas.height*.25,canvas.width*.44);
      g.addColorStop(0,'rgba(255,255,255,.014)');
      g.addColorStop(.45,'rgba(226,244,252,.005)');
      g.addColorStop(1,'rgba(226,244,252,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
    }

    requestAnimationFrame(render);
  }

  function mount(){document.querySelectorAll('.core').forEach(mountCore)}
  mount();
  var root=document.getElementById('app')||document.body;
  new MutationObserver(mount).observe(root,{childList:true,subtree:true});
})();</scr`+`ipt>`;

function enhance(html){
  return html
    .replace('</head>','<style>'+ORB_V42_STYLE+'</style></head>')
    .replace('</body>',ORB_V42_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v42-canvas-calmer-edge-clouds');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
