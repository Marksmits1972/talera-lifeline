// TALERA staging automatic capacity policy: decisions ONLY, no network writes.
// Real analytics are sampled and may arrive late; never infer safety from
// missing rows, and never migrate or retire occupied data shards automatically.
export const POLICY=Object.freeze({
  windowMinutes:5,
  windowsRequired:3,
  lagMinutes:10,
  highQps:100,
  warningQps:30,
  highMeanQueryMs:15,
  maxActivationPerEvaluation:1,
});
export function requiredBuckets(now=new Date(),policy=POLICY){
 const step=policy.windowMinutes*60000;
 const end=Math.floor(now.getTime()/step)*step-policy.lagMinutes*60000;
 return Array.from({length:policy.windowsRequired},(_,i)=>
  new Date(end-step*(policy.windowsRequired-i)).toISOString());
}
export function evaluatePressure({rows,activeDatabaseIds,standbyShards,now=new Date(),policy=POLICY}){
 if(!Array.isArray(rows)||!Array.isArray(activeDatabaseIds)||!Array.isArray(standbyShards))
  return {action:'block',reason:'INVALID_TELEMETRY'};
 if(!standbyShards.length)return {action:'none',reason:'NO_PREPROVISIONED_STANDBY'};
 if(!activeDatabaseIds.length)return {action:'block',reason:'NO_ACTIVE_DATA_SHARDS'};
 const buckets=requiredBuckets(now,policy);
 const details=[];
 for(const dbid of activeDatabaseIds){
  const history=buckets.map(time=>{
   const found=rows.filter(r=>r.databaseId===dbid&&Date.parse(r.bucket)===Date.parse(time));
   if(found.length!==1)return null;
   const row=found[0];
   const count=Number(row.queryCount),mean=Number(row.avgDurationMs);
   if(!Number.isFinite(count)||count<0||!Number.isFinite(mean)||mean<0)return null;
   const qps=count/(policy.windowMinutes*60);
   return {bucket:time,qps:Number(qps.toFixed(2)),meanMs:mean,
    high:qps>=policy.highQps||(qps>=policy.warningQps&&mean>=policy.highMeanQueryMs)};
  });
  if(history.some(x=>x===null))return {action:'block',reason:'INCOMPLETE_OR_LATE_ANALYTICS',dbid,
    requiredBuckets:buckets};
  details.push({dbid,history,highForThreeConsecutiveWindows:history.every(x=>x.high)});
 }
 const high=details.filter(x=>x.highForThreeConsecutiveWindows);
 if(!high.length)return {action:'none',reason:'METRICS_BELOW_THRESHOLDS',details};
 const candidate=standbyShards[0];
 if(!/^[A-Z][A-Z0-9]{0,7}$/.test(candidate))return {action:'block',reason:'INVALID_STANDBY'};
 return {action:'activate',shard:candidate,
  reason:'SUSTAINED_D1_QUERY_PRESSURE_ON_EXISTING_SHARD',
  highShards:high.map(x=>x.dbid),details,
  caveat:'Only NEW accounts can be assigned to this newly activated shard. Existing hot shard remains hot.'};
}
