// TALERA GitHub-only capacity watcher. Every mutation is confined to 3 named
// isolated D1 TEST databases; no active TALERA databases are referenced.
// Uses Cloudflare SQL Analytics (sampled) to identify 3 sustained 5-minute
// pressure windows. Missing data, permissions, incomplete metrics => NO SCALE.
// One prepared, deployed and bound standby shard may be activated at a time.
// https://developers.cloudflare.com/d1/observability/find-expensive-queries/
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluatePressure} from './capacity-policy.mjs';
const folder=dirname(fileURLToPath(import.meta.url));
const catalog=JSON.parse(readFileSync(join(folder,'shard-catalog.json'),'utf8'));
const dry=process.argv.includes('--dry-run');
const account=String(process.env.CLOUDFLARE_ACCOUNT_ID||'').trim().toLowerCase();
const token=String(process.env.CLOUDFLARE_API_TOKEN||'').trim();
assert.match(account,/^[a-f0-9]{32}$/);
assert.ok(token.length>20);
assert.equal(catalog.worker_name,'talera-d1-stable-router-test-20261108');
const permitted=[catalog.directory_database,...catalog.shards.map(q=>q.database_name)];
for(const name of permitted)assert.match(name,/^talera-d1-router-[a-z0-9-]+-test-20261108$/);
const safeUUID=id=>{assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);return id.toLowerCase()};
const list=JSON.parse(execFileSync('npx',['--no-install','wrangler','d1','list','--json'],{
 cwd:join(folder,'../..'),encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000}));
const data=Array.isArray(list)?list:(list.result||list.databases);
assert.ok(Array.isArray(data));
const ids=new Map();
for(const name of permitted){
 const match=data.filter(x=>x.name===name);
 assert.equal(match.length,1,'Only one match permitted for '+name);
 ids.set(name,safeUUID(match[0].uuid||match[0].id||match[0].database_id));
}
async function d1(sql,params=[]){
 const url='https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database/'+ids.get(catalog.directory_database)+'/query';
 const res=await fetch(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
  body:JSON.stringify({sql,params}),signal:AbortSignal.timeout(20000)});
 const out=await res.json();
 if(!res.ok||out.success!==true||!Array.isArray(out.result))throw Error('Isolated D1 directory query failed: HTTP '+res.status);
 const first=out.result[0];
 if(!first||first.success===false||!Array.isArray(first.results))throw Error('Unexpected D1 query result');
 return first.results;
}
const states=await d1('SELECT shard_id,state FROM shards ORDER BY shard_id');
const catalogIds=new Set(catalog.shards.map(x=>x.id));
if(states.some(x=>!catalogIds.has(x.shard_id)))throw Error('Unknown active shard found in staging directory');
const active=states.filter(x=>x.state==='active').map(x=>catalog.shards.find(q=>q.id===x.shard_id));
const standby=states.filter(x=>x.state==='disabled').map(x=>catalog.shards.find(q=>q.id===x.shard_id))
 .filter(q=>q?.desired_state==='standby');
if(!standby.length){console.log('AUTOSCALE_NO_STANDBY',JSON.stringify({active:active.map(x=>x.id)}));process.exit(0)}
// Validate name -> id against explicitly checked-in catalog; never use a
// metric for unrelated databases on the shared Cloudflare account.
const activeIds=active.map(q=>ids.get(q.database_name));
const uuidList=activeIds.map(x=>"'"+x+"'").join(',');
const sql='SELECT databaseId, toStartOfFiveMinutes(timestamp) AS bucket, COUNT(*) AS queryCount,'+
 ' AVG(queryDurationMs) AS avgDurationMs FROM events.d1Queries'+
 ' WHERE timestamp >= NOW() - INTERVAL \'50\' MINUTE'+
 ' AND databaseId IN ('+uuidList+')'+
 ' GROUP BY databaseId,bucket ORDER BY bucket DESC LIMIT 120';
const analytics=await fetch('https://api.cloudflare.com/client/v4/analytics/sql',{
 method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
 body:JSON.stringify({query:sql,scope:{accountTag:account}}),signal:AbortSignal.timeout(30000)});
const readings=await analytics.json();
if(!analytics.ok||!Array.isArray(readings.data)){
 // A missing Analytics Read permission or unsupported dataset must fail
 // visibly, not silently claim we have functioning automatic monitoring.
 console.error('STAGING_ANALYTICS_UNAVAILABLE',analytics.status,
   'Grant Account Analytics Read to the GitHub Cloudflare token; no shard activated.');
 process.exitCode=2;
}else{
 const decision=evaluatePressure({rows:readings.data,activeDatabaseIds:activeIds,
  standbyShards:standby.map(x=>x.id)});
 console.log('D1_CAPACITY_DECISION',JSON.stringify({action:decision.action,reason:decision.reason,
  active:active.map(x=>x.id),standby:standby.map(x=>x.id),
  sampledBuckets:readings.data.length,mode:dry?'dry-run':'enabled'}));
 if(decision.action==='activate'){
  // No automatic creation/deletion of physical databases. Only a prebound
  // spare declared in GitHub catalog can become active for NEW accounts.
  const cooldown=await d1("SELECT COUNT(*) AS n FROM capacity_events WHERE action='activate' AND created_at >= datetime('now','-24 hours')");
  if(Number(cooldown[0]?.n)>0){
    console.log('D1_AUTOSCALE_COOLDOWN_24H');process.exit(0);
  }
  if(dry){
   console.log('D1_CAPACITY_DRY_RUN_PROPOSED',decision.shard);
  }else{
   assert.equal(process.env.AUTO_ACTIVATE_STAGING,'true','Explicit staging-only GitHub feature flag required');
   assert.equal(catalog.shards.find(x=>x.id===decision.shard)?.desired_state,'standby');
   const before=await d1('SELECT state FROM shards WHERE shard_id=?',[decision.shard]);
   if(before.length!==1||before[0].state!=='disabled')throw Error('Unexpected change in standby state');
   await d1("UPDATE shards SET state='active' WHERE shard_id=? AND state='disabled'",[decision.shard]);
   const after=await d1('SELECT state FROM shards WHERE shard_id=?',[decision.shard]);
   if(after[0]?.state!=='active')throw Error('Automatic activation did not persist');
   await d1("INSERT INTO capacity_events(shard_id,action,reason) VALUES(?,'activate',?)",
    [decision.shard,decision.reason]);
   console.log('D1_STAGING_CAPACITY_AUTO_ACTIVATED',decision.shard,
     'Only NEW synthetic accounts may use this additional data shard.');
  }
 }
}
