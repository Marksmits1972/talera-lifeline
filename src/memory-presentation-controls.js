export const memoryPresentationControlsStyle = String.raw`
.talera-live-badge{display:none!important}
.memory-caption .date,#memoryDate{display:none!important}
.talera-photo-dots{gap:8px!important;min-height:24px!important;padding:5px 12px!important;background:rgba(15,39,71,.13)!important}
.talera-photo-dot{width:8px!important;height:8px!important;opacity:.95!important;background:rgba(255,255,255,.80)!important;box-shadow:0 1px 6px rgba(15,39,71,.32)!important}
.talera-photo-dot.active{background:#E7A98B!important;transform:scale(1.48)!important;box-shadow:0 0 0 2px rgba(255,254,252,.62),0 2px 8px rgba(15,39,71,.30)!important}
.talera-memory-tools{position:absolute;z-index:12;inset:0;pointer-events:none}
.talera-memory-tool{pointer-events:auto;border:0;border-radius:999px;background:rgba(255,254,252,.94);color:#0F2747;display:inline-flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 6px 22px rgba(15,39,71,.15),inset 0 0 0 1px rgba(15,39,71,.08);backdrop-filter:blur(13px);-webkit-backdrop-filter:blur(13px);font-weight:730}
.talera-memory-tool[hidden]{display:none!important}
.talera-memory-audio{position:absolute;right:16px;bottom:18px;min-width:104px;height:44px;padding:0 15px;font-size:13px}
.talera-memory-audio.is-playing{background:#0F2747;color:#fff;box-shadow:0 8px 24px rgba(15,39,71,.24)}
.talera-memory-audio.is-loading{opacity:.78}
.talera-memory-audio.is-error{box-shadow:0 6px 22px rgba(15,39,71,.15),inset 0 0 0 1px rgba(231,169,139,.65)}
.talera-memory-audio .audio-symbol{font-size:15px;line-height:1}
.talera-memory-edit{position:absolute;right:13px;top:13px;width:40px;height:40px;padding:0;font-size:18px}
.talera-memory-edit .edit-symbol{font-size:17px;line-height:1}
@media(max-width:430px){.talera-memory-audio{right:12px;bottom:14px;height:42px;min-width:100px;padding:0 14px;font-size:12px}.talera-memory-edit{right:10px;top:10px;width:38px;height:38px}}
`;

export const memoryPresentationControlsScript = String.raw`
(()=>{
  const TELL_ORIGIN='https://xxory-test.mark-a39.workers.dev';
  const runtime=window.__taleraTimelineRuntime;
  const memorySpace=document.querySelector('.memory-space');
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
  function setUi(){
    const playing=!audio.paused&&!audio.ended;
    audioButton.classList.toggle('is-playing',playing);audioButton.classList.toggle('is-loading',loading);audioButton.classList.toggle('is-error',loadFailed);audioButton.disabled=false;
    const symbol=audioButton.querySelector('.audio-symbol');
    if(loading){if(symbol)symbol.textContent='…';audioLabel.textContent='Laden';return}
    if(playing){if(symbol)symbol.textContent='Ⅱ';audioLabel.textContent='Pauze';return}
    if(symbol)symbol.textContent='▶';
    if(loadFailed){audioLabel.textContent='Opnieuw';return}
    audioLabel.textContent=(audio.currentTime>0&&!audio.ended)?'Verder':'Luister';
  }
  function stopAudio(reset=true){loading=false;loadFailed=false;try{audio.pause();if(reset){audio.currentTime=0;audio.removeAttribute('src');audio.load()}}catch(e){}setUi()}

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
      audio.src=url;audio.currentTime=0;audio.load();loading=false;loadFailed=false;setUi();return true;
    }catch(e){
      if(epoch!==renderEpoch)return false;loading=false;loadFailed=true;showAudio(true);setUi();return false;
    }
  }
  async function playNow(){
    if(!activeStoryId||!activeToken||!activeHasAudio||loading||loadFailed||!audio.src)return;
    try{const p=audio.play();if(p&&typeof p.catch==='function')await p;loadFailed=false;setUi()}catch(e){loadFailed=true;setUi();console.warn('TALERA audio kon niet starten',e)}
  }

  audio.addEventListener('play',setUi);audio.addEventListener('pause',setUi);audio.addEventListener('ended',()=>{try{audio.currentTime=0}catch(e){}setUi()});audio.addEventListener('error',()=>{loadFailed=true;setUi()});
  audioButton.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    if(loading)return;
    if(!audio.paused){audio.pause();return}
    if(loadFailed||!audio.src){prepare(activeStoryId,activeToken,renderEpoch,true);return}
    playNow();
  });
  editButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();stopAudio(true);const m=runtime.currentMemory();if(!usable(m))return;location.href=TELL_ORIGIN+'/?edit='+encodeURIComponent(m.storyId)+'#token='+encodeURIComponent(tokenFor(m))});

  async function render(memory){
    const epoch=++renderEpoch;stopAudio(true);const ok=usable(memory);editButton.hidden=!ok;activeStoryId=ok?memory.storyId:'';activeToken=ok?tokenFor(memory):'';activeHasAudio=false;showAudio(false);setUi();if(!ok)return;
    const hinted=Boolean(memory._hasAudio||Number(memory._durationSeconds)>0);
    if(hinted){activeHasAudio=true;loading=true;showAudio(true);setUi()}
    const detail=await getDetail(activeStoryId,activeToken);if(epoch!==renderEpoch)return;
    const expected=Boolean(detail&&(detail.hasAudio||Number(detail.durationSeconds)>0))||hinted;
    activeHasAudio=expected;memory._hasAudio=expected;
    if(expected){loading=true;showAudio(true);setUi()}
    try{
      const url=await getAudioUrl(activeStoryId,activeToken,false);if(epoch!==renderEpoch)return;
      activeHasAudio=true;memory._hasAudio=true;showAudio(true);audio.src=url;audio.currentTime=0;audio.load();loading=false;loadFailed=false;setUi();return;
    }catch(e){}
    if(epoch!==renderEpoch)return;
    loading=false;activeHasAudio=expected;memory._hasAudio=expected;
    if(expected){showAudio(true);loadFailed=true;setUi()}else showAudio(false);
  }

  runtime.subscribe(memory=>render(memory));render(runtime.currentMemory());
})();
`;
