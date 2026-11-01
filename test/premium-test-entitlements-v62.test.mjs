import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../src/core/premium-test-rights.js',import.meta.url),'utf8');
const menu=readFileSync(new URL('../src/mijn-talera/menu-integration.txt',import.meta.url),'utf8');
const migration=readFileSync(new URL('../migrations/20261101_premium_test_rights.sql',import.meta.url),'utf8');

test('one existing database, no silent account elevation',()=>{
 assert.equal((migration.match(/CREATE TABLE IF NOT EXISTS /g)||[]).length,3);
 assert.ok(migration.includes('talera_premium_admins'));
 assert.ok(migration.includes('talera_premium_test_grants'));
 assert.ok(migration.includes('talera_premium_test_audit'));
 assert.ok(!/INSERT INTO|DROP TABLE|DELETE FROM/.test(migration));
});
test('server-only temporary grants, no payments or personal-media uploads',()=>{
 assert.ok(source.includes('premiumGrantView'));
 assert.ok(source.includes('commercialBillingActive:false'));
 assert.ok(source.includes('available:{cloud_storage:false'));
 assert.ok(!/SHARE_MEDIA\.(put|delete)|INSERT INTO memories|\bfetch\s*\(/.test(source));
});
test('all mutating endpoints demand explicit operator and fresh session',()=>{
 for(const required of [
  'premiumOperator(env,user.id)','premiumRecentLogin(req,env,user.id)',
  'Date.now()-15*60000','allowedWrite(req)',
  "if(targetId===user.id)","![7,30,90].includes(days)"
 ])assert.ok(source.includes(required),required);
});
test('audit, auto-expiry and safe revocation',()=>{
 for(const required of [
  'expires_at>?','INSERT INTO talera_premium_test_audit',
  'await env.DB.batch([','DELETE FROM talera_premium_test_grants'
 ])assert.ok(source.includes(required),required);
});
test('same My TALERA menu shows rights and operator-only controls',()=>{
 assert.doesNotThrow(()=>new Function(menu));
 for(const required of [
  "case 'subscription':","case 'premium-admin':",
  "api('/api/me/entitlements')",'premiumState.admin',
  'data-action="premium-grant"','data-action="premium-revoke"'
 ])assert.ok(menu.includes(required),required);
});
test('plan resolver defaults to Free and respects grant expiry',async()=>{
 const id='11111111-1111-4111-8111-111111111111';
 let row=null;
 const DB={prepare(sql){let args=[];const stmt={bind(...x){args=x;return stmt},async first(){
  if(sql.includes('talera_premium_test_grants'))return row&&row.expires_at>args[1]?row:null;
  throw Error('Unexpected query');
 }};return stmt;}};
 const exports=runInNewContext(source+'\n({premiumGrantView})',{DB,Date,Number,String,Object,Promise});
 assert.equal((await exports.premiumGrantView({DB},id)).plan,'free');
 row={plan_code:'individual',expires_at:Date.now()+86400000};
 assert.equal((await exports.premiumGrantView({DB},id)).plan,'individual');
 row.expires_at=1;
 assert.equal((await exports.premiumGrantView({DB},id)).plan,'free');
});
