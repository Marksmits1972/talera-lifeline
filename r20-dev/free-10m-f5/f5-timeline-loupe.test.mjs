import assert from 'node:assert/strict';
import {createLoupeMotion,loupeDays,LOUPE_STEP_PX,LOUPE_STEP_INTERVAL_MS} from './f5-timeline-loupe.mjs';
const visited=[];let index=3;
const m=createLoupeMotion(dir=>{const next=index+dir;if(next<0||next>8)return false;index=next;visited.push(index);return true});
m.begin(0,0);m.move(-10000,20);assert.deepEqual(visited,[4]);
m.move(-20000,30);assert.deepEqual(visited,[4]); // hard speed ceiling
m.move(-30000,20+LOUPE_STEP_INTERVAL_MS);assert.deepEqual(visited,[4,5]);
m.move(-40000,20+2*LOUPE_STEP_INTERVAL_MS);assert.deepEqual(visited,[4,5,6]);
assert.equal(m.release(1000),false);assert.deepEqual(visited,[4,5,6]); // stopped finger
m.begin(0,1100);m.move(LOUPE_STEP_PX,1400);assert.deepEqual(visited,[4,5,6,5]);
m.move(LOUPE_STEP_PX*2,1700);assert.deepEqual(visited,[4,5,6,5,4]);
m.stop();assert.equal(m.coast(1900,40),false);assert.deepEqual(visited,[4,5,6,5,4]);
m.begin(0,2000);m.move(-1000,2010);assert.equal(m.release(2011),true);
for(let t=2051;t<2500;t+=40)m.coast(t,40);
assert.ok(visited.length<=8,'Only small controlled coast');
assert.ok(visited.every((n,i)=>!i||Math.abs(n-visited[i-1])===1));
const d=new Date(2026,10,25,12).getTime();
const days=loupeDays(d,new Date(1974,0,1).getTime(),new Date(2027,0,1).getTime());
assert.deepEqual(days.map(x=>x.label),['zo','ma','di','wo','do','vr','za']);
assert.equal(days[3].center,true);
assert.deepEqual(loupeDays(d,d,d).map(x=>x.label),['','','','wo','','','']);
console.log('TALERA_TIMELINE_LOUPE_ADJACENT_STEPS_SPEED_CEILING_CALENDAR_PASS');
