export const memoryPresentationControlsStyle = String.raw`
/* Multi-photo position needs to be readable at a glance without becoming a new bar. */
.talera-photo-dots{gap:7px!important;min-height:22px!important;padding:5px 11px!important;background:rgba(15,39,71,.11)!important}
.talera-photo-dot{width:7px!important;height:7px!important;opacity:.9!important;background:rgba(255,255,255,.72)!important;box-shadow:0 1px 5px rgba(15,39,71,.28)!important}
.talera-photo-dot.active{background:#E7A98B!important;transform:scale(1.5)!important;box-shadow:0 0 0 2px rgba(255,254,252,.52),0 2px 7px rgba(15,39,71,.28)!important}

.talera-memory-tools{position:absolute;z-index:12;right:13px;top:13px;display:flex;align-items:center;gap:7px;pointer-events:none}
.talera-memory-tool{pointer-events:auto;height:38px;min-width:38px;border:0;border-radius:999px;background:rgba(255,254,252,.88);color:#0F2747;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 11px;box-shadow:0 5px 16px rgba(15,39,71,.10),inset 0 0 0 1px rgba(15,39,71,.07);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font-size:12px;font-weight:720}
.talera-memory-tool.icon-only{width:38px;padding:0;font-size:18px}
.talera-memory-tool[hidden]{display:none!important}
.talera-memory-auto.is-on{background:#0F2747;color:#fff;box-shadow:0 6px 18px rgba(15,39,71,.18)}
.talera-memory-audio.is-playing{background:#0F2747;color:#fff}
.talera-memory-audio .audio-symbol{font-size:17px;line-height:1}
.talera-memory-edit .edit-symbol{font-size:17px;line-height:1}
@media(max-width:430px){
  .talera-memory-tools{right:10px;top:10px;gap:6px}
  .talera-memory-tool{height:36px;min-width:36px;padding:0 9px;font-size:11px}
  .talera-memory-tool.icon-only{width:36px}
}
`;

