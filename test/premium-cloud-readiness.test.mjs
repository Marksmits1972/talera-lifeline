import test from 'node:test';import assert from 'node:assert/strict';
import {premiumCloudState,qrItemReady,cloudStatusText} from '../src/core/premium-cloud-readiness.mjs';
test('Free krijgt geen upload of QR',()=>assert.deepEqual(premiumCloudState(),{phase:'free',uploadAllowed:false,qrReady:false}));
test('Premium zonder toestemming start niet',()=>assert.equal(premiumCloudState({entitled:true}).phase,'consent_required'));
test('offline bewaart lokale status',()=>assert.equal(premiumCloudState({entitled:true,consent:true,online:false,pending:4}).phase,'offline'));
test('lopende migratie laat bestaande cloudinhoud toe',()=>assert.deepEqual(premiumCloudState({entitled:true,consent:true,pending:5,ready:1}),{phase:'uploading',uploadAllowed:true,qrReady:true}));
test('geen cloudmedia betekent geen QR-ready',()=>assert.equal(premiumCloudState({entitled:true,consent:true,pending:4}).qrReady,false));
test('QR vereist eigendom upload verwerking en toegang',()=>{assert.equal(qrItemReady({owned:true,uploaded:true,processed:true,authorized:true}),true);for(const field of ['owned','uploaded','processed','authorized']){const p={owned:true,uploaded:true,processed:true,authorized:true};p[field]=false;assert.equal(qrItemReady(p),false)}});
test('heldere uploadtekst',()=>assert.match(cloudStatusText.uploading,/overgezet/));
