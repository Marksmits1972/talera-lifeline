import baseWorker from './clean-router-worker.js';

const UX_POLISH_REVISION = 'storylab-clean-sheet-polish-20260917-r1';

const UX_STYLE = String.raw`
<style id="talera-storylab-sheet-polish">
:root{--talera-sheet-peek:56px;--talera-sheet-open:min(58dvh,500px)}
#sheet.talera-smooth-sheet{
  height:var(--talera-sheet-open)!important;
  transform:translate3d(0,calc(100% - var(--talera-sheet-peek)),0);
  transition:transform .46s cubic-bezier(.22,.78,.25,1),box-shadow .30s ease!important;
  will-change:transform;
  overflow:hidden;
}
#sheet.talera-smooth-sheet.open{height:var(--talera-sheet-open)!important;transform:translate3d(0,0,0)}
#sheet.talera-smooth-sheet.dragging{transition:none!important}
#sheet.talera-smooth-sheet .sheet-editor{height:calc(100% - 34px)}
#sheet.talera-smooth-sheet.open .sheet-editor{animation:taleraTextIn .22s ease both}
@keyframes taleraTextIn{from{opacity:.35;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
#sheet.talera-smooth-sheet .handle{cursor:grab;touch-action:none}
#sheet.talera-smooth-sheet.dragging .handle{cursor:grabbing}
#sheet.talera-smooth-sheet .sheet-text{touch-action:none}
@media(max-height:760px){:root{--talera-sheet-peek:50px;--talera-sheet-open:min(61dvh,470px)}}
@media(prefers-reduced-motion:reduce){#sheet.talera-smooth-sheet{transition:none!important}#sheet.talera-smooth-sheet.open .sheet-editor{animation:none!important}}
</style>`;

const UX_SCRIPT = String.raw`
<script id="talera-storylab-sheet-polish-script">
(()=>{
  const REV='${UX_POLISH_REVISION}';
  const sheet=document.getElementById('sheet');
  const screen=document.getElementById('screen');
  const handle=document.getElementById('sheetHandle');
  const preview=document.getElementById('sheetPreview');
  const storyText=document.getElementById('storyText');
  const closeButton=document.getElementById('sheetClose');
  if(!sheet||!screen||!handle||!preview||!storyText)return;

  sheet.classList.add('talera-smooth-sheet');
  let closedY=0;
  let drag=null;
  let suppressClickUntil=0;
  const originalClose=closeButton&&closeButton.onclick;

  function peekHeight(){
    const raw=getComputedStyle(document.documentElement).getPropertyValue('--talera-sheet-peek');
    const value=parseFloat(raw);
    return Number.isFinite(value)?value:56;
  }

  function measure(){
    closedY=Math.max(0,sheet.offsetHeight-peekHeight());
    const open=sheet.classList.contains('open');
    sheet.style.transform='translate3d(0,'+(open?0:closedY)+'px,0)';
  }

  function settle(open,animate=true){
    drag=null;
    sheet.classList.remove('dragging');
    sheet.style.transition=animate?'transform .46s cubic-bezier(.22,.78,.25,1),box-shadow .30s ease':'none';
    sheet.classList.toggle('open',Boolean(open));
    screen.classList.toggle('sheet-open',Boolean(open));
    sheet.style.transform='translate3d(0,'+(open?0:closedY)+'px,0)';
    if(!open){
      try{storyText.blur()}catch(e){}
    }else if(document.activeElement===storyText){
      try{storyText.blur()}catch(e){}
    }
    if(animate)setTimeout(()=>{if(!drag)sheet.style.transition='';},500);
  }

  function toggleFromTap(event){
    if(Date.now()<suppressClickUntil)return;
    if(event){event.preventDefault();event.stopPropagation()}
    settle(!sheet.classList.contains('open'),true);
  }

  handle.onclick=toggleFromTap;
  preview.onclick=toggleFromTap;

  if(closeButton){
    closeButton.onclick=function(event){
      if(originalClose){try{originalClose.call(closeButton,event)}catch(e){}}
      settle(false,true);
    };
  }

  function eligibleTarget(target){
    return Boolean(target&&target.closest&&target.closest('#sheetHandle,#sheetPreview'));
  }

  sheet.addEventListener('touchstart',event=>{
    if(!eligibleTarget(event.target))return;
    event.stopImmediatePropagation();
    const touch=event.changedTouches&&event.changedTouches[0];
    if(!touch)return;
    const open=sheet.classList.contains('open');
    drag={startY:touch.clientY,startOffset:open?0:closedY,lastOffset:open?0:closedY,moved:0,wasOpen:open};
    sheet.classList.add('dragging');
    sheet.style.transition='none';
  },true);

  sheet.addEventListener('touchmove',event=>{
    if(!drag)return;
    event.preventDefault();event.stopImmediatePropagation();
    const touch=event.changedTouches&&event.changedTouches[0];
    if(!touch)return;
    const dy=touch.clientY-drag.startY;
    const next=Math.max(0,Math.min(closedY,drag.startOffset+dy));
    drag.moved=dy;drag.lastOffset=next;
    if(next<closedY-4)sheet.classList.add('open');
    else if(!drag.wasOpen)sheet.classList.remove('open');
    screen.classList.toggle('sheet-open',next<closedY*.88);
    sheet.style.transform='translate3d(0,'+next+'px,0)';
  },{capture:true,passive:false});

  sheet.addEventListener('touchend',event=>{
    if(!drag)return;
    event.stopImmediatePropagation();
    const moved=drag.moved||0;
    const offset=drag.lastOffset;
    const wasOpen=drag.wasOpen;
    let open=offset<closedY*.60;
    if(moved<-46)open=true;
    if(moved>46)open=false;
    if(Math.abs(moved)<8)open=!wasOpen;
    suppressClickUntil=Date.now()+450;
    settle(open,true);
  },true);

  sheet.addEventListener('touchcancel',event=>{
    if(!drag)return;
    event.stopImmediatePropagation();
    settle(drag.wasOpen,true);
  },true);

  window.addEventListener('resize',()=>setTimeout(measure,60),{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(measure,160),{passive:true});
  requestAnimationFrame(()=>{measure();settle(false,false)});
  console.log('[TALERA]',REV,'ready');
})();
</script>`;

async function decorate(response, request) {
  const url = new URL(request.url);
  if (url.pathname !== '/storylab-clean' && url.pathname !== '/storylab-clean/') return response;
  if (response.status !== 200 || !(response.headers.get('content-type') || '').includes('text/html')) return response;
  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-store, max-age=0');
  headers.set('x-storylab-sheet-polish', UX_POLISH_REVISION);
  const withStyle = html.replace('</head>', UX_STYLE + '</head>');
  return new Response(withStyle.replace('</body>', UX_SCRIPT + '</body>'), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    return decorate(response, request);
  },
};
