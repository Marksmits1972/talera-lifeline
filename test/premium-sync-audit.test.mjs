import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchPremiumManifestIds,auditPremiumSync} from '../src/mijn-talera/premium-sync-audit.mjs';
const user='a8f08aa9-a0a2-4ce3-a179-44fb758d1102';
const u=(i)=>'00000000-0000-4000-8000-'+i.toString(16).padStart(12,'0');
test('paginates beyond the old 200 media limit, without losing the last entry',async()=>{
 let calls=0;
 const rows=Array.from({length:501},(_,i)=>({media_id:u(i),content_type:'image/jpeg'}));
 const fetcher=async(path)=>{
  calls++;
  const cursor=new URL('https://test.invalid'+path).searchParams.get('after');
  const filtered=cursor?rows.filter(x=>x.media_id>cursor):rows;
  return {ok:true,json:async()=>({ok:true,items:filtered.slice(0,500),
   next:filtered.length>500?filtered[499].media_id:null})};
 };
 const ids=await fetchPremiumManifestIds(fetcher,'media');
 assert.equal(ids.size,501);assert.equal(calls,2);
});
test('repeated pagination cursor fails closed',async()=>{
 const repeated=u(1);
 const fetcher=async()=>({ok:true,json:async()=>({ok:true,items:Array.from({length:500},(_,i)=>({record_id:u(i)})),next:repeated})});
 await assert.rejects(fetchPremiumManifestIds(fetcher,'records'),/duplicate_or_invalid_manifest_id|invalid_manifest_cursor/);
});
test('absent Premium rights cannot scan local Free IndexedDB',async()=>{
 let touched=0;
 const result=await auditPremiumSync({
  indexedDB:{open(){touched++}},crypto,expectedAccountId:user,ownerMatches:()=>true,
  fetcher:async path=>({ok:true,json:async()=>path.includes('entitlements')?{
   accountId:user,rights:{permissions:{cloud_storage:false},available:{cloud_storage:false}}
  }:{consent:{enabled:false}}})
 });
 assert.equal(result.phase,'not_enabled');assert.equal(touched,0);
});
test('mismatched account cannot scan local Free IndexedDB',async()=>{
 let touched=0,calls=0;
 const result=await auditPremiumSync({
  indexedDB:{open(){touched++}},crypto,expectedAccountId:user,ownerMatches:()=>false,
  fetcher:async()=>{calls++;throw Error('unexpected')}
 });
 assert.equal(result.phase,'not_enabled');assert.equal(touched,0);assert.equal(calls,0);
});
test('offline does not issue requests or open IndexedDB',async()=>{
 let touched=0,calls=0;
 const result=await auditPremiumSync({
  indexedDB:{open(){touched++}},crypto,expectedAccountId:user,ownerMatches:()=>true,online:()=>false,
  fetcher:async()=>{calls++;throw Error('unexpected')}
 });
 assert.equal(result.phase,'offline');assert.equal(touched,0);assert.equal(calls,0);
});
