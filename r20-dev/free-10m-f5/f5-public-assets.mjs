// Build F5 private runtime templates from two verified anonymous F1 snapshots.
// No account, cookie, D1, R2 or live private data is fetched.
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const delivery=path.resolve(here,'../free-10m-delivery');
const publicDir=path.join(delivery,'public');
const generated=path.join(here,'generated');
const origin='https://talera-account-birthdate-test-20261107.mark-a39.workers.dev';
const routes={'/mijn-leven':'mijn-leven','/present':'present','/tell':'tell'};
const sha=buf=>createHash('sha256').update(buf).digest('hex');
mkdirSync(generated,{recursive:true});
mkdirSync(path.join(publicDir,'__talera_free','f5references'),{recursive:true});
mkdirSync(path.join(publicDir,'__talera_free','f5scripts'),{recursive:true});
const refs={};
for(const [route,filename] of Object.entries(routes)){
 const html=readFileSync(path.join(delivery,'generated','reference-'+filename+'.html'),'utf8');
 assert.ok(html.length>50000,'Unexpectedly small anonymous reference '+route);
 assert.ok(!/\b(?:talera_sid|set-cookie)\s*=\s*[a-f0-9]{64}/i.test(html),'Refuse session-bearing HTML');
 const hash=sha(html),file=hash+'.html';
 writeFileSync(path.join(publicDir,'__talera_free','f5references',file),html,'utf8');
 refs[route]='/__talera_free/f5references/'+file;
}
// The approved /present page creates a SAME-ORIGIN iframe at
// /vertelmodus-embed?mode=present. Its unchanged zero-based video/audio
// player MUST be present or the RH19 dots advance over a frozen base image.
// Package this public, cookie-free upstream player exactly, not a substitute.
async function fetchApprovedPlayer(mode){
 const u=new URL('/vertelmodus-embed?mode='+mode,origin);
 const r=await fetch(u,{method:'GET',headers:{accept:'text/html'},
   redirect:'error',signal:AbortSignal.timeout(25000)});
 assert.equal(r.status,200,'Approved embedded narrator unavailable: '+mode);
 assert.match(r.headers.get('content-type')||'',/text\/html/i,
   'Original player must be delivered as HTML');
 assert.ok(!r.headers.get('set-cookie'),
   'Refuse embedded player emitting customer session cookies');
 const html=await r.text();
 assert.ok(html.length>12000&&html.length<1_500_000,
   'Unexpected original embed size');
 for(const word of ['taleraZero','READY','INIT','VIDEO','voice','postMessage']){
  assert.ok(html.includes(word),'Missing original zero-player marker: '+word);
 }
 return html;
}
const approvedPlayerA=await fetchApprovedPlayer('present');
const approvedPlayerB=await fetchApprovedPlayer('record');
assert.equal(approvedPlayerA,approvedPlayerB,
  'Approved recording and presentation must use IDENTICAL embedded player');
const approvedPlayerFile=sha(approvedPlayerA)+'.html';
writeFileSync(path.join(publicDir,'__talera_free','f5references',approvedPlayerFile),
  approvedPlayerA,'utf8');
refs['/vertelmodus-embed']='/__talera_free/f5references/'+approvedPlayerFile;
const scripts={};
const paths=[
 '/__clean/menu-integration.mjs',
 '/__clean/ui-integration.mjs',
 '/__clean/share-controller.mjs',
 '/__clean/guest-presentation-v55.js'
];
async function getPublic(name){
 const u=new URL(name,origin);
 assert.equal(u.origin,origin);
 const r=await fetch(u,{headers:{accept:'text/javascript,application/javascript'},
   redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!r.ok)return {status:r.status};
 assert.ok(!r.headers.get('set-cookie'),'Refuse cookie issuing script '+name);
 assert.match(r.headers.get('content-type')||'',/(?:javascript|text\/plain)/i,
   'Expected JavaScript response type '+name);
 const text=await r.text();
 assert.ok(text.length>100&&text.length<2000000,'Unexpected public JavaScript size '+name);
 return {status:200,body:text};
}
for(const name of paths){
 const first=await getPublic(name),second=await getPublic(name);
 // Optional older public scripts are not needed until a real page references them.
 if(first.status===404&&second.status===404)continue;
 assert.equal(first.status,200,'F5 public script must exist: '+name);
 assert.equal(second.status,200,'F5 public script repeat must exist: '+name);
 assert.equal(first.body,second.body,'Unstable/possibly personalized public JS: '+name);
 const ext=name.endsWith('.mjs')?'mjs':'js';
 const filename=sha(first.body)+'.'+ext;
 writeFileSync(path.join(publicDir,'__talera_free','f5scripts',filename),first.body,'utf8');
 scripts[name]='/__talera_free/f5scripts/'+filename;
}
assert.ok(scripts['/__clean/menu-integration.mjs'],
 'Approved account menu script must be present for login UI.');
// Reuse the APPROVED, anonymous installable-PWA shell resources verbatim.
const supportNames=['/sw.js','/manifest.webmanifest','/pwa-192.png',
  '/pwa-512.png','/apple-touch-icon.png','/favicon.png','/talera-brand-v9.svg'];
const support={};
mkdirSync(path.join(publicDir,'__talera_free','f5support'),{recursive:true});
for(const name of supportNames){
 const url=new URL(name,origin);
 async function get(){
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(18000)});
  if(response.status===404)return null;
  assert.equal(response.status,200,'PWA resource unavailable '+name);
  assert.ok(!response.headers.get('set-cookie'),'Never package cookie-bearing PWA resource');
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.length>30&&bytes.length<2_000_000,'PWA file unexpectedly sized '+name);
  return bytes;
 }
 const a=await get(),b=await get();
 if(!a&&!b)continue;
 assert.ok(a&&b&&a.equals(b),'Unstable public PWA resource '+name);
 const ext=name.split('.').pop(),filename=sha(a)+'.'+ext;
 writeFileSync(path.join(publicDir,'__talera_free','f5support',filename),a);
 support[name]='/__talera_free/f5support/'+filename;
}
for(const mandatory of ['/sw.js','/manifest.webmanifest'])
 assert.ok(support[mandatory],'Missing mandatory original PWA resource '+mandatory);
writeFileSync(path.join(generated,'public-template-map.mjs'),
  '// Generated only from current approved anonymous public TALERA source.\n'+
  'export const referencePages = Object.freeze('+JSON.stringify(refs,null,2)+');\n'+
  'export const verifiedPublicScripts = Object.freeze('+JSON.stringify(scripts,null,2)+');\n'+
  'export const verifiedPublicSupport = Object.freeze('+JSON.stringify(support,null,2)+');\n');
const report={result:'BUILT (not browser-certified)',source:origin,
  privateDataRequested:false,customerDatabaseTouched:false,
  referencePages:Object.keys(refs),verifiedScriptRoutes:Object.keys(scripts),
  verifiedPwaSupportRoutes:Object.keys(support),
  stagingOnly:true,fullFreePwaCertified:false};
writeFileSync(path.join(generated,'f5-build-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('TALERA_F5_PUBLIC_REFERENCE_BUILD',JSON.stringify(report));
