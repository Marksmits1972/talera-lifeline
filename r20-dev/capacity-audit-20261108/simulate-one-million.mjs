// TALERA: synthetic one-million-user capacity preflight.
// Safety: fetch exactly 3 unauthenticated HTML screens ONCE, then run ALL
// repetitions locally with in-memory mock bindings. No real registrations,
// no database writes, no authenticated requests and no load flood.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import maintenance from '../maintenance-test/talera-maintenance-worker.mjs';

const SOURCE='https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev';
const paths=['/mijn-leven','/present','/tell'];
const pages={};
for(const path of paths){
 const response=await fetch(SOURCE+path,{signal:AbortSignal.timeout(25000),headers:{accept:'text/html'}});
 assert.equal(response.status,200,'Unauthenticated reference screen must load: '+path);
 assert.match(response.headers.get('content-type')||'',/text\/html/i);
 pages[path]=await response.text();
 assert.ok(pages[path].length>20000,'Unexpectedly small TALERA source at '+path);
 console.log('REFERENCE',path,'HTML bytes',Buffer.byteLength(pages[path]));
}

let mockAuthLookups=0,mockDobReads=0,mockD1Writes=0;
const env={
 TALERA_BASE:{
  fetch:async req=>{
   const path=new URL(req.url).pathname;
   if(path==='/api/me'){
    mockAuthLookups++;
    return Response.json({account:{id:'SYNTHETIC_ACCOUNT_NO_REAL_USER'}});
   }
   assert.ok(paths.includes(path),'Unexpected external route in mock: '+path);
   return new Response(pages[path],{status:200,headers:{'content-type':'text/html; charset=utf-8'}});
  }
 },
 BIRTH_DB:{
  prepare:sql=>{
   assert.ok(/^SELECT birth_date FROM account_birthdates/.test(sql),'Only mock DOB read is permitted');
   return {bind:(_id)=>({first:async()=>{mockDobReads++;return {birth_date:'1990-01-01'}}})};
  }
 }
};
const median=a=>{const sorted=[...a].sort((x,y)=>x-y);return sorted[Math.floor(sorted.length/2)]};
const percentile=(a,p)=>{const sorted=[...a].sort((x,y)=>x-y);return sorted[Math.ceil(sorted.length*p)-1]};
const measurements=[];
for(const path of paths){
 for(const authenticated of [false,true]){
  const ms=[],sizes=[], statuses=new Set(),anchors=new Set();
  for(let i=0;i<18;i++){
   const request=new Request('https://synthetic.talera.invalid'+path,{
    headers:authenticated?{'cookie':'talera_sid=synthetic-only'}:{}
   });
   const start=performance.now();
   const result=await maintenance.fetch(request,env);
   const body=await result.text();
   const elapsed=performance.now()-start;
   assert.equal(result.status,200,'Source Worker with fake services must return HTML');
   assert.ok(body.length>=pages[path].length*0.85,'Unexpected screen truncation');
   ms.push(elapsed);sizes.push(Buffer.byteLength(body));
   statuses.add(result.headers.get('x-talera-i18n-extension'));
   anchors.add(result.headers.get('x-talera-anchor-status'));
  }
  // Exclude first iteration from timing to reduce JIT/warmup distortion.
  const settled=ms.slice(1);
  const record={route:path,authenticated,p50_ms:Number(median(settled).toFixed(2)),
   p95_ms:Number(percentile(settled,.95).toFixed(2)),
   mean_ms:Number((settled.reduce((a,b)=>a+b,0)/settled.length).toFixed(2)),
   html_bytes:sizes.at(-1),i18n:[...statuses],anchor:[...anchors]};
  measurements.push(record);
  console.log('LOCAL_WORKER_REPLAY',JSON.stringify(record));
 }
}
assert.ok(mockAuthLookups>0&&mockDobReads>0,'Local fake authenticated requests exercised');
assert.equal(mockD1Writes,0,'No real or simulated database writes');

/* Generate one million distinct synthetic user indices entirely within the
 * local process. No identities, no passwords, no accounts, no network use.
 * Scenarios use explicit ASSUMPTIONS, not TALERA production metrics. */
