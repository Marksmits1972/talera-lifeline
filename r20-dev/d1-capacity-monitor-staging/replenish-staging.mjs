// Real GitHub-only staging D1 capacity inventory and append-only reserve plan.
// No production D1 credentials or names, no account data and no direct writes.
// If any D1 metric or directory binding is unknown, fail CLOSED.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {planReplenishment,addReserve} from './reserve-planner.mjs';
import {decideStorageHeadroom} from './storage-guard.mjs';
const folder=dirname(fileURLToPath(import.meta.url));
const dataFolder=join(folder,'../d1-router-staging');
const catalogPath=join(dataFolder,'shard-catalog.json');
const catalog=JSON.parse(readFileSync(catalogPath,'utf8'));
const id=String(process.env.CLOUDFLARE_ACCOUNT_ID||'').trim().toLowerCase();
const token=String(process.env.CLOUDFLARE_API_TOKEN||'').trim();
assert.match(id,/^[a-f0-9]{32}$/,'Cloudflare account ID must be valid and masked');
assert.ok(token.length>20,'GitHub Cloudflare D1 token missing');
assert.equal(catalog.worker_name,'talera-d1-stable-router-test-20261108');
assert.equal(catalog.directory_database,'talera-d1-router-directory-test-20261108');
const raw=execFileSync('npx',['--no-install','wrangler','d1','list','--json'],{
 encoding:'utf8',cwd:join(folder,'../..'),stdio:['ignore','pipe','pipe'],timeout:30000});
const parsed=JSON.parse(raw),list=Array.isArray(parsed)?parsed:(parsed.result||parsed.databases);
assert.ok(Array.isArray(list));
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
function knownId(name){
 assert.match(name,/^talera-d1-router-[a-z0-9-]+-test-20261108$/);
 const match=list.filter(x=>x.name===name);
 assert.equal(match.length,1,'Required D1 staging name missing/ambiguous');
 const found=match[0].uuid||match[0].id||match[0].database_id;
 assert.match(found,uuid);return found;
}
async function cloudflareGet(name){
 const found=knownId(name);
 const resp=await fetch('https://api.cloudflare.com/client/v4/accounts/'+id+'/d1/database/'+found,{
  headers:{authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});
 const body=await resp.json();
 if(!resp.ok||body.success!==true||body.result?.name!==name){
  throw Error('Cannot confirm isolated D1 metadata for '+name+' (HTTP '+resp.status+')');
 }
 assert.equal(body.result.jurisdiction,'eu','Only EU staging database supported');
 return body.result;
}
async function readDirectory(){
 const dir=knownId(catalog.directory_database);
 const resp=await fetch('https://api.cloudflare.com/client/v4/accounts/'+id+'/d1/database/'+dir+'/query',{
  method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
  body:JSON.stringify({sql:'SELECT shard_id,state FROM shards ORDER BY shard_id',params:[]}),
  signal:AbortSignal.timeout(20000)});
 const body=await resp.json();
 if(!resp.ok||body.success!==true||!body.result?.[0]?.success||
  !Array.isArray(body.result?.[0]?.results))throw Error('Cannot retrieve audited D1 staging shard directory');
 return body.result[0].results;
}
await cloudflareGet(catalog.directory_database);
let states=await readDirectory();
const physicalBytes={};
for(const shard of catalog.shards){
 const d=await cloudflareGet(shard.database_name);
 if(typeof d.file_size!=='number'||d.file_size<0||!Number.isFinite(d.file_size))
  throw Error('Missing file_size for '+shard.id);
 physicalBytes[shard.id]=d.file_size;
}
// Storage alarm responds to REAL Cloudflare D1 file_size, never simulated user
// data. At >=80% of a 10GB database, activate a bound cold spare and then stop
// assigning NEW accounts to the near-full D1. Existing assigned accounts stay
// there and may still require controlled migration before the physical 10GB cap.
const guard=decideStorageHeadroom({states,bytes:physicalBytes,
 allowedIds:catalog.shards.map(x=>x.id)});
console.log('STAGING_D1_STORAGE_GUARD',JSON.stringify(guard));
if(guard.action==='block')throw Error('Storage guard blocked: '+guard.reason);
if(guard.action==='activate-and-drain'){
 const sql=async(statement,params=[])=>{
  const dirId=knownId(catalog.directory_database);
  const res=await fetch('https://api.cloudflare.com/client/v4/accounts/'+id+'/d1/database/'+dirId+'/query',{
    method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
    body:JSON.stringify({sql:statement,params}),signal:AbortSignal.timeout(20000)});
  const value=await res.json();
  if(!res.ok||value.success!==true||!value.result?.[0]?.success)
   throw Error('Isolated D1 storage threshold transition failed (HTTP '+res.status+')');
  return value.result[0];
 };
 // Phase one: make capacity available for new accounts. If interrupted here,
 // the old shard continues to serve requests, while a safe spare is active.
 await sql("UPDATE shards SET state='active' WHERE shard_id=? AND state='disabled'",[guard.activate]);
 states=await readDirectory();
 if(!states.some(x=>x.shard_id===guard.activate&&x.state==='active'))
  throw Error('Refusing to drain a full shard before active spare is verified');
 // Phase two: no NEW account placement on the nearly full shard. Existing
 // account_shard records remain unchanged and continue to route there.
 await sql("UPDATE shards SET state='draining' WHERE shard_id=? AND state='active'",[guard.drain]);
 states=await readDirectory();
 if(!states.some(x=>x.shard_id===guard.drain&&x.state==='draining'))
  throw Error('Full shard was not marked draining; manual staging recovery required');
 await sql("INSERT INTO capacity_events(shard_id,action,reason) VALUES(?,'activate',?)",
  [guard.activate,'STORAGE_GUARD_NEAR_10GB_DRAIN_'+guard.drain]);
 console.log('STAGING_REAL_D1_STORAGE_PRESSURE_HANDLED',JSON.stringify({
  nearFull:guard.drain,activated:guard.activate,
  oldAccountsStayPut:true,newAccountsAvoidNearFull:true}));
}

const target=Number(process.env.TALERA_STAGE_MIN_STANDBY||2);
const max=Number(process.env.TALERA_STAGE_MAX_SHARDS||16);
const decision=planReplenishment({catalog,states,physicalBytes,maxShards:max,reserveTarget:target});
console.log('STAGING_STORAGE_INVENTORY',JSON.stringify(Object.entries(physicalBytes).map(([shard,bytes])=>({shard,bytes}))));
console.log('STAGING_REPLENISHMENT_DECISION',JSON.stringify(decision));
if(decision.headroom?.length){
 console.warn('STAGING_D1_STORAGE_ALARM',JSON.stringify(decision.headroom));
}
const output=process.env.GITHUB_OUTPUT;
if(decision.action==='block')throw Error('Fail-closed: '+decision.reason);
if(decision.action==='add-reserve'){
 const expanded=addReserve(catalog,decision);
 writeFileSync(catalogPath,JSON.stringify(expanded,null,2)+'\n');
 console.log('STAGING_APPEND_ONLY_DB_CATALOG_CREATED',decision.id,decision.database_name,
  'GITHUB_DEPLOYMENT_REQUIRED_BEFORE_USE');
}
if(output)appendFileSync(output,'replenish='+(decision.action==='add-reserve'?'true':'false')+'\n');
