export const WORKBLAD_LAYOUT_TUNING_STYLE = String.raw`
/* Photo-first workblad: remove non-essential chrome and give the memory itself the space. */
.work-top{display:none!important}
.work-kicker{display:none!important}
.work-stage{grid-template-rows:minmax(0,1fr) auto 60px!important;padding-top:max(8px,env(safe-area-inset-top))!important}
.work-sheet{justify-content:flex-start}
.work-title{font-size:clamp(22px,6vw,28px)!important;line-height:1.06!important;min-height:32px!important}
.work-date-row{min-height:26px!important}
.work-date{font-size:16px!important}
.work-photo{background:linear-gradient(145deg,rgba(220,234,246,.56),rgba(247,244,239,.86))!important}
.work-photo.has-photo{background:linear-gradient(145deg,#eef3f6,#f5f1ea)!important}
.work-photo img{object-fit:contain!important;background:transparent!important}
.work-photo-count.is-single,.work-photo-strip.is-single{display:none!important}

@media(max-width:600px){
  .work-stage{grid-template-rows:minmax(0,1fr) auto 60px!important;gap:7px!important;padding:max(8px,env(safe-area-inset-top)) 10px 0!important}
  .work-scroll{overflow:hidden!important;padding:0!important}
  .work-sheet{height:100%;min-height:0!important;overflow:hidden;padding:12px 14px 11px!important;border-radius:24px!important;gap:8px!important}
  .work-title{font-size:clamp(22px,6vw,27px)!important;line-height:1.04!important}
  .work-date-row{min-height:25px!important;gap:8px!important}
  .work-photo-section{gap:5px!important;min-height:0}
  .work-photo,.work-photo.has-photo{min-height:clamp(218px,31dvh,286px)!important}
  .work-photo img{height:clamp(218px,31dvh,286px)!important;min-height:0!important;max-height:none!important;object-fit:contain!important}
  .work-photo-empty{padding:18px!important}
  .work-photo-strip{min-height:29px!important}
  .work-photo-thumb{width:29px!important;height:29px!important}
  .work-story{min-height:clamp(132px,20dvh,190px)!important;max-height:none!important;flex:1 1 0!important;font-size:16px!important;line-height:1.48!important;overflow:auto!important;-webkit-overflow-scrolling:touch}
  .work-voice-note{padding:8px 10px!important}
  .work-tools{margin-top:auto!important;padding-top:1px!important}
  .work-tool{min-height:47px!important}
  .work-actions{grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important}
  .work-draft{font-size:10px!important}
  .work-finish{min-height:48px!important}

  /* iPhone keyboard: keep the existing finish action reachable without moving it permanently. */
  html.talera-keyboard-open .work-actions{
    position:fixed!important;
    z-index:96!important;
    left:10px!important;
    right:10px!important;
    bottom:calc(var(--talera-keyboard-inset,0px) + 8px)!important;
    grid-template-columns:1fr!important;
    gap:0!important;
    padding:7px!important;
    border-radius:20px!important;
    background:rgba(247,244,239,.94)!important;
    box-shadow:0 10px 30px rgba(15,39,71,.18)!important;
    backdrop-filter:blur(16px)!important;
    -webkit-backdrop-filter:blur(16px)!important;
  }
  html.talera-keyboard-open .work-actions .work-draft{display:none!important}
  html.talera-keyboard-open .work-actions .work-finish{width:100%!important;min-height:50px!important;font-size:16px!important}
}
@media(max-width:600px) and (max-height:740px){
  .work-stage{grid-template-rows:minmax(0,1fr) auto 58px!important;padding:max(6px,env(safe-area-inset-top)) 8px 0!important}
  .work-sheet{padding:9px 12px!important;gap:6px!important}
  .work-title{font-size:21px!important;min-height:28px!important}
  .work-photo,.work-photo.has-photo{min-height:190px!important}
  .work-photo img{height:190px!important}
  .work-story{min-height:104px!important;max-height:none!important;flex:1 1 0!important}
  .work-tool{min-height:43px!important}
  .work-finish{min-height:44px!important}
}
`;

export const WORKBLAD_LAYOUT_TUNING_SCRIPT = String.raw`<script>(function(){
function tuneWorkblad(){
  var title=document.getElementById('workTitle');
  if(title)title.placeholder='Titel';

  var b=document.getElementById('workVoice');
  if(b){
    var hasVoice=Boolean(document.querySelector('.work-voice-note'));
    var label=hasVoice?'Opnieuw inspreken':'Vertel iets';
    if(b.textContent!==label)b.textContent=label;
    b.setAttribute('aria-label',hasVoice?'Vervang de gesproken opname':'Vertel iets over deze herinnering');
  }

  var strip=document.querySelector('.work-photo-strip');
  var count=document.querySelector('.work-photo-count');
  if(strip){
    var thumbs=strip.querySelectorAll('.work-photo-thumb').length;
    strip.classList.toggle('is-single',thumbs<=1);
    if(count)count.classList.toggle('is-single',thumbs<=1);
  }
}

function syncKeyboard(){
  var vv=window.visualViewport;
  if(!vv)return;
  var active=document.activeElement;
  var isTextFocus=Boolean(active&&(active.tagName==='INPUT'||active.tagName==='TEXTAREA')&&active.id!=='workDate');
  var inset=Math.max(0,Math.round(window.innerHeight-vv.height-vv.offsetTop));
  var open=isTextFocus&&inset>120;
  document.documentElement.classList.toggle('talera-keyboard-open',open);
  document.documentElement.style.setProperty('--talera-keyboard-inset',open?inset+'px':'0px');
}

var observer=new MutationObserver(function(){tuneWorkblad();syncKeyboard()});
observer.observe(document.documentElement,{childList:true,subtree:true});
tuneWorkblad();
if(window.visualViewport){
  window.visualViewport.addEventListener('resize',syncKeyboard,{passive:true});
  window.visualViewport.addEventListener('scroll',syncKeyboard,{passive:true});
}
document.addEventListener('focusin',function(){setTimeout(syncKeyboard,40)},true);
document.addEventListener('focusout',function(){setTimeout(syncKeyboard,140)},true);
window.addEventListener('pageshow',syncKeyboard,{passive:true});
syncKeyboard();
})();</scr`+`ipt>`;
