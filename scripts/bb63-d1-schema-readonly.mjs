/* BB63 pilot: read-only D1 schema proof against the ACTUAL bound TALERA Core.
 * Sends a single fixed SELECT to Cloudflare D1 API, never modifies or reads
 * user rows. Does NOT upload/restore media or deploy a Worker.
 * Stops if the Core deployment or expected bindings change.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
const ACCOUNT='6a396704721632d6d1889be48213c3a0';
const CORE='talera-clean-core-staging-20261030';
const EXPECTED='e2170b3d-5836-498b-9ec1-ae510b0c834a';
const API='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT;
const token=process.env.TALERA_V62_CF_READ_TOKEN||'';
const output='.talera-bb63-evidence/d1-schema-readonly.json';
const expectedTables=['accounts','talera_premium_media','talera_premium_records',
'talera_premium_uploads','talera_premium_upload_parts','talera_premium_current'];
const report={checkedAt:new Date().toISOString(),check:'D1_FIXED_SELECT_ONLY',readOnly:true,
 core:CORE,pinnedDeployment:EXPECTED,confirmedDeployment:null,bindingsConfirmed:false,
 expectedTables,tablePresent:{},schemaColumns:{},migrationsRequired:[],
 safeToApply:false,reason:'not_checked'};
const save=()=>{mkdirSync('.talera-bb63-evidence',{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n')};
const assert=(a,msg)=>{if(!a)throw Error(msg)};
const headers={Authorization:'Bearer '+token};
async function get(path){
 const response=await fetch(API+path,{method:'GET',headers,signal:AbortSignal.timeout(20000)});
 assert(response.ok,'cloudflare_read_http_'+response.status);
 const body=await response.json();assert(body.success===true&&body.result,'invalid_read_result');return body.result;
}
try{
 assert(token.length>15,'cloudflare_token_missing');
 const [settings,deployments]=await Promise.all([
  get('/workers/scripts/'+CORE+'/settings'),get('/workers/scripts/'+CORE+'/deployments')
 ]);
 const rows=Array.isArray(deployments)?deployments:deployments?.deployments||[];
 const active=[...rows].sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
 assert(active?.versions?.length===1&&active.versions[0]?.percentage===100,'ambiguous_core_deployment');
 report.confirmedDeployment=active.id;
 assert(report.confirmedDeployment===EXPECTED,'core_deployment_drift_stop');
 const binds=settings.bindings||[];
 assert(binds.some(x=>x.name==='PREMIUM_PRIVATE'&&x.type==='r2_bucket'),'premium_r2_missing');
 const database=binds.find(x=>x.name==='DB'&&x.type==='d1');
 assert(database,'premium_core_db_missing');
 report.bindingsConfirmed=true;
 const id=database.id||database.database_id;
 assert(/^[0-9a-f-]{36}$/i.test(id||''),'d1_binding_identifier_missing');
 // SQL contains NO reference to account content; queries schema metadata only.
 const sql="SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('accounts','talera_premium_media','talera_premium_records','talera_premium_uploads','talera_premium_upload_parts','talera_premium_current') ORDER BY name";
 const response=await fetch(API+'/d1/database/'+id+'/query',{
  method:'POST',headers:{...headers,'content-type':'application/json'},
  body:JSON.stringify({sql}),signal:AbortSignal.timeout(20000)
 });
 assert(response.ok,'d1_fixed_select_http_'+response.status);
 const json=await response.json();assert(json.success===true&&Array.isArray(json.result),'d1_schema_result_invalid');
 const tables=json.result.flatMap(x=>x.results||[]);
 for(const name of expectedTables){
  const row=tables.find(x=>x.name===name);
  report.tablePresent[name]=Boolean(row);
  const cols=String(row?.sql||'');
  report.schemaColumns[name]=cols?['account_id','media_id','record_id','source_key','digest_kind',
   'current_id','revision','updated_at'].filter(k=>new RegExp('\\b'+k+'\\b','i').test(cols)):[];
 }
 assert(report.tablePresent.accounts,'accounts_table_missing');
 for(const name of ['talera_premium_media','talera_premium_records','talera_premium_uploads','talera_premium_upload_parts'])
  assert(report.tablePresent[name],'baseline_table_missing_'+name);
 const required=['account_id','kind','source_key','current_id','revision','updated_at'];
 if(report.tablePresent.talera_premium_current){
  const row=tables.find(x=>x.name==='talera_premium_current');
  for(const column of required)assert(new RegExp('\\b'+column+'\\b','i').test(row.sql),'current_schema_missing_'+column);
 }else report.migrationsRequired=['20261103_premium_current_version.sql'];
 report.safeToApply=true;
 report.reason='core_d1_schema_verified_without_data_read';
 console.log('BB63 live Core schema verified READ-ONLY; current table present='+report.tablePresent.talera_premium_current+
  '; planned D1 migration='+report.migrationsRequired.join(',')+
  '; no user rows read');
}catch(e){
 report.reason=String(e.message||'schema_check_failed');
 console.log('::warning::BB63 D1 read-only schema gate stopped: '+report.reason);
 process.exitCode=1;
}finally{save()}
