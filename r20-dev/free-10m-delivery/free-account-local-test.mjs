import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const config=JSON.parse(readFileSync(path.join(dir,'wrangler.jsonc'),'utf8'));
assert.ok(config.durable_objects?.bindings?.some(x=>x.name==='FREE_ACCOUNT'));
assert.ok(!config.d1_databases?.length,'NO global D1 on this Free account test');
config.name='talera-free-account-home-local-qa';
config.main='./free-account-local-harness.mjs';
config.workers_dev=false;
delete config.services;delete config.d1_databases;
const tempConfig=path.join(dir,'generated','local-account-test.jsonc');
mkdirSync(path.dirname(tempConfig),{recursive:true});
writeFileSync(tempConfig,JSON.stringify(config,null,2)+'\n');
const dirPersist=path.join(dir,'generated','do-account-persistence');
mkdirSync(dirPersist,{recursive:true});
const port=8794,base='http://127.0.0.1:'+port;
const wrangler=path.resolve('node_modules/.bin/wrangler');
let worker,logs='',terminated=false,requestCount=0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function boot(){
 logs='';terminated=false;
 worker=spawn(wrangler,['dev','--local','--ip','127.0.0.1','--port',String(port),
  '--config',tempConfig,'--persist-to',dirPersist,'--log-level','error'],
 {env:{...process.env,BROWSER:'none',CI:'true',NO_COLOR:'1'},stdio:['ignore','pipe','pipe']});
 worker.on('exit',(code,signal)=>{terminated=true;logs+='\nEXIT '+code+' '+signal});
 for(const x of [worker.stdout,worker.stderr])x.on('data',b=>logs=(logs+b.toString()).slice(-9000));
}
async function stop(){
 if(!worker||terminated)return;
 worker.kill('SIGTERM');
 await Promise.race([new Promise(resolve=>worker.once('exit',resolve)),sleep(3000)]);
}
async function send(method,route,{account,body,origin=true}={}){
 requestCount++;
 const headers={accept:'application/json'};
 if(account)headers.cookie='talera_sid='+account;
 if(origin)headers.origin=base;
 if(body)headers['content-type']='application/json';
 const t=performance.now();
 const res=await fetch(base+route,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 const text=await res.text();
 let data=null;
 try{data=JSON.parse(text)}catch{}
 return {status:res.status,data,text,latencyMs:performance.now()-t,headers:res.headers};
}
async function ready(){
 for(let i=0;i<110;i++){
  if(terminated)throw Error('Local Wrangler failed: '+logs);
  try{const x=await send('GET','/health',{origin:false});
   if(x.status===200&&x.data?.environment==='local-only-fake-accounts')return;
  }catch{}
  await sleep(450);
 }
 throw Error('Local account runtime not ready: '+logs);
}
async function bounded(items,concurrency,fn){
 let next=0;const results=new Array(items.length);
 await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{
  while(next<items.length){const idx=next++;results[idx]=await fn(items[idx],idx);}
 }));
 return results;
}
const accounts=Array.from({length:64},(_,i)=>{
 const year=1970+i%45,month=i%12+1,day=i%27+1;
 const birthDate=String(year)+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
 return {account:'demo-account-'+String(i).padStart(4,'0'),birthDate};
});
const p95=xs=>{
 const sorted=[...xs].sort((a,b)=>a-b);
 return Number(sorted[Math.ceil(.95*sorted.length)-1].toFixed(2));
};
async function main(){
 boot();await ready();
 const unauth=await send('GET','/api/profile/birthdate');
 assert.equal(unauth.status,401,'Anonymous users cannot read private birthday');
 const invalid=await send('POST','/api/profile/birthdate',{account:accounts[0].account,body:{birthDate:'2025-02-29'}});
 assert.equal(invalid.status,400);
 const forged=await send('POST','/api/profile/birthdate',{account:accounts[0].account,body:{birthDate:'1976-09-06'},origin:false});
 assert.equal(forged.status,403,'CSRF origin check preserved');
 const writes=await bounded(accounts,12,async ({account,birthDate})=>{
  const res=await send('POST','/api/profile/birthdate',{account,body:{birthDate}});
  assert.equal(res.status,200,'Local durable account write: '+JSON.stringify(res.data)+'\n'+logs.slice(-300));
  assert.equal(res.data.birthDate,birthDate);
  return res.latencyMs;
 });
 const bands=[];
 for(const concurrent of [1,8,32]){
  const times=await bounded(accounts,concurrent,async ({account,birthDate})=>{
   // A malicious account ID in URL/query cannot override the verified session.
   const res=await send('GET','/api/profile/birthdate?accountId=demo-account-0000',{account});
   assert.equal(res.status,200,'Local durable account GET');
   assert.equal(res.data?.birthDate,birthDate,'Account content leaked or mixed');
   return res.latencyMs;
  });
  bands.push({concurrentLocalRequests:concurrent,verifiedAccountReads:times.length,p95LocalMs:p95(times)});
 }
 const a=accounts[0],b=accounts[1];
 const own=await send('GET','/api/me',{account:a.account});
 assert.equal(own.status,200);
 assert.equal(own.data?.account?.birthDate,a.birthDate);
 assert.notEqual(own.data?.account?.birthDate,b.birthDate);
 const page=await send('GET','/present',{account:a.account});
 assert.equal(page.status,200);
 const [year,month,day]=a.birthDate.split('-').map(Number);
 assert.ok(page.text.includes('new Date('+year+','+(month-1)+','+day+')'),
  'The existing personal timeline must preserve its account DOB');
 assert.match(page.headers.get('cache-control')||'',/no-store/);
 const register=await send('POST','/api/register',{body:{
  displayName:'Fake',username:'demo-created',email:'synthetic@example.invalid',
  password:'fake-password-not-used',birthDate:'2000-02-29'
 }});
 assert.equal(register.status,200,'Existing registration behavior preserved: '+JSON.stringify(register.data));
 const registered=await send('GET','/api/profile/birthdate',{account:'demo-created-registered'});
 assert.equal(registered.data?.birthDate,'2000-02-29');
 // Persistence: killing and restarting the *local* Worker must not lose a committed DOB.
 await stop();boot();await ready();
 for(const {account,birthDate} of [accounts[0],accounts[1],accounts.at(-1)]){
  const res=await send('GET','/api/profile/birthdate',{account});
  assert.equal(res.status,200);
  assert.equal(res.data?.birthDate,birthDate,'Committed account DOB lost after Worker restart');
 }
 return {
  result:'PASS: Free per-account Durable Object storage tested in actual local workerd',
  independentFakeAccounts:accounts.length,
  completedWrites:writes.length,
  verifiedReads:bands.reduce((a,b)=>a+b.verifiedAccountReads,0)+3,
  persistedAcrossWorkerRestart:true,
  registrationReadBack:true,
  authentication:'EXISTING authentication unmodified; local QA uses fake cookie-to-account upstream',
  originalGlobalBirthdateD1Used:false,
  anyRealCloudflareD1Modified:false,
  anyProductionAccountsAccessed:false,
  concurrentLocalRequestBands:bands,
  p95LocalWritesMs:p95(writes),
  actualCloudflareGlobalTrafficTest:false,
  existingCoreLoginDBScaleTested:false,
  fullTenMillionFreeCapacityProven:false,
  requestsSent:requestCount
 };
}
try{
 const result=await main();
 writeFileSync(path.join(dir,'generated','account-home-run.json'),JSON.stringify(result,null,2)+'\n');
 console.log('TALERA_FREE_PER_ACCOUNT_DO_RESULT',JSON.stringify(result,null,2));
}catch(e){console.error('TALERA_FREE_LOCAL_ACCOUNT_LOG',logs.slice(-8000));throw e}
finally{await stop()}
