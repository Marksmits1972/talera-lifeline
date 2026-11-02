import test from 'node:test';import assert from 'node:assert/strict';
import {handleCorePremiumCloud} from '../src/core/premium-cloud-core-adapter.mjs';
const id='a8f08aa9-a0a2-4ce3-a179-44fb758d1102';
const req=(path,method='GET')=>new Request('https://example.test'+path,{method});
const rights={source:'manual_test',permissions:{cloud_storage:true},available:{cloud_storage:false}};
const env={PREMIUM_CLOUD_PILOT_ENABLED:'false',PREMIUM_CLOUD_PILOT_ACCOUNT_IDS:id};
const base={env,user:{id},getRights:async()=>rights,allowedWrite:()=>true,rateLimit:async()=>true};
test('unrelated Core routes are untouched',async()=>assert.equal(await handleCorePremiumCloud({...base,request:req('/api/me')}),null));
test('anonymous users blocked before rights lookup',async()=>{let queried=false;const r=await handleCorePremiumCloud({...base,user:null,getRights:async()=>{queried=true},request:req('/api/premium/cloud/media')});assert.equal(r.status,401);assert.equal(queried,false)});
test('disabled pilot denies even valid account',async()=>assert.equal((await handleCorePremiumCloud({...base,request:req('/api/premium/cloud/media')})).status,403));
test('other account excluded by allowlist',async()=>assert.equal((await handleCorePremiumCloud({...base,env:{...env,PREMIUM_CLOUD_PILOT_ENABLED:'true'},user:{id:'f5cbaefc-d7d8-4a3a-a334-b93d0a08d170'},request:req('/api/premium/cloud/media')})).status,403));
test('missing Core guards fail closed',async()=>assert.equal((await handleCorePremiumCloud({...base,allowedWrite:null,request:req('/api/premium/cloud/media')})).status,503));
test('pilot requests enforce rate limit before data access',async()=>{const r=await handleCorePremiumCloud({...base,env:{...env,PREMIUM_CLOUD_PILOT_ENABLED:'true'},rateLimit:async()=>false,request:req('/api/premium/cloud/consent','POST')});assert.equal(r.status,429)});

test('large-video parts use a separate per-account rate bucket',async()=>{
 let seen;
 const request=req('/api/premium/cloud/multipart/c6cd53e5-49b1-4483-b8f1-0aa29fa3ce72/part/1','PUT');
 const result=await handleCorePremiumCloud({...base,env:{...env,PREMIUM_CLOUD_PILOT_ENABLED:'true'},
  rateLimit:async(_req,_env,category,threshold)=>{seen={category,threshold};return false},request});
 assert.equal(result.status,429);
 assert.deepEqual(seen,{category:'premium-cloud-part:'+id,threshold:600});
});
