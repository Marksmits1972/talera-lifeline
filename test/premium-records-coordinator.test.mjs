import test from 'node:test';
import assert from 'node:assert/strict';
import {runPremiumRecordSync} from '../src/mijn-talera/premium-records-coordinator.mjs';
const correct='a8f08aa9-a0a2-4ce3-a179-44fb758d1102',other='f5cbaefc-d7d8-4a3a-a334-b93d0a08d170';
const okBody=(p)=>p==='/api/me/entitlements'?{accountId:correct,rights:{permissions:{cloud_storage:true},available:{cloud_storage:true}}}:{consent:{enabled:true}};
test('no consent or Free entitlement prevents local archive inspection',async()=>{
 let touched=0;
 const result=await runPremiumRecordSync({crypto,indexedDB:{open(){touched++}},fetcher:async p=>({ok:true,json:async()=>p==='/api/me/entitlements'?{accountId:correct,rights:{permissions:{cloud_storage:false},available:{cloud_storage:false}}}:{consent:{enabled:true}}}),expectedAccountId:correct,ownerMatches:()=>true});
 assert.equal(result.phase,'not_enabled');assert.equal(touched,0);
});
test('wrong local account blocks before network or local archive access',async()=>{
 let calls=0,reads=0;
 const result=await runPremiumRecordSync({crypto,indexedDB:{open(){reads++}},fetcher:async()=>{calls++;throw Error('unexpected')},expectedAccountId:correct,ownerMatches:()=>false});
 assert.equal(result.phase,'not_enabled');assert.equal(reads,0);assert.equal(calls,0);
});
test('wrong server account blocks before local archive access',async()=>{
 let reads=0;
 const result=await runPremiumRecordSync({crypto,indexedDB:{open(){reads++}},fetcher:async p=>({ok:true,json:async()=>p==='/api/me/entitlements'?{accountId:other,rights:{permissions:{cloud_storage:true},available:{cloud_storage:true}}}:{consent:{enabled:true}}}),expectedAccountId:correct,ownerMatches:()=>true});
 assert.equal(result.phase,'not_enabled');assert.equal(reads,0);
});
test('offline blocks without network access',async()=>{
 let calls=0;
 const result=await runPremiumRecordSync({crypto,fetcher:async()=>{calls++},online:()=>false});
 assert.equal(result.phase,'offline');assert.equal(calls,0);
});
