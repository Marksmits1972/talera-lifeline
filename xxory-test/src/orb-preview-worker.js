import baseWorker from "./worker.js";

const ORB_LAB_HTML = String.raw`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F7F4EF">
<meta name="robots" content="noindex,nofollow">
<title>TALERA — ORB lab v2</title>
<style>
:root{color-scheme:light}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#F7F4EF;color:#0F2747}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
.lab{min-height:100dvh;display:grid;grid-template-rows:auto 1fr auto;padding:max(18px,env(safe-area-inset-top)) 18px max(18px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 42%,#fff 0,#fbfaf7 42%,#F7F4EF 76%)}
.head{display:flex;justify-content:center;align-items:center;min-height:34px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.42}
.stage{display:grid;place-items:center;min-height:0}
.orb-frame{position:relative;width:min(86vw,430px);aspect-ratio:1;display:grid;place-items:center;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none}
canvas{display:block;width:100%;height:100%;background:transparent}
.hint{min-height:34px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:13px;line-height:1.4;color:#3E4A59;opacity:.46}
.hint strong{font-weight:650;color:#0F2747}
@media(min-width:700px){.orb-frame{width:min(62vw,520px)}}
@media(prefers-reduced-motion:reduce){.hint::after{content:" — beweging vertraagd"}}
</style>
</head>
<body>
<div class="lab">
  <div class="head">ORB lab v2 — Canvas</div>
  <div class="stage">
    <div id="frame" class="orb-frame" role="button" tabindex="0" aria-label="Tik om spreekreactie te testen">
      <canvas id="orb"></canvas>
    </div>
  </div>
  <div id="hint" class="hint">Automatische demo: rust → spreken. <strong>&nbsp;Tik om handmatig te wisselen.</strong></div>
</div>
<script>
(function(){
  var canvas=document.getElementById('orb');
  var frame=document.getElementById('frame');
  var hint=document.getElementById('hint');
  var ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
  if(!ctx){hint.textContent='Canvas wordt op dit toestel niet ondersteund.';return;}

  var DPR=Math.min(2,window.devicePixelRatio||1);
  var logical=430;
  var last=performance.now();
  var manual=false;
  var speakingTarget=0;
  var speaking=0;
  var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var clouds=[
    {a:.18,r:.34,s:.017,rx:.34,ry:.24,o:.34,c:'255,255,255',p:.2},
    {a:1.12,r:.31,s:-.014,rx:.28,ry:.19,o:.22,c:'238,248,254',p:1.7},
    {a:2.05,r:.29,s:.011,rx:.37,ry:.22,o:.20,c:'255,255,255',p:2.8},
    {a:3.14,r:.35,s:-.012,rx:.30,ry:.25,o:.18,c:'217,237,249',p:.9},
    {a:4.15,r:.30,s:.016,rx:.29,ry:.21,o:.19,c:'255,255,255',p:2.1},
    {a:5.08,r:.32,s:-.010,rx:.35,ry:.23,o:.17,c:'230,244,252',p:3.4},
    {a:.72,r:.25,s:-.019,rx:.22,ry:.18,o:.17,c:'89,155,199',p:1.2},
    {a:2.62,r:.27,s:.014,rx:.27,ry:.20,o:.14,c:'76,143,188',p:2.4},
    {a:4.72,r:.23,s:-.015,rx:.24,ry:.18,o:.13,c:'62,127,174',p:.4},
    {a:5.62,r:.22,s:.018,rx:.25,ry:.19,o:.12,c:'84,151,195',p:3.1}
  ];

  var grain=[];
  for(var i=0;i<180;i++){
    var ga=Math.random()*Math.PI*2;
    var gr=Math.sqrt(Math.random())*.92;
    grain.push({x:Math.cos(ga)*gr,y:Math.sin(ga)*gr,r:.35+Math.random()*1.1,a:.018+Math.random()*.035});
  }

  function resize(){
    var rect=frame.getBoundingClientRect();
    logical=Math.max(260,Math.min(560,rect.width||430));
    DPR=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(logical*DPR);
    canvas.height=Math.round(logical*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  resize();
  window.addEventListener('resize',resize,{passive:true});

  function blobPath(cx,cy,r,t){
    var n=96;
    var pts=[];
    for(var i=0;i<n;i++){
      var a=i/n*Math.PI*2;
      var wobble=
        Math.sin(a*3+t*.23)*.019+
        Math.sin(a*5-t*.17+1.3)*.013+
        Math.sin(a*7+t*.11+2.4)*.007;
      var rr=r*(1+wobble);
      pts.push({x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr});
    }
    ctx.beginPath();
    var p0=pts[0];
    var plast=pts[pts.length-1];
    ctx.moveTo((p0.x+plast.x)/2,(p0.y+plast.y)/2);
    for(var j=0;j<pts.length;j++){
      var p=pts[j];
      var q=pts[(j+1)%pts.length];
      ctx.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);
    }
    ctx.closePath();
  }

  function ellipseGlow(x,y,rx,ry,angle,color,alpha){
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle);
    ctx.scale(rx,ry);
    var g=ctx.createRadialGradient(0,0,0,0,0,1);
    g.addColorStop(0,'rgba('+color+','+alpha+')');
    g.addColorStop(.42,'rgba('+color+','+(alpha*.56)+')');
    g.addColorStop(.76,'rgba('+color+','+(alpha*.16)+')');
    g.addColorStop(1,'rgba('+color+',0)');
    ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  function drawWisps(cx,cy,r,t,activity){
    ctx.save();
    ctx.globalCompositeOperation='screen';
    ctx.lineCap='round';
    for(var k=0;k<6;k++){
      var base=(k/6)*Math.PI*2+t*(.022+.006*activity)*(k%2?1:-1);
      var rr=r*(.20+k*.075);
      var x0=cx+Math.cos(base)*rr;
      var y0=cy+Math.sin(base)*rr*.72;
      var x1=cx+Math.cos(base+.75)*rr*.85;
      var y1=cy+Math.sin(base+.75)*rr*.62;
      var x2=cx+Math.cos(base+1.45)*rr*.68;
      var y2=cy+Math.sin(base+1.45)*rr*.55;
      ctx.beginPath();ctx.moveTo(x0,y0);ctx.quadraticCurveTo(cx+Math.cos(base+.38)*r*.12,cy+Math.sin(base+.38)*r*.12,x1,y1);ctx.quadraticCurveTo(cx+Math.cos(base+1.03)*r*.24,cy+Math.sin(base+1.03)*r*.20,x2,y2);
      ctx.strokeStyle='rgba(246,252,255,'+(0.055+k*.007)+')';
      ctx.lineWidth=r*(.055+k*.006);
      ctx.stroke();
    }
    ctx.restore();
  }

  function render(now){
    var dt=Math.min(40,now-last);last=now;
    var sec=now/1000;
    if(!manual){
      var phase=sec%19;
      speakingTarget=(phase>9.5&&phase<14.5)?1:0;
    }
    var ease=speakingTarget>speaking?.055:.025;
    if(reduced)ease*=.35;
    speaking+=(speakingTarget-speaking)*ease*(dt/16.67);

    var w=logical,h=logical,cx=w/2,cy=h/2;
    ctx.clearRect(0,0,w,h);

    var breath=1+Math.sin(sec*.58)*.008+Math.sin(sec*.31+1.6)*.005;
    var r=w*.285*breath*(1+speaking*.15);
    var activity=1+speaking*.42;

    var hg=ctx.createRadialGradient(cx-r*.05,cy-r*.06,r*.70,cx,cy,r*1.28);
    hg.addColorStop(0,'rgba(168,207,233,0)');
    hg.addColorStop(.56,'rgba(168,207,233,.035)');
    hg.addColorStop(.76,'rgba(151,196,226,.105)');
    hg.addColorStop(.90,'rgba(166,207,233,.045)');
    hg.addColorStop(1,'rgba(166,207,233,0)');
    ctx.fillStyle=hg;ctx.beginPath();ctx.arc(cx,cy,r*1.34,0,Math.PI*2);ctx.fill();

    blobPath(cx,cy,r,sec*.45);
    ctx.save();ctx.clip();

    var base=ctx.createLinearGradient(cx-r*.74,cy-r*.72,cx+r*.82,cy+r*.82);
    base.addColorStop(0,'#eaf6fd');
    base.addColorStop(.28,'#cfe8f7');
    base.addColorStop(.58,'#9bc8e4');
    base.addColorStop(.84,'#70acd2');
    base.addColorStop(1,'#5d9ec8');
    ctx.fillStyle=base;ctx.fillRect(cx-r*1.2,cy-r*1.2,r*2.4,r*2.4);

    var deepX=cx+r*(.30+Math.sin(sec*.13)*.12);
    var deepY=cy+r*(.30+Math.cos(sec*.11)*.10);
    ellipseGlow(deepX,deepY,r*.82,r*.67,-.55,'49,112,160',.20+speaking*.025);
    ellipseGlow(cx-r*.34,cy+r*.18,r*.64,r*.42,.32,'86,154,198',.12);

    ctx.globalCompositeOperation='screen';
    for(var c=0;c<clouds.length;c++){
      var q=clouds[c];
      var aa=q.a+sec*q.s*activity;
      var drift=.06*Math.sin(sec*(.19+(c%3)*.017)+q.p);
      var x=cx+Math.cos(aa)*r*(q.r+drift);
      var y=cy+Math.sin(aa)*r*(q.r*.78+drift*.55);
      var rx=r*q.rx*(1+.10*Math.sin(sec*.21+q.p));
      var ry=r*q.ry*(1+.12*Math.cos(sec*.17+q.p));
      ellipseGlow(x,y,rx,ry,aa*.45,q.c,q.o+(speaking*.018));
    }

    drawWisps(cx,cy,r,sec,activity);

    ctx.globalCompositeOperation='screen';
    var lx=cx+r*(-.26+Math.sin(sec*.17)*.26+Math.sin(sec*.071)*.09);
    var ly=cy+r*(-.36+Math.cos(sec*.14)*.31);
    var lg=ctx.createRadialGradient(lx,ly,0,lx,ly,r*.92);
    lg.addColorStop(0,'rgba(255,255,255,'+(0.34+speaking*.045)+')');
    lg.addColorStop(.22,'rgba(248,253,255,.23)');
    lg.addColorStop(.54,'rgba(226,243,253,.10)');
    lg.addColorStop(1,'rgba(226,243,253,0)');
    ctx.fillStyle=lg;ctx.fillRect(cx-r,cy-r,r*2,r*2);

    ctx.globalCompositeOperation='soft-light';
    ctx.fillStyle='#fff';
    ctx.save();
    ctx.translate(cx,cy);ctx.rotate(sec*.008);
    for(var g=0;g<grain.length;g++){
      var z=grain[g];
      ctx.globalAlpha=z.a;
      ctx.beginPath();ctx.arc(z.x*r,z.y*r,z.r,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();

    ctx.globalCompositeOperation='source-over';
    var edge=ctx.createRadialGradient(cx-r*.12,cy-r*.18,r*.28,cx,cy,r*1.02);
    edge.addColorStop(0,'rgba(255,255,255,.03)');
    edge.addColorStop(.64,'rgba(255,255,255,0)');
    edge.addColorStop(.88,'rgba(48,107,151,.055)');
    edge.addColorStop(1,'rgba(38,93,136,.11)');
    ctx.fillStyle=edge;ctx.fillRect(cx-r*1.05,cy-r*1.05,r*2.1,r*2.1);
    ctx.restore();

    blobPath(cx,cy,r,sec*.45);
    ctx.save();
    ctx.strokeStyle='rgba(229,244,253,.34)';
    ctx.lineWidth=Math.max(1.2,r*.012);
    ctx.stroke();
    ctx.restore();

    requestAnimationFrame(render);
  }

  function toggleManual(){
    manual=true;speakingTarget=speakingTarget>.5?0:1;
    hint.innerHTML=speakingTarget?'<strong>Spreekreactie</strong> — circa 15% groter, stroming actiever.':'<strong>Rust</strong> — langzame ademhaling en interne stroming.';
  }
  frame.addEventListener('click',toggleManual);
  frame.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleManual();}});
  requestAnimationFrame(render);
})();
</script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if ((request.method === "GET" || request.method === "HEAD") && url.searchParams.get("orbLab") === "2") {
      const headers = new Headers({
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "no-referrer",
        "x-talera-orb-lab": "canvas-v2"
      });
      return new Response(request.method === "HEAD" ? null : ORB_LAB_HTML, { status: 200, headers });
    }

    return baseWorker.fetch(request, env, ctx);
  },
};
