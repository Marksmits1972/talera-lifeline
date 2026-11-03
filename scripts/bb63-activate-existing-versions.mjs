/* BB63 -- activate two EXISTING validated immutable Worker versions.
 * No Worker source upload, no D1 migration, no session/user data, and no
 * new Worker/account. Up to 6 public HTTP checks after activation to tolerate
 * distribution lag. Rollback both Workers if verification never succeeds.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
const ACCOUNT='6a396704721632d6d1889be48213c3a0';
const CORE='talera-clean-core-staging-20261030';
const APP='talera-pwa-v62-mijn-profiel-20261101';
const V56='talera-pwa-v56-whatsapp-foto-social-20261031';
const OLD_CORE='ef484758-391d-4875-999f-34f1a4b78a93';
const NEW_CORE='4f972875-8309-4814-9ed7-95c69b6124de';
const OLD_APP='31b38681-ca28-4b12-bde6-22a446ce1337';
const NEW_APP='37fbe2f6-5250-491d-875a-b37abf39f30a';
const V56_VERSION='49814a94-b4d3-40fc-b236-0eeca8df53c5';
const oldCoreDeploy='06bbe8cc-9a1b-4ae0-8cea-e7cb80b1fc91';
const oldAppDeploy='f6d65b0a-46db-46b1-82e9-544724017b1d';
const MODE=process.argv[2];
const token=process.env.TALERA_BB63_CF_TOKEN||'';
const marker=JSON.parse((await import('node:fs')).readFileSync('releases/bb63-final-activation-20261103.json','utf8'));
const report={mode:MODE,startedAt:new Date().toISOString(),status:'not_started',
  readOnly:MODE==='--check',coreVersionBefore:null,appVersionBefore:null,
  coreVersionAfter:null,appVersionAfter:null,coreChanged:false,appChanged:false,
  appRollbackAttempted:false,coreRollbackAttempted:false,
  appRollbackConfirmed:false,coreRollbackConfirmed:false,
  httpChecks:[],noUserDataReads:true};
const save=()=>{mkdirSync('.talera-bb63-evidence',{recursive:true});
 writeFileSync('.talera-bb63-evidence/bb63-activation-result.json',JSON.stringify(report,null,2)+'\n')};
const need=(value,why)=>{if(!value)throw Error(why)};
const scriptPath=x=>'/workers/scripts/'+encodeURIComponent(x);
async function api(path,{method='GET',body=null}={}){
 const res=await fetch('https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+path,{
  method,headers:{Authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(18000)});
 need(res.ok,'cloudflare_http_'+res.status+'_'+path.split('/').at(-1));
 const data=await res.json();need(data?.success===true&&data?.result,'cloudflare_bad_result');
 return data.result;
}
function current(rows){
 const array=Array.isArray(rows)?rows:rows?.deployments;
 need(Array.isArray(array),'no_deployments');
 const item=array.slice().sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
 need(item?.id&&item.versions?.length===1&&item.versions[0]?.percentage===100,'active_not_single_version');
 return {deployment:item.id,version:item.versions[0].version_id};
}
async function state(worker){
 const [settings,deployments]=await Promise.all([
 api(scriptPath(worker)+'/settings'),api(scriptPath(worker)+'/deployments')]);
 return {settings,current:current(deployments)};
}
function hasService(settings,name,target){
 return settings.bindings?.filter(x=>x.name===name&&x.type==='service'&&x.service===target).length===1;
}
function sameBindings(a,b){return JSON.stringify(a.bindings||[])===JSON.stringify(b.bindings||[])}
async function activate(worker,version){
 await api(scriptPath(worker)+'/deployments',{method:'POST',body:{
  strategy:'percentage',versions:[{version_id:version,percentage:100}]}});
 const s=await state(worker);
 need(s.current.version===version,'activation_wrong_version_'+worker);
 return s;
}
const base='https://'+APP+'.mark-a39.workers.dev';
const paths=['/present','/mijn-leven','/__clean/menu-integration.mjs',
 '/__clean/premium-current-client.mjs','/api/premium/cloud/current?kind=story'];
async function probe(){
 const checked=await Promise.all(paths.map(async path=>{
  const response=await fetch(base+path,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(12000)});
  const bytes=await response.arrayBuffer();
  return {path,status:response.status,bytes:bytes.byteLength,
   contentType:(response.headers.get('content-type')||'').split(';')[0]};
 }));
 report.httpChecks.push(checked);save();
 return checked[0].status===200&&checked[1].status===200&&checked[2].status===200&&
  checked[3].status===200&&[401,403].includes(checked[4].status);
}
async function rollback(worker,version){
 const prefix=worker===CORE?'core':'app';
 report[prefix+'RollbackAttempted']=true;save();
 const s=await activate(worker,version);
 need(s.current.version===version,'rollback_bad_'+worker);
 report[prefix+'RollbackConfirmed']=true;save();
}
let before;
try{
 need(token.length>15,'cloudflare_token_missing');
 need(['--check','--publish'].includes(MODE),'invalid_mode');
 need(marker.core===CORE&&marker.app===APP&&marker.newCore===NEW_CORE&&marker.newApp===NEW_APP,
  'wrong_marker_scope');
 if(MODE==='--publish'){
  need(marker.action==='activate-reviewed-existing-versions'&&marker.releaseAuthorized===true&&
    marker.reviewedBaseCommit===process.env.BB63_REVIEW_COMMIT,'not_authorized');
 }else need(['precheck-only','activate-reviewed-existing-versions'].includes(marker.action),'invalid_marker');
 const [core,app,gateway]=await Promise.all([state(CORE),state(APP),state(V56)]);
 before={core,app,gateway};
 report.coreVersionBefore=core.current.version;report.appVersionBefore=app.current.version;
 need(core.current.version===OLD_CORE&&core.current.deployment===oldCoreDeploy,'core_baseline_changed');
 need(app.current.version===OLD_APP&&app.current.deployment===oldAppDeploy,'app_baseline_changed');
 need(gateway.current.version===V56_VERSION,'v56_version_changed');
 need(hasService(app.settings,'V56_BASE',V56),'app_service_wrong');
 need(hasService(gateway.settings,'CLEAN_CORE',CORE),'gateway_core_wrong');
 need(core.settings.bindings?.some(x=>x.name==='DB'&&x.type==='d1'),'missing_db');
 need(core.settings.bindings?.some(x=>x.name==='PREMIUM_PRIVATE'&&x.type==='r2_bucket'),'missing_private_storage');
 for(const [worker,version] of [[CORE,NEW_CORE],[APP,NEW_APP]]){
  const result=await api(scriptPath(worker)+'/versions/'+version);
  need(result?.id===version,'saved_version_not_available_'+worker);
 }
 if(MODE==='--check'){
  report.status='preflight_read_only_ok';save();console.log('BB63 existing-version activation preflight PASS: no deployment');
 }else{
  report.status='activating_existing_core';save();
  report.coreChanged=true;save();
  const nextCore=await activate(CORE,NEW_CORE);
  need(sameBindings(core.settings,nextCore.settings),'core_bindings_changed');
  report.coreVersionAfter=nextCore.current.version;save();
  report.status='activating_existing_app';save();
  report.appChanged=true;save();
  const nextApp=await activate(APP,NEW_APP);
  need(sameBindings(app.settings,nextApp.settings),'app_bindings_changed');
  report.appVersionAfter=nextApp.current.version;save();
  let passed=false;
  for(let n=0;n<6;n++){
   try{passed=await probe()}catch(error){report.httpChecks.push([{error:String(error?.message||'probe_failed')}]);save()}
   if(passed)break;
   // Give the distributed runtime a short bounded opportunity to converge.
   await new Promise(resolve=>setTimeout(resolve,4000));
  }
  need(passed,'new_app_public_endpoints_failed');
  // Latest active deployment must STILL point to these two reviewed versions.
  const [finalCore,finalApp]=await Promise.all([state(CORE),state(APP)]);
  need(finalCore.current.version===NEW_CORE&&finalApp.current.version===NEW_APP,
   'postflight_deployment_changed');
  report.status='active_both_versions_http_verified';save();
  console.log('BB63 integrated current-version route live: all 5 public/anonymous HTTP checks passed.');
 }
}catch(error){
 report.status='failed_'+String(error?.message||'unknown');
 console.log('::error::BB63 activation stopped: '+report.status);
 if(MODE==='--publish'&&before){
  // A deployment may succeed even if a later request failed; inspect current state.
  for(const [worker,old] of [[APP,OLD_APP],[CORE,OLD_CORE]]){
   try{
    const s=await state(worker);
    if(s.current.version!==old)await rollback(worker,old);
   }catch(err){
    report.status+=';rollback_unconfirmed_'+worker;
    console.log('::error::Rollback not confirmed for '+worker+': '+String(err?.message||'unknown'));
   }
  }
 }
 save();process.exitCode=1;
}
