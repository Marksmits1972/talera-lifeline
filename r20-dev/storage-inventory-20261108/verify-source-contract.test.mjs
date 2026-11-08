// Read-only contract assertions against checked-in historical TALERA source.
// These assertions intentionally do NOT assume a historical worker is live.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../../',import.meta.url);
function source(path){return readFileSync(new URL(path,root),'utf8')}
const core=source('xxory-test/src/worker.js');
const config=JSON.parse(source('xxory-test/wrangler.jsonc'));
const raw=source('xxory-test/src/workblad-raw-storage-api.js');
const editor=source('xxory-test/src/workblad-integration-api.js');
const management=source('xxory-test/src/workblad-story-management.js');
const timeline=source('xxory-test/src/workblad-v9-timeline-publish.js');
const links=source('xxory-test/src/clean-router-worker.js');
const birth=source('r20-dev/account-birthdate-test/account-birthdate-worker.mjs');
test('historical story core holds story metadata, text, media, shares and events in D1',()=>{
 for(const table of ['stories','story_texts','story_media','shares','events']){
  assert.match(core,new RegExp('CREATE TABLE IF NOT EXISTS '+table+'\\s*\\('));
 }
 assert.match(config.d1_databases[0].binding,/^DB$/);
});
test('existing media is separately bound as R2; media keys live with story metadata',()=>{
 assert.ok(config.r2_buckets.some(x=>x.binding==='MEDIA'));
 assert.match(core,/audio_object_key/);
 assert.match(core,/start_photo_key/);
 assert.match(core,/story_media/);
 for(const s of [raw,editor])assert.match(s,/env\.MEDIA\.(?:put|get|head|delete)/);
});
test('story ID and manage tokens are external routing paths, not just account ID',()=>{
 assert.match(core,/manage_token_hash/);
 assert.match(core,/CREATE TABLE IF NOT EXISTS shares/);
 assert.match(management,/manage_token_hash/);
 assert.match(editor,/SELECT id, manage_token_hash/);
 assert.match(timeline,/v9_timeline_links/);
 assert.match(links,/storylab_clean_timeline_links/);
});
test('birth date uses independent account D1; authentication delegated to original TALERA service',()=>{
 assert.match(birth,/env\.BIRTH_DB\.prepare/);
 assert.match(birth,/account_birthdates/);
 assert.match(birth,/env\.TALERA_BASE\.fetch/);
 assert.match(birth,/talera_sid/);
});
test('historic story schema does not itself establish login account ownership',()=>{
 const slice=core.slice(core.indexOf('CREATE TABLE IF NOT EXISTS stories'),core.indexOf('CREATE TABLE IF NOT EXISTS story_texts'));
 assert.doesNotMatch(slice,/\baccount_id\b/);
 assert.match(slice,/\bid TEXT PRIMARY KEY\b/);
 assert.match(slice,/\bmanage_token_hash\b/);
 console.log('CRITICAL_CONTRACT_GAP: verify current production story ownership before account-to-shard integration');
});
test('legacy storage paths cannot be transparently sharded by changing only one DB binding',()=>{
 assert.match(raw,/env\.DB\.prepare/);
 assert.match(editor,/env\.DB\.prepare/);
 assert.match(timeline,/env\.DB\.batch/);
 assert.match(links,/env\.DB\.batch/);
 assert.match(core,/env\.DB\.prepare/);
 console.log('MULTIPLE_API_PATHS: compatibility layer must route all relevant story read/write/share/edit/delete flows');
});
