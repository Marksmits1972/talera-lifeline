import test from 'node:test';
import assert from 'node:assert/strict';
import {validatedAccountId,validatedDate,accountHome,getAccountBirthDate,putAccountBirthDate} from './free-account-router.mjs';

test('Account IDs address their own object directly, without a central mapping database',async()=>{
 const calls=[];
 const values=new Map();
 const env={FREE_ACCOUNT:{
  idFromName:name=>{calls.push({kind:'lookup',name});return name;},
  get:name=>({
   getBirthDate:async()=>values.get(name)||null,
   setBirthDate:async value=>{values.set(name,value);return {saved:true,birthDate:value}}
  })
 }};
 assert.equal(await getAccountBirthDate(env,'demo-one'),null);
 await putAccountBirthDate(env,'demo-one','1976-09-06');
 await putAccountBirthDate(env,'demo-two','2000-02-29');
 assert.equal(await getAccountBirthDate(env,'demo-one'),'1976-09-06');
 assert.equal(await getAccountBirthDate(env,'demo-two'),'2000-02-29');
 assert.equal(values.size,2);
 assert.ok(calls.every(x=>x.name.startsWith('talera-free-account-v1:')));
 assert.ok(calls.filter(x=>x.name.endsWith('demo-one')).length===3);
});
test('Account identifiers fail closed, avoiding malformed routing and namespace collisions',()=>{
 for(const id of ['',null,undefined,'../../x','account:test','a/b',' space','ÀÉÎ']){
  assert.throws(()=>validatedAccountId(id));
 }
 for(const id of ['123','abc_789-XYZ','0'])assert.equal(validatedAccountId(id),id);
 assert.throws(()=>accountHome({},'demo-one'),/BINDING_MISSING/);
});
test('Strict birth dates: leap years, calendar bounds and future dates',()=>{
 for(const date of ['2000-02-29','1976-09-06','2010-05-14'])assert.equal(validatedDate(date),date);
 for(const date of ['1900-02-29','2025-02-29','1888-01-01','abc','2050-01-01','2000-00-01'])
  assert.throws(()=>validatedDate(date));
});
test('One million synthetic account names route deterministically with no per-user registry',()=>{
 const sample=new Set();
 let seen=0;
 const env={FREE_ACCOUNT:{
  idFromName:name=>{seen++;return name},
  get:name=>({id:name})
 }};
 for(let i=0;i<1_000_000;i++){
  const id='demo-account-'+String(i).padStart(7,'0');
  const stub=accountHome(env,id);
  if(i<1_000||i===999_999)sample.add(stub.id);
  assert.equal(stub.id,'talera-free-account-v1:'+id);
 }
 assert.equal(seen,1_000_000);
 assert.equal(sample.size,1_001);
 // No storage writes or Cloudflare actor creations took place in this test.
});
