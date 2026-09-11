export const liveMemoryIntegrationStyle = String.raw`
.talera-photo-dots{position:absolute;z-index:7;left:50%;top:calc(100% - 23px);transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:5px;min-height:18px;padding:4px 9px;border-radius:999px;background:rgba(15,39,71,.07);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;pointer-events:none;transition:opacity .2s ease}
.talera-photo-dots.show{opacity:1}
.talera-photo-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.58);box-shadow:0 1px 4px rgba(15,39,71,.22);transition:transform .18s ease,background .18s ease,opacity .18s ease;opacity:.8}
.talera-photo-dot.active{background:#E7A98B;transform:scale(1.42);opacity:1}
.talera-live-badge{position:absolute;z-index:7;right:14px;top:calc(100% - 25px);font-size:9px;font-weight:750;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.8);text-shadow:0 1px 6px rgba(15,39,71,.35);pointer-events:none;opacity:0;transition:opacity .2s ease}
.talera-live-badge.show{opacity:1}
`;

export const liveMemoryIntegrationScript = String.raw`
(()=>{
  const TELL_ORIGIN='https://xxory-test.mark-a39.workers.dev';
  const CREDS_KEY='talera-linked-memory-credentials-v1';
  const AUTO_START_MS=2000;
  const AUTO_STEP_MS=2400;
  const RECENT_LANDING_MS=12*60*60*1000;
  const timeline=document.querySelector('.timeline');
  const storySurface=document.getElementById('memoryStoryScroll');
  const tellButton=document.querySelector('.tell');
  if(!timeline||typeof MEMORIES==='undefined')return;

  let autoStartTimer=0,autoInterval=0,lastWrittenMemoryId=activeMemoryId;
  let landingStoryId='';

  const dots=document.createElement('div');
  dots.className='talera-photo-dots';
  dots.setAttribute('aria-hidden','true');
  timeline.appendChild(dots);
  const liveBadge=document.createElement('div');
  liveBadge.className='talera-live-badge';
  liveBadge.textContent='mijn herinnering';
  timeline.appendChild(liveBadge);

  function loadCredentials(){
    try{
      const raw=JSON.parse(localStorage.getItem(CREDS_KEY)||'{}');
      return raw&&typeof raw==='object'?raw:{};
    }catch(e){return {}}
  }
  function saveCredentials(creds){try{localStorage.setItem(CREDS_KEY,JSON.stringify(creds))}catch(e){}}
  function acceptHandoff(){
    const h=new URLSearchParams(String(location.hash||'').replace(/^#/,''));
    const story=h.get('story')||'';
    const token=h.get('token')||'';
    if(story&&token){
      const creds=loadCredentials();
      creds[story]={token:token,savedAt:Date.now()};
      saveCredentials(creds);
      landingStoryId=story;
      try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
    }
  }
  acceptHandoff();

  function authHeaders(token){return {'authorization':'Bearer '+token}}
  async function fetchStory(storyId,token){
    const res=await fetch('/api/linked/stories/'+encodeURIComponent(storyId),{headers:authHeaders(token),cache:'no-store'});
    if(!res.ok)throw new Error('story '+res.status);
    return res.json();
  }
  async function mediaObjectUrl(item,token,storyId){
    const res=await fetch('/api/linked/stories/'+encodeURIComponent(storyId)+'/media/'+encodeURIComponent(item.id),{headers:authHeaders(token),cache:'no-store'});
    if(!res.ok)throw new Error('media '+res.status);
    const blob=await res.blob();
    return URL.createObjectURL(blob);
  }
  function placeholderImage(){
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#DCEAF6"/><stop offset=".58" stop-color="#F7F4EF"/><stop offset="1" stop-color="#E7A98B" stop-opacity=".42"/></linearGradient></defs><rect width="1200" height="1600" fill="url(#g)"/><circle cx="880" cy="410" r="280" fill="#5B8FB9" opacity=".14"/><circle cx="260" cy="1180" r="360" fill="#0F2747" opacity=".07"/></svg>');
  }
  function firstSentence(text){
    const clean=String(text||'').replace(/\s+/g,' ').trim();
    if(!clean)return 'Mijn herinnering';
    const hit=clean.match(/^(.{1,145}?)(?:[.!?](?:\s|$)|$)/);
    return (hit&&hit[1]?hit[1]:clean.slice(0,145)).trim();
  }
  function toTimelineMemory(detail,photoUrls,token){
    const rawMs=Date.parse(detail.eventAt||detail.createdAt||'');
    const ms=Math.max(LIFE_START,Math.min(LIFE_END,Number.isFinite(rawMs)?rawMs:LIFE_END));
    const text=String(detail.textContent||'').trim();
    const headline=String(detail.title||'').trim()||firstSentence(text);
    const full=headline+(text&&text!==headline?'\n\n'+text:'');
    const photos=photoUrls.length?photoUrls:[placeholderImage()];
    return {
      id:'live:'+detail.storyId,
      storyId:detail.storyId,
      at:new Date(ms).toISOString(),
      ms:ms,
      story:headline,
      fullStory:full||headline,
      image:photos[0],
      photos:photos,
      _photoIndex:0,
      _taleraLive:true,
      _manageToken:token,
      title:detail.title||'',
      eventTime:detail.eventTime||'',
      place:detail.place||'',
      people:detail.people||''
    };
  }
  function registerMemory(memory){
    const existing=MEMORIES.findIndex(m=>m.storyId===memory.storyId);
    if(existing>=0){
      const old=MEMORIES[existing];
      memory._photoIndex=old._photoIndex||0;
      if(memory.photos[memory._photoIndex])memory.image=memory.photos[memory._photoIndex];
      MEMORIES.splice(existing,1,memory);
    }else{
      MEMORIES.push(memory);
      const offset=(memory.ms-LIFE_START)/MS_DAY;
      EVENT_OFFSETS.push(offset);
      const day=Math.floor(offset);
      if(day>=0&&day<TOTAL_DAYS)dayCounts[day]++;
    }
    MEMORIES.sort((a,b)=>a.ms-b.ms);
  }
  async function hydrateCredential(storyId,entry){
    const token=entry&&entry.token;
    if(!token)return null;
    const detail=await fetchStory(storyId,token);
    const items=(detail.media||[]).filter(m=>m.mediaType==='image').slice(0,12);
    const urls=[];
    for(const item of items){
      try{urls.push(await mediaObjectUrl(item,token,storyId))}catch(e){}
    }
    const memory=toTimelineMemory(detail,urls,token);
    registerMemory(memory);
    return memory;
  }

  function currentMemory(){return MEMORIES.find(m=>m.id===activeMemoryId)||nearestMemory(centerMs)}
  function clearAuto(){clearTimeout(autoStartTimer);clearInterval(autoInterval);autoStartTimer=0;autoInterval=0}
  function renderDots(memory){
    const photos=memory&&Array.isArray(memory.photos)?memory.photos:[];
    dots.innerHTML='';
    if(photos.length<=1){dots.classList.remove('show')}else{
      photos.forEach((_,i)=>{const d=document.createElement('span');d.className='talera-photo-dot'+(i===(memory._photoIndex||0)?' active':'');dots.appendChild(d)});
      dots.classList.add('show');
    }
    liveBadge.classList.toggle('show',Boolean(memory&&memory._taleraLive));
  }
  function showPhoto(memory,index,manual=false){
    if(!memory||!Array.isArray(memory.photos)||memory.photos.length<=1)return;
    const count=memory.photos.length;
    memory._photoIndex=((index%count)+count)%count;
    memory.image=memory.photos[memory._photoIndex];
    settlePhoto(memory);
    renderDots(memory);
    if(manual)scheduleAuto(memory);
  }
  function scheduleAuto(memory){
    clearAuto();
    if(!memory||!Array.isArray(memory.photos)||memory.photos.length<=1)return;
    autoStartTimer=setTimeout(()=>{
      showPhoto(memory,(memory._photoIndex||0)+1,false);
      autoInterval=setInterval(()=>{
        if(activeMemoryId!==memory.id||userIsMoving){clearAuto();return}
        showPhoto(memory,(memory._photoIndex||0)+1,false);
      },AUTO_STEP_MS);
    },AUTO_START_MS);
  }

  const originalWriteMemory=writeMemory;
  writeMemory=function(memory){
    const changed=!memory||memory.id!==lastWrittenMemoryId;
    if(changed&&memory&&Array.isArray(memory.photos)&&memory.photos.length){memory._photoIndex=0;memory.image=memory.photos[0]}
    originalWriteMemory(memory);
    lastWrittenMemoryId=memory&&memory.id;
    renderDots(memory);
    scheduleAuto(memory);
  };

  surface.addEventListener('pointerdown',clearAuto,{passive:true});
  surface.addEventListener('pointerup',()=>{setTimeout(()=>scheduleAuto(currentMemory()),0)},{passive:true});
  surface.addEventListener('pointercancel',()=>{setTimeout(()=>scheduleAuto(currentMemory()),0)},{passive:true});

  if(storySurface){
    storySurface.addEventListener('pointerdown',clearAuto,{passive:true,capture:true});
    storySurface.addEventListener('pointerup',()=>{setTimeout(()=>scheduleAuto(currentMemory()),0)},{passive:true,capture:true});
    storySurface.addEventListener('pointercancel',()=>{setTimeout(()=>scheduleAuto(currentMemory()),0)},{passive:true,capture:true});
    storySurface.addEventListener('click',e=>{
      if(e.defaultPrevented)return;
      if(e.target.closest('button,nav,.timeline'))return;
      if(typeof e.clientY==='number'&&e.clientY>window.innerHeight*.74)return;
      const memory=currentMemory();
      if(!memory||!Array.isArray(memory.photos)||memory.photos.length<=1)return;
      e.preventDefault();e.stopPropagation();
      showPhoto(memory,(memory._photoIndex||0)+1,true);
    },true);
  }

  if(tellButton){
    tellButton.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();clearAuto();
      const memory=currentMemory();
      if(memory&&memory._taleraLive&&memory.storyId&&memory._manageToken){
        location.href=TELL_ORIGIN+'/?edit='+encodeURIComponent(memory.storyId)+'#token='+encodeURIComponent(memory._manageToken);
      }else{
        const at=memory&&memory.ms?new Date(memory.ms).toISOString():new Date(centerMs).toISOString();
        location.href=TELL_ORIGIN+'/?at='+encodeURIComponent(at);
      }
    },true);
  }

  async function bootLinkedMemories(){
    const creds=loadCredentials();
    const ids=Object.keys(creds).sort((a,b)=>(creds[a].savedAt||0)-(creds[b].savedAt||0));

    if(!landingStoryId&&ids.length){
      const newestId=ids[ids.length-1];
      const newest=creds[newestId];
      if(newest&&Date.now()-(Number(newest.savedAt)||0)<=RECENT_LANDING_MS)landingStoryId=newestId;
    }

    let landing=null;
    for(const id of ids){
      try{
        const memory=await hydrateCredential(id,creds[id]);
        if(memory&&id===landingStoryId)landing=memory;
      }catch(e){
        console.warn('TALERA linked memory kon niet laden',id,e);
      }
    }

    if(landing){
      centerMs=landing.ms;
      keepCenterValid();
      writeMemory(landing);
      draw();
      timeline.classList.add('is-timeline-afterglow','is-marker-afterglow');
    }else{
      const memory=currentMemory();
      renderDots(memory);
      scheduleAuto(memory);
      draw();
    }
  }
  bootLinkedMemories();
})();
`;
