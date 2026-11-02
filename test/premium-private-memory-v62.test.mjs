import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';

const mediaSource=readFileSync(new URL('../src/core/premium-private-media.js',import.meta.url),'utf8');
const memorySource=readFileSync(new URL('../src/core/premium-private-memory.js',import.meta.url),'utf8');
const source=mediaSource+'\n'+memorySource;
const id='11111111-1111-4111-8111-111111111111';
const outsider='22222222-2222-4222-8222-222222222222';
const uuidRule=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha=async v=>[...new Uint8Array(await webcrypto.subtle.digest('SHA-256',v))]
 .map(b=>b.toString(16).padStart(2,'0')).join('');
class MockR2{
 constructor(){this.items=new Map()}
 async head(k){const x=this.items.get(k);return x?{size:x.bytes.length,customMetadata:x.meta}:null}
 async get(k){const x=this.items.get(k);return x?{size:x.bytes.length,customMetadata:x.meta,
  arrayBuffer:async()=>x.bytes.slice().buffer,body:new Blob([x.bytes]).stream()}:null}
 async put(k,v,opts){
  if(this.items.has(k)&&opts?.onlyIf?.etagDoesNotMatch==='*')return null;
  const bytes=new Uint8Array(await new Response(v).arrayBuffer());
  if(opts.sha256&&await sha(bytes)!==opts.sha256)throw Error('R2 SHA-256 mismatch');
  this.items.set(k,{bytes,meta:opts.customMetadata});return {size:bytes.length}
 }
 async delete(k){this.items.delete(k)}
}
const {privateMemoryCloudRoutes,privateMediaObjectKey}=runInNewContext(
 source+'\n({privateMemoryCloudRoutes,privateMediaObjectKey})',{
 crypto:webcrypto,Response,Request,Headers,Blob,TransformStream,TextEncoder,TextDecoder,
 Uint8Array,Date,JSON,Set,Number,Object,URL,
 uuidRule,premiumGrantView:async e=>e.rights,
 allowedWrite:req=>req.headers.get('origin')===new URL(req.url).origin,
 rateLimit:async()=>true
});
const env=()=>({PREMIUM_PRIVATE_MEMORY_ENABLED:'true',PREMIUM_PRIVATE_MEMORY_TEST_IDS:id,
 PREMIUM_PRIVATE:new MockR2(),rights:{source:'manual_test',permissions:{cloud_storage:true}}});
const url=(resource,params={})=>{
 const u=new URL('https://test.talera.example/api/me/premium/cloud/'+resource);
 for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);
 return u.toString();
};
const req=(resource,method,body,params={},headers={})=>new Request(url(resource,params),{
 method,headers:{origin:'https://test.talera.example','content-type':'application/json',...headers},
 ...(method==='PUT'?{body:body instanceof Uint8Array?body:JSON.stringify(body)}:{})
});
const route=(request,e,user={id})=>privateMemoryCloudRoutes(request,e,user,new URL(request.url).pathname,request.method,new URL(request.url));
const textMemory={id:'dagboek/voorjaar 🇳🇱',title:'Fictieve tekstherinnering',text:'Hallo!',items:[]};
const payload=(memory,media=[])=>({consent:true,memory,media});
const imageBytes=new TextEncoder().encode('fictieve-foto-geen-echte-persoonsgegevens');
const image={key:'local-qa:0',kind:'photo',name:'qa.jpg',size:imageBytes.length,mime:'image/jpeg'};
const photoMemory={id:'local-qa',title:'Fictieve foto',text:'Opgemaakt',items:[image]};
const file=async()=>({...image,sha256:await sha(imageBytes)});
const mediaReq=async(method,bytes=imageBytes,checksum=null)=>req('media',method,bytes,
 {id:photoMemory.id,key:image.key},{'content-type':'image/jpeg','x-talera-size':String(bytes.length),
 'x-talera-kind':'photo','x-talera-sha256':checksum||await sha(imageBytes)});

