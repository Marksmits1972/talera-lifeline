/* BB63 GATE 2 — NO DEPLOY, NO MIGRATION.
 * Attests live V62->V56->Clean Core and all eight existing Core source parts.
 * D1 requests contain ONLY schema queries, no table data or customer records.
 * Exits non-zero if an account binding, version, source, schema or privilege differs.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const ACCOUNT='6a396704721632d6d1889be48213c3a0';
const CORE='talera-clean-core-staging-20261030';
const V62='talera-pwa-v62-mijn-profiel-20261101';
const V56='talera-pwa-v56-whatsapp-foto-social-20261031';
const API='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT;
const PIN={
 [V62]:{deployment:'571a86fc-7ed9-45ec-a0fa-1a298e4582f1',version:'31b38681-ca28-4b12-bde6-22a446ce1337'},
 [V56]:{deployment:'83f0a27c-a9ca-4a0c-9d45-1fad5a39587f',version:'49814a94-b4d3-40fc-b236-0eeca8df53c5'},
 [CORE]:{deployment:'e2170b3d-5836-498b-9ec1-ae510b0c834a',version:'ef484758-391d-4875-999f-34f1a4b78a93'}
};
const ORIGINAL={
 'worker.js':'e765572a78f0b6861f6aad1df6264503c24f8c285b563ce7ba854d974647fd8e',
 'premium-cloud-core-adapter.mjs':'ac7f1a64b900b40392323e0e902b8e928fe32c4d85eae6a0053a8c976d610f58',
 'premium-cloud-pilot.mjs':'11511607b95515983f779883f10171580e7e5e6835a50c3cda031620db3ed1d7e5',
 'premium-cloud-routes.mjs':'574920146a0c7943b46be60b04c42531852f10522be71d4effa469622b77dd01',
 'premium-multipart-media.mjs':'22f9b2d86a4a7d9b09182806ba740ea3dd0be9b0e1a1df1a43f6bbb779abee28',
 'premium-private-records.mjs':'01980fcce9d9a3ac6b1c4f96eda55d0449f9b8c673801eca772a474a0b596e02',
 'premium-private-upload.mjs':'e843c53ba76f054e306ee1ac14acc375e6b88d22ebf6dbd9d226290cd7cee0aa',
 'premium-cloud-auth.mjs':'cd480746a65137865ad39515bdce499e20321bb37a2c5fd82de1816d70ba978f'
};
const CHANGED=['premium-cloud-routes.mjs','premium-private-records.mjs'];
const ADDED=['premium-current-route.mjs','premium-current-version.mjs'];
const BASE_COMMIT='f93a1109ded45a57b050320364a97c423ea15b91';
const hash=x=>createHash('sha256').update(x).digest('hex');
const must=(ok,msg)=>{if(!ok)throw Error(msg)};
const token=process.env.TALERA_BB63_CF_TOKEN||'';
const report={checkedAt:new Date().toISOString(),operation:'read_only_gate',status:'not_checked',
 versions:{},corePartsCount:0,corePartsMatch:false,sourceAnchorsMatch:false,
 changedModuleHashes:{},dbSchemaStatus:'not_checked',dbColumns:[],d1BookmarkChecked:false,
 coreBindingsVerified:false,customerRecordsRead:false,migrationApplied:false,workerUpdated:false};
const save=()=>{mkdirSync('.talera-bb63-evidence',{recursive:true});
 writeFileSync('.talera-bb63-evidence/core-release-gate.json',JSON.stringify(report,null,2)+'\n')};
async function cf(endpoint,{method='GET',body=null}={}){
 const res=await fetch(API+endpoint,{method,headers:{
  Authorization:'Bearer '+token,Accept:'application/json',
  ...(body?{'content-type':'application/json'}:{})
 },body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
 must(res.ok,'cloudflare_http_'+res.status+'_'+endpoint.split('/').at(-1));
 return res;
}
async function json(endpoint,opts){
 const data=await (await cf(endpoint,opts)).json();
 must(data?.success===true&&data.result,'cloudflare_result_invalid');
 return data.result;
}
function active(input){
 const items=Array.isArray(input)?input:input?.deployments;
 must(Array.isArray(items),'deployments_missing');
 const sorted=items.slice().sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0));
 const row=sorted[0];
 must(row?.id&&row.versions?.length===1&&row.versions[0]?.percentage===100&&row.versions[0]?.version_id,
   'non_single_active_version');
 return {deployment:row.id,version:row.versions[0].version_id};
}
function binding(settings,name,type){
 const all=settings?.bindings||[];
 must(Array.isArray(all),'settings_bindings_missing');
 const list=all.filter(x=>x.name===name&&x.type===type);
 must(list.length===1,'missing_binding_'+name);
 return list[0];
}
const script=worker=>'/workers/scripts/'+encodeURIComponent(worker);
try{
 must(token.length>15,'cloudflare_token_unavailable');
 const lookup=async worker=>{
  const base=script(worker);
  const [settings,history]=await Promise.all([json(base+'/settings'),json(base+'/deployments')]);
  const state=active(history),pin=PIN[worker];
  must(state.deployment===pin.deployment&&state.version===pin.version,'worker_version_changed_'+worker);
  report.versions[worker]=state;
  return settings;
 };
 const v62=await lookup(V62),v56=await lookup(V56),core=await lookup(CORE);
 must(binding(v62,'V56_BASE','service').service===V56,'v62_bound_elsewhere');
 must(binding(v56,'CLEAN_CORE','service').service===CORE,'v56_bound_elsewhere');
 const db=binding(core,'DB','d1');
 binding(core,'PREMIUM_PRIVATE','r2_bucket');
 binding(core,'PREMIUM_MEDIA','r2_bucket');
 report.coreBindingsVerified=true;
 // Validate the target database's configured D1 identifier without logging it.
 const databaseId=db.id||db.database_id;
 must(/^[a-f0-9-]{36}$/i.test(databaseId||''),'d1_database_id_not_returned');
 report.databaseIdSha256=hash(databaseId);
 const res=await cf(script(CORE)+'/content/v2');
 const type=res.headers.get('content-type')||'';
 must(/multipart\/form-data/i.test(type),'core_content_not_multipart');
 const form=await res.formData();
 const names=[...form.keys()].sort(),orig=Object.keys(ORIGINAL).sort();
 must(JSON.stringify(names)===JSON.stringify(orig),'core_part_inventory_drift');
 report.corePartsCount=names.length;
 for(const name of names){
  const part=form.get(name);
  must(part&&typeof part.arrayBuffer==='function','missing_core_part_'+name);
  const bytes=Buffer.from(await part.arrayBuffer());
  must(hash(bytes)===ORIGINAL[name],'core_source_drift_'+name);
 }
 report.corePartsMatch=true;
 const normalize=s=>s.replace(/\r\n/g,'\n').trimEnd();
 for(const name of CHANGED){
  const live=await form.get(name).text();
  const original=execFileSync('git',['show',BASE_COMMIT+':src/core/'+name],{encoding:'utf8'});
  must(normalize(live)===normalize(original),'old_source_differs_from_reviewed_'+name);
 }
 report.sourceAnchorsMatch=true;
 for(const name of [...CHANGED,...ADDED]){
  const source=readFileSync('src/core/'+name);
  must(source.length>500&&source.length<30000,'invalid_new_module_'+name);
  report.changedModuleHashes[name]=hash(source);
 }
 must(readFileSync('src/core/premium-cloud-routes.mjs','utf8').includes(
  "import {premiumCurrentRoute} from './premium-current-route.mjs'"),'new_route_not_linked');
 // D1 REST uses HTTP POST but SQL is STRICTLY schema-only.
 const schema=await json('/d1/database/'+databaseId+'/query',{
   method:'POST',body:{sql:"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('accounts','talera_premium_media','talera_premium_records','talera_premium_current') ORDER BY name"}
 });
 const rows=Array.isArray(schema)?schema[0]?.results:Array.isArray(schema?.results)?schema.results:[];
 must(Array.isArray(rows),'d1_schema_response_unknown');
 const tableNames=rows.map(x=>x.name).sort();
 must(['accounts','talera_premium_media','talera_premium_records'].every(x=>tableNames.includes(x)),'d1_existing_tables_missing');
 const created=tableNames.includes('talera_premium_current');
 report.dbSchemaStatus=created?'table_already_present':'additive_table_needed';
 if(created){
  const columns=await json('/d1/database/'+databaseId+'/query',{
   method:'POST',body:{sql:"PRAGMA table_info('talera_premium_current')"}
  });
  const columnRows=Array.isArray(columns)?columns[0]?.results:Array.isArray(columns?.results)?columns.results:[];
  report.dbColumns=columnRows.map(x=>x.name);
  must(['account_id','kind','source_key','current_id','revision','updated_at'].every(x=>report.dbColumns.includes(x)),
   'existing_current_table_incompatible');
 }
 // The D1 Time Travel bookmark can be used to locate a recovery point.
 const bookmark=await json('/d1/database/'+databaseId+'/time_travel/bookmark');
 report.d1BookmarkChecked=Boolean(bookmark&&Object.keys(bookmark).length>0);
 must(report.d1BookmarkChecked,'d1_recovery_bookmark_unavailable');
 report.status='preflight_complete_no_writes';
 console.log('BB63 Core release gate GREEN: 3 pinned Workers, 8 pinned original parts; D1 schema='+report.dbSchemaStatus+
  '; recovery bookmark verified; no changes made.');
}catch(error){
 report.status='blocked_'+String(error?.message||'unknown');
 console.log('::warning::BB63 Core release gate STOP: '+report.status);
 process.exitCode=1;
}finally{save()}
