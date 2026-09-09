import previousWorker from "./orb-webgl-v7-worker.js";

const APP_ORB_STYLE = String.raw`
/* TALERA ORB app v10 — the live vertel page now uses the organic WebGL ORB itself. */
.core-wrap{
  overflow:visible!important;
  isolation:isolate;
}
.halo{display:none!important}
.core,.core.active,.core.listening{
  width:100%!important;
  height:100%!important;
  position:relative!important;
  background:transparent!important;
  background-image:none!important;
  box-shadow:none!important;
  filter:none!important;
  border:0!important;
  border-radius:0!important;
  overflow:visible!important;
  isolation:isolate;
  animation:none!important;
  transform:none!important;
  transition:none!important;
}
.core::before,.core::after{display:none!important;content:none!important}
.talera-organic-orb{
  position:absolute;
  width:142%;height:142%;
  left:-21%;top:-21%;
  display:block;
  pointer-events:none;
  background:transparent!important;
  z-index:2;
}
.core.talera-webgl-fallback{
  width:78%!important;height:78%!important;
  border-radius:50%!important;
  background:radial-gradient(circle at 38% 32%,#edf7fc 0%,#b9d8ea 35%,#78a9c8 70%,#4f82a7 100%)!important;
  box-shadow:0 18px 48px rgba(15,39,71,.10)!important;
}
`;

