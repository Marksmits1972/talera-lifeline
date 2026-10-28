function taleraV4WriterMotion(overlay,editor){
 const scroller=overlay.querySelector('.talera-writer-body'),viewport=window.visualViewport;
 let raf=0,closed=false;
 function measure(){
  if(closed)return;
  const h=viewport?.height||window.innerHeight,y=viewport?.offsetTop||0;
  overlay.style.setProperty('--talera-v10-viewport-height',Math.max(240,Math.round(h))+'px');
  overlay.style.setProperty('--talera-v10-viewport-top',Math.max(0,Math.round(y))+'px');
 }
 function grow(){
  if(closed)return;
  editor.style.height='1px';
  editor.style.height=Math.max(270,editor.scrollHeight+3)+'px';
 }
 function caretTop(){
  const cs=getComputedStyle(editor),rect=editor.getBoundingClientRect(),scrollRect=scroller.getBoundingClientRect();
  const mirror=document.createElement('div'),marker=document.createElement('span');
  mirror.style.cssText='position:fixed!important;left:-20000px!important;top:0!important;visibility:hidden!important;pointer-events:none!important;box-sizing:border-box!important;white-space:pre-wrap!important;overflow-wrap:break-word!important;word-break:break-word!important;';
  mirror.style.width=rect.width+'px';
  for(const key of ['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','textTransform','paddingTop','paddingBottom','paddingLeft','paddingRight','borderTopWidth','borderBottomWidth','borderLeftWidth','borderRightWidth'])mirror.style[key]=cs[key];
  // The marker must occupy a real position after the text, including spaces and line breaks.
  mirror.append(document.createTextNode(editor.value.slice(0,editor.selectionStart)));
  marker.textContent='\u200b';mirror.append(marker);document.body.append(mirror);
  const y=rect.top-scrollRect.top+scroller.scrollTop+marker.offsetTop+Math.max(20,parseFloat(cs.lineHeight)||28);
  mirror.remove();return y;
 }
 function keepCaret(){
  if(closed||document.activeElement!==editor)return;
  const y=caretTop(),top=scroller.scrollTop,bottom=top+scroller.clientHeight;
  const padding=54;
  if(y>bottom-padding)scroller.scrollTop=Math.min(scroller.scrollHeight-scroller.clientHeight,top+(y-bottom)+padding);
  else if(y-40<top)scroller.scrollTop=Math.max(0,y-70);
 }
 function update(){
  if(closed)return;
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(()=>{raf=0;measure();grow();keepCaret()});
 }
 const select=()=>{if(document.activeElement===editor)update()};
 measure();grow();
 editor.addEventListener('input',update);editor.addEventListener('keyup',select);editor.addEventListener('click',select);editor.addEventListener('focus',update);editor.addEventListener('touchend',select,{passive:true});
 document.addEventListener('selectionchange',select);window.addEventListener('resize',update);window.addEventListener('orientationchange',update);
 viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);
 overlay.__taleraDisposeWriterV4=()=>{
  closed=true;if(raf)cancelAnimationFrame(raf);
  editor.removeEventListener('input',update);editor.removeEventListener('keyup',select);editor.removeEventListener('click',select);editor.removeEventListener('focus',update);editor.removeEventListener('touchend',select);
  document.removeEventListener('selectionchange',select);window.removeEventListener('resize',update);window.removeEventListener('orientationchange',update);
  viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);
 };
}