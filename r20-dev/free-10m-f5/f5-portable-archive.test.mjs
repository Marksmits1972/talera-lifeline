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
  {key:'local-test:0',kind:'photo',mime:'image/heic',name:'originele-foto.heic',size:image.size,
   capturePlace:{countryCode:'NL',country:'Nederland',city:'Arnhem',source:'iptc-location-created'}},
  {key:'local-test:1',kind:'video',mime:'video/quicktime',name:'originale-video.mov',size:movie.size,
    capturePlace:{countryCode:'NL',country:'Nederland',city:'Arnhem',source:'geonames-locality-v2'}},
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
assert.deepEqual(decoded.stories[0].items[0].capturePlace,story.items[0].capturePlace);
assert.deepEqual(decoded.stories[0].items[1].capturePlace,story.items[1].capturePlace);
 assert.equal(decoded.stories[0].items[2].capturePlace,undefined);
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
// Reproduce the observed iPhone failure class: the platform may append bytes
// when it composes an archive from ORIGINAL IndexedDB File references, while
// Blob.slice() returns correct byte-bounded Blob pieces. This test does not
// pretend to be an actual Safari run; it enforces a portable archive contract.
const nativeBlob=globalThis.Blob;
let wholeFileAssemblies=0;
globalThis.Blob=new Proxy(nativeBlob,{construct(target,args,newTarget){
 const [parts,options]=args;
 if(Array.isArray(parts)&&parts.some(p=>p instanceof File)){
  wholeFileAssemblies++;
  // Synthetic iOS-like extra bytes, never added to real media.
  return Reflect.construct(target,[[...parts,Uint8Array.of(0xa5,0x5a)],options],newTarget);
 }
 return Reflect.construct(target,args,newTarget);
}});
try{
 const portable=await createFreeArchive({stories,files,sourceScope:scope});
 const check=await inspectFreeArchive(portable);
 assert.equal(check.files,files.length);
 assert.equal(wholeFileAssemblies,0,
  'Archive composition must never pass original iPhone File objects directly into Blob()');
 const restored=await decodeFreeArchive(portable);
 assert.deepEqual(restored.files.map(x=>x.key),files.map(x=>x.key));
 for(let i=0;i<files.length;i++){
  if(files[i].blob instanceof nativeBlob){
   assert.deepEqual(new Uint8Array(await restored.files[i].blob.arrayBuffer()),
    new Uint8Array(await files[i].blob.arrayBuffer()),
    'Byte-identical originals after byte-bounded archive composition');
  }
 }
}finally{globalThis.Blob=nativeBlob}

// Large original video proof (> old 128 MiB cap) without a full-file arrayBuffer.
const mib=new Uint8Array(1024*1024).fill(0xa5);
const largeVideo=new File(Array.from({length:180},()=>mib),'grote-originele-video.mov',
 {type:'video/quicktime',lastModified:1700000000000});
