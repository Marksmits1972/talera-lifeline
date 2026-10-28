
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
   stopOriginalVideos();
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
     if(originalVideoActive)stopOriginalVideos();
     voice.pause();if(state.media?.pause)state.media.pause();
     if(state.mode==='playing')mode('playPaused');
   }
 });
 window.addEventListener('pagehide',clearOwned,{once:true});
 // The original standalone recorder remains authoritative; the PWA only persists its result.
 window.__taleraZeroEmitSaved=blob=>{
   emit('SAVE',{audio:blob,cues:state.cues.map(c=>({...c})),duration:state.duration});
 };

 // Presentation-only extra round: play original videos AFTER the complete narration.
 // Reuse state.items URLs; do not change recorded cues or the narration timeline.
 let originalVideoQueue=[],originalVideoPosition=-1,originalVideoActive=false;
 let originalVideoToken=0;
 const narrationPlay=$('play').onclick;
 function stopOriginalVideos(){
   ++originalVideoToken;
   originalVideoActive=false;
   originalVideoPosition=-1;
   originalVideoQueue=[];
   if(state.media?.tagName==='VIDEO')state.media.pause();
   $('play').onclick=narrationPlay;
 }
 async function showOriginalVideo(position){
   if(!originalVideoActive)return;
   if(position>=originalVideoQueue.length){
     stopOriginalVideos();
     mode('ready');
     msg('Herinnering afgelopen');
     return;
   }
   originalVideoPosition=position;
   const token=originalVideoToken;
   const index=originalVideoQueue[position];
   // show() already handles disposal and image/video positioning.
   if(state.index!==index||state.media?.tagName!=='VIDEO')show(index);
   const video=state.media;
   if(!video||video.tagName!=='VIDEO')return;
   video.pause();
   video.muted=false;
   video.defaultMuted=false;
   video.controls=false;
   try{video.currentTime=0}catch(e){}
   video.addEventListener('ended',()=>{
     if(originalVideoActive&&token===originalVideoToken&&state.media===video)
       void showOriginalVideo(position+1);
   },{once:true});
   $('play').onclick=()=>{if(originalVideoActive)void video.play().then(()=>{
     msg('Originele video met geluid');
   }).catch(()=>msg('Tik op afspelen om het geluid te starten',true))};
   msg('Originele video met geluid');
   try{
     await video.play();
   }catch(error){
     if(token===originalVideoToken&&originalVideoActive){
       mode('ready');
       msg('Tik op afspelen om de video met geluid te starten');
     }
   }
 }
 function beginOriginalVideos(){
   if(!presenter||originalVideoActive)return;
   const videos=state.items.map((item,index)=>item.type==='video'?index:-1).filter(index=>index>=0);
   if(!videos.length)return;
   // Prior voice ended handler has already stopped the narrated video.
   voice.pause();
   originalVideoQueue=videos;
   originalVideoPosition=0;
   originalVideoActive=true;
   ++originalVideoToken;
   void showOriginalVideo(0);
 }
 voice.addEventListener('ended',beginOriginalVideos);
  emit('READY');
})();
