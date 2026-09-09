import previousWorker from "./orb-preview-worker.js";

const ORB_V3_HTML = String.raw`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F7F4EF">
<meta name="robots" content="noindex,nofollow">
<title>TALERA — ORB lab v3</title>
<style>
:root{color-scheme:light}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#F7F4EF;color:#0F2747}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
.lab{min-height:100dvh;display:grid;grid-template-rows:auto 1fr auto;padding:max(16px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 42%,#fff 0,#fbfaf7 44%,#F7F4EF 78%)}
.head{display:flex;justify-content:center;align-items:center;min-height:32px;font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:#5f7488;opacity:.52}
.stage{display:grid;place-items:center;min-height:0}
.frame{position:relative;width:min(90vw,460px);aspect-ratio:1;display:grid;place-items:center}
canvas{display:block;width:100%;height:100%;background:transparent}
.fallback{position:absolute;inset:0;display:none;place-items:center;text-align:center;padding:30px;color:#6a7784;font-size:14px;line-height:1.5}
.note{min-height:42px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;line-height:1.45;color:#6d7782;opacity:.68;padding:0 10px}
@media(min-width:700px){.frame{width:min(64vw,540px)}}
</style>
</head>
<body>
<div class="lab">
  <div class="head">ORB lab v3 — flowing shader</div>
  <div class="stage">
    <div class="frame" id="frame">
      <canvas id="orb" aria-label="Levende TALERA ORB"></canvas>
      <div id="fallback" class="fallback"></div>
    </div>
  </div>
  <div class="note">Alleen rusttoestand: eerst materie, stroming, licht en atmosfeer beoordelen.</div>
</div>

<script id="vs" type="x-shader/x-vertex">
attribute vec2 a_position;
varying vec2 v_uv;
void main(){
  v_uv=a_position*0.5+0.5;
  gl_Position=vec4(a_position,0.0,1.0);
}
</script>

<script id="fs" type="x-shader/x-fragment">
precision highp float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;

float hash21(vec2 p){
  p=fract(p*vec2(123.34,456.21));
  p+=dot(p,p+45.32);
  return fract(p.x*p.y);
}

float noise2(vec2 p){
  vec2 i=floor(p);
  vec2 f=fract(p);
  f=f*f*(3.0-2.0*f);
  float a=hash21(i);
  float b=hash21(i+vec2(1.0,0.0));
  float c=hash21(i+vec2(0.0,1.0));
  float d=hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}

float fbm(vec2 p){
  float v=0.0;
  float a=0.52;
  mat2 m=mat2(1.64,1.16,-1.16,1.64);
  for(int i=0;i<4;i++){
    v+=a*noise2(p);
    p=m*p+0.17;
    a*=0.49;
  }
  return v;
}

vec2 rot(vec2 p,float a){
  float c=cos(a),s=sin(a);
  return mat2(c,-s,s,c)*p;
}

void main(){
  vec2 uv=v_uv;
  vec2 p=(uv-0.5)*2.0;
  p.x*=u_resolution.x/u_resolution.y;

  float t=u_time;
  float d=length(p);
  float a=atan(p.y,p.x);

  float slowNoise=noise2(vec2(a*0.72+2.0,t*0.035));
  float edge=0.585
    +0.014*sin(a*3.0+t*0.23)
    +0.010*sin(a*5.0-t*0.17+1.2)
    +0.006*sin(a*7.0+t*0.11+2.4)
    +(slowNoise-0.5)*0.018;

  float body=smoothstep(edge+0.008,edge-0.012,d);

  float haloOuter=smoothstep(edge+0.23,edge+0.015,d);
  float haloInner=smoothstep(edge+0.05,edge-0.005,d);
  float halo=max(0.0,haloOuter-haloInner);
  halo*=0.34+0.08*sin(t*0.42);

  vec2 q=p/max(edge,0.001);
  q=rot(q,0.035*sin(t*0.16));

  vec2 drift1=vec2(t*0.055,-t*0.031);
  vec2 drift2=vec2(-t*0.041,t*0.047);
  vec2 warp=vec2(
    fbm(q*1.75+drift1+vec2(1.7,4.1)),
    fbm(q*1.75+drift2+vec2(7.3,2.4))
  );
  warp=(warp-0.5)*1.25;

  vec2 flow=q+warp*0.58;
  flow.x+=0.14*sin(flow.y*3.1+t*0.18);
  flow.y+=0.11*cos(flow.x*2.8-t*0.15);

  float n1=fbm(flow*2.35+vec2(t*0.030,-t*0.046));
  float n2=fbm(rot(flow,0.72)*3.35+vec2(-t*0.041,t*0.025)+4.6);
  float n3=fbm(rot(flow,-0.48)*5.1+vec2(t*0.022,t*0.036)+9.2);

  float cloud=smoothstep(0.37,0.78,n1*0.62+n2*0.31+n3*0.15);
  float vein=smoothstep(0.50,0.76,abs(n2-n1)*1.65);
  float milk=smoothstep(0.48,0.73,n1+0.14*sin((flow.x+flow.y)*5.0+t*0.22));

  float movingShade=fbm(q*1.42+warp*0.32+vec2(-t*0.026,t*0.018)+13.0);
  float depth=smoothstep(0.30,0.84,movingShade);

  vec2 lightPos=vec2(
    -0.30+0.30*sin(t*0.17)+0.10*sin(t*0.071),
    -0.34+0.25*cos(t*0.14)-0.06*sin(t*0.09)
  );
  float light=exp(-3.0*dot(q-lightPos,q-lightPos));

  vec3 deep=vec3(0.28,0.58,0.77);
  vec3 mid=vec3(0.49,0.72,0.86);
  vec3 pale=vec3(0.77,0.89,0.96);
  vec3 white=vec3(0.965,0.992,1.0);

  vec3 col=mix(mid,deep,depth*0.46);
  col=mix(col,pale,cloud*0.68);
  col=mix(col,white,milk*0.42);
  col=mix(col,white,light*0.56);
  col=mix(col,vec3(0.67,0.83,0.92),vein*0.17);

  float radial=clamp(d/max(edge,0.001),0.0,1.0);
  col*=1.0-0.13*smoothstep(0.58,1.0,radial);
  col+=vec3(0.08,0.13,0.16)*(1.0-radial)*0.08;

  float rim=smoothstep(0.72,1.0,radial)*body;
  col=mix(col,vec3(0.73,0.88,0.96),rim*0.12);

  float grain=(hash21(gl_FragCoord.xy+floor(t*8.0))-0.5)*0.018;
  col+=grain*body;

  vec3 haloColor=vec3(0.58,0.79,0.91);
  vec3 outCol=col*body+haloColor*halo;
  float alpha=max(body,halo*0.68);

  gl_FragColor=vec4(outCol,alpha);
}
</script>

<script>
(function(){
  var canvas=document.getElementById('orb');
  var frame=document.getElementById('frame');
  var fallback=document.getElementById('fallback');
  var gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:false});
  if(!gl){
    fallback.style.display='grid';
    fallback.textContent='WebGL wordt op dit toestel niet beschikbaar gesteld. We houden de gewone vertelpagina intact.';
    return;
  }

  function shader(type,source){
    var s=gl.createShader(type);
    gl.shaderSource(s,source);
    gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
      var msg=gl.getShaderInfoLog(s)||'Shader compile error';
      gl.deleteShader(s);
      throw new Error(msg);
    }
    return s;
  }

  try{
    var vs=shader(gl.VERTEX_SHADER,document.getElementById('vs').textContent);
    var fs=shader(gl.FRAGMENT_SHADER,document.getElementById('fs').textContent);
    var program=gl.createProgram();
    gl.attachShader(program,vs);
    gl.attachShader(program,fs);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Program link error');
    gl.useProgram(program);

    var buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    var loc=gl.getAttribLocation(program,'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);

    var resLoc=gl.getUniformLocation(program,'u_resolution');
    var timeLoc=gl.getUniformLocation(program,'u_time');
    var start=performance.now();
    var dpr=1.5;

    function resize(){
      var rect=frame.getBoundingClientRect();
      var w=Math.max(280,Math.round(rect.width||420));
      dpr=Math.min(1.75,window.devicePixelRatio||1);
      canvas.width=Math.round(w*dpr);
      canvas.height=Math.round(w*dpr);
      gl.viewport(0,0,canvas.width,canvas.height);
    }
    resize();
    window.addEventListener('resize',resize,{passive:true});

    function render(now){
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(resLoc,canvas.width,canvas.height);
      gl.uniform1f(timeLoc,(now-start)/1000);
      gl.drawArrays(gl.TRIANGLES,0,6);
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  }catch(error){
    fallback.style.display='grid';
    fallback.textContent='ORB v3 kon niet starten: '+String(error&&error.message?error.message:error);
  }
})();
</script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if ((request.method === "GET" || request.method === "HEAD") && url.searchParams.get("orbLab") === "3") {
      const headers = new Headers({
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "no-referrer",
        "x-talera-orb-lab": "webgl-v3"
      });
      return new Response(request.method === "HEAD" ? null : ORB_V3_HTML, { status: 200, headers });
    }
    return previousWorker.fetch(request, env, ctx);
  },
};
