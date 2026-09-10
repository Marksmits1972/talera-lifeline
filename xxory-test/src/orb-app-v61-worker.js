import baseWorker from "./worker.js";

const ORB_V61_STYLE = String.raw`
/* TALERA ORB v61 — more idle life, visible smooth heartbeat, keep v60 contrast + 6x voice motion. */
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
  --orb-life:0;
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
    0 10px 32px rgba(16,48,88,.055),
    0 0 30px rgba(54,132,196,.18),
    0 0 78px rgba(54,132,196,.075)!important;
  filter:none!important;
  transform:scale(calc(.995 + var(--awake)*.075 + var(--orb-life)))!important;
  transition:transform .18s ease-out!important;
  animation:taleraOrb61Body 8.8s ease-in-out infinite!important;
}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v61-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v61";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}
@keyframes taleraOrb61Body{
  0%,100%{border-radius:50% 50% 49% 51% / 51% 49% 51% 49%}
  28%{border-radius:51.7% 48.3% 50.4% 49.6% / 49.2% 51.7% 48.3% 50.8%}
  57%{border-radius:48.8% 51.2% 51.4% 48.6% / 51.8% 48.2% 50.7% 49.3%}
  82%{border-radius:50.9% 49.1% 48.8% 51.2% / 49.1% 51.1% 48.9% 50.9%}
}
`;

