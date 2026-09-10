export const presentationControllerScript = String.raw`
(()=>{
  const timeline=document.querySelector('.timeline');
  const stage=document.getElementById('photoStage');
  const story=document.getElementById('memoryStoryScroll');
  const photos=Array.from(document.querySelectorAll('.example-photo'));

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
     Horizontal photo movement never sends wheel/zoom input to timeline.
     pointercancel always aborts and can never commit a memory change.
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

  const INTENT_PX=10;
  const MIN_COMMIT_AGE=65;
  let pid=null;
  let startX=0,startY=0,lastX=0,lastT=0,startT=0;
  let mode=null;
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

  function settle(direction,commit){
    if(!overlay||!currentPage){clearOverlay();return;}
    const w=stage.getBoundingClientRect().width;
    [previousPage,currentPage,nextPage].filter(Boolean).forEach(p=>p.classList.add('is-settling'));
    requestAnimationFrame(()=>{
      if(!commit){
        placePages(0);
        setTimeout(clearOverlay,300);
        return;
      }
      const target=direction>0?stateAtStart&&stateAtStart.next:stateAtStart&&stateAtStart.previous;
      if(!target){placePages(0);setTimeout(clearOverlay,300);return;}
      placePages(direction>0?-w:w);
      setTimeout(async()=>{
        await warmImage(target.image);
        window.__taleraPhotoBook.step(direction);
        await waitForBaseSharp(target.image);
        warmState(window.__taleraPhotoBook.state());
        clearOverlay();
      },250);
    });
  }

  story.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(pid!==null)return;
    pid=e.pointerId;
    startX=lastX=e.clientX;
    startY=e.clientY;
    startT=lastT=performance.now();
    mode=null;
    try{story.setPointerCapture(e.pointerId);}catch(err){}
    warmState(window.__taleraPhotoBook.state());
  },{passive:true,capture:true});

  story.addEventListener('pointermove',e=>{
    if(e.pointerId!==pid)return;
    const dx=e.clientX-startX;
    const dy=e.clientY-startY;
    if(!mode&&(Math.abs(dx)>INTENT_PX||Math.abs(dy)>INTENT_PX)){
      mode=Math.abs(dx)>Math.abs(dy)*1.12?'horizontal':'vertical';
      if(mode==='horizontal')buildOverlay();
    }
    if(mode==='vertical'){
      clearOverlay();
      return;
    }
    if(mode!=='horizontal')return;
    e.preventDefault();
    placePages(dx);
    lastX=e.clientX;
    lastT=performance.now();
  },{passive:false,capture:true});

  function finish(e){
    if(e.pointerId!==pid)return;
    const now=performance.now();
    const age=now-startT;
    const dx=e.clientX-startX;
    const dt=Math.max(16,now-lastT);
    const velocity=(e.clientX-lastX)/dt;
    const w=stage.getBoundingClientRect().width;
    const direction=dx<0?1:-1;
    const hasTarget=direction>0?!!(stateAtStart&&stateAtStart.next):!!(stateAtStart&&stateAtStart.previous);
    const distanceCommit=Math.abs(dx)>Math.max(72,w*.22);
    const flickCommit=Math.abs(dx)>48&&Math.abs(velocity)>.62;
    const commit=mode==='horizontal'&&age>=MIN_COMMIT_AGE&&hasTarget&&(distanceCommit||flickCommit);
    if(mode==='horizontal')settle(direction,commit);
    else clearOverlay();
    try{story.releasePointerCapture(e.pointerId);}catch(err){}
    pid=null;
    mode=null;
  }

  function cancel(e){
    if(e.pointerId!==pid)return;
    /* Browser/system cancellation is never interpreted as user navigation. */
    clearOverlay();
    try{story.releasePointerCapture(e.pointerId);}catch(err){}
    pid=null;
    mode=null;
  }

  story.addEventListener('pointerup',finish,{passive:true,capture:true});
  story.addEventListener('pointercancel',cancel,{passive:true,capture:true});
})();
`;
