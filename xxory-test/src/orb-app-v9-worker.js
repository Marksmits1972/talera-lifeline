import previousWorker from "./orb-webgl-v7-worker.js";

const APP_ORB_STYLE = String.raw`
/* TALERA ORB app v9 — preserve the v6 organic material; only add app state/scale around it. */
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
  transition:transform .42s cubic-bezier(.18,.72,.2,1)!important;
}
.core::before,.core::after{display:none!important}
.talera-organic-orb{
  position:absolute;
  width:150%;height:150%;
  left:-25%;top:-25%;
  display:block;
  pointer-events:none;
  background:transparent!important;
  z-index:2;
}
`;

function organicOrbClient(){
  const VERTEX = `attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=a_position*0.5+0.5;gl_Position=vec4(a_position,0.0,1.0);}`;
  const FRAGMENT = `
precision highp float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise2(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1.0,0.0));float c=hash21(i+vec2(0.0,1.0));float d=hash21(i+vec2(1.0,1.0));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0;float a=.53;mat2 m=mat2(1.62,1.18,-1.18,1.62);for(int i=0;i<5;i++){v+=a*noise2(p);p=m*p+.19;a*=.48;}return v;}
vec2 rot(vec2 p,float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*p;}
void main(){
  vec2 p=(v_uv-.5)*2.0;p.x*=u_resolution.x/u_resolution.y;float t=u_time;float d=length(p);float ang=atan(p.y,p.x);
  float perimeter=noise2(vec2(ang*.64+4.0,t*.024));
  float edge=.600+.0055*sin(ang*3.0+t*.14)+.0038*sin(ang*5.0-t*.11+1.1)+.0022*sin(ang*7.0+t*.078+2.3)+(perimeter-.5)*.007;
  float body=smoothstep(edge+.028,edge-.052,d);
  float core=smoothstep(edge-.010,edge-.065,d);
  float shell=clamp(body-core,0.0,1.0);
  float aura=smoothstep(edge+.115,edge+.008,d)-smoothstep(edge+.030,edge-.012,d);aura=max(aura,0.0)*(.88+.12*sin(t*.31));
  vec2 q=p/max(edge,.001);q=rot(q,.018*sin(t*.105));
  vec2 warp1=vec2(fbm(q*1.44+vec2(t*.050,-t*.030)+vec2(2.3,5.1)),fbm(q*1.44+vec2(-t*.035,t*.044)+vec2(7.8,1.6)))-.5;
  vec2 warp2=vec2(fbm(rot(q,.72)*1.95+vec2(-t*.032,t*.027)+9.2),fbm(rot(q,-.51)*1.95+vec2(t*.029,t*.037)+13.7))-.5;
  vec2 flow=q+warp1*.78+warp2*.27;flow.x+=.105*sin(flow.y*2.9+t*.16);flow.y+=.090*cos(flow.x*2.55-t*.14);
  float n1=fbm(flow*2.0+vec2(t*.036,-t*.046));float n2=fbm(rot(flow,.60)*3.0+vec2(-t*.041,t*.025)+4.4);float n3=fbm(rot(flow,-.42)*4.35+vec2(t*.025,t*.033)+8.7);
  float density=clamp(n1*.58+n2*.28+n3*.14,0.0,1.0);float cloud=smoothstep(.34,.75,density);float milk=smoothstep(.39,.69,n1+.12*sin((flow.x+flow.y)*4.5+t*.21));float wisps=smoothstep(.44,.74,abs(n2-n1)*1.92);float depthField=fbm(q*1.24+warp1*.38+vec2(-t*.024,t*.017)+17.0);float depth=smoothstep(.26,.80,depthField);
  vec2 lampPos=vec2(-.23+.34*sin(t*.135)+.07*sin(t*.047+1.8),-.17+.30*cos(t*.115)-.08*sin(t*.073));
  vec2 lampVec=q-lampPos;float lampRadius=dot(lampVec,lampVec);float lamp=exp(-1.85*lampRadius);float lampTexture=.48+.52*fbm(flow*1.30+vec2(t*.023,-t*.019)+22.0);float lampPulse=.90+.10*sin(t*.78)+.035*sin(t*.29+1.7);lamp*=lampTexture*lampPulse;
  vec2 dir=normalize(vec2(cos(t*.095),sin(t*.095)*.72));float facing=dot(normalize(lampVec+vec2(.0001)),dir);float cone=smoothstep(-.28,.72,facing)*exp(-1.05*lampRadius);cone*=.62+.38*fbm(flow*1.70+vec2(-t*.020,t*.017)+31.0);
  vec2 bouncePos=vec2(.28+.12*cos(t*.082),.22+.15*sin(t*.102));float bounce=exp(-3.0*dot(q-bouncePos,q-bouncePos))*(.50+.50*n2);
  float thinness=1.0-smoothstep(.36,.82,density);float transmission=lamp*(.42+.82*thinness)+cone*(.30+.68*thinness);transmission=clamp(transmission,0.0,1.35);
  vec3 deep=vec3(.27,.55,.74);vec3 blue=vec3(.46,.70,.85);vec3 pale=vec3(.73,.87,.95);vec3 milkCol=vec3(.88,.95,.985);vec3 lightCol=vec3(.985,.997,1.0);
  vec3 col=mix(blue,deep,depth*.44);col=mix(col,pale,cloud*.67);col=mix(col,milkCol,milk*.48);col=mix(col,vec3(.63,.81,.92),wisps*.16);col=mix(col,lightCol,transmission*.82);col=mix(col,milkCol,bounce*.22);
  float radial=clamp(d/max(edge,.001),0.0,1.0);float edgeZone=smoothstep(.74,1.03,radial);col=mix(col,vec3(.48,.72,.87),edgeZone*.24);col*=1.0-.045*smoothstep(.76,1.0,radial);col=mix(col,pale,transmission*shell*.12);
  float grain=(hash21(gl_FragCoord.xy+floor(t*4.0))-.5)*.008;col+=grain*body;
  vec3 auraCol=vec3(.53,.77,.90)*aura*.14;float alphaBody=clamp(body*.96+core*.04,0.0,1.0);vec3 outCol=col*alphaBody+auraCol;float alpha=max(alphaBody,aura*.075);gl_FragColor=vec4(outCol,alpha);
}`;

  function makeShader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const m=gl.getShaderInfoLog(s)||'shader error';gl.deleteShader(s);throw new Error(m);}return s;}
  function mount(core){
    if(!core||core.dataset.organicV9==='1')return;
    core.dataset.organicV9='1';
    const canvas=document.createElement('canvas');canvas.className='talera-organic-orb';canvas.setAttribute('aria-hidden','true');core.appendChild(canvas);
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false});if(!gl)return;
    try{
      const vs=makeShader(gl,gl.VERTEX_SHADER,VERTEX),fs=makeShader(gl,gl.FRAGMENT_SHADER,FRAGMENT);const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'link error');gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      const resLoc=gl.getUniformLocation(program,'u_resolution'),timeLoc=gl.getUniformLocation(program,'u_time');const started=performance.now();
      function resize(){const r=canvas.getBoundingClientRect();const dpr=Math.min(2,window.devicePixelRatio||1);const w=Math.max(220,Math.round(r.width*dpr)),h=Math.max(220,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}}
      function frame(now){if(!canvas.isConnected)return;resize();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform2f(resLoc,canvas.width,canvas.height);gl.uniform1f(timeLoc,(now-started)/1000);gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(frame);}requestAnimationFrame(frame);
    }catch(err){console.warn('TALERA organic ORB v9 unavailable',err);}
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
    const html=await response.text();const headers=new Headers(response.headers);headers.delete('content-length');headers.set('cache-control','no-store');headers.set('x-talera-orb-app','organic-v9');
    return new Response(enhance(html),{status:response.status,statusText:response.statusText,headers});
  }
};
