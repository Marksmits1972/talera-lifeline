import {createPhotoCache} from './photo-cache.js';
import {videoNarration} from './video.browser.js';
import {timeLabel} from './dates.browser.js';
export function installPresentation({runtime,storage,registerPhoto=()=>{},releasePhoto=()=>{},stories=[],getMemories=()=>[]}){
  const sheet=document.createElement('section');sheet.id='freeReader';sheet.setAttribute('aria-label','Lees je verhaal');
  sheet.innerHTML='<button id="freeReadHandle" aria-label="Verhaal omhoog of omlaag schuiven" aria-expanded="false"><span></span></button><article id="freeReadText" tabindex="0"></article>';
  const wash=document.createElement('div');wash.id='freeReadWash';wash.setAttribute('aria-hidden','true');document.body.append(wash,sheet);
  const article=sheet.querySelector('article'),handle=sheet.querySelector('button'),player=new Audio();player.preload='none';
  const menu=document.getElementById('freeStorageInfo');
  const listen=document.createElement('button');listen.id='freeListenMode';listen.textContent='Luisteren uit';listen.setAttribute('aria-pressed','false');menu?.insertBefore(listen,menu.querySelector('p'));
  const status=document.createElement('p');status.id='freePlaybackStatus';status.setAttribute('role','status');menu?.append(status);
  const video=document.createElement('video');video.id='freePresentationVideo';video.playsInline=true;video.preload='metadata';const videoPlay=document.createElement('button');videoPlay.id='freePresentationVideoPlay';videoPlay.textContent='▶';videoPlay.setAttribute('aria-label','Video afspelen');videoPlay.hidden=true;video.hidden=true;document.querySelector('.app').append(video,videoPlay);const videoStyle=document.createElement('style');videoStyle.textContent='#freePresentationVideo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;z-index:1}#freePresentationVideoPlay{position:absolute;z-index:15;left:50%;top:45%;transform:translate(-50%,-50%);width:58px;height:58px;border-radius:50%;background:#173851d9;color:white;border:1px solid white;font-size:25px}#freePresentationVideo[hidden],#freePresentationVideoPlay[hidden]{display:none}';document.head.append(videoStyle);let videoUrl='',videoLink=null;
  async function startVideo(){if(editing)return;videoLink?.start();try{await video.play();videoPlay.hidden=true;}catch{videoPlay.hidden=false;videoLink?.end();}}videoPlay.onclick=startVideo;video.onended=()=>{videoPlay.hidden=false;if(listening&&player.src&&player.paused)player.play().catch(()=>{});};
  function clearVideo(){videoLink?.release();videoLink=null;video.pause();video.removeAttribute('src');video.load();video.hidden=true;videoPlay.hidden=true;if(videoUrl)URL.revokeObjectURL(videoUrl);videoUrl='';}
  let listening=false,selected='',revision,editing=false,resumeAudio=false,resumeVideo=false,generation=0,photoIndex=0,audioUrl='',height=38,drag=null;
  const storyCache=new Map(stories.map(story=>[story.id,{revision:undefined,story}]));let loadedStory=null;
  const placeholder='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const photos=createPhotoCache({storage,keep:()=>loadedStory?.photos?.[photoIndex]?.id,register:registerPhoto,release:url=>{releasePhoto(url);for(const memory of getMemories())if(memory.image===url)memory.image=placeholder;}});
  function readStory(memory){
    const cached=storyCache.get(memory.storyId);if(cached&&cached.revision===memory.editRevision)return Promise.resolve(cached.story);
    const request=storage.story(memory.storyId);storyCache.set(memory.storyId,{revision:memory.editRevision,story:request});request.catch(()=>{if(storyCache.get(memory.storyId)?.story===request)storyCache.delete(memory.storyId);});return request;
  }
  async function warm(memory){
    const list=getMemories(),position=list.findIndex(item=>item.storyId===memory.storyId);
    const adjacent=position<0?[]:[list[position-1],list[position+1]].filter(Boolean);
    await Promise.all([...(loadedStory?.photos.length>1?[photos.get(loadedStory.photos[(photoIndex+1)%loadedStory.photos.length].id)]:[]),...adjacent.map(async neighbour=>{const revision=neighbour.editRevision,story=await readStory(neighbour);if(!story?.photos.length)return;const first=await photos.get(story.photos[0].id);if(first&&selected!==neighbour.storyId&&neighbour.editRevision===revision)neighbour.image=first.url;})]);
  }
  const closed=()=>38+(parseFloat(window.getComputedStyle(handle).paddingBottom)||0);
  const limit=()=>Math.max(closed(),window.visualViewport?.height||innerHeight);
  function paint(value){height=Math.max(closed(),Math.min(limit(),value));sheet.style.height=height+'px';const progress=(height-closed())/Math.max(1,limit()-closed());wash.style.opacity=String(Math.pow(progress,.88));document.querySelector('.app')?.toggleAttribute('inert',progress>=.995);handle.setAttribute('aria-expanded',height>closed()+2?'true':'false');}
  function clear(){generation++;videoLink?.cancel();player.pause();clearVideo();player.removeAttribute('src');if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl='';loadedStory=null;}
  async function photo(memory,index){
    // Record intent before either storage or decoding awaits: every tap counts.
    photoIndex=index;clearVideo();const token=++generation;
    const story=loadedStory?.id===memory.storyId?loadedStory:await readStory(memory);
    if(token!==generation||!story)return;loadedStory=story;
    document.documentElement.classList.toggle('free-no-photo',!story.photos.length);
    if(!story.photos.length){photoIndex=0;memory.image=placeholder;runtime.settlePhoto(memory);return;}
    photoIndex=((index%story.photos.length)+story.photos.length)%story.photos.length;
    const cached=await photos.get(story.photos[photoIndex].id);
    if(token!==generation||!cached)return;
    const {item,url}=cached;memory.image=url;runtime.settlePhoto(memory);
    if(item.kind==='video'){videoUrl=URL.createObjectURL(item.blob);video.src=videoUrl;video.muted=!listening;video.poster=url;video.hidden=false;videoLink=videoNarration(video,player,()=>listening);await startVideo();}
    if(token===generation)warm(memory).catch(()=>{});
  }
  async function play(memory,index=0){player.pause();player.removeAttribute('src');if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl='';if(!listening||editing||![memory.audioId,...(memory.audioIds||[])].filter(Boolean).length)return;const recordings=[...new Set([memory.audioId,...(memory.audioIds||[])].filter(Boolean))];if(index>=recordings.length)return;const id=memory.storyId,item=await storage.media(recordings[index]);if(!item||selected!==id||!listening)return;audioUrl=URL.createObjectURL(item.blob);player.src=audioUrl;player.onended=()=>{if(selected===id)play(memory,index+1);};if(!video.hidden&&!video.ended){videoLink?.start();return;}try{await player.play();status.textContent='';}catch{listening=false;listen.textContent='Luisteren hervatten';listen.setAttribute('aria-pressed','false');status.textContent='Tik op Luisteren hervatten om geluid toe te staan.';}}
  listen.onclick=()=>{listening=!listening;video.muted=!listening;listen.textContent=listening?'Luisteren aan':'Luisteren uit';listen.setAttribute('aria-pressed',String(listening));play(runtime.currentMemory());};
  runtime.subscribe(async memory=>{
    if(!memory)return;const switched=selected!==memory.storyId,changed=switched||revision!==memory.editRevision;if(changed){const retained=switched?0:photoIndex;clear();selected=memory.storyId;revision=memory.editRevision;photoIndex=retained;if(switched){paint(closed());article.scrollTop=0;}article.textContent=memory.fullStory||'Bij dit verhaal is nog geen tekst opgeslagen.';photo(memory,photoIndex).catch(error=>status.textContent=error.message);play(memory);}
    if(!changed)return;const story=await readStory(memory);if(story&&selected===memory.storyId)document.getElementById('memoryDate').textContent=timeLabel(story);
  });
  window.addEventListener('talera-editor-open',()=>{editing=true;resumeAudio=!player.paused;resumeVideo=!video.paused;player.pause();video.pause();});
  window.addEventListener('talera-editor-close',()=>{editing=false;if(!video.hidden&&resumeVideo)startVideo();if(listening&&video.hidden){if(player.src&&resumeAudio)player.play().catch(()=>{});else if(!player.src)play(runtime.currentMemory());}});
  const storySurface=document.getElementById('memoryStoryScroll');
  function down(event){if(editing||event.target.closest('dialog'))return;if(event.button&&event.button!==0||event.target.closest('button,a,input,textarea,#freeReadText,.timeline'))return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,height,vertical:false,handle:sheet.contains(event.target)};if(drag.handle){event.stopImmediatePropagation();event.target.setPointerCapture?.(event.pointerId);}}
  // Capture vertical gestures before the frozen horizontal photo-book motor; it still owns horizontal swipes.
  function move(event){if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!drag.vertical&&Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)*1.2)drag.vertical=true;if(drag.vertical){event.preventDefault();event.stopImmediatePropagation();paint(drag.height-dy);}}
  function up(event){if(!drag||event.pointerId!==drag.id)return;const state=drag;drag=null;if(state.vertical){event.preventDefault();event.stopImmediatePropagation();storySurface?.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:state.id}));return;}if(Math.hypot(event.clientX-state.x,event.clientY-state.y)<8){if(state.handle)paint(height>closed()+2?closed():limit());else if(storySurface?.contains(event.target))photo(runtime.currentMemory(),photoIndex+1).catch(error=>status.textContent=error.message);}}
  document.addEventListener('pointerdown',down,true);document.addEventListener('pointermove',move,{capture:true,passive:false});document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',()=>drag=null,true);
  handle.addEventListener('pointerdown',event=>{drag={id:event.pointerId,x:event.clientX,y:event.clientY,height,vertical:false,handle:true};handle.setPointerCapture?.(event.pointerId);event.stopImmediatePropagation();});
  handle.addEventListener('click',event=>{if(event.detail===0)paint(height>closed()+2?closed():limit());});
  window.visualViewport?.addEventListener('resize',()=>paint(height));
  article.addEventListener('pointerdown',event=>event.stopPropagation());
  window.addEventListener('resize',()=>paint(height));window.addEventListener('pagehide',event=>{drag=null;clear();if(!event.persisted)photos.close();});window.addEventListener('pageshow',event=>{drag=null;if(event.persisted){selected='';runtime.writeMemory(runtime.currentMemory());}});paint(38);
}
