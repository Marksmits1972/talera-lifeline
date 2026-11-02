/* TALERA Premium pilot coordinator. Not mounted in the active PWA.
 * Reuses Free IndexedDB read-only and existing Premium cloud API.
 * The server remains the authority for rights and consent.
 */
import {listLocalPremiumMedia,createPremiumManifest,uploadLocalPremiumMedia} from './premium-indexeddb-bridge.mjs';
import {syncPremiumPending} from './premium-sync-queue.mjs';
const json=async(fetcher,path)=>{const r=await fetcher(path,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error('premium_api_unavailable');return r.json()};
export async function runPremiumMediaSync({indexedDB,crypto,fetcher,online=()=>true,maxItems=10}={}) {
 if(!fetcher||!crypto?.subtle)return {phase:'not_enabled',uploaded:0,pending:0};
 const allowed=async()=>{
  const [rights,consent]=await Promise.all([json(fetcher,'/api/me/entitlements'),json(fetcher,'/api/premium/cloud/consent')]);
  return rights?.rights?.permissions?.cloud_storage===true && rights?.rights?.available?.cloud_storage===true && consent?.consent?.enabled===true;
 };
 if(!online())return {phase:'offline',uploaded:0,pending:0};
 if(!(await allowed().catch(()=>false)))return {phase:'not_enabled',uploaded:0,pending:0};
 const remote=await json(fetcher,'/api/premium/cloud/media');
 const stored=new Set((remote.items||[]).map(x=>x.media_id));
 const local=await listLocalPremiumMedia({indexedDB});
 const items=[];
 for(const media of local){
  const manifest=await createPremiumManifest(media,{crypto});
  if(!stored.has(manifest.mediaId))items.push({media,manifest});
 }
 return syncPremiumPending({
  listPending:async()=>items,
  readMedia:async item=>item.media,
  upload:async(item,media)=>uploadLocalPremiumMedia({media,manifest:item.manifest,fetcher,crypto}),
  markSynced:async item=>{stored.add(item.manifest.mediaId)},
  allowed,
  online,
  maxItems
 });
}
