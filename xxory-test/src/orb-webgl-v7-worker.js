import previousWorker from "./orb-webgl-v6-worker.js";

const ORB_V7_HTML = String.raw`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F7F4EF">
<meta name="robots" content="noindex,nofollow">
<title>TALERA — ORB lab v7</title>
<style>
:root{color-scheme:light}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#F7F4EF;color:#0F2747}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
.lab{min-height:100dvh;display:grid;grid-template-rows:auto 1fr auto;padding:max(16px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 43%,#fff 0,#fcfbf8 46%,#F7F4EF 79%)}
.head{display:flex;justify-content:center;align-items:center;min-height:32px;font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:#5f7488;opacity:.44}
.stage{display:grid;place-items:center;min-height:0}
.frame{position:relative;width:min(92vw,470px);aspect-ratio:1;display:grid;place-items:center;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
canvas{display:block;width:100%;height:100%;background:transparent}
.fallback{position:absolute;inset:0;display:none;place-items:center;text-align:center;padding:30px;color:#6a7784;font-size:14px;line-height:1.5}
.note{min-height:50px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;line-height:1.45;color:#6d7782;opacity:.64;padding:0 10px}
.note strong{color:#40576b;font-weight:650}
@media(min-width:700px){.frame{width:min(64vw,550px)}}
</style>
</head>
<body>
<div class="lab">
  <div class="head">ORB lab v7 — breathing loop</div>
  <div class="stage">
    <div class="frame" id="frame" role="button" tabindex="0" aria-label="Tik om rust en actief te wisselen">
      <canvas id="orb" aria-label="Levende TALERA ORB"></canvas>
      <div id="fallback" class="fallback"></div>
    </div>
  </div>
  <div id="note" class="note"><strong>Rust</strong>&nbsp;— subtiele ademhaling. Tik op de ORB voor actief.</div>
</div>

<script id="vs" type="x-shader/x-vertex">
attribute vec2 a_position;
varying vec2 v_uv;
void main(){v_uv=a_position*0.5+0.5;gl_Position=vec4(a_position,0.0,1.0);}
</script>

<script id="fs" type="x-shader/x-fragment">
precision highp float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_active;

const float PI=3.141592653589793;
const float TAU=6.283185307179586;
const float LOOP=30.0;

float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise2(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  float a=hash21(i),b=hash21(i+vec2(1.0,0.0)),c=hash21(i+vec2(0.0,1.0)),d=hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float fbm(vec2 p){
  float v=0.0,a=.53;mat2 m=mat2(1.62,1.18,-1.18,1.62);
  for(int i=0;i<5;i++){v+=a*noise2(p);p=m*p+.19;a*=.48;}
  return v;
}
vec2 rot(vec2 p,float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*p;}
vec2 orbit(float ph,float harmonic,float sx,float sy){return vec2(sin(ph*harmonic)*sx,cos(ph*harmonic)*sy);}

void main(){
  vec2 p=(v_uv-.5)*2.0;
  p.x*=u_resolution.x/u_resolution.y;
  float ph=TAU*mod(u_time,LOOP)/LOOP;
  float active=clamp(u_active,0.0,1.0);
  float d=length(p);
  float ang=atan(p.y,p.x);

  /* Every animation term is based on integer harmonics of ph, so frame 30s = frame 0s. */
  float idleBreath=sin(ph*3.0);       /* 10 second breathing cycle */
  float activeBreath=sin(ph*6.0);     /* 5 second breathing cycle */
  float microPulse=.5+.5*sin(ph*9.0+1.1);
  float breath=mix(idleBreath,activeBreath,active);
  float scale=1.0 + mix(.006,.024,active)*breath + active*(.105+.035*microPulse);

  /* Rounder silhouette, with small living deformation. */
  float perimeter=noise2(vec2(ang*.70+4.2,2.0+sin(ph*2.0)*.18+cos(ph)*.11));
  float edge=.598*scale
    +scale*(.0036*sin(ang*3.0+ph*2.0)
    +.0026*sin(ang*5.0-ph+1.1)
    +.0018*sin(ang*7.0+ph*3.0+2.3)
    +(perimeter-.5)*.0048);

  /* Cleaner blue edge: enough antialiasing, no milky-white shell. */
  float body=smoothstep(edge+.018,edge-.030,d);
  float interior=smoothstep(edge-.025,edge-.070,d);
  float shell=clamp(body-interior,0.0,1.0);

  /* Blue atmosphere touches the orb and fades out quickly; it never becomes white. */
  float aura=smoothstep(edge+.105,edge+.002,d)*(1.0-body);
  aura*=mix(.085,.11,active);

  vec2 q=p/max(edge,.001);
  float radial=clamp(length(q),0.0,1.2);

  /* Closed 30s trajectories. Active state selects faster integer harmonics, still seamless. */
  vec2 driftA=mix(orbit(ph,1.0,.34,.27),orbit(ph,2.0,.34,.27),active);
  vec2 driftB=mix(orbit(ph+1.4,2.0,.25,.31),orbit(ph+1.4,4.0,.25,.31),active);
  vec2 driftC=mix(orbit(ph+2.2,3.0,.18,.20),orbit(ph+2.2,6.0,.18,.20),active);

  vec2 warp1=vec2(
    fbm(q*1.46+driftA+vec2(2.3,5.1)),
    fbm(q*1.46+vec2(-driftA.y,driftA.x)+vec2(7.8,1.6))
  )-.5;
  vec2 warp2=vec2(
    fbm(rot(q,.70)*1.96+driftB+9.2),
    fbm(rot(q,-.49)*1.96+vec2(-driftB.y,driftB.x)+13.7)
  )-.5;

  vec2 flow=q+warp1*.70+warp2*.24;
  flow.x+=.085*sin(flow.y*3.0+ph*mix(1.0,2.0,active));
  flow.y+=.075*cos(flow.x*2.7-ph*mix(2.0,4.0,active));

  float n1=fbm(flow*2.10+driftA*.52);
  float n2=fbm(rot(flow,.62)*3.15+driftB*.58+4.4);
  float n3=fbm(rot(flow,-.43)*4.70+driftC*.66+8.7);
  float density=clamp(n1*.57+n2*.29+n3*.14,0.0,1.0);

  /* More local contrast and detail, less 'bril nodig' diffusion. */
  float cloud=smoothstep(.39,.67,density);
  float milk=smoothstep(.47,.69,n1+.085*sin((flow.x+flow.y)*5.2+ph*2.0));
  float wisps=smoothstep(.48,.69,abs(n2-n1)*2.10);
  float detail=smoothstep(.48,.66,n3);
  float depthField=fbm(q*1.30+warp1*.30+driftC*.42+17.0);
  float depth=smoothstep(.31,.74,depthField);

  /* Internal torch path: light travels INSIDE and is masked away from the outer shell. */
  vec2 lampPos=mix(orbit(ph+.6,1.0,.36,.28),orbit(ph+.6,2.0,.36,.28),active)+vec2(-.05,-.06);
  vec2 lv=q-lampPos;
  float lampDist=dot(lv,lv);
  float lampCore=exp(-2.25*lampDist);
  float lampSoft=exp(-1.15*lampDist);
  vec2 lampDir=normalize(orbit(ph+1.0,mix(1.0,2.0,active),1.0,.78)+vec2(.001));
  float beam=smoothstep(-.18,.72,dot(normalize(lv+vec2(.001)),lampDir))*lampSoft;
  float thinness=1.0-smoothstep(.38,.78,density);
  float lampTexture=.50+.50*fbm(flow*1.36+driftC*.44+22.0);
  float innerMask=1.0-smoothstep(.76,.98,radial);
  float lightInside=(lampCore*.78+beam*.38)*(.40+.85*thinness)*lampTexture*innerMask;

  vec2 bouncePos=orbit(ph+2.4,2.0,.24,.20)+vec2(.16,.14);
  float bounce=exp(-3.4*dot(q-bouncePos,q-bouncePos))*(.48+.52*n2)*innerMask;

  vec3 deep=vec3(.25,.53,.72);
  vec3 blue=vec3(.43,.68,.84);
  vec3 pale=vec3(.70,.86,.95);
  vec3 milkCol=vec3(.87,.95,.985);
  vec3 lightCol=vec3(.99,.997,1.0);
  vec3 edgeBlue=vec3(.48,.72,.87);

  vec3 col=mix(blue,deep,depth*.52);
  col=mix(col,pale,cloud*.62);
  col=mix(col,milkCol,milk*.46);
  col=mix(col,vec3(.61,.80,.91),wisps*.20);
  col=mix(col,vec3(.79,.90,.96),detail*.12);
  col=mix(col,lightCol,clamp(lightInside*.92,0.0,.78));
  col=mix(col,milkCol,bounce*.24);

  /* Edge color is explicitly blue and internal white is excluded from this zone. */
  float edgeZone=smoothstep(.79,1.01,radial);
  col=mix(col,edgeBlue,edgeZone*.62);
  col*=1.0-.035*smoothstep(.84,1.0,radial);
  col=mix(col,edgeBlue,shell*.34);

  /* Fine texture is stable within the 30s loop and a touch sharper. */
  float grain=(hash21(gl_FragCoord.xy+floor((sin(ph*4.0)+1.0)*3.0))-.5)*.010;
  col+=grain*body*(1.0-edgeZone*.7);

  vec3 auraColor=vec3(.53,.76,.89);
  float alphaBody=body;
  vec3 straightColor=mix(auraColor,col,alphaBody);
  float alpha=max(alphaBody,aura);
  gl_FragColor=vec4(straightColor,alpha);
}
</script>

<script>
(function(){
  var canvas=document.getElementById('orb');
  var frame=document.getElementById('frame');
  var fallback=document.getElementById('fallback');
  var note=document.getElementById('note');
  var gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false});
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
    var resLoc=gl.getUniformLocation(program,'u_resolution');
    var timeLoc=gl.getUniformLocation(program,'u_time');
    var activeLoc=gl.getUniformLocation(program,'u_active');
    var start=performance.now();
    var targetActive=0,active=0;

    function resize(){
      var rect=frame.getBoundingClientRect();
      var w=Math.max(280,Math.round(rect.width||430));
      var dpr=Math.min(2,window.devicePixelRatio||1);
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(w*dpr);gl.viewport(0,0,canvas.width,canvas.height);
    }
    resize();window.addEventListener('resize',resize,{passive:true});

    function toggle(){
      targetActive=targetActive>.5?0:1;
      note.innerHTML=targetActive?'<strong>Actief</strong>&nbsp;— circa 10–14% groter, sterkere ademhaling en snellere interne reactie.':'<strong>Rust</strong>&nbsp;— subtiele ademhaling. Tik op de ORB voor actief.';
    }
    frame.addEventListener('click',toggle);
    frame.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});

    function render(now){
      active+=(targetActive-active)*.055;
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(resLoc,canvas.width,canvas.height);
      gl.uniform1f(timeLoc,(now-start)/1000);
      gl.uniform1f(activeLoc,active);
      gl.drawArrays(gl.TRIANGLES,0,6);
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  }catch(error){fallback.style.display='grid';fallback.textContent='ORB v7 kon niet starten: '+String(error&&error.message?error.message:error);}
})();
</script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if ((request.method === "GET" || request.method === "HEAD") && url.searchParams.get("orbLab") === "7") {
      const headers = new Headers({
        "content-type":"text/html; charset=utf-8",
        "cache-control":"no-store",
        "x-content-type-options":"nosniff",
        "x-frame-options":"DENY",
        "referrer-policy":"no-referrer",
        "x-talera-orb-lab":"webgl-v7"
      });
      return new Response(request.method === "HEAD" ? null : ORB_V7_HTML,{status:200,headers});
    }
    return previousWorker.fetch(request, env, ctx);
  },
};
