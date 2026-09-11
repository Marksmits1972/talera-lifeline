export const WORKBLAD_V2_SCRIPT = String.raw`<script>(function(){
var DB_NAME='talera-workblad-v2',STORE='drafts',draftTimer=null,draftLoaded=false,redirectTimer=0;
var TIMELINE_URL='https://talera-timeline-prototype.mark-a39.workers.dev/';
function ensure(){
  if(typeof state.workTitle!=='string')state.workTitle='';
  if(typeof state.workDate!=='string')state.workDate='';
  if(typeof state.workText!=='string')state.workText='';
  if(typeof state.workError!=='string')state.workError='';
  if(!Array.isArray(state.workMedia))state.workMedia=[];
  if(!Array.isArray(state.newPhotoFiles))state.newPhotoFiles=[];
  if(typeof state.editingStoryId!=='string')state.editingStoryId='';
  if(typeof state.editingToken!=='string')state.editingToken='';
  if(typeof state.hasExistingAudio!=='boolean')state.hasExistingAudio=false;
  state.sourceMode='workblad';
}
function fmt(v){v=Math.max(0,Math.round(Number(v)||0));return Math.floor(v/60)+':'+String(v%60).padStart(2,'0')}
function escAttr(s){return esc(String(s||''))}
function dbOpen(){return new Promise(function(ok,no){if(!indexedDB)return no(new Error('no db'));var r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=function(){if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'})};r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function revokeMediaUrls(){ensure();state.workMedia.forEach(function(m){if(m&&m.localUrl)try{URL.revokeObjectURL(m.localUrl)}catch(e){}})}
function mediaFromFiles(files){return files.map(function(file,index){return {kind:'local',file:file,localUrl:URL.createObjectURL(file),name:file.name||('foto-'+(index+1))}})}
async function draftLoad(){
  ensure();
  try{
    var db=await dbOpen();
    var d=await new Promise(function(ok,no){var r=db.transaction(STORE,'readonly').objectStore(STORE).get('current');r.onsuccess=function(){ok(r.result||null)};r.onerror=function(){no(r.error)}});
    db.close();
    if(d){
      state.workTitle=d.title||'';state.workDate=d.date||'';state.workText=d.text||'';
      state.audioBlob=d.audio||null;state.duration=Number(d.duration)||0;state.liveTranscript=d.transcript||'';
      var files=Array.isArray(d.photos)?d.photos.filter(function(x){return x instanceof Blob}):[];
      revokeMediaUrls();state.workMedia=mediaFromFiles(files);state.newPhotoFiles=files.slice();
    }
  }catch(e){
    try{var p=JSON.parse(localStorage.getItem('talera-workblad-text-v2')||'null');if(p){state.workTitle=p.title||'';state.workDate=p.date||'';state.workText=p.text||''}}catch(_){ }
  }
  draftLoaded=true;
}
async function draftSave(){
  if(!draftLoaded||state.editingStoryId)return;
  ensure();
  var photos=state.workMedia.filter(function(m){return m&&m.kind==='local'&&m.file}).map(function(m){return m.file});
  var d={id:'current',title:state.workTitle||'',date:state.workDate||'',text:state.workText||'',photos:photos,audio:state.audioBlob||null,duration:Number(state.duration)||0,transcript:state.liveTranscript||'',savedAt:Date.now()};
  try{var db=await dbOpen();await new Promise(function(ok,no){var tx=db.transaction(STORE,'readwrite');tx.oncomplete=ok;tx.onerror=function(){no(tx.error)};tx.objectStore(STORE).put(d)});db.close()}
  catch(e){try{localStorage.setItem('talera-workblad-text-v2',JSON.stringify({title:d.title,date:d.date,text:d.text}))}catch(_){ }}
}
function draftSoon(){clearTimeout(draftTimer);draftTimer=setTimeout(draftSave,180)}
async function draftClear(){try{var db=await dbOpen();await new Promise(function(ok,no){var tx=db.transaction(STORE,'readwrite');tx.oncomplete=ok;tx.onerror=function(){no(tx.error)};tx.objectStore(STORE).delete('current')});db.close()}catch(e){}try{localStorage.removeItem('talera-workblad-text-v2')}catch(e){}}
function capture(){var a=document.getElementById('workTitle'),b=document.getElementById('workDate'),c=document.getElementById('workText');if(a)state.workTitle=a.value;if(b)state.workDate=b.value;if(c)state.workText=c.value}
function photoHtml(){
  ensure();
  var input='<input id="workPhotoInput" class="work-photo-input" type="file" accept="image/*" multiple>';
  if(!state.workMedia.length)return '<div class="work-photo-section"><button id="workPhoto" class="work-photo" type="button"><span class="work-photo-empty"><span class="work-photo-plus">+</span><span>Voeg foto’s toe als je wilt</span></span></button>'+input+'</div>';
  var cover=state.workMedia[0],src=cover.localUrl||'';
  var thumbs=state.workMedia.slice(0,6).map(function(m,i){return '<span class="work-photo-thumb '+(i===0?'active':'')+'"><img src="'+escAttr(m.localUrl||'')+'" alt=""></span>'}).join('');
  var extra=state.workMedia.length>6?'<span class="work-photo-more">+'+(state.workMedia.length-6)+'</span>':'';
  return '<div class="work-photo-section"><button id="workPhoto" class="work-photo has-photo" type="button"><img src="'+escAttr(src)+'" alt="Foto bij deze herinnering"><span class="work-photo-change">Foto’s toevoegen</span><span class="work-photo-count">'+state.workMedia.length+(state.workMedia.length===1?' foto':' foto’s')+'</span></button><div class="work-photo-strip">'+thumbs+extra+'</div>'+input+'</div>';
}
function voiceHtml(){if(!state.audioBlob&&!state.hasExistingAudio)return '';return '<div class="work-voice-note"><span class="work-voice-mark"></span><span class="work-voice-copy"><strong>Gesproken verhaal toegevoegd</strong><span>'+fmt(state.duration)+' · je kunt nog iets inspreken</span></span></div>'}
function renderWorkblad(){
  ensure();state.view='workblad';
  var editLabel=state.editingStoryId?'Herinnering bewerken':'Herinnering in aanbouw';
  app.innerHTML='<div class="work-stage"><div class="work-top"><div class="work-brand">TALERA</div></div><div class="work-scroll"><article class="work-sheet"><div class="work-kicker">'+editLabel+'</div><input id="workTitle" class="work-title" maxlength="140" placeholder="Waar gaat deze herinnering over?" value="'+escAttr(state.workTitle)+'"><div class="work-date-row"><span class="work-date-dot"></span><input id="workDate" class="work-date" maxlength="120" placeholder="Wanneer was dit? Bijvoorbeeld zomer 1987" value="'+escAttr(state.workDate)+'"></div>'+photoHtml()+'<textarea id="workText" class="work-story" maxlength="20000" placeholder="Schrijf wat je wilt onthouden…">'+esc(state.workText)+'</textarea>'+voiceHtml()+(state.workError?'<div class="work-error">'+esc(state.workError)+'</div>':'')+'<div class="work-tools"><button id="workVoice" class="work-tool voice" type="button">'+(state.audioBlob?'Vertel verder':'Vertel erbij')+'</button></div><div class="work-hint">Je hoeft dit niet in één keer af te maken.</div></article></div><div class="work-actions"><div class="work-draft">'+(state.editingStoryId?'Wijzigingen blijven bij dezelfde herinnering.':'Concept wordt op dit toestel bewaard.')+'</div><button id="workFinish" class="work-finish" type="button">Op mijn tijdlijn</button></div></div>';
  ['workTitle','workDate','workText'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('input',function(){capture();state.workError='';draftSoon()})});
  var p=document.getElementById('workPhoto'),i=document.getElementById('workPhotoInput');if(p)p.onclick=photoPick;if(i)i.onchange=function(){var files=[].slice.call(i.files||[]);if(files.length)applyPhotoFiles(files)};
  document.getElementById('workVoice').onclick=voiceStart;document.getElementById('workFinish').onclick=finishWorkblad;
}
function photoPick(){capture();var i=document.getElementById('workPhotoInput');if(!i)return;i.value='';i.click()}
function applyPhotoFiles(files){
  ensure();
  var room=Math.max(0,12-state.workMedia.length);var chosen=files.filter(function(f){return f&&String(f.type||'').indexOf('image/')===0}).slice(0,room);
  if(!chosen.length){if(room===0){state.workError='Voor deze herinnering houden we voorlopig maximaal 12 foto’s aan.';renderWorkblad()}return}
  chosen.forEach(function(f){state.workMedia.push({kind:'local',file:f,localUrl:URL.createObjectURL(f),name:f.name||'foto'});state.newPhotoFiles.push(f)});
  state.workError='';renderWorkblad();draftSave();
}
function mergeSpoken(base,spoken){base=String(base||'').replace(/\s+$/,'');spoken=String(spoken||'').trim();if(!spoken)return base;return base+(base?'\n\n':'')+spoken}
function syncLiveTranscript(){state.workText=mergeSpoken(state.workTextBeforeVoice||'',state.liveTranscript||'');var el=document.getElementById('workText');if(el){el.value=state.workText;el.scrollTop=el.scrollHeight}}
function setupWorkRecognition(){var R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return;try{var r=new R();r.lang='nl-NL';r.continuous=true;r.interimResults=true;state.recognitionFinal='';r.onresult=function(e){var finalText=state.recognitionFinal||'',interim='';for(var i=e.resultIndex;i<e.results.length;i++){var piece=(e.results[i][0].transcript||'').trim();if(!piece)continue;if(e.results[i].isFinal)finalText+=(finalText?' ':'')+piece;else interim+=(interim?' ':'')+piece}state.recognitionFinal=finalText.trim();state.liveTranscript=(state.recognitionFinal+(interim?' '+interim:'')).trim();syncLiveTranscript()};r.onerror=function(){};r.onend=function(){if(state.stream&&state.view==='listening'){state.recognitionFinal=(state.liveTranscript||state.recognitionFinal||'').trim();try{r.start()}catch(e){}}};r.start();state.recognition=r}catch(e){}}
async function voiceStart(){capture();await draftSave();state.prevAudio=state.audioBlob||null;state.prevDuration=Number(state.duration)||0;state.prevTranscript=typeof state.liveTranscript==='string'?state.liveTranscript:'';state.prevWorkText=typeof state.workText==='string'?state.workText:'';state.workTextBeforeVoice=state.workText||'';state.hasSpeech=false;state.lastSpeechAt=0;state.voice=0;state.paused=false;state.chunks=[];state.liveTranscript='';state.recognitionFinal='';state.startedAt=0;document.documentElement.style.setProperty('--voice','0');document.documentElement.style.setProperty('--awake','0');voiceLayer('Even luisteren…',true);try{state.stream=await navigator.mediaDevices.getUserMedia({audio:true});setupWorkAudio();setupWorkRecognition();startWorkRecorder();voiceListening()}catch(e){state.audioBlob=state.prevAudio;state.duration=state.prevDuration;state.liveTranscript=state.prevTranscript;state.workText=state.prevWorkText;stopMedia();state.workError='De microfoon kon niet worden geopend. Controleer de toestemming en probeer opnieuw.';renderWorkblad()}}
function voiceLayer(message,initializing){renderWorkblad();state.view=initializing?'mic-initializing':'listening';var stage=document.querySelector('.work-stage');if(stage)stage.classList.add('voice-open');var layer=document.createElement('div');layer.id='voiceLayer';layer.className='voice-layer';layer.innerHTML='<button id="voiceClose" class="voice-close" aria-label="Sluiten">×</button><div class="voice-center">'+core(false,!initializing)+'<div id="status" class="voice-status">'+esc(message)+'</div></div><div class="voice-bottom"><button id="singleControl" class="pill hidden">Pauze</button></div>';app.appendChild(layer);document.getElementById('voiceClose').onclick=voiceCancel;document.getElementById('singleControl').onclick=finishWorkSpeech}
function voiceListening(){var old=document.getElementById('voiceLayer');if(old)old.remove();voiceLayer('Neem je tijd. Ik luister.',false);state.view='listening'}
function setupWorkAudio(){state.context=new (window.AudioContext||window.webkitAudioContext)();state.analyser=state.context.createAnalyser();state.analyser.fftSize=256;state.source=state.context.createMediaStreamSource(state.stream);state.source.connect(state.analyser);var arr=new Uint8Array(state.analyser.frequencyBinCount);(function loop(){if(!state.analyser)return;state.analyser.getByteFrequencyData(arr);var sum=0;for(var i=0;i<arr.length;i++)sum+=arr[i];var n=Math.max(0,Math.min(1,(sum/arr.length-8)/42));state.voice=state.voice*.72+n*.28;document.documentElement.style.setProperty('--voice',state.voice.toFixed(3));if(state.voice>.08){state.lastSpeechAt=performance.now();if(!state.hasSpeech){state.hasSpeech=true;state.startedAt=Date.now();document.documentElement.style.setProperty('--awake','1');postEvent('first_speech',{mode:'workblad-v2'})}updateSpeechUi(true)}else updateSpeechUi(false);state.raf=requestAnimationFrame(loop)})()}
function finishWorkSpeech(){syncLiveTranscript();if(!state.hasSpeech){state.workError='Ik heb nog geen verhaal gehoord. Je kunt rustig beginnen wanneer je wilt.';voiceCancel();return}state.view='finishing';if(state.recorder&&state.recorder.state!=='inactive')state.recorder.stop();else{stopMedia();draftSave().finally(renderWorkblad)}}
function startWorkRecorder(){var mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(function(x){return MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(x)})||'';state.chunks=[];state.recorder=new MediaRecorder(state.stream,mime?{mimeType:mime}:undefined);state.recorder.ondataavailable=function(e){if(e.data&&e.data.size)state.chunks.push(e.data)};state.recorder.onstop=function(){var b=new Blob(state.chunks,{type:state.recorder.mimeType||'audio/webm'});if(state.hasSpeech&&b.size){state.audioBlob=b;state.duration=state.startedAt?Math.max(0,(Date.now()-state.startedAt)/1000):0}syncLiveTranscript();stopMedia();state.view='workblad';draftSave().finally(renderWorkblad)};state.recorder.start(500)}
function voiceCancel(){if(state.recorder)try{state.recorder.onstop=null;if(state.recorder.state!=='inactive')state.recorder.stop()}catch(e){}state.audioBlob=state.prevAudio===undefined?state.audioBlob:state.prevAudio;state.duration=state.prevDuration===undefined?state.duration:state.prevDuration;state.liveTranscript=state.prevTranscript===undefined?state.liveTranscript:state.prevTranscript;state.workText=state.prevWorkText===undefined?state.workText:state.prevWorkText;stopMedia();state.hasSpeech=false;renderWorkblad()}
function metadataPayload(){var p=state.proposal||{};return {title:(state.workTitle||'').trim()||p.title||'',eventTime:(state.workDate||'').trim()||p.eventTime||'',place:p.place||'',people:p.people||'',eventTimePrecision:(state.workDate||'').trim()?'gebruiker':(p.eventTimePrecision||'onbekend'),adjusted:Boolean((state.workTitle||'').trim()||(state.workDate||'').trim())}}
async function uploadPhotoFiles(storyId,token,files){if(!files||!files.length)return;var fd=new FormData();files.slice(0,12).forEach(function(f){fd.append('media',f)});var res=await fetch('/api/stories/'+encodeURIComponent(storyId)+'/media',{method:'POST',headers:{'authorization':'Bearer '+token},body:fd});var data=await res.json();if(!res.ok)throw new Error(data.error||'Foto’s toevoegen mislukt')}
async function saveMetadata(storyId,token,meta){var res=await fetch('/api/stories/'+encodeURIComponent(storyId)+'/metadata',{method:'PUT',headers:{'content-type':'application/json','authorization':'Bearer '+token},body:JSON.stringify(meta)});var data=await res.json();if(!res.ok)throw new Error(data.error||'Gegevens opslaan mislukt')}
async function finishWorkblad(){
  capture();state.workError='';await draftSave();
  var text=(state.workText||'').trim();if(!state.audioBlob&&!state.hasExistingAudio&&!text){state.workError='Voeg eerst iets toe: een gesproken stukje of wat tekst.';return renderWorkblad()}
  state.view='saving';var ov=document.createElement('div');ov.className='work-saving';ov.innerHTML='<div class="work-saving-card"><div class="processing"></div><h2>Je blad wordt op zijn plek gezet</h2><div class="muted">Daarna kom je direct terug bij deze herinnering op je tijdlijn.</div></div>';document.body.appendChild(ov);
  try{
    if(state.editingStoryId&&state.editingToken){
      var contentRes=await fetch('/api/integration/stories/'+encodeURIComponent(state.editingStoryId)+'/content',{method:'PUT',headers:{'content-type':'application/json','authorization':'Bearer '+state.editingToken},body:JSON.stringify({storyText:text})});var contentData=await contentRes.json();if(!contentRes.ok)throw new Error(contentData.error||'Opslaan mislukt');
      await saveMetadata(state.editingStoryId,state.editingToken,metadataPayload());
      await uploadPhotoFiles(state.editingStoryId,state.editingToken,state.newPhotoFiles||[]);
      state.storyId=state.editingStoryId;state.manageToken=state.editingToken;
    }else{
      var fd=new FormData();if(state.audioBlob)fd.append('audio',state.audioBlob,'verhaal.webm');if(text)fd.append('storyText',text);if(state.liveTranscript)fd.append('liveTranscript',state.liveTranscript);
      var localFiles=state.workMedia.filter(function(m){return m.kind==='local'&&m.file}).map(function(m){return m.file});var first=localFiles[0]||null;
      if(first)fd.append('startPhoto',first,first.name||'herinnering.jpg');fd.append('sourceMode','workblad');fd.append('durationSeconds',String(state.duration||0));fd.append('sessionId',sessionId);var name=localStorage.getItem('xxory-display-name');if(name)fd.append('displayName',name);
      var res=await fetch('/api/stories',{method:'POST',body:fd}),data=await res.json();if(!res.ok)throw new Error(data.error||'Opslaan mislukt');state.storyId=data.storyId;state.manageToken=data.manageToken;state.proposal=data.proposal||{};
      await saveMetadata(state.storyId,state.manageToken,metadataPayload());
      if(localFiles.length>1)await uploadPhotoFiles(state.storyId,state.manageToken,localFiles.slice(1));
    }
    await draftClear();renderSavedWorkblad();
  }catch(e){ov.remove();state.workError=e.message||'Opslaan mislukt';renderWorkblad()}
}
function handoffUrl(){return TIMELINE_URL+'#story='+encodeURIComponent(state.storyId||'')+'&token='+encodeURIComponent(state.manageToken||'')}
function goTimeline(){clearTimeout(redirectTimer);postEvent('return_to_timeline',{storyId:state.storyId,mode:'workblad-v2'});location.href=handoffUrl()}
function renderSavedWorkblad(){var ov=document.querySelector('.work-saving');if(ov)ov.remove();state.view='saved';app.innerHTML='<div class="work-stage"><div class="work-top"><div class="work-brand">TALERA</div></div><div class="work-scroll"><article class="work-sheet work-saved-sheet"><div class="work-saved-check">✓</div><h1>Je herinnering staat op zijn plek</h1><p>Je gaat nu terug naar precies deze herinnering op je tijdlijn.</p><div class="work-saved-actions one"><button id="timelineWork" class="work-tool voice" type="button">Naar mijn tijdlijn</button></div></article></div><div class="work-actions"><div class="work-draft">Opgeslagen</div><div></div></div></div>';document.getElementById('timelineWork').onclick=goTimeline;redirectTimer=setTimeout(goTimeline,700)}
function resetWorkblad(){clearTimeout(redirectTimer);revokeMediaUrls();state.workMedia=[];state.newPhotoFiles=[];state.audioBlob=null;state.hasExistingAudio=false;state.duration=0;state.liveTranscript='';state.workTitle='';state.workDate='';state.workText='';state.workError='';state.storyId=null;state.manageToken=null;state.proposal=null;state.editingStoryId='';state.editingToken='';draftClear().finally(renderWorkblad)}
function readEditContext(){var q=new URLSearchParams(location.search),id=q.get('edit')||'';var h=new URLSearchParams(String(location.hash||'').replace(/^#/,'')),token=h.get('token')||'';if(id&&token)try{sessionStorage.setItem('talera-edit-token:'+id,token)}catch(e){}if(id&&!token)try{token=sessionStorage.getItem('talera-edit-token:'+id)||''}catch(e){}return id&&token?{id:id,token:token}:null}
function prefillTimelineDate(){var q=new URLSearchParams(location.search),at=q.get('at');if(!at||state.workDate)return;var d=new Date(at);if(!isNaN(d.getTime()))state.workDate=d.toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'})}
async function loadExisting(ctx){
  ensure();state.editingStoryId=ctx.id;state.editingToken=ctx.token;state.storyId=ctx.id;state.manageToken=ctx.token;state.workMedia=[];state.newPhotoFiles=[];
  var res=await fetch('/api/integration/stories/'+encodeURIComponent(ctx.id),{headers:{'authorization':'Bearer '+ctx.token}}),data=await res.json();if(!res.ok)throw new Error(data.error||'Deze herinnering kon niet worden geopend.');
  state.workTitle=data.title||'';state.workDate=data.eventTime||'';state.workText=data.textContent||'';state.duration=Number(data.durationSeconds)||0;state.audioBlob=null;state.hasExistingAudio=Boolean(data.hasAudio);state.liveTranscript='';
  var imageItems=(data.media||[]).filter(function(m){return m.mediaType==='image'}).slice(0,12);
  var loaded=await Promise.all(imageItems.map(async function(item){try{var r=await fetch(item.url,{headers:{'authorization':'Bearer '+ctx.token}});if(!r.ok)return null;var blob=await r.blob();return {kind:'remote',id:item.id,localUrl:URL.createObjectURL(blob),mimeType:item.mimeType||blob.type,role:item.role||'extra'}}catch(e){return null}}));
  state.workMedia=loaded.filter(Boolean);draftLoaded=true;
}
async function boot(){ensure();var ctx=readEditContext();if(ctx){try{await loadExisting(ctx)}catch(e){state.workError=e.message||'Openen mislukt';draftLoaded=true}}else{await draftLoad();prefillTimelineDate()}renderWorkblad()}
renderEntry=renderWorkblad;activateMic=voiceStart;renderListening=voiceListening;setupAudioAnalysis=setupWorkAudio;startRecorder=startWorkRecorder;boot();
})();</scr`+`ipt>`;
