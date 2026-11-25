// One local day/week loupe owned by the existing TALERA timeline only.
// No media, storage, playback, network or second memory ordering.
export const LOUPE_HOLD_MS=2000;
export const LOUPE_SLOP_PX=8;
export const LOUPE_STEP_PX=28;
export const LOUPE_STEP_INTERVAL_MS=280;
const loupeClamp=(x,min,max)=>Math.max(min,Math.min(max,x));

// One adjacent memory per accepted step, even on an exceptionally fast flick.
// Keep at most one extra step of gesture credit; never queue a long runaway.
export function createLoupeMotion(step){
 let credit=0,lastStep=-Infinity,velocity=0,previousAt=0,previousX=0,tail=0;
 const cap=LOUPE_STEP_PX*1.5;
 const maxVelocity=LOUPE_STEP_PX*1000/LOUPE_STEP_INTERVAL_MS;
 function consume(now){
  if(Math.abs(credit)<LOUPE_STEP_PX||now-lastStep<LOUPE_STEP_INTERVAL_MS)return false;
  const dir=Math.sign(credit);
  if(!step(dir)){credit=0;velocity=0;tail=0;return false}
  credit-=dir*LOUPE_STEP_PX;lastStep=now;return true;
 }
 return {
  begin(x,now){credit=0;velocity=0;tail=0;previousX=x;previousAt=now},
  move(x,now){
   const dx=previousX-x,dt=Math.max(8,now-previousAt);
   previousX=x;previousAt=now;
   if(!dx)return false;
   if(Math.sign(dx)!==Math.sign(credit))credit=0;
   credit=loupeClamp(credit+dx,-cap,cap);
   velocity=loupeClamp(dx*1000/dt,-maxVelocity,maxVelocity);
   return consume(now);
  },
  release(now){
   // A stationary finger at release never produces a delayed selection.
   if(now-previousAt>100||Math.abs(velocity)<20){credit=0;velocity=0;tail=0;return false}
   tail=360;return true;
  },
  coast(now,dt){
   if(tail<=0)return false;
   dt=loupeClamp(dt,0,40);tail-=dt;
   credit=loupeClamp(credit+velocity*dt/1000,-cap,cap);
   velocity*=Math.exp(-dt/155);
   consume(now);
   if(tail<=0||Math.abs(velocity)<5){credit=0;velocity=0;tail=0;return false}
   return true;
  },
  stop(){credit=0;velocity=0;tail=0}
 };
}

// Calendar days, not fixed 24-hour durations (DST transitions are supported).
export function loupeDays(ms,lifeStart,lifeEnd,locale='nl-NL'){
 const base=new Date(ms);base.setHours(12,0,0,0);
 const lower=new Date(lifeStart);lower.setHours(0,0,0,0);
 const upper=new Date(lifeEnd);upper.setHours(23,59,59,999);
 const format=new Intl.DateTimeFormat(locale,{weekday:'short'});
 return Array.from({length:7},(_,i)=>{
  const d=new Date(base);d.setDate(d.getDate()+i-3);
  return {label:d>=lower&&d<=upper?format.format(d).replace(/\.$/,''):'',center:i===3};
 });
}

