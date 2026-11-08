// LOCAL ONLY: isolated Cloudflare Durable Object QA with synthetic accounts.
// No connection to TALERA customer accounts or Cloudflare production services.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {passwordHash,shaHex} from './auth-util.mjs';
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const generated=path.join(here,'generated');
mkdirSync(generated,{recursive:true});
const config=JSON.parse(readFileSync(path.join(here,'wrangler.jsonc'),'utf8'));
assert.equal(config.durable_objects.bindings.length,5);
assert.ok(!config.d1_databases);
config.main='../auth-local-only-harness.mjs';
config.vars={AUTH_STORAGE_JURISDICTION:'local-test'};
config.name='talera-auth-qa-local-only';
writeFileSync(path.join(generated,'local.jsonc'),JSON.stringify(config));
const command=path.resolve('node_modules/.bin/wrangler');
const port=8796,origin='http://127.0.0.1:'+port;
let child=null,log='',exited=false;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function start(){
 exited=false;log='';
 child=spawn(command,['dev','--local','--ip','127.0.0.1','--port',String(port),
 '--config',path.join(generated,'local.jsonc'),'--persist-to',path.join(generated,'storage'),
 '--var','AUTH_NAMESPACE_KEY:THIS_IS_A_LOCAL_ONLY_FAKE_TEST_NAMESPACE_KEY_20261108',
 '--var','STAGING_ACCESS_KEY:'+'a'.repeat(64),
 '--log-level','error'],{env:{...process.env,CI:'true',BROWSER:'none',NO_COLOR:'1'},stdio:['ignore','pipe','pipe']});
 for(const stream of [child.stdout,child.stderr])stream.on('data',v=>log=(log+v.toString()).slice(-6000));
 child.on('exit',()=>{exited=true});
}
async function stop(){
 if(exited||!child)return;
 child.kill('SIGTERM');
 await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(3000)]);
}
async function request(method,route,{body,cookie,ip='192.0.2.100',testOnly=false}={}){
 const headers={'accept':'application/json','origin':origin,'cf-connecting-ip':ip,
  'x-talera-staging-key':'a'.repeat(64)};
 if(body)headers['content-type']='application/json';
 if(cookie)headers.cookie=cookie;
 if(testOnly)headers['x-local-qa-only']='LOCAL_TEST_NO_PRODUCTION';
 const res=await fetch(origin+route,{
  method,headers,body:body?JSON.stringify(body):undefined,
  signal:AbortSignal.timeout(15000)
 });
 const data=await res.json();
 return {status:res.status,data,cookie:res.headers.get('set-cookie'),cache:res.headers.get('cache-control')};
}
async function ready(){
 for(let i=0;i<120;i++){
  if(exited)throw Error('Local runtime failed: '+log);
  try{if((await request('GET','/__free-auth/health')).data.ok)return}catch{}
  await delay(400);
 }
 throw Error('Local runtime did not start: '+log);
}
const users=Array.from({length:6},(_,i)=>({
 email:'fake-qa-'+i+'@example.invalid',username:'qa-user-'+i,
 displayName:'Fictional '+i,password:'Only_FAKE_Test_Credentials_'+i
}));
const cookieFrom=res=>{
 assert.match(res.cookie||'',/HttpOnly/);
 const token=/talera_sid=([0-9a-f]{64})/.exec(res.cookie)?.[1];
 assert.ok(token,'Missing session token');
 return 'talera_sid='+token;
};
async function run(){
 start();await ready();
 assert.equal((await request('GET','/api/me')).status,401);
 const created=[];
 for(let i=0;i<users.length;i++){
  const r=await request('POST','/api/register',{body:users[i],ip:'192.0.2.'+(20+i)});
  assert.equal(r.status,200,'Registration '+i+': '+JSON.stringify(r.data));
  created.push({id:r.data.account.id,cookie:cookieFrom(r)});
 }
 assert.equal(new Set(created.map(x=>x.id)).size,6);
 for(let i=0;i<users.length;i++){
  const r=await request('GET','/api/me',{cookie:created[i].cookie});
  assert.equal(r.status,200);
  assert.equal(r.data.account.id,created[i].id);
  assert.equal(r.cache,'private, no-store');
 }
 const sameEmail=await request('POST','/api/register',{
  body:{...users[0],username:'different-username'},ip:'192.0.2.40'
 });
 assert.equal(sameEmail.status,409);
 const sameHandle=await request('POST','/api/register',{
  body:{...users[0],email:'another@example.invalid'},ip:'192.0.2.41'
 });
 assert.equal(sameHandle.status,409);
 const login=await request('POST','/api/login',{body:{
  email:users[0].email,password:users[0].password},ip:'192.0.2.42'});
 assert.equal(login.status,200,'Existing fake account login');
 const secondCookie=cookieFrom(login);
 const profile=await request('POST','/api/profile',{
  body:{displayName:'New fictional name'},cookie:secondCookie,ip:'192.0.2.43'});
 assert.equal(profile.status,200);
 const own=await request('GET','/api/me',{cookie:created[0].cookie});
 assert.equal(own.data.account.displayName,'New fictional name');
 const dob=await request('POST','/__local-qa/birthdate',{testOnly:true,body:{
  email:users[0].email,birthDate:'1976-09-06'
 }});
 assert.equal(dob.status,200);assert.equal(dob.data.accountId,created[0].id);
 assert.equal(dob.data.birthDate,'1976-09-06');
 const logout=await request('POST','/api/logout',{cookie:secondCookie});
 assert.equal(logout.status,200);
 assert.match(logout.cookie,/Max-Age=0/);
 assert.equal((await request('GET','/api/me',{cookie:secondCookie})).status,401);
 assert.equal((await request('GET','/api/me',{cookie:created[0].cookie})).status,200);
 await stop();start();await ready();
 assert.equal((await request('GET','/api/me',{cookie:created[0].cookie})).status,200);
 const after=await request('POST','/__local-qa/birthdate',{testOnly:true,body:{email:users[0].email}});
 assert.equal(after.data.birthDate,'1976-09-06');
 const disabled=await request('POST','/__local-qa/disable',{testOnly:true,body:{email:users[0].email}});
 assert.equal(disabled.status,200);assert.equal(disabled.data.ok,true);
 assert.equal((await request('GET','/api/me',{cookie:created[0].cookie})).status,401);
 assert.equal((await request('GET','/api/me',{cookie:created[1].cookie})).status,200);
 // Synthetic copy of an OLD TALERA account without username, using the
 // original 100,000-iteration SHA-256 PBKDF2 salt and password hash format.
 const legacyToken='b'.repeat(64),legacyId=randomUUID(),legacySalt='a'.repeat(64);
 const legacyPassword='Synthetic_old_passphrase_12345';
 const legacyRecord={
  id:legacyId,email:'legacy-no-handle@example.invalid',
  display_name:'Oud fictief account',public_handle:null,
  password_salt:legacySalt,
  password_hash:await passwordHash(legacyPassword,legacySalt),
  status:'active',created_at:Date.now()-86400000
 };
 const copied=await request('POST','/__local-qa/import-account',{
  testOnly:true,body:legacyRecord
 });
 assert.equal(copied.status,200,'Legacy account import failed: '+JSON.stringify(copied.data));
 assert.equal(copied.data.accountId,legacyId);
 assert.equal(copied.data.legacyHadHandle,false);
 const again=await request('POST','/__local-qa/import-account',{
  testOnly:true,body:legacyRecord
 });
 assert.equal(again.status,200,'Repeat import must be idempotent');
 assert.equal(again.data.imported,false);
 const importedSession=await request('POST','/__local-qa/import-session',{
  testOnly:true,body:{
   id_hash:await shaHex(legacyToken),
   account_id:legacyId,
   expires_at:Date.now()+86400000
  }
 });
 assert.equal(importedSession.status,200,'Old hashed cookie not imported');
 const recognized=await request('GET','/api/me',{
  cookie:'talera_sid='+legacyToken
 });
 assert.equal(recognized.status,200,'Migrated unexpired legacy cookie should work');
 assert.equal(recognized.data.account.id,legacyId);
 assert.equal(recognized.data.account.username,'','Missing historical username must be permitted');
 const oldLogin=await request('POST','/api/login',{
  ip:'192.0.2.55',
  body:{email:legacyRecord.email,password:legacyPassword}
 });
 assert.equal(oldLogin.status,200,'Existing password hash must verify without changing password');
 const expired=await request('POST','/__local-qa/import-session',{
  testOnly:true,body:{
   id_hash:await shaHex('c'.repeat(64)),
   account_id:legacyId,
   expires_at:Date.now()-1000
  }
 });
 assert.equal(expired.status,409,'Expired legacy session must not be imported');
 return {result:'PASS',isolatedAccounts:6,individualAccountDOs:true,
  uniqueEmailAndHandle:true,originalPasswordMethodPreserved:true,
  sessionsSurviveWorkerRestart:true,individualLogoutRevokesOneSession:true,
  disabledAccountRevokesAllSessions:true,credentialsAndBirthdateShareOneAccountHome:true,
  anyRealAccountsReadOrModified:false,anyD1Attached:false,
  legacyMissingUsernameMigrated:true,
  legacySaltAndHashPreserved:true,
  legacyUnexpiredSessionRestoredByHash:true,
  expiredLegacySessionExcluded:true,
  fullTenMillionFreeUsersProven:false};
}
try{
 const result=await run();
 writeFileSync(path.join(generated,'auth-results.json'),JSON.stringify(result,null,2)+'\n');
 console.log('TALERA_FREE_AUTH_LOCAL_RESULT',JSON.stringify(result,null,2));
}catch(e){console.error('LOCAL_AUTH_RUNTIME_ERROR',log.slice(-4500));throw e}
finally{await stop()}
