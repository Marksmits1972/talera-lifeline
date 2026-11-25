// Contract tests of the SAME library factory injected into TALERA's real pages.
// Synthetic data only: no account, no real iPhone records, no deployment.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./f5-library-access.browser.js',import.meta.url),'utf8');
const sandbox={Blob,globalThis:null};
sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox,{filename:'f5-library-access.browser.js'});
const factory=sandbox.TaleraLibraryFactory;
assert.equal(factory.version,1);
assert.equal(typeof factory.create,'function');
const photo=new Blob([Uint8Array.from([3,1,4,1,5])],{type:'image/jpeg'});
const video=new Blob([Uint8Array.from([9,2,6,5])],{type:'video/mp4'});
const voice=new Blob([Uint8Array.from([7,8,9])],{type:'audio/wav'});
const stories=[
 {id:'local-memory-1',date:'1991-12-01',text:'synthetisch',
  items:[{key:'media-photo-1',kind:'photo'},{key:'media-video-1',kind:'video'},
         {key:'media-voice-1',kind:'audio'}],
  narrationCues:[{t:0,mediaId:'media-photo-1'},{t:2000,mediaId:'media-video-1'}]},
 {id:'local-memory-2',date:'2001-01-01',items:[]}
];
const files=new Map([['media-photo-1',photo],['media-video-1',video],['media-voice-1',voice]]);
let gets=0,blobs=0,lists=0,urls=0;
const storage={
 async list(){lists++;return stories},
 async get(id){gets++;return stories.find(s=>s.id===id)||null},
 async blob(id){blobs++;return files.get(id)||null},
 async mediaUrl(id){urls++;return files.has(id)?'blob:approved-origin/'+id:null},
 async displayUrl(id){return files.has(id)?'blob:approved-image/'+id:null},
 async save(){throw Error('WRITE_MUST_NOT_BE_AVAILABLE_TO_PLAYERS')}
};
const library=factory.create(storage);
assert.equal(library.localOnly,true);
assert.ok(Object.isFrozen(library));
assert.equal(library.save,undefined);
assert.equal(library.remove,undefined);
assert.equal(library.openDatabase,undefined);
assert.equal((await library.listStories()).length,2);
assert.equal((await library.readStory('local-memory-1')).text,'synthetisch');
assert.deepEqual(
 [...(await library.orderedMedia('local-memory-1')).map(x=>x.mediaId)],
 ['media-photo-1','media-video-1','media-voice-1']
);
assert.equal((await library.orderedMedia('local-memory-2')).length,0);
assert.ok(Object.isFrozen((await library.orderedMedia('local-memory-1'))[0]));
for(const [id,expected] of files){
 const got=await library.originalBlob(id);
 assert.strictEqual(got,expected,'Never copy, replace or transcode original');
 assert.deepEqual([...new Uint8Array(await got.arrayBuffer())],
  [...new Uint8Array(await expected.arrayBuffer())]);
}
assert.equal(await library.mediaUrl('media-video-1'),'blob:approved-origin/media-video-1');
assert.equal(await library.displayUrl('media-photo-1'),'blob:approved-image/media-photo-1');
const playback={id:'pwa:local-memory-1',
 _zeroItems:stories[0].items.map(it=>({key:it.key,kind:it.kind})),
 _zeroFrames:[{key:'media-photo-1',kind:'photo',url:'blob:temporary-photo'},
              {key:'media-video-1',kind:'video'}],
 _taleraNarrationCues:stories[0].narrationCues};
