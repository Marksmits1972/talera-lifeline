// A bounded, REAL local Cloudflare runtime test of the existing, isolated
// synthetic Durable Object + R2 proof. Does NOT call ANY live Cloudflare URL.
// Uses exact previously tested source pinned in the workflow checkout.
// It CANNOT prove 1M Premium sessions nor test actual six-photo/audio bytes.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import path from 'node:path';

const PORT=8789, BASE='http://127.0.0.1:'+PORT;
const TOKEN='local-only-fixed-fake-secret-for-automated-test-0000000000000000';
const workdir=path.resolve('isolated-synthetic-proof/r20-dev/do-shortpath-compare-20261108');
assert.ok(workdir.includes('isolated-synthetic-proof/r20-dev/do-shortpath-compare-20261108'),
 'MUST only run separate synthetic Worker source');
mkdirSync('.talera-local-runtime-proof',{recursive:true});
const args=[
 'dev','--local','--ip','127.0.0.1','--port',String(PORT),
 '--config',path.join(workdir,'wrangler.jsonc'),
 '--persist-to',path.resolve('.talera-local-runtime-proof'),
 '--var','DEMO_TOKEN:'+TOKEN,
 '--log-level','debug'
];
const processHandle=spawn(path.resolve('node_modules/.bin/wrangler'),args,{
 env:{...process.env,CI:'true',BROWSER:'none',NO_COLOR:'1'},
 stdio:['ignore','pipe','pipe']
});
let log='',exited=false;
const append=t=>{log=(log+t).slice(-12000)};
processHandle.stdout.on('data',buf=>append(buf.toString()));
processHandle.stderr.on('data',buf=>append(buf.toString()));
processHandle.on('exit',(code,signal)=>{exited=true;append('\nWRANGLER_EXIT='+code+' SIGNAL='+signal)});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let requests=0;
async function api(method,route,payload,{auth=true}={}){
 requests++;
 const t=performance.now();
 const response=await fetch(BASE+route,{
  method,
  headers:{...(auth?{authorization:'Bearer '+TOKEN}:{}),
   ...(payload?{'content-type':'application/json'}:{})},
  body:payload?JSON.stringify(payload):undefined,
  signal:AbortSignal.timeout(12000)
 });
 const body=await response.json();
 return {status:response.status,body,ms:performance.now()-t};
}
function percentile(a,n){
 const s=[...a].sort((x,y)=>x-y);
 return Number(s[Math.min(s.length-1,Math.ceil(n*s.length)-1)].toFixed(2));
}
async function parallelLimit(items,limit,fn){
 let cursor=0;
 const outcomes=new Array(items.length);
 await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
  while(cursor<items.length){
   const index=cursor++;
   outcomes[index]=await fn(items[index],index);
  }
 }));
 return outcomes;
}
async function run(){
 let ready=false;
 for(let i=0;i<120;i++){
  if(exited)throw Error('Local Wrangler exited before readiness: '+log);
  try {
   const x=await api('GET','/health',null,{auth:false});
   if(x.status===200&&x.body.connectedToTalera===false){ready=true;break}
  }catch{}
  await sleep(500);
 }
 assert.ok(ready,'Local Cloudflare test Worker unavailable. '+log.slice(-5000));
 const unauthorized=await api('GET','/_demo/stats?accountId=demo-scale-00',null,{auth:false});
 assert.equal(unauthorized.status,401);
 const earlyStats=await api('GET','/_demo/stats?accountId=demo-scale-00');
 if(earlyStats.status!==200){
  console.log('LOCAL_DO_STUB_PRECHECK',JSON.stringify(earlyStats));
  throw new Error('Isolated local Durable Object unavailable before fake media upload');
 }
 const accountCount=12,mediaPerAccount=6;
 const accounts=Array.from({length:accountCount},(_,i)=>'demo-scale-'+String(i).padStart(2,'0'));
 const uploads=[];
 for(const accountId of accounts){
  for(let i=0;i<mediaPerAccount;i++){
   uploads.push({accountId,storyId:'story-abc',mediaId:'media-'+String(i),text:'SYNTHETIC_BYTES_ONLY_'+accountId+'_'+i});
  }
 }
 const written=await parallelLimit(uploads,8,async item=>{
  const x=await api('POST','/_demo/media',item);
  assert.equal(x.status,200,'Fake media write: '+JSON.stringify(x.body));
  return x.ms;
 });
 // Existing worker intentionally stores only ONE media key per story.
 // Six fake objects are sent per account, but this is NOT real 6-photo support.
 const stories=await parallelLimit(accounts,8,async accountId=>{
  const x=await api('POST','/_demo/story',{
   accountId,storyId:'story-abc',text:'Synthetic story for '+accountId,mediaId:'media-0'
  });
  assert.equal(x.status,200,'Local SQLite story write: '+JSON.stringify(x.body));
  return x.ms;
 });
 let checks=0;
 const bands=[];
 const readJobs=accounts.flatMap(accountId=>[
  {kind:'story',accountId},
  ...Array.from({length:mediaPerAccount},(_,i)=>({kind:'media',accountId,mediaId:'media-'+i}))
 ]);
 for(const concurrency of [1,5,10,25]){
  const timings=await parallelLimit(readJobs,concurrency,async job=>{
   const route=job.kind==='story'
    ?'/_demo/story?accountId='+job.accountId+'&storyId=story-abc'
    :'/_demo/media?accountId='+job.accountId+'&storyId=story-abc&mediaId='+job.mediaId;
   const x=await api('GET',route);
   assert.equal(x.status,200,'Local read: '+JSON.stringify(x.body));
   if(job.kind==='story'){
    assert.equal(x.body.text,'Synthetic story for '+job.accountId);
   }else{
    assert.equal(x.body.text,'SYNTHETIC_BYTES_ONLY_'+job.accountId+'_'+job.mediaId.slice(6));
   }
   checks++;
   return x.ms;
  });
  bands.push({localConcurrentClientRequests:concurrency,completed:timings.length,
   localMedianMs:percentile(timings,.5),localP95Ms:percentile(timings,.95)});
 }
 const isolation=await api('GET','/_demo/story?accountId=demo-not-populated&storyId=story-abc');
 assert.equal(isolation.status,404,'A separate empty account should not see stored stories');
 const stats=await api('GET','/_demo/stats?accountId='+accounts[0]);
 assert.equal(stats.status,200);
 assert.equal(stats.body.stories,1);
 assert.ok([null,'eu'].includes(stats.body.jurisdiction),'Local runtime jurisdiction is not a live EU guarantee');
 return {
  outcome:'PASS: bounded local Cloudflare runtime check only',
  independentDemoAccountObjects:accountCount,
  fakeMediaObjectsPerAccount:mediaPerAccount,
  actualPhotoPayloadBytes:false,
  actualAudioOrVideoUpload:false,
  actualSixMediaManifest:false,
  realCloudflareEdgeLoad:false,
  realPremiumAccountAuth:false,
  cloudDatabaseOrR2Touched:false,
  liveEUDataJurisdictionMeasured:false,
  localOnlyJurisdictionRoutingShim:true,
  actualConcurrentUsersAtCloudflare:0,
  localReadsChecked:checks,
  localMediaWrites:written.length,
  localStoryWrites:stories.length,
  requestCount:requests,
  localRuntimeBands:bands,
  free10MillionCapacityProven:false,
  premium1MillionConcurrencyProven:false
 };
}
try{
 const result=await run();
 writeFileSync('r20-dev/free-premium-scale-20261108/results-local-runtime.json',JSON.stringify(result,null,2)+'\n');
 console.log('TALERA_PREMIUM_ISOLATED_LOCAL_EXECUTION',JSON.stringify(result,null,2));
}catch(error){
 console.error('LOCAL_CLOUDFLARE_RUNTIME_LOG_LAST_8000',log.slice(-8000));
 throw error;
}finally{
 if(!exited)processHandle.kill('SIGTERM');
 await Promise.race([new Promise(resolve=>processHandle.once('exit',resolve)),sleep(3000)]);
}
