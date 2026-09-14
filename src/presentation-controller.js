export const presentationControllerScript = String.raw`
(()=>{
  const timeline=document.querySelector('.timeline');
  const stage=document.getElementById('photoStage');
  const story=document.getElementById('memoryStoryScroll');
  const photos=Array.from(document.querySelectorAll('.example-photo'));

  /* Timeline readout tuning only. */
  if(!document.getElementById('talera-timeline-readout-tuning')){
    const style=document.createElement('style');
    style.id='talera-timeline-readout-tuning';
    style.textContent='.focus{font-size:15.5px!important;font-weight:720!important;padding:6px 13px!important;letter-spacing:0!important;white-space:nowrap!important}.timeline.is-active .focus{transform:translateZ(0) scale(1.04)!important}';
    document.head.appendChild(style);
  }

  /* Visual photo fitting only — never changes timeline state. */
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

  /* Timeline visual wake/sleep only. Timeline navigation remains owned by the
     proven timeline motor in the base prototype. */
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
     CLEAN PHOTO STRIP ENGINE — single gesture owner.

     - one persistent previous/current/next strip, reused for every swipe;
     - exact 1:1 finger displacement while touching;
     - continuous release velocity feeds one spring, no slow/fast modes;
     - at most one photo per gesture;
     - timeline-started gestures are never claimed here;
     - no extra fallback gesture listener exists.
     --------------------------------------------------------- */
  const book=window.__taleraPhotoBook;
  if(!story||!stage||!book)return;

  function stripIds(root){
    if(root.id)root.removeAttribute('id');
    root.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
  }

  function makeStripPage(){
    const source=document.getElementById('photoLayerA')||stage.querySelector('.photo-layer');
    const page=source?source.cloneNode(true):document.createElement('div');
    page.classList.add('photo-layer','talera-photo-strip-page');
    page.classList.remove('is-front');
    page.style.opacity='1';
    stripIds(page);
    return page;
  }

  const strip=document.createElement('div');
  strip.className='talera-photo-strip';
  strip.setAttribute('aria-hidden','true');
  const previousPage=makeStripPage();
  const currentPage=makeStripPage();
  const nextPage=makeStripPage();
  strip.appendChild(previousPage);
  strip.appendChild(currentPage);
  strip.appendChild(nextPage);
  stage.appendChild(strip);

  let stripVisible=false;
  let stripX=0;
  let stateAtStart=null;
  let pointerId=null;
  let mode=null;
  let startX=0,startY=0,lastX=0,lastY=0;
  let samples=[];
  let springRaf=0;

  function pageFit(page){
    const sharp=page.querySelector('.example-photo');
    const blur=page.querySelector('.photo-aligned-blur');
    if(!sharp||!sharp.complete||!sharp.naturalWidth)return;
    const r=stage.getBoundingClientRect();
    fitNode(sharp,blur,r.width,r.height);
  }

  function setPage(page,memory){
    if(!memory||!memory.image){
      page.style.visibility='hidden';
      page.dataset.taleraSrc='';
      return;
    }
    page.style.visibility='visible';
    const src=memory.image;
    if(page.dataset.taleraSrc===src){
      pageFit(page);
      return;
    }
    page.dataset.taleraSrc=src;
    const backdrop=page.querySelector('.photo-backdrop');
    const blur=page.querySelector('.photo-aligned-blur');
    const sharp=page.querySelector('.example-photo');
    if(backdrop&&backdrop.src!==src){backdrop.decoding='async';backdrop.loading='eager';backdrop.src=src;}
    if(blur&&blur.src!==src){blur.decoding='async';blur.loading='eager';blur.src=src;}
    if(sharp){
      sharp.decoding='async';
      sharp.loading='eager';
      try{sharp.fetchPriority='high';}catch(err){}
      sharp.onload=()=>pageFit(page);
      if(sharp.src!==src)sharp.src=src;
      if(sharp.complete&&sharp.naturalWidth)pageFit(page);
    }
  }

  function syncStrip(){
    const state=book.state();
    stateAtStart=state;
    setPage(previousPage,state.previous);
    setPage(currentPage,state.current);
    setPage(nextPage,state.next);
  }

  function positionStrip(x){
    stripX=x;
    const w=stage.getBoundingClientRect().width;
    currentPage.style.transform='translate3d('+x.toFixed(2)+'px,0,0)';
    previousPage.style.transform='translate3d('+(x-w).toFixed(2)+'px,0,0)';
    nextPage.style.transform='translate3d('+(x+w).toFixed(2)+'px,0,0)';
  }

  function showStrip(){
    syncStrip();
    stripVisible=true;
    strip.classList.add('is-visible');
    positionStrip(0);
  }

  function hideStrip(){
    stripVisible=false;
    strip.classList.remove('is-visible');
    stripX=0;
    stateAtStart=null;
  }

  function cancelSpring(finishVisual=true){
    if(springRaf)cancelAnimationFrame(springRaf);
    springRaf=0;
    if(finishVisual)hideStrip();
  }

  function startsOnTimeline(e){
    const target=e.target&&e.target.nodeType===1?e.target:null;
    if(target&&target.closest('.timeline'))return true;
    if(!timeline)return false;
    const r=timeline.getBoundingClientRect();
    return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
  }

  function startsOnControl(e){
    const target=e.target&&e.target.nodeType===1?e.target:null;
    return !!(target&&target.closest('button,a,input,textarea,select,[role="button"],nav,.talera-memory-audio'));
  }

  function addSample(x,t){
    samples.push({x,t});
    const cutoff=t-110;
    while(samples.length>2&&samples[0].t<cutoff)samples.shift();
  }

  function releaseVelocity(x,t){
    addSample(x,t);
    if(samples.length<2)return 0;
    let first=samples[0];
    for(let i=samples.length-2;i>=0;i--){
      if(t-samples[i].t>=45){first=samples[i];break;}
    }
    const dt=Math.max(16,t-first.t);
    return (x-first.x)/dt;
  }

  function animateSpring(targetX,initialVelocityPxMs,onDone){
    if(springRaf)cancelAnimationFrame(springRaf);
    const speed=Math.min(2.8,Math.abs(initialVelocityPxMs));
    const stiffness=185+speed*42;
    const damping=2*Math.sqrt(stiffness)*.98;
    let x=stripX;
    let velocity=initialVelocityPxMs*1000;
    let last=performance.now();

    function frame(now){
      const dt=Math.min(.032,Math.max(.008,(now-last)/1000));
      last=now;
      const acceleration=-stiffness*(x-targetX)-damping*velocity;
      velocity+=acceleration*dt;
      x+=velocity*dt;
      positionStrip(x);

      if(Math.abs(x-targetX)<.6&&Math.abs(velocity)<9){
        positionStrip(targetX);
        springRaf=0;
        onDone();
        return;
      }
      springRaf=requestAnimationFrame(frame);
    }
    springRaf=requestAnimationFrame(frame);
  }

  function finishGestureTracking(){
    if(pointerId!==null){
      try{story.releasePointerCapture(pointerId);}catch(err){}
    }
    pointerId=null;
    mode=null;
    samples=[];
  }

  function settleFromRelease(dx,velocityPxMs){
    const w=stage.getBoundingClientRect().width;
    if(!w||!stateAtStart){hideStrip();return;}

    const direction=dx<0?1:-1;
    const targetMemory=direction>0?stateAtStart.next:stateAtStart.previous;
    const projected=dx+velocityPxMs*145;
    const distanceCommit=Math.abs(dx)>=w*.30;
    const meaningfulTravel=Math.abs(dx)>=Math.max(46,w*.11);
    const projectedCommit=meaningfulTravel&&Math.abs(projected)>=w*.34;
    let commit=!!targetMemory&&(distanceCommit||projectedCommit);

    if(commit){
      const moved=book.step(direction);
      if(!moved)commit=false;
    }

    const targetX=commit?(direction>0?-w:w):0;
    animateSpring(targetX,velocityPxMs,()=>hideStrip());
  }

  story.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(pointerId!==null)return;
    if(startsOnTimeline(e)||startsOnControl(e))return;

    if(springRaf)cancelSpring(true);

    pointerId=e.pointerId;
    mode=null;
    startX=lastX=e.clientX;
    startY=lastY=e.clientY;
    samples=[{x:e.clientX,t:performance.now()}];
    try{story.setPointerCapture(e.pointerId);}catch(err){}
  },{passive:true,capture:true});

  story.addEventListener('pointermove',e=>{
    if(e.pointerId!==pointerId)return;
    const now=performance.now();
    const dx=e.clientX-startX;
    const dy=e.clientY-startY;
    lastX=e.clientX;
    lastY=e.clientY;
    addSample(e.clientX,now);

    if(!mode){
      const horizontal=Math.abs(dx)>=6&&Math.abs(dx)>Math.abs(dy)*1.06;
      const vertical=Math.abs(dy)>=6&&Math.abs(dy)>Math.abs(dx)*1.10;
      if(horizontal){
        mode='horizontal';
        showStrip();
      }else if(vertical){
        mode='vertical';
      }
    }

    if(mode!=='horizontal')return;
    e.preventDefault();
    positionStrip(dx);
  },{passive:false,capture:true});

  story.addEventListener('pointerup',e=>{
    if(e.pointerId!==pointerId)return;
    const now=performance.now();
    const dx=e.clientX-startX;
    const dy=e.clientY-startY;

    if(!mode&&Math.abs(dx)>=12&&Math.abs(dx)>Math.abs(dy)*1.06){
      mode='horizontal';
      showStrip();
      positionStrip(dx);
    }

    if(mode==='horizontal'){
      const velocity=releaseVelocity(e.clientX,now);
      settleFromRelease(dx,velocity);
    }else if(stripVisible){
      hideStrip();
    }
    finishGestureTracking();
  },{passive:true,capture:true});

  story.addEventListener('pointercancel',e=>{
    if(e.pointerId!==pointerId)return;
    if(mode==='horizontal'&&stripVisible){
      const velocity=releaseVelocity(lastX,performance.now());
      animateSpring(0,velocity,()=>hideStrip());
    }else if(stripVisible){
      hideStrip();
    }
    finishGestureTracking();
  },{passive:true,capture:true});

  window.addEventListener('resize',()=>{
    if(!stripVisible)return;
    [previousPage,currentPage,nextPage].forEach(pageFit);
    positionStrip(stripX);
  },{passive:true});
})();
`;
