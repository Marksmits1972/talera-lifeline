import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {referencePages} from './generated/public-template-map.mjs';
// Execute the actual packaged /present timeline and wheel scripts. A small
// deterministic DOM/clock replaces the browser for gesture-contract tests;
// this is NOT a browser performance measurement or physical iPhone test.
const html=readFileSync(new URL('../free-10m-delivery/public'+referencePages['/present'],import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
const timeline=scripts.find(x=>x[2].includes('function timelineWindowMemory('))[2];
// Expose read-only internal diagnostics in the test copy, never in the app.
const end=timeline.lastIndexOf('})();');
assert.ok(end>0);
const instrumented=timeline.slice(0,end)+'window.__gripTestSnapshot=()=>({visualZoomPos,zoomPos,dragSpanDays,visualScaleTransitioning,searchVelocity,paintSpan:bounds()[2],centerMs});\n'+timeline.slice(end);
const wheel=scripts.find(x=>x[2].includes('function followTimeline('))[2];
let seq=0;const frames=new Map(),timers=new Map();
class MockNode{
 constructor(id=''){this.id=id;this.children=[];this.dataset={};this.style={setProperty(){},getPropertyValue(){return ''}};this.attrs=new Map();this.hidden=false;this.listeners=new Map();this.textContent='';this.clientWidth=390;this.clientHeight=180;this.naturalWidth=150;this.naturalHeight=100;this.complete=true;this.src='';let set=new Set();this.classList={add:(...x)=>x.forEach(a=>set.add(a)),remove:(...x)=>x.forEach(a=>set.delete(a)),contains:x=>set.has(x),toggle:(x,v)=>{if(v===undefined)v=!set.has(x);v?set.add(x):set.delete(x);return v}}}
 addEventListener(name,cb){const arr=this.listeners.get(name)||[];arr.push(cb);this.listeners.set(name,arr)}
 removeEventListener(){}
 dispatchEvent(e){for(const f of this.listeners.get(e.type)||[])f(e);return true}
 querySelector(selector){if(selector.startsWith('#'))return nodes.get(selector.slice(1))||get(selector.slice(1));return new MockNode(selector)}
 querySelectorAll(){return []}
 appendChild(n){this.children.push(n);return n}
 append(...n){n.forEach(x=>this.appendChild(x))}
 insertBefore(n){this.children.unshift(n);return n}
 cloneNode(){return new MockNode(this.id)}
 setAttribute(k,v){this.attrs.set(k,v)}
 getAttribute(k){return this.attrs.get(k)??null}
 removeAttribute(k){this.attrs.delete(k)}
 contains(){return false}
 getBoundingClientRect(){return {left:0,top:this.id==='focusText'?130:0,right:390,bottom:180,width:390,height:180,x:0,y:0}}
 setPointerCapture(){} releasePointerCapture(){}
 getContext(){return new Proxy({canvas:this,measureText:s=>({width:s.length*6}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)})}
}
const nodes=new Map();
function get(id){if(!nodes.has(id))nodes.set(id,new MockNode(id));return nodes.get(id)}
const doc=new MockNode('document');doc.documentElement=get('html');doc.body=get('body');doc.head=get('head');
doc.getElementById=get;doc.querySelector=s=>s==='.timeline'?get('surface'):get(s.startsWith('#')?s.slice(1):s);
doc.querySelectorAll=()=>[];doc.createElement=s=>new MockNode(s);doc.hidden=false;
let now=0;class MockEvent{constructor(type,init){this.type=type;Object.assign(this,init)} }
const context={document:doc,location:{search:'',origin:'http://127.0.0.1',pathname:'/present'},URLSearchParams,Date,Intl,Math,Number,Map,Set,Array,Uint16Array,console,performance:{now:()=>now},navigator:{maxTouchPoints:1},innerHeight:800,innerWidth:390,devicePixelRatio:1,Image:MockNode,Event:MockEvent,CustomEvent:MockEvent,ResizeObserver:class{observe(){}},MutationObserver:class{observe(){}},localStorage:{getItem(){return null},setItem(){}},requestAnimationFrame:f=>{frames.set(++seq,f);return seq},cancelAnimationFrame:i=>frames.delete(i),setTimeout:(f,ms)=>{timers.set(++seq,{f,due:now+(ms||0)});return seq},clearTimeout:i=>timers.delete(i),addEventListener(){},removeEventListener(){},getComputedStyle:()=>({}),matchMedia:()=>({matches:false}),window:null};context.window=context;
vm.createContext(context);
const characteristicSearch=scripts.find(x=>x[1].includes('id="talera-characteristic-search-script"'));
assert.ok(characteristicSearch,'Generated owner presentation includes characteristic search runtime');
vm.runInContext(characteristicSearch[2],context,{filename:'actual-generated-characteristic-search.js'});
vm.runInContext(instrumented,context,{filename:'actual-generated-timeline.js'});
vm.runInContext(wheel,context,{filename:'actual-generated-wheel.js'});
const rt=context.__taleraTimelineRuntime,band=context.__taleraIntegratedBand;

const root=doc.documentElement.dataset,day=86400000,year=365.2425*day,surface=get('surface'),snap=context.__gripTestSnapshot;
const state=()=>({ ...snap(), age:(rt.centerMs()-rt.lifeStart)/year,selected:rt.currentMemory()?.id??null,mode:root.taleraTimelineWindow });
const pointer=(type,id,x,y=45)=>({type,pointerId:id,pointerType:'touch',button:0,isPrimary:true,target:{closest(){return null}},clientX:x,clientY:y,cancelable:true,preventDefault(){},stopImmediatePropagation(){}});
function tick(ms=16){
 now+=ms;
 for(const [id,t] of [...timers])if(t.due<=now){timers.delete(id);t.f()}
 const callbacks=[...frames.values()];frames.clear();for(const cb of callbacks)cb(now);
}
function wait(ms){for(let left=ms;left>0;left-=16)tick(Math.min(16,left))}
function drag(id,x0,x1,ms=16){surface.dispatchEvent(pointer('pointerdown',id,x0));tick(ms);surface.dispatchEvent(pointer('pointermove',id,x1));}
function closeGesture(id,x){surface.dispatchEvent(pointer('pointerup',id,x));wait(640)}
const isOpen=()=>surface.dataset.taleraLoupe==='open';
const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-6,msg+': '+JSON.stringify({actual:a,expected:b,...state()}));

const base=rt.lifeStart+30*year,t=rt.lifeEnd-day*2;
const rows=Array.from({length:20},(_,i)=>({id:'recent-'+i,storyId:'recent-'+i,
 ms:t-i*day,image:'data:image/png;base64,AA',story:'Recent '+i,fullStory:'Recent '+i,tags:[]}));

// The overview is 15 native years across the full ruler, with five-year
// labeled divisions. 40% of the width (156/390 px) must move six years.
rt.setCenter(base);rt.draw();
drag(1,280,124);
const initial=(rt.centerMs()-base)/year;
near(initial,6,'Fresh empty overview follows the finger');
closeGesture(1,124);
rt.registerMemories(rows);rt.setCenter(base);rt.draw();
assert.equal(rt.currentMemory(),null);
assert.equal(root.taleraTimelineWindow,'empty');

// A short tap, a short hold, and pointer cancellation must all disarm the
// pending timer. Even waiting > the full hold threshold must not open it.
for(const [id,duration,endType] of [[2,60,'pointerup'],[3,500,'pointerup'],[4,1500,'pointercancel']]){
 surface.dispatchEvent(pointer('pointerdown',id,220));
 wait(duration);assert.equal(isOpen(),false);
 surface.dispatchEvent(pointer(endType,id,220));
 wait(2050);assert.equal(isOpen(),false);
 near(rt.centerMs(),base,'Short/cancelled press preserves date');
}
// Small accidental jitter is allowed; not a short tap, not before 2s.
surface.dispatchEvent(pointer('pointerdown',5,220));
wait(800);surface.dispatchEvent(pointer('pointermove',5,229,50));
wait(1199);assert.equal(isOpen(),false);
wait(1);assert.equal(isOpen(),true);
surface.dispatchEvent(pointer('pointerup',5,229,50));assert.equal(isOpen(),true);
assert.equal(rt.currentMemory(),null);
doc.dispatchEvent(pointer('pointerdown',6,100,500));
doc.dispatchEvent(pointer('pointerup',6,100,500));
assert.equal(isOpen(),false);
assert.equal(snap().visualZoomPos,1,'Close returns to the existing year view');
near(rt.centerMs(),base,'Closing retains the exact date');

// At year scale the same finger distance remains fine-grained. Once a
// real drag starts, even a pause longer than two seconds cannot open it.
drag(7,280,124);
near((rt.centerMs()-base)/year,.8,'Year ruler retains original fine sensitivity');
wait(2100);
assert.equal(isOpen(),false,'A paused drag must not open the loupe');
closeGesture(7,124);assert.equal(isOpen(),false);
rt.setCenter(base);rt.draw();

// Fast native movement requests the overview while the same finger stays
// held. The old implementation kept the hidden year zoom (1), which moved
// only 0.8y per 156px even though it painted the 15-year overview.
drag(8,200,160);
for(let i=0;i<10;i++){tick();surface.dispatchEvent(pointer('pointermove',8,i%2?160:200))}
const centerDuringTransition=rt.centerMs();
wait(320);
assert.equal(snap().visualZoomPos,0);
assert.equal(snap().zoomPos,1,'Native pinch value intentionally remains at year');
assert.equal(snap().visualScaleTransitioning,false);
near(rt.centerMs(),centerDuringTransition,'No jump on gear change');
near(snap().dragSpanDays,snap().paintSpan,'Native grip uses visible ruler');
const before=rt.centerMs();
surface.dispatchEvent(pointer('pointermove',8,4));
near((rt.centerMs()-before)/year,initial,'Same held finger moves six years after the loupe');
surface.dispatchEvent(pointer('pointermove',8,160));
near(rt.centerMs(),before,'Reverse drag returns to same date');
closeGesture(8,160);near(rt.centerMs(),before,'Release keeps finger date');
assert.equal(isOpen(),false);

// The next independent drag must also use the coarse scale; its travel
// is independent of whether memories are selected or the period is empty.
const again=rt.centerMs();drag(9,280,124);
near((rt.centerMs()-again)/year,initial,'Next overview gesture also follows finger');
assert.equal(rt.currentMemory(),null);assert.equal(root.taleraTimelineWindow,'empty');
closeGesture(9,124);
rt.setCenter(t-6*year);rt.draw();
drag(10,280,124);
near(rt.centerMs(),t,'Travel into recent memory cluster uses same sensitivity');
assert.equal(band.getState().active,true);
assert.equal(rt.windowMemory()?.id,'recent-0');
closeGesture(10,124);
assert.equal(rt.currentMemory()?.id,'recent-0');
near(rt.centerMs(),t,'Photo selection never overwrites native date');
drag(11,124,280);
near((t-rt.centerMs())/year,6,'Reverse overview drag through populated to empty range');
assert.equal(rt.currentMemory(),null);assert.equal(root.taleraTimelineWindow,'empty');
const emptyDate=rt.centerMs();
closeGesture(11,280);
near(rt.centerMs(),emptyDate,'No forced nearest photo or date on release');
assert.equal(rt.currentMemory(),null);
// Recreate the real slow native movement, not a test-only forced scale.
function slowlyEnterYear(id,x=280){
 wait(1300);rt.setCenter(base);rt.draw();
 surface.dispatchEvent(pointer('pointerdown',id,x));
 for(let i=0;i<105;i++){
   tick(16);x-=1;surface.dispatchEvent(pointer('pointermove',id,x));
 }
 assert.equal(snap().visualZoomPos,1,'Slow positioning selects the actual year scale');
 assert.equal(snap().visualScaleTransitioning,false);
 return x;
}
// The original 112ms rapid swipe worked; the loupe's first 16px ignored
// the first speed sample and made that same swipe miss its 90ms dwell.
// A deliberate SHORT burst (28px in 28ms) must now select overview.
let x=slowlyEnterYear(12);
closeGesture(12,x);
rt.setCenter(base);rt.draw();
surface.dispatchEvent(pointer('pointerdown',13,220));
tick(14);surface.dispatchEvent(pointer('pointermove',13,206));
assert.equal(snap().visualScaleTransitioning,false,'Sub-slop movement remains harmless');
tick(14);surface.dispatchEvent(pointer('pointermove',13,192));
assert.equal(snap().visualScaleTransitioning,true,'28px quick swipe engages overview');
const fastDate=rt.centerMs();
closeGesture(13,192);
assert.equal(snap().visualZoomPos,0);
near(rt.centerMs(),fastDate,'Short swipe keeps the date during scale change');
assert.equal(isOpen(),false);

// Accelerate without releasing the same finger that just selected year.
// The 1200ms gear-hold must not defeat a deliberate horizontal burst.
x=slowlyEnterYear(14);
tick(14);x+=14;surface.dispatchEvent(pointer('pointermove',14,x));
tick(14);x+=14;surface.dispatchEvent(pointer('pointermove',14,x));
assert.equal(snap().visualScaleTransitioning,true,'Same-finger acceleration overrides gear dwell');
wait(272);assert.equal(snap().visualZoomPos,0);
const coarseDate=rt.centerMs();
surface.dispatchEvent(pointer('pointermove',14,x-104));
near((rt.centerMs()-coarseDate)/year,4,'Overview immediately restores coarse finger grip');
closeGesture(14,x-104);

// Slow positioning and a single movement after a genuine pause must not
// be misclassified by the quick path; small alternating jitter is not a flick.
x=slowlyEnterYear(15);closeGesture(15,x);
rt.setCenter(base);rt.draw();
surface.dispatchEvent(pointer('pointerdown',16,220));
for(let i=0;i<10;i++){
 tick(14);surface.dispatchEvent(pointer('pointermove',16,i%2?220:232));
}
assert.equal(snap().visualZoomPos,1);assert.equal(snap().visualScaleTransitioning,false);
assert.equal(isOpen(),false);
for(let i=0;i<14;i++){
 tick(24);surface.dispatchEvent(pointer('pointermove',16,220-i*2));
}
assert.equal(snap().visualZoomPos,1);assert.equal(snap().visualScaleTransitioning,false);
wait(240);surface.dispatchEvent(pointer('pointermove',16,168));
assert.equal(snap().visualScaleTransitioning,false,'A pause is not a rapid burst');
closeGesture(16,168);
assert.equal(snap().visualZoomPos,1);
assert.equal(isOpen(),false);

// The deliberate loupe still opens on a held touch, closes to the year
// view, and supports the same short, fast return to overview.
surface.dispatchEvent(pointer('pointerdown',17,220));wait(2000);
assert.equal(isOpen(),true);
surface.dispatchEvent(pointer('pointerup',17,220));
doc.dispatchEvent(pointer('pointerdown',18,100,500));
doc.dispatchEvent(pointer('pointerup',18,100,500));
assert.equal(snap().visualZoomPos,1);assert.equal(isOpen(),false);
surface.dispatchEvent(pointer('pointerdown',19,180));
tick(32);surface.dispatchEvent(pointer('pointermove',19,212));
assert.equal(snap().visualScaleTransitioning,true,'Short rightward swipe after loupe close');
closeGesture(19,212);
assert.equal(snap().visualZoomPos,0);
assert.equal(isOpen(),false);
console.log('TALERA_NATIVE_SHORT_FAST_OVERVIEW_SWITCH_PASS',JSON.stringify({
 shortSwipePx:28,shortSwipeMs:28,oneFingerAcceleration:true,slowAndJitterStayYear:true,
 stationaryPauseNotFast:true,afterLoupe:true,physicalIphoneAccepted:false
}));
console.log('TALERA_NATIVE_TIMELINE_GRIP_AND_INTENTIONAL_LOUPE_PASS',
 JSON.stringify({initialOverviewYears:initial,afterLoupeOverviewYears:6,yearViewYears:.8,
 shortTap:false,shortHold:false,cancelledHold:false,deliberateHold:2000,pausedDrag:false,
 emptyAndPopulated:true,releaseDatePreserved:true,physicalIphoneAccepted:false}));
