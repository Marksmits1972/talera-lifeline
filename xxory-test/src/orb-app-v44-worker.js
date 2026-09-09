import baseWorker from "./worker.js";

const ORB_V44_STYLE = String.raw`
/* TALERA ORB v44 — living cloud organism: volumetric interior, luminous cavity, no planet surface. */
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
  border-radius:50% 50% 49% 51% / 51% 49% 51% 49%!important;
  background:rgba(188,221,238,.46)!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    0 16px 44px rgba(46,99,130,.07),
    0 0 24px rgba(111,190,226,.18),
    0 0 78px rgba(111,190,226,.11)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.115 + var(--voice)*.042))!important;
  transition:transform .20s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb44Pulse 5.7s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.5s!important}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v44-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v44";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}
@keyframes taleraOrb44Pulse{
  0%,16%,100%{scale:.985;border-radius:50% 50% 49% 51% / 51% 49% 51% 49%}
  40%{scale:1.011;border-radius:51% 49% 50% 50% / 49% 52% 48% 51%}
  53%{scale:1.031}
  65%{scale:1.004}
  77%{scale:1.018}
}
`;

const ORB_V44_SCRIPT = String.raw`<script>(function(){
  var LOW=176;

  function hash2(x,y,s){
    var n=x*127.1+y*311.7+s*74.7;
    return (Math.sin(n)*43758.5453123)%1;
  }
  function h01(x,y,s){var v=hash2(x,y,s);return v<0?v+1:v}
  function fade(t){return t*t*(3-2*t)}
  function mix(a,b,t){return a+(b-a)*t}
  function clamp(v,a,b){return v<a?a:(v>b?b:v)}
  function noise2(x,y,s){
    var x0=Math.floor(x),y0=Math.floor(y),tx=x-x0,ty=y-y0;
    var a=h01(x0,y0,s),b=h01(x0+1,y0,s),c=h01(x0,y0+1,s),d=h01(x0+1,y0+1,s);
    var ux=fade(tx),uy=fade(ty);
    return mix(mix(a,b,ux),mix(c,d,ux),uy);
  }
  function fbm(x,y,s){
    var v=0,a=.58,f=1,n=0;
    for(var o=0;o<5;o++){
      v+=noise2(x*f,y*f,s+o*23)*a;
      n+=a;
      f*=1.97;
      a*=.47;
    }
    return v/n;
  }
  function smoothstep(a,b,x){
    var t=clamp((x-a)/(b-a),0,1);
    return t*t*(3-2*t);
  }
  function gauss(x,y,cx,cy,rx,ry){
    var dx=(x-cx)/rx,dy=(y-cy)/ry;
    return Math.exp(-(dx*dx+dy*dy)*2.0);
  }

  var lobes=[
    [.18,.24,.23,.20,0],
    [.38,.16,.22,.18,1],
    [.64,.17,.24,.20,2],
    [.82,.31,.21,.24,3],
    [.84,.58,.20,.24,4],
    [.70,.79,.25,.20,5],
    [.45,.84,.25,.19,6],
    [.20,.72,.23,.22,7],
    [.14,.47,.19,.24,8],
    [.38,.54,.20,.18,9],
    [.67,.52,.21,.18,10]
  ];

  function mountCore(core){
    if(core.getAttribute('data-orb-v44')==='1')return;
    core.setAttribute('data-orb-v44','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v44-canvas';
    canvas.setAttribute('aria-hidden','true');
    core.appendChild(canvas);

    var ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx)return;

    var off=document.createElement('canvas');
    off.width=LOW;off.height=LOW;
    var octx=off.getContext('2d',{alpha:true});
    var img=octx.createImageData(LOW,LOW);
    var data=img.data;
    var last=0;

    function resize(){
      var r=core.getBoundingClientRect();
      var dpr=Math.min(window.devicePixelRatio||1,2);
      var w=Math.max(1,Math.round(r.width*dpr));
      var h=Math.max(1,Math.round(r.height*dpr));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
    }

    resize();
    window.addEventListener('resize',resize,{passive:true});

    function render(now){
      requestAnimationFrame(render);
      if(now-last<38)return;
      last=now;
      resize();

      var t=now/1000;
      var cs=getComputedStyle(core);
      var awake=parseFloat(cs.getPropertyValue('--awake'))||0;
      var voiceRaw=parseFloat(cs.getPropertyValue('--voice'))||0;
      var voice=Math.min(.55,Math.max(0,voiceRaw));
      var life=1+awake*.13+voice*.10;

      var lightX=.52+Math.sin(t*.095)*.030;
      var lightY=.45+Math.cos(t*.082)*.025;

      for(var py=0;py<LOW;py++){
        var ny=py/(LOW-1);
        for(var px=0;px<LOW;px++){
          var nx=px/(LOW-1);
          var dx=nx-.5,dy=ny-.5;
          var rr=Math.sqrt(dx*dx+dy*dy);
          var i=(py*LOW+px)*4;

          if(rr>.515){
            data[i+3]=0;
            continue;
          }

          var x=nx*1.86;
          var y=ny*1.86;

          var warpA=fbm(x*.54+t*.0048*life+1.2,y*.52-t*.0039*life-2.5,31)-.5;
          var warpB=fbm(x*.48-t*.0038*life-2.2,y*.58+t*.0044*life+1.9,61)-.5;
          var wx=nx+warpA*.070+warpB*.035;
          var wy=ny+warpB*.066-warpA*.028;

          var billow=fbm(x*1.16+t*.0052*life,y*1.10-t*.0045*life,101);
          var mid=fbm(x*2.10-t*.0048*life+1.7,y*1.94+t*.0040*life-1.3,151);
          var fine=fbm(x*3.72+t*.0040*life-2.0,y*3.45-t*.0036*life+2.2,211);

          var skeleton=0;
          var litBias=0;
          for(var li=0;li<lobes.length;li++){
            var L=lobes[li];
            var phase=L[4]*.77;
            var cx=L[0]+Math.sin(t*(.032+.003*(li%3))+phase)*.018*life;
            var cy=L[1]+Math.cos(t*(.029+.002*(li%4))+phase*.7)*.016*life;
            var rx=L[2]*(.96+Math.sin(t*.021+phase)*.045);
            var ry=L[3]*(.96+Math.cos(t*.024+phase*.9)*.045);
            var g=gauss(wx,wy,cx,cy,rx,ry);
            var rag=.70+billow*.27+mid*.10+fine*.035;
            var vg=g*rag;
            if(vg>skeleton)skeleton=vg;
            litBias+=g*.045;
          }
          litBias=clamp(litBias,0,.35);

          var cavityShape=.76+fbm(x*.72-t*.0022,y*.68+t*.0020,271)*.38;
          var mainCavity=gauss(nx,ny,lightX,lightY,.235,.285)*cavityShape;
          var sideX=.30+Math.sin(t*.071+1.3)*.022;
          var sideY=.31+Math.cos(t*.067+.5)*.020;
          var sideCavity=gauss(nx,ny,sideX,sideY,.135,.120)*(.72+fbm(x*.88+2.4,y*.81-1.8,307)*.30);

          var density=skeleton-mainCavity*.42-sideCavity*.16;
          density+=(billow-.5)*.080+(mid-.5)*.060+(fine-.5)*.018;

          var haze=smoothstep(.245,.365,density);
          var cloud=smoothstep(.330,.455,density);
          var dense=smoothstep(.430,.585,density);

          var edgeBand=haze*(1-cloud);
          var boundaryTexture=clamp(.62+(mid-.5)*.55+(fine-.5)*.24,0,1);
          var texturedEdge=edgeBand*boundaryTexture;

          var openMain=smoothstep(.18,.70,mainCavity)*(1-cloud*.96);
          var openSide=smoothstep(.18,.66,sideCavity)*(1-cloud*.97);
          var lightWell=Math.max(
            gauss(nx,ny,lightX,lightY,.30,.34)*openMain,
            gauss(nx,ny,sideX,sideY,.18,.16)*openSide*.30
          );
          lightWell*=.76+.06*Math.sin(t*.48)+awake*.06+voice*.04;

          var cavityProx=Math.max(
            gauss(nx,ny,lightX,lightY,.34,.38),
            gauss(nx,ny,sideX,sideY,.20,.18)*.42
          );
          var luminousRim=texturedEdge*cavityProx*(.62+.18*billow);

          var deepNoise=fbm(x*.78-t*.0032,y*.74+t*.0028,353);
          var internalDepth=smoothstep(.44,.68,deepNoise)*cloud*(.18+.28*dense);

          var airNoise=(fbm(x*.42+t*.0018,y*.40-t*.0015,401)-.5);
          var R=171+airNoise*6;
          var G=213+airNoise*8;
          var B=233+airNoise*9;

          var mistAmt=haze*.22;
          R=R*(1-mistAmt)+221*mistAmt;
          G=G*(1-mistAmt)+239*mistAmt;
          B=B*(1-mistAmt)+248*mistAmt;

          var whiteAmt=cloud*.46+dense*.15;
          R=R*(1-whiteAmt)+240*whiteAmt;
          G=G*(1-whiteAmt)+249*whiteAmt;
          B=B*(1-whiteAmt)+253*whiteAmt;

          R=R*(1-internalDepth)+87*internalDepth;
          G=G*(1-internalDepth)+151*internalDepth;
          B=B*(1-internalDepth)+191*internalDepth;

          var rimAmt=luminousRim*.72;
          R=R*(1-rimAmt)+253*rimAmt;
          G=G*(1-rimAmt)+255*rimAmt;
          B=B*(1-rimAmt)+255*rimAmt;

          R=R*(1-lightWell)+255*lightWell;
          G=G*(1-lightWell)+255*lightWell;
          B=B*(1-lightWell)+255*lightWell;

          var overlapGlow=clamp(litBias*.32,0,.08)*(1-dense*.65);
          R=R*(1-overlapGlow)+247*overlapGlow;
          G=G*(1-overlapGlow)+252*overlapGlow;
          B=B*(1-overlapGlow)+255*overlapGlow;

          var edgeFade=1-smoothstep(.458,.515,rr);
          var edgeAir=smoothstep(.405,.515,rr)*.085;
          R=R*(1-edgeAir)+202*edgeAir;
          G=G*(1-edgeAir)+230*edgeAir;
          B=B*(1-edgeAir)+242*edgeAir;

          data[i]=clamp(R,0,255);
          data[i+1]=clamp(G,0,255);
          data[i+2]=clamp(B,0,255);
          data[i+3]=Math.round(255*(.88+.12*edgeFade));
        }
      }

      octx.putImageData(img,0,0);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(off,0,0,canvas.width,canvas.height);

      var gx=canvas.width*lightX,gy=canvas.height*lightY;
      var g=ctx.createRadialGradient(gx,gy,0,gx,gy,canvas.width*.30);
      g.addColorStop(0,'rgba(255,255,255,.13)');
      g.addColorStop(.28,'rgba(247,253,255,.065)');
      g.addColorStop(.58,'rgba(226,245,253,.025)');
      g.addColorStop(1,'rgba(226,245,253,0)');
      ctx.fillStyle=g;
      ctx.fillRect(0,0,canvas.width,canvas.height);
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
    .replace('</head>','<style>'+ORB_V44_STYLE+'</style></head>')
    .replace('</body>',ORB_V44_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v44-volumetric-living-cloud-organism');

    return new Response(enhance(html),{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }
};
