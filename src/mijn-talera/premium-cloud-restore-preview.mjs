/* TALERA Premium — safe first stage of restore on a NEW device.
 * Preview the private EU archive without touching Free IndexedDB.
 * Never claim 'ready to restore' if a stored media object lacks its original
 * local Free file key or if old and edited versions claim the same key.
 */
import {fetchPremiumManifestIds} from './premium-sync-audit.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const types=new Set(['image/jpeg','image/png','image/webp','image/heic','audio/mpeg','audio/mp4','audio/webm','video/mp4','video/webm']);
const getJson=async(fetcher,path)=>{
 const r=await fetcher(path,{method:'GET',credentials:'same-origin',cache:'no-store'});
 if(!r?.ok)throw Error('cloud_restore_api_unavailable');
 return r.json();
};
export async function previewPremiumCloudRestore({fetcher,expectedAccountId,online=()=>true}={}){
 if(typeof fetcher!=='function'||!UUID.test(expectedAccountId||''))return {phase:'not_enabled'};
 if(!online())return {phase:'offline'};
 const [entitlement,consent]=await Promise.all([
  getJson(fetcher,'/api/me/entitlements'),getJson(fetcher,'/api/premium/cloud/consent')
 ]);
 if(entitlement?.accountId!==expectedAccountId||
    entitlement?.rights?.permissions?.cloud_storage!==true||
    entitlement?.rights?.available?.cloud_storage!==true||
    consent?.consent?.enabled!==true)return {phase:'not_enabled'};
 const [media,records]=await Promise.all([
  fetchPremiumManifestIds(fetcher,'media'),fetchPremiumManifestIds(fetcher,'records')
 ]);
 const keys=new Set();let missingFileKeys=0,conflictingKeys=0,invalidMedia=0;let atomicBytes=0,atomicIneligible=0,stageIneligible=0,recordBytes=0;
 for(const item of media.values()){
  const key=item.source_key;
  if(typeof key!=='string'||key.length<1){missingFileKeys++;continue}
  if(key.length>240||key.startsWith('talera-thread-archive-v1:')||
     !types.has(item.content_type)||!Number.isSafeInteger(item.byte_size)||item.byte_size<1){
   invalidMedia++;continue;
  }
  if(keys.has(key))conflictingKeys++;else keys.add(key);
  atomicBytes+=item.byte_size;
  const verifiedDigest=/^[a-f0-9]{64}$/.test(item.sha256||'');
  if(item.digest_kind!=='full-sha256'||!verifiedDigest||item.byte_size>25*1024*1024)atomicIneligible++;
  if(!verifiedDigest||!['full-sha256','part-sha256-v1'].includes(item.digest_kind)||
    item.byte_size>2*1024*1024*1024||
    (item.digest_kind==='full-sha256'&&item.byte_size>25*1024*1024)||
    (item.digest_kind==='part-sha256-v1'&&item.byte_size<=25*1024*1024))stageIneligible++;
 }
 let stories=0,comments=0,invalidRecords=0;
 for(const record of records.values()){
  if(record.kind==='story')stories++;
  else if(record.kind==='comment_archive')comments++;
  else invalidRecords++;
  if(!Number.isSafeInteger(record.byte_size)||record.byte_size<1||record.byte_size>1048576||!/^[a-f0-9]{64}$/.test(record.sha256||'')){atomicIneligible++;stageIneligible++}
  else {atomicBytes+=record.byte_size;recordBytes+=record.byte_size}
 }
 const incomplete=missingFileKeys+conflictingKeys+invalidMedia+invalidRecords;
 return {
  phase:incomplete?'needs_attention':media.size+records.size?'manifest_available':'empty',
  media:media.size,stories,comments,
  missingFileKeys,conflictingKeys,invalidMedia,invalidRecords,
  canRestore:false, // Preview does not write; a separate explicit action is required.
  atomicRestoreEligible:incomplete===0&&atomicIneligible===0&&stageIneligible===0&&atomicBytes>0&&atomicBytes<=64*1024*1024,
  largeRestoreEligible:incomplete===0&&stageIneligible===0&&atomicBytes<=4*1024*1024*1024&&recordBytes<=64*1024*1024&&atomicBytes>0,
  atomicBytes,atomicIneligible,stageIneligible,recordBytes,
  originalKeysVerified:incomplete===0
 };
}
