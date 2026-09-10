import baseWorker from "./worker.js";

const ORB_V51_STYLE = String.raw`
/* TALERA ORB v51 — living cloud organism around a fixed warm TALERA heart. */
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
  --orb-beat:0;
  display:block!important;
  width:80%!important;
  height:80%!important;
  position:relative!important;
  opacity:1!important;
  visibility:visible!important;
  overflow:hidden!important;
  isolation:isolate!important;
  border-radius:50% 50% 49% 51% / 51% 49% 51% 49%!important;
  background:rgba(139,190,217,.35)!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    0 14px 40px rgba(46,99,130,.05),
    0 0 24px rgba(86,171,214,.15),
    0 0 72px rgba(86,171,214,.09)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.115 + var(--voice)*.042 + var(--orb-beat)))!important;
  transition:transform .16s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb51Shape 6.2s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:3.9s!important}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v51-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v51";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}
@keyframes taleraOrb51Shape{
  0%,100%{border-radius:50% 50% 49% 51% / 51% 49% 51% 49%}
  32%{border-radius:51.5% 48.5% 50% 50% / 49% 52% 48% 51%}
  63%{border-radius:49% 51% 51.5% 48.5% / 52% 48% 50% 50%}
  82%{border-radius:50.5% 49.5% 48.5% 51.5% / 49.5% 51% 49% 50.5%}
}
`;

