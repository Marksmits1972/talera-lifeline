import test from 'node:test';
import assert from 'node:assert/strict';
import {patchSyntheticPilotBucket} from '../src/core/premium-eu-pilot-patch.mjs';
test('updates only eight pilot binding references',()=>{
  const before='const outside=1;\nasync function premiumCloudPilotRoutes(){\n'+Array(8).fill('env.PREMIUM_MEDIA;').join('\n')+'\n}\nasync function next(){}';
  const after=patchSyntheticPilotBucket(before);
  assert.equal((after.match(/env\.PREMIUM_PRIVATE/g)||[]).length,8);
  assert.match(after,/const outside=1/);
  assert.match(after,/async function next/);
});
test('rejects unexpected route shape',()=>assert.throws(()=>patchSyntheticPilotBucket('async function premiumCloudPilotRoutes(){}\nasync function next(){}'),/unexpected number/));
