export const interactionFixStyle = String.raw`
/* TALERA interaction refinement — photo-book paging + calm timeline */
.photo-layer{
  transform:none!important;
  transition:opacity .14s linear!important;
  will-change:opacity!important;
}
.photo-layer.is-front{transform:none!important}

/* Gesture overlay. It lives inside photoStage, underneath story text and timeline. */
.photo-book-overlay{
  position:absolute!important;
  inset:0!important;
  z-index:40!important;
  overflow:hidden!important;
  pointer-events:none!important;
  contain:layout paint size!important;
}
.photo-book-page{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  opacity:1!important;
  transform:translate3d(0,0,0)!important;
  transition:none!important;
  will-change:transform!important;
  overflow:hidden!important;
  backface-visibility:hidden!important;
  -webkit-backface-visibility:hidden!important;
}
.photo-book-page.is-settling{
  transition:transform .28s cubic-bezier(.22,.72,.25,1)!important;
}

@media (pointer:coarse){
  /* Mobile: a timeline may be internally active because time moved, but it only
     LOOKS awake after deliberate intent on the timeline itself. */
  .timeline.is-active:not(.touch-intent) canvas{
    opacity:.26!important;
    filter:saturate(.55) contrast(.70) brightness(.86)!important;
  }
  .timeline.is-active:not(.touch-intent) .center-needle{opacity:.32!important;filter:none!important}
  .timeline.is-active:not(.touch-intent) .focus{opacity:.36!important;transform:translateZ(0) scale(.97)!important;filter:none!important}
  .timeline.is-active:not(.touch-intent)::after{opacity:.10!important}
  .timeline.is-active.touch-intent canvas{
    opacity:1!important;
    filter:saturate(1.22) contrast(1.42) brightness(1.20) drop-shadow(0 0 4px rgba(255,255,255,.62))!important;
  }
  .timeline.is-active.touch-intent .center-needle{
    opacity:1!important;
    filter:brightness(1.28) drop-shadow(0 0 4px rgba(255,255,255,1)) drop-shadow(0 2px 9px rgba(15,39,71,.48))!important;
  }
  .timeline.is-active.touch-intent .focus{
    opacity:1!important;
    transform:translateZ(0) scale(1.045)!important;
    filter:brightness(1.20) drop-shadow(0 0 5px rgba(255,255,255,.70)) drop-shadow(0 2px 12px rgba(15,39,71,.40))!important;
  }
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

  /* Timeline wake intent: only deliberate work ON the timeline wakes it on touch. */
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

  /* Keep sharp and aligned-blur geometry synchronized immediately after a src change. */
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

  let pid=null,startX=0,startY=0,lastX=0,startT=0,lastT=0,mode=null,direction=0,overlay=null,currentPage=null,targetPage=null;

  function stripIds(root){root.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'))}
  function makePage(src,isCurrent){
    const source=document.getElementById('photoLayerA')||stage.querySelector('.photo-layer');
    const page=source?source.cloneNode(true):document.createElement('div');
    page.classList.add('photo-book-page');
    page.classList.remove('is-front');
    page.style.opacity='1';
    stripIds(page);
    const sharp=page.querySelector('.example-photo');
    const blur=page.querySelector('.photo-aligned-blur');
    const backdrop=page.querySelector('.photo-backdrop');
    if(!isCurrent&&src){
      if(backdrop)backdrop.src=src;
      if(blur)blur.src=src;
      if(sharp){
        sharp.src=src;
        const fit=()=>{const r=stage.getBoundingClientRect();fitNode(sharp,blur,r.width,r.height)};
        if(sharp.complete)fit(); else sharp.addEventListener('load',fit,{once:true,passive:true});
      }
    }
    return page;
  }
  function preloadState(s){[s.previous,s.next].forEach(m=>{if(!m)return;const i=new Image();i.decoding='async';i.src=m.image})}
  function clearOverlay(){if(overlay)overlay.remove();overlay=currentPage=targetPage=null;direction=0}
  function buildOverlay(dir){
    const s=window.__taleraPhotoBook.state();
    const target=dir>0?s.next:s.previous;
    if(!target)return false;
    clearOverlay();
    overlay=document.createElement('div');overlay.className='photo-book-overlay';
    currentPage=makePage(s.current&&s.current.image,true);
    targetPage=makePage(target.image,false);
    overlay.append(currentPage,targetPage);stage.appendChild(overlay);
    direction=dir;
    return true;
  }
  function placePages(dx){
    if(!overlay||!currentPage||!targetPage)return;
    const w=stage.getBoundingClientRect().width;
    currentPage.style.transform='translate3d('+dx.toFixed(1)+'px,0,0)';
    targetPage.style.transform='translate3d('+(dx+direction*w).toFixed(1)+'px,0,0)';
  }
  function settle(commit,velocity){
    if(!overlay||!currentPage||!targetPage){clearOverlay();return}
    const w=stage.getBoundingClientRect().width;
    currentPage.classList.add('is-settling');targetPage.classList.add('is-settling');
    requestAnimationFrame(()=>{
      if(commit){
        currentPage.style.transform='translate3d('+(-direction*w)+'px,0,0)';
        targetPage.style.transform='translate3d(0,0,0)';
        setTimeout(()=>{
          window.__taleraPhotoBook.step(direction);
          requestAnimationFrame(()=>setTimeout(clearOverlay,35));
        },250);
      }else{
        currentPage.style.transform='translate3d(0,0,0)';
        targetPage.style.transform='translate3d('+(direction*w)+'px,0,0)';
        setTimeout(clearOverlay,300);
      }
    });
  }

  /* Capture the photo gesture before the older wheel bridge sees it. Vertical movement
     remains native scroll; horizontal movement becomes a real photo-book page drag. */
  story.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(pid!==null)return;
    e.stopImmediatePropagation();
    pid=e.pointerId;startX=lastX=e.clientX;startY=e.clientY;startT=lastT=performance.now();mode=null;direction=0;
    preloadState(window.__taleraPhotoBook.state());
  },{passive:true,capture:true});

  story.addEventListener('pointermove',e=>{
    if(e.pointerId!==pid)return;
    e.stopImmediatePropagation();
    const dx=e.clientX-startX,dy=e.clientY-startY;
    if(!mode&&(Math.abs(dx)>7||Math.abs(dy)>7))mode=Math.abs(dx)>Math.abs(dy)*1.12?'horizontal':'vertical';
    if(mode!=='horizontal')return;
    e.preventDefault();
    const dir=dx<0?1:-1;
    if(!overlay||dir!==direction){if(!buildOverlay(dir))return}
    lastX=e.clientX;lastT=performance.now();
    placePages(dx);
  },{passive:false,capture:true});

  const finish=e=>{
    if(e.pointerId!==pid)return;
    e.stopImmediatePropagation();
    const now=performance.now(),dx=e.clientX-startX;
    const dt=Math.max(16,now-lastT),velocity=(e.clientX-lastX)/dt;
    const w=stage.getBoundingClientRect().width;
    const commit=mode==='horizontal'&&overlay&&(Math.abs(dx)>Math.max(54,w*.17)||Math.abs(velocity)>.42);
    if(mode==='horizontal')settle(commit,velocity); else clearOverlay();
    pid=null;mode=null;
  };
  story.addEventListener('pointerup',finish,{passive:true,capture:true});
  story.addEventListener('pointercancel',finish,{passive:true,capture:true});
})();
`;