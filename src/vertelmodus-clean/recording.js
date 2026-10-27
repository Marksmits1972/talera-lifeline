/* TALERA clean Vertelmodus V1. Insert into the existing TALERA /tell inner closure.
   Depends on the existing TALERA memory-store functions; not a standalone page.
   Source extracted from deployed clean test Worker (2026-10-27). */
let taleraVoiceSession=null;
function taleraVoicePosition(){
 const elapsed=Date.now()-startedAt-pauseTotal-(recorder?.state==='paused'?Date.now()-pausedAt:0);
 return Math.max(0,Math.round(elapsed));
}
function taleraVoiceMark(index){
 if(!taleraVoiceSession||recorder?.state!=='recording')return;
 const cues=taleraVoiceSession.cues;
 if(!cues.length||cues[cues.length-1].index!==index)cues.push({t:taleraVoicePosition(),index});
}
function setupRecording(g){
 const start=$('recStart'),pause=$('recPause'),stop=$('recStop'),message=$('recMessage'),audio=$('listen');
 if(!start||!audio)return;
 let listenTimer=null;
 const listenStop=()=>{if(listenTimer){clearInterval(listenTimer);listenTimer=null}};
 const listenSync=()=>{
   if(recorder&&recorder.state==='recording')return;
   const cues=Array.isArray(g.voiceCues)?g.voiceCues:[];
   if(!cues.length||!g.media.length)return;
   const ms=Math.max(0,(Number(audio.currentTime)||0)*1000);
   let index=cues[0].index;
   for(const c of cues){if(c.t<=ms+50)index=c.index;else break}
   if(Number.isInteger(index)&&index>=0&&index<g.media.length&&idx!==index)stepPhoto(g,index-idx);
   const video=$('frame')?.querySelector(':scope > video');
   if(video){
     video.muted=true;video.defaultMuted=true;video.playsInline=true;
     if(!audio.paused&&!audio.ended&&video.paused)void video.play().catch(()=>{});
     if(audio.paused&&!video.paused)video.pause();
   }
 };
 audio.addEventListener('timeupdate',listenSync);
 audio.addEventListener('seeking',listenSync);
 audio.addEventListener('seeked',listenSync);
 audio.addEventListener('play',()=>{listenSync();listenStop();listenTimer=setInterval(listenSync,90)});
 audio.addEventListener('pause',()=>{listenStop();listenSync()});
 audio.addEventListener('ended',listenStop);
 const existing=g.voice&&assets.get(g.voice);
 if(existing){
   audio.src=originalUrl(g.voice);audio.hidden=false;
   message.textContent='Je opname staat klaar. Tik op afspelen om met de foto’s mee te luisteren.';
 }else message.textContent='Kies Start opname en blader tijdens het vertellen zelf door de foto’s.';
 start.onclick=async()=>{
   if(recorder&&recorder.state!=='inactive')return;
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
      message.textContent='Deze browser ondersteunt opnemen niet.';return;
   }
   start.disabled=true;
   let pending=null;
   try{
     mic=await navigator.mediaDevices.getUserMedia({audio:true});
     const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
     recorder=new MediaRecorder(mic,mime?{mimeType:mime}:undefined);
     parts=[];pauseTotal=0;pausedAt=0;startedAt=Date.now();
     pending={cues:g.media.length?[{t:0,index:idx}]:[]};
     taleraVoiceSession=pending;
     recorder.ondataavailable=e=>{if(e.data&&e.data.size)parts.push(e.data)};
     recorder.onerror=()=>{
       taleraVoiceSession=null;stopMic();start.disabled=false;start.hidden=false;
       pause.hidden=true;stop.hidden=true;message.textContent='Opnemen is mislukt. Je vorige opname is behouden.';
     };
     recorder.onstop=async()=>{
       const duration=taleraVoicePosition();
       taleraVoiceSession=null;
       const type=recorder.mimeType||mime||'audio/webm';
       const blob=new Blob(parts,{type});
       stopMic();start.hidden=false;start.disabled=false;pause.hidden=true;stop.hidden=true;
       pause.textContent='Pauze';recorder=null;
       if(!blob.size){message.textContent='Er zijn geen audiogegevens gemaakt. Je vorige opname blijft bestaan.';return}
       const id=uid(),file=new File([blob],'mijn-stem.'+(type.includes('mp4')?'m4a':'webm'),{type});
       busy('Stem bewaren','De opname veilig koppelen aan de herinnering');
       try{
         await writeFiles([[id,file]]);assets.set(id,file);
         const previousVoice=g.voice,previousCues=g.voiceCues,previousDuration=g.voiceDurationMs;
         g.voice=id;g.voiceCues=pending.cues;g.voiceDurationMs=duration;
         try{await saveDraft()}catch(e){g.voice=previousVoice;g.voiceCues=previousCues;g.voiceDurationMs=previousDuration;throw e}
         if(previousVoice){try{await deleteFiles([previousVoice])}catch(e){}revoke(previousVoice);assets.delete(previousVoice)}
         audio.src=originalUrl(id);audio.hidden=false;
         audio.pause();try{audio.currentTime=0}catch(e){}
         message.textContent='Opname bewaard. Luister terug: de foto’s volgen jouw wissels.';
       }catch(e){message.textContent='Bewaren niet gelukt: '+e.message+'. Sluit het scherm niet voordat je opnieuw hebt opgeslagen.'}
       finally{clearBusy()}
     };
     recorder.start(1000);
     $('recPanel').classList.add('is-recording');
     $('recPanel').classList.remove('is-paused');
     $('recClock').textContent='00:00';
     start.hidden=true;pause.hidden=false;stop.hidden=false;
     message.textContent='Opname loopt. Jij bepaalt met een tik of swipe wanneer de foto wisselt.';
     const video=$('frame')?.querySelector(':scope > video');
     if(video){video.muted=true;video.defaultMuted=true;video.playsInline=true;video.controls=false;void video.play().catch(()=>{})}
     clock=setInterval(()=>{$('recClock').textContent=clockText(taleraVoicePosition()/1000)},500);
   }catch(e){
     taleraVoiceSession=null;stopMic();recorder=null;start.disabled=false;
     message.textContent='Microfoon niet beschikbaar: '+e.message;
   }
 };
 pause.onclick=()=>{
   if(!recorder)return;
   if(recorder.state==='recording'){
     recorder.pause();pausedAt=Date.now();$('recPanel').classList.add('is-paused');
     $('recPanel').classList.remove('is-recording');pause.textContent='Hervatten';
     message.textContent='Opname gepauzeerd.';if(clock){clearInterval(clock);clock=null}
   }else if(recorder.state==='paused'){
     pauseTotal+=Date.now()-pausedAt;recorder.resume();taleraVoiceMark(idx);
     $('recPanel').classList.remove('is-paused');$('recPanel').classList.add('is-recording');
     pause.textContent='Pauze';message.textContent='Opname loopt verder.';
     clock=setInterval(()=>{$('recClock').textContent=clockText(taleraVoicePosition()/1000)},500);
   }
 };
 stop.onclick=()=>{if(recorder&&recorder.state!=='inactive')recorder.stop()};
}

