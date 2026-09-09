import previousWorker from "./orb-webgl-v5-worker.js";

const ORB_V6_HTML = String.raw`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F7F4EF">
<meta name="robots" content="noindex,nofollow">
<title>TALERA — ORB lab v6</title>
<style>
:root{color-scheme:light}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#F7F4EF;color:#0F2747}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
.lab{min-height:100dvh;display:grid;grid-template-rows:auto 1fr auto;padding:max(16px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 43%,#fff 0,#fcfbf8 46%,#F7F4EF 79%)}
.head{display:flex;justify-content:center;align-items:center;min-height:32px;font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:#5f7488;opacity:.44}
.stage{display:grid;place-items:center;min-height:0}
.frame{position:relative;width:min(92vw,470px);aspect-ratio:1;display:grid;place-items:center}
canvas{display:block;width:100%;height:100%;background:transparent}
.fallback{position:absolute;inset:0;display:none;place-items:center;text-align:center;padding:30px;color:#6a7784;font-size:14px;line-height:1.5}
.note{min-height:42px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;line-height:1.45;color:#6d7782;opacity:.58;padding:0 10px}
@media(min-width:700px){.frame{width:min(64vw,550px)}}
</style>
</head>
<body>
<div class="lab">
  <div class="head">ORB lab v6 — light inside</div>
  <div class="stage">
    <div class="frame" id="frame">
      <canvas id="orb" aria-label="Levende TALERA ORB"></canvas>
      <div id="fallback" class="fallback"></div>
    </div>
  </div>
  <div class="note">Rusttoestand: intern bewegend licht, zachte blauwe rand en minimale atmosfeer.</div>
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
  vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);
  float a=hash21(i);float b=hash21(i+vec2(1.0,0.0));
  float c=hash21(i+vec2(0.0,1.0));float d=hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float fbm(vec2 p){
  float v=0.0;float a=.53;mat2 m=mat2(1.62,1.18,-1.18,1.62);
  for(int i=0;i<5;i++){v+=a*noise2(p);p=m*p+.19;a*=.48;}
  return v;
}
vec2 rot(vec2 p,float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*p;}

void main(){
  vec2 p=(v_uv-.5)*2.0;
  p.x*=u_resolution.x/u_resolution.y;
  float t=u_time;
  float d=length(p);
  float ang=atan(p.y,p.x);

  /* Calm almost-round living silhouette. */
  float perimeter=noise2(vec2(ang*.64+4.0,t*.024));
  float edge=.600
    +.0055*sin(ang*3.0+t*.14)
    +.0038*sin(ang*5.0-t*.11+1.1)
    +.0022*sin(ang*7.0+t*.078+2.3)
    +(perimeter-.5)*.007;

  /* Body fades through blue; no white rim term anywhere. */
  float body=smoothstep(edge+.028,edge-.052,d);
  float core=smoothstep(edge-.010,edge-.065,d);
  float shell=clamp(body-core,0.0,1.0);

  /* Very restrained atmosphere, touching the body directly. */
  float aura=smoothstep(edge+.115,edge+.008,d)-smoothstep(edge+.030,edge-.012,d);
  aura=max(aura,0.0)*(.88+.12*sin(t*.31));

  vec2 q=p/max(edge,.001);
  q=rot(q,.018*sin(t*.105));

  /* Moving translucent material. */
  vec2 warp1=vec2(
    fbm(q*1.44+vec2(t*.050,-t*.030)+vec2(2.3,5.1)),
    fbm(q*1.44+vec2(-t*.035,t*.044)+vec2(7.8,1.6))
  )-.5;
  vec2 warp2=vec2(
    fbm(rot(q,.72)*1.95+vec2(-t*.032,t*.027)+9.2),
    fbm(rot(q,-.51)*1.95+vec2(t*.029,t*.037)+13.7)
  )-.5;
  vec2 flow=q+warp1*.78+warp2*.27;
  flow.x+=.105*sin(flow.y*2.9+t*.16);
  flow.y+=.090*cos(flow.x*2.55-t*.14);

  float n1=fbm(flow*2.0+vec2(t*.036,-t*.046));
  float n2=fbm(rot(flow,.60)*3.0+vec2(-t*.041,t*.025)+4.4);
  float n3=fbm(rot(flow,-.42)*4.35+vec2(t*.025,t*.033)+8.7);
  float density=clamp(n1*.58+n2*.28+n3*.14,0.0,1.0);
  float cloud=smoothstep(.34,.75,density);
  float milk=smoothstep(.39,.69,n1+.12*sin((flow.x+flow.y)*4.5+t*.21));
  float wisps=smoothstep(.44,.74,abs(n2-n1)*1.92);
  float depthField=fbm(q*1.24+warp1*.38+vec2(-t*.024,t*.017)+17.0);
  float depth=smoothstep(.26,.80,depthField);

  /* Internal moving lamp: all light is evaluated inside body coordinates. */
  vec2 lampPos=vec2(
    -.23+.34*sin(t*.135)+.07*sin(t*.047+1.8),
    -.17+.30*cos(t*.115)-.08*sin(t*.073)
  );
  vec2 lampVec=q-lampPos;
  float lampRadius=dot(lampVec,lampVec);
  float lamp=exp(-1.85*lampRadius);
  float lampTexture=.48+.52*fbm(flow*1.30+vec2(t*.023,-t*.019)+22.0);
  float lampPulse=.90+.10*sin(t*.78)+.035*sin(t*.29+1.7);
  lamp*=lampTexture*lampPulse;

  /* A directional cone gives the feeling of a slowly turning flashlight inside. */
  vec2 dir=normalize(vec2(cos(t*.095),sin(t*.095)*.72));
  float facing=dot(normalize(lampVec+vec2(.0001)),dir);
  float cone=smoothstep(-.28,.72,facing)*exp(-1.05*lampRadius);
  cone*=.62+.38*fbm(flow*1.70+vec2(-t*.020,t*.017)+31.0);

  /* Secondary reflected light stays weaker and diffuse. */
  vec2 bouncePos=vec2(.28+.12*cos(t*.082),.22+.15*sin(t*.102));
  float bounce=exp(-3.0*dot(q-bouncePos,q-bouncePos))*(.50+.50*n2);

  /* Light transmits most where material is thinner, like a torch through cloudy gel. */
  float thinness=1.0-smoothstep(.36,.82,density);
  float transmission=lamp*(.42+.82*thinness)+cone*(.30+.68*thinness);
  transmission=clamp(transmission,0.0,1.35);

  vec3 deep=vec3(.27,.55,.74);
  vec3 blue=vec3(.46,.70,.85);
  vec3 pale=vec3(.73,.87,.95);
  vec3 milkCol=vec3(.88,.95,.985);
  vec3 lightCol=vec3(.985,.997,1.0);

  vec3 col=mix(blue,deep,depth*.44);
  col=mix(col,pale,cloud*.67);
  col=mix(col,milkCol,milk*.48);
  col=mix(col,vec3(.63,.81,.92),wisps*.16);

  /* Main visual event: internal light, not outer glow. */
  col=mix(col,lightCol,transmission*.82);
  col=mix(col,milkCol,bounce*.22);

  float radial=clamp(d/max(edge,.001),0.0,1.0);
  float edgeZone=smoothstep(.74,1.03,radial);
  col=mix(col,vec3(.48,.72,.87),edgeZone*.24);
  col*=1.0-.045*smoothstep(.76,1.0,radial);

  /* Internal lamp may kiss the inner shell, but never generate a white outline. */
  col=mix(col,pale,transmission*shell*.12);

  float grain=(hash21(gl_FragCoord.xy+floor(t*4.0))-.5)*.008;
  col+=grain*body;

  vec3 auraCol=vec3(.53,.77,.90)*aura*.14;
  float alphaBody=clamp(body*.96+core*.04,0.0,1.0);
  vec3 outCol=col*alphaBody+auraCol;
  float alpha=max(alphaBody,aura*.075);

  gl_FragColor=vec4(outCol,alpha);
}
</script>

<script>
(function(){
  var canvas=document.getElementById('orb');
  var frame=document.getElementById('frame');
  var fallback=document.getElementById('fallback');
  var gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:false});
  if(!gl){fallback.style.display='grid';fallback.textContent='WebGL wordt op dit toestel niet beschikbaar gesteld. De gewone vertelpagina blijft intact.';return;}
  function shader(type,source){
    var s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){var msg=gl.getShaderInfoLog(s)||'Shader compile error';gl.deleteShader(s);throw new Error(msg);}return s;
  }
  try{
    var vs=shader(gl.VERTEX_SHADER,document.getElementById('vs').textContent);
    var fs=shader(gl.FRAGMENT_SHADER,document.getElementById('fs').textContent);
    var program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Program link error');
    gl.useProgram(program);
    var buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    var loc=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    var resLoc=gl.getUniformLocation(program,'u_resolution');var timeLoc=gl.getUniformLocation(program,'u_time');var start=performance.now();
    function resize(){var rect=frame.getBoundingClientRect();var w=Math.max(280,Math.round(rect.width||430));var dpr=Math.min(1.75,window.devicePixelRatio||1);canvas.width=Math.round(w*dpr);canvas.height=Math.round(w*dpr);gl.viewport(0,0,canvas.width,canvas.height);}
    resize();window.addEventListener('resize',resize,{passive:true});
    function render(now){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform2f(resLoc,canvas.width,canvas.height);gl.uniform1f(timeLoc,(now-start)/1000);gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(render);}
    requestAnimationFrame(render);
  }catch(error){fallback.style.display='grid';fallback.textContent='ORB v6 kon niet starten: '+String(error&&error.message?error.message:error);}
})();
</script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if ((request.method === "GET" || request.method === "HEAD") && url.searchParams.get("orbLab") === "6") {
      const headers = new Headers({
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "no-referrer",
        "x-talera-orb-lab": "webgl-v6"
      });
      return new Response(request.method === "HEAD" ? null : ORB_V6_HTML,{status:200,headers});
    }
    return previousWorker.fetch(request, env, ctx);
  },
};
