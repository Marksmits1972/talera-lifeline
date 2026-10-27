
(function(){
 'use strict';
 let active=false,observer=null,video=null,touchPoint=null,ignoreClickUntil=0;
 const $=id=>document.getElementById(id);
 function resetVideo(){if(video){video.removeEventListener('ended',ended);video=null}}
 function ended(){
   if(!active)return;
   const audio=$('listen');
   if(audio&&!audio.paused&&!audio.ended)return;
   $('next')?.click();
 }
 function adjust(){
   resetVideo();
   if(!active||document.hidden)return;
   const v=$('frame')?.querySelector(':scope > video');
   if(!v)return;video=v;
   v.muted=true;v.defaultMuted=true;v.controls=false;v.playsInline=true;
   v.setAttribute('playsinline','');
   v.addEventListener('ended',ended,{once:true});
   if(v.ended)ended();else if(v.readyState>=1)void v.play().catch(()=>{});
   else v.addEventListener('loadedmetadata',()=>{if(active&&video===v)void v.play().catch(()=>{})},{once:true});
 }
 function exit(){
   if($('recStop')&&!$('recStop').hidden){
     const msg=$('recMessage');if(msg)msg.textContent='Stop eerst je stemopname.';return;
   }
   active=false;resetVideo();observer?.disconnect();observer=null;
   const vid=$('frame')?.querySelector(':scope > video');if(vid)try{vid.pause()}catch(e){}
   const audio=$('listen');if(audio&&!audio.paused)try{audio.pause()}catch(e){}
   document.body.classList.remove('tv-telling');
   $('taleraTellExit')?.remove();$('taleraTellHelp')?.remove();
   if($('recPanel'))$('recPanel').hidden=true;
   if($('speak')){$('speak').textContent='🎙 Inspreken';$('speak').setAttribute('aria-expanded','false')}
 }
 function enter(){
   if(active||!$('frame')||!$('recPanel'))return;
   active=true;document.body.classList.add('tv-telling');$('recPanel').hidden=false;
   const b=document.createElement('button');b.type='button';b.id='taleraTellExit';
   b.textContent='Klaar';b.addEventListener('click',exit);document.body.append(b);
   const h=document.createElement('div');h.id='taleraTellHelp';
   h.textContent='Vertel op je eigen tempo · tik of swipe voor de volgende foto';document.body.append(h);
   const frame=$('frame');
   observer=new MutationObserver(adjust);observer.observe(frame,{childList:true});
   frame.addEventListener('touchstart',e=>{if(e.touches.length===1)touchPoint={x:e.touches[0].clientX,y:e.touches[0].clientY}},{passive:true});
   frame.addEventListener('touchend',e=>{
      if(!touchPoint)return;
      const dx=e.changedTouches[0].clientX-touchPoint.x,dy=e.changedTouches[0].clientY-touchPoint.y;
      touchPoint=null;if(Math.abs(dx)>38||Math.abs(dy)>38)ignoreClickUntil=Date.now()+650;
   },{passive:true});
   adjust();
 }
 document.addEventListener('click',e=>{
   const t=e.target;if(!(t instanceof Element))return;
   if(t.closest('#speak')){setTimeout(enter,0);return}
   if(active&&t.closest('#frame')&&!t.closest('button')&&Date.now()>ignoreClickUntil)$('next')?.click();
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden){const v=$('frame')?.querySelector(':scope > video');v?.pause()}else if(active)adjust()});
 window.addEventListener('pagehide',()=>{active=false;resetVideo();observer?.disconnect()});
})();
