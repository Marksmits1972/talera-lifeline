// Adapt gesture behavior only in generated Free pages; frozen sources stay intact.
export function freeTellGestures(html) {
  html=html.replace('  function setSheet(open,animate=true){', `  function holdSheet(offset){
    setDragVisual(false);
    const held=clamp(offset,0,geometry.maxOffset);
    const visible=held<geometry.maxOffset-1;
    sheet.classList.toggle('open',visible);
    screen.classList.toggle('sheet-open',visible);
    sheet.setAttribute('aria-expanded',visible?'true':'false');
    paint(held);
    storyText?.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function setSheet(open,animate=true){`);
  html=html.replace('    else setSheet(open,true);','    else holdSheet(sheetOffset);');
  html=html.replace('    mouse=null;setDragVisual(false);setSheet(open,true);','    mouse=null;holdSheet(sheetOffset);');
  html=html.replace(`    const open=screen.classList.contains('sheet-open');
    measure();setSheet(open,false);`, `    const fraction=geometry.maxOffset?sheetOffset/geometry.maxOffset:0;
    measure();holdSheet(fraction*geometry.maxOffset);`);
  // The inherited input callback mistakes its event argument for preview text.
  html=html.replace('storyText.addEventListener(\'input\',updateSheetPreview);', "storyText.addEventListener('input',()=>updateSheetPreview());");
  return html;
}
export function freeTimelineGestures(html) {
  // End pointer ownership even if Safari ends the drag outside the ruler.
  html=html.replace('function pointerEnd(e) {','function pointerEnd(e) {\n  if(!pointers.has(e.pointerId))return;')
    .replace('surface.addEventListener(\"pointercancel\",pointerEnd);','surface.addEventListener(\"pointercancel\",pointerEnd);\nwindow.addEventListener(\"pointerup\",pointerEnd);\nwindow.addEventListener(\"pointercancel\",pointerEnd);\nsurface.addEventListener(\"lostpointercapture\",pointerEnd);');
  // Memories have a calendar date, not an hour. Keep the inherited calendar
  // levels, but never enter the day/hour rulers (levels 4 and 5).
  html=html.replaceAll('z=clamp(z,0,5);','z=clamp(z,0,3);')
    .replaceAll('clamp(Math.round(zoomPos),0,5)','clamp(Math.round(zoomPos),0,3)')
    .replaceAll('clamp(Math.round(visualZoomPos),0,5)','clamp(Math.round(visualZoomPos),0,3)')
    .replaceAll('clamp(pinchStartZoom+Math.log(dist/pinchStartDist)*1.8,0,5)','clamp(pinchStartZoom+Math.log(dist/pinchStartDist)*1.8,0,3)')
    .replaceAll('clamp(zoomPos-e.deltaY*.004,0,5)','clamp(zoomPos-e.deltaY*.004,0,3)')
    .replace('    const major=i%2===0;', '    const labelEvery=Math.max(2,Math.ceil(76/((MS_DAY/(endMs-startMs))*w)));\n    const major=i%labelEvery===0;');
  return html.replace('  function settleFromRelease(dx,velocityPxMs){', `  // Safari may restore a page without delivering the interrupted gesture's end.
  function resetFreeGesture(){
    finishGestureTracking();
    if(springRaf)finishSpringNow();
    if(stripVisible)afterVisualSettle();
  }
  window.addEventListener('pagehide',resetFreeGesture);
  window.addEventListener('pageshow',resetFreeGesture);
  function settleFromRelease(dx,velocityPxMs){`);
}
