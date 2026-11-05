import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import worker,{
  ORIGINAL_VOICE_END,PATCHED_VOICE_END,PHOTO_TAIL_MS,
  addUnspokenPhotosToNarration
} from './vertel-restbeelden.worker.mjs';

const origin='https://talera-v10.test';
const image=id=>({id,type:'image'});
const video=id=>({id,type:'video'});
const SIX=Array.from({length:6},(_,i)=>image('foto-id-'+(i+1)));
const fixture='<!doctype html><html><head><title>Original</title></head><body><script>'+
 'const taleraZero=true;function taleraStartOriginalRound(){return true;}' +
 'const marker="ORIGINAL-UNMODIFIED";'+ORIGINAL_VOICE_END+
 'voice.addEventListener("timeupdate",follow);</script><p>Original</p></body></html>';

test('one additional helper is inserted, no video-function override or other wrappers',()=>{
 const result=addUnspokenPhotosToNarration(fixture);
 assert.equal(result.status,'installed');
 assert.equal(result.html.split('function taleraV10PlayRemainingPhotosThenVideos()').length-1,1);
 assert.equal(result.html.split(PATCHED_VOICE_END).length-1,1);
 assert.doesNotMatch(result.html,/taleraStartOriginalRound\s*=/);
 assert.doesNotMatch(result.html,/taleraV10SavedStartOriginalVideoRound|taleraV10PendingStillIndices/);
 assert.match(result.html,/function taleraStartOriginalRound\(\)\{return true;\}/);
 assert.ok(result.html.includes('voice.addEventListener("timeupdate",follow)'));
 assert.ok(result.html.includes('const marker="ORIGINAL-UNMODIFIED"'));
 assert.equal(result.html.slice(0,fixture.indexOf(ORIGINAL_VOICE_END)),
  fixture.slice(0,fixture.indexOf(ORIGINAL_VOICE_END)));
 assert.equal(result.html.slice(result.html.indexOf('voice.addEventListener("timeupdate",follow)')),
  fixture.slice(fixture.indexOf('voice.addEventListener("timeupdate",follow)')));
 const repeat=addUnspokenPhotosToNarration(result.html);
 assert.equal(repeat.status,'already-installed');
 assert.equal(repeat.html,result.html);
});
test('never inject on missing/duplicate voice handler',()=>{
 assert.equal(addUnspokenPhotosToNarration('no narrator').status,'anchor-unmatched');
 assert.equal(addUnspokenPhotosToNarration(fixture.replace('</script>',ORIGINAL_VOICE_END+'</script>')).status,'anchor-unmatched');
});

