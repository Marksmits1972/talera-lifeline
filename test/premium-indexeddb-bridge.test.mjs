import test from 'node:test';import assert from 'node:assert/strict';import {createPremiumManifest,uploadLocalPremiumMedia} from '../src/mijn-talera/premium-indexeddb-bridge.mjs';
test('stable media identifier for same local key',async()=>{const x={key:'test-image',blob:new Blob(['abc'],{type:'image/jpeg'}),size:3,mime:'image/jpeg'};const a=await createPremiumManifest(x,{crypto});const b=await createPremiumManifest(x,{crypto});assert.deepEqual(a,b);assert.match(a.mediaId,/^[0-9a-f-]{36}$/)});
test('upload uses same-origin and SHA-256',async()=>{const media={key:'photo_01',blob:new Blob(['abc'],{type:'image/jpeg'}),mime:'image/jpeg'};let seen;const result=await uploadLocalPremiumMedia({media,manifest:{mediaId:'a8f08aa9-a0a2-4ce3-a179-44fb758d1102'},crypto,fetcher:async(url,opts)=>{seen={url,opts};return {ok:true,status:200,json:async()=>({ok:true,reason:'stored'})}}});assert.equal(result.ok,true);assert.equal(seen.opts.credentials,'same-origin');assert.equal(seen.opts.headers['x-content-sha256'].length,64);assert.equal(seen.opts.headers['x-talera-local-key'],'photo_01')});

test('same-size edited media receives new upload identity',async()=>{
 const first={key:'same-memory',mime:'image/jpeg',blob:new Blob(['abc'],{type:'image/jpeg'})};
 const edited={...first,blob:new Blob(['xyz'],{type:'image/jpeg'})};
 const a=await createPremiumManifest(first,{crypto});
 const b=await createPremiumManifest(edited,{crypto});
 assert.notEqual(a.mediaId,b.mediaId);
 assert.equal(a.size,b.size);
});

test('HTTP failure cannot mark media as stored even with optimistic body',async()=>{const media={key:'photo_01',blob:new Blob(['abc'],{type:'image/jpeg'}),mime:'image/jpeg'};const result=await uploadLocalPremiumMedia({media,manifest:{mediaId:'a8f08aa9-a0a2-4ce3-a179-44fb758d1102'},crypto,fetcher:async()=>({ok:false,status:403,json:async()=>({ok:true,reason:'stored'})})});assert.deepEqual(result,{ok:false,reason:'upload_http_failure',status:403})});
test('missing server confirmation cannot mark media as stored',async()=>{const media={key:'photo_01',blob:new Blob(['abc'],{type:'image/jpeg'}),mime:'image/jpeg'};const result=await uploadLocalPremiumMedia({media,manifest:{mediaId:'a8f08aa9-a0a2-4ce3-a179-44fb758d1102'},crypto,fetcher:async()=>({ok:true,status:200,json:async()=>({ok:false})})});assert.deepEqual(result,{ok:false,reason:'upload_not_confirmed'})});
