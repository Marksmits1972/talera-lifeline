/* BB63 — scoped integrated current memory release to EXISTING Clean Core + V62.
 * --check: live metadata and source attestation + compile-only package, no writes.
 * --publish: additive D1 current table, release Core, then V62, rollback on
 * failure. Never deploy from the repository's default wrangler.jsonc.
 * Never read user records, download personal media or log secrets.
 */
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
const ACCOUNT='6a396704721632d6d1889be48213c3a0';
const CORE='talera-clean-core-staging-20261030';
const V62='talera-pwa-v62-mijn-profiel-20261101';
const V56='talera-pwa-v56-whatsapp-foto-social-20261031';
const BASE='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT;
const SOURCE_REF='f93a1109ded45a57b050320364a97c423ea15b91';
const PIN={
 [CORE]:{deployment:'e2170b3d-5836-498b-9ec1-ae510b0c834a',version:'ef484758-391d-4875-999f-34f1a4b78a93'},
 [V62]:{deployment:'571a86fc-7ed9-45ec-a0fa-1a298e4582f1',version:'31b38681-ca28-4b12-bde6-22a446ce1337'},
 [V56]:{deployment:'83f0a27c-a9ca-4a0c-9d45-1fad5a39587f',version:'49814a94-b4d3-40fc-b236-0eeca8df53c5'}
};
const CORE_OLD={
 'worker.js':'e765572a78f0b6861f6aad1df6264503c24f8c285b563ce7ba854d974647fd8e',
 'premium-cloud-core-adapter.mjs':'ac7f1a64b900b40392323e0e902b8e928fe32c4d85eae6a0053a8c976d610f58',
 'premium-cloud-pilot.mjs':'11511607b95515983f779883f10171580e7e6835a50c3cda031620db3ed1d7e5',
 'premium-cloud-routes.mjs':'574920146a0c7943b46be60b04c42531852f10522be71d4effa469622b77dd01',
 'premium-multipart-media.mjs':'22f9b2d86a4a7d9b09182806ba740ea3dd0be9b0e1a1df1a43f6bbb779abee28',
 'premium-private-records.mjs':'01980fcce9d9a3ac6b1c4f96eda55d0449f9b8c673801eca772a474a0b596e02',
 'premium-private-upload.mjs':'e843c53ba76f054e306ee1ac14acc375e6b88d22ebf6dbd9d226290cd7cee0aa',
 'premium-cloud-auth.mjs':'cd480746a65137865ad39515bdce499e20321bb37a2c5fd82de1816d70ba978f'
};
const CORE_CHANGED=['premium-cloud-routes.mjs','premium-private-records.mjs'];
const CORE_ADDED=['premium-current-route.mjs','premium-current-version.mjs'];
const V62_ALLOWED_CHANGE=new Set([
 'worker.mjs','menu-integration.txt','premium-sync-coordinator.txt',
 'premium-records-bridge.txt','premium-records-coordinator.txt',
 'premium-sync-queue.txt','premium-current-client.txt'
]);
const mode=process.argv[2],token=process.env.TALERA_BB63_CF_TOKEN||'';
const release=JSON.parse(readFileSync('releases/bb63-current-sync-20261103.json','utf8'));
const packageDir='.talera-v62-package';
const evidenceDir='.talera-bb63-evidence';
const report={operation:mode,at:new Date().toISOString(),status:'not_started',
 coreTarget:CORE,v62Target:V62,d1SchemaBefore:null,d1SchemaAfter:null,
 dbIdSha256:null,corePublished:false,v62Published:false,
 coreRollbackAttempted:false,v62RollbackAttempted:false,
 coreRollbackConfirmed:false,v62RollbackConfirmed:false,
 previousCore:PIN[CORE],previousV62:PIN[V62],
 currentCore:null,currentV62:null,artifactIsSanitized:true};
