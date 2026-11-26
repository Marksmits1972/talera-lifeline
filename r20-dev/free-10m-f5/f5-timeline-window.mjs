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
 one('function formatMemoryDate(memory) {',[
  nearestVisibleMemory.toString(),selectionBounds.toString(),
  `function timelineWindowMemory(ms=centerMs,preferred=activeMemoryId){
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
 one('const firstOwnMemory=nearestMemory(centerMs);\nif(firstOwnMemory)writeMemory(firstOwnMemory);',
     'const firstOwnMemory=timelineWindowMemory();\nif(firstOwnMemory)writeMemory(firstOwnMemory);else clearTimelineSelection();','EMPTY_BOOT');
 one('if(item.id!==activeMemoryId)writeMemory(item);else settlePhoto(item);',
     'if(item.id!==activeMemoryId)writeMemory(item);else{settlePhoto(item);timelineDisplay(null)}','EXISTING_BOOK_CHOOSE');
 // The explicit neighbor API remains unbounded. Only the year view lookup
 // is a timeline lookup, so it must not borrow a remote memory.
 one('const memory=rt.nearestMemory(clamped);','const memory=rt.windowMemory(clamped);','YEAR_ENTRY');
 one('     const visible=runtime.currentMemory();\n     if(visible?._taleraLocal)await hydrate(visible);',
     '     runtime.draw();\n     const visible=runtime.currentMemory();\n     if(visible?._taleraLocal)await hydrate(visible);','POST_HYDRATION_SELECTION');
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
