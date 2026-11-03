/* BB63 Core topology evidence: READ-ONLY metadata only.
 * Called by a CI job with an existing GitHub Cloudflare secret.
 * Reads only Worker settings/deployments/code hashes. NEVER API account data,
 * D1 records, R2 objects, user sessions, or source text in logs/artifacts.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const ACCOUNT='6a396704721632d6d1889be48213c3a0';
const V62='talera-pwa-v62-mijn-profiel-20261101';
const BASE='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/workers/scripts/';
const path='.talera-bb63-evidence/core-readonly-topology.json';
const token=process.env.TALERA_V62_CF_READ_TOKEN||'';
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
const report={checkedAt:new Date().toISOString(),check:'READ_ONLY',deploymentAuthorized:false,
 target:V62,liveVersion:null,liveDeployment:null,v56BindingValid:false,
 serviceTarget:null,coreMetadataChecked:false,coreScriptReadable:false,
 coreVersion:null,coreDeployment:null,coreModules:[],bindingTypes:[],
 dbBindingPresent:false,privateR2BindingPresent:false,reason:'not_started'};
const write=()=>{mkdirSync('.talera-bb63-evidence',{recursive:true});
 writeFileSync(path,JSON.stringify(report,null,2)+'\n');};
const assert=(value,error)=>{if(!value)throw Error(error)};
async function get(worker,route){
 const response=await fetch(BASE+encodeURIComponent(worker)+route,{
  method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  signal:AbortSignal.timeout(20000)
 });
 if(!response.ok)throw Error('cloudflare_'+worker+'_http_'+response.status);
 return response;
}
async function json(worker,route){
 const r=await get(worker,route),body=await r.json();
 assert(body.success===true&&body.result,'cloudflare_'+worker+'_invalid_result');
 return body.result;
}
function active(data){
 const items=Array.isArray(data)?data:data?.deployments;
 assert(Array.isArray(items),'cloudflare_deployments_missing');
 const ordered=items.filter(x=>x.id&&Array.isArray(x.versions))
  .sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0));
 const first=ordered[0];
 assert(first?.versions?.length===1&&first.versions[0]?.percentage===100&&
  first.versions[0]?.version_id,'active_worker_not_single_version');
 return {deployment:first.id,version:first.versions[0].version_id};
}
try{
 assert(token.length>15,'existing_cloudflare_secret_missing');
 const [v62settings,v62history]=await Promise.all([json(V62,'/settings'),json(V62,'/deployments')]);
 const binding=(v62settings.bindings||[]).filter(b=>b?.name==='V56_BASE'&&b.type==='service');
 assert(binding.length===1&&/^[a-z0-9][a-z0-9-]{1,95}$/.test(binding[0].service||''),'v56_binding_unknown');
 report.v56BindingValid=true;report.serviceTarget=binding[0].service;
 const v62=active(v62history);
 report.liveVersion=v62.version;report.liveDeployment=v62.deployment;
 // The first worker bound to the app is authoritative, not a guessed talera-core script.
 const service=report.serviceTarget;
 const [settings,history,body]=await Promise.all([json(service,'/settings'),json(service,'/deployments'),get(service,'/content/v2')]);
 report.coreMetadataChecked=true;
 const live=active(history);
 report.coreVersion=live.version;report.coreDeployment=live.deployment;
 const names=(settings.bindings||[]).map(({name,type})=>({name,type}));
 report.bindingTypes=names;
 report.dbBindingPresent=names.some(b=>b.name==='DB'&&b.type==='d1');
 report.privateR2BindingPresent=names.some(b=>b.name==='PREMIUM_PRIVATE'&&b.type==='r2_bucket');
 assert(report.dbBindingPresent&&report.privateR2BindingPresent,'missing_premium_core_bindings');
 const kind=body.headers.get('content-type')||'';
 const form=kind.includes('multipart/form-data')?await body.formData():null;
 if(form){
  for(const [name,part] of form.entries()){
   if(typeof part.arrayBuffer!=='function')continue;
   const bytes=Buffer.from(await part.arrayBuffer());
   const source=bytes.toString('utf8');
   report.coreModules.push({name,bytes:bytes.length,sha256:sha(bytes),
    hasPremiumCloudHandler:source.includes('handleCorePremiumCloud'),
    hasPremiumCloudRoute:source.includes('premiumCloudRoute'),
    hasCurrentPointer:source.includes('talera_premium_current')});
  }
 }else{
  const bytes=Buffer.from(await body.arrayBuffer());
  const source=bytes.toString('utf8');
  report.coreModules.push({name:'single_script',bytes:bytes.length,sha256:sha(bytes),
    hasPremiumCloudHandler:source.includes('handleCorePremiumCloud'),
    hasPremiumCloudRoute:source.includes('premiumCloudRoute'),
    hasCurrentPointer:source.includes('talera_premium_current')});
 }
 report.coreScriptReadable=true;
 report.reason='core_source_and_bindings_read_only_confirmed';
 console.log('BB63 Core topology confirmed; V62='+V62+'; boundCore='+service+'; modules='+report.coreModules.length+
  '; currentVersionPresent='+report.coreModules.some(x=>x.hasCurrentPointer));
}catch(error){
 report.reason=String(error.message||'unknown_readonly_error');
 console.log('::warning::BB63 Core read-only topology not confirmed: '+report.reason);
 process.exitCode=1;
}finally{write()}
