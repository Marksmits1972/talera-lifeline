export const enhancementStyle = String.raw`
/* =========================================================
   TALERA — PRESENTATION SCREEN REFERENCE MARKER / 2026-09-08
   Unified photo treatment:
   - one low-strength full-screen atmosphere for colour continuity
   - one blur layer with EXACTLY the same geometry as the sharp photo
   - sharp photo keeps a consistent minimum visual height
   - wide photos enlarge only as much as needed
   - feather is longer and gentler, blur itself is weaker
   - timeline blur is lighter and hands the image back sooner
   - V16 timeline behaviour, swipe and vertical story movement stay unchanged
   ========================================================= */

:root{
  --talera-deep:#0F2747;
  --talera-soft:#5B8FB9;
  --talera-neutral:#F7F4EF;
  --talera-text:#3E4A59;
}
html,body{margin:0!important;width:100%!important;height:100%!important;overflow:hidden!important;background:var(--talera-neutral)!important}
.app{position:relative!important;display:block!important;width:100%!important;height:100dvh!important;overflow:hidden!important;background:var(--talera-neutral)!important}
main{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;overflow:hidden!important;display:block!important;background:var(--talera-neutral)!important}
.memory-space{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important;border:0!important;border-radius:0!important;overflow:hidden!important;background:var(--talera-neutral)!important;box-shadow:none!important}
.photo-stage{position:absolute!important;inset:0!important;z-index:1!important;overflow:hidden!important;background:var(--talera-neutral)!important}
.photo-layer{position:absolute!important;inset:0!important;opacity:0;transform:translate3d(4%,0,0) scale(1.01);transition:opacity .30s ease,transform .38s cubic-bezier(.22,.72,.25,1)!important;will-change:opacity,transform;overflow:hidden!important}
.photo-layer.is-front{opacity:1;transform:translate3d(0,0,0) scale(1)}

/* Ambient colour only. This is deliberately much softer than before and is
   NOT the layer the sharp photo feathers into. */
.photo-backdrop{display:block!important;position:absolute!important;inset:-64px!important;width:calc(100% + 128px)!important;height:calc(100% + 128px)!important;object-fit:cover!important;object-position:center center!important;filter:blur(42px) saturate(.96) brightness(1.01)!important;opacity:.46!important;transform:scale(1.12)!important}

/* Dynamically inserted by JS. This blur uses the exact same left/top/width/
   height as the sharp photo so objects cannot jump during the transition. */
.photo-aligned-blur{position:absolute!important;z-index:1!important;max-width:none!important;display:block!important;object-fit:fill!important;object-position:center center!important;filter:blur(18px) saturate(1.01)!important;opacity:.96!important;transform:none!important;pointer-events:none!important;will-change:left,top,width,height!important}

.example-photo{position:absolute!important;z-index:2!important;max-width:none!important;display:block!important;object-fit:fill!important;object-position:center center!important;filter:none!important;opacity:1!important;background:transparent!important;-webkit-mask-repeat:no-repeat!important;mask-repeat:no-repeat!important;-webkit-mask-size:100% 100%!important;mask-size:100% 100%!important;transform:none!important;will-change:left,top,width,height,-webkit-mask-image,mask-image}
.memory-space::before,.memory-space::after{display:none!important;content:none!important}

.timeline{position:absolute!important;z-index:20!important;left:0!important;right:0!important;top:0!important;width:100%!important;height:clamp(148px,20dvh,176px)!important;min-height:148px!important;overflow:visible!important;isolation:isolate!important;background:transparent!important;border:0!important;box-shadow:none!important;touch-action:none!important;user-select:none!important}
.timeline::before{content:""!important;display:block!important;position:absolute!important;left:0!important;right:0!important;top:0!important;height:calc(100% + 54px)!important;z-index:0!important;pointer-events:none!important;background:transparent!important;backdrop-filter:blur(13px) saturate(1.02)!important;-webkit-backdrop-filter:blur(13px) saturate(1.02)!important;-webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 42%,rgba(0,0,0,.88) 56%,rgba(0,0,0,.64) 70%,rgba(0,0,0,.38) 82%,rgba(0,0,0,.16) 92%,transparent 100%)!important;mask-image:linear-gradient(to bottom,#000 0%,#000 42%,rgba(0,0,0,.88) 56%,rgba(0,0,0,.64) 70%,rgba(0,0,0,.38) 82%,rgba(0,0,0,.16) 92%,transparent 100%)!important}
.timeline::after{display:none!important;content:none!important}.timeline canvas{position:relative!important;z-index:2!important;opacity:1!important;filter:none!important}
.center-needle{z-index:3!important;width:1.5px!important;height:54%!important;max-height:86px!important;min-height:58px!important;top:24%!important}.center-needle::before{transform:scale(.82)!important;transform-origin:center!important}.focus{z-index:4!important}.zoom-hint{z-index:5!important}.debug-panel{z-index:20!important}

.memory-story-scroll{position:absolute!important;inset:0!important;z-index:8!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain!important;scrollbar-width:none!important;touch-action:pan-y pan-x!important}.memory-story-scroll::-webkit-scrollbar{display:none!important}.memory-photo-air{height:72%!important;min-height:430px!important;pointer-events:none!important}
.memory-sheet{position:relative!important;min-height:94%!important;padding:46px 24px 130px!important;color:#fff!important;opacity:1!important;transform:translateY(0)!important;background:linear-gradient(180deg,rgba(10,24,40,0) 0px,rgba(10,24,40,.08) 52px,rgba(10,24,40,.18) 118px,rgba(10,24,40,.28) 190px,rgba(10,24,40,.34) 260px,rgba(10,24,40,.18) 350px,rgba(10,24,40,0) 440px)!important;text-shadow:0 2px 14px rgba(6,18,30,.46)!important;transition:opacity .22s ease,transform .28s ease,background .30s ease!important}.memory-sheet.story-switching{opacity:.16!important;transform:translateY(7px)!important}.memory-sheet::before{content:"↑"!important;position:absolute!important;top:18px!important;left:24px!important;font-size:15px!important;color:rgba(255,255,255,.82)!important;text-shadow:0 2px 9px rgba(6,18,30,.42)!important}.memory-sheet .date{color:rgba(255,255,255,.88)!important;font-size:13px!important;line-height:1.2!important;font-weight:680!important;margin:0 0 10px!important;letter-spacing:.08em!important;text-transform:uppercase!important;text-shadow:0 2px 12px rgba(6,18,30,.46)!important}.memory-sheet .story{color:#fff!important;font-size:clamp(25px,6.6vw,34px)!important;line-height:1.08!important;font-weight:680!important;letter-spacing:-.018em!important;max-width:18ch!important;margin:0!important;white-space:pre-line!important;text-shadow:0 2px 15px rgba(6,18,30,.52)!important}.memory-sheet .story-more{display:block!important;margin:clamp(140px,19dvh,190px) -24px 0!important;padding:64px 24px 150px!important;border-top:0!important;color:var(--talera-text)!important;background:linear-gradient(180deg,rgba(247,244,239,0) 0px,rgba(247,244,239,.68) 72px,rgba(247,244,239,.96) 132px,rgb(247,244,239) 190px)!important;font-size:16px!important;line-height:1.62!important;font-weight:430!important;max-width:none!important;white-space:pre-line!important;text-shadow:none!important}.memory-story-scroll.is-reading .memory-sheet{color:var(--talera-deep)!important;text-shadow:none!important;background:linear-gradient(180deg,rgba(247,244,239,.10) 0px,rgba(247,244,239,.74) 100px,rgba(247,244,239,.97) 180px,rgb(247,244,239) 250px)!important}.memory-story-scroll.is-reading .memory-sheet::before,.memory-story-scroll.is-reading .memory-sheet .date,.memory-story-scroll.is-reading .memory-sheet .story{color:var(--talera-deep)!important;text-shadow:none!important}

nav{position:absolute!important;left:0!important;right:0!important;bottom:0!important;z-index:30!important;width:100%!important;height:calc(72px + env(safe-area-inset-bottom))!important;min-height:72px!important;margin:0!important;padding:8px 20px max(8px,env(safe-area-inset-bottom))!important;display:grid!important;grid-template-columns:1fr 1fr 1fr!important;align-items:center!important;overflow:visible!important;background:rgba(15,39,71,.10)!important;border:0!important;box-shadow:none!important;backdrop-filter:blur(18px) saturate(1.05)!important;-webkit-backdrop-filter:blur(18px) saturate(1.05)!important}nav::before{content:""!important;display:block!important;position:absolute!important;left:0!important;right:0!important;bottom:100%!important;height:62px!important;pointer-events:none!important;background:rgba(15,39,71,.04)!important;backdrop-filter:blur(18px) saturate(1.05)!important;-webkit-backdrop-filter:blur(18px) saturate(1.05)!important;-webkit-mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.18) 32%,rgba(0,0,0,.52) 64%,#000 100%)!important;mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.18) 32%,rgba(0,0,0,.52) 64%,#000 100%)!important}nav::after{display:none!important;content:none!important}.nav-item{position:relative!important;z-index:2!important;border:0!important;background:transparent!important;color:rgba(255,255,255,.78)!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;min-height:44px!important;padding:0!important;font-size:9px!important;box-shadow:none!important;text-shadow:0 1px 8px rgba(6,18,30,.34)!important;border-radius:0!important;width:auto!important;height:auto!important}.nav-item.active{color:#fff!important;font-weight:650!important}.nav-item>span:last-child{display:inline!important}.more{width:22px!important;color:currentColor!important;letter-spacing:3px!important;font-size:18px!important;line-height:1!important}.tell{position:relative!important;z-index:2!important;justify-self:center!important;width:54px!important;height:54px!important;border:1px solid rgba(255,255,255,.22)!important;border-radius:50%!important;color:#fff!important;background:rgba(255,255,255,.18)!important;backdrop-filter:blur(8px)!important;-webkit-backdrop-filter:blur(8px)!important;box-shadow:0 8px 22px rgba(6,18,30,.18)!important;font-size:11px!important;font-weight:650!important}
@media (max-height:700px){.timeline{height:142px!important;min-height:142px!important}.memory-photo-air{height:68%!important;min-height:350px!important}.memory-sheet .story{font-size:25px!important}.memory-sheet .story-more{margin-top:120px!important}}
`;

