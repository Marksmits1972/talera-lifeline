// Isolated EU F5 smoke: synthetic accounts only, bounded HTTP requests.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const host=process.env.F5_STAGE_HOST||'talera-free-f5-combined-stage-20261108.mark-a39.workers.dev';
const origin='https://'+host,key=process.env.STAGING_F5_KEY;
assert.match(key||'',/^[a-f0-9]{64}$/);
let calls=0;
async function call(method,route,{cookie,body,gate=true}={}){
 const u=new URL(route,origin);assert.equal(u.hostname,host);
 const h={accept:'application/json'};
 if(gate)h['x-talera-f5-key']=key;
 if(cookie)h.cookie=cookie;
 if(method==='POST')h.origin=origin;
 if(body)h['content-type']='application/json';
 const t=performance.now(),r=await fetch(u,{method,headers:h,
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(18000),redirect:'manual'});
 const raw=await r.text();let data;
 try{data=JSON.parse(raw)}catch{data=raw}
 calls++;
 return {status:r.status,data,cookie:r.headers.get('set-cookie'),
   stage:r.headers.get('x-talera-free-f5'),ms:performance.now()-t};
}
const sid=r=>{
 const m=/talera_sid=([a-f0-9]{64})/.exec(r.cookie||'');
 assert.ok(m);assert.match(r.cookie,/HttpOnly/);return 'talera_sid='+m[1];
};
const nonce=randomUUID().replaceAll('-','').slice(0,10);
const users=[0,1].map((i)=>({
 email:'f5-eu-'+nonce+'-'+i+'@example.invalid',
 username:'f5-'+nonce+'-'+i,displayName:'Fictief EU '+i,
 password:'Only_Synthetic_F5_2026_Example_'+i,
 birthDate:i?'1984-03-05':'1974-04-02'
}));
const health=await call('GET','/__f5/health',{gate:false});
assert.equal(health.status,200);
assert.equal(health.data.officialTaleraConnected,false);
assert.equal((await call('GET','/api/me',{gate:false})).status,403);
let ready;
for(let i=0;i<35;i++){
 ready=await call('GET','/api/me');
 if(ready.status===401)break;
 assert.equal(ready.status,503);
 await new Promise(resolve=>setTimeout(resolve,1000));
}
assert.equal(ready.status,401);
const page=await call('GET','/mijn-leven');
assert.equal(page.status,200);assert.equal(page.stage,'anonymous-snapshot-only');
const menu=await call('GET','/__clean/menu-integration.mjs');
assert.equal(menu.status,200);
const sw=await call('GET','/sw.js');
assert.equal(sw.status,200);
assert.match(String(sw.data),/self\.addEventListener/);
const manifest=await call('GET','/manifest.webmanifest');
assert.equal(manifest.status,200);
assert.ok(manifest.data.name||manifest.data.short_name);
assert.equal((await call('GET','/api/v9/audio')).status,404,
 'No accidental forwarding of legacy media API to TALERA production');

const accounts=[];
for(const u of users){
 const r=await call('POST','/api/register',{body:u});
 assert.equal(r.status,200);
 accounts.push({id:r.data.account.id,cookie:sid(r)});
 assert.equal(r.data.account.birthDate,u.birthDate);
}
assert.notEqual(accounts[0].id,accounts[1].id);
const p=await call('GET','/present',{cookie:accounts[0].cookie});
assert.equal(p.status,200);
assert.equal(p.stage,'personalized-durable-account');
assert.match(String(p.data),/new Date\(1974,3,2\)/);
assert.equal((await call('GET','/api/me',{cookie:accounts[1].cookie})).data.account.birthDate,'1984-03-05');
const story='f5-synthetic-'+nonce;
const at=x=>'/__social/memory/'+story+'/'+x;
assert.equal((await call('POST',at('init'),{cookie:accounts[0].cookie})).status,200);
assert.equal((await call('GET',at('view'),{cookie:accounts[1].cookie})).status,403);
assert.equal((await call('POST',at('grant'),{cookie:accounts[0].cookie,
 body:{recipientId:accounts[1].id}})).status,200);
assert.equal((await call('GET',at('view'),{cookie:accounts[1].cookie})).status,200);
const shared=await call('POST',at('share'),{cookie:accounts[0].cookie});
assert.equal(shared.status,200);
const token=/\/([a-f0-9]{64})$/.exec(shared.data.link)?.[1];assert.ok(token);
assert.equal((await call('GET',shared.data.link)).status,200);
assert.equal((await call('POST',at('revoke-share'),{cookie:accounts[0].cookie,body:{token}})).status,200);
assert.equal((await call('GET',shared.data.link)).status,403);
assert.equal((await call('POST',at('revoke-grant'),{cookie:accounts[0].cookie,body:{recipientId:accounts[1].id}})).status,200);
assert.equal((await call('GET',at('view'),{cookie:accounts[1].cookie})).status,403);
assert.equal((await call('POST','/api/logout',{cookie:accounts[1].cookie})).status,200);
assert.equal((await call('GET','/api/me',{cookie:accounts[1].cookie})).status,401);
const samples=[];
for(const width of [1,5,10]){
 let next=0;const lat=[];
 await Promise.all(Array.from({length:width},async()=>{
  while(next++<10){
   const r=await call('GET','/api/me',{cookie:accounts[0].cookie});
   assert.equal(r.status,200);assert.equal(r.data.account.id,accounts[0].id);
   lat.push(r.ms);
  }
 }));
 lat.sort((a,b)=>a-b);
 samples.push({width,requests:lat.length,p95Ms:Math.round(lat[Math.ceil(lat.length*.95)-1])});
}
const result={pass:true,syntheticAccounts:2,syntheticStories:1,
 originalTaleraBound:false,personalTimelines:true,sessionAndSharing:true,
 currentMediaUploadRoutesIntegrated:false,
 safariBrowserCertified:false,tenMillionCapacityProven:false,
 measured:samples,totalHttpRequests:calls};
console.log('TALERA_FREE_F5_EU_STAGE_VERDICT',JSON.stringify(result));
