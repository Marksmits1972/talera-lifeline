/* TALERA Vertelmodus Sync V2: handmatig naar volgende/vorige beeld; registreer cue na beeldselectie. */
function stepPhoto(g,n){
 if(!g.media.length)return;
 idx=((idx+n)%g.media.length+g.media.length)%g.media.length;
 const frame=$('frame');
 const old=frame?.querySelector(':scope > img,:scope > video,:scope > .empty');
 if(old){
   const tmp=document.createElement('div');tmp.innerHTML=frameInner(g);
   old.replaceWith(tmp.firstElementChild);
 }
 const video=frame?.querySelector(':scope > video');
 if(video&&$('recPanel')&&!$('recPanel').hidden){
   video.muted=true;video.defaultMuted=true;video.playsInline=true;
   video.setAttribute('playsinline','');video.controls=false;
   if($('recPanel').classList.contains('is-recording'))void video.play().catch(()=>{});
   else if(!video.paused)video.pause();
 }
 if($('pos'))$('pos').textContent=(idx+1)+' / '+g.media.length;
 taleraVoiceMark(idx);
}


