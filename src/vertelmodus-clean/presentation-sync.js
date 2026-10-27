/* TALERA clean Vertelmodus V1. Replaces legacy playbackAtTime through stopVoiceTicker
   in LOCAL_RH19_ADAPTER. No fabricated time distribution. */
function playbackAtTime(){
 const memory=voiceMemory,player=activeAudio;
 if(!memory||!player||runtime.currentMemory()?.id!==memory.id)return;
 const frames=memory._taleraFrames||[];
 const cues=Array.isArray(memory._taleraNarrationCues)?memory._taleraNarrationCues:[];
 if(!cues.length||!frames.length)return;
 const now=Math.max(0,(Number(player.currentTime)||0)*1000);
 let chosen=cues[0];
 for(const cue of cues){if(cue.t<=now+45)chosen=cue;else break}
 if(!Number.isInteger(chosen.index)||chosen.index<0||chosen.index>=frames.length)return;
 if(chosen.index!==memory._photoIndex)window.__taleraV31SelectPhoto?.(memory.id,chosen.index);
 const v=activeVideo;
 if(v&&frames[chosen.index]?.kind==='video'){
    v.muted=true;v.defaultMuted=true;v.playsInline=true;
    if(player.paused||player.ended){if(!v.paused)v.pause();return}
    const offset=Math.max(0,(now-chosen.t)/1000);
    if(v.readyState>=1&&Number.isFinite(v.duration)&&offset<v.duration&&Math.abs(v.currentTime-offset)>.8){
      try{v.currentTime=offset}catch(e){}
    }
    if(v.paused&&!v.ended)void v.play().catch(()=>{});
 }else if(v&&player.paused&&!v.paused)v.pause();
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

