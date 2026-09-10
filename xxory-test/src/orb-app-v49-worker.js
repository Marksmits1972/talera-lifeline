import baseWorker from "./worker.js";

const ORB_V49_STYLE = String.raw`
/* TALERA ORB v49 — layered living cloud core: readable cloud banks, valleys and inner light. */
.core-wrap{
  position:relative!important;
  width:min(58vw,250px)!important;
  min-width:190px!important;
  min-height:190px!important;
  aspect-ratio:1/1!important;
  display:grid!important;
  place-items:center!important;
  overflow:visible!important;
}
.halo{display:none!important}
.core,.core.active,.core.listening{
  display:block!important;
  width:80%!important;
  height:80%!important;
  position:relative!important;
  opacity:1!important;
  visibility:visible!important;
  overflow:hidden!important;
  isolation:isolate!important;
  border-radius:50% 50% 49% 51% / 51% 49% 51% 49%!important;
  background:rgba(151,199,222,.38)!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    0 14px 40px rgba(46,99,130,.05),
    0 0 24px rgba(88,172,214,.15),
    0 0 72px rgba(88,172,214,.09)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.115 + var(--voice)*.042))!important;
  transition:transform .20s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb49Pulse 5.6s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.35s!important}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v49-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v49";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}
@keyframes taleraOrb49Pulse{
  0%,16%,100%{scale:.984;border-radius:50% 50% 49% 51% / 51% 49% 51% 49%}
  38%{scale:1.015;border-radius:51% 49% 50% 50% / 49% 52% 48% 51%}
  51%{scale:1.034}
  63%{scale:1.003}
  75%{scale:1.020}
}
`;

