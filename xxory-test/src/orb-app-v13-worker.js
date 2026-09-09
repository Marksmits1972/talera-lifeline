import previousWorker from "./orb-webgl-v7-worker.js";

const LIVE_STYLE = String.raw`
/* TALERA ORB app v13 — Safari-safe organic layer. */
.core-wrap{
  position:relative!important;
  width:min(58vw,250px)!important;
  min-width:190px!important;
  min-height:190px!important;
  aspect-ratio:1/1!important;
  display:grid!important;
  place-items:center!important;
  overflow:visible!important;
  isolation:isolate!important;
}
.core-wrap>.halo,
.core-wrap>.core{
  opacity:0!important;
  visibility:hidden!important;
  pointer-events:none!important;
}
.talera-orb-live{
  position:absolute;
  inset:0;
  display:grid;
  place-items:center;
  z-index:12;
  pointer-events:none;
  overflow:visible;
}
.talera-orb-fallback{
  position:absolute;
  width:78%;
  height:78%;
  border-radius:50%;
  background:radial-gradient(circle at 36% 30%,rgba(245,251,255,.98) 0 10%,rgba(210,232,244,.96) 28%,rgba(151,195,220,.94) 56%,rgba(91,143,185,.94) 78%,rgba(69,117,153,.92) 100%);
  box-shadow:0 18px 48px rgba(15,39,71,.12),inset 12px 10px 28px rgba(255,255,255,.28),inset -12px -14px 26px rgba(15,39,71,.08);
  opacity:1;
  transform:scale(calc(1 + var(--awake)*.10 + var(--voice)*.025));
  animation:taleraFallbackBreath 8.5s ease-in-out infinite;
  transition:transform .35s cubic-bezier(.18,.72,.2,1),opacity .35s ease;
  z-index:1;
}
.talera-orb-live.ready .talera-orb-fallback{opacity:.08}
.talera-orb-canvas{
  position:absolute;
  width:142%;
  height:142%;
  left:-21%;
  top:-21%;
  display:block;
  background:transparent;
  opacity:0;
  z-index:2;
  transition:opacity .3s ease;
}
.talera-orb-live.ready .talera-orb-canvas{opacity:1}
@keyframes taleraFallbackBreath{0%,100%{transform:scale(.985)}50%{transform:scale(1.015)}}
`;

