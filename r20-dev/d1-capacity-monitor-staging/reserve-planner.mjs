// Pure, side-effect-free replenishment decision; use ONLY for test catalog.
export const MAX_STAGE_SHARDS=16;
export const MIN_STANDBY_SHARDS=2;
export const D1_SIZE_GUARD_BYTES=7_500_000_000; // 75% of D1's fixed 10 GB limit
export function shardSuffix(number){
 if(!Number.isSafeInteger(number)||number<0||number>=260)throw Error('Unsafe shard ordinal');
 let n=number,result='';
 do{result=String.fromCharCode(65+n%26)+result;n=Math.floor(n/26)-1}while(n>=0);
 return result;
}
export function planReplenishment({catalog,states,physicalBytes={},maxShards=MAX_STAGE_SHARDS,
 reserveTarget=MIN_STANDBY_SHARDS}){
 if(!catalog||catalog.worker_name!=='talera-d1-stable-router-test-20261108'||
 catalog.directory_database!=='talera-d1-router-directory-test-20261108'||
 !Array.isArray(catalog.shards)||!Array.isArray(states)||
 !Number.isInteger(maxShards)||maxShards<3||maxShards>128||
 !Number.isInteger(reserveTarget)||reserveTarget<1||reserveTarget>4)
  return {action:'block',reason:'INVALID_CONFIG'};
 const ids=new Set(catalog.shards.map(x=>x.id));
 const names=new Set(catalog.shards.map(x=>x.database_name));
 if(ids.size!==catalog.shards.length||names.size!==catalog.shards.length||
 catalog.shards.some(x=>!/^([A-Z]{1,2})$/.test(x.id)||
  !/^talera-d1-router-shard-[a-z]{1,2}-test-20261108$/.test(x.database_name)||
  !['active','standby'].includes(x.desired_state))||
 states.some(x=>!ids.has(x.shard_id)||!['active','disabled','draining'].includes(x.state)))
   return {action:'block',reason:'UNKNOWN_SHARD_OR_STATE'};
 const known=new Map(states.map(s=>[s.shard_id,s.state]));
 if(states.length!==catalog.shards.length||known.size!==states.length)
  return {action:'block',reason:'INCOMPLETE_DATABASE_DIRECTORY'};
 const active=states.filter(x=>x.state==='active').length;
 const standby=states.filter(x=>x.state==='disabled').length;
 const headroom=[];
 for(const shard of catalog.shards){
  const v=physicalBytes[shard.id];
  if(typeof v!=='number'||!Number.isFinite(v)||v<0)
   return {action:'block',reason:'MISSING_FILE_SIZE_METRICS',shard:shard.id};
  if(v>=D1_SIZE_GUARD_BYTES&&known.get(shard.id)==='active')
   headroom.push({shard:shard.id,bytes:v,attention:'D1_APPROACHES_10GB_HARD_LIMIT'});
 }
 if(active<1)return {action:'block',reason:'NO_ACTIVE_SHARD'};
 if(standby>=reserveTarget)return {action:'none',reason:'SAFE_STANDBY_STOCK',active,standby,headroom};
 if(catalog.shards.length>=maxShards)return {action:'block',reason:'MAX_SHARDS_REQUIRES_REVIEW',active,standby,headroom};
 const ordinal=catalog.shards.length;
 const id=shardSuffix(ordinal);
 const name='talera-d1-router-shard-'+id.toLowerCase()+'-test-20261108';
 if(ids.has(id)||names.has(name))return {action:'block',reason:'NON_APPEND_ONLY_CATALOG'};
 return {action:'add-reserve',reason:'REPLENISH_MINIMUM_TWO_PREPROVISIONED_STANDBY_SHARDS',
  id,database_name:name,active,standby,headroom,
  intendedUse:'ONLY_NEW_SYNTHETIC_ACCOUNTS_AFTER_SEPARATE_ACTIVATION'};
}
export function addReserve(catalog,decision){
 if(decision?.action!=='add-reserve')throw Error('No safe reserved shard to add');
 return {...catalog,shards:[...catalog.shards,{id:decision.id,database_name:decision.database_name,
  desired_state:'standby'}]};
}
