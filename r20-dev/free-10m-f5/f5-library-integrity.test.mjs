// TALERA Free: same library-integrity contract used by backup and restore.
// Pure synthetic test values; no user library, no new Worker or app.
import assert from 'node:assert/strict';
import {verifyLibraryMediaIntegrity,verifyRestoredLibraryReadback,createOriginalPayloadStorage} from './f5-library-persistence.mjs';

const photo=new File([new Uint8Array([1,2,3])],'old-photo.heic',{type:'image/heic'});
const video=new File([new Uint8Array([4,5])],'old-video.mov',{type:'video/quicktime'});
const voice=new File([new Uint8Array([6,7,8])],'old-voice.wav',{type:'audio/wav'});
const story={id:'local-test-stable-42',text:'synthetisch',items:[
 {key:'photo-42',kind:'photo'},{key:'video-84',kind:'video'},
 {key:'voice-12',kind:'audio'}],
 narrationCues:[{t:0,index:0,mediaId:'photo-42'},
 {t:1500,index:1,mediaId:'video-84',videoAtMs:250}]
};
const files=[{key:'photo-42',blob:photo},{key:'video-84',blob:video},
 {key:'voice-12',blob:voice},
 {key:'talera-v4-work:manifest',blob:[{media:['photo-42'],voice:'voice-12'}]}];
const before=JSON.stringify(story);
const good=verifyLibraryMediaIntegrity({stories:[story],files});
assert.deepEqual({...good},{stories:1,originalsChecked:3,explicitCuesChecked:2});
assert.equal(JSON.stringify(story),before);
assert.strictEqual(files[0].blob,photo);
const reject=(stories,records,message)=>assert.throws(
 ()=>verifyLibraryMediaIntegrity({stories,files:records}),message);
reject([{...story,items:[...story.items,{key:'unavailable',kind:'photo'}]}],
 files,/TALERA_LIBRARY_MISSING_ORIGINAL_MEDIA_ID/);
reject([story],files.filter(x=>x.key!=='voice-12'),
 /TALERA_LIBRARY_MISSING_ORIGINAL_MEDIA_ID/);
reject([story],files.map(x=>x.key==='photo-42'?{...x,blob:[]} : x),
 /TALERA_LIBRARY_MISSING_OR_EMPTY_ORIGINAL_MEDIA/);
reject([story],files.map(x=>x.key==='photo-42'?{...x,blob:new Blob([])}:x),
 /TALERA_LIBRARY_MISSING_OR_EMPTY_ORIGINAL_MEDIA/);
reject([{...story,narrationCues:[{t:0,index:0,mediaId:'voice-12'}]}],
 files,/TALERA_LIBRARY_INVALID_VOICE_MEDIA_ID/);
reject([{...story,narrationCues:[{t:0,index:0,mediaId:'missing-photo'}]}],
 files,/TALERA_LIBRARY_INVALID_VOICE_MEDIA_ID/);
reject([{...story,narrationCues:null,items:{'0':'photo-42'}}],
 files,/TALERA_LIBRARY_INVALID_STORY_MEDIA/);
reject([story,story],files,/TALERA_LIBRARY_INVALID_OR_DUPLICATE_STORY_ID/);
reject([story],[...files,files[0]],/TALERA_LIBRARY_INVALID_OR_DUPLICATE_FILE_ID/);
// Reject stale index-only narration references before exporting or restoring.
reject([{...story,narrationCues:[{t:0,index:2}]}],files,
 /TALERA_LIBRARY_INVALID_VOICE_MEDIA_INDEX/);
reject([{...story,narrationCues:[{t:0,index:-1}]}],files,
 /TALERA_LIBRARY_INVALID_VOICE_MEDIA_INDEX/);
reject([{...story,narrationCues:[{t:0,index:'not-an-index'}]}],files,
 /TALERA_LIBRARY_INVALID_VOICE_MEDIA_INDEX/);
reject([{...story,narrationCues:[{t:-2,index:0}]}],files,
 /TALERA_LIBRARY_INVALID_VOICE_CUE_TIME/);
reject([{...story,narrationCues:[{t:NaN,index:0}]}],files,
 /TALERA_LIBRARY_INVALID_VOICE_CUE_TIME/);
// A valid permanent mediaId overrides a stale legacy index, as in narrator.
const idOverridesLegacy=verifyLibraryMediaIntegrity({stories:[
 {...story,narrationCues:[{t:0,index:88,mediaId:'video-84'}]}
],files});
assert.equal(idOverridesLegacy.explicitCuesChecked,1);
// Backwards compatibility: existing index-only cues must remain valid.
const legacy=verifyLibraryMediaIntegrity({stories:[
 {...story,narrationCues:[{t:0,index:0},{t:500,index:1}]}
],files});
assert.equal(legacy.explicitCuesChecked,0);
assert.deepEqual({...verifyLibraryMediaIntegrity({stories:[
 {id:'local-text-only',text:'alleen tekst',items:[]}
],files:[]})},{stories:1,originalsChecked:0,explicitCuesChecked:0});
// A restored library must match all original binary bytes, ordered items,
 // narration plan and metadata, not merely contain the same record IDs.
