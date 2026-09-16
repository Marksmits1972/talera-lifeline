export const CLEAN_STORY_PAGE_REV = 'clean-story-shell-20260916-r1';

export const CLEAN_STORY_HTML = String.raw`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#0b2740">
<title>TALERA — Vertellen</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",system-ui,sans-serif;color:#fff;background:#0b2740;--ink:#0f2747;--cream:#f7f4ef;--warm:#e7a98b;--glass:rgba(7,28,47,.42);--muted:rgba(255,255,255,.72)}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#0b2740;overflow:hidden}body{-webkit-text-size-adjust:100%;overscroll-behavior:none}button,input,textarea{font:inherit}.stage{position:relative;width:100%;height:100svh;min-height:100svh;overflow:hidden;background:linear-gradient(180deg,#526f83 0%,#355a73 38%,#0b2740 100%)}.photoLayer{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .46s ease;will-change:opacity}.photoLayer.show{opacity:1}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,25,42,.58) 0%,rgba(5,25,42,.15) 34%,rgba(5,25,42,.07) 57%,rgba(5,25,42,.76) 100%);pointer-events:none}.noPhotoGlow{position:absolute;inset:0;background:radial-gradient(circle at 50% 48%,rgba(91,143,185,.34),transparent 46%);pointer-events:none}.gestureSurface{position:absolute;z-index:2;left:0;right:0;top:126px;bottom:92px;touch-action:none}.top{position:absolute;z-index:5;left:0;right:0;top:0;padding:max(26px,env(safe-area-inset-top)) 24px 0;pointer-events:none}.brandRow{display:flex;align-items:center;justify-content:space-between;gap:12px}.brand{font-size:14px;font-weight:900;letter-spacing:.22em}.concept{font-size:11px;font-weight:850;letter-spacing:.05em;padding:8px 11px;border-radius:999px;background:rgba(255,255,255,.14);backdrop-filter:blur(10px)}.titleInput{pointer-events:auto;appearance:none;display:block;width:min(88vw,520px);margin:12px 0 0;padding:0;border:0;outline:0;background:transparent;color:#fff;font-size:clamp(26px,7.3vw,35px);font-weight:800;letter-spacing:-.038em;line-height:1.08;text-shadow:0 2px 18px rgba(0,0,0,.25)}.titleInput::placeholder{color:rgba(255,255,255,.82);opacity:1}.datePill{pointer-events:auto;position:relative;display:inline-flex;align-items:center;gap:9px;margin-top:14px;padding:10px 14px;border:1px solid rgba(255,255,255,.46);border-radius:999px;background:rgba(9,34,54,.18);font-weight:780;backdrop-filter:blur(10px);overflow:hidden}.dateIcon{width:18px;height:18px;display:block}.dateInput{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}.photoActions{position:absolute;z-index:6;right:22px;top:max(198px,calc(env(safe-area-inset-top) + 170px));display:flex;align-items:center;gap:9px}.roundTool{position:relative;border:1px solid rgba(255,255,255,.38);border-radius:999px;background:rgba(9,34,54,.28);color:#fff;padding:10px 14px;font-weight:830;backdrop-filter:blur(10px);min-height:44px}.roundTool input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}.removeBtn{display:none;width:44px;padding:0;border-radius:50%;font-size:0}.removeBtn.show{display:grid;place-items:center}.removeBtn svg{width:19px;height:19px}.empty{position:absolute;z-index:3;left:26px;right:26px;top:185px;bottom:205px;display:grid;place-content:center;text-align:center;pointer-events:none}.empty.hide{display:none}.firstPicker{pointer-events:auto;position:relative;width:122px;height:122px;margin:0 auto 22px;border-radius:50%;background:var(--cream);box-shadow:0 18px 46px rgba(0,0,0,.16)}.firstPicker .plus{display:grid;place-items:center;width:100%;height:100%;font-size:55px;font-weight:300;color:var(--ink)}.firstPicker input{position:absolute;inset:0;width:100%;height:100%;opacity:0}.empty h1{margin:0;font-size:27px;line-height:1.08;letter-spacing:-.03em}.empty p{margin:13px auto 0;max-width:320px;color:var(--muted);font-size:16px;line-height:1.42}.photoMeta{position:absolute;z-index:5;left:20px;right:20px;bottom:224px;display:flex;align-items:center;justify-content:center;pointer-events:none}.dots{display:flex;align-items:center;justify-content:center;gap:7px;padding:7px 10px;border-radius:999px;background:rgba(5,25,42,.30);backdrop-filter:blur(8px);min-height:26px}.dots:empty{display:none}.dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.42);transition:transform .2s ease,background .2s ease}.dot.active{background:#fff;transform:scale(1.24)}.micZone{position:absolute;z-index:7;left:0;right:0;bottom:112px;display:flex;flex-direction:column;align-items:center;pointer-events:none}.micButton{pointer-events:auto;width:104px;height:104px;border:1px solid rgba(255,255,255,.62);border-radius:50%;background:rgba(247,244,239,.94);color:var(--ink);display:grid;place-items:center;box-shadow:0 18px 46px rgba(0,0,0,.18);transition:transform .2s ease,box-shadow .2s ease}.micButton:active{transform:scale(.97)}.micButton.recording{box-shadow:0 0 0 8px rgba(231,169,139,.20),0 18px 46px rgba(0,0,0,.18)}.micButton svg{width:36px;height:36px}.micLabel{margin-top:10px;font-size:14px;font-weight:820;text-shadow:0 2px 10px rgba(0,0,0,.28)}.recordControls{pointer-events:auto;display:none;gap:8px;margin-top:10px;padding:6px;border-radius:999px;background:rgba(6,28,47,.42);backdrop-filter:blur(12px)}.recordControls.show{display:flex}.recordAction{border:0;border-radius:999px;background:rgba(255,255,255,.16);color:#fff;padding:9px 14px;font-size:13px;font-weight:820;min-width:82px}.recordAction.finish{background:rgba(247,244,239,.92);color:var(--ink)}.statusBadge{position:absolute;z-index:6;left:20px;bottom:219px;max-width:calc(100vw - 40px);padding:8px 11px;border-radius:999px;background:rgba(5,38,43,.62);font-size:12px;font-weight:800;backdrop-filter:blur(10px);opacity:0;transform:translateY(4px);transition:.2s ease;pointer-events:none}.statusBadge.show{opacity:1;transform:none}.transcriptSheet{position:absolute;z-index:10;left:0;right:0;bottom:0;height:min(78svh,720px);background:var(--cream);color:var(--ink);border-radius:28px 28px 0 0;box-shadow:0 -16px 50px rgba(0,0,0,.18);transform:translateY(calc(100% - 88px));transition:transform .38s cubic-bezier(.22,.75,.23,1);touch-action:none}.transcriptSheet.open{transform:translateY(0)}.sheetPeek{height:88px;padding:10px 22px 14px;cursor:pointer}.handle{width:64px;height:6px;border-radius:99px;background:#c0c7cf;margin:0 auto 10px}.peekRow{display:flex;align-items:center;justify-content:space-between;gap:14px}.peekTitle{font-size:14px;font-weight:850;color:#5b6c80}.peekText{font-size:13px;color:#8a96a4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:58vw}.sheetBody{height:calc(100% - 88px);padding:8px 22px calc(20px + env(safe-area-inset-bottom));display:flex;flex-direction:column}.sheetHead{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.sheetHead h2{margin:0;font-size:28px;letter-spacing:-.035em}.sheetHead p{margin:7px 0 0;color:#6a7786;font-size:13px;line-height:1.4}.closeSheet{border:0;border-radius:999px;background:#e5eaf0;color:var(--ink);font-weight:830;padding:9px 12px}.storyText{flex:1;width:100%;margin-top:16px;border:0;outline:0;resize:none;background:transparent;color:var(--ink);font-size:18px;line-height:1.55;padding:0}.storyText::placeholder{color:#a0a9b3}.audioMeta{font-size:12px;font-weight:760;color:#718090;padding-top:10px}.sheetFooter{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid #e1e5e9;padding-top:12px;margin-top:10px}.sheetHint{font-size:12px;color:#84909d}.typeHint{font-size:12px;font-weight:800;color:#5c6f84}@media (min-width:700px){.stage{max-width:520px;margin:0 auto;box-shadow:0 0 70px rgba(0,0,0,.28)}.transcriptSheet{left:50%;right:auto;width:520px;transform:translate(-50%,calc(100% - 88px))}.transcriptSheet.open{transform:translate(-50%,0)}}
</style>
</head>
<body>
<main class="stage" id="stage">
  <img class="photoLayer" id="photoA" alt="Foto bij deze herinnering">
  <img class="photoLayer" id="photoB" alt="Foto bij deze herinnering">
  <div class="noPhotoGlow" id="noPhotoGlow"></div>
  <div class="shade"></div>
  <div class="gestureSurface" id="gestureSurface" aria-hidden="true"></div>

  <header class="top">
    <div class="brandRow"><div class="brand">TALERA</div><div class="concept">concept</div></div>
    <input id="titleInput" class="titleInput" type="text" maxlength="140" autocomplete="off" placeholder="Titel van deze herinnering" aria-label="Titel van deze herinnering">
    <label class="datePill" id="datePill">
      <svg class="dateIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path></svg>
      <span id="dateLabel">Wanneer was dit?</span>
      <input id="dateInput" class="dateInput" type="date" aria-label="Datum van deze herinnering">
    </label>
  </header>

  <div class="photoActions" id="photoActions">
    <label class="roundTool">+ foto<input id="addPhotoInput" type="file" accept="image/*" multiple aria-label="Voeg foto’s toe"></label>
    <button class="roundTool removeBtn" id="removePhoto" type="button" aria-label="Verwijder actieve foto">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 10v7M14 10v7"></path></svg>
    </button>
  </div>

  <section class="empty" id="empty">
    <label class="firstPicker"><span class="plus">+</span><input id="firstPhotoInput" type="file" accept="image/*" multiple aria-label="Kies foto’s"></label>
    <h1>Kies foto’s die je herinnering oproepen</h1>
    <p>Ze blijven groot in beeld terwijl jij rustig je verhaal vertelt.</p>
  </section>

  <div class="photoMeta"><div class="dots" id="dots"></div></div>
  <div class="statusBadge" id="statusBadge"></div>

  <div class="micZone">
    <button class="micButton" id="micButton" type="button" aria-label="Start geluidsopname">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3M9 21h6"></path></svg>
    </button>
    <div class="micLabel" id="micLabel">Vertel wat je herinnert</div>
    <div class="recordControls" id="recordControls">
      <button class="recordAction" id="pauseButton" type="button">Pauze</button>
      <button class="recordAction finish" id="finishButton" type="button">Klaar</button>
    </div>
  </div>

  <section class="transcriptSheet" id="transcriptSheet" aria-label="Tekst van deze herinnering">
    <div class="sheetPeek" id="sheetPeek">
      <div class="handle"></div>
      <div class="peekRow"><span class="peekTitle">Veeg omhoog voor je verhaal</span><span class="peekText" id="peekText">Transcript / tekst</span></div>
    </div>
    <div class="sheetBody">
      <div class="sheetHead"><div><h2>Je verhaal</h2><p>De foto en je originele stem blijven de bron. Hier kun je de tekst later rustig lezen of corrigeren.</p></div><button class="closeSheet" id="closeSheet" type="button">Terug</button></div>
      <textarea class="storyText" id="storyText" maxlength="20000" placeholder="Je transcript of eigen tekst komt hier…"></textarea>
      <div class="audioMeta" id="audioMeta">Nog geen stemopname bewaard.</div>
      <div class="sheetFooter"><span class="sheetHint">Veeg omlaag om terug te gaan naar de foto</span><span class="typeHint">typen mag ook</span></div>
    </div>
  </section>
</main>
<script>
(function(){
  'use strict';
  var DRAFT_KEY='talera-clean-story-v2';
  var LEGACY_PHOTO_KEY='talera-clean-rebuild-photo-v1';
  var MAX_PHOTOS=12;
  var CAROUSEL_MS=2500;
  var state={title:'',eventDate:'',photos:[],activePhoto:0,audioSegments:[],text:''};
  var uploadBusy=false;
  var manualHoldUntil=0;
  var carouselTimer=0;
  var recording=false;
  var recorder=null;
  var stream=null;
  var chunks=[];
  var chosenMime='';
  var transientUrl='';
  var front='A';
  var dragStart=null;
  var sheetDragStart=null;

  var stage=document.getElementById('stage');
  var photoA=document.getElementById('photoA');
  var photoB=document.getElementById('photoB');
  var noPhotoGlow=document.getElementById('noPhotoGlow');
  var empty=document.getElementById('empty');
  var dots=document.getElementById('dots');
  var titleInput=document.getElementById('titleInput');
  var dateInput=document.getElementById('dateInput');
  var dateLabel=document.getElementById('dateLabel');
  var firstPhotoInput=document.getElementById('firstPhotoInput');
  var addPhotoInput=document.getElementById('addPhotoInput');
  var removePhoto=document.getElementById('removePhoto');
  var statusBadge=document.getElementById('statusBadge');
  var micButton=document.getElementById('micButton');
  var micLabel=document.getElementById('micLabel');
  var recordControls=document.getElementById('recordControls');
  var pauseButton=document.getElementById('pauseButton');
  var finishButton=document.getElementById('finishButton');
  var transcriptSheet=document.getElementById('transcriptSheet');
  var sheetPeek=document.getElementById('sheetPeek');
  var closeSheet=document.getElementById('closeSheet');
  var storyText=document.getElementById('storyText');
  var peekText=document.getElementById('peekText');
  var audioMeta=document.getElementById('audioMeta');
  var gestureSurface=document.getElementById('gestureSurface');

  function safeParse(value){try{return JSON.parse(value);}catch(e){return null;}}
  function loadState(){
    var saved=safeParse(localStorage.getItem(DRAFT_KEY)||'');
    if(saved&&typeof saved==='object'){
      state.title=String(saved.title||'').slice(0,140);
      state.eventDate=String(saved.eventDate||'').slice(0,10);
      state.photos=Array.isArray(saved.photos)?saved.photos.filter(function(p){return p&&p.id&&p.url;}).slice(0,MAX_PHOTOS):[];
      state.activePhoto=Math.max(0,Math.min(Number(saved.activePhoto)||0,Math.max(0,state.photos.length-1)));
      state.audioSegments=Array.isArray(saved.audioSegments)?saved.audioSegments.filter(function(a){return a&&a.id&&a.url;}):[];
      state.text=String(saved.text||'').slice(0,20000);
      return;
    }
    var legacy=safeParse(localStorage.getItem(LEGACY_PHOTO_KEY)||'');
    if(legacy&&legacy.id&&legacy.url){state.photos=[{id:String(legacy.id),url:String(legacy.url),mimeType:String(legacy.mimeType||''),bytes:Number(legacy.bytes)||0}];}
  }
  function saveState(){
    try{localStorage.setItem(DRAFT_KEY,JSON.stringify({title:state.title,eventDate:state.eventDate,photos:state.photos,activePhoto:state.activePhoto,audioSegments:state.audioSegments,text:state.text,savedAt:Date.now()}));}catch(e){}
  }
  function localToday(){var d=new Date();var y=d.getFullYear();var m=String(d.getMonth()+1).padStart(2,'0');var day=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+day;}
  function formatDate(value){if(!value)return 'Wanneer was dit?';var parts=value.split('-');if(parts.length!==3)return value;var d=new Date(Number(parts[0]),Number(parts[1])-1,Number(parts[2]));try{return new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric'}).format(d);}catch(e){return value;}}
  function flash(text,ms){statusBadge.textContent=text;statusBadge.classList.add('show');clearTimeout(flash.timer);flash.timer=setTimeout(function(){statusBadge.classList.remove('show');},ms||2600);}
  function updateDots(){
    dots.innerHTML='';
    if(state.photos.length<2)return;
    state.photos.forEach(function(_,index){var dot=document.createElement('span');dot.className='dot'+(index===state.activePhoto?' active':'');dots.appendChild(dot);});
  }
  function updateUi(){
    titleInput.value=state.title;
    dateInput.value=state.eventDate;
    dateLabel.textContent=formatDate(state.eventDate);
    storyText.value=state.text;
    peekText.textContent=state.text.trim()?state.text.trim().replace(/\s+/g,' ').slice(0,70):'Transcript / tekst';
    empty.classList.toggle('hide',state.photos.length>0);
    noPhotoGlow.style.display=state.photos.length?'none':'block';
    removePhoto.classList.toggle('show',state.photos.length>0);
    audioMeta.textContent=state.audioSegments.length?(state.audioSegments.length===1?'1 stemopname veilig bewaard.':state.audioSegments.length+' stemopnames veilig bewaard.'):'Nog geen stemopname bewaard.';
    if(!recording)micLabel.textContent=state.audioSegments.length?'Nog iets vertellen':'Vertel wat je herinnert';
    updateDots();
    if(state.photos.length)showActivePhoto(true);else{photoA.classList.remove('show');photoB.classList.remove('show');}
  }
  function photoUrl(item){return item&&item.url?String(item.url):'';}
  function showImageOn(el,url,onReady){
    el.onload=function(){if(onReady)onReady();};
    el.onerror=function(){flash('Deze foto kon niet worden weergegeven.',3200);};
    el.src=url;
  }
  function showActivePhoto(immediate){
    if(!state.photos.length)return;
    state.activePhoto=Math.max(0,Math.min(state.activePhoto,state.photos.length-1));
    var url=photoUrl(state.photos[state.activePhoto]);if(!url)return;
    var incoming=front==='A'?photoB:photoA;
    var outgoing=front==='A'?photoA:photoB;
    if(immediate&&!outgoing.src){showImageOn(outgoing,url,function(){outgoing.classList.add('show');});front=front==='A'?'A':'B';return;}
    showImageOn(incoming,url,function(){incoming.classList.add('show');outgoing.classList.remove('show');front=front==='A'?'B':'A';});
    updateDots();
  }
  function showTransient(file){
    if(transientUrl){try{URL.revokeObjectURL(transientUrl);}catch(e){}}
    transientUrl=URL.createObjectURL(file);
    var active=front==='A'?photoA:photoB;
    active.src=transientUrl;active.classList.add('show');
    empty.classList.add('hide');noPhotoGlow.style.display='none';
  }
  function releaseTransient(){if(transientUrl){try{URL.revokeObjectURL(transientUrl);}catch(e){}transientUrl='';}}
  async function uploadOnePhoto(file,index,total){
    var form=new FormData();form.append('photo',file,file.name||('foto-'+Date.now()+'.jpg'));
    flash('Foto '+index+' van '+total+' veilig bewaren…',5000);
    var response=await fetch('/api/clean/photo',{method:'POST',body:form,cache:'no-store'});
    var data={};try{data=await response.json();}catch(e){}
    if(!response.ok||!data.ok||!data.id)throw new Error(data.error||('Upload mislukt (HTTP '+response.status+').'));
    return {id:data.id,url:data.playbackUrl,mimeType:data.mimeType||file.type||'',bytes:Number(data.bytes)||file.size,sha256:data.sha256||'',createdAt:data.createdAt||''};
  }
  async function addPhotos(fileList){
    if(uploadBusy)return;
    var files=Array.prototype.slice.call(fileList||[]).filter(function(file){return file&&file.size&&String(file.type||'').toLowerCase().indexOf('image/')===0;});
    var room=Math.max(0,MAX_PHOTOS-state.photos.length);files=files.slice(0,room);
    if(!files.length){flash(room?'Kies één of meer afbeeldingen.':'Maximaal '+MAX_PHOTOS+' foto’s per herinnering.',3200);return;}
    uploadBusy=true;
    showTransient(files[0]);
    var firstNewIndex=state.photos.length;
    var saved=0;
    try{
      for(var i=0;i<files.length;i++){
        try{var item=await uploadOnePhoto(files[i],i+1,files.length);state.photos.push(item);saved++;state.activePhoto=state.photos.length-1;saveState();showActivePhoto(false);}catch(error){flash(error.message||'Foto opslaan mislukt.',3800);}
      }
    }finally{
      uploadBusy=false;releaseTransient();firstPhotoInput.value='';addPhotoInput.value='';
      if(saved){state.activePhoto=Math.min(firstNewIndex,state.photos.length-1);saveState();showActivePhoto(false);updateUi();flash(saved===1?'✓ Foto veilig bewaard':'✓ '+saved+' foto’s veilig bewaard',3000);restartCarousel();}
    }
  }
  async function removeActivePhoto(){
    if(!state.photos.length||uploadBusy)return;
    var item=state.photos[state.activePhoto];
    try{var res=await fetch('/api/clean/photo/'+encodeURIComponent(item.id),{method:'DELETE',cache:'no-store'});if(!res.ok)throw new Error('Verwijderen mislukt.');}catch(error){flash(error.message||'Verwijderen mislukt.',3000);return;}
    state.photos.splice(state.activePhoto,1);state.activePhoto=Math.max(0,Math.min(state.activePhoto,state.photos.length-1));saveState();updateUi();flash('Foto verwijderd.',1800);restartCarousel();
  }
  function movePhoto(step,manual){
    if(state.photos.length<2)return;
    if(manual)manualHoldUntil=Date.now()+6000;
    state.activePhoto=(state.activePhoto+step+state.photos.length)%state.photos.length;saveState();showActivePhoto(false);updateDots();
  }
  function restartCarousel(){clearInterval(carouselTimer);carouselTimer=setInterval(function(){if(state.photos.length>1&&!uploadBusy&&!transcriptSheet.classList.contains('open')&&Date.now()>manualHoldUntil)movePhoto(1,false);},CAROUSEL_MS);}
  function openSheet(){transcriptSheet.classList.add('open');manualHoldUntil=Date.now()+10000;setTimeout(function(){storyText.focus({preventScroll:true});},420);}
  function closeSheetNow(){transcriptSheet.classList.remove('open');storyText.blur();manualHoldUntil=Date.now()+2200;}

  function isAppleMobile(){var ua=String(navigator.userAgent||'');return /iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1);}
  function chooseMime(){var list=isAppleMobile()?['audio/mp4','audio/webm;codecs=opus','audio/webm']:['audio/webm;codecs=opus','audio/webm','audio/mp4'];for(var i=0;i<list.length;i++){try{if(MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(list[i]))return list[i];}catch(e){}}return '';}
  function filenameFor(type){type=String(type||'').toLowerCase();if(type.indexOf('mp4')>=0||type.indexOf('m4a')>=0)return 'talera-stem.m4a';if(type.indexOf('ogg')>=0)return 'talera-stem.ogg';return 'talera-stem.webm';}
  function stopTracks(){if(stream){stream.getTracks().forEach(function(track){try{track.stop();}catch(e){}});}stream=null;}
  async function startRecording(){
    if(recording)return;
    if(!window.isSecureContext||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder!=='function'){flash('Deze browser kan de microfoon hier niet openen.',3600);return;}
    micLabel.textContent='Microfoon openen…';micButton.disabled=true;
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      chosenMime=chooseMime();chunks=[];
      recorder=new MediaRecorder(stream,chosenMime?{mimeType:chosenMime}:undefined);
      recorder.ondataavailable=function(event){if(event.data&&event.data.size>0)chunks.push(event.data);};
      recorder.onerror=function(){flash('Er ging iets mis tijdens de opname.',3400);};
      recorder.onstop=finalizeRecording;
      recorder.start();recording=true;micButton.disabled=false;micButton.classList.add('recording');recordControls.classList.add('show');micLabel.textContent='Opname loopt';pauseButton.textContent='Pauze';flash('Microfoon actief. Neem rustig je tijd.',2200);
    }catch(error){stopTracks();recorder=null;recording=false;micButton.disabled=false;micLabel.textContent=state.audioSegments.length?'Nog iets vertellen':'Vertel wat je herinnert';flash('Microfoon kon niet worden geopend.',3600);}
  }
  function togglePause(){
    if(!recorder||!recording)return;
    try{if(recorder.state==='recording'){recorder.pause();pauseButton.textContent='Verder';micLabel.textContent='Opname gepauzeerd';}else if(recorder.state==='paused'){recorder.resume();pauseButton.textContent='Pauze';micLabel.textContent='Opname loopt';}}catch(e){flash('Pauzeren lukte niet.',2600);}
  }
  function finishRecording(){if(!recorder||!recording)return;finishButton.disabled=true;pauseButton.disabled=true;micLabel.textContent='Stem veilig bewaren…';try{recorder.stop();}catch(e){finishButton.disabled=false;pauseButton.disabled=false;}}
  async function finalizeRecording(){
    recording=false;micButton.classList.remove('recording');recordControls.classList.remove('show');stopTracks();
    var type=(recorder&&recorder.mimeType)||chosenMime||(chunks[0]&&chunks[0].type)||'application/octet-stream';
    var blob=new Blob(chunks,{type:type});chunks=[];recorder=null;finishButton.disabled=false;pauseButton.disabled=false;
    if(!blob.size){micLabel.textContent='Vertel wat je herinnert';flash('Er kwam geen bruikbare opname binnen.',3300);return;}
    try{
      var form=new FormData();form.append('audio',blob,filenameFor(type));
      var response=await fetch('/api/clean/audio',{method:'POST',body:form,cache:'no-store'});var data={};try{data=await response.json();}catch(e){}
      if(!response.ok||!data.ok||!data.id)throw new Error(data.error||'Stem opslaan mislukt.');
      state.audioSegments.push({id:data.id,url:data.playbackUrl,mimeType:data.mimeType||type,bytes:Number(data.bytes)||blob.size,sha256:data.sha256||'',createdAt:data.createdAt||''});saveState();updateUi();flash('✓ Originele stem veilig bewaard',3000);
    }catch(error){micLabel.textContent='Opname nog niet veilig bewaard';flash(error.message||'Stem opslaan mislukt.',4200);}
  }

  titleInput.addEventListener('input',function(){state.title=titleInput.value.slice(0,140);saveState();});
  storyText.addEventListener('input',function(){state.text=storyText.value.slice(0,20000);peekText.textContent=state.text.trim()?state.text.trim().replace(/\s+/g,' ').slice(0,70):'Transcript / tekst';saveState();});
  dateInput.max=localToday();
  dateInput.addEventListener('change',async function(){
    var value=String(dateInput.value||'');if(!value)return;
    if(value>localToday()){dateInput.value=state.eventDate;flash('Een herinnering kan niet in de toekomst staan.',3200);return;}
    try{var res=await fetch('/api/clean/date-policy',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({date:value,timezoneOffsetMinutes:new Date().getTimezoneOffset()}),cache:'no-store'});var data=await res.json();if(!res.ok||!data.ok)throw new Error(data.error||'Datum niet geldig.');state.eventDate=value;saveState();dateLabel.textContent=formatDate(value);}catch(error){dateInput.value=state.eventDate;flash(error.message||'Datum kon niet worden gecontroleerd.',3400);}
  });
  firstPhotoInput.addEventListener('change',function(){addPhotos(firstPhotoInput.files);});
  addPhotoInput.addEventListener('change',function(){addPhotos(addPhotoInput.files);});
  removePhoto.addEventListener('click',removeActivePhoto);
  micButton.addEventListener('click',startRecording);
  pauseButton.addEventListener('click',togglePause);
  finishButton.addEventListener('click',finishRecording);
  sheetPeek.addEventListener('click',function(){if(!transcriptSheet.classList.contains('open'))openSheet();});
  closeSheet.addEventListener('click',closeSheetNow);

  gestureSurface.addEventListener('pointerdown',function(event){dragStart={x:event.clientX,y:event.clientY,id:event.pointerId};try{gestureSurface.setPointerCapture(event.pointerId);}catch(e){}});
  gestureSurface.addEventListener('pointerup',function(event){if(!dragStart)return;var dx=event.clientX-dragStart.x;var dy=event.clientY-dragStart.y;dragStart=null;if(Math.abs(dx)>52&&Math.abs(dx)>Math.abs(dy)*1.15){movePhoto(dx<0?1:-1,true);return;}if(dy<-58&&Math.abs(dy)>Math.abs(dx)*1.1)openSheet();});
  gestureSurface.addEventListener('pointercancel',function(){dragStart=null;});
  transcriptSheet.addEventListener('pointerdown',function(event){if(event.target.closest('textarea,button'))return;sheetDragStart={x:event.clientX,y:event.clientY,id:event.pointerId};});
  transcriptSheet.addEventListener('pointerup',function(event){if(!sheetDragStart)return;var dy=event.clientY-sheetDragStart.y;var dx=event.clientX-sheetDragStart.x;sheetDragStart=null;if(dy>60&&Math.abs(dy)>Math.abs(dx)*1.1)closeSheetNow();});

  window.addEventListener('pagehide',function(){if(recording&&recorder&&recorder.state!=='inactive'){try{recorder.stop();}catch(e){}}stopTracks();releaseTransient();});
  loadState();updateUi();restartCarousel();
})();
</script>
</body>
</html>`;
