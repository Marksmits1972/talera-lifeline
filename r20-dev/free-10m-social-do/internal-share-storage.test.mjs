// Real SQLite contract tests of the actual existing social DO class.
// Node substitutes only the Cloudflare runtime base class/alarms; not a live DO.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {registerHooks} from 'node:module';
import {createHash} from 'node:crypto';
import {InternalShareStore} from './internal-share-storage.mjs';
import {internalSendOriginal} from '../free-10m-f5/f5-internal-send.mjs';
import {receiveInternalShare,openReceivedStore} from '../free-10m-f5/f5-internal-receive.mjs';
import {makeReceivedProjection} from '../free-10m-f5/f5-internal-presentation.mjs';
registerHooks({resolve(specifier,context,next){
 if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export class DurableObject%7Bconstructor(ctx,env)%7Bthis.ctx=ctx%3Bthis.env=env%7D%7D',shortCircuit:true};
 return next(specifier,context);
}});
const {FreeSocialMemory}=await import('./social-objects.mjs');
export const owner='00000000-0000-4000-8000-000000000001';
export const recipient='00000000-0000-4000-8000-000000000002';
export const outsider='00000000-0000-4000-8000-000000000003';
const contact='00000000-0000-4000-8000-000000000011',storyId='a'.repeat(64);
const key='b'.repeat(64),guestKey='c'.repeat(64);
const meta={title:'Uniek verhaal',storyText:'  Originele tekst  ',eventDate:'2024-03-19'};
const sha=x=>createHash('sha256').update(x).digest('hex');
export function createStorage(){
 const db=new DatabaseSync(':memory:');
 const storage={alarmAt:null,sql:{exec:(query,...params)=>({toArray:()=>db.prepare(query).all(...params).map(x=>({...x}))})},transactionSync(fn){
  db.exec('BEGIN');try{const r=fn();db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}
 },async setAlarm(n){this.alarmAt=n}};
 // SQLite adapter executes immediately, same as DO sql.exec, even when a
 // write cursor is not consumed.
 storage.sql.exec=(query,...params)=>{const rows=db.prepare(query).all(...params).map(x=>({...x}));return {toArray:()=>rows}};
 return {db,storage};
}
async function setup(){
 const {db,storage}=createStorage(),ctx={storage};
 const memory=new FreeSocialMemory(ctx,{});
 assert.equal((await memory.initialize(storyId,owner)).ok,true);
 return {db,storage,memory,ctx};
}
const targets=[{account:recipient,contact}];
const photo=new Uint8Array([255,216,42,255,217]),audio=new Uint8Array([3,4,5]),video=new Uint8Array([6,7,8]),poster=new Uint8Array([8,7,6]);
const makeDocument=()=>({version:1,items:[{kind:'photo',mediaId:'source:photo:1',mime:'image/jpeg',size:photo.length,parts:1,hashes:[sha(photo)]},
 {kind:'video',mediaId:'source:video:2',mime:'video/mp4',size:video.length,parts:1,hashes:[sha(video)]},
 {kind:'audio',mediaId:'source:audio:3',mime:'audio/mp4',size:audio.length,parts:1,hashes:[sha(audio)]}],posters:[{mediaIndex:1,mime:'image/jpeg',size:poster.length,sha256:sha(poster)}],
 narrationCues:[{t:0,index:0,mediaIndex:0},{t:1200,index:1,mediaIndex:1,videoAtMs:0}],narrationDurationMs:3000,datePrecision:'day',time:'12:00:00'});
