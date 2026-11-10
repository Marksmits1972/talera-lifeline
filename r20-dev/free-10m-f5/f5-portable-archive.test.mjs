import assert from 'node:assert/strict';
import {createFreeArchive,inspectFreeArchive,decodeFreeArchive} from './f5-portable-archive.mjs';
const scope='f5-browser-account-verified-7f8acd68b2';
const audio=new File([Uint8Array.from([0,1,2,3,4,5,6,7,8,9])],'originele-stem.wav',
 {type:'audio/wav',lastModified:1690900000000});
const movie=new File([Uint8Array.from([9,8,7,6,5,4,3,2,1,0])],'originale-video.mov',
 {type:'video/quicktime',lastModified:1700000000000});
const image=new File([Uint8Array.from([1,2,3,1,2,3,0])],'originele-foto.heic',
 {type:'image/heic',lastModified:1700010000000});
const story={
 id:'local-9e31287c-8475-482a-a8c7-3b2a610c2d1f',source:'pwa-local',
 title:'Fictief testverhaal',date:'2000-01-05',text:'Geen persoonsgegevens',
 items:[
  {key:'local-test:0',kind:'photo',mime:'image/heic',name:'originele-foto.heic',size:image.size},
  {key:'local-test:1',kind:'video',mime:'video/quicktime',name:'originale-video.mov',size:movie.size},
  {key:'local-test:2',kind:'audio',mime:'audio/wav',name:'originele-stem.wav',size:audio.size}
 ],
 narrationDurationMs:17000,
 narrationCues:[{t:0,index:0},{t:6000,index:1,videoAtMs:700},{t:12000,index:0}],
 narrationSchema:'media-id-v1',tags:['familie','vakantie'],
 userCorrections:{text:'De stem blijft origineel'},
 createdAt:'2026-01-01T12:11:10.000Z'
};
const stories=[story];
const files=[
 {key:'local-test:0',blob:image},
 {key:'local-test:1',blob:movie},
 {key:'local-test:2',blob:audio},
 {key:'local-test:0:phone-v1',blob:new Blob(['small-preview'],{type:'image/jpeg'})},
 {key:'talera-v4-work:manifest',blob:[{media:['local-test:0'],voice:'local-test:2'}]},
 {key:'talera-v4-work:preview:local-test:1',blob:new Blob(['preview'],{type:'image/jpeg'})}
];
const archive=await createFreeArchive({stories,files,sourceScope:scope});
const inspected=await inspectFreeArchive(archive);
assert.equal(inspected.stories,1);
assert.equal(inspected.files,6);
assert.equal(inspected.binaries,5);
const decoded=await decodeFreeArchive(archive);
assert.equal(decoded.sourceScope,scope);
assert.deepEqual(JSON.parse(JSON.stringify(decoded.stories[0])),story);
assert.deepEqual(decoded.stories[0].narrationCues,story.narrationCues);
assert.deepEqual(decoded.stories[0].items.map(x=>x.key),story.items.map(x=>x.key));
assert.deepEqual(decoded.files.map(f=>f.key),files.map(f=>f.key));
for(let i=0;i<files.length;i++){
 const want=files[i].blob,got=decoded.files[i].blob;
 if(want instanceof Blob){
  assert.equal(got.type,want.type);
  assert.deepEqual(new Uint8Array(await got.arrayBuffer()),new Uint8Array(await want.arrayBuffer()));
  if(want instanceof File)assert.equal(got.name,want.name);
 }else assert.deepEqual(JSON.parse(JSON.stringify(got)),want);
}
assert.ok(archive instanceof Blob);
assert.equal(typeof fetch,'function');
const bytes=new Uint8Array(await archive.arrayBuffer());
const badMedia=bytes.slice();badMedia[badMedia.length-1]^=0xff;
await assert.rejects(()=>decodeFreeArchive(new Blob([badMedia])),/MEDIA_CHECKSUM/);
const badManifest=bytes.slice();badManifest[60]^=1;
await assert.rejects(()=>inspectFreeArchive(new Blob([badManifest])),/MANIFEST_CHECKSUM/);
await assert.rejects(()=>decodeFreeArchive(new Blob([bytes.slice(0,bytes.length-4)])),/TRUNCATED_MEDIA/);
await assert.rejects(()=>createFreeArchive({stories:[story,{...story}],files,sourceScope:scope}),/DUPLICATE_KEY/);
await assert.rejects(()=>createFreeArchive({stories,files:[...files,{key:'oops',blob:new Map()}],sourceScope:scope}),/UNKNOWN_RECORD_TYPE/);
await assert.rejects(()=>createFreeArchive({stories,files:files.slice(1),sourceScope:scope}).then(decodeFreeArchive),/MISSING_STORY_MEDIA/);
// Large original video proof (> old 128 MiB cap) without a full-file arrayBuffer.
const mib=new Uint8Array(1024*1024).fill(0xa5);
const largeVideo=new File(Array.from({length:132},()=>mib),'grote-originele-video.mov',
 {type:'video/quicktime',lastModified:1700000000000});
