import baseWorker from "./worker.js";

const ORB_V58_STYLE = String.raw`
/* TALERA ORB v58 — stronger blue contrast, living transparent tissue, fixed warm heart. */
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
    0 10px 32px rgba(24,67,105,.045),
    0 0 30px rgba(74,152,205,.15),
    0 0 74px rgba(74,152,205,.065)!important;
  filter:none!important;
  transform:scale(calc(.995 + var(--awake)*.075 + var(--orb-life)))!important;
  transition:transform .18s ease-out!important;
  animation:taleraOrb58Body 9s ease-in-out infinite!important;
}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v58-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v58";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}
@keyframes taleraOrb58Body{
  0%,100%{border-radius:50% 50% 49% 51% / 51% 49% 51% 49%}
  28%{border-radius:51.5% 48.5% 50.3% 49.7% / 49.3% 51.6% 48.4% 50.7%}
  57%{border-radius:48.9% 51.1% 51.3% 48.7% / 51.7% 48.3% 50.6% 49.4%}
  82%{border-radius:50.8% 49.2% 48.9% 51.1% / 49.2% 51.0% 49.0% 50.8%}
}
`;

const ORB_V58_SCRIPT = String.raw`<script>(function(){
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
    var x=(phase-start)/(end-start),s=Math.sin(Math.PI*x);
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
        var edge=Math.max(0,smoothstep(threshold-.086,threshold+.018,mass)-body*.46);

        var alphaBase=kind===0?.60:(kind===1?.70:.48);
        var alpha=(body*.67+soft*.24+filament*(kind===2?.32:.09))*alphaBase;
        alpha*=1-opening*.90;
        alpha*=.78+dense*.22;
        if(alpha<.020)alpha=0;

        /* Stronger tonal separation: ice blue -> saturated mid blue -> deep petrol blue. */
        var lowR=kind===0?28:(kind===1?43:48);
        var lowG=kind===0?76:(kind===1?104:106);
        var lowB=kind===0?128:(kind===1?162:176);
        var hiR=kind===0?188:(kind===1?215:225);
        var hiG=kind===0?224:(kind===1?239:245);
        var hiB=kind===0?243:(kind===1?249:252);

        var tone=smoothstep(.38,.70,macro*.62+mid*.38);
        tone=Math.pow(tone,.82);
        var R=mix(lowR,hiR,tone),G=mix(lowG,hiG,tone),B=mix(lowB,hiB,tone);

        /* Harder internal valleys make motion readable without turning into a flat blue ball. */
        var depth=fbm(wx*1.02+1.8,wy*.95-2.3,seed+107);
        var shadow=smoothstep(.46,.70,depth)*(body*.70+soft*.23);
        R=mix(R,20,shadow*.52);
        G=mix(G,55,shadow*.52);
        B=mix(B,98,shadow*.52);

        /* Local bright ridges only; no broad white wash. */
        var glint=smoothstep(.58,.79,macro)*(1-shadow)*(.12+edge*.18);
        R=mix(R,226,glint);
        G=mix(G,244,glint);
        B=mix(B,252,glint);

        var white=edge*.10+filament*(kind===2?.08:.025);
        R=mix(R,240,white);G=mix(G,249,white);B=mix(B,253,white);

        var i=(py*TEX+px)*4;
        d[i]=R;d[i+1]=G;d[i+2]=B;d[i+3]=Math.round(clamp(alpha,0,.84)*255);
      }
    }
    xctx.putImageData(img,0,0);
    return c;
  }

  function mountCore(core){
    if(core.getAttribute('data-orb-v58')==='1')return;
    core.setAttribute('data-orb-v58','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v58-canvas';
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

      var voiceTarget=clamp(voiceRaw*1.8,0,1);
      if(listening&&voiceTarget<.045)voiceTarget=.045;
      var response=voiceTarget>energy?8.5:1.45;
      energy+=(voiceTarget-energy)*Math.min(1,dt*response);

      var speed=.14+energy*1.02+(listening?.035:0);
      flowClock+=dt*speed;

      /* Heart stays independent and constant: lub-dub, then pause. */
      var HEART_PERIOD=1.64;
      var phase=((now/1000)%HEART_PERIOD)/HEART_PERIOD;
      var lub=pulseWindow(phase,.035,.235),dub=pulseWindow(phase,.275,.445)*.56;
      var beat=clamp(lub+dub,0,1),heartLevel=.25+beat*.75;

      var w=canvas.width,h=canvas.height,r=Math.min(w,h)*.495;
      var cx=w/2,cy=h/2,hx=w*HEART_X,hy=h*HEART_Y;
      core.style.setProperty('--orb-life',(Math.sin(flowClock*.43)*(.005+energy*.0035)).toFixed(4));

      ctx.clearRect(0,0,w,h);
      ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();

      var hr=r*(.245+beat*.010);
      var hg=ctx.createRadialGradient(hx,hy,0,hx,hy,hr);
      hg.addColorStop(0,'rgba(255,238,228,'+(.20+heartLevel*.18)+')');
      hg.addColorStop(.18,'rgba('+HEART_R+','+HEART_G+','+HEART_B+','+(.17+heartLevel*.18)+')');
      hg.addColorStop(.50,'rgba('+HEART_R+','+HEART_G+','+HEART_B+','+(.050+heartLevel*.070)+')');
      hg.addColorStop(1,'rgba('+HEART_R+','+HEART_G+','+HEART_B+',0)');
      ctx.fillStyle=hg;ctx.fillRect(hx-hr,hy-hr,hr*2,hr*2);

      var amp=.88+energy*1.08,s=r*2.49;
      var breathe1=.94+Math.sin(flowClock*.40)*(.036+energy*.018);
      var breathe2=.97+Math.sin(flowClock*.52+1.8)*(.033+energy*.020);

      drawLayer(back,cx+Math.sin(flowClock*.50)*r*.122*amp,cy+Math.cos(flowClock*.41)*r*.102*amp,
        s*1.08,Math.sin(flowClock*.26)*(.13+energy*.10),1.0,breathe1,1.035/breathe1);
      drawLayer(front,cx+Math.sin(flowClock*.75+2.1)*r*.158*amp,cy+Math.cos(flowClock*.60+1.2)*r*.138*amp,
        s*.99,-.10+Math.sin(flowClock*.36+1.2)*(.17+energy*.12),1.0,breathe2,1.03/breathe2);
      drawLayer(filaments,cx+Math.sin(flowClock*.65+3.7)*r*.128*amp,cy+Math.cos(flowClock*.79+2.5)*r*.120*amp,
        s*1.02,.13+Math.sin(flowClock*.46+3.1)*(.21+energy*.12),.84,1.02,.98);

      ctx.restore();
      ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.strokeStyle='rgba(50,118,170,.08)';ctx.lineWidth=Math.max(1,w*.0038);ctx.stroke();ctx.restore();
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
    .replace('</head>','<style>'+ORB_V58_STYLE+'</style></head>')
    .replace('</body>',ORB_V58_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v58-high-blue-contrast-voice-reactive-life');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
