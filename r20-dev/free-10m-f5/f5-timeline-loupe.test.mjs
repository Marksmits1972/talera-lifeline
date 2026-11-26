import assert from 'node:assert/strict';
import {nearestVisibleMemory,selectionBounds} from './f5-timeline-window.mjs';
import {paintLoupeWeekdayLabels,createLoupeScale,nextLoupeMove,alignLoupeToNativeAxis,LOUPE_DATE_GAP,LOUPE_HOLD_MS,LOUPE_SLOP_PX,LOUPE_VISUAL_SCALE,LOUPE_VISIBLE_DAYS,LOUPE_PANEL_SCALE,LOUPE_TOUCH_ZONE} from './f5-timeline-loupe.mjs';
const DAY=86400000,start=Date.UTC(2000,0,1),end=start+100*DAY;
const memories=[{id:'a',ms:start+10*DAY},{id:'b',ms:start+10*DAY},{id:'c',ms:start+11*DAY},{id:'d',ms:start+19*DAY}];
const scale=createLoupeScale(memories,start,end);
const [a,b,c,d]=scale.stops;
assert.ok(LOUPE_HOLD_MS<500&&LOUPE_SLOP_PX>=12);
assert.equal(LOUPE_VISUAL_SCALE,1.10);assert.equal(LOUPE_PANEL_SCALE,2/3);assert.equal(LOUPE_TOUCH_ZONE,1/3);assert.ok(Math.abs(LOUPE_VISIBLE_DAYS*LOUPE_VISUAL_SCALE-6)<1e-9);
// Prefer exact original baseline; preserve the date gap using the smallest
// necessary upward displacement when the available height is restricted.
assert.deepEqual(alignLoupeToNativeAxis(66,72,116),{top:26,axis:66});
assert.deepEqual(alignLoupeToNativeAxis(66,72,104),{top:20,axis:60});
assert.equal(104-(alignLoupeToNativeAxis(66,72,104).top+72),LOUPE_DATE_GAP);
assert.equal(a.position,10);
assert.ok(b.position>a.position);
assert.equal(scale.msAt(a.position),memories[0].ms);
assert.equal(scale.msAt(b.position),memories[1].ms);
assert.equal(scale.msAt(c.position),memories[2].ms);
assert.equal(scale.msAt(d.position),memories[3].ms);
assert.ok(Math.abs(d.position-c.position-8)<1e-8);
const blank=c.position+2.5;
assert.deepEqual(nextLoupeMove(scale,c.position,blank,'c'),{position:blank});
assert.ok(Math.abs(scale.msAt(blank)-(memories[2].ms+2.5*DAY))<1);
assert.deepEqual(nextLoupeMove(scale,a.position,d.position,'a'),{position:b.position,stop:b});
assert.deepEqual(nextLoupeMove(scale,b.position,d.position,'b'),{position:c.position,stop:c});
assert.deepEqual(nextLoupeMove(scale,c.position,d.position,'c'),{position:d.position,stop:d});
assert.deepEqual(nextLoupeMove(scale,d.position,a.position,'d'),{position:c.position,stop:c});
assert.deepEqual(nextLoupeMove(scale,c.position,a.position,'c'),{position:b.position,stop:b});
assert.deepEqual(nextLoupeMove(scale,b.position,a.position,'b'),{position:a.position,stop:a});
assert.equal(scale.msAt(0),start);assert.equal(scale.msAt(scale.end),end);
assert.equal(scale.positionAt(end),scale.end);
const empty=createLoupeScale([],start,end);
assert.equal(empty.msAt(42),start+42*DAY);
assert.deepEqual(nextLoupeMove(empty,42,-1,null),{position:0});
assert.deepEqual(nextLoupeMove(empty,42,200,null),{position:100});
console.log('TALERA_TIMELINE_LOUPE_CONTINUOUS_CALENDAR_DISTINCT_STOPS_PASS');

