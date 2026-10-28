
function dispose(){
 const poster=$('taleraVideoPreview');if(poster)poster.remove();
 if(state.media){let old=state.media;if(old.pause)old.pause();if(old.tagName==='VIDEO'){old.removeAttribute('src');try{old.load()}catch(e){}}old.remove();state.media=null}
}
const taleraV5Fallback='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="520" height="390"><rect width="520" height="390" fill="#e7efec"/><circle cx="260" cy="170" r="44" fill="#d1e2dc"/><path d="M249 148v44l37-22z" fill="#416979"/><text x="260" y="258" text-anchor="middle" font-family="Arial" font-size="18" fill="#536d76">Video</text></svg>');
function show(n){
 if(n<0||n>=state.items.length)return;
 if(state.media&&state.index===n)return;
 dispose();state.index=n;
 const item=state.items[n],video=item.type==='video';
 const el=document.createElement(video?'video':'img');el.dataset.index=n;
 if(video){
  const poster=document.createElement('img');
  poster.id='taleraVideoPreview';poster.className='talera-video-preview';
  poster.src=item.poster||taleraV5Fallback;poster.alt='Voorvertoning van video';
  $('view').insertBefore(poster,$('count'));
  const reveal=()=>{if(state.media===el)poster.hidden=false};
  const hide=()=>{if(state.media===el&&!el.paused&&el.readyState>=2)poster.hidden=true};
  el.addEventListener('playing',hide);el.addEventListener('loadeddata',hide);
  el.addEventListener('pause',reveal);el.addEventListener('ended',reveal);
  el.addEventListener('waiting',reveal);el.addEventListener('error',reveal);
  el.controls=false;el.muted=true;el.defaultMuted=true;el.playsInline=true;
  el.setAttribute('playsinline','');el.setAttribute('webkit-playsinline','');
  el.preload='auto';el.disablePictureInPicture=true;
  el.addEventListener('loadedmetadata',function(){if(state.media===el&&state.mode==='playing')syncVideo(state.lastCue)});
 }else el.alt=item.name||'Herinnering';
 el.src=item.url;state.media=el;
 $('view').insertBefore(el,$('count'));
 $('count').textContent=(n+1)+' / '+state.items.length;
 $('prev').disabled=n===0;$('next').disabled=n===state.items.length-1;
 if(video&&state.mode==='recording')el.play().catch(()=>{});
}
function taleraV5SetPoster(index,blob,owned){
 if(!Number.isInteger(index)||index<0||index>=state.items.length||!(blob instanceof Blob)||!blob.size)return;
 const item=state.items[index];if(item.type!=='video')return;
 if(item.poster){URL.revokeObjectURL(item.poster);const i=owned.indexOf(item.poster);if(i>=0)owned.splice(i,1)}
 item.poster=URL.createObjectURL(blob);owned.push(item.poster);
 if(state.index===index){
  const img=$('taleraVideoPreview');
  if(img){img.src=item.poster;img.hidden=Boolean(state.media?.tagName==='VIDEO'&&!state.media.paused&&state.media.readyState>=2)}
 }
}
