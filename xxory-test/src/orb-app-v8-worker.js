import previousWorker from "./orb-webgl-v7-worker.js";

const APP_ORB_STYLE = String.raw`
/* TALERA ORB app v8 — keep the organic lab material, replace only the old billiard-ball visual. */
.core-wrap{overflow:visible!important}
.halo{display:none!important}
.core,.core.active,.core.listening{
  background:transparent!important;
  box-shadow:none!important;
  filter:none!important;
  border-radius:50%!important;
  overflow:visible!important;
  isolation:isolate;
  animation:none!important;
  transform:scale(calc(1 + var(--awake)*.12 + var(--voice)*.03))!important;
  transition:transform .58s cubic-bezier(.18,.72,.2,1)!important;
}
.core::before,.core::after{display:none!important}
.talera-orb-canvas{
  position:absolute;
  width:148%;height:148%;
  left:-24%;top:-24%;
  display:block;
  pointer-events:none;
  background:transparent!important;
  z-index:0;
}
`;

const APP_ORB_SCRIPT = String.raw`
(function(){
  const TAU=Math.PI*2;
  const LOOP=30;

  const VERTEX=`attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
  const FRAGMENT=`
precision highp float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_phase;
uniform float u_awake;
uniform float u_voice;
const float PI=3.141592653589793;
const float TAU=6.283185307179586;
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise2(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1.,0.));float c=hash21(i+vec2(0.,1.));float d=hash21(i+vec2(1.,1.));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.;float a=.53;mat2 m=mat2(1.62,1.18,-1.18,1.62);for(int i=0;i<5;i++){v+=a*noise2(p);p=m*p+.19;a*=.48;}return v;}
vec2 rot(vec2 p,float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*p;}
vec2 orbit(float ph,float h,float sx,float sy){return vec2(sin(ph*h)*sx,cos(ph*h)*sy);}
void main(){
  vec2 p=(v_uv-.5)*2.;p.x*=u_resolution.x/u_resolution.y;
  float ph=u_phase;float awake=clamp(u_awake,0.,1.);float voice=clamp(u_voice,0.,1.);
  float activity=clamp(awake*.7+voice*.55,0.,1.);
  float d=length(p);float ang=atan(p.y,p.x);

  /* Keep the v6-like organic material and silhouette. Breathing is subtle in rest, stronger when active. */
  float idleBreath=sin(ph*3.0);       /* 10 s */
  float liveBreath=sin(ph*6.0+.35);   /* 5 s */
  float breath=mix(idleBreath,liveBreath,activity);
  float breathScale=1.0+mix(.006,.018,activity)*breath;

  float perimeter=noise2(vec2(ang*.64+4.0,2.1+sin(ph*2.)*.16+cos(ph)*.10));
  float edge=.600*breathScale
    +breathScale*(.0055*sin(ang*3.+ph*2.)+.0038*sin(ang*5.-ph+1.1)+.0022*sin(ang*7.+ph*3.+2.3)+(perimeter-.5)*.007);

  /* Blue translucent boundary; no white rim. */
  float body=smoothstep(edge+.030,edge-.052,d);
  float core=smoothstep(edge-.012,edge-.067,d);
  float shell=clamp(body-core,0.,1.);
  float aura=smoothstep(edge+.105,edge+.004,d)*(1.-body);
  aura*=.055+.018*activity;

  vec2 q=p/max(edge,.001);
  float radial=clamp(length(q),0.,1.2);

  /* All paths are integer harmonics of the same phase: exact 30-second loop. */
  vec2 driftA=orbit(ph,1.,.32,.27);
  vec2 driftB=orbit(ph+1.4,2.,.25,.30);
  vec2 driftC=orbit(ph+2.2,3.,.18,.20);
  vec2 fastA=orbit(ph,2.,.32,.27);
  vec2 fastB=orbit(ph+1.4,4.,.25,.30);
  vec2 fastC=orbit(ph+2.2,6.,.18,.20);
  driftA=mix(driftA,fastA,activity*.72);
  driftB=mix(driftB,fastB,activity*.72);
  driftC=mix(driftC,fastC,activity*.72);

  vec2 warp1=vec2(fbm(q*1.44+driftA+vec2(2.3,5.1)),fbm(q*1.44+vec2(-driftA.y,driftA.x)+vec2(7.8,1.6)))-.5;
  vec2 warp2=vec2(fbm(rot(q,.72)*1.95+driftB+9.2),fbm(rot(q,-.51)*1.95+vec2(-driftB.y,driftB.x)+13.7))-.5;
  vec2 flow=q+warp1*.78+warp2*.27;
  flow.x+=.105*sin(flow.y*2.9+ph*mix(1.,2.,activity));
  flow.y+=.090*cos(flow.x*2.55-ph*mix(2.,4.,activity));

  float n1=fbm(flow*2.0+driftA*.50);
  float n2=fbm(rot(flow,.60)*3.0+driftB*.57+4.4);
  float n3=fbm(rot(flow,-.42)*4.35+driftC*.65+8.7);
  float density=clamp(n1*.58+n2*.28+n3*.14,0.,1.);
  float cloud=smoothstep(.34,.75,density);
  float milk=smoothstep(.39,.69,n1+.12*sin((flow.x+flow.y)*4.5+ph*2.));
  float wisps=smoothstep(.44,.74,abs(n2-n1)*1.92);
  float depthField=fbm(q*1.24+warp1*.38+driftC*.36+17.0);
  float depth=smoothstep(.26,.80,depthField);

  /* Internal torch. It never becomes an outer highlight. */
  vec2 lampPos=orbit(ph+.6,1.,.34,.29)+vec2(-.05,-.04);
  vec2 lv=q-lampPos;float lampDist=dot(lv,lv);
  float lamp=exp(-1.85*lampDist);
  vec2 dir=normalize(orbit(ph+1.,1.,1.,.74)+vec2(.001));
  float cone=smoothstep(-.28,.72,dot(normalize(lv+vec2(.001)),dir))*exp(-1.08*lampDist);
  float thinness=1.-smoothstep(.36,.82,density);
  float lampTexture=.48+.52*fbm(flow*1.30+driftC*.34+22.0);
  float innerMask=1.-smoothstep(.73,.97,radial);
  float pulse=.91+.07*sin(ph*5.)+.02*sin(ph*2.);
  float transmission=(lamp*.70+cone*.33)*(.42+.82*thinness)*lampTexture*innerMask*pulse;

  vec2 bouncePos=orbit(ph+2.4,2.,.23,.19)+vec2(.17,.13);
  float bounce=exp(-3.1*dot(q-bouncePos,q-bouncePos))*(.50+.50*n2)*innerMask;

  vec3 deep=vec3(.27,.55,.74);vec3 blue=vec3(.46,.70,.85);vec3 pale=vec3(.73,.87,.95);vec3 milkCol=vec3(.88,.95,.985);vec3 lightCol=vec3(.985,.997,1.0);vec3 edgeBlue=vec3(.49,.73,.88);
  vec3 col=mix(blue,deep,depth*.44);
  col=mix(col,pale,cloud*.67);
  col=mix(col,milkCol,milk*.50);
  col=mix(col,vec3(.63,.81,.92),wisps*.16);
  col=mix(col,lightCol,clamp(transmission*.84,0.,.72));
  col=mix(col,milkCol,bounce*.20);

  /* Keep the organic blue edge; explicitly suppress internal white at the perimeter. */
  float edgeZone=smoothstep(.76,1.01,radial);
  col=mix(col,edgeBlue,edgeZone*.52);
  col*=1.-.035*smoothstep(.82,1.,radial);
  col=mix(col,edgeBlue,shell*.27);

  vec3 auraColor=vec3(.54,.77,.90);
  vec3 straightColor=mix(auraColor,col,body);
  float alpha=max(body,aura);
  gl_FragColor=vec4(straightColor,alpha);
}`;

  function makeShader(gl,type,src){
    const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const msg=gl.getShaderInfoLog(s)||'shader error';gl.deleteShader(s);throw new Error(msg);}return s;
  }

  function mount(core){
    if(!core||core.dataset.organicOrb==='1')return;
    core.dataset.organicOrb='1';
    const canvas=document.createElement('canvas');canvas.className='talera-orb-canvas';canvas.setAttribute('aria-hidden','true');core.appendChild(canvas);
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false});
    if(!gl)return;
    try{
      const vs=makeShader(gl,gl.VERTEX_SHADER,VERTEX);const fs=makeShader(gl,gl.FRAGMENT_SHADER,FRAGMENT);
      const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'link error');
      gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const pos=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      const resLoc=gl.getUniformLocation(program,'u_resolution');const phaseLoc=gl.getUniformLocation(program,'u_phase');const awakeLoc=gl.getUniformLocation(program,'u_awake');const voiceLoc=gl.getUniformLocation(program,'u_voice');
      const started=performance.now();
      function resize(){const r=canvas.getBoundingClientRect();const dpr=Math.min(2,window.devicePixelRatio||1);const w=Math.max(180,Math.round(r.width*dpr));const h=Math.max(180,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}}
      function frame(now){
        if(!canvas.isConnected)return;
        resize();
        const root=getComputedStyle(document.documentElement);const awake=parseFloat(root.getPropertyValue('--awake'))||0;const voice=parseFloat(root.getPropertyValue('--voice'))||0;
        const phase=TAU*(((now-started)/1000)%LOOP)/LOOP;
        gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform2f(resLoc,canvas.width,canvas.height);gl.uniform1f(phaseLoc,phase);gl.uniform1f(awakeLoc,awake);gl.uniform1f(voiceLoc,voice);gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }catch(e){console.warn('TALERA organic ORB unavailable',e);}
  }

  function scan(){document.querySelectorAll('.core').forEach(mount);}
  scan();
  const app=document.getElementById('app');if(app)new MutationObserver(scan).observe(app,{childList:true,subtree:true});
})();
`;

function enhance(html){
  let out=html;
  if(out.includes('</style>'))out=out.replace('</style>',APP_ORB_STYLE+'\n</style>');
  else out=out.replace('</head>','<style>'+APP_ORB_STYLE+'</style></head>');
  out=out.replace('</body>','<script>'+APP_ORB_SCRIPT+'</script></body>');
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
    const headers=new Headers(response.headers);headers.delete('content-length');headers.set('cache-control','no-store');headers.set('x-talera-orb-app','organic-v8');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