const ORB_V49_SCRIPT = String.raw`<script>(function(){
  var LOW=194;

  /* Independent calibration knobs. */
  var CLOUD_LEVEL=.515;
  var EDGE_DETAIL=.118;
  var SHADOW_STRENGTH=.76;
  var LIGHT_STRENGTH=.54;
  var HAZE_STRENGTH=.12;
  var MOTION=1.12;

  function hash2(x,y,s){
    var n=x*127.1+y*311.7+s*74.7;
    return (Math.sin(n)*43758.5453123)%1;
  }
  function h01(x,y,s){var v=hash2(x,y,s);return v<0?v+1:v}
  function fade(t){return t*t*(3-2*t)}
  function mix(a,b,t){return a+(b-a)*t}
  function clamp(v,a,b){return v<a?a:(v>b?b:v)}
  function smoothstep(a,b,x){
    var t=clamp((x-a)/(b-a),0,1);
    return t*t*(3-2*t);
  }
  function noise2(x,y,s){
    var x0=Math.floor(x),y0=Math.floor(y),tx=x-x0,ty=y-y0;
    var a=h01(x0,y0,s),b=h01(x0+1,y0,s),c=h01(x0,y0+1,s),d=h01(x0+1,y0+1,s);
    var ux=fade(tx),uy=fade(ty);
    return mix(mix(a,b,ux),mix(c,d,ux),uy);
  }
  function fbm(x,y,s){
    var v=0,a=.58,f=1,n=0;
    for(var o=0;o<5;o++){
      v+=noise2(x*f,y*f,s+o*23)*a;
      n+=a;
      f*=1.97;
      a*=.47;
    }
    return v/n;
  }

  function mountCore(core){
    if(core.getAttribute('data-orb-v49')==='1')return;
    core.setAttribute('data-orb-v49','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v49-canvas';
    canvas.setAttribute('aria-hidden','true');
    core.appendChild(canvas);

    var ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx)return;

    var off=document.createElement('canvas');
    off.width=LOW;off.height=LOW;
    var octx=off.getContext('2d',{alpha:true});
    var img=octx.createImageData(LOW,LOW);
    var data=img.data;
    var last=0;

    function resize(){
      var r=core.getBoundingClientRect();
      var dpr=Math.min(window.devicePixelRatio||1,2);
      var w=Math.max(1,Math.round(r.width*dpr));
      var h=Math.max(1,Math.round(r.height*dpr));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
    }

    resize();
    window.addEventListener('resize',resize,{passive:true});

    function render(now){
      requestAnimationFrame(render);
      if(now-last<38)return;
      last=now;
      resize();

      var t=now/1000;
      var cs=getComputedStyle(core);
      var awake=parseFloat(cs.getPropertyValue('--awake'))||0;
      var voiceRaw=parseFloat(cs.getPropertyValue('--voice'))||0;
      var voice=Math.min(.55,Math.max(0,voiceRaw));
      var life=MOTION*(1+awake*.14+voice*.13);
      var breath=Math.sin(t*.74)*.008;

      /* One moving internal light zone. It illuminates thin atmosphere, never the surface. */
      var lightX=.58+Math.sin(t*.070)*.040;
      var lightY=.38+Math.cos(t*.061)*.030;

      for(var py=0;py<LOW;py++){
        var ny=py/(LOW-1);

        for(var px=0;px<LOW;px++){
          var nx=px/(LOW-1);
          var dx=nx-.5,dy=ny-.5;
          var rr=Math.sqrt(dx*dx+dy*dy);
          var i=(py*LOW+px)*4;

          if(rr>.515){data[i+3]=0;continue}

          var x=(nx-.5)*2.18;
          var y=(ny-.5)*2.18;

          /* Large-scale organic warp. */
          var q1=fbm(x*.42+t*.0040*life+1.6,y*.40-t*.0034*life-2.2,31)-.5;
          var q2=fbm(x*.38-t*.0033*life-2.7,y*.45+t*.0038*life+2.3,59)-.5;
          var q3=fbm(x*.68+t*.0046*life+3.1,y*.64+t*.0030*life-1.5,83)-.5;
          var wx=x+q1*.66+q2*.23+q3*.10;
          var wy=y+q2*.61-q1*.21-q3*.075;

          /* Two differently oriented whole-volume cloud systems. */
          var u1=wx*.94+wy*.20;
          var v1=-wx*.16+wy*.98;
          var u2=wx*.78-wy*.35;
          var v2=wx*.30+wy*.86;

          var deck1Macro=fbm(u1*.56+t*.0044*life,v1*.52-t*.0035*life,101);
          var deck1Mid=fbm(u1*1.08-t*.0038*life+1.5,v1*.98+t*.0031*life-1.0,127);
          var deck1=deck1Macro*.72+deck1Mid*.28;

          var deck2Macro=fbm(u2*.62-t*.0041*life+2.0,v2*.58+t*.0037*life-1.7,157);
          var deck2Mid=fbm(u2*1.21+t*.0040*life-2.3,v2*1.10-t*.0035*life+1.6,181);
          var deck2=deck2Macro*.70+deck2Mid*.30;

          var blanket=fbm(wx*.42+t*.0025*life+2.8,wy*.39-t*.0021*life-2.9,211);
          var mass=Math.max(deck1*.985,deck2*.975);
          mass=mass*.78+blanket*.22+breath;

          /* Broad irregular thinning creates opklaringen without cutting round holes. */
          var thinA=fbm(wx*.74-t*.0022*life+1.1,wy*.69+t*.0019*life-1.8,239);
          var thinB=fbm(wx*1.24+t*.0019*life-2.0,wy*1.16-t*.0017*life+2.5,263);
          var thinning=smoothstep(.53,.72,thinA*.68+thinB*.32);
          mass-=thinning*.060;

          /* Detail only near the cloud transition: keeps bodies coherent. */
          var edgeMid=fbm(wx*2.05+t*.0034*life,wy*1.91-t*.0030*life,293)-.5;
          var edgeFine=fbm(wx*3.85-t*.0027*life+1.9,wy*3.56+t*.0025*life-2.3,317)-.5;

          var rawMask=smoothstep(CLOUD_LEVEL-.095,CLOUD_LEVEL+.045,mass);
          var edgeWeight=rawMask*(1-rawMask)*4;
          var shaped=mass+(edgeMid*EDGE_DETAIL+edgeFine*EDGE_DETAIL*.34)*edgeWeight;

          var haze=smoothstep(CLOUD_LEVEL-.135,CLOUD_LEVEL-.035,shaped);
          var cloud=smoothstep(CLOUD_LEVEL-.060,CLOUD_LEVEL+.038,shaped);
          var dense=smoothstep(CLOUD_LEVEL+.012,CLOUD_LEVEL+.118,shaped);

          /* Secondary depth fields produce readable valleys and overlapping banks. */
          var depth1=fbm(wx*.86-t*.0026*life,wy*.80+t*.0023*life,347);
          var depth2=fbm(wx*1.34+t*.0024*life+1.7,wy*1.26-t*.0021*life-2.0,367);
          var depth3=fbm(wx*2.05-t*.0019*life-1.2,wy*1.88+t*.0018*life+2.2,389);

          var valley1=smoothstep(.48,.70,depth1);
          var valley2=smoothstep(.51,.73,depth2);
          var valley3=smoothstep(.54,.74,depth3);

          var shadow=(
            cloud*(valley1*.34+valley2*.25+valley3*.14)
            +dense*(valley1*.18+valley2*.13)
          )*SHADOW_STRENGTH;
          shadow=clamp(shadow,0,.62);

          /* Thin internal atmosphere can glow; dense cloud cannot. */
          var ldx=(nx-lightX+q1*.045)/.24;
          var ldy=(ny-lightY+q2*.040)/.27;
          var lamp=Math.exp(-(ldx*ldx+ldy*ldy)*2.1);
          var lightNoise=.76+fbm(wx*.76+t*.0017*life,wy*.70-t*.0015*life,421)*.24;
          var openFactor=clamp((1-cloud*.94)*(.30+haze*.46),0,1);
          var light=lamp*lightNoise*openFactor*LIGHT_STRENGTH;

          /* Bright silver lining only on cloud edges nearest the inner light. */
          var boundary=haze*(1-cloud);
          var rim=boundary*lamp*clamp(.58+edgeMid*.50+edgeFine*.18,0,1)*.72;

          /* Base atmosphere: grey-cyan, not empty sky blue. */
          var air=fbm(wx*.34+t*.0011*life,wy*.32-t*.0010*life,449)-.5;
          var R=132+air*7;
          var G=184+air*9;
          var B=211+air*10;

          /* A little suspended haze, substantially less than v47/v48. */
          var suspended=HAZE_STRENGTH+haze*.10;
          suspended=clamp(suspended,0,.27);
          R=R*(1-suspended)+193*suspended;
          G=G*(1-suspended)+220*suspended;
          B=B*(1-suspended)+235*suspended;

          /* Cloud body: brighter but not washed out. */
          var whiteAmt=cloud*.37+dense*.11;
          whiteAmt=clamp(whiteAmt,0,.55);
          R=R*(1-whiteAmt)+232*whiteAmt;
          G=G*(1-whiteAmt)+244*whiteAmt;
          B=B*(1-whiteAmt)+250*whiteAmt;

          /* Internal valleys carry the organism's depth. */
          R=R*(1-shadow)+60*shadow;
          G=G*(1-shadow)+116*shadow;
          B=B*(1-shadow)+158*shadow;

          R=R*(1-rim)+252*rim;
          G=G*(1-rim)+255*rim;
          B=B*(1-rim)+255*rim;

          R=R*(1-light)+255*light;
          G=G*(1-light)+255*light;
          B=B*(1-light)+255*light;

          /* Soft containment only — never a dark planetary rim. */
          var containment=smoothstep(.462,.515,rr)*.040;
          R=R*(1-containment)+179*containment;
          G=G*(1-containment)+214*containment;
          B=B*(1-containment)+233*containment;

          var alpha=1-smoothstep(.493,.518,rr)*.14;
          data[i]=clamp(R,0,255);
          data[i+1]=clamp(G,0,255);
          data[i+2]=clamp(B,0,255);
          data[i+3]=Math.round(255*alpha);
        }
      }

      octx.putImageData(img,0,0);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(off,0,0,canvas.width,canvas.height);

      /* Broad faint inner glow, kept inside the atmosphere. */
      var gx=canvas.width*lightX,gy=canvas.height*lightY;
      var g=ctx.createRadialGradient(gx,gy,0,gx,gy,canvas.width*.22);
      g.addColorStop(0,'rgba(255,255,255,.045)');
      g.addColorStop(.30,'rgba(246,253,255,.020)');
      g.addColorStop(1,'rgba(226,245,253,0)');
      ctx.fillStyle=g;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }

    requestAnimationFrame(render);
  }

  function mount(){document.querySelectorAll('.core').forEach(mountCore)}
  mount();
  var root=document.getElementById('app')||document.body;
  new MutationObserver(mount).observe(root,{childList:true,subtree:true});
})();</scr`+`ipt>`;

function enhance(html){
  return html
    .replace('</head>','<style>'+ORB_V49_STYLE+'</style></head>')
    .replace('</body>',ORB_V49_SCRIPT+'</body>');
}

export default {
  async fetch(request,env,ctx){
    const response=await baseWorker.fetch(request,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(request.method==='HEAD'||!type.includes('text/html'))return response;

    const html=await response.text();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control','no-store');
    headers.set('x-talera-orb-app','organic-v49-layered-living-cloud-core');

    return new Response(enhance(html),{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }
};