// The new visual row must preserve every native tick and remove the dates.
// All five TALERA languages are exercised using the existing local calendar.
for(const locale of ['nl-NL','en-GB','de-DE','fr-FR','es-ES']){
 const labels=[],ticks=[];
 const ctx={save(){},restore(){},fillText(text,x,y,maxWidth){labels.push({text,x,y,maxWidth,font:this.font});}};
 const first=new Date(2026,10,20).getTime(),last=new Date(2026,10,26).getTime();
 paintLoupeWeekdayLabels({ctx,from:first,to:last,lifeStart:first,lifeEnd:last,locale,
  project:ms=>(ms-first)/DAY*60,axisY:50,availableHeight:40,dayWidth:60,
  tick:(...args)=>ticks.push(args)});
 assert.equal(ticks.length,7);assert.equal(labels.length,7);
 assert.ok(ticks.every(([,y,major,label,sub])=>y===50&&major&&label===''&&sub===''));
 assert.ok(labels.every(l=>l.font.startsWith('700 24px')&&l.maxWidth>0&&l.y>50));
 const expected=Array.from({length:7},(_,i)=>new Intl.DateTimeFormat(locale,{weekday:'short'}).format(new Date(2026,10,20+i)).replace(/\.$/,''));
 assert.deepEqual(labels.map(l=>l.text),expected);
 assert.ok(labels.every(l=>!/[0-9]/.test(l.text)));
}
console.log('TALERA_LOUPE_LARGE_WEEKDAYS_NO_DUPLICATE_DATE_PASS');


// The same window rule serves the native ruler and projected loupe.
// Use a synthetic 54-year life, 20 recent original IDs, no fallback.
const year=365.2425*DAY, born=Date.UTC(1972,0,1), today=born+54*year;
const recent=Array.from({length:20},(_,i)=>({id:'recent-'+i,ms:today-(19-i)*DAY}));
const period=(age,zoom)=>{const center=born+age*year;return [center,...selectionBounds(center,center-7.5*year,center+7.5*year,zoom,born,today)]};
for(const age of [0,24,40,43,46,50]){
 const [center,from,to]=period(age,0);
 assert.equal(nearestVisibleMemory(recent,center,from,to,recent[19].id),null,'No distant fallback at '+age);
}
const [now,from,to]=period(54,0);
assert.equal(nearestVisibleMemory(recent,now,from,to,null)?.id,'recent-19');
const [mid,wideStart,wideEnd]=period(43.5,0);
assert.ok(Math.abs(wideStart-(born+41*year))<1);
assert.ok(Math.abs(wideEnd-(born+46*year))<1);
const [nextMid,nextStart,nextEnd]=period(44.5,0);
assert.equal(nextStart-wideStart,year);assert.equal(nextEnd-wideEnd,year);
const old=[{id:'before',ms:wideStart-1},{id:'edge',ms:wideStart},{id:'closest',ms:mid+DAY},{id:'after',ms:wideEnd+1}];
assert.equal(nearestVisibleMemory(old,mid,wideStart,wideEnd,null)?.id,'closest');
assert.equal(nearestVisibleMemory(old.slice(0,2),mid,wideStart,wideEnd,'before')?.id,'edge');
assert.equal(nearestVisibleMemory(old,mid,mid-DAY/2,mid+DAY/2,null),null);
const [,monthStart,monthEnd]=period(43.5,1);
assert.equal(monthEnd-monthStart,year);
assert.equal(nearestVisibleMemory([{id:'six-month-edge',ms:monthEnd}],mid,monthStart,monthEnd,null)?.id,'six-month-edge');
assert.deepEqual(selectionBounds(mid,mid-DAY/2,mid+DAY/2,3,born,today),[mid-DAY/2,mid+DAY/2]);
const same=[{id:'first',ms:mid},{id:'second',ms:mid}];
assert.equal(nearestVisibleMemory(same,mid,wideStart,wideEnd,'second')?.id,'second');
const closestStop=(p,preferred)=>nearestVisibleMemory(scale.stops,p,p-LOUPE_VISIBLE_DAYS/2,p+LOUPE_VISIBLE_DAYS/2,preferred,m=>m.position);
assert.equal(closestStop(a.position,null)?.id,'a');
assert.equal(closestStop(b.position,null)?.id,'b');
assert.equal(closestStop(c.position,null)?.id,'c');
assert.equal(closestStop((c.position+d.position)/2,'c'),null);
assert.equal(closestStop(d.position,null)?.id,'d');
assert.equal(closestStop(70,'d'),null);
assert.equal(nearestVisibleMemory([],mid,wideStart,wideEnd,null),null);
console.log('TALERA_TIMELINE_WINDOW_THREE_SCALES_SPARSE_BOUNDARIES_PASS');