test('explicit text memory save and recovery keeps original Unicode local ID',async()=>{
 const e=env();const p=await route(req('memory','PUT',payload(textMemory)),e);
 assert.equal(p.status,201);assert.equal((await p.json()).verified,true);
 const g=await route(req('memory','GET',undefined,{id:textMemory.id}),e);
 const body=await g.json();
 assert.equal(g.status,200);
 assert.equal(body.memory.id,textMemory.id);
 assert.equal(body.memory.text,'Hallo!');
 assert.equal(body.mediaIncluded,false);
});
test('media must be present and verified BEFORE committing memory',async()=>{
 const e=env(),fileEntry=await file();
 assert.equal((await route(req('memory','PUT',payload(photoMemory,[fileEntry])),e)).status,422);
 assert.equal(e.PREMIUM_PRIVATE.items.size,0);
 const up=await route(await mediaReq('PUT'),e);
 assert.equal(up.status,201);assert.equal((await up.json()).verified,true);
 const commit=await route(req('memory','PUT',payload(photoMemory,[fileEntry])),e);
 assert.equal(commit.status,201);
 assert.equal((await commit.json()).mediaIncluded,true);
 const recover=await route(req('memory','GET',undefined,{id:photoMemory.id}),e);
 assert.equal(recover.status,200);assert.equal((await recover.json()).media.length,1);
 const down=await route(await mediaReq('GET'),e);
 assert.equal(down.status,200);assert.equal(await sha(await down.arrayBuffer()),fileEntry.sha256);
});
test('same media retry is idempotent but no overwriting of committed originals',async()=>{
 const e=env(),entry=await file();
 assert.equal((await route(await mediaReq('PUT'),e)).status,201);
 assert.equal((await route(await mediaReq('PUT'),e)).status,200);
 assert.equal((await route(req('memory','PUT',payload(photoMemory,[entry])),e)).status,201);
 assert.equal((await route(req('memory','PUT',payload(photoMemory,[entry])),e)).status,409);
 assert.equal((await route(await mediaReq('PUT'),e)).status,409);
});
test('forged checksum, missing media and foreign accounts never appear restored',async()=>{
 const e=env(),entry=await file();
 const corrupted=new TextEncoder().encode('changed content pretending it is the old original');
 assert.equal((await route(await mediaReq('PUT',corrupted),e)).status,422);
 assert.equal(e.PREMIUM_PRIVATE.items.size,0);
 assert.equal((await route(await mediaReq('GET'),e,{id:outsider})).status,403);
 assert.equal((await route(req('memory','GET',null,{id:textMemory.id}),e,null)).status,401);
 assert.equal((await route(await mediaReq('PUT'),e)).status,201);
 const key=await privateMediaObjectKey(id,photoMemory.id,image.key);
 e.PREMIUM_PRIVATE.items.get(key).meta.sha256='0'.repeat(64);
 assert.equal((await route(req('memory','PUT',payload(photoMemory,[entry])),e)).status,422);
});
test('origin, disabled flag and absent consent fail closed',async()=>{
 const e=env();
 assert.equal((await route(req('memory','PUT',payload(textMemory),{}, {origin:'https://bad.example'}),e)).status,403);
 assert.equal((await route(req('memory','PUT',{memory:textMemory,media:[]}),e)).status,400);
 e.PREMIUM_PRIVATE_MEMORY_ENABLED='false';
 assert.equal((await route(req('memory','GET',null,{id:textMemory.id}),e)).status,404);
 assert.equal(e.PREMIUM_PRIVATE.items.size,0);
});
test('no implicit local IndexedDB writes or Share Media replication',()=>{
 assert.doesNotMatch(source,/indexedDB|SHARE_MEDIA|INSERT INTO|CREATE TABLE/);
 assert.match(source,/etagDoesNotMatch:'\\*'/);
 assert.match(source,/PREMIUM_PRIVATE_MEMORY_ENABLED!=='true'/);
});