const sha=x=>createHash('sha256').update(x).digest('hex');
const need=(x,reason)=>{if(!x)throw Error(reason)};
const save=()=>{mkdirSync(evidenceDir,{recursive:true});writeFileSync(
 join(evidenceDir,'bb63-current-sync-release.json'),JSON.stringify(report,null,2)+'\n')};
const sPath=name=>'/workers/scripts/'+encodeURIComponent(name);
async function cf(endpoint,{method='GET',body=null}={}){
 const response=await fetch(BASE+endpoint,{
  method,headers:{Authorization:'Bearer '+token,...(
   body instanceof FormData?{}:body?{'content-type':'application/json'}:{})
  },body:body instanceof FormData?body:body?JSON.stringify(body):undefined,
  signal:AbortSignal.timeout(30000)
 });
 need(response.ok,'cf_http_'+response.status+'_'+endpoint.split('/').at(-1));
 return response;
}
async function json(endpoint,options){
 const data=await (await cf(endpoint,options)).json();
 need(data?.success===true&&data.result,'cf_invalid_response');
 return data.result;
}
function active(list){
 const records=Array.isArray(list)?list:list?.deployments;
 need(Array.isArray(records),'missing_deployments');
 const rows=records.slice().sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0));
 const head=rows[0];
 need(head?.id&&head.versions?.length===1&&head.versions[0]?.percentage===100&&
  head.versions[0]?.version_id,'active_deployment_not_single');
 return {deployment:head.id,version:head.versions[0].version_id};
}
async function state(worker){
 const base=sPath(worker);
 const [settings,history]=await Promise.all([json(base+'/settings'),json(base+'/deployments')]);
 return {settings,active:active(history)};
}
function bindingsByName(settings,name,type){
 const matching=(settings?.bindings||[]).filter(x=>x.name===name&&x.type===type);
 need(matching.length===1,'missing_binding_'+name);
 return matching[0];
}
const compareBindings=(before,after)=>
 JSON.stringify(before?.bindings||[])===JSON.stringify(after?.bindings||[]);
async function parts(worker){
 const response=await cf(sPath(worker)+'/content/v2');
 need(/multipart\/form-data/i.test(response.headers.get('content-type')||''),'not_multipart_'+worker);
 return response.formData();
}
const names=form=>[...form.keys()].sort();
async function buffer(part){need(part&&typeof part.arrayBuffer==='function','bad_module_part');return Buffer.from(await part.arrayBuffer())}
function assertPin(worker,s){need(s.active.version===PIN[worker].version&&s.active.deployment===PIN[worker].deployment,
 'unexpected_worker_change_'+worker)}
