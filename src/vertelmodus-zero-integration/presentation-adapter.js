
/* TALERA PWA standalone local-memory bridge for the approved zero-based narrator.
   RH19 owns timeline position, normal photo gestures and story pane.
   The NEW standalone player owns voice+photo/video sync for narrated memories.
   No previous Story Player functions or timers are imported here. */
(async function(){
 'use strict';
 const store=window.TaleraMemories,runtime=window.__taleraTimelineRuntime;
 if(!store||!runtime)return;
 const stage=document.getElementById('photoStage');
 const placeholder='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#f7f4ef"/></svg>');
 const videoPoster='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#183347"/><text x="320" y="192" fill="white" font-size="36" font-family="sans-serif" text-anchor="middle">▶ Video</text></svg>');
 const map=new Map(),loaded=new Map(),pending=new Map();
 let currentPresentation=null,localVideo=null,activeId=null,serial=0;
 const wanted=new URLSearchParams(location.search).get('memory')||new URLSearchParams(location.search).get('local');
 const isLocalId=id=>typeof id==='string'&&id.startsWith('local-');
 function toMemory(row){
   if(!row||!isLocalId(row.id)||!/^\d{4}-\d{2}-\d{2}$/.test(row.date||''))return null;
   const at=row.date+'T'+(row.time||'12:00:00'),ms=new Date(at).getTime();
   if(!Number.isFinite(ms))return null;
   const title=String(row.title||'Mijn herinnering').slice(0,140);
   return {
     id:'pwa:'+row.id,storyId:row.id,at,ms,story:title,
     fullStory:String(row.text||title).trim()||title,datePrecision:row.datePrecision||'exact',
     seasonLabel:row.seasonLabel||'',image:placeholder,photos:[],_photoIndex:0,
     _taleraLocal:true,_photoLoading:true,_zeroItems:(row.items||[]).filter(x=>['photo','video','audio'].includes(x.kind)),
     _taleraNarrationCues:Array.isArray(row.narrationCues)?row.narrationCues:[],
     _taleraNarrationDurationMs:Math.max(0,Number(row.narrationDurationMs)||0),
     place:row.place||''
   };
 }
 async function hydrate(memory){
   if(!memory||!memory._taleraLocal)return;
   if(loaded.has(memory.id)||pending.has(memory.id))return pending.get(memory.id);
   const promise=(async()=>{
     const urls=[],photos=[],frames=[];
     try{
       for(const item of memory._zeroItems.filter(x=>x.kind!=='audio')){
         let url=null;
         if(item.kind==='photo'){
           try{url=await (store.displayUrl?store.displayUrl(item.key):store.mediaUrl(item.key))}catch(e){}
         }
         if(url)urls.push(url);
         frames.push({key:item.key,kind:item.kind,url});
         photos.push(item.kind==='video'?videoPoster:(url||placeholder));
       }
       memory.photos=photos;
       memory._zeroFrames=frames;
       memory._photoIndex=0;
       memory.image=photos[0]||placeholder;
       memory._photoLoading=false;
       loaded.set(memory.id,urls);
       if(runtime.currentMemory()?.id===memory.id)runtime.writeMemory(memory);
     }catch(error){
       urls.forEach(url=>URL.revokeObjectURL(url));
       memory._photoLoading=false;
       console.warn('TALERA lokaal beeld niet beschikbaar',error);
     }
   })();
   pending.set(memory.id,promise);
   try{await promise}finally{pending.delete(memory.id)}
 }
 function disposePresentation(){
   serial++;
   if(currentPresentation){
     window.removeEventListener('message',currentPresentation.listener);
     currentPresentation.frame.remove();
     currentPresentation=null;
   }
   if(localVideo){localVideo.pause();localVideo.remove();localVideo=null}
   activeId=null;
 }
 function locate(el){
   if(!stage||!el)return;
   const rect=stage.getBoundingClientRect();
   if(rect.width<20||rect.height<20)return;
   el.style.left=Math.round(rect.left)+'px';
   el.style.top=Math.round(rect.top)+'px';
   el.style.width=Math.round(rect.width)+'px';
   el.style.height=Math.round(rect.height)+'px';
 }
 function onResize(){
   if(currentPresentation)locate(currentPresentation.frame);
   if(localVideo)locate(localVideo);
 }
 window.addEventListener('resize',onResize);
 window.addEventListener('scroll',onResize,true);
 async function present(memory){
   if(!stage||!memory)return;
   const id=memory.id;
   if(activeId===id)return;
   disposePresentation();
   activeId=id;
   const count=++serial;
   const frame=document.createElement('iframe');
   frame.className='talera-zero-present-frame';
   frame.title='Herinnering met stem en beelden';
   frame.setAttribute('allow','autoplay');
   frame.src='/vertelmodus-embed?mode=present';
   frame.style.cssText='position:fixed;z-index:410;border:0;background:#183347;box-shadow:0 5px 18px rgba(0,0,0,.15)';
   document.body.append(frame);
   locate(frame);
   const entry={frame,listener:null,initialized:false};
   currentPresentation=entry;
   const send=async()=>{
     if(entry.initialized)return;
     entry.initialized=true;
     try{
       const files=await Promise.all(memory._zeroItems.map(async item=>({
         kind:item.kind,name:item.name||'',
         blob:await store.blob(item.key)
       })));
       if(currentPresentation!==entry||count!==serial)return;
       const items=files.filter(x=>x.kind!=='audio'&&x.blob).map(x=>({
         type:x.kind==='video'?'video':'image',name:x.name,blob:x.blob
       }));
       const voice=files.find(x=>x.kind==='audio'&&x.blob)?.blob||null;
       frame.contentWindow?.postMessage({
         taleraZero:true,type:'INIT',items,voice,
         cues:memory._taleraNarrationCues||[],
         duration:memory._taleraNarrationDurationMs||0
       },location.origin);
     }catch(error){console.warn('TALERA zelfstandige herinnering niet geladen',error)}
   };
   entry.listener=e=>{
     if(e.source!==frame.contentWindow||e.origin!==location.origin||!e.data?.taleraZero)return;
     if(e.data.type==='READY'){void send();return}
     if(e.data.type==='NEXT_STORY'){
       // Only this memory's active frame can advance the timeline; no cue is changed.
       if(currentPresentation!==entry||runtime.currentMemory()?.id!==memory.id)return;
       const memories=runtime.memories().slice().sort((a,b)=>a.ms-b.ms);
       const index=memories.findIndex(m=>m.id===memory.id);
       const next=index<0?null:memories[index+1];
       if(!next)return;
       disposePresentation();
       runtime.setCenter(next.ms);
       runtime.writeMemory(next);
       runtime.draw();
     }
   };
   window.addEventListener('message',entry.listener);
   frame.addEventListener('load',()=>void send(),{once:true});
 }
 async function showSimpleVideo(memory,frameData){
   if(!stage||!frameData)return;
   const id=memory.id+'|'+frameData.key;
   if(localVideo?.dataset.key===id)return;
   if(localVideo){localVideo.pause();localVideo.remove();localVideo=null}
   const element=document.createElement('video');
   element.className='talera-zero-plain-video';
   element.dataset.key=id;
   element.setAttribute('playsinline','');
   element.playsInline=true;
   element.controls=true;
   element.preload='metadata';
   element.style.cssText='position:fixed;z-index:360;object-fit:contain;background:#183347';
   document.body.append(element);
   localVideo=element;
   locate(element);
   try{
     const url=await store.mediaUrl(frameData.key);
     if(localVideo!==element||runtime.currentMemory()?.id!==memory.id){URL.revokeObjectURL(url);return}
     element.src=url;
     const owned=loaded.get(memory.id)||[];
     owned.push(url);loaded.set(memory.id,owned);
   }catch(error){console.warn('TALERA video niet beschikbaar',error)}
 }
 function activate(memory){
   if(!memory||!memory._taleraLocal){disposePresentation();return}
   if(memory._photoLoading){void hydrate(memory);return}
   const hasVoice=memory._zeroItems.some(x=>x.kind==='audio');
   const hasCues=memory._taleraNarrationCues.length>0;
   if(hasVoice&&hasCues){
     void present(memory);
     return;
   }
   if(currentPresentation)disposePresentation();
   const selected=memory._zeroFrames?.[memory._photoIndex||0];
   if(selected?.kind==='video'){void showSimpleVideo(memory,selected);return}
   if(localVideo){localVideo.pause();localVideo.remove();localVideo=null}
 }
 // The RH19 photo gesture picker can signal a plain memory video; it does not control narration.
 window.__taleraLocalFrameChanged=m=>{if(runtime.currentMemory()?.id===m?.id)activate(m)};
 runtime.subscribe(activate);
 try{
   const rows=await store.list();
   const memories=rows.map(toMemory).filter(Boolean);
   for(const m of memories)map.set(m.id,m);
   runtime.registerMemories(memories);
   const selected=isLocalId(wanted)?map.get('pwa:'+wanted):null;
   if(selected){
     await hydrate(selected);
     runtime.setCenter(selected.ms);
     runtime.writeMemory(selected);
     runtime.draw();
   }else{
     const visible=runtime.currentMemory();
     if(visible?._taleraLocal)await hydrate(visible);
   }
 }catch(error){console.warn('TALERA geheugenbibliotheek niet geladen',error)}
 window.addEventListener('pagehide',()=>{
   disposePresentation();
   for(const urls of loaded.values())for(const url of urls)URL.revokeObjectURL(url);
   loaded.clear();
 },{once:true});
})();
