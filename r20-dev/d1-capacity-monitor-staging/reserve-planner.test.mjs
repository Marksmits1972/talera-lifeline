import test from 'node:test';
import assert from 'node:assert/strict';
import {planReplenishment,addReserve,shardSuffix,D1_SIZE_GUARD_BYTES} from './reserve-planner.mjs';
const base={
 worker_name:'talera-d1-stable-router-test-20261108',
 directory_database:'talera-d1-router-directory-test-20261108',
 shards:['A','B','C'].map((id,i)=>({
  id,database_name:'talera-d1-router-shard-'+id.toLowerCase()+'-test-20261108',
  desired_state:i<2?'active':'standby'
 }))
};
const rows=[{shard_id:'A',state:'active'},{shard_id:'B',state:'active'},{shard_id:'C',state:'disabled'}];
const sizes={A:100000,B:100000,C:100000};
test('One standby remaining triggers safely adding D as SECOND standby, not active',()=>{
 const decision=planReplenishment({catalog:base,states:rows,physicalBytes:sizes});
 assert.equal(decision.action,'add-reserve');assert.equal(decision.id,'D');
 assert.equal(decision.database_name,'talera-d1-router-shard-d-test-20261108');
 const expanded=addReserve(base,decision);
 assert.equal(expanded.shards.at(-1).desired_state,'standby');
 assert.equal(base.shards.length,3,'no mutation of original catalog');
});
test('Once two standbys exist, no unnecessary new databases are created',()=>{
 const plan=planReplenishment({catalog:base,states:rows,physicalBytes:sizes});
 const catalog=addReserve(base,plan);
 const state=[...rows,{shard_id:'D',state:'disabled'}];
 assert.equal(planReplenishment({catalog,states:state,physicalBytes:{...sizes,D:1000}}).action,'none');
});
test('When C is promoted by the five-minute monitor, replenish another reserve E',()=>{
 const d=addReserve(base,planReplenishment({catalog:base,states:rows,physicalBytes:sizes}));
 const current=[{shard_id:'A',state:'active'},{shard_id:'B',state:'active'},
  {shard_id:'C',state:'active'},{shard_id:'D',state:'disabled'}];
 const e=planReplenishment({catalog:d,states:current,physicalBytes:{...sizes,D:1000}});
 assert.equal(e.id,'E');
});
test('Missing or invalid size metrics block writes rather than infer storage headroom',()=>{
 const bad=planReplenishment({catalog:base,states:rows,physicalBytes:{A:1000}});
 assert.equal(bad.action,'block');assert.equal(bad.reason,'MISSING_FILE_SIZE_METRICS');
});
test('Near-10GB active D1 triggers explicit storage alert but never moves existing accounts',()=>{
 const result=planReplenishment({catalog:base,states:rows,physicalBytes:{...sizes,A:D1_SIZE_GUARD_BYTES+1000}});
 assert.equal(result.headroom[0].shard,'A');
 assert.equal(result.action,'add-reserve');
 assert.ok(!('moveAccounts' in result));
});
test('Unknown directory shard, invalid config and reaching cost cap fail safely',()=>{
 assert.equal(planReplenishment({catalog:base,states:[...rows,{shard_id:'D',state:'active'}],physicalBytes:sizes}).action,'block');
 assert.equal(planReplenishment({catalog:base,states:rows,physicalBytes:sizes,maxShards:3}).reason,'MAX_SHARDS_REQUIRES_REVIEW');
 assert.equal(planReplenishment({catalog:{...base,worker_name:'talera-live'},states:rows,physicalBytes:sizes}).action,'block');
});
test('Shard labels can expand to new IDs without code edits, still bounded by caps',()=>{
 assert.equal(shardSuffix(0),'A');assert.equal(shardSuffix(25),'Z');assert.equal(shardSuffix(26),'AA');
 assert.equal(shardSuffix(51),'AZ');
 assert.throws(()=>shardSuffix(300));
});
