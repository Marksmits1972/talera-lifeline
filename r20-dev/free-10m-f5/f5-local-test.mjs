// F5 real local Cloudflare runtime: bounded synthetic end-to-end integration.
// No live TALERA database, account, media, service or production deployment.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const generated=path.join(here,'generated');
mkdirSync(generated,{recursive:true});
const executable=path.resolve('node_modules/.bin/wrangler');
const port=8799,origin='http://127.0.0.1:'+port;
const f5='1'.repeat(64),auth='2'.repeat(64),social='3'.repeat(64);
const authNamespace='SYNTHETIC_F5_AUTH_NAMESPACE_NOT_PRODUCTION_20261108';
const signatureSecret='SYNTHETIC_F5_SOCIAL_IDENTITY_NOT_PRODUCTION_20261108';
const users=[
 {email:'f5-owner@example.invalid',username:'f5-owner',displayName:'F5 fictieve eigenaar',password:'Fake_Test_Password_1001',birthDate:'1976-09-06'},
 {email:'f5-reader@example.invalid',username:'f5-reader',displayName:'F5 fictieve lezer',password:'Fake_Test_Password_1002',birthDate:'1980-01-03'},
 {email:'f5-other@example.invalid',username:'f5-other',displayName:'F5 fictieve derde',password:'Fake_Test_Password_1003',birthDate:'1995-12-31'}
];
let proc=null,exited=false,logs='',calls=0;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function start(){
  exited=false;logs='';
  proc=spawn(executable,[
    'dev','--local','--ip','127.0.0.1','--port',String(port),
    '--config',path.join(here,'wrangler.jsonc'),
    '--persist-to',path.join(generated,'durable'),
    '--var','STAGING_F5_KEY:'+f5,
    '--var','STAGING_ACCESS_KEY:'+auth,
    '--var','STAGING_SOCIAL_KEY:'+social,
    '--var','AUTH_NAMESPACE_KEY:'+authNamespace,
    '--var','DEMO_IDENTITY_KEY:'+signatureSecret,
    '--log-level','error'
  ],{env:{...process.env,CI:'true',BROWSER:'none',NO_COLOR:'1'},stdio:['ignore','pipe','pipe']});
  proc.on('exit',()=>{exited=true});
  for(const stream of [proc.stdout,proc.stderr])
    stream.on('data',v=>logs=(logs+v.toString()).slice(-7500));
}
async function stop(){
  if(!proc||exited)return;
  proc.kill('SIGTERM');
  await Promise.race([new Promise(r=>proc.once('exit',r)),pause(4000)]);
}
async function request(method,route,{body,cookie,ip='192.0.2.11',gate=true,extra={}}={}){
  calls++;
  const headers={origin,'cf-connecting-ip':ip,accept:'application/json',...extra};
  if(gate)headers['x-talera-f5-key']=f5;
  if(cookie)headers.cookie=cookie;
  if(body)headers['content-type']='application/json';
  const response=await fetch(origin+route,{method,headers,
    body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(17000)});
  let data;
  const raw=await response.text();
  try{data=JSON.parse(raw)}catch{data=raw}
  return {status:response.status,data,cookie:response.headers.get('set-cookie'),
    cache:response.headers.get('cache-control'),stage:response.headers.get('x-talera-free-f5')};
}
async function ready(){
  for(let i=0;i<120;i++){
    if(exited)throw Error('F5 Cloudflare runtime exited: '+logs);
    try{
      const health=await request('GET','/__f5/health',{gate:false});
      if(health.status===200&&health.data.syntheticOnly)return;
    }catch{}
    await pause(350);
  }
  throw Error('F5 runtime not ready: '+logs);
}
function cookieOf(r){
  assert.match(r.cookie||'',/HttpOnly; Secure/);
  const match=/talera_sid=([a-f0-9]{64})/.exec(r.cookie);
  assert.ok(match,'Session cookie expected');
  return 'talera_sid='+match[1];
}
const storyId='f5-synthetic-memory-001';
const route=op=>'/__social/memory/'+storyId+'/'+op;
async function run(){
  start();await ready();
  const noGate=await request('GET','/mijn-leven',{gate:false});
  assert.equal(noGate.status,403,'No public staging HTML without F5 gate');
  assert.equal((await request('GET','/api/me',{gate:false})).status,403);
  const shell=await request('GET','/mijn-leven');
  assert.equal(shell.status,200,'Real approved anonymous shell served locally');
  assert.equal(shell.stage,'anonymous-snapshot-only');
  assert.equal(shell.cache,'private, no-store');
  assert.ok(String(shell.data).length>10000,'Real copied TALERA anonymous HTML expected');
  const identities=[];
  for(let i=0;i<users.length;i++){
    const r=await request('POST','/api/register',{
      body:users[i],ip:'192.0.2.'+(11+i)});
    assert.equal(r.status,200,'Synthetic register '+i);
    assert.equal(r.data.account.birthDate,users[i].birthDate);
    identities.push({id:r.data.account.id,cookie:cookieOf(r)});
  }
  assert.equal(new Set(identities.map(x=>x.id)).size,3);
  assert.equal((await request('GET','/mijn-leven',{cookie:identities[0].cookie})).status,503,
    'Never show anonymous timeline to a signed-in user');
  for(let i=0;i<3;i++){
    const res=await request('GET','/api/me',{cookie:identities[i].cookie});
    assert.equal(res.status,200);
    assert.equal(res.data.account.id,identities[i].id);
    assert.equal(res.data.account.birthDate,users[i].birthDate);
  }
  const changed=await request('POST','/api/profile/birthdate',{
    cookie:identities[0].cookie,body:{birthDate:'1976-09-07'}});
  assert.equal(changed.status,200);
  assert.equal((await request('GET','/api/me',{cookie:identities[0].cookie}))
    .data.account.birthDate,'1976-09-07');
  assert.equal((await request('POST','/api/profile/birthdate',{
    body:{birthDate:'1982-02-02'}})).status,401);
  assert.equal((await request('POST','/api/profile/birthdate',{
    cookie:identities[0].cookie,body:{birthDate:'2026-02-30'}})).status,400);
  const made=await request('POST',route('init'),{cookie:identities[0].cookie});
  assert.equal(made.status,200,'Real auth session identifies social owner');
  assert.equal((await request('GET',route('view'),{
    cookie:identities[1].cookie})).status,403);
  assert.equal((await request('POST',route('init'),{
    cookie:identities[1].cookie,
    extra:{'x-qa-account':identities[0].id,'x-qa-signature':'0'.repeat(64)}
  })).status,409,'Spoofed account identity must not work');
  const grant=await request('POST',route('grant'),{
    cookie:identities[0].cookie,body:{recipientId:identities[1].id}});
  assert.equal(grant.status,200);
  assert.equal((await request('GET',route('view'),{
    cookie:identities[1].cookie})).status,200);
  assert.equal((await request('POST',route('like'),{
    cookie:identities[1].cookie})).status,200);
  assert.equal((await request('POST',route('comment'),{
    cookie:identities[1].cookie,body:{body:'Alleen fictieve inhoud'}})).status,200);
  const link=await request('POST',route('share'),{cookie:identities[0].cookie});
  assert.equal(link.status,200);
  const token=/^\/__social\/shared\/([a-f0-9]{64})$/.exec(link.data.link)?.[1];
  assert.ok(token,'Share capability expected');
  assert.equal((await request('GET',link.data.link)).status,200);
  assert.equal((await request('POST',route('revoke-share'),{
    cookie:identities[0].cookie,body:{token}})).status,200);
  assert.equal((await request('GET',link.data.link)).status,403);
  assert.equal((await request('POST',route('revoke-grant'),{
    cookie:identities[0].cookie,body:{recipientId:identities[1].id}})).status,200);
  assert.equal((await request('GET',route('view'),{
    cookie:identities[1].cookie})).status,403);
  assert.equal((await request('POST','/api/logout',{
    cookie:identities[1].cookie})).status,200);
  assert.equal((await request('GET','/api/me',{
    cookie:identities[1].cookie})).status,401);
  assert.equal((await request('GET',route('view'),{
    cookie:identities[1].cookie})).status,403);
  assert.equal((await request('GET','/api/premium/cloud')).status,404,
    'Premium/legacy API must not be called through old backend');
  await stop();start();await ready();
  assert.equal((await request('GET','/api/me',{
    cookie:identities[0].cookie})).data.account.birthDate,'1976-09-07');
  assert.equal((await request('GET',route('view'),{
    cookie:identities[0].cookie})).data.commentCount,1);
  assert.equal((await request('GET',link.data.link)).status,403);
  assert.equal((await request('GET','/api/me',{
    cookie:identities[1].cookie})).status,401);
  return {
    result:'PASS: F5 bounded one-origin integration in local real Cloudflare runtime',
    syntheticAccounts:3,syntheticMemories:1,localRequests:calls,
    realTaleraStaticShellCopied:true,oneGatewayForAuthBirthdateAndSocial:true,
    crossAccountIsolation:true,spoofingOfAccountHeaderRejected:true,
    revokedShareAndGrantRemainRevoked:true,sessionsCanBeRevoked:true,
    dataRetainedAfterWorkerRestart:true,legacyApiFailsClosed:true,
    realCustomerDataUsed:false,officialTaleraConnected:false,
    loggedInPwaUiCertified:false,tenMillionCapacityProven:false
  };
}
try{
  const result=await run();
  writeFileSync(path.join(generated,'f5-results.json'),JSON.stringify(result,null,2)+'\n');
  console.log('TALERA_F5_LOCAL_INTEGRATION',JSON.stringify(result,null,2));
}catch(e){console.error('F5_CLOUDFLARE_LOCAL_LOG',logs);throw e}
finally{await stop()}
