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
