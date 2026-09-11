export const WORKBLAD_PHOTO_CAROUSEL_STYLE = String.raw`
.work-photo.has-photo{touch-action:pan-y;cursor:grab}
.work-photo.has-photo:active{cursor:grabbing}
.work-photo.has-photo img{transition:opacity .16s ease,transform .2s ease}
.work-photo.has-photo.is-photo-switching img{opacity:.42;transform:scale(.992)}
.work-photo-strip{overflow-x:auto!important;overflow-y:hidden!important;justify-content:flex-start!important;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:2px 1px 3px!important}
.work-photo-strip::-webkit-scrollbar{display:none}
.work-photo-thumb{border:0!important;padding:0!important;appearance:none;-webkit-appearance:none;cursor:pointer;transition:opacity .16s ease,transform .16s ease,box-shadow .16s ease}
.work-photo-thumb.active{transform:scale(1.06);box-shadow:0 0 0 2px #E7A98B,0 2px 8px rgba(15,39,71,.16)!important}
.work-photo-count{min-width:48px;text-align:center}
`;

export const WORKBLAD_PHOTO_CAROUSEL_SCRIPT = String.raw`<script>(function(){
var COVER_KEY='talera-workblad-cover-index-v1';
var suppressPhotoClick=false;
var lastMediaCount=-1;

function ensureCoverState(){
  if(typeof state==='undefined')return;
  if(typeof state.workCoverIndex!=='number'||!isFinite(state.workCoverIndex)){
    var saved=0;
    try{saved=Number(sessionStorage.getItem(COVER_KEY)||0)||0}catch(e){}
    state.workCoverIndex=saved;
  }
  var count=Array.isArray(state.workMedia)?state.workMedia.length:0;
  if(!count)state.workCoverIndex=0;
  else state.workCoverIndex=Math.max(0,Math.min(count-1,state.workCoverIndex));
}
function mediaList(){ensureCoverState();return Array.isArray(state.workMedia)?state.workMedia:[]}
function saveCoverIndex(){try{sessionStorage.setItem(COVER_KEY,String(state.workCoverIndex||0))}catch(e){}}
function currentMedia(){var items=mediaList();return items[state.workCoverIndex||0]||null}
function currentSrc(){var m=currentMedia();return m&&m.localUrl||''}

function rebuildThumbs(){
  var strip=document.querySelector('.work-photo-strip');
  var items=mediaList();
  if(!strip||!items.length)return;
  strip.classList.toggle('is-single',items.length<=1);
  strip.innerHTML='';
  items.forEach(function(m,i){
    var b=document.createElement('button');
    b.type='button';
    b.className='work-photo-thumb'+(i===(state.workCoverIndex||0)?' active':'');
    b.setAttribute('aria-label','Foto '+(i+1)+' als hoofdbeeld tonen');
    var img=document.createElement('img');img.alt='';img.src=m.localUrl||'';b.appendChild(img);
    b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();showPhoto(i,true)});
    strip.appendChild(b);
  });
}
function updateUi(scrollThumb){
  var items=mediaList();if(!items.length)return;
  var idx=state.workCoverIndex||0;
  var hero=document.querySelector('#workPhoto img');
  var src=currentSrc();
  if(hero&&src&&hero.src!==src){
    var wrap=document.getElementById('workPhoto');if(wrap)wrap.classList.add('is-photo-switching');
    setTimeout(function(){hero.src=src;if(wrap)wrap.classList.remove('is-photo-switching')},70);
  }
  var count=document.querySelector('.work-photo-count');
  if(count){count.classList.toggle('is-single',items.length<=1);count.textContent=items.length<=1?'1 foto':((idx+1)+' / '+items.length)}
  var thumbs=[].slice.call(document.querySelectorAll('.work-photo-thumb'));
  thumbs.forEach(function(t,i){t.classList.toggle('active',i===idx)});
  if(scrollThumb&&thumbs[idx]&&thumbs[idx].scrollIntoView)try{thumbs[idx].scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})}catch(e){}
}
function showPhoto(index,manual){
  var items=mediaList();if(items.length<=1)return;
  var count=items.length;
  state.workCoverIndex=((index%count)+count)%count;
  saveCoverIndex();updateUi(Boolean(manual));
}
function nextPhoto(dir){var items=mediaList();if(items.length<=1)return;showPhoto((state.workCoverIndex||0)+dir,true)}

function bindSwipe(el){
  if(!el||el.dataset.photoSwipeBound==='1')return;
  el.dataset.photoSwipeBound='1';
  var sx=0,sy=0,active=false;
  el.addEventListener('touchstart',function(e){
    if(!e.touches||e.touches.length!==1)return;
    if(e.target&&e.target.closest&&e.target.closest('button:not(#workPhoto)'))return;
    sx=e.touches[0].clientX;sy=e.touches[0].clientY;active=true;
  },{passive:true});
  el.addEventListener('touchend',function(e){
    if(!active)return;active=false;
    var t=e.changedTouches&&e.changedTouches[0];if(!t)return;
    var dx=t.clientX-sx,dy=t.clientY-sy;
    if(Math.abs(dx)>=42&&Math.abs(dx)>Math.abs(dy)*1.15){
      if(e.cancelable)e.preventDefault();
      suppressPhotoClick=true;
      nextPhoto(dx<0?1:-1);
      setTimeout(function(){suppressPhotoClick=false},260);
    }
  },{passive:false});
}
function bindPhoto(){
  ensureCoverState();
  var items=mediaList();
  var photo=document.getElementById('workPhoto');
  if(!photo||!items.length)return;
  bindSwipe(photo);
  if(photo.dataset.carouselClickGuard!=='1'){
    photo.dataset.carouselClickGuard='1';
    photo.addEventListener('click',function(e){if(suppressPhotoClick){e.preventDefault();e.stopImmediatePropagation()}},true);
  }
  if(items.length!==lastMediaCount){lastMediaCount=items.length;rebuildThumbs()}
  updateUi(false);
}
function bindVoiceSwipe(){
  var layer=document.getElementById('voiceLayer');
  if(!layer||mediaList().length<=1)return;
  bindSwipe(layer);
}

async function persistExistingCover(mediaId){
  if(!state.editingStoryId||!state.editingToken||!mediaId)return;
  var res=await fetch('/api/integration/stories/'+encodeURIComponent(state.editingStoryId)+'/cover',{
    method:'PUT',headers:{'content-type':'application/json','authorization':'Bearer '+state.editingToken},body:JSON.stringify({mediaId:mediaId})
  });
  var data={};try{data=await res.json()}catch(e){}
  if(!res.ok)throw new Error(data.error||'De gekozen hoofdfoto kon niet worden opgeslagen.');
}
function prepareNewCover(){
  var items=mediaList();if(!items.length)return null;
  var idx=Math.max(0,Math.min(items.length-1,state.workCoverIndex||0));
  var selected=items[idx];
  if(!state.editingStoryId&&idx>0){
    state.workMedia=[selected].concat(items.slice(0,idx),items.slice(idx+1));
    state.newPhotoFiles=state.workMedia.filter(function(m){return m&&m.kind==='local'&&m.file}).map(function(m){return m.file});
    state.workCoverIndex=0;saveCoverIndex();
  }else if(state.editingStoryId&&selected&&selected.kind==='local'&&selected.file){
    var locals=(state.newPhotoFiles||[]).slice();
    var p=locals.indexOf(selected.file);
    if(p>0)state.newPhotoFiles=[selected.file].concat(locals.slice(0,p),locals.slice(p+1));
  }
  return selected;
}
function wrapFinish(){
  var b=document.getElementById('workFinish');
  if(!b||b.dataset.photoCoverWrapped==='1'||typeof b.onclick!=='function')return;
  var original=b.onclick;b.dataset.photoCoverWrapped='1';
  b.onclick=async function(e){
    var selected=prepareNewCover();
    try{
      if(state.editingStoryId&&selected&&selected.kind==='remote'&&selected.id)await persistExistingCover(selected.id);
      return await original.call(this,e);
    }catch(error){
      state.workError=error&&error.message?error.message:'De gekozen hoofdfoto kon niet worden opgeslagen.';
      if(typeof renderWorkblad==='function')renderWorkblad();
    }
  };
}
function install(){bindPhoto();bindVoiceSwipe();wrapFinish()}
var observer=new MutationObserver(install);observer.observe(document.documentElement,{childList:true,subtree:true});
install();
})();</scr`+`ipt>`;
