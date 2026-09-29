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

  /* The photograph is the stage: always fill the complete large screen. */
  .photo-stage,.photo-layer{position:absolute!important;inset:0!important}
  .photo-backdrop{
    inset:-72px!important;
    width:calc(100% + 144px)!important;
    height:calc(100% + 144px)!important;
    object-fit:cover!important;
    opacity:.72!important;
    filter:blur(34px) saturate(1.02) brightness(.94)!important;
  }

  /* Timeline becomes a clear visual navigation ribbon, while remaining secondary. */
  .timeline{height:210px!important;min-height:210px!important}
  .timeline::before{
    height:258px!important;
    backdrop-filter:blur(18px) saturate(1.10)!important;
    -webkit-backdrop-filter:blur(18px) saturate(1.10)!important;
    opacity:1!important;
  }
  .timeline canvas,.timeline.is-active canvas{
    opacity:.82!important;
    filter:saturate(1.08) contrast(1.30) brightness(.96) drop-shadow(0 0 2px rgba(255,255,255,.96)) drop-shadow(0 2px 3px rgba(15,39,71,.34))!important;
  }
  .timeline .center-needle,.timeline.is-active .center-needle{
    width:2px!important;opacity:1!important;
    filter:drop-shadow(0 0 4px rgba(255,255,255,.92)) drop-shadow(0 2px 4px rgba(15,39,71,.34))!important;
  }
  .timeline .focus,.timeline.is-active .focus{
    transform:scale(1.08)!important;
    box-shadow:0 8px 26px rgba(15,39,71,.28)!important;
  }
  .timeline.is-timeline-engaged canvas,.timeline.is-timeline-afterglow canvas{
    opacity:1!important;
    filter:saturate(1.38) contrast(1.78) brightness(1.14) drop-shadow(0 0 5px rgba(255,255,255,.84)) drop-shadow(0 2px 5px rgba(15,39,71,.42))!important;
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
`;
