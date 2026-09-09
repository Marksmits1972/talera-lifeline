import baseWorker from "./worker.js";

const ORB_V39_STYLE = String.raw`
/* TALERA ORB v39 — connected cloud fields with organic clearings. Directly on worker.js. */
.core-wrap{position:relative!important;width:min(58vw,250px)!important;min-width:190px!important;min-height:190px!important;aspect-ratio:1/1!important;display:grid!important;place-items:center!important;overflow:visible!important}
.halo{display:none!important}
.core,.core.active,.core.listening{display:block!important;width:80%!important;height:80%!important;position:relative!important;opacity:1!important;visibility:visible!important;overflow:hidden!important;isolation:isolate!important;border-radius:49% 51% 48% 52% / 52% 47% 53% 48%!important;background:#6fa5c1!important;background-image:none!important;border:0!important;outline:0!important;box-shadow:0 18px 50px rgba(15,39,71,.09),0 0 20px rgba(79,164,209,.22),0 0 54px rgba(79,164,209,.12)!important;filter:none!important;transform:scale(calc(.99 + var(--awake)*.12 + var(--voice)*.05))!important;transition:transform .18s cubic-bezier(.18,.72,.2,1)!important;animation:taleraOrb39Pulse 5.3s ease-in-out infinite!important}
.core.active,.core.listening{animation-duration:4s!important}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v39-canvas{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important;pointer-events:none!important}
.status::after{content:"  · v39";font-size:9px;opacity:.34;vertical-align:middle}
@keyframes taleraOrb39Pulse{0%,16%,100%{scale:.982;border-radius:49% 51% 48% 52% / 52% 47% 53% 48%}38%{scale:1.017;border-radius:51% 49% 52% 48% / 48% 53% 47% 52%}50%{scale:1.035}62%{scale:1.002}73%{scale:1.020}}
`;

