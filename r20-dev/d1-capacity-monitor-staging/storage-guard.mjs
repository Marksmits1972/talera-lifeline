// Pure D1 10GB hard-limit guard. New accounts are redirected only by
// changing active shard status; existing assigned accounts are NEVER moved.
// Applies to the isolated staging D1 registry. Never accepts user input.
export const WARN_BYTES=7_500_000_000;
export const STOP_NEW_ASSIGNMENTS_BYTES=8_000_000_000;
export function decideStorageHeadroom({states,bytes,allowedIds}){
 if(!Array.isArray(states)||!bytes||!Array.isArray(allowedIds)||
  !states.length||states.some(s=>!allowedIds.includes(s.shard_id)||
  !['active','disabled','draining'].includes(s.state)||
  typeof bytes[s.shard_id]!=='number'||!Number.isFinite(bytes[s.shard_id])||
  bytes[s.shard_id]<0))
   return {action:'block',reason:'INVALID_DIRECTORY_OR_STORAGE_METRICS'};
 const active=states.filter(s=>s.state==='active');
 const standby=states.filter(s=>s.state==='disabled');
 const high=active.filter(s=>bytes[s.shard_id]>=STOP_NEW_ASSIGNMENTS_BYTES)
  .sort((a,b)=>bytes[b.shard_id]-bytes[a.shard_id]);
 const warning=states.filter(s=>bytes[s.shard_id]>=WARN_BYTES)
  .map(s=>({shard:s.shard_id,bytes:bytes[s.shard_id],
   existingAccountsStillWriteHere:s.state!=='disabled'}));
 if(!high.length)return {action:'none',reason:'DATABASES_HAVE_HEADROOM',warning};
 if(!standby.length)return {action:'block',reason:'NO_STANDBY_FOR_STORAGE_PRESSURE',warning};
 const next=standby.sort((a,b)=>a.shard_id.localeCompare(b.shard_id))[0];
 return {action:'activate-and-drain',activate:next.shard_id,drain:high[0].shard_id,
  reason:'D1_OVER_80_PERCENT_PREVENT_NEW_ACCOUNT_ASSIGNMENTS',
  warning,critical:'Existing users remain on the original D1, and may still require planned migration before 10GB.'};
}
