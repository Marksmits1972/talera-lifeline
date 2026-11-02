/* TALERA Premium pilot coordinator. Not mounted in the active PWA.
 * Reuses Free IndexedDB read-only and existing Premium cloud API.
 * The server remains the authority for rights and consent.
 */
import {listLocalPremiumMedia,createPremiumManifest,uploadLocalPremiumMedia} from './premium-indexeddb-bridge.mjs';
import {syncPremiumPending} from './premium-sync-queue.mjs';
import {createLargeMediaManifest,uploadLargePremiumMedia,LARGE_THRESHOLD,LARGE_MEDIA_LIMIT} from './premium-large-media.mjs';
const json=async(fetcher,path)=>{const r=await fetcher(path,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error('premium_api_unavailable');return r.json()};
export async function runPremiumMediaSync({indexedDB,crypto,fetcher,online=()=>true,maxItems=10,expectedAccountId=null,ownerMatches=()=>true}={}) {
 if(!fetcher||!crypto?.subtle)return {phase:'not_enabled',uploaded:0,pending:0};
 const allowed=async()=>{
  if(expectedAccountId&&ownerMatches()!==true)return false;
  const [rights,consent]=await Promise.all([json(fetcher,'/api/me/entitlements'),json(fetcher,'/api/premium/cloud/consent')]);
  if(expectedAccountId&&(rights?.accountId!==expectedAccountId||ownerMatches()!==true))return false;
  return rights?.rights?.permissions?.cloud_storage===true && rights?.rights?.available?.cloud_storage===true && consent?.consent?.enabled===true;
 };
 if(!online())return {phase:'offline',uploaded:0,pending:0};
 if(!(await allowed().catch(()=>false)))return {phase:'not_enabled',uploaded:0,pending:0};
 const stored=new Map();
 let after=null,pages=0;
 do{
  const remote=await json(fetcher,'/api/premium/cloud/media'+(after?'?after='+encodeURIComponent(after):''));
  if(remote?.ok!==true||!Array.isArray(remote.items)||remote.items.length>500)throw Error('invalid_media_manifest');
  for(const row of remote.items)stored.set(row.media_id,row);
  after=remote.next||null;
  if(after&&(!/^[0-9a-f-]{36}$/i.test(after)||++pages>1000))throw Error('invalid_media_cursor');
 }while(after);
 const local=await listLocalPremiumMedia({indexedDB});
 const items=[];
 for(const media of local){
  if(media.size>LARGE_MEDIA_LIMIT||media.size<1)throw Error('media_size_not_supported');
  const manifest=media.size>LARGE_THRESHOLD?
   await createLargeMediaManifest(media,{crypto}):await createPremiumManifest(media,{crypto});
  const remote=stored.get(manifest.mediaId);
  if(remote&&(remote.byte_size!==media.size||remote.content_type!==media.mime||
    (manifest.large&&(remote.sha256!==manifest.fingerprint||remote.digest_kind!=='part-sha256-v1'))))
   throw Error('remote_media_conflict');
  if(!remote)items.push({media,manifest});
 }
 return syncPremiumPending({
  listPending:async()=>items,
  readMedia:async item=>item.media,
  upload:async(item,media)=>{
   if(expectedAccountId&&ownerMatches()!==true)return {ok:false,reason:'account_changed'};
   return item.manifest.large?
    uploadLargePremiumMedia({media,manifest:item.manifest,fetcher,crypto,ownerMatches}):
    uploadLocalPremiumMedia({media,manifest:item.manifest,fetcher,crypto});
  },
  markSynced:async item=>{stored.set(item.manifest.mediaId,{byte_size:item.manifest.size,content_type:item.manifest.mime})},
  allowed,
  online,
  maxItems
 });
}
