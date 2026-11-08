// Build only from the LAST APPROVED public TALERA candidate.
// TWO anonymous snapshots must agree byte-for-byte before code is shareable.
// No login, cookies, accounts, D1/R2 writes or live performance load.
import assert from 'node:assert/strict';
import {mkdirSync,rmSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {candidates} from './rewrite.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const STATIC=path.join(here,'public');
const GENERATED=path.join(here,'generated');
const ORIGIN='https://talera-account-birthdate-test-20261107.mark-a39.workers.dev';
const PAGES=['/mijn-leven','/present','/tell'];
async function fetchPublic(pathname){
 const uri=new URL(pathname,ORIGIN);
 assert.equal(uri.hostname,'talera-account-birthdate-test-20261107.mark-a39.workers.dev');
 const res=await fetch(uri,{method:'GET',headers:{accept:'text/html'},redirect:'error',signal:AbortSignal.timeout(18000)});
 assert.equal(res.status,200,'Approved anonymous page unavailable: '+pathname);
 assert.match(res.headers.get('content-type')||'',/text\/html/i);
 assert.ok(!res.headers.get('set-cookie'),'Refuse any response issuing login/session cookies');
 const source=await res.text();
 assert.ok(source.length>50000,'Unexpectedly short TALERA page: '+pathname);
 return source;
}
const snapshots=[];
for(let pass=0;pass<2;pass++){
 const entries=[];
 for(const route of PAGES)entries.push({route,html:await fetchPublic(route)});
 snapshots.push(entries);
}
const byPass=[];
for(const entries of snapshots){
 const map=new Map();
 for(const {html} of entries){
  for(const c of await candidates(html)){
   const ext=c.kind==='script'?'js':'css',key=c.sha+'.'+ext;
   const before=map.get(key);
   if(before)assert.equal(before.body,c.body,'Asset digest collision');
   else map.set(key,c);
  }
 }
 byPass.push(map);
}
const stable=[...byPass[0]].filter(([key,entry])=>byPass[1].get(key)?.body===entry.body);
assert.ok(stable.length>=3,'Not enough stable public code blocks: refuse unsafe build');
rmSync(STATIC,{recursive:true,force:true});mkdirSync(path.join(STATIC,'__talera_free','assets'),{recursive:true});
mkdirSync(GENERATED,{recursive:true});
// Keep anonymous reference HTML in temporary build output for parity tests only.
for(const {route,html} of snapshots[0]){
 const safe=route.replaceAll('/','_').replace(/^_+/,'');
 writeFileSync(path.join(GENERATED,'reference-'+safe+'.html'),html,'utf8');
}
const approved=[];
for(const [key,{body}] of stable){
 writeFileSync(path.join(STATIC,'__talera_free','assets',key),body,'utf8');
 approved.push(key);
}
const headers='/__talera_free/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n  X-Content-Type-Options: nosniff\n';
writeFileSync(path.join(STATIC,'_headers'),headers);
writeFileSync(path.join(GENERATED,'approved-assets.mjs'),
 '// GENERATED from two public, anonymous snapshots. Never cache personal HTML.\n'+
 'export const approvedAssets = Object.freeze('+JSON.stringify(approved,null,2)+');\n');
const totals={};
for(const {route,html} of snapshots[0]){
 const parts=await candidates(html);
 const approvedSet=new Set(approved);
 const old=Buffer.byteLength(html);
 const saved=parts.filter(c=>approvedSet.has(c.sha+'.'+(c.kind==='script'?'js':'css'))).reduce((n,c)=>n+c.bytes,0);
 totals[route]={originalHtmlBytes:old,allowedSharedSourceBytes:saved,
  approxRemainingHtmlBytesBeforeTagReplacement:old-saved,
  percentSourceMadeShared:Number((100*saved/old).toFixed(2))};
}
const result={
 source:ORIGIN,
 snapshots:2,
 publicRoutes:PAGES,
 approvedImmutableAssets:approved.length,
 distinctApprovedAssetBytes:stable.reduce((n,[,c])=>n+c.bytes,0),
 byRoute:totals,
 privateHtmlAndApiAreNotCacheable:true,
 noLoginDataFetched:true,
 fullTenMillionLoadProven:false,
 note:'This packages only byte-identical anonymous code blocks; actual CDN capacity still needs a staging load test.'
};
writeFileSync(path.join(GENERATED,'build-report.json'),JSON.stringify(result,null,2)+'\n');
console.log('TALERA_FREE_10M_CODE_PACKAGE',JSON.stringify(result,null,2));
