import previousWorker from "./orb-webgl-v4-worker.js";

const ORB_V5_HTML = String.raw`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F7F4EF">
<meta name="robots" content="noindex,nofollow">
<title>TALERA — ORB lab v5</title>
<style>
:root{color-scheme:light}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#F7F4EF;color:#0F2747}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
.lab{min-height:100dvh;display:grid;grid-template-rows:auto 1fr auto;padding:max(16px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 43%,#fff 0,#fcfbf8 45%,#F7F4EF 79%)}
.head{display:flex;justify-content:center;align-items:center;min-height:32px;font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:#5f7488;opacity:.46}
.stage{display:grid;place-items:center;min-height:0}
.frame{position:relative;width:min(92vw,470px);aspect-ratio:1;display:grid;place-items:center}
canvas{display:block;width:100%;height:100%;background:transparent}
.fallback{position:absolute;inset:0;display:none;place-items:center;text-align:center;padding:30px;color:#6a7784;font-size:14px;line-height:1.5}
.note{min-height:42px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;line-height:1.45;color:#6d7782;opacity:.60;padding:0 10px}
@media(min-width:700px){.frame{width:min(64vw,550px)}}
</style>
</head>
<body>
<div class="lab">
  <div class="head">ORB lab v5 — inner light</div>
  <div class="stage">
    <div class="frame" id="frame">
      <canvas id="orb" aria-label="Levende TALERA ORB"></canvas>
      <div id="fallback" class="fallback"></div>
    </div>
  </div>
  <div class="note">Rusttoestand: blauwe atmosfeer direct aan de ORB en meer leven in het innerlijke licht.</div>
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

  /* Keep the silhouette softly organic, but visually round. */
  float perimeter=noise2(vec2(ang*.66+4.0,t*.026));
  float edge=0.600
    +0.0060*sin(ang*3.0+t*.16)
    +0.0042*sin(ang*5.0-t*.12+1.1)
    +0.0025*sin(ang*7.0+t*.085+2.3)
    +(perimeter-.5)*.008;

  /* Wider, gentler body transition: no white rim, no cut-out edge. */
  float body=smoothstep(edge+.034,edge-.050,d);
  float bodyInner=smoothstep(edge+.004,edge-.030,d);
  float softShell=clamp(body-bodyInner,0.0,1.0);

  /* Atmosphere begins immediately at the ORB and fades blue -> transparent. */
  float auraNear=smoothstep(edge+.080,edge-.005,d)-smoothstep(edge+.020,edge-.018,d);
  auraNear=max(auraNear,0.0);
  float auraFar=smoothstep(edge+.210,edge+.030,d)-smoothstep(edge+.090,edge-.004,d);
  auraFar=max(auraFar,0.0);
  float auraBreath=.95+.05*sin(t*.40)+.018*sin(t*.17+1.3);
  auraNear*=auraBreath;
  auraFar*=auraBreath;

  vec2 q=p/max(edge,0.001);
  q=rot(q,.020*sin(t*.11));

  /* Continuous flowing material. */
  vec2 w1=vec2(
    fbm(q*1.48+vec2(t*.052,-t*.031)+vec2(2.3,5.1)),
    fbm(q*1.48+vec2(-t*.036,t*.046)+vec2(7.8,1.6))
  )-.5;
  vec2 w2=vec2(
    fbm(rot(q,.72)*2.0+vec2(-t*.034,t*.028)+9.2),
    fbm(rot(q,-.51)*2.0+vec2(t*.030,t*.038)+13.7)
  )-.5;

  vec2 flow=q+w1*.76+w2*.26;
  flow.x+=.11*sin(flow.y*3.0+t*.17);
  flow.y+=.095*cos(flow.x*2.6-t*.15);

  float n1=fbm(flow*2.05+vec2(t*.038,-t*.048));
  float n2=fbm(rot(flow,.62)*3.05+vec2(-t*.043,t*.026)+4.4);
  float n3=fbm(rot(flow,-.44)*4.45+vec2(t*.026,t*.034)+8.7);

  /* Stronger distinction between milk, mist and blue depth. */
  float cloud=smoothstep(.36,.76,n1*.62+n2*.30+n3*.14);
  float milk=smoothstep(.41,.70,n1+.13*sin((flow.x+flow.y)*4.7+t*.22));
  float wisps=smoothstep(.46,.76,abs(n2-n1)*1.90);
  float shadow=fbm(q*1.28+w1*.36+vec2(-t*.026,t*.018)+17.0);
  float depth=smoothstep(.27,.81,shadow);

  /* The inner light is the living heart: broader, brighter and mobile. */
  vec2 heartPos=vec2(
    -.17+.28*sin(t*.15)+.09*sin(t*.061+1.4),
    -.16+.27*cos(t*.12)-.09*sin(t*.082)
  );
  float heartDist=dot(q-heartPos,q-heartPos);
  float heartCore=exp(-2.15*heartDist);
  float heartTexture=.56+.44*fbm(flow*1.42+vec2(t*.027,-t*.022)+21.0);
  float heartbeat=.91+.09*sin(t*.90)+.028*sin(t*.34+2.1);
  float heart=heartCore*heartTexture*heartbeat;

  /* Secondary soft light keeps the ORB from feeling like one spotlight. */
  vec2 light2Pos=vec2(.22+.16*cos(t*.10),.18+.18*sin(t*.13));
  float light2=exp(-2.9*dot(q-light2Pos,q-light2Pos))*(.58+.42*n1);
  vec2 light3Pos=vec2(-.28+.10*sin(t*.075),.24+.14*cos(t*.095));
  float light3=exp(-3.4*dot(q-light3Pos,q-light3Pos))*(.60+.40*n2);

  vec3 deep=vec3(.28,.56,.75);
  vec3 blue=vec3(.46,.70,.85);
  vec3 pale=vec3(.74,.88,.96);
  vec3 milkCol=vec3(.88,.955,.992);
  vec3 heartCol=vec3(.975,.995,1.0);

  vec3 col=mix(blue,deep,depth*.46);
  col=mix(col,pale,cloud*.76);
  col=mix(col,milkCol,milk*.58);
  col=mix(col,vec3(.65,.82,.92),wisps*.18);
  col=mix(col,heartCol,heart*.78);
  col=mix(col,milkCol,light2*.34);
  col=mix(col,pale,light3*.20);

  float radial=clamp(d/max(edge,0.001),0.0,1.0);

  /* Edge remains blue and slightly translucent instead of becoming white. */
  float rimZone=smoothstep(.72,1.03,radial);
  col=mix(col,vec3(.50,.73,.88),rimZone*.30);
  col*=1.0-.040*smoothstep(.74,1.0,radial);

  /* Let inner light softly influence the shell without creating a rim. */
  col=mix(col,milkCol,heart*softShell*.18);

  float grain=(hash21(gl_FragCoord.xy+floor(t*5.0))-.5)*.009;
  col+=grain*body;

  vec3 auraNearCol=vec3(.50,.75,.90);
  vec3 auraFarCol=vec3(.63,.83,.94);
  vec3 auraCol=auraNearCol*auraNear*.38 + auraFarCol*auraFar*.18;

  float alphaBody=clamp(body*.93 + bodyInner*.07,0.0,1.0);
  vec3 outCol=col*alphaBody + auraCol;
  float alpha=max(alphaBody,auraNear*.22+auraFar*.10);

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
    fallback.textContent='ORB v5 kon niet starten: '+String(error&&error.message?error.message:error);
  }
})();
</script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if ((request.method === "GET" || request.method === "HEAD") && url.searchParams.get("orbLab") === "5") {
      const headers = new Headers({
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "no-referrer",
        "x-talera-orb-lab": "webgl-v5"
      });
      return new Response(request.method === "HEAD" ? null : ORB_V5_HTML,{status:200,headers});
    }
    return previousWorker.fetch(request, env, ctx);
  },
};
