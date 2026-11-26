import assert from 'node:assert/strict';

// One selection rule, independent of media and playback. Inclusive edges.
// Values are native timestamps (normal ruler) or projected stop positions
// (loupe: identical timestamps have independent, visible positions).
export function nearestVisibleMemory(items, center, start, end, preferredId, coordinate=m=>m.ms){
 if(![center,start,end].every(Number.isFinite)||start>end)return null;
 let best=null,distance=Infinity;
 for(const item of items){
  const value=coordinate(item);
  if(!Number.isFinite(value)||value<start||value>end)continue;
  const d=Math.abs(value-center);
  if(d<distance||(d===distance&&item.id===preferredId)){best=item;distance=d}
 }
 return best;
}

// Keep the existing rendered ruler and gesture scales. The owner explicitly
// specified a moving 5-year selection window, then a one-year window.
// Narrower native pinch scales and the life boundaries are still respected.
export function selectionBounds(center, start, end, visualZoom, lifeStart, lifeEnd){
 const year=365.2425*86400000;
 const zoom=Math.max(0,Math.min(1,visualZoom));
 const half=year*5*Math.pow(1/5,zoom)/2;
 return [Math.max(start,center-half,lifeStart),Math.min(end,center+half,lifeEnd)];
}

export function installBoundedTimelineSelection(html){
 const one=(a,b,label)=>{
  assert.equal(html.split(a).length,2,'F5_TIMELINE_WINDOW_SOURCE_DRIFT_'+label);
  html=html.replace(a,()=>b);
 };
 // This hook runs AFTER the existing timeline/loep and motion bridges.
 one('let activeMemoryId = 50;        // HTML fallback is memory 50.',
     'let activeMemoryId = null; // No active memory in an empty time window.','INITIAL_ID');
 // The former half-ruler padding could force a real childhood memory several
 // years away from the date needle. Keep the center on the actual life line;
 // clip the paint before birth in the same way it is clipped after today.
 one('  const span=spanForZoom(zoomPos);\n  const half=span*MS_DAY/2;\n  const minCenter=LIFE_START+Math.min(half,(LIFE_END-LIFE_START)/2);\n  centerMs=clamp(centerMs,(surface.dataset.taleraLoupe==="open"||taleraLoupeHoldMs!==null&&centerMs===taleraLoupeHoldMs)?LIFE_START:minCenter,LIFE_END);',
     '  centerMs=clamp(centerMs,LIFE_START,LIFE_END);','ACTUAL_LIFE_CENTER');
 one('  ctx.save();ctx.beginPath();ctx.rect(0,0,endX,h);ctx.clip();',
     '  const startX=Math.max(0,Math.min(w,((LIFE_START-startMs)/(endMs-startMs))*w));\n  ctx.save();ctx.beginPath();ctx.rect(startX,0,Math.max(0,endX-startX),h);ctx.clip();','CLIP_BEFORE_BIRTH');
 one('function formatMemoryDate(memory) {',[
  nearestVisibleMemory.toString(),selectionBounds.toString(),
  `function timelineWindowMemory(ms=centerMs,preferred=activeMemoryId){
    // A consented read-only share opens one explicitly chosen memory. This
    // is not a search of the private timeline and must never borrow from it.
    if(window.TaleraGuestOneMemory&&MEMORIES.length===1)return MEMORIES[0];
    const [from,to]=bounds(),shift=ms-centerMs;
    const [start,end]=selectionBounds(ms,from+shift,to+shift,visualZoomPos,LIFE_START,LIFE_END);
    return nearestVisibleMemory(MEMORIES,ms,start,end,preferred);
  }
  function timelineDisplay(mode){
    if(mode)document.documentElement.dataset.taleraTimelineWindow=mode;
    else delete document.documentElement.dataset.taleraTimelineWindow;
  }
  function clearTimelineSelection(mode="empty"){
    const had=activeMemoryId!==null;
    const was=document.documentElement.dataset.taleraTimelineWindow;
    if(!had&&was===mode)return;
    clearTimeout(storySwitchTimer);pendingMemoryId=null;
    activeMemoryId=null;timelineDisplay(mode);
    if(memoryDate)memoryDate.textContent="";
    if(memoryStory)memoryStory.textContent="";
    if(memoryStoryMore)memoryStoryMore.textContent="";
    memoryCaption?.classList.remove("story-switching");
    if(!had)return;
    document.dispatchEvent(new Event("talera:timeline-user-motion"));
    // All existing consumers receive the absence of a selection; neither
    // playback motor is changed, and late ID-guarded callbacks cannot win.
    taleraIntegrationListeners.forEach(fn=>{try{fn(null)}catch(e){}});
  }
  function formatMemoryDate(memory) {`
 ].join('\n'),'SHARED_RULE');
 // The original renderer still owns every real memory write.
 one('  activeMemoryId = memory.id;\n  pendingMemoryId = null;',
     '  activeMemoryId = memory.id;\n  timelineDisplay(null);\n  pendingMemoryId = null;','REVEAL_VALID_SELECTION');
 one('  const nearest = nearestMemory(centerMs);\n  if (!nearest || nearest.id === activeMemoryId) return;\n\n  if (userIsMoving && !force) {\n    pendingMemoryId = nearest.id;\n    return;\n  }\n\n  switchToMemory(nearest, false);',
     `  const nearest = timelineWindowMemory();
  if(!nearest){clearTimelineSelection();return}
  if(nearest.id===activeMemoryId)return;
  // Native photo gestures are excluded by the existing rolling guard.
  // Do not queue an obsolete story-switch timer during a change of scale.
  clearTimeout(storySwitchTimer);writeMemory(nearest);`,'NATIVE_NEAREST');
 // During native time navigation the existing wheel selects one eligible
 // record. Draw also runs during visual scale animation, not just a drag.
 one('  if (!window.__taleraBandRolling && surface.dataset.taleraLoupe!=="open" && !(taleraLoupeHoldMs!==null&&centerMs===taleraLoupeHoldMs)) {\n    if (userIsMoving) renderJourneyPreview();\n    updateNearestStory();\n  }',
     `  if(surface.dataset.taleraLoupe!=="open"){
    if(window.__taleraIntegratedBand?.getState?.().timelineTracking){
      window.__taleraIntegratedBand.followTimeline(centerMs);
    }else if(!window.__taleraBandRolling&&!(taleraLoupeHoldMs!==null&&centerMs===taleraLoupeHoldMs)){
      updateNearestStory({force:true});
    }
  }`,'DRAW_AT_ALL_SCALES');
 // Native pointer handlers already call draw; the draw hook above owns
 // the following operation, including asynchronous visual-scale frames.
 assert.equal(html.split('    window.__taleraIntegratedBand?.followTimeline?.(centerMs);').length,4,'F5_TIMELINE_WINDOW_SOURCE_DRIFT_DUPLICATE_FOLLOW');
 html=html.replaceAll('    window.__taleraIntegratedBand?.followTimeline?.(centerMs);','');
 one('currentMemory(){return MEMORIES.find(m=>m.id===activeMemoryId)||nearestMemory(centerMs)},',
     `currentMemory(){return MEMORIES.find(m=>m.id===activeMemoryId)||null},
  windowMemory(ms=centerMs,preferred=activeMemoryId){return timelineWindowMemory(ms,preferred)},
  clearTimelineSelection,
  previewTimelineMemory(memory){
    if(!memory){clearTimelineSelection();return}
    if(memory.id!==activeMemoryId)clearTimelineSelection("preview");
    else timelineDisplay(null);
  },`,'RUNTIME_WINDOW');
 one('    const memory=nearestMemory(centerMs);\n    if(memory)settlePhoto(memory);\n    return memory;',
     '    const memory=MEMORIES.find(m=>m.id===activeMemoryId)||null;\n    if(memory)settlePhoto(memory);\n    return memory;','SETTLE_ONLY_ACTIVE');
 // An empty selection has no audio owner, but retain the one paused native
 // node so the approved iOS sound permission survives the next selection.
 one("      closeOrdinaryVideo(!!memory&&!memory._zeroItems?.some(x=>x.kind==='audio'));",
     "      closeOrdinaryVideo(!memory||!memory._zeroItems?.some(x=>x.kind==='audio'));",'PAUSED_NATIVE_VIDEO_RETAINED');
 one('const firstOwnMemory=nearestMemory(centerMs);\nif(firstOwnMemory)writeMemory(firstOwnMemory);',
     'const firstOwnMemory=timelineWindowMemory();\nif(firstOwnMemory)writeMemory(firstOwnMemory);else clearTimelineSelection();','EMPTY_BOOT');
 one('if(item.id!==activeMemoryId)writeMemory(item);else settlePhoto(item);',
     'if(item.id!==activeMemoryId)writeMemory(item);else{settlePhoto(item);timelineDisplay(null)}','EXISTING_BOOK_CHOOSE');
 // The explicit neighbor API remains unbounded. Only the year view lookup
 // is a timeline lookup, so it must not borrow a remote memory.
 one('const memory=rt.nearestMemory(clamped);','const memory=rt.windowMemory(clamped);','YEAR_ENTRY');
 one('     const visible=runtime.currentMemory();\n     if(visible?._taleraLocal)await hydrate(visible);',
     '     runtime.draw();\n     const visible=runtime.currentMemory();\n     if(visible?._taleraLocal)await hydrate(visible);','POST_HYDRATION_SELECTION');
 // The existing capability adapter exposes exactly one read-only record and
 // no ?memory parameter; open it at its date with the existing direct-entry
 // renderer. The private account's unrestricted default route stays blank.
 one("   const selected=isLocalId(wanted)?map.get('pwa:'+wanted):null;",
     "   const selected=isLocalId(wanted)?map.get('pwa:'+wanted):\n     (window.TaleraGuestOneMemory&&memories.length===1?memories[0]:null);",'EXPLICIT_SHARED_MEMORY');
 // Sample local photos already decoded in the existing visible element.
 // A fresh blob fetch can race with pagehide's URL revocation in WebKit;
 // neither a hidden stale photo nor an unloaded blob should drive contrast.
 one("    const layers=[...stage.querySelectorAll('.photo-layer')]",
     "    if(getComputedStyle(stage).visibility==='hidden')return null;\n    const layers=[...stage.querySelectorAll('.photo-layer')]",'NO_HIDDEN_CONTRAST');
 one("      const response=await fetch(src,{mode:'cors',cache:'force-cache'});\n      if(!response.ok)throw Error('Photo unavailable for contrast');\n      const blob=await response.blob();\n      if(blob.size>25000000)throw Error('Photo too large for contrast scan');\n      try{bitmap=await createImageBitmap(blob,{resizeWidth:220,resizeQuality:'low'});}\n      catch{bitmap=await createImageBitmap(blob);}",
     "      if(src.startsWith('blob:')){\n        if(!media.complete||!media.naturalWidth)throw Error('Photo unavailable for contrast');\n        try{bitmap=await createImageBitmap(media,{resizeWidth:220,resizeQuality:'low'});}\n        catch{bitmap=media;}\n      }else{\n        const response=await fetch(src,{mode:'cors',cache:'force-cache'});\n        if(!response.ok)throw Error('Photo unavailable for contrast');\n        const blob=await response.blob();\n        if(blob.size>25000000)throw Error('Photo too large for contrast scan');\n        try{bitmap=await createImageBitmap(blob,{resizeWidth:220,resizeQuality:'low'});}\n        catch{bitmap=await createImageBitmap(blob);}\n      }",'LOCAL_CONTRAST_DECODED_PHOTO');
 one('      const width=isVideo?media.videoWidth:bitmap.width;\n      const height=isVideo?media.videoHeight:bitmap.height;',
     '      const width=isVideo?media.videoWidth:bitmap===media?media.naturalWidth:bitmap.width;\n      const height=isVideo?media.videoHeight:bitmap===media?media.naturalHeight:bitmap.height;','CONTRAST_ORIGINAL_DIMENSIONS');
 // Don't open the wheel with its last index before a time lookup has run.
 one("    open();\n  }\n  function followTimeline(ms){","  }\n  function followTimeline(ms){",'NO_STALE_FIRST_FRAME');
 one('    const now=performance.now(),pos=positionForTimestamp(ms);',`    const items=all(),preferred=items[Math.round(state.p)]?.id;
    const eligible=runtime.windowMemory(ms,preferred);
    runtime.previewTimelineMemory(eligible);
    if(!eligible){
      belt.classList.remove('is-visible');state.visible=false;
      state.center=-1;state.titleIndex=-1;state.timelineLastAt=performance.now();
      state.timelineSpeed=0;return;
    }
    const now=performance.now(),pos=items.findIndex(m=>m.id===eligible.id);
    if(pos<0)return;
    state.p=pos;open();`,'BOUND_WHEEL');
 one('    state.timelineTracking=false;state.timelineSpeed=0;\n    // Keep the actual finger-chosen date while the original book settles.',
     `    const items=all(),eligible=runtime.windowMemory(runtime.centerMs(),items[Math.round(state.p)]?.id);
    state.timelineTracking=false;state.timelineSpeed=0;
    if(!eligible){
      state.visible=false;state.snap=false;state.landing=null;state.v=0;
      belt.classList.remove('is-visible');window.__taleraBandRolling=false;
      window.__taleraNativeTimelineReleaseMs=null;state.timelineFocusReleased=false;
      runtime.clearTimelineSelection();
      document.dispatchEvent(new CustomEvent('talera:wheel-motion',{detail:{active:false}}));
      return;
    }
    state.p=items.findIndex(m=>m.id===eligible.id);
    // Keep the actual finger-chosen date while the original book settles.`,'BOUND_RELEASE');
 // A genuine lower-region photo swipe is unchanged when a memory exists.
 // Nothing in an empty period is a photo target.
 one("    if(isControl(e)||state.drag||!all().length)return;","    if(isControl(e)||state.drag||!all().length||!runtime.currentMemory())return;",'NO_BLANK_PHOTO_SWIPE');
 // The loupe continues using its own exact projected positions and the
 // existing book step/choose bridge. The year range is recomputed on close.
 one(' memories:()=>MEMORIES,\n redraw:ms=>',' memories:()=>MEMORIES,\n clear:()=>{taleraLoupeHoldId=null;clearTimelineSelection()},\n nearest:(scale,position,preferred)=>nearestVisibleMemory(scale.stops,position,position-LOUPE_VISIBLE_DAYS/2,position+LOUPE_VISIBLE_DAYS/2,preferred,s=>s.position),\n redraw:ms=>','LOUPE_CLEAR_BRIDGE');
 one('  taleraLoupeHoldMs=centerMs;resetVisualIntent(performance.now());keepCenterValid();draw();',
     '  taleraLoupeHoldMs=centerMs;resetVisualIntent(performance.now());keepCenterValid();draw();updateNearestStory({force:true});','LOUPE_CLOSE_RANGE');
 const css=`<style id="talera-timeline-window-style">
 html[data-talera-timeline-window="empty"] #photoStage,
 html[data-talera-timeline-window="empty"] #photoStage *,
 html[data-talera-timeline-window="preview"] #photoStage > :not(.talera-wheel-strip),
 html[data-talera-timeline-window="preview"] #photoStage > :not(.talera-wheel-strip) *,
 html[data-talera-timeline-window="empty"] #memoryCaption,
 html[data-talera-timeline-window="empty"] #memoryCaption *,
 html[data-talera-timeline-window="preview"] #memoryDate,
 html[data-talera-timeline-window="preview"] #memoryStoryMore,
 html[data-talera-timeline-window="preview"] #talera-capture-place,
 html[data-talera-timeline-window="preview"] #talera-v18-story-actions,
 html[data-talera-timeline-window] .talera-photo-dots,
 html[data-talera-timeline-window] #talera-v5-editor-pencil,
 html[data-talera-timeline-window] .talera-context-share,
 html[data-talera-timeline-window] .talera-memory-tool,
 html[data-talera-timeline-window] .talera-context-actions{visibility:hidden!important;pointer-events:none!important}
 html[data-talera-timeline-window="empty"] #memoryStoryScroll{pointer-events:none!important}
 </style>`;
 one('</head>',css+'</head>','EMPTY_VISUAL_STATE');
 return html;
}
