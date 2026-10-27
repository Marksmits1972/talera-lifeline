
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
 emit('READY');
})();
