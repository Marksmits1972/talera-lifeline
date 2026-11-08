import test from 'node:test';
import assert from 'node:assert/strict';
import {decideStorageHeadroom,WARN_BYTES,STOP_NEW_ASSIGNMENTS_BYTES} from './storage-guard.mjs';
const states=[
 {shard_id:'A',state:'active'},
 {shard_id:'B',state:'active'},
 {shard_id:'C',state:'disabled'},
 {shard_id:'D',state:'disabled'}
];
const ids=['A','B','C','D'];
const normal={A:25000,B:10000,C:1000,D:1000};
const check=(bytes,rows=states)=>decideStorageHeadroom({states:rows,bytes,allowedIds:ids});
test('Warning 75% threshold creates alert but does not prematurely drain active accounts',()=>{
 const result=check({...normal,A:WARN_BYTES+1});
 assert.equal(result.action,'none');
 assert.equal(result.warning[0].shard,'A');
});
test('At 80% triggers standby C for new accounts then draining A for new accounts only',()=>{
 const result=check({...normal,A:STOP_NEW_ASSIGNMENTS_BYTES+1});
 assert.equal(result.action,'activate-and-drain');
 assert.equal(result.activate,'C');
 assert.equal(result.drain,'A');
 assert.match(result.critical,/Existing users remain/);
});
test('After moving C to active and A to draining, no further automatic mutations',()=>{
 const changed=[{shard_id:'A',state:'draining'}, {shard_id:'B',state:'active'},
 {shard_id:'C',state:'active'},{shard_id:'D',state:'disabled'}];
 const result=check({...normal,A:STOP_NEW_ASSIGNMENTS_BYTES+1},changed);
 assert.equal(result.action,'none');assert.equal(result.warning[0].shard,'A');
});
test('Unknown shard and missing storage metrics fail closed',()=>{
 assert.equal(check({...normal,C:NaN}).action,'block');
 assert.equal(check(normal,[...states,{shard_id:'Z',state:'active'}]).action,'block');
});
test('Full database with no spare is a BLOCK requiring operator intervention',()=>{
 const result=check({...normal,A:STOP_NEW_ASSIGNMENTS_BYTES},
  states.map(x=>({...x,state:'active'})));
 assert.equal(result.action,'block');
 assert.equal(result.reason,'NO_STANDBY_FOR_STORAGE_PRESSURE');
});
