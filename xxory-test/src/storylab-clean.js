import { STORYLAB_CLEAN_PAGE_HTML, STORYLAB_CLEAN_PAGE_REVISION } from './storylab-clean-page.js';

const STORYLAB_CLEAN_UX_REVISION = 'storylab-clean-ux-20260923-r19h1';

const htmlHeaders = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'x-storylab-clean-revision': STORYLAB_CLEAN_PAGE_REVISION,
  'x-storylab-clean-ux': STORYLAB_CLEAN_UX_REVISION
};

const jsonHeaders = { 'cache-control': 'no-store, max-age=0' };
const DEFAULT_STATE = {
  title: '',
  date: '',
  storyText: '',
  note: '',
  photos: [],
  currentIndex: 0,
  fit: 'cover',
  audioId: ''
};

const UX_STYLE = `<style id="talera-storylab-clean-ux-r19h1">
html,body,.screen{overscroll-behavior:none}.sheet{--talera-sheet-open-height:calc(100dvh - 12px);z-index:22!important;height:var(--talera-sheet-open-height)!important;transform:translate3d(0,0,0);cursor:grab;will-change:transform;backface-visibility:hidden;-webkit-backface-visibility:hidden;transition:transform .34s cubic-bezier(.22,.78,.25,1),box-shadow .24s ease!important;overflow:hidden;touch-action:none}.sheet.open{height:var(--talera-sheet-open-height)!important;cursor:default;touch-action:pan-y;border-radius:22px 22px 0 0}.sheet.dragging{transition:none!important;cursor:grabbing;user-select:none;-webkit-user-select:none;touch-action:none}.sheet.dragging .handle{background:#aeb8c1}.sheet-editor{opacity:0;transform:translateY(8px);transition:opacity .20s ease,transform .22s ease;min-height:0}.sheet.open .sheet-editor,.sheet.dragging .sheet-editor{display:flex}.sheet.open .sheet-editor,.sheet.dragging .sheet-editor{opacity:1;transform:translateY(0)}.sheet.open .sheet-text{display:none}.sheet.dragging .sheet-text{opacity:0}.sheet.open .sheet-editor{height:calc(100% - 26px);padding:0 18px calc(16px + env(safe-area-inset-bottom));position:relative;min-height:0}.sheet textarea{cursor:text;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;min-height:0}.sheet.open textarea{background:transparent!important;border-radius:0!important;padding:18px 6px calc(96px + env(safe-area-inset-bottom))!important;font-size:17px!important;line-height:1.55!important}.sheet.open .sheet-close{position:absolute;right:18px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:2;box-shadow:0 5px 18px rgba(16,42,62,.10)}.sheet-close{transition:transform .16s ease}.sheet-close:active{transform:scale(.97)}
.talera-publish-timeline{left:50%!important;right:auto!important;width:min(58vw,220px)!important;min-width:176px!important;height:38px!important;bottom:66px!important;transform:translateX(-50%)!important;padding:0 18px!important;font-size:12px!important;white-space:nowrap!important;box-shadow:0 6px 18px rgba(4,20,32,.13)!important}
.screen.sheet-open .talera-publish-timeline{transform:translate(-50%,10px)!important}
.talera-story-carousel{position:absolute;z-index:1;inset:0;overflow:hidden;opacity:0;pointer-events:none;transition:opacity .18s ease;touch-action:none;overscroll-behavior:none}.screen.has-photo .talera-story-carousel.ready{opacity:1;pointer-events:auto}.talera-story-page{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center;transform:translate3d(0,0,0);will-change:transform;user-select:none;-webkit-user-drag:none;pointer-events:none}.talera-story-carousel.dragging .talera-story-page{transition:none!important}.talera-story-dots{position:absolute;z-index:6;left:50%;bottom:244px;transform:translateX(-50%);display:flex;gap:6px;align-items:center;justify-content:center;min-height:22px;padding:5px 9px;border-radius:999px;background:rgba(8,28,43,.20);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;pointer-events:none;transition:opacity .18s ease}.screen.has-photo .talera-story-dots.show{opacity:1}.talera-story-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.62);box-shadow:0 1px 5px rgba(4,20,32,.18)}.talera-story-dot.active{background:#fff;transform:scale(1.35)}.talera-story-wash{position:absolute;z-index:21;inset:0;background:#f8f7f2;opacity:0;pointer-events:none;will-change:opacity;backface-visibility:hidden;-webkit-backface-visibility:hidden;transition:opacity .34s cubic-bezier(.22,.78,.25,1)}
.bg-photo{z-index:0}.shade{z-index:2}.top,.empty,.mic-zone,.photo-ui,.sheet{isolation:isolate}.photo-ui{position:absolute;inset:0;z-index:8;pointer-events:none}.photo-ui .photo-voice,.photo-ui .photo-more,.photo-ui button{pointer-events:auto}
@media(max-height:760px){.sheet{--talera-sheet-height:50px}.talera-publish-timeline{bottom:58px!important;height:36px!important;width:min(60vw,210px)!important;min-width:168px!important}.talera-story-dots{bottom:214px}}
</style>`;

