/* TALERA V62 — only-read public Worker asset drift gate.
 * No credentials, user data, mutations, or Cloudflare API access.
 * Compare the currently served V62 modules to the already checked-out
 * disposable release package. Fail CLOSED if unplanned drift is detected.
 */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const dir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pkg=join(dir,'.talera-v62-package');
const origin='https://talera-pwa-v62-mijn-profiel-20261101.mark-a39.workers.dev';
const digest=x=>createHash('sha256').update(x).digest('hex');
const inventory=JSON.parse(readFileSync(join(pkg,'release-inventory.json'),'utf8'));
if(inventory.deploymentAuthorized!==false||inventory.releaseStatus!=='DRY_RUN_ONLY'||
 inventory.targetForReviewOnly!=='talera-pwa-v62-mijn-profiel-20261101')
 throw Error('invalid_offline_inventory');
const route=(filename)=>{
 if(filename==='menu-integration.txt')return '/__clean/menu-integration.mjs';
 if(filename==='free-backup.txt')return '/__clean/free-backup.js';
 if(filename==='kennisbank.html')return '/kennisbank';
 if(filename==='worker.js')return null; // Cannot fetch confidential Worker source.
 return '/__clean/'+filename.replace(/\.txt$/,'.mjs');
};
const allowedToDiffer=new Set(['menu-integration.txt','premium-cloud-integrity.txt']);
const expectedNew='premium-cloud-integrity.txt';
let unplanned=0;
const rows=[];
for(const entry of inventory.modules){
 if(!/^(?:worker\.js|menu-integration\.txt|kennisbank\.html|free-backup\.txt|premium-[a-z-]+\.txt)$/.test(entry.module))
  throw Error('Unexpected candidate module name');
 const filename=entry.module,endpoint=route(filename);
 const row={module:filename,candidateSha256:entry.sha256,liveSha256:null,
  status:'unavailable',plan:allowedToDiffer.has(filename)?'expected_change':'preserve'};
 if(filename==='worker.js'){row.status='source_not_public';rows.push(row);continue;}
 let response;
 try{
  response=await fetch(origin+endpoint,{method:'GET',redirect:'manual',cache:'no-store',
   headers:{accept:'text/plain'},signal:AbortSignal.timeout(20000)});
 }catch{row.status='request_failed';unplanned++;rows.push(row);continue}
 if(response.status===404&&filename===expectedNew){
  row.status='new_module_not_live';rows.push(row);continue;
 }
 if(response.status!==200){row.status='http_'+response.status;unplanned++;rows.push(row);continue;}
 const type=response.headers.get('content-type')||'';
 if(filename==='kennisbank.html'?!/text\/html/i.test(type):!/text\/javascript/i.test(type)){
  row.status='wrong_content_type';unplanned++;rows.push(row);continue;
 }
 const live=new Uint8Array(await response.arrayBuffer());
 if(live.length>300000){row.status='unexpected_size';unplanned++;rows.push(row);continue}
 row.liveSha256=digest(live);
 if(row.liveSha256===entry.sha256)row.status='same';
 else if(allowedToDiffer.has(filename))row.status='expected_change';
 else {row.status='unplanned_drift';unplanned++}
 rows.push(row);
}
const result={target:origin,source:'public_READ_ONLY_gets',createdAt:new Date().toISOString(),
 expectedLiveModuleCount:rows.length-1,reviewRequired:true,
 noCredentialsUsed:true,noDeployment:true,unplannedDrift:unplanned,
 rows};
const out=join(pkg,'live-drift-report.json');
writeFileSync(out,JSON.stringify(result,null,2)+'\n');
for(const r of rows)console.log(r.module+': '+r.status);
console.log('Unplanned module differences: '+unplanned);
if(unplanned)throw Error('V62 live drift: deployment is blocked until manually reconciled');
console.log('Existing publicly-served modules match GitHub except planned V62 changes. Not a deployment authorization.');
