export const WORKBLAD_MOBILE_INTERACTION_FIX_REV = 'workblad-mobile-interaction-20260916-r1';

export const WORKBLAD_MOBILE_INTERACTION_FIX_STYLE = String.raw`
/*
 * Mobile Safari interaction guard.
 * The polished workblad is layered on top of the proven workblad shell. While no
 * modal/voice/save layer is active, the actual workblad controls must own the hit
 * plane. This keeps title, date, photo picker, story field and dock buttons tappable.
 */
html.talera-workblad-interaction-ready .work-stage.talera-polished-workblad{
  pointer-events:auto!important;
}
html.talera-workblad-interaction-ready .talera-polished-workblad .work-scroll{
  position:relative!important;
  z-index:70!important;
  pointer-events:auto!important;
}
html.talera-workblad-interaction-ready .talera-polished-workblad .work-sheet{
  position:relative!important;
  z-index:1!important;
  pointer-events:auto!important;
}
html.talera-workblad-interaction-ready .talera-polished-workblad .work-title,
html.talera-workblad-interaction-ready .talera-polished-workblad .work-date-row,
html.talera-workblad-interaction-ready .talera-polished-workblad .work-date,
html.talera-workblad-interaction-ready .talera-polished-workblad .work-photo-section,
html.talera-workblad-interaction-ready .talera-polished-workblad .work-photo,
html.talera-workblad-interaction-ready .talera-polished-workblad .work-story,
html.talera-workblad-interaction-ready .talera-polished-workblad .work-tools,
html.talera-workblad-interaction-ready .talera-polished-workblad .work-tool,
html.talera-workblad-interaction-ready .talera-polished-workblad .work-finish{
  pointer-events:auto!important;
}
html.talera-workblad-interaction-ready .talera-polished-workblad .work-title,
html.talera-workblad-interaction-ready .talera-polished-workblad .work-date,
html.talera-workblad-interaction-ready .talera-polished-workblad .work-story{
  position:relative!important;
  z-index:4!important;
  touch-action:auto!important;
  -webkit-user-select:text!important;
  user-select:text!important;
}
html.talera-workblad-interaction-ready .talera-polished-workblad button{
  touch-action:manipulation!important;
}
html.talera-workblad-interaction-ready .talera-polished-workblad .work-photo{
  position:relative!important;
  z-index:3!important;
  touch-action:pan-y!important;
}
html.talera-workblad-interaction-ready .talera-polished-workblad .work-actions{
  position:relative!important;
  z-index:90!important;
  pointer-events:auto!important;
}
html.talera-workblad-interaction-ready .talera-polished-workblad .work-universal-nav{
  position:relative!important;
  z-index:80!important;
  pointer-events:auto!important;
}
`;

export const WORKBLAD_MOBILE_INTERACTION_FIX_SCRIPT = String.raw`<script id="talera-workblad-mobile-interaction-fix">
(() => {
  if (window.__taleraMobileInteractionFix) return;
  const REV = '${WORKBLAD_MOBILE_INTERACTION_FIX_REV}';
  const BLOCKERS = [
    '.work-saving',
    '.voice-layer',
    '.talera-date-backdrop',
    '.talera-date-choice-backdrop',
    '.talera-manage-backdrop'
  ];
  let queued = false;

  function visible(node) {
    if (!node || node.hidden) return false;
    const style = getComputedStyle(node);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function sync() {
    queued = false;
    const stage = document.querySelector('.work-stage.talera-polished-workblad');
    const blocked = BLOCKERS.some(selector => Array.from(document.querySelectorAll(selector)).some(visible));
    const ready = Boolean(stage && !blocked && !stage.classList.contains('voice-open'));
    document.documentElement.classList.toggle('talera-workblad-interaction-ready', ready);

    if (!stage) return;
    stage.removeAttribute('inert');
    stage.querySelectorAll('#workTitle,#workDate,#workPhoto,#workText,#workVoice,#workFinish,.work-nav-home,.work-nav-item').forEach(node => {
      node.removeAttribute('inert');
      node.style.pointerEvents = 'auto';
    });
  }

  function queueSync() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sync);
  }

  new MutationObserver(queueSync).observe(document.documentElement, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['class','hidden','style']
  });
  document.addEventListener('focusin', queueSync, true);
  document.addEventListener('focusout', queueSync, true);
  window.addEventListener('pageshow', queueSync, {passive:true});
  queueSync();
  window.__taleraMobileInteractionFix = Object.freeze({ revision:REV, refresh:queueSync });
})();
</script>`;
