export const interactionFixStyle = String.raw`
/* TALERA interaction refinement — one photo gesture owner, direct touch tracking */
.photo-layer:not(.photo-book-page){
  transform:none!important;
  transition:opacity .14s linear!important;
  will-change:opacity!important;
}
.photo-layer:not(.photo-book-page).is-front{transform:none!important}
/* Vertical reading stays native. Horizontal movement is owned by the photo gesture.
   Keep horizontal browser overscroll from competing at the screen edges where supported. */
.memory-story-scroll{
  touch-action:pan-y!important;
  overscroll-behavior-x:none!important;
}
.photo-book-overlay{
  position:absolute!important;
  inset:0!important;
  z-index:40!important;
  overflow:hidden!important;
  pointer-events:none!important;
  contain:layout paint size!important;
  visibility:hidden!important;
}
.photo-book-overlay.is-dragging{visibility:visible!important}
.photo-book-page{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  opacity:1!important;
  transform:translate3d(0,0,0);
  transition:none!important;
  will-change:transform!important;
  overflow:hidden!important;
  backface-visibility:hidden!important;
  -webkit-backface-visibility:hidden!important;
}
.photo-book-page.is-settling{transition:transform .22s cubic-bezier(.22,.72,.25,1)!important}

@media (pointer:coarse){
  .timeline.is-active:not(.touch-intent) canvas{opacity:.26!important;filter:saturate(.55) contrast(.70) brightness(.86)!important}
  .timeline.is-active:not(.touch-intent) .center-needle{opacity:.32!important;filter:none!important}
  .timeline.is-active:not(.touch-intent) .focus{opacity:.36!important;transform:translateZ(0) scale(.97)!important;filter:none!important}
  .timeline.is-active:not(.touch-intent)::after{opacity:.10!important}
  .timeline.is-active.touch-intent canvas{opacity:1!important;filter:saturate(1.22) contrast(1.42) brightness(1.20) drop-shadow(0 0 4px rgba(255,255,255,.62))!important}
  .timeline.is-active.touch-intent .center-needle{opacity:1!important;filter:brightness(1.28) drop-shadow(0 0 4px rgba(255,255,255,1)) drop-shadow(0 2px 9px rgba(15,39,71,.48))!important}
  .timeline.is-active.touch-intent .focus{opacity:1!important;transform:translateZ(0) scale(1.045)!important;filter:brightness(1.20) drop-shadow(0 0 5px rgba(255,255,255,.70)) drop-shadow(0 2px 12px rgba(15,39,71,.40))!important}
  .timeline.is-active.touch-intent::after{opacity:1!important}
}
`;

