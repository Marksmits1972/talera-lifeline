import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPremiumCloudBytesReadOnly} from '../src/mijn-talera/premium-cloud-integrity.mjs';
import {createPremiumManifest} from '../src/mijn-talera/premium-indexeddb-bridge.mjs';
import {createLargeMediaManifest} from '../src/mijn-talera/premium-large-media.mjs';
import {createPremiumRecordSnapshot} from '../src/mijn-talera/premium-records-bridge.mjs';
const account='a8f08aa9-a0a2-4ce3-a179-44fb758d1102';
const hex=async buffer=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))]
 .map(v=>v.toString(16).padStart(2,'0')).join('');

async function fixture({broken=false,wrongAccount=false,large=false}={}){
 const contents=large?new Uint8Array(26*1024*1024+3):new Uint8Array([1,2,3,4,5,6]);
 if(large)for(let i=0;i<contents.length;i+=32768)contents[i]=(i/32768)%251;
 const blob=new Blob([contents],{type:large?'video/mp4':'image/jpeg'});
 const source={key:large?'large-film':'my-photo',mime:blob.type,size:blob.size,blob};
 const manifest=large?await createLargeMediaManifest(source,{crypto}):await createPremiumManifest(source,{crypto});
 const sha=large?manifest.fingerprint:await hex(await blob.arrayBuffer());
 const media={media_id:manifest.mediaId,source_key:source.key,byte_size:blob.size,
  content_type:blob.type,sha256:sha,digest_kind:large?'part-sha256-v1':'full-sha256'};
 const story={id:'first-story',title:'Herinnering',items:[{key:source.key}]};
 const record=await createPremiumRecordSnapshot({kind:'story',sourceKey:'story:'+story.id,record:story},{crypto});
 const recordMeta={record_id:record.id,kind:'story',sha256:record.sha256,byte_size:record.bytes.length};
 const calls=[];let localTouched=0;
 const fetcher=async(path,opts={})=>{
  calls.push({path,method:opts.method||'GET'});
  assert.equal(opts.method||'GET','GET','integrity audit may never write');
  if(path==='/api/me/entitlements')return Response.json({accountId:wrongAccount?'00000000-0000-4000-8000-000000000099':account,
   rights:{permissions:{cloud_storage:true},available:{cloud_storage:true}}});
  if(path==='/api/premium/cloud/consent')return Response.json({consent:{enabled:true}});
  if(path==='/api/premium/cloud/media')return Response.json({ok:true,items:[media],next:null});
  if(path==='/api/premium/cloud/records')return Response.json({ok:true,items:[recordMeta],next:null});
  if(path==='/api/premium/cloud/records/story/'+record.id)return new Response(record.bytes,{status:200});
  if(path==='/api/premium/cloud/media/'+media.media_id){
   const range=/bytes=(\d+)-(\d+)/.exec(opts.headers?.range||'');
   assert.ok(range,'media must be requested in bounded ranges');
   const from=Number(range[1]),to=Number(range[2]);
   const portion=contents.slice(from,to+1);
   if(broken&&from===0)portion[0]=99;
   return new Response(portion,{status:206,headers:{'content-range':'bytes '+from+'-'+to+'/'+contents.length}});
  }
  throw Error('unexpected path: '+path);
 };
 return {fetcher,calls,media,record,local:()=>localTouched};
}
test('read-only verification checks photo and story bytes without local IndexedDB or writes',async()=>{
 const fx=await fixture();
 const result=await verifyPremiumCloudBytesReadOnly({fetcher:fx.fetcher,crypto,
  expectedAccountId:account,accountMatches:()=>true});
 assert.equal(result.phase,'cloud_bytes_verified');
 assert.equal(result.cloudBytesVerified,true);
 assert.equal(result.verifiedMedia,1);assert.equal(result.verifiedRecords,1);
 assert.equal(result.localOriginalsCompared,false);
 assert.equal(result.archiveComplete,false,'cloud hashes never prove every original local item was uploaded');
 assert.equal(fx.calls.every(x=>x.method==='GET'),true);
 assert.equal(fx.local(),0);
});
test('altered cloud bytes fail closed and never claim integrity',async()=>{
 const fx=await fixture({broken:true});
 const result=await verifyPremiumCloudBytesReadOnly({fetcher:fx.fetcher,crypto,
  expectedAccountId:account,accountMatches:()=>true});
 assert.equal(result.phase,'needs_attention');
 assert.equal(result.cloudBytesVerified,false);
 assert.equal(result.reason,'cloud_checksum_mismatch');
 assert.equal(fx.calls.every(x=>x.method==='GET'),true);
});
test('mismatched account stops before reading any media or story',async()=>{
 const fx=await fixture({wrongAccount:true});
 const result=await verifyPremiumCloudBytesReadOnly({fetcher:fx.fetcher,crypto,
  expectedAccountId:account,accountMatches:()=>true});
 assert.equal(result.phase,'not_ready');
 assert.equal(result.cloudBytesVerified,false);
 assert.equal(fx.calls.length,2);
});
test('no account ownership stops without any network requests',async()=>{
 const fx=await fixture();
 const result=await verifyPremiumCloudBytesReadOnly({fetcher:fx.fetcher,crypto,
  expectedAccountId:account,accountMatches:()=>false});
 assert.equal(result.phase,'not_enabled');
 assert.equal(fx.calls.length,0);
});
test('multipart video checks chunk fingerprint and ID without opening local DB',async()=>{
 const fx=await fixture({large:true});
 const result=await verifyPremiumCloudBytesReadOnly({fetcher:fx.fetcher,crypto,
  expectedAccountId:account,accountMatches:()=>true});
 assert.equal(result.phase,'cloud_bytes_verified');
 assert.equal(result.cloudBytesVerified,true);
 assert.equal(result.verifiedMedia,1);
 assert.equal(result.verifiedRecords,1);
 assert.equal(result.archiveComplete,false);
});
