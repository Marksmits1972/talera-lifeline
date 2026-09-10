import baseWorker from "./worker.js";

const ORB_V47_STYLE = String.raw`
/* TALERA ORB v47 — living cloudy core: denser internal atmosphere, less blue-sky read. */
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
  background:rgba(174,211,228,.44)!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    0 14px 40px rgba(46,99,130,.045),
    0 0 24px rgba(94,181,222,.15),
    0 0 74px rgba(94,181,222,.09)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.115 + var(--voice)*.042))!important;
  transition:transform .20s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb47Pulse 5.7s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.45s!important}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v47-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v47";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}
@keyframes taleraOrb47Pulse{
  0%,16%,100%{scale:.984;border-radius:50% 50% 49% 51% / 51% 49% 51% 49%}
  39%{scale:1.014;border-radius:51% 49% 50% 50% / 49% 52% 48% 51%}
  52%{scale:1.033}
  64%{scale:1.003}
  76%{scale:1.019}
}
`;

const ORB_V47_SCRIPT = String.raw`<script>(function(){
  var LOW=190;

  /*
    V47 calibration knobs.
    The important change is not a new renderer:
    more continuous cloud body, less open blue air,
    richer internal depth and a non-surface light well.
  */
  var CLOUD_DENSITY=.438;
  var CLOUD_CONTRAST=.102;
  var EDGE_DETAIL=.108;
  var VEIL_STRENGTH=.25;
  var CAVITY_DEPTH=.070;
  var LIGHT_STRENGTH=.50;
  var SHADOW_STRENGTH=.54;
  var MOTION=1.10;

  function hash2(x,y,s){
    var n=x*127.1+y*311.7+s*74.7;
    return (Math.sin(n)*43758.5453123)%1;
  }
  function h01(x,y,s){var v=hash2(x,y,s);return v<0?v+1:v}
  function fade(t){return t*t*(3-2*t)}
  function mix(a,b,t){return a+(b-a)*t}
  function clamp(v,a,b){return v<a?a:(v>b?b:v)}
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
      f*=1.98;
      a*=.47;
    }
    return v/n;
  }
  function smoothstep(a,b,x){
    var t=clamp((x-a)/(b-a),0,1);
    return t*t*(3-2*t);
  }
  function ridge(n){return 1-Math.abs(n*2-1)}

  function mountCore(core){
    if(core.getAttribute('data-orb-v47')==='1')return;
    core.setAttribute('data-orb-v47','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v47-canvas';
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
      if(canvas.width!==w||canvas.height!==h){
        canvas.width=w;canvas.height=h;
      }
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
      var life=MOTION*(1+awake*.14+voice*.12);

      /* Gentle biological density breathing; it does not depend on speech content. */
      var breath=Math.sin(t*.77)*.010;

      /* Light well wanders off-centre so it cannot become a pearl or globe highlight. */
      var cavityX=.61+Math.sin(t*.058)*.020;
      var cavityY=.37+Math.cos(t*.052)*.017;

      for(var py=0;py<LOW;py++){
        var ny=py/(LOW-1);

        for(var px=0;px<LOW;px++){
          var nx=px/(LOW-1);
          var dx=nx-.5,dy=ny-.5;
          var rr=Math.sqrt(dx*dx+dy*dy);
          var i=(py*LOW+px)*4;

          if(rr>.515){
            data[i+3]=0;
            continue;
          }

          var x=(nx-.5)*2.13;
          var y=(ny-.5)*2.13;

          /* Slow continuous domain warp. No lobe centres, no bubble primitives. */
          var q1=fbm(x*.43+t*.0044*life+1.8,y*.41-t*.0037*life-2.2,31)-.5;
          var q2=fbm(x*.39-t*.0037*life-2.5,y*.46+t*.0042*life+2.4,59)-.5;
          var q3=fbm(x*.70+t*.0050*life+3.3,y*.66+t*.0033*life-1.4,83)-.5;

          var wx=x+q1*.64+q2*.25+q3*.095;
          var wy=y+q2*.59-q1*.22-q3*.072;

          /*
            Three whole-volume atmosphere slices.
            V47 blends them more than v46 so the interior reads as one organism,
            not as blue air with a few cloud islands.
          */
          var a0=fbm(wx*.48+t*.0049*life,wy*.45-t*.0037*life,101);
          var a1=fbm(wx*.92-t*.0040*life+1.5,wy*.87+t*.0034*life-1.1,127);
          var fieldA=a0*.74+a1*.26;

          var b0=fbm((wx+1.18)*.58-t*.0046*life,(wy-.86)*.54+t*.0041*life,157);
          var b1=fbm(wx*1.14+t*.0044*life-2.2,wy*1.06-t*.0039*life+1.7,181);
          var fieldB=b0*.70+b1*.30;

          var c0=fbm((wx-1.38)*.66+t*.0040*life,(wy+1.08)*.62+t*.0037*life,211);
          var c1=fbm(wx*1.31-t*.0044*life+2.5,wy*1.21+t*.0041*life-2.0,239);
          var fieldC=c0*.68+c1*.32;

          var blend=fieldA*.39+fieldB*.34+fieldC*.27;
          var crest=Math.max(fieldA,fieldB,fieldC);
          var blanket=(a0+b0+c0)/3;
          var volume=blend*.64+crest*.36;
          volume=Math.max(volume,blanket*.79+.103);

          /* Broad veil: living cloudy medium everywhere, never plain blue sky. */
          var veilMacro=fbm(wx*.34+t*.0023*life+2.7,wy*.32-t*.0020*life-3.1,247);
          var veilRidge=ridge(fbm(wx*.88-t*.0028*life-1.4,wy*.82+t*.0025*life+1.8,263));
          var veil=(veilMacro*.72+veilRidge*.28)-.5;
          volume+=veil*VEIL_STRENGTH*.24;

          /* Billows add depth without forming round cells. */
          var ridgeA=ridge(fbm(wx*1.48+t*.0036*life,wy*1.38-t*.0032*life,277));
          var ridgeB=ridge(fbm(wx*2.22-t*.0032*life+1.3,wy*2.06+t*.0029*life-1.9,293));
          volume+=(ridgeA*.72+ridgeB*.28-.5)*.082;

          /*
            Small irregular cavity, intentionally weak.
            It is only somewhere for light to breathe through.
          */
          var cavN1=fbm(wx*.80-t*.0020*life+1.2,wy*.74+t*.0017*life-1.8,311)-.5;
          var cavN2=fbm(wx*1.47+t*.0018*life-2.1,wy*1.34-t*.0015*life+2.6,337)-.5;
          var cdx=(nx-cavityX+q1*.034+cavN1*.030)/.205;
          var cdy=(ny-cavityY+q2*.036-cavN1*.022)/.235;
          var cdist=Math.sqrt(cdx*cdx+cdy*cdy)+cavN1*.25+cavN2*.090;
          var cavity=1-smoothstep(.50,1.06,cdist);

          /* A narrow broken clearing path instead of an empty blue region. */
          var streamN=fbm(wx*.69-t*.0014*life+3.8,wy*.64+t*.0013*life-3.0,359)-.5;
          var streamAxis=Math.abs((ny-.54)-(-.19*(nx-.5)+q2*.067+streamN*.073));
          var stream=(1-smoothstep(.040,.125,streamAxis))
            *smoothstep(.10,.38,nx)
            *(1-smoothstep(.74,.96,nx));

          var carved=volume-cavity*CAVITY_DEPTH-stream*.022+breath;

          /*
            Edge detail changes only the transition band.
            This keeps the cloud masses continuous while giving them organic edges.
          */
          var edgeMid=fbm(wx*2.18+t*.0037*life,wy*2.00-t*.0032*life,383)-.5;
          var edgeFine=fbm(wx*4.12-t*.0029*life+1.8,wy*3.78+t*.0027*life-2.3,409)-.5;

          var baseMask=smoothstep(
            CLOUD_DENSITY-CLOUD_CONTRAST,
            CLOUD_DENSITY+CLOUD_CONTRAST*.34,
            carved
          );
          var boundaryWeight=baseMask*(1-baseMask)*4;
          var shaped=carved+
            (edgeMid*EDGE_DETAIL+edgeFine*EDGE_DETAIL*.31)*boundaryWeight;

          var haze=smoothstep(CLOUD_DENSITY-.150,CLOUD_DENSITY-.035,shaped);
          var cloud=smoothstep(CLOUD_DENSITY-.068,CLOUD_DENSITY+.040,shaped);
          var dense=smoothstep(CLOUD_DENSITY+.010,CLOUD_DENSITY+.122,shaped);

          /*
            A second translucent depth layer behind the main mask.
            It makes the core feel filled, even where the front cloud opens.
          */
          var rear=fbm(wx*.73-t*.0025*life+2.0,wy*.69+t*.0022*life-1.7,431);
          var rearCloud=smoothstep(.405,.575,rear)*(.72-cloud*.22);

          var depthN=fbm(wx*.82-t*.0028*life,wy*.78+t*.0025*life,449);
          var valleyN=fbm(wx*1.30+t*.0025*life+1.7,wy*1.22-t*.0023*life-2.0,463);
          var shadow=(
            dense*(smoothstep(.43,.69,depthN)*.70+smoothstep(.51,.73,valleyN)*.30)
            +rearCloud*smoothstep(.52,.73,valleyN)*.20
          )*SHADOW_STRENGTH;

          /*
            Internal illumination exists only in thinner atmosphere.
            No surface specular spot.
          */
          var openAir=clamp(
            (cavity*.58+stream*.16)*(1-cloud*.93),
            0,1
          );
          var lightTexture=.74+fbm(wx*.70+t*.0016*life,wy*.66-t*.0014*life,487)*.26;
          var light=openAir*lightTexture*LIGHT_STRENGTH;

          var boundary=haze*(1-cloud);
          var openingNear=smoothstep(.10,.74,cavity)+stream*.22;
          var rim=boundary
            *clamp(openingNear,0,1)
            *clamp(.61+edgeMid*.46+edgeFine*.16,0,1)
            *.58;

          /*
            Base colour is deliberately grey-milky cyan rather than sky blue.
            Even open regions retain suspended mist.
          */
          var airN=fbm(wx*.35+t*.0012*life,wy*.33-t*.0010*life,509)-.5;
          var R=154+airN*7;
          var G=201+airN*8;
          var B=223+airN*9;

          var suspended=.16+haze*.20+rearCloud*.10;
          suspended=clamp(suspended,0,.52);
          R=R*(1-suspended)+214*suspended;
          G=G*(1-suspended)+234*suspended;
          B=B*(1-suspended)+244*suspended;

          /* Main milky cloud volume. */
          var whiteAmt=cloud*.56+dense*.13+rearCloud*.08;
          whiteAmt=clamp(whiteAmt,0,.76);
          R=R*(1-whiteAmt)+239*whiteAmt;
          G=G*(1-whiteAmt)+248*whiteAmt;
          B=B*(1-whiteAmt)+252*whiteAmt;

          /* Blue-grey internal valleys create living depth, not planetary shading. */
          shadow=clamp(shadow,0,.52);
          R=R*(1-shadow)+72*shadow;
          G=G*(1-shadow)+137*shadow;
          B=B*(1-shadow)+177*shadow;

          /* Silver lining and light through a real thinning in the cloud mass. */
          R=R*(1-rim)+252*rim;
          G=G*(1-rim)+255*rim;
          B=B*(1-rim)+255*rim;

          R=R*(1-light)+255*light;
          G=G*(1-light)+255*light;
          B=B*(1-light)+255*light;

          /* Edge stays atmosphere, never a dark globe contour. */
          var containment=smoothstep(.458,.515,rr)*.045;
          R=R*(1-containment)+190*containment;
          G=G*(1-containment)+223*containment;
          B=B*(1-containment)+239*containment;

          var alpha=1-smoothstep(.492,.518,rr)*.14;
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

      /* Soft local interior glow; no glossy sphere highlight. */
      var gx=canvas.width*cavityX,gy=canvas.height*cavityY;
      var g=ctx.createRadialGradient(gx,gy,0,gx,gy,canvas.width*.235);
      g.addColorStop(0,'rgba(255,255,255,.047)');
      g.addColorStop(.32,'rgba(246,253,255,.022)');
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
    .replace('</head>','<style>'+ORB_V47_STYLE+'</style></head>')
    .replace('</body>',ORB_V47_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v47-living-cloud-core');

    return new Response(enhance(html),{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }
};
