import test from 'node:test';
import assert from 'node:assert/strict';
import {privateRecordRoute,validatePrivateRecord} from '../src/core/premium-private-records.mjs';
import {createPremiumRecordSnapshot,uploadPremiumRecord} from '../src/mijn-talera/premium-records-bridge.mjs';
import {premiumCloudRoute} from '../src/core/premium-cloud-routes.mjs';
const a='a8f08aa9-a0a2-4ce3-a179-44fb758d1102',b='f5cbaefc-d7d8-4a3a-a334-b93d0a08d170';
const rights={permissions:{cloud_storage:true},available:{cloud_storage:true}};
const asAccount=(id)=>({id});
function fixture(){
 const manifest=new Map(),blobs=new Map();
 const db={prepare(sql){return {bind(...args){return {
  async first(){
   if(sql.includes('talera_premium_cloud_consent'))return {enabled:1,granted_at:123};
   if(sql.includes('talera_premium_records'))return manifest.get(args[0]+'/'+args[1])||null;
   return null;
  },
  async all(){
   return {results:[...manifest.values()].filter(x=>x.account_id===args[0] && x.record_id>args[1])
    .sort((x,y)=>x.record_id.localeCompare(y.record_id)).map(x=>({record_id:x.record_id,kind:x.kind,sha256:x.sha256,byte_size:x.byte_size,created_at:x.created_at}))};
  },
  async run(){
   if(sql.startsWith('INSERT INTO talera_premium_records')){
    const [account_id,record_id,kind,object_key,sha256,byte_size,created_at]=args;
    manifest.set(account_id+'/'+record_id,{account_id,record_id,kind,object_key,sha256,byte_size,created_at});
   }
   return {success:true};
  }
 }}}}};
 const bucket={
  async put(key,value){if(blobs.has(key))return null;blobs.set(key,value.slice(0));return {etag:'stored'}},
  async get(key){return blobs.has(key)?{body:blobs.get(key)}:null}
 };
 return {env:{DB:db,PREMIUM_PRIVATE:bucket},blobs,manifest};
}
const story={id:'local-story',items:[{key:'photograph'}],title:'A private memory'};
const putRequest=(snap)=>new Request('https://talera.example/api/premium/cloud/records/'+snap.kind+'/'+snap.id,{
 method:'PUT',headers:{'content-type':'application/json','x-content-sha256':snap.sha256},body:snap.bytes
});
test('story and old comment get stable, distinct private record IDs',async()=>{
 const s=await createPremiumRecordSnapshot({kind:'story',sourceKey:'story:local-story',record:story},{crypto});
 const c=await createPremiumRecordSnapshot({kind:'comment_archive',sourceKey:'talera-thread-archive-v1:local-story:x',record:{localId:'local-story',comment:{id:'x',body:'historical'}}},{crypto});
 assert.notEqual(s.id,c.id);
 assert.equal(s.id,(await createPremiumRecordSnapshot({kind:'story',sourceKey:'story:local-story',record:story},{crypto})).id);
 assert.equal(validatePrivateRecord({accountId:a,id:s.id,kind:s.kind,payload:JSON.parse(new TextDecoder().decode(s.bytes)),bytes:s.bytes.buffer,sha256:s.sha256}),null);
});
test('private EU record: PUT, list, GET, idempotence and no cross-account read',async()=>{
 const {env,blobs}=fixture();
 const s=await createPremiumRecordSnapshot({kind:'story',sourceKey:'story:local-story',record:story},{crypto});
 const upload=await premiumCloudRoute({request:putRequest(s),env,sessionAccount:asAccount(a),entitlement:rights,pilotEnabled:true,writeAllowed:true});
 assert.equal(upload.status,200);assert.equal((await upload.json()).reason,'stored');
 const again=await premiumCloudRoute({request:putRequest(s),env,sessionAccount:asAccount(a),entitlement:rights,pilotEnabled:true,writeAllowed:true});
 assert.equal((await again.json()).reason,'already_stored');
 const list=await premiumCloudRoute({request:new Request('https://talera.example/api/premium/cloud/records'),env,sessionAccount:asAccount(a),entitlement:rights,pilotEnabled:true});
 assert.deepEqual((await list.json()).items.map(x=>x.record_id),[s.id]);
 const path='https://talera.example/api/premium/cloud/records/story/'+s.id;
 const read=await premiumCloudRoute({request:new Request(path),env,sessionAccount:asAccount(a),entitlement:rights,pilotEnabled:true});
 assert.equal(read.status,200);assert.equal((await read.json()).record.title,story.title);
 const stranger=await premiumCloudRoute({request:new Request(path),env,sessionAccount:asAccount(b),entitlement:rights,pilotEnabled:true});
 assert.equal(stranger.status,404);assert.equal(blobs.size,1);
});
test('private records require consent, pilot, origin and verified digest',async()=>{
 const {env,blobs}=fixture();
 const s=await createPremiumRecordSnapshot({kind:'story',sourceKey:'story:local-story',record:story},{crypto});
 const disabled=await premiumCloudRoute({request:putRequest(s),env,sessionAccount:asAccount(a),entitlement:rights,writeAllowed:true});
 assert.equal(disabled.status,403);
 const origin=await premiumCloudRoute({request:putRequest(s),env,sessionAccount:asAccount(a),entitlement:rights,pilotEnabled:true,writeAllowed:false});
 assert.equal(origin.status,403);
 const wrong=new Request('https://talera.example/api/premium/cloud/records/story/'+s.id,{
  method:'PUT',headers:{'content-type':'application/json','x-content-sha256':'0'.repeat(64)},body:s.bytes});
 const hash=await premiumCloudRoute({request:wrong,env,sessionAccount:asAccount(a),entitlement:rights,pilotEnabled:true,writeAllowed:true});
 assert.equal(hash.status,400);assert.equal((await hash.json()).reason,'digest_mismatch');assert.equal(blobs.size,0);
});
test('browser record upload uses only the same origin and checks confirmed result',async()=>{
 const snapshot=await createPremiumRecordSnapshot({kind:'story',sourceKey:'story:local-story',record:story},{crypto});
 let headers;
 const result=await uploadPremiumRecord({snapshot,fetcher:async(url,opts)=>{
  headers={url,opts};return {ok:true,json:async()=>({ok:true,reason:'stored'})};
 }});
 assert.equal(result.reason,'stored');assert.equal(headers.opts.credentials,'same-origin');
 assert.equal(headers.opts.headers['x-content-sha256'],snapshot.sha256);
});
