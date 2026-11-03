/* BB63-101. Strictly scoped V62 menu-only release.
 * Triggered only by a separate immutable GitHub release-marker commit.
 * Never reads account data, D1, R2, browser storage or user records.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const ACCOUNT='6a396704721632d6d1889be48213c3a0';
const WORKER='talera-pwa-v62-mijn-profiel-20261101';
const BASE='41071641ca1edc02a9aa396cb9cb9a78fdfba0ed';
const ENDPOINT='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/workers/scripts/'+WORKER;
const SITE='https://'+WORKER+'.mark-a39.workers.dev';
const mode=process.argv[2];
const token=process.env.TALERA_V62_CF_TOKEN||'';
const file='releases/bb63-origin-diagnosis-20261103.json';
const approval=JSON.parse(readFileSync(file,'utf8'));
const pack=JSON.parse(readFileSync('.talera-v62-package/release-inventory.json','utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
const assert=(ok,reason)=>{if(!ok)throw Error(reason)};
const entries=pack.modules.map(x=>x.module==='worker.js'?'worker.mjs':x.module).sort();
const expectedMenu=readFileSync('.talera-v62-package/menu-integration.txt');
const expectedWorker=readFileSync('.talera-v62-package/worker.js');
const originalMenu=execFileSync('git',['show',BASE+':src/mijn-talera/menu-integration.txt'],{maxBuffer:2*1024*1024});
const report={target:WORKER,mode,createdAt:new Date().toISOString(),readOnly:mode==='--check',
 versionBefore:null,deploymentBefore:null,versionAfter:null,deploymentAfter:null,
 attempted:false,published:false,rollbackAttempted:false,rollbackConfirmed:false,
 menuSha256:sha(expectedMenu),status:'unverified'};
const save=()=>writeFileSync('.talera-v62-package/bb63-menu-release-result.json',JSON.stringify(report,null,2)+'\n');
assert(['--check','--publish'].includes(mode),'invalid_mode');
assert(token.length>10,'cloudflare_token_not_available');
assert(approval.action==='publish-menu-diagnostics-only'&&approval.target===WORKER,'wrong_release_scope');
assert(approval.reviewedBaseCommit&&/^[a-f0-9]{40}$/.test(approval.reviewedBaseCommit),'invalid_reviewed_base_commit');
assert(approval.canonicalSourceCommit===BASE,'source_anchor_mismatch');
assert(approval.reviewedBaseCommit===process.env.BB63_REVIEWED_BASE_COMMIT,'unreviewed_source_commit');
assert(sha(originalMenu)!==sha(expectedMenu),'menu_source_not_changed');
assert(approval.expectedVersionId&&approval.expectedDeploymentId,'missing_pinned_live_version');
assert(pack.targetForReviewOnly===WORKER&&pack.moduleCount===16&&pack.deploymentAuthorized===false,'wrong_offline_package');
assert(entries.length===16&&entries.includes('worker.mjs')&&entries.includes('menu-integration.txt'),'unexpected_module_inventory');
assert(!originalMenu.equals(expectedMenu),'diagnostic_menu_not_changed');
assert(expectedMenu.toString('utf8').includes("if(taleraDiagnoseMode)return;"),'auto_sync_guard_missing');
assert(expectedMenu.toString('utf8').includes("const tx=db.transaction(['stories','files'],'readonly')"),'readonly_count_guard_missing');
async function request(path,{method='GET',body=null}={}){
 const response=await fetch(ENDPOINT+path,{
  method,headers:{Authorization:'Bearer '+token,...(body instanceof FormData?{}:body?{'content-type':'application/json'}:{})},
  body:body instanceof FormData?body:body?JSON.stringify(body):undefined,
  signal:AbortSignal.timeout(30000)
 });
 assert(response.ok,'cloudflare_'+method.toLowerCase()+'_http_'+response.status);
 return response;
}
async function json(path,options){
 const response=await request(path,options),value=await response.json();
 assert(value?.success===true&&value.result,'cloudflare_api_rejected');
 return value.result;
}
const deployments=result=>{
 const a=Array.isArray(result)?result:result?.deployments;
 assert(Array.isArray(a),'cloudflare_deployments_missing');
 return [...a].sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0));
};
const active=rows=>{
 const row=rows[0];
 assert(row?.id&&row.versions?.length===1&&row.versions[0]?.percentage===100&&row.versions[0]?.version_id,
  'active_worker_is_not_single_version');
 return {deployment:row.id,version:row.versions[0].version_id};
};
async function verifyLive(){
 const [settings,history,response]=await Promise.all([json('/settings'),json('/deployments'),request('/content/v2')]);
 const binds=settings?.bindings||[];
 assert(binds.length===1&&binds[0]?.type==='service'&&binds[0]?.name==='V56_BASE'&&
  typeof binds[0].service==='string'&&binds[0].service,'v56_base_binding_incorrect');
 const running=active(deployments(history));
 assert(running.deployment===approval.expectedDeploymentId&&
        running.version===approval.expectedVersionId,'active_deployment_changed_stop');
 const form=await response.formData();
 assert(JSON.stringify([...form.keys()].sort())===JSON.stringify(entries),'worker_part_inventory_changed_stop');
 for(const name of entries){
  const part=form.get(name);
  assert(part&&typeof part.arrayBuffer==='function','worker_part_missing_'+name);
  const bytes=Buffer.from(await part.arrayBuffer());
  const old=name==='menu-integration.txt'?originalMenu:
    name==='worker.mjs'?expectedWorker:
    readFileSync('.talera-v62-package/'+name);
  assert(sha(bytes)===sha(old),'live_part_changed_'+name);
 }
 return {form,running};
}
async function postflight(previous){
 const [settings,history,response]=await Promise.all([json('/settings'),json('/deployments'),request('/content/v2')]);
 const binds=settings?.bindings||[];
 assert(binds.length===1&&binds[0]?.name==='V56_BASE'&&binds[0]?.type==='service','binding_changed_after_release');
 const now=active(deployments(history));
 assert(now.version!==previous.running.version&&now.deployment!==previous.running.deployment,'new_deployment_not_active');
 const form=await response.formData();
 assert(JSON.stringify([...form.keys()].sort())===JSON.stringify(entries),'postflight_inventory_changed');
 for(const name of entries){
  const payload=form.get(name);
  assert(payload&&typeof payload.arrayBuffer==='function','missing_live_part_'+name);
  const bytes=Buffer.from(await payload.arrayBuffer());
  const expected=name==='worker.mjs'?expectedWorker:readFileSync('.talera-v62-package/'+name);
  assert(sha(bytes)===sha(expected),'postflight_content_mismatch_'+name);
 }
 const [present,home,menu]=await Promise.all([
  fetch(SITE+'/present',{cache:'no-store',signal:AbortSignal.timeout(20000)}),
  fetch(SITE+'/mijn-leven',{cache:'no-store',signal:AbortSignal.timeout(20000)}),
  fetch(SITE+'/__clean/menu-integration.mjs',{cache:'no-store',signal:AbortSignal.timeout(20000)})
 ]);
 assert(present.status===200&&home.status===200&&menu.status===200,'live_http_entry_failed');
 const [presentHtml,homeHtml,menuText]=await Promise.all([present.text(),home.text(),menu.text()]);
 assert(presentHtml.includes('/__clean/menu-integration.mjs?v=')&&
  homeHtml.includes('/__clean/menu-integration.mjs?v='),'missing_versioned_menu_entry');
 assert(sha(Buffer.from(menuText))===sha(expectedMenu),'public_menu_has_wrong_hash');
 report.versionAfter=now.version;
 report.deploymentAfter=now.deployment;
 report.status='published_and_verified';
 save();
}
async function restoreOld(){
 report.rollbackAttempted=true;save();
 await json('/deployments',{method:'POST',body:{
  strategy:'percentage',versions:[{version_id:approval.expectedVersionId,percentage:100}]
 }});
 const now=active(deployments(await json('/deployments')));
 assert(now.version===approval.expectedVersionId,'rollback_not_confirmed');
 report.rollbackConfirmed=true;save();
}
try{
 const before=await verifyLive();
 report.versionBefore=before.running.version;
 report.deploymentBefore=before.running.deployment;
 report.status='read_only_preflight_verified';save();
 if(mode==='--publish'){
  const form=new FormData();
  for(const name of entries){
   const current=before.form.get(name);
   const type=current.type|| (name==='worker.mjs'?'application/javascript+module':'text/plain');
   const part=name==='menu-integration.txt'?new Blob([expectedMenu],{type}):current;
   form.append(name,part,name);
  }
  form.append('metadata',JSON.stringify({main_module:'worker.mjs'}));
  report.attempted=true;save();
  const resp=await request('/content',{method:'PUT',body:form});
  const responseBody=await resp.json();
  assert(responseBody?.success===true,'cloudflare_upload_not_confirmed');
  report.published=true;save();
  await postflight(before);
 }
 console.log('BB63 V62 menu '+report.status+'; published='+report.published+'; target='+WORKER);
}catch(e){
 report.status=e?.message||'release_error';
 console.error('::error::BB63 menu release safely stopped: '+report.status);
 if(report.attempted){
  try{
   const now=active(deployments(await json('/deployments')));
   if(now.version!==approval.expectedVersionId)await restoreOld();
  }catch(error){console.error('::error::Could not verify or restore prior deployment: '+(error?.message||'unknown'))}
 }
 save();process.exitCode=1;
}
