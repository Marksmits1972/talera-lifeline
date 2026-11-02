import test from 'node:test';
import assert from 'node:assert/strict';
import {patchPremiumCloudCore} from '../src/core/premium-cloud-integration-patch.mjs';
const marker='// TALERA clean-core stage 2026-10-30.';
const source=marker+"\nasync function handler(req,env){\n const user=await auth(req,env);\n const premiumResponse=await premiumRoutes(req,env,user);\n return premiumResponse;\n}\nfunction premiumRoutes(){return json({rights,canManageTests:admin,commercialBillingActive:false});}";
test('inserts private cloud handler only after verified Core session',()=>{
 const out=patchPremiumCloudCore(source);
 assert.ok(out.indexOf('const user=await auth(req,env)') < out.indexOf('handleCorePremiumCloud('));
 assert.ok(out.indexOf('handleCorePremiumCloud(') < out.indexOf('premiumRoutes(req,env,user)'));
 assert.match(out,/premiumCloudPilotRights\(\{env,accountId:user.id,rights\}\)/);
 assert.match(out,/import \{handleCorePremiumCloud\}/);
});
test('fails closed against unexpected or already patched source',()=>{
 assert.throws(()=>patchPremiumCloudCore('unexpected'),/core_source_not_expected/);
 assert.throws(()=>patchPremiumCloudCore(patchPremiumCloudCore(source)),/core_source_not_expected/);
});
