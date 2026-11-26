// The enlarged ruler uses the existing timeline canvas, calendar and photo book.
// No second memory order, media, storage, playback or network.
export const LOUPE_HOLD_MS=350;
export const LOUPE_SLOP_PX=16;
export const LOUPE_VISUAL_SCALE=1.10;
export const LOUPE_PANEL_SCALE=2/3;
export const LOUPE_TOUCH_ZONE=1/3;
export const LOUPE_VISIBLE_DAYS=6/LOUPE_VISUAL_SCALE;
const LOUPE_MS_DAY=86400000;
const clampLoupe=(x,min,max)=>Math.max(min,Math.min(max,x));

// Normally one wheel unit is one day. Only very close/coincident memories
// receive extra room, so each original ID has its own reachable stop.
// Calendar labels and beacons share this projection (including the expansion).
export function createLoupeScale(memories,lifeStart,lifeEnd){
 const stops=[];let shift=0,previous=-Infinity;
 const day=ms=>(ms-lifeStart)/LOUPE_MS_DAY;
 for(const m of memories){
  if(!Number.isFinite(m.ms)||m.ms<lifeStart||m.ms>lifeEnd)continue;
  const position=Math.max(day(m.ms)+shift,previous+.46);
  shift=position-day(m.ms);previous=position;
  stops.push({id:m.id,ms:m.ms,position});
 }
 const end=day(lifeEnd)+shift;
 const byId=new Map(stops.map(s=>[s.id,s]));
 const anchors=[{ms:lifeStart,position:0},...stops,{ms:lifeEnd,position:end}];
 function upper(key,value){
  let l=0,r=anchors.length;
  while(l<r){const mid=(l+r)>>1;if(anchors[mid][key]<=value)l=mid+1;else r=mid}
  return l;
 }
 function convert(key,other,value){
  const i=upper(key,value),a=anchors[Math.max(0,i-1)],b=anchors[Math.min(anchors.length-1,i)];
  if(i===0||i===anchors.length||b[key]===a[key])return a[other];
  return a[other]+(b[other]-a[other])*(value-a[key])/(b[key]-a[key]);
 }
 return {
  stops,byId,end,
  msAt:p=>convert('position','ms',clampLoupe(p,0,end)),
  positionAt:ms=>convert('ms','position',clampLoupe(ms,lifeStart,lifeEnd)),
 };
}

// A drag moves the actual scale continuously. When an unselected memory is
// reached, land on its exact stop before continuing, never skipping IDs.
export function nextLoupeMove(scale,position,target,selectedId){
 target=clampLoupe(target,0,scale.end);
 const direction=Math.sign(target-position);
 if(!direction)return {position};
 const list=scale.stops;
 let lo=0,hi=list.length;
 while(lo<hi){const mid=(lo+hi)>>1;if(list[mid].position<position)lo=mid+1;else hi=mid}
 let i=direction>0?lo:Math.min(list.length-1,lo);
 for(;i>=0&&i<list.length;i+=direction){
  const s=list[i];
  if(direction>0&&s.position>target||direction<0&&s.position<target)break;
  if(direction>0&&s.position<position||direction<0&&s.position>position||s.id===selectedId)continue;
  return {position:s.position,stop:s};
 }
 return {position:target};
}

