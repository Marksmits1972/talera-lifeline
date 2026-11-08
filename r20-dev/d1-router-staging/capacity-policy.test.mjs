import test from 'node:test';
import assert from 'node:assert/strict';
import {POLICY,requiredBuckets,evaluatePressure} from './capacity-policy.mjs';
const now=new Date('2026-11-08T12:37:00.000Z');
const windows=requiredBuckets(now);
const ids=['db-physical-a','db-physical-b'];
const sample=(high=true)=>ids.flatMap(databaseId=>windows.map(bucket=>({
 databaseId,bucket,queryCount:high?33000:300,avgDurationMs:high?4:2
})));
const decide=(rows,extra={})=>evaluatePressure({rows,activeDatabaseIds:ids,standbyShards:['C'],now,...extra});
test('Three completed five-minute pressure windows trigger one pre-provisioned spare shard',()=>{
 const v=decide(sample(true));
 assert.equal(v.action,'activate');assert.equal(v.shard,'C');
 assert.equal(v.details.length,2);
 assert.ok(v.details.every(d=>d.history.length===3));
 assert.deepEqual(windows,['2026-11-08T12:10:00.000Z','2026-11-08T12:15:00.000Z','2026-11-08T12:20:00.000Z']);
});
test('Missing or delayed analytics blocks activation, never guessed as safe',()=>{
 const x=sample(true).filter(r=>r.bucket!==windows[1]);
 assert.equal(decide(x).action,'block');
 assert.equal(decide([]).reason,'INCOMPLETE_OR_LATE_ANALYTICS');
});
test('One low window interrupts any high sequence',()=>{
 const x=sample(true).map(r=>({...r,queryCount:r.bucket===windows[1]?200:33000}));
 assert.equal(decide(x).action,'none');
});
test('With no spare shard nothing is provisioned or created',()=>{
 assert.equal(decide(sample(true),{standbyShards:[]}).reason,'NO_PREPROVISIONED_STANDBY');
});
test('High query duration plus sustained intermediate volume warns before hard overload',()=>{
 const slow=sample(true).map(x=>({...x,queryCount:9600,avgDurationMs:20}));
 const result=decide(slow);
 assert.equal(result.action,'activate');
});
test('Unsafe malformed, duplicated or invalid telemetry blocks activation',()=>{
 const duplicate=sample(true);
 duplicate.push({...duplicate[0]});
 assert.equal(decide(duplicate).action,'block');
 assert.equal(decide(sample(true),{standbyShards:['../../bad']}).action,'block');
 assert.equal(decide(null).action,'block');
});