export function mountTimelineLoupe({surface,openNative,closeNative,selection,step,lifeStart,lifeEnd,locale}){
 const panel=document.createElement('div');
 panel.id='talera-timeline-loupe';panel.hidden=true;panel.setAttribute('aria-hidden','true');
 const scale=document.createElement('div');scale.className='talera-loupe-scale';panel.append(scale);
 const cells=Array.from({length:7},()=>{const cell=document.createElement('span');scale.append(cell);return cell});
 surface.insertBefore(panel,surface.querySelector('.center-needle'));
 let pending=null,active=null,opened=false,frame=0,outside=null,swallowClick=false,lastWheel=-Infinity;
 const motion=createLoupeMotion(dir=>{const changed=step(dir);if(changed)render();return changed});
 const now=()=>performance.now();
 const clearPending=()=>{if(!pending)return;clearTimeout(pending.timer);pending=null};
 function render(){
  const current=selection();
  const days=loupeDays(current.ms,lifeStart,lifeEnd,locale());
  cells.forEach((cell,i)=>{cell.textContent=days[i].label;cell.classList.toggle('is-empty',!days[i].label);cell.classList.toggle('is-center',days[i].center)});
  // Accessible description and testable identity are the existing selection,
  // never a second selection state or a saved record.
  panel.dataset.memoryId=current.id==null?'':String(current.id);
 }
 function stop(){if(frame)cancelAnimationFrame(frame);frame=0;motion.stop()}
 function open(e){
  const p=pending;clearPending();
  if(!p||!openNative(p.id))return;
  opened=true;surface.dataset.taleraLoupe='open';panel.hidden=false;
  active=p.id;motion.begin(p.x,now());render();
 }
 function close(){
  if(!opened)return;
  stop();active=null;opened=false;panel.hidden=true;delete surface.dataset.taleraLoupe;
  closeNative();
 }
 function inside(e){
  const r=surface.getBoundingClientRect(),axis=r.bottom-64;
  return e.clientX>=r.left&&e.clientX<=r.right&&Math.abs(e.clientY-axis)<=20;
 }
 function cancelEvent(e){if(e.cancelable)e.preventDefault();e.stopImmediatePropagation()}
 // Consume the entire outside gesture, including its compatibility click.
 // A later, separate gesture is not consumed.
 document.addEventListener('pointerdown',e=>{
  swallowClick=false;
  if(!opened)return;
  stop();
  if(active!==null){if(e.pointerId!==active)cancelEvent(e);return}
  if(inside(e))return;
  outside={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
  swallowClick=true;cancelEvent(e);
 },true);
 document.addEventListener('pointermove',e=>{
  if(!outside||outside.id!==e.pointerId)return;
  if(Math.hypot(e.clientX-outside.x,e.clientY-outside.y)>LOUPE_SLOP_PX)outside.moved=true;
  cancelEvent(e);
 },true);
 function outsideEnd(e){
  if(!outside||outside.id!==e.pointerId)return;
  const tap=!outside.moved&&Math.hypot(e.clientX-outside.x,e.clientY-outside.y)<=LOUPE_SLOP_PX&&e.type==='pointerup';
  outside=null;cancelEvent(e);if(tap)close();
 }
 document.addEventListener('pointerup',outsideEnd,true);
 document.addEventListener('pointercancel',outsideEnd,true);
 document.addEventListener('click',e=>{if(swallowClick||opened){swallowClick=false;cancelEvent(e)}},true);
 // Existing photo/reading gestures include touch listeners; prevent their
 // compatibility events only while the loupe owns this gesture.
 for(const type of ['touchstart','touchmove','touchend','touchcancel']){
  document.addEventListener(type,e=>{if(opened||outside||swallowClick)cancelEvent(e)},{capture:true,passive:false});
 }
 document.addEventListener('contextmenu',e=>{if(opened||pending)cancelEvent(e)},true);
 function interrupt(){clearPending();stop();active=null;outside=null;swallowClick=false}
 window.addEventListener('pagehide',interrupt);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt()});
 return {
  get opened(){return opened},
  arm(e){
   clearPending();
   if(e.button!==0||e.isPrimary===false)return false;
   const p={id:e.pointerId,x:e.clientX,y:e.clientY,timer:0};
   pending=p;p.timer=setTimeout(()=>open(e),LOUPE_HOLD_MS);return true;
  },
  cancelPending(id){
   if(!pending||(id!==undefined&&pending.id!==id))return false;
   clearPending();return true;
  },
  waiting(e){
   if(!pending||pending.id!==e.pointerId)return false;
   if(Math.hypot(e.clientX-pending.x,e.clientY-pending.y)<=LOUPE_SLOP_PX)return true;
   clearPending();return false;
  },
  down(e){
   if(!opened)return false;
   if(active!==null||!inside(e))return true;
   stop();active=e.pointerId;surface.setPointerCapture(e.pointerId);
   motion.begin(e.clientX,now());return true;
  },
  move(e){
   if(!opened)return false;
   if(active===e.pointerId)motion.move(e.clientX,now());return true;
  },
  end(e){
   if(!opened)return false;
   if(active===e.pointerId){
    active=null;
    let previous=now();
    if(e.type==='pointerup'&&motion.release(previous)){
     const animate=t=>{frame=0;const dt=t-previous;previous=t;if(motion.coast(t,dt))frame=requestAnimationFrame(animate)};
     frame=requestAnimationFrame(animate);
    }else stop();
   }
   return true;
  },
  wheel(e){if(!opened)return false;stop();const t=now();if(t-lastWheel>=LOUPE_STEP_INTERVAL_MS&&Math.abs(e.deltaX)>Math.abs(e.deltaY)*.75&&e.deltaX){lastWheel=t;step(Math.sign(e.deltaX));render()}return true}
 };
}