function emulate(items,cues,{present=true,voice='blob:voice',videoStarted=true}={}){
 const shown=[],messages=[],modes=[],callbacks=new Map();
 const voiceListeners=new Map();
 const state={items,cues,voiceUrl:voice,media:{pause(){}},duration:9000};
 let timerSerial=0,videosStarted=0;
 const clock={textContent:''};
 const playButton={hidden:false};
 const context={
  state,voice:{addEventListener:(name,cb)=>voiceListeners.set(name,cb)},
  document:{body:{classList:{contains:k=>present&&k==='present'}}},
  show:i=>shown.push(i),
  mode:m=>modes.push(m),
  msg:m=>messages.push(m),
  $:id=>id==='play'?playButton:clock,
  clock:m=>(m/1000)+' sec',
  setTimeout:(cb,ms)=>{const id=++timerSerial;callbacks.set(id,{cb,ms});return id;},
  taleraStartOriginalRound:()=>{videosStarted++;return videoStarted;}
 };
 const source=addUnspokenPhotosToNarration(fixture).html;
 const start=source.indexOf('/* V10:');
 const end=source.indexOf('voice.addEventListener("timeupdate",follow)');
 const handlerAndHelper=source.slice(start,end);
 assert.ok(start>-1&&end>start,'test runs actual injected implementation');
 runInNewContext(handlerAndHelper,context);
 return {
  state,shown,messages,modes,clock,playButton,callbacks,
  ended:()=>voiceListeners.get('ended')(),
  tick:()=>{const step=callbacks.entries().next().value;assert.ok(step,'next photo timer expected');const [id,task]=step;callbacks.delete(id);task.cb();return task.ms;},
  get videosStarted(){return videosStarted;}
 };
}
test('six photo IDs, four voice cues: only two remaining photos appear before original video',()=>{
 const cues=[{t:0,index:0},{t:1200,index:1},{t:3500,index:2},{t:6000,index:3}];
 const frozen=JSON.stringify({items:SIX,cues});
 const s=emulate(SIX,cues);
 s.ended();
 assert.deepEqual(s.shown,[4]);
 assert.equal(s.videosStarted,0);
 assert.equal(s.playButton.hidden,true);
 assert.equal(s.tick(),PHOTO_TAIL_MS);
 assert.deepEqual(s.shown,[4,5]);
 assert.equal(s.tick(),PHOTO_TAIL_MS);
 assert.equal(s.videosStarted,1);
 assert.equal(s.callbacks.size,0);
 assert.equal(JSON.stringify({items:SIX,cues}),frozen,'recorded cue mapping and photo IDs remain untouched');
});
test('mixed photo+video story: only missing images play, then original video function once',()=>{
 const items=[image('p1'),video('v1'),image('p2'),image('p3'),video('v2'),image('p4')];
 const s=emulate(items,[{index:0},{index:1},{index:3}]);
 s.ended();
 assert.deepEqual(s.shown,[2]);
 s.tick();assert.deepEqual(s.shown,[2,5]);
 s.tick();assert.equal(s.videosStarted,1);
});
test('narration jumping among images: only photos absent from recorded cues are added once',()=>{
 const s=emulate(SIX,[{index:2},{index:2},{index:0},{index:5}]);
 s.ended();
 assert.deepEqual(s.shown,[1]);
 s.tick();assert.deepEqual(s.shown,[1,3]);
 s.tick();assert.deepEqual(s.shown,[1,3,4]);
 s.tick();assert.equal(s.videosStarted,1);
});
test('all images narrated: player directly uses original video cycle without timers',()=>{
 const s=emulate(SIX,SIX.map((_,index)=>({t:index*1000,index})));
 s.ended();
 assert.deepEqual(s.shown,[]);
 assert.equal(s.videosStarted,1);
 assert.equal(s.callbacks.size,0);
});
test('record and non-present: original video handling unchanged',()=>{
 const s=emulate(SIX,[{index:0}],{present:false});
 s.ended();
 assert.deepEqual(s.shown,[]);
 assert.equal(s.videosStarted,1);
});
test('still-only story ends naturally after its last remaining image',()=>{
 const s=emulate(SIX,[{index:0},{index:1},{index:2},{index:3}],{videoStarted:false});
 s.ended();s.tick();s.tick();
 assert.equal(s.videosStarted,1);
 assert.equal(s.messages.at(-1),'Terugkijken afgelopen');
 assert.equal(s.playButton.hidden,false);
});
test('a new memory loaded into the same iframe prevents old photo timer advancing',()=>{
 const s=emulate(SIX,[{index:0},{index:1},{index:2},{index:3}]);
 s.ended();
 s.state.items=[image('different-memory')];
 s.tick();
 assert.deepEqual(s.shown,[4],'old timer did not show any more photos after reinitialization');
 assert.equal(s.videosStarted,0);
});
test('HTTP adapter changes the embed only, never home, presenter, editor or writes',async()=>{
 const calls=[];
 const mock={STYLE_BASE:{fetch:async request=>{
  calls.push({path:new URL(request.url).pathname,method:request.method});
  return new Response(fixture,{headers:{'content-type':'text/html; charset=utf-8',etag:'original'}});
 }}};
 const narration=await worker.fetch(new Request(origin+'/vertelmodus-embed?mode=present'),mock);
 assert.equal(narration.headers.get('x-talera-v10-tail-photos'),'installed');
 assert.equal(narration.headers.get('etag'),null);
 assert.match(await narration.text(),/function taleraV10PlayRemainingPhotosThenVideos/);
 for(const page of ['/','/present','/tell','/api/v9/stories']){
  const r=await worker.fetch(new Request(origin+page),mock);
  assert.equal(await r.text(),fixture);
  assert.equal(r.headers.get('etag'),'original');
  assert.equal(r.headers.get('x-talera-v10-tail-photos'),null);
 }
 const post=await worker.fetch(new Request(origin+'/vertelmodus-embed',{method:'POST'}),mock);
 assert.equal(await post.text(),fixture);
 assert.equal(calls.length,6);
});
test('missing style-base binding fails closed; protected Workers are never altered',async()=>{
 const response=await worker.fetch(new Request(origin+'/vertelmodus-embed'),{});
 assert.equal(response.status,503);
});
