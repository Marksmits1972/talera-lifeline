/* TALERA Vertelmodus Sync V2: presentatie volgt de audioklok. Vervangt bestaand playbackAtTime-blok. */
function playbackAtTime(){
 // Één leidende afspeelklok: de huidige positie van de stemopname.
 const memory=voiceMemory,audio=activeAudio;
 if(!memory||!audio||runtime.currentMemory()?.id!==memory.id)return;
 const frames=memory._taleraFrames||[],cues=Array.isArray(memory._taleraNarrationCues)?memory._taleraNarrationCues:[];
 if(!frames.length||!cues.length)return;
 const audioMs=Math.max(0,Math.round((Number(audio.currentTime)||0)*1000));
 let cue=cues[0];
 for(const c of cues){if(c.t<=audioMs+15)cue=c;else break}
 if(!Number.isInteger(cue.index)||cue.index<0||cue.index>=frames.length)return;
 if(memory._photoIndex!==cue.index)window.__taleraV31SelectPhoto?.(memory.id,cue.index);
 if(frames[cue.index]?.kind!=='video')return;
 const video=activeVideo;
 if(!video||video.dataset.storyFrame!==memory.id+'|'+cue.index+'|'+(frames[cue.index]?.key||''))return;
 video.muted=true;video.defaultMuted=true;video.playsInline=true;video.controls=false;
 const requested=Math.max(0,((Number(cue.videoAtMs)||0)+(audioMs-cue.t))/1000);
 const sync=()=>{
   if(video!==activeVideo)return;
   if(video.readyState>=1&&Number.isFinite(video.duration)&&video.duration>0){
     const target=Math.min(Math.max(0,video.duration-0.05),requested);
     if(Math.abs(video.currentTime-target)>.35){try{video.currentTime=target}catch(e){}}
   }
   if(audio.paused||audio.ended){if(!video.paused)video.pause()}
   else if(video.paused&&!video.ended)void video.play().catch(()=>{});
 };
 if(video.readyState>=1)sync();
 else video.addEventListener('loadedmetadata',sync,{once:true});
}

let voiceTicker=0;
function runVoiceTicker(){
 playbackAtTime();
 if(!voiceTicker)voiceTicker=setInterval(playbackAtTime,90);
}
function stopVoiceTicker(){
 if(voiceTicker){clearInterval(voiceTicker);voiceTicker=0}
 if(activeVideo&&!activeVideo.paused)activeVideo.pause();
}

