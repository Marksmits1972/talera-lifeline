export const presentationControllerScript = String.raw`
(()=>{
  const timeline=document.querySelector('.timeline');
  const stage=document.getElementById('photoStage');
  const story=document.getElementById('memoryStoryScroll');
  const photos=Array.from(document.querySelectorAll('.example-photo'));

  /* ---------------------------------------------------------
     TIMELINE READOUT TUNING.
     Keep the large scale exactly as-is; make the exact date at
     the needle slightly larger so overview + precision read as
     one calm hierarchy.
     --------------------------------------------------------- */
  if(!document.getElementById('talera-timeline-readout-tuning')){
    const style=document.createElement('style');
    style.id='talera-timeline-readout-tuning';
    style.textContent='.focus{font-size:15.5px!important;font-weight:720!important;padding:6px 13px!important;letter-spacing:0!important;white-space:nowrap!important}.timeline.is-active .focus{transform:translateZ(0) scale(1.04)!important}';
    document.head.appendChild(style);
  }

  /* ---------------------------------------------------------
     VISUAL PHOTO FITTING ONLY — never changes timeline state.
     --------------------------------------------------------- */
  function ensureAlignedBlur(img){
    const layer=img&&img.closest('.photo-layer');
    if(!layer)return null;
    let blur=layer.querySelector('.photo-aligned-blur');
    if(!blur){
      blur=document.createElement('img');
      blur.className='photo-aligned-blur';
      blur.alt='';
      blur.setAttribute('aria-hidden','true');
      layer.insertBefore(blur,img);
    }
    if(blur.src!==img.src)blur.src=img.src;
    return blur;
  }

  function fitNode(img,blur,boxW,boxH){
    if(!img||!img.complete||!img.naturalWidth||!img.naturalHeight||!boxW||!boxH)return false;
    const containScale=Math.min(boxW/img.naturalWidth,boxH/img.naturalHeight);
    const containW=img.naturalWidth*containScale;
    const containH=img.naturalHeight*containScale;
    const targetH=Math.min(boxH,Math.max(containH,boxH*.68));
    const zoom=Math.min(1.82,Math.max(1,targetH/containH));
    const h=containH*zoom;
    const w=containW*zoom;
    const left=(boxW-w)/2;
    const top=(boxH-h)/2;

    [img,blur].forEach(node=>{
      if(!node)return;
      node.style.inset='auto';
      node.style.width=w.toFixed(1)+'px';
      node.style.height=h.toFixed(1)+'px';
      node.style.left=left.toFixed(1)+'px';
      node.style.top=top.toFixed(1)+'px';
      node.style.transform='none';
    });

    if(h<boxH-4){
      const feather=Math.min(104,Math.max(72,h*.095));
      const mask='linear-gradient(to bottom,transparent 0px,rgba(0,0,0,.18) '+(feather*.28).toFixed(1)+'px,rgba(0,0,0,.62) '+(feather*.68).toFixed(1)+'px,#000 '+feather.toFixed(1)+'px,#000 calc(100% - '+feather.toFixed(1)+'px),rgba(0,0,0,.62) calc(100% - '+(feather*.68).toFixed(1)+'px),rgba(0,0,0,.18) calc(100% - '+(feather*.28).toFixed(1)+'px),transparent 100%)';
      img.style.webkitMaskImage=mask;
      img.style.maskImage=mask;
    }else{
      img.style.webkitMaskImage='none';
      img.style.maskImage='none';
    }
    return true;
  }

  function fitNow(img){
    if(!img||!stage)return;
    const blur=ensureAlignedBlur(img);
    const r=stage.getBoundingClientRect();
    fitNode(img,blur,r.width,r.height);
  }

  function fitAll(){requestAnimationFrame(()=>photos.forEach(fitNow));}

  photos.forEach(img=>{
    if(img.complete)fitNow(img);
    img.addEventListener('load',()=>fitNow(img),{passive:true});
    new MutationObserver(()=>{if(img.complete)requestAnimationFrame(()=>fitNow(img));})
      .observe(img,{attributes:true,attributeFilter:['src']});
  });
  window.addEventListener('resize',fitAll,{passive:true});
  if(window.ResizeObserver&&stage){new ResizeObserver(fitAll).observe(stage);}

  /* ---------------------------------------------------------
     TIMELINE VISUAL WAKE/SLEEP ONLY.
     The original timeline code remains the sole navigation owner.
     --------------------------------------------------------- */
  if(timeline){
    let restTimer=0;
    let activePointers=0;
    const wake=()=>{
      clearTimeout(restTimer);
      timeline.classList.add('is-active');
    };
    const rest=(delay=900)=>{
      clearTimeout(restTimer);
      restTimer=setTimeout(()=>{
        if(activePointers===0)timeline.classList.remove('is-active');
      },delay);
    };
    timeline.addEventListener('pointerdown',()=>{activePointers+=1;wake();},{passive:true});
    const release=()=>{activePointers=Math.max(0,activePointers-1);rest(1100);};
    timeline.addEventListener('pointerup',release,{passive:true});
    timeline.addEventListener('pointercancel',release,{passive:true});
    timeline.addEventListener('wheel',()=>{wake();rest(900);},{passive:true});
    rest(400);
  }

  /* ---------------------------------------------------------
     ONE PHOTOBOOK OWNER.
     A careful drag still has a small pickup zone. A fast flick now
     owns its direction from the first clear horizontal movement and
     carries momentum after release: faster flicks can travel through
     several memories instead of resolving as one calm opposite click.
     --------------------------------------------------------- */
  if(!story||!stage||!window.__taleraPhotoBook)return;

  const decoded=new Map();
  function warmImage(src){
    if(!src)return Promise.resolve();
    if(decoded.has(src))return decoded.get(src);
    const img=new Image();
    img.decoding='async';
    img.loading='eager';
    try{img.fetchPriority='high';}catch(e){}
    img.src=src;
    const p=(img.decode?img.decode():new Promise(resolve=>{
      if(img.complete)resolve();
      else{
        img.addEventListener('load',resolve,{once:true});
        img.addEventListener('error',resolve,{once:true});
      }
    })).catch(()=>{});
    decoded.set(src,p);
    return p;
  }
  function warmState(s){[s.current,s.previous,s.next].forEach(m=>{if(m)warmImage(m.image);});}
  warmState(window.__taleraPhotoBook.state());

  const DRAG_INTENT_PX=10;
  const FLICK_INTENT_PX=4;
  const FLICK_LOCK_SPEED=.34;
  const HORIZONTAL_BIAS=1.08;
  let pid=null;
  let startX=0,startY=0,lastX=0,lastT=0,startT=0;
  let dragOriginX=0;
  let peakVelocity=0;
  let mode=null;
  let fastPickup=false;
  let lockedStepDirection=0;
  let momentumRunning=false;
  let overlay=null,previousPage=null,currentPage=null,nextPage=null,stateAtStart=null;

  function stripIds(root){root.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));}
  function matchingBaseLayer(src){
    const layers=Array.from(stage.querySelectorAll('.photo-layer:not(.photo-book-page)'));
    return layers.find(layer=>{
      const img=layer.querySelector('.example-photo');
      return img&&img.src===src;
    })||layers.find(layer=>parseFloat(getComputedStyle(layer).opacity)>.5)||layers[0]||null;
  }
  function makePage(src,useVisibleBase=false){
    const source=(useVisibleBase&&src?matchingBaseLayer(src):null)||document.getElementById('photoLayerA')||stage.querySelector('.photo-layer');
    const page=source?source.cloneNode(true):document.createElement('div');
    page.classList.add('photo-book-page');
    page.classList.remove('is-front');
    page.style.opacity='1';
    stripIds(page);
    const sharp=page.querySelector('.example-photo');
    const blur=page.querySelector('.photo-aligned-blur');
    const backdrop=page.querySelector('.photo-backdrop');
    if(src){
      if(backdrop&&backdrop.src!==src){backdrop.decoding='async';backdrop.loading='eager';backdrop.src=src;}
      if(blur&&blur.src!==src){blur.decoding='async';blur.loading='eager';blur.src=src;}
      if(sharp){
        sharp.decoding='async';sharp.loading='eager';
        try{sharp.fetchPriority='high';}catch(e){}
        const fit=()=>{const r=stage.getBoundingClientRect();fitNode(sharp,blur,r.width,r.height);};
        if(sharp.src!==src)sharp.src=src;
        if(sharp.complete&&sharp.naturalWidth)fit();
        else sharp.addEventListener('load',fit,{once:true,passive:true});
      }
    }
    return page;
  }
  function clearOverlay(){
    if(overlay)overlay.remove();
    overlay=previousPage=currentPage=nextPage=null;
    stateAtStart=null;
  }
  function buildOverlay(){
    clearOverlay();
    const s=window.__taleraPhotoBook.state();
    stateAtStart=s;
    warmState(s);
    overlay=document.createElement('div');
    overlay.className='photo-book-overlay';
    previousPage=s.previous?makePage(s.previous.image):null;
    currentPage=makePage(s.current&&s.current.image,true);
    nextPage=s.next?makePage(s.next.image):null;
    if(previousPage)overlay.appendChild(previousPage);
    overlay.appendChild(currentPage);
    if(nextPage)overlay.appendChild(nextPage);
    stage.appendChild(overlay);
    placePages(0);
  }
  function placePages(dx){
    if(!overlay||!currentPage)return;
    const w=stage.getBoundingClientRect().width;
    currentPage.style.transform='translate3d('+dx.toFixed(1)+'px,0,0)';
    if(previousPage)previousPage.style.transform='translate3d('+(dx-w).toFixed(1)+'px,0,0)';
    if(nextPage)nextPage.style.transform='translate3d('+(dx+w).toFixed(1)+'px,0,0)';
  }

  async function waitForBaseSharp(src){
    const base=document.getElementById('memoryPhotoA')||document.querySelector('#photoLayerA .example-photo');
    if(!base)return;
    if(base.src!==src){
      await new Promise(resolve=>{
        let doneCalled=false;
        const done=()=>{if(doneCalled)return;doneCalled=true;resolve();};
        base.addEventListener('load',done,{once:true});
        base.addEventListener('error',done,{once:true});
        setTimeout(done,800);
      });
    }
    if(base.decode){try{await base.decode();}catch(e){}}
    fitNow(base);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  }

  function transitionPages(direction,duration){
    if(!overlay||!currentPage)return false;
    const w=stage.getBoundingClientRect().width;
    [previousPage,currentPage,nextPage].filter(Boolean).forEach(p=>{
      p.classList.add('is-settling');
      p.style.setProperty('transition-duration',duration+'ms','important');
    });
    requestAnimationFrame(()=>placePages(direction>0?-w:w));
    return true;
  }

  async function runMomentum(direction,remaining,speed){
    if(remaining<=0){momentumRunning=false;warmState(window.__taleraPhotoBook.state());return;}
    const s=window.__taleraPhotoBook.state();
    const target=direction>0?s.next:s.previous;
    if(!target){momentumRunning=false;warmState(s);return;}

    await warmImage(target.image);
    buildOverlay();
    const duration=Math.round(Math.max(88,Math.min(138,142-Math.min(speed,2.4)*22)));
    if(!transitionPages(direction,duration)){momentumRunning=false;return;}

    setTimeout(async()=>{
      window.__taleraPhotoBook.step(direction);
      await waitForBaseSharp(target.image);
      clearOverlay();
      runMomentum(direction,remaining-1,Math.max(.45,speed*.84));
    },Math.max(70,duration-8));
  }

  function settle(direction,commit,releaseSpeed=0,momentumSteps=1){
    if(!overlay||!currentPage){clearOverlay();return;}
    const speed=Math.abs(releaseSpeed);
    const duration=Math.round(Math.max(135,Math.min(255,250-speed*82)));

    if(!commit){
      [previousPage,currentPage,nextPage].filter(Boolean).forEach(p=>{
        p.classList.add('is-settling');
        p.style.setProperty('transition-duration',duration+'ms','important');
      });
      requestAnimationFrame(()=>placePages(0));
      setTimeout(clearOverlay,duration+25);
      return;
    }

    const target=direction>0?stateAtStart&&stateAtStart.next:stateAtStart&&stateAtStart.previous;
    if(!target){
      [previousPage,currentPage,nextPage].filter(Boolean).forEach(p=>p.classList.add('is-settling'));
      requestAnimationFrame(()=>placePages(0));
      setTimeout(clearOverlay,duration+25);
      return;
    }

    momentumRunning=momentumSteps>1;
    transitionPages(direction,duration);
    setTimeout(async()=>{
      await warmImage(target.image);
      window.__taleraPhotoBook.step(direction);
      await waitForBaseSharp(target.image);
      clearOverlay();
      if(momentumSteps>1)runMomentum(direction,momentumSteps-1,speed);
      else{
        momentumRunning=false;
        warmState(window.__taleraPhotoBook.state());
      }
    },Math.max(90,duration-10));
  }

  function lockHorizontal(currentX,rawDx,isFast){
    mode='horizontal';
    fastPickup=!!isFast;
    if(fastPickup){
      dragOriginX=startX;
      lockedStepDirection=rawDx<0?1:-1;
    }else{
      const sign=rawDx===0?1:Math.sign(rawDx);
      dragOriginX=startX+sign*DRAG_INTENT_PX;
      lockedStepDirection=0;
    }
    buildOverlay();
    placePages(currentX-dragOriginX);
  }

  function momentumCount(speed,distance,w){
    let steps=1;
    if(speed>=.62||distance>=w*.34)steps=2;
    if(speed>=1.02||distance>=w*.56)steps=3;
    if(speed>=1.52||distance>=w*.82)steps=4;
    return steps;
  }

  story.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(pid!==null||momentumRunning)return;
    pid=e.pointerId;
    startX=lastX=dragOriginX=e.clientX;
    startY=e.clientY;
    startT=lastT=performance.now();
    peakVelocity=0;
    mode=null;
    fastPickup=false;
    lockedStepDirection=0;
    try{story.setPointerCapture(e.pointerId);}catch(err){}
    warmState(window.__taleraPhotoBook.state());
  },{passive:true,capture:true});

  story.addEventListener('pointermove',e=>{
    if(e.pointerId!==pid)return;
    const now=performance.now();
    const rawDx=e.clientX-startX;
    const dy=e.clientY-startY;
    const dt=Math.max(8,now-lastT);
    const segmentVelocity=(e.clientX-lastX)/dt;
    peakVelocity=Math.max(peakVelocity,Math.abs(segmentVelocity));

    if(!mode){
      const horizontalEnough=Math.abs(rawDx)>Math.abs(dy)*HORIZONTAL_BIAS;
      const fastHorizontal=horizontalEnough&&Math.abs(rawDx)>=FLICK_INTENT_PX&&Math.abs(segmentVelocity)>=FLICK_LOCK_SPEED;
      const deliberateHorizontal=horizontalEnough&&Math.abs(rawDx)>=DRAG_INTENT_PX;
      const deliberateVertical=Math.abs(dy)>=DRAG_INTENT_PX&&Math.abs(dy)>Math.abs(rawDx)*1.08;

      if(fastHorizontal||deliberateHorizontal){
        lockHorizontal(e.clientX,rawDx,fastHorizontal);
      }else if(deliberateVertical){
        mode='vertical';
      }
    }

    if(mode==='vertical'){
      clearOverlay();
      lastX=e.clientX;
      lastT=now;
      return;
    }
    if(mode!=='horizontal'){
      lastX=e.clientX;
      lastT=now;
      return;
    }

    e.preventDefault();
    placePages(e.clientX-dragOriginX);
    lastX=e.clientX;
    lastT=now;
  },{passive:false,capture:true});

  function finish(e){
    if(e.pointerId!==pid)return;
    const now=performance.now();
    const age=Math.max(16,now-startT);
    const rawDx=e.clientX-startX;
    const rawDy=e.clientY-startY;
    const avgVelocity=rawDx/age;

    if(!mode&&Math.abs(rawDx)>=FLICK_INTENT_PX&&Math.abs(rawDx)>Math.abs(rawDy)*HORIZONTAL_BIAS){
      lockHorizontal(e.clientX,rawDx,true);
      peakVelocity=Math.max(peakVelocity,Math.abs(avgVelocity));
    }

    const visualDx=mode==='horizontal'?e.clientX-dragOriginX:rawDx;
    const w=stage.getBoundingClientRect().width;
    const direction=fastPickup&&lockedStepDirection?lockedStepDirection:(rawDx<0?1:-1);
    const hasTarget=direction>0?!!(stateAtStart&&stateAtStart.next):!!(stateAtStart&&stateAtStart.previous);
    const distanceCommit=Math.abs(visualDx)>Math.max(64,w*.18);
    const flickSpeed=Math.min(2.6,Math.max(peakVelocity,Math.abs(avgVelocity)));
    const flickCommit=Math.abs(rawDx)>=20&&flickSpeed>=.32;
    const commit=mode==='horizontal'&&hasTarget&&(distanceCommit||flickCommit);
    const steps=commit&&flickCommit?momentumCount(flickSpeed,Math.abs(rawDx),w):1;

    if(mode==='horizontal')settle(direction,commit,flickSpeed,steps);
    else clearOverlay();
    try{story.releasePointerCapture(e.pointerId);}catch(err){}
    pid=null;
    mode=null;
    fastPickup=false;
    lockedStepDirection=0;
  }

  function cancel(e){
    if(e.pointerId!==pid)return;
    clearOverlay();
    try{story.releasePointerCapture(e.pointerId);}catch(err){}
    pid=null;
    mode=null;
    fastPickup=false;
    lockedStepDirection=0;
  }

  story.addEventListener('pointerup',finish,{passive:true,capture:true});
  story.addEventListener('pointercancel',cancel,{passive:true,capture:true});
})();
`;
