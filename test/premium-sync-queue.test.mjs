import test from 'node:test';import assert from 'node:assert/strict';
import {syncPremiumPending} from '../src/mijn-talera/premium-sync-queue.mjs';
const items=[{id:'a'},{id:'b'}];
function fixture(overrides={}){const synced=[];return {synced,args:{listPending:async()=>items,readMedia:async x=>x.id,markSynced:async x=>synced.push(x.id),upload:async()=>({ok:true,reason:'stored'}),allowed:async()=>true,...overrides}}}
test('Free or missing consent keeps local memories untouched',async()=>{const f=fixture({allowed:async()=>false});assert.equal((await syncPremiumPending(f.args)).phase,'not_enabled');assert.deepEqual(f.synced,[])});
test('offline does not mark data synced',async()=>{const f=fixture({online:()=>false});assert.equal((await syncPremiumPending(f.args)).phase,'offline');assert.deepEqual(f.synced,[])});
test('confirmed uploads mark only confirmed items',async()=>{const f=fixture({upload:async item=>item.id==='a'?{ok:true,reason:'stored'}:{ok:false}});const r=await syncPremiumPending(f.args);assert.deepEqual(f.synced,['a']);assert.equal(r.failed,1)});
test('idempotent server response is accepted',async()=>{const f=fixture({upload:async()=>({ok:true,reason:'already_stored'})});assert.equal((await syncPremiumPending(f.args)).uploaded,2)});
test('exception retries later without deleting local media',async()=>{const f=fixture({upload:async()=>{throw Error('offline')}});const r=await syncPremiumPending(f.args);assert.equal(r.failed,2);assert.deepEqual(f.synced,[])});
test('bounded batch keeps more items pending',async()=>{const f=fixture();const r=await syncPremiumPending({...f.args,maxItems:1});assert.equal(r.pending,1);assert.equal(r.phase,'uploading')});
test('entitlement revoked mid-sync stops subsequent uploads',async()=>{let n=0;const f=fixture({allowed:async()=>++n<=2});const r=await syncPremiumPending(f.args);assert.equal(r.phase,'not_enabled');assert.deepEqual(f.synced,['a'])});

test('temporary rights check failure does not crash or mark local media synced',async()=>{
 const f=fixture({allowed:async()=>{throw Error('network_unavailable')}});
 const result=await syncPremiumPending(f.args);
 assert.equal(result.phase,'not_enabled');
 assert.deepEqual(f.synced,[]);
});
test('rights check failure mid-batch retains remaining local media',async()=>{
 let checks=0;const f=fixture({allowed:async()=>{checks++;if(checks===3)throw Error('network_unavailable');return true}});
 const result=await syncPremiumPending(f.args);
 assert.equal(result.phase,'not_enabled');
 assert.deepEqual(f.synced,['a']);
 assert.equal(result.pending,1);
});
