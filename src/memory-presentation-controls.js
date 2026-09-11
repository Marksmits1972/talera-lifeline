export const memoryPresentationControlsStyle = String.raw`
/* The title already identifies the memory; do not repeat a separate badge. */
.talera-live-badge{display:none!important}

/* Multi-photo position should read immediately as a photo sequence. */
.talera-photo-dots{gap:8px!important;min-height:24px!important;padding:5px 12px!important;background:rgba(15,39,71,.13)!important}
.talera-photo-dot{width:8px!important;height:8px!important;opacity:.95!important;background:rgba(255,255,255,.80)!important;box-shadow:0 1px 6px rgba(15,39,71,.32)!important}
.talera-photo-dot.active{background:#E7A98B!important;transform:scale(1.48)!important;box-shadow:0 0 0 2px rgba(255,254,252,.62),0 2px 8px rgba(15,39,71,.30)!important}

.talera-memory-tools{position:absolute;z-index:12;right:13px;top:13px;display:flex;align-items:center;justify-content:flex-end;gap:7px;pointer-events:none}
.talera-memory-tool{pointer-events:auto;height:40px;min-width:40px;border:0;border-radius:999px;background:rgba(255,254,252,.91);color:#0F2747;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 12px;box-shadow:0 5px 18px rgba(15,39,71,.12),inset 0 0 0 1px rgba(15,39,71,.075);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font-size:12px;font-weight:730}
.talera-memory-tool.icon-only{width:40px;padding:0;font-size:18px}
.talera-memory-tool[hidden]{display:none!important}
.talera-memory-tool:disabled{opacity:.62}
.talera-memory-auto.is-on{background:#0F2747;color:#fff;box-shadow:0 6px 18px rgba(15,39,71,.18)}
.talera-memory-audio.is-playing{background:#0F2747;color:#fff}
.talera-memory-audio .audio-symbol{font-size:15px;line-height:1}
.talera-memory-edit .edit-symbol{font-size:17px;line-height:1}
@media(max-width:430px){
  .talera-memory-tools{right:10px;top:10px;gap:6px}
  .talera-memory-tool{height:38px;min-width:38px;padding:0 10px;font-size:11px}
  .talera-memory-tool.icon-only{width:38px}
}
`;

export const memoryPresentationControlsScript = String.raw`
(()=>{
  const TELL_ORIGIN='https://xxory-test.mark-a39.workers.dev';
  const AUTO_KEY='talera-presentation-audio-auto-v1';
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
      const ms=runtime.centerMs();
      location.href=TELL_ORIGIN+'/?new=1&at='+encodeURIComponent(new Date(ms).toISOString());
    },true);
  }

  const tools=document.createElement('div');
  tools.className='talera-memory-tools';
  tools.innerHTML='<button class="talera-memory-tool talera-memory-audio" type="button" aria-label="Gesproken verhaal afspelen" hidden><span class="audio-symbol">▶</span><span class="audio-label">Luister</span></button><button class="talera-memory-tool talera-memory-auto" type="button" aria-label="Automatisch afspelen" hidden>Auto</button><button class="talera-memory-tool talera-memory-edit icon-only" type="button" aria-label="Herinnering bewerken" hidden><span class="edit-symbol">✎</span></button>';
  memorySpace.appendChild(tools);

  const audioButton=tools.querySelector('.talera-memory-audio');
  const audioLabel=tools.querySelector('.audio-label');
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
  function auth(token){return {authorization:'Bearer '+token}}
  function setAutoUi(){
    autoButton.classList.toggle('is-on',autoEnabled);
    autoButton.setAttribute('aria-pressed',autoEnabled?'true':'false');
    autoButton.textContent=autoEnabled?'Auto aan':'Auto';
  }
  function setAudioUi(playing){
    audioButton.classList.toggle('is-playing',Boolean(playing));
    const symbol=audioButton.querySelector('.audio-symbol');
    if(symbol)symbol.textContent=playing?'Ⅱ':'▶';
    if(audioLabel)audioLabel.textContent=playing?'Pauze':'Luister';
  }
  setAutoUi();setAudioUi(false);

  async function getDetail(memory){
    if(!isEditable(memory))return null;
    const id=memory.storyId,token=tokenFor(memory);
    if(detailCache.has(id))return detailCache.get(id);
    const localPath='/api/linked/stories/'+encodeURIComponent(id);
    let response=null;
    try{response=await fetch(localPath,{headers:auth(token),cache:'no-store'});if(response.ok){const data=await response.json();detailCache.set(id,data);return data}}catch(e){}
    response=await fetch(TELL_ORIGIN+'/api/integration/stories/'+encodeURIComponent(id),{headers:auth(token),cache:'no-store'});
    if(!response.ok)throw new Error('detail '+response.status);
    const data=await response.json();detailCache.set(id,data);return data;
  }

  async function getAudioUrl(storyId,token){
    if(audioUrls.has(storyId))return audioUrls.get(storyId);
    const localPath='/api/linked/stories/'+encodeURIComponent(storyId)+'/audio';
    let response=null;
    try{response=await fetch(localPath,{headers:auth(token),cache:'no-store'});if(response.ok){const blob=await response.blob();const url=URL.createObjectURL(blob);audioUrls.set(storyId,url);return url}}catch(e){}
    response=await fetch(TELL_ORIGIN+'/api/integration/stories/'+encodeURIComponent(storyId)+'/audio',{headers:auth(token),cache:'no-store'});
    if(!response.ok)throw new Error('audio '+response.status);
    const blob=await response.blob();const url=URL.createObjectURL(blob);audioUrls.set(storyId,url);return url;
  }

  function stopAudio(reset=true){
    try{audio.pause();if(reset)audio.currentTime=0}catch(e){}
    setAudioUi(false);
  }

  async function playCurrent(fromAuto=false){
    if(!activeStoryId||!activeToken||!activeHasAudio)return;
    try{
      const url=await getAudioUrl(activeStoryId,activeToken);
      if(audio.src!==url){stopAudio(true);audio.src=url}
      await audio.play();
      setAudioUi(true);
    }catch(e){
      setAudioUi(false);
      if(!fromAuto)console.warn('TALERA audio kon niet starten',e);
    }
  }

  audio.addEventListener('ended',()=>stopAudio(true));
  audio.addEventListener('pause',()=>{if(!audio.ended)setAudioUi(false)});

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
      setAutoUi();setAudioUi(false);
      if(activeHasAudio&&autoEnabled&&mayAutoplay)setTimeout(()=>playCurrent(true),60);
    }catch(e){
      if(epoch!==renderEpoch)return;
      audioButton.hidden=true;autoButton.hidden=true;
      console.warn('TALERA audio status kon niet worden bepaald',e);
    }
  }

  runtime.subscribe(memory=>render(memory,true));
  render(runtime.currentMemory(),false);
})();
`;
