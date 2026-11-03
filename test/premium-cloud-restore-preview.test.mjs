import test from 'node:test';
import assert from 'node:assert/strict';
import {previewPremiumCloudRestore} from '../src/mijn-talera/premium-cloud-restore-preview.mjs';
const id='a8f08aa9-a0a2-4ce3-a179-44fb758d1102';
const mk=(n)=>'00000000-0000-4000-8000-'+n.toString(16).padStart(12,'0');
function fixture({media=[],records=[],account=id,enabled=true}={}){
 const paths=[];
 const fetcher=async(path)=>{
  paths.push(path);
  const json=path==='/api/me/entitlements'?{accountId:account,rights:{permissions:{cloud_storage:true},available:{cloud_storage:true}}}:
   path==='/api/premium/cloud/consent'?{consent:{enabled}}:
   path.includes('/media')?{ok:true,items:media,next:null}:{ok:true,items:records,next:null};
  return {ok:true,json:async()=>json};
 };
 return {fetcher,paths};
}
test('preview lists keyed media, stories and comments without local database access',async()=>{
 const {fetcher,paths}=fixture({media:[{media_id:mk(1),source_key:'photo-1',byte_size:120,content_type:'image/jpeg'}],
  records:[{record_id:mk(2),kind:'story'},{record_id:mk(3),kind:'comment_archive'}]});
 const result=await previewPremiumCloudRestore({fetcher,expectedAccountId:id});
 assert.equal(result.phase,'manifest_available');
 assert.equal(result.media,1);assert.equal(result.stories,1);assert.equal(result.comments,1);
 assert.equal(result.canRestore,false);assert.equal(result.originalKeysVerified,true);
 assert.equal(paths.length,4);
});
test('legacy cloud media without source key cannot be marked ready for restore',async()=>{
 const {fetcher}=fixture({media:[{media_id:mk(1),source_key:null,byte_size:12,content_type:'image/jpeg'}]});
 const result=await previewPremiumCloudRestore({fetcher,expectedAccountId:id});
 assert.equal(result.phase,'needs_attention');assert.equal(result.missingFileKeys,1);
});
test('duplicate local file keys from old and edited versions block restore preview',async()=>{
 const {fetcher}=fixture({media:[{media_id:mk(1),source_key:'photo',byte_size:10,content_type:'image/jpeg'},
  {media_id:mk(2),source_key:'photo',byte_size:11,content_type:'image/jpeg'}]});
 const result=await previewPremiumCloudRestore({fetcher,expectedAccountId:id});
 assert.equal(result.phase,'needs_attention');assert.equal(result.conflictingKeys,1);
});
test('mismatched account does not open user archive manifest',async()=>{
 const {fetcher,paths}=fixture({account:mk(42)});
 const result=await previewPremiumCloudRestore({fetcher,expectedAccountId:id});
 assert.equal(result.phase,'not_enabled');assert.equal(paths.length,2);
});
test('consent absent does not open user archive manifest',async()=>{
 const {fetcher,paths}=fixture({enabled:false});
 const result=await previewPremiumCloudRestore({fetcher,expectedAccountId:id});
 assert.equal(result.phase,'not_enabled');assert.equal(paths.length,2);
});
test('offline preview makes no requests',async()=>{
 let calls=0;
 const result=await previewPremiumCloudRestore({fetcher:async()=>{calls++},expectedAccountId:id,online:()=>false});
 assert.equal(result.phase,'offline');assert.equal(calls,0);
});

test('oversized legacy full-SHA media never advertises an atomic restore button',async()=>{
 const {fetcher}=fixture({media:[{media_id:mk(41),source_key:'video-old',byte_size:26*1024*1024,
  content_type:'video/mp4',sha256:'a'.repeat(64),digest_kind:'full-sha256'}]});
 const result=await previewPremiumCloudRestore({fetcher,expectedAccountId:id});
 assert.equal(result.phase,'manifest_available');
 assert.equal(result.atomicRestoreEligible,false);
 assert.equal(result.largeRestoreEligible,false);
 assert.equal(result.stageIneligible,1);
});
test('valid multipart video has staged eligibility but never atomic-only eligibility',async()=>{
 const {fetcher}=fixture({media:[{media_id:mk(42),source_key:'video-26mb',byte_size:26*1024*1024,
  content_type:'video/mp4',sha256:'b'.repeat(64),digest_kind:'part-sha256-v1'}]});
 const result=await previewPremiumCloudRestore({fetcher,expectedAccountId:id});
 assert.equal(result.phase,'manifest_available');
 assert.equal(result.atomicRestoreEligible,false);
 assert.equal(result.largeRestoreEligible,true);
});
test('invalid historical comments block both restore routes',async()=>{
 const {fetcher}=fixture({records:[{record_id:mk(51),kind:'comment_archive',
  byte_size:1048577,sha256:'f'.repeat(64)}]});
 const result=await previewPremiumCloudRestore({fetcher,expectedAccountId:id});
 assert.equal(result.atomicRestoreEligible,false);
 assert.equal(result.largeRestoreEligible,false);
});