const verified=await verifyRestoredLibraryReadback({stories:[story],files},{
 stories:[{...story}],files:files.map(row=>({...row}))
});
assert.deepEqual({...verified},{storyCount:1,fileCount:4,exact:true});
await assert.rejects(()=>verifyRestoredLibraryReadback({stories:[story],files},{
 stories:[{...story}],files:files.map(row=>row.key==='video-84'?
  {...row,blob:new File([Uint8Array.from([4,6])],'old-video.mov',{type:'video/quicktime'})}:row)
}),/TALERA_RESTORE_READBACK_MISMATCH/);
await assert.rejects(()=>verifyRestoredLibraryReadback({stories:[story],files},{
 stories:[{...story,narrationCues:[{t:9000,index:0}]}],files
}),/TALERA_RESTORE_READBACK_MISMATCH/);
await assert.rejects(()=>verifyRestoredLibraryReadback({stories:[story],files},{
 stories:[story],files:files.filter(row=>row.key!=='photo-42')
}),/TALERA_RESTORE_READBACK_MISMATCH/);
// Same bytes with separate File metadata and IDs require one physical row.
const pool=createOriginalPayloadStorage();
const planA=await pool.prepare('original-a',photo);
const renamed=new File([photo],'other-original.heic',{type:'image/heic',lastModified:1000});
const planB=await pool.prepare('original-b',renamed);
const planC=await pool.prepare('original-c',new File([new Uint8Array([1,2,4])],'other-original.heic',{type:'image/heic',lastModified:1000}));
assert.equal(planA.payloadKey,planB.payloadKey);
assert.notEqual(planA.payloadKey,planC.payloadKey);
const rowFor=p=>({key:p.key,payloadKey:p.payloadKey,metadata:p.metadata});
const physical={key:planA.payloadKey,blob:photo};
const binaryPhysical={key:planA.payloadKey,binaryParts:planA.binaryParts};
const oldLogical=pool.logicalRows([rowFor(planA),rowFor(planB),physical,{key:'raw-old',blob:video}]);
const logical=pool.logicalRows([rowFor(planA),rowFor(planB),binaryPhysical,{key:'raw-old',blob:video}]);
assert.deepEqual(await logical[0].blob.arrayBuffer(),await oldLogical[0].blob.arrayBuffer());
const inline=await pool.encodeInline({key:'draft',blob:renamed});
assert.equal(inline.blob,undefined);
assert.deepEqual(await pool.decodeInline(inline).blob.arrayBuffer(),await renamed.arrayBuffer());
assert.equal(pool.decodeInline(inline).blob.lastModified,renamed.lastModified);
assert.throws(()=>pool.logicalRows([rowFor(planA),{key:planA.payloadKey,binaryParts:[new ArrayBuffer(2)]}]),/TALERA_LIBRARY_INVALID_SHARED_ORIGINAL/);
assert.deepEqual(logical.map(row=>row.key),['original-a','original-b','raw-old']);
assert.equal(logical[1].blob.name,renamed.name);
assert.equal(logical[1].blob.lastModified,renamed.lastModified);
assert.deepEqual(new Uint8Array(await logical[1].blob.arrayBuffer()),new Uint8Array(await photo.arrayBuffer()));
assert.throws(()=>pool.logicalRows([rowFor(planA)]),/TALERA_LIBRARY_INVALID_SHARED_ORIGINAL/);
assert.throws(()=>pool.logicalRows([rowFor(planA),{...physical,blob:new Blob(['wrong size'])}]),/TALERA_LIBRARY_INVALID_SHARED_ORIGINAL/);
assert.throws(()=>pool.logicalRows([{...rowFor(planB),metadata:{...planB.metadata,length:0}},physical]),/TALERA_LIBRARY_INVALID_SHARED_ORIGINAL/);
console.log('TALERA_SHARED_ORIGINAL_LOGICAL_METADATA_CONTRACT_PASS');
console.log('TALERA_RESTORE_ORIGINAL_BYTES_AND_CUES_VERIFIED_PASS');

console.log('TALERA_LIBRARY_ORIGINAL_AND_VOICE_REFERENCES_PASS',JSON.stringify({
 noBytesChanged:true,missingOriginalRejected:true,
 blankOriginalRejected:true,badVoiceCueRejected:true,
 indexOnlyLegacyCompatible:true,indexOnlyCueValidated:true,
  idTakesPrecedence:true,syntheticOnly:true,realIPhoneAccepted:false
}));
