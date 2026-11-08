import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectLegacySnapshot} from './legacy-migration-preflight.mjs';
import {shaHex,passwordHash,validEmail} from './auth-util.mjs';
const now=Date.UTC(2026,10,8);
const accountId=i=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0');
const fakeAccounts=()=>Array.from({length:6},(_,i)=>({
 id:accountId(i),email:'synthetic-'+i+'@example.invalid',
 display_name:'Fake '+i,public_handle:'fake-'+i,
 password_salt:'a'.repeat(64),password_hash:'b'.repeat(64),
 created_at:now-100000,status:i===5?'disabled':'active',
 discoverable:i%2
}));
const fakeSessions=()=>Array.from({length:23},(_,i)=>({
 id_hash:i.toString(16).padStart(64,'0'),
 account_id:accountId(i%6),
 expires_at:now+(i<18?3600000:-3600000),
 created_at:now-7200000
}));
test('Existing observed legacy schema shape: 6 synthetic accounts, 23 sessions, 0 DOB',()=>{
 const result=inspectLegacySnapshot({accounts:fakeAccounts(),sessions:fakeSessions(),now});
 assert.equal(result.acceptable,true,JSON.stringify(result.issueCodes));
 assert.deepEqual(result.counts,{accounts:6,activeAccounts:5,disabledAccounts:1,
  sessions:23,unexpiredSessions:18,expiredSessions:5,birthdates:0});
 assert.equal(result.oldD1MutationPerformed,false);
 assert.equal(result.rawTokensRequired,false);
});
test('Account migration cannot erase session/account isolation or expose identity fields',()=>{
 const accounts=fakeAccounts(),sessions=fakeSessions();
 const res=inspectLegacySnapshot({accounts,sessions,now});
 const safe=JSON.stringify(res);
 assert.ok(!safe.includes(accounts[0].email));
 assert.ok(!safe.includes(accounts[0].id));
 assert.ok(!safe.includes(sessions[0].id_hash));
 assert.ok(!safe.includes(accounts[0].password_hash));
 assert.ok(!safe.includes(accounts[0].password_salt));
 const badSessions=structuredClone(sessions);
 badSessions[0].account_id=accountId(999);
 const error=inspectLegacySnapshot({accounts,sessions:badSessions,now});
 assert.equal(error.acceptable,false);
 assert.ok(error.issueCodes.some(e=>e.code==='MISSING_ACCOUNT_FOR_SESSION'));
});
test('Refuse malformed stored password hashes, duplicate normalized email, handles or sessions',()=>{
 const accounts=fakeAccounts(),sessions=fakeSessions();
 accounts[1].email=accounts[0].email.toUpperCase();
 accounts[2].public_handle=accounts[0].public_handle;
 accounts[3].password_hash='bad';
 sessions[1].id_hash=sessions[0].id_hash;
 const bad=inspectLegacySnapshot({accounts,sessions,now});
 for(const code of ['DUPLICATE_EMAIL','DUPLICATE_HANDLE','PASSWORD_HASH_LAYOUT','DUPLICATE_SESSION_HASH'])
  assert.ok(bad.issueCodes.some(e=>e.code===code),code);
});
test('Legacy SHA-256 token hash can address new DO session without revealing token',async()=>{
 const token='7'.repeat(64);
 const hashed=await shaHex(token);
 assert.match(hashed,/^[0-9a-f]{64}$/);
 assert.notEqual(hashed,token);
 const salt='3'.repeat(64);
 assert.equal(await passwordHash('fake-correct-password',salt),await passwordHash('fake-correct-password',salt));
 assert.equal(validEmail(' SYnTHETIC@example.invalid '),'synthetic@example.invalid');
});
test('Missing dates and orphan birthdates block migration before any write',()=>{
 const accounts=fakeAccounts(),sessions=fakeSessions();
 const invalid=inspectLegacySnapshot({accounts,sessions,birthdates:[
  {account_id:accounts[0].id,birth_date:'2025-02-29'},
  {account_id:accountId(999),birth_date:'2000-02-29'}
 ],now});
 assert.equal(invalid.acceptable,false);
 for(const code of ['ORPHAN_BIRTHDATE','INVALID_BIRTH_DATE'])
  assert.ok(invalid.issueCodes.some(e=>e.code===code));
});
