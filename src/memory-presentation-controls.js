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
.talera-audio-consent{position:absolute;z-index:18;left:50%;bottom:148px;transform:translateX(-50%);width:min(318px,calc(100% - 32px));min-height:58px;padding:10px 14px;border:1px solid rgba(255,255,255,.48);border-radius:18px;display:flex;align-items:center;justify-content:center;gap:10px;color:#fff;background:rgba(15,39,71,.82);box-shadow:0 10px 30px rgba(6,18,30,.25);backdrop-filter:blur(14px) saturate(1.12);-webkit-backdrop-filter:blur(14px) saturate(1.12);font-size:13px;font-weight:720;line-height:1.18;text-align:left;text-shadow:0 1px 5px rgba(6,18,30,.28)}
.talera-audio-consent[hidden]{display:none!important}
.talera-audio-consent .consent-speaker{font-size:21px;line-height:1}
.talera-audio-consent .consent-copy{display:flex;flex-direction:column;gap:2px}
.talera-audio-consent small{font-size:10px;font-weight:520;color:rgba(255,255,255,.76)}
.talera-memory-manager{position:fixed;inset:0;z-index:95;display:flex;align-items:flex-end;justify-content:center;padding:12px 10px max(12px,env(safe-area-inset-bottom));background:rgba(6,18,30,.18);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
.talera-memory-manager[hidden]{display:none!important}
.talera-memory-manager-card{width:min(100%,520px);padding:12px;border-radius:28px;background:#fffdfa;color:#0F2747;box-shadow:0 24px 70px rgba(6,18,30,.28)}
.talera-memory-manager-head{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;padding:2px 2px 10px}
.talera-memory-manager-head strong{display:block;text-align:center;font:790 18px/1.1 system-ui}
.talera-memory-manager-close{grid-column:3;width:44px;height:44px;border:0;border-radius:50%;background:rgba(220,234,246,.62);color:#0F2747;font:700 23px/1 system-ui}
.talera-memory-manager-title{margin:0 4px 12px;color:#647181;text-align:center;font:570 13px/1.35 system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.talera-memory-manager-actions{display:grid;gap:9px}
.talera-memory-manager-action{width:100%;min-height:58px;border:0;border-radius:18px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;color:#0F2747;background:#f2f5f7;box-shadow:inset 0 0 0 1px rgba(15,39,71,.07);font:760 15px/1.2 system-ui}
.talera-memory-manager-action span:last-child{font-size:22px;color:rgba(15,39,71,.36)}
.talera-memory-manager-action.delete{color:#8A2F2A;background:rgba(193,79,69,.09);box-shadow:inset 0 0 0 1px rgba(193,79,69,.16)}
.talera-memory-manager-note{margin:11px 5px 2px;color:#778391;text-align:center;font:520 11px/1.35 system-ui}
@media(max-width:430px){.talera-memory-audio{right:12px;bottom:74px;width:46px;min-width:46px;height:46px;padding:3px}.talera-memory-audio .audio-symbol{width:40px;height:40px}.talera-memory-edit{right:10px;top:10px;width:38px;height:38px}.talera-memory-manager-card{border-radius:24px}.talera-memory-manager-action{min-height:56px}}
`;

export const memoryPresentationControlsScript = String.raw`
(()=>{
  const TELL_ORIGIN='https://xxory-test.mark-a39.workers.dev';
  const runtime=window.__taleraTimelineRuntime;
  const memorySpace=document.querySelector('.memory-space');
  const storyScroll=document.getElementById('memoryStoryScroll');
  if(!runtime||!memorySpace)return;

  const consent=document.createElement('button');
  consent.type='button';
  consent.className='talera-audio-consent';
  consent.setAttribute('aria-label','Automatisch luisteren inschakelen');
  consent.innerHTML='<span class="consent-speaker" aria-hidden="true">◖)))</span><span class="consent-copy">Automatisch luisteren inschakelen<small>Tik één keer om geluid toe te staan</small></span>';
  memorySpace.appendChild(consent);

  const oldTell=document.querySelector('.tell');
  if(oldTell){
    const fresh=oldTell.cloneNode(true);oldTell.replaceWith(fresh);
    fresh.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeManager();stopAudio(true);location.href=TELL_ORIGIN+'/?new=1&at='+encodeURIComponent(new Date(runtime.centerMs()).toISOString())},true);
  }

  const tools=document.createElement('div');
  tools.className='talera-memory-tools';
  tools.innerHTML='<button class="talera-memory-tool talera-memory-audio" type="button" aria-label="Luister naar het gesproken verhaal" hidden><span class="audio-symbol">▶</span><span class="audio-label">Luister</span></button><button class="talera-memory-tool talera-memory-edit" type="button" aria-label="Herinnering beheren" hidden><span class="edit-symbol">✎</span></button>';
  memorySpace.appendChild(tools);

  const manager=document.createElement('div');
  manager.className='talera-memory-manager';manager.hidden=true;
  manager.innerHTML='<section class="talera-memory-manager-card" role="dialog" aria-modal="true" aria-label="Herinnering beheren"><div class="talera-memory-manager-head"><strong>Herinnering beheren</strong><button type="button" class="talera-memory-manager-close" aria-label="Sluiten">×</button></div><div class="talera-memory-manager-title"></div><div class="talera-memory-manager-actions"><button type="button" class="talera-memory-manager-action edit"><span>Herinnering bewerken</span><span>›</span></button><button type="button" class="talera-memory-manager-action photos"><span>Foto’s beheren</span><span>›</span></button><button type="button" class="talera-memory-manager-action delete"><span>Herinnering verwijderen</span><span>›</span></button></div><div class="talera-memory-manager-note">Verwijderen gebruikt een korte ongedaan-makenperiode en geen browsermelding.</div></section>';
  document.body.appendChild(manager);

  const audioButton=tools.querySelector('.talera-memory-audio');
  const audioLabel=tools.querySelector('.audio-label');
  const editButton=tools.querySelector('.talera-memory-edit');
  const managerTitle=manager.querySelector('.talera-memory-manager-title');
  const audio=new Audio();audio.preload='auto';audio.setAttribute('playsinline','');
  const audioUrls=new Map();
  const AUTO_START_DELAY=360;
  let activeStoryId='',activeToken='',activeHasAudio=false,loading=false,loadFailed=false,renderEpoch=0;
  let autoStartTimer=null,autoStableSince=0,autoBlocked=false,manualSuppressed=false,audioEnabled=false;

  function tokenFor(m){return m&&m._manageToken||''}
  function usable(m){return Boolean(m&&m._taleraLive&&m.storyId&&tokenFor(m))}
  function auth(token){return {authorization:'Bearer '+token}}
  function showAudio(v){audioButton.hidden=!v}
  function editUrl(memory,mode=''){
    const query=new URLSearchParams();query.set('edit',memory.storyId);if(mode)query.set('manage',mode);
    return TELL_ORIGIN+'/?'+query.toString()+'#token='+encodeURIComponent(tokenFor(memory));
  }
  function notifyOverlay(open){document.dispatchEvent(new CustomEvent('talera:overlay-change',{detail:{open:Boolean(open),source:'memory-manager'}}))}
  function closeManager(){if(manager.hidden)return;manager.hidden=true;notifyOverlay(false)}
  function openManager(){
    const memory=runtime.currentMemory();if(!usable(memory))return;
    stopAudio(false);manualSuppressed=true;managerTitle.textContent=memory.title||memory.story||'Deze herinnering';manager.hidden=false;notifyOverlay(true);
  }
  function navigateManage(mode){const memory=runtime.currentMemory();if(!usable(memory))return;closeManager();stopAudio(true);location.href=editUrl(memory,mode)}

  manager.querySelector('.talera-memory-manager-close').addEventListener('click',closeManager);
  manager.addEventListener('click',e=>{if(e.target===manager)closeManager()});
  manager.querySelector('.edit').addEventListener('click',()=>navigateManage(''));
  manager.querySelector('.photos').addEventListener('click',()=>navigateManage('photos'));
  manager.querySelector('.delete').addEventListener('click',()=>navigateManage('delete-now'));

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
    if(autoBlocked){if(symbol)symbol.textContent='▶';audioLabel.textContent='Tik om te luisteren';audioButton.setAttribute('aria-label','Tik om het gesproken verhaal te starten');return}
    audioLabel.textContent=(audio.currentTime>0&&!audio.ended)?'Verder':'Luister';
    audioButton.setAttribute('aria-label',(audio.currentTime>0&&!audio.ended)?'Verder luisteren naar het gesproken verhaal':'Luister naar het gesproken verhaal');
  }
  function cancelAutoStart(){if(autoStartTimer){clearTimeout(autoStartTimer);autoStartTimer=null}autoStableSince=0}
  function stopAudio(reset=true){cancelAutoStart();loading=false;loadFailed=false;autoBlocked=false;try{audio.pause();if(reset){audio.currentTime=0;audio.removeAttribute('src');audio.load();setProgress()}}catch(e){}exitListeningMode();setUi()}

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
  async function playNow(fromAuto=false){
    if(!activeStoryId||!activeToken||!activeHasAudio||loading||loadFailed||!audio.src)return false;
    const wasListening=memorySpace.classList.contains('is-listening');
    if(!wasListening)enterListeningMode();
    try{
      const p=audio.play();if(p&&typeof p.catch==='function')await p;
      autoBlocked=false;loadFailed=false;setUi();return true;
    }catch(e){
      if(fromAuto&&e&&e.name==='NotAllowedError'){
        autoBlocked=true;audioEnabled=false;loadFailed=false;consent.hidden=false;
      }else{
        loadFailed=true;
        console.warn('TALERA audio kon niet starten',e);
      }
      if(!wasListening)exitListeningMode();setUi();return false;
    }
  }

  function scheduleAutoStart(epoch=renderEpoch){
    cancelAutoStart();
    if(epoch!==renderEpoch||!audioEnabled||manualSuppressed||!activeHasAudio||loading||loadFailed||!audio.src||!audio.paused||audio.currentTime>0)return;
    const probe=()=>{
      autoStartTimer=null;
      if(epoch!==renderEpoch||!audioEnabled||manualSuppressed||!activeHasAudio||loading||loadFailed||!audio.src||!audio.paused||audio.currentTime>0)return;
      if(runtime.isMoving&&runtime.isMoving()){
        autoStableSince=0;
        autoStartTimer=setTimeout(probe,90);
        return;
      }
      const now=performance.now();
      if(!autoStableSince)autoStableSince=now;
      const remaining=AUTO_START_DELAY-(now-autoStableSince);
      if(remaining>0){autoStartTimer=setTimeout(probe,Math.min(remaining,90));return}
      autoStableSince=0;
      playNow(true);
    };
    autoStartTimer=setTimeout(probe,90);
  }

  if(storyScroll){
    storyScroll.addEventListener('scroll',()=>{
      if(!memorySpace.classList.contains('is-listening'))return;
      memorySpace.classList.toggle('is-reading-during-listen',storyScroll.scrollTop>28);
    },{passive:true});
  }

  audio.addEventListener('play',()=>{audioEnabled=true;autoBlocked=false;consent.hidden=true;enterListeningMode();setUi()});
  audio.addEventListener('pause',setUi);
  audio.addEventListener('timeupdate',()=>{setProgress();setUi()});
  audio.addEventListener('loadedmetadata',setProgress);
  audio.addEventListener('durationchange',setProgress);
  audio.addEventListener('ended',()=>{try{audio.currentTime=0}catch(e){}setProgress();setUi()});
  audio.addEventListener('error',()=>{loadFailed=true;exitListeningMode();setUi()});
  document.addEventListener('pointerdown',()=>{cancelAutoStart()},true);
  document.addEventListener('pointerup',()=>{if(audio.paused&&audio.currentTime===0&&!manualSuppressed)scheduleAutoStart(renderEpoch)},true);
  document.addEventListener('pointercancel',cancelAutoStart,true);
  document.addEventListener('talera:overlay-change',e=>{
    if(e.detail&&e.detail.source==='memory-manager')return;
    if(e.detail&&e.detail.open){manualSuppressed=true;stopAudio(false);return}
    manualSuppressed=false;scheduleAutoStart(renderEpoch);
  });

  consent.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();cancelAutoStart();
    audioEnabled=true;autoBlocked=false;manualSuppressed=false;consent.hidden=true;
    if(activeHasAudio&&!loading&&!loadFailed&&audio.src){playNow(false);return}
    try{
      const AudioContextClass=window.AudioContext||window.webkitAudioContext;
      if(AudioContextClass){
        const context=new AudioContextClass();const buffer=context.createBuffer(1,1,22050);const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.start(0);if(context.state==='suspended')context.resume();setTimeout(()=>{try{context.close()}catch(err){}},180);
      }
    }catch(err){}
  });

  audioButton.addEventListener('click',async e=>{
    e.preventDefault();e.stopPropagation();cancelAutoStart();
    if(loading)return;
    if(!audio.paused){manualSuppressed=true;audio.pause();return}
    manualSuppressed=false;autoBlocked=false;audioEnabled=true;consent.hidden=true;
    if(loadFailed||!audio.src){const ok=await prepare(activeStoryId,activeToken,renderEpoch,true);if(ok)playNow(false);return}
    playNow(false);
  });
  editButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openManager()});

  async function render(memory){
    closeManager();
    const epoch=++renderEpoch;stopAudio(true);manualSuppressed=false;autoBlocked=false;const ok=usable(memory);editButton.hidden=!ok;activeStoryId=ok?memory.storyId:'';activeToken=ok?tokenFor(memory):'';activeHasAudio=false;showAudio(false);setUi();if(!ok)return;
    const hinted=Boolean(memory._hasAudio||memory._audioMimeType||Number(memory._durationSeconds)>0);
    loading=true;showAudio(true);setUi();
    const detail=await getDetail(activeStoryId,activeToken);if(epoch!==renderEpoch)return;
    const expected=Boolean(detail&&(detail.hasAudio||detail.audioMimeType||Number(detail.audioSizeBytes)>0||Number(detail.durationSeconds)>0))||hinted;
    activeHasAudio=expected;memory._hasAudio=expected;
    try{
      const url=await getAudioUrl(activeStoryId,activeToken,false);if(epoch!==renderEpoch)return;
      activeHasAudio=true;memory._hasAudio=true;showAudio(true);audio.src=url;audio.currentTime=0;audio.load();loading=false;loadFailed=false;setProgress();setUi();scheduleAutoStart(epoch);return;
    }catch(e){}
    if(epoch!==renderEpoch)return;
    loading=false;activeHasAudio=expected;memory._hasAudio=expected;
    if(expected){showAudio(true);loadFailed=true;setUi()}else showAudio(false);
  }

  runtime.subscribe(memory=>render(memory));render(runtime.currentMemory());
})();
`;