import baseWorker from "./worker.js";

const ORB_V57_STYLE = String.raw`
/* TALERA ORB v57 — visible living tissue, true openings, voice-reactive energy. */
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
    0 10px 32px rgba(37,83,113,.035),
    0 0 30px rgba(84,165,207,.12),
    0 0 72px rgba(84,165,207,.055)!important;
  filter:none!important;
  transform:scale(calc(.995 + var(--awake)*.075 + var(--orb-life)))!important;
  transition:transform .18s ease-out!important;
  animation:taleraOrb57Body 9.2s ease-in-out infinite!important;
}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v57-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v57";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}
@keyframes taleraOrb57Body{
  0%,100%{border-radius:50% 50% 49% 51% / 51% 49% 51% 49%}
  28%{border-radius:51.4% 48.6% 50.3% 49.7% / 49.4% 51.5% 48.5% 50.6%}
  57%{border-radius:49.0% 51.0% 51.2% 48.8% / 51.6% 48.4% 50.5% 49.5%}
  82%{border-radius:50.7% 49.3% 49.0% 51.0% / 49.3% 50.9% 49.1% 50.7%}
}
`;

const ORB_V57_SCRIPT = String.raw`<script>(function(){
  var TEX=224;
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
        var x=(nx-.5)*2.72;
        var y=(ny-.5)*2.72;

        var qx=fbm(x*.62+1.7,y*.58-2.2,seed+3)-.5;
        var qy=fbm(x*.58-2.4,y*.66+1.4,seed+7)-.5;
        var wx=x+qx*.64+qy*.22;
        var wy=y+qy*.60-qx*.20;

        var macro=fbm(wx*.70,wy*.66,seed+11);
        var mid=fbm(wx*1.42+2.2,wy*1.30-1.6,seed+31);
        var fine=fbm(wx*2.55-1.9,wy*2.28+2.1,seed+53);
        var mass=macro*.61+mid*.29+fine*.10;

        var hole=fbm(wx*.76+3.1,wy*.71-2.8,seed+71);
        var opening=smoothstep(.555,.725,hole);

        var ridgeN=fbm(wx*2.28-2.0,wy*2.06+1.7,seed+89);
        var ridge=1-Math.abs(ridgeN*2-1);
        var filament=smoothstep(.775,.945,ridge);

        var threshold=kind===0?.490:(kind===1?.510:.535);
        var body=smoothstep(threshold-.050,threshold+.120,mass);
        var soft=smoothstep(threshold-.115,threshold+.012,mass)*(1-body*.50);
        var dense=smoothstep(threshold+.028,threshold+.160,mass);
        var edge=Math.max(0,smoothstep(threshold-.090,threshold+.022,mass)-body*.46);

        var alphaBase=kind===0?.58:(kind===1?.67:.46);
        var alpha=(body*.67+soft*.25+filament*(kind===2?.30:.09))*alphaBase;
        alpha*=1-opening*.88;
        alpha*=.78+dense*.22;
        if(alpha<.020)alpha=0;

        var lowR=kind===0?49:(kind===1?77:72);
        var lowG=kind===0?104:(kind===1?136:132);
        var lowB=kind===0?150:(kind===1?176:181);
        var hiR=kind===0?183:(kind===1?211:220);
        var hiG=kind===0?217:(kind===1?232:238);
        var hiB=kind===0?236:(kind===1?243:247);

        var bright=clamp(body*.63+soft*.20+dense*.17,0,1);
        var R=mix(lowR,hiR,bright);
        var G=mix(lowG,hiG,bright);
        var B=mix(lowB,hiB,bright);

        var depth=fbm(wx*1.02+1.8,wy*.95-2.3,seed+107);
        var shadow=smoothstep(.48,.73,depth)*(body*.68+soft*.22);
        R=mix(R,34,shadow*.44);
        G=mix(G,72,shadow*.44);
        B=mix(B,110,shadow*.44);

        var white=edge*.20+filament*(kind===2?.13:.045);
        R=mix(R,242,white);
        G=mix(G,249,white);
        B=mix(B,253,white);

        var i=(py*TEX+px)*4;
        d[i]=R;d[i+1]=G;d[i+2]=B;d[i+3]=Math.round(clamp(alpha,0,.82)*255);
      }
    }
    xctx.putImageData(img,0,0);
    return c;
  }

  function mountCore(core){
    if(core.getAttribute('data-orb-v57')==='1')return;
    core.setAttribute('data-orb-v57','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v57-canvas';
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

      var voiceTarget=clamp(voiceRaw*1.75,0,1);
      if(listening&&voiceTarget<.045)voiceTarget=.045;
      var response=voiceTarget>energy ? 8.5 : 1.45;
      energy+=(voiceTarget-energy)*Math.min(1,dt*response);

      var idleSpeed=.135;
      var speed=idleSpeed + energy*.98 + (listening?.035:0);
      flowClock+=dt*speed;

      var HEART_PERIOD=1.64;
      var phase=((now/1000)%HEART_PERIOD)/HEART_PERIOD;
      var lub=pulseWindow(phase,.035,.235);
      var dub=pulseWindow(phase,.275,.445)*.56;
      var beat=clamp(lub+dub,0,1);
      var heartLevel=.26+beat*.74;

      var w=canvas.width,h=canvas.height;
      var r=Math.min(w,h)*.495;
      var cx=w/2,cy=h/2;
      var hx=w*HEART_X,hy=h*HEART_Y;

      var slowLife=Math.sin(flowClock*.42)*(.0045+energy*.0035);
      core.style.setProperty('--orb-life',slowLife.toFixed(4));

      ctx.clearRect(0,0,w,h);
      ctx.save();
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();

      var hr=r*(.25+beat*.012);
      var hg=ctx.createRadialGradient(hx,hy,0,hx,hy,hr);
      hg.addColorStop(0,'rgba(255,238,228,'+(.22+heartLevel*.20)+')');
      hg.addColorStop(.18,'rgba('+HEART_R+','+HEART_G+','+HEART_B+','+(.18+heartLevel*.19)+')');
      hg.addColorStop(.50,'rgba('+HEART_R+','+HEART_G+','+HEART_B+','+(.055+heartLevel*.075)+')');
      hg.addColorStop(1,'rgba('+HEART_R+','+HEART_G+','+HEART_B+',0)');
      ctx.fillStyle=hg;
      ctx.fillRect(hx-hr,hy-hr,hr*2,hr*2);

      var amp=.86+energy*1.05;
      var s=r*2.50;
      var breathe1=.94+Math.sin(flowClock*.40)*(.034+energy*.018);
      var breathe2=.97+Math.sin(flowClock*.51+1.8)*(.031+energy*.020);

      drawLayer(back,
        cx+Math.sin(flowClock*.50)*r*.120*amp,
        cy+Math.cos(flowClock*.41)*r*.100*amp,
        s*1.08,
        Math.sin(flowClock*.26)*(.12+energy*.10),
        .98,breathe1,1.035/breathe1);

      drawLayer(front,
        cx+Math.sin(flowClock*.74+2.1)*r*.155*amp,
        cy+Math.cos(flowClock*.59+1.2)*r*.135*amp,
        s*.99,
        -.10+Math.sin(flowClock*.36+1.2)*(.16+energy*.12),
        1.0,breathe2,1.03/breathe2);

      drawLayer(filaments,
        cx+Math.sin(flowClock*.64+3.7)*r*.125*amp,
        cy+Math.cos(flowClock*.78+2.5)*r*.118*amp,
        s*1.02,
        .13+Math.sin(flowClock*.46+3.1)*(.20+energy*.12),
        .82,1.02,.98);

      var wg=ctx.createRadialGradient(hx,hy,0,hx,hy,r*.34);
      wg.addColorStop(0,'rgba(255,255,255,'+(.014+beat*.014)+')');
      wg.addColorStop(.44,'rgba(250,253,255,.008)');
      wg.addColorStop(1,'rgba(250,253,255,0)');
      ctx.fillStyle=wg;
      ctx.fillRect(cx-r,cy-r,r*2,r*2);

      ctx.restore();

      ctx.save();
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.strokeStyle='rgba(67,137,181,.065)';
      ctx.lineWidth=Math.max(1,w*.0038);
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
    .replace('</head>','<style>'+ORB_V57_STYLE+'</style></head>')
    .replace('</body>',ORB_V57_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v57-visible-transparent-voice-reactive-life');

    return new Response(enhance(html),{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }
};