export const memoryPresentationControlsScript = String.raw`
(()=>{
  const TELL_ORIGIN='https://xxory-test.mark-a39.workers.dev';
  const AUTO_KEY='talera-presentation-audio-auto-v1';
  const runtime=window.__taleraTimelineRuntime;
  const memorySpace=document.querySelector('.memory-space');
  if(!runtime||!memorySpace)return;

  /* Vertel always means a new workblad. Editing has its own pencil action. */
  const oldTell=document.querySelector('.tell');
  if(oldTell){
    const fresh=oldTell.cloneNode(true);
    oldTell.replaceWith(fresh);
    fresh.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      const memory=runtime.currentMemory();
      const ms=memory&&memory.ms?memory.ms:runtime.centerMs();
      location.href=TELL_ORIGIN+'/?at='+encodeURIComponent(new Date(ms).toISOString());
    },true);
  }

  const tools=document.createElement('div');
  tools.className='talera-memory-tools';
  tools.innerHTML='<button class="talera-memory-tool talera-memory-audio icon-only" type="button" aria-label="Gesproken verhaal afspelen" hidden><span class="audio-symbol">▶</span></button><button class="talera-memory-tool talera-memory-auto" type="button" aria-label="Automatisch afspelen" hidden>Auto</button><button class="talera-memory-tool talera-memory-edit icon-only" type="button" aria-label="Herinnering bewerken" hidden><span class="edit-symbol">✎</span></button>';
  memorySpace.appendChild(tools);

  const audioButton=tools.querySelector('.talera-memory-audio');
  const autoButton=tools.querySelector('.talera-memory-auto');
  const editButton=tools.querySelector('.talera-memory-edit');
  const audio=new Audio();
  audio.preload='metadata';
  const audioUrls=new Map();
  const detailCache=new Map();
  let activeStoryId='';
  let activeToken='';
  let activeHasAudio=false;
  let autoEnabled=false;
  try{autoEnabled=localStorage.getItem(AUTO_KEY)==='1'}catch(e){}

  function tokenFor(memory){return memory&&memory._manageToken||''}
  function isEditable(memory){return Boolean(memory&&memory._taleraLive&&memory.storyId&&tokenFor(memory))}
  function setAutoUi(){
    autoButton.classList.toggle('is-on',autoEnabled);
    autoButton.setAttribute('aria-pressed',autoEnabled?'true':'false');
    autoButton.textContent=autoEnabled?'Auto aan':'Auto';
  }
  setAutoUi();

  async function getDetail(memory){
    if(!isEditable(memory))return null;
    const id=memory.storyId,token=tokenFor(memory);
    const cached=detailCache.get(id);
    if(cached)return cached;
    const res=await fetch('/api/linked/stories/'+encodeURIComponent(id),{headers:{authorization:'Bearer '+token},cache:'no-store'});
    if(!res.ok)throw new Error('detail '+res.status);
    const detail=await res.json();
    detailCache.set(id,detail);
    return detail;
  }

  async function getAudioUrl(storyId,token){
    if(audioUrls.has(storyId))return audioUrls.get(storyId);
    const res=await fetch('/api/linked/stories/'+encodeURIComponent(storyId)+'/audio',{headers:{authorization:'Bearer '+token},cache:'no-store'});
    if(!res.ok)throw new Error('audio '+res.status);
    const blob=await res.blob();
    const url=URL.createObjectURL(blob);
    audioUrls.set(storyId,url);
    return url;
  }

  function stopAudio(reset=true){
    try{audio.pause();if(reset)audio.currentTime=0}catch(e){}
    audioButton.classList.remove('is-playing');
    const symbol=audioButton.querySelector('.audio-symbol');if(symbol)symbol.textContent='▶';
  }

  async function playCurrent(fromAuto=false){
    if(!activeStoryId||!activeToken||!activeHasAudio)return;
    try{
      const url=await getAudioUrl(activeStoryId,activeToken);
      if(audio.src!==url){stopAudio(true);audio.src=url}
      await audio.play();
      audioButton.classList.add('is-playing');
      const symbol=audioButton.querySelector('.audio-symbol');if(symbol)symbol.textContent='Ⅱ';
    }catch(e){
      if(!fromAuto)console.warn('TALERA audio kon niet starten',e);
    }
  }

  audio.addEventListener('ended',()=>stopAudio(true));
  audio.addEventListener('pause',()=>{
    if(audio.ended)return;
    audioButton.classList.remove('is-playing');
    const symbol=audioButton.querySelector('.audio-symbol');if(symbol)symbol.textContent='▶';
  });

  audioButton.addEventListener('click',()=>{
    if(!audio.paused){audio.pause();return}
    playCurrent(false);
  });
  autoButton.addEventListener('click',()=>{
    autoEnabled=!autoEnabled;
    try{localStorage.setItem(AUTO_KEY,autoEnabled?'1':'0')}catch(e){}
    setAutoUi();
    if(autoEnabled&&activeHasAudio)playCurrent(false);
  });
  editButton.addEventListener('click',()=>{
    const memory=runtime.currentMemory();
    if(!isEditable(memory))return;
    location.href=TELL_ORIGIN+'/?edit='+encodeURIComponent(memory.storyId)+'#token='+encodeURIComponent(tokenFor(memory));
  });

  let renderEpoch=0;
  async function render(memory,mayAutoplay=false){
    const epoch=++renderEpoch;
    const editable=isEditable(memory);
    editButton.hidden=!editable;
    stopAudio(true);
    activeStoryId=editable?memory.storyId:'';
    activeToken=editable?tokenFor(memory):'';
    activeHasAudio=false;
    audioButton.hidden=true;
    autoButton.hidden=true;
    if(!editable)return;

    try{
      const detail=await getDetail(memory);
      if(epoch!==renderEpoch)return;
      activeHasAudio=Boolean(detail&&detail.hasAudio);
      audioButton.hidden=!activeHasAudio;
      autoButton.hidden=!activeHasAudio;
      setAutoUi();
      if(activeHasAudio&&autoEnabled&&mayAutoplay)setTimeout(()=>playCurrent(true),40);
    }catch(e){
      if(epoch!==renderEpoch)return;
      audioButton.hidden=true;autoButton.hidden=true;
    }
  }

  runtime.subscribe(memory=>render(memory,true));
  render(runtime.currentMemory(),false);
})();
`;
