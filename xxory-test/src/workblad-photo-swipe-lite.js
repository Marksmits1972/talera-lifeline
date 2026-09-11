export const WORKBLAD_PHOTO_SWIPE_LITE_STYLE = String.raw`
.work-photo.has-photo{touch-action:pan-y;cursor:grab}
.work-photo.has-photo:active{cursor:grabbing}
.work-photo-strip{overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.work-photo-strip::-webkit-scrollbar{display:none}
.work-photo-thumb{cursor:pointer;transition:opacity .16s ease,transform .16s ease,box-shadow .16s ease}
.work-photo-thumb.active{opacity:1!important;transform:scale(1.06);box-shadow:0 0 0 2px #E7A98B,0 2px 8px rgba(15,39,71,.16)!important}
`;

export const WORKBLAD_PHOTO_SWIPE_LITE_SCRIPT = String.raw`<script>(function(){
var swipeBlockUntil=0;
function media(){return typeof state!=='undefined'&&Array.isArray(state.workMedia)?state.workMedia:[]}
function clampIndex(){
  if(typeof state==='undefined')return 0;
  if(typeof state.workPhotoIndex!=='number'||!isFinite(state.workPhotoIndex))state.workPhotoIndex=0;
  var n=media().length;
  if(!n)state.workPhotoIndex=0;
  else state.workPhotoIndex=Math.max(0,Math.min(n-1,state.workPhotoIndex));
  return state.workPhotoIndex;
}
function activeSrc(){var items=media(),i=clampIndex();return items[i]&&items[i].localUrl||''}
function updatePhotoUi(scrollThumb){
  var items=media();if(!items.length)return;
  var i=clampIndex(),hero=document.querySelector('#workPhoto img'),src=activeSrc();
  if(hero&&src&&hero.src!==src)hero.src=src;
  var count=document.querySelector('.work-photo-count');
  if(count&&items.length>1){var label=(i+1)+' / '+items.length;if(count.textContent!==label)count.textContent=label}
  var thumbs=[].slice.call(document.querySelectorAll('.work-photo-thumb'));
  thumbs.forEach(function(t,idx){t.classList.toggle('active',idx===i)});
  if(scrollThumb&&thumbs[i]&&thumbs[i].scrollIntoView)try{thumbs[i].scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})}catch(e){}
}
function selectPhoto(i,scrollThumb){
  var items=media();if(items.length<=1)return;
  state.workPhotoIndex=((i%items.length)+items.length)%items.length;
  updatePhotoUi(Boolean(scrollThumb));
}
function bindThumbs(){
  var thumbs=[].slice.call(document.querySelectorAll('.work-photo-thumb'));
  thumbs.forEach(function(t,idx){
    if(t.dataset.photoSelectBound==='1')return;
    t.dataset.photoSelectBound='1';t.setAttribute('role','button');t.tabIndex=0;
    t.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();selectPhoto(idx,true)});
    t.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();selectPhoto(idx,true)}});
  });
}
function bindSwipe(el){
  if(!el||el.dataset.photoSwipeLite==='1')return;
  el.dataset.photoSwipeLite='1';
  var sx=0,sy=0,armed=false;
  el.addEventListener('touchstart',function(e){
    if(!e.touches||e.touches.length!==1)return;
    if(e.target&&e.target.closest&&e.target.closest('button')&&e.target.closest('button')!==document.getElementById('workPhoto'))return;
    sx=e.touches[0].clientX;sy=e.touches[0].clientY;armed=true;
  },{passive:true});
  el.addEventListener('touchend',function(e){
    if(!armed)return;armed=false;
    var t=e.changedTouches&&e.changedTouches[0];if(!t)return;
    var dx=t.clientX-sx,dy=t.clientY-sy;
    if(Math.abs(dx)>=44&&Math.abs(dx)>Math.abs(dy)*1.2){
      if(e.cancelable)e.preventDefault();
      swipeBlockUntil=Date.now()+320;
      selectPhoto((state.workPhotoIndex||0)+(dx<0?1:-1),true);
    }
  },{passive:false});
}
function bindHero(){
  var hero=document.getElementById('workPhoto');if(!hero||!media().length)return;
  bindSwipe(hero);
  if(hero.dataset.photoSwipeClickGuard!=='1'){
    hero.dataset.photoSwipeClickGuard='1';
    hero.addEventListener('click',function(e){if(Date.now()<swipeBlockUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
  }
}
function bindVoice(){var layer=document.getElementById('voiceLayer');if(layer&&media().length>1)bindSwipe(layer)}
function prepareCover(){
  if(typeof state==='undefined'||state.editingStoryId)return;
  var items=media(),i=clampIndex();if(items.length<=1||i<=0)return;
  var selected=items[i];
  state.workMedia=[selected].concat(items.slice(0,i),items.slice(i+1));
  state.newPhotoFiles=state.workMedia.filter(function(m){return m&&m.kind==='local'&&m.file}).map(function(m){return m.file});
  state.workPhotoIndex=0;
}
function bindFinish(){
  var b=document.getElementById('workFinish');if(!b||b.dataset.photoCoverLite==='1')return;
  b.dataset.photoCoverLite='1';b.addEventListener('click',prepareCover,true);
}
function install(){clampIndex();bindThumbs();bindHero();bindVoice();bindFinish();updatePhotoUi(false)}
var appRoot=document.getElementById('app')||document.documentElement;
var observer=new MutationObserver(function(){install()});observer.observe(appRoot,{childList:true,subtree:true});
install();
})();</scr`+`ipt>`;
