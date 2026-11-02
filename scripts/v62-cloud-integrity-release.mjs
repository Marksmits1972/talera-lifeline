/* TALERA V62 targeted Worker content release.
 * Only invoked by explicitly gated release request in GitHub Actions.
 * Existing Worker settings/bindings preserved; no personal data endpoints.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const ACCOUNT='6a396704721632d6d1889be48213c3a0';
const TARGET='talera-pwa-v62-mijn-profiel-20261101';
const ORIGIN='https://'+TARGET+'.mark-a39.workers.dev';
const API='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/workers/scripts/'+TARGET;
const token=process.env.TALERA_V62_CF_TOKEN||'';
const action=process.argv[2];
const req=JSON.parse(readFileSync('releases/v62-cloud-integrity-20261102.json','utf8'));
const pack=JSON.parse(readFileSync('.talera-v62-package/release-inventory.json','utf8'));
const report={target:TARGET,action,started:new Date().toISOString(),
 attempted:false,published:false,rollbackAttempted:false,rollbackSucceeded:false,
 oldDeploymentId:null,newDeploymentId:null,reason:null};
const digest=x=>createHash('sha256').update(x).digest('hex');
function fail(code){throw Error(code)}
function check(condition,code){if(!condition)fail(code)}
function save(){
 writeFileSync('.talera-v62-package/v62-release-result.json',JSON.stringify(report,null,2)+'\n');
}
check(['--check','--publish'].includes(action),'invalid_action');
check(token.length>10,'cloudflare_secret_unavailable');
check(req?.target===TARGET&&req?.action==='publish-cloud-integrity-only','invalid_release_request');
check(/^[a-f0-9]{40}$/.test(req.reviewedBaseCommit||''),'invalid_reviewed_commit');
check(/^[a-f0-9-]{36}$/.test(req.expectedDeploymentId||''),'missing_expected_deployment');
check(/^[a-f0-9-]{36}$/.test(req.expectedVersionId||''),'missing_expected_version');
check(pack.targetForReviewOnly===TARGET&&pack.deploymentAuthorized===false&&pack.moduleCount===16,
 'not_verified_release_package');
const expectedNames=pack.modules.map(x=>x.module==='worker.js'?'worker.mjs':x.module).sort();
const oldNames=expectedNames.filter(x=>x!=='premium-cloud-integrity.txt');
async function cf(path,{method='GET',body=null}={}){
 const response=await fetch(API+path,{method,headers:{
  Authorization:'Bearer '+token,...(body instanceof FormData?{}:body?{'content-type':'application/json'}:{})
 },body:body instanceof FormData?body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
 if(!response.ok)fail('cloudflare_'+method.toLowerCase()+'_http_'+response.status);
 return response;
}
async function json(path,opts){
 const response=await cf(path,opts),data=await response.json();
 if(data?.success!==true||!data.result)fail('cloudflare_json_error');
 return data.result;
}
function deployments(result){
 const a=Array.isArray(result)?result:result?.deployments;
 check(Array.isArray(a),'invalid_deployment_list');
 return [...a].sort((x,y)=>Date.parse(y.created_on||0)-Date.parse(x.created_on||0));
}
function head(deploys){
 const first=deploys[0];
 check(first?.id&&first.versions?.length===1&&first.versions[0]?.percentage===100,
  'invalid_active_deployment');
 return {id:first.id,version:first.versions[0].version_id};
}
async function current(){
 const [settings,deploy,content]=await Promise.all([
  json('/settings'),json('/deployments'),cf('/content/v2')
 ]);
 const list=deployments(deploy),present=head(list);
 const bindings=Array.isArray(settings.bindings)?settings.bindings:[];
 check(bindings.length===1&&bindings[0]?.name==='V56_BASE'&&
  bindings[0]?.type==='service'&&typeof bindings[0].service==='string',
  'v56_binding_changed');
 check(present.id===req.expectedDeploymentId&&present.version===req.expectedVersionId,
  'active_worker_changed_since_approval');
 const form=await content.formData();
 const names=[...form.keys()].sort();
 check(JSON.stringify(names)===JSON.stringify(oldNames),'live_worker_parts_changed');
 const original=await form.get('worker.mjs').text();
 const candidate=readFileSync('.talera-v62-package/worker.js','utf8');
 const expectedOld=candidate
  .replace('import cloudIntegritySource from "./premium-cloud-integrity.txt";\n','')
  .replace('        "/__clean/premium-cloud-integrity.mjs":cloudIntegritySource,\n','');
 check(expectedOld!==candidate&&digest(original)===digest(expectedOld),'live_worker_main_changed');
 for(const name of oldNames.filter(n=>!['worker.mjs','menu-integration.txt'].includes(n))){
  const live=await form.get(name).arrayBuffer();
  const targetName=name;
  const candidateContent=readFileSync('.talera-v62-package/'+targetName);
  check(digest(Buffer.from(live))===digest(candidateContent),'unexpected_module_drift_'+name);
 }
 return {form,settings,list,present,candidate};
}
async function publish(snapshot){
 const next=new FormData();
 // Keep all old multipart parts byte-for-byte except canonical main/menu.
 for(const name of oldNames){
  let file=snapshot.form.get(name);
  const mime=file.type|| (name==='worker.mjs'?'application/javascript+module':'text/plain');
  if(name==='worker.mjs')file=new Blob([snapshot.candidate],{type:mime});
  else if(name==='menu-integration.txt')file=new Blob([
   readFileSync('.talera-v62-package/menu-integration.txt')
  ],{type:mime});
  next.append(name,file,name);
 }
 next.append('premium-cloud-integrity.txt',new Blob([
  readFileSync('.talera-v62-package/premium-cloud-integrity.txt')
 ],{type:'text/plain'}),'premium-cloud-integrity.txt');
 next.append('metadata',JSON.stringify({main_module:'worker.mjs'}));
 report.attempted=true;save();
 const response=await cf('/content',{method:'PUT',body:next});
 const jsonResponse=await response.json();
 if(jsonResponse?.success!==true)fail('content_upload_rejected');
 report.published=true;save();
 // Check exact active settings, module hashes and public safe feature routes.
 const [settings,deployed,content]=await Promise.all([
  json('/settings'),json('/deployments'),cf('/content/v2')
 ]);
 check(settings.bindings?.length===1&&settings.bindings[0]?.name==='V56_BASE'&&
  settings.bindings[0]?.type==='service','v56_binding_lost');
 const after=head(deployments(deployed));
 check(after.version!==req.expectedVersionId,'new_worker_version_not_active');
 report.newDeploymentId=after.id;
 const form=await content.formData();
 const names=[...form.keys()].sort();
 check(JSON.stringify(names)===JSON.stringify(expectedNames),'postflight_module_count_invalid');
 for(const name of expectedNames){
  const file=form.get(name),contents=Buffer.from(await file.arrayBuffer());
  const expected=readFileSync('.talera-v62-package/'+(name==='worker.mjs'?'worker.js':name));
  check(digest(contents)===digest(expected),'postflight_module_mismatch_'+name);
 }
 // Public checks only: never touch account-specific cloud contents or Free data.
 const [present,home,newModule]=await Promise.all([
  fetch(ORIGIN+'/present',{cache:'no-store'}),
  fetch(ORIGIN+'/mijn-leven',{cache:'no-store'}),
  fetch(ORIGIN+'/__clean/premium-cloud-integrity.mjs',{cache:'no-store'})
 ]);
 check(present.status===200&&home.status===200&&newModule.status===200,
  'public_routes_not_ready');
 const [html,homeHtml,mod]=await Promise.all([present.text(),home.text(),newModule.text()]);
 check(html.includes('menu-integration.mjs?v=')&&homeHtml.includes('menu-integration.mjs?v=')&&
  mod.includes('verifyPremiumCloudBytesReadOnly'),'public_release_content_missing');
 report.reason='published_and_verified';save();
}
async function rollback(){
 report.rollbackAttempted=true;save();
 const result=await json('/deployments',{method:'POST',body:{
  strategy:'percentage',versions:[{version_id:req.expectedVersionId,percentage:100}]
 }});
 report.rollbackSucceeded=!!result;save();
}
try{
 const state=await current();
 report.oldDeploymentId=state.present.id;
 report.reason='preflight_verified';
 save();
 if(action==='--publish')await publish(state);
 console.log('V62 targeted release '+report.reason+'; live published='+report.published+
  '; release target='+TARGET);
}catch(error){
 report.reason=error?.message||'unexpected_error';
 console.error('::error::V62 targeted release halted: '+report.reason);
 if(report.published){
  try{await rollback();console.error('::warning::Rollback to previously reviewed Worker version requested.')}
  catch(e){console.error('::error::Automatic rollback failed: '+(e?.message||'unknown'))}
 }
 save();
 process.exitCode=1;
}
