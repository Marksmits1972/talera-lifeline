import baseWorker from "./worker.js";

const ORB_V46_STYLE = String.raw`
/* TALERA ORB v46 — cloud field calibration: broad living atmosphere, no central pearl. */
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
  background:rgba(150,205,231,.38)!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    0 14px 40px rgba(46,99,130,.05),
    0 0 24px rgba(94,181,222,.16),
    0 0 76px rgba(94,181,222,.10)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.115 + var(--voice)*.042))!important;
  transition:transform .20s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb46Pulse 5.8s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.6s!important}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v46-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v46";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}
@keyframes taleraOrb46Pulse{
  0%,16%,100%{scale:.985;border-radius:50% 50% 49% 51% / 51% 49% 51% 49%}
  40%{scale:1.012;border-radius:51% 49% 50% 50% / 49% 52% 48% 51%}
  53%{scale:1.030}
  65%{scale:1.004}
  77%{scale:1.018}
}
`;

const ORB_V46_SCRIPT = String.raw`<script>(function(){
  var LOW=188;

  /* Independent calibration knobs. */
  var CLOUD_DENSITY=.462;
  var EDGE_DETAIL=.112;
  var CAVITY_DEPTH=.105;
  var LIGHT_STRENGTH=.42;
  var SHADOW_STRENGTH=.46;
  var MOTION=1.05;

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
  function ridge(n){return 1-Math.abs(n*2-1)}

  function mountCore(core){
    if(core.getAttribute('data-orb-v46')==='1')return;
    core.setAttribute('data-orb-v46','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v46-canvas';
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
      var life=MOTION*(1+awake*.14+voice*.12);

      var cavityX=.60+Math.sin(t*.064)*.022;
      var cavityY=.39+Math.cos(t*.057)*.018;

      for(var py=0;py<LOW;py++){
        var ny=py/(LOW-1);
        for(var px=0;px<LOW;px++){
          var nx=px/(LOW-1);
          var dx=nx-.5,dy=ny-.5;
          var rr=Math.sqrt(dx*dx+dy*dy);
          var i=(py*LOW+px)*4;

          if(rr>.515){data[i+3]=0;continue}

          var x=(nx-.5)*2.15;
          var y=(ny-.5)*2.15;

          var q1=fbm(x*.44+t*.0042*life+1.8,y*.42-t*.0035*life-2.2,31)-.5;
          var q2=fbm(x*.40-t*.0035*life-2.5,y*.47+t*.0040*life+2.4,59)-.5;
          var q3=fbm(x*.72+t*.0048*life+3.3,y*.68+t*.0031*life-1.4,83)-.5;
          var wx=x+q1*.62+q2*.24+q3*.090;
          var wy=y+q2*.57-q1*.21-q3*.070;

          var a0=fbm(wx*.50+t*.0047*life,wy*.47-t*.0035*life,101);
          var a1=fbm(wx*.96-t*.0038*life+1.5,wy*.90+t*.0032*life-1.1,127);
          var fieldA=a0*.76+a1*.24;

          var b0=fbm((wx+1.25)*.60-t*.0044*life,(wy-.9)*.56+t*.0039*life,157);
          var b1=fbm(wx*1.18+t*.0042*life-2.2,wy*1.10-t*.0037*life+1.7,181);
          var fieldB=b0*.72+b1*.28;

          var c0=fbm((wx-1.45)*.68+t*.0038*life,(wy+1.15)*.64+t*.0035*life,211);
          var c1=fbm(wx*1.36-t*.0042*life+2.5,wy*1.25+t*.0039*life-2.0,239);
          var fieldC=c0*.70+c1*.30;

          var volume=Math.max(fieldA*.99,fieldB*.985,fieldC*.975);
          var blanket=(a0+b0+c0)/3;
          volume=Math.max(volume,blanket*.78+.095);

          var ridgeA=ridge(fbm(wx*1.55+t*.0034*life,wy*1.43-t*.0030*life,251));
          var ridgeB=ridge(fbm(wx*2.35-t*.0031*life+1.3,wy*2.18+t*.0028*life-1.9,263));
          var billow=(ridgeA*.72+ridgeB*.28)-.5;
          volume+=billow*.072;

          var cavN1=fbm(wx*.78-t*.0021*life+1.2,wy*.72+t*.0018*life-1.8,289)-.5;
          var cavN2=fbm(wx*1.44+t*.0019*life-2.1,wy*1.31-t*.0016*life+2.6,307)-.5;
          var cdx=(nx-cavityX+q1*.038+cavN1*.032)/.235;
          var cdy=(ny-cavityY+q2*.040-cavN1*.025)/.270;
          var cdist=Math.sqrt(cdx*cdx+cdy*cdy)+cavN1*.24+cavN2*.085;
          var cavity=1-smoothstep(.52,1.08,cdist);

          var streamN=fbm(wx*.66-t*.0015*life+3.8,wy*.61+t*.0014*life-3.0,331)-.5;
          var streamAxis=Math.abs((ny-.52)-(-.16*(nx-.5)+q2*.070+streamN*.070));
          var stream=(1-smoothstep(.045,.145,streamAxis))*smoothstep(.08,.42,nx)*(1-smoothstep(.76,.98,nx));

          var carved=volume-cavity*CAVITY_DEPTH-stream*.032;

          var edgeMid=fbm(wx*2.20+t*.0035*life,wy*2.02-t*.0030*life,353)-.5;
          var edgeFine=fbm(wx*4.05-t*.0028*life+1.8,wy*3.72+t*.0026*life-2.3,379)-.5;
          var baseMask=smoothstep(CLOUD_DENSITY-.100,CLOUD_DENSITY+.040,carved);
          var boundaryWeight=baseMask*(1-baseMask)*4;
          var shaped=carved+(edgeMid*EDGE_DETAIL+edgeFine*EDGE_DETAIL*.30)*boundaryWeight;

          var haze=smoothstep(CLOUD_DENSITY-.145,CLOUD_DENSITY-.030,shaped);
          var cloud=smoothstep(CLOUD_DENSITY-.060,CLOUD_DENSITY+.045,shaped);
          var dense=smoothstep(CLOUD_DENSITY+.020,CLOUD_DENSITY+.135,shaped);

          var depthN=fbm(wx*.84-t*.0027*life,wy*.80+t*.0024*life,409);
          var valleyN=fbm(wx*1.34+t*.0024*life+1.7,wy*1.26-t*.0022*life-2.0,421);
          var shadow=dense*(smoothstep(.44,.70,depthN)*.72+smoothstep(.53,.74,valleyN)*.28)*SHADOW_STRENGTH;

          var openAir=clamp((cavity*.68+stream*.20)*(1-cloud*.92),0,1);
          var lightTexture=.76+fbm(wx*.71+t*.0016*life,wy*.67-t*.0014*life,449)*.24;
          var light=openAir*lightTexture*LIGHT_STRENGTH;
          var boundary=haze*(1-cloud);
          var openingNear=smoothstep(.10,.76,cavity)+stream*.26;
          var rim=boundary*clamp(openingNear,0,1)*clamp(.62+edgeMid*.44+edgeFine*.15,0,1)*.52;

          var airN=fbm(wx*.36+t*.0012*life,wy*.34-t*.0010*life,467)-.5;
          var R=132+airN*8;
          var G=190+airN*10;
          var B=220+airN*11;

          var mistAmt=.06+haze*.15;
          R=R*(1-mistAmt)+206*mistAmt;
          G=G*(1-mistAmt)+231*mistAmt;
          B=B*(1-mistAmt)+244*mistAmt;

          var whiteAmt=cloud*.51+dense*.12;
          R=R*(1-whiteAmt)+239*whiteAmt;
          G=G*(1-whiteAmt)+248*whiteAmt;
          B=B*(1-whiteAmt)+252*whiteAmt;

          R=R*(1-shadow)+70*shadow;
          G=G*(1-shadow)+132*shadow;
          B=B*(1-shadow)+174*shadow;

          R=R*(1-rim)+252*rim;
          G=G*(1-rim)+255*rim;
          B=B*(1-rim)+255*rim;

          R=R*(1-light)+255*light;
          G=G*(1-light)+255*light;
          B=B*(1-light)+255*light;

          var containment=smoothstep(.455,.515,rr)*.052;
          R=R*(1-containment)+183*containment;
          G=G*(1-containment)+220*containment;
          B=B*(1-containment)+238*containment;

          var alpha=1-smoothstep(.492,.518,rr)*.15;
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

      var gx=canvas.width*cavityX,gy=canvas.height*cavityY;
      var g=ctx.createRadialGradient(gx,gy,0,gx,gy,canvas.width*.27);
      g.addColorStop(0,'rgba(255,255,255,.040)');
      g.addColorStop(.35,'rgba(246,253,255,.020)');
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
    .replace('</head>','<style>'+ORB_V46_STYLE+'</style></head>')
    .replace('</body>',ORB_V46_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v46-broad-cloud-volume-calibration');

    return new Response(enhance(html),{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }
};
