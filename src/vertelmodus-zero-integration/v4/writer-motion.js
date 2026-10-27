/* V4: genuine shared scroll surface for the images and growing text.
 * Installed inside existing taleraCompactWorkbench, preserving g.media, g.text and saveDraft. */
function taleraV4WriterMotion(overlay, editor){
 const scroller=overlay.querySelector('.talera-writer-body');
 const viewport=window.visualViewport;
 let raf=0,closed=false;
 const measure=()=>{
  if(closed)return;
  const h=viewport?viewport.height:window.innerHeight;
  const y=viewport?viewport.offsetTop:0;
  overlay.style.top=Math.max(0,Math.round(y))+'px';
  overlay.style.height=Math.max(220,Math.round(h))+'px';
 };
 const grow=()=>{
  if(closed)return;
  editor.style.height='auto';
  editor.style.height=Math.max(270,editor.scrollHeight+2)+'px';
 };
 function cursorY(){
  const sel=editor.selectionStart;
  const cs=getComputedStyle(editor);
  const mirror=document.createElement('div'),marker=document.createElement('span');
  mirror.style.cssText='position:absolute!important;left:-9999px!important;top:0!important;visibility:hidden!important;pointer-events:none!important;box-sizing:border-box!important;white-space:pre-wrap!important;overflow-wrap:break-word!important;word-break:break-word!important;';
  mirror.style.width=editor.getBoundingClientRect().width+'px';
  for(const key of ['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','textTransform','paddingTop','paddingBottom','paddingLeft','paddingRight','borderTopWidth','borderBottomWidth','borderLeftWidth','borderRightWidth'])mirror.style[key]=cs[key];
  mirror.textContent=editor.value.slice(0,sel);
  marker.textContent='\u200b';
  mirror.append(marker);overlay.append(mirror);
  const result=editor.offsetTop+marker.offsetTop+Math.max(20,parseFloat(cs.lineHeight)||28);
  mirror.remove();
  return result;
 }
 const keepCursor=()=>{
  if(closed||document.activeElement!==editor)return;
  grow();
  const desired=cursorY();
  const bottom=scroller.scrollTop+scroller.clientHeight-32;
  if(desired>bottom)scroller.scrollTop+=desired-bottom;
  else if(desired-36<scroller.scrollTop)scroller.scrollTop=Math.max(0,desired-65);
 };
 const schedule=()=>{
  if(closed)return;
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(()=>{raf=0;measure();grow();keepCursor()});
 };
 const onResize=()=>schedule();
 const onSelection=()=>{if(document.activeElement===editor)schedule()};
 measure();grow();
 editor.addEventListener('input',schedule);
 editor.addEventListener('keyup',onSelection);
 editor.addEventListener('click',onSelection);
 editor.addEventListener('focus',schedule);
 if(viewport){viewport.addEventListener('resize',onResize);viewport.addEventListener('scroll',onResize)}
 window.addEventListener('resize',onResize);
 window.addEventListener('orientationchange',onResize);
 document.addEventListener('selectionchange',onSelection);
 overlay.__taleraDisposeWriterV4=()=>{
  closed=true;if(raf)cancelAnimationFrame(raf);
  editor.removeEventListener('input',schedule);
  editor.removeEventListener('keyup',onSelection);
  editor.removeEventListener('click',onSelection);
  editor.removeEventListener('focus',schedule);
  if(viewport){viewport.removeEventListener('resize',onResize);viewport.removeEventListener('scroll',onResize)}
  window.removeEventListener('resize',onResize);
  window.removeEventListener('orientationchange',onResize);
  document.removeEventListener('selectionchange',onSelection);
 };
}