async function upload(m){
 for(const [i,mime,bytes] of [[0,'image/jpeg',photo],[1,'video/mp4',video],[2,'audio/mp4',audio]])assert.equal((await m.uploadInternalPart(owner,key,i,0,mime,bytes)).sha256,sha(bytes));
 assert.equal((await m.uploadInternalPoster(owner,key,1,'image/jpeg',poster)).sha256,sha(poster));
}
test('one byte-exact package, 40 account grants, no public/guest or legacy grant, no content before all delivery locators',async()=>{
 const {db,storage,memory:m,ctx}=await setup();
 try{
  const many=Array.from({length:40},(_,i)=>({account:'00000000-0000-4000-8000-'+(100+i).toString(16).padStart(12,'0'),contact:'00000000-0000-4000-8000-'+(500+i).toString(16).padStart(12,'0')}));
  const expires=Date.now()+3600000;
  assert.equal((await m.stageInternalShare(owner,key,meta,many,expires)).state,'draft');
  assert.ok(storage.alarmAt<=expires);
  const same=await m.stageInternalShare(owner,key,meta,[...many].reverse(),expires);assert.equal(same.state,'draft');
  await assert.rejects(m.stageInternalShare(owner,key,{...meta,title:'changed'},many,expires),/CONFLICT/);
  await assert.rejects(m.stageInternalShare(owner,key,meta,[many[0]],expires),/CONFLICT/);
  await assert.rejects(m.uploadInternalPart(outsider,key,0,0,'image/jpeg',photo),/OWNER_REQUIRED/);
  assert.equal(await m.internalShareContent(many[0].account,key),null);
  assert.equal(await m.internalSharePart(many[0].account,key,0,0),null);
  await upload(m);
  const doc=makeDocument();
  assert.equal((await m.sealInternalShare(owner,key,doc)).state,'sealed');
  await assert.rejects(m.uploadInternalPart(owner,key,0,0,'image/jpeg',photo),/UPLOAD_UNAVAILABLE/);
  assert.equal(await m.internalShareContent(many[0].account,key),null);
  await assert.rejects(m.activateInternalShare(owner,key,many.slice(1).map(x=>x.account)),/DELIVERY_INCOMPLETE/);
  const prepared=many.map(x=>x.account);
  assert.equal((await m.activateInternalShare(owner,key,prepared)).recipients,40);
  assert.equal((await m.activateInternalShare(owner,key,prepared)).state,'ready');
  for(const t of many){
   const content=await m.internalShareContent(t.account,key);
   assert.equal(content.storyText,meta.storyText);assert.deepEqual(content.manifest,doc);
   assert.deepEqual((await m.internalSharePart(t.account,key,0,0)).bytes,photo);
  }
  assert.equal(db.prepare('SELECT count(*) n FROM share_media WHERE token_hash=?').get(key).n,4);
  assert.equal(db.prepare('SELECT sum(length(bytes)) n FROM share_media WHERE token_hash=?').get(key).n,photo.length+audio.length+video.length+poster.length);
  assert.equal(db.prepare('SELECT count(*) n FROM shares').get().n,0);
  assert.equal(db.prepare('SELECT count(*) n FROM grants').get().n,0);
  assert.equal(await m.internalShareContent(owner,key),null);
  assert.equal(await m.internalShareContent(outsider,key),null);
  assert.equal(await m.internalSharePart(outsider,key,0,0),null);
  assert.equal(await m.internalSharePoster(outsider,key,1),null);
  assert.equal(await m.shareContent(key),null);
  assert.equal(await m.sharedPart(key,0,0),null);
  assert.equal(await m.sharedPoster(key,1),null);
  assert.equal(await m.browserPreview(key),null);
  assert.deepEqual(await m.browserGate(key,'d'.repeat(64),true),{active:false});
  await assert.rejects(m.guestFeedback(key,{action:'feedback'}),/ACCESS_DENIED/);
  // Restart actual class on same stored state; no ephemeral JS authorization.
  const restored=new FreeSocialMemory(ctx,{});
  assert.deepEqual((await restored.internalShareContent(many[1].account,key)).manifest,doc);
  await restored.revokeInternalShare(owner,key,many[0].account);
  assert.equal(await restored.internalShareContent(many[0].account,key),null);
  assert.ok(await restored.internalShareContent(many[1].account,key));
  assert.equal(db.prepare('SELECT count(*) n FROM share_media WHERE token_hash=?').get(key).n,4);
  await restored.revokeInternalShare(owner,key);
  assert.equal(await restored.internalShareContent(many[1].account,key),null);
  assert.equal(db.prepare('SELECT count(*) n FROM share_media WHERE token_hash=?').get(key).n,0);
  await assert.rejects(restored.activateInternalShare(owner,key,prepared),/NOT_SEALED/);
 }finally{db.close()}
});
test('bad digest, absent chunk, extra uploaded part, missing original ID and attempted overwrite fail closed',async()=>{
 const {db,memory:m}=await setup();
 try{
  await m.stageInternalShare(owner,key,meta,targets,Date.now()+3600000);
  let doc=makeDocument();await assert.rejects(m.sealInternalShare(owner,key,doc),/INCOMPLETE_SHARE_MEDIA/);
  await upload(m);
  doc.items[0].hashes=['0'.repeat(64)];await assert.rejects(m.sealInternalShare(owner,key,doc),/HASH_MISMATCH/);
  doc=makeDocument();doc.items[0].mediaId='';await assert.rejects(m.sealInternalShare(owner,key,doc),/MEDIA_ID_REQUIRED/);
  doc=makeDocument();doc.posters[0].sha256='0'.repeat(64);await assert.rejects(m.sealInternalShare(owner,key,doc),/HASH_MISMATCH/);
  doc=makeDocument();assert.equal((await m.sealInternalShare(owner,key,doc)).state,'sealed');
  await assert.rejects(m.sealInternalShare(owner,key,{...doc,narrationDurationMs:999}),/SHARE_CONFLICT/);
  assert.equal(await m.internalShareContent(recipient,key),null);
  await m.revokeInternalShare(owner,key);
  const second='e'.repeat(64);
  await m.stageInternalShare(owner,second,{...meta,storyText:'tekst'},targets,Date.now()+3600000);
  await m.uploadInternalPart(owner,second,0,0,'image/jpeg',photo);
  await assert.rejects(m.sealInternalShare(owner,second,{version:1,items:[],narrationCues:[],narrationDurationMs:0}),/UNDECLARED_MEDIA/);
 }finally{db.close()}
});
test('internal expiry/cleanup preserves the original guest cycle, guest data and existing grants',async()=>{
 const {db,storage,memory:m}=await setup();
 try{
  const start=Date.now(),expires=start+3600000;
  // Existing guest cycle uses unchanged public claim/preview semantics.
  await m.stageShare(owner,meta);await m.startShare(owner,guestKey,expires);
  await m.saveSharePart(owner,guestKey,0,0,'image/jpeg',photo);
  const guestDoc={version:1,items:[{kind:'photo',mime:'image/jpeg',size:photo.length,parts:1,hashes:[sha(photo)]}],narrationCues:[],narrationDurationMs:0};
  await m.completeShareManifest(owner,guestKey,guestDoc);
  await m.saveShareMedia(owner,guestKey,'photo','image/jpeg',photo,true).then(()=>assert.fail('photo after finalize must be denied'),()=>{});
  const session='f'.repeat(64);
  assert.equal((await m.browserGate(guestKey,null,false)).allowed,false);
  assert.equal((await m.browserGate(guestKey,session,true)).allowed,true);
  assert.deepEqual((await m.sharedPart(guestKey,0,0,session)).bytes,photo);
  assert.equal(await m.sharedPart(guestKey,0,0,'0'.repeat(64)),null);
  await m.grant(owner,outsider);
  // Internal key cannot collide with a guest share.
  await assert.rejects(m.stageInternalShare(owner,guestKey,meta,targets,expires),/SHARE_CONFLICT/);
  const store=new InternalShareStore(storage,()=>start);
  store.stage(owner,key,meta,targets,start+1000);
  await assert.rejects(m.addShare(owner,key,expires),/SHARE_KEY_CONFLICT/);
  await store.upload(owner,key,0,0,'image/jpeg',photo);
  assert.equal(store.nextExpiry(),start+1000);
  const expired=new InternalShareStore(storage,()=>start+1001);
  assert.equal(expired.content(recipient,key),null);expired.cleanup();
  assert.equal(db.prepare('SELECT count(*) n FROM share_media WHERE token_hash=?').get(key).n,0);
  assert.equal(db.prepare('SELECT count(*) n FROM internal_share_packages').get().n,0);
  assert.deepEqual((await m.sharedPart(guestKey,0,0,session)).bytes,photo);
  assert.equal(m.access(outsider,null),true);
  assert.equal((await m.ownerOverview(owner)).shares.length,1);
 }finally{db.close()}
});

