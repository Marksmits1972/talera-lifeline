import test from 'node:test';
import assert from 'node:assert/strict';
import {TARGETS,freeScenario,premiumScenario,premiumSynchronizedOpeningPeak} from './scale-model.mjs';

test('Fixed TALERA targets: 10M Free accounts, 1M simultaneously active Premium sessions',()=>{
 assert.equal(TARGETS.freeUsers,10_000_000);
 assert.equal(TARGETS.premiumConcurrentActive,1_000_000);
 assert.equal(TARGETS.photosPerPremiumStory,6);
});

test('Free: 10M arrivals over one hour requesting 3 assets: edge envelope, not a load test',()=>{
 const free=freeScenario();
 assert.equal(free.enrolledUsers,10_000_000);
 assert.equal(free.edgeAssetRequestsPerSecond,8333.333);
 assert.equal(free.originAssetRequestsPerSecond,null,'Never guess CDN hit ratio');
 assert.equal(free.expectedPerAccountCloudStorageCalls,0,'Free product design');
 assert.equal(free.expectedPerAccountCloudStorageCallsVerifiedInDeployedCode,false);
 assert.equal(free.fullScaleProven,false);
});

test('Free: a hypothetical CDN ratio is clearly optional and does not prove capacity',()=>{
 assert.equal(freeScenario({measuredCacheHitRatio:.99}).originAssetRequestsPerSecond,83.333);
 assert.equal(freeScenario({arrivalWindowSeconds:60}).edgeAssetRequestsPerSecond,500_000);
 assert.throws(()=>freeScenario({measuredCacheHitRatio:1.1}),RangeError);
});

test('Premium: 1M ACTIVE sessions with six photos and audio is not 1M DAU',()=>{
 const p=premiumScenario();
 assert.equal(p.concurrentActiveSessions,1_000_000);
 assert.equal(p.operationsPerSecond.storyManifestGetsPerSecond,3333.333);
 assert.equal(p.operationsPerSecond.photoGetsPerSecond,20_000);
 assert.equal(p.operationsPerSecond.audioStartsPerSecond,3333.333);
 assert.equal(p.operationsPerSecond.storySavesPerSecond,166.667);
 assert.equal(p.operationsPerSecond.photoUploadsPerSecond,1000);
 assert.equal(p.operationsPerSecond.audioUploadsPerSecond,166.667);
 assert.equal(p.totalModeledHttpOperationsPerSecond,28_000);
 assert.equal(p.fullScaleProven,false);
});

test('Premium: worst-case synchronized story openings create a completely different peak',()=>{
 const peak=premiumSynchronizedOpeningPeak();
 assert.equal(peak.concurrentOpeners,1_000_000);
 assert.equal(peak.storyManifestGetsPerSecond,100_000);
 assert.equal(peak.photoGetsPerSecond,600_000);
 assert.equal(peak.audioStartsPerSecond,100_000);
 assert.equal(peak.totalModeledHttpOperationsPerSecond,800_000);
 assert.equal(peak.fullScaleProven,false);
});

test('No invented media file size, cache hit or database query counts',()=>{
 const x=premiumScenario({photosPerStory:0,audioStartsPerStory:0,newStoriesPerSessionPerMinute:0});
 assert.equal(x.totalModeledHttpOperationsPerSecond,3333.333);
 assert.equal(x.operationsPerSecond.photoGetsPerSecond,0);
 assert.equal(x.operationsPerSecond.photoUploadsPerSecond,0);
 assert.ok(x.missingBeforeRealCapacityVerdict.some(t=>t.includes('D1')));
 assert.ok(x.missingBeforeRealCapacityVerdict.some(t=>t.includes('R2')));
 assert.throws(()=>premiumScenario({concurrentActiveSessions:Infinity}),RangeError);
 assert.throws(()=>premiumSynchronizedOpeningPeak({arrivalWindowSeconds:0}),RangeError);
});
