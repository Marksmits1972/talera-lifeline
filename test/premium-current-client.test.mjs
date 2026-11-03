import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fetchPremiumCurrentVersions,commitPremiumCurrentVersion} from '../src/mijn-talera/premium-current-client.mjs';
import {previewPremiumCloudRestore} from '../src/mijn-talera/premium-cloud-restore-preview.mjs';

const acc='a8f08aa9-a0a2-4ce3-a179-44fb758d1102';
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const digest='a'.repeat(64);
test('client reads current source identities and commits edited snapshot against the old ID',async()=>{
 const requests=[],existing=uid(1),updated=uid(2);
 const fetcher=async(path,options={})=>{
  requests.push({path,options});
  if(path.startsWith('/api/premium/cloud/current?'))return Response.json({ok:true,items:[{
   kind:'media',source_key:'my-photo',current_id:existing,revision:1
  }],next:null});
  if(path==='/api/premium/cloud/current')return Response.json({ok:true,reason:'current_updated',revision:2});
  throw Error('unexpected request');
 };
 const state=await fetchPremiumCurrentVersions(fetcher,'media');
 assert.equal(state.get('my-photo').current_id,existing);
 const done=await commitPremiumCurrentVersion({fetcher,kind:'media',sourceKey:'my-photo',snapshotId:updated,expectedCurrentId:existing});
 assert.equal(done.ok,true);
 const submitted=JSON.parse(requests.at(-1).options.body);
 assert.deepEqual(submitted,{kind:'media',sourceKey:'my-photo',snapshotId:updated,expectedCurrentId:existing});
 assert.equal('accountId' in submitted,false,'identity must be derived from the authenticated server session');
});
test('server conflict is reported to queue, not silently retried as success',async()=>{
 const result=await commitPremiumCurrentVersion({fetcher:async()=>({ok:false,status:409}),
  kind:'story',sourceKey:'story:life',snapshotId:uid(2),expectedCurrentId:uid(1)});
 assert.deepEqual(result,{ok:false,reason:'current_changed'});
});
test('client rejects duplicate current source keys, unexpected kinds and unsafe cursors',async()=>{
 await assert.rejects(fetchPremiumCurrentVersions(async()=>Response.json({ok:true,items:[
  {kind:'media',source_key:'photo',current_id:uid(1),revision:1},
  {kind:'media',source_key:'photo',current_id:uid(2),revision:2}
 ],next:null}),'media'),/invalid_current_row/);
 await assert.rejects(fetchPremiumCurrentVersions(async()=>Response.json({ok:true,items:[
  {kind:'story',source_key:'photo',current_id:uid(1),revision:1}
 ],next:null}),'media'),/invalid_current_row/);
 await assert.rejects(fetchPremiumCurrentVersions(async()=>Response.json({ok:true,items:[],next:'x'}),'media'),/invalid_current_cursor/);
});
test('restore preview sees exactly one current photo and story after edits',async()=>{
 // The authenticated server manifests are filtered by the D1 current pointers.
 // Old immutable objects remain stored but are not in the active manifest.
 const media=[{media_id:uid(2),source_key:'photo-1',content_type:'image/jpeg',byte_size:40,
   sha256:digest,digest_kind:'full-sha256'}];
 const stories=[{record_id:uid(4),kind:'story',byte_size:120,sha256:digest}];
 const fetcher=async path=>{
  if(path==='/api/me/entitlements')return Response.json({
   accountId:acc,rights:{permissions:{cloud_storage:true},available:{cloud_storage:true}}});
  if(path==='/api/premium/cloud/consent')return Response.json({consent:{enabled:true}});
  if(path==='/api/premium/cloud/media')return Response.json({ok:true,items:media,next:null});
  if(path==='/api/premium/cloud/records')return Response.json({ok:true,items:stories,next:null});
  throw Error('unexpected endpoint '+path);
 };
 const preview=await previewPremiumCloudRestore({fetcher,expectedAccountId:acc});
 assert.equal(preview.phase,'manifest_available');
 assert.equal(preview.media,1);
 assert.equal(preview.stories,1);
 assert.equal(preview.conflictingKeys,0);
 assert.equal(preview.atomicRestoreEligible,true);
});
test('both manifest endpoints select only D1 current pointers; no legacy snapshots leak to restore',()=>{
 const media=readFileSync(new URL('../src/core/premium-cloud-routes.mjs',import.meta.url),'utf8');
 const records=readFileSync(new URL('../src/core/premium-private-records.mjs',import.meta.url),'utf8');
 assert.match(media,/JOIN talera_premium_current c ON c\.account_id=m\.account_id AND c\.kind='media' AND c\.current_id=m\.media_id/);
 assert.match(records,/JOIN talera_premium_current c ON c\.account_id=r\.account_id AND c\.kind=r\.kind AND c\.current_id=r\.record_id/);
});
