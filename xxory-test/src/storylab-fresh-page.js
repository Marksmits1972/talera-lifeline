export const STORYLAB_FRESH_PAGE_REV = 'storylab-fresh-visual-20260916-r2';

export const STORYLAB_FRESH_HTML = String.raw`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#123652">
<title>TALERA — Vertellen</title>
<style>
:root{
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",system-ui,sans-serif;
  --blue:#123652;
  --blue-deep:#0b2b45;
  --blue-soft:#2e668f;
  --paper:#fbfaf7;
  --ink:#17364f;
  --edge:92px;
  --top-safe:max(18px,env(safe-area-inset-top));
}
*{box-sizing:border-box}
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:var(--blue-deep)}
body{-webkit-text-size-adjust:100%;overscroll-behavior:none;color:#fff}
button,input{font:inherit}
button{border:0}
.storylab{
  position:relative;
  width:100%;
  height:100svh;
  min-height:100svh;
  overflow:hidden;
  isolation:isolate;
  background:
    radial-gradient(circle at 50% 43%,rgba(111,159,194,.20) 0 15%,rgba(69,122,160,.10) 31%,rgba(18,54,82,0) 55%),
    var(--blue);
}
.storylab:before,.storylab:after{
  content:"";
  position:absolute;
  left:50%;top:43%;
  border:1px solid rgba(204,225,239,.075);
  border-radius:50%;
  transform:translate(-50%,-50%);
  pointer-events:none;
  z-index:0;
}
.storylab:before{width:min(76vw,420px);aspect-ratio:1}
.storylab:after{width:min(112vw,610px);aspect-ratio:1;border-color:rgba(204,225,239,.045)}
.topbar{
  position:absolute;
  z-index:30;
  left:0;right:0;top:0;
  height:calc(58px + var(--top-safe));
  padding:var(--top-safe) 18px 0;
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  pointer-events:none;
}
.iconButton{
  width:42px;height:42px;
  display:grid;place-items:center;
  border-radius:50%;
  background:rgba(5,28,45,.08);
  color:rgba(255,255,255,.94);
  -webkit-tap-highlight-color:transparent;
  pointer-events:auto;
}
.iconButton:active{background:rgba(4,25,40,.18)}
.iconButton svg{width:22px;height:22px}
.iconButton.menu svg{width:24px;height:24px}
.baseStage{
  position:absolute;
  z-index:4;
  inset:calc(58px + var(--top-safe)) 0 var(--edge);
  display:grid;
  place-items:center;
  padding:18px 22px 28px;
  transition:opacity .26s ease,transform .32s ease;
}
.storylab.hasPhotos .baseStage{opacity:0;transform:scale(.975);pointer-events:none}
.orbStack{display:flex;flex-direction:column;align-items:center;transform:translateY(-2vh)}
.orbField{position:relative;width:184px;height:184px;display:grid;place-items:center}
.orbField:before,.orbField:after{
  content:"";
  position:absolute;
  border:1px solid rgba(211,231,244,.15);
  border-radius:50%;
}
.orbField:before{width:178px;height:178px}
.orbField:after{width:148px;height:148px;border-color:rgba(211,231,244,.22)}
.recordOrb{
  position:relative;
  z-index:2;
  width:116px;height:116px;
  border-radius:50%;
  display:grid;place-items:center;
  color:#fff;
  background:linear-gradient(180deg,#467da6 0%,#31688f 100%);
  box-shadow:0 18px 45px rgba(2,22,37,.22),inset 0 0 0 1px rgba(255,255,255,.20);
  -webkit-tap-highlight-color:transparent;
}
.recordOrb:before{
  content:"";
  position:absolute;
  inset:-12px;
  border-radius:50%;
  border:1px solid rgba(209,229,243,.14);
  transition:transform .25s ease,opacity .25s ease;
}
.recordOrb svg{width:39px;height:39px}
.recordOrb[aria-pressed="true"]:before{animation:orbPulse 1.7s ease-out infinite}
.recordOrb[aria-pressed="true"]{box-shadow:0 18px 48px rgba(2,22,37,.25),0 0 0 8px rgba(137,187,221,.08),inset 0 0 0 1px rgba(255,255,255,.24)}
@keyframes orbPulse{0%{transform:scale(.95);opacity:.65}75%,100%{transform:scale(1.24);opacity:0}}
.addPhoto{
  position:relative;
  margin-top:18px;
  width:54px;height:46px;
  border-radius:17px;
  display:grid;place-items:center;
  background:rgba(7,35,55,.10);
  color:rgba(240,248,253,.92);
  -webkit-tap-highlight-color:transparent;
}
.addPhoto:active{background:rgba(7,35,55,.20)}
.addPhoto svg{width:29px;height:29px}
.fileInput{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.photoStage{
  position:absolute;
  z-index:5;
  inset:calc(58px + var(--top-safe)) 0 var(--edge);
  display:grid;
  place-items:center;
  padding:12px 17px 28px;
  opacity:0;
  transform:translateY(8px) scale(.985);
  pointer-events:none;
  transition:opacity .30s ease,transform .36s ease;
}
.storylab.hasPhotos .photoStage{opacity:1;transform:none;pointer-events:auto}
.photoCard{
  position:relative;
  width:min(100%,500px);
  height:min(68vh,650px);
  max-height:100%;
  min-height:420px;
  overflow:hidden;
  border-radius:30px;
  background:#173f5e;
  box-shadow:0 24px 70px rgba(3,23,37,.24),inset 0 0 0 1px rgba(255,255,255,.05);
  touch-action:pan-y;
}
.carouselImage{
  position:absolute;
  inset:0;
  width:100%;height:100%;
  object-fit:cover;
  opacity:0;
  transform:scale(1.012);
  transition:opacity .80s ease,transform 1.15s ease;
  user-select:none;
  -webkit-user-drag:none;
}
.carouselImage.current{opacity:1;transform:scale(1)}
.photoShade{
  position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(5,24,38,.12) 0%,rgba(5,24,38,.01) 43%,rgba(5,24,38,.18) 69%,rgba(5,24,38,.45) 100%);
  pointer-events:none;
}
.photoControls{
  position:absolute;
  z-index:7;
  left:50%;
  top:64%;
  transform:translate(-50%,-50%);
  display:flex;
  flex-direction:column;
  align-items:center;
}
.photoControls .orbField{width:164px;height:164px}
.photoControls .orbField:before{width:160px;height:160px;border-color:rgba(255,255,255,.22)}
.photoControls .orbField:after{width:138px;height:138px;border-color:rgba(255,255,255,.30)}
.photoControls .recordOrb{width:108px;height:108px;background:rgba(43,101,145,.88);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
.photoControls .addPhoto{margin-top:4px;background:rgba(6,32,49,.28);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.dots{
  position:absolute;
  z-index:8;
  left:50%;bottom:15px;
  transform:translateX(-50%);
  display:flex;align-items:center;gap:7px;
  min-height:10px;
}
.dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.42);transition:transform .25s ease,background .25s ease}
.dot.current{background:rgba(255,255,255,.94);transform:scale(1.35)}
.storySheet{
  position:absolute;
  z-index:20;
  left:0;right:0;bottom:0;
  height:calc(100% - (54px + var(--top-safe)));
  border-radius:30px 30px 0 0;
  background:var(--paper);
  color:var(--ink);
  box-shadow:0 -13px 38px rgba(2,21,34,.17);
  transform:translateY(calc(100% - var(--edge)));
  will-change:transform;
  touch-action:pan-y;
}
.sheetGrab{
  height:62px;
  display:flex;
  align-items:flex-start;
  justify-content:center;
  padding-top:14px;
  cursor:grab;
  -webkit-tap-highlight-color:transparent;
  touch-action:none;
}
.sheetGrab:active{cursor:grabbing}
.sheetPill{width:58px;height:6px;border-radius:999px;background:#21445f;opacity:.88}
.storyText{
  height:calc(100% - 62px);
  overflow:auto;
  padding:8px clamp(24px,7vw,54px) calc(42px + env(safe-area-inset-bottom));
  outline:0;
  color:#27455d;
  font-family:Georgia,"Times New Roman",serif;
  font-size:clamp(20px,5vw,25px);
  line-height:1.58;
  letter-spacing:-.012em;
  white-space:pre-wrap;
  -webkit-overflow-scrolling:touch;
  touch-action:pan-y;
}
.storyText:empty:before{content:attr(data-placeholder);color:#9aa8b2}
.storySheet.open .storyText{touch-action:pan-y}
@media(max-height:690px){
  :root{--edge:82px}
  .orbStack{transform:translateY(-1vh)}
  .orbField{width:160px;height:160px}.orbField:before{width:156px;height:156px}.orbField:after{width:136px;height:136px}
  .recordOrb{width:104px;height:104px}
  .photoCard{min-height:360px;height:65vh}
  .photoControls{top:62%}
}
@media(min-width:700px){
  .storylab{max-width:540px;margin:0 auto;box-shadow:0 0 80px rgba(0,0,0,.26)}
}
@media(prefers-reduced-motion:reduce){
  *,*:before,*:after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
}
</style>
</head>
<body>
<main id="storylab" class="storylab">
  <header class="topbar" aria-label="Navigatie">
    <button id="backButton" class="iconButton" type="button" aria-label="Terug">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>
    </button>
    <button id="menuButton" class="iconButton menu" type="button" aria-label="Menu">
      <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.65"></circle><circle cx="12" cy="12" r="1.65"></circle><circle cx="19" cy="12" r="1.65"></circle></svg>
    </button>
  </header>

  <section class="baseStage" aria-label="Vertellen">
    <div class="orbStack">
      <div class="orbField">
        <button class="recordOrb" type="button" aria-label="Opname starten" aria-pressed="false" data-record-button>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3M9 21h6"></path></svg>
        </button>
      </div>
      <button class="addPhoto" type="button" aria-label="Foto toevoegen" data-photo-button>
        <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5.5" width="17" height="16" rx="3"></rect><circle cx="9" cy="11" r="2"></circle><path d="M5.5 19l5-5 4 4 2.2-2.2 3.8 3.8"></path><path d="M23 9v8M19 13h8"></path></svg>
      </button>
    </div>
  </section>

  <section id="photoStage" class="photoStage" aria-label="Fotocarrousel">
    <div id="photoCard" class="photoCard">
      <img id="imageA" class="carouselImage current" alt="Foto bij je verhaal" draggable="false">
      <img id="imageB" class="carouselImage" alt="Foto bij je verhaal" draggable="false">
      <div class="photoShade"></div>
      <div class="photoControls">
        <div class="orbField">
          <button class="recordOrb" type="button" aria-label="Opname starten" aria-pressed="false" data-record-button>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3M9 21h6"></path></svg>
          </button>
        </div>
        <button class="addPhoto" type="button" aria-label="Meer foto’s toevoegen" data-photo-button>
          <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5.5" width="17" height="16" rx="3"></rect><circle cx="9" cy="11" r="2"></circle><path d="M5.5 19l5-5 4 4 2.2-2.2 3.8 3.8"></path><path d="M23 9v8M19 13h8"></path></svg>
        </button>
      </div>
      <div id="dots" class="dots" aria-hidden="true"></div>
    </div>
  </section>

  <input id="photoInput" class="fileInput" type="file" accept="image/*" multiple>

  <section id="storySheet" class="storySheet" aria-label="Verhaaltekst">
    <div id="sheetGrab" class="sheetGrab" role="button" tabindex="0" aria-label="Tekst openen of sluiten" aria-expanded="false"><div class="sheetPill"></div></div>
    <div id="storyText" class="storyText" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true" data-placeholder="Je verhaal verschijnt hier…"></div>
  </section>
</main>
<script>
(function(){
  var root=document.getElementById('storylab');
  var input=document.getElementById('photoInput');
  var photoCard=document.getElementById('photoCard');
  var imageA=document.getElementById('imageA');
  var imageB=document.getElementById('imageB');
  var dots=document.getElementById('dots');
  var sheet=document.getElementById('storySheet');
  var grab=document.getElementById('sheetGrab');
  var storyText=document.getElementById('storyText');
  var images=[imageA,imageB];
  var photos=[];
  var activeIndex=0;
  var activeImage=0;
  var carouselTimer=0;
  var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var recording=false;
  var drag=null;
  var edgeGesture=null;
  var photoGesture=null;
  var collapsedY=0;
  var sheetY=0;

  try{storyText.textContent=localStorage.getItem('talera.storylab.text')||'';}catch(e){}

  function pickPhotos(){input.click();}
  document.querySelectorAll('[data-photo-button]').forEach(function(button){button.addEventListener('click',pickPhotos);});

  input.addEventListener('change',function(){
    var files=Array.prototype.slice.call(input.files||[]).filter(function(file){return file&&String(file.type||'').indexOf('image/')===0;});
    if(!files.length)return;
    files.slice(0,Math.max(0,12-photos.length)).forEach(function(file){photos.push({file:file,url:URL.createObjectURL(file)});});
    input.value='';
    if(!photos.length)return;
    root.classList.add('hasPhotos');
    if(photos.length===files.length)activeIndex=0;
    showPhoto(activeIndex,true);
    restartCarousel();
    document.dispatchEvent(new CustomEvent('talera:storylab-photos',{detail:{count:photos.length}}));
  });

  function showPhoto(index,immediate){
    if(!photos.length)return;
    activeIndex=(index+photos.length)%photos.length;
    var nextImage=immediate?images[activeImage]:images[1-activeImage];
    var oldImage=images[activeImage];
    nextImage.src=photos[activeIndex].url;
    nextImage.alt='Foto '+String(activeIndex+1)+' van '+String(photos.length);
    if(immediate){
      images.forEach(function(img){img.classList.remove('current');});
      nextImage.classList.add('current');
    }else{
      nextImage.classList.add('current');
      oldImage.classList.remove('current');
      activeImage=1-activeImage;
    }
    renderDots();
  }

  function renderDots(){
    dots.innerHTML='';
    if(photos.length<2)return;
    photos.forEach(function(_,index){
      var dot=document.createElement('span');
      dot.className='dot'+(index===activeIndex?' current':'');
      dots.appendChild(dot);
    });
  }

  function nextPhoto(direction){
    if(photos.length<2)return;
    showPhoto(activeIndex+(direction||1),false);
    restartCarousel();
  }

  function restartCarousel(){
    if(carouselTimer)window.clearInterval(carouselTimer);
    carouselTimer=0;
    if(reduced||photos.length<2)return;
    carouselTimer=window.setInterval(function(){showPhoto(activeIndex+1,false);},8500);
  }

  photoCard.addEventListener('pointerdown',function(event){
    if(event.target.closest('button'))return;
    photoGesture={id:event.pointerId,x:event.clientX,y:event.clientY};
    try{photoCard.setPointerCapture(event.pointerId);}catch(e){}
  });
  photoCard.addEventListener('pointerup',function(event){
    if(!photoGesture||photoGesture.id!==event.pointerId)return;
    var dx=event.clientX-photoGesture.x;
    var dy=event.clientY-photoGesture.y;
    photoGesture=null;
    if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.25)nextPhoto(dx<0?1:-1);
  });
  photoCard.addEventListener('pointercancel',function(){photoGesture=null;});

  function setRecording(value){
    recording=Boolean(value);
    document.querySelectorAll('[data-record-button]').forEach(function(button){
      button.setAttribute('aria-pressed',recording?'true':'false');
      button.setAttribute('aria-label',recording?'Opname stoppen':'Opname starten');
    });
    document.dispatchEvent(new CustomEvent('talera:storylab-record-toggle',{detail:{recording:recording}}));
  }
  document.querySelectorAll('[data-record-button]').forEach(function(button){button.addEventListener('click',function(){setRecording(!recording);});});

  document.getElementById('backButton').addEventListener('click',function(){
    if(history.length>1)history.back();else location.href='/';
  });
  document.getElementById('menuButton').addEventListener('click',function(){
    document.dispatchEvent(new CustomEvent('talera:storylab-menu'));
  });

  function measureSheet(){
    collapsedY=Math.max(0,sheet.offsetHeight-parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--edge')));
    if(!sheet.classList.contains('open'))setSheetY(collapsedY,false);
  }
  function setSheetY(value,animate){
    sheetY=Math.max(0,Math.min(collapsedY,value));
    sheet.style.transition=animate?'transform .34s cubic-bezier(.22,.78,.25,1)':'none';
    sheet.style.transform='translateY('+String(sheetY)+'px)';
  }
  function settleSheet(open){
    sheet.classList.toggle('open',Boolean(open));
    grab.setAttribute('aria-expanded',open?'true':'false');
    setSheetY(open?0:collapsedY,true);
    if(open)window.setTimeout(function(){sheet.style.transition='';},360);
  }
  function toggleSheet(){settleSheet(!sheet.classList.contains('open'));}

  window.addEventListener('resize',measureSheet);
  window.addEventListener('orientationchange',function(){window.setTimeout(measureSheet,120);});
  window.requestAnimationFrame(measureSheet);

  grab.addEventListener('click',function(event){if(!drag||Math.abs(drag.moved||0)<5)toggleSheet();});
  grab.addEventListener('keydown',function(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleSheet();}});
  grab.addEventListener('pointerdown',function(event){
    drag={id:event.pointerId,startY:event.clientY,startSheetY:sheetY,moved:0};
    sheet.style.transition='none';
    try{grab.setPointerCapture(event.pointerId);}catch(e){}
  });
  grab.addEventListener('pointermove',function(event){
    if(!drag||drag.id!==event.pointerId)return;
    var dy=event.clientY-drag.startY;
    drag.moved=dy;
    setSheetY(drag.startSheetY+dy,false);
  });
  function finishDrag(event){
    if(!drag||drag.id!==event.pointerId)return;
    var moved=drag.moved||0;
    var open=sheetY<collapsedY*.55;
    if(moved<-36)open=true;
    if(moved>36)open=false;
    drag=null;
    settleSheet(open);
  }
  grab.addEventListener('pointerup',finishDrag);
  grab.addEventListener('pointercancel',finishDrag);

  root.addEventListener('pointerdown',function(event){
    if(sheet.classList.contains('open'))return;
    if(event.clientY<window.innerHeight-145)return;
    if(event.target.closest('button'))return;
    edgeGesture={id:event.pointerId,startY:event.clientY};
  });
  root.addEventListener('pointerup',function(event){
    if(!edgeGesture||edgeGesture.id!==event.pointerId)return;
    var dy=event.clientY-edgeGesture.startY;
    edgeGesture=null;
    if(dy<-44)settleSheet(true);
  });
  root.addEventListener('pointercancel',function(){edgeGesture=null;});

  storyText.addEventListener('input',function(){
    try{localStorage.setItem('talera.storylab.text',storyText.textContent||'');}catch(e){}
    document.dispatchEvent(new CustomEvent('talera:storylab-text',{detail:{text:storyText.textContent||''}}));
  });

  window.addEventListener('pagehide',function(){
    if(carouselTimer)window.clearInterval(carouselTimer);
    photos.forEach(function(photo){try{URL.revokeObjectURL(photo.url);}catch(e){}});
  });
})();
</script>
</body>
</html>`;
