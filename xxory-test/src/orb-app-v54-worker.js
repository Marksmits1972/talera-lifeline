import baseWorker from "./worker.js";

const ORB_V54_STYLE = String.raw`
/* TALERA ORB v54 — clean reset: living organism, transparent tissue, fixed warm heart. */
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
    0 10px 34px rgba(37,83,113,.035),
    0 0 28px rgba(84,165,207,.105),
    0 0 74px rgba(84,165,207,.055)!important;
  filter:none!important;
  transform:scale(calc(.992 + var(--awake)*.105 + var(--voice)*.030 + var(--orb-beat)))!important;
  transition:transform .08s linear!important;
  animation:taleraOrb54Body 9.4s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:6.4s!important}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v54-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v54";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}
@keyframes taleraOrb54Body{
  0%,100%{border-radius:50% 50% 49% 51% / 51% 49% 51% 49%}
  27%{border-radius:51.2% 48.8% 50.4% 49.6% / 49.5% 51.4% 48.6% 50.5%}
  55%{border-radius:49.1% 50.9% 51.1% 48.9% / 51.5% 48.5% 50.4% 49.6%}
  81%{border-radius:50.6% 49.4% 49% 51% / 49.4% 50.8% 49.2% 50.6%}
}
`;

const ORB_V54_SCRIPT = String.raw`<script>(function(){
  var HEART_R=231, HEART_G=169, HEART_B=139; // TALERA #E7A98B

  function clamp(v,a,b){return v<a?a:(v>b?b:v)}
  function beatBell(phase,center,width){
    var d=Math.abs(phase-center);
    d=Math.min(d,1-d);
    return Math.exp(-(d*d)/(2*width*width));
  }

  function mountCore(core){
    if(core.getAttribute('data-orb-v54')==='1')return;
    core.setAttribute('data-orb-v54','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v54-canvas';
    canvas.setAttribute('aria-hidden','true');
    core.appendChild(canvas);

    var gl=canvas.getContext('webgl',{
      alpha:true,
      antialias:false,
      premultipliedAlpha:false,
      preserveDrawingBuffer:false,
      powerPreference:'low-power'
    }) || canvas.getContext('experimental-webgl',{
      alpha:true,
      antialias:false,
      premultipliedAlpha:false,
      preserveDrawingBuffer:false
    });

    if(!gl){
      core.style.background='radial-gradient(circle at 58% 47%,rgba(231,169,139,.20),rgba(231,169,139,0) 24%),radial-gradient(circle at 42% 38%,rgba(220,239,248,.26),rgba(220,239,248,0) 32%)';
      return;
    }

    var VERT='attribute vec2 aPos; varying vec2 vUv; void main(){ vUv=aPos*.5+.5; gl_Position=vec4(aPos,0.0,1.0); }';
    var FRAG='precision highp float;\n'+
      'varying vec2 vUv;\n'+
      'uniform float uCloudTime;\n'+
      'uniform float uBeat;\n'+
      'uniform float uActive;\n'+
      'uniform float uVoice;\n'+
      'float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }\n'+
      'float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f); float a=hash(i); float b=hash(i+vec2(1.0,0.0)); float c=hash(i+vec2(0.0,1.0)); float d=hash(i+vec2(1.0,1.0)); return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }\n'+
      'float fbm(vec2 p){ float v=0.0; float a=.52; mat2 m=mat2(1.62,1.16,-1.16,1.62); for(int i=0;i<5;i++){ v+=noise(p)*a; p=m*p+vec2(1.7,-2.1); a*=.48; } return v; }\n'+
      'float sat(float x){ return clamp(x,0.0,1.0); }\n'+
      'void main(){\n'+
      '  vec2 p=(vUv-.5)*2.0;\n'+
      '  float t=uCloudTime;\n'+
      '  float r=length(p);\n'+
      '  float edgeN=fbm(p*1.25+vec2(t*.035,-t*.028));\n'+
      '  float boundary=.975+(edgeN-.5)*.045;\n'+
      '  float shell=1.0-smoothstep(boundary-.085,boundary+.010,r);\n'+
      '  if(shell<=.001){ gl_FragColor=vec4(0.0); return; }\n'+
      '  vec2 q=vec2(fbm(p*.78+vec2(t*.050,-t*.036)),fbm(p*.82+vec2(-t*.039,t*.047)));\n'+
      '  vec2 w=p+(q-.5)*.50;\n'+
      '  float stream=sin((w.x+w.y)*2.7+t*.20)*.035+sin(w.y*3.2-t*.16)*.025;\n'+
      '  w+=vec2(stream,-stream*.72);\n'+
      '  float macro=fbm(w*1.18+vec2(t*.060,-t*.041));\n'+
      '  float mid=fbm(w*2.15+vec2(-t*.074,t*.052));\n'+
      '  float fine=fbm(w*3.65+vec2(t*.052,t*.067));\n'+
      '  float mass=macro*.57+mid*.30+fine*.13;\n'+
      '  float body=smoothstep(.50,.70,mass);\n'+
      '  float mist=smoothstep(.455,.605,mass)*(1.0-body*.42);\n'+
      '  float ridge=1.0-abs(fbm(w*2.65+vec2(-t*.043,t*.058))*2.0-1.0);\n'+
      '  float filament=smoothstep(.78,.94,ridge)*(0.45+0.55*smoothstep(.43,.67,macro));\n'+
      '  float cavityField=fbm(w*1.05+vec2(t*.031,t*.022));\n'+
      '  float cavity=smoothstep(.59,.76,cavityField);\n'+
      '  float tissue=sat(body*.46+mist*.22+filament*.24);\n'+
      '  tissue*=1.0-cavity*.62;\n'+
      '  tissue*=.91+uActive*.10;\n'+
      '  float alpha=sat(tissue)*shell;\n'+
      '  alpha*=.82;\n'+
      '  float depth=fbm(w*1.42+vec2(-t*.029,t*.024));\n'+
      '  float deep=smoothstep(.50,.73,depth);\n'+
      '  vec3 tissueCol=mix(vec3(.80,.91,.96),vec3(.29,.52,.68),deep*.58);\n'+
      '  tissueCol=mix(tissueCol,vec3(.94,.98,1.0),sat(filament*.50+mist*.22));\n'+
      '  vec2 hp=p-vec2(.16,-.06);\n'+
      '  float heartWarp=(fbm(hp*3.4+vec2(t*.018,-t*.014))-.5)*.13;\n'+
      '  float hd=length(hp*vec2(1.0,1.10))*(1.0+heartWarp);\n'+
      '  float glow=exp(-hd*hd*8.0);\n'+
      '  float core=exp(-hd*hd*31.0);\n'+
      '  float heartA=sat(glow*(.11+.24*uBeat)+core*(.10+.34*uBeat))*shell;\n'+
      '  vec3 warm=vec3('+String(HEART_R/255)+','+String(HEART_G/255)+','+String(HEART_B/255)+');\n'+
      '  vec3 heartCol=mix(warm,vec3(1.0,.91,.84),core*.78);\n'+
      '  float warmRim=glow*alpha*(1.0-body)*(.07+.08*uBeat);\n'+
      '  tissueCol=mix(tissueCol,vec3(1.0,.83,.73),warmRim);\n'+
      '  vec3 premul=tissueCol*alpha + heartCol*heartA*(1.0-alpha);\n'+
      '  float outA=alpha+heartA*(1.0-alpha);\n'+
      '  vec3 outCol=premul/max(outA,.001);\n'+
      '  gl_FragColor=vec4(outCol,outA);\n'+
      '}';

    function compile(type,src){
      var sh=gl.createShader(type);
      gl.shaderSource(sh,src);
      gl.compileShader(sh);
      if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){
        console.warn('TALERA v54 shader compile',gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    }

    var vs=compile(gl.VERTEX_SHADER,VERT);
    var fs=compile(gl.FRAGMENT_SHADER,FRAG);
    if(!vs||!fs)return;

    var program=gl.createProgram();
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
      console.warn('TALERA v54 shader link',gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    var buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    var aPos=gl.getAttribLocation(program,'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);

    var uCloudTime=gl.getUniformLocation(program,'uCloudTime');
    var uBeat=gl.getUniformLocation(program,'uBeat');
    var uActive=gl.getUniformLocation(program,'uActive');
    var uVoice=gl.getUniformLocation(program,'uVoice');

    var last=performance.now();
    var cloudClock=0;
    var speedCurrent=.11;

    function resize(){
      var rect=core.getBoundingClientRect();
      var dpr=Math.min(window.devicePixelRatio||1,2);
      var w=Math.max(1,Math.round(rect.width*dpr));
      var h=Math.max(1,Math.round(rect.height*dpr));
      if(canvas.width!==w||canvas.height!==h){
        canvas.width=w;canvas.height=h;
        gl.viewport(0,0,w,h);
      }
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

      var targetSpeed=active ? (.46+voice*.15) : .105;
      speedCurrent+=(targetSpeed-speedCurrent)*Math.min(1,dt*2.4);
      cloudClock+=dt*speedCurrent;

      /* Calm fixed heart: lub-dub, then a real pause. */
      var HEART_PERIOD=1.28;
      var phase=((now/1000)%HEART_PERIOD)/HEART_PERIOD;
      var lub=beatBell(phase,.105,.042);
      var dub=beatBell(phase,.225,.035)*.60;
      var beat=clamp(lub+dub,0,1);
      core.style.setProperty('--orb-beat',(beat*.010).toFixed(4));

      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform1f(uCloudTime,cloudClock);
      gl.uniform1f(uBeat,beat);
      gl.uniform1f(uActive,active?1:0);
      gl.uniform1f(uVoice,voice);
      gl.drawArrays(gl.TRIANGLES,0,6);
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
    .replace('</head>','<style>'+ORB_V54_STYLE+'</style></head>')
    .replace('</body>',ORB_V54_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v54-clean-webgl-living-organism');

    return new Response(enhance(html),{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }
};
