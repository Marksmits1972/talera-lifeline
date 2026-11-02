import test from 'node:test';
import assert from 'node:assert/strict';
import {premiumCloudRoute} from '../src/core/premium-cloud-routes.mjs';

const alice={id:'a8f08aa9-a0a2-4ce3-a179-44fb758d1102'};
const bob={id:'f5cbaefc-d7d8-4a3a-a334-b93d0a08d170'};
const mediaId='c6cd53e5-49b1-4483-b8f1-0aa29fa3ce72';
const entitlement={permissions:{cloud_storage:true},available:{cloud_storage:true}};
function fixture(){
 const manifests=new Map(),objects=new Map(),consents=new Map([[alice.id,{enabled:1,granted_at:1}],[bob.id,{enabled:1,granted_at:1}]]);
 const db={prepare(sql){return {bind(...args){return {
  async first(){
   if(sql.includes('talera_premium_cloud_consent'))return consents.get(args[0])||null;
   if(sql.includes('talera_premium_media'))return manifests.get(args[0]+'/'+args[1])||null;
   return null;
  },
  async all(){return {results:[...manifests.values()].filter(x=>x.account_id===args[0]).map(({media_id,content_type,byte_size,created_at})=>({media_id,content_type,byte_size,created_at}))}},
  async run(){
   if(sql.startsWith('INSERT INTO talera_premium_media')){
    const [account_id,media_id,object_key,content_type,byte_size,sha256,created_at]=args;
    manifests.set(account_id+'/'+media_id,{account_id,media_id,object_key,content_type,byte_size,sha256,created_at});
   }
   return {success:true};
  }
 }}}}};
 const bucket={
  async put(key,bytes){if(objects.has(key))return null;objects.set(key,bytes.slice(0));return {etag:'fixture'}},
  async get(key){const bytes=objects.get(key);return bytes?{body:bytes}:null}
 };
 return {env:{DB:db,PREMIUM_PRIVATE:bucket},objects,manifests};
}
test('fictional upload and download stays scoped to its account',async()=>{
 const {env}=fixture();
 const bytes=new TextEncoder().encode('not an actual photograph');
 const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const path='/api/premium/cloud/media/'+mediaId;
 const request=new Request('https://example.test'+path,{method:'PUT',body:bytes,headers:{'content-type':'image/jpeg','x-content-sha256':sha}});
 const uploaded=await premiumCloudRoute({request,env,sessionAccount:alice,entitlement,pilotEnabled:true,writeAllowed:true});
 assert.equal(uploaded.status,200);
 assert.equal((await uploaded.json()).reason,'stored');
 const downloaded=await premiumCloudRoute({request:new Request('https://example.test'+path),env,sessionAccount:alice,entitlement,pilotEnabled:true});
 assert.equal(downloaded.status,200);assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()),bytes);
 const other=await premiumCloudRoute({request:new Request('https://example.test'+path),env,sessionAccount:bob,entitlement,pilotEnabled:true});
 assert.equal(other.status,404);
 const free=await premiumCloudRoute({request:new Request('https://example.test'+path),env,sessionAccount:alice,entitlement:{permissions:{cloud_storage:false},available:{cloud_storage:false}},pilotEnabled:true});
 assert.equal(free.status,403);
});