export const enhancementScript = String.raw`
(() => {
  const story = document.getElementById('memoryStoryScroll');
  const surface = document.getElementById('surface');
  const stage = document.getElementById('photoStage');
  const photos = Array.from(document.querySelectorAll('.example-photo'));

  function ensureAlignedBlur(img){
    const layer = img && img.closest('.photo-layer');
    if(!layer) return null;
    let blur = layer.querySelector('.photo-aligned-blur');
    if(!blur){
      blur = document.createElement('img');
      blur.className = 'photo-aligned-blur';
      blur.alt = '';
      blur.setAttribute('aria-hidden','true');
      layer.insertBefore(blur,img);
    }
    if(blur.src !== img.src) blur.src = img.src;
    return blur;
  }

  function fitPhoto(img){
    if(!img || !stage || !img.naturalWidth || !img.naturalHeight) return;
    const blur = ensureAlignedBlur(img);
    const stageRect = stage.getBoundingClientRect();
    const boxW = stageRect.width;
    const boxH = stageRect.height;
    if(!boxW || !boxH) return;

    const containScale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
    const containW = img.naturalWidth * containScale;
    const containH = img.naturalHeight * containScale;

    /* Give the real photo slightly more authority than before. */
    const minVisibleHeight = boxH * 0.68;
    const targetH = Math.min(boxH,Math.max(containH,minVisibleHeight));
    const maxZoomFromContain = 1.82;
    const wantedZoom = targetH / containH;
    const zoom = Math.min(maxZoomFromContain,Math.max(1,wantedZoom));

    const renderedH = containH * zoom;
    const renderedW = containW * zoom;
    const left = (boxW-renderedW)/2;
    const top = (boxH-renderedH)/2;

    [img,blur].forEach((node)=>{
      if(!node) return;
      node.style.inset = 'auto';
      node.style.width = renderedW.toFixed(1) + 'px';
      node.style.height = renderedH.toFixed(1) + 'px';
      node.style.left = left.toFixed(1) + 'px';
      node.style.top = top.toFixed(1) + 'px';
      node.style.transform = 'none';
    });

    /* Less blur, but a slower visual hand-off. The blur and sharp image are now
       geometrically identical, so this feather can be longer without ghosting. */
    const hasVerticalGap = renderedH < boxH - 4;
    if(hasVerticalGap){
      const feather = Math.min(104,Math.max(72,renderedH * 0.095));
      const mask = 'linear-gradient(to bottom,' +
        'transparent 0px,' +
        'rgba(0,0,0,.18) ' + (feather*.28).toFixed(1) + 'px,' +
        'rgba(0,0,0,.62) ' + (feather*.68).toFixed(1) + 'px,' +
        '#000 ' + feather.toFixed(1) + 'px,' +
        '#000 calc(100% - ' + feather.toFixed(1) + 'px),' +
        'rgba(0,0,0,.62) calc(100% - ' + (feather*.68).toFixed(1) + 'px),' +
        'rgba(0,0,0,.18) calc(100% - ' + (feather*.28).toFixed(1) + 'px),' +
        'transparent 100%)';
      img.style.webkitMaskImage = mask;
      img.style.maskImage = mask;
    }else{
      img.style.webkitMaskImage = 'none';
      img.style.maskImage = 'none';
    }
  }

  function fitAll(){requestAnimationFrame(()=>photos.forEach(fitPhoto));}
  photos.forEach((img)=>{
    if(img.complete) fitPhoto(img);
    img.addEventListener('load',()=>fitPhoto(img),{passive:true});
    new MutationObserver(()=>{if(img.complete)requestAnimationFrame(()=>fitPhoto(img));}).observe(img,{attributes:true,attributeFilter:['src']});
  });
  window.addEventListener('resize',fitAll,{passive:true});
  if(window.ResizeObserver && stage){const ro=new ResizeObserver(fitAll);ro.observe(stage);}

  if(!story || !surface) return;
  let pointerId=null,startX=0,startY=0,lastX=0,mode=null;
  story.addEventListener('pointerdown',(e)=>{if(e.pointerType==='mouse'&&e.button!==0)return;pointerId=e.pointerId;startX=lastX=e.clientX;startY=e.clientY;mode=null},{passive:true});
  story.addEventListener('pointermove',(e)=>{if(e.pointerId!==pointerId)return;const dxTotal=e.clientX-startX;const dyTotal=e.clientY-startY;if(!mode&&(Math.abs(dxTotal)>9||Math.abs(dyTotal)>9)){mode=Math.abs(dxTotal)>Math.abs(dyTotal)*1.18?'horizontal':'vertical';}if(mode!=='horizontal')return;e.preventDefault();const dx=e.clientX-lastX;lastX=e.clientX;surface.dispatchEvent(new WheelEvent('wheel',{deltaX:-dx,deltaY:0,bubbles:true,cancelable:true}));},{passive:false});
  const end=(e)=>{if(e.pointerId!==pointerId)return;pointerId=null;mode=null;};story.addEventListener('pointerup',end,{passive:true});story.addEventListener('pointercancel',end,{passive:true});
})();
`;
