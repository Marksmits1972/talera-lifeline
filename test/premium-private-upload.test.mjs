import test from 'node:test';import assert from 'node:assert/strict';
import {validatePremiumUpload,PREMIUM_UPLOAD_LIMIT} from '../src/core/premium-private-upload.mjs';
const id='a8f08aa9-a0a2-4ce3-a179-44fb758d1102',media='c6cd53e5-49b1-4483-b8f1-0aa29fa3ce72';
const base={accountId:id,mediaId:media,contentType:'image/jpeg',byteLength:1024,sha256:'a'.repeat(64),entitlement:{permissions:{cloud_storage:true},available:{cloud_storage:true}},consent:true};
test('valid account-scoped key',()=>assert.deepEqual(validatePremiumUpload(base),{ok:true,objectKey:'premium/'+id+'/'+media}));
test('no Free upload',()=>assert.equal(validatePremiumUpload({...base,entitlement:{permissions:{cloud_storage:false},available:{cloud_storage:true}}}).reason,'not_enabled'));
test('feature still disabled blocks test-rights upload',()=>assert.equal(validatePremiumUpload({...base,entitlement:{permissions:{cloud_storage:true},available:{cloud_storage:false}}}).reason,'not_enabled'));
test('one-time consent required',()=>assert.equal(validatePremiumUpload({...base,consent:false}).reason,'consent_required'));
test('size and type bounded',()=>{assert.equal(validatePremiumUpload({...base,byteLength:PREMIUM_UPLOAD_LIMIT+1}).reason,'invalid_size');assert.equal(validatePremiumUpload({...base,contentType:'text/html'}).reason,'unsupported_type')});
test('hash and IDs checked',()=>{assert.equal(validatePremiumUpload({...base,sha256:'xyz'}).reason,'invalid_digest');assert.equal(validatePremiumUpload({...base,accountId:'other'}).reason,'invalid_identity')});

import {storePremiumObject} from '../src/core/premium-private-upload.mjs';
test('concurrent rejection does not insert manifest',async()=>{
 const bytes=new TextEncoder().encode('fixture').buffer;
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
 let inserts=0,deleted=0;
 const db={prepare(sql){return {bind(){return {first:async()=>null,run:async()=>{inserts++}}}}}};
 const bucket={put:async()=>null,delete:async()=>{deleted++}};
 const result=await storePremiumObject({bucket,db,accountId:id,mediaId:media,contentType:'image/jpeg',bytes,sha256:digest,entitlement:base.entitlement,consent:true});
 assert.equal(result.reason,'concurrent_upload_retry');assert.equal(inserts,0);assert.equal(deleted,0);
});
test('manifest failure never deletes cloud object',async()=>{
 const bytes=new TextEncoder().encode('fixture2').buffer;
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
 let deleted=0;const db={prepare(){return {bind(){return {first:async()=>null,run:async()=>{throw Error('db failure')}}}}}};
 const bucket={put:async()=>({etag:'example'}),delete:async()=>{deleted++}};
 await assert.rejects(()=>storePremiumObject({bucket,db,accountId:id,mediaId:media,contentType:'image/jpeg',bytes,sha256:digest,entitlement:base.entitlement,consent:true}));
 assert.equal(deleted,0);
});
