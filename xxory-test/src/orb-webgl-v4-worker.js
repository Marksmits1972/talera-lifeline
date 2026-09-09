import previousWorker from "./orb-webgl-v3-worker.js";

const ORB_V4_HTML = String.raw`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F7F4EF">
<meta name="robots" content="noindex,nofollow">
<title>TALERA — ORB lab v4</title>
<style>
:root{color-scheme:light}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#F7F4EF;color:#0F2747}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
.lab{min-height:100dvh;display:grid;grid-template-rows:auto 1fr auto;padding:max(16px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 43%,#fff 0,#fcfbf8 45%,#F7F4EF 79%)}
.head{display:flex;justify-content:center;align-items:center;min-height:32px;font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:#5f7488;opacity:.48}
.stage{display:grid;place-items:center;min-height:0}
.frame{position:relative;width:min(92vw,470px);aspect-ratio:1;display:grid;place-items:center}
canvas{display:block;width:100%;height:100%;background:transparent}
.fallback{position:absolute;inset:0;display:none;place-items:center;text-align:center;padding:30px;color:#6a7784;font-size:14px;line-height:1.5}
.note{min-height:42px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;line-height:1.45;color:#6d7782;opacity:.62;padding:0 10px}
@media(min-width:700px){.frame{width:min(64vw,550px)}}
</style>
</head>
<body>
<div class="lab">
  <div class="head">ORB lab v4 — atmosphere & inner light</div>
  <div class="stage">
    <div class="frame" id="frame">
      <canvas id="orb" aria-label="Levende TALERA ORB"></canvas>
      <div id="fallback" class="fallback"></div>
    </div>
  </div>
  <div class="note">Rusttoestand: zachte blauwe rand, atmosfeer en bewegend innerlijk licht.</div>
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
  float a=0.53;
  mat2 m=mat2(1.62,1.18,-1.18,1.62);
  for(int i=0;i<5;i++){
    v+=a*noise2(p);
    p=m*p+0.19;
    a*=0.48;
  }
  return v;
}

vec2 rot(vec2 p,float a){
  float c=cos(a),s=sin(a);
  return mat2(c,-s,s,c)*p;
}

void main(){
  vec2 p=(v_uv-0.5)*2.0;
  p.x*=u_resolution.x/u_resolution.y;
  float t=u_time;
  float d=length(p);
  float ang=atan(p.y,p.x);

  /* Almost-round living silhouette: substantially calmer than v3. */
  float perimeter=noise2(vec2(ang*.66+4.0,t*.026));
  float edge=0.600
    +0.0075*sin(ang*3.0+t*.17)
    +0.0050*sin(ang*5.0-t*.13+1.1)
    +0.0032*sin(ang*7.0+t*.09+2.3)
    +(perimeter-.5)*.010;

  /* Soft body edge instead of a cut-out contour. */
  float bodyCore=smoothstep(edge+.018,edge-.030,d);
  float bodySoft=smoothstep(edge+.052,edge-.065,d);
  float edgeBand=clamp((bodySoft-bodyCore)*1.55,0.0,1.0);

  /* Pale blue atmosphere: close to the orb, then slowly fading to nothing. */
  float atmosphere=smoothstep(edge+.245,edge+.018,d)-smoothstep(edge+.070,edge-.012,d);
  atmosphere=max(atmosphere,0.0);
  float atmosphere2=smoothstep(edge+.130,edge+.012,d)-smoothstep(edge+.034,edge-.012,d);
  atmosphere2=max(atmosphere2,0.0);
  float breathe=.94+.06*sin(t*.43)+.025*sin(t*.19+1.7);
  atmosphere*=breathe;

  vec2 q=p/max(edge,0.001);
  q=rot(q,.022*sin(t*.11));

  /* Two independent slow velocity fields form one continuous material. */
  vec2 w1=vec2(
    fbm(q*1.50+vec2(t*.048,-t*.029)+vec2(2.3,5.1)),
    fbm(q*1.50+vec2(-t*.033,t*.044)+vec2(7.8,1.6))
  )-.5;
  vec2 w2=vec2(
    fbm(rot(q,.72)*2.05+vec2(-t*.031,t*.026)+9.2),
    fbm(rot(q,-.51)*2.05+vec2(t*.027,t*.036)+13.7)
  )-.5;

  vec2 flow=q+w1*.72+w2*.24;
  flow.x+=.10*sin(flow.y*3.0+t*.16);
  flow.y+=.085*cos(flow.x*2.6-t*.14);

  float n1=fbm(flow*2.15+vec2(t*.035,-t*.045));
  float n2=fbm(rot(flow,.62)*3.15+vec2(-t*.040,t*.024)+4.4);
  float n3=fbm(rot(flow,-.44)*4.65+vec2(t*.024,t*.031)+8.7);

  float cloud=smoothstep(.39,.79,n1*.64+n2*.28+n3*.13);
  float milk=smoothstep(.46,.73,n1+.11*sin((flow.x+flow.y)*4.6+t*.20));
  float veins=smoothstep(.42,.78,abs(n2-n1)*1.82);
  float shadow=fbm(q*1.32+w1*.34+vec2(-t*.024,t*.017)+17.0);
  float depth=smoothstep(.28,.83,shadow);

  /* Moving inner light = the calm beating heart, not a fixed spotlight. */
  vec2 heartPos=vec2(
    -.19+.24*sin(t*.15)+.08*sin(t*.061+1.4),
    -.18+.23*cos(t*.12)-.08*sin(t*.082)
  );
  float heartDistance=dot(q-heartPos,q-heartPos);
  float heartShape=exp(-2.45*heartDistance);
  float heartTexture=.58+.42*fbm(flow*1.55+vec2(t*.024,-t*.020)+21.0);
  float heartbeat=.88+.12*sin(t*.92)+.035*sin(t*.37+2.1);
  float heart=heartShape*heartTexture*heartbeat;

  vec2 glow2Pos=vec2(.18+.13*cos(t*.10),.19+.15*sin(t*.13));
  float glow2=exp(-3.6*dot(q-glow2Pos,q-glow2Pos))*(.65+.35*n1);

  vec3 deep=vec3(.31,.59,.76);
  vec3 blue=vec3(.48,.72,.86);
  vec3 pale=vec3(.74,.88,.96);
  vec3 milkCol=vec3(.89,.96,.995);
  vec3 white=vec3(.985,.998,1.0);

  vec3 col=mix(blue,deep,depth*.43);
  col=mix(col,pale,cloud*.70);
  col=mix(col,milkCol,milk*.48);
  col=mix(col,vec3(.68,.84,.93),veins*.18);
  col=mix(col,white,heart*.62);
  col=mix(col,milkCol,glow2*.22);

  float radial=clamp(d/max(edge,0.001),0.0,1.0);
  /* Keep the perimeter blue instead of white and reduce the hard object feel. */
  col=mix(col,vec3(.52,.75,.88),smoothstep(.72,1.04,radial)*.26);
  col*=1.0-.055*smoothstep(.72,1.0,radial);

  float grain=(hash21(gl_FragCoord.xy+floor(t*5.0))-.5)*.010;
  col+=grain*bodySoft;

  vec3 atmosphereColor=vec3(.60,.80,.92);
  vec3 atmosphereNear=vec3(.52,.75,.89);
  vec3 outside=atmosphereColor*atmosphere*.44 + atmosphereNear*atmosphere2*.22;

  /* Slightly translucent outer body lets the light breathe into the edge. */
  float alphaBody=bodyCore*.96 + edgeBand*.42;
  alphaBody=clamp(alphaBody,0.0,1.0);
  vec3 outCol=col*alphaBody + outside;
  float alpha=max(alphaBody,atmosphere*.30+atmosphere2*.16);

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
    fallback.textContent='WebGL wordt op dit toestel niet beschikbaar gesteld. De gewone vertelpagina blijft intact.';
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

    function resize(){
      var rect=frame.getBoundingClientRect();
      var w=Math.max(280,Math.round(rect.width||430));
      var dpr=Math.min(1.75,window.devicePixelRatio||1);
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
    fallback.textContent='ORB v4 kon niet starten: '+String(error&&error.message?error.message:error);
  }
})();
</script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if ((request.method === "GET" || request.method === "HEAD") && url.searchParams.get("orbLab") === "4") {
      const headers = new Headers({
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "no-referrer",
        "x-talera-orb-lab": "webgl-v4"
      });
      return new Response(request.method === "HEAD" ? null : ORB_V4_HTML,{status:200,headers});
    }
    return previousWorker.fetch(request, env, ctx);
  },
};
