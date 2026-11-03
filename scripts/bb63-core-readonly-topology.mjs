/* BB63: Trace the ACTUAL V62 -> V56 -> CLEAN_CORE service path.
 * GET-only Cloudflare Worker metadata and source hashes. Never touches
 * D1 records, R2 data, sessions, end user content or production settings.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const ACCOUNT='6a396704721632d6d1889be48213c3a0';
const V62='talera-pwa-v62-mijn-profiel-20261101';
const API='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/workers/scripts/';
const FILE='.talera-bb63-evidence/core-readonly-topology.json';
const token=process.env.TALERA_V62_CF_READ_TOKEN||'';
const validWorker=/^[a-z0-9][a-z0-9-]{1,95}$/;
const report={checkedAt:new Date().toISOString(),check:'READ_ONLY',
 deploymentAuthorized:false,entry:V62,chain:[],targetCore:null,
 coreMetadataChecked:false,coreScriptReadable:false,coreModules:[],
 reason:'not_started'};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const save=()=>{mkdirSync('.talera-bb63-evidence',{recursive:true});
 writeFileSync(FILE,JSON.stringify(report,null,2)+'\n')};
const assert=(value,reason)=>{if(!value)throw Error(reason)};
async function request(worker,route){
 const response=await fetch(API+encodeURIComponent(worker)+route,{
  method:'GET',headers:{Authorization:'Bearer '+token},
  signal:AbortSignal.timeout(20000)
 });
 assert(response.ok,'cloudflare_'+worker+'_http_'+response.status);
 return response;
}
async function getJson(worker,route){
 const data=await (await request(worker,route)).json();
 assert(data?.success===true&&data.result,'cloudflare_'+worker+'_invalid_metadata');
 return data.result;
}
function active(deployments){
 const rows=Array.isArray(deployments)?deployments:deployments?.deployments;
 assert(Array.isArray(rows),'cloudflare_deployments_unknown');
 const sorted=rows.filter(row=>row?.id&&Array.isArray(row.versions))
  .sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0));
 const entry=sorted[0];
 assert(entry?.versions?.length===1&&entry.versions[0]?.percentage===100&&
  entry.versions[0]?.version_id,'cloudflare_noncanonical_deployment');
 return {deployment:entry.id,version:entry.versions[0].version_id};
}
try{
 assert(token.length>15,'cloudflare_read_token_missing');
 let worker=V62;const seen=new Set();
 for(let depth=0;depth<5;depth++){
  assert(validWorker.test(worker)&&!seen.has(worker),'worker_service_cycle_or_invalid_name');
  seen.add(worker);
  const [settings,deployment]=await Promise.all([
   getJson(worker,'/settings'),getJson(worker,'/deployments')
  ]);
  const current=active(deployment);
  const bindings=(settings?.bindings||[]).map(binding=>({
   name:binding.name,type:binding.type,
   ...(binding.type==='service'&&typeof binding.service==='string'
    ?{service:binding.service}: {})
  }));
  const hop={worker,depth,version:current.version,deployment:current.deployment,
   bindings,db:bindings.some(b=>b.type==='d1'&&b.name==='DB'),
   premiumPrivate:bindings.some(b=>b.type==='r2_bucket'&&b.name==='PREMIUM_PRIVATE')};
  report.chain.push(hop);
  if(depth===0){
   const link=bindings.filter(b=>b.name==='V56_BASE'&&b.type==='service');
   assert(link.length===1&&validWorker.test(link[0].service||''),'missing_v62_v56_binding');
   worker=link[0].service;
   continue;
  }
  if(hop.db&&hop.premiumPrivate){
   report.targetCore=worker;report.coreMetadataChecked=true;
   const response=await request(worker,'/content/v2');
   const mime=response.headers.get('content-type')||'';
   const form=mime.includes('multipart/form-data')?await response.formData():null;
   const parts=form?[...form.entries()]:[['single_script',new Blob([await response.arrayBuffer()])]];
   for(const [name,part] of parts){
    const bytes=Buffer.from(await part.arrayBuffer());
    const code=bytes.toString('utf8');
    report.coreModules.push({name,bytes:bytes.length,sha256:sha(bytes),
     hasCloudHandler:code.includes('handleCorePremiumCloud'),
     hasPremiumRoute:code.includes('premiumCloudRoute'),
     hasCurrentPointer:code.includes('talera_premium_current')});
   }
   report.coreScriptReadable=true;report.reason='active_core_chain_confirmed';
   break;
  }
  // This is NOT necessarily the final Core; V56 delegates to CLEAN_CORE.
  const service=bindings.find(b=>b.name==='CLEAN_CORE'&&b.type==='service')
    ||bindings.find(b=>b.name==='CORE'&&b.type==='service');
  if(!service?.service){report.reason='no_verified_core_service_beyond_'+worker;break}
  assert(validWorker.test(service.service),'invalid_next_core_service');
  worker=service.service;
 }
 assert(report.coreScriptReadable,'core_chain_not_fully_verified');
 console.log('BB63 live Worker route read-only CONFIRMED: '+
  report.chain.map(x=>x.worker).join(' -> ')+
  '; target Core modules='+report.coreModules.length+
  '; current-pointer code already active='+report.coreModules.some(x=>x.hasCurrentPointer));
}catch(error){
 if(report.reason==='not_started')report.reason=String(error.message||'unknown_read_error');
 console.log('::warning::BB63 Core read-only topology incomplete: '+report.reason);
 process.exitCode=1;
}finally{save()}
