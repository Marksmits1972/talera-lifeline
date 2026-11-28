import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openReceivedStore,receiveInternalShare,receivedTransport} from './f5-internal-receive.mjs';
const account='00000000-0000-4000-8000-000000000001',sender='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
const key='a'.repeat(64),sha=b=>createHash('sha256').update(b).digest('hex');
const photo=Uint8Array.from([255,216,42,255,217]),audio=Uint8Array.from([1,2,3]),video=Uint8Array.from([4,5,6]),poster=Uint8Array.from([6,7,8]);
const create=()=>{
 const manifest={version:1,items:[{kind:'photo',mediaId:'original:1',mime:'image/jpeg',size:photo.length,parts:1,hashes:[sha(photo)]},{kind:'video',mediaId:'original:2',mime:'video/mp4',size:video.length,parts:1,hashes:[sha(video)]},{kind:'audio',mediaId:'original:3',mime:'audio/mp4',size:audio.length,parts:1,hashes:[sha(audio)]}],posters:[{mediaIndex:1,mime:'image/jpeg',size:poster.length,sha256:sha(poster)}],narrationCues:[{t:0,index:0,mediaIndex:0}],narrationDurationMs:3000};
 const content={title:'Herinnering',storyText:'Verhaal met stem',eventDate:'2024-01-02',manifest,manifestHash:sha(JSON.stringify(manifest))};
 const data={'asset-0-0':photo,'asset-1-0':video,'asset-2-0':audio,'poster-1':poster};
 const entry={key,sender,createdAt:100,expiresAt:100+7*86400000};
 let acknowledgements=0,downloads=0;
 return {content,data,entry,get acknowledgements(){return acknowledgements},get downloads(){return downloads},
   transport:{now:()=>200,fetchContent:async()=>structuredClone(content),fetchPart:async(k,p)=>{assert.equal(k,key);downloads++;return data[p.id].slice()},acknowledge:async(k,h)=>{assert.equal(k,key);assert.equal(h,content.manifestHash);acknowledgements++;return {received:true}}}};
};
// Pure contract adapter; the actual IndexedDB implementation is also tested
// below when a local IndexedDB implementation is present. Browser acceptance
// remains a distinct test gate.
function memoryStore(){
 let meta;const parts=new Map();
 return {get:async()=>structuredClone(meta),stage:async record=>structuredClone(meta??= {...record,state:'partial',unread:true,receiptPending:true}),getPart:async(k,id)=>parts.get(id)?.slice(),putPart:async(k,id,b)=>{parts.set(id,b.slice())},markReady:async()=>{meta.state='ready'},confirmReceipt:async()=>{meta.receiptPending=false},markSeen:async()=>{meta.unread=false}};
}
test('verified local commit and readback before receipt; no redownload or mark seen on delivery',async()=>{
 const f=create(),s=memoryStore(),ack=f.transport.acknowledge;
 const r=await receiveInternalShare(f.entry,{...f.transport,store:s,acknowledge:async(k,h)=>{
  assert.equal((await s.get()).state,'ready');
  for(const [id,b] of Object.entries(f.data))assert.deepEqual(await s.getPart(key,id),b);
  return ack(k,h);
 }});
 assert.equal(r.unread,true);assert.equal(r.receiptPending,false);assert.equal(f.acknowledgements,1);
 assert.equal((await receiveInternalShare(f.entry,{...f.transport,store:s})).state,'ready');
 assert.equal(f.downloads,4);assert.equal(f.acknowledgements,1);
});
test('partial connection failure resumes only missing parts, never falsely acknowledges',async()=>{
 const f=create(),s=memoryStore(),fetchPart=f.transport.fetchPart;
 await assert.rejects(receiveInternalShare(f.entry,{...f.transport,store:s,fetchPart:async(k,p)=>{if(p.id==='asset-1-0')throw Error('NETWORK_DOWN');return fetchPart(k,p)}}),/NETWORK_DOWN/);
 assert.equal(f.acknowledgements,0);assert.equal((await s.get()).state,'partial');
 assert.deepEqual(await s.getPart(key,'asset-0-0'),photo);
 await receiveInternalShare(f.entry,{...f.transport,store:s});assert.equal(f.downloads,4);assert.equal(f.acknowledgements,1);
});
test('wrong bytes, wrong manifest, failed durable write and failed readback never acknowledge',async()=>{
 for(const mode of ['hash','manifest','quota','readback']){
  const f=create(),s=memoryStore(),t={...f.transport};
  if(mode==='hash')t.fetchPart=async()=>Uint8Array.from([0,0,0,0,0]);
  if(mode==='manifest')t.fetchContent=async()=>({...f.content,manifestHash:'0'.repeat(64)});
  if(mode==='quota')s.putPart=async()=>{throw new DOMException('full','QuotaExceededError')};
  if(mode==='readback')s.getPart=async()=>undefined;
  await assert.rejects(receiveInternalShare(f.entry,{...t,store:s}));
  assert.equal(f.acknowledgements,0);
  assert.notEqual((await s.get())?.state,'ready');
 }
});
test('lost receipt response preserves local package; retry sends no media; account switch never acknowledges',async()=>{
 const f=create(),s=memoryStore();
 const r=await receiveInternalShare(f.entry,{...f.transport,store:s,acknowledge:async()=>{throw Error('NETWORK_DOWN')}});
 assert.equal(r.state,'ready');assert.equal(r.receiptPending,true);
 assert.equal((await receiveInternalShare(f.entry,{...f.transport,store:s})).receiptPending,false);assert.equal(f.downloads,4);
 const g=create(),fresh=memoryStore();let current=true;
 await assert.rejects(receiveInternalShare(g.entry,{...g.transport,store:fresh,isCurrent:()=>current,fetchPart:async(k,p)=>{current=false;return g.transport.fetchPart(k,p)}}),/ACCOUNT_CHANGED/);
 assert.equal(g.acknowledgements,0);
});
test('expiry refuses incomplete delivery, already committed local copy remains accessible without network',async()=>{
 const f=create(),s=memoryStore();
 await assert.rejects(receiveInternalShare(f.entry,{...f.transport,store:s,now:()=>f.entry.expiresAt}),/EXPIRED/);
 await receiveInternalShare(f.entry,{...f.transport,store:s});
 const local=await receiveInternalShare(f.entry,{...f.transport,store:s,now:()=>f.entry.expiresAt+1000,fetchContent:async()=>assert.fail('server read'),fetchPart:async()=>assert.fail('server read')});
 assert.equal(local.state,'ready');assert.equal(f.downloads,4);
});
test('transport uses expected account guard and private same-origin requests',async()=>{
 const f=create(),calls=[];
 const t=receivedTransport(account,{fetch:async(path,opts)=>{calls.push([path,opts]);if(path.endsWith('/media/0/0'))return new Response(photo,{headers:{'content-type':'image/jpeg','content-length':photo.length}});return Response.json(path.includes('/item/')?{ok:true,content:f.content}:{ok:true,received:true})}});
 assert.equal((await t.fetchContent(key)).manifestHash,f.content.manifestHash);
 assert.deepEqual(await t.fetchPart(key,{path:'/media/0/0',size:photo.length,mime:'image/jpeg'}),photo);
 await t.acknowledge(key,f.content.manifestHash);
 for(const [,opts] of calls){assert.equal(opts.cache,'no-store');assert.equal(opts.credentials,'same-origin');assert.equal(opts.headers['x-talera-expected-account'],account)}
});
// This optional dependency is available in the current local test workspace;
// the preceding tests remain dependency-free in the normal repository.
const fake=await import('fake-indexeddb').catch(()=>null);
test('IndexedDB transaction completion, browser-style reopen, account isolation, unread local state',{skip:!fake},async()=>{
 const f=create();
 const idb=new fake.IDBFactory();
 let s=await openReceivedStore(account,{indexedDB:idb});
 try{
  const ready=await receiveInternalShare(f.entry,{...f.transport,store:s});
  assert.equal(ready.receiptPending,false);assert.equal(ready.unread,true);assert.equal((await s.list()).length,1);
 }finally{s.close()}
 s=await openReceivedStore(account,{indexedDB:idb});
 try{
  const ready=await receiveInternalShare(f.entry,{...f.transport,store:s,fetchContent:async()=>assert.fail('not local'),fetchPart:async()=>assert.fail('not local')});
  for(const [id,b] of Object.entries(f.data))assert.deepEqual(await s.getPart(key,id),b);
  assert.equal(ready.unread,true);
  await s.markSeen(key);assert.equal((await s.list())[0].unread,false);
  const isolated=await openReceivedStore(other,{indexedDB:idb});try{assert.deepEqual(await isolated.list(),[]);assert.equal(await isolated.get(key),undefined)}finally{isolated.close()}
 }finally{s.close()}
});
