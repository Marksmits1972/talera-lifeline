export const memoryPresentationControlsStyle = String.raw`
.talera-live-badge{display:none!important}
.memory-caption .date,#memoryDate{display:none!important}
.talera-photo-dots{gap:8px!important;min-height:24px!important;padding:5px 12px!important;background:rgba(15,39,71,.13)!important}
.talera-photo-dot{width:8px!important;height:8px!important;opacity:.95!important;background:rgba(255,255,255,.80)!important;box-shadow:0 1px 6px rgba(15,39,71,.32)!important}
.talera-photo-dot.active{background:#E7A98B!important;transform:scale(1.48)!important;box-shadow:0 0 0 2px rgba(255,254,252,.62),0 2px 8px rgba(15,39,71,.30)!important}
.talera-memory-tools{position:absolute;z-index:12;inset:0;pointer-events:none}
.talera-memory-tool{pointer-events:auto;border:0;border-radius:999px;color:#0F2747;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 6px 22px rgba(15,39,71,.15),inset 0 0 0 1px rgba(15,39,71,.08);backdrop-filter:blur(13px);-webkit-backdrop-filter:blur(13px);font-weight:730}
.talera-memory-tool[hidden]{display:none!important}
.talera-memory-audio{--audio-progress:0deg;position:absolute;right:16px;bottom:82px;width:48px;min-width:48px;height:48px;padding:3px;font-size:14px;background:conic-gradient(#E7A98B var(--audio-progress),rgba(255,254,252,.94) 0);box-shadow:0 7px 24px rgba(15,39,71,.18)}
.talera-memory-audio .audio-symbol{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,254,252,.97);color:#0F2747;font-size:15px;line-height:1;box-shadow:inset 0 0 0 1px rgba(15,39,71,.06)}
.talera-memory-audio .audio-label{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
.talera-memory-audio.is-playing .audio-symbol{background:rgba(15,39,71,.96);color:#fff}
.talera-memory-audio.is-loading{opacity:.78}
.talera-memory-audio.is-error{box-shadow:0 7px 24px rgba(15,39,71,.18),0 0 0 2px rgba(231,169,139,.52)}
.talera-memory-edit{position:absolute;right:13px;top:13px;width:40px;height:40px;padding:0;font-size:18px;background:rgba(255,254,252,.94)}
.talera-memory-edit .edit-symbol{font-size:17px;line-height:1}
.memory-space.is-listening .memory-sheet .story-more{opacity:0;transform:translateY(8px);transition:opacity .22s ease,transform .22s ease}
.memory-space.is-listening.is-reading-during-listen .memory-sheet .story-more{opacity:1;transform:translateY(0)}
@media(max-width:430px){.talera-memory-audio{right:12px;bottom:74px;width:46px;min-width:46px;height:46px;padding:3px}.talera-memory-audio .audio-symbol{width:40px;height:40px}.talera-memory-edit{right:10px;top:10px;width:38px;height:38px}}
`;