function organicOrbClient(){
  const VERTEX=`attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=a_position*0.5+0.5;gl_Position=vec4(a_position,0.0,1.0);}`;
  const FRAGMENT=`
precision highp float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_active;
uniform float u_voice;
const float PI=3.141592653589793;
const float TAU=6.283185307179586;
const float LOOP=30.0;
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i),b=hash21(i+vec2(1.0,0.0)),c=hash21(i+vec2(0.0,1.0)),d=hash21(i+vec2(1.0,1.0));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=.53;mat2 m=mat2(1.62,1.18,-1.18,1.62);for(int i=0;i<5;i++){v+=a*noise2(p);p=m*p+.19;a*=.48;}return v;}
vec2 rot(vec2 p,float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*p;}
vec2 orbit(float ph,float harmonic,float sx,float sy){return vec2(sin(ph*harmonic)*sx,cos(ph*harmonic)*sy);}
void main(){
  vec2 p=(v_uv-.5)*2.0;p.x*=u_resolution.x/u_resolution.y;
  float ph=TAU*mod(u_time,LOOP)/LOOP;
  float active=clamp(u_active,0.0,1.0);
  float voice=clamp(u_voice,0.0,1.0);
  float energy=clamp(active*.68+voice*.72,0.0,1.0);
  float d=length(p);float ang=atan(p.y,p.x);

  /* Winterslaap is almost still; first speech wakes the same material instead of swapping objects. */
  float idleBreath=sin(ph*3.0);
  float activeBreath=sin(ph*6.0);
  float microPulse=.5+.5*sin(ph*9.0+1.1);
  float breath=mix(idleBreath,activeBreath,energy);
  float scale=1.0+.006*idleBreath+active*.105+voice*.035+energy*.020*breath+voice*.012*microPulse;

  float perimeter=noise2(vec2(ang*.70+4.2,2.0+sin(ph*2.0)*.18+cos(ph)*.11));
  float edge=.598*scale+scale*(.0036*sin(ang*3.0+ph*2.0)+.0026*sin(ang*5.0-ph+1.1)+.0018*sin(ang*7.0+ph*3.0+2.3)+(perimeter-.5)*.0048);
  float body=smoothstep(edge+.018,edge-.030,d);
  float interior=smoothstep(edge-.025,edge-.070,d);
  float shell=clamp(body-interior,0.0,1.0);
  float aura=smoothstep(edge+.105,edge+.002,d)*(1.0-body);
  aura*=mix(.070,.115,energy);

  vec2 q=p/max(edge,.001);float radial=clamp(length(q),0.0,1.2);
  vec2 driftA=mix(orbit(ph,1.0,.34,.27),orbit(ph,2.0,.34,.27),energy);
  vec2 driftB=mix(orbit(ph+1.4,2.0,.25,.31),orbit(ph+1.4,4.0,.25,.31),energy);
  vec2 driftC=mix(orbit(ph+2.2,3.0,.18,.20),orbit(ph+2.2,6.0,.18,.20),energy);
  vec2 warp1=vec2(fbm(q*1.46+driftA+vec2(2.3,5.1)),fbm(q*1.46+vec2(-driftA.y,driftA.x)+vec2(7.8,1.6)))-.5;
  vec2 warp2=vec2(fbm(rot(q,.70)*1.96+driftB+9.2),fbm(rot(q,-.49)*1.96+vec2(-driftB.y,driftB.x)+13.7))-.5;
  vec2 flow=q+warp1*.70+warp2*.24;
  flow.x+=.085*sin(flow.y*3.0+ph*mix(1.0,2.0,energy));
  flow.y+=.075*cos(flow.x*2.7-ph*mix(2.0,4.0,energy));

  float n1=fbm(flow*2.10+driftA*.52);
  float n2=fbm(rot(flow,.62)*3.15+driftB*.58+4.4);
  float n3=fbm(rot(flow,-.43)*4.70+driftC*.66+8.7);
  float density=clamp(n1*.57+n2*.29+n3*.14,0.0,1.0);
  float cloud=smoothstep(.39,.67,density);
  float milk=smoothstep(.47,.69,n1+.085*sin((flow.x+flow.y)*5.2+ph*2.0));
  float wisps=smoothstep(.48,.69,abs(n2-n1)*2.10);
  float detail=smoothstep(.48,.66,n3);
  float depthField=fbm(q*1.30+warp1*.30+driftC*.42+17.0);
  float depth=smoothstep(.31,.74,depthField);

  vec2 lampPos=mix(orbit(ph+.6,1.0,.36,.28),orbit(ph+.6,2.0,.36,.28),energy)+vec2(-.05,-.06);
  vec2 lv=q-lampPos;float lampDist=dot(lv,lv);
  float lampCore=exp(-2.25*lampDist);float lampSoft=exp(-1.15*lampDist);
  vec2 lampDir=normalize(orbit(ph+1.0,mix(1.0,2.0,energy),1.0,.78)+vec2(.001));
  float beam=smoothstep(-.18,.72,dot(normalize(lv+vec2(.001)),lampDir))*lampSoft;
  float thinness=1.0-smoothstep(.38,.78,density);
  float lampTexture=.50+.50*fbm(flow*1.36+driftC*.44+22.0);
  float innerMask=1.0-smoothstep(.76,.98,radial);
  float lightInside=(lampCore*.78+beam*.38)*(.40+.85*thinness)*lampTexture*innerMask;
  lightInside*=mix(.88,1.10,voice);
  vec2 bouncePos=orbit(ph+2.4,2.0,.24,.20)+vec2(.16,.14);
  float bounce=exp(-3.4*dot(q-bouncePos,q-bouncePos))*(.48+.52*n2)*innerMask;

  vec3 deep=vec3(.25,.53,.72);vec3 blue=vec3(.43,.68,.84);vec3 pale=vec3(.70,.86,.95);
  vec3 milkCol=vec3(.87,.95,.985);vec3 lightCol=vec3(.99,.997,1.0);vec3 edgeBlue=vec3(.48,.72,.87);
  vec3 col=mix(blue,deep,depth*.52);col=mix(col,pale,cloud*.62);col=mix(col,milkCol,milk*.46);
  col=mix(col,vec3(.61,.80,.91),wisps*.20);col=mix(col,vec3(.79,.90,.96),detail*.12);
  col=mix(col,lightCol,clamp(lightInside*.92,0.0,.82));col=mix(col,milkCol,bounce*.24);
  float edgeZone=smoothstep(.79,1.01,radial);col=mix(col,edgeBlue,edgeZone*.62);col*=1.0-.035*smoothstep(.84,1.0,radial);col=mix(col,edgeBlue,shell*.34);
  float grain=(hash21(gl_FragCoord.xy+floor((sin(ph*4.0)+1.0)*3.0))-.5)*.010;col+=grain*body*(1.0-edgeZone*.7);
  vec3 auraColor=vec3(.53,.76,.89);float alphaBody=body;vec3 straightColor=mix(auraColor,col,alphaBody);float alpha=max(alphaBody,aura);
  gl_FragColor=vec4(straightColor,alpha);
}`;

  function makeShader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const m=gl.getShaderInfoLog(s)||'shader error';gl.deleteShader(s);throw new Error(m);}return s;}
  function readNumber(name){const v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));return Number.isFinite(v)?v:0;}
  function mount(core){
    if(!core||core.dataset.organicV10==='1')return;
    core.dataset.organicV10='1';
    const canvas=document.createElement('canvas');canvas.className='talera-organic-orb';canvas.setAttribute('aria-hidden','true');core.appendChild(canvas);
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false});
    if(!gl){canvas.remove();core.classList.add('talera-webgl-fallback');return;}
    try{
      const vs=makeShader(gl,gl.VERTEX_SHADER,VERTEX),fs=makeShader(gl,gl.FRAGMENT_SHADER,FRAGMENT);
      const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'link error');
      gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const pos=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      const resLoc=gl.getUniformLocation(program,'u_resolution');
      const timeLoc=gl.getUniformLocation(program,'u_time');
      const activeLoc=gl.getUniformLocation(program,'u_active');
      const voiceLoc=gl.getUniformLocation(program,'u_voice');
      const started=performance.now();let active=0,voice=0;
      function resize(){const r=canvas.getBoundingClientRect();const dpr=Math.min(2,window.devicePixelRatio||1);const w=Math.max(260,Math.round(r.width*dpr)),h=Math.max(260,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}}
      function frame(now){
        if(!canvas.isConnected)return;
        resize();
        const targetActive=readNumber('--awake');const targetVoice=readNumber('--voice');
        active+=(targetActive-active)*.065;voice+=(targetVoice-voice)*.16;
        gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(resLoc,canvas.width,canvas.height);gl.uniform1f(timeLoc,(now-started)/1000);gl.uniform1f(activeLoc,active);gl.uniform1f(voiceLoc,voice);
        gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }catch(err){console.warn('TALERA organic ORB v10 unavailable',err);canvas.remove();core.classList.add('talera-webgl-fallback');}
  }
  function scan(){document.querySelectorAll('.core').forEach(mount);}
  scan();const app=document.getElementById('app');if(app)new MutationObserver(scan).observe(app,{childList:true,subtree:true});
}

const APP_ORB_SCRIPT='('+organicOrbClient.toString()+')();';
function enhance(html){let out=html;if(out.includes('</style>'))out=out.replace('</style>',APP_ORB_STYLE+'\n</style>');else out=out.replace('</head>','<style>'+APP_ORB_STYLE+'</style></head>');out=out.replace('</body>','<script>'+APP_ORB_SCRIPT+'</script></body>');return out;}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.searchParams.has('orbLab'))return previousWorker.fetch(request,env,ctx);
    const response=await previousWorker.fetch(request,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(request.method==='HEAD'||!type.includes('text/html'))return response;
    const html=await response.text();const headers=new Headers(response.headers);headers.delete('content-length');headers.set('cache-control','no-store');headers.set('x-talera-orb-app','organic-v10-live-v7-material');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
