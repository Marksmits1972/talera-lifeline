import baseWorker from "./worker.js";

const ORB_V33_STYLE = String.raw`
/* TALERA ORB v33 — Canvas 2D procedural cloud test. Directly on worker.js. */
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
  background:#6fa5c1!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    0 18px 50px rgba(15,39,71,.09),
    0 0 20px rgba(79,164,209,.23),
    0 0 52px rgba(79,164,209,.12)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.12 + var(--voice)*.045))!important;
  transition:transform .18s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb33Pulse 5.7s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.35s!important}
.core::before,.core::after{display:none!important;content:none!important}

.orb-v33-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{content:"  · v33";font-size:9px;opacity:.34;vertical-align:middle}

@keyframes taleraOrb33Pulse{
  0%,18%,100%{scale:.985;border-radius:49% 51% 48% 52% / 52% 47% 53% 48%}
  41%{scale:1.016;border-radius:51% 49% 52% 48% / 48% 53% 47% 52%}
  52%{scale:1.031}
  63%{scale:1.003}
  73%{scale:1.017}
}
`;

const ORB_V33_SCRIPT = String.raw`<script>(function(){
  var LOW=104;

  function hash2(x,y,seed){
    var n=x*127.1+y*311.7+seed*74.7;
    return (Math.sin(n)*43758.5453123)%1;
  }
  function h01(x,y,seed){
    var v=hash2(x,y,seed);
    return v<0?v+1:v;
  }
  function fade(t){return t*t*(3-2*t)}
  function mix(a,b,t){return a+(b-a)*t}
  function noise2(x,y,seed){
    var x0=Math.floor(x), y0=Math.floor(y);
    var tx=x-x0, ty=y-y0;
    var a=h01(x0,y0,seed), b=h01(x0+1,y0,seed);
    var c=h01(x0,y0+1,seed), d=h01(x0+1,y0+1,seed);
    var ux=fade(tx), uy=fade(ty);
    return mix(mix(a,b,ux),mix(c,d,ux),uy);
  }
  function fbm(x,y,seed){
    var v=0, amp=.56, f=1;
    for(var o=0;o<4;o++){
      v+=noise2(x*f,y*f,seed+o*19)*amp;
      f*=2.03;
      amp*=.50;
    }
    return v/1.05;
  }
  function smoothstep(a,b,x){
    var t=(x-a)/(b-a);
    if(t<0)t=0;else if(t>1)t=1;
    return t*t*(3-2*t);
  }
  function gauss(x,y,cx,cy,rx,ry){
    var dx=(x-cx)/rx, dy=(y-cy)/ry;
    return Math.exp(-(dx*dx+dy*dy)*2.2);
  }

  function mountCore(core){
    if(core.getAttribute('data-orb-v33')==='1')return;
    core.setAttribute('data-orb-v33','1');
    core.innerHTML='';
    var canvas=document.createElement('canvas');
    canvas.className='orb-v33-canvas';
    canvas.setAttribute('aria-hidden','true');
    core.appendChild(canvas);

    var ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx)return;
    var off=document.createElement('canvas');
    off.width=LOW; off.height=LOW;
    var octx=off.getContext('2d',{alpha:true});
    var img=octx.createImageData(LOW,LOW);
    var data=img.data;
    var last=0;

    function resize(){
      var r=core.getBoundingClientRect();
      var dpr=Math.min(window.devicePixelRatio||1,2);
      var w=Math.max(1,Math.round(r.width*dpr));
      var h=Math.max(1,Math.round(r.height*dpr));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    }
    resize();
    window.addEventListener('resize',resize,{passive:true});

    function render(now){
      requestAnimationFrame(render);
      if(now-last<42)return;
      last=now;
      resize();
      var t=now/1000;
      var cs=getComputedStyle(core);
      var awake=parseFloat(cs.getPropertyValue('--awake'))||0;
      var voice=parseFloat(cs.getPropertyValue('--voice'))||0;
      var live=1+awake*.18+voice*.28;

      for(var py=0;py<LOW;py++){
        var ny=py/(LOW-1);
        for(var px=0;px<LOW;px++){
          var nx=px/(LOW-1);
          var dx=nx-.5, dy=ny-.5;
          var rr=Math.sqrt(dx*dx+dy*dy);

          var i=(py*LOW+px)*4;
          if(rr>.515){data[i+3]=0;continue;}

          var wx=nx*2.05 + t*.020*live;
          var wy=ny*2.05 + Math.sin(t*.11)*.06;
          var warp=fbm(wx*.82+1.7,wy*.86-2.1,41)-.5;
          var warp2=fbm(wx*.96-3.2,wy*.80+2.8,67)-.5;

          var n1=fbm(wx+warp*.38,wy+warp2*.32,11);
          var n2=fbm(wx*1.26-warp2*.26-t*.014,wy*1.15+warp*.22+t*.010,29);
          var density=n1*.66+n2*.34;

          var c1x=.36+Math.sin(t*.19)*.055;
          var c1y=.34+Math.cos(t*.16)*.042;
          var c2x=.69+Math.cos(t*.17+1.2)*.045;
          var c2y=.66+Math.sin(t*.15+.7)*.040;
          var clear1=gauss(nx,ny,c1x,c1y,.23,.18);
          var clear2=gauss(nx,ny,c2x,c2y,.17,.14);
          var clearing=Math.max(clear1*.78,clear2*.58);
          density-=clearing*.23;

          var deep=fbm(wx*.78+t*.006,wy*.72-t*.005,83);
          var cloud=smoothstep(.48,.67,density);
          var deepCloud=smoothstep(.53,.72,deep);

          var edge=smoothstep(.50,.18,rr);
          var br=92, bg=150, bb=183;
          var lightBase=10+edge*10;
          br+=lightBase; bg+=lightBase; bb+=lightBase;

          var lamp1=gauss(nx,ny,c1x,c1y,.18,.15);
          var lamp2=gauss(nx,ny,c2x,c2y,.13,.11)*.65;
          var lamp=Math.max(lamp1,lamp2)*(1-cloud*.72);
          lamp*=.72+.16*Math.sin(t*.74)+awake*.10+voice*.12;

          var white=cloud*(.72+.18*n2);
          var shade=deepCloud*(1-cloud)*.32 + cloud*deepCloud*.18;

          var R=br, G=bg, B=bb;
          R=R*(1-shade)+52*shade;
          G=G*(1-shade)+105*shade;
          B=B*(1-shade)+140*shade;

          R=R*(1-white)+238*white;
          G=G*(1-white)+248*white;
          B=B*(1-white)+252*white;

          R=R*(1-lamp)+255*lamp;
          G=G*(1-lamp)+255*lamp;
          B=B*(1-lamp)+255*lamp;

          var vign=1-smoothstep(.30,.515,rr)*.18;
          R*=vign; G*=vign; B*=vign;

          data[i]=Math.max(0,Math.min(255,R));
          data[i+1]=Math.max(0,Math.min(255,G));
          data[i+2]=Math.max(0,Math.min(255,B));
          data[i+3]=255;
        }
      }

      octx.putImageData(img,0,0);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(off,0,0,canvas.width,canvas.height);

      var g=ctx.createRadialGradient(canvas.width*.30,canvas.height*.24,0,canvas.width*.30,canvas.height*.24,canvas.width*.42);
      g.addColorStop(0,'rgba(255,255,255,.08)');
      g.addColorStop(.42,'rgba(226,244,252,.035)');
      g.addColorStop(1,'rgba(226,244,252,0)');
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
    .replace('</head>','<style>'+ORB_V33_STYLE+'</style></head>')
    .replace('</body>',ORB_V33_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v33-canvas-clouds');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
