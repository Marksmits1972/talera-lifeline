
(function(){
'use strict';
let active=false,observer=null,video=null,touchPoint=null,ignoreClickUntil=0;
const $=id=>document.getElementById(id);
function recording(){return !!$('recPanel')?.classList.contains('is-recording')}
function hasVoice(){return !!$('listen')?.src}
function clearVideo(){if(video){video.removeEventListener('ended',ended);video=null}}
function ended(){
 if(!active)return;
 if(recording()||!hasVoice())$('next')?.click();
}
function adjust(){
 clearVideo();
 if(!active||document.hidden)return;
 const v=$('frame')?.querySelector(':scope > video');
 if(!v)return;video=v;
 v.muted=true;v.defaultMuted=true;v.controls=false;v.playsInline=true;v.setAttribute('playsinline','');
 v.addEventListener('ended',ended,{once:true});
 const play=()=>{
   if(!active||video!==v)return;
   if(recording()||!hasVoice())void v.play().catch(()=>{});
   else if(!v.paused)try{v.pause()}catch(e){}
 };
 if(v.ended)ended();else if(v.readyState>=1)play();
 else v.addEventListener('loadedmetadata',play,{once:true});
}
function exit(){
 if($('recStop')&&!$('recStop').hidden){
  const msg=$('recMessage');if(msg)msg.textContent='Stop eerst de opname.';return;
 }
 active=false;clearVideo();observer?.disconnect();observer=null;
 const v=$('frame')?.querySelector(':scope > video');
 if(v){try{v.pause()}catch(e){}v.controls=true}
 const a=$('listen');if(a&&!a.paused)try{a.pause()}catch(e){}
 document.body.classList.remove('tv-telling');
 $('taleraTellExit')?.remove();
 if($('recPanel'))$('recPanel').hidden=true;
 const speak=$('speak');
 if(speak){speak.textContent='🎙 Inspreken';speak.setAttribute('aria-expanded','false')}
}
function enter(){
 if(active||!$('frame')||!$('recPanel'))return;
 active=true;document.body.classList.add('tv-telling');$('recPanel').hidden=false;
 const b=document.createElement('button');b.type='button';b.id='taleraTellExit';b.textContent='Klaar';
 b.setAttribute('aria-label','Terug naar mijn herinnering');b.addEventListener('click',exit);document.body.append(b);
 const f=$('frame');observer=new MutationObserver(adjust);observer.observe(f,{childList:true});
 f.addEventListener('touchstart',e=>{if(e.touches.length===1)touchPoint={x:e.touches[0].clientX,y:e.touches[0].clientY}},{passive:true});
 f.addEventListener('touchend',e=>{
  if(!touchPoint)return;
  const dx=e.changedTouches[0].clientX-touchPoint.x,dy=e.changedTouches[0].clientY-touchPoint.y;touchPoint=null;
  if(Math.abs(dx)>35||Math.abs(dy)>35)ignoreClickUntil=Date.now()+680;
 },{passive:true});
 adjust();
}
document.addEventListener('click',e=>{
 const t=e.target;if(!(t instanceof Element))return;
 if(t.closest('#speak')){setTimeout(enter,0);return}
 if(t.closest('#recStop,#recPause,#recStart')&&active){setTimeout(adjust,80);return}
 if(active&&t.closest('#frame')&&!t.closest('button')&&Date.now()>ignoreClickUntil)$('next')?.click();
});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){const v=$('frame')?.querySelector(':scope > video');if(v)try{v.pause()}catch(e){}}
 else if(active)adjust();
});
window.addEventListener('pagehide',()=>{active=false;clearVideo();observer?.disconnect()});
})();
