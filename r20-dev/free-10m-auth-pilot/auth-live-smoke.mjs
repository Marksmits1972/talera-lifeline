// Bounded live Cloudflare EU Durable Object staging test.
// Exactly TWO randomly named, fictional accounts. No production TALERA data.
// Auth staging key and namespace secret come from masked GitHub Actions env.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
const host='talera-free-auth-do-staging-20261108.mark-a39.workers.dev';
const origin='https://'+host;
const access=process.env.STAGING_ACCESS_KEY;
assert.match(access||'',/^[0-9a-f]{64}$/,'Missing masked disposable staging test key');
const prefix=randomUUID().replaceAll('-','').slice(0,18);
let checked=0;
async function request(method,route,{data,cookie,useAccess=true}={}){
 const url=new URL(route,origin);
 assert.equal(url.hostname,host,'Never call another Worker from the staging smoke test');
 const headers={accept:'application/json'};
 if(useAccess)headers['x-talera-staging-key']=access;
 if(cookie)headers.cookie=cookie;
 if(data){headers['content-type']='application/json';headers.origin=origin}
 if(method==='POST'&&!headers.origin)headers.origin=origin;
 const before=performance.now();
 const response=await fetch(url,{
  method,headers,body:data?JSON.stringify(data):undefined,
  signal:AbortSignal.timeout(15000),redirect:'error'
 });
 checked++;
 const value=await response.json();
 return {status:response.status,value,headers:response.headers,ms:performance.now()-before};
}
const cookieOf=response=>{
 const raw=response.headers.get('set-cookie')||'';
 assert.match(raw,/HttpOnly/);assert.match(raw,/Secure/);
 const match=/\btalera_sid=([0-9a-f]{64})/.exec(raw);
 assert.ok(match,'No private 256-bit session cookie issued');
 return 'talera_sid='+match[1];
};
const first={email:'synthetic-'+prefix+'-a@example.invalid',
 username:'demo-'+prefix.slice(0,12)+'-a',displayName:'Fictief A',
 password:'Fictional_staging_password_A_2026'};
const second={email:'synthetic-'+prefix+'-b@example.invalid',
 username:'demo-'+prefix.slice(0,12)+'-b',displayName:'Fictief B',
 password:'Fictional_staging_password_B_2026'};
const health=await request('GET','/__free-auth/health',{useAccess:false});
assert.equal(health.status,200);
assert.equal(health.value.realTaleraAccountsMigrated,false);
assert.equal(health.value.sharedD1Bound,false);
const unauthorized=await request('GET','/api/me',{useAccess:false});
assert.equal(unauthorized.status,403,'Staging must be inaccessible without secret');
let anonymous;
for(let attempt=0;attempt<45;attempt++){
 anonymous=await request('GET','/api/me');
 if(anonymous.status===401)break;
 assert.equal(anonymous.status,503,'Unexpected staging HTTP status during secret/binding warmup');
 await new Promise(resolve=>setTimeout(resolve,1000));
}
if(anonymous.status!==401){
 const diagnostic=await request('GET','/__free-auth/diagnostic');
 console.error('TALERA_FREE_AUTH_STAGING_BINDING_READINESS',JSON.stringify(diagnostic.value));
}
assert.equal(anonymous.status,401,'Staging secrets and Durable Object bindings did not become ready in 45 seconds');
const userA=await request('POST','/api/register',{data:first});
assert.equal(userA.status,200,'Staging account A: '+JSON.stringify(userA.value));
const userB=await request('POST','/api/register',{data:second});
assert.equal(userB.status,200,'Staging account B: '+JSON.stringify(userB.value));
assert.notEqual(userA.value.account.id,userB.value.account.id);
const aCookie=cookieOf(userA),bCookie=cookieOf(userB);
const aProfile=await request('GET','/api/me',{cookie:aCookie});
assert.equal(aProfile.status,200);
assert.equal(aProfile.value.account.email,first.email);
const bProfile=await request('GET','/api/me',{cookie:bCookie});
assert.equal(bProfile.status,200);
assert.equal(bProfile.value.account.id,userB.value.account.id);
assert.equal(bProfile.headers.get('cache-control'),'private, no-store');
const signedIn=await request('POST','/api/login',{data:{email:first.email,password:first.password}});
assert.equal(signedIn.status,200);
const anotherCookie=cookieOf(signedIn);
const signedOut=await request('POST','/api/logout',{cookie:aCookie});
assert.equal(signedOut.status,200);
assert.equal((await request('GET','/api/me',{cookie:aCookie})).status,401);
assert.equal((await request('GET','/api/me',{cookie:anotherCookie})).status,200);
assert.equal((await request('GET','/api/me',{cookie:bCookie})).status,200);
// Modest real networking check on ONLY this separate staging Worker;
// these are HTTP requests, NOT thousands of simultaneous real users.
const bands=[];
for(const concurrency of [1,5,20]){
 const count=30,latencies=[];
 let cursor=0;
 await Promise.all(Array.from({length:concurrency},async()=>{
  while(cursor<count){
   const at=cursor++;
   const cookie=at%2?bCookie:anotherCookie;
   const expected=at%2?userB.value.account.id:userA.value.account.id;
   const result=await request('GET','/api/me',{cookie});
   assert.equal(result.status,200,'Real cloud account session lookup failed');
   assert.equal(result.value.account.id,expected,'Cross-account data leak');
   assert.equal(result.headers.get('cache-control'),'private, no-store');
   latencies.push(result.ms);
  }
 }));
 latencies.sort((a,b)=>a-b);
 bands.push({simultaneousHttpRequests:concurrency,successes:count,
  p50Ms:Number(latencies[Math.ceil(count*.50)-1].toFixed(2)),
  p95Ms:Number(latencies[Math.ceil(count*.95)-1].toFixed(2))});
}
const report={
 result:'PASS: isolated REAL Cloudflare Free-auth EU-jurisdiction staging smoke',
 testOnly:true,
 newFictionalAccounts:2,
 verifiedSeparateAccountSessionReadbacks:true,
 realSessionLogoutAndRevocation:true,
 usesOriginalD1:false,
 migratedOriginalAccounts:false,
 sentNoRequestsToExistingTalera:false,
 totalLiveHttpRequests:checked,
 boundedRealCloudSessionReadBands:bands,
 noNetworkLoadOnAnyExistingTaleraWorker:true,
 anyActual10MillionLoadProven:false
};
console.log('TALERA_FREE_AUTH_REAL_CLOUDFLARE_SMOKE',JSON.stringify(report,null,2));
