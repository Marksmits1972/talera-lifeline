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

function fakeArchive(stories,files){
 const reqResult=(value)=>{
  const request={result:undefined};
  queueMicrotask(()=>{request.result=value;request.onsuccess?.()});
  return request;
 };
 return {open(){
  const request={};
  queueMicrotask(()=>{
   request.result={
    objectStoreNames:{contains:x=>['stories','files'].includes(x)},
    transaction(){return {objectStore(name){return {getAll:()=>reqResult(name==='stories'?stories:files)}}}},
    close(){}
   };
   request.onsuccess?.();
  });
  return request;
 }};
}
test('completeness audit exposes oversized/unsupported files instead of reporting ready',async()=>{
 const largeBlob=new Blob([new Uint8Array(26*1024*1024)],{type:'video/mp4'});
 const archive=fakeArchive([{id:'my-story',items:[],title:'A memory'}],[
  {key:'photo',blob:new Blob(['photo'],{type:'image/jpeg'})},
  {key:'large-video',blob:largeBlob},
  {key:'unknown-file',blob:new Blob(['unknown'],{type:'application/unknown'})}
 ]);
 const fetcher=async path=>({
  ok:true,json:async()=>{
   if(path==='/api/me/entitlements')return {accountId:user,rights:{permissions:{cloud_storage:true},available:{cloud_storage:true}}};
   if(path==='/api/premium/cloud/consent')return {consent:{enabled:true}};
   return {ok:true,items:[],next:null};
  }
 });
 const result=await auditPremiumSync({indexedDB:archive,crypto,fetcher,expectedAccountId:user,ownerMatches:()=>true});
 assert.equal(result.phase,'needs_attention');
 assert.equal(result.mediaMissing,1);
 assert.equal(result.recordsMissing,1);
 assert.equal(result.oversized,1);
 assert.equal(result.unsupported,1);
 assert.equal(result.verifiedObjects,false);
});
