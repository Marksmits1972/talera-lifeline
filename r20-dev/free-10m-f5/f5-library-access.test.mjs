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

function movieFixture(value='+51.9850+005.8883+012.0/',full=true,legacy=null){
 const bytes=s=>Uint8Array.from(s,c=>c.charCodeAt(0));
 const word=n=>Uint8Array.from([n>>>24,n>>>16&255,n>>>8&255,n&255]);
 const concat=(...parts)=>Uint8Array.from(parts.flatMap(x=>[...x]));
 const box=(type,...parts)=>{const b=concat(...parts);return concat(word(b.length+8),typeof type==='number'?word(type):bytes(type),b)};
 const name=bytes('com.apple.quicktime.location.ISO6709');
 const keys=box('keys',word(0),word(1),word(name.length+8),bytes('mdta'),name);
 const hdlr=box('hdlr',word(0),word(0),bytes('mdta'),word(0),word(0),word(0));
 const item=box('ilst',box(1,box('data',word(1),word(0),bytes(value))));
 const meta=box('meta',...(full?[word(0)]:[]),hdlr,keys,item);
 const old=legacy===null?[]:[box('\xa9xyz',Uint8Array.from([legacy.length>>8,legacy.length&255,0,0]),bytes(legacy))];
 return concat(box('ftyp',bytes('qt  '),word(0)),box('mdat',new Uint8Array(20)),box('moov',box('udta',meta,...old)));
}
for(const full of [true,false]){
 const data=movieFixture(undefined,full),id='gps-movie-'+full;
 const original=new Blob([data],{type:'video/quicktime'});files.set(id,original);
 const gps=await library.captureGps(id);
 assert.equal(gps?.latitude,51.985);
 assert.equal(gps?.longitude,5.8883);
 assert.equal(gps?.source,'quicktime-iso6709');
 assert.deepEqual([...new Uint8Array(await original.arrayBuffer())],[...data]);
}
for(const [id,data] of [
 ['bad-movie',movieFixture('+99.0000+005.8883/')],
 ['bad-iso',movieFixture('Arnhem')],
 ['conflicting-movie',movieFixture(undefined,true,'+50.0000+005.8883/')],
 ['truncated-movie',movieFixture().slice(0,-3)]
]){
 files.set(id,new Blob([data],{type:'video/mp4'}));
 assert.equal(await library.captureGps(id),null,id);
}
// Large movie payload is skipped; the reader must not copy the media data.
const fixtureMovie=movieFixture();
const tail=fixtureMovie.slice(44);
const header=Uint8Array.from([0,0,0,16,102,116,121,112,113,116,32,32,0,0,0,0]);
const payloadSize=8*1024*1024;
const len=payloadSize+8;
const mdat=Uint8Array.from([len>>>24,len>>>16&255,len>>>8&255,len&255,109,100,97,116]);
const large=new Blob([header,mdat,new Uint8Array(payloadSize),tail],{type:'video/mp4'});
files.set('large-movie',large);
assert.equal((await library.captureGps('large-movie'))?.latitude,51.985);
console.log('TALERA_LOCAL_QUICKTIME_CAPTURE_GPS_CONTRACT_PASS');

function heifFixture(jpeg,{link=1,method=1,offset=0}={}){
 const word=(n,w=4)=>Uint8Array.from(Array.from({length:w},(_,i)=>Math.floor(n/256**(w-i-1))&255));
 const str=s=>Uint8Array.from(s,c=>c.charCodeAt(0));
 const cat=(...parts)=>Uint8Array.from(parts.flatMap(x=>[...x]));
 const box=(name,...parts)=>{const b=cat(...parts);return cat(word(b.length+8),str(name),b)};
 const full=(v=0)=>word(v<<24);
 const infe=(id,type)=>box('infe',full(2),word(id,2),word(0,2),str(type),word(0,1));
 const exif=cat(word(0),jpeg.slice(12,-2));
 const ftyp=box('ftyp',str('heic'),word(0),str('mif1'));
 const build=absolute=>box('meta',full(),box('pitm',full(),word(1,2)),
  box('iinf',full(),word(2,2),infe(1,'hvc1'),infe(2,'Exif')),
  box('iref',full(),box('cdsc',word(2,2),word(1,2),word(link,2))),
  box('iloc',full(1),word(0x4400,2),word(1,2),word(2,2),word(method,2),
      word(0,2),word(1,2),word(absolute+offset),word(exif.length)),
  ...(method===1?[box('idat',exif)]:[]));
 const meta=build(0);
 return method===1?cat(ftyp,meta):cat(ftyp,build(ftyp.length+meta.length+8),box('mdat',exif));
}
for(const method of [0,1]){
 const data=heifFixture(fixture(),{method}),id='gps-heif-'+method;
 const original=new Blob([data],{type:'image/heic'});files.set(id,original);
 const gps=await library.captureGps(id);
 assert.equal(gps?.source,'heif-exif-gps');
 assert.ok(Math.abs(gps.latitude-(51+59/60+6/3600))<1e-9);
 assert.ok(Math.abs(gps.longitude-(5+53/60+18/3600))<1e-9);
 assert.deepEqual([...new Uint8Array(await original.arrayBuffer())],[...data]);
}
for(const [id,data] of [
 ['unlinked-heif',heifFixture(fixture(),{link:3})],
 ['outofbounds-heif',heifFixture(fixture(),{offset:1000})],
 ['truncated-heif',heifFixture(fixture()).slice(0,-4)]
]){
 files.set(id,new Blob([data],{type:'image/heic'}));
 assert.equal(await library.captureGps(id),null,id);
}
console.log('TALERA_LOCAL_HEIF_CAPTURE_GPS_CONTRACT_PASS');
