/* TALERA Premium: read-only completeness inspection.
 * "manifest_matched" means all supported *local* entries are registered remotely,
 * NOT that unsupported/oversized files are transferred, or that a full
 * R2 object restore/streaming integrity audit has been performed.
 */
import {listLocalPremiumMedia,createPremiumManifest,inspectPremiumLocalFileCoverage} from './premium-indexeddb-bridge.mjs';
import {listLocalPremiumRecords,createPremiumRecordSnapshot} from './premium-records-bridge.mjs';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function json(fetcher,path){
 const response=await fetcher(path,{method:'GET',credentials:'same-origin',cache:'no-store'});
 if(!response?.ok)throw Error('premium_audit_api_unavailable');
 return response.json();
}
export async function fetchPremiumManifestIds(fetcher,type){
 if(!['media','records'].includes(type))throw Error('invalid_manifest_kind');
 const field=type==='media'?'media_id':'record_id';
 const rows=new Map(),cursors=new Set();let after=null;
 for(let n=0;n<1000;n++){
  const page=await json(fetcher,'/api/premium/cloud/'+type+(after?'?after='+encodeURIComponent(after):''));
  if(page?.ok!==true||!Array.isArray(page.items)||page.items.length>500)throw Error('invalid_manifest_page');
  for(const row of page.items){
   const id=row?.[field];
   if(!UUID.test(id||'')||rows.has(id))throw Error('duplicate_or_invalid_manifest_id');
   rows.set(id,row);
  }
  if(!page.next)return rows;
  if(!UUID.test(page.next)||page.next===after||cursors.has(page.next)||page.items.length!==500)throw Error('invalid_manifest_cursor');
  cursors.add(page.next);after=page.next;
 }
 throw Error('manifest_page_limit');
}
export async function auditPremiumSync({indexedDB,crypto,fetcher,expectedAccountId,ownerMatches=()=>false,online=()=>true}={}){
 if(!UUID.test(expectedAccountId||'')||!crypto?.subtle||typeof fetcher!=='function')return {phase:'not_enabled'};
 if(!online())return {phase:'offline'};
 const guarded=()=>ownerMatches()===true;
 if(!guarded())return {phase:'not_enabled'};
 const [rights,consent]=await Promise.all([json(fetcher,'/api/me/entitlements'),json(fetcher,'/api/premium/cloud/consent')]);
 if(rights.accountId!==expectedAccountId||rights.rights?.permissions?.cloud_storage!==true||
  rights.rights?.available?.cloud_storage!==true||consent?.consent?.enabled!==true||!guarded())return {phase:'not_enabled'};
 // Inspect server first; no Free archive read if cloud rights or consent are missing.
 const [remoteMedia,remoteRecords]=await Promise.all([
  fetchPremiumManifestIds(fetcher,'media'),fetchPremiumManifestIds(fetcher,'records')
 ]);
 if(!guarded())return {phase:'not_enabled'};
 const coverage=await inspectPremiumLocalFileCoverage({indexedDB});
 const localMedia=await listLocalPremiumMedia({indexedDB});
 const localRecords=await listLocalPremiumRecords({indexedDB});
 if(!guarded())return {phase:'not_enabled'};
 let mediaMissing=0,recordsMissing=0,mediaMatched=0,recordsMatched=0,oversizedRecords=0;
 for(const media of localMedia){
  if(!guarded())return {phase:'not_enabled'};
  // Oversized media are not yet supported in staging; count separately.
  if(media.size>25*1024*1024||media.size<1)continue;
  const manifest=await createPremiumManifest(media,{crypto});
  if(remoteMedia.has(manifest.mediaId))mediaMatched++;else mediaMissing++;
 }
 for(const source of localRecords){
  if(!guarded())return {phase:'not_enabled'};
  let snapshot;
  try{snapshot=await createPremiumRecordSnapshot(source,{crypto})}
  catch(error){if(error?.message==='record_too_large'){oversizedRecords++;continue}throw error}
  const remote=remoteRecords.get(snapshot.id);
  if(remote?.kind===snapshot.kind&&remote.sha256===snapshot.sha256)recordsMatched++;
  else recordsMissing++;
 }
 const blocked=coverage.oversized+coverage.unsupported+oversizedRecords;
 const missing=mediaMissing+recordsMissing;
 return {
  phase:blocked?'needs_attention':missing?'pending':'manifest_matched',
  mediaMatched,recordsMatched,mediaMissing,recordsMissing,
  oversized:coverage.oversized,oversizedRecords,unsupported:coverage.unsupported,
  localMediaTotal:coverage.uploadable+coverage.oversized+coverage.unsupported,
  localRecordsTotal:localRecords.length,
  // This is only a manifest-level comparison, never a claim of full restore.
  verifiedObjects:false
 };
}
