/*
 TALERA isolated capacity monitor. This is a real Cloudflare CRON Worker that
 uses the Analytics SQL *binding*, not an API token, and can only change
 the staging D1 directory. It may activate a pre-bound spare, never create,
 migrate, merge or delete a D1 database.
 Source: https://developers.cloudflare.com/analytics/sql-api/workers-binding/
*/
import {evaluatePressure} from '../d1-router-staging/capacity-policy.mjs';
const SQL_START_MINUTES=55;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACCOUNT_SHARD=/^[A-Z][A-Z0-9]{0,7}$/;
function getMap(raw){
 const obj=JSON.parse(raw||'null');
 if(!obj||Object.keys(obj).length!==3||Object.keys(obj).some(k=>!['A','B','C'].includes(k)||!UUID.test(obj[k])))
  throw new Error('Unverified staging shard UUID map');
 return obj;
}
const primary=db=>db.withSession('first-primary');
export async function monitorCapacity(env,now=new Date()){
 if(!env.DIRECTORY_DB?.batch||!env.ANALYTICS_SQL?.query)throw new Error('Missing isolated capacity monitor bindings');
 const map=getMap(env.STAGING_SHARD_IDS_JSON);
 const rows=await primary(env.DIRECTORY_DB).prepare('SELECT shard_id,state FROM shards ORDER BY shard_id').all();
 const states=rows.results||[];
 if(!states.length||states.some(s=>!ACCOUNT_SHARD.test(s.shard_id)||!(s.shard_id in map)||
  !['active','disabled','draining'].includes(s.state)))
  throw new Error('Unexpected staging shard catalog');
 const active=states.filter(s=>s.state==='active');
 const standby=states.filter(s=>s.state==='disabled'&&s.shard_id==='C');
 if(!active.length)return {action:'block',reason:'NO_ACTIVE_DATABASE'};
 if(!standby.length)return {action:'none',reason:'NO_SPARE_DATABASE'};
 const activeIds=active.map(s=>map[s.shard_id].toLowerCase());
 // Identifiers are validated UUIDs from GitHub's checked-in catalog and the
 // bound account; never accept an untrusted SQL identifier or client filter.
 const quoted=activeIds.map(id=>"'"+id+"'").join(',');
 const start=new Date(now.getTime()-SQL_START_MINUTES*60_000).toISOString();
 const statement='SELECT databaseId, toStartOfFiveMinutes(timestamp) AS bucket,'+
  ' COUNT(*) AS queryCount, AVG(queryDurationMs) AS avgDurationMs'+
  ' FROM events.d1Queries WHERE timestamp >= $start AND databaseId IN ('+quoted+')'+
  ' GROUP BY databaseId,bucket ORDER BY bucket DESC LIMIT 120';
 const metrics=await env.ANALYTICS_SQL.query({query:statement,params:{start}});
 if(!metrics||!Array.isArray(metrics.data))throw new Error('D1 Analytics SQL unavailable');
 const decision=evaluatePressure({rows:metrics.data,activeDatabaseIds:activeIds,
  standbyShards:standby.map(s=>s.shard_id),now});
 if(decision.action!=='activate'){
  return {action:decision.action,reason:decision.reason,queryWindowsReceived:metrics.data.length};
 }
 const recent=await primary(env.DIRECTORY_DB).prepare(
  "SELECT COUNT(*) AS n FROM capacity_events WHERE action='activate' AND created_at>=datetime('now','-24 hours')"
 ).first();
 if(Number(recent?.n)>0)return {action:'none',reason:'COOLDOWN_24_HOURS'};
 const candidate=decision.shard;
 // In a single D1 batch transaction, update a pre-deployed standby and append
 // an audit entry only when that UPDATE actually changed a row. "changes()" is
 // SQLite's change count of the immediately preceding statement in this batch.
 const changed=await env.DIRECTORY_DB.batch([
  env.DIRECTORY_DB.prepare("UPDATE shards SET state='active' WHERE shard_id=? AND state='disabled'").bind(candidate),
  env.DIRECTORY_DB.prepare(
   "INSERT INTO capacity_events(shard_id,action,reason) SELECT ?,'activate',? WHERE changes()=1"
  ).bind(candidate,decision.reason),
 ]);
 if(!Array.isArray(changed)||changed.length!==2||changed.some(x=>x.success===false))
  throw new Error('Atomic staging activation failed');
 if(Number(changed[0].meta?.changes)===0)return {action:'none',reason:'ALREADY_ACTIVATED_BY_ANOTHER_TASK'};
 if(Number(changed[0].meta?.changes)!==1||Number(changed[1].meta?.changes)!==1)
  throw new Error('Atomic staging activation did not record exactly one audit event');
 const updated=await primary(env.DIRECTORY_DB).prepare(
  'SELECT state FROM shards WHERE shard_id=?'
 ).bind(candidate).first();
 if(updated?.state!=='active')throw new Error('Shard activation not confirmed');
 return {action:'activated',shard:candidate,
  note:'New SYNTHETIC accounts only; old accounts remain on their previous D1.'};
}
export default {
 fetch(){
  return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
 },
 async scheduled(event,env,ctx){
  ctx.waitUntil(monitorCapacity(env).then(result=>{
   console.log('TALERA_STAGING_CAPACITY_CRON',JSON.stringify(result));
  }).catch(e=>{
   console.error('TALERA_STAGING_CAPACITY_CRON_BLOCKED',String(e?.message||e).slice(0,170));
  }));
 }
};
