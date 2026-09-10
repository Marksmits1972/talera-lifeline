import baseWorker from "./worker.js";

const ORB_V56_STYLE = String.raw`
/* TALERA ORB v56 — simplify: life comes from smooth voice-reactive motion. */
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
    0 10px 32px rgba(37,83,113,.025),
    0 0 28px rgba(84,165,207,.095),
    0 0 70px rgba(84,165,207,.045)!important;
  filter:none!important;
  transform:scale(calc(.995 + var(--awake)*.075))!important;
  transition:transform .45s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb56Body 10.5s ease-in-out infinite!important;
}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v56-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v56";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}
@keyframes taleraOrb56Body{
  0%,100%{border-radius:50% 50% 49% 51% / 51% 49% 51% 49%}
  30%{border-radius:51.2% 48.8% 50.2% 49.8% / 49.6% 51.2% 48.8% 50.4%}
  58%{border-radius:49.2% 50.8% 51% 49% / 51.3% 48.7% 50.4% 49.6%}
  82%{border-radius:50.6% 49.4% 49.1% 50.9% / 49.5% 50.8% 49.2% 50.5%}
}
`;

const ORB_V56_SCRIPT = String.raw`<script>(function(){
  var TEX=220;
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
      v+=noise2(x*f,y*f,s+i*23)*a;
      n+=a;
      f*=1.96;
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

  function makeLayer(seed,kind){
    var c=document.createElement('canvas');
    c.width=TEX;c.height=TEX;
    var xctx=c.getContext('2d',{alpha:true});
    var img=xctx.createImageData(TEX,TEX);
    var d=img.data;

    for(var py=0;py<TEX;py++){
      var ny=py/(TEX-1);
      for(var px=0;px<TEX;px++){
        var nx=px/(TEX-1);
        var x=(nx-.5)*2.7;
        var y=(ny-.5)*2.7;

        var qx=fbm(x*.62+1.7,y*.58-2.2,seed+3)-.5;
        var qy=fbm(x*.58-2.4,y*.66+1.4,seed+7)-.5;
        var wx=x+qx*.62+qy*.20;
        var wy=y+qy*.58-qx*.19;

        var macro=fbm(wx*.70,wy*.66,seed+11);
        var mid=fbm(wx*1.42+2.2,wy*1.30-1.6,seed+31);
        var fine=fbm(wx*2.55-1.9,wy*2.28+2.1,seed+53);
        var mass=macro*.62+mid*.28+fine*.10;

        var hole=fbm(wx*.78+3.1,wy*.73-2.8,seed+71);
        var opening=smoothstep(.565,.735,hole);

        var ridgeN=fbm(wx*2.35-2.0,wy*2.10+1.7,seed+89);
        var ridge=1-Math.abs(ridgeN*2-1);
        var filament=smoothstep(.80,.95,ridge);

        var threshold=kind===0?.505:(kind===1?.525:.548);
        var body=smoothstep(threshold-.045,threshold+.115,mass);
        var soft=smoothstep(threshold-.105,threshold+.010,mass)*(1-body*.54);
        var dense=smoothstep(threshold+.035,threshold+.165,mass);
        var edge=Math.max(0,smoothstep(threshold-.080,threshold+.020,mass)-body*.50);

        var alphaBase=kind===0?.42:(kind===1?.50:.34);
        var alpha=(body*.64+soft*.27+filament*(kind===2?.20:.07))*alphaBase;
        alpha*=1-opening*.80;
        alpha*=.76+dense*.24;
        if(alpha<.022)alpha=0;

        var lowR=kind===0?74:(kind===1?112:96);
        var lowG=kind===0?130:(kind===1?165:160);
        var lowB=kind===0?171:(kind===1?199:201);
        var hiR=kind===0?204:(kind===1?230:237);
        var hiG=kind===0?231:(kind===1?244:247);
        var hiB=kind===0?244:(kind===1?250:252);

        var bright=clamp(body*.67+soft*.22+dense*.18,0,1);
        var R=mix(lowR,hiR,bright);
        var G=mix(lowG,hiG,bright);
        var B=mix(lowB,hiB,bright);

        var depth=fbm(wx*1.04+1.8,wy*.96-2.3,seed+107);
        var shadow=smoothstep(.50,.74,depth)*(body*.63+soft*.20);
        R=mix(R,48,shadow*.34);
        G=mix(G,93,shadow*.34);
        B=mix(B,132,shadow*.34);

        var white=edge*.34+filament*(kind===2?.20:.08);
        R=mix(R,246,white);
        G=mix(G,251,white);
        B=mix(B,254,white);

        var i=(py*TEX+px)*4;
        d[i]=R;d[i+1]=G;d[i+2]=B;d[i+3]=Math.round(clamp(alpha,0,.72)*255);
      }
    }
    xctx.putImageData(img,0,0);
    return c;
  }

  function mountCore(core){
    if(core.getAttribute('data-orb-v56')==='1')return;
    core.setAttribute('data-orb-v56','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v56-canvas';
    canvas.setAttribute('aria-hidden','true');
    core.appendChild(canvas);
    var ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx)return;

    var back=makeLayer(31,0);
    var front=makeLayer(113,1);
    var filaments=makeLayer(227,2);

    var last=performance.now();
    var flowClock=0;
    var energy=0;

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
      var voiceRaw=clamp(parseFloat(cs.getPropertyValue('--voice'))||0,0,.85);
      var listening=core.classList.contains('active')||core.classList.contains('listening')||awake>.45;

      /*
        The voice is the energy control. Rise quickly while speaking,
        decay calmly after silence — never snap between two animations.
      */
      var voiceTarget=clamp(voiceRaw*1.65,0,1);
      if(listening&&voiceTarget<.035)voiceTarget=.035;
      var response=voiceTarget>energy ? 7.5 : 1.65;
      energy+=(voiceTarget-energy)*Math.min(1,dt*response);

      var idleSpeed=.085;
      var speed=idleSpeed + energy*.78 + (listening?.025:0);
      flowClock+=dt*speed;

      /* Fixed heart rhythm: two soft waves, then a longer quiet pause. */
      var HEART_PERIOD=1.62;
      var phase=((now/1000)%HEART_PERIOD)/HEART_PERIOD;
      var lub=pulseWindow(phase,.030,.215);
      var dub=pulseWindow(phase,.250,.415)*.58;
      var beat=clamp(lub+dub,0,1);
      var heartLevel=.22+beat*.78;

      var w=canvas.width,h=canvas.height;
      var r=Math.min(w,h)*.495;
      var cx=w/2,cy=h/2;
      var hx=w*HEART_X,hy=h*HEART_Y;

      ctx.clearRect(0,0,w,h);
      ctx.save();
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();

      /* No solid fill: true page transparency between living structures. */

      var hr=r*(.24+beat*.010);
      var hg=ctx.createRadialGradient(hx,hy,0,hx,hy,hr);
      hg.addColorStop(0,'rgba(255,237,227,'+(.18+heartLevel*.18)+')');
      hg.addColorStop(.20,'rgba('+HEART_R+','+HEART_G+','+HEART_B+','+(.15+heartLevel*.18)+')');
      hg.addColorStop(.52,'rgba('+HEART_R+','+HEART_G+','+HEART_B+','+(.045+heartLevel*.070)+')');
      hg.addColorStop(1,'rgba('+HEART_R+','+HEART_G+','+HEART_B+',0)');
      ctx.fillStyle=hg;
      ctx.fillRect(hx-hr,hy-hr,hr*2,hr*2);

      /*
        Same organism at all times; speech only adds energy.
        Translation, rotation and soft anisotropic breathing all increase smoothly.
      */
      var amp=.70+energy*.95;
      var s=r*2.52;
      var breathe1=.94+Math.sin(flowClock*.36)*(.028+energy*.014);
      var breathe2=.97+Math.sin(flowClock*.47+1.8)*(.025+energy*.016);

      drawLayer(back,
        cx+Math.sin(flowClock*.46)*r*.105*amp,
        cy+Math.cos(flowClock*.38)*r*.088*amp,
        s*1.08,
        Math.sin(flowClock*.23)*(.10+energy*.08),
        .86,breathe1,1.03/breathe1);

      drawLayer(front,
        cx+Math.sin(flowClock*.69+2.1)*r*.145*amp,
        cy+Math.cos(flowClock*.55+1.2)*r*.125*amp,
        s*.98,
        -.10+Math.sin(flowClock*.33+1.2)*(.14+energy*.10),
        .91,breathe2,1.025/breathe2);

      drawLayer(filaments,
        cx+Math.sin(flowClock*.58+3.7)*r*.115*amp,
        cy+Math.cos(flowClock*.72+2.5)*r*.110*amp,
        s*1.02,
        .13+Math.sin(flowClock*.41+3.1)*(.17+energy*.10),
        .72,1.02,.98);

      /* Warm transmitted haze remains subtle and never becomes a sun. */
      var wg=ctx.createRadialGradient(hx,hy,0,hx,hy,r*.34);
      wg.addColorStop(0,'rgba(255,255,255,'+(.020+beat*.018)+')');
      wg.addColorStop(.44,'rgba(250,253,255,.012)');
      wg.addColorStop(1,'rgba(250,253,255,0)');
      ctx.fillStyle=wg;
      ctx.fillRect(cx-r,cy-r,r*2,r*2);

      ctx.restore();

      ctx.save();
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.strokeStyle='rgba(72,145,187,.052)';
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
})();</scr`+`ipt>`;

function enhance(html){
  return html
    .replace('</head>','<style>'+ORB_V56_STYLE+'</style></head>')
    .replace('</body>',ORB_V56_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v56-simple-smooth-voice-reactive-life');

    return new Response(enhance(html),{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }
};
