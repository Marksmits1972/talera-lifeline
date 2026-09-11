export const WORKBLAD_RETURN_STYLE = String.raw`
.work-top{position:relative}
.work-timeline-back{position:absolute;left:0;top:50%;transform:translateY(-50%);min-height:32px;border:0;border-radius:999px;background:rgba(255,254,252,.78);color:#0F2747;padding:0 11px;display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;box-shadow:inset 0 0 0 1px rgba(15,39,71,.07),0 4px 12px rgba(15,39,71,.04);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:3}
.work-timeline-back .arrow{font-size:16px;font-weight:400;line-height:1;margin-top:-1px}
@media(max-width:600px){.work-timeline-back{min-height:28px;padding:0 9px;font-size:10px;gap:4px}.work-timeline-back .arrow{font-size:15px}}
`;

export const WORKBLAD_RETURN_SCRIPT = String.raw`<script>(function(){
var TIMELINE_URL='https://talera-timeline-prototype.mark-a39.workers.dev/';
function cameFromTimeline(){
  try{
    var q=new URLSearchParams(location.search);
    if(q.has('at')||q.has('edit'))return true;
    return String(document.referrer||'').indexOf(TIMELINE_URL)===0;
  }catch(e){return false}
}
function flushDraftInputs(){
  try{
    ['workTitle','workDate','workText'].forEach(function(id){
      var el=document.getElementById(id);
      if(el)el.dispatchEvent(new Event('input',{bubbles:true}));
    });
    var a=document.activeElement;
    if(a&&typeof a.blur==='function')a.blur();
  }catch(e){}
}
function goBackToTimeline(){
  flushDraftInputs();
  setTimeout(function(){
    if(cameFromTimeline()&&history.length>1){history.back();return}
    location.href=TIMELINE_URL;
  },240);
}
function install(){
  var top=document.querySelector('.work-stage .work-top');
  if(!top||top.querySelector('#workTimelineBack'))return;
  var b=document.createElement('button');
  b.id='workTimelineBack';
  b.className='work-timeline-back';
  b.type='button';
  b.setAttribute('aria-label','Terug naar tijdlijn');
  b.innerHTML='<span class="arrow">←</span><span>Tijdlijn</span>';
  b.onclick=goBackToTimeline;
  top.insertBefore(b,top.firstChild);
}
var observer=new MutationObserver(function(){install()});
observer.observe(document.documentElement,{childList:true,subtree:true});
install();
})();</scr`+`ipt>`;
