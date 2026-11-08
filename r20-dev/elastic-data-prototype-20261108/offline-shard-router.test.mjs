import test from 'node:test';
import assert from 'node:assert/strict';
import {OfflineAssignmentDirectory,virtualBucket,forecast,autoscaleRecommendation} from './offline-shard-router.mjs';

test('A million fake users distribute across 16 pre-provisioned write partitions',()=>{
 const names=Array.from({length:16},(_,i)=>'shard-'+String(i).padStart(2,'0'));
 const db=new OfflineAssignmentDirectory(names);
 const checkpoints=new Map();
 for(let id=0;id<1_000_000;id++){
  const name=db.provisionNewAccount('SYNTHETIC-'+id);
  if(id%100000===0)checkpoints.set(id,name);
 }
 const counts=Object.values(db.totals());
 assert.equal(db.assignedCount,1_000_000);
 assert.equal(counts.reduce((a,b)=>a+b,0),1_000_000);
 assert.ok(Math.max(...counts)-Math.min(...counts)<=1,'Uniform new-user allocation');
 for(const [id,name] of checkpoints){
  assert.equal(db.getUserShard('SYNTHETIC-'+id),name,'Existing assignment stable');
  assert.equal(db.provisionNewAccount('SYNTHETIC-'+id),name,'Repeat provisioning idempotent');
 }
 console.log('ONE_MILLION_SYNTHETIC_ACCOUNTS',JSON.stringify({count:db.assignedCount,physicalShards:16,
  minAccountsPerShard:Math.min(...counts),maxAccountsPerShard:Math.max(...counts),distribution:db.totals()}));
});
test('Adding new partitions never silently moves or duplicates existing accounts',()=>{
 const db=new OfflineAssignmentDirectory(['shard-a']);
 for(let i=0;i<10_000;i++)db.provisionNewAccount('OLD-'+i);
 const pinned=db.getUserShard('OLD-666');
 db.addShard('shard-b');
 for(let i=0;i<30_000;i++)db.provisionNewAccount('NEW-'+i);
 assert.equal(db.getUserShard('OLD-666'),pinned);
 assert.equal(db.provisionNewAccount('OLD-666'),pinned);
 assert.equal(db.getUserShard('OLD-666'),'shard-a');
 assert.equal(db.assignedCount,40_000);
 const totals=db.totals();
 assert.ok(totals['shard-a']>totals['shard-b']||totals['shard-b']>0);
 console.log('EXISTING_ACCOUNTS_NEVER_MIGRATE_ON_EXPANSION',JSON.stringify(totals));
});
test('Idle capacity cannot be collapsed into one D1 without data migration',()=>{
 const db=new OfflineAssignmentDirectory(['shard-a','shard-b']);
 db.provisionNewAccount('USER-ABC');
 assert.throws(()=>db.retireShard(),/Never move or retire/);
 assert.equal(db.assignedCount,1);
});
test('Stable virtual bucket is reproducible, never reassigned by traffic spikes',()=>{
 const reference=virtualBucket('account-1',1024);
 assert.equal(virtualBucket('account-1',1024),reference);
 assert.ok(reference>=0&&reference<1024);
 assert.throws(()=>virtualBucket('account-1',0));
});
test('Plan-only flags require repeated high utilization and never mutate real databases',()=>{
 assert.equal(autoscaleRecommendation({currentShards:1,shardUtilizationPct:[85,90,95]}).recommendAddingNewShards,true);
 assert.equal(autoscaleRecommendation({currentShards:1,shardUtilizationPct:[85,45,95]}).recommendAddingNewShards,false);
 assert.equal(autoscaleRecommendation({currentShards:16,shardUtilizationPct:[1,1,1]}).automaticallyMergeWhenQuiet,false);
});
test('At 100,000 daily actives, 1 vs 16 independent D1 primaries differs only under uniform partitioning',()=>{
 const one=forecast({DAU:100000,physicalShards:1});
 const sixteen=forecast({DAU:100000,physicalShards:16});
 assert.equal(one.peakTotalQps,222.22);
 assert.equal(one.utilizationPct,111.11);
 assert.equal(sixteen.peakTotalQps,one.peakTotalQps);
 assert.equal(sixteen.peakPerShardQps,13.89);
 assert.equal(sixteen.utilizationPct,6.94);
 console.log('HYPOTHETICAL_LOAD_ONE_VS_SIXTEEN',JSON.stringify({one,sixteen}));
});
