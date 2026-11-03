/* TALERA V62: OFFLINE release-package preflight.
 * Creates a disposable compile-only package from reviewed GitHub sources.
 * It never opens user storage, contacts Cloudflare or deploys a Worker.
 */
import {readFileSync,writeFileSync,mkdirSync,cpSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,dirname,basename,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const src=join(root,'src/mijn-talera'),output=join(root,'.talera-v62-package');
const target='talera-pwa-v62-mijn-profiel-20261101';
const sha=x=>createHash('sha256').update(x).digest('hex');
const worker=readFileSync(join(src,'worker.js'),'utf8');
const imported=[...worker.matchAll(/^import\s+\w+\s+from\s+["']\.\/([^"']+)["'];/gm)].map(x=>x[1]);
if(imported.length<15||new Set(imported).size!==imported.length)
 throw Error('V62 canonical Worker import inventory is incomplete or duplicated');
const required=['menu-integration.txt','kennisbank.html','free-backup.txt',
 'premium-sync-coordinator.txt','premium-sync-queue.txt','premium-indexeddb-bridge.txt',
 'premium-records-bridge.txt','premium-records-coordinator.txt','premium-sync-audit.txt',
 'premium-large-media.txt','premium-restore-verifier.txt','premium-cloud-restore-preview.txt',
 'premium-cloud-restore-atomic.txt','premium-restore-stage.txt','premium-cloud-integrity.txt'];
if(required.some(x=>!imported.includes(x))||imported.some(x=>!required.includes(x)))
 throw Error('V62 package imports differ from known canonical module set');
if(!worker.includes('"/__clean/premium-cloud-integrity.mjs":cloudIntegritySource'))
 throw Error('Cloud-only integrity route missing');
if(!worker.includes('V56_BASE'))throw Error('Existing V56 service boundary missing');
const menu=readFileSync(join(src,'menu-integration.txt'),'utf8');
for(const expected of ["TALERA Free + Premium-testtoegang","premium-cloud-integrity",
 "cloudIntegrity?.cloudBytesVerified!==true","Geen eigen Free-herinneringen in deze browser"])
 if(!menu.includes(expected))throw Error('V62 guard missing: '+expected);
if(existsSync(output))throw Error('Disposable release directory already exists. Refusing to replace it.');
mkdirSync(output,{recursive:false});
const files=[{target:'worker.js',source:'worker.js',text:worker}];
for(const name of imported){
 const live=join(src,name),development=join(src,name.replace(/\.txt$/,'.mjs'));
 const hasLive=existsSync(live),hasDev=existsSync(development);
 if(!hasLive&&!hasDev)throw Error('Missing V62 module: '+name);
 const file=hasLive?live:development,text=readFileSync(file,'utf8');
 if(text.length<20)throw Error('Unexpected empty module: '+name);
 if(hasLive&&hasDev&&readFileSync(development,'utf8')!==text)
  throw Error('Worker-served module and original differ: '+name);
 files.push({target:name,source:basename(file),text});
}
const metadata=files.map(x=>({module:x.target,source:x.source,bytes:Buffer.byteLength(x.text),sha256:sha(x.text)}));
const modulesDir=output;
for(const item of files)writeFileSync(join(modulesDir,item.target),item.text,'utf8');
const config={
 name:'talera-v62-offline-compile-only',
 main:'./worker.js',
 compatibility_date:'2026-10-30',
 workers_dev:false,
 rules:[{type:'Text',globs:['**/*.txt','**/*.html'],fallthrough:false}]
};
// This config has deliberately NO live service bindings, no account ID,
// no secrets and a non-production worker name. NEVER publish it.
writeFileSync(join(output,'wrangler.dry-run.json'),JSON.stringify(config,null,2)+'\n');
writeFileSync(join(output,'release-inventory.json'),JSON.stringify({
 targetForReviewOnly:target,
 deploymentAuthorized:false,
 liveVersionBackedUp:false,
 releaseStatus:'DRY_RUN_ONLY',
 moduleCount:files.length,
 modules:metadata
},null,2)+'\n');
console.log('V62 source package checked: '+files.length+' modules. No deployment.');
console.log('Missing .txt sources are filled from reviewed .mjs files in disposable package only.');
console.log('SHA-256 manifest: .talera-v62-package/release-inventory.json');
