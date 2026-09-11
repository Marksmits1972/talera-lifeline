export const WORKBLAD_LAYOUT_TUNING_STYLE = String.raw`
/* Use the mobile workblad as a calm, full creative canvas instead of leaving dead space. */
@media(max-width:600px){
  .work-sheet{gap:10px!important}
  .work-photo-section{gap:6px!important}
  .work-photo,.work-photo.has-photo{min-height:clamp(168px,25dvh,224px)!important}
  .work-photo img{height:clamp(168px,25dvh,224px)!important;min-height:0!important;max-height:none!important}
  .work-story{min-height:clamp(132px,20dvh,196px)!important;max-height:none!important;flex:1 1 0!important;line-height:1.48!important;overflow:auto!important;-webkit-overflow-scrolling:touch}
  .work-tools{margin-top:auto!important;padding-top:2px!important}
  .work-tool{min-height:47px!important}
}
@media(max-width:600px) and (max-height:740px){
  .work-photo,.work-photo.has-photo{min-height:142px!important}
  .work-photo img{height:142px!important}
  .work-story{min-height:108px!important;max-height:none!important;flex:1 1 0!important}
  .work-tool{min-height:44px!important}
}
`;

export const WORKBLAD_LAYOUT_TUNING_SCRIPT = String.raw`<script>(function(){
var freshApplied=false;
function freshRequested(){try{return new URLSearchParams(location.search).get('new')==='1'}catch(e){return false}}
function applyFreshAfterBoot(){
  if(freshApplied||!freshRequested()||!document.querySelector('.work-stage'))return;
  freshApplied=true;
  try{
    if(Array.isArray(state.workMedia))state.workMedia.forEach(function(m){if(m&&m.localUrl)try{URL.revokeObjectURL(m.localUrl)}catch(e){}});
    state.workMedia=[];state.newPhotoFiles=[];state.audioBlob=null;state.hasExistingAudio=false;state.duration=0;state.liveTranscript='';
    state.workTitle='';state.workText='';state.workError='';state.storyId=null;state.manageToken=null;state.proposal=null;state.editingStoryId='';state.editingToken='';
    var at=new URLSearchParams(location.search).get('at')||'';var d=new Date(at);
    state.workDate=!isNaN(d.getTime())?d.toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'}):'';
    if(typeof renderEntry==='function')renderEntry();
  }catch(e){}
}
function tuneVoicePrompt(){
  applyFreshAfterBoot();
  var b=document.getElementById('workVoice');
  if(!b)return;
  var hasVoice=Boolean(document.querySelector('.work-voice-note'));
  var label=hasVoice?'Wil je nog iets vertellen?':'Wil je iets vertellen?';
  if(b.textContent!==label)b.textContent=label;
  b.setAttribute('aria-label',label);
}
var observer=new MutationObserver(tuneVoicePrompt);
observer.observe(document.documentElement,{childList:true,subtree:true});
tuneVoicePrompt();
})();</scr`+`ipt>`;
