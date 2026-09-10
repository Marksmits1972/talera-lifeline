import baseWorker from "./worker.js";

const ORB_V55_STYLE = String.raw`
/* TALERA ORB v55 — Canvas2D reset: transparent living tissue + smooth fixed heart. */
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
  --orb-beat:0;
  display:block!important;
  position:relative!important;
  width:80%!important;
  height:80%!important;
  opacity:1!important;
  visibility:visible!important;
  overflow:hidden!important;
  isolation:isolate!important;
  border:0!important;
  outline:0!important;
  background:transparent!important;
  background-image:none!important;
  border-radius:50% 50% 49% 51% / 51% 49% 51% 49%!important;
  box-shadow:
    0 10px 34px rgba(37,83,113,.025),
    0 0 26px rgba(84,165,207,.09),
    0 0 68px rgba(84,165,207,.045)!important;
  filter:none!important;
  transform:scale(calc(.994 + var(--awake)*.105 + var(--voice)*.030 + var(--orb-beat)))!important;
  transition:transform .08s linear!important;
  animation:taleraOrb55Body 9.8s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:6.8s!important}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v55-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v55";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}
@keyframes taleraOrb55Body{
  0%,100%{border-radius:50% 50% 49% 51% / 51% 49% 51% 49%}
  27%{border-radius:51.1% 48.9% 50.5% 49.5% / 49.5% 51.4% 48.6% 50.5%}
  55%{border-radius:49.1% 50.9% 51.1% 48.9% / 51.4% 48.6% 50.4% 49.6%}
  81%{border-radius:50.6% 49.4% 49.1% 50.9% / 49.5% 50.8% 49.2% 50.5%}
}
`;