const EARLY_SESSION_SCRIPT = `<script id="talera-storylab-clean-fresh-session-r19h1">
(()=>{
  const clientKey='talera.storylab.clean.client';
  const sessionKey='talera.storylab.clean.session-client';
  const params=new URLSearchParams(location.search);
  const navigation=(performance.getEntriesByType&&performance.getEntriesByType('navigation')[0])||null;
  let navType=navigation&&navigation.type?navigation.type:'navigate';
  if(!navigation&&performance.navigation&&performance.navigation.type===1)navType='reload';
  const keepExisting=params.get('resume')==='1'||navType==='reload'||navType==='back_forward';
  let client=keepExisting?(sessionStorage.getItem(sessionKey)||localStorage.getItem(clientKey)||''):'';
  if(!client){
    client=(globalThis.crypto&&crypto.randomUUID)?crypto.randomUUID():('story-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12));
  }
  localStorage.setItem(clientKey,client);
  sessionStorage.setItem(sessionKey,client);
})();
</script>`;

const LATE_UX_SCRIPT = `<script id="talera-storylab-clean-late-ux-r19h1">
(()=>{
  let sheet=document.getElementById('sheet');
  const storyText=document.getElementById('storyText');
  const screen=document.getElementById('screen');
  const handle=document.getElementById('sheetHandle');
  const preview=document.getElementById('sheetPreview');
  const closeButton=document.getElementById('sheetClose');
  const bg=document.getElementById('bgPhoto');
  const shade=document.querySelector('.shade');
  const topArea=document.querySelector('.top');
  const photoVoice=document.querySelector('.photo-voice');
  const photoMore=document.querySelector('.photo-more');
  const client=localStorage.getItem('talera.storylab.clean.client')||'';
  if(!sheet||!screen)return;

  /* Replace only the sheet shell. This removes the older sheet gesture listeners
     without replacing its children, so recording/transcription keeps the same DOM nodes. */
  const cleanSheet=sheet.cloneNode(false);
  while(sheet.firstChild)cleanSheet.appendChild(sheet.firstChild);
  sheet.replaceWith(cleanSheet);
  sheet=cleanSheet;

  const wash=document.createElement('div');
  wash.className='talera-story-wash';
  wash.setAttribute('aria-hidden','true');
  if(shade&&shade.parentNode)shade.parentNode.insertBefore(wash,shade.nextSibling);
  else screen.prepend(wash);

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  let geometry={openHeight:0,closedHeight:0,maxOffset:0};
  let sheetOffset=0;
  let touch=null;
  let raf=0,pendingOffset=null,dragMoved=false;

  if(handle)handle.onclick=null;
  if(preview)preview.onclick=null;
  if(closeButton)closeButton.onclick=null;

  function measure(){
    const h=Math.max(320,screen.getBoundingClientRect().height||window.innerHeight||640);
    const closed=h<=760?50:56;
    /* Fully opened reading mode uses almost the complete TALERA viewport.
       This gives long transcripts a real reading surface instead of a half-height editor. */
    const topGap=12;
    const open=Math.max(closed+120,h-topGap);
    geometry={openHeight:open,closedHeight:closed,maxOffset:Math.max(0,open-closed)};
    sheet.style.setProperty('--talera-sheet-open-height',open+'px');
  }
  function progressFor(offset){
    return geometry.maxOffset<=0?1:clamp(1-offset/geometry.maxOffset,0,1);
  }
  function paint(offset){
    sheetOffset=clamp(offset,0,geometry.maxOffset);
    const p=progressFor(sheetOffset);
    sheet.style.transform='translate3d(0,'+sheetOffset.toFixed(2)+'px,0)';
    wash.style.opacity=String(Math.pow(p,.88)*.94);
  }
  function queuePaint(offset){
    pendingOffset=offset;
    if(raf)return;
    raf=requestAnimationFrame(()=>{
      raf=0;
      if(pendingOffset!=null){const next=pendingOffset;pendingOffset=null;paint(next)}
    });
  }
  function setDragVisual(active){
    sheet.classList.toggle('dragging',active);
    wash.style.transition=active?'none':'opacity .34s cubic-bezier(.22,.78,.25,1)';
  }
  function setSheet(open,animate=true){
    if(!geometry.openHeight)measure();
    if(!animate){sheet.style.transition='none';wash.style.transition='none'}
    else{sheet.style.transition='transform .34s cubic-bezier(.22,.78,.25,1),box-shadow .24s ease';wash.style.transition='opacity .34s cubic-bezier(.22,.78,.25,1)'}
    setDragVisual(false);
    sheet.classList.toggle('open',Boolean(open));
    screen.classList.toggle('sheet-open',Boolean(open));
    sheet.setAttribute('aria-expanded',open?'true':'false');
    paint(open?0:geometry.maxOffset);
    if(!open&&storyText){try{storyText.blur()}catch(e){}}
    if(!animate)requestAnimationFrame(()=>{sheet.style.transition='';wash.style.transition=''});
  }

  measure();
  setSheet(sheet.classList.contains('open'),false);

  function beginSheetDrag(y,startOffset){
    dragMoved=false;
    setDragVisual(true);
    /* Reveal the text surface during the gesture without changing the settled open state. */
    touch.mode='sheet';
    touch.startY=y;
    touch.startOffset=startOffset;
    touch.lastY=y;
    touch.lastT=performance.now();
  }

  sheet.addEventListener('touchstart',event=>{
    if(event.touches.length!==1)return;
    const target=event.target;
    if(target&&target.closest&&target.closest('button'))return;
    const y=event.touches[0].clientY;
    const opened=screen.classList.contains('sheet-open');
    touch={mode:'pending',startY:y,startOffset:sheetOffset,lastY:y,lastT:performance.now(),startScroll:storyText?storyText.scrollTop:0,opened,target};
    if(!opened||!(target&&target.closest&&target.closest('textarea'))){
      beginSheetDrag(y,sheetOffset);
      if(event.cancelable)event.preventDefault();
    }
  },{passive:false,capture:true});

  sheet.addEventListener('touchmove',event=>{
    if(!touch||event.touches.length!==1)return;
    const y=event.touches[0].clientY;
    const dy=y-touch.startY;

    /* When the sheet is open, upward gestures in the text remain native scrolling.
       A downward pull at the top hands control back to the sheet. */
    if(touch.mode==='pending'){
      const atTop=!storyText||storyText.scrollTop<=1;
      if(dy>7&&atTop){
        beginSheetDrag(touch.startY,0);
      }else if(dy<-7||!atTop){
        touch.mode='scroll';
        return;
      }else{
        return;
      }
    }
    if(touch.mode==='scroll')return;

    if(Math.abs(dy)>3)dragMoved=true;
    queuePaint(touch.startOffset+dy);
    touch.lastY=y;touch.lastT=performance.now();
    if(event.cancelable)event.preventDefault();
  },{passive:false,capture:true});

  function finishTouch(event,cancelled=false){
    if(!touch)return;
    if(touch.mode==='scroll'||touch.mode==='pending'){touch=null;return}
    if(raf){cancelAnimationFrame(raf);raf=0}
    if(pendingOffset!=null){paint(pendingOffset);pendingOffset=null}
    const changed=event.changedTouches&&event.changedTouches[0];
    const y=changed?changed.clientY:touch.lastY;
    const now=performance.now();
    const dt=Math.max(12,now-touch.lastT);
    const velocity=(y-touch.lastY)/dt;
    const projected=clamp(sheetOffset+velocity*125,0,geometry.maxOffset);
    const open=!cancelled&&projected<geometry.maxOffset*.54;
    const wasTap=!dragMoved&&Math.abs(y-touch.startY)<5;
    const startedOpen=touch.opened;
    touch=null;
    setDragVisual(false);
    if(wasTap&&!startedOpen)setSheet(true,true);
    else setSheet(open,true);
  }
  sheet.addEventListener('touchend',event=>finishTouch(event,false),{passive:false,capture:true});
  sheet.addEventListener('touchcancel',event=>finishTouch(event,true),{passive:false,capture:true});

  /* Mouse/trackpad fallback without participating in iPhone touch handling. */
  let mouse=null;
  sheet.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='mouse')return;
    const target=event.target;
    if(target&&target.closest&&target.closest('textarea,button'))return;
    mouse={id:event.pointerId,startY:event.clientY,startOffset:sheetOffset,lastY:event.clientY,lastT:performance.now()};
    setDragVisual(true);
    try{sheet.setPointerCapture(event.pointerId)}catch(e){}
  });
  sheet.addEventListener('pointermove',event=>{
    if(!mouse||mouse.id!==event.pointerId)return;
    queuePaint(mouse.startOffset+(event.clientY-mouse.startY));
    mouse.lastY=event.clientY;mouse.lastT=performance.now();
  });
  sheet.addEventListener('pointerup',event=>{
    if(!mouse||mouse.id!==event.pointerId)return;
    if(raf){cancelAnimationFrame(raf);raf=0}
    if(pendingOffset!=null){paint(pendingOffset);pendingOffset=null}
    const open=sheetOffset<geometry.maxOffset*.54;
    mouse=null;setDragVisual(false);setSheet(open,true);
  });

  if(closeButton)closeButton.addEventListener('click',()=>setSheet(false,true));
  window.addEventListener('resize',()=>{
    if(touch||mouse)return;
    const open=screen.classList.contains('sheet-open');
    measure();setSheet(open,false);
  },{passive:true});

  const carousel=document.createElement('div');
  carousel.className='talera-story-carousel';
  carousel.setAttribute('aria-label','Foto’s van deze herinnering');
  carousel.innerHTML='<img class="talera-story-page previous" alt=""><img class="talera-story-page current" alt=""><img class="talera-story-page next" alt="">';
  const dots=document.createElement('div');dots.className='talera-story-dots';dots.setAttribute('aria-hidden','true');
  if(shade&&shade.parentNode){shade.parentNode.insertBefore(carousel,shade);shade.parentNode.insertBefore(dots,shade.nextSibling)}else{screen.prepend(carousel);screen.appendChild(dots)}
  const previous=carousel.querySelector('.previous'),current=carousel.querySelector('.current'),next=carousel.querySelector('.next');
  const cache=new Map();
  let viewState=null,photoPointer=null,photoStartX=0,photoStartY=0,photoLastX=0,photoLastY=0,photoMode='',settling=false,carouselReady=false,prepareToken=0;

  function stateUrl(){return '/api/storylab-clean/state?client='+encodeURIComponent(client)}
  function photoUrl(id){return '/api/storylab-clean/photo?id='+encodeURIComponent(id)+'&client='+encodeURIComponent(client)}
  async function readState(){
    if(!client)return null;
    try{const res=await fetch(stateUrl(),{cache:'no-store'});if(!res.ok)return null;return await res.json()}catch(e){return null}
  }
  async function persistCurrentIndex(){
    if(!client||!viewState)return;
    const wanted=Number(viewState.currentIndex||0);
    try{
      const bridge=window.__taleraStoryLabMedia;
      if(bridge&&bridge.setIndex)bridge.setIndex(wanted);
      if(bridge&&bridge.isUploading&&bridge.isUploading())return;
      const latest=await readState();
      if(!latest)return;
      latest.currentIndex=wanted;
      await fetch(stateUrl(),{
        method:'PUT',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(latest),
        cache:'no-store'
      });
    }catch(e){}
  }
  async function sourceFor(photo){
    if(!photo||!photo.id)return '';
    if(cache.has(photo.id))return cache.get(photo.id);
    const bridge=window.__taleraStoryLabMedia;
    const local=bridge&&bridge.getUrl?bridge.getUrl(photo.id):'';
    if(local){cache.set(photo.id,local);return local}
    const res=await fetch(photoUrl(photo.id),{cache:'force-cache'});if(!res.ok)throw new Error('photo');
    const blob=await res.blob(),url=URL.createObjectURL(blob);cache.set(photo.id,url);return url;
  }
  function normalized(index,count){return ((index%count)+count)%count}
  function setTransform(node,x,animate){
    node.style.transition=animate?'transform .30s cubic-bezier(.22,.82,.25,1)':'none';
    node.style.transform='translate3d('+Math.round(x)+'px,0,0)';
  }
  async function setPage(node,index,token){
    if(!viewState||!viewState.photos||!viewState.photos.length){node.removeAttribute('src');return false}
    const photo=viewState.photos[normalized(index,viewState.photos.length)];
    try{
      const src=await sourceFor(photo);
      if(token!==prepareToken)return false;
      if(node.dataset.photoId!==photo.id){node.dataset.photoId=photo.id;node.src=src}
      node.style.objectFit=viewState.fit==='contain'?'contain':'cover';
      if(node.decode){try{await node.decode()}catch(e){}}
      return token===prepareToken&&Boolean(node.src);
    }catch(e){return false}
  }
  function syncDots(){
    if(!viewState||viewState.photos.length<=1){dots.classList.remove('show');dots.innerHTML='';return}
    dots.innerHTML=viewState.photos.map((_,index)=>'<span class="talera-story-dot'+(index===viewState.currentIndex?' active':'')+'"></span>').join('');
    dots.classList.add('show');
  }
  async function preparePages(){
    const token=++prepareToken;
    carouselReady=false;
    if(!viewState||!Array.isArray(viewState.photos)||viewState.photos.length<=1){carousel.classList.remove('ready');syncDots();return}
    const w=screen.getBoundingClientRect().width;
    setTransform(previous,-w,false);setTransform(current,0,false);setTransform(next,w,false);
    const loaded=await Promise.all([
      setPage(previous,viewState.currentIndex-1,token),
      setPage(current,viewState.currentIndex,token),
      setPage(next,viewState.currentIndex+1,token)
    ]);
    if(token!==prepareToken)return;
    carouselReady=loaded.every(Boolean);
    if(carouselReady)carousel.classList.add('ready');
    syncDots();
  }
  function localState(){
    try{
      const bridge=window.__taleraStoryLabMedia;
      const live=bridge&&bridge.getState?bridge.getState():null;
      if(!live||!Array.isArray(live.photos)||!live.photos.length)return null;
      return Object.assign({},live,{photos:live.photos.slice()});
    }catch(e){return null}
  }
  function prewarm(photo){
    sourceFor(photo).then(src=>{
      if(!src)return;
      const img=new Image();img.src=src;
      if(img.decode)img.decode().catch(()=>{});
    }).catch(()=>{});
  }
  async function refreshCarousel(){
    const fresh=localState()||await readState();if(!fresh)return;
    fresh.currentIndex=clamp(Number(fresh.currentIndex||0),0,Math.max(0,(fresh.photos||[]).length-1));
    viewState=fresh;
    (viewState.photos||[]).forEach(prewarm);
    await preparePages();
  }
  function settlePhoto(direction){
    if(!viewState||viewState.photos.length<=1)return;
    viewState.currentIndex=normalized(viewState.currentIndex+direction,viewState.photos.length);
    const chosen=direction>0?next:previous;
    if(chosen&&chosen.src&&bg){bg.src=chosen.src;bg.style.objectFit=viewState.fit==='contain'?'contain':'cover'}
    syncDots();
    persistCurrentIndex();
    setTimeout(()=>{preparePages()},20);
  }
  let photoTouch=null;
  function finishPhotoSwipe(dx,dy){
    if(settling||!viewState||viewState.photos.length<=1)return;
    const w=screen.getBoundingClientRect().width;
    const horizontal=photoMode==='horizontal'&&Math.abs(dx)>Math.abs(dy)*1.08;
    const commit=horizontal&&Math.abs(dx)>=Math.min(52,w*.12);
    carousel.classList.remove('dragging');
    if(!horizontal){
      setTransform(previous,-w,true);setTransform(current,0,true);setTransform(next,w,true);
      photoMode='';
      return;
    }
    settling=true;
    if(commit){
      const direction=dx<0?1:-1;
      const target=direction>0?-w:w;
      setTransform(previous,target-w,true);
      setTransform(current,target,true);
      setTransform(next,target+w,true);
      setTimeout(()=>{
        settlePhoto(direction);
        settling=false;
        photoMode='';
      },265);
    }else{
      setTransform(previous,-w,true);setTransform(current,0,true);setTransform(next,w,true);
      setTimeout(()=>{settling=false;photoMode=''},265);
    }
  }

  carousel.addEventListener('touchstart',event=>{
    if(event.touches.length!==1||settling||!carouselReady||screen.classList.contains('sheet-open')||!viewState||viewState.photos.length<=1)return;
    const t=event.touches[0];
    photoTouch={startX:t.clientX,startY:t.clientY,lastX:t.clientX,lastY:t.clientY};
    photoStartX=photoLastX=t.clientX;
    photoStartY=photoLastY=t.clientY;
    photoMode='';
    carousel.classList.add('dragging');
  },{passive:true,capture:true});

  carousel.addEventListener('touchmove',event=>{
    if(!photoTouch||event.touches.length!==1||settling)return;
    const t=event.touches[0];
    photoLastX=photoTouch.lastX=t.clientX;
    photoLastY=photoTouch.lastY=t.clientY;
    const dx=t.clientX-photoTouch.startX;
    const dy=t.clientY-photoTouch.startY;
    if(!photoMode){
      if(Math.abs(dx)>=5&&Math.abs(dx)>Math.abs(dy)*1.08)photoMode='horizontal';
      else if(Math.abs(dy)>=9&&Math.abs(dy)>Math.abs(dx)*1.12)photoMode='vertical';
    }
    if(photoMode!=='horizontal')return;
    if(event.cancelable)event.preventDefault();
    event.stopPropagation();
    const w=screen.getBoundingClientRect().width;
    setTransform(previous,dx-w,false);
    setTransform(current,dx,false);
    setTransform(next,dx+w,false);
  },{passive:false,capture:true});

  carousel.addEventListener('touchend',event=>{
    if(!photoTouch)return;
    const t=event.changedTouches&&event.changedTouches[0];
    const dx=(t?t.clientX:photoTouch.lastX)-photoTouch.startX;
    const dy=(t?t.clientY:photoTouch.lastY)-photoTouch.startY;
    photoTouch=null;
    if(photoMode==='horizontal'){
      event.stopPropagation();
      if(event.cancelable)event.preventDefault();
    }
    finishPhotoSwipe(dx,dy);
  },{passive:false,capture:true});

  carousel.addEventListener('touchcancel',event=>{
    if(!photoTouch)return;
    const dx=photoTouch.lastX-photoTouch.startX;
    const dy=photoTouch.lastY-photoTouch.startY;
    photoTouch=null;
    finishPhotoSwipe(0,dy);
  },{passive:true,capture:true});

  /* Mouse fallback for desktop testing; iPhone uses the touch path above. */
  carousel.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='mouse'||settling||!carouselReady||screen.classList.contains('sheet-open')||!viewState||viewState.photos.length<=1)return;
    photoPointer=event.pointerId;
    photoStartX=photoLastX=event.clientX;
    photoStartY=photoLastY=event.clientY;
    photoMode='';
    carousel.classList.add('dragging');
    try{carousel.setPointerCapture(event.pointerId)}catch(e){}
  });
  carousel.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'||photoPointer!==event.pointerId||settling)return;
    photoLastX=event.clientX;photoLastY=event.clientY;
    const dx=photoLastX-photoStartX,dy=photoLastY-photoStartY;
    if(!photoMode){
      if(Math.abs(dx)>=4&&Math.abs(dx)>Math.abs(dy)*1.05)photoMode='horizontal';
      else if(Math.abs(dy)>=9&&Math.abs(dy)>Math.abs(dx)*1.14)photoMode='vertical';
    }
    if(photoMode!=='horizontal')return;
    const w=screen.getBoundingClientRect().width;
    setTransform(previous,dx-w,false);setTransform(current,dx,false);setTransform(next,dx+w,false);
  });
  carousel.addEventListener('pointerup',event=>{
    if(event.pointerType!=='mouse'||photoPointer!==event.pointerId)return;
    const dx=photoLastX-photoStartX,dy=photoLastY-photoStartY;
    photoPointer=null;
    finishPhotoSwipe(dx,dy);
  });

  const observer=new MutationObserver(()=>{if(screen.classList.contains('has-photo'))setTimeout(refreshCarousel,40);else{carouselReady=false;carousel.classList.remove('ready');dots.classList.remove('show')}});
  observer.observe(screen,{attributes:true,attributeFilter:['class']});
  window.addEventListener('talera-storylab-mediachange',()=>setTimeout(refreshCarousel,0));
  window.addEventListener('pageshow',refreshCarousel);
  setTimeout(refreshCarousel,60);
  setTimeout(refreshCarousel,700);

  setTimeout(()=>{
    const publish=document.getElementById('timelinePublish');
    if(publish)publish.textContent='Plaats op tijdlijn';
  },0);
})();
</script>`;

