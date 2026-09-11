export const memoryPresentationControlsStyle = String.raw`
/* The title already identifies the memory; do not repeat a separate badge. */
.talera-live-badge{display:none!important}

/* Multi-photo position remains the cue for tap-through photos inside one memory. */
.talera-photo-dots{gap:8px!important;min-height:24px!important;padding:5px 12px!important;background:rgba(15,39,71,.13)!important}
.talera-photo-dot{width:8px!important;height:8px!important;opacity:.95!important;background:rgba(255,255,255,.80)!important;box-shadow:0 1px 6px rgba(15,39,71,.32)!important}
.talera-photo-dot.active{background:#E7A98B!important;transform:scale(1.48)!important;box-shadow:0 0 0 2px rgba(255,254,252,.62),0 2px 8px rgba(15,39,71,.30)!important}

/* Listening is part of the memory itself, not a separate mode or toolbar. */
.talera-memory-tools{position:absolute;z-index:12;inset:0;pointer-events:none}
.talera-memory-tool{pointer-events:auto;border:0;border-radius:999px;background:rgba(255,254,252,.94);color:#0F2747;display:inline-flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 6px 22px rgba(15,39,71,.15),inset 0 0 0 1px rgba(15,39,71,.08);backdrop-filter:blur(13px);-webkit-backdrop-filter:blur(13px);font-weight:730}
.talera-memory-tool[hidden]{display:none!important}
.talera-memory-audio{position:absolute;right:16px;bottom:18px;min-width:104px;height:44px;padding:0 15px;font-size:13px}
.talera-memory-audio.is-playing{background:#0F2747;color:#fff;box-shadow:0 8px 24px rgba(15,39,71,.24)}
.talera-memory-audio.is-loading{opacity:.78}
.talera-memory-audio .audio-symbol{font-size:15px;line-height:1}
.talera-memory-edit{position:absolute;right:13px;top:13px;width:40px;height:40px;padding:0;font-size:18px}
.talera-memory-edit .edit-symbol{font-size:17px;line-height:1}
@media(max-width:430px){
  .talera-memory-audio{right:12px;bottom:14px;height:42px;min-width:100px;padding:0 14px;font-size:12px}
  .talera-memory-edit{right:10px;top:10px;width:38px;height:38px}
}
`;

