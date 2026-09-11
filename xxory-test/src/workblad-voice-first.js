export const WORKBLAD_VOICE_FIRST_STYLE = String.raw`
/* Voice-first, not voice-only: speaking is the first content invitation after the photo. */
.work-sheet>.work-title{order:1}
.work-sheet>.work-date-row{order:2}
.work-sheet>.work-photo-section{order:3}
.work-sheet>.work-tools{order:4;margin-top:0!important;padding-top:1px!important}
.work-sheet>.work-voice-note{order:5}
.work-sheet>.work-story{order:6}
.work-sheet>.work-error{order:7}
.work-sheet>.work-hint{order:8}
.work-tool.voice{min-height:52px!important;border-radius:17px!important;font-size:14px!important;letter-spacing:.005em!important;box-shadow:0 9px 22px rgba(15,39,71,.16)!important}
.work-story{border-top:1px solid rgba(15,39,71,.055)!important;padding-top:12px!important}
@media(max-width:600px){
  .work-tool.voice{min-height:50px!important}
  .work-story{padding-top:10px!important}
}
`;

export const WORKBLAD_VOICE_FIRST_SCRIPT = String.raw`<script>(function(){
function applyVoiceFirstCopy(){
  var button=document.getElementById('workVoice');
  if(button){
    var hasVoice=Boolean(document.querySelector('.work-voice-note'));
    var label=hasVoice?'Vertel nog iets':'Vertel iets';
    if(button.textContent!==label)button.textContent=label;
    button.setAttribute('aria-label',hasVoice?'Voeg nog een gesproken stukje toe':'Vertel iets over deze herinnering');
  }
  var story=document.getElementById('workText');
  if(story)story.placeholder='Of schrijf wat je wilt onthouden…';
}
var observer=new MutationObserver(applyVoiceFirstCopy);
observer.observe(document.documentElement,{childList:true,subtree:true});
applyVoiceFirstCopy();
})();</scr`+`ipt>`;
