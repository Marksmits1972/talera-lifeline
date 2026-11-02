import test from 'node:test';import assert from 'node:assert/strict';
import {runPremiumMediaSync} from '../src/mijn-talera/premium-sync-coordinator.mjs';
test('no active entitlement means no access to IndexedDB',async()=>{
 let opened=false;
 const fetcher=async path=>({ok:true,json:async()=>path.includes('entitlements')?{rights:{permissions:{cloud_storage:false},available:{cloud_storage:false}}}:{consent:{enabled:true}}});
 const result=await runPremiumMediaSync({indexedDB:{open(){opened=true}},crypto,fetcher});
 assert.equal(result.phase,'not_enabled');assert.equal(opened,false);
});
test('offline does not issue network requests',async()=>{
 let calls=0;const result=await runPremiumMediaSync({crypto,fetcher:async()=>{calls++},online:()=>false});
 assert.equal(result.phase,'offline');assert.equal(calls,0);
});

test('device owner mismatch prevents all local archive reads',async()=>{
 let localReads=0,networkCalls=0;
 const result=await runPremiumMediaSync({crypto,indexedDB:{open(){localReads++}},expectedAccountId:'a8f08aa9-a0a2-4ce3-a179-44fb758d1102',ownerMatches:()=>false,fetcher:async()=>{networkCalls++;throw Error('unexpected')}});
 assert.equal(result.phase,'not_enabled');assert.equal(localReads,0);assert.equal(networkCalls,0);
});
test('entitlement for a different account prevents local archive reads',async()=>{
 let localReads=0;
 const fetcher=async path=>({ok:true,json:async()=>path.includes('entitlements')?{accountId:'f5cbaefc-d7d8-4a3a-a334-b93d0a08d170',rights:{permissions:{cloud_storage:true},available:{cloud_storage:true}}}:{consent:{enabled:true}}});
 const result=await runPremiumMediaSync({crypto,indexedDB:{open(){localReads++}},expectedAccountId:'a8f08aa9-a0a2-4ce3-a179-44fb758d1102',ownerMatches:()=>true,fetcher});
 assert.equal(result.phase,'not_enabled');assert.equal(localReads,0);
});
