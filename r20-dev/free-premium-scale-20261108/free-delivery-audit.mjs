// TALERA FREE: 3 GET-only observations of the actual preferred PWA.
// This reads REAL anonymous response headers/body, not a substitute for 10M users.
// No accounts, login, data writes or repeated requests. Output only metrics.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const expectedHost='talera-account-birthdate-test-20261107.mark-a39.workers.dev';
const origin='https://'+expectedHost;
const paths=['/mijn-leven','/present','/tell'];
const results=[];
for(const path of paths){
 const uri=new URL(path,origin);
 assert.equal(uri.hostname,expectedHost);
 const res=await fetch(uri,{method:'GET',headers:{accept:'text/html'},redirect:'error',signal:AbortSignal.timeout(20000)});
 assert.equal(res.status,200,'Public anonymous page must be available: '+path);
 assert.match(res.headers.get('content-type')||'',/text\/html/i);
 const body=await res.text();
 const bytes=Buffer.byteLength(body);
 assert.ok(bytes>50000,'Unexpectedly short page: '+path);
 // Rough counts only; a DOM parser would be needed for full precise parsing.
 const scripts=[...body.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)];
 const styles=[...body.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)];
 const externalScriptMatches=[...body.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)];
 const externalStyleMatches=[...body.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
   .filter(x=>/stylesheet/i.test(x[0]));
 const cacheControl=res.headers.get('cache-control')||'';
 const sharedCacheExplicitlyPermitted=/(^|,)\s*(public|s-maxage=\d+)/i.test(cacheControl)
   && !/no-store|private/i.test(cacheControl);
 results.push({
  path,httpStatus:res.status,htmlBytes:bytes,
  cacheControl:cacheControl||'(not declared)',
  cfCacheStatus:res.headers.get('cf-cache-status')||'(not declared)',
  contentEncoding:res.headers.get('content-encoding')||'(not declared)',
  inlineScriptBytes:scripts.reduce((n,s)=>n+Buffer.byteLength(s[1]),0),
  inlineStyleBytes:styles.reduce((n,s)=>n+Buffer.byteLength(s[1]),0),
  scriptTags:scripts.length,inlineStyleTags:styles.length,
  externalScriptCount:externalScriptMatches.length,externalStylesheetCount:externalStyleMatches.length,
  externalAssetsFetched:false,
  sharedHtmlCachingExplicitlyPermitted:sharedCacheExplicitlyPermitted
 });
}
const report={
 kind:'LIVE THREE-GET FREE DELIVERY READ-ONLY DIAGNOSTIC',
 source:origin,
 routes:results,
 allRoutesAvailable:results.every(r=>r.httpStatus===200),
 allRoutesAdvertiseSharedHtmlCaching:results.every(r=>r.sharedHtmlCachingExplicitlyPermitted),
 cacheEffectiveAtScale:null,
 maximumConcurrentUsersTested:1,
 freeTenMillionProven:false,
 constraints:[
  'These response sizes are observations, not transfer-bandwidth or Worker throughput measurements.',
  'The HTML response Cache-Control setting does not prove the status of JS, CSS, image, audio or CDN caching.',
  'No authenticated Free or Premium flows exercised, and no requests to any media assets.',
  'DO NOT load-test the preferred preview: use a separate isolated staging origin for controlled loads.'
 ]
};
writeFileSync(new URL('./free-delivery-audit-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log('TALERA_FREE_REAL_DELIVERY_AUDIT',JSON.stringify(report,null,2));
