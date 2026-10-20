export const TEST_UI_HTML = String.raw`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f5f1ea">
<meta name="robots" content="noindex,nofollow">
<title>TALERA Core Test</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif;color:#102947;background:#f5f1ea}
*{box-sizing:border-box}body{margin:0;background:#f5f1ea;color:#102947;-webkit-text-size-adjust:100%}button,input,textarea{font:inherit}.page{max-width:720px;margin:0 auto;padding:18px 12px calc(42px + env(safe-area-inset-bottom))}.eyebrow{font-size:11px;font-weight:850;letter-spacing:.13em;color:#6b7784;margin-top:max(4px,env(safe-area-inset-top))}h1{font-size:clamp(31px,9vw,50px);line-height:.98;letter-spacing:-.045em;margin:10px 0 10px}.intro{margin:0 0 16px;color:#5f6e7c;line-height:1.45}.card{background:#fff;border:1px solid rgba(16,41,71,.08);border-radius:22px;padding:15px;margin:11px 0;box-shadow:0 10px 28px rgba(16,41,71,.05)}.head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.head h2{font-size:17px;margin:0}.badge{font-size:11px;font-weight:850;padding:6px 9px;border-radius:999px;background:#eef2f5;color:#647180}.badge.ok{background:#e5f2ea;color:#286249}.badge.bad{background:#f8e7e4;color:#91443a}.btn{border:0;border-radius:15px;min-height:50px;padding:0 15px;font-weight:800;background:#102f55;color:white;touch-action:manipulation}.btn.secondary{background:#e9eef3;color:#102f55}.btn.warm{background:#efddd5;color:#7d4338}.btn.good{background:#27634c}.btn:disabled{opacity:.36}.row{display:flex;gap:8px;flex-wrap:wrap}.row .btn{flex:1 1 135px}.fields{display:grid;gap:8px}.fields input,.fields textarea{width:100%;border:1px solid rgba(16,41,71,.13);border-radius:13px;padding:11px 12px;color:#102947;background:#fff;font-size:16px}.fields textarea{min-height:84px;resize:vertical}.metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.metric{background:#f5f7f8;border-radius:13px;padding:10px;min-width:0}.metric span{display:block;font-size:10px;color:#74808c;margin-bottom:4px}.metric strong{display:block;font-size:12px;line-height:1.35;word-break:break-word}.status{font-size:13px;line-height:1.4;padding:10px 11px;border-radius:13px;background:#f5f7f8;color:#5c6976;margin:9px 0}.status.ok{background:#eaf4ee;color:#286249}.status.bad{background:#faeae7;color:#8e443a}.checklist{display:grid;gap:7px}.check{display:flex;gap:9px;align-items:flex-start;font-size:13px;line-height:1.35}.dot{width:19px;height:19px;border-radius:50%;display:grid;place-items:center;flex:0 0 19px;background:#edf1f4;color:#70808d;font-size:11px;font-weight:900}.check.ok .dot{background:#dff0e7;color:#246147}.check.bad .dot{background:#f6dfdb;color:#95453b}.small{font-size:12px;color:#74808c;line-height:1.45}.log{background:#101923;color:#d7e2ed;border-radius:15px;padding:11px;min-height:100px;max-height:220px;overflow:auto;white-space:pre-wrap;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}audio{width:100%;margin-top:8px}@media(max-width:520px){.page{padding-left:9px;padding-right:9px}.metrics{grid-template-columns:1fr}.card{border-radius:19px;padding:13px}}
</style>
</head>
<body>
<main class="page">
<div class="eyebrow">TALERA · CLEAN CORE v1 · ISOLATED TEST</div>
<h1>Test de nieuwe motor.</h1>
<p class="intro">Deze pagina staat los van de bestaande TALERA-interface. We testen alleen de nieuwe kern: verhaal, rechten, opname, veilige opslag en terugluisteren.</p>

<section class="card">
  <div class="head"><h2>1. Core gereed?</h2><span id="healthBadge" class="badge">controleren…</span></div>
  <div id="healthStatus" class="status">Worker, database en media worden gecontroleerd.</div>
  <button id="healthBtn" class="btn secondary">Controleer opnieuw</button>
</section>

<section class="card">
  <div class="head"><h2>2. Maak testherinnering</h2><span id="storyBadge" class="badge">wachten</span></div>
  <div class="fields">
    <input id="title" maxlength="140" placeholder="Titel">
    <input id="date" type="date">
    <textarea id="storyText" maxlength="20000" placeholder="Een korte testtekst, als je wilt."></textarea>
  </div>
  <div class="row" style="margin-top:10px"><button id="storyBtn" class="btn">Maak herinnering</button><button id="rightsBtn" class="btn secondary" disabled>Controleer rechten</button></div>
  <div id="storyStatus" class="status">Nog geen testherinnering.</div>
</section>

<section class="card">
  <div class="head"><h2>3. Neem audio op</h2><span id="recordBadge" class="badge">wachten</span></div>
  <div class="row"><button id="startBtn" class="btn">Start opname</button><button id="pauseBtn" class="btn secondary" disabled>Pauze</button><button id="stopBtn" class="btn warm" disabled>Stop</button></div>
  <div class="metrics"><div class="metric"><span>MIME</span><strong id="mime">—</strong></div><div class="metric"><span>Lokale bytes</span><strong id="bytes">—</strong></div><div class="metric"><span>Lokale SHA-256</span><strong id="hash">—</strong></div><div class="metric"><span>Duur</span><strong id="duration">0.0 s</strong></div></div>
  <audio id="localAudio" controls playsinline preload="metadata"></audio>
  <div id="recordStatus" class="status">Microfoon wordt pas gevraagd wanneer je op Start opname drukt.</div>
</section>

<section class="card">
  <div class="head"><h2>4. Stuur exact die opname naar Core</h2><span id="serverBadge" class="badge">wachten</span></div>
  <div class="row"><button id="uploadBtn" class="btn good" disabled>Opslaan op server</button><button id="fetchBtn" class="btn secondary" disabled>Haal terug & vergelijk</button></div>
  <div id="serverStatus" class="status">Wacht op een testherinnering en opname.</div>
  <audio id="serverAudio" controls playsinline preload="metadata"></audio>
</section>

<section class="card">
  <div class="head"><h2>Resultaat</h2><span id="resultBadge" class="badge">0/6</span></div>
  <div id="checks" class="checklist"></div>
  <p class="small">Doel: zes groene controles. Daarna is de schone Core technisch klaar om als motor onder Vertel en de presentatie/Luistermodus te worden aangesloten.</p>
</section>

<section class="card"><div class="head"><h2>Diagnose</h2></div><div id="log" class="log"></div></section>
</main>
<script>
(()=>{
const $=id=>document.getElementById(id);
const checks={health:false,story:false,readerRead:false,readerBlocked:false,audioStored:false,audioExact:false};
const labels={health:'Core + D1 + R2 bereikbaar',story:'Herinnering veilig aangemaakt',readerRead:'Leessleutel kan herinnering lezen',readerBlocked:'Leessleutel kan niet bewerken',audioStored:'Audio aan herinnering gekoppeld',audioExact:'Teruggehaalde audio is byte/hash-identiek'};
let storyId='',ownerToken='',readerToken='',stream=null,recorder=null,chunks=[],audioBlob=null,localHash='',localUrl='',serverUrl='',startedAt=0,pauseStarted=0,pausedMs=0,mime='';
function log(msg,data){const line=new Date().toLocaleTimeString('nl-NL')+'  '+msg+(data?'\n'+JSON.stringify(data,null,2):'');$('log').textContent+=(($('log').textContent?'\n':'')+line);$('log').scrollTop=$('log').scrollHeight}
function badge(id,text,kind=''){const el=$(id);el.textContent=text;el.className='badge'+(kind?' '+kind:'')}
function status(id,text,kind=''){const el=$(id);el.textContent=text;el.className='status'+(kind?' '+kind:'')}
function renderChecks(){const box=$('checks');box.innerHTML='';let passed=0;Object.keys(checks).forEach(key=>{if(checks[key])passed++;const row=document.createElement('div');row.className='check '+(checks[key]?'ok':'');row.innerHTML='<span class="dot">'+(checks[key]?'✓':'·')+'</span><span>'+labels[key]+'</span>';box.appendChild(row)});badge('resultBadge',passed+'/6',passed===6?'ok':'')}
function setCheck(key,value=true){checks[key]=Boolean(value);renderChecks()}
function auth(token){return {'authorization':'Bearer '+token}}
function isoForDate(value){return value?new Date(value+'T12:00:00').toISOString():''}
async function jsonFetch(url,options){const r=await fetch(url,options);let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data.error||('HTTP '+r.status));return data}
async function digestBlob(blob){const bytes=await blob.arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')}
function recorderMime(){const apple=/iPhone|iPad|iPod/i.test(navigator.userAgent)||(/Macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1);const list=apple?['audio/mp4','audio/webm;codecs=opus','audio/webm']:['audio/webm;codecs=opus','audio/webm','audio/mp4'];for(const type of list){try{if(MediaRecorder.isTypeSupported(type))return type}catch{}}return ''}
function fileName(blob){const t=String(blob.type||'').toLowerCase();if(t.includes('mp4')||t.includes('m4a'))return 'core-test.m4a';if(t.includes('ogg'))return 'core-test.ogg';return 'core-test.webm'}
async function health(){badge('healthBadge','controleren…');try{const d=await jsonFetch('/api/v1/health',{cache:'no-store'});const ok=d.databaseBound&&d.mediaBound&&d.schemaReady;setCheck('health',ok);badge('healthBadge',ok?'gereed':'niet gereed',ok?'ok':'bad');status('healthStatus',ok?'Core, database, schema en media zijn klaar.':'Bindings bestaan, maar Core is nog niet volledig gereed.',ok?'ok':'bad');log('Health',d)}catch(e){setCheck('health',false);badge('healthBadge','fout','bad');status('healthStatus',e.message,'bad');log('Health fout',{error:e.message})}}
async function createStory(){const title=$('title').value.trim(),date=$('date').value;if(!title||!date){status('storyStatus','Vul titel en datum in.','bad');return}badge('storyBadge','opslaan…');try{const data=await jsonFetch('/api/v1/stories',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title,eventTimeText:new Date(date+'T12:00:00').toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'}),eventAt:isoForDate(date),eventTimePrecision:'exact',storyText:$('storyText').value,displayName:'Core test'})});storyId=data.storyId;ownerToken=data.ownerToken;readerToken=data.readerToken;setCheck('story',true);badge('storyBadge','aangemaakt','ok');status('storyStatus','Nieuwe herinnering: '+storyId,'ok');$('rightsBtn').disabled=false;updateUpload();log('Story aangemaakt',{storyId,revision:data.revision});await checkReaderRead()}catch(e){setCheck('story',false);badge('storyBadge','fout','bad');status('storyStatus',e.message,'bad');log('Story fout',{error:e.message})}}
async function checkReaderRead(){if(!storyId||!readerToken)return;try{const d=await jsonFetch('/api/v1/stories/'+encodeURIComponent(storyId),{headers:auth(readerToken),cache:'no-store'});setCheck('readerRead',d.storyId===storyId);log('Reader read OK',{hasAudio:d.hasAudio,revision:d.revision})}catch(e){setCheck('readerRead',false);log('Reader read fout',{error:e.message})}}
async function checkRights(){if(!storyId||!readerToken)return;try{const r=await fetch('/api/v1/stories/'+encodeURIComponent(storyId),{method:'PATCH',headers:{...auth(readerToken),'content-type':'application/json'},body:JSON.stringify({storyText:'DIT MAG NIET WORDEN OPGESLAGEN'})});const blocked=r.status===403;setCheck('readerBlocked',blocked);status('storyStatus',blocked?'Rechten correct: leessleutel kan niet bewerken.':'Rechtencontrole MISLUKT: reader kreeg status '+r.status,blocked?'ok':'bad');log('Rechtencontrole',{status:r.status,blocked})}catch(e){setCheck('readerBlocked',false);status('storyStatus',e.message,'bad')}}
async function startRecording(){if(recorder&&recorder.state!=='inactive')return;try{stream=await navigator.mediaDevices.getUserMedia({audio:true});mime=recorderMime();chunks=[];pausedMs=0;pauseStarted=0;startedAt=Date.now();recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);$('mime').textContent=recorder.mimeType||mime||'browserkeuze';recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};recorder.onerror=e=>{status('recordStatus','Opnamefout: '+(e.error&&e.error.message||'onbekend'),'bad')};recorder.onstop=async()=>{const type=recorder.mimeType||mime||'audio/webm';audioBlob=new Blob(chunks,{type});const elapsed=Math.max(0,Date.now()-startedAt-pausedMs-(pauseStarted?Date.now()-pauseStarted:0));$('duration').textContent=(elapsed/1000).toFixed(1)+' s';$('bytes').textContent=audioBlob.size.toLocaleString('nl-NL');localHash=await digestBlob(audioBlob);$('hash').textContent=localHash;if(localUrl)URL.revokeObjectURL(localUrl);localUrl=URL.createObjectURL(audioBlob);$('localAudio').src=localUrl;stream.getTracks().forEach(t=>t.stop());stream=null;badge('recordBadge','opgenomen','ok');status('recordStatus','Lokale opname klaar. Luister hem hieronder even terug.','ok');$('startBtn').disabled=false;$('pauseBtn').disabled=true;$('stopBtn').disabled=true;updateUpload();log('Lokale opname',{bytes:audioBlob.size,mime:audioBlob.type,sha256:localHash})};recorder.start(500);$('startBtn').disabled=true;$('pauseBtn').disabled=false;$('stopBtn').disabled=false;badge('recordBadge','opnemen…');status('recordStatus','Opname loopt. Stiltes mogen gewoon blijven bestaan.','ok')}catch(e){badge('recordBadge','fout','bad');status('recordStatus','Microfoon kon niet starten: '+e.message,'bad');log('Microfoon fout',{error:e.message})}}
function pauseRecording(){if(!recorder)return;if(recorder.state==='recording'){try{recorder.requestData();recorder.pause();pauseStarted=Date.now();$('pauseBtn').textContent='Verder';status('recordStatus','Gepauzeerd.','ok')}catch(e){status('recordStatus',e.message,'bad')}}else if(recorder.state==='paused'){try{recorder.resume();if(pauseStarted)pausedMs+=Date.now()-pauseStarted;pauseStarted=0;$('pauseBtn').textContent='Pauze';status('recordStatus','Opname loopt weer.','ok')}catch(e){status('recordStatus',e.message,'bad')}}}
function stopRecording(){if(!recorder||recorder.state==='inactive')return;try{if(recorder.state==='paused'){recorder.resume();if(pauseStarted)pausedMs+=Date.now()-pauseStarted;pauseStarted=0}recorder.requestData();setTimeout(()=>{try{recorder.stop()}catch{}},120)}catch(e){status('recordStatus',e.message,'bad')}}
function updateUpload(){$('uploadBtn').disabled=!(storyId&&ownerToken&&audioBlob&&audioBlob.size)}
async function upload(){if($('uploadBtn').disabled)return;badge('serverBadge','opslaan…');status('serverStatus','Exact dezelfde lokale blob wordt opgeslagen en server-side gecontroleerd.');try{const fd=new FormData();fd.append('audio',audioBlob,fileName(audioBlob));const duration=parseFloat($('duration').textContent)||0;fd.append('durationSeconds',String(duration));const d=await jsonFetch('/api/v1/stories/'+encodeURIComponent(storyId)+'/audio',{method:'POST',headers:auth(ownerToken),body:fd,cache:'no-store'});const stored=d.hasAudio&&d.audioSizeBytes===audioBlob.size&&d.audioSha256===localHash;setCheck('audioStored',stored);badge('serverBadge',stored?'opgeslagen':'afwijking',stored?'ok':'bad');status('serverStatus',stored?'Server bevestigt dezelfde bytes en SHA-256. Haal hem nu terug.':'Serverbevestiging wijkt af.',stored?'ok':'bad');$('fetchBtn').disabled=!stored;log('Audio opgeslagen',d);await checkReaderRead()}catch(e){setCheck('audioStored',false);badge('serverBadge','fout','bad');status('serverStatus',e.message,'bad');log('Upload fout',{error:e.message})}}
async function fetchBack(){if(!storyId||!readerToken)return;badge('serverBadge','ophalen…');try{const detail=await jsonFetch('/api/v1/stories/'+encodeURIComponent(storyId),{headers:auth(readerToken),cache:'no-store'});const r=await fetch('/api/v1/stories/'+encodeURIComponent(storyId)+'/audio',{headers:auth(readerToken),cache:'no-store'});if(!r.ok)throw new Error('Audio ophalen gaf HTTP '+r.status);const blob=await r.blob();const hash=await digestBlob(blob);const exact=blob.size===audioBlob.size&&hash===localHash&&detail.audio&&detail.audio.sha256===localHash;setCheck('audioExact',exact);if(serverUrl)URL.revokeObjectURL(serverUrl);serverUrl=URL.createObjectURL(blob);$('serverAudio').src=serverUrl;badge('serverBadge',exact?'exact gelijk':'verschil',exact?'ok':'bad');status('serverStatus',exact?'Teruggehaalde audio is byte- en hash-identiek. Druk op play om te horen of dit exact jouw stem is.':'De teruggehaalde audio wijkt af.',exact?'ok':'bad');log('Audio teruggehaald',{serverBytes:blob.size,serverSha256:hash,localBytes:audioBlob.size,localSha256:localHash,exact})}catch(e){setCheck('audioExact',false);badge('serverBadge','fout','bad');status('serverStatus',e.message,'bad');log('Ophalen fout',{error:e.message})}}
$('healthBtn').onclick=health;$('storyBtn').onclick=createStory;$('rightsBtn').onclick=checkRights;$('startBtn').onclick=startRecording;$('pauseBtn').onclick=pauseRecording;$('stopBtn').onclick=stopRecording;$('uploadBtn').onclick=upload;$('fetchBtn').onclick=fetchBack;
const today=new Date();$('date').value=today.toISOString().slice(0,10);$('title').value='Core test '+today.toLocaleDateString('nl-NL');renderChecks();health();
})();
</script>
</body></html>`;
