import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';

const src=readFileSync(new URL('../src/core/premium-private-memory.js',import.meta.url),'utf8');
const id='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const uuidRule=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
class R2{
 constructor(){this.map=new Map();}
 async put(key,bytes,opts){
  if(opts?.onlyIf?.etagDoesNotMatch==='*'&&this.map.has(key))return null;
  this.map.set(key,{data:new Uint8Array(bytes),metadata:opts.customMetadata});return {key};
 }
 async get(key){
  const x=this.map.get(key);if(!x)return null;
  return {size:x.data.length,customMetadata:x.metadata,arrayBuffer:async()=>x.data.slice().buffer};
 }
}
const {privateMemoryCloudRoutes}=runInNewContext(src+'\n({privateMemoryCloudRoutes})',{
 crypto:webcrypto,Response,TextEncoder,TextDecoder,Uint8Array,Date,JSON,Set,
 uuidRule,premiumGrantView:async env=>env.rights,
 allowedWrite:req=>req.headers.get('origin')===new URL(req.url).origin,
 rateLimit:async()=>true
});
const env=()=>({PREMIUM_PRIVATE_MEMORY_ENABLED:'true',PREMIUM_PRIVATE_MEMORY_TEST_IDS:id,
 PREMIUM_PRIVATE:new R2(),rights:{source:'manual_test',permissions:{cloud_storage:true}}});
const memory={id:'mijn leven / voorjaar 🇳🇱',title:'Een kleine herinnering',
 items:[],story:'Een verhaal dat op dit toestel blijft bestaan'};
const req=(method,data,origin='https://qa.talera.example')=>new Request(
 'https://qa.talera.example/api/me/premium/cloud/memory'+(method==='GET'?'?id='+encodeURIComponent(data):''),
 {method,headers:{origin,'content-type':'application/json'},
 ...(method==='PUT'?{body:JSON.stringify(data)}:{})});
const route=(request,e,user={id})=>privateMemoryCloudRoutes(request,e,user,'/api/me/premium/cloud/memory',request.method,new URL(request.url));

test('opt-in text memory PUT then verified GET in fresh session, same local ID',async()=>{
 const e=env();
 const saved=await route(req('PUT',{consent:true,memory}),e);
 assert.equal(saved.status,201);
 assert.equal((await saved.json()).verified,true);
 const restored=await route(req('GET',memory.id),e,{id});
 assert.equal(restored.status,200);
 const data=await restored.json();
 assert.equal(data.memory.id,memory.id);
 assert.deepEqual(JSON.parse(JSON.stringify(data.memory)),memory);
 assert.equal(data.mediaIncluded,false);
 assert.equal(e.PREMIUM_PRIVATE.map.size,1);
});
test('disabled, unauthenticated, non-allowlisted and Free accounts fail closed',async()=>{
 const e=env();
 assert.equal((await route(req('GET',memory.id),e,null)).status,401);
 e.PREMIUM_PRIVATE_MEMORY_ENABLED='false';
 assert.equal((await route(req('GET',memory.id),e)).status,404);
 e.PREMIUM_PRIVATE_MEMORY_ENABLED='true';
 assert.equal((await route(req('GET',memory.id),e,{id:other})).status,403);
 e.rights={source:'free',permissions:{cloud_storage:false}};
 assert.equal((await route(req('PUT',{consent:true,memory}),e)).status,403);
 assert.equal(e.PREMIUM_PRIVATE.map.size,0);
});
test('second upload does not silently overwrite first cloud copy',async()=>{
 const e=env();
 assert.equal((await route(req('PUT',{consent:true,memory}),e)).status,201);
 assert.equal((await route(req('PUT',{consent:true,memory:{...memory,title:'CHANGED'}}),e)).status,409);
 const read=await route(req('GET',memory.id),e);
 assert.equal((await read.json()).memory.title,memory.title);
});
test('media, no consent, foreign origin and excessive body are blocked',async()=>{
 const e=env();
 assert.equal((await route(req('PUT',{consent:false,memory}),e)).status,400);
 assert.equal((await route(req('PUT',{consent:true,memory:{...memory,items:[{key:'photo'}]}}),e)).status,422);
 assert.equal((await route(req('PUT',{consent:true,memory} ,'https://bad.example'),e)).status,403);
 assert.equal((await route(req('PUT',{consent:true,memory:{...memory,story:'X'.repeat(140000)}}),e)).status,400);
 assert.equal(e.PREMIUM_PRIVATE.map.size,0);
});
test('corrupted cloud bytes are never restored',async()=>{
 const e=env();await route(req('PUT',{consent:true,memory}),e);
 const item=[...e.PREMIUM_PRIVATE.map.values()][0];
 item.data[item.data.length-2]^=1;
 assert.equal((await route(req('GET',memory.id),e)).status,409);
});
test('client fixture has no automatic IndexedDB read, no Free route change',()=>{
 assert.ok(!/indexedDB|SHARE_MEDIA|INSERT INTO|DELETE FROM/.test(src));
 assert.ok(src.includes("env.PREMIUM_PRIVATE_MEMORY_ENABLED!=='true'"));
 assert.ok(src.includes("request?.consent!==true"));
});
