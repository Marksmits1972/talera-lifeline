// Exactly three READ-ONLY anonymous GET requests to the established TALERA
// test-PWA. No login, cookies, uploads, account data or repeated traffic.
// This confirms basic reachability only, not capacity for 10M users.
import assert from 'node:assert/strict';
const ALLOWED_HOST='talera-account-birthdate-test-20261107.mark-a39.workers.dev';
const base=new URL(process.env.TALERA_PUBLIC_BASE_URL||'https://'+ALLOWED_HOST);
assert.equal(base.protocol,'https:','Only HTTPS permitted');
assert.equal(base.hostname,ALLOWED_HOST,'Only the existing reference preview is permitted');
assert.equal(base.pathname,'/','Base URL must point to the preview root');
assert.equal(base.search,'','No query parameters');
const results=[];
for(const route of ['/mijn-leven','/present','/tell']){
 const response=await fetch(new URL(route,base),{
  method:'GET',
  headers:{accept:'text/html'},
  signal:AbortSignal.timeout(15000),
  redirect:'error'
 });
 assert.equal(response.status,200,'Anonymous reference page unavailable: '+route);
 assert.match(response.headers.get('content-type')||'',/text\/html/i,'Expected HTML: '+route);
 const data=await response.arrayBuffer();
 assert.ok(data.byteLength>1000,'Unexpected empty page: '+route);
 results.push({
  route,status:response.status,
  htmlBodyBytes:data.byteLength,
  contentType:response.headers.get('content-type'),
  cacheControl:response.headers.get('cache-control')||'not stated',
  cfCacheStatus:response.headers.get('cf-cache-status')||'not stated'
 });
}
console.log('TALERA_3_ANONYMOUS_HTTP_SMOKE_ONLY',JSON.stringify({
 referencePreview:base.origin,
 checks:results,
 measuredScaleCapacity:false,
 actualFreeUserAuthenticationTest:false,
 warning:'Only 3 anonymous HTTP GET requests; no CDN peak or database load tested.'
},null,2));
