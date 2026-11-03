/* TALERA Premium: migrate inert Free story/comment snapshots to private EU R2.
 * Uses the same entitlement, one-time consent, account-ownership and queue checks.
 */
import {listLocalPremiumRecords,createPremiumRecordSnapshot,uploadPremiumRecord} from './premium-records-bridge.mjs';
import {syncPremiumPending} from './premium-sync-queue.mjs';
const json=async(fetcher,path)=>{
 const r=await fetcher(path,{method:'GET',credentials:'same-origin',cache:'no-store'});
 if(!r?.ok)throw Error('premium_record_api_unavailable');
 return r.json();
};
export async function runPremiumRecordSync({indexedDB,crypto,fetcher,online=()=>true,maxItems=10,expectedAccountId=null,ownerMatches=()=>true}={}){
 if(!crypto?.subtle||typeof fetcher!=='function')return {phase:'not_enabled',uploaded:0,pending:0};
 const allowed=async()=>{
  if(expectedAccountId&&ownerMatches()!==true)return false;
  const [r,c]=await Promise.all([json(fetcher,'/api/me/entitlements'),json(fetcher,'/api/premium/cloud/consent')]);
  return (!expectedAccountId||(r.accountId===expectedAccountId&&ownerMatches()===true))&&
   r.rights?.permissions?.cloud_storage===true&&r.rights?.available?.cloud_storage===true&&c.consent?.enabled===true;
 };
 if(!online())return {phase:'offline',uploaded:0,pending:0};
 if(!(await allowed().catch(()=>false)))return {phase:'not_enabled',uploaded:0,pending:0};
 const stored=new Set();let after=null,pages=0;
 do{
  const list=await json(fetcher,'/api/premium/cloud/records'+(after?'?after='+encodeURIComponent(after):''));
  if(list?.ok!==true||!Array.isArray(list.items))throw Error('invalid_record_manifest');
  for(const x of list.items)stored.add(x.record_id);
  after=list.next||null;
  if(++pages>1000)throw Error('manifest_too_large');
 }while(after);
 const local=await listLocalPremiumRecords({indexedDB});
 const pending=[];
 for(const source of local){
  if(expectedAccountId&&ownerMatches()!==true)return {phase:'not_enabled',uploaded:0,pending:0};
  const snapshot=await createPremiumRecordSnapshot(source,{crypto});
  if(!stored.has(snapshot.id))pending.push(snapshot);
 }
 return syncPremiumPending({
  listPending:async()=>pending,
  readMedia:async item=>item,
  upload:async item=>{
   if(expectedAccountId&&ownerMatches()!==true)return {ok:false,reason:'account_changed'};
   return uploadPremiumRecord({snapshot:item,fetcher});
  },
  markSynced:async item=>{stored.add(item.id)},
  allowed,online,maxItems
 });
}
