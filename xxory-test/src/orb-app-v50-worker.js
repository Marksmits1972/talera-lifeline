import baseWorker from "./worker.js";

const ORB_V50_STYLE = String.raw`
/* TALERA ORB v50 — layered cloud banks with clearings, silver lining and internal depth. */
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
  background:rgba(142,194,220,.36)!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    0 14px 40px rgba(46,99,130,.05),
    0 0 24px rgba(86,171,214,.15),
    0 0 72px rgba(86,171,214,.09)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.115 + var(--voice)*.042))!important;
  transition:transform .20s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb50Pulse 5.6s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:4.3s!important}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v50-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v50";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}
@keyframes taleraOrb50Pulse{
  0%,16%,100%{scale:.984;border-radius:50% 50% 49% 51% / 51% 49% 51% 49%}
  38%{scale:1.015;border-radius:51% 49% 50% 50% / 49% 52% 48% 51%}
  51%{scale:1.035}
  63%{scale:1.003}
  75%{scale:1.020}
}
`;

const ORB_V50_SCRIPT = String.raw`<script>(function(){
  var LOW=196;

  /* V50 keeps the v49 renderer but separates the visual controls more clearly. */
  var CLOUD_LEVEL=.495;
  var EDGE_DETAIL=.155;
  var OPENING_STRENGTH=.115;
  var LAYER_SEPARATION=.20;
  var SHADOW_STRENGTH=.82;
  var LIGHT_STRENGTH=.70;
  var HAZE_STRENGTH=.055;
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
    if(core.getAttribute('data-orb-v50')==='1')return;
    core.setAttribute('data-orb-v50','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v50-canvas';
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
      var breath=Math.sin(t*.74)*.007;

      /* Light wanders through the interior rather than sitting on the sphere surface. */
      var lightX=.56+Math.sin(t*.066)*.055;
      var lightY=.37+Math.cos(t*.058)*.040;

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

          /* Large, slow domain warp: one continuous medium, never bubble primitives. */
          var q1=fbm(x*.42+t*.0040*life+1.6,y*.40-t*.0034*life-2.2,31)-.5;
          var q2=fbm(x*.38-t*.0033*life-2.7,y*.45+t*.0038*life+2.3,59)-.5;
          var q3=fbm(x*.68+t*.0046*life+3.1,y*.64+t*.0030*life-1.5,83)-.5;
          var wx=x+q1*.66+q2*.23+q3*.10;
          var wy=y+q2*.61-q1*.21-q3*.075;

          /* Three cloud decks at different orientations/depths. */
          var u1=wx*.94+wy*.20;
          var v1=-wx*.16+wy*.98;
          var u2=wx*.78-wy*.35;
          var v2=wx*.30+wy*.86;
          var u3=wx*.70+wy*.43;
          var v3=-wx*.38+wy*.74;

          var deck1Macro=fbm(u1*.55+t*.0044*life,v1*.51-t*.0035*life,101);
          var deck1Mid=fbm(u1*1.05-t*.0038*life+1.5,v1*.96+t*.0031*life-1.0,127);
          var deck1=deck1Macro*.72+deck1Mid*.28;

          var deck2Macro=fbm(u2*.61-t*.0041*life+2.0,v2*.57+t*.0037*life-1.7,157);
          var deck2Mid=fbm(u2*1.18+t*.0040*life-2.3,v2*1.08-t*.0035*life+1.6,181);
          var deck2=deck2Macro*.70+deck2Mid*.30;

          var deck3Macro=fbm(u3*.47+t*.0031*life-1.8,v3*.45+t*.0027*life+2.4,203);
          var deck3Mid=fbm(u3*.91-t*.0030*life+2.6,v3*.86+t*.0028*life-2.1,223);
          var deck3=deck3Macro*.78+deck3Mid*.22;

          var blanket=fbm(wx*.40+t*.0024*life+2.8,wy*.37-t*.0020*life-2.9,241);
          var mass=Math.max(deck1*.995,deck2*.985,deck3*.955);
          mass=mass*.80+blanket*.20+breath;

          /* Larger irregular clearings, still carved from noise rather than circles. */
          var thinA=fbm(wx*.70-t*.0022*life+1.1,wy*.65+t*.0019*life-1.8,263);
          var thinB=fbm(wx*1.18+t*.0019*life-2.0,wy*1.10-t*.0017*life+2.5,283);
          var thinC=fbm(wx*1.75-t*.0016*life+2.8,wy*1.60+t*.0015*life-1.3,307);
          var openingField=thinA*.56+thinB*.31+thinC*.13;
          var opening=smoothstep(.505,.675,openingField);
          mass-=opening*OPENING_STRENGTH;

          /* Erode only the transition band to create readable cloud edges. */
          var edgeMid=fbm(wx*2.02+t*.0034*life,wy*1.88-t*.0030*life,331)-.5;
          var edgeFine=fbm(wx*3.92-t*.0027*life+1.9,wy*3.60+t*.0025*life-2.3,353)-.5;

          var rawMask=smoothstep(CLOUD_LEVEL-.090,CLOUD_LEVEL+.040,mass);
          var edgeWeight=rawMask*(1-rawMask)*4;
          var shaped=mass+(edgeMid*EDGE_DETAIL+edgeFine*EDGE_DETAIL*.36)*edgeWeight;

          var haze=smoothstep(CLOUD_LEVEL-.130,CLOUD_LEVEL-.035,shaped);
          var cloud=smoothstep(CLOUD_LEVEL-.055,CLOUD_LEVEL+.035,shaped);
          var dense=smoothstep(CLOUD_LEVEL+.010,CLOUD_LEVEL+.108,shaped);

          /* Front and rear decks are shaded separately so they read as depth, not flat texture. */
          var frontBank=smoothstep(.470,.585,deck1+edgeMid*.035);
          var rearBank=smoothstep(.455,.590,deck2*.82+deck3*.18);
          var rearVisible=rearBank*(1-frontBank*.68);
          var overlap=frontBank*rearBank;

          var depth1=fbm(wx*.84-t*.0026*life,wy*.78+t*.0023*life,379);
          var depth2=fbm(wx*1.32+t*.0024*life+1.7,wy*1.24-t*.0021*life-2.0,397);
          var depth3=fbm(wx*2.00-t*.0019*life-1.2,wy*1.84+t*.0018*life+2.2,419);

          var valley1=smoothstep(.46,.68,depth1);
          var valley2=smoothstep(.49,.71,depth2);
          var valley3=smoothstep(.52,.73,depth3);

          var shadow=(
            cloud*(valley1*.30+valley2*.24+valley3*.14)
            +dense*(valley1*.16+valley2*.12)
            +rearVisible*(valley2*.18+valley3*.10)
            +overlap*LAYER_SEPARATION
          )*SHADOW_STRENGTH;
          shadow=clamp(shadow,0,.66);

          /* Opening-dependent light: the bright part must come from inside the cloud volume. */
          var ldx=(nx-lightX+q1*.045)/.25;
          var ldy=(ny-lightY+q2*.040)/.29;
          var lamp=Math.exp(-(ldx*ldx+ldy*ldy)*1.75);
          var lightNoise=.72+fbm(wx*.74+t*.0017*life,wy*.68-t*.0015*life,449)*.28;
          var openFactor=clamp(opening*.72+(1-cloud)*.24,0,1)*(1-dense*.76);
          var light=lamp*lightNoise*openFactor*LIGHT_STRENGTH;

          /* Silver lining follows illuminated cloud edges near clearings. */
          var boundary=haze*(1-cloud);
          var rimDriver=clamp(opening*.72+lamp*.48,0,1);
          var rim=boundary*rimDriver*clamp(.60+edgeMid*.52+edgeFine*.20,0,1)*.82;

          /* Atmosphere is muted blue-grey, not plain sky blue. */
          var air=fbm(wx*.33+t*.0011*life,wy*.31-t*.0010*life,477)-.5;
          var R=124+air*7;
          var G=176+air*9;
          var B=205+air*10;

          /* Rear cloud layer: cooler and translucent. */
          var rearAmt=clamp(rearVisible*.26,0,.28);
          R=R*(1-rearAmt)+174*rearAmt;
          G=G*(1-rearAmt)+214*rearAmt;
          B=B*(1-rearAmt)+233*rearAmt;

          /* Minimal suspended haze — structure should remain visible. */
          var suspended=HAZE_STRENGTH+haze*.055;
          suspended=clamp(suspended,0,.16);
          R=R*(1-suspended)+188*suspended;
          G=G*(1-suspended)+217*suspended;
          B=B*(1-suspended)+234*suspended;

          /* Foreground cloud bank: clear milk-white volume without global white wash. */
          var whiteAmt=cloud*.46+dense*.14+frontBank*.10;
          whiteAmt=clamp(whiteAmt,0,.64);
          R=R*(1-whiteAmt)+235*whiteAmt;
          G=G*(1-whiteAmt)+246*whiteAmt;
          B=B*(1-whiteAmt)+251*whiteAmt;

          /* Deep internal valleys separate masses. */
          R=R*(1-shadow)+54*shadow;
          G=G*(1-shadow)+106*shadow;
          B=B*(1-shadow)+148*shadow;

          /* Lit cloud edge and local internal light. */
          R=R*(1-rim)+253*rim;
          G=G*(1-rim)+255*rim;
          B=B*(1-rim)+255*rim;

          R=R*(1-light)+255*light;
          G=G*(1-light)+255*light;
          B=B*(1-light)+255*light;

          /* Only a faint atmospheric containment, never a planetary vignette. */
          var containment=smoothstep(.464,.515,rr)*.032;
          R=R*(1-containment)+175*containment;
          G=G*(1-containment)+211*containment;
          B=B*(1-containment)+231*containment;

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

      /* Faint interior glow only. */
      var gx=canvas.width*lightX,gy=canvas.height*lightY;
      var g=ctx.createRadialGradient(gx,gy,0,gx,gy,canvas.width*.20);
      g.addColorStop(0,'rgba(255,255,255,.050)');
      g.addColorStop(.28,'rgba(247,253,255,.022)');
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
    .replace('</head>','<style>'+ORB_V50_STYLE+'</style></head>')
    .replace('</body>',ORB_V50_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v50-layered-cloud-banks-openings');

    return new Response(enhance(html),{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }
};
