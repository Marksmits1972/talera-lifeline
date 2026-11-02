import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPremiumRemoteBytes} from '../src/mijn-talera/premium-restore-verifier.mjs';
import {createPremiumManifest} from '../src/mijn-talera/premium-indexeddb-bridge.mjs';
import {createPremiumRecordSnapshot} from '../src/mijn-talera/premium-records-bridge.mjs';
const account='a8f08aa9-a0a2-4ce3-a179-44fb758d1102';
function localDb(stories,files){
 const requestResult=value=>{
  const r={};queueMicrotask(()=>{r.result=value;r.onsuccess?.()});return r;
 };
 return {open(){
  const r={};queueMicrotask(()=>{
   r.result={objectStoreNames:{contains:name=>['stories','files'].includes(name)},
    transaction(){return {objectStore:name=>({getAll:()=>requestResult(name==='stories'?stories:files)})}},
    close(){}};
   r.onsuccess?.();
  });return r;
 }};
}
async function fixture({corrupt=false,extraUnsupported=false}={}){
 const story={id:'local-story',title:'A happy story',items:[]};
 const data=new Uint8Array([1,2,3,4,5]);
 const media={key:'photo-story',blob:new Blob([data],{type:'image/jpeg'}),mime:'image/jpeg',size:data.length};
 const manifest=await createPremiumManifest(media,{crypto});
 const snap=await createPremiumRecordSnapshot({kind:'story',sourceKey:'story:'+story.id,record:story},{crypto});
 const fetcher=async(path,options={})=>{
  if(path==='/api/me/entitlements')return Response.json({accountId:account,rights:{permissions:{cloud_storage:true},available:{cloud_storage:true}}});
  if(path==='/api/premium/cloud/consent')return Response.json({consent:{enabled:true}});
  if(path==='/api/premium/cloud/media')return Response.json({ok:true,items:[{media_id:manifest.mediaId,byte_size:data.length,content_type:media.mime,digest_kind:'full-sha256'}],next:null});
  if(path==='/api/premium/cloud/records')return Response.json({ok:true,items:[{record_id:snap.id,kind:snap.kind,sha256:snap.sha256}],next:null});
  if(path==='/api/premium/cloud/media/'+manifest.mediaId){
   assert.equal(options.headers.range,'bytes=0-4');
   const body=corrupt?new Uint8Array([1,2,3,4,7]):data;
   return new Response(body,{status:206,headers:{'content-range':'bytes 0-4/5'}});
  }
  if(path==='/api/premium/cloud/records/story/'+snap.id)return new Response(snap.bytes,{status:200});
  throw Error('unexpected URL: '+path);
 };
 const files=[{key:media.key,blob:media.blob}];
 if(extraUnsupported)files.push({key:'unsupported-local-attachment',blob:new Blob(['private sample'],{type:'application/pdf'})});
 return {indexedDB:localDb([story],files),fetcher};
}
test('readback verification confirms exact media bytes and archived story content without local writes',async()=>{
 const {indexedDB,fetcher}=await fixture();
 const result=await verifyPremiumRemoteBytes({indexedDB,crypto,fetcher,expectedAccountId:account,ownerMatches:()=>true});
 assert.deepEqual(result,{phase:'readback_verified',verifiedObjects:true,verifiedMedia:1,verifiedRecords:1});
});
test('altered remote bytes prevent any claim of full completion',async()=>{
 const {indexedDB,fetcher}=await fixture({corrupt:true});
 const result=await verifyPremiumRemoteBytes({indexedDB,crypto,fetcher,expectedAccountId:account,ownerMatches:()=>true});
 assert.equal(result.verifiedObjects,false);
 assert.equal(result.reason,'remote_media_mismatch');
});
test('account mismatch blocks cloud verification and all local reads',async()=>{
 let calls=0,localReads=0;
 const result=await verifyPremiumRemoteBytes({indexedDB:{open(){localReads++}},crypto,
  fetcher:async()=>{calls++;throw Error('unexpected remote call')},
  expectedAccountId:account,ownerMatches:()=>false});
 assert.equal(result.verifiedObjects,false);
 assert.equal(localReads,0);assert.equal(calls,0);
});

test('supported memories are read back even with an unsupported local file; no false full-completion claim',async()=>{
 const {indexedDB,fetcher}=await fixture({extraUnsupported:true});
 const result=await verifyPremiumRemoteBytes({indexedDB,crypto,fetcher,
  expectedAccountId:account,ownerMatches:()=>true});
 assert.equal(result.phase,'supported_readback_verified');
 assert.equal(result.supportedObjectsVerified,true);
 assert.equal(result.verifiedObjects,false);
 assert.equal(result.verifiedMedia,1);
 assert.equal(result.verifiedRecords,1);
 assert.equal(result.unsupported,1);
 assert.equal(result.unsupportedDetails[0].reason,'Bestandstype application/pdf');
});
test('mismatched supported cloud media still fails when there are unsupported local files',async()=>{
 const {indexedDB,fetcher}=await fixture({corrupt:true,extraUnsupported:true});
 const result=await verifyPremiumRemoteBytes({indexedDB,crypto,fetcher,
  expectedAccountId:account,ownerMatches:()=>true});
 assert.equal(result.verifiedObjects,false);
 assert.equal(result.supportedObjectsVerified,false);
 assert.equal(result.reason,'remote_media_mismatch');
});
