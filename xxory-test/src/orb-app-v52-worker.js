import baseWorker from "./worker.js";

const ORB_V52_STYLE = String.raw`
/* TALERA ORB v52 — calibrated living cloud organism with visible warm heart. */
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
  background:rgba(136,187,215,.35)!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    0 14px 40px rgba(46,99,130,.05),
    0 0 24px rgba(86,171,214,.15),
    0 0 72px rgba(86,171,214,.09)!important;
  filter:none!important;
  transform:scale(calc(.99 + var(--awake)*.115 + var(--voice)*.042 + var(--orb-beat)))!important;
  transition:transform .13s cubic-bezier(.18,.72,.2,1)!important;
  animation:taleraOrb52Shape 6.4s ease-in-out infinite!important;
}
.core.active,.core.listening{animation-duration:3.55s!important}
.core::before,.core::after{display:none!important;content:none!important}
.orb-v52-canvas{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  pointer-events:none!important;
}
.status::after{
  content:"  · v52";
  font-size:9px;
  opacity:.34;
  vertical-align:middle;
}
@keyframes taleraOrb52Shape{
  0%,100%{border-radius:50% 50% 49% 51% / 51% 49% 51% 49%}
  28%{border-radius:52% 48% 50% 50% / 49% 52.5% 47.5% 51%}
  58%{border-radius:48.5% 51.5% 52% 48% / 52.5% 47.5% 50% 50%}
  81%{border-radius:51% 49% 48.5% 51.5% / 49% 51.5% 48.5% 51%}
}
`;

