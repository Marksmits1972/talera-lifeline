import baseWorker from "./worker.js";

const ORB_V37_STYLE = String.raw`
/* TALERA ORB v37 — stronger medium-scale cloud structure, less smoothing. Directly on worker.js. */
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
    0 0 20px rgba(79,164,209,.22),
    0 0 54px rgba(79,164,209,.12)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.12 + var(--voice)*.05))!important;
  transition:transform .18s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb37Pulse 5.35s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.05s!important}
.core::before,.core::after{display:none!important;content:none!important}

.orb-v37-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{content:"  · v37";font-size:9px;opacity:.34;vertical-align:middle}

@keyframes taleraOrb37Pulse{
  0%,16%,100%{scale:.982;border-radius:49% 51% 48% 52% / 52% 47% 53% 48%}
  38%{scale:1.017;border-radius:51% 49% 52% 48% / 48% 53% 47% 52%}
  50%{scale:1.035}
  62%{scale:1.002}
  73%{scale:1.020}
}
`;

const ORB_V37_SCRIPT = String.raw`<script>(function(){
  var LOW=120;

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
    var v=0, amp=.58, f=1, norm=0;
    for(var o=0;o<4;o++){
      v+=noise2(x*f,y*f,seed+o*23)*amp;
      norm+=amp;
      f*=1.98;
      amp*=.48;
    }
    return v/norm;
  }
  function smoothstep(a,b,x){
    var t=(x-a)/(b-a);
    if(t<0)t=0;else if(t>1)t=1;
    return t*t*(3-2*t);
  }
  function gauss(x,y,cx,cy,rx,ry){
    var dx=(x-cx)/rx, dy=(y-cy)/ry;
    return Math.exp(-(dx*dx+dy*dy)*2.05);
  }

  function mountCore(core){
    if(core.getAttribute('data-orb-v37')==='1')return;
    core.setAttribute('data-orb-v37','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v37-canvas';
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
      var live=1+awake*.17+voice*.27;

      var c1x=.34+Math.sin(t*.17)*.052;
      var c1y=.33+Math.cos(t*.145)*.040;
      var c2x=.70+Math.cos(t*.155+1.15)*.040;
      var c2y=.66+Math.sin(t*.14+.72)*.036;

      for(var py=0;py<LOW;py++){
        var ny=py/(LOW-1);
        for(var px=0;px<LOW;px++){
          var nx=px/(LOW-1);
          var dx=nx-.5, dy=ny-.5;
          var rr=Math.sqrt(dx*dx+dy*dy);
          var i=(py*LOW+px)*4;

          if(rr>.515){data[i+3]=0;continue;}

          /* Keep the v35/v36 macro weather systems unchanged. */
          var wx=nx*1.74 + t*.0185*live;
          var wy=ny*1.70 + Math.sin(t*.10)*.052;
          var warp=fbm(wx*.64+1.9,wy*.66-2.3,43)-.5;
          var warp2=fbm(wx*.71-3.4,wy*.62+2.6,71)-.5;

          var macro=fbm(wx*.53+warp*.22,wy*.57+warp2*.20,101);
          var n1=fbm(wx+warp*.30,wy+warp2*.26,13);
          var n2=fbm(wx*1.13-warp2*.20-t*.011,wy*1.08+warp*.18+t*.008,31);
          var density=macro*.25+n1*.55+n2*.20;

          /* v37 calibration: same medium fields as v36, but ~40% more influence. */
          var medium=fbm(
            wx*1.58 + warp*.15 + t*.0065*live,
            wy*1.49 - warp2*.13 - t*.0048*live,
            57
          );
          var medium2=fbm(
            wx*1.34 - warp2*.12 - t*.0040*live + 2.7,
            wy*1.42 + warp*.12 + t*.0036*live - 1.6,
            79
          );
          var mid=((medium*.62+medium2*.38)-.5);
          density+=mid*.122;

          /* Clearings become more explicit cuts in the cloud deck. */
          var clear1=gauss(nx,ny,c1x,c1y,.245,.195);
          var clear2=gauss(nx,ny,c2x,c2y,.158,.128);
          density-=clear1*.335;
          density-=clear2*.225;

          /* Less smoothing: narrower transitions make the medium structure readable. */
          var edgeBias=mid*.145;
          var softCloud=smoothstep(.420,.545,density+edgeBias*.58);
          var cloud=smoothstep(.474,.598,density+edgeBias);

          var deep=fbm(wx*.66+t*.005,wy*.63-t*.0045,89);
          var deepMedium=fbm(wx*.98-t*.0035,wy*.91+t*.0028,113);
          var deepCloud=smoothstep(.485,.655,deep*.74+deepMedium*.26);

          var edge=smoothstep(.50,.18,rr);
          var br=90, bg=148, bb=181;
          var lightBase=10+edge*11;
          br+=lightBase; bg+=lightBase; bb+=lightBase;

          /* Broad light, visible mainly where the cloud density genuinely opens. */
          var lamp1=gauss(nx,ny,c1x,c1y,.255,.205);
          var lamp2=gauss(nx,ny,c2x,c2y,.165,.136)*.48;
          var opening1=smoothstep(.12,.66,clear1)*(1-cloud*.92);
          var opening2=smoothstep(.14,.64,clear2)*(1-cloud*.94);
          var lamp=Math.max(lamp1*opening1,lamp2*opening2);
          lamp*=.60+.09*Math.sin(t*.66)+awake*.08+voice*.11;

          /* Stronger mid-scale definition without returning to v33 grain. */
          var midBody=smoothstep(-.08,.16,mid)*softCloud*(1-cloud*.18);
          var white=softCloud*.29 + cloud*(.50+.09*n2) + midBody*.10;
          var shade=deepCloud*(1-softCloud)*.27 + cloud*deepCloud*.16;

          /* Bright cloud edges around the clearings help the light feel like a break in the sky. */
          var rim1=smoothstep(.13,.52,clear1)*softCloud*(1-cloud*.72);
          var rim2=smoothstep(.16,.50,clear2)*softCloud*(1-cloud*.76)*.62;
          var rim=(rim1+rim2)*.25;

          var R=br, G=bg, B=bb;
          R=R*(1-shade)+46*shade;
          G=G*(1-shade)+98*shade;
          B=B*(1-shade)+135*shade;

          R=R*(1-white)+239*white;
          G=G*(1-white)+248*white;
          B=B*(1-white)+252*white;

          R=R*(1-rim)+252*rim;
          G=G*(1-rim)+254*rim;
          B=B*(1-rim)+255*rim;

          R=R*(1-lamp)+255*lamp;
          G=G*(1-lamp)+255*lamp;
          B=B*(1-lamp)+255*lamp;

          var vign=1-smoothstep(.31,.515,rr)*.17;
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

      var g=ctx.createRadialGradient(canvas.width*.31,canvas.height*.25,0,canvas.width*.31,canvas.height*.25,canvas.width*.43);
      g.addColorStop(0,'rgba(255,255,255,.035)');
      g.addColorStop(.45,'rgba(226,244,252,.014)');
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
    .replace('</head>','<style>'+ORB_V37_STYLE+'</style></head>')
    .replace('</body>',ORB_V37_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v37-canvas-stronger-medium-clouds');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
