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
 {email:'f5-owner@example.invalid',username:'f5-owner',displayName:'F5 fictieve eigenaar',password:'Fake_Test_Password_1001',birthDate:'1974-04-02'},
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
  const entry=await request('GET','/__f5/entry',{gate:false});
  assert.equal(entry.status,200);
  assert.match(String(entry.data),/TALERA Free — testversie/);
  const challenge=await fetch(origin+'/__f5/entry',{
    method:'GET',signal:AbortSignal.timeout(15000)
  });
  assert.equal(challenge.status,200);
  const csrfCookie=/talera_f5_entry=[^;]+/.exec(
    challenge.headers.get('set-cookie')||'')?.[0];
  const csrfToken=/name="csrf" value="([0-9a-f.]+)"/.exec(await challenge.text())?.[1];
  assert.ok(csrfCookie&&csrfToken,'Signed Safari form token and cookie required');
  const openOptions={
    method:'POST',
    headers:{'content-type':'application/x-www-form-urlencoded',cookie:csrfCookie},
    body:new URLSearchParams({key:f5,csrf:csrfToken}),
    redirect:'manual',signal:AbortSignal.timeout(15000)
  };
  const noCsrf=await fetch(origin+'/__f5/entry',{...openOptions,
    body:new URLSearchParams({key:f5})});
  assert.equal(noCsrf.status,403,'Forged form without CSRF proof must be rejected');
  const foreign=await fetch(origin+'/__f5/entry',{...openOptions,
    headers:{...openOptions.headers,origin:'https://attacker.example'}});
  assert.equal(foreign.status,403,'Foreign Origin must still be rejected');
  // Safari native form can omit Origin entirely: keep accepting it only
  // when the signed same-origin double-submit challenge is present.
  const browserOpen=await fetch(origin+'/__f5/entry',openOptions);
  assert.equal(browserOpen.status,303,'Private browser testing gets signed QA cookie');
  const qaCookie=/talera_f5_access=[^;]+/.exec(browserOpen.headers.get('set-cookie')||'')?.[0];
  assert.ok(qaCookie,'QA authorization must be HttpOnly browser cookie');
  assert.match(browserOpen.headers.get('set-cookie')||'',/HttpOnly; Secure/);
  assert.equal((await request('GET','/mijn-leven',{gate:false,cookie:qaCookie})).status,200,
    'Original PWA accessible to authorized browser without injecting headers into JS');
  const fakeQa=qaCookie.slice(0,-1)+(qaCookie.endsWith('0')?'1':'0');
  assert.equal((await request('GET','/mijn-leven',{gate:false,cookie:fakeQa})).status,403,
    'A modified QA cookie must not unlock test PWA');
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
  const signedHome=await request('GET','/mijn-leven',{
    gate:false,cookie:identities[0].cookie+'; '+qaCookie});
  assert.equal(signedHome.status,200,'Registered user gets a separate private timeline');
  assert.equal(signedHome.stage,'personalized-durable-account');
  const scopedName=/talera-free-local-([a-f0-9]{32})-v1/.exec(String(signedHome.data))?.[0];
  assert.ok(scopedName,'The existing IndexedDB media store must be scoped to current account');
  assert.ok(!String(signedHome.data).includes("DB_NAME='talera-lifeline-dev-local-v1'"),
    'A signed-in user must never write to the shared legacy local database');
  const otherHome=await request('GET','/mijn-leven',{cookie:identities[1].cookie});
  assert.equal(otherHome.status,200);
  const otherName=/talera-free-local-([a-f0-9]{32})-v1/.exec(String(otherHome.data))?.[0];
  assert.ok(otherName&&otherName!==scopedName,
    'Different accounts on the same iPhone must use separate local memories');
  const storyEditor=await request('GET','/tell',{cookie:identities[0].cookie});
  assert.equal(storyEditor.status,200);
  assert.ok(String(storyEditor.data).includes(scopedName),
    'The storyteller must use the same individual local media store as Mijn leven');
  assert.match(String(signedHome.data),/let current=1974;/,
    'Birth-year must come from the individual account DO, not the demo shell');
  const signedPresent=await request('GET','/present',{cookie:identities[0].cookie});
  assert.equal(signedPresent.status,200,'Presentation must get its own private timeline');
  assert.equal(signedPresent.stage,'personalized-durable-account');
  assert.ok(String(signedPresent.data).includes(scopedName),
    'Presentation must access the very same private local story and media store');
  assert.match(String(signedPresent.data),/const LIFE_START = new Date\(1974,3,2\)\.getTime\(\);/,
    'Presentation start must match account private birthdate');
  const publicScript=await request('GET','/__clean/menu-integration.mjs');
  assert.equal(publicScript.status,200,'Original TALERA menu script must load from approved snapshot');
  assert.ok(String(publicScript.data).length>100,'Actual menu integration JavaScript is expected');
  const sw=await request('GET','/sw.js');
  assert.equal(sw.status,200,'PWA service worker must be retained');
  assert.match(String(sw.data),/self\.addEventListener/,'Real original service worker code expected');
  const manifest=await request('GET','/manifest.webmanifest');
  assert.equal(manifest.status,200,'Existing PWA app manifest must be retained');
  assert.ok(manifest.data.name||manifest.data.short_name,'Installable PWA manifest expected');

  for(let i=0;i<3;i++){
    const res=await request('GET','/api/me',{cookie:identities[i].cookie});
    assert.equal(res.status,200);
    assert.equal(res.data.account.id,identities[i].id);
    assert.equal(res.data.account.birthDate,users[i].birthDate);
  }
  const changed=await request('POST','/api/profile/birthdate',{
    cookie:identities[0].cookie,body:{birthDate:'1974-04-03'}});
  assert.equal(changed.status,200);
  assert.equal((await request('GET','/api/me',{cookie:identities[0].cookie}))
    .data.account.birthDate,'1974-04-03');
  assert.match(String((await request('GET','/present',{cookie:identities[0].cookie})).data),
    /const LIFE_START = new Date\(1974,3,3\)\.getTime\(\);/,
    'Changing private account birthdate updates presentation as well');
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
    cookie:identities[0].cookie})).data.account.birthDate,'1974-04-03');
  assert.equal((await request('GET',route('view'),{
    cookie:identities[0].cookie})).data.commentCount,1);
  assert.equal((await request('GET',link.data.link)).status,403);
  assert.equal((await request('GET','/api/me',{
    cookie:identities[1].cookie})).status,401);
  return {
    result:'PASS: F5 bounded one-origin integration in local real Cloudflare runtime',
    syntheticAccounts:3,syntheticMemories:1,localRequests:calls,
    realTaleraStaticShellCopied:true,originalMenuScriptVerified:true,originalPwaManifestAndSwVerified:true,perAccountIndexedDbIsolationVerified:true,qaBrowserCookieVerified:true,safariMissingOriginAcceptedWithCsrf:true,privateTimelineUpdatedOnTwoScreens:true,oneGatewayForAuthBirthdateAndSocial:true,
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
