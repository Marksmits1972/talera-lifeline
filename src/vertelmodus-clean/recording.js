/* TALERA Vertelmodus Sync V2: opname met één monotone klok; invoegen in de bestaande /tell closure. */
let taleraVoiceSession=null;
function taleraVoicePosition(){
 const s=taleraVoiceSession;if(!s||!Number.isFinite(s.startedPerf))return 0;
 const now=performance.now(),inPause=s.pauseStartedPerf==null?0:now-s.pauseStartedPerf;
 return Math.max(0,Math.round(now-s.startedPerf-s.pauseTotalPerf-inPause));
}
function taleraVoiceMark(index,options){
 const s=taleraVoiceSession;
 if(!s||recorder?.state!=='recording'||!Number.isInteger(index)||index<0)return;
 const cue={t:taleraVoicePosition(),index};
 const v=$('frame')?.querySelector(':scope > video');
 if(v&&Number.isFinite(v.currentTime))cue.videoAtMs=Math.max(0,Math.round(v.currentTime*1000));
 const last=s.cues[s.cues.length-1];
 if(last&&last.index===index&&!options?.force)return;
 if(last&&last.index===index&&options?.force&&cue.videoAtMs==null)return;
 s.cues.push(cue);
}
function setupRecording(g){
 const start=$('recStart'),pause=$('recPause'),stop=$('recStop'),message=$('recMessage'),audio=$('listen');
 if(!start||!audio||audio.dataset.taleraSyncReady==='1')return;
 audio.dataset.taleraSyncReady='1';
 let listenTimer=null;
 const listenStop=()=>{if(listenTimer){clearInterval(listenTimer);listenTimer=null}};
 const listenSync=()=>{
   if(recorder&&recorder.state!=='inactive')return;
   const cues=Array.isArray(g.voiceCues)?g.voiceCues:[];
   if(!cues.length||!g.media.length)return;
   const ms=Math.max(0,(Number(audio.currentTime)||0)*1000);
   let cue=cues[0];
   for(const item of cues){if(item.t<=ms+15)cue=item;else break}
   const index=cue.index;
   if(Number.isInteger(index)&&index>=0&&index<g.media.length&&idx!==index)stepPhoto(g,index-idx);
   const video=$('frame')?.querySelector(':scope > video');
   if(video){
     video.muted=true;video.defaultMuted=true;video.playsInline=true;video.controls=false;
     const seekTo=Math.max(0,((Number(cue.videoAtMs)||0)+(ms-cue.t))/1000);
     const syncVideo=()=>{
       if(video.readyState>=1&&Number.isFinite(video.duration)&&video.duration>0){
         const bounded=Math.min(Math.max(0,video.duration-.05),seekTo);
         if(Math.abs(video.currentTime-bounded)>.35)try{video.currentTime=bounded}catch(e){}
       }
       if(audio.paused||audio.ended){if(!video.paused)video.pause()}
       else if(video.paused&&!video.ended)void video.play().catch(()=>{});
     };
     if(video.readyState>=1)syncVideo();else video.addEventListener('loadedmetadata',syncVideo,{once:true});
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
   message.textContent='Luister terug.';
 }else message.textContent='Tik op Start opname.';
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
     const first={t:0,index:idx};
     const currentVideo=$('frame')?.querySelector(':scope > video');
     if(currentVideo&&Number.isFinite(currentVideo.currentTime))first.videoAtMs=Math.max(0,Math.round(currentVideo.currentTime*1000));
     pending={cues:g.media.length?[first]:[],startedPerf:null,pauseTotalPerf:0,pauseStartedPerf:null};
     taleraVoiceSession=pending;
     recorder.ondataavailable=e=>{if(e.data&&e.data.size)parts.push(e.data)};
     recorder.onerror=()=>{
       taleraVoiceSession=null;stopMic();start.disabled=false;start.hidden=false;
       pause.hidden=true;stop.hidden=true;message.textContent='Opnemen is mislukt. Je vorige opname is behouden.';
     };
     recorder.onstop=async()=>{
       const duration=Math.max(0,Math.round(Date.now()-startedAt-pauseTotal-($('recPanel')?.classList.contains('is-paused')?Date.now()-pausedAt:0)));
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
         message.textContent='Bewaard. Luister terug.';
       }catch(e){message.textContent='Bewaren niet gelukt: '+e.message+'. Sluit het scherm niet voordat je opnieuw hebt opgeslagen.'}
       finally{clearBusy()}
     };
     recorder.start(1000);
     pending.startedPerf=performance.now();
     $('recPanel').classList.add('is-recording');
     $('recPanel').classList.remove('is-paused');
     $('recClock').textContent='00:00';
     start.hidden=true;pause.hidden=false;stop.hidden=false;
     message.textContent='Tik of veeg voor het volgende beeld.';
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
     recorder.pause();pausedAt=Date.now();if(taleraVoiceSession)taleraVoiceSession.pauseStartedPerf=performance.now();
     const vid=$('frame')?.querySelector(':scope > video');if(vid&&!vid.paused)vid.pause();
     $('recPanel').classList.add('is-paused');
     $('recPanel').classList.remove('is-recording');pause.textContent='Hervatten';
     message.textContent='Opname gepauzeerd.';if(clock){clearInterval(clock);clock=null}
   }else if(recorder.state==='paused'){
     pauseTotal+=Date.now()-pausedAt;
     if(taleraVoiceSession&&taleraVoiceSession.pauseStartedPerf!=null){
       taleraVoiceSession.pauseTotalPerf+=performance.now()-taleraVoiceSession.pauseStartedPerf;
       taleraVoiceSession.pauseStartedPerf=null;
     }
     recorder.resume();taleraVoiceMark(idx,{force:true});
     const vid=$('frame')?.querySelector(':scope > video');
     if(vid){vid.muted=true;vid.defaultMuted=true;void vid.play().catch(()=>{})}
     $('recPanel').classList.remove('is-paused');$('recPanel').classList.add('is-recording');
     pause.textContent='Pauze';message.textContent='Opname loopt verder.';
     clock=setInterval(()=>{$('recClock').textContent=clockText(taleraVoicePosition()/1000)},500);
   }
 };
 stop.onclick=()=>{if(recorder&&recorder.state!=='inactive')recorder.stop()};
}


