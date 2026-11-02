/* TALERA V62 — READ-ONLY Cloudflare deployment readiness.
 * Never deploy, patch or read personal data. Use only an EXISTING GitHub
 * Actions secret, if present. All requested Cloudflare endpoints are GET.
 */
import {writeFileSync,mkdirSync} from 'node:fs';
const ACCOUNT='6a396704721632d6d1889be48213c3a0';
const WORKER='talera-pwa-v62-mijn-profiel-20261101';
const BASE='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/workers/scripts/'+WORKER;
const artifact='.talera-v62-package/cloudflare-readiness.json';
const report={target:WORKER,checkedAt:new Date().toISOString(),
 check:'READ_ONLY',deploymentAllowed:false,ready:false,
 status:'not_checked',serviceBindingValid:false,
 currentDeploymentId:null,previousDeploymentId:null,
 currentVersionId:null};
function save(){
 mkdirSync('.talera-v62-package',{recursive:true});
 writeFileSync(artifact,JSON.stringify(report,null,2)+'\n');
 console.log('V62 release-readiness: '+report.status+
  '; binding valid: '+report.serviceBindingValid+
  '; current deployment confirmed: '+Boolean(report.currentDeploymentId));
}
const token=process.env.TALERA_V62_CF_READ_TOKEN||'';
if(!token){
 report.status='missing_existing_github_cloudflare_token';
 console.log('::warning::No existing V62 Cloudflare read-only secret in this GitHub repository. No Cloudflare request made.');
 save();
}else{
 const fetchJson=async path=>{
  const response=await fetch(BASE+path,{
   method:'GET',headers:{Authorization:'Bearer '+token,
    Accept:'application/json'},signal:AbortSignal.timeout(16000)});
  if(!response.ok)throw Error('cloudflare_http_'+response.status);
  const data=await response.json();
  if(data?.success!==true||!data.result)throw Error('invalid_cloudflare_response');
  return data.result;
 };
 try{
  const [settings,deployments]=await Promise.all([
   fetchJson('/settings'),fetchJson('/deployments')
  ]);
  const bindings=Array.isArray(settings.bindings)?settings.bindings:[];
  const services=bindings.filter(b=>b?.name==='V56_BASE'&&b.type==='service'&&
   typeof b.service==='string'&&b.service.length>0);
  report.serviceBindingValid=services.length===1&&bindings.length===1;
  report.bindingCount=bindings.length;
  const all=Array.isArray(deployments)?deployments:
   Array.isArray(deployments.deployments)?deployments.deployments:[];
  const listed=all.filter(d=>/^[a-f0-9-]{36}$/i.test(d.id||'')&&
   Array.isArray(d.versions)&&d.versions.length===1&&
   d.versions[0]?.percentage===100&&
   /^[a-f0-9-]{36}$/i.test(d.versions[0]?.version_id||''))
   .sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0));
  // A rollback to the previous version is meaningful only when there are
  // at least two valid single-version deployments to this exact Worker.
  report.currentDeploymentId=listed[0]?.id||null;
  report.previousDeploymentId=listed[1]?.id||null;
  report.currentVersionId=listed[0]?.versions[0]?.version_id||null;
  report.deploymentCount=all.length;
  report.ready=report.serviceBindingValid===true&&
   Boolean(report.currentDeploymentId)&&Boolean(report.previousDeploymentId);
  report.status=report.ready?'metadata_and_rollback_verified':'read_metadata_incomplete';
  if(!report.ready)console.log('::warning::V62 live release is BLOCKED: metadata or rollback requirement is missing.');
 }catch(error){
  report.status=error?.message||'cloudflare_request_failed';
  console.log('::warning::V62 Cloudflare metadata could not be read ('+report.status+'). No changes made.');
 }
 save();
}
