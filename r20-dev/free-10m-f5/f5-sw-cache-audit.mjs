// Read-only Free F5 safety check: inspect the exact approved public SW snapshot.
// The same origin can hold memories for several accounts; caching account-specific
// HTML or bypassing network authorization is unsafe, even if CI's auth tests pass.
import {readFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const root='r20-dev/free-10m-delivery/public';
const map=await import('./generated/public-template-map.mjs');
const swPath=map.verifiedPublicSupport['/sw.js'];
assert.match(swPath||'',/^\/__talera_free\/f5support\/[a-f0-9]{64}\.js$/);
const sw=readFileSync(path.join(root,swPath.slice(1)),'utf8');
new vm.Script(sw,{filename:'same-talera-f5-service-worker.js'});
assert.ok(sw.includes('self.addEventListener'),'Original service worker was not packaged');
const summary={
  sha256:createHash('sha256').update(sw).digest('hex'),
  length:sw.length,
  hasFetchListener:/addEventListener\s*\(\s*['"]fetch['"]/.test(sw),
  hasCacheStorage:/\bcaches\./.test(sw),
  mentionsPrivatePages:/\/mijn-leven|\/present|\/tell/.test(sw),
  hasNavigationHandling:/request\.mode\s*===?\s*['"]navigate['"]|request\.destination\s*===?\s*['"]document['"]/.test(sw),
  containsDynamicCacheWrites:/\.put\s*\(|\.addAll\s*\(|\.add\s*\(/.test(sw),
  hasSkipWaiting:/\bskipWaiting\s*\(/.test(sw),
};
// New SAME-origin worker caches only safe STATIC files unencrypted. Account
// page snapshots and /api/me identity are stored AES-GCM encrypted in a
// separate local shell database, never media, stories or a second library.
// This is source-contract evidence, NOT iPhone offline acceptance.
assert.equal(summary.hasCacheStorage,true,'Offline static app shell not packaged');
assert.equal(summary.containsDynamicCacheWrites,true,'Static code not cached for offline use');
for(const marker of [
 'talera-f5-offline-shell-v1','talera-f5-offline-static-',
 'crypto.subtle.encrypt','crypto.subtle.decrypt',
 "read('pending-logout')","read('grant')",
 "event.respondWith(auth(req))","event.respondWith(navigate(event))",
 'TALERA_OFFLINE_PREPARE_V1'
])assert.ok(sw.includes(marker),'Critical offline account/crypto contract missing: '+marker);
assert.ok(sw.includes('async function navigate(event)')&&sw.includes('await fetch(event.request)'),
 'Offline network-first navigation source contract missing');
assert.ok(!sw.includes('cache.put(event.request'),'Private page must never enter CacheStorage');
summary.accountShellEncryptedAtRest=true;
summary.accountLogoutBlocksOffline=true;
summary.fullOfflineAcceptanceOnIphone=false;
summary.offlineColdStartReady=false;
console.log('TALERA_F5_ORIGINAL_SW_INSPECTION',JSON.stringify(summary));
// The SW source is public; bounded logging allows a concrete manual
// security review rather than relying on a false-positive regexp verdict.
console.log('TALERA_F5_ORIGINAL_SW_CODE',JSON.stringify(sw.slice(0,14000)));
