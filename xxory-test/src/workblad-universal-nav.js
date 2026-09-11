export const WORKBLAD_UNIVERSAL_NAV_STYLE = String.raw`
/* Same TALERA navigation hierarchy as the presentation screen. */
.work-stage{grid-template-rows:auto minmax(0,1fr) auto 60px!important;padding-bottom:0!important}
.work-universal-nav{height:60px;min-height:60px;max-height:60px;width:calc(100% + 28px);margin-left:-14px;display:grid;grid-template-columns:1fr 1fr 1fr;align-items:end;padding:4px 20px max(4px,env(safe-area-inset-bottom));border-top:1px solid rgba(15,39,71,.07);background:rgba(247,244,239,.98);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);overflow:hidden}
.work-nav-item{border:0;background:transparent;color:rgba(62,74,89,.58);display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;min-height:38px;padding:0 0 2px;font-size:10px}
.work-nav-item.active{color:#0F2747;font-weight:650}
.work-nav-timeline-icon{width:24px;height:17px;position:relative}
.work-nav-timeline-icon::before{content:"";position:absolute;left:1px;right:1px;top:8px;height:2px;border-radius:2px;background:currentColor;box-shadow:-4px -4px 0 -.4px currentColor,4px 4px 0 -.4px currentColor}
.work-nav-tell{justify-self:center;width:50px;height:50px;border:0;border-radius:50%;color:#FFFEFC;background:#0F2747;box-shadow:0 9px 23px rgba(15,39,71,.17);font-size:11px;font-weight:650;position:relative;cursor:default}
.work-nav-tell::after{content:"";display:block;width:5px;height:5px;border-radius:50%;background:#E7A98B;margin:3px auto 0;opacity:.88}
.work-nav-more{width:22px;letter-spacing:3px;font-size:18px;line-height:1}
.work-top .work-timeline-back{display:none!important}
@media(max-width:600px){
  .work-stage{grid-template-rows:28px minmax(0,1fr) auto 60px!important;padding-bottom:0!important}
  .work-universal-nav{width:calc(100% + 20px);margin-left:-10px}
}
@media(max-width:600px) and (max-height:740px){
  .work-stage{grid-template-rows:24px minmax(0,1fr) auto 58px!important}
  .work-universal-nav{height:58px;min-height:58px;max-height:58px;width:calc(100% + 16px);margin-left:-8px}
}
`;

export const WORKBLAD_UNIVERSAL_NAV_SCRIPT = String.raw`<script>(function(){
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
    ['workTitle','workDate','workText'].forEach(function(id){var el=document.getElementById(id);if(el)el.dispatchEvent(new Event('input',{bubbles:true}))});
    var a=document.activeElement;if(a&&typeof a.blur==='function')a.blur();
  }catch(e){}
}
function goTimeline(){
  flushDraftInputs();
  setTimeout(function(){
    if(cameFromTimeline()&&history.length>1){history.back();return}
    location.href=TIMELINE_URL;
  },240);
}
function install(){
  var stage=document.querySelector('.work-stage');
  if(!stage||stage.querySelector('.work-universal-nav'))return;
  var nav=document.createElement('nav');
  nav.className='work-universal-nav';
  nav.setAttribute('aria-label','TALERA navigatie');
  nav.innerHTML='<button class="work-nav-item work-nav-timeline" type="button"><span class="work-nav-timeline-icon"></span><span>Tijdlijn</span></button><button class="work-nav-tell" type="button" aria-current="page" aria-label="Vertel - huidige pagina">Vertel</button><button class="work-nav-item" type="button"><span class="work-nav-more">•••</span><span>Meer</span></button>';
  stage.appendChild(nav);
  nav.querySelector('.work-nav-timeline').onclick=goTimeline;
}
var observer=new MutationObserver(install);
observer.observe(document.documentElement,{childList:true,subtree:true});
install();
})();</scr`+`ipt>`;
