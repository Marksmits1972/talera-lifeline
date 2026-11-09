// F5 real local Cloudflare runtime: bounded synthetic end-to-end integration.
// No live TALERA database, account, media, service or production deployment.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
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
  // F5 may not silently proxy legacy share/media routes to the customer's
  // older Cloudflare backend. The original UI still references some of them,
  // but Free personal originals MUST stay in the phone's IndexedDB.
  const legacyPrivateRoutes=[
    ['POST','/api/account-social/stories'],
    ['POST','/api/account-social/stories/local-f5-test-story-001/media'],
    ['GET','/api/linked/stories/local-f5-test-story-001'],
    ['GET','/api/integration/stories/local-f5-test-story-001'],
    ['POST','/api/v12-invites/story'],
    ['POST','/api/v12-invites/revoke'],
    ['GET','/api/share-preview/meta/'+('b'.repeat(64))],
    ['GET','/api/v25/social/memory/v25-demo-1450']
  ];
  for(const [verb,path] of legacyPrivateRoutes){
    const response=await request(verb,path,{
      cookie:identities[0].cookie,
      body:verb==='POST'?{storyId:'local-f5-test-story-001',
        syntheticOnly:true,neverUploadLocalMedia:true}:undefined
    });
    assert.equal(response.status,404,
      'Legacy share/media endpoint must NOT write local Free originals to cloud: '+path);
  }

  // Test final simple one-tap iPhone link without any Cloudflare setup,
  // manually typed test code, real account, or leaked live bearer token.
  const easyHtml=await request('GET','/__f5/start',{gate:false});
  assert.equal(easyHtml.status,200,'Public invitation landing works without QA cookie');
  assert.match(String(easyHtml.data),/location\.hash/,'Fragment is read in browser');
  assert.ok(!String(easyHtml.data).includes('b'.repeat(64)),
    'Even the LOCAL example invite must not appear in HTML');
  const unauthorized=await fetch(origin+'/__f5/start',{
    method:'POST',
    headers:{origin,'cf-connecting-ip':'192.0.2.77','content-type':'application/json'},
    body:JSON.stringify({invite:'0'.repeat(64)}),
    redirect:'manual'
  });
  assert.equal(unauthorized.status,403,'A made-up shortcut must not create an account');
  const outside=await fetch(origin+'/__f5/start',{
    method:'POST',
    headers:{origin:'https://attacker.example','cf-connecting-ip':'192.0.2.77','content-type':'application/json'},
    body:JSON.stringify({invite:'b'.repeat(64)}),
    redirect:'manual'
  });
  assert.equal(outside.status,403,'Foreign form request with a known invite still rejected');
  const fast=await fetch(origin+'/__f5/start',{
    method:'POST',
    headers:{origin,'cf-connecting-ip':'192.0.2.77','content-type':'application/json'},
    body:JSON.stringify({invite:'b'.repeat(64)}),
    redirect:'manual'
  });
  const easyResult=await fast.json();
  assert.equal(fast.status,200,'One-click account provisioning must succeed');
  assert.equal(easyResult.syntheticOnly,true);
  const easyCookies=(typeof fast.headers.getSetCookie==='function'?
    fast.headers.getSetCookie():[fast.headers.get('set-cookie')||'']).join('; ');
  const quickSession=/talera_sid=([a-f0-9]{64})/.exec(easyCookies)?.[0];
  const quickQa=/talera_f5_access=([0-9.]+[a-f0-9.]+)/.exec(easyCookies)?.[0];
  assert.ok(quickSession&&quickQa,'Quickstart sets both private session and QA cookies');
  const personal=await request('GET','/mijn-leven',{gate:false,
    cookie:quickSession+'; '+quickQa});
  assert.equal(personal.status,200,'One tap leads straight into personal Free timeline');
  assert.equal(personal.stage,'personalized-durable-account');
  assert.equal((await request('GET','/api/me',{gate:false,
    cookie:quickSession+'; '+quickQa})).data.account.birthDate,'1974-04-02');
  const revisit=await fetch(origin+'/__f5/start',{
    method:'POST',
    headers:{origin,'cf-connecting-ip':'192.0.2.77',
      'content-type':'application/json',
      cookie:quickSession+'; '+quickQa},
    body:JSON.stringify({invite:'b'.repeat(64)}),redirect:'manual'
  });
  const reopened=await revisit.json();
  assert.equal(revisit.status,200,'iPhone one-tap invitation can be reopened');
  assert.equal(reopened.reusedExistingSession,true,
    'Reopening one-tap link MUST retain original account and its saved media');
  assert.ok(!(revisit.headers.get('set-cookie')||'').includes('talera_sid='),
    'Never overwrite existing iPhone account session with a fresh fake user');
  assert.equal((await request('GET','/api/me',{
    gate:false,cookie:quickSession+'; '+quickQa})).data.account.birthDate,'1974-04-02');

  const signedHome=await request('GET','/mijn-leven',{
    gate:false,cookie:identities[0].cookie+'; '+qaCookie});
  assert.equal(signedHome.status,200,'Registered user gets a separate private timeline');
  assert.equal(signedHome.stage,'personalized-durable-account');
  // Original editor redirects here *after* a successful local save.
  const fixedPublished=await request('GET',
    '/mijn-leven?published=local-f5-test-story-001',{cookie:identities[0].cookie});
  assert.equal(fixedPublished.status,200,
    'Successful Free publish must return to Mijn leven, not a 404');
  // User-observed 404: the original "Bekijk herinnering" link is
  // /present?memory=local-<id>, not a bare /present URL.
  const viewed=await request('GET',
    '/present?memory=local-f5-test-story-001',{cookie:identities[0].cookie});
  assert.equal(viewed.status,200,
    'Published personal memory MUST open the original presentation player');
  assert.equal(viewed.stage,'personalized-durable-account');
  const embed=await fetch(origin+'/vertelmodus-embed?mode=present',{
    headers:{cookie:identities[0].cookie,'x-talera-f5-key':f5},
    signal:AbortSignal.timeout(17000)
  });
  const embedHtml=await embed.text();
  assert.equal(embed.status,200,
    'Local story presentation MUST load the actual original iframe player');
  assert.match(embed.headers.get('content-type')||'',/text\/html/i);
  assert.match(embed.headers.get('content-security-policy')||'',
    /frame-ancestors 'self'/,
    'The original same-origin narrator must be embeddable');
  assert.equal(embed.headers.get('x-frame-options'),'SAMEORIGIN');
  assert.equal(embed.headers.get('x-talera-free-f5'),'original-iframe-zero-player');
  for(const marker of ['taleraZero','INIT','READY','postMessage','syncVideo','videoAtMs','follow()']){
    assert.ok(embedHtml.includes(marker),'Original zero narrator/player missing '+marker);
  }
  const recordPlayer=await request('GET','/vertelmodus-embed?mode=record',{
    cookie:identities[0].cookie
  });
  assert.equal(recordPlayer.status,200);
  assert.equal(recordPlayer.data,embedHtml,
    'Recording and presentation MUST use identical byte-for-byte player');
  assert.equal((await request('GET','/vertelmodus-embed?mode=present&debug=1',{
    cookie:identities[0].cookie
  })).status,404,'No extraneous iframe player parameters');
  assert.equal((await request('GET','/vertelmodus-embed?mode=admin',{
    cookie:identities[0].cookie
  })).status,404,'No unsupported player modes');
  assert.equal((await request('GET','/vertelmodus-embed?mode=present',{
    gate:false
  })).status,403,'Unauthorized viewer must not load private narrator');

  assert.ok(String(viewed.data).includes('talera-free-local-'),
    'Memory player must read current account\'s private local media store');
  assert.equal((await request('GET',
    '/present?memory=https%3A%2F%2Fexample.com',
    {cookie:identities[0].cookie})).status,404,
    'No external URL permitted as a memory identifier');
  assert.equal((await request('GET',
    '/present?memory=local-f5-test-story-001&other=yes',
    {cookie:identities[0].cookie})).status,404,
    'No unrecognized parameters for the memory player');
  assert.equal((await request('GET',
    '/present?evil=local-f5-test-story-001',
    {cookie:identities[0].cookie})).status,404,
    'No unrecognized query names permitted');
  const editLocal=await request('GET',
    '/tell?edit=local-f5-test-story-001',{cookie:identities[0].cookie});
  assert.equal(editLocal.status,200,
    'Original editor must allow opening an existing account-local story');
  assert.equal((await request('GET',
    '/mijn-leven?published=https%3A%2F%2Fevil.example',
    {cookie:identities[0].cookie})).status,404,
    'Remote/nonlocal story IDs must remain forbidden');
  assert.equal((await request('GET',
    '/mijn-leven?other=local-f5-test-story-001',
    {cookie:identities[0].cookie})).status,404,
    'Unknown query parameters must remain forbidden');

  const scopedName=/talera-free-local-([a-f0-9]{32})-v1/.exec(String(signedHome.data))?.[0];
  assert.ok(scopedName,'The existing IndexedDB media store must be scoped to current account');
  // Free re-login must reopen exactly the same private local library namespace.
  const rejectedLogin=await request('POST','/api/login',{
    body:{email:users[0].email,password:'wrong-synthetic-password'}
  });
  assert.equal(rejectedLogin.status,401,'Wrong password cannot expose local originals');
  const renewedLogin=await request('POST','/api/login',{
    body:{email:users[0].email,password:users[0].password}
  });
  assert.equal(renewedLogin.status,200,'Original menu login must work');
  assert.equal(renewedLogin.data.account.id,identities[0].id,
    'Re-login cannot create a fresh account with an empty library');
  const renewedCookie=cookieOf(renewedLogin);
  const reopenedHome=await request('GET','/mijn-leven',{cookie:renewedCookie});
  assert.equal(reopenedHome.status,200);
  assert.ok(String(reopenedHome.data).includes(scopedName),
    'Re-login must use same IndexedDB for photos, video, audio and cues');
  assert.equal((await request('GET','/api/me',{cookie:renewedCookie})).data.account.birthDate,
    '1974-04-02','Birthdate must remain linked to the original person');

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
  assert.ok(!String(storyEditor.data).includes('talera-lifeline-dev-local-v1'),
    'Editor must not write its media-ID timeline to the old global database');
  assert.equal(String(storyEditor.data).split(scopedName).length-1,3,
    'Editor, story store and deletion tool must all use the same private DB');

  assert.match(String(signedHome.data),/let current=1974;/,
    'Birth-year must come from the individual account DO, not the demo shell');
  const signedPresent=await request('GET','/present',{cookie:identities[0].cookie});
  assert.equal(signedPresent.status,200,'Presentation must get its own private timeline');
  assert.equal(signedPresent.stage,'personalized-durable-account');
  assert.ok(String(signedPresent.data).includes(scopedName),
    'Presentation must access the very same private local story and media store');
  assert.match(String(signedPresent.data),/const LIFE_START = new Date\(1974,3,2\)\.getTime\(\);/,
    'Presentation start must match account private birthdate');
  // HARD CONTRACT: chosen WhatsApp CSS-cleanup origin is the complete UI.
  // Storage-only integration must never introduce its own controls or RH19 CSS.
  const protectedPages=[String(signedHome.data),String(signedPresent.data),
    String(storyEditor.data)];
  for(const html of protectedPages){
    for(const forbidden of ['taleraF5AddVideoButton','talera-f5-narrated-swipe-band',
      'f5PrewarmFirstAdjacent','talera-f5-media-status']){
      assert.ok(!html.includes(forbidden),
        'Free storage integration must not mutate approved UX: '+forbidden);
    }
  }
  const publicScript=await request('GET','/__clean/menu-integration.mjs');
  assert.equal(publicScript.status,200,'Original TALERA menu script must load from approved snapshot');
  assert.ok(String(publicScript.data).length>100,'Actual menu integration JavaScript is expected');
  // Active original /api/version?check=Date.now() must work within this
  // SAME isolated origin, but must not expose a broad legacy API gateway.
  const originalVersion='talera-storage-v37-20261022';
  for(const file of ['reference-mijn-leven.html','reference-present.html']){
    const html=readFileSync(path.join('r20-dev/free-10m-delivery/generated',file),'utf8');
    const match=html.match(/const CURRENT=['\"](talera-[^'\"]+)['\"]/);
    assert.ok(match,'Original version checker missing in '+file);
    assert.equal(match[1],originalVersion,'Do not invent a version for '+file);
  }
  const version=await request('GET','/api/version?check='+Date.now());
  assert.equal(version.status,200,'Original iPhone version polling must work');
  assert.equal(version.data.version,originalVersion,'Approved source version must match exactly');
  assert.equal((await request('GET','/api/version?check='+Date.now()+'&extra=1')).status,404,
    'Version endpoint must reject arbitrary query parameters');
  assert.equal((await request('POST','/api/version')).status,404,
    'Version check must be read-only');
  assert.equal((await request('GET','/api/version?check='+Date.now(),{gate:false})).status,403,
    'Closed staging version endpoint must still require the QA gate');
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
    syntheticAccounts:4,syntheticMemories:1,oneTapIphoneSyntheticLoginVerified:true,successfulLocalPublishRedirectVerified:true,originalLocalMemoryPresentationRouteVerified:true,originalStandaloneIframePlayerActuallyLoaded:true,localRequests:calls,
    realTaleraStaticShellCopied:true,originalMenuScriptVerified:true,originalPwaManifestAndSwVerified:true,perAccountIndexedDbIsolationVerified:true,loginReturnsSamePrivateDbVerified:true,qaBrowserCookieVerified:true,safariMissingOriginAcceptedWithCsrf:true,privateTimelineUpdatedOnTwoScreens:true,oneGatewayForAuthBirthdateAndSocial:true,
    crossAccountIsolation:true,spoofingOfAccountHeaderRejected:true,
    revokedShareAndGrantRemainRevoked:true,sessionsCanBeRevoked:true,
    dataRetainedAfterWorkerRestart:true,legacyApiFailsClosed:true,
    legacyMediaAndInviteEndpointsFailClosed:true,
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
