import baseWorker from "./worker.js";

const ORB_V53_STYLE = String.raw`
/* TALERA ORB v53 — transparent living core, flowing internal tissue, fixed warm heart. */
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
  width:80%!important;
  height:80%!important;
  position:relative!important;
  opacity:1!important;
  visibility:visible!important;
  overflow:hidden!important;
  isolation:isolate!important;
  border-radius:50% 50% 49% 51% / 51% 49% 51% 49%!important;
  background:rgba(122,182,214,.035)!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    0 12px 34px rgba(30,76,110,.035),
    0 0 26px rgba(89,171,212,.10),
    0 0 70px rgba(89,171,212,.055)!important;
  filter:none!important;
  transform:scale(calc(.992 + var(--awake)*.105 + var(--voice)*.035 + var(--orb-beat)))!important;
  transition:transform .10s linear!important;
  animation:taleraOrb53Body 8.8s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:6.1s!important}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v53-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v53";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}
@keyframes taleraOrb53Body{
  0%,100%{border-radius:50% 50% 49% 51% / 51% 49% 51% 49%}
  28%{border-radius:51.4% 48.6% 50.4% 49.6% / 49.4% 51.5% 48.5% 50.6%}
  56%{border-radius:49.1% 50.9% 51.2% 48.8% / 51.7% 48.3% 50.3% 49.7%}
  82%{border-radius:50.7% 49.3% 49% 51% / 49.5% 50.9% 49.1% 50.5%}
}
`;

