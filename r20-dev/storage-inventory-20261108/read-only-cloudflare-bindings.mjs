/**
 * TALERA repository-owned storage map - NO MUTATIONS.
 * This script performs GET ONLY on Cloudflare Worker settings.
 * It never accesses data records, media objects, account API endpoints or
 * the contents of secrets. All output is limited to binding metadata.
 * No app deployments, migrations, D1 queries or R2 object reads.
 */
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const dir=dirname(fileURLToPath(import.meta.url));
const account=String(process.env.CLOUDFLARE_ACCOUNT_ID||'').trim();
const token=String(process.env.CLOUDFLARE_API_TOKEN||'').trim();
assert.match(account,/^[a-f0-9]{32}$/i,'Cloudflare account scope required');
assert.ok(token.length>20,'GitHub Cloudflare token required');
const roots=[
 'talera-account-birthdate-test-20261107',
 'talera-vijftalen-onderhoud-test-20261107',
 'talera-design-cleanup-fase4-test-20261107',
 'talera-closed-memory-core-test-20261106',
 'xxory-test'
];
const MAX_NODES=45;
const SERVICE_NAME=/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,130}$/;
const open=[...roots.map(name=>({name,depth:0}))];
const visited=new Set(),workers=[],edges=[],failures=[];
const keepTypes=new Set(['service','d1','r2_bucket','kv_namespace','durable_object_namespace']);
async function settings(name){
 const response=await fetch(
  'https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+encodeURIComponent(name)+'/settings',
  {method:'GET',headers:{authorization:'Bearer '+token},signal:AbortSignal.timeout(18000)}
 );
 if(response.status===404)return {missing:true};
 if(!response.ok)return {error:'HTTP_'+response.status};
 const value=await response.json();
 if(value.success!==true)return {error:'SETTINGS_UNAVAILABLE'};
 const all=Array.isArray(value.result?.bindings)?value.result.bindings:
  Array.isArray(value.result?.metadata?.bindings)?value.result.metadata.bindings:null;
 if(!all)return {error:'UNRECOGNIZED_BINDING_FORMAT'};
 return {bindings:all};
}
while(open.length&&visited.size<MAX_NODES){
 const node=open.shift();
 if(visited.has(node.name))continue;
 if(!SERVICE_NAME.test(node.name)){failures.push({name:node.name,error:'INVALID_SERVICE_NAME'});continue}
 visited.add(node.name);
 let result;try{result=await settings(node.name)}catch(e){
   failures.push({name:node.name,error:'NETWORK_OR_TIMEOUT'});continue;
 }
 if(result.error||result.missing){
  failures.push({name:node.name,error:result.error||(result.missing?'NOT_FOUND':'UNKNOWN')});
  continue;
 }
 const bindings=[];
 for(const b of result.bindings){
  if(!keepTypes.has(b.type))continue;
  // BINDING NAMES AND RESOURCE LABELS ONLY. Never print IDs, tokens,
  // credentials, secret/text bindings, service environments or SQL data.
  const safeName=typeof b.name==='string'?b.name.slice(0,90):'';
  const resource=b.type==='service'?String(b.service||''):
    b.type==='d1'?String(b.database_name||''):
    b.type==='r2_bucket'?String(b.bucket_name||''):
    b.type==='kv_namespace'?'KV_BINDING':
    b.type==='durable_object_namespace'?'DO_BINDING':'';
  bindings.push({type:b.type,binding:safeName,resource:resource.slice(0,130)||'RESOURCE_NAME_NOT_EXPOSED'});
  if(b.type==='service'&&SERVICE_NAME.test(resource)){
   edges.push({from:node.name,to:resource,binding:safeName});
   if(!visited.has(resource)&&node.depth<14)open.push({name:resource,depth:node.depth+1});
  }
 }
 workers.push({worker:node.name,depth:node.depth,bindings});
}
const payload={
 title:'TALERA read-only Cloudflare metadata service dependency audit',
 scope:'GET Worker settings only; no account, story, D1 row or R2 object data',
 roots,scannedCount:visited.size,reachable:workers.length,
 workers,serviceEdges:edges,unreadable:failures,
 truncated:open.length>0,
 warnings:[
  'A reachable Worker is not proof that every request traverses it.',
  'Bindings describe configured resources, not their per-route or per-user usage.',
  'Cloudflare Worker source, account ownership model and D1 tables were not inspected.',
  'Connection permission gaps and absent bindings must be handled as UNKNOWN, not as a negative finding.'
 ]
};
mkdirSync(join(dir,'results'),{recursive:true});
writeFileSync(join(dir,'results/cloudflare-routing-sanitized.json'),JSON.stringify(payload,null,2)+'\n');
console.log('READ_ONLY_WORKER_BINDING_AUDIT',JSON.stringify({
 roots:roots.length,inspected:workers.length,unreadable:failures.length,
 serviceEdges:edges.length,truncated:payload.truncated
}));
for(const item of workers)console.log('STORAGE_BINDING_TOPOLOGY',JSON.stringify(item));
for(const item of failures)console.log('UNVERIFIED_WORKER_BINDINGS',JSON.stringify(item));
if(workers.length===0)throw Error('No Cloudflare Worker settings could be read; no inventory asserted');