function storyLabHtml() {
  return STORYLAB_CLEAN_PAGE_HTML
    .replace('</head>', UX_STYLE + '</head>')
    .replace('<body>', '<body>' + EARLY_SESSION_SCRIPT)
    .replace('</body>', LATE_UX_SCRIPT + '</body>');
}

function safeClient(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value) ? value : null;
}

function safeId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value) ? value : null;
}

function idFromUrl(url, kind) {
  const queryId = safeId(url.searchParams.get('id'));
  if (queryId) return queryId;
  const prefix = '/api/storylab-clean/' + kind + '&id=';
  if (url.pathname.startsWith(prefix)) {
    return safeId(decodeURIComponent(url.pathname.slice(prefix.length)));
  }
  return null;
}

function cleanState(input) {
  const source = input && typeof input === 'object' ? input : {};
  const photos = Array.isArray(source.photos) ? source.photos.slice(0, 12).map((photo) => ({
    id: safeId(photo?.id) || '',
    name: String(photo?.name || 'foto').slice(0, 180),
    type: String(photo?.type || 'image/jpeg').slice(0, 100),
    createdAt: Number(photo?.createdAt || Date.now())
  })).filter((photo) => photo.id) : [];
  const maxIndex = Math.max(0, photos.length - 1);
  return {
    title: String(source.title || '').slice(0, 140),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(source.date || '')) ? String(source.date) : '',
    storyText: String(source.storyText || '').slice(0, 50000),
    note: String(source.note || '').slice(0, 10000),
    photos,
    currentIndex: Math.min(Math.max(0, Number(source.currentIndex || 0)), maxIndex),
    fit: source.fit === 'contain' ? 'contain' : 'cover',
    audioId: safeId(source.audioId) || ''
  };
}

