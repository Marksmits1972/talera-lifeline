export const fastFlickFallbackScript = String.raw`
(()=>{
  const story=document.getElementById('memoryStoryScroll');
  const book=window.__taleraPhotoBook;
  if(!story||!book)return;

  /*
    Narrow safety net for very quick mobile flicks.
    The presentation controller remains the primary gesture owner.
    This only acts after pointerup/pointercancel when the controller did
    not advance at all, which is especially useful when a fast touch is
    cancelled by the browser before the normal release path can commit.
  */
  const MAX_FLICK_AGE=240;
  const MIN_FLICK_DISTANCE=16;
  const MIN_FLICK_SPEED=.30;
  const HORIZONTAL_BIAS=1.12;

  const active=new Map();

  function isInsideStory(target){
    return target===story||story.contains(target);
  }

  function rememberDown(e){
    if(!isInsideStory(e.target))return;
    if(e.pointerType==='mouse'&&e.button!==0)return;
    const state=book.state();
    active.set(e.pointerId,{
      x:e.clientX,
      y:e.clientY,
      lastX:e.clientX,
      lastY:e.clientY,
      started:performance.now(),
      index:state.index
    });
  }

  function rememberMove(e){
    const g=active.get(e.pointerId);
    if(!g)return;
    g.lastX=e.clientX;
    g.lastY=e.clientY;
  }

  function finish(e){
    const g=active.get(e.pointerId);
    if(!g)return;
    active.delete(e.pointerId);

    /* Some mobile browsers report (0,0) on pointercancel. Prefer the last
       real move point in that case so a cancelled gesture cannot invent
       a huge swipe toward the screen origin. */
    const cancelLostPoint=e.type==='pointercancel'&&e.clientX===0&&e.clientY===0;
    const endX=!cancelLostPoint&&Number.isFinite(e.clientX)?e.clientX:g.lastX;
    const endY=!cancelLostPoint&&Number.isFinite(e.clientY)?e.clientY:g.lastY;
    const dx=endX-g.x;
    const dy=endY-g.y;
    const age=Math.max(16,performance.now()-g.started);
    const speed=Math.abs(dx)/age;

    const quick=age<=MAX_FLICK_AGE;
    const farEnough=Math.abs(dx)>=MIN_FLICK_DISTANCE;
    const horizontal=Math.abs(dx)>Math.abs(dy)*HORIZONTAL_BIAS;
    const fastEnough=speed>=MIN_FLICK_SPEED;
    if(!(quick&&farEnough&&horizontal&&fastEnough))return;

    const direction=dx<0?1:-1;

    /* Let the normal controller finish this event first. If it already
       changed memory, do nothing. Otherwise perform exactly one fallback
       step in the gesture direction and discard a rejected return overlay. */
    setTimeout(()=>{
      const state=book.state();
      if(state.index!==g.index)return;
      const target=direction>0?state.next:state.previous;
      if(!target)return;
      document.querySelectorAll('.photo-book-overlay').forEach(node=>node.remove());
      book.step(direction);
    },0);
  }

  document.addEventListener('pointerdown',rememberDown,true);
  document.addEventListener('pointermove',rememberMove,true);
  document.addEventListener('pointerup',finish,true);
  document.addEventListener('pointercancel',finish,true);
})();
`;
