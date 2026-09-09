import previousWorker from "./orb-webgl-v7-worker.js";

const LIVE_STYLE = String.raw`
/* TALERA ORB app v14 — never hand off from fallback until WebGL proves visible pixels. */
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
.core-wrap>.halo,.core-wrap>.core{
  opacity:0!important;
  visibility:hidden!important;
  pointer-events:none!important;
}
.talera-orb-live{
  position:absolute;inset:0;display:grid;place-items:center;
  z-index:12;pointer-events:none;overflow:visible;
}
.talera-orb-fallback{
  position:absolute;width:78%;height:78%;border-radius:50%;z-index:1;
  background:radial-gradient(circle at 36% 30%,#f5fbff 0 10%,#d2e8f4 28%,#97c3dc 56%,#5b8fb9 78%,#457599 100%);
  box-shadow:0 18px 48px rgba(15,39,71,.12),inset 12px 10px 28px rgba(255,255,255,.28),inset -12px -14px 26px rgba(15,39,71,.08);
  opacity:1!important;
  transform:scale(calc(1 + var(--awake)*.10 + var(--voice)*.025));
  transition:transform .35s cubic-bezier(.18,.72,.2,1),opacity .35s ease;
}
.talera-orb-live.ready .talera-orb-fallback{opacity:.12!important}
.talera-orb-canvas{
  position:absolute;width:142%;height:142%;left:-21%;top:-21%;display:block;
  background:transparent;opacity:0;visibility:visible;z-index:2;transition:opacity .28s ease;
}
.talera-orb-live.ready .talera-orb-canvas{opacity:1}
`;

function liveOrbClient(){
  const VERTEX=`attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
  const FRAGMENT=`
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_active;
void main(){
  vec2 p=(v_uv-.5)*2.;
  p.x*=u_resolution.x/u_resolution.y;
  float t=u_time;
  float active=clamp(u_active,0.,1.);
  float d=length(p);
  float a=atan(p.y,p.x);
  float breath=sin(t*.70);
  float edge=.59*(1.+.008*breath+active*.11)
    +.006*sin(a*3.+t*.24)+.0035*sin(a*5.-t*.18+1.2);
  float body=smoothstep(edge+.026,edge-.038,d);
  float aura=smoothstep(edge+.10,edge+.006,d)*(1.-body)*(.075+active*.03);
  vec2 q=p/max(edge,.001);
  float f=.50
    +.09*sin(q.x*4.6+t*.24)
    +.07*sin(q.y*4.0-t*.19)
    +.05*sin((q.x+q.y)*3.1+t*.13)
    +.035*sin((q.x-q.y)*6.0-t*.11);
  f=clamp(f,0.,1.);
  vec2 lp=vec2(-.18+.27*sin(t*.18),-.12+.23*cos(t*.15));
  float lamp=exp(-2.5*dot(q-lp,q-lp));
  vec3 deep=vec3(.25,.53,.72);
  vec3 blue=vec3(.43,.68,.84);
  vec3 pale=vec3(.72,.87,.95);
  vec3 white=vec3(.99,.997,1.);
  vec3 col=mix(deep,blue,f);
  col=mix(col,pale,smoothstep(.55,.75,f)*.55);
  col=mix(col,white,clamp(lamp*(.55+active*.18),0.,.75));
  float rz=clamp(d/max(edge,.001),0.,1.);
  col=mix(col,vec3(.47,.70,.86),smoothstep(.78,1.,rz)*.42);
  vec3 auraCol=vec3(.53,.76,.89);
  vec3 outCol=mix(auraCol,col,body);
  gl_FragColor=vec4(outCol,max(body,aura));
}`;

  function shader(gl,type,source){
    const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'shader compile error');
    return s;
  }
  function cssNumber(name){
    const v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return Number.isFinite(v)?v:0;
  }
  function mount(wrap){
    if(!wrap||wrap.dataset.taleraOrbV14==='1')return;
    wrap.dataset.taleraOrbV14='1';
    const layer=document.createElement('div');layer.className='talera-orb-live';
    const fallback=document.createElement('div');fallback.className='talera-orb-fallback';
    const canvas=document.createElement('canvas');canvas.className='talera-orb-canvas';canvas.setAttribute('aria-hidden','true');
    layer.append(fallback,canvas);wrap.appendChild(layer);

    const options={alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false};
    const gl=canvas.getContext('webgl',options)||canvas.getContext('experimental-webgl',options);
    if(!gl){layer.dataset.webgl='unavailable';return;}
    try{
      const vs=shader(gl,gl.VERTEX_SHADER,VERTEX),fs=shader(gl,gl.FRAGMENT_SHADER,FRAGMENT);
      const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'link error');
      gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const pos=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      const resLoc=gl.getUniformLocation(program,'u_resolution');
      const timeLoc=gl.getUniformLocation(program,'u_time');
      const activeLoc=gl.getUniformLocation(program,'u_active');
      const started=performance.now();let active=0,frames=0,verified=false;
      const pixel=new Uint8Array(4);

      function resize(){
        const r=canvas.getBoundingClientRect();const dpr=Math.min(1.5,window.devicePixelRatio||1);
        const w=Math.max(220,Math.round(r.width*dpr)),h=Math.max(220,Math.round(r.height*dpr));
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
      }
      function frame(now){
        if(!canvas.isConnected)return;
        resize();
        const target=Math.max(cssNumber('--awake'),Math.min(1,cssNumber('--voice')*1.25));
        active+=(target-active)*.07;
        gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(resLoc,canvas.width,canvas.height);
        gl.uniform1f(timeLoc,(now-started)/1000);
        gl.uniform1f(activeLoc,active);
        gl.drawArrays(gl.TRIANGLES,0,6);
        frames++;
        if(!verified&&frames>=3){
          try{
            gl.readPixels(Math.floor(canvas.width/2),Math.floor(canvas.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
            if(pixel[3]>32){verified=true;layer.classList.add('ready');layer.dataset.webgl='verified';}
          }catch(e){layer.dataset.webgl='readback-error';}
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }catch(err){console.warn('TALERA ORB v14 fallback',err);layer.dataset.webgl='error';}
  }
  function scan(){document.querySelectorAll('.core-wrap').forEach(mount);}
  scan();const app=document.getElementById('app');if(app)new MutationObserver(scan).observe(app,{childList:true,subtree:true});
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
    const html=await response.text();const headers=new Headers(response.headers);
    headers.delete('content-length');headers.set('cache-control','no-store');headers.set('x-talera-orb-app','organic-v14-pixel-verified');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
