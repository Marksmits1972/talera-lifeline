/* TALERA BB63 Safe RESUME after confirmed Core rollback.
 * Reuses the ALREADY VALIDATED new Clean Core version; DOES NOT upload Core
 * source a second time. Only releases V62 once the exact text-module MIME
 * of its 17th embedded module is derived from the current live V62 Worker.
 * --check is READ ONLY; --publish requires separate immutable marker.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const ACCOUNT='6a396704721632d6d1889be48213c3a0';
const CORE='talera-clean-core-staging-20261030';
const V62='talera-pwa-v62-mijn-profiel-20261101';
const V56='talera-pwa-v56-whatsapp-foto-social-20261031';
const API='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT;
const token=process.env.TALERA_BB63_CF_TOKEN||'';
const mode=process.argv[2];
const oldCore='ef484758-391d-4875-999f-34f1a4b78a93';
const newCore='4f972875-8309-4814-9ed7-95c69b6124de';
const oldCoreDeployment='fc2bdbc1-8f64-40ee-8297-ef6617d117f7';
const oldV62='31b38681-ca28-4b12-bde6-22a446ce1337';
const oldV62Deployment='571a86fc-7ed9-45ec-a0fa-1a298e4582f1';
const oldV56='49814a94-b4d3-40fc-b236-0eeca8df53c5';
const oldV56Deployment='83f0a27c-a9ca-4a0c-9d45-1fad5a39587f';
const CORE_PARTS={
 'worker.js':'e765572a78f0b6861f6aad1df6264503c24f8c285b563ce7ba854d974647fd8e',
 'premium-cloud-core-adapter.mjs':'ac7f1a64b900b40392323e0e902b8e928fe32c4d85eae6a0053a8c976d610f58',
 'premium-cloud-pilot.mjs':'11511607b95515983f779883f10171580e7e6835a50c3cda031620db3ed1d7e5',
 'premium-cloud-routes.mjs':'34b666efba93b84c1aa5e672ddaf595192046a9672a11f46b1e92eaa6541966a',
 'premium-multipart-media.mjs':'22f9b2d86a4a7d9b09182806ba740ea3dd0be9b0e1a1df1a43f6bbb779abee28',
 'premium-private-records.mjs':'484369f0fc47c14ff68d897d0a6e06e157b6e9e23d42bc939f38f6c98befb5aa',
 'premium-private-upload.mjs':'e843c53ba76f054e306ee1ac14acc375e6b88d22ebf6dbd9d226290cd7cee0aa',
 'premium-cloud-auth.mjs':'cd480746a65137865ad39515bdce499e20321bb37a2c5fd82de1816d70ba978f',
 'premium-current-version.mjs':'9e10d5166c3e202fa1522943cc8b9a64c0fcf122b2d4f3e6810866cf8fcb3212',
 'premium-current-route.mjs':'06c7727369980964330bc470409c8f426c0fd3d5dcfb71b79558cb26f57fda74'
};
const ALLOWED=new Set([
 'worker.mjs','menu-integration.txt','premium-sync-coordinator.txt',
 'premium-records-bridge.txt','premium-records-coordinator.txt','premium-sync-queue.txt',
 'premium-current-client.txt'
]);
const marker=JSON.parse(readFileSync('releases/bb63-resume-20261103.json','utf8'));
const manifest=JSON.parse(readFileSync('.talera-v62-package/release-inventory.json','utf8'));
const report={checkedAt:new Date().toISOString(),mode,status:'not_checked',
 pinnedCoreNewVersion:newCore,oldCoreVersion:oldCore,oldCoreDeployment,
 oldV62Version:oldV62,oldV62Deployment,existingCoreContentVerified:false,
 coreActivated:false,coreRollbackAttempted:false,coreRollbackConfirmed:false,
 v62Uploaded:false,v62RollbackAttempted:false,v62RollbackConfirmed:false,
 d1SchemaConfirmed:false,newModuleType:null,liveCoreVersion:null,liveV62Version:null};
const hash=x=>createHash('sha256').update(x).digest('hex');
const need=(x,msg)=>{if(!x)throw Error(msg)};
const save=()=>{mkdirSync('.talera-bb63-evidence',{recursive:true});
 writeFileSync('.talera-bb63-evidence/bb63-resume-release.json',JSON.stringify(report,null,2)+'\n')};
const script=name=>'/workers/scripts/'+encodeURIComponent(name);
async function cf(path,{method='GET',body=null}={}){
 const response=await fetch(API+path,{
  method,
  headers:{Authorization:'Bearer '+token,...(
   body instanceof FormData?{}:body?{'content-type':'application/json'}:{})
  },
  body:body instanceof FormData?body:body?JSON.stringify(body):undefined,
  signal:AbortSignal.timeout(30000)
 });
 if(!response.ok){
  // Log only trusted Cloudflare error code and a short sanitized message.
  let error='';
  try{
   const parsed=await response.json();
   error=(parsed?.errors||[]).slice(0,2).map(x=>
    String(x?.code||'unknown')+':'+String(x?.message||'').slice(0,140)
       .replace(/[^a-zA-Z0-9 ._:/,-]/g,'_')).join('|');
  }catch{}
  throw Error('cf_http_'+response.status+'_'+path.split('/').at(-1)+(error?'_'+error:''));
 }
 return response;
}
async function json(path,opts){
 const r=await (await cf(path,opts)).json();
 need(r?.success===true&&r.result,'invalid_cloudflare_api_response');
 return r.result;
}
function active(data){
 const d=Array.isArray(data)?data:data?.deployments;
 need(Array.isArray(d),'deployments_unknown');
 const row=d.slice().sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
 need(row?.id&&row.versions?.length===1&&row.versions[0]?.percentage===100&&row.versions[0]?.version_id,
  'not_single_active_version');
 return {version:row.versions[0].version_id,deployment:row.id};
}
async function state(worker){
 const [settings,deployments]=await Promise.all([
  json(script(worker)+'/settings'),json(script(worker)+'/deployments')
 ]);
 return {settings,active:active(deployments)};
}
function binding(settings,name,type){
 const hits=(settings.bindings||[]).filter(x=>x.name===name&&x.type===type);
 need(hits.length===1,'binding_changed_'+name);return hits[0];
}
function compareSettings(a,b){return JSON.stringify(a?.bindings||[])===JSON.stringify(b?.bindings||[])}
async function content(worker){
 const r=await cf(script(worker)+'/content/v2');
 need(/multipart\/form-data/i.test(r.headers.get('content-type')||''),'not_multipart_'+worker);
 return r.formData();
}
async function readFile(file){need(file&&typeof file.arrayBuffer==='function','module_part_missing');return Buffer.from(await file.arrayBuffer())}
const pkg=name=>readFileSync('.talera-v62-package/'+(name==='worker.mjs'?'worker.js':name));
async function preflight(){
 need(token.length>15,'missing_cloudflare_token');
 need(['--check','--publish'].includes(mode),'invalid_mode');
 need((mode==='--publish'?marker.action==='publish-tested-bb63-resume':
  ['precheck-only','publish-tested-bb63-resume'].includes(marker.action))&&
  marker.core===CORE&&marker.v62===V62,'resume_scope_not_approved');
 if(mode==='--publish')need(marker.reviewedBaseCommit===process.env.BB63_REVIEW_COMMIT,'unreviewed_commit');
 need(manifest.moduleCount===17&&manifest.deploymentAuthorized===false,'wrong_v62_package');
 const [core,v62,v56]=await Promise.all([state(CORE),state(V62),state(V56)]);
 need(core.active.version===oldCore&&core.active.deployment===oldCoreDeployment,'core_rollback_state_changed');
 need(v62.active.version===oldV62&&v62.active.deployment===oldV62Deployment,'v62_baseline_changed');
 need(v56.active.version===oldV56&&v56.active.deployment===oldV56Deployment,'v56_changed');
 need(binding(v62.settings,'V56_BASE','service').service===V56,'v62_binding_wrong');
 need(binding(v56.settings,'CLEAN_CORE','service').service===CORE,'v56_binding_wrong');
 const db=binding(core.settings,'DB','d1');
 binding(core.settings,'PREMIUM_PRIVATE','r2_bucket');
 const dbId=db.id||db.database_id;
 need(/^[a-f0-9-]{36}$/i.test(dbId||''),'core_db_missing');
 const currentSchema=await json('/d1/database/'+dbId+'/query',{
  method:'POST',body:{sql:"PRAGMA table_info('talera_premium_current')"}
 });
 const cols=Array.isArray(currentSchema)?currentSchema[0]?.results:currentSchema?.results;
 need(Array.isArray(cols)&&['account_id','kind','source_key','current_id','revision','updated_at'].every(
  n=>cols.some(x=>x.name===n)),'current_table_missing_or_changed');
 report.d1SchemaConfirmed=true;
 const [coreContent,v62Content]=await Promise.all([content(CORE),content(V62)]);
 need(JSON.stringify([...coreContent.keys()].sort())===JSON.stringify(Object.keys(CORE_PARTS).sort()),
  'latest_core_code_not_10_parts');
 for(const [name,expected] of Object.entries(CORE_PARTS))
  need(hash(await readFile(coreContent.get(name)))===expected,'last_core_source_differs_'+name);
 report.existingCoreContentVerified=true;
 // New Core version was already published and postflight SHA-checked on 3 Nov.
 const ver=await json(script(CORE)+'/versions/'+newCore);
 need(ver?.id===newCore,'validated_core_version_not_found');
 const packageNames=manifest.modules.map(x=>x.module==='worker.js'?'worker.mjs':x.module).sort();
 const oldNames=packageNames.filter(x=>x!=='premium-current-client.txt');
 need(packageNames.length===17&&JSON.stringify([...v62Content.keys()].sort())===JSON.stringify(oldNames),
  'v62_16_part_baseline_invalid');
 for(const name of oldNames){
  const live=await readFile(v62Content.get(name));
  if(hash(live)!==hash(pkg(name))&&!ALLOWED.has(name))throw Error('unexpected_existing_v62_module_'+name);
 }
 // Text modules are data, NOT JavaScript ESM parts. Reuse live proven MIME.
 const example=v62Content.get('premium-sync-coordinator.txt');
 const textMime=example?.type||'';
 need(/^text\/plain(?:;|$)/.test(textMime),'text_module_mime_not_supported_'+textMime);
 report.newModuleType=textMime;
 need(packageNames.includes('premium-current-client.txt'),'client_not_packaged');
 report.status='read_only_resume_precheck_passed';save();
 return {core,v62,v62Content,textMime,packageNames};
}
async function deployExistingVersion(worker,version){
 await json(script(worker)+'/deployments',{method:'POST',body:{
  strategy:'percentage',versions:[{version_id:version,percentage:100}]
 }});
 const current=active(await json(script(worker)+'/deployments'));
 need(current.version===version,'activation_not_confirmed_'+worker);
 return current;
}
async function rollback(worker,version){
 const key=worker===CORE?'core':'v62';
 report[key+'RollbackAttempted']=true;save();
 const state=await deployExistingVersion(worker,version);
 need(state.version===version,'rollback_failed_'+worker);
 report[key+'RollbackConfirmed']=true;save();
}
async function uploadV62(ctx){
 const form=new FormData();
 for(const name of ctx.packageNames){
  const old=ctx.v62Content.get(name);
  const bytes=ALLOWED.has(name)?pkg(name):await readFile(old);
  const type=name==='premium-current-client.txt'?ctx.textMime:old?.type||'application/javascript+module';
  // The last source is a plain-text imported module, not an ESM module.
  need(name!=='premium-current-client.txt'||type===ctx.textMime,'new_client_wrong_mime');
  form.append(name,new Blob([bytes],{type}),name);
 }
 form.append('metadata',JSON.stringify({main_module:'worker.mjs'}));
 const response=await cf(script(V62)+'/content',{method:'PUT',body:form});
 const body=await response.json();
 need(body?.success===true,'v62_upload_unconfirmed');
}
async function verifyV62(ctx){
 const current=await state(V62);
 need(current.active.version!==oldV62&&current.active.deployment!==oldV62Deployment,'v62_not_deployed');
 need(compareSettings(ctx.v62.settings,current.settings),'v62_bindings_changed');
 const form=await content(V62);
 need(JSON.stringify([...form.keys()].sort())===JSON.stringify(ctx.packageNames),'v62_new_part_inventory_mismatch');
 for(const name of ctx.packageNames){
  const data=await readFile(form.get(name));
  need(hash(data)===hash(pkg(name)),'v62_postflight_bad_'+name);
 }
 const host='https://'+V62+'.mark-a39.workers.dev';
 const [entry,menu,newClient]=await Promise.all([
  fetch(host+'/present',{cache:'no-store',signal:AbortSignal.timeout(20000)}),
  fetch(host+'/__clean/menu-integration.mjs',{cache:'no-store',signal:AbortSignal.timeout(20000)}),
  fetch(host+'/__clean/premium-current-client.mjs',{cache:'no-store',signal:AbortSignal.timeout(20000)})
 ]);
 need(entry.status===200&&menu.status===200&&newClient.status===200,'public_v62_entry_not_ready');
 need(hash(Buffer.from(await menu.text()))===hash(pkg('menu-integration.txt')),'live_menu_hash_wrong');
 need(hash(Buffer.from(await newClient.text()))===hash(pkg('premium-current-client.txt')),'live_client_hash_wrong');
 return current.active;
}
let ctx;
try{
 ctx=await preflight();
 if(mode==='--check'){
  report.status='checked_no_writes';save();
  console.log('BB63 resume READ-ONLY PRECHECK PASS; new client text MIME='+report.newModuleType);
 }else{
  report.status='reactivating_reviewed_core_version';save();
  report.coreActivationAttempted=true;save();
  report.liveCoreVersion=(await deployExistingVersion(CORE,newCore)).version;
  report.coreActivated=true;save();
  const running=await state(CORE);
  need(compareSettings(ctx.core.settings,running.settings),'core_bindings_changed');
  const host='https://'+V62+'.mark-a39.workers.dev';
  const authProbe=await fetch(host+'/api/premium/cloud/current?kind=media',{cache:'no-store',
   redirect:'manual',signal:AbortSignal.timeout(20000)});
  need([401,403].includes(authProbe.status),'new_core_auth_guard_not_confirmed_'+authProbe.status);
  report.status='publishing_v62_17_text_modules';save();
  report.v62UploadAttempted=true;save();
  await uploadV62(ctx);
  report.v62Uploaded=true;save();
  report.liveV62Version=(await verifyV62(ctx)).version;
  report.status='published_and_verified';save();
  console.log('BB63 original Core version activated and V62 17 modules verified; real user journey still open.');
 }
}catch(e){
 report.status='failed_'+String(e?.message||'unknown');
 console.log('::error::BB63 resume aborted: '+report.status);
 if(mode==='--publish'&&ctx){
  for(const [worker,old] of [[V62,oldV62],[CORE,oldCore]]){
   try{
    const running=active(await json(script(worker)+'/deployments'));
    if(running.version!==old)await rollback(worker,old);
   }catch(error){
    report.status+=';rollback_unconfirmed_'+worker;
    console.log('::error::Rollback unconfirmed for '+worker+': '+String(error?.message||'unknown'));
   }
  }
 }
 save();process.exitCode=1;
}
