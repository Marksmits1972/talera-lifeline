import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';

const source=readFileSync(new URL('../src/core/premium-cloud-pilot.js',import.meta.url),'utf8');
const id='11111111-1111-4111-8111-111111111111';
const second='22222222-2222-4222-8222-222222222222';
const uuidRule=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class MockR2 {
 constructor(){this.data=new Map();}
 async put(key,body,options){
  this.data.set(key,{bytes:new Uint8Array(body),metadata:{...options.customMetadata}});
  return {key};
 }
 async get(key){
  const v=this.data.get(key);if(!v)return null;
  return {size:v.bytes.length,customMetadata:{...v.metadata},arrayBuffer:async()=>v.bytes.slice().buffer};
 }
 async delete(key){this.data.delete(key);}
}
const {premiumCloudPilotRoutes}=runInNewContext(source+'\n({premiumCloudPilotRoutes})',{
 crypto:webcrypto,Response,TextEncoder,TextDecoder,Uint8Array,Set,String,Object,Array,JSON,
 uuidRule,premiumGrantView:async(env)=>env.rights,allowedWrite:r=>r.headers.get('origin')==='https://test.talera.example',
 rateLimit:async()=>true
});
function env(){return {PREMIUM_CLOUD_PILOT_ENABLED:'true',PREMIUM_CLOUD_PILOT_ACCOUNT_IDS:id,
 PREMIUM_MEDIA:new MockR2(),rights:{source:'manual_test',permissions:{cloud_storage:true}}};}
const req=(method,origin='https://test.talera.example')=>new Request('https://test.talera.example/api/me/premium/cloud/pilot',{method,headers:{origin}});
const route=(req,e,user={id})=>premiumCloudPilotRoutes(req,e,user,'/api/me/premium/cloud/pilot',req.method);

test('disabled without explicit feature switch and account allowlist',async()=>{
 const e=env();e.PREMIUM_CLOUD_PILOT_ENABLED='false';
 assert.equal((await route(req('GET'),e)).status,404);
 e.PREMIUM_CLOUD_PILOT_ENABLED='true';e.PREMIUM_CLOUD_PILOT_ACCOUNT_IDS='';
 assert.equal((await route(req('GET'),e)).status,403);
 assert.equal(e.PREMIUM_MEDIA.data.size,0);
});
test('requires authenticated account and current temporary Premium right',async()=>{
 const e=env();assert.equal((await route(req('GET'),e,null)).status,401);
 e.rights={source:'free',permissions:{cloud_storage:false}};
 assert.equal((await route(req('POST'),e)).status,403);
 e.rights={source:'manual_test',permissions:{cloud_storage:true}};
 delete e.PREMIUM_MEDIA;
 assert.equal((await route(req('GET'),e)).status,503);
});
test('synthetic upload, integrity check, recovery in second session, and cleanup',async()=>{
 const e=env();
 const upload=await route(req('POST'),e);
 assert.equal(upload.status,200);
 const u=await upload.json();assert.equal(u.verified,true);
 assert.equal(e.PREMIUM_MEDIA.data.size,1);
 const restored=await route(req('GET'),e,{id});
 const v=await restored.json();
 assert.equal(v.verified,true);assert.equal(v.sha256,u.sha256);
 assert.equal(v.memory.synthetic,true);assert.equal(v.memory.media.length,0);
 assert.equal(v.memory.memoryId,'talera-pilot-synthetic-v1');
 assert.equal((await route(req('GET'),e,{id:second})).status,403);
 assert.equal((await route(req('DELETE'),e)).status,200);
 assert.equal((await route(req('GET'),e)).status,404);
});
test('mutation blocked if source origin is wrong',async()=>{
 const e=env();assert.equal((await route(req('POST','https://evil.example'),e)).status,403);
 assert.equal(e.PREMIUM_MEDIA.data.size,0);
});
test('corruption is detected and never reported as recovered',async()=>{
 const e=env();await route(req('POST'),e);
 const item=[...e.PREMIUM_MEDIA.data.values()][0];item.bytes[0]^=1;
 assert.equal((await route(req('GET'),e)).status,409);
});
test('never accepts client content and never creates a second database or public media',()=>{
 assert.ok(!/req\.(json|formData|text|arrayBuffer)\s*\(/.test(source));
 assert.ok(!/CREATE TABLE|INSERT INTO|SHARE_MEDIA|fetch\s*\(/.test(source));
 assert.ok(source.includes("env.PREMIUM_CLOUD_PILOT_ENABLED!=='true'"));
});