function sourceCore(name){return readFileSync('src/core/'+name)}
function makePackage(liveCore){
 const output=join(evidenceDir,'core-package');mkdirSync(output,{recursive:true});
 const all=[...Object.keys(CORE_OLD),...CORE_ADDED].sort();
 for(const name of all){
  const source=CORE_CHANGED.includes(name)||CORE_ADDED.includes(name)?
    sourceCore(name):null;
  // Actual untouched Cloudflare modules must be the source of truth.
  const payload=source||liveCore._buffers.get(name);
  need(Buffer.isBuffer(payload),'core_module_missing_'+name);
  writeFileSync(join(output,name),payload);
 }
 writeFileSync(join(output,'wrangler.dry-run.json'),JSON.stringify({
  name:'talera-bb63-core-offline-compile-only',main:'./worker.js',
  compatibility_date:'2026-10-30',workers_dev:false
 },null,2)+'\n');
 return output;
}
const manifest=JSON.parse(readFileSync(packageDir+'/release-inventory.json','utf8'));
function packageV62(name){return readFileSync(packageDir+'/'+(name==='worker.mjs'?'worker.js':name))}
async function preflight(){
 need(token.length>15,'cloudflare_secret_missing');
 need(['--check','--publish'].includes(mode),'invalid_mode');
 need(release.action==='publish-bb63-current-sync-v1'&&release.coreTarget===CORE&&release.v62Target===V62,
  'unauthorized_target');
 need(release.reviewedBaseCommit===process.env.BB63_REVIEW_COMMIT,'review_commit_mismatch');
 need(release.canonicalBase===SOURCE_REF,'release_source_anchor_wrong');
 need(manifest.moduleCount===17&&manifest.targetForReviewOnly===V62&&manifest.deploymentAuthorized===false,
  'offline_v62_package_wrong');
 const [core,v62,v56]=await Promise.all([state(CORE),state(V62),state(V56)]);
 for(const [worker,s] of [[CORE,core],[V62,v62],[V56,v56]])assertPin(worker,s);
 need(bindingsByName(v62.settings,'V56_BASE','service').service===V56,'v62_service_changed');
 need(bindingsByName(v56.settings,'CLEAN_CORE','service').service===CORE,'v56_service_changed');
 const db=bindingsByName(core.settings,'DB','d1');
 bindingsByName(core.settings,'PREMIUM_PRIVATE','r2_bucket');
 bindingsByName(core.settings,'PREMIUM_MEDIA','r2_bucket');
 const dbId=db.id||db.database_id;
 need(/^[a-f0-9-]{36}$/i.test(dbId||''),'core_db_id_missing');
 report.dbIdSha256=sha(dbId);
 const [coreLive,v62Live]=await Promise.all([parts(CORE),parts(V62)]);
 need(JSON.stringify(names(coreLive))===JSON.stringify(Object.keys(CORE_OLD).sort()),
  'core_live_inventory_changed');
 const coreBytes=new Map();
 for(const name of names(coreLive)){
  const bytes=await buffer(coreLive.get(name));
  need(sha(bytes)===CORE_OLD[name],'core_live_part_changed_'+name);
  coreBytes.set(name,bytes);
 }
 coreLive._buffers=coreBytes;
 const normalized=s=>s.replace(/\r\n/g,'\n').trimEnd();
 for(const name of CORE_CHANGED){
  const old=execFileSync('git',['show',SOURCE_REF+':src/core/'+name],{encoding:'utf8'});
  need(normalized(old)===normalized(coreBytes.get(name).toString('utf8')),
    'core_review_baseline_mismatch_'+name);
 }
 const wantedNames=manifest.modules.map(m=>m.module==='worker.js'?'worker.mjs':m.module).sort();
 need(wantedNames.length===17&&wantedNames.includes('premium-current-client.txt'),
  'new_browser_part_missing');
 need(JSON.stringify(names(v62Live))===JSON.stringify(wantedNames.filter(n=>n!=='premium-current-client.txt')),
  'v62_existing_inventory_changed');
 let actualChanged=[];
 for(const name of names(v62Live)){
  const bytes=await buffer(v62Live.get(name));
  if(sha(bytes)!==sha(packageV62(name)))actualChanged.push(name);
  if(sha(bytes)!==sha(packageV62(name))&&!V62_ALLOWED_CHANGE.has(name))
   throw Error('unexpected_v62_drift_'+name);
 }
 need(actualChanged.includes('worker.mjs')&&actualChanged.includes('menu-integration.txt'),
  'release_does_not_update_worker_and_menu');
 const dbPath='/d1/database/'+dbId+'/query';
 async function d1(sql){
  const data=await json(dbPath,{method:'POST',body:{sql}});
  const rows=Array.isArray(data)?data[0]?.results:data?.results;
  need(Array.isArray(rows),'d1_sql_invalid_response');
  return rows;
 }
 const tableRows=await d1("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('accounts','talera_premium_media','talera_premium_records','talera_premium_current') ORDER BY name");
 const existing=new Set(tableRows.map(x=>x.name));
 need(['accounts','talera_premium_media','talera_premium_records'].every(n=>existing.has(n)),
  'd1_original_schema_missing');
 report.d1SchemaBefore=existing.has('talera_premium_current')?'already_present':'missing';
 if(existing.has('talera_premium_current')){
  const columns=await d1("PRAGMA table_info('talera_premium_current')");
  need(['account_id','kind','source_key','current_id','revision','updated_at'].every(x=>columns.some(c=>c.name===x)),
   'incompatible_current_schema');
 }
 const backup=await json('/d1/database/'+dbId+'/time_travel/bookmark');
 need(backup&&Object.keys(backup).length>0,'d1_recovery_bookmark_missing');
 report.d1BookmarkVerified=true;
 const corePackage=makePackage(coreLive);
 report.status='preflight_passed';
 save();
 return {core,v62,v56,coreLive,v62Live,dbId,d1,corePackage};
}
async function upload(worker,oldForm,replacements,additions,main){
 const result=new FormData(),all=new Set([...names(oldForm),...Object.keys(additions)]);
 for(const name of [...all].sort()){
  const existing=oldForm.get(name);
  const bytes=replacements[name]||additions[name];
  const type=existing?.type||'application/javascript+module';
  const value=bytes?new Blob([bytes],{type}):existing;
  need(value,'upload_missing_part_'+name);
  result.append(name,value,name);
 }
 result.append('metadata',JSON.stringify({main_module:main}));
 const response=await cf(sPath(worker)+'/content',{method:'PUT',body:result});
 const responseBody=await response.json();
 need(responseBody?.success===true,'cloudflare_worker_update_not_confirmed_'+worker);
}
async function postflight(worker,before,expected,main){
 const after=await state(worker);
 const id=after.active;
 need(id.version!==before.active.version&&id.deployment!==before.active.deployment,
  'new_version_not_active_'+worker);
 need(compareBindings(before.settings,after.settings),'worker_bindings_changed_'+worker);
 const live=await parts(worker);
 need(JSON.stringify(names(live))===JSON.stringify(Object.keys(expected).sort()),
  'postflight_part_inventory_bad_'+worker);
 for(const name of names(live)){
  const data=await buffer(live.get(name));
  need(sha(data)===sha(expected[name]),'postflight_part_hash_bad_'+worker+'_'+name);
 }
 return id;
}
async function rollback(worker,previous){
 report[worker===CORE?'coreRollbackAttempted':'v62RollbackAttempted']=true;save();
 const result=await json(sPath(worker)+'/deployments',{method:'POST',
  body:{strategy:'percentage',versions:[{version_id:previous.active.version,percentage:100}]}
 });
 need(result,'rollback_not_acknowledged_'+worker);
 const running=active(await json(sPath(worker)+'/deployments'));
 need(running.version===previous.active.version,'rollback_not_verified_'+worker);
 report[worker===CORE?'coreRollbackConfirmed':'v62RollbackConfirmed']=true;save();
}
let ctx;
try{
 ctx=await preflight();
 if(mode==='--check'){
  report.status='preflight_complete_no_writes';save();
  console.log('BB63 integrated release PRECHECK PASS; no Worker or DB changes.');
 }else{
  // The SQL migration is STRICTLY additive, and has been tested in SQLite.
  const sql=readFileSync('migrations/20261103_premium_current_version.sql','utf8')
    .split('\n').filter(x=>!x.trim().startsWith('--')).join('\n');
  const pieces=sql.split(';').map(x=>x.trim()).filter(Boolean);
  need(pieces.length===2&&/^CREATE TABLE IF NOT EXISTS talera_premium_current\s*\(/i.test(pieces[0])&&
    /^CREATE INDEX IF NOT EXISTS idx_talera_premium_current_account\b/i.test(pieces[1]),
   'migration_is_not_exactly_two_additive_statements');
  if(ctx&&report.d1SchemaBefore==='missing'){
   report.status='applying_additive_d1_schema';save();
   for(const piece of pieces)await json('/d1/database/'+ctx.dbId+'/query',{method:'POST',body:{sql:piece}});
  }
  const schema=await ctx.d1("PRAGMA table_info('talera_premium_current')");
  need(['account_id','kind','source_key','current_id','revision','updated_at'].every(x=>schema.some(c=>c.name===x)),
   'post_migration_schema_not_verified');
  report.d1SchemaAfter='verified_additive';save();
  // Core gets two changed and two additional modules. Preserve 6 original bytes.
  const coreReplacements=Object.fromEntries(CORE_CHANGED.map(n=>[n,sourceCore(n)]));
  const coreAdditions=Object.fromEntries(CORE_ADDED.map(n=>[n,sourceCore(n)]));
  const expectedCore={...Object.fromEntries(ctx.coreLive._buffers),
    ...coreReplacements,...coreAdditions};
  report.status='publishing_existing_clean_core';save();
  report.corePublishAttempted=true;save();
  await upload(CORE,ctx.coreLive,coreReplacements,coreAdditions,'worker.js');
  report.corePublished=true;save();
  report.currentCore=await postflight(CORE,ctx.core,expectedCore,'worker.js');
  // Ensure live API is not accidentally anonymously readable.
  const probe=await fetch('https://'+V62+'.mark-a39.workers.dev/api/premium/cloud/current?kind=story',
   {cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(20000)});
  need([401,403].includes(probe.status),'core_current_endpoint_auth_not_enforced');
  // V62 release reuses only unchanged live modules. Source assets are reviewed.
  const newPart={};
  for(const name of manifest.modules.map(x=>x.module==='worker.js'?'worker.mjs':x.module))
   newPart[name]=packageV62(name);
  const replacements=Object.fromEntries(Object.entries(newPart).filter(
   ([name])=>ctx.v62Live.has(name)&&V62_ALLOWED_CHANGE.has(name)));
  const added={'premium-current-client.txt':newPart['premium-current-client.txt']};
  report.status='publishing_existing_v62';save();
  report.v62PublishAttempted=true;save();
  await upload(V62,ctx.v62Live,replacements,added,'worker.mjs');
  report.v62Published=true;save();
  report.currentV62=await postflight(V62,ctx.v62,newPart,'worker.mjs');
  const [page,menu,current]=await Promise.all([
   fetch('https://'+V62+'.mark-a39.workers.dev/present',{cache:'no-store'}),
   fetch('https://'+V62+'.mark-a39.workers.dev/__clean/menu-integration.mjs',{cache:'no-store'}),
   fetch('https://'+V62+'.mark-a39.workers.dev/__clean/premium-current-client.mjs',{cache:'no-store'})
  ]);
  need(page.status===200&&menu.status===200&&current.status===200,'public_v62_http_failure');
  need(sha(Buffer.from(await menu.text()))===sha(newPart['menu-integration.txt']),
   'public_menu_hash_mismatch');
  need(sha(Buffer.from(await current.text()))===sha(newPart['premium-current-client.txt']),
   'public_current_client_hash_mismatch');
  report.status='published_and_verified';save();
  console.log('BB63 integrated Core and V62 published and verified. End-user transfer test is STILL REQUIRED.');
 }
}catch(error){
 report.status='failed_'+String(error?.message||'unknown');
 console.log('::error::BB63 integrated release stopped: '+report.status);
 if(mode==='--publish'&&ctx){
  // A failed HTTP result can be ambiguous: inspect currently active versions
  // before deciding whether a rollback must be attempted.
  for(const [worker,prior] of [[V62,ctx.v62],[CORE,ctx.core]]){
   try{
    const present=active(await json(sPath(worker)+'/deployments'));
    if(present.version!==prior.active.version)await rollback(worker,prior);
   }catch(rollbackError){
    console.log('::error::Rollback could not be confirmed for '+worker+': '+
      String(rollbackError?.message||'unknown'));
    report.status+=';rollback_unconfirmed_'+worker;
   }
  }
 }
 save();process.exitCode=1;
}
