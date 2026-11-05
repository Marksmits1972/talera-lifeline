import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import worker,{
 INLINE_PHOTO_HELPER,ORIGINAL_AUDIO_END,PATCHED_AUDIO_END,
 INSERT_ANCHOR,addRemainingPhotosToInlinePlayer
} from './restfotos.worker.mjs';

const original='<!doctype html><html><body><script>'+
 'function taleraInlineCleanVideo(s){}'+
 'function taleraInlineSetFrame(s,index){}'+
 'function taleraInlineReplayNext(s){}'+
 'function taleraInlineVoiceEnded(s){}'+
 'function present(memory){const audio={};const stopTimer=()=>{};const tick=()=>{};'+
 ORIGINAL_AUDIO_END+'}</script></body></html>';
const photo=key=>({kind:'photo',key});
const video=key=>({kind:'video',key});

function harness(frames,cues,{phase='narration'}={}){
 const log={shown:[],videoRoutines:0,cleaned:0,timers:[]};
 const memory={id:'active-story'};
 const s={frames,cues,phase,memory,ordinaryTimer:null};
 const ctx={
  taleraInline:s,runtime:{currentMemory:()=>({id:memory.id})},
  taleraInlineCleanVideo:()=>{log.cleaned++},
  taleraInlineSetFrame:(_,index)=>{log.shown.push(index)},
  taleraInlineVoiceEnded:()=>{log.videoRoutines++;s.phase='originals'},
  setTimeout:(fn,ms)=>{const t={fn,ms};log.timers.push(t);return t}
 };
 runInNewContext(INLINE_PHOTO_HELPER,ctx);
 return{s,log,start:()=>ctx.taleraInlineRemainingPhotos(s),
   tick:()=>{const t=log.timers.shift();assert.ok(t,'expected a photo timer');t.fn();return t.ms},
   switchStory:()=>{ctx.taleraInline={memory:{id:'other'}}}};
}
test('V9 inline player untouched outside one removable helper and one real audio-ended call',()=>{
 const r=addRemainingPhotosToInlinePlayer(original);
 assert.equal(r.status,'installed');
 assert.equal(r.html.split(INLINE_PHOTO_HELPER).length-1,1);
 assert.equal(r.html.split(PATCHED_AUDIO_END).length-1,1);
 assert.equal(r.html.replace(INLINE_PHOTO_HELPER+'\n','')
  .replace(PATCHED_AUDIO_END,ORIGINAL_AUDIO_END),original);
 assert.equal(addRemainingPhotosToInlinePlayer(r.html).status,'already-installed');
 assert.ok(r.html.includes(INSERT_ANCHOR));
 assert.doesNotMatch(r.html,/taleraV12RemainingPhotos|taleraStartOriginalRound\s*=|new Worker\(/);
});
test('six images, four media IDs in recorded narration: only fifth and sixth added',()=>{
 const frames=Array.from({length:6},(_,i)=>photo('stored-photo-'+i));
 const cues=frames.slice(0,4).map((f,i)=>({t:i*1000,mediaId:f.key}));
 const before=JSON.stringify({frames,cues});
 const h=harness(frames,cues);
 h.start();assert.deepEqual(h.log.shown,[4]);assert.equal(h.log.videoRoutines,0);
 assert.equal(h.tick(),4000);assert.deepEqual(h.log.shown,[4,5]);
 assert.equal(h.tick(),4000);assert.equal(h.log.videoRoutines,1);
 assert.equal(h.log.timers.length,0);assert.equal(h.s.phase,'originals');
 assert.equal(JSON.stringify({frames,cues}),before,'does not edit IDs or timestamps');
});
test('one video plus five photos: three unused photos follow voice, THEN original video',()=>{
 const frames=[video('intro-clip'),photo('a'),photo('b'),photo('c'),photo('d'),photo('e')];
 const cues=[{mediaId:'intro-clip',t:0},{mediaId:'a',t:500},{mediaId:'b',t:1300}];
 const h=harness(frames,cues);
 h.start();assert.deepEqual(h.log.shown,[3]);assert.equal(h.log.videoRoutines,0);
 h.tick();assert.deepEqual(h.log.shown,[3,4]);
 h.tick();assert.deepEqual(h.log.shown,[3,4,5]);
 h.tick();assert.equal(h.log.videoRoutines,1,'video round starts after photos');
 assert.equal(h.log.cleaned,1,'old muted video is removed before still photos');
});
test('the already spoken video is never replayed as a still photo',()=>{
 const h=harness([video('v'),photo('a'),photo('b')],[{mediaId:'v'},{mediaId:'a'}]);
 h.start();assert.deepEqual(h.log.shown,[2]);h.tick();
 assert.equal(h.log.videoRoutines,1);
});
test('no missing photos: exact original voice-end continuation without timer',()=>{
 const frames=[photo('one'),video('two'),photo('three')];
 const h=harness(frames,[{mediaId:'one'},{mediaId:'three'}]);
 h.start();assert.deepEqual(h.log.shown,[]);
 assert.equal(h.log.videoRoutines,1);assert.equal(h.log.timers.length,0);
});
test('repeated cue ID does not repeat a photo; original stored photo order wins',()=>{
 const frames=[photo('a'),photo('b'),photo('c'),photo('d'),photo('e')];
 const h=harness(frames,[{mediaId:'d'},{mediaId:'d'},{mediaId:'a'}]);
 h.start();h.tick();h.tick();h.tick();
 assert.deepEqual(h.log.shown,[1,2,4]);
 assert.equal(h.log.videoRoutines,1);
});
test('switching to a different memory prevents old timers from changing its photos',()=>{
 const frames=[photo('a'),photo('b')];
 const h=harness(frames,[{mediaId:'a'}]);
 h.start();h.switchStory();h.tick();
 assert.deepEqual(h.log.shown,[1]);assert.equal(h.log.videoRoutines,0);
});
test('wrong playback phase does not start a second photo sequence',()=>{
 const h=harness([photo('a'),photo('b')],[{mediaId:'a'}],{phase:'ordinary'});
 h.start();assert.equal(h.log.shown.length,0);
 assert.equal(h.log.timers.length,0);
});
test('V9 change or duplicate voice anchor fails closed without changing any HTML',()=>{
 for(const broken of ['unrelated page',
  original.replace(ORIGINAL_AUDIO_END,'audio.onended=undefined'),
  original.replace('</script>',ORIGINAL_AUDIO_END+'</script>')]){
  const r=addRemainingPhotosToInlinePlayer(broken);
  assert.equal(r.status,'anchor-unmatched');
  assert.equal(r.html,broken);
 }
});
test('Worker patches only GET /present, never the recorder, timeline, or writes',async()=>{
 const env={STYLE_BASE:{fetch:async()=>new Response(original,{headers:{
  'content-type':'text/html; charset=utf-8',etag:'original-v9'}})}};
 const result=await worker.fetch(new Request('https://v12.test/present'),env);
 assert.equal(result.headers.get('x-talera-v12-inline-restfotos'),'installed');
 assert.equal(result.headers.get('etag'),null);
 assert.equal((await result.text()).includes(INLINE_PHOTO_HELPER),true);
 for(const path of ['/','/tell','/vertelmodus-embed?mode=record','/api/stories']){
  const r=await worker.fetch(new Request('https://v12.test'+path),env);
  assert.equal(r.headers.get('etag'),'original-v9');
  assert.equal(r.headers.get('x-talera-v12-inline-restfotos'),null);
  assert.equal(await r.text(),original);
 }
 const r=await worker.fetch(new Request('https://v12.test/present',{method:'POST'}),env);
 assert.equal(await r.text(),original);
});
test('no V9 binding fails with 503 instead of patching some other version',async()=>{
 const r=await worker.fetch(new Request('https://v12.test/present'),{});
 assert.equal(r.status,503);
});
