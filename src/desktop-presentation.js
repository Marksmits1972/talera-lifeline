/*
 * TALERA desktop presentation layer
 * Desktop-only visual refinement. Mobile/coarse-pointer presentation remains untouched.
 */
export const desktopPresentationStyle = String.raw`
@media (min-width:900px) and (pointer:fine){
  /* Desktop has room: make the timeline a deliberate navigation layer. */
  .timeline{
    height:190px!important;
    min-height:190px!important;
  }
  .timeline::before{
    height:232px!important;
    backdrop-filter:blur(16px) saturate(1.08)!important;
    -webkit-backdrop-filter:blur(16px) saturate(1.08)!important;
    opacity:.98!important;
  }
  .timeline canvas,
  .timeline.is-active canvas{
    opacity:.72!important;
    filter:saturate(1.02) contrast(1.18) brightness(.92) drop-shadow(0 0 1px rgba(255,255,255,.95)) drop-shadow(0 1px 2px rgba(15,39,71,.30))!important;
  }
  .timeline .center-needle,
  .timeline.is-active .center-needle{
    width:2px!important;
    opacity:.94!important;
    filter:drop-shadow(0 1px 4px rgba(255,255,255,.72)) drop-shadow(0 2px 3px rgba(15,39,71,.28))!important;
  }
  .timeline .focus,
  .timeline.is-active .focus{
    transform:scale(1.04)!important;
    box-shadow:0 7px 22px rgba(15,39,71,.24)!important;
  }
  .timeline.is-timeline-engaged canvas,
  .timeline.is-timeline-afterglow canvas{
    opacity:1!important;
    filter:saturate(1.34) contrast(1.72) brightness(1.13) drop-shadow(0 0 5px rgba(255,255,255,.78)) drop-shadow(0 2px 4px rgba(15,39,71,.40))!important;
  }

  /* Give the story a composed desktop text block instead of a phone-width caption. */
  .memory-photo-air{height:64%!important;min-height:420px!important}
  .memory-sheet{
    padding:52px clamp(52px,7vw,120px) 150px!important;
  }
  .memory-sheet::before{left:clamp(52px,7vw,120px)!important}
  .memory-sheet .story{
    max-width:560px!important;
    font-size:clamp(30px,2.25vw,44px)!important;
    line-height:1.08!important;
    letter-spacing:-.025em!important;
    text-wrap:balance!important;
  }
  .memory-sheet .story-more{
    margin-left:calc(-1 * clamp(52px,7vw,120px))!important;
    margin-right:calc(-1 * clamp(52px,7vw,120px))!important;
    padding-left:clamp(52px,7vw,120px)!important;
    padding-right:clamp(52px,7vw,120px)!important;
  }

  /* Audio permission is a phone/browser-unlock affordance, not desktop presentation UI. */
  .talera-audio-consent{display:none!important}

  /* One compact, centred desktop command cluster. */
  nav{
    left:50%!important;
    right:auto!important;
    width:min(620px,calc(100% - 96px))!important;
    transform:translateX(-50%)!important;
    grid-template-columns:1fr 104px 1fr!important;
    padding-left:18px!important;
    padding-right:18px!important;
  }
  nav::before{
    border-radius:34px 34px 0 0!important;
  }
  .tell.nav-item{justify-self:center!important;width:120px!important}
  nav .nav-item:last-child{justify-self:center!important;width:120px!important}

  /* Context actions belong to the same central interaction zone on desktop. */
  .talera-context-share{
    right:calc(50% - 390px)!important;
    bottom:104px!important;
  }
  .talera-memory-audio{
    right:calc(50% - 332px)!important;
    bottom:18px!important;
  }
  .talera-memory-edit{
    right:clamp(28px,4vw,72px)!important;
    top:28px!important;
  }
}
`;