const USERS=1_000_000, simulation={generated:0,onePercent:0,tenPercent:0,half:0};
for(let id=0;id<USERS;id++){
 simulation.generated++;
 if(id%100===0)simulation.onePercent++;
 if(id%10===0)simulation.tenPercent++;
 if(id%2===0)simulation.half++;
}
assert.deepEqual(simulation,{generated:USERS,onePercent:10000,tenPercent:100000,half:500000});
console.log('FAKE_IDENTITIES',JSON.stringify(simulation));

const settings={
 registeredUsers:USERS,
 // Hypotheses (not observed behavior) for an intentionally busy social app:
 readsPerActiveUserPerDay:15,
 writesPerActiveUserPerDay:1,
 htmlViewsPerActiveUserPerDay:10,
 peakToDailyAverage:12,
 mediaViewsPerActiveUserPerDay:8,
 databaseQueryDurationMs:[1,5,20],
};
const perSecond=1/86400;
const matrix=[];
for(const pct of [.01,.1,.5,1]){
 const dau=USERS*pct;
 const dbReadPeak=dau*settings.readsPerActiveUserPerDay*perSecond*settings.peakToDailyAverage;
 const dbWritePeak=dau*settings.writesPerActiveUserPerDay*perSecond*settings.peakToDailyAverage;
 const htmlPeak=dau*settings.htmlViewsPerActiveUserPerDay*perSecond*settings.peakToDailyAverage;
 const mediaPeak=dau*settings.mediaViewsPerActiveUserPerDay*perSecond*settings.peakToDailyAverage;
 for(const ms of settings.databaseQueryDurationMs){
  const theoreticalCap=1000/ms;
  const utilization=(dbReadPeak+dbWritePeak)/theoreticalCap;
  matrix.push({
   registered:USERS,activePct:Math.round(pct*100),dailyActive:dau,
   peakHtmlRps:Number(htmlPeak.toFixed(1)),peakMediaRps:Number(mediaPeak.toFixed(1)),
   peakD1ReadsPerSecond:Number(dbReadPeak.toFixed(1)),
   peakD1WritesPerSecond:Number(dbWritePeak.toFixed(1)),
   assumedMeanD1QueryMs:ms,
   singlePrimaryD1TheoreticalMaxQps:theoreticalCap,
   primaryUtilization:Number((utilization*100).toFixed(1)),
   flag:utilization>=1?'OVER_CAPACITY':utilization>=.7?'AT_RISK':'BELOW_HYPOTHETICAL_CAPACITY'
  });
 }
}
const mediaExamples={
 illustrativeStoredStoriesPerRegisteredUser:20,
 photosPerStory:5,
 averagePhotoMB:3,
 videosPerFourStories:1,
 averageVideoMB:80
};
const bytesPerUser=mediaExamples.illustrativeStoredStoriesPerRegisteredUser*mediaExamples.photosPerStory*mediaExamples.averagePhotoMB+
 mediaExamples.illustrativeStoredStoriesPerRegisteredUser/4*mediaExamples.averageVideoMB;
const mediaStorageTB=USERS*bytesPerUser/1e6; // 1 TB = 1e6 MB (decimal)
const output={scope:'hypothetical local-only',settings,synthetic:simulation,workerReplay:measurements,capacityMatrix:matrix,
 mediaStorageExample:{...mediaExamples,illustrativeTotalTB:mediaStorageTB},
 warnings:[
  'Zero real users, zero real D1 writes, zero load flood; only 3 public anonymous GETs.',
  'D1 single-primary capacity of 1000/query-ms is a mathematical upper bound without per-request overhead, not a measured guarantee.',
  'Read replicas and database sharding, actual query shapes, indexes, caching and traffic mix have not been measured.',
  'Local Node timings are NOT Cloudflare Workers runtime CPU costs or true concurrent throughput.',
  'This does not prove one million real users can or cannot be served.',
  'Media storage is an illustrative inventory, not currently stored TALERA media.',
  'Media delivery bitrate, caching, real video performance, upload errors and login throughput remain untested.'
 ]};
console.log('CAPACITY_MATRIX',JSON.stringify(matrix));
console.log('SYNTHETIC_REPORT',JSON.stringify(output));
