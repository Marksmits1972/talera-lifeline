// Read-only Free F5 safety check: inspect the exact approved public SW snapshot.
// The same origin can hold memories for several accounts; caching account-specific
// HTML or bypassing network authorization is unsafe, even if CI's auth tests pass.
import {readFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='r20-dev/free-10m-delivery/public';
const map=await import('./generated/public-template-map.mjs');
const swPath=map.verifiedPublicSupport['/sw.js'];
assert.match(swPath||'',/^\/__talera_free\/f5support\/[a-f0-9]{64}\.js$/);
const sw=readFileSync(path.join(root,swPath.slice(1)),'utf8');
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
// The original minimal SW only fetches each navigation and shows a 503 page
// offline. That is safe against cross-account HTML cache leakage, but it is
// NOT a cold-start offline solution for private local memories. Do not turn
// the safe "no account HTML caching" result into an offline-ready claim.
assert.equal(summary.hasCacheStorage,false,
  'Original PWA SW must not silently persist account-specific HTML');
assert.equal(summary.containsDynamicCacheWrites,false,
  'Personal Free HTML must not be cached across users on one device');
assert.match(sw,/event\.request\.mode\s*!==\s*["']navigate["']/,
  'Original SW navigation behavior changed; re-audit cache safety');
assert.match(sw,/respondWith\(fetch\(event\.request\)\.catch/,
  'Original SW must not synthesize account HTML for offline navigation');
assert.match(sw,/status\s*:\s*503/,
  'Unknown offline fallback may expose cached account data');
summary.cacheAccountLeakDetected=false;
summary.offlineColdStartReady=false;
console.log('TALERA_F5_ORIGINAL_SW_INSPECTION',JSON.stringify(summary));
// The SW source is public; bounded logging allows a concrete manual
// security review rather than relying on a false-positive regexp verdict.
console.log('TALERA_F5_ORIGINAL_SW_CODE',JSON.stringify(sw.slice(0,14000)));
