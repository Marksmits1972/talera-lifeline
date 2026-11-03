/* BB63 read-only release failure diagnosis.
 * No deploy, no cloud mutations, no account/session/customer data reads.
 * Report current and recent versions for exact Workers + public HTTP status
 * and mime of anonymous entry / module routes only.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
const TOKEN=process.env.TALERA_BB63_CF_TOKEN||'';
const ACCOUNT='6a396704721632d6d1889be48213c3a0';
const API='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT;
const CORE='talera-clean-core-staging-20261030';
const V62='talera-pwa-v62-mijn-profiel-20261101';
const BASE='https://'+V62+'.mark-a39.workers.dev';
const report={checkedAt:new Date().toISOString(),mode:'READ_ONLY',noCustomerReads:true,
 services:[],routes:[],reason:'not_started'};
const save=()=>{mkdirSync('.talera-bb63-evidence',{recursive:true});writeFileSync('.talera-bb63-evidence/bb63-postrollback-readonly.json',JSON.stringify(report,null,2)+'\n')};
const need=(x,msg)=>{if(!x)throw Error(msg)};
async function cf(path){
 const response=await fetch(API+path,{headers:{Authorization:'Bearer '+TOKEN},
  signal:AbortSignal.timeout(16000)});
 need(response.ok,'cloudflare_http_'+response.status);
 const body=await response.json();
 need(body.success===true&&body.result,'invalid_cloudflare_api_response');
 return body.result;
}
const path=name=>'/workers/scripts/'+encodeURIComponent(name);
try{
 need(TOKEN.length>15,'missing_secret');
 for(const name of [CORE,V62]){
  const [versions,deployments]=await Promise.all([
   cf(path(name)+'/versions?per_page=12'),cf(path(name)+'/deployments')
  ]);
  const list=Array.isArray(versions)?versions:versions.items||versions.versions||[];
  const history=Array.isArray(deployments)?deployments:deployments.deployments||[];
  const sorted=history.slice().sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0));
  report.services.push({
   name,active:sorted[0]?{deployment:sorted[0].id,version:sorted[0].versions?.[0]?.version_id}:null,
   latestDeployments:sorted.slice(0,5).map(x=>({
    deployment:x.id,created_on:x.created_on,
    versions:(x.versions||[]).map(y=>({id:y.version_id,percentage:y.percentage}))
   })),
   lastAvailableVersions:list.slice(0,12).map(x=>({
    id:x.id,created_on:x.created_on||x.created_at||null,
    number:x.number||null
   }))
  });
 }
 for(const urlPath of ['/present','/mijn-leven','/__clean/menu-integration.mjs',
  '/__clean/premium-current-client.mjs','/__clean/premium-sync-coordinator.mjs',
  '/api/premium/cloud/current?kind=story']){
  const resp=await fetch(BASE+urlPath,{cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(16000)});
  const body=await resp.arrayBuffer();
  report.routes.push({path:urlPath,status:resp.status,
   contentType:(resp.headers.get('content-type')||'').split(';')[0],bytes:body.byteLength,
   locationHost:resp.headers.get('location')?.replace(/^https?:\/\/([^\/]+).*$/,'$1')||null});
 }
 report.reason='read_only_probe_complete';
 console.log('BB63 public endpoints: '+report.routes.map(x=>x.path+'='+x.status).join(', '));
}catch(error){report.reason='blocked_'+String(error.message||'unknown');
 console.log('::warning::BB63 read-only probe blocked: '+report.reason);process.exitCode=1;
}finally{save()}