// Actual existing account-DO commands + actual gateway controller, backed
// by SQLite per account and per story. Only runtime networking is simulated.
const {FreeAuthAccount}=await import('../free-10m-auth-pilot/auth-objects.mjs');
const {internalShareApi}=await import('../free-10m-f5/f5-internal-share-api.mjs');
const {expirePeopleInvites}=await import('../free-10m-f5/f5-people-link.mjs');
const contact2='00000000-0000-4000-8000-000000000012',reader2='00000000-0000-4000-8000-000000000004';
function accountStorage(){
 const base=createStorage(),{db,storage}=base;
 db.exec('CREATE TABLE test_kv (k TEXT PRIMARY KEY,v TEXT NOT NULL)');
 let queue=Promise.resolve();
 Object.assign(storage,{
  async get(k){const r=db.prepare('SELECT v FROM test_kv WHERE k=?').get(k);return r?JSON.parse(r.v):undefined},
  async put(k,v){db.prepare('INSERT INTO test_kv VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run(k,JSON.stringify(v))},
  async delete(k){db.prepare('DELETE FROM test_kv WHERE k=?').run(k)},
  async list({prefix='',limit=1000,startAfter=''}={}){return new Map(db.prepare('SELECT k,v FROM test_kv WHERE k LIKE ? AND k>? ORDER BY k LIMIT ?').all(prefix+'%',startAfter,limit).map(r=>[r.k,JSON.parse(r.v)]))},
  async getAlarm(){return this.alarmAt},
  async deleteAlarm(){this.alarmAt=null},
  transaction(fn){
   const next=queue.then(async()=>{db.exec('BEGIN');try{const r=await fn(storage);db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}});
   queue=next.catch(()=>{});return next;
  }
 });
 return base;
}
test('actual internal gateway + SQLite account indexes: identity, complete delivery, partial retry, unread, blocking and revoke',async()=>{
 const ids=[owner,recipient,reader2,outsider],accounts=new Map(),memories=new Map(),resources=[];
 for(const id of ids){
  const {db,storage}=accountStorage();resources.push(db);await storage.put('account',{id,epoch:0,status:'active',display_name:'Synthetic '+id.slice(-1)});
  accounts.set(id,{home:new FreeAuthAccount({storage},{}),db,storage});
 }
 const account=id=>accounts.get(id).home;
 const scope=async(a,local)=>sha(a+'|'+local);
 const memory=id=>{
  if(!memories.has(id)){const {db,storage}=createStorage();resources.push(db);memories.set(id,{db,storage,home:new FreeSocialMemory({storage},{})})}
  return memories.get(id).home;
 };
 let inject=false;
 const getHome=id=>{
  const target=account(id);
  if(id===reader2&&inject)return {peopleCommand:cmd=>cmd.action==='internal-index-prepare'?Promise.resolve({ok:false}):target.peopleCommand(cmd)};
  return target;
 };
 const post=async(id,body,opts={})=>{
  const route=opts.path||'/api/internal-share',method=opts.method||'POST';
  const headers={origin:'https://talera.test','content-type':opts.mime||'application/json','x-talera-expected-account':id||'',...opts.headers};
  const req=new Request('https://talera.test'+route,{method,headers,...['GET','HEAD'].includes(method)?{}:{body:opts.raw??JSON.stringify(body)}});
  const res=await internalShareApi(req,{}, {getAccount:async()=>id?{id,epoch:0}:null,getHome,getMemory:memory,scopedStoryId:scope});
  assert.equal(res.headers.get('cache-control'),'private, no-store');
  return {status:res.status,data:opts.binary&&res.ok?new Uint8Array(await res.arrayBuffer()):method==='HEAD'?null:await res.json()};
 };
 async function connect(id,c){
  const expires=Date.now()+3600000,token='e'.repeat(64),proof='f'.repeat(64);
  assert.ok((await account(owner).peopleCommand({action:'create',epoch:0,contact:c,tokenHash:token,expires})).ok);
  assert.ok((await account(owner).peopleCommand({action:'claim',contact:c,recipient:id,tokenHash:token,proof})).ok);
  assert.ok((await account(id).peopleCommand({action:'incoming',other:owner,name:'Synthetic 1',epoch:0})).ok);
  assert.ok((await account(owner).peopleCommand({action:'confirm',epoch:0,contact:c,recipient:id,proof})).ok);
 }
 try{
  await connect(recipient,contact);await connect(reader2,contact2);
  const stage={action:'stage',localMemoryId:'local-story-9999',requestId:'00000000-0000-4000-8000-000000000099',expiresAt:Date.now()+3600000,contacts:[contact,contact2],...meta,consent:true};
  assert.equal((await post(null,stage)).status,401);assert.equal((await post(owner,{...stage,consent:false})).status,400);
  assert.equal((await post(owner,stage,{headers:{origin:'https://evil.test'}})).status,403);
  assert.equal((await post(owner,stage,{headers:{'x-talera-expected-account':recipient}})).status,403);
  assert.equal((await post(owner,{...stage,contacts:[contact,outsider]})).status,409);
  await account(reader2).peopleCommand({action:'block',other:owner,epoch:0});assert.equal((await post(owner,stage)).status,409);
  await account(reader2).peopleCommand({action:'unblock',other:owner,epoch:0});
  assert.equal(memories.size,0,'Invalid selection or missing consent may not create storage');
  assert.equal((await post(owner,{...stage,expiresAt:Date.now()+8*86400000})).status,400);
  const r=await post(owner,stage);assert.equal(r.status,200,JSON.stringify(r.data));const k=r.data.key;
  assert.equal((await post(owner,stage)).data.key,k);
  const sendPath='/api/internal-share/upload/'+k,readPath='/api/internal-share/item/'+k;
  const list=id=>post(id,{action:'list',direction:'in',after:null});
  const out=()=>post(owner,{action:'list',direction:'out',after:null});
  assert.equal((await out()).data.items[0].state,'draft');
  assert.deepEqual((await list(recipient)).data.items,[]);
  const read=(id,path=readPath,binary=false)=>post(id,null,{path,method:'GET',binary});
  assert.equal((await read(recipient)).status,404);
  const doc=makeDocument(),finalize={action:'finalize',key:k,manifest:doc,consent:true};
  assert.equal((await post(owner,finalize)).status,409);
  assert.equal((await post(recipient,null,{path:sendPath+'/media/0/0',mime:'image/jpeg',raw:photo})).status,404);
  for(const [i,mime,bytes] of [[0,'image/jpeg',photo],[1,'video/mp4',video],[2,'audio/mp4',audio]]){
   const uploaded=await post(owner,null,{path:sendPath+'/media/'+i+'/0',mime,raw:bytes});assert.equal(uploaded.status,200);assert.equal(uploaded.data.sha256,sha(bytes));
  }
  assert.equal((await post(owner,null,{path:sendPath+'/poster/1',mime:'image/jpeg',raw:poster})).status,200);
  const corrupt=makeDocument();corrupt.items[1].hashes=['0'.repeat(64)];
  assert.equal((await post(owner,{...finalize,manifest:corrupt})).status,409);
  inject=true;
  const fail=await post(owner,finalize);assert.equal(fail.status,409);assert.equal(fail.data.reason,'delivery_incomplete');inject=false;
  assert.equal((await out()).data.items[0].state,'sealed');
  assert.deepEqual((await list(recipient)).data.items,[],'Prepared locator of partial delivery must be invisible');
  assert.equal((await read(recipient)).status,404);
  assert.equal((await post(recipient,{action:'seen',key:k})).status,404);
  assert.equal((await post(owner,finalize)).data.state,'ready');assert.equal((await post(owner,finalize)).data.state,'ready');
  const readback=await read(recipient);assert.equal(readback.status,200);assert.deepEqual(readback.data.content.manifest,doc);
  assert.deepEqual((await read(recipient,readPath+'/media/0/0',true)).data,photo);
  assert.deepEqual((await read(reader2,readPath+'/poster/1',true)).data,poster);
  assert.equal((await read(outsider)).status,404);assert.equal((await read(outsider,readPath+'/media/0/0',true)).status,404);
  assert.equal((await read(null)).status,401);
  assert.equal((await list(recipient)).data.items[0].unread,true,'GET by itself must not mark as seen');
  assert.equal((await post(recipient,{action:'seen',key:k})).status,200);assert.equal((await post(recipient,{action:'seen',key:k})).status,200);
  assert.equal((await list(recipient)).data.items[0].unread,false);
  assert.equal((await list(reader2)).data.items[0].unread,true);
  const sent=(await out()).data.items[0];assert.equal(sent.state,'ready');assert.ok(!Object.hasOwn(sent,'unread')&&!JSON.stringify(sent).includes('seen'));
  await account(recipient).peopleCommand({action:'block',other:owner,epoch:0});
  assert.equal((await read(recipient)).status,404);assert.equal((await read(recipient,readPath+'/media/0/0',true)).status,404);assert.deepEqual((await list(recipient)).data.items,[]);
  await account(recipient).peopleCommand({action:'unblock',other:owner,epoch:0});
  assert.equal((await read(recipient)).status,200);
  const ack={action:'received',key:k,manifestHash:readback.data.content.manifestHash};
  assert.equal((await post(outsider,ack)).status,404);
  assert.equal((await post(recipient,{...ack,manifestHash:'0'.repeat(64)})).status,404);
  assert.equal((await post(recipient,ack,{headers:{'x-talera-expected-account':reader2}})).status,403);
  assert.equal((await post(recipient,ack)).status,200);
  assert.equal((await post(recipient,ack)).status,200);
  assert.equal((await read(recipient)).status,404,'Delivered recipients cannot fetch server bytes again');
  assert.deepEqual((await list(recipient)).data.items,[]);
  assert.equal((await post(outsider,{action:'revoke',key:k,contact:null})).status,404);
  assert.equal((await post(owner,{action:'revoke',key:k,contact})).status,200);
  assert.equal((await read(recipient)).status,404);assert.equal((await read(reader2)).status,200);
  const store=[...memories.values()][0];
  assert.equal(store.db.prepare('SELECT count(*) n FROM share_media').get().n,4);
  assert.equal((await post(owner,{action:'revoke',key:k,contact:null})).status,200);
  assert.equal((await read(reader2)).status,404);assert.equal(store.db.prepare('SELECT count(*) n FROM share_media').get().n,0);
  const recipientDb=accounts.get(recipient);
  assert.equal(recipientDb.db.prepare("SELECT count(*) n FROM f5_internal_index WHERE direction='in'").get().n,1);
  await expirePeopleInvites(recipientDb.storage,stage.expiresAt+1);
  assert.equal(recipientDb.db.prepare('SELECT count(*) n FROM f5_internal_index').get().n,0);
  assert.equal((await recipientDb.storage.get('account')).id,recipient);
  // Complete the actual browser sender -> gateway -> account-scoped receiving
  // store -> original presentation projection with two intended recipients.
  const fake=await import('fake-indexeddb').catch(()=>null);
  const localDb=fake?new fake.IDBFactory():null;
  const localStores=new Map();
  function inMemoryStore(){
   let record;const parts=new Map();
   return {get:async()=>structuredClone(record),stage:async r=>structuredClone(record??={...r,state:'partial',receiptPending:true,unread:true}),
    getPart:async(k,id)=>parts.get(id)?.slice(),putPart:async(k,id,b)=>parts.set(id,b.slice()),markReady:async()=>{record.state='ready'},
    confirmReceipt:async()=>{record.receiptPending=false},markSeen:async()=>{record.unread=false},close(){}};
  }
  const row={id:'local-full-cycle-9999',title:'Hele cyclus',text:'Originele tekst',date:'2024-03-19',datePrecision:'exact',time:'12:00:00',
   items:doc.items.map(x=>({key:x.mediaId,kind:x.kind,mime:x.mime})),
   narrationCues:[{t:0,index:0,mediaId:doc.items[0].mediaId},{t:1200,index:1,mediaId:doc.items[1].mediaId,videoAtMs:0}],narrationDurationMs:3000};
  const blobs=new Map([[row.items[0].key,new Blob([photo],{type:'image/jpeg'})],[row.items[1].key,new Blob([video],{type:'video/mp4'})],
   [row.items[2].key,new Blob([audio],{type:'audio/mp4'})],[row.items[1].key+':phone-v1',new Blob([poster],{type:'image/jpeg'})]]);
  const options={memory:{_taleraLocal:true,storyId:row.id},library:{get:async id=>id===row.id?row:null,blob:async id=>blobs.get(id)},contacts:[contact,contact2],
   requestId:'00000000-0000-4000-8000-000000000077',expiresAt:Date.now()+3600000,mimeFor:async(item,blob)=>blob.type,
   post:async body=>(await post(owner,body)).data,
   upload:async(key,path,blob)=>(await post(owner,null,{path:'/api/internal-share/upload/'+key+path,mime:blob.type,raw:new Uint8Array(await blob.arrayBuffer())})).data};
  const delivered=await internalSendOriginal(options);assert.equal(delivered.state,'ready');
  for(const target of [recipient,reader2]){
   const entry=(await list(target)).data.items.find(x=>x.key===delivered.key);assert.ok(entry);
   const db=localDb?await openReceivedStore(target,{indexedDB:localDb}):inMemoryStore();localStores.set(target,db);
   const received=await receiveInternalShare({...entry,senderName:'Synthetic 1'},{store:db,
    fetchContent:async key=>(await read(target,'/api/internal-share/item/'+key)).data.content,
    fetchPart:async(key,part)=>(await read(target,'/api/internal-share/item/'+key+part.path,true)).data,
    acknowledge:async(key,manifestHash)=>(await post(target,{action:'received',key,manifestHash})).data});
   assert.equal(received.state,'ready');assert.equal(received.unread,true);assert.equal(received.receiptPending,false);
   const count=[...memories.values()].reduce((n,m)=>n+m.db.prepare('SELECT count(*) n FROM share_media').get().n,0);
   assert.equal(count,target===recipient?4:0);
  }
  const repeat=await internalSendOriginal(options);assert.equal(repeat.state,'delivered');
  for(const [target,db] of localStores){
   const projection=await makeReceivedProjection(delivered.key,db);
   const records=await projection.library.list();assert.equal(records.length,1);
   assert.deepEqual(records[0].items.map(x=>x.key),row.items.map(x=>x.key));
   assert.deepEqual(records[0].narrationCues,row.narrationCues);
   for(const [id,expected] of blobs)assert.deepEqual(await (await projection.library.blob(id)).arrayBuffer(),await expected.arrayBuffer());
   assert.equal((await db.get(delivered.key)).unread,true);
   await projection.markSeen();assert.equal((await db.get(delivered.key)).unread,false);projection.dispose();
  }

 }finally{for(const db of resources)db.close()}
});

test('seven-day maximum, no deletion on GET, immediate atomic byte cleanup only after all receipts, idempotent receipt after restart',async()=>{
 const {db,storage,memory:m,ctx}=await setup();
 try{
  const many=[{account:recipient,contact},{account:reader2,contact:contact2}];
  await assert.rejects(m.stageInternalShare(owner,key,meta,many,Date.now()+8*86400000),/INVALID_INTERNAL_EXPIRY/);
  const end=Date.now()+7*86400000;
  await m.stageInternalShare(owner,key,meta,many,end);
  await upload(m);const doc=makeDocument();
  await m.sealInternalShare(owner,key,doc);await m.activateInternalShare(owner,key,many.map(x=>x.account));
  const c=await m.internalShareContent(recipient,key);
  const hash=c.manifestHash;assert.equal(hash,sha(JSON.stringify(doc)));
  await m.internalSharePart(recipient,key,0,0);
  assert.equal(db.prepare('SELECT count(*) n FROM share_media').get().n,4);
  assert.equal((await m.receiveInternalShare(outsider,key,hash)).ok,false);
  assert.equal((await m.receiveInternalShare(recipient,key,'0'.repeat(64))).ok,false);
  assert.equal((await m.receiveInternalShare(recipient,key,hash)).ok,true);
  assert.equal(await m.internalShareContent(recipient,key),null);
  assert.equal(db.prepare('SELECT count(*) n FROM share_media').get().n,4);
  assert.ok(await m.internalShareContent(reader2,key));
  const restored=new FreeSocialMemory(ctx,{});
  assert.equal((await restored.receiveInternalShare(reader2,key,hash)).ok,true);
  for(const table of ['share_media','share_snapshot','share_manifest','internal_share_digests'])
   assert.equal(db.prepare('SELECT count(*) n FROM '+table).get().n,0,table);
  assert.equal((await restored.receiveInternalShare(reader2,key,hash)).ok,true);
  assert.equal((await restored.receiveInternalShare(recipient,key,hash)).ok,true);
  assert.equal((await restored.internalOwnerSummary(owner,key)).state,'delivered');
  assert.equal((await restored.sealInternalShare(owner,key,doc)).state,'delivered');
  assert.equal(await restored.internalShareContent(reader2,key),null);
  assert.equal(db.prepare('SELECT count(*) n FROM internal_share_deliveries').get().n,2);
  const expired=new InternalShareStore(storage,()=>end+1);expired.cleanup();
  for(const table of ['internal_share_deliveries','internal_share_recipients','internal_share_packages'])
   assert.equal(db.prepare('SELECT count(*) n FROM '+table).get().n,0,table);
 }finally{db.close()}
});