export const interactionFixScript = String.raw`
(()=>{
  const timeline=document.querySelector('.timeline');
  const stage=document.getElementById('photoStage');
  const story=document.getElementById('memoryStoryScroll');
  const photos=Array.from(document.querySelectorAll('.example-photo'));
  const coarse=matchMedia('(pointer:coarse)').matches;

  if(timeline&&coarse){
    const pts=new Map();
    let restTimer=0;
    const sleep=()=>{clearTimeout(restTimer);restTimer=setTimeout(()=>timeline.classList.remove('touch-intent'),850)};
    timeline.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse')return;
      const r=timeline.getBoundingClientRect();
      pts.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,inBand:e.clientY>=r.top+r.height*.28&&e.clientY<=r.top+r.height*.90});
      if(pts.size>=2){timeline.classList.add('touch-intent');clearTimeout(restTimer)}
    },{passive:true,capture:true});
    timeline.addEventListener('pointermove',e=>{
      const p=pts.get(e.pointerId);if(!p)return;
      p.x=e.clientX;p.y=e.clientY;
      if(pts.size>=2){timeline.classList.add('touch-intent');clearTimeout(restTimer);return}
      const dx=Math.abs(e.clientX-p.startX),dy=Math.abs(e.clientY-p.startY);
      if(p.inBand&&dx>8&&dx>dy*.85){timeline.classList.add('touch-intent');clearTimeout(restTimer)}
    },{passive:true,capture:true});
    const end=e=>{pts.delete(e.pointerId);if(pts.size===0)sleep()};
    timeline.addEventListener('pointerup',end,{passive:true,capture:true});
    timeline.addEventListener('pointercancel',end,{passive:true,capture:true});
  }

  function fitNode(img,blur,boxW,boxH){
    if(!img||!img.complete||!img.naturalWidth||!img.naturalHeight||!boxW||!boxH)return false;
    const containScale=Math.min(boxW/img.naturalWidth,boxH/img.naturalHeight);
    const containW=img.naturalWidth*containScale,containH=img.naturalHeight*containScale;
    const targetH=Math.min(boxH,Math.max(containH,boxH*.68));
    const zoom=Math.min(1.82,Math.max(1,targetH/containH));
    const h=containH*zoom,w=containW*zoom,left=(boxW-w)/2,top=(boxH-h)/2;
    [img,blur].forEach(node=>{
      if(!node)return;
      node.style.inset='auto';node.style.width=w.toFixed(1)+'px';node.style.height=h.toFixed(1)+'px';
      node.style.left=left.toFixed(1)+'px';node.style.top=top.toFixed(1)+'px';node.style.transform='none';
    });
    if(h<boxH-4){
      const feather=Math.min(104,Math.max(72,h*.095));
      const mask='linear-gradient(to bottom,transparent 0px,rgba(0,0,0,.18) '+(feather*.28).toFixed(1)+'px,rgba(0,0,0,.62) '+(feather*.68).toFixed(1)+'px,#000 '+feather.toFixed(1)+'px,#000 calc(100% - '+feather.toFixed(1)+'px),rgba(0,0,0,.62) calc(100% - '+(feather*.68).toFixed(1)+'px),rgba(0,0,0,.18) calc(100% - '+(feather*.28).toFixed(1)+'px),transparent 100%)';
      img.style.webkitMaskImage=mask;img.style.maskImage=mask;
    }else{img.style.webkitMaskImage='none';img.style.maskImage='none'}
    return true;
  }
  function fitNow(img){
    if(!img||!stage)return;
    const layer=img.closest('.photo-layer');
    const blur=layer&&layer.querySelector('.photo-aligned-blur');
    const r=stage.getBoundingClientRect();
    fitNode(img,blur,r.width,r.height);
  }
  photos.forEach(img=>{
    new MutationObserver(()=>fitNow(img)).observe(img,{attributes:true,attributeFilter:['src']});
    img.addEventListener('load',()=>fitNow(img),{passive:true});
  });

  if(!story||!stage||!window.__taleraPhotoBook)return;

  const decoded=new Map();
  function warmImage(src){
    if(!src)return Promise.resolve();
    if(decoded.has(src))return decoded.get(src);
    const img=new Image();img.decoding='async';img.loading='eager';
    try{img.fetchPriority='high'}catch(e){}
    img.src=src;
    const p=(img.decode?img.decode():new Promise(resolve=>{
      if(img.complete)resolve();else{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})}
    })).catch(()=>{});
    decoded.set(src,p);return p;
  }
  function warmState(s){[s.current,s.previous,s.next].forEach(m=>{if(m)warmImage(m.image)})}
  warmState(window.__taleraPhotoBook.state());

  const INTENT_PX=5;
  const INTENT_RATIO=1.08;
  const VELOCITY_WINDOW_MS=110;
  const FLICK_SPEED=.48;
  const FLICK_MIN_PX=24;
  const SETTLE_MS=220;

  let drag=null;
  let overlay=null,previousPage=null,currentPage=null,nextPage=null,stateAtStart=null;
  let settling=false;

  function stripIds(root){root.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'))}
  function matchingBaseLayer(src){
    const layers=Array.from(stage.querySelectorAll('.photo-layer:not(.photo-book-page)'));
    return layers.find(layer=>{
      const img=layer.querySelector('.example-photo');
      return img&&img.src===src;
    })||layers.find(layer=>parseFloat(getComputedStyle(layer).opacity)>.5)||layers[0]||null;
  }
  function makePage(src,useVisibleBase=false){
    const source=(useVisibleBase&&src?matchingBaseLayer(src):null)||document.getElementById('photoLayerA')||stage.querySelector('.photo-layer:not(.photo-book-page)');
    const page=source?source.cloneNode(true):document.createElement('div');
    page.classList.add('photo-book-page');page.classList.remove('is-front');page.style.opacity='1';stripIds(page);
    const sharp=page.querySelector('.example-photo');
    const blur=page.querySelector('.photo-aligned-blur');
    const backdrop=page.querySelector('.photo-backdrop');
    if(src){
      if(backdrop&&backdrop.src!==src){backdrop.decoding='async';backdrop.loading='eager';backdrop.src=src}
      if(blur&&blur.src!==src){blur.decoding='async';blur.loading='eager';blur.src=src}
      if(sharp){
        sharp.decoding='async';sharp.loading='eager';
        try{sharp.fetchPriority='high'}catch(e){}
        const fit=()=>{const r=stage.getBoundingClientRect();fitNode(sharp,blur,r.width,r.height)};
        if(sharp.src!==src)sharp.src=src;
        if(sharp.complete&&sharp.naturalWidth)fit();else sharp.addEventListener('load',fit,{once:true,passive:true});
      }
    }
    return page;
  }
  function clearOverlay(){
    if(overlay)overlay.remove();
    overlay=previousPage=currentPage=nextPage=null;stateAtStart=null;
  }
  function buildOverlay(s){
    clearOverlay();
    stateAtStart=s;
    warmState(s);
    overlay=document.createElement('div');overlay.className='photo-book-overlay';
    previousPage=s.previous?makePage(s.previous.image):null;
    currentPage=makePage(s.current&&s.current.image,true);
    nextPage=s.next?makePage(s.next.image):null;
    /* Chronology follows the gesture the user described: pulling the current photo
       to the right reveals the next (newer) memory; pulling left reveals the previous. */
    if(nextPage)overlay.appendChild(nextPage);
    overlay.appendChild(currentPage);
    if(previousPage)overlay.appendChild(previousPage);
    stage.appendChild(overlay);
    placePages(0);
  }
  function placePages(dx){
    if(!overlay||!currentPage)return;
    const w=stage.getBoundingClientRect().width;
    currentPage.style.transform='translate3d('+dx.toFixed(1)+'px,0,0)';
    if(nextPage)nextPage.style.transform='translate3d('+(dx-w).toFixed(1)+'px,0,0)';
    if(previousPage)previousPage.style.transform='translate3d('+(dx+w).toFixed(1)+'px,0,0)';
  }
  function hasTargetForDx(dx,s=stateAtStart){
    if(!s||dx===0)return true;
    return dx>0?!!s.next:!!s.previous;
  }
  function displayDx(dx){
    return hasTargetForDx(dx)?dx:dx*.22;
  }
  function revealOverlay(){if(overlay)overlay.classList.add('is-dragging')}

  function addSample(x,t){
    if(!drag)return;
    drag.samples.push({x,t});
    const cutoff=t-VELOCITY_WINDOW_MS*1.7;
    while(drag.samples.length>2&&drag.samples[0].t<cutoff)drag.samples.shift();
  }
  function addEventSamples(e){
    const events=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():null;
    if(events&&events.length){events.forEach(p=>addSample(p.clientX,p.timeStamp||performance.now()))}
    else addSample(e.clientX,e.timeStamp||performance.now());
  }
  function recentVelocity(){
    if(!drag||drag.samples.length<2)return 0;
    const samples=drag.samples;
    const newest=samples[samples.length-1];
    let oldest=samples[0];
    for(let i=samples.length-2;i>=0;i--){
      if(newest.t-samples[i].t>=VELOCITY_WINDOW_MS*.55){oldest=samples[i];break}
      oldest=samples[i];
    }
    const dt=newest.t-oldest.t;
    return dt>8?(newest.x-oldest.x)/dt:0;
  }

  async function waitForBaseSharp(src){
    const base=document.getElementById('memoryPhotoA')||document.querySelector('#photoLayerA .example-photo');
    if(!base)return;
    if(base.src!==src){
      await new Promise(resolve=>{let doneCalled=false;const done=()=>{if(doneCalled)return;doneCalled=true;resolve()};base.addEventListener('load',done,{once:true});base.addEventListener('error',done,{once:true});setTimeout(done,800)});
    }
    if(base.decode){try{await base.decode()}catch(e){}}
    fitNow(base);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  }

  function settle(direction,commit){
    if(!overlay||!currentPage){clearOverlay();settling=false;return}
    settling=true;
    revealOverlay();
    const w=stage.getBoundingClientRect().width;
    [previousPage,currentPage,nextPage].filter(Boolean).forEach(p=>p.classList.add('is-settling'));
    requestAnimationFrame(()=>{
      if(!commit){
        placePages(0);
        setTimeout(()=>{clearOverlay();settling=false},SETTLE_MS+30);
        return;
      }
      const target=direction>0?stateAtStart&&stateAtStart.next:stateAtStart&&stateAtStart.previous;
      const targetPage=direction>0?nextPage:previousPage;
      if(!target||!targetPage){
        placePages(0);
        setTimeout(()=>{clearOverlay();settling=false},SETTLE_MS+30);
        return;
      }
      /* Commit the logical memory under the covering overlay immediately. The base
         image gets the whole settle animation to load, so the hand-off stays sharp. */
      warmImage(target.image);
      window.__taleraPhotoBook.step(direction);
      warmState(window.__taleraPhotoBook.state());
      placePages(direction>0?w:-w);
      setTimeout(async()=>{
        await waitForBaseSharp(target.image);
        clearOverlay();settling=false;
      },SETTLE_MS);
    });
  }

  function resetDrag(){
    if(!drag)return;
    if(drag.captured){try{story.releasePointerCapture(drag.pointerId)}catch(err){}}
    drag=null;
  }

  story.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(e.target.closest('button,a,input,textarea,select'))return;
    if(drag||settling)return;
    /* Capture phase intentionally owns this stream. The older presentation helper
       also has a bubble-phase swipe listener; stopping here keeps it dormant instead
       of letting two gesture systems move the same photo/timeline. */
    e.stopImmediatePropagation();
    const s=window.__taleraPhotoBook.state();
    drag={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,mode:null,captured:false,samples:[]};
    addSample(e.clientX,e.timeStamp||performance.now());
    buildOverlay(s);
  },{passive:true,capture:true});

  story.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.pointerId)return;
    e.stopImmediatePropagation();
    addEventSamples(e);
    const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
    const ax=Math.abs(dx),ay=Math.abs(dy);

    if(!drag.mode&&(ax>INTENT_PX||ay>INTENT_PX)){
      if(ax>ay*INTENT_RATIO)drag.mode='horizontal';
      else if(ay>ax*INTENT_RATIO)drag.mode='vertical';
      else if(Math.max(ax,ay)>INTENT_PX*2.2)drag.mode=ax>=ay?'horizontal':'vertical';

      if(drag.mode==='horizontal'){
        revealOverlay();
        try{story.setPointerCapture(e.pointerId);drag.captured=true}catch(err){}
      }else if(drag.mode==='vertical'){
        clearOverlay();
      }
    }

    if(drag.mode!=='horizontal')return;
    e.preventDefault();
    placePages(displayDx(dx));
  },{passive:false,capture:true});

  story.addEventListener('pointerup',e=>{
    if(!drag||e.pointerId!==drag.pointerId)return;
    e.stopImmediatePropagation();
    addEventSamples(e);
    const dx=e.clientX-drag.startX;
    const mode=drag.mode;
    const velocity=recentVelocity();
    const w=stage.getBoundingClientRect().width;
    const direction=dx>0?1:-1;
    const hasTarget=direction>0?!!(stateAtStart&&stateAtStart.next):!!(stateAtStart&&stateAtStart.previous);
    const distanceCommit=Math.abs(dx)>=Math.max(56,w*.18);
    const flickCommit=Math.abs(dx)>=FLICK_MIN_PX&&Math.abs(velocity)>=FLICK_SPEED&&Math.sign(velocity)===Math.sign(dx);
    const commit=mode==='horizontal'&&hasTarget&&(distanceCommit||flickCommit);
    resetDrag();
    if(mode==='horizontal')settle(direction,commit);else clearOverlay();
  },{passive:true,capture:true});

  story.addEventListener('pointercancel',e=>{
    if(!drag||e.pointerId!==drag.pointerId)return;
    e.stopImmediatePropagation();
    const mode=drag.mode;
    resetDrag();
    /* Cancellation is normally the browser/OS taking the gesture (not a deliberate
       release), especially near screen edges. It must never advance a memory. */
    if(mode==='horizontal'&&overlay)settle(0,false);else clearOverlay();
  },{passive:true,capture:true});
})();
`;
