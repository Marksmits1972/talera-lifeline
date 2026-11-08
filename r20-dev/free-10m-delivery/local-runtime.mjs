// TALERA Free: bounded REAL LOCAL Cloudflare Worker and Static Assets runtime.
// It uses no service bindings, databases, user accounts or live cloud requests.
// Never extrapolate local request timings to 10 million users.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {approvedAssets,anonymousShells} from './generated/approved-assets.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const config=JSON.parse(readFileSync(path.join(dir,'wrangler.jsonc'),'utf8'));
config.name='talera-free-10m-local-only';
delete config.services;delete config.d1_databases;config.workers_dev=false;
const localConfig=path.join(dir,'wrangler.local.jsonc');
writeFileSync(localConfig,JSON.stringify(config,null,2)+'\n');
const PORT=8785,base='http://127.0.0.1:'+PORT;
const cmd=path.resolve('node_modules/.bin/wrangler');
mkdirSync(path.join(dir,'generated','local-storage'),{recursive:true});
const proc=spawn(cmd,['dev','--local','--ip','127.0.0.1','--port',String(PORT),
 '--config',localConfig,'--persist-to',path.join(dir,'generated','local-storage'),
 '--log-level','error'],{env:{...process.env,CI:'true',BROWSER:'none',NO_COLOR:'1'},stdio:['ignore','pipe','pipe']});
let log='',ended=false;
for(const s of [proc.stdout,proc.stderr])s.on('data',b=>log=(log+b.toString()).slice(-11000));
proc.on('exit',(code,signal)=>{ended=true;log+='exit='+code+' signal='+signal});
const sleep=ms=>new Promise(res=>setTimeout(res,ms));
async function get(route){
 const t=performance.now();
 const r=await fetch(base+route,{method:'GET',redirect:'error',signal:AbortSignal.timeout(12000)});
 return {status:r.status,body:Buffer.from(await r.arrayBuffer()),headers:r.headers,ms:performance.now()-t};
}
function hash(buf){return createHash('sha256').update(buf).digest('hex')}
async function run(){
 let ready=false;
 for(let i=0;i<100;i++){
  if(ended)throw Error('Local Wrangler exited: '+log);
  try{const r=await get('/mijn-leven');if(r.status===200&&r.headers.get('x-talera-free-shared-code')==='edge-anonymous-shell'){ready=true;break;}}
  catch{}
  await sleep(400);
 }
 assert.ok(ready,'Real local Worker did not serve the anonymous shell: '+log);
 const checked=[];
 for(const route of ['/mijn-leven','/present','/tell']){
  assert.ok(anonymousShells[route],'Expected stable anonymous shell: '+route);
  const r=await get(route);
  assert.equal(r.status,200,route);
  assert.equal(r.headers.get('x-talera-free-shared-code'),'edge-anonymous-shell',route);
  assert.match(r.headers.get('cache-control')||'',/no-store/);
  const html=r.body.toString('utf8');
  const file=readFileSync(path.join(dir,'public',anonymousShells[route].slice(1)),'utf8');
  assert.equal(html,file,'HTML must match approved immutable anonymous snapshot');
  assert.ok(html.includes('/__talera_free/assets/'),'Real HTML must reference shared code');
  checked.push({route,htmlBytes:r.body.length,localRequestMs:Number(r.ms.toFixed(2))});
 }
 let js=0,css=0;
 for(const key of approvedAssets){
  const p='/__talera_free/assets/'+key;
  const r=await get(p);
  assert.equal(r.status,200,p);
  const expected=readFileSync(path.join(dir,'public',p.slice(1)));
  assert.equal(hash(r.body),hash(expected),'Static code corrupted in real local Worker runtime: '+key);
  if(key.endsWith('.js')){
   js++;assert.match(r.headers.get('content-type')||'',/javascript/);
  }else{
   css++;assert.match(r.headers.get('content-type')||'',/css/);
  }
 }
 const measured=[];
 for(const concurrency of [1,5,20]){
  const n=24;
  let cursor=0;const elapsed=[];
  await Promise.all(Array.from({length:concurrency},async()=>{
   while(cursor++<n){
    const res=await get('/mijn-leven');
    assert.equal(res.status,200);
    assert.equal(res.headers.get('x-talera-free-shared-code'),'edge-anonymous-shell');
    elapsed.push(res.ms);
   }
  }));
  elapsed.sort((a,b)=>a-b);
  measured.push({localConcurrentRequests:concurrency,successes:elapsed.length,
   p95LocalMs:Number(elapsed[Math.ceil(.95*elapsed.length)-1].toFixed(2))});
 }
 return {
  result:'PASS: real local Cloudflare Worker+Static Assets serving approved TALERA anonymous code',
  localOnly:true,cloudflareGlobalCdnLoadTest:false,fullTenMillionUsersProven:false,
  noExistingWorkerOrDatabaseTouched:true,
  sourceRoutes:checked,verifiedJsAssets:js,verifiedCssAssets:css,
  browserPersonalizationSimulatedSeparately:true,localTestBands:measured
 };
}
try{
 const report=await run();
 writeFileSync(path.join(dir,'generated','runtime-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log('TALERA_FREE_LOCAL_REAL_WORKER_ASSETS',JSON.stringify(report,null,2));
}catch(e){console.error('LOCAL_FREE_RUNTIME_LOG',log.slice(-8000));throw e}
finally{
 if(!ended)proc.kill('SIGTERM');
 await Promise.race([new Promise(resolve=>proc.once('exit',resolve)),sleep(3000)]);
}
