export const integratedStoryPlayerStyle = String.raw`
.talera-v2-sheet{position:fixed;inset:0;z-index:9900;background:#0f2747;color:#fff;display:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.talera-v2-sheet.is-open{display:flex;flex-direction:column}
.talera-v2-header{display:flex;justify-content:space-between;align-items:center;padding:max(16px,env(safe-area-inset-top)) 19px 12px;gap:12px}
.talera-v2-header strong{font-size:13px;letter-spacing:.2em}
.talera-v2-sheet button{cursor:pointer}
.talera-v2-close{border:1px solid #ffffff67;background:#ffffff17;color:#fff;font-size:25px;width:43px;height:43px;border-radius:50%}
.talera-v2-scroll{flex:1;overflow:auto;overscroll-behavior:contain;padding:10px 20px calc(24px + env(safe-area-inset-bottom));max-width:680px;width:100%;margin:0 auto}
.talera-v2-fields{display:grid;grid-template-columns:1fr 132px;gap:8px;margin-bottom:12px}
.talera-v2-fields input{min-width:0;min-height:45px;padding:10px 12px;border:1px solid #ffffff55;border-radius:12px;background:#ffffff16;color:#fff;font:inherit}
.talera-v2-fields input[type=date]{color-scheme:dark}
.talera-v2-frame{height:min(47vh,390px);border-radius:22px;background:#10283f;display:grid;place-items:center;overflow:hidden;position:relative}
.talera-v2-frame img,.talera-v2-frame video{max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain}
.talera-v2-frame p{padding:20px;text-align:center;color:#d3e1eb}
.talera-v2-steps{display:flex;gap:12px;align-items:center;justify-content:center;margin:12px 0}
.talera-v2-steps button,.talera-v2-actions button{border:1px solid #ffffff66;background:#ffffff14;border-radius:13px;color:#fff;min-height:46px;padding:8px 14px;font-weight:650}
.talera-v2-primary{background:#f7f4ef!important;color:#0f2747!important}
.talera-v2-status{min-height:45px;line-height:1.4;text-align:center;font-size:13px;color:#e3edf3;margin:10px 0;white-space:pre-wrap}
.talera-v2-status[data-error=true]{color:#ffd3be}
.talera-v2-actions{display:flex;gap:9px;justify-content:center;flex-wrap:wrap;margin:12px 0}
.talera-v2-actions button[disabled],.talera-v2-steps button[disabled]{opacity:.4}
.talera-v2-existing{display:flex;flex-direction:column;gap:6px;margin-top:10px;max-height:130px;overflow:auto}
.talera-v2-existing button{min-height:34px;border:1px solid #ffffff4a;border-radius:9px;padding:6px 11px;text-align:left;color:#fff;background:#ffffff12}
.talera-v2-existing button[disabled]{opacity:.45}
.talera-v2-rec{color:#f7b79e;font-weight:760}
.talera-v2-playback{position:absolute;z-index:6;inset:0;pointer-events:none;object-fit:contain;width:100%;height:100%}
`;

