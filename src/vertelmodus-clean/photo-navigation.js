/* TALERA clean Vertelmodus V1. One photo stage, manual recording cues. */
function stepPhoto(g,n){
 if(!g.media.length)return;
 idx=((idx+n)%g.media.length+g.media.length)%g.media.length;
 taleraVoiceMark(idx);
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
   void video.play().catch(()=>{});
 }
 if($('pos'))$('pos').textContent=(idx+1)+' / '+g.media.length;
}