const ORB_V55_SCRIPT = String.raw`<script>(function(){
  var TEX=208;
  var HEART_X=.57, HEART_Y=.47;
  var HEART_R=231, HEART_G=169, HEART_B=139;

  function clamp(v,a,b){return v<a?a:(v>b?b:v)}
  function mix(a,b,t){return a+(b-a)*t}
  function smoothstep(a,b,x){
    var t=clamp((x-a)/(b-a),0,1);
    return t*t*(3-2*t);
  }
  function hash2(x,y,s){
    var n=x*127.1+y*311.7+s*74.7;
    var v=Math.sin(n)*43758.5453123;
    return v-Math.floor(v);
  }
  function fade(t){return t*t*(3-2*t)}
  function noise2(x,y,s){
    var x0=Math.floor(x),y0=Math.floor(y),tx=x-x0,ty=y-y0;
    var a=hash2(x0,y0,s),b=hash2(x0+1,y0,s),c=hash2(x0,y0+1,s),d=hash2(x0+1,y0+1,s);
    var ux=fade(tx),uy=fade(ty);
    return mix(mix(a,b,ux),mix(c,d,ux),uy);
  }
  function fbm(x,y,s){
    var v=0,a=.56,f=1,n=0;
    for(var i=0;i<4;i++){
      v+=noise2(x*f,y*f,s+i*19)*a;
      n+=a;
      f*=1.97;
      a*=.48;
    }
    return v/n;
  }
  function pulseWindow(phase,start,end){
    if(phase<start||phase>end)return 0;
    var x=(phase-start)/(end-start);
    var s=Math.sin(Math.PI*x);
    return s*s;
  }

  function makeTissue(seed,kind){
    var c=document.createElement('canvas');
    c.width=TEX;c.height=TEX;
    var xctx=c.getContext('2d',{alpha:true});
    var img=xctx.createImageData(TEX,TEX);
    var d=img.data;

    for(var py=0;py<TEX;py++){
      var ny=py/(TEX-1);
      for(var px=0;px<TEX;px++){
        var nx=px/(TEX-1);
        var x=(nx-.5)*2.75;
        var y=(ny-.5)*2.75;

        var qx=fbm(x*.63+1.7,y*.59-2.2,seed+3)-.5;
        var qy=fbm(x*.58-2.4,y*.67+1.4,seed+7)-.5;
        var wx=x+qx*.60+qy*.20;
        var wy=y+qy*.56-qx*.18;

        var n1=fbm(wx*.72,wy*.68,seed+11);
        var n2=fbm(wx*1.38+2.1,wy*1.25-1.7,seed+29);
        var n3=fbm(wx*2.45-1.8,wy*2.25+2.0,seed+47);
        var mass=n1*.61+n2*.29+n3*.10;

        var holeField=fbm(wx*.78+3.3,wy*.73-2.9,seed+61);
        var opening=smoothstep(.575,.745,holeField);

        var ridgeNoise=fbm(wx*2.25-2.1,wy*2.05+1.6,seed+83);
        var ridge=1-Math.abs(ridgeNoise*2-1);
        var filament=smoothstep(.79,.95,ridge);

        var threshold=kind===0?.505:(kind===1?.525:(kind===2?.545:.555));
        var body=smoothstep(threshold-.045,threshold+.125,mass);
        var soft=smoothstep(threshold-.105,threshold+.010,mass)*(1-body*.55);
        var dense=smoothstep(threshold+.035,threshold+.170,mass);

        var edge=Math.max(0,smoothstep(threshold-.080,threshold+.020,mass)-body*.50);

        var alpha;
        if(kind===3){
          alpha=(filament*.24+edge*.12)*(1-opening*.82);
        }else{
          var baseAlpha=kind===0?.34:(kind===1?.42:.50);
          alpha=(body*.64+soft*.28+filament*.08)*baseAlpha;
          alpha*=1-opening*.86;
          alpha*=.76+dense*.24;
        }
        if(alpha<.026)alpha=0;

        var lowR=kind===0?83:(kind===1?119:(kind===2?164:113));
        var lowG=kind===0?140:(kind===1?171:(kind===2?202:176));
        var lowB=kind===0?179:(kind===1?203:(kind===2?225:210));
        var hiR=kind===0?205:(kind===1?226:(kind===2?244:233));
        var hiG=kind===0?231:(kind===1?241:(kind===2?249:244));
        var hiB=kind===0?243:(kind===1?248:(kind===2?252:250));

        var bright=clamp(body*.68+soft*.22+dense*.20,0,1);
        var R=mix(lowR,hiR,bright);
        var G=mix(lowG,hiG,bright);
        var B=mix(lowB,hiB,bright);

        var depth=fbm(wx*1.04+1.8,wy*.96-2.3,seed+101);
        var shadow=smoothstep(.52,.75,depth)*(body*.60+soft*.18);
        R=mix(R,55,shadow*.28);
        G=mix(G,103,shadow*.28);
        B=mix(B,143,shadow*.28);

        var white=edge*.42+filament*.12;
        R=mix(R,247,white);
        G=mix(G,252,white);
        B=mix(B,254,white);

        var i=(py*TEX+px)*4;
        d[i]=R;d[i+1]=G;d[i+2]=B;d[i+3]=Math.round(clamp(alpha,0,.68)*255);
      }
    }

    xctx.putImageData(img,0,0);
    return c;
  }

  function mountCore(core){
    if(core.getAttribute('data-orb-v55')==='1')return;
    core.setAttribute('data-orb-v55','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v55-canvas';
    canvas.setAttribute('aria-hidden','true');
    core.appendChild(canvas);

    var ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx)return;

    var back=makeTissue(31,0);
    var mid=makeTissue(97,1);
    var front=makeTissue(173,2);
    var veins=makeTissue(251,3);

    var last=performance.now();
    var cloudClock=0;
    var speedCurrent=.11;

    function resize(){
      var rect=core.getBoundingClientRect();
      var dpr=Math.min(window.devicePixelRatio||1,2);
      var w=Math.max(1,Math.round(rect.width*dpr));
      var h=Math.max(1,Math.round(rect.height*dpr));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
    }

    function drawLayer(tex,cx,cy,size,rot,alpha,sx,sy){
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(rot);
      ctx.scale(sx,sy);
      ctx.globalAlpha=alpha;
      ctx.drawImage(tex,-size/2,-size/2,size,size);
      ctx.restore();
    }

    function frame(now){
      requestAnimationFrame(frame);
      resize();

      var dt=Math.min(.05,Math.max(0,(now-last)/1000));
      last=now;

      var cs=getComputedStyle(core);
      var awake=parseFloat(cs.getPropertyValue('--awake'))||0;
      var voice=clamp(parseFloat(cs.getPropertyValue('--voice'))||0,0,.75);
      var active=core.classList.contains('active')||core.classList.contains('listening')||awake>.45;

      /* Continuous independent cloud clock: no jump when state changes. */
      var targetSpeed=active ? (.52+voice*.18) : .115;
      speedCurrent+=(targetSpeed-speedCurrent)*Math.min(1,dt*2.2);
      cloudClock+=dt*speedCurrent;

      /* Constant smooth lub-dub-pause. Heart rhythm never changes with listening state. */
      var HEART_PERIOD=1.52;
      var phase=((now/1000)%HEART_PERIOD)/HEART_PERIOD;
      var lub=pulseWindow(phase,.025,.205);
      var dub=pulseWindow(phase,.235,.390)*.62;
      var beat=clamp(lub+dub,0,1);
      var heartLevel=.16+beat*.84;
      core.style.setProperty('--orb-beat',(beat*.0075).toFixed(4));

      var w=canvas.width,h=canvas.height;
      var r=Math.min(w,h)*.495;
      var cx=w/2,cy=h/2;
      var hx=w*HEART_X,hy=h*HEART_Y;

      ctx.clearRect(0,0,w,h);
      ctx.save();
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();

      /* No blue fill. The page shows through real transparent openings. */

      /* Fixed warm TALERA heart, behind every tissue layer. */
      var hr=r*(.235+beat*.012);
      var hg=ctx.createRadialGradient(hx,hy,0,hx,hy,hr);
      hg.addColorStop(0,'rgba(255,236,225,'+(.16+heartLevel*.20)+')');
      hg.addColorStop(.18,'rgba('+HEART_R+','+HEART_G+','+HEART_B+','+(.13+heartLevel*.22)+')');
      hg.addColorStop(.50,'rgba('+HEART_R+','+HEART_G+','+HEART_B+','+(.035+heartLevel*.085)+')');
      hg.addColorStop(1,'rgba('+HEART_R+','+HEART_G+','+HEART_B+',0)');
      ctx.fillStyle=hg;
      ctx.fillRect(hx-hr,hy-hr,hr*2,hr*2);

      var s=r*2.55;
      var b1=.86+Math.sin(cloudClock*.29)*.035;
      var b2=.90+Math.sin(cloudClock*.37+1.7)*.035;
      var b3=.94+Math.sin(cloudClock*.43+2.8)*.030;

      drawLayer(back,
        cx+Math.sin(cloudClock*.37)*r*.11,
        cy+Math.cos(cloudClock*.31)*r*.09,
        s*1.10,
        Math.sin(cloudClock*.18)*.11,
        .78,b1,1.04/b1);

      drawLayer(mid,
        cx+Math.sin(cloudClock*.53+1.8)*r*.14,
        cy+Math.cos(cloudClock*.44+2.4)*r*.12,
        s,
        -.08+Math.sin(cloudClock*.25+1.2)*.15,
        .84,b2,1.03/b2);

      drawLayer(front,
        cx+Math.sin(cloudClock*.69+3.0)*r*.16,
        cy+Math.cos(cloudClock*.51+1.3)*r*.14,
        s*.96,
        .11+Math.sin(cloudClock*.31+2.2)*.17,
        .88,b3,1.02/b3);

      drawLayer(veins,
        cx+Math.sin(cloudClock*.47+4.1)*r*.10,
        cy+Math.cos(cloudClock*.58+2.6)*r*.11,
        s*1.03,
        -.16+Math.sin(cloudClock*.36+4.0)*.19,
        .62,1.02,.98);

      /* A small white transmission around the heart, not a flash and not a sun. */
      var wg=ctx.createRadialGradient(hx,hy,0,hx,hy,r*.32);
      wg.addColorStop(0,'rgba(255,255,255,'+(.018+heartLevel*.024)+')');
      wg.addColorStop(.42,'rgba(250,253,255,.014)');
      wg.addColorStop(1,'rgba(250,253,255,0)');
      ctx.fillStyle=wg;
      ctx.fillRect(cx-r,cy-r,r*2,r*2);

      ctx.restore();

      /* Very soft atmospheric edge only. */
      ctx.save();
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.strokeStyle='rgba(83,156,197,.045)';
      ctx.lineWidth=Math.max(1,w*.0035);
      ctx.stroke();
      ctx.restore();
    }

    resize();
    requestAnimationFrame(frame);
  }

  function mount(){document.querySelectorAll('.core').forEach(mountCore)}
  mount();
  var root=document.getElementById('app')||document.body;
  new MutationObserver(mount).observe(root,{childList:true,subtree:true});
})();</script>`;

function enhance(html){
  return html
    .replace('</head>','<style>'+ORB_V55_STYLE+'</style></head>')
    .replace('</body>',ORB_V55_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v55-canvas-smooth-heart-transparent-tissue');

    return new Response(enhance(html),{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }
};
