// TALERA Free/Premium: deterministic OFFLINE capacity workload envelope.
// Important: these are concurrent-session scenarios and mathematical request
// budgets, NOT live HTTP traffic or real database performance measurements.
export const TARGETS=Object.freeze({
 freeUsers:10_000_000,
 premiumConcurrentActive:1_000_000,
 photosPerPremiumStory:6
});

function checked(value,name,{min=0,max=Infinity}={}){
 if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)
  throw new RangeError(name+' must be finite and within '+min+'..'+max);
 return value;
}
const r=(value)=>Number(value.toFixed(3));

export function freeScenario({
 users=TARGETS.freeUsers,
 assetsPerVisit=3,
 arrivalWindowSeconds=3600,
 measuredCacheHitRatio=null
}={}){
 checked(users,'users',{min:1});checked(assetsPerVisit,'assetsPerVisit',{min:1});
 checked(arrivalWindowSeconds,'arrivalWindowSeconds',{min:1});
 if(measuredCacheHitRatio!==null)checked(measuredCacheHitRatio,'measuredCacheHitRatio',{max:1});
 const edgeRequests=users*assetsPerVisit/arrivalWindowSeconds;
 return {
  product:'FREE',
  enrolledUsers:users,
  assumptions:{assetsPerVisit,arrivalWindowSeconds,measuredCacheHitRatio},
  edgeAssetRequestsPerSecond:r(edgeRequests),
  originAssetRequestsPerSecond:measuredCacheHitRatio===null?null:r(edgeRequests*(1-measuredCacheHitRatio)),
  expectedPerAccountCloudStorageCalls:0,
  expectedPerAccountCloudStorageCallsVerifiedInDeployedCode:false,
  fullScaleProven:false
 };
}

export function premiumScenario({
 concurrentActiveSessions=TARGETS.premiumConcurrentActive,
 storiesOpenedPerSessionPerMinute=0.2,
 photosPerStory=TARGETS.photosPerPremiumStory,
 audioStartsPerStory=1,
 newStoriesPerSessionPerMinute=0.01,
 photosUploadedPerStory=TARGETS.photosPerPremiumStory,
 audioUploadsPerStory=1
}={}){
 for(const [key,value] of Object.entries({concurrentActiveSessions,storiesOpenedPerSessionPerMinute,photosPerStory,audioStartsPerStory,newStoriesPerSessionPerMinute,photosUploadedPerStory,audioUploadsPerStory}))
  checked(value,key,{min:key==='concurrentActiveSessions'?1:0});
 const openedPerSecond=concurrentActiveSessions*storiesOpenedPerSessionPerMinute/60;
 const savesPerSecond=concurrentActiveSessions*newStoriesPerSessionPerMinute/60;
 const op={
  storyManifestGetsPerSecond:openedPerSecond,
  photoGetsPerSecond:openedPerSecond*photosPerStory,
  audioStartsPerSecond:openedPerSecond*audioStartsPerStory,
  storySavesPerSecond:savesPerSecond,
  photoUploadsPerSecond:savesPerSecond*photosUploadedPerStory,
  audioUploadsPerSecond:savesPerSecond*audioUploadsPerStory
 };
 const total=Object.values(op).reduce((a,b)=>a+b,0);
 return {
  product:'PREMIUM',
  concurrentActiveSessions,
  assumptions:{storiesOpenedPerSessionPerMinute,photosPerStory,audioStartsPerStory,newStoriesPerSessionPerMinute,photosUploadedPerStory,audioUploadsPerStory},
  operationsPerSecond:Object.fromEntries(Object.entries(op).map(([k,v])=>[k,r(v)])),
  totalModeledHttpOperationsPerSecond:r(total),
  missingBeforeRealCapacityVerdict:[
   'Real authenticated account/login/session requests',
   'Actual per-endpoint D1 queries, cache hits and shard distribution',
   'R2 file byte sizes and delivered bandwidth (photos, audio, videos)',
   'Video playback, audio duration and upload burst distribution',
   'Worker p95/p99, D1 queue delay, actual retries, quota and request errors',
   'Edge regions, phones, and network connection quality'
  ],
  fullScaleProven:false
 };
}

export function premiumSynchronizedOpeningPeak({
 concurrentOpeners=TARGETS.premiumConcurrentActive,
 arrivalWindowSeconds=10,
 photosPerStory=TARGETS.photosPerPremiumStory,
 audioStartsPerStory=1
}={}){
 for(const [name,v] of Object.entries({concurrentOpeners,arrivalWindowSeconds,photosPerStory,audioStartsPerStory}))
  checked(v,name,{min:name==='photosPerStory'||name==='audioStartsPerStory'?0:1});
 return {
  product:'PREMIUM_SYNCHRONIZED_OPEN',
  concurrentOpeners,
  arrivalWindowSeconds,
  assumptions:{photosPerStory,audioStartsPerStory,cacheHitRatio:'unknown'},
  storyManifestGetsPerSecond:r(concurrentOpeners/arrivalWindowSeconds),
  photoGetsPerSecond:r(concurrentOpeners*photosPerStory/arrivalWindowSeconds),
  audioStartsPerSecond:r(concurrentOpeners*audioStartsPerStory/arrivalWindowSeconds),
  totalModeledHttpOperationsPerSecond:r(concurrentOpeners*(1+photosPerStory+audioStartsPerStory)/arrivalWindowSeconds),
  fullScaleProven:false
 };
}