export const memoryPresentationControlsScript = String.raw`
(()=>{
  const TELL_ORIGIN='https://xxory-test.mark-a39.workers.dev';
  const runtime=window.__taleraTimelineRuntime;
  const memorySpace=document.querySelector('.memory-space');
  if(!runtime||!memorySpace)return;

  /* Vertel always starts a new memory. Existing content is edited only with the pencil. */
  const oldTell=document.querySelector('.tell');
  if(oldTell){
    const fresh=oldTell.cloneNode(true);
    oldTell.replaceWith(fresh);
    fresh.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      stopAudio(true);
      const ms=runtime.centerMs();
      location.href=TELL_ORIGIN+'/?new=1&at='+encodeURIComponent(new Date(ms).toISOString());
    },true);
  }

  const tools=document.createElement('div');
  tools.className='talera-memory-tools';
  tools.innerHTML='<button class="talera-memory-tool talera-memory-audio" type="button" aria-label="Luister naar het gesproken verhaal" hidden><span class="audio-symbol">▶</span><span class="audio-label">Luister</span></button><button class="talera-memory-tool talera-memory-edit" type="button" aria-label="Herinnering bewerken" hidden><span class="edit-symbol">✎</span></button>';
  memorySpace.appendChild(tools);

  const audioButton=tools.querySelector('.talera-memory-audio');
  const audioLabel=tools.querySelector('.audio-label');
  const editButton=tools.querySelector('.talera-memory-edit');
  const audio=new Audio();
  audio.preload='auto';
  const audioUrls=new Map();
  const detailCache=new Map();
  let activeStoryId='';
  let activeToken='';
  let activeHasAudio=false;
  let playbackEpoch=0;
  let loading=false;

  function tokenFor(memory){return memory&&memory._manageToken||''}
  function isEditable(memory){return Boolean(memory&&memory._taleraLive&&memory.storyId&&tokenFor(memory))}
  function auth(token){return {authorization:'Bearer '+token}}

  function setAudioUi(){
    const playing=!audio.paused&&!audio.ended;
    audioButton.classList.toggle('is-playing',playing);
    audioButton.classList.toggle('is-loading',loading);
    audioButton.disabled=loading;
    const symbol=audioButton.querySelector('.audio-symbol');
    if(loading){
      if(symbol)symbol.textContent='…';
      if(audioLabel)audioLabel.textContent='Laden';
      return;
    }
    if(playing){
      if(symbol)symbol.textContent='Ⅱ';
      if(audioLabel)audioLabel.textContent='Pauze';
      return;
    }
    if(symbol)symbol.textContent='▶';
    if(audioLabel)audioLabel.textContent=(audio.currentTime>0&&!audio.ended)?'Verder':'Luister';
  }
  function showAudio(show){audioButton.hidden=!show}

  async function getDetail(memory,force=false){
    if(!isEditable(memory))return null;
    const id=memory.storyId,token=tokenFor(memory);
    if(!force&&detailCache.has(id))return detailCache.get(id);
    const localPath='/api/linked/stories/'+encodeURIComponent(id);
    let response=null;
    try{
      response=await fetch(localPath,{headers:auth(token),cache:'no-store'});
      if(response.ok){const data=await response.json();detailCache.set(id,data);return data}
    }catch(e){}
    response=await fetch(TELL_ORIGIN+'/api/integration/stories/'+encodeURIComponent(id),{headers:auth(token),cache:'no-store'});
    if(!response.ok)throw new Error('detail '+response.status);
    const data=await response.json();detailCache.set(id,data);return data;
  }

  async function probeAudio(storyId,token){
    const paths=['/api/linked/stories/'+encodeURIComponent(storyId)+'/audio',TELL_ORIGIN+'/api/integration/stories/'+encodeURIComponent(storyId)+'/audio'];
    for(const path of paths){
      try{
        const response=await fetch(path,{method:'HEAD',headers:auth(token),cache:'no-store'});
        if(response.ok)return true;
      }catch(e){}
    }
    return false;
  }

  async function getAudioUrl(storyId,token){
    if(audioUrls.has(storyId))return audioUrls.get(storyId);
    const paths=['/api/linked/stories/'+encodeURIComponent(storyId)+'/audio',TELL_ORIGIN+'/api/integration/stories/'+encodeURIComponent(storyId)+'/audio'];
    let lastStatus=0;
    for(const path of paths){
      try{
        const response=await fetch(path,{headers:auth(token),cache:'no-store'});
        lastStatus=response.status;
        if(!response.ok)continue;
        const blob=await response.blob();
        if(!blob.size)continue;
        const url=URL.createObjectURL(blob);
        audioUrls.set(storyId,url);
        return url;
      }catch(e){}
    }
    throw new Error('audio '+lastStatus);
  }

  function stopAudio(reset=true){
    playbackEpoch+=1;
    loading=false;
    try{audio.pause();if(reset){audio.currentTime=0;audio.removeAttribute('src');audio.load()}}catch(e){}
    setAudioUi();
  }

  function playPreparedAudio(){
    if(!activeStoryId||!activeToken||!activeHasAudio||loading)return;
    const url=audioUrls.get(activeStoryId);
    if(!url){
      loading=true;setAudioUi();
      const storyId=activeStoryId,token=activeToken,epoch=playbackEpoch;
      getAudioUrl(storyId,token).then(()=>{
        if(epoch!==playbackEpoch||storyId!==activeStoryId)return;
        loading=false;setAudioUi();
      }).catch(e=>{
        if(epoch!==playbackEpoch)return;
        loading=false;setAudioUi();
        console.warn('TALERA audio kon niet worden voorbereid',e);
      });
      return;
    }
    try{
      if(audio.src!==url){audio.src=url;audio.currentTime=0}
      const playPromise=audio.play();
      if(playPromise&&typeof playPromise.catch==='function'){
        playPromise.catch(e=>{setAudioUi();console.warn('TALERA audio kon niet starten',e)});
      }
      setAudioUi();
    }catch(e){
      setAudioUi();
      console.warn('TALERA audio kon niet starten',e);
    }
  }

  audio.addEventListener('ended',()=>{
    try{audio.currentTime=0}catch(e){}
    setAudioUi();
  });
  audio.addEventListener('pause',setAudioUi);
  audio.addEventListener('play',setAudioUi);
  audio.addEventListener('timeupdate',()=>{if(audio.paused)setAudioUi()});

  audioButton.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    if(loading)return;
    if(!audio.paused){audio.pause();return}
    playPreparedAudio();
  });

  editButton.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    stopAudio(true);
    const memory=runtime.currentMemory();
    if(!isEditable(memory))return;
    location.href=TELL_ORIGIN+'/?edit='+encodeURIComponent(memory.storyId)+'#token='+encodeURIComponent(tokenFor(memory));
  });

  let renderEpoch=0;
  async function render(memory){
    const epoch=++renderEpoch;
    const editable=isEditable(memory);
    stopAudio(true);
    editButton.hidden=!editable;
    activeStoryId=editable?memory.storyId:'';
    activeToken=editable?tokenFor(memory):'';
    activeHasAudio=false;
    showAudio(false);
    setAudioUi();
    if(!editable)return;

    try{
      const detail=await getDetail(memory,true);
      if(epoch!==renderEpoch)return;
      activeHasAudio=Boolean(detail&&detail.hasAudio);
      memory._hasAudio=activeHasAudio;
    }catch(e){}

    /* Metadata is authoritative, but a HEAD probe catches stale detail after a fresh upload/edit. */
    if(!activeHasAudio&&epoch===renderEpoch){
      try{
        activeHasAudio=await probeAudio(activeStoryId,activeToken);
        if(epoch!==renderEpoch)return;
        memory._hasAudio=activeHasAudio;
      }catch(e){}
    }

    if(epoch!==renderEpoch||!activeHasAudio)return;

    /* Prepare the protected blob before the user taps, so iPhone can play inside the tap gesture. */
    loading=true;showAudio(true);setAudioUi();
    try{
      await getAudioUrl(activeStoryId,activeToken);
      if(epoch!==renderEpoch)return;
      loading=false;showAudio(true);setAudioUi();
    }catch(e){
      if(epoch!==renderEpoch)return;
      loading=false;activeHasAudio=false;memory._hasAudio=false;showAudio(false);setAudioUi();
    }
  }

  runtime.subscribe(memory=>render(memory));
  render(runtime.currentMemory());
})();
`;