export const integratedStoryPlayerScript = String.raw`
(function(){
'use strict';
if(window.__taleraLibraryFirstV2)return;
const DB='talera-media-library-v1',DIR='talera-media-library-v1',FORMAT='talera-story-v2';
const runtime=window.__taleraTimelineRuntime,stage=document.getElementById('photoStage');
if(!runtime||!stage)return;
const docs=document,storage=navigator.storage,urls=new Map(),memories=new Map();
let dbPromise=null,dirPromise=null,currentStory=null,currentAudioId=null,currentAudioUrl=null,audio=null;
let active=false,frameId='',generation=0,voiceClock=null,video=null,closing=false,pendingFrameId='',pendingFramePromise=null,audioPrepareEpoch=0;
let recorder=null,stream=null,recordChunks=[],recStart=0,recPausedAt=0,recPauseTotal=0,recCues=[];
let recBlob=null,recAudioId=null,recState='idle',selected=[],currentIndex=0,editorBusy=false,recordedDuration=0;
const uid=()=> 'm-'+crypto.randomUUID();
const fail=(message)=>{const e=new Error(message);e.code='TALERA_LIBRARY_ERROR';return e};
const request=(r)=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error||fail('Bibliotheekverzoek mislukt'))});
const committed=(tx)=>new Promise((res,rej)=>{tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error||fail('Opslaan mislukt'));tx.onabort=()=>rej(tx.error||fail('Opslaan afgebroken'))});
function ready(){
 if(!('indexedDB' in window)||!storage||!storage.getDirectory||!crypto.randomUUID)
   throw fail('De veilige TALERA-bibliotheek wordt op dit toestel niet ondersteund. Er is niets opgeslagen.');
}
function db(){ready();return dbPromise||(dbPromise=new Promise((res,rej)=>{
 const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('media'))r.result.createObjectStore('media',{keyPath:'mediaId'});if(!r.result.objectStoreNames.contains('stories'))r.result.createObjectStore('stories',{keyPath:'id'})};
 r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();dbPromise=null};res(r.result)};
 r.onerror=()=>{dbPromise=null;rej(r.error||fail('Bibliotheek kon niet worden geopend'))};
}))}
function dir(){ready();return dirPromise||(dirPromise=storage.getDirectory().then(r=>r.getDirectoryHandle(DIR,{create:true})).then(r=>r.getDirectoryHandle('media',{create:true})))}
async function getMeta(id){const d=await db();return request(d.transaction('media','readonly').objectStore('media').get(id))}
async function getBlob(id){
 const m=await getMeta(id);if(!m)throw fail('Bestand bestaat niet in de TALERA-bibliotheek');
 let file;try{file=await(await(await dir()).getFileHandle(id)).getFile()}catch(e){throw fail('Bestand ontbreekt in de TALERA-bibliotheek: '+id)}
 if(!file.size||file.size!==m.size)throw fail('Bibliotheekbestand is onvolledig: '+id);
 return file;
}
async function listMedia(){const d=await db();return request(d.transaction('media','readonly').objectStore('media').getAll())}
async function listStories(){const d=await db();return request(d.transaction('stories','readonly').objectStore('stories').getAll())}
async function importFile(file){
 if(!file?.size)throw fail('Leeg bestand');
 const kind=file.type.startsWith('image/')?'photo':file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':null;
 if(!kind)throw fail('Dit bestandstype kan niet in de TALERA-bibliotheek');
 const id=uid(),directory=await dir(),handle=await directory.getFileHandle(id,{create:true});
 let saved=false;
 try{
  const writable=await handle.createWritable();
  try{await writable.write(file);await writable.close();saved=true}catch(e){try{await writable.abort()}catch(_){}throw e}
  const verify=await handle.getFile();
  if(verify.size!==file.size)throw fail('Foto is niet volledig in de bibliotheek opgeslagen');
  const meta={mediaId:id,kind,mime:file.type,size:file.size,displayName:String(file.name||kind).slice(0,180),capturedAt:file.lastModified?new Date(file.lastModified).toISOString():null,importedAt:new Date().toISOString(),storage:'opfs'};
  const d=await db(),tx=d.transaction('media','readwrite'),done=committed(tx);tx.objectStore('media').add(meta);await done;
  const check=await getMeta(id);if(!check||check.size!==(await handle.getFile()).size)throw fail('Bibliotheekcontrole na opslaan mislukt');
  return meta;
 }catch(e){
  if(!(await getMeta(id).catch(()=>null)))try{await directory.removeEntry(id)}catch(_){}
  throw e;
 }
}
async function saveStory(story){
 if(story.format!==FORMAT||!story.id||!Array.isArray(story.mediaIds)||!Array.isArray(story.cues))throw fail('Verhaal is ongeldig');
 if(new Set(story.mediaIds).size!==story.mediaIds.length)throw fail('Dubbele foto-ID');
 let last=-1;
 for(const cue of story.cues){if(!story.mediaIds.includes(cue.mediaId)||!Number.isSafeInteger(cue.atMs)||cue.atMs<=last)throw fail('Fototijden zijn ongeldig');last=cue.atMs}
 if(story.mediaIds.length&&story.cues[0]?.atMs!==0)throw fail('Eerste fototijd ontbreekt');
 for(const id of [...story.mediaIds,...(story.audioId?[story.audioId]:[])]){
  const m=await getMeta(id);if(!m||(id===story.audioId?m.kind!=='audio':m.kind==='audio'))throw fail('Verhaal verwijst naar een ongeldig bibliotheekbestand');
  await getBlob(id);
 }
 const d=await db(),tx=d.transaction('stories','readwrite'),done=committed(tx);
 tx.objectStore('stories').put(story);await done;return story;
}
async function readStory(id){const d=await db();return request(d.transaction('stories','readonly').objectStore('stories').get(id))}
async function imageURL(id){if(urls.has(id))return urls.get(id);const blob=await getBlob(id),url=URL.createObjectURL(blob);urls.set(id,url);return url}
const layerImages=()=>[...stage.querySelectorAll('.photo-layer .example-photo,.photo-layer .photo-backdrop,.photo-layer .photo-aligned-blur')];
function stopVideo(){if(video){try{video.pause()}catch(_){}video.hidden=true;video.removeAttribute('src');video.load()}}
function updateDot(idx){const m=runtime.currentMemory();if(!m?._taleraLibraryV2)return;m._photoIndex=idx;m.image=m.photos[idx];runtime.writeMemory(m);const dots=docs.querySelectorAll('.talera-photo-dot');dots.forEach((x,i)=>x.classList.toggle('active',i===idx))}
async function performFrame(mediaId){
 const epoch=++generation,meta=await getMeta(mediaId);if(!meta)throw fail('Foto ontbreekt');
 const src=await imageURL(mediaId);if(epoch!==generation)return;
 const m=runtime.currentMemory();if(!m?._taleraLibraryV2||m._taleraStoryId!==currentStory?.id)return;
 const idx=currentStory.mediaIds.indexOf(mediaId);
 if(idx<0)return;
 if(meta.kind==='photo'){
  const img=new Image();img.src=src;
  try{await img.decode()}catch(e){throw fail('Foto kan niet worden geopend: '+meta.displayName)}
  if(epoch!==generation)return;
  stopVideo();
  const nodes=layerImages();if(!nodes.length)throw fail('Het bestaande TALERA-fotoscherm ontbreekt');
  for(const node of nodes)node.src=src;
  const a=docs.getElementById('photoLayerA'),b=docs.getElementById('photoLayerB');
  if(a)a.style.opacity='1';if(b)b.style.opacity='0';
 }else if(meta.kind==='video'){
  if(!video){video=docs.createElement('video');video.className='talera-v2-playback';video.muted=true;video.defaultMuted=true;video.playsInline=true;video.setAttribute('playsinline','');stage.appendChild(video)}
  video.hidden=false;video.src=src;video.load();
  await new Promise((resolve,reject)=>{if(video.readyState>=2)return resolve();video.addEventListener('loadeddata',resolve,{once:true});video.addEventListener('error',()=>reject(fail('Video kan niet worden gelezen')),{once:true})});
  if(epoch!==generation)return;
  video.muted=true;
 }
 if(epoch!==generation)return;
 m.photos[idx]=src;m.image=src;frameId=mediaId;updateDot(idx);
}
function showFrame(mediaId){
 if(pendingFrameId===mediaId&&pendingFramePromise)return pendingFramePromise;
 const promise=performFrame(mediaId);
 pendingFrameId=mediaId;
 pendingFramePromise=promise.finally(()=>{if(pendingFrameId===mediaId){pendingFrameId='';pendingFramePromise=null}});
 return pendingFramePromise;
}
function cueAt(ms){let cue=null;for(const x of currentStory?.cues||[]){if(x.atMs>ms)break;cue=x}return cue}
function sync(){
 if(!currentStory||!active||!audio)return;
 const now=Math.max(0,(Number(audio.currentTime)||0)*1000),cue=cueAt(now);
 if(cue&&cue.mediaId!==frameId)void showFrame(cue.mediaId).catch(e=>status(e.message,true));
 if(video&&!video.hidden&&video.readyState>=1){
  video.muted=true;const t=Math.max(0,(now-(cue?.atMs||0))/1000);
  if(Math.abs(video.currentTime-t)>.6)try{video.currentTime=t}catch(e){}
  if(!audio.paused&&video.paused)void video.play().catch(()=>{});
  if(audio.paused&&!video.paused)video.pause();
 }
}
function ensureAudioElement(){
 if(!audio){audio=docs.createElement('audio');audio.className='talera-library-narration';audio.hidden=true;audio.preload='auto';stage.appendChild(audio);audio.addEventListener('timeupdate',sync);audio.addEventListener('seeked',sync);audio.addEventListener('pause',sync);audio.addEventListener('ended',stopVoice)}
 return audio;
}
function setAudioBlob(id,blob){
 const node=ensureAudioElement();
 if(currentAudioId===id&&currentAudioUrl)return;
 if(currentAudioUrl){URL.revokeObjectURL(currentAudioUrl);currentAudioUrl=null}
 currentAudioId=id;
 if(!id){node.pause();node.removeAttribute('src');node.load();return}
 currentAudioUrl=URL.createObjectURL(blob);node.src=currentAudioUrl;node.load();
}
async function primeAudioForCurrent(story){
 const token=++audioPrepareEpoch;
 if(!story?.audioId)return;
 try{
  if(currentAudioId===story.audioId&&currentAudioUrl)return;
  const blob=await getBlob(story.audioId);
  if(token!==audioPrepareEpoch||runtime.currentMemory()?._taleraStoryId!==story.id)return;
  if(audio&&!audio.paused)return;
  setAudioBlob(story.audioId,blob);
 }catch(error){console.warn('TALERA: stemopname nog niet voorbereid',error)}
}
function stopVoice(){
 audioPrepareEpoch++;
 if(audio){audio.pause();try{audio.currentTime=0}catch(e){}}
 active=false;frameId='';generation++;pendingFrameId='';pendingFramePromise=null;stopVideo();
 const btn=docs.querySelector('.talera-memory-audio');if(btn)btn.classList.remove('is-playing');
 if(voiceClock){clearInterval(voiceClock);voiceClock=null}
}
async function playStory(story){
 if(!story)return;
 stopVoice();currentStory=story;active=true;
 const node=ensureAudioElement();
 if(currentAudioId!==story.audioId||(story.audioId&&!currentAudioUrl)){
  if(story.audioId)setAudioBlob(story.audioId,await getBlob(story.audioId));
  else setAudioBlob(null,null);
 }
 // Start audio before awaiting image decoding: Mobile Safari retains the user tap.
 const startPlayback=story.audioId?node.play():null;
 const first=cueAt(0);
 if(first)await showFrame(first.mediaId);
 if(startPlayback)try{await startPlayback}catch(error){
  node.pause();status('Tik nogmaals op luisteren om je stem af te spelen.',true);
  const button=docs.querySelector('.talera-memory-audio');
  if(button)button.title='Tik nogmaals om de stemopname af te spelen';
 }
 if(voiceClock)clearInterval(voiceClock);
 voiceClock=setInterval(sync,80);
}
function pauseVoice(){
 if(audio)audio.pause();
 if(voiceClock){clearInterval(voiceClock);voiceClock=null}
 // Pausing must retain the video URL; it is needed when the same cue resumes.
 if(video&&!video.paused)video.pause();
}
function status(t,error=false){const el=sheet.querySelector('.talera-v2-status');el.textContent=t;el.dataset.error=String(error)}
function showError(e){status(String(e?.message||e),true)}
function recordElapsed(){return Math.max(0,Math.floor(performance.now()-recStart-recPauseTotal))}
function selectMedia(id){
 if(!selected.includes(id))return;
 currentIndex=selected.indexOf(id);
 if(recState==='recording'&&recCues.at(-1)?.mediaId!==id){
  const last=recCues.at(-1)?.atMs||0;recCues.push({atMs:Math.max(last+1,recordElapsed()),mediaId:id});
 }
 if(recState==='paused'){}void preview(); 
}
async function preview(){
 const id=selected[currentIndex],view=sheet.querySelector('.talera-v2-frame');
 view.replaceChildren();
 if(!id){const p=docs.createElement('p');p.textContent='Selecteer foto’s of video’s uit je TALERA-bibliotheek';view.appendChild(p);return}
 try{
  const m=await getMeta(id),url=await imageURL(id);
  const node=docs.createElement(m.kind==='video'?'video':'img');
  node.src=url;node.alt='Gekozen bibliotheekbeeld';
  if(m.kind==='video'){node.muted=true;node.playsInline=true;node.controls=false}
  view.appendChild(node);position.textContent=(currentIndex+1)+' / '+selected.length;
 }catch(e){showError(e)}
}
function resetEditor(){
 selected=[];currentIndex=0;recorder=null;recBlob=null;recAudioId=null;recState='idle';recCues=[];recordedDuration=0;recordChunks=[];
 recordButton.textContent='● Start opname';position.textContent='0 / 0';saveButton.disabled=false;void preview();
 status('Foto’s uit de bibliotheek kiezen, daarna inspreken.');void refreshLibrary();
}
function pauseRecording(){
 if(recState==='recording'){recorder.pause();recPausedAt=performance.now();recState='paused';recordButton.textContent='▶ Hervatten';status('Opname gepauzeerd')}
 else if(recState==='paused'){recPauseTotal+=performance.now()-recPausedAt;recorder.resume();recState='recording';if(selected.length&&recCues.at(-1)?.mediaId!==selected[currentIndex]){const last=recCues.at(-1)?.atMs||0;recCues.push({atMs:Math.max(last+1,recordElapsed()),mediaId:selected[currentIndex]})}recordButton.textContent='Ⅱ Pauzeren';status('Opname hervat')}
}
async function startRecording(){
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw fail('Opnemen wordt hier niet ondersteund');
 stream=await navigator.mediaDevices.getUserMedia({audio:true});
 const supported=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>MediaRecorder.isTypeSupported?.(t));
 try{recorder=supported?new MediaRecorder(stream,{mimeType:supported}):new MediaRecorder(stream);
  recorder.ondataavailable=e=>{if(e.data?.size)recordChunks.push(e.data)};
  recordChunks=[];recStart=performance.now();recPauseTotal=0;recCues=selected.length?[{atMs:0,mediaId:selected[currentIndex]}]:[];
  recorder.start(500);recState='recording';recordButton.textContent='Ⅱ Pauzeren';status('Je verhaal wordt opgenomen. Wissel tijdens het spreken tussen je beelden.');
 }catch(e){stream.getTracks().forEach(x=>x.stop());stream=null;throw e}
}
async function stopRecording(){
 if(!recorder||!['recording','paused'].includes(recState))return;
 const t=recState==='paused'?recPausedAt-recStart-recPauseTotal:recordElapsed();
 recordedDuration=Math.max(0,Math.floor(t));
 const stopped=new Promise((resolve,reject)=>{recorder.addEventListener('stop',resolve,{once:true});recorder.addEventListener('error',e=>reject(e.error||fail('Opname mislukt')),{once:true})});
 recorder.stop();await stopped;stream?.getTracks().forEach(t=>t.stop());stream=null;
 recBlob=new Blob(recordChunks,{type:recorder.mimeType||'audio/mp4'});if(!recBlob.size)throw fail('De opname bevat geen geluid');
 recState='stopped';recordButton.textContent='↻ Opnieuw opnemen';status('Opname klaar. Plaats je verhaal op de tijdlijn.');
}
async function importSelected(files){
 if(editorBusy)return;editorBusy=true;saveButton.disabled=true;
 try{
  for(const file of [...files].slice(0,6-selected.length)){
   status('Origineel wordt opgeslagen in de TALERA-bibliotheek: '+file.name);
   const m=await importFile(file);if(!selected.includes(m.mediaId))selected.push(m.mediaId);
  }
  await preview();status('Originele bestanden opgeslagen. Tijdens het inspreken bewaren we alleen fototijden.');
  await refreshLibrary();
 }catch(e){showError(e)}
 finally{editorBusy=false;saveButton.disabled=false;input.value=''}
}
async function refreshLibrary(){
 try{
  const rows=(await listMedia()).filter(x=>x.kind!=='audio').sort((a,b)=>String(b.importedAt).localeCompare(String(a.importedAt)));
  list.replaceChildren();
  for(const row of rows.slice(0,60)){
   const item=docs.createElement('button');item.type='button';item.textContent=row.displayName+(selected.includes(row.mediaId)?' ✓':'');
   item.disabled=selected.includes(row.mediaId)||selected.length>=6;
   item.addEventListener('click',()=>{selected.push(row.mediaId);currentIndex=selected.length-1;void preview();void refreshLibrary()});
   list.appendChild(item);
  }
 }catch(e){showError(e)}
}
async function saveCurrent(){
 if(editorBusy)return;editorBusy=true;saveButton.disabled=true;
 try{
  if(recState==='recording'||recState==='paused')await stopRecording();
  if(!selected.length&&!recBlob&&!recAudioId)throw fail('Kies een foto of maak een opname');
  if(recBlob&&!recAudioId){status('Stemopname wordt één keer in de bibliotheek opgeslagen…');recAudioId=(await importFile(recBlob)).mediaId}
  const id='story-'+crypto.randomUUID(),date=dateInput.value||new Date().toISOString().slice(0,10);
  const cues=recCues.length?recCues:selected.length?[{atMs:0,mediaId:selected[currentIndex]}]:[];
  const data={id,format:FORMAT,title:titleInput.value.trim()||'Mijn herinnering',date,mediaIds:[...selected],audioId:recAudioId||null,durationMs:Math.max(recordedDuration,cues.at(-1)?.atMs||0),cues};
  const saved=await saveStory(data);status('Bibliotheek gecontroleerd. Verhaal staat op je tijdlijn.');
  await registerStory(saved,true);closeEditor();
 }catch(e){showError(e)}
 finally{editorBusy=false;saveButton.disabled=false}
}
async function registerStory(story,focus=false){
 const id='v2:'+story.id,old=memories.get(id),existing=runtime.findMemory({memoryId:id});
 const first=story.mediaIds[0],picture=first?await imageURL(first):null;
 const ms=Date.parse((story.date||'')+'T12:00:00')||Date.now();
 const photos=story.mediaIds.map((m,i)=>i===0?picture:null);
 const memory={id,storyId:story.id,at:new Date(ms).toISOString(),ms,story:story.title,fullStory:story.title,image:picture||'',photos,_photoIndex:0,_taleraLibraryV2:true,_taleraStoryId:story.id,_hasAudio:Boolean(story.audioId)};
 memories.set(id,story);runtime.registerMemory(memory);
 if(focus){stopVoice();runtime.setCenter(ms);runtime.writeMemory(memory);runtime.draw();}
 return memory;
}
async function boot(){
 try{ready();for(const s of await listStories())await registerStory(s,false);runtime.draw()}
 catch(e){console.warn('TALERA V2 bibliotheek niet beschikbaar',e);status(e.message,true)}
}
function closeEditor(){
 if(recState==='recording'||recState==='paused'){status('Stop eerst de opname voordat je dit scherm sluit.',true);return}
 sheet.classList.remove('is-open');
}
const sheet=docs.createElement('section');sheet.className='talera-v2-sheet';sheet.setAttribute('aria-label','Vertel je herinnering');
sheet.innerHTML='<header class="talera-v2-header"><strong>TALERA · VERTELLEN</strong><button type="button" class="talera-v2-close" aria-label="Sluiten">×</button></header><div class="talera-v2-scroll"><div class="talera-v2-fields"><input class="talera-v2-title" type="text" maxlength="140" placeholder="Naam van je herinnering" aria-label="Titel"><input type="date" class="talera-v2-date" aria-label="Datum"></div><div class="talera-v2-frame"></div><div class="talera-v2-steps"><button type="button" class="talera-v2-prev">‹ Vorige</button><span class="talera-v2-pos">0 / 0</span><button type="button" class="talera-v2-next">Volgende ›</button></div><div class="talera-v2-actions"><input class="talera-v2-file" type="file" multiple accept="image/*,video/*" hidden><button type="button" class="talera-v2-import">＋ Foto’s toevoegen</button><button type="button" class="talera-v2-record">● Start opname</button><button type="button" class="talera-v2-stop" disabled>■ Stop</button></div><div class="talera-v2-status" aria-live="polite">Foto’s uit de bibliotheek kiezen.</div><div class="talera-v2-actions"><button type="button" class="talera-v2-primary talera-v2-save">Op mijn tijdlijn plaatsen</button></div><p>Uit mijn TALERA-bibliotheek</p><div class="talera-v2-existing"></div></div>';
docs.body.appendChild(sheet);
const input=sheet.querySelector('.talera-v2-file'),list=sheet.querySelector('.talera-v2-existing'),position=sheet.querySelector('.talera-v2-pos');
const titleInput=sheet.querySelector('.talera-v2-title'),dateInput=sheet.querySelector('.talera-v2-date'),recordButton=sheet.querySelector('.talera-v2-record'),stopButton=sheet.querySelector('.talera-v2-stop'),saveButton=sheet.querySelector('.talera-v2-save');
dateInput.value=new Date().toISOString().slice(0,10);
function openEditor(){stopVoice();resetEditor();dateInput.value=new Date().toISOString().slice(0,10);sheet.classList.add('is-open')}
sheet.querySelector('.talera-v2-close').addEventListener('click',closeEditor);
sheet.querySelector('.talera-v2-import').addEventListener('click',()=>input.click());
input.addEventListener('change',()=>{void importSelected(input.files||[])});
sheet.querySelector('.talera-v2-prev').addEventListener('click',()=>{if(selected.length)selectMedia(selected[(currentIndex-1+selected.length)%selected.length])});
sheet.querySelector('.talera-v2-next').addEventListener('click',()=>{if(selected.length)selectMedia(selected[(currentIndex+1)%selected.length])});
recordButton.addEventListener('click',async()=>{try{
 if(recState==='recording'||recState==='paused'){pauseRecording();return}
 if(recState==='stopped'){recState='idle';recBlob=null;recAudioId=null}
 await startRecording();stopButton.disabled=false;
}catch(e){showError(e)}});
stopButton.addEventListener('click',async()=>{try{await stopRecording();stopButton.disabled=true}catch(e){showError(e)}});
saveButton.addEventListener('click',()=>{void saveCurrent()});
docs.addEventListener('click',e=>{
 const sc=e.target.closest('#memoryStoryScroll');
 if(sc&&runtime.currentMemory()?._taleraLibraryV2&&!(e.target.closest('button,a,input'))){
  const m=runtime.currentMemory(),story=memories.get(m.id);
  if(story?.mediaIds?.length>1){e.preventDefault();e.stopImmediatePropagation();void showFrame(story.mediaIds[((m._photoIndex||0)+1)%story.mediaIds.length]).catch(showError)}
  return;
 }
 if(e.target.closest('.tell')){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openEditor();return}
 const button=e.target.closest('.talera-memory-audio');if(button&&runtime.currentMemory()?._taleraLibraryV2){
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  const m=runtime.currentMemory(),s=memories.get(m.id);
  if(!s)return;
  if(currentStory?.id===s.id&&audio&&!audio.paused){pauseVoice();button.classList.remove('is-playing')}
  else if(currentStory?.id===s.id&&audio?.paused&&audio.src){audio.play().then(()=>{active=true;if(voiceClock)clearInterval(voiceClock);voiceClock=setInterval(sync,80);button.classList.add('is-playing')}).catch(showError)}
  else void playStory(s).then(()=>{button.classList.add('is-playing')}).catch(showError);
 }
},true);
runtime.subscribe(m=>{
 if(!m?._taleraLibraryV2){if(currentStory)stopVoice();currentStory=null;return}
 const button=docs.querySelector('.talera-memory-audio');if(button)button.hidden=!m._hasAudio;
 if(currentStory&&currentStory.id!==m._taleraStoryId){stopVoice();currentStory=null}
 const selectedStory=memories.get(m.id);if(selectedStory?.audioId)void primeAudioForCurrent(selectedStory);
});
docs.addEventListener('visibilitychange',()=>{if(docs.hidden){pauseVoice();if(recState==='recording')pauseRecording()}});
window.addEventListener('pagehide',()=>{stopVoice();if(recState==='recording')pauseRecording();if(stream){stream.getTracks().forEach(x=>x.stop());stream=null}});
window.__taleraLibraryFirstV2={version:FORMAT,importMedia:importFile,listMedia,listStories,readStory,saveStory,openEditor,playStory,stopVoice};
void boot();
})();`;
