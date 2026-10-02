import {timeLabel} from './dates.browser.js';
export function installPresentation({runtime,storage,registerPhoto=()=>{},releasePhoto=()=>{}}){
  const sheet=document.createElement('section');sheet.id='freeReader';sheet.setAttribute('aria-label','Lees je verhaal');
  sheet.innerHTML='<button id="freeReadHandle" aria-label="Verhaal omhoog of omlaag schuiven" aria-expanded="false"><span></span></button><article id="freeReadText" tabindex="0"></article>';
  document.body.append(sheet);
  const article=sheet.querySelector('article'),handle=sheet.querySelector('button'),player=new Audio();player.preload='none';
  const menu=document.getElementById('freeStorageInfo');
  const listen=document.createElement('button');listen.id='freeListenMode';listen.textContent='Luisteren uit';listen.setAttribute('aria-pressed','false');menu?.insertBefore(listen,menu.querySelector('p'));
  const status=document.createElement('p');status.id='freePlaybackStatus';status.setAttribute('role','status');menu?.append(status);
  let listening=false,selected='',generation=0,photoIndex=0,photoUrls=[],audioUrl='',height=38,drag=null;
  const limit=()=>Math.max(38,innerHeight-180);
  function paint(value){height=Math.max(38,Math.min(limit(),value));sheet.style.height=height+'px';handle.setAttribute('aria-expanded',height>40?'true':'false');}
  function clear(){generation++;player.pause();player.removeAttribute('src');if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl='';photoUrls.forEach(url=>{releasePhoto(url);URL.revokeObjectURL(url);});photoUrls=[];}
  async function photo(memory,index){const token=++generation,story=await storage.story(memory.storyId);if(token!==generation||!story?.photos.length)return;photoIndex=(index+story.photos.length)%story.photos.length;const item=await storage.media(story.photos[photoIndex].id);if(token!==generation||!item)return;const url=URL.createObjectURL(item.blob);photoUrls.push(url);registerPhoto(url,item.blob);memory.image=url;runtime.settlePhoto(memory);while(photoUrls.length>2){const old=photoUrls.shift();releasePhoto(old);URL.revokeObjectURL(old);}}
  async function play(memory){player.pause();player.removeAttribute('src');if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl='';if(!listening||!memory.audioId)return;const id=memory.storyId,item=await storage.media(memory.audioId);if(!item||selected!==id||!listening)return;audioUrl=URL.createObjectURL(item.blob);player.src=audioUrl;try{await player.play();status.textContent='';}catch{listening=false;listen.textContent='Luisteren hervatten';listen.setAttribute('aria-pressed','false');status.textContent='Tik op Luisteren hervatten om geluid toe te staan.';}}
  listen.onclick=()=>{listening=!listening;listen.textContent=listening?'Luisteren aan':'Luisteren uit';listen.setAttribute('aria-pressed',String(listening));play(runtime.currentMemory());};
  runtime.subscribe(async memory=>{
    if(!memory)return;const changed=selected!==memory.storyId;if(changed){clear();selected=memory.storyId;photoIndex=0;paint(38);article.scrollTop=0;article.textContent=memory.fullStory||'Bij dit verhaal is nog geen tekst opgeslagen.';photo(memory,0).catch(error=>status.textContent=error.message);play(memory);}
    const story=await storage.story(memory.storyId);if(story&&selected===memory.storyId)document.getElementById('memoryDate').textContent=timeLabel(story);
  });
  const storySurface=document.getElementById('memoryStoryScroll');
  function down(event){if(event.button&&event.button!==0||event.target.closest('button,a,input,textarea,article'))return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,height,vertical:false,handle:sheet.contains(event.target)};if(drag.handle){event.stopImmediatePropagation();event.target.setPointerCapture?.(event.pointerId);}}
  // Capture vertical gestures before the frozen horizontal photo-book motor; it still owns horizontal swipes.
  function move(event){if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!drag.vertical&&Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)*1.2)drag.vertical=true;if(drag.vertical){event.preventDefault();event.stopImmediatePropagation();paint(drag.height-dy);}}
  function up(event){if(!drag||event.pointerId!==drag.id)return;const state=drag;drag=null;if(state.vertical){event.preventDefault();event.stopImmediatePropagation();storySurface?.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:state.id}));return;}if(Math.hypot(event.clientX-state.x,event.clientY-state.y)<8){if(state.handle)paint(height>40?38:limit()*.7);else if(storySurface?.contains(event.target))photo(runtime.currentMemory(),photoIndex+1).catch(error=>status.textContent=error.message);}}
  document.addEventListener('pointerdown',down,true);document.addEventListener('pointermove',move,{capture:true,passive:false});document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',()=>drag=null,true);
  handle.addEventListener('pointerdown',event=>{drag={id:event.pointerId,x:event.clientX,y:event.clientY,height,vertical:false,handle:true};handle.setPointerCapture?.(event.pointerId);event.stopImmediatePropagation();});
  article.addEventListener('pointerdown',event=>event.stopPropagation());
  window.addEventListener('resize',()=>paint(height));window.addEventListener('pagehide',()=>{drag=null;clear();});window.addEventListener('pageshow',event=>{drag=null;if(event.persisted){selected='';runtime.writeMemory(runtime.currentMemory());}});paint(38);
}
