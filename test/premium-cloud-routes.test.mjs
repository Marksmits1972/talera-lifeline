import test from 'node:test';import assert from 'node:assert/strict';import {premiumCloudRoute} from '../src/core/premium-cloud-routes.mjs';
const entitlement={permissions:{cloud_storage:true},available:{cloud_storage:true}},account={id:'a8f08aa9-a0a2-4ce3-a179-44fb758d1102'};
const env={DB:{prepare(){return {bind(){return {first:async()=>null}}}}}};
const request=(path,method='GET')=>new Request('https://example.test'+path,{method});
test('unknown route leaves Core routing intact',async()=>assert.equal(await premiumCloudRoute({request:request('/api/me'),env}),null));
test('unauthed Cloud route denied before query',async()=>assert.equal((await premiumCloudRoute({request:request('/api/premium/cloud/media'),env})).status,401));
test('consent can be read as unset without granting permission',async()=>{const r=await premiumCloudRoute({request:request('/api/premium/cloud/consent'),env,sessionAccount:account});assert.deepEqual((await r.json()).consent,{enabled:false,grantedAt:null})});
test('grant requires origin check',async()=>assert.equal((await premiumCloudRoute({request:request('/api/premium/cloud/consent','POST'),env,sessionAccount:account,entitlement,pilotEnabled:true})).status,403));
test('Free cannot accept consent',async()=>{const r=await premiumCloudRoute({request:new Request('https://example.test/api/premium/cloud/consent',{method:'POST',body:JSON.stringify({agree:true})}),env,sessionAccount:account,entitlement:{permissions:{cloud_storage:false}},pilotEnabled:true,writeAllowed:true});assert.equal(r.status,403)});
test('media list denied while pilot disabled',async()=>assert.equal((await premiumCloudRoute({request:request('/api/premium/cloud/media'),env,sessionAccount:account,entitlement})).status,403));

test('rejects oversized declared upload before storage access',async()=>{const request=new Request('https://example.test/api/premium/cloud/media/c6cd53e5-49b1-4483-b8f1-0aa29fa3ce72',{method:'PUT',headers:{'content-type':'image/jpeg','content-length':String(26*1024*1024)},body:'x'});const r=await premiumCloudRoute({request,env:{DB:{prepare(){return {bind(){return {first:async()=>({enabled:1})}}}}}},sessionAccount:account,entitlement,pilotEnabled:true,writeAllowed:true});assert.equal(r.status,413)});
test('browser upload without length reaches size and hash validation',async()=>{const request=new Request('https://example.test/api/premium/cloud/media/c6cd53e5-49b1-4483-b8f1-0aa29fa3ce72',{method:'PUT',headers:{'content-type':'image/jpeg','x-content-sha256':'bad'},body:'hello'});const r=await premiumCloudRoute({request,env:{DB:{prepare(){return {bind(){return {first:async()=>({enabled:1})}}}}}},sessionAccount:account,entitlement,pilotEnabled:true,writeAllowed:true});assert.equal(r.status,400);assert.equal((await r.json()).reason,'invalid_digest')});

test('private media supports only bounded 8 MiB ranges for safe readback',async()=>{
 const bytes=new Uint8Array([10,20,30,40]);
 const scoped={DB:{prepare(sql){return {bind(){return {
  async first(){
   if(sql.includes('talera_premium_cloud_consent'))return {enabled:1};
   if(sql.includes('talera_premium_media'))return {object_key:'premium/test/file',content_type:'image/jpeg',byte_size:4};
   return null;
  }
 }}}}},PREMIUM_PRIVATE:{async get(key,opts){
  assert.equal(key,'premium/test/file');
  assert.deepEqual(opts.range,{offset:1,length:2});
  return {body:bytes.slice(1,3)};
 }}};
 const request=new Request('https://example.test/api/premium/cloud/media/c6cd53e5-49b1-4483-b8f1-0aa29fa3ce72',
 {headers:{range:'bytes=1-2'}});
 const response=await premiumCloudRoute({request,env:scoped,sessionAccount:account,entitlement,pilotEnabled:true});
 assert.equal(response.status,206);
 assert.equal(response.headers.get('content-range'),'bytes 1-2/4');
 assert.deepEqual(new Uint8Array(await response.arrayBuffer()),new Uint8Array([20,30]));
 const invalid=new Request(request.url,{headers:{range:'bytes=0-99999999'}});
 const blocked=await premiumCloudRoute({request:invalid,env:scoped,sessionAccount:account,entitlement,pilotEnabled:true});
 assert.equal(blocked.status,416);
});
