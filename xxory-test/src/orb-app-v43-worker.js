import baseWorker from "./worker.js";

const ORB_V43_STYLE = String.raw`
/* TALERA ORB v43 — reset: internal living cloud atmosphere, not a planet surface. */
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
  border-radius:50% 50% 48% 52% / 51% 48% 52% 49%!important;
  background:rgba(196,224,238,.50)!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    0 16px 44px rgba(46,99,130,.08),
    0 0 24px rgba(111,190,226,.18),
    0 0 72px rgba(111,190,226,.10)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.115 + var(--voice)*.045))!important;
  transition:transform .20s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb43Pulse 5.8s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.6s!important}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v43-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v43";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}
@keyframes taleraOrb43Pulse{
  0%,16%,100%{scale:.986;border-radius:50% 50% 48% 52% / 51% 48% 52% 49%}
  39%{scale:1.012;border-radius:51% 49% 51% 49% / 49% 52% 48% 51%}
  52%{scale:1.029}
  64%{scale:1.004}
  76%{scale:1.017}
}
`;

const ORB_V43_SCRIPT = String.raw`<script>(function(){
  var LOW=156;

  function hash2(x,y,s){
    var n=x*127.1+y*311.7+s*74.7;
    return (Math.sin(n)*43758.5453123)%1;
  }
  function h01(x,y,s){
    var v=hash2(x,y,s);
    return v<0?v+1:v;
  }
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
    var t=(x-a)/(b-a);
    t=clamp(t,0,1);
    return t*t*(3-2*t);
  }
  function gauss(x,y,cx,cy,rx,ry){
    var dx=(x-cx)/rx,dy=(y-cy)/ry;
    return Math.exp(-(dx*dx+dy*dy)*2.0);
  }

  function mountCore(core){
    if(core.getAttribute('data-orb-v43')==='1')return;
    core.setAttribute('data-orb-v43','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v43-canvas';
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
      if(canvas.width!==w||canvas.height!==h){
        canvas.width=w;canvas.height=h;
      }
    }

    resize();
    window.addEventListener('resize',resize,{passive:true});

    function render(now){
      requestAnimationFrame(render);
      if(now-last<40)return;
      last=now;
      resize();

      var t=now/1000;
      var cs=getComputedStyle(core);
      var awake=parseFloat(cs.getPropertyValue('--awake'))||0;
      var voiceRaw=parseFloat(cs.getPropertyValue('--voice'))||0;
      var voice=Math.min(.55,Math.max(0,voiceRaw));
      var life=1+awake*.12+voice*.10;

      /* The light well itself drifts. It is not a surface highlight. */
      var lightX=.53+Math.sin(t*.105)*.035;
      var lightY=.47+Math.cos(t*.093)*.028;

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

          /* No dark planetary edge. Only a soft containment fade. */
          var edgeFade=1-smoothstep(.455,.515,rr);

          var x=nx*1.72;
          var y=ny*1.72;

          /* Slow domain warp makes the atmosphere fold into itself. */
          var w1=fbm(x*.54+t*.0052*life+1.7,y*.52-t*.0040*life-2.1,41)-.5;
          var w2=fbm(x*.49-t*.0042*life-3.0,y*.57+t*.0048*life+2.6,73)-.5;
          var wx=x+w1*.42+w2*.18;
          var wy=y+w2*.39-w1*.16;

          /* Three depth layers. They move independently so the inside feels volumetric. */
          var farMacro=fbm(wx*.47+t*.0060*life,wy*.50-t*.0038*life,101);
          var farDetail=fbm(wx*.86-t*.0050*life+2.2,wy*.82+t*.0042*life-1.1,131);
          var farField=farMacro*.62+farDetail*.38;

          var midMacro=fbm(wx*.58-t*.0052*life-2.6,wy*.55+t*.0061*life+1.7,163);
          var midDetail=fbm(wx*1.02+t*.0068*life,wy*.95-t*.0056*life,191);
          var midField=midMacro*.57+midDetail*.43;

          var nearMacro=fbm(wx*.70+t*.0045*life+1.3,wy*.67+t*.0036*life-2.9,223);
          var nearDetail=fbm(wx*1.32-t*.0070*life-1.4,wy*1.22+t*.0064*life+2.1,257);
          var nearField=nearMacro*.50+nearDetail*.50;

          /* Cloud body is a volume, not patches painted on a blue sphere. */
          var volume=Math.max(
            farField*.94,
            midField*.99,
            nearField*.95
          );

          /* Large internal cavity + smaller side opening, both noise-modulated. */
          var cavityNoise=.72+fbm(wx*.70-t*.0025,wy*.68+t*.0022,307)*.43;
          var mainCavity=gauss(nx,ny,lightX,lightY,.285,.315)*cavityNoise;
          var sideCavity=gauss(
            nx,ny,
            .31+Math.sin(t*.082+1.4)*.025,
            .34+Math.cos(t*.075+.4)*.022,
            .155,.135
          )*(.72+fbm(wx*.83+2.1,wy*.77-1.8,337)*.34);

          var carved=volume-mainCavity*.255-sideCavity*.105;

          /* Medium detail acts on the BODY and rim, not as isolated white blobs. */
          var bodyNoise=fbm(wx*1.48+t*.0055*life,wy*1.39-t*.0049*life,359)-.5;
          var fineNoise=fbm(wx*2.55-t*.0042*life,wy*2.36+t*.0040*life,389)-.5;

          var mist=smoothstep(.410,.535,carved+bodyNoise*.055);
          var body=smoothstep(.475,.605,carved+bodyNoise*.078+fineNoise*.022);
          var coreCloud=smoothstep(.545,.675,carved+bodyNoise*.060);

          /* A cloud rim appears around openings: this is where internal light escapes. */
          var mainOpening=smoothstep(.18,.72,mainCavity)*(1-body*.88);
          var sideOpening=smoothstep(.20,.68,sideCavity)*(1-body*.90);
          var opening=Math.max(mainOpening,sideOpening*.46);

          var boundary=mist*(1-body);
          var rimTexture=(.58+bodyNoise*.32+fineNoise*.14);
          var luminousRim=boundary*opening*rimTexture;

          /* Broad internal illumination — deliberately no round flashlight dot. */
          var lightWell=Math.max(
            gauss(nx,ny,lightX,lightY,.34,.37)*mainOpening,
            gauss(nx,ny,.31,.34,.19,.17)*sideOpening*.34
          );
          lightWell*=.61+.06*Math.sin(t*.52)+awake*.055+voice*.035;

          /* Depth shading lives inside clouds, not on the outer sphere. */
          var depthField=fbm(wx*.62-t*.0035,wy*.60+t*.0030,421);
          var depth=smoothstep(.46,.69,depthField)*body;
          var innerShadow=depth*(.18+.20*coreCloud);

          /* Base is pale atmosphere, not planet-blue. */
          var R=170,G=211,B=232;

          /* Slight breathing cyan in open air. */
          var airVar=(fbm(wx*.42+t*.002,wy*.44-t*.0017,449)-.5);
          R+=airVar*7;G+=airVar*9;B+=airVar*10;

          /* Cloud volume: milky blue-white with layered depth. */
          var cloudWhite=mist*.34+body*.34+coreCloud*.08;
          R=R*(1-cloudWhite)+238*cloudWhite;
          G=G*(1-cloudWhite)+248*cloudWhite;
          B=B*(1-cloudWhite)+252*cloudWhite;

          /* Internal blue valleys give the organism depth. */
          R=R*(1-innerShadow)+91*innerShadow;
          G=G*(1-innerShadow)+155*innerShadow;
          B=B*(1-innerShadow)+193*innerShadow;

          /* Openings brighten irregular rims and the cavity beyond them. */
          var rimLight=luminousRim*.66;
          R=R*(1-rimLight)+252*rimLight;
          G=G*(1-rimLight)+254*rimLight;
          B=B*(1-rimLight)+255*rimLight;

          R=R*(1-lightWell)+255*lightWell;
          G=G*(1-lightWell)+255*lightWell;
          B=B*(1-lightWell)+255*lightWell;

          /* Keep edge translucent and atmospheric, never like a shaded globe. */
          var edgeMist=smoothstep(.34,.505,rr)*.13;
          R=R*(1-edgeMist)+195*edgeMist;
          G=G*(1-edgeMist)+225*edgeMist;
          B=B*(1-edgeMist)+239*edgeMist;

          data[i]=clamp(R,0,255);
          data[i+1]=clamp(G,0,255);
          data[i+2]=clamp(B,0,255);
          data[i+3]=Math.round(255*(.90+.10*edgeFade));
        }
      }

      octx.putImageData(img,0,0);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(off,0,0,canvas.width,canvas.height);

      /* Atmospheric glow around the internal opening, not on the shell. */
      var gx=canvas.width*lightX,gy=canvas.height*lightY;
      var g=ctx.createRadialGradient(gx,gy,0,gx,gy,canvas.width*.31);
      g.addColorStop(0,'rgba(255,255,255,.10)');
      g.addColorStop(.34,'rgba(238,250,255,.045)');
      g.addColorStop(1,'rgba(220,243,252,0)');
      ctx.fillStyle=g;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }

    requestAnimationFrame(render);
  }

  function mount(){
    document.querySelectorAll('.core').forEach(mountCore);
  }

  mount();
  var root=document.getElementById('app')||document.body;
  new MutationObserver(mount).observe(root,{childList:true,subtree:true});
})();</scr`+`ipt>`;

function enhance(html){
  return html
    .replace('</head>','<style>'+ORB_V43_STYLE+'</style></head>')
    .replace('</body>',ORB_V43_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v43-living-internal-cloud-atmosphere');

    return new Response(enhance(html),{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }
};