const p=library.playback(playback);
assert.equal(p.hasVoice,true);
assert.equal(p.voice.key,'media-voice-1');
assert.strictEqual(p.frames,playback._zeroFrames,'Do not alter approved player frames');
assert.strictEqual(p.cues,playback._taleraNarrationCues,'Do not alter cue times');
assert.ok(Object.isFrozen(p));
assert.equal(library.playback({id:'pwa:local-memory-2',items:[]}).hasVoice,false);
await assert.rejects(()=>library.originalBlob('missing'),/TALERA_LIBRARY_ORIGINAL_MEDIA_NOT_FOUND/);
assert.equal(await library.mediaUrl('missing'),null);
assert.equal(await library.blob('missing'),null);
assert.equal(await library.get('missing'),null);
await assert.rejects(()=>library.readStory('missing'),/TALERA_LIBRARY_STORY_NOT_FOUND/);
await assert.rejects(()=>library.readStory(''),/TALERA_LIBRARY_INVALID_STORY_ID/);
await assert.rejects(()=>library.orderedMedia('missing'),/TALERA_LIBRARY_STORY_NOT_FOUND/);
assert.ok(gets>0&&blobs===5&&lists===1&&urls===2);
assert.deepEqual(stories[0].items.map(x=>x.key),['media-photo-1','media-video-1','media-voice-1']);
assert.equal(files.get('media-photo-1'),photo);
console.log('TALERA_LIBRARY_READONLY_GATEWAY_CONTRACT_PASS',JSON.stringify({
 stableMediaIds:true,originalBlobsUnchanged:true,orderedRefs:true,
 narrationCuesUnchanged:true,readOnlyPlayers:true,syntheticOnly:true,
 iPhoneAcceptance:false
}));

// Local capture metadata contract. Real media bytes are never rewritten.
function fixture(le=true,latRef='N',lonRef='E'){
 const t=new Uint8Array(128),v=new DataView(t.buffer);
 const u16=(i,n)=>v.setUint16(i,n,le),u32=(i,n)=>v.setUint32(i,n,le);
 v.setUint16(0,le?0x4949:0x4d4d);u16(2,42);u32(4,8);
 u16(8,1);u16(10,0x8825);u16(12,4);u32(14,1);u32(18,26);
 u16(26,4);
 function entry(i,tag,type,count,val){
  const p=28+i*12;u16(p,tag);u16(p+2,type);u32(p+4,count);
  if(type===2)t[p+8]=val.charCodeAt(0);else u32(p+8,val);
 }
 entry(0,1,2,2,latRef);entry(1,2,5,3,82);entry(2,3,2,2,lonRef);entry(3,4,5,3,106);
 // TIFF header + GPS IFD ends at 82. Reserve 48 bytes for 6 rationals.
 const extended=new Uint8Array(130);extended.set(t);const e=new DataView(extended.buffer);
 [51,59,6,5,53,18].forEach((n,i)=>{e.setUint32(82+i*8,n,le);e.setUint32(86+i*8,1,le)});
 const len=2+6+extended.length;
 return Uint8Array.from([255,216,255,225,len>>8,len&255,69,120,105,102,0,0,...extended,255,217]);
}
for(const le of [true,false]){
 const data=fixture(le);
 const id='gps-photo-'+le, original=new Blob([data],{type:'image/jpeg'});
 files.set(id,original);
 const gps=await library.captureGps(id);
 assert.ok(gps);
 assert.equal(gps.source,'jpeg-exif-gps');
 assert.ok(Math.abs(gps.latitude-(51+59/60+6/3600))<1e-9);
 assert.ok(Math.abs(gps.longitude-(5+53/60+18/3600))<1e-9);
 assert.strictEqual(files.get(id),original);
 assert.deepEqual([...new Uint8Array(await original.arrayBuffer())],[...data]);
}
files.set('gps-south-west',new Blob([fixture(false,'S','W')],{type:'image/jpeg'}));
const southWest=await library.captureGps('gps-south-west');
assert.ok(southWest.latitude<0&&southWest.longitude<0);
files.set('gps-bad-reference',new Blob([fixture(true,'X','E')],{type:'image/jpeg'}));
files.set('gps-truncated',new Blob([fixture().slice(0,-12)],{type:'image/jpeg'}));
const badDenom=fixture();new DataView(badDenom.buffer).setUint32(12+86,0,true);
files.set('gps-zero-denominator',new Blob([badDenom],{type:'image/jpeg'}));
const complete=fixture(), duplicate=Uint8Array.from([255,216,...complete.slice(2,-2),...complete.slice(2)]);
files.set('gps-duplicate',new Blob([duplicate],{type:'image/jpeg'}));
for(const id of ['gps-bad-reference','gps-truncated','gps-zero-denominator','gps-duplicate','media-photo-1','media-video-1','missing']){
 assert.equal(await library.captureGps(id),null,id);
}
await assert.rejects(()=>library.captureGps(''),/TALERA_LIBRARY_INVALID_MEDIA_ID/);
console.log('TALERA_LOCAL_JPEG_CAPTURE_GPS_CONTRACT_PASS');
