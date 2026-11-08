import test from 'node:test';
import assert from 'node:assert/strict';
import {monitorCapacity} from './monitor.worker.mjs';
import {requiredBuckets} from '../d1-router-staging/capacity-policy.mjs';
const now=new Date('2026-11-08T12:37:00Z');
const UUID={
 A:'11111111-1111-4111-8111-111111111111',
 B:'22222222-2222-4222-8222-222222222222',
 C:'33333333-3333-4333-8333-333333333333',
 D:'44444444-4444-4444-8444-444444444444'
};
const make=(opts={})=>{
 let audit=[],wrote=0,queries=0;
 const states=new Map([['A','active'],['B','active'],['C','disabled'],...(opts.withD?[['D','disabled']]:[])]);
 const ids=Object.fromEntries([...states.keys()].map(k=>[k,UUID[k]]));
 const slots=requiredBuckets(now);
 const rows=[UUID.A,UUID.B].flatMap(databaseId=>slots.map(bucket=>({
  databaseId,bucket,queryCount:33000,avgDurationMs:4
 })));
 const dir={
  withSession(){return this},
  prepare(sql){
   const ob={bind(...args){this.args=args;return this},async all(){
    if(sql.includes('FROM shards'))return {results:[...states].map(([shard_id,state])=>({shard_id,state}))};
    throw Error('Unexpected all '+sql);
   },async first(){
    if(sql.includes('COUNT(*)'))return {n:audit.length};
    if(sql.includes('SELECT state'))return {state:states.get(this.args[0])};
    throw Error('Unexpected first '+sql);
   }};
   return ob;
  },
  async batch(statements){
   wrote++;const chosen='C';
   const changes=states.get(chosen)==='disabled'?1:0;
   if(changes){states.set(chosen,'active');audit.push(chosen);}
   return [{success:true,meta:{changes}},{success:true,meta:{changes}}];
  }
 };
 const env={
  DIRECTORY_DB:dir,
  STAGING_SHARD_IDS_JSON:JSON.stringify(ids),
  ANALYTICS_SQL:{async query(){queries++;return {data:opts.empty?[]:rows}}},
 };
 return {env,states,get wrote(){return wrote},get audit(){return audit},get queries(){return queries}};
};
test('Sustained real-format read-only SQL analytics can atomically activate prebound spare C',async()=>{
 const f=make();
 const result=await monitorCapacity(f.env,now);
 assert.equal(result.action,'activated');
 assert.equal(result.shard,'C');
 assert.equal(f.states.get('C'),'active');
 assert.equal(f.wrote,1);assert.deepEqual(f.audit,['C']);
});
test('Missing sampled telemetry cannot activate standby',async()=>{
 const f=make({empty:true});
 const result=await monitorCapacity(f.env,now);
 assert.equal(result.action,'block');
 assert.equal(f.wrote,0);
 assert.equal(f.states.get('C'),'disabled');
});
test('Duplicate timer invocations with no inactive spare never change existing shard',async()=>{
 const f=make();
 await monitorCapacity(f.env,now);
 const again=await monitorCapacity(f.env,now);
 assert.equal(again.reason,'NO_SPARE_DATABASE');assert.equal(f.wrote,1);
});
test('Future reserved shards can be added by catalog only, without changing monitoring logic',async()=>{
 const f=make({withD:true});
 const result=await monitorCapacity(f.env,now);
 assert.equal(result.action,'activated');
 assert.equal(f.states.get('D'),'disabled');
});
test('Malformed shard-to-UUID mappings fail closed without touching data',async()=>{
 const f=make();f.env.STAGING_SHARD_IDS_JSON='{"A":"not-a-uuid"}';
 await assert.rejects(()=>monitorCapacity(f.env,now),/Unverified/);
 assert.equal(f.wrote,0);
});