const ORB_V51_SCRIPT = String.raw`<script>(function(){
  var LOW=196;

  /*
    V51: keep the v50 cloud-body logic, but make the organism alive now.
    - The heart is fixed behind the cloud volume.
    - Clouds move around it; they do not orbit as a flat texture.
    - Rest movement is calm, listening movement is clearly faster.
    - The TALERA warm accent (#E7A98B) appears only as transmitted inner light.
  */
  var CLOUD_LEVEL=.495;
  var EDGE_DETAIL=.160;
  var OPENING_STRENGTH=.125;
  var LAYER_SEPARATION=.21;
  var SHADOW_STRENGTH=.83;
  var HAZE_STRENGTH=.050;
  var REST_MOTION=.82;
  var ACTIVE_MOTION=3.25;

  var HEART_X=.58;
  var HEART_Y=.45;
  var HEART_R=231;
  var HEART_G=169;
  var HEART_B=139;

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
  function beatBell(phase,center,width){
    var d=Math.abs(phase-center);
    d=Math.min(d,1-d);
    return Math.exp(-(d*d)/(2*width*width));
  }

  function mountCore(core){
    if(core.getAttribute('data-orb-v51')==='1')return;
    core.setAttribute('data-orb-v51','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v51-canvas';
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
      if(now-last<34)return;
      last=now;
      resize();

      var t=now/1000;
      var cs=getComputedStyle(core);
      var awake=parseFloat(cs.getPropertyValue('--awake'))||0;
      var voiceRaw=parseFloat(cs.getPropertyValue('--voice'))||0;
      var voice=Math.min(.70,Math.max(0,voiceRaw));
      var isActive=core.classList.contains('active')||core.classList.contains('listening')||awake>.45;

      /* Clear separation between winter-sleep and listening motion. */
      var motion=(isActive?ACTIVE_MOTION:REST_MOTION)*(1+voice*.30);
      var flowT=t*motion;
      var breath=Math.sin(t*(isActive?1.02:.70))*.007;

      /* A fixed two-beat heart. The ball scale is driven by the exact same pulse. */
      var beatPeriod=isActive?2.45:3.75;
      var phase=(t%beatPeriod)/beatPeriod;
      var beat=clamp(
        beatBell(phase,.115,.034)*.80+
        beatBell(phase,.225,.027)*.52,
        0,1
      );
      var heartPulse=.34+beat*.66;
      core.style.setProperty('--orb-beat',(beat*(isActive?.020:.012)).toFixed(4));

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

          /* The medium itself moves: slow in rest, clearly faster while listening. */
          var q1=fbm(x*.42+flowT*.0048+1.6,y*.40-flowT*.0041-2.2,31)-.5;
          var q2=fbm(x*.38-flowT*.0040-2.7,y*.45+flowT*.0047+2.3,59)-.5;
          var q3=fbm(x*.68+flowT*.0055+3.1,y*.64+flowT*.0037-1.5,83)-.5;
          var q4=fbm(x*.96-flowT*.0038-1.1,y*.88+flowT*.0043+1.7,97)-.5;
          var wx=x+q1*.68+q2*.24+q3*.11+q4*.045;
          var wy=y+q2*.63-q1*.22-q3*.080+q4*.040;

          /* Three cloud decks, each drifting differently around the fixed heart. */
          var u1=wx*.94+wy*.20;
          var v1=-wx*.16+wy*.98;
          var u2=wx*.78-wy*.35;
          var v2=wx*.30+wy*.86;
          var u3=wx*.70+wy*.43;
          var v3=-wx*.38+wy*.74;

          var deck1Macro=fbm(u1*.55+flowT*.0053,v1*.51-flowT*.0042,101);
          var deck1Mid=fbm(u1*1.05-flowT*.0045+1.5,v1*.96+flowT*.0038-1.0,127);
          var deck1=deck1Macro*.72+deck1Mid*.28;

          var deck2Macro=fbm(u2*.61-flowT*.0049+2.0,v2*.57+flowT*.0045-1.7,157);
          var deck2Mid=fbm(u2*1.18+flowT*.0048-2.3,v2*1.08-flowT*.0042+1.6,181);
          var deck2=deck2Macro*.70+deck2Mid*.30;

          var deck3Macro=fbm(u3*.47+flowT*.0038-1.8,v3*.45+flowT*.0034+2.4,203);
          var deck3Mid=fbm(u3*.91-flowT*.0036+2.6,v3*.86+flowT*.0035-2.1,223);
          var deck3=deck3Macro*.78+deck3Mid*.22;

          var blanket=fbm(wx*.40+flowT*.0030+2.8,wy*.37-flowT*.0026-2.9,241);
          var mass=Math.max(deck1*.995,deck2*.985,deck3*.955);
          mass=mass*.80+blanket*.20+breath;

          /* Organic clearings move with the cloud volume and occasionally expose the heart. */
          var thinA=fbm(wx*.70-flowT*.0028+1.1,wy*.65+flowT*.0025-1.8,263);
          var thinB=fbm(wx*1.18+flowT*.0024-2.0,wy*1.10-flowT*.0022+2.5,283);
          var thinC=fbm(wx*1.75-flowT*.0020+2.8,wy*1.60+flowT*.0019-1.3,307);
          var openingField=thinA*.56+thinB*.31+thinC*.13;
          var opening=smoothstep(.500,.665,openingField);
          mass-=opening*OPENING_STRENGTH;

          /* Readable but soft-edged cloud banks: not bubbles, not a diffuse wash. */
          var edgeMid=fbm(wx*2.02+flowT*.0041,wy*1.88-flowT*.0037,331)-.5;
          var edgeFine=fbm(wx*3.92-flowT*.0032+1.9,wy*3.60+flowT*.0030-2.3,353)-.5;
          var rawMask=smoothstep(CLOUD_LEVEL-.090,CLOUD_LEVEL+.040,mass);
          var edgeWeight=rawMask*(1-rawMask)*4;
          var shaped=mass+(edgeMid*EDGE_DETAIL+edgeFine*EDGE_DETAIL*.36)*edgeWeight;

          var haze=smoothstep(CLOUD_LEVEL-.130,CLOUD_LEVEL-.035,shaped);
          var cloud=smoothstep(CLOUD_LEVEL-.055,CLOUD_LEVEL+.035,shaped);
          var dense=smoothstep(CLOUD_LEVEL+.010,CLOUD_LEVEL+.108,shaped);

          /* Foreground/rear separation makes the organism volumetric. */
          var frontBank=smoothstep(.470,.585,deck1+edgeMid*.035);
          var rearBank=smoothstep(.455,.590,deck2*.82+deck3*.18);
          var rearVisible=rearBank*(1-frontBank*.68);
          var overlap=frontBank*rearBank;

          var depth1=fbm(wx*.84-flowT*.0032,wy*.78+flowT*.0029,379);
          var depth2=fbm(wx*1.32+flowT*.0030+1.7,wy*1.24-flowT*.0027-2.0,397);
          var depth3=fbm(wx*2.00-flowT*.0024-1.2,wy*1.84+flowT*.0023+2.2,419);

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

          /* Fixed heart behind the clouds. No wandering sun. */
          var hdx=(nx-HEART_X+q1*.010)/.165;
          var hdy=(ny-HEART_Y+q2*.010)/.180;
          var heartField=Math.exp(-(hdx*hdx+hdy*hdy)*2.05);
          var heartInner=Math.exp(-(hdx*hdx+hdy*hdy)*5.20);

          /* Only thinner atmosphere transmits the heart; dense cloud hides it. */
          var heartWindow=clamp(opening*.58+(1-cloud)*.42,0,1)*(1-dense*.90);
          var warmLight=heartField*heartWindow*heartPulse*.92;
          var warmCore=heartInner*heartWindow*(.32+beat*.68)*.62;

          /* A cool internal fill remains, but it is subordinate to the warm heart. */
          var coolOpen=clamp(opening*.44+(1-cloud)*.18,0,1)*(1-dense*.80);
          var coolLight=coolOpen*(.12+haze*.10);

          /* Warm lining is strongest on cloud edges facing the heart. */
          var boundary=haze*(1-cloud);
          var heartNear=clamp(heartField*.92+opening*.34,0,1);
          var warmRim=boundary*heartNear*clamp(.58+edgeMid*.52+edgeFine*.20,0,1)*(.36+heartPulse*.44);

          /* Muted blue-grey interior, not outdoor sky. */
          var air=fbm(wx*.33+flowT*.0014,wy*.31-flowT*.0013,477)-.5;
          var R=122+air*7;
          var G=174+air*9;
          var B=204+air*10;

          var rearAmt=clamp(rearVisible*.26,0,.28);
          R=R*(1-rearAmt)+174*rearAmt;
          G=G*(1-rearAmt)+214*rearAmt;
          B=B*(1-rearAmt)+233*rearAmt;

          var suspended=HAZE_STRENGTH+haze*.052;
          suspended=clamp(suspended,0,.15);
          R=R*(1-suspended)+188*suspended;
          G=G*(1-suspended)+217*suspended;
          B=B*(1-suspended)+234*suspended;

          var whiteAmt=cloud*.46+dense*.14+frontBank*.10;
          whiteAmt=clamp(whiteAmt,0,.64);
          R=R*(1-whiteAmt)+235*whiteAmt;
          G=G*(1-whiteAmt)+246*whiteAmt;
          B=B*(1-whiteAmt)+251*whiteAmt;

          R=R*(1-shadow)+54*shadow;
          G=G*(1-shadow)+106*shadow;
          B=B*(1-shadow)+148*shadow;

          /* Warm TALERA light transmitted through cloud edges. */
          R=R*(1-warmRim)+246*warmRim;
          G=G*(1-warmRim)+205*warmRim;
          B=B*(1-warmRim)+185*warmRim;

          R=R*(1-warmLight)+HEART_R*warmLight;
          G=G*(1-warmLight)+HEART_G*warmLight;
          B=B*(1-warmLight)+HEART_B*warmLight;

          /* Small bright centre inside the warm glow, still behind cloud. */
          R=R*(1-warmCore)+255*warmCore;
          G=G*(1-warmCore)+229*warmCore;
          B=B*(1-warmCore)+211*warmCore;

          /* Tiny cool fill keeps openings dimensional instead of black. */
          R=R*(1-coolLight)+202*coolLight;
          G=G*(1-coolLight)+232*coolLight;
          B=B*(1-coolLight)+245*coolLight;

          var containment=smoothstep(.464,.515,rr)*.030;
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

      /* Fixed warm backlight reinforces the heart without turning into a surface dot. */
      var gx=canvas.width*HEART_X,gy=canvas.height*HEART_Y;
      var gr=canvas.width*(.145+beat*.018);
      var g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
      g.addColorStop(0,'rgba(255,225,207,'+(.040+beat*.040)+')');
      g.addColorStop(.34,'rgba(231,169,139,'+(.018+beat*.022)+')');
      g.addColorStop(1,'rgba(231,169,139,0)');
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
    .replace('</head>','<style>'+ORB_V51_STYLE+'</style></head>')
    .replace('</body>',ORB_V51_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v51-fixed-warm-heart-active-cloud-life');

    return new Response(enhance(html),{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }
};