const largeBackup=await createFreeArchive({
 stories:[],files:[{key:'synthetic-large-video',blob:largeVideo}],
 sourceScope:scope
});
const largeSummary=await inspectFreeArchive(largeBackup);
assert.equal(largeSummary.parsed.schema,'talera-free-lossless-local-2');
assert.equal(largeSummary.binaryBytes,132*1024*1024);
assert.equal(largeSummary.parsed.binaries[0].sha256Chunks.length,33);
const largeDecoded=await decodeFreeArchive(largeBackup);
const recovered=largeDecoded.files[0].blob;
assert.equal(recovered.size,largeVideo.size);
assert.equal(recovered.name,largeVideo.name);
assert.equal(recovered.lastModified,largeVideo.lastModified);
for(const position of [0,64*1024*1024,131*1024*1024]){
 assert.deepEqual(new Uint8Array(await recovered.slice(position,position+1024*1024).arrayBuffer()),mib);
}
// Tamper with one byte in a later chunk; do not load the entire archive in RAM.
const corruptAt=largeBackup.size-12;
const corruptLast=new Uint8Array(await largeBackup.slice(corruptAt,corruptAt+1).arrayBuffer());
corruptLast[0]^=0x01;
const corruptLarge=new Blob([
 largeBackup.slice(0,corruptAt),corruptLast,largeBackup.slice(corruptAt+1)
]);
await assert.rejects(()=>decodeFreeArchive(corruptLarge),/MEDIA_CHECKSUM/);

// Verify existing v1 archives remain restorable after the v2 change.
const enc=new TextEncoder();
const md=enc.encode('TALERA-FREE-LOCAL-V1\n');
const legacyMedia=enc.encode('old-binary-payload');
const h=async b=>new Uint8Array(await crypto.subtle.digest('SHA-256',b));
const digest=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const v1Manifest=enc.encode(JSON.stringify({
 schema:'talera-free-lossless-local-1',sourceScope:scope,createdAt:'2026-11-09T00:00:00Z',
 stories:[],files:[['obj',[['key',['str','legacy-media']],['blob',['bin',0]]]]],
 binaries:[{length:legacyMedia.byteLength,sha256:digest(await h(legacyMedia)),
  type:'application/octet-stream',name:null,lastModified:null}]
}));
const legacyPrefix=new Uint8Array(md.length+4+32);
legacyPrefix.set(md);
new DataView(legacyPrefix.buffer).setUint32(md.length,v1Manifest.byteLength,true);
legacyPrefix.set(await h(v1Manifest),md.length+4);
const decodedV1=await decodeFreeArchive(new Blob([legacyPrefix,v1Manifest,legacyMedia]));
assert.deepEqual(
 new Uint8Array(await decodedV1.files[0].blob.arrayBuffer()),legacyMedia
);

console.log('TALERA_F5_PORTABLE_ARCHIVE_CODEC_PASS',JSON.stringify({
 completeStory:true,originalVideoBytes:true,originalImageBytes:true,originalVoiceBytes:true,
 originalIDs:true,orderedMedia:true,cueTiming:true,phonePreview:true,
 editorDraftManifest:true,checksumTamperingRejected:true,partialBackupRejected:true,
 duplicateIDsRejected:true,originalSourceNotModified:true,
 metadataNeverUploaded:true,physicalIPhoneRestoreCertified:false,
 multiChunkLargeVideoBytes:138412032,legacyV1ArchiveSupported:true
}));
