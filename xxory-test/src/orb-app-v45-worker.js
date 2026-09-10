import baseWorker from "./worker.js";

const ORB_V45_STYLE = String.raw`
/* TALERA ORB v45 — clean reset. Continuous internal cloud volume; no lobes, bubbles or planet surface. */
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
  background:rgba(184,220,238,.42)!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    0 14px 42px rgba(46,99,130,.055),
    0 0 24px rgba(111,190,226,.16),
    0 0 76px rgba(111,190,226,.10)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.115 + var(--voice)*.042))!important;
  transition:transform .20s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb45Pulse 5.8s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.6s!important}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v45-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v45";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}
@keyframes taleraOrb45Pulse{
  0%,16%,100%{scale:.985;border-radius:50% 50% 49% 51% / 51% 49% 51% 49%}
  40%{scale:1.012;border-radius:51% 49% 50% 50% / 49% 52% 48% 51%}
  53%{scale:1.030}
  65%{scale:1.004}
  77%{scale:1.018}
}
`;

const ORB_V45_SCRIPT = String.raw`<script>(function(){
  var LOW=182;

  /* Four independent tuning knobs for future versions. */
  var CLOUD_DENSITY=.505;   /* lower = more cloud body */
  var EDGE_DETAIL=.092;     /* higher = more ragged cloud edges */
  var CAVITY_DEPTH=.255;    /* higher = stronger internal clearing */
  var LIGHT_STRENGTH=.73;   /* internal light through the clearing */
  var MOTION=1.0;           /* speed only; never changes cloud density */

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
      f*=1.98;
      a*=.47;
    }
    return v/n;
  }
  function smoothstep(a,b,x){
    var t=clamp((x-a)/(b-a),0,1);
    return t*t*(3-2*t);
  }

  function mountCore(core){
    if(core.getAttribute('data-orb-v45')==='1')return;
    core.setAttribute('data-orb-v45','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v45-canvas';
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

      /* Voice makes the organism move a little faster, not whiter or denser. */
      var life=MOTION*(1+awake*.14+voice*.12);

      var cavityX=.57+Math.sin(t*.070)*.025;
      var cavityY=.45+Math.cos(t*.061)*.021;

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

          var x=(nx-.5)*2.08;
          var y=(ny-.5)*2.08;

          /* Continuous domain warp: there are deliberately NO circular lobe centres. */
          var q1=fbm(x*.46+t*.0039*life+1.6,y*.44-t*.0033*life-2.3,31)-.5;
          var q2=fbm(x*.43-t*.0032*life-2.8,y*.49+t*.0037*life+2.0,59)-.5;
          var q3=fbm(x*.78+t*.0045*life+3.1,y*.72+t*.0029*life-1.7,83)-.5;

          var wx=x+q1*.54+q2*.20+q3*.075;
          var wy=y+q2*.50-q1*.18-q3*.060;

          /* Three continuous atmosphere slices. Each slice spans the whole interior. */
          var backMacro=fbm(wx*.60+t*.0052*life,wy*.56-t*.0037*life,101);
          var backMid=fbm(wx*1.12-t*.0041*life+1.4,wy*1.03+t*.0034*life-1.1,127);
          var back=backMacro*.72+backMid*.28;

          var midMacro=fbm((wx+1.1)*.72-t*.0048*life,(wy-.8)*.68+t*.0042*life,157);
          var midMid=fbm(wx*1.42+t*.0046*life-2.2,wy*1.31-t*.0040*life+1.9,181);
          var middle=midMacro*.67+midMid*.33;

          var frontMacro=fbm((wx-1.5)*.82+t*.0040*life,(wy+1.2)*.78+t*.0036*life,211);
          var frontMid=fbm(wx*1.66-t*.0047*life+2.6,wy*1.52+t*.0044*life-2.0,239);
          var front=frontMacro*.64+frontMid*.36;

          /* Max keeps volumes coherent. Weighted background prevents empty blue 'oceans'. */
          var volume=Math.max(back*.955,middle*.985,front*.965);
          volume=Math.max(volume,backMacro*.88+.055);

          /* Irregular internal clearing. Ellipse is heavily warped so it never reads as a round spot. */
          var cavNoise=fbm(wx*.82-t*.0024*life+1.2,wy*.76+t*.0020*life-1.9,269)-.5;
          var cavNoise2=fbm(wx*1.38+t*.0022*life-2.0,wy*1.24-t*.0018*life+2.5,293)-.5;
          var cdx=(nx-cavityX+q1*.050+cavNoise*.035)/.30;
          var cdy=(ny-cavityY+q2*.052-cavNoise*.025)/.35;
          var cdist=Math.sqrt(cdx*cdx+cdy*cdy);
          cdist+=cavNoise*.28+cavNoise2*.105;
          var cavity=1-smoothstep(.56,1.12,cdist);

          /* Secondary open air is a flowing channel, not a second round hole. */
          var channelNoise=fbm(wx*.61-t*.0017*life+4.1,wy*.58+t*.0015*life-3.3,317)-.5;
          var channelAxis=Math.abs((ny-.36)-(.18*(nx-.5)+q1*.080+channelNoise*.080));
          var channel=(1-smoothstep(.055,.185,channelAxis))*smoothstep(.12,.72,nx)*(1-smoothstep(.78,.98,nx));

          var carved=volume-cavity*CAVITY_DEPTH-channel*.055;

          /* EDGE_DETAIL acts only on transition structure. It cannot create isolated bubble bodies. */
          var edgeMid=fbm(wx*2.02+t*.0037*life,wy*1.86-t*.0032*life,347)-.5;
          var edgeFine=fbm(wx*3.74-t*.0030*life+1.8,wy*3.42+t*.0028*life-2.4,373)-.5;
          var edgePerturb=edgeMid*EDGE_DETAIL+edgeFine*EDGE_DETAIL*.32;

          var cloudBase=smoothstep(CLOUD_DENSITY-.105,CLOUD_DENSITY+.035,carved);
          var edgeBand=cloudBase*(1-cloudBase)*4;
          var shaped=carved+edgePerturb*edgeBand;

          var haze=smoothstep(CLOUD_DENSITY-.145,CLOUD_DENSITY-.030,shaped);
          var cloud=smoothstep(CLOUD_DENSITY-.055,CLOUD_DENSITY+.055,shaped);
          var dense=smoothstep(CLOUD_DENSITY+.035,CLOUD_DENSITY+.155,shaped);

          /* Depth is derived from cloud density itself, never from sphere position. */
          var depthNoise=fbm(wx*.92-t*.0028*life,wy*.86+t*.0025*life,401);
          var shadow=dense*smoothstep(.45,.69,depthNoise)*.34;

          /* Light exists inside clearings. No specular highlight, no surface reflection. */
          var openAir=clamp((cavity*.92+channel*.22)*(1-cloud*.86),0,1);
          var lightTexture=.82+fbm(wx*.73+t*.0018*life,wy*.69-t*.0015*life,431)*.20;
          var light=openAir*lightTexture*LIGHT_STRENGTH;

          /* Bright irregular cloud rim around the cavity gives the photographic 'silver lining'. */
          var boundary=haze*(1-cloud);
          var cavityNear=smoothstep(.08,.78,cavity);
          var rim=boundary*cavityNear*clamp(.68+edgeMid*.38+edgeFine*.12,0,1)*.72;

          /* Pale atmospheric air — not globe-blue. */
          var air=fbm(wx*.38+t*.0012*life,wy*.36-t*.0010*life,461)-.5;
          var R=169+air*7;
          var G=212+air*9;
          var B=233+air*10;

          /* Fine translucent mist fills the space, preventing an empty flat background. */
          var mistAmt=.08+haze*.22;
          R=R*(1-mistAmt)+218*mistAmt;
          G=G*(1-mistAmt)+238*mistAmt;
          B=B*(1-mistAmt)+248*mistAmt;

          /* Cloud body. */
          var whiteAmt=cloud*.48+dense*.12;
          R=R*(1-whiteAmt)+240*whiteAmt;
          G=G*(1-whiteAmt)+249*whiteAmt;
          B=B*(1-whiteAmt)+253*whiteAmt;

          /* Blue valleys INSIDE the clouds create volume. */
          R=R*(1-shadow)+88*shadow;
          G=G*(1-shadow)+153*shadow;
          B=B*(1-shadow)+193*shadow;

          /* Silver lining and internal light. */
          R=R*(1-rim)+253*rim;
          G=G*(1-rim)+255*rim;
          B=B*(1-rim)+255*rim;

          R=R*(1-light)+255*light;
          G=G*(1-light)+255*light;
          B=B*(1-light)+255*light;

          /* Outer containment is translucent only — no planetary vignette/shadow. */
          var containment=smoothstep(.43,.515,rr)*.070;
          R=R*(1-containment)+204*containment;
          G=G*(1-containment)+231*containment;
          B=B*(1-containment)+243*containment;

          var alpha=1-smoothstep(.490,.518,rr)*.16;
          data[i]=clamp(R,0,255);
          data[i+1]=clamp(G,0,255);
          data[i+2]=clamp(B,0,255);
          data[i+3]=Math.round(255*alpha);
        }
      }

      octx.putImageData(img,0,0);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(off,0,0,canvas.width,canvas.height);

      /* Very broad cavity glow only. Never a circular glossy highlight. */
      var gx=canvas.width*cavityX;
      var gy=canvas.height*cavityY;
      var g=ctx.createRadialGradient(gx,gy,0,gx,gy,canvas.width*.34);
      g.addColorStop(0,'rgba(255,255,255,.075)');
      g.addColorStop(.34,'rgba(246,253,255,.035)');
      g.addColorStop(.68,'rgba(226,245,253,.014)');
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
    .replace('</head>','<style>'+ORB_V45_STYLE+'</style></head>')
    .replace('</body>',ORB_V45_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v45-continuous-cloud-volume-reset');

    return new Response(enhance(html),{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }
};
