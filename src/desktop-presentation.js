/*
 * TALERA large-screen presentation mode
 * Phone remains the controller/editor. Desktop, tablet-landscape and TV are a
 * presentation surface: image, story and timeline only.
 */
export const desktopPresentationStyle = String.raw`
@media (min-width:768px){
  html,body,.app,main,.memory-space,.photo-stage,.photo-layer{
    width:100%!important;
    height:100%!important;
    min-width:100%!important;
    min-height:100%!important;
    max-width:none!important;
    max-height:none!important;
    margin:0!important;
    border:0!important;
    border-radius:0!important;
  }
  html,body,.app{height:100dvh!important;background:#0F2747!important}
  .memory-space{position:absolute!important;inset:0!important;overflow:hidden!important}

  /* The photograph is the stage. Landscape imagery fills the viewport; portrait
     imagery stays intact over a soft edge-to-edge backdrop. */
  .photo-stage,.photo-layer{position:absolute!important;inset:0!important}
  .photo-backdrop{
    inset:-72px!important;
    width:calc(100% + 144px)!important;
    height:calc(100% + 144px)!important;
    object-fit:cover!important;
    opacity:.78!important;
    filter:blur(34px) saturate(1.02) brightness(.90)!important;
  }
  .example-photo,.photo-aligned-blur{max-width:none!important}
  .photo-layer.talera-landscape .example-photo{
    inset:0!important;width:100%!important;height:100%!important;
    object-fit:cover!important;object-position:center center!important;
    -webkit-mask-image:none!important;mask-image:none!important;
  }
  .photo-layer.talera-landscape .photo-aligned-blur{opacity:0!important}

  /* Timeline becomes a clear visual navigation ribbon, while remaining secondary. */
  .timeline{
    height:224px!important;min-height:224px!important;
    --timeline-rest-opacity:1;
    --timeline-rest-filter:saturate(1.20) contrast(1.52) brightness(1.06) drop-shadow(0 1px 2px rgba(255,255,255,.95)) drop-shadow(0 3px 5px rgba(15,39,71,.34));
  }
  .timeline::before,
  .timeline.is-timeline-engaged::before,
  .timeline.is-timeline-afterglow::before{
    height:224px!important;
    background:linear-gradient(180deg,rgba(247,244,239,.10) 0%,rgba(247,244,239,.045) 58%,transparent 100%)!important;
    backdrop-filter:none!important;
    -webkit-backdrop-filter:none!important;
    opacity:1!important;
    transition:none!important;
  }
  .timeline::after,
  .timeline.is-timeline-engaged::after,
  .timeline.is-timeline-afterglow::after{
    background:transparent!important;
    opacity:0!important;
  }
  .timeline canvas,.timeline.is-active canvas,
  .timeline.is-timeline-engaged canvas,.timeline.is-timeline-afterglow canvas{
    opacity:1!important;
    filter:saturate(1.20) contrast(1.52) brightness(1.06) drop-shadow(0 1px 2px rgba(255,255,255,.95)) drop-shadow(0 3px 5px rgba(15,39,71,.34))!important;
  }
  .timeline .center-needle,.timeline.is-active .center-needle,
  .timeline.is-timeline-engaged .center-needle,.timeline.is-marker-afterglow .center-needle{
    width:3px!important;opacity:1!important;
    filter:drop-shadow(0 0 5px rgba(255,255,255,1)) drop-shadow(0 3px 5px rgba(15,39,71,.44))!important;
  }
  .timeline .focus,.timeline.is-active .focus,
  .timeline.is-timeline-engaged .focus,.timeline.is-marker-afterglow .focus{
    opacity:1!important;transform:scale(1.10)!important;
    border:1px solid rgba(91,143,185,.34)!important;
    box-shadow:0 9px 28px rgba(15,39,71,.27)!important;
  }

  /* TALERA life-line: turn the proven ruler into a permanent visual story landscape. */
  .timeline{isolation:isolate!important}
  .timeline canvas{
    transform:translateY(-14px) scaleY(1.16)!important;
    transform-origin:center 58%!important;
  }
  .timeline::before{
    content:""!important;
    position:absolute!important;
    left:0!important;right:0!important;top:76px!important;
    height:98px!important;
    background:
      radial-gradient(ellipse at 50% 48%,rgba(91,143,185,.16) 0%,rgba(91,143,185,.07) 24%,transparent 58%),
      linear-gradient(180deg,transparent 0%,rgba(255,255,255,.06) 44%,rgba(15,39,71,.07) 49%,rgba(15,39,71,.11) 50%,rgba(15,39,71,.04) 52%,transparent 100%)!important;
    -webkit-mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent)!important;
    mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent)!important;
    pointer-events:none!important;
  }
  .timeline .center-needle,
  .timeline.is-active .center-needle,
  .timeline.is-timeline-engaged .center-needle,
  .timeline.is-marker-afterglow .center-needle{
    width:2px!important;
    height:118px!important;max-height:none!important;
    top:31px!important;margin-top:0!important;bottom:auto!important;
    background:linear-gradient(180deg,rgba(15,39,71,.22),#0F2747 32%,#0F2747 76%,rgba(15,39,71,.18))!important;
    box-shadow:0 0 0 1px rgba(255,255,255,.32),0 0 18px rgba(91,143,185,.38)!important;
  }
  .timeline .center-needle::before{
    transform:scale(1.05)!important;
    box-shadow:0 0 0 4px rgba(255,255,255,.42),0 0 18px rgba(91,143,185,.58)!important;
  }
  main .timeline .focus,
  main .timeline.is-active .focus,
  main .timeline.is-timeline-engaged .focus,
  main .timeline.is-timeline-afterglow .focus,
  main .timeline.is-marker-afterglow .focus{
    top:156px!important;
    transform:translateX(-50%)!important;
    padding:8px 15px!important;
    border-radius:999px!important;
    font-weight:720!important;
    letter-spacing:-.01em!important;
    background:rgba(255,255,255,.90)!important;
    border:1px solid rgba(91,143,185,.32)!important;
    box-shadow:0 8px 24px rgba(15,39,71,.20),inset 0 1px 0 rgba(255,255,255,.88)!important;
    backdrop-filter:blur(8px)!important;
    -webkit-backdrop-filter:blur(8px)!important;
  }
  .timeline::after{
    content:""!important;
    position:absolute!important;
    left:50%!important;top:50px!important;
    width:210px!important;height:132px!important;
    transform:translateX(-50%)!important;
    border-radius:50%!important;
    background:radial-gradient(ellipse,rgba(255,255,255,.18) 0%,rgba(91,143,185,.07) 34%,transparent 70%)!important;
    opacity:1!important;
    pointer-events:none!important;
    z-index:1!important;
  }

  /* Hero copy: quieter than mobile, anchored in the image without dominating it. */
  .memory-photo-air{height:57%!important;min-height:360px!important}
  .memory-sheet{
    padding:40px clamp(44px,6vw,104px) 110px!important;
    background:linear-gradient(180deg,rgba(6,18,30,0) 0,rgba(6,18,30,.06) 30%,rgba(6,18,30,.26) 68%,rgba(6,18,30,.42) 100%)!important;
  }
  .memory-sheet::before{display:none!important}
  .memory-sheet .story{
    max-width:min(620px,48vw)!important;
    font-size:clamp(24px,2.05vw,36px)!important;
    line-height:1.12!important;
    font-weight:620!important;
    letter-spacing:-.018em!important;
    text-wrap:balance!important;
    text-shadow:0 3px 18px rgba(6,18,30,.58)!important;
  }
  .memory-sheet .story-more{display:none!important}

  /* Large screen is presentation only. All creation, management and navigation live on the phone. */
  nav,.talera-context-share,.talera-memory-edit,.talera-memory-audio,
  .talera-audio-consent,.talera-memory-manager{display:none!important}

  /* Presentation itself should never suggest a desktop work surface. */
  .memory-story-scroll{bottom:0!important}
}

/* Presentation behaviour: classify each image by aspect ratio and keep the
   timeline permanently in its strong visual state on large screens. */
@media (min-width:768px){
  .memory-sheet .story{
    -webkit-text-stroke:.15px rgba(15,39,71,.18);
    text-shadow:0 2px 3px rgba(6,18,30,.82),0 7px 24px rgba(6,18,30,.68)!important;
  }
}
`;

export const desktopPresentationScript = String.raw`
(()=>{
  const large=()=>window.matchMedia('(min-width:768px)').matches;
  const classify=img=>{
    if(!large()||!img||!img.naturalWidth||!img.naturalHeight)return;
    const layer=img.closest('.photo-layer'); if(!layer)return;
    layer.classList.toggle('talera-landscape',(img.naturalWidth/img.naturalHeight)>=1.18);
    layer.classList.toggle('talera-portrait',(img.naturalWidth/img.naturalHeight)<1.18);
  };
  const scan=()=>document.querySelectorAll('.example-photo').forEach(img=>{
    if(img.complete)classify(img);
    img.addEventListener('load',()=>classify(img),{passive:true,once:true});
  });
  scan();
  new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('resize',scan,{passive:true});
  const timeline=document.querySelector('.timeline');
  if(timeline&&large())timeline.classList.add('is-active','is-timeline-engaged','is-timeline-afterglow','is-marker-afterglow');
})();
`;