export function mountTimelineLoupe({surface,openNative,closeNative,selection,select,memories,lifeStart,lifeEnd,locale,redraw}){
 const panel=document.createElement('div');
 panel.id='talera-timeline-loupe';panel.hidden=true;panel.setAttribute('aria-hidden','true');
 surface.insertBefore(panel,surface.firstChild);
 let pending=null,active=null,opened=false,frame=0,outside=null,swallowClick=false;
 let scale=null,position=0,target=0,previousX=0,readyAt=0,lastPainted=null,selecting=false;
 const upperTouches=new Set();
 const now=()=>performance.now();
 const pxPerUnit=()=>Math.max(1,surface.clientWidth)*LOUPE_PANEL_SCALE/LOUPE_VISIBLE_DAYS;
 const clearPending=()=>{if(!pending)return;clearTimeout(pending.timer);pending=null};
 function render(){
  if(!opened)return;
  const current=selection();
  panel.dataset.memoryId=current.id==null?'':String(current.id);
  panel.dataset.position=String(position);
  lastPainted={id:current.id,ms:scale.msAt(position)};
  redraw(lastPainted.ms);
 }
 function stop(){if(frame)cancelAnimationFrame(frame);frame=0;target=position;readyAt=0}
 function refresh(){
  scale=createLoupeScale(memories(),lifeStart,lifeEnd);
  const current=selection(),selected=scale.byId.get(current.id);
  position=selected&&Math.abs(current.ms-selected.ms)<1?selected.position:scale.positionAt(current.ms);
  target=position;
 }
 function pump(t){
  frame=0;
  if(!opened||target===position)return;
  if(t<readyAt){frame=requestAnimationFrame(pump);return}
  const next=nextLoupeMove(scale,position,target,selection().id);
  const before=position;
  position=next.position;
  if(next.stop){
   let accepted=false;selecting=true;
   try{accepted=select(next.stop.id)}finally{selecting=false}
   if(!accepted){position=before;target=position;render();return}
   // Give the selected photo time to be seen before another memory crosses.
   readyAt=t+180;
  }
  render();
  if(target!==position)frame=requestAnimationFrame(pump);
 }
 function shift(dx){
  if(!dx)return;
  // Bound pending movement during a dense cluster, not travel through empty days.
  target=clampLoupe(target+dx/pxPerUnit(),Math.max(0,position-2),Math.min(scale.end,position+2));
  if(!frame)pump(now());
 }
 function open(p,held){
  clearPending();
  if(!p||!openNative(p.id))return false;
  refresh();opened=true;surface.dataset.taleraLoupe='open';panel.hidden=false;
  active=held?p.id:null;previousX=p.lastX;render();return true;
 }
 function close(){
  if(!opened)return;
  stop();active=null;opened=false;panel.hidden=true;lastPainted=null;upperTouches.clear();delete surface.dataset.taleraLoupe;
  closeNative();
 }
 function inside(e){
  const r=surface.getBoundingClientRect();
  return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
 }
 function cancelEvent(e){if(e.cancelable)e.preventDefault();e.stopImmediatePropagation()}
 function beginPointer(e){
  if(active!==null||e.button!==0||e.isPrimary===false)return;
  stop();active=e.pointerId;previousX=e.clientX;
  try{surface.setPointerCapture(e.pointerId)}catch{}
 }
 function movePointer(e){
  const dx=previousX-e.clientX;previousX=e.clientX;
  if(dx)shift(dx)
 }
 function finishPointer(e){
  if(active!==e.pointerId)return;
  active=null;
  if(e.type!=='pointerup'){stop();return}
  // Never keep rolling after the finger has stopped. A dense cluster can
  // settle on the one memory just reached; a new gesture cancels any backlog.
  stop();
  const selected=scale.byId.get(selection().id);
  if(selected&&Math.abs(selected.position-position)*pxPerUnit()<=8){
   position=target=selected.position;render();
  }
 }
 // The zoom is not modal. Only the upper third operates the calendar;
 // the native photo/rememberance surface receives its own gestures unchanged.
 function upper(e){
  const height=window.visualViewport?.height||window.innerHeight;
  return e.clientY>=0&&e.clientY<=height*LOUPE_TOUCH_ZONE;
 }
 function control(e){return !!e.target?.closest?.('button,a,input,textarea,select,[role="button"]')}
 document.addEventListener('pointerdown',e=>{
  swallowClick=false;if(!opened)return;
  if(control(e))return;
  if(upper(e)){
   if(active===null)beginPointer(e);
   cancelEvent(e);return;
  }
  // Do not swallow a lower-region pointerdown: the original photo band
  // must be able to capture and follow the very first movement.
  if(active===null&&e.isPrimary!==false&&e.button===0){
   stop();outside={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
  }
 },true);
 document.addEventListener('pointermove',e=>{
  if(opened&&active===e.pointerId){movePointer(e);cancelEvent(e);return}
  if(!outside||outside.id!==e.pointerId)return;
  if(Math.hypot(e.clientX-outside.x,e.clientY-outside.y)>LOUPE_SLOP_PX)outside.moved=true;
  // Leave real lower-region swipes entirely to the original photo engine.
 },true);
 function pointerFinish(e){
  if(opened&&active===e.pointerId){finishPointer(e);cancelEvent(e);return}
  if(!outside||outside.id!==e.pointerId)return;
  const tap=!outside.moved&&Math.hypot(e.clientX-outside.x,e.clientY-outside.y)<=LOUPE_SLOP_PX&&e.type==='pointerup';
  outside=null;
  // A single short tap closes, but a swipe keeps the loupe open.
  // Do not interrupt the native pointerup (it owns the lower gesture).
  if(tap){swallowClick=true;close()}
 }
 document.addEventListener('pointerup',pointerFinish,true);
 document.addEventListener('pointercancel',pointerFinish,true);
 document.addEventListener('click',e=>{
  if(swallowClick){swallowClick=false;cancelEvent(e);return}
  if(opened&&upper(e)&&!control(e))cancelEvent(e);
 },true);
 // Scope Safari touch suppression to upper-origin touches only, including
 // an upper drag that crosses the boundary. Never suppress lower swipes.
 for(const type of ['touchstart','touchmove','touchend','touchcancel']){
  document.addEventListener(type,e=>{
   const changed=Array.from(e.changedTouches||[]);
   if(type==='touchstart'&&opened&&!control(e))for(const t of changed)if(upper(t))upperTouches.add(t.identifier);
   const owns=changed.some(t=>upperTouches.has(t.identifier));
   if(type==='touchend'||type==='touchcancel')for(const t of changed)upperTouches.delete(t.identifier);
   if(owns)cancelEvent(e);
  },{capture:true,passive:false});
 }
 // Safari selection/callout should be disabled only on the calendar.
 for(const type of ['contextmenu','selectstart','dragstart']){
  document.addEventListener(type,e=>{if((opened&&upper(e)&&!control(e))||inside(e)||surface.contains(e.target))cancelEvent(e)},true);
 }
 function interrupt(){clearPending();close();active=null;outside=null;swallowClick=false;upperTouches.clear()}
 window.addEventListener('pagehide',interrupt);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt()});
 return {
  get opened(){return opened},
  arm(e){
   clearPending();
   if(e.button!==0||e.isPrimary===false)return false;
   if(e.cancelable)e.preventDefault();
   const p={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,timer:0};
   pending=p;p.timer=setTimeout(()=>open(p,true),LOUPE_HOLD_MS);return true;
  },
  cancelPending(id){
   if(!pending||(id!==undefined&&pending.id!==id))return false;
   clearPending();return true;
  },
  releasePending(e){
   if(!pending||pending.id!==e.pointerId)return false;
   const p=pending;clearPending();
   if(e.type==='pointerup')return open(p,false);
   return false;
  },
  waiting(e){
   if(!pending||pending.id!==e.pointerId)return false;
   pending.lastX=e.clientX;
   if(Math.hypot(e.clientX-pending.x,e.clientY-pending.y)<=LOUPE_SLOP_PX)return true;
   clearPending();return false;
  },
  down(e){if(!opened)return false;if(inside(e))beginPointer(e);return true},
  move(e){if(!opened)return false;if(active===e.pointerId)movePointer(e);return true},
  end(e){if(!opened)return false;finishPointer(e);return true},
  wheel(e){if(!opened)return false;shift((e.deltaX||e.deltaY)*(e.deltaMode===1?16:1));return true},
  // The same native ruler drawing functions are supplied by its closure.
  paint({ctx,w,h,axisY,drawDensity,drawMemoryBeacons,tick}){
   if(!opened||!scale)return;
   // The native photo book can move while the loupe remains visible. Follow
   // its exact current date and story identity, including same-day stories,
   // without feeding that change back into the native selection bridge.
   const current=selection();
   if(!selecting&&lastPainted&&(current.id!==lastPainted.id||Math.abs(current.ms-lastPainted.ms)>1)){
    stop();
    if(current.id!=null&&!scale.byId.has(current.id))scale=createLoupeScale(memories(),lifeStart,lifeEnd);
    const selected=scale.byId.get(current.id);
    position=target=selected&&Math.abs(current.ms-selected.ms)<1?selected.position:scale.positionAt(current.ms);
    panel.dataset.memoryId=current.id==null?'':String(current.id);
    panel.dataset.position=String(position);lastPainted={id:current.id,ms:current.ms};
   }
   // Scale the original renderer around the fixed needle and baseline.
   // Pointer distance uses the identical enlarged calendar scale.
   const unit=w/(LOUPE_VISIBLE_DAYS*LOUPE_VISUAL_SCALE),x=p=>w/2+(p-position)*unit;
   const from=scale.msAt(position-LOUPE_VISIBLE_DAYS/2),to=scale.msAt(position+LOUPE_VISIBLE_DAYS/2);
   const project=ms=>x(scale.positionAt(ms));
   const left=Math.max(0,x(0)),right=Math.min(w,x(scale.end));
   // Clip the paint to the actual rounded white panel, not the full-width
   // canvas behind it. This also respects any native mobile canvas offset.
   const card=panel.getBoundingClientRect(),canvasRect=ctx.canvas.getBoundingClientRect();
   const sx=w/Math.max(1,canvasRect.width),sy=h/Math.max(1,canvasRect.height);
   const cx=(card.left-canvasRect.left+1)*sx,cy=(card.top-canvasRect.top+1)*sy;
   const cw=Math.max(0,(card.width-2)*sx),ch=Math.max(0,(card.height-2)*sy);
   const radius=Math.min(14*sx,cw/2,ch/2);
   ctx.save();ctx.beginPath();
   ctx.moveTo(cx+radius,cy);ctx.arcTo(cx+cw,cy,cx+cw,cy+ch,radius);
   ctx.arcTo(cx+cw,cy+ch,cx,cy+ch,radius);ctx.arcTo(cx,cy+ch,cx,cy,radius);
   ctx.arcTo(cx,cy,cx+cw,cy,radius);ctx.closePath();ctx.clip();
   // Scale the entire ruler, including labels, around the upper panel edge;
   // keep calendar movement and visible width in the identical ratio.
   const top=(card.top-canvasRect.top)*sy;
   const compactAxis=top+(axisY-top)*LOUPE_PANEL_SCALE;
   const zoom=LOUPE_VISUAL_SCALE*LOUPE_PANEL_SCALE;
   ctx.translate(w/2,compactAxis);ctx.scale(zoom,zoom);ctx.translate(-w/2,-axisY);
   ctx.beginPath();ctx.rect(left,0,Math.max(0,right-left),h);ctx.clip();
   // No aggregate density bars in the loupe: exactly one narrow original
   // story beacon per memory, in the existing timeline color.
   drawMemoryBeacons(3,from,to,w,axisY,m=>x(scale.byId.get(m.id)?.position??scale.positionAt(m.ms)));
   ctx.strokeStyle='rgba(91,143,185,.44)';ctx.lineWidth=1.2;
   ctx.beginPath();ctx.moveTo(left,axisY+.5);ctx.lineTo(right,axisY+.5);ctx.stroke();
   const dt=new Date(from);dt.setHours(0,0,0,0);
   // Daily labels remain readable, stable and attached to the scrolling axis.
   const weekday=new Intl.DateTimeFormat(locale(),{weekday:'short'});
   const date=new Intl.DateTimeFormat(locale(),{day:'numeric',month:'short'});
   while(dt.getTime()<=to){
    const ms=dt.getTime();
    if(ms>=lifeStart&&ms<=lifeEnd)tick(project(ms),axisY,true,weekday.format(dt).replace(/\.$/,''),date.format(dt),true);
    dt.setDate(dt.getDate()+1);
   }
   ctx.restore();
  }
 };
}