const ORB_V52_SCRIPT = String.raw`<script>(function(){
  var LOW=198;

  /*
    V52 calibration of the v51 architecture:
    - same continuous cloud organism;
    - fixed TALERA-warm heart (#E7A98B) behind the cloud body;
    - much clearer rest/listening speed separation;
    - wider moving clearings reveal and hide the heart;
    - heart and whole orb share one readable double beat.
  */
  var CLOUD_LEVEL=.492;
  var EDGE_DETAIL=.168;
  var OPENING_STRENGTH=.170;
  var LAYER_SEPARATION=.22;
  var SHADOW_STRENGTH=.84;
  var HAZE_STRENGTH=.044;

  var REST_MOTION=1.00;
  var ACTIVE_MOTION=7.20;

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
    if(core.getAttribute('data-orb-v52')==='1')return;
    core.setAttribute('data-orb-v52','1');
    core.innerHTML='';

    var canvas=document.createElement('canvas');
    canvas.className='orb-v52-canvas';
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
      if(now-last<32)return;
      last=now;
      resize();

      var t=now/1000;
      var cs=getComputedStyle(core);
      var awake=parseFloat(cs.getPropertyValue('--awake'))||0;
      var voiceRaw=parseFloat(cs.getPropertyValue('--voice'))||0;
      var voice=Math.min(.75,Math.max(0,voiceRaw));
      var isActive=core.classList.contains('active')||core.classList.contains('listening')||awake>.45;

      /*
        In v51 this ratio existed but the domain travelled too little.
        V52 makes flowT materially larger while keeping a calm resting state.
      */
      var motion=(isActive?ACTIVE_MOTION:REST_MOTION)*(1+voice*.34);
      var flowT=t*motion;
      var breath=Math.sin(t*(isActive?1.10:.68))*.0075;

      /* Fixed two-beat heart, deliberately visible this time. */
      var beatPeriod=isActive?2.15:3.65;
      var phase=(t%beatPeriod)/beatPeriod;
      var beat=clamp(
        beatBell(phase,.110,.037)*.92+
        beatBell(phase,.228,.030)*.62,
        0,1
      );
      var heartPulse=.48+beat*.78;
      core.style.setProperty('--orb-beat',(beat*(isActive?.030:.018)).toFixed(4));

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

          /* Whole medium morphs — not a texture sliding across a sphere. */
          var q1=fbm(x*.42+flowT*.0068+1.6,y*.40-flowT*.0058-2.2,31)-.5;
          var q2=fbm(x*.38-flowT*.0057-2.7,y*.45+flowT*.0066+2.3,59)-.5;
          var q3=fbm(x*.68+flowT*.0074+3.1,y*.64+flowT*.0050-1.5,83)-.5;
          var q4=fbm(x*.96-flowT*.0051-1.1,y*.88+flowT*.0059+1.7,97)-.5;

          var livingWarp=Math.sin(y*2.6+flowT*.035)*.022+
                         Math.sin(x*2.1-flowT*.028)*.015;
          var activeWarp=isActive
            ? (Math.sin((x+y)*3.0+flowT*.050)*.028)
            : (Math.sin((x+y)*2.2+flowT*.018)*.009);

          var wx=x+q1*.69+q2*.25+q3*.12+q4*.050+livingWarp+activeWarp;
          var wy=y+q2*.64-q1*.23-q3*.084+q4*.044-livingWarp*.72+activeWarp*.55;

          /* Three independently moving cloud decks. */
          var u1=wx*.94+wy*.20;
          var v1=-wx*.16+wy*.98;
          var u2=wx*.78-wy*.35;
          var v2=wx*.30+wy*.86;
          var u3=wx*.70+wy*.43;
          var v3=-wx*.38+wy*.74;

          var deck1Macro=fbm(u1*.55+flowT*.0071,v1*.51-flowT*.0058,101);
          var deck1Mid=fbm(u1*1.05-flowT*.0060+1.5,v1*.96+flowT*.0051-1.0,127);
          var deck1=deck1Macro*.72+deck1Mid*.28;

          var deck2Macro=fbm(u2*.61-flowT*.0066+2.0,v2*.57+flowT*.0060-1.7,157);
          var deck2Mid=fbm(u2*1.18+flowT*.0065-2.3,v2*1.08-flowT*.0057+1.6,181);
          var deck2=deck2Macro*.70+deck2Mid*.30;

          var deck3Macro=fbm(u3*.47+flowT*.0051-1.8,v3*.45+flowT*.0046+2.4,203);
          var deck3Mid=fbm(u3*.91-flowT*.0049+2.6,v3*.86+flowT*.0047-2.1,223);
          var deck3=deck3Macro*.78+deck3Mid*.22;

          var blanket=fbm(wx*.40+flowT*.0041+2.8,wy*.37-flowT*.0035-2.9,241);
          var mass=Math.max(deck1*.995,deck2*.985,deck3*.955);
          mass=mass*.80+blanket*.20+breath;

          /*
            Openings are larger and move faster.
            They are still noise-carved, so the heart appears through irregular cloud gaps.
          */
          var thinA=fbm(wx*.70-flowT*.0041+1.1,wy*.65+flowT*.0036-1.8,263);
          var thinB=fbm(wx*1.18+flowT*.0035-2.0,wy*1.10-flowT*.0032+2.5,283);
          var thinC=fbm(wx*1.75-flowT*.0029+2.8,wy*1.60+flowT*.0027-1.3,307);
          var openingField=thinA*.56+thinB*.31+thinC*.13;
          var opening=smoothstep(.485,.642,openingField);
          mass-=opening*OPENING_STRENGTH;

          /* Cloud banks stay soft but readable. */
          var edgeMid=fbm(wx*2.02+flowT*.0056,wy*1.88-flowT*.0050,331)-.5;
          var edgeFine=fbm(wx*3.92-flowT*.0044+1.9,wy*3.60+flowT*.0041-2.3,353)-.5;
          var rawMask=smoothstep(CLOUD_LEVEL-.090,CLOUD_LEVEL+.040,mass);
          var edgeWeight=rawMask*(1-rawMask)*4;
          var shaped=mass+(edgeMid*EDGE_DETAIL+edgeFine*EDGE_DETAIL*.36)*edgeWeight;

          var haze=smoothstep(CLOUD_LEVEL-.130,CLOUD_LEVEL-.035,shaped);
          var cloud=smoothstep(CLOUD_LEVEL-.055,CLOUD_LEVEL+.035,shaped);
          var dense=smoothstep(CLOUD_LEVEL+.010,CLOUD_LEVEL+.108,shaped);

          /* Volumetric front/rear separation. */
          var frontBank=smoothstep(.470,.585,deck1+edgeMid*.035);
          var rearBank=smoothstep(.455,.590,deck2*.82+deck3*.18);
          var rearVisible=rearBank*(1-frontBank*.68);
          var overlap=frontBank*rearBank;

          var depth1=fbm(wx*.84-flowT*.0044,wy*.78+flowT*.0040,379);
          var depth2=fbm(wx*1.32+flowT*.0041+1.7,wy*1.24-flowT*.0037-2.0,397);
          var depth3=fbm(wx*2.00-flowT*.0033-1.2,wy*1.84+flowT*.0031+2.2,419);

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

          /*
            Fixed heart behind the clouds.
            q-warp barely nudges its transmission contour, never its actual location.
          */
          var hdx=(nx-HEART_X+q1*.006)/.205;
          var hdy=(ny-HEART_Y+q2*.006)/.220;
          var heartField=Math.exp(-(hdx*hdx+hdy*hdy)*1.55);
          var heartInner=Math.exp(-(hdx*hdx+hdy*hdy)*4.20);

          /*
            v52 lets thin cloud transmit warm light instead of demanding near-empty air.
            Dense cloud still masks it, preserving the hidden-heart behaviour.
          */
          var thinTransmission=clamp(1-cloud*.58-dense*.28,0,1);
          var heartWindow=clamp(opening*.88+thinTransmission*.62+haze*.10,0,1);
          var warmLight=clamp(heartField*heartWindow*heartPulse*1.42,0,.88);
          var warmCore=clamp(heartInner*heartWindow*(.48+beat*.90)*1.05,0,.78);

          var coolOpen=clamp(opening*.36+(1-cloud)*.12,0,1)*(1-dense*.84);
          var coolLight=coolOpen*(.08+haze*.07);

          /* Warm lining traces the edges of gaps, not the outside of the orb. */
          var boundary=haze*(1-cloud);
          var heartNear=clamp(heartField*1.10+opening*.46,0,1);
          var warmRim=boundary*heartNear*
            clamp(.62+edgeMid*.54+edgeFine*.20,0,1)*
            (.48+heartPulse*.62);
          warmRim=clamp(warmRim,0,.68);

          /* Muted blue-grey internal medium, deliberately not sky-blue. */
          var air=fbm(wx*.33+flowT*.0019,wy*.31-flowT*.0017,477)-.5;
          var R=117+air*7;
          var G=169+air*9;
          var B=201+air*10;

          var rearAmt=clamp(rearVisible*.27,0,.29);
          R=R*(1-rearAmt)+169*rearAmt;
          G=G*(1-rearAmt)+210*rearAmt;
          B=B*(1-rearAmt)+231*rearAmt;

          var suspended=HAZE_STRENGTH+haze*.047;
          suspended=clamp(suspended,0,.14);
          R=R*(1-suspended)+184*suspended;
          G=G*(1-suspended)+214*suspended;
          B=B*(1-suspended)+233*suspended;

          var whiteAmt=cloud*.46+dense*.14+frontBank*.10;
          whiteAmt=clamp(whiteAmt,0,.64);
          R=R*(1-whiteAmt)+235*whiteAmt;
          G=G*(1-whiteAmt)+246*whiteAmt;
          B=B*(1-whiteAmt)+251*whiteAmt;

          R=R*(1-shadow)+51*shadow;
          G=G*(1-shadow)+103*shadow;
          B=B*(1-shadow)+146*shadow;

          /* TALERA warm edge light. */
          R=R*(1-warmRim)+247*warmRim;
          G=G*(1-warmRim)+202*warmRim;
          B=B*(1-warmRim)+179*warmRim;

          /* TALERA warm heart (#E7A98B), clearly visible through openings. */
          R=R*(1-warmLight)+HEART_R*warmLight;
          G=G*(1-warmLight)+HEART_G*warmLight;
          B=B*(1-warmLight)+HEART_B*warmLight;

          /* Bright heart centre: warm white, not a yellow sun. */
          R=R*(1-warmCore)+255*warmCore;
          G=G*(1-warmCore)+226*warmCore;
          B=B*(1-warmCore)+207*warmCore;

          R=R*(1-coolLight)+199*coolLight;
          G=G*(1-coolLight)+229*coolLight;
          B=B*(1-coolLight)+243*coolLight;

          var containment=smoothstep(.464,.515,rr)*.028;
          R=R*(1-containment)+173*containment;
          G=G*(1-containment)+210*containment;
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

      /*
        Backlight is fixed to the heart position and shares the heartbeat.
        Opacity is intentionally much stronger than v51, but remains soft and internal.
      */
      var gx=canvas.width*HEART_X,gy=canvas.height*HEART_Y;
      var gr=canvas.width*(.175+beat*.030);
      var g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
      g.addColorStop(0,'rgba(255,224,205,'+(.115+beat*.145)+')');
      g.addColorStop(.28,'rgba(231,169,139,'+(.055+beat*.080)+')');
      g.addColorStop(.62,'rgba(231,169,139,'+(.016+beat*.025)+')');
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
    .replace('</head>','<style>'+ORB_V52_STYLE+'</style></head>')
    .replace('</body>',ORB_V52_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v52-visible-heart-strong-active-flow');

    return new Response(enhance(html),{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }
};