const ORB_V53_SCRIPT = String.raw`<script>(function(){
  var TEX=300;
  var HEART_X=.57, HEART_Y=.47;
  var HEART_R=231, HEART_G=169, HEART_B=139; // TALERA warm #E7A98B

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
    var x0=Math.floor(x), y0=Math.floor(y), tx=x-x0, ty=y-y0;
    var a=hash2(x0,y0,s), b=hash2(x0+1,y0,s), c=hash2(x0,y0+1,s), d=hash2(x0+1,y0+1,s);
    var ux=fade(tx), uy=fade(ty);
    return mix(mix(a,b,ux),mix(c,d,ux),uy);
  }
  function fbm(x,y,s){
    var v=0,a=.56,f=1,n=0;
    for(var i=0;i<5;i++){
      v+=noise2(x*f,y*f,s+i*19)*a;
      n+=a; f*=1.96; a*=.49;
    }
    return v/n;
  }
  function beatBell(phase,center,width){
    var d=Math.abs(phase-center);
    d=Math.min(d,1-d);
    return Math.exp(-(d*d)/(2*width*width));
  }

  function makeCloudTexture(seed,kind){
    var c=document.createElement('canvas');
    c.width=TEX;c.height=TEX;
    var xctx=c.getContext('2d',{alpha:true});
    var img=xctx.createImageData(TEX,TEX);
    var d=img.data;

    for(var py=0;py<TEX;py++){
      var ny=py/(TEX-1);
      for(var px=0;px<TEX;px++){
        var nx=px/(TEX-1);
        var x=(nx-.5)*2.6;
        var y=(ny-.5)*2.6;
        var qx=fbm(x*.72+1.7,y*.66-2.1,seed+3)-.5;
        var qy=fbm(x*.64-2.4,y*.73+1.2,seed+7)-.5;
        var wx=x+qx*.50+qy*.18;
        var wy=y+qy*.48-qx*.16;

        var n1=fbm(wx*.72,wy*.68,seed+11);
        var n2=fbm(wx*1.38+2.3,wy*1.26-1.6,seed+29);
        var n3=fbm(wx*2.48-1.8,wy*2.30+2.0,seed+47);
        var mass=n1*.62+n2*.28+n3*.10;

        var threshold=kind===0?.505:(kind===1?.520:.535);
        var body=smoothstep(threshold-.055,threshold+.110,mass);
        var edge=smoothstep(threshold-.095,threshold+.025,mass)-body*.46;
        edge=clamp(edge,0,1);

        var dense=smoothstep(threshold+.035,threshold+.170,mass);
        var valley=fbm(wx*1.08+3.4,wy*.96-2.7,seed+71);
        var shadow=smoothstep(.49,.72,valley)*(body*.72+edge*.18);

        var alphaBase=kind===0?.36:(kind===1?.48:.58);
        var alpha=(body*.72+edge*.28)*alphaBase;
        alpha*=.72+dense*.28;

        // Keep true transparent openings; the page must remain visible through the core.
        if(alpha<.018)alpha=0;

        var lowR=kind===0?98:(kind===1?126:168);
        var lowG=kind===0?153:(kind===1?180:209);
        var lowB=kind===0?190:(kind===1?209:228);
        var hiR=kind===0?205:(kind===1?224:242);
        var hiG=kind===0?232:(kind===1?240:249);
        var hiB=kind===0?244:(kind===1?248:253);

        var bright=clamp(body*.70+dense*.30,0,1);
        var R=mix(lowR,hiR,bright);
        var G=mix(lowG,hiG,bright);
        var B=mix(lowB,hiB,bright);

        // Internal depth instead of blue-sky fill.
        R=mix(R,61,shadow*.33);
        G=mix(G,112,shadow*.33);
        B=mix(B,151,shadow*.33);

        var i=(py*TEX+px)*4;
        d[i]=R;d[i+1]=G;d[i+2]=B;d[i+3]=Math.round(alpha*255);
      }
    }
    xctx.putImageData(img,0,0);
    return c;
  }

  function mountCore(core){
    if(core.getAttribute('data-orb-v53')==='1')return;
    core.setAttribute('data-orb-v53','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v53-canvas';
    canvas.setAttribute('aria-hidden','true');
    core.appendChild(canvas);

    var ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx)return;

    var back=makeCloudTexture(31,0);
    var mid=makeCloudTexture(97,1);
    var front=makeCloudTexture(173,2);

    var last=performance.now();
    var cloudClock=0;
    var speedCurrent=.20;

    function resize(){
      var r=core.getBoundingClientRect();
      var dpr=Math.min(window.devicePixelRatio||1,2);
      var w=Math.max(1,Math.round(r.width*dpr));
      var h=Math.max(1,Math.round(r.height*dpr));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
    }
    resize();
    window.addEventListener('resize',resize,{passive:true});

    function drawLayer(tex,cx,cy,size,rot,alpha){
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(rot);
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
      var voiceRaw=parseFloat(cs.getPropertyValue('--voice'))||0;
      var voice=clamp(voiceRaw,0,.75);
      var active=core.classList.contains('active')||core.classList.contains('listening')||awake>.45;

      // Crucial: integrate cloud time. Do not multiply absolute t by a new speed,
      // because that causes the visible frame-jumps we saw in v52.
      var targetSpeed=active ? (1.05+voice*.35) : .22;
      speedCurrent += (targetSpeed-speedCurrent)*Math.min(1,dt*2.7);
      cloudClock += dt*speedCurrent;

      // Heart has its own constant rhythm, independent of cloud speed.
      // Two beats, then a real pause (diastole).
      var HEART_PERIOD=1.28;
      var phase=((now/1000)%HEART_PERIOD)/HEART_PERIOD;
      var lub=beatBell(phase,.105,.030);
      var dub=beatBell(phase,.215,.025)*.62;
      var beat=clamp(lub+dub,0,1);
      var heartGlow=.18+beat*.82;
      core.style.setProperty('--orb-beat',(beat*.013).toFixed(4));

      var w=canvas.width,h=canvas.height;
      var r=Math.min(w,h)*.495;
      var cx=w/2,cy=h/2;

      ctx.clearRect(0,0,w,h);
      ctx.save();
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();

      // Nearly transparent internal medium: no solid blue sphere.
      var base=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
      base.addColorStop(0,'rgba(126,188,219,.025)');
      base.addColorStop(.72,'rgba(116,180,213,.020)');
      base.addColorStop(1,'rgba(98,163,198,.035)');
      ctx.fillStyle=base;ctx.fillRect(cx-r,cy-r,r*2,r*2);

      // Fixed TALERA heart behind all cloud tissue.
      var hx=w*HEART_X,hy=h*HEART_Y;
      var hr=r*(.20+beat*.018);
      var hg=ctx.createRadialGradient(hx,hy,0,hx,hy,hr);
      hg.addColorStop(0,'rgba(255,233,220,'+(.24+beat*.28)+')');
      hg.addColorStop(.20,'rgba('+HEART_R+','+HEART_G+','+HEART_B+','+(.22+heartGlow*.25)+')');
      hg.addColorStop(.52,'rgba('+HEART_R+','+HEART_G+','+HEART_B+','+(.08+heartGlow*.11)+')');
      hg.addColorStop(1,'rgba('+HEART_R+','+HEART_G+','+HEART_B+',0)');
      ctx.fillStyle=hg;ctx.fillRect(hx-hr,hy-hr,hr*2,hr*2);

      // Three translucent internal tissue/cloud layers, each with its own rhythm.
      // Their movement is continuous and deliberately unrelated to the heartbeat.
      var s=r*2.42;
      drawLayer(
        back,
        cx+Math.sin(cloudClock*.43)*r*.12,
        cy+Math.cos(cloudClock*.37)*r*.10,
        s*1.08,
        Math.sin(cloudClock*.21)*.12,
        .78
      );
      drawLayer(
        mid,
        cx+Math.sin(cloudClock*.61+1.8)*r*.15,
        cy+Math.cos(cloudClock*.48+2.4)*r*.13,
        s,
        -.10+Math.sin(cloudClock*.28+1.2)*.16,
        .84
      );
      drawLayer(
        front,
        cx+Math.sin(cloudClock*.77+3.0)*r*.17,
        cy+Math.cos(cloudClock*.56+1.3)*r*.15,
        s*.94,
        .13+Math.sin(cloudClock*.34+2.2)*.18,
        .90
      );

      // White transmitted glow only in open space around the heart.
      // This keeps the occasional whitish see-through without turning into blue sky.
      var whitePulse=.035+beat*.028;
      var wg=ctx.createRadialGradient(hx,hy,0,hx,hy,r*.36);
      wg.addColorStop(0,'rgba(255,255,255,'+whitePulse+')');
      wg.addColorStop(.40,'rgba(248,253,255,.020)');
      wg.addColorStop(1,'rgba(248,253,255,0)');
      ctx.fillStyle=wg;ctx.fillRect(cx-r,cy-r,r*2,r*2);

      ctx.restore();

      // Soft blue atmosphere outside; never a white ring.
      ctx.save();
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.strokeStyle='rgba(91,159,198,.055)';
      ctx.lineWidth=Math.max(1,w*.004);
      ctx.stroke();
      ctx.restore();
    }

    requestAnimationFrame(frame);
  }

  function mount(){document.querySelectorAll('.core').forEach(mountCore)}
  mount();
  var root=document.getElementById('app')||document.body;
  new MutationObserver(mount).observe(root,{childList:true,subtree:true});
})();</scr`+`ipt>`;

function enhance(html){
  return html
    .replace('</head>','<style>'+ORB_V53_STYLE+'</style></head>')
    .replace('</body>',ORB_V53_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v53-transparent-living-core-fixed-heart');

    return new Response(enhance(html),{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }
};