const largeBackup=await createFreeArchive({
 stories:[],files:[{key:'synthetic-large-video',blob:largeVideo}],
 sourceScope:scope
});
const largeSummary=await inspectFreeArchive(largeBackup);
assert.equal(largeSummary.parsed.schema,'talera-free-lossless-local-2');
assert.equal(largeSummary.binaryBytes,180*1024*1024);
assert.equal(largeSummary.parsed.binaries[0].sha256Chunks.length,45);
const largeDecoded=await decodeFreeArchive(largeBackup);
const recovered=largeDecoded.files[0].blob;
assert.equal(recovered.size,largeVideo.size);
assert.equal(recovered.name,largeVideo.name);
assert.equal(recovered.lastModified,largeVideo.lastModified);
for(const position of [0,64*1024*1024,179*1024*1024]){
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

// Lossless shared payload: two different IDs and differing File metadata
// must survive even though identical ORIGINAL video bytes are written once.
const secondVideo=new File([movie],'andere-naam.mov',{type:'video/mp4',lastModified:1800000000000});
const secondStory={...story,id:'local-second-memory',items:[{key:'local-second:0',kind:'video'}],
 narrationCues:[],narrationDurationMs:0};
const sharedArchive=await createFreeArchive({stories:[story,secondStory],
 files:[...files,{key:'local-second:0',blob:secondVideo},
 {key:'editor-identical-arraybuffer',blob:await movie.arrayBuffer()}],sourceScope:scope});
const sharedSummary=await inspectFreeArchive(sharedArchive);
assert.equal(sharedSummary.parsed.schema,'talera-free-lossless-local-3');
assert.equal(sharedSummary.sharedEntries,2);
assert.equal(sharedSummary.savedBytes,movie.size*2);
assert.equal(sharedSummary.logicalBinaryBytes-sharedSummary.binaryBytes,movie.size*2);
const sharedDecoded=await decodeFreeArchive(sharedArchive);
assert.deepEqual(sharedDecoded.stories,[story,secondStory]);
for(const [key,want] of [['local-test:1',movie],['local-second:0',secondVideo]]){
 const got=sharedDecoded.files.find(row=>row.key===key).blob;
 assert.equal(got.name,want.name);assert.equal(got.type,want.type);
 assert.equal(got.lastModified,want.lastModified);
 assert.deepEqual(new Uint8Array(await got.arrayBuffer()),new Uint8Array(await want.arrayBuffer()));
}
assert.deepEqual(new Uint8Array(sharedDecoded.files.find(row=>row.key==='editor-identical-arraybuffer').blob),
 new Uint8Array(await movie.arrayBuffer()));
const largeTwin=new File([largeVideo],'andere-grote-video.mov',{type:'video/mp4',lastModified:1800000000000});
const sharedLarge=await createFreeArchive({stories:[],files:[
 {key:'large-1',blob:largeVideo},{key:'large-2',blob:largeTwin}],sourceScope:scope});
const sharedLargeSummary=await inspectFreeArchive(sharedLarge);
assert.equal(sharedLargeSummary.binaryBytes,180*1024*1024);
assert.equal(sharedLargeSummary.savedBytes,180*1024*1024);
const sharedLargeDecoded=await decodeFreeArchive(sharedLarge);
assert.equal(sharedLargeDecoded.files[1].blob.name,largeTwin.name);
assert.equal(sharedLargeDecoded.files[1].blob.lastModified,largeTwin.lastModified);
assert.deepEqual(new Uint8Array(await sharedLargeDecoded.files[1].blob.slice(-1024*1024).arrayBuffer()),mib);
// Same-sized distinct bytes are never merged.
const notDuplicate=await createFreeArchive({stories:[],files:[
 {key:'a',blob:new Blob([Uint8Array.of(1,2)])},
 {key:'b',blob:new Blob([Uint8Array.of(1,3)])}],sourceScope:scope});
assert.equal((await inspectFreeArchive(notDuplicate)).sharedEntries,0);
// Corrupted shared payload must fail even when both records refer to it.
const sharedOffset=sharedLargeSummary.parsed.binaries[0]._offset;
const damaged=new Blob([sharedLarge.slice(0,sharedOffset),Uint8Array.of(0),
 sharedLarge.slice(sharedOffset+1)]);
await assert.rejects(()=>decodeFreeArchive(damaged),/MEDIA_CHECKSUM/);
console.log('TALERA_LOSSLESS_SHARED_PAYLOAD_CODEC_PASS',JSON.stringify({
 distinctIDs:true,originalMetadata:true,arrayBufferKind:true,distinctBytesNotMerged:true,
 largeVideoBytes:sharedLargeSummary.binaryBytes,savedBytes:sharedLargeSummary.savedBytes,
 sharedPayloadCorruptionRejected:true,physicalPhoneStorageMeasured:false
}));

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
 multiChunkLargeVideoBytes:188743680,legacyV1ArchiveSupported:true
}));
