
/* Runs inside the approved standalone Vertelmodus closure; no old player globals. */
(function installPwaBridge(){
 if(window.parent===window)return;
 const origin=location.origin;
 const presenter=new URLSearchParams(location.search).get('mode')==='present';
 if(presenter)document.body.classList.add('present');
 const emit=(type,fields={})=>window.parent.postMessage({taleraZero:true,type,...fields},origin);
 const originalMode=mode;
 mode=function(next){originalMode(next);emit('MODE',{mode:next})};
 let owned=[];
 function clearOwned(){for(const url of owned)URL.revokeObjectURL(url);owned=[]}
 function load(data){
   resetTail();
   voice.pause();
   dispose();
   clearOwned();
   state.items=[];
   state.index=0;
   state.cues=Array.isArray(data.cues)?data.cues.filter(c=>Number.isFinite(+c.t)&&Number.isInteger(c.index)&&c.index>=0).map(c=>({...c,t:Math.max(0,Math.round(Number(c.t)))})):[];
   state.duration=Math.max(0,Number(data.duration)||0);
   state.lastCue=null;
   for(const item of data.items||[]){
     const blob=item.blob;
     const itemUrl=blob?URL.createObjectURL(blob):item.url;
     if(!itemUrl)continue;
     if(blob)owned.push(itemUrl);
     state.items.push({url:itemUrl,type:item.type==='video'?'video':'image',name:item.name||''});
   }
   if(state.items.length)show(0);
   else {
     $('count').textContent='Geen beelden';
     $('prev').disabled=$('next').disabled=true;
   }
   if(state.voiceUrl)URL.revokeObjectURL(state.voiceUrl);
   state.voiceUrl=null;voice.removeAttribute('src');
   if(data.voice){
     state.voiceUrl=URL.createObjectURL(data.voice);
     voice.src=state.voiceUrl;
     mode('ready');
     msg(presenter?'Herinnering terugkijken':'Luister je opname terug');
   }else{
     mode('idle');
     msg('Klaar om in te spreken');
   }
   if(presenter){
     $('record').hidden=true;
     $('reset').hidden=true;
     $('play').textContent='▶ Afspelen';
   }
   $('chosen').textContent=state.items.length+' bestaande beelden';
   diagnostic();
   emit('INITIALIZED',{itemCount:state.items.length,hasVoice:Boolean(data.voice)});
 }
 window.addEventListener('message',event=>{
   if(event.origin!==origin||!event.data?.taleraZero)return;
   if(event.data.type==='INIT')load(event.data);
   if(event.data.type==='PAUSE_PLAYER'){
     voice.pause();if(state.media?.pause)state.media.pause();
     if(state.mode==='playing')mode('playPaused');
   }
 });
 window.addEventListener('pagehide',clearOwned,{once:true});
 // The original standalone recorder remains authoritative; the PWA only persists its result.
 window.__taleraZeroEmitSaved=blob=>{
   emit('SAVE',{audio:blob,cues:state.cues.map(c=>({...c})),duration:state.duration});
 };

 // I2 additional viewing pass: deliberately leaves recorder, clock and cue logic untouched.
 const tail={active:false,order:[],position:-1,token:0};
 const view=$('view'),badge=document.createElement('div'),action=document.createElement('button');
 badge.id='taleraTailBadge';badge.hidden=true;
 action.id='taleraTailAction';action.type='button';action.textContent='▶ Video met geluid';action.hidden=true;
 view.appendChild(badge);view.appendChild(action);
 function resetTail(){
   tail.token++;tail.active=false;tail.order=[];tail.position=-1;
   badge.hidden=true;action.hidden=true;
   document.body.classList.remove('talera-tail-active');
   if(state.media?.tagName==='VIDEO'){
     state.media.pause();state.media.muted=true;state.media.defaultMuted=true;
     state.media.setAttribute('muted','');
   }
 }
 function finishTail(){
   resetTail();msg('Herinnering afgelopen');emit('EXTRAS_COMPLETE');
 }
 async function nextOriginal(){
   if(!tail.active)return;
   tail.position++;
   if(tail.position>=tail.order.length){finishTail();return}
   show(tail.order[tail.position]);
   const video=state.media,token=++tail.token;
   if(!video||video.tagName!=='VIDEO'){void nextOriginal();return}
   video.pause();video.muted=false;video.defaultMuted=false;video.removeAttribute('muted');
   video.playsInline=true;video.setAttribute('playsinline','');
   try{video.currentTime=0}catch(e){}
   badge.hidden=false;
   badge.textContent='Originele video '+(tail.position+1)+' van '+tail.order.length+' · met geluid';
   action.hidden=true;
   video.addEventListener('ended',()=>{if(tail.active&&tail.token===token)void nextOriginal()},{once:true});
   video.addEventListener('error',()=>{
     if(tail.active&&tail.token===token){
       action.textContent='Video niet beschikbaar · volgende';
       action.hidden=false;action.onclick=()=>void nextOriginal();
     }
   },{once:true});
   const start=async()=>{
     try{await video.play();if(tail.active&&tail.token===token)action.hidden=true}
     catch(e){
       if(tail.active&&tail.token===token){
         action.textContent='▶ Video met geluid';
         action.hidden=false; // iOS may disallow unmuted autoplay.
       }
     }
   };
   action.onclick=()=>{if(tail.active&&tail.token===token)void start()};
   await start();
 }
 function startOriginals(){
   if(!presenter||!state.voiceUrl)return;
   const order=[];
   state.items.forEach((item,index)=>{if(item.type==='video')order.push(index)});
   if(!order.length){emit('EXTRAS_COMPLETE');return}
   resetTail();tail.active=true;tail.order=order;
   document.body.classList.add('talera-tail-active');
   msg('Originele video’s met geluid');void nextOriginal();
 }
 voice.addEventListener('ended',startOriginals);
 // Swipes change timeline story. Taps during the extras pass skip this video.
 let gesture=null;
 view.addEventListener('pointerdown',e=>{
   if(!presenter||e.target.closest('#taleraTailAction'))return;
   gesture={id:e.pointerId,x:e.clientX,y:e.clientY};
   if(tail.active)e.stopImmediatePropagation();
 },true);
 view.addEventListener('pointerup',e=>{
   if(!presenter||!gesture||e.pointerId!==gesture.id)return;
   const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;
   if(Math.abs(dx)>52&&Math.abs(dx)>Math.abs(dy)*1.25){
     e.preventDefault();e.stopImmediatePropagation();emit('NEXT_STORY');return;
   }
   if(tail.active){
     e.preventDefault();e.stopImmediatePropagation();
     if(Math.abs(dx)<20&&Math.abs(dy)<20)void nextOriginal();
   }
 },true);
 view.addEventListener('pointercancel',()=>{gesture=null},true);
 action.addEventListener('pointerdown',e=>e.stopPropagation(),true);
 action.addEventListener('pointerup',e=>e.stopPropagation(),true);
 $('play').addEventListener('click',resetTail,true);

 emit('READY');
})();