const ORB_V61_SCRIPT = String.raw`<script>(function(){
  var TEX=224;
  var HEART_X=.57, HEART_Y=.47;
  var HEART_R=231, HEART_G=169, HEART_B=139;

  function clamp(v,a,b){return v<a?a:(v>b?b:v)}
  function mix(a,b,t){return a+(b-a)*t}
  function smoothstep(a,b,x){var t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}
  function hash2(x,y,s){var n=x*127.1+y*311.7+s*74.7;var v=Math.sin(n)*43758.5453123;return v-Math.floor(v)}
  function fade(t){return t*t*(3-2*t)}
  function noise2(x,y,s){
    var x0=Math.floor(x),y0=Math.floor(y),tx=x-x0,ty=y-y0;
    var a=hash2(x0,y0,s),b=hash2(x0+1,y0,s),c=hash2(x0,y0+1,s),d=hash2(x0+1,y0+1,s);
    var ux=fade(tx),uy=fade(ty);
    return mix(mix(a,b,ux),mix(c,d,ux),uy);
  }
  function fbm(x,y,s){
    var v=0,a=.56,f=1,n=0;
    for(var i=0;i<4;i++){v+=noise2(x*f,y*f,s+i*23)*a;n+=a;f*=1.96;a*=.48}
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
    var img=xctx.createImageData(TEX,TEX),d=img.data;

    for(var py=0;py<TEX;py++){
      var ny=py/(TEX-1);
      for(var px=0;px<TEX;px++){
        var nx=px/(TEX-1);
        var x=(nx-.5)*2.72,y=(ny-.5)*2.72;

        var qx=fbm(x*.62+1.7,y*.58-2.2,seed+3)-.5;
        var qy=fbm(x*.58-2.4,y*.66+1.4,seed+7)-.5;
        var wx=x+qx*.64+qy*.22,wy=y+qy*.60-qx*.20;

        var macro=fbm(wx*.70,wy*.66,seed+11);
        var mid=fbm(wx*1.42+2.2,wy*1.30-1.6,seed+31);
        var fine=fbm(wx*2.55-1.9,wy*2.28+2.1,seed+53);
        var mass=macro*.61+mid*.29+fine*.10;

        var hole=fbm(wx*.76+3.1,wy*.71-2.8,seed+71);
        var opening=smoothstep(.548,.716,hole);

        var ridgeN=fbm(wx*2.28-2.0,wy*2.06+1.7,seed+89);
        var ridge=1-Math.abs(ridgeN*2-1);
        var filament=smoothstep(.770,.942,ridge);

        var threshold=kind===0?.487:(kind===1?.507:.532);
        var body=smoothstep(threshold-.050,threshold+.118,mass);
        var soft=smoothstep(threshold-.114,threshold+.010,mass)*(1-body*.50);
        var dense=smoothstep(threshold+.025,threshold+.155,mass);

        var alphaBase=kind===0?.64:(kind===1?.74:.50);
        var alpha=(body*.70+soft*.21+filament*(kind===2?.28:.07))*alphaBase;
        alpha*=1-opening*.90;
        alpha*=.80+dense*.20;
        if(alpha<.020)alpha=0;

        var field=macro*.60+mid*.40;
        var midGate=smoothstep(.470,.500,field);
        var lightGate=smoothstep(.555,.585,field);

        var deepR=kind===0?8:(kind===1?14:20);
        var deepG=kind===0?42:(kind===1?58:70);
        var deepB=kind===0?104:(kind===1?126:148);
        var midR=kind===0?38:(kind===1?52:64);
        var midG=kind===0?112:(kind===1?136:150);
        var midB=kind===0?198:(kind===1?214:226);
        var iceR=kind===0?150:(kind===1?170:188);
        var iceG=kind===0?207:(kind===1?222:234);
        var iceB=kind===0?244:(kind===1?250:253);

        var R=mix(deepR,midR,midGate),G=mix(deepG,midG,midGate),B=mix(deepB,midB,midGate);
        R=mix(R,iceR,lightGate);G=mix(G,iceG,lightGate);B=mix(B,iceB,lightGate);

        var depth=fbm(wx*1.02+1.8,wy*.95-2.3,seed+107);
        var shadow=smoothstep(.44,.66,depth)*(body*.74+soft*.18);
        R=mix(R,6,shadow*.62);G=mix(G,28,shadow*.62);B=mix(B,72,shadow*.62);

        var glint=smoothstep(.65,.84,macro)*(1-shadow)*.10;
        R=mix(R,214,glint);G=mix(G,239,glint);B=mix(B,252,glint);

        var i=(py*TEX+px)*4;
        d[i]=R;d[i+1]=G;d[i+2]=B;d[i+3]=Math.round(clamp(alpha,0,.88)*255);
      }
    }
    xctx.putImageData(img,0,0);
    return c;
  }

  function mountCore(core){
    if(core.getAttribute('data-orb-v61')==='1')return;
    core.setAttribute('data-orb-v61','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v61-canvas';
    canvas.setAttribute('aria-hidden','true');
    core.appendChild(canvas);
    var ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx)return;

    var back=makeLayer(31,0),front=makeLayer(113,1),filaments=makeLayer(227,2);
    var last=performance.now(),flowClock=0,energy=0;

    function resize(){
      var rect=core.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
      var w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
    }
    function drawLayer(tex,cx,cy,size,rot,alpha,sx,sy){
      ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);ctx.scale(sx,sy);ctx.globalAlpha=alpha;
      ctx.drawImage(tex,-size/2,-size/2,size,size);ctx.restore();
    }

    function frame(now){
      requestAnimationFrame(frame);resize();
      var dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
      var cs=getComputedStyle(core);
      var awake=parseFloat(cs.getPropertyValue('--awake'))||0;
      var voiceRaw=clamp(parseFloat(cs.getPropertyValue('--voice'))||0,0,.85);
      var listening=core.classList.contains('active')||core.classList.contains('listening')||awake>.45;

      var voiceTarget=clamp(voiceRaw*2.0,0,1);
      if(listening&&voiceTarget<.025)voiceTarget=.025;
      var response=voiceTarget>energy?9.0:1.35;
      energy+=(voiceTarget-energy)*Math.min(1,dt*response);

      var idleSpeed=.21;
      var speed=idleSpeed*(1+energy*5.0);
      flowClock+=dt*speed;

      var HEART_PERIOD=2.05;
      var phase=((now/1000)%HEART_PERIOD)/HEART_PERIOD;
      var lub=pulseWindow(phase,.055,.285);
      var dub=pulseWindow(phase,.325,.515)*.58;
      var beat=clamp(lub+dub,0,1);
      var heartLevel=.24+beat*.76;

      var w=canvas.width,h=canvas.height,r=Math.min(w,h)*.495;
      var cx=w/2,cy=h/2,hx=w*HEART_X,hy=h*HEART_Y;
      var idleBody=Math.sin(flowClock*.54)*.0065;
      var activeBody=Math.sin(flowClock*.72)*energy*.0045;
      core.style.setProperty('--orb-life',(idleBody+activeBody).toFixed(4));

      ctx.clearRect(0,0,w,h);
      ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();

      var hr=r*(.35+beat*.075);
      var hg=ctx.createRadialGradient(hx,hy,0,hx,hy,hr);
      hg.addColorStop(0,'rgba(255,241,232,'+(.24+heartLevel*.30)+')');
      hg.addColorStop(.14,'rgba('+HEART_R+','+HEART_G+','+HEART_B+','+(.22+heartLevel*.31)+')');
      hg.addColorStop(.42,'rgba('+HEART_R+','+HEART_G+','+HEART_B+','+(.085+heartLevel*.14)+')');
      hg.addColorStop(.72,'rgba('+HEART_R+','+HEART_G+','+HEART_B+','+(.025+heartLevel*.045)+')');
      hg.addColorStop(1,'rgba('+HEART_R+','+HEART_G+','+HEART_B+',0)');
      ctx.fillStyle=hg;ctx.fillRect(hx-hr,hy-hr,hr*2,hr*2);

      var amp=1.00+energy*1.02,s=r*2.49;
      var breathe1=.94+Math.sin(flowClock*.48)*(.046+energy*.018);
      var breathe2=.97+Math.sin(flowClock*.61+1.8)*(.041+energy*.020);

      drawLayer(back,cx+Math.sin(flowClock*.57)*r*.145*amp,cy+Math.cos(flowClock*.47)*r*.122*amp,
        s*1.08,Math.sin(flowClock*.31)*(.15+energy*.10),1.0,breathe1,1.04/breathe1);
      drawLayer(front,cx+Math.sin(flowClock*.84+2.1)*r*.185*amp,cy+Math.cos(flowClock*.68+1.2)*r*.158*amp,
        s*.99,-.10+Math.sin(flowClock*.42+1.2)*(.20+energy*.12),1.0,breathe2,1.035/breathe2);
      drawLayer(filaments,cx+Math.sin(flowClock*.73+3.7)*r*.148*amp,cy+Math.cos(flowClock*.88+2.5)*r*.140*amp,
        s*1.02,.13+Math.sin(flowClock*.53+3.1)*(.23+energy*.12),.82,1.02,.98);

      ctx.restore();
      ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.strokeStyle='rgba(35,96,158,.10)';ctx.lineWidth=Math.max(1,w*.0038);ctx.stroke();ctx.restore();
    }

    resize();requestAnimationFrame(frame);
  }

  function mount(){document.querySelectorAll('.core').forEach(mountCore)}
  mount();
  var root=document.getElementById('app')||document.body;
  new MutationObserver(mount).observe(root,{childList:true,subtree:true});
})();</scr`+`ipt>`;

function enhance(html){
  return html
    .replace('</head>','<style>'+ORB_V61_STYLE+'</style></head>')
    .replace('</body>',ORB_V61_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v61-more-idle-life-visible-heartbeat-6x-voice-motion');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