export const memoryPresentationControlsScript = String.raw`
(()=>{
  const TELL_ORIGIN='https://xxory-test.mark-a39.workers.dev';
  const runtime=window.__taleraTimelineRuntime;
  const memorySpace=document.querySelector('.memory-space');
  const storyScroll=document.getElementById('memoryStoryScroll');
  if(!runtime||!memorySpace)return;

  const oldTell=document.querySelector('.tell');
  if(oldTell){
    const fresh=oldTell.cloneNode(true);oldTell.replaceWith(fresh);
    fresh.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();stopAudio(true);location.href=TELL_ORIGIN+'/?new=1&at='+encodeURIComponent(new Date(runtime.centerMs()).toISOString())},true);
  }

  const tools=document.createElement('div');
  tools.className='talera-memory-tools';
  tools.innerHTML='<button class="talera-memory-tool talera-memory-audio" type="button" aria-label="Luister naar het gesproken verhaal" hidden><span class="audio-symbol">▶</span><span class="audio-label">Luister</span></button><button class="talera-memory-tool talera-memory-edit" type="button" aria-label="Herinnering bewerken" hidden><span class="edit-symbol">✎</span></button>';
  memorySpace.appendChild(tools);

  const audioButton=tools.querySelector('.talera-memory-audio');
  const audioLabel=tools.querySelector('.audio-label');
  const editButton=tools.querySelector('.talera-memory-edit');
  const audio=new Audio();audio.preload='auto';audio.setAttribute('playsinline','');
  const audioUrls=new Map();
  let activeStoryId='',activeToken='',activeHasAudio=false,loading=false,loadFailed=false,renderEpoch=0;

  function tokenFor(m){return m&&m._manageToken||''}
  function usable(m){return Boolean(m&&m._taleraLive&&m.storyId&&tokenFor(m))}
  function auth(token){return {authorization:'Bearer '+token}}
  function showAudio(v){audioButton.hidden=!v}
  function setProgress(){
    const duration=Number(audio.duration)||0;
    const current=Number(audio.currentTime)||0;
    const ratio=duration>0?Math.max(0,Math.min(1,current/duration)):0;
    audioButton.style.setProperty('--audio-progress',(ratio*360)+'deg');
  }
  function enterListeningMode(){
    if(memorySpace.classList.contains('is-listening'))return;
    memorySpace.classList.add('is-listening');
    memorySpace.classList.remove('is-reading-during-listen');
    if(storyScroll){try{storyScroll.scrollTop=0}catch(e){}}
  }
  function exitListeningMode(){memorySpace.classList.remove('is-listening','is-reading-during-listen')}
  function setUi(){
    const playing=!audio.paused&&!audio.ended;
    audioButton.classList.toggle('is-playing',playing);audioButton.classList.toggle('is-loading',loading);audioButton.classList.toggle('is-error',loadFailed);audioButton.disabled=false;
    const symbol=audioButton.querySelector('.audio-symbol');
    if(loading){if(symbol)symbol.textContent='…';audioLabel.textContent='Laden';audioButton.setAttribute('aria-label','Gesproken verhaal laden');return}
    if(playing){if(symbol)symbol.textContent='Ⅱ';audioLabel.textContent='Pauze';audioButton.setAttribute('aria-label','Gesproken verhaal pauzeren');return}
    if(symbol)symbol.textContent=loadFailed?'↻':'▶';
    if(loadFailed){audioLabel.textContent='Opnieuw';audioButton.setAttribute('aria-label','Gesproken verhaal opnieuw laden');return}
    audioLabel.textContent=(audio.currentTime>0&&!audio.ended)?'Verder':'Luister';
    audioButton.setAttribute('aria-label',(audio.currentTime>0&&!audio.ended)?'Verder luisteren naar het gesproken verhaal':'Luister naar het gesproken verhaal');
  }
  function stopAudio(reset=true){loading=false;loadFailed=false;try{audio.pause();if(reset){audio.currentTime=0;audio.removeAttribute('src');audio.load();setProgress()}}catch(e){}exitListeningMode();setUi()}

  async function getDetail(id,token){
    const paths=['/api/linked/stories/'+encodeURIComponent(id),TELL_ORIGIN+'/api/integration/stories/'+encodeURIComponent(id)];
    for(const path of paths){try{const r=await fetch(path,{headers:auth(token),cache:'no-store'});if(r.ok)return await r.json()}catch(e){}}
    return null;
  }
  async function getAudioUrl(id,token,force=false){
    if(!force&&audioUrls.has(id))return audioUrls.get(id);
    const old=audioUrls.get(id);if(force&&old){try{URL.revokeObjectURL(old)}catch(e){}audioUrls.delete(id)}
    const paths=['/api/linked/stories/'+encodeURIComponent(id)+'/audio',TELL_ORIGIN+'/api/integration/stories/'+encodeURIComponent(id)+'/audio'];
    for(const path of paths){
      try{const r=await fetch(path,{headers:auth(token),cache:'no-store'});if(!r.ok)continue;const blob=await r.blob();if(!blob.size)continue;const url=URL.createObjectURL(blob);audioUrls.set(id,url);return url}catch(e){}
    }
    throw new Error('audio-load-failed');
  }
  async function prepare(id,token,epoch,force=false){
    loading=true;loadFailed=false;showAudio(true);setUi();
    try{
      const url=await getAudioUrl(id,token,force);if(epoch!==renderEpoch||id!==activeStoryId)return false;
      audio.src=url;audio.currentTime=0;audio.load();loading=false;loadFailed=false;activeHasAudio=true;setProgress();setUi();return true;
    }catch(e){
      if(epoch!==renderEpoch)return false;loading=false;loadFailed=true;showAudio(true);setUi();return false;
    }
  }
  async function playNow(){
    if(!activeStoryId||!activeToken||!activeHasAudio||loading||loadFailed||!audio.src)return;
    const wasListening=memorySpace.classList.contains('is-listening');
    if(!wasListening)enterListeningMode();
    try{const p=audio.play();if(p&&typeof p.catch==='function')await p;loadFailed=false;setUi()}catch(e){loadFailed=true;if(!wasListening)exitListeningMode();setUi();console.warn('TALERA audio kon niet starten',e)}
  }

  if(storyScroll){
    storyScroll.addEventListener('scroll',()=>{
      if(!memorySpace.classList.contains('is-listening'))return;
      memorySpace.classList.toggle('is-reading-during-listen',storyScroll.scrollTop>28);
    },{passive:true});
  }

  audio.addEventListener('play',()=>{enterListeningMode();setUi()});
  audio.addEventListener('pause',setUi);
  audio.addEventListener('timeupdate',()=>{setProgress();setUi()});
  audio.addEventListener('loadedmetadata',setProgress);
  audio.addEventListener('durationchange',setProgress);
  audio.addEventListener('ended',()=>{try{audio.currentTime=0}catch(e){}setProgress();setUi()});
  audio.addEventListener('error',()=>{loadFailed=true;exitListeningMode();setUi()});
  audioButton.addEventListener('click',async e=>{
    e.preventDefault();e.stopPropagation();
    if(loading)return;
    if(!audio.paused){audio.pause();return}
    if(loadFailed||!audio.src){const ok=await prepare(activeStoryId,activeToken,renderEpoch,true);if(ok)playNow();return}
    playNow();
  });
  editButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();stopAudio(true);const m=runtime.currentMemory();if(!usable(m))return;location.href=TELL_ORIGIN+'/?edit='+encodeURIComponent(m.storyId)+'#token='+encodeURIComponent(tokenFor(m))});

  async function render(memory){
    const epoch=++renderEpoch;stopAudio(true);const ok=usable(memory);editButton.hidden=!ok;activeStoryId=ok?memory.storyId:'';activeToken=ok?tokenFor(memory):'';activeHasAudio=false;showAudio(false);setUi();if(!ok)return;
    const hinted=Boolean(memory._hasAudio||memory._audioMimeType||Number(memory._durationSeconds)>0);
    loading=true;showAudio(true);setUi();
    const detail=await getDetail(activeStoryId,activeToken);if(epoch!==renderEpoch)return;
    const expected=Boolean(detail&&(detail.hasAudio||detail.audioMimeType||Number(detail.audioSizeBytes)>0||Number(detail.durationSeconds)>0))||hinted;
    activeHasAudio=expected;memory._hasAudio=expected;
    try{
      const url=await getAudioUrl(activeStoryId,activeToken,false);if(epoch!==renderEpoch)return;
      activeHasAudio=true;memory._hasAudio=true;showAudio(true);audio.src=url;audio.currentTime=0;audio.load();loading=false;loadFailed=false;setProgress();setUi();return;
    }catch(e){}
    if(epoch!==renderEpoch)return;
    loading=false;activeHasAudio=expected;memory._hasAudio=expected;
    if(expected){showAudio(true);loadFailed=true;setUi()}else showAudio(false);
  }

  runtime.subscribe(memory=>render(memory));render(runtime.currentMemory());
})();
`;