function liveOrbClient(){
  const VERTEX=`
attribute vec2 a_position;
varying vec2 v_uv;
void main(){
  v_uv=a_position*0.5+0.5;
  gl_Position=vec4(a_position,0.0,1.0);
}`;

  const FRAGMENT=`
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_active;

void main(){
  vec2 p=(v_uv-0.5)*2.0;
  p.x*=u_resolution.x/u_resolution.y;
  float t=u_time;
  float active=clamp(u_active,0.0,1.0);
  float d=length(p);
  float ang=atan(p.y,p.x);

  float breath=sin(t*0.70);
  float activePulse=sin(t*1.35+0.8);
  float scale=1.0+0.008*breath+active*(0.105+0.018*activePulse);
  float edge=0.590*scale
    +0.0060*sin(ang*3.0+t*0.24)
    +0.0038*sin(ang*5.0-t*0.18+1.2)
    +0.0022*sin(ang*7.0+t*0.12+2.1);

  float body=smoothstep(edge+0.026,edge-0.038,d);
  float aura=smoothstep(edge+0.105,edge+0.004,d)*(1.0-body);
  aura*=0.075+active*0.035;

  vec2 q=p/max(edge,0.001);
  float flow1=sin(q.x*4.8+t*0.24)+sin(q.y*4.1-t*0.19)+sin((q.x+q.y)*3.2+t*0.13);
  float flow2=sin(q.x*7.2-q.y*2.3-t*0.16)+sin(q.y*6.1+q.x*1.7+t*0.21);
  float flow3=sin((q.x*q.x-q.y*q.y)*5.2+t*0.12)+sin((q.x-q.y)*5.5-t*0.10);
  float cloud=0.50+flow1*0.075+flow2*0.045+flow3*0.035;
  cloud=clamp(cloud,0.0,1.0);

  vec2 lampPos=vec2(-0.18+0.28*sin(t*0.18),-0.13+0.24*cos(t*0.15));
  vec2 lv=q-lampPos;
  float lamp=exp(-2.6*dot(lv,lv));
  float lightTex=0.72+0.18*sin(q.x*5.0+q.y*3.2+t*0.20)+0.10*sin(q.y*7.0-t*0.17);
  lamp*=lightTex;

  vec2 lampPos2=vec2(0.25+0.12*cos(t*0.11),0.18+0.14*sin(t*0.14));
  float bounce=exp(-4.2*dot(q-lampPos2,q-lampPos2));

  float radial=clamp(d/max(edge,0.001),0.0,1.0);
  float edgeZone=smoothstep(0.74,1.0,radial);

  vec3 deep=vec3(0.25,0.53,0.72);
  vec3 blue=vec3(0.43,0.68,0.84);
  vec3 pale=vec3(0.72,0.87,0.95);
  vec3 milk=vec3(0.88,0.95,0.985);
  vec3 lightCol=vec3(0.99,0.997,1.0);

  vec3 col=mix(deep,blue,cloud);
  col=mix(col,pale,smoothstep(0.54,0.73,cloud)*0.60);
  col=mix(col,milk,smoothstep(0.64,0.82,cloud)*0.36);
  col=mix(col,lightCol,clamp(lamp*(0.60+active*0.20),0.0,0.76));
  col=mix(col,pale,bounce*0.18);
  col=mix(col,vec3(0.47,0.70,0.86),edgeZone*0.42);
  col*=1.0-0.035*edgeZone;

  vec3 auraCol=vec3(0.53,0.76,0.89);
  vec3 outCol=mix(auraCol,col,body);
  float alpha=max(body,aura);
  gl_FragColor=vec4(outCol,alpha);
}`;

  function makeShader(gl,type,source){
    const s=gl.createShader(type);
    gl.shaderSource(s,source);
    gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
      const msg=gl.getShaderInfoLog(s)||'shader error';
      gl.deleteShader(s);
      throw new Error(msg);
    }
    return s;
  }
  function cssNumber(name){
    const v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return Number.isFinite(v)?v:0;
  }
  function mount(wrap){
    if(!wrap||wrap.dataset.taleraOrbV13==='1')return;
    wrap.dataset.taleraOrbV13='1';
    const layer=document.createElement('div');layer.className='talera-orb-live';
    const fallback=document.createElement('div');fallback.className='talera-orb-fallback';
    const canvas=document.createElement('canvas');canvas.className='talera-orb-canvas';canvas.setAttribute('aria-hidden','true');
    layer.appendChild(fallback);layer.appendChild(canvas);wrap.appendChild(layer);

    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false})
      || canvas.getContext('experimental-webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false});
    if(!gl){layer.dataset.webgl='unavailable';return;}

    try{
      const vs=makeShader(gl,gl.VERTEX_SHADER,VERTEX);
      const fs=makeShader(gl,gl.FRAGMENT_SHADER,FRAGMENT);
      const program=gl.createProgram();
      gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'link error');
      gl.useProgram(program);

      const buffer=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const pos=gl.getAttribLocation(program,'a_position');
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);

      const resLoc=gl.getUniformLocation(program,'u_resolution');
      const timeLoc=gl.getUniformLocation(program,'u_time');
      const activeLoc=gl.getUniformLocation(program,'u_active');
      const started=performance.now();
      let active=0;
      let frames=0;

      function resize(){
        const r=canvas.getBoundingClientRect();
        const dpr=Math.min(1.5,window.devicePixelRatio||1);
        const w=Math.max(220,Math.round(r.width*dpr));
        const h=Math.max(220,Math.round(r.height*dpr));
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
      }
      function frame(now){
        if(!canvas.isConnected)return;
        resize();
        const target=Math.max(cssNumber('--awake'),Math.min(1,cssNumber('--voice')*1.25));
        active+=(target-active)*0.07;
        gl.clearColor(0,0,0,0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(resLoc,canvas.width,canvas.height);
        gl.uniform1f(timeLoc,(now-started)/1000);
        gl.uniform1f(activeLoc,active);
        gl.drawArrays(gl.TRIANGLES,0,6);
        frames++;
        if(frames===3 && gl.getError()===gl.NO_ERROR)layer.classList.add('ready');
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }catch(err){
      console.warn('TALERA ORB v13 WebGL fallback',err);
      layer.dataset.webgl='error';
    }
  }

  function scan(){document.querySelectorAll('.core-wrap').forEach(mount);}
  scan();
  const app=document.getElementById('app');
  if(app)new MutationObserver(scan).observe(app,{childList:true,subtree:true});
}

const LIVE_SCRIPT='('+liveOrbClient.toString()+')();';
function enhance(html){
  let out=html.replace('</head>','<style>'+LIVE_STYLE+'</style></head>');
  out=out.replace('</body>','<script>'+LIVE_SCRIPT+'</script></body>');
  return out;
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.searchParams.has('orbLab'))return previousWorker.fetch(request,env,ctx);
    const response=await previousWorker.fetch(request,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(request.method==='HEAD'||!type.includes('text/html'))return response;
    const html=await response.text();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control','no-store');
    headers.set('x-talera-orb-app','organic-v13-safari-safe');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