function stateKey(client) {
  return `storylab-clean/${client}/state.json`;
}

function mediaKey(client, kind, id) {
  return `storylab-clean/${client}/${kind}/${id}`;
}

async function handleState(request, env, url, client) {
  if (request.method === 'GET') {
    const object = await env.MEDIA.get(stateKey(client));
    if (!object) return Response.json(DEFAULT_STATE, { headers: jsonHeaders });
    try {
      return Response.json(cleanState(JSON.parse(await object.text())), { headers: jsonHeaders });
    } catch {
      return Response.json(DEFAULT_STATE, { headers: jsonHeaders });
    }
  }
  if (request.method === 'PUT') {
    let input;
    try { input = await request.json(); } catch { return Response.json({ error: 'invalid_json' }, { status: 400, headers: jsonHeaders }); }
    const state = cleanState(input);
    await env.MEDIA.put(stateKey(client), JSON.stringify(state), {
      httpMetadata: { contentType: 'application/json; charset=utf-8' }
    });
    return Response.json({ ok: true, state }, { headers: jsonHeaders });
  }
  return new Response('Method not allowed', { status: 405 });
}

async function handleBinary(request, env, url, client, kind, expectedPrefix, maxBytes) {
  const id = idFromUrl(url, kind);
  if (!id) return Response.json({ error: 'invalid_id' }, { status: 400, headers: jsonHeaders });
  const key = mediaKey(client, kind === 'photo' ? 'photos' : 'audio', id);

  if (request.method === 'GET') {
    const object = await env.MEDIA.get(key);
    if (!object) return new Response('Not found', { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'private, max-age=3600');
    return new Response(object.body, { headers });
  }

  if (request.method === 'DELETE') {
    await env.MEDIA.delete(key);
    return Response.json({ ok: true }, { headers: jsonHeaders });
  }

  if (request.method === 'PUT') {
    const type = request.headers.get('content-type') || '';
    if (!type.startsWith(expectedPrefix)) return Response.json({ error: 'invalid_type' }, { status: 415, headers: jsonHeaders });
    const declared = Number(request.headers.get('content-length') || 0);
    if (declared && declared > maxBytes) return Response.json({ error: 'too_large' }, { status: 413, headers: jsonHeaders });
    const body = await request.arrayBuffer();
    if (body.byteLength > maxBytes) return Response.json({ error: 'too_large' }, { status: 413, headers: jsonHeaders });
    await env.MEDIA.put(key, body, {
      httpMetadata: { contentType: type },
      customMetadata: { originalName: (request.headers.get('x-file-name') || '').slice(0, 300) }
    });
    return Response.json({ ok: true, id, bytes: body.byteLength }, { headers: jsonHeaders });
  }

  return new Response('Method not allowed', { status: 405 });
}

export async function handleStoryLabClean(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/storylab-clean' || url.pathname === '/storylab-clean/') {
    return new Response(storyLabHtml(), { status: 200, headers: htmlHeaders });
  }

  if (url.pathname === '/api/storylab-clean/revision') {
    return Response.json({
      revision: STORYLAB_CLEAN_PAGE_REVISION,
      uxRevision: STORYLAB_CLEAN_UX_REVISION,
      phase: 'functional-photo-story-build',
      cleanSlate: true,
      importsLegacyStoryLab: false,
      importsV9: false,
      importsCleanRebuild: false,
      photoSelectionEnabled: true,
      persistentPhotoStorage: 'r2',
      multiplePhotosEnabled: true,
      swipePhotosEnabled: true,
      photoSwipeInteraction: 'direct-follow-snap',
      audioEnabled: true,
      audioPersistence: 'r2',
      transcriptEnabled: 'browser-if-available',
      editableStoryText: true,
      freshDraftOnNavigate: true,
      resumeDraftOnReload: true,
      transcriptSheetInteraction: 'direct-follow-spring',
      compactTimelineButton: true,
      timelineEnabled: false
    }, {
      headers: jsonHeaders
    });
  }

  if (url.pathname === '/api/storylab-clean/state' || url.pathname.startsWith('/api/storylab-clean/photo') || url.pathname.startsWith('/api/storylab-clean/audio')) {
    if (!env?.MEDIA) return Response.json({ error: 'media_binding_missing' }, { status: 503, headers: jsonHeaders });
    const client = safeClient(url.searchParams.get('client'));
    if (!client) return Response.json({ error: 'invalid_client' }, { status: 400, headers: jsonHeaders });

    if (url.pathname === '/api/storylab-clean/state') return handleState(request, env, url, client);
    if (url.pathname.startsWith('/api/storylab-clean/photo')) return handleBinary(request, env, url, client, 'photo', 'image/', 20 * 1024 * 1024);
    if (url.pathname.startsWith('/api/storylab-clean/audio')) return handleBinary(request, env, url, client, 'audio', 'audio/', 60 * 1024 * 1024);
  }

  return null;
}