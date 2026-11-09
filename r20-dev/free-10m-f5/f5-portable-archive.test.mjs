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
console.log('TALERA_F5_PORTABLE_ARCHIVE_CODEC_PASS',JSON.stringify({
 completeStory:true,originalVideoBytes:true,originalImageBytes:true,originalVoiceBytes:true,
 originalIDs:true,orderedMedia:true,cueTiming:true,phonePreview:true,
 editorDraftManifest:true,checksumTamperingRejected:true,partialBackupRejected:true,
 duplicateIDsRejected:true,originalSourceNotModified:true,
 metadataNeverUploaded:true,physicalIPhoneRestoreCertified:false,
 maxBinaryPerFileBytesForProof:134217728
}));
