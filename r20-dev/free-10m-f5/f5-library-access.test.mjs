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
