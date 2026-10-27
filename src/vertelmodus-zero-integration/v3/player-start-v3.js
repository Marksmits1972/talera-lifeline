
/* Replace ONLY existing async play() in standalone player.
   Voice, recorded narration cues and replay video round otherwise stay unchanged. */
async function play(){
 if(!state.voiceUrl)return;
 voice.pause();
 if(state.media&&state.media.pause)state.media.pause();
 // A previous view or the finished unmuted originals may not control the new session.
 taleraOriginalActive=false;
 taleraOriginalQueue=[];
 taleraOriginalIndex=-1;
 taleraManualFrame=null;
 state.lastCue=null;
 dispose();
 // The opening image is the one recorded in the FIRST narration cue, not
 // the last manually selected image and not unconditionally media index zero.
 const first=state.cues.length?Number(state.cues[0].index):0;
 if(state.items.length)show(Number.isInteger(first)&&first>=0&&first<state.items.length?first:0);
 try{voice.currentTime=0}catch(e){}
 try{
  await voice.play();
  mode("playing");
  msg("Terugkijken");
  follow();
  loop();
 }catch(e){
  mode("ready");
  msg("Afspelen niet gestart. Probeer opnieuw.",true);
 }
}
