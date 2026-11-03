import test from 'node:test';
import assert from 'node:assert/strict';
import {premiumCurrentRoute} from '../src/core/premium-current-route.mjs';
import {premiumCloudRoute} from '../src/core/premium-cloud-routes.mjs';

const account='a8f08aa9-a0a2-4ce3-a179-44fb758d1102',another='f5cbaefc-d7d8-4a3a-a334-b93d0a08d170';
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',c='00000000-0000-4000-8000-000000000003';
const rights={permissions:{cloud_storage:true},available:{cloud_storage:true}};
function fixture(){
 const current=new Map(),media=new Map(),records=new Map(),objects=new Map();
 const k=(acc,kind,key)=>acc+'|'+kind+'|'+key;
 const keyFor=(acc,id)=>acc+'|'+id;
 const db={prepare(sql){return {bind(...args){return{
   async first(){
    if(sql.includes('talera_premium_cloud_consent'))return {enabled:1,granted_at:1};
    if(sql.includes('FROM talera_premium_media'))return media.get(keyFor(args[0],args[1]))||null;
    if(sql.includes('FROM talera_premium_records'))return records.get(keyFor(args[0],args[1]))||null;
    if(sql.includes('FROM talera_premium_current'))return current.get(k(...args))||null;
    throw Error('unknown first SQL: '+sql);
   },
   async all(){
    if(!sql.includes('talera_premium_current'))throw Error('unknown list SQL');
    const [acc,kind,after]=args;
    const items=[...current].filter(([id,row])=>id.startsWith(acc+'|'+kind+'|')&&row.source_key>after)
     .map(([id,row])=>({kind,source_key:row.source_key,current_id:row.current_id,revision:row.revision}))
     .sort((x,y)=>x.source_key.localeCompare(y.source_key)).slice(0,501);
    return {results:items};
   },
   async run(){
    if(sql.startsWith('INSERT OR IGNORE INTO talera_premium_current')){
     const [acc,kind,sourceKey,id,when]=args,key=k(acc,kind,sourceKey);
     if(current.has(key))return {meta:{changes:0}};
     current.set(key,{kind,source_key:sourceKey,current_id:id,revision:1,updated_at:when});
     return {meta:{changes:1}};
    }
    if(sql.startsWith('UPDATE talera_premium_current')){
     const [id,when,acc,kind,sourceKey,old,rev]=args,key=k(acc,kind,sourceKey);
     const row=current.get(key);
     if(!row||row.current_id!==old||row.revision!==rev)return {meta:{changes:0}};
     current.set(key,{...row,current_id:id,revision:rev+1,updated_at:when});
     return {meta:{changes:1}};
    }
    throw Error('unknown run SQL: '+sql);
   }
 };}}}};
 const bucket={get:async key=>objects.has(key)?{size:objects.get(key).length,text:async()=>objects.get(key)}:null};
 const env={DB:db,PREMIUM_PRIVATE:bucket};
 const putMedia=(id,sourceKey,acc=account)=>media.set(keyFor(acc,id),{media_id:id,source_key:sourceKey});
 const putRecord=(id,kind,sourceKey,acc=account)=>{
   const key='premium/'+acc+'/records/'+kind+'/'+id+'.json';
   const text=JSON.stringify({schema:'talera-premium-record/1',kind,sourceKey,record:{id:'story-1',items:[]}});
   records.set(keyFor(acc,id),{record_id:id,kind,object_key:key});
   objects.set(key,text);
 };
 const call=(kind,sourceKey,snapshotId,expectedCurrentId=null,acc=account,writeAllowed=true)=>{
  const request=new Request('https://talera.example/api/premium/cloud/current',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({kind,sourceKey,snapshotId,expectedCurrentId})
  });
  return premiumCloudRoute({request,env,sessionAccount:{id:acc},entitlement:rights,pilotEnabled:true,writeAllowed});
 };
 const list=(kind,acc=account)=>premiumCloudRoute({
  request:new Request('https://talera.example/api/premium/cloud/current?kind='+kind),
  env,sessionAccount:{id:acc},entitlement:rights,pilotEnabled:true
 });
 return {call,list,putMedia,putRecord,current,objects,env};
}
test('media creates one current pointer and can change without losing the logical key',async()=>{
 const f=fixture();f.putMedia(a,'photo-1');f.putMedia(b,'photo-1');
 let r=await f.call('media','photo-1',a);assert.equal(r.status,200);
 assert.equal((await r.json()).revision,1);
 r=await f.call('media','photo-1',b,a);assert.equal(r.status,200);
 assert.equal((await r.json()).revision,2);
 const rows=(await (await f.list('media')).json()).items;
 assert.deepEqual(rows.map(x=>[x.source_key,x.current_id,x.revision]),[['photo-1',b,2]]);
});
test('same source on stale device is rejected, not overwritten',async()=>{
 const f=fixture();f.putMedia(a,'photo-1');f.putMedia(b,'photo-1');f.putMedia(c,'photo-1');
 await f.call('media','photo-1',a);await f.call('media','photo-1',b,a);
 const result=await f.call('media','photo-1',c,a);
 assert.equal(result.status,409);assert.equal((await result.json()).reason,'current_changed');
 assert.equal((await (await f.list('media')).json()).items[0].current_id,b);
});
test('unregistered id or wrong source key cannot become current',async()=>{
 const f=fixture();f.putMedia(a,'photo-1');
 assert.equal((await f.call('media','photo-1',b)).status,409);
 assert.equal((await f.call('media','photo-2',a)).status,409);
 assert.equal(f.current.size,0);
});
test('private story source key is checked against immutable private R2 JSON before pointer update',async()=>{
 const f=fixture();f.putRecord(a,'story','story:story-1');
 const good=await f.call('story','story:story-1',a);assert.equal(good.status,200);
 f.putRecord(b,'story','story:another');
 const wrong=await f.call('story','story:story-1',b,a);
 assert.equal(wrong.status,409);
 assert.equal((await wrong.json()).reason,'source_mismatch');
 assert.equal((await (await f.list('story')).json()).items[0].current_id,a);
});
test('comment archives are separate from stories',async()=>{
 const f=fixture();f.putRecord(a,'story','story:story-1');
 f.putRecord(b,'comment_archive','talera-thread-archive-v1:story-1:comment-1');
 await f.call('story','story:story-1',a);
 await f.call('comment_archive','talera-thread-archive-v1:story-1:comment-1',b);
 assert.equal((await (await f.list('story')).json()).items.length,1);
 assert.equal((await (await f.list('comment_archive')).json()).items.length,1);
});
test('two accounts cannot appoint each others private media',async()=>{
 const f=fixture();f.putMedia(a,'photo-1',account);
 const response=await f.call('media','photo-1',a,null,another);
 assert.equal(response.status,409);assert.equal(f.current.size,0);
});
test('write origin guard prevents pointer changes',async()=>{
 const f=fixture();f.putMedia(a,'photo-1');
 const response=await f.call('media','photo-1',a,null,account,false);
 assert.equal(response.status,403);assert.equal(f.current.size,0);
});
test('missing entitlement or consent blocks pointer read before any metadata is returned',async()=>{
 const f=fixture();f.putMedia(a,'photo-1');await f.call('media','photo-1',a);
 const request=new Request('https://talera.example/api/premium/cloud/current?kind=media');
 const denied=await premiumCloudRoute({request,env:f.env,sessionAccount:{id:account},
  entitlement:{permissions:{cloud_storage:false},available:{cloud_storage:false}},pilotEnabled:true});
 assert.equal(denied.status,403);
});
test('GET current does not expose another account current records',async()=>{
 const f=fixture();f.putMedia(a,'photo-1');await f.call('media','photo-1',a);
 const rows=(await (await f.list('media',another)).json()).items;
 assert.deepEqual(rows,[]);
});
test('oversized and malformed POST payload never updates a current pointer',async()=>{
 const f=fixture();f.putMedia(a,'photo-1');
 const response=await premiumCurrentRoute({request:new Request('https://talera.example/api/premium/cloud/current',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:'media',sourceKey:'x'.repeat(4500),snapshotId:a})
 }),env:f.env,accountId:account,writeAllowed:true});
 assert.equal(response.status,400);assert.equal(f.current.size,0);
});
