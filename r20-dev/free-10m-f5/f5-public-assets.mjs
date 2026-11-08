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
writeFileSync(path.join(generated,'public-template-map.mjs'),
  '// Generated only from current approved anonymous public TALERA source.\n'+
  'export const referencePages = Object.freeze('+JSON.stringify(refs,null,2)+');\n'+
  'export const verifiedPublicScripts = Object.freeze('+JSON.stringify(scripts,null,2)+');\n');
const report={result:'BUILT (not browser-certified)',source:origin,
  privateDataRequested:false,customerDatabaseTouched:false,
  referencePages:Object.keys(refs),verifiedScriptRoutes:Object.keys(scripts),
  stagingOnly:true,fullFreePwaCertified:false};
writeFileSync(path.join(generated,'f5-build-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('TALERA_F5_PUBLIC_REFERENCE_BUILD',JSON.stringify(report));