const ORB_V39_SCRIPT = String.raw`<script>(function(){
  var LOW=124;
  function hash2(x,y,s){var n=x*127.1+y*311.7+s*74.7;return (Math.sin(n)*43758.5453123)%1}
  function h01(x,y,s){var v=hash2(x,y,s);return v<0?v+1:v}
  function fade(t){return t*t*(3-2*t)}
  function mix(a,b,t){return a+(b-a)*t}
  function noise2(x,y,s){var x0=Math.floor(x),y0=Math.floor(y),tx=x-x0,ty=y-y0;var a=h01(x0,y0,s),b=h01(x0+1,y0,s),c=h01(x0,y0+1,s),d=h01(x0+1,y0+1,s),ux=fade(tx),uy=fade(ty);return mix(mix(a,b,ux),mix(c,d,ux),uy)}
  function fbm(x,y,s){var v=0,a=.58,f=1,n=0;for(var o=0;o<4;o++){v+=noise2(x*f,y*f,s+o*23)*a;n+=a;f*=1.98;a*=.48}return v/n}
  function smoothstep(a,b,x){var t=(x-a)/(b-a);if(t<0)t=0;else if(t>1)t=1;return t*t*(3-2*t)}
  function gauss(x,y,cx,cy,rx,ry){var dx=(x-cx)/rx,dy=(y-cy)/ry;return Math.exp(-(dx*dx+dy*dy)*2.1)}

  function mountCore(core){
    if(core.getAttribute('data-orb-v39')==='1')return;
    core.setAttribute('data-orb-v39','1');
    core.innerHTML='';
    var canvas=document.createElement('canvas');canvas.className='orb-v39-canvas';canvas.setAttribute('aria-hidden','true');core.appendChild(canvas);
    var ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
    var off=document.createElement('canvas');off.width=LOW;off.height=LOW;
    var octx=off.getContext('2d',{alpha:true}),img=octx.createImageData(LOW,LOW),data=img.data,last=0;

    function resize(){var r=core.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}}
    resize();window.addEventListener('resize',resize,{passive:true});

    function render(now){
      requestAnimationFrame(render);if(now-last<42)return;last=now;resize();
      var t=now/1000,cs=getComputedStyle(core),awake=parseFloat(cs.getPropertyValue('--awake'))||0,voice=parseFloat(cs.getPropertyValue('--voice'))||0,live=1+awake*.17+voice*.27;
      var c1x=.34+Math.sin(t*.17)*.050,c1y=.33+Math.cos(t*.145)*.038,c2x=.70+Math.cos(t*.155+1.15)*.038,c2y=.66+Math.sin(t*.14+.72)*.034;

      for(var py=0;py<LOW;py++){
        var ny=py/(LOW-1);
        for(var px=0;px<LOW;px++){
          var nx=px/(LOW-1),dx=nx-.5,dy=ny-.5,rr=Math.sqrt(dx*dx+dy*dy),i=(py*LOW+px)*4;
          if(rr>.515){data[i+3]=0;continue}

          var wx=nx*1.72+t*.018*live,wy=ny*1.68+Math.sin(t*.10)*.050;
          var warp=fbm(wx*.64+1.9,wy*.66-2.3,43)-.5,warp2=fbm(wx*.71-3.4,wy*.62+2.6,71)-.5;

          /* Rebalance toward connected weather systems: more macro, less isolated mid blobs. */
          var macro=fbm(wx*.52+warp*.22,wy*.56+warp2*.20,101);
          var n1=fbm(wx+warp*.29,wy+warp2*.25,13);
          var n2=fbm(wx*1.11-warp2*.19-t*.010,wy*1.07+warp*.17+t*.0075,31);
          var medium=fbm(wx*1.50+warp*.14+t*.0058*live,wy*1.43-warp2*.12-t*.0044*live,57);
          var medium2=fbm(wx*1.31-warp2*.11-t*.0038*live+2.7,wy*1.36+warp*.11+t*.0032*live-1.6,79);
          var mid=(medium*.60+medium2*.40)-.5;
          var density=macro*.34+n1*.46+n2*.12+mid*.08;

          /* Organic clearings: broad gaussians modulated by a low-frequency field so they are never circular cut-outs. */
          var clearNoise=fbm(wx*.72-t*.003,wy*.70+t*.0025,137);
          var clearMod=.72+clearNoise*.42;
          var clear1=gauss(nx,ny,c1x,c1y,.245,.190)*clearMod;
          var clear2=gauss(nx,ny,c2x,c2y,.158,.125)*(.78+clearNoise*.32);
          density-=clear1*.32;density-=clear2*.21;

          /* Keep v38 clarity, but let connected soft body bridge cloud masses. */
          var edgeBias=mid*.13;
          var softCloud=smoothstep(.410,.535,density+edgeBias*.48);
          var cloud=smoothstep(.468,.588,density+edgeBias);
          var bridge=smoothstep(.445,.565,macro*.48+n1*.52);
          softCloud=Math.max(softCloud,bridge*.58);

          var deep=fbm(wx*.65+t*.0048,wy*.62-t*.0043,89);
          var deepMedium=fbm(wx*.96-t*.0032,wy*.90+t*.0026,113);
          var deepCloud=smoothstep(.49,.655,deep*.76+deepMedium*.24);

          var edge=smoothstep(.50,.18,rr),br=90+10+edge*11,bg=148+10+edge*11,bb=181+10+edge*11;

          /* Light appears only after the cloud deck is genuinely opened. */
          var opening1=smoothstep(.12,.62,clear1)*(1-cloud*.95),opening2=smoothstep(.14,.60,clear2)*(1-cloud*.96);
          var lamp1=gauss(nx,ny,c1x,c1y,.285,.225),lamp2=gauss(nx,ny,c2x,c2y,.185,.150)*.42;
          var lamp=Math.max(lamp1*opening1,lamp2*opening2)*(.52+.07*Math.sin(t*.64)+awake*.07+voice*.10);

          /* Less isolated white blobs, more continuous cloud body with moderate internal texture. */
          var midBody=smoothstep(-.06,.14,mid)*softCloud*(1-cloud*.30);
          var white=softCloud*.33+cloud*(.42+.07*n2)+midBody*.08;
          var shade=deepCloud*(1-softCloud)*.28+cloud*deepCloud*.15;

          var rim1=smoothstep(.13,.50,clear1)*softCloud*(1-cloud*.78);
          var rim2=smoothstep(.15,.48,clear2)*softCloud*(1-cloud*.80)*.56;
          var rim=(rim1+rim2)*.20;

          var R=br,G=bg,B=bb;
          R=R*(1-shade)+46*shade;G=G*(1-shade)+98*shade;B=B*(1-shade)+135*shade;
          R=R*(1-white)+238*white;G=G*(1-white)+247*white;B=B*(1-white)+251*white;
          R=R*(1-rim)+250*rim;G=G*(1-rim)+253*rim;B=B*(1-rim)+255*rim;
          R=R*(1-lamp)+255*lamp;G=G*(1-lamp)+255*lamp;B=B*(1-lamp)+255*lamp;

          var vign=1-smoothstep(.31,.515,rr)*.17;R*=vign;G*=vign;B*=vign;
          data[i]=Math.max(0,Math.min(255,R));data[i+1]=Math.max(0,Math.min(255,G));data[i+2]=Math.max(0,Math.min(255,B));data[i+3]=255;
        }
      }

      octx.putImageData(img,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(off,0,0,canvas.width,canvas.height);
      var g=ctx.createRadialGradient(canvas.width*.31,canvas.height*.25,0,canvas.width*.31,canvas.height*.25,canvas.width*.44);
      g.addColorStop(0,'rgba(255,255,255,.024)');g.addColorStop(.45,'rgba(226,244,252,.009)');g.addColorStop(1,'rgba(226,244,252,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    requestAnimationFrame(render);
  }

  function mount(){document.querySelectorAll('.core').forEach(mountCore)}
  mount();var root=document.getElementById('app')||document.body;new MutationObserver(mount).observe(root,{childList:true,subtree:true});
})();</scr`+`ipt>`;

function enhance(html){return html.replace('</head>','<style>'+ORB_V39_STYLE+'</style></head>').replace('</body>',ORB_V39_SCRIPT+'</body>')}

export default {
  async fetch(request,env,ctx){
    const response=await baseWorker.fetch(request,env,ctx),type=response.headers.get('content-type')||'';
    if(request.method==='HEAD'||!type.includes('text/html'))return response;
    const html=await response.text(),headers=new Headers(response.headers);
    headers.delete('content-length');headers.set('cache-control','no-store');headers.set('x-talera-orb-app','organic-v39-canvas-connected-cloud-fields');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
