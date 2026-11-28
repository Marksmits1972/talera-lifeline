import test from 'node:test';
import assert from 'node:assert/strict';
import {makePeopleInvite,openPeopleInvite,storedPeopleCommand,peopleLinkApi,expirePeopleInvites,PEOPLE_INVITES,syncAccountEphemeralAlarm} from './f5-people-link.mjs';
const owner='00000000-0000-4000-8000-000000000001',recipient='00000000-0000-4000-8000-000000000002',third='00000000-0000-4000-8000-000000000003',contact='00000000-0000-4000-8000-000000000011';
const secret='synthetic-account-linking-test-never-production'.repeat(2);
const hash='a'.repeat(64),proof='b'.repeat(64),now=1790000000000;
class Store{
 constructor(id){this.rows=new Map([['account',{id,epoch:0,status:'active',display_name:'Synthetic '+id.slice(-1)}]]);this.alarm=null;this.queue=Promise.resolve()}
 transaction(fn){const next=this.queue.then(()=>fn(this));this.queue=next.catch(()=>{});return next}
 async get(k){return structuredClone(this.rows.get(k))}
 async put(k,v){this.rows.set(k,structuredClone(v))}
 async delete(k){this.rows.delete(k)}
 async list({prefix,limit,startAfter}){return new Map([...this.rows.entries()].sort(([a],[b])=>a.localeCompare(b)).filter(([k])=>k.startsWith(prefix)&&(!startAfter||k>startAfter)).slice(0,limit).map(([k,v])=>[k,structuredClone(v)]))}
 async getAlarm(){return this.alarm}
 async setAlarm(x){this.alarm=x}
 async deleteAlarm(){this.alarm=null}
}
test('opaque authenticated invitation: no plaintext account ID, rejects tampering, foreign key and expiry',async()=>{
 const code=await makePeopleInvite(secret,owner,contact,hash,now+1000);
 assert.ok(!code.includes(owner)&&!code.includes(hash));
 assert.deepEqual(await openPeopleInvite(secret,code,now),{owner,contact,token:hash,expires:now+1000});
 const i=code.indexOf('.')+3;
 await assert.rejects(openPeopleInvite(secret,code.slice(0,i)+(code[i]==='A'?'B':'A')+code.slice(i+1),now));
 await assert.rejects(openPeopleInvite(secret+'other',code,now));
 await assert.rejects(openPeopleInvite(secret,code,now+1000));
});
test('no account connection by claim alone; wrong code, duplicate account and replay fail; confirmation idempotent',async()=>{
 const storage=new Store(owner),call=(x,t=now)=>storedPeopleCommand(storage,x,t),make=(c)=>call({action:'create',contact:c,tokenHash:hash,expires:now+1000,epoch:0});
 assert.equal((await make(contact)).ok,true);
 assert.equal((await call({action:'claim',contact,recipient:owner,tokenHash:hash,proof})).ok,false);
 assert.equal((await call({action:'claim',contact,recipient,tokenHash:hash,proof})).ok,true);
 assert.equal((await call({action:'claim',contact,recipient:third,tokenHash:hash,proof})).ok,false);
 assert.deepEqual((await call({action:'list',contacts:[contact],epoch:0})).items,[]);
 assert.equal((await call({action:'confirm',contact,recipient,proof:hash,epoch:0})).ok,false);
 assert.equal((await call({action:'confirm',contact,recipient,proof,epoch:1})).ok,false);
 const confirm={action:'confirm',contact,recipient,proof,epoch:0};
 assert.equal((await call(confirm)).ok,true);assert.equal((await call(confirm)).ok,true);
 assert.deepEqual((await call({action:'list',contacts:[contact],epoch:0})).items,[{contact,account:recipient}]);
 assert.equal(await storage.get(PEOPLE_INVITES),undefined);
 assert.ok(!JSON.stringify([...storage.rows]).includes('Synthetic 2'));
 const second='00000000-0000-4000-8000-000000000012';
 assert.equal((await make(second)).ok,true);assert.equal((await call({action:'claim',contact:second,recipient,tokenHash:hash,proof})).ok,false);
 assert.equal((await call({action:'unlink',contact,epoch:0})).ok,true);
 assert.equal((await call(confirm)).ok,false);
 assert.deepEqual((await call({action:'list',contacts:[contact],epoch:0})).items,[]);
});
test('expiry and retry limits remove only temporary invitation state, account and device transfer stay intact',async()=>{
 const s=new Store(owner),call=(x,t=now)=>storedPeopleCommand(s,x,t);
 const transfer={state:{expires:now+500},nextCreate:now+10};await s.put('f5-transfer-ephemeral-v1',transfer);
 await call({action:'create',contact,tokenHash:hash,expires:now+1000});
 assert.equal(s.alarm,now+500);
 await call({action:'claim',contact,recipient,tokenHash:hash,proof});
 for(let i=0;i<5;i++)assert.equal((await call({action:'confirm',contact,recipient,proof:hash})).ok,false);
 assert.equal((await call({action:'confirm',contact,recipient,proof})).ok,false);
 await call({action:'create',contact,tokenHash:hash,expires:now+1000});
 await s.transaction(txn=>syncAccountEphemeralAlarm(txn,now+500));
 assert.equal(s.alarm,now+1000);
 await expirePeopleInvites(s,now+1000);
 assert.equal(await s.get(PEOPLE_INVITES),undefined);
 assert.deepEqual(await s.get('f5-transfer-ephemeral-v1'),transfer);
 assert.equal((await s.get('account')).id,owner);
 assert.equal(s.alarm,null);
});
test('actual API handler: roles from verified session, expected account guard, forwarding, no imported fields, block and retry',async()=>{
 const stores=new Map([owner,recipient,third].map(id=>[id,new Store(id)]));
 const getHome=id=>({peopleCommand:cmd=>storedPeopleCommand(stores.get(id),cmd),getProfile:async()=>({status:'active',displayName:(await stores.get(id).get('account')).display_name})});
 const request=async(id,data,{method='POST',origin='https://talera.test',expected=id}={})=>{
  const req=new Request('https://talera.test/api/people/link',{method,headers:{origin,'content-type':'application/json','x-talera-expected-account':expected||''},...method==='POST'?{body:JSON.stringify(data)}:{}});
  const res=await peopleLinkApi(req,{AUTH_NAMESPACE_KEY:secret},{getHome,getAccount:async()=>id?{id,epoch:0}:null});
  assert.equal(res.headers.get('cache-control'),'private, no-store');return [res.status,await res.json()];
 };
 const create={action:'create',contact};
 assert.equal((await request(null,create))[0],401);
 assert.equal((await request(owner,create,{expected:third}))[0],409);
 assert.equal((await request(owner,create,{origin:'https://evil.test'}))[0],403);
 assert.equal((await request(owner,create,{method:'GET'}))[0],403);
 assert.equal((await request(owner,{...create,phone:'PRIVATE'}))[0],400);
 const [status,inv]=await request(owner,create);assert.equal(status,200);
 assert.ok(!inv.invitation.includes(owner));assert.ok(!JSON.stringify([...stores.get(owner).rows]).includes(inv.invitation));
 const claim={action:'claim',invitation:inv.invitation};
 assert.equal((await request(owner,claim))[0],409);
 const [r,reply]=await request(recipient,claim);assert.equal(r,200);
 assert.equal((await request(recipient,claim))[1].confirmation,reply.confirmation);
 assert.equal((await request(third,claim))[0],409);
 assert.deepEqual((await request(owner,{action:'list',contacts:[contact]}))[1].linked,[]);
 const confirm={action:'confirm',contact,confirmation:reply.confirmation};
 assert.equal((await request(third,confirm))[0],409);
 assert.equal((await request(recipient,{action:'block',other:owner}))[0],200);
 assert.equal((await request(owner,confirm))[0],409);
 assert.equal((await request(recipient,{action:'unblock',other:owner}))[0],200);
 assert.equal((await request(owner,{...confirm,confirmation:'f'.repeat(32)}))[0],409);
 assert.deepEqual((await request(owner,{...confirm,action:'preview'}))[1],{ok:true,name:'Synthetic 2'});
 assert.deepEqual((await request(owner,{action:'list',contacts:[contact]}))[1].linked,[]);
 assert.equal((await request(owner,confirm))[0],200);
 assert.equal((await request(owner,confirm))[0],200);
 assert.deepEqual((await request(owner,{action:'list',contacts:[contact]}))[1].linked,[contact]);
 assert.deepEqual((await request(third,{action:'list',contacts:[contact]}))[1].linked,[]);
 const inbound=(await request(recipient,{action:'inbound-list',after:null}))[1];
 assert.deepEqual(inbound.items,[{id:owner,name:'Synthetic 1',blocked:false}]);
 assert.equal((await request(third,{action:'block',other:owner}))[0],409);
 assert.equal((await request(owner,{action:'unlink',contact}))[0],200);
 assert.equal((await request(owner,confirm))[0],409);
});
