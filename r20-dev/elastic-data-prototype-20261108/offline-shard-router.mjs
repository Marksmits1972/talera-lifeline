// TALERA -- NON-PRODUCTION, offline proof of the shard-router contract.
// No Cloudflare imports, no real credentials, no D1 calls, no user data.
// This illustrates stable account-to-database placement and capacity planning.
// It must not be inserted into live TALERA without migrations, authentication,
// binding provisioning, per-feature DB schema and E2E integration tests.
export function hash32(input) {
  const s=String(input);let h=0x811c9dc5;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}
  return h>>>0;
}
export function virtualBucket(userId,totalBuckets=1024){
  if(!Number.isSafeInteger(totalBuckets)||totalBuckets<1)throw Error('invalid bucket count');
  if(!String(userId).trim())throw Error('userId required');
  return hash32(userId)%totalBuckets;
}
export class OfflineAssignmentDirectory {
  #assignments=new Map();
  #counts=new Map();
  #active=new Set();
  constructor(physicalShardIds) {
    for(const id of physicalShardIds)this.addShard(id);
    if(!this.#active.size)throw Error('at least one shard');
  }
  addShard(id){
    if(!/^shard-[a-z0-9_-]{1,30}$/.test(id))throw Error('invalid shard id');
    if(this.#active.has(id))throw Error('duplicate shard id');
    this.#active.add(id);this.#counts.set(id,0);
  }
  getActiveIds(){return [...this.#active].sort();}
  getUserShard(accountId){
    // Caller must validate the authenticated accountId in production.
    return this.#assignments.get(String(accountId))??null;
  }
  provisionNewAccount(accountId){
    const key=String(accountId);
    if(!key||key==='undefined')throw Error('invalid accountId');
    if(this.#assignments.has(key))return this.#assignments.get(key);
    // Balances new users only; old accounts are never moved.
    const fewest=Math.min(...this.#counts.values());
    const choices=this.getActiveIds().filter(id=>this.#counts.get(id)===fewest);
    const chosen=choices[hash32(key)%choices.length];
    this.#assignments.set(key,chosen);
    this.#counts.set(chosen,this.#counts.get(chosen)+1);
    return chosen;
  }
  totals(){return Object.fromEntries([...this.#counts.entries()].sort(([a],[b])=>a.localeCompare(b)));}
  get assignedCount(){return this.#assignments.size;}
  retireShard(){
    throw Error('Never move or retire an occupied user shard on idle-time autoscaling; keep it idle.');
  }
}
export function forecast({registered=1_000_000,DAU,readsPerDAU=15,writesPerDAU=1,peakMultiplier=12,
 meanD1QueryMs=5,physicalShards=1}){
 if(![registered,DAU,readsPerDAU,writesPerDAU,peakMultiplier,meanD1QueryMs,physicalShards].every(Number.isFinite))throw Error('invalid forecast');
 if(!Number.isInteger(physicalShards)||physicalShards<1||DAU<0||DAU>registered||meanD1QueryMs<=0)throw Error('invalid forecast bounds');
 const peakQps=DAU*(readsPerDAU+writesPerDAU)/86400*peakMultiplier;
 // Uniform-load assumption: this is not an observed per-shard query distribution.
 const perShardQps=peakQps/physicalShards;
 const theoreticalQpsPerD1=1000/meanD1QueryMs;
 return {registered,DAU,physicalShards,peakTotalQps:Number(peakQps.toFixed(2)),
   peakPerShardQps:Number(perShardQps.toFixed(2)),
   assumedTheoreticalMaxPerShardQps:theoreticalQpsPerD1,
   utilizationPct:Number((100*perShardQps/theoreticalQpsPerD1).toFixed(2)),
   caveat:'not a measured D1 benchmark; reads may be served by read replicas; one hot user/shared index can defeat uniform assumptions'};
}
export function autoscaleRecommendation({currentShards,shardUtilizationPct,thresholdPct=70,consecutiveWindows=3}){
 if(!Number.isInteger(currentShards)||currentShards<1||!Array.isArray(shardUtilizationPct))throw Error('invalid metrics');
 const overwhelmed=shardUtilizationPct.filter(v=>Number.isFinite(v)&&v>=thresholdPct).length;
 return {
  recommendAddingNewShards:overwhelmed>=consecutiveWindows,
  occupiedShardsMustStayBound:true,
  automaticallyMergeWhenQuiet:false,
  state:'planning-only',
  reason:'Provisions and bindings require an audited control plane; never mutate DBs on an app request.'
 };
}
