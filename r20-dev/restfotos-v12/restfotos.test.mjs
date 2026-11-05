import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import worker, {
  INLINE_PHOTO_HELPER, ORIGINAL_VIDEO_SELECTION, PATCHED_VIDEO_SELECTION,
  ORIGINAL_VIDEO_DONE, PATCHED_VIDEO_DONE,
  ORIGINAL_NO_VIDEOS, PATCHED_NO_VIDEOS, addRemainingPhotosToInlinePlayer
} from './restfotos.worker.mjs';

// This reproduces only the existing V9 INLINE state transitions, not an iframe.
const native = [
  'function taleraInlineSetFrame(s,index){window.shown.push(index)}',
  'function taleraInlineCleanVideo(s){window.cleaned++}',
  'function taleraInlinePlayMedia(s,frame,muted,finished){window.videos.push({key:frame.key,muted,done:finished})}',
  'function taleraInlineReplayNext(s){',
  "  if(s!==taleraInline||s.phase!=='originals')return;",
  '  const frame=s.replayFrames[++s.replayIndex];',
  ORIGINAL_VIDEO_DONE,
  '  const index=s.frames.indexOf(frame);',
  '  if(index>=0)taleraInlineSetFrame(s,index);',
  '  taleraInlinePlayMedia(s,frame,false,()=>taleraInlineReplayNext(s));',
  '}',
  'function taleraInlineVoiceEnded(s){',
  "  if(s!==taleraInline||s.phase!=='narration')return;",
  '  if(s.timer){clearInterval(s.timer);s.timer=null}',
  '  taleraInlineCleanVideo(s);',
  "  s.replayFrames=s.frames.filter(f=>f.kind==='video');",
  ORIGINAL_NO_VIDEOS,
  "  s.phase='originals';s.replayIndex=-1;",
  '  taleraInlineReplayNext(s);',
  '}'
].join('\n');

const photo=key=>({kind:'photo',key});
const video=key=>({kind:'video',key});
const cue=key=>({t:0,index:0,mediaId:key});

function harness(frames,cues){
  const s={frames,cues,memory:{id:'saved-memory'},phase:'narration',timer:null,
    ordinaryTimer:null,replayFrames:[],replayIndex:-1};
  const log={shown:[],videos:[],cleaned:0,timers:[]};
  const ctx={
    taleraInline:s,runtime:{currentMemory:()=>({id:s.memory.id})},
    window:log,
    clearInterval:()=>{},
    setTimeout:(fn,ms)=>{const entry={fn,ms};log.timers.push(entry);return entry;}
  };
  const code=addRemainingPhotosToInlinePlayer(native);
  assert.equal(code.status,'installed');
  runInNewContext(code.html,ctx);
  return {s,log,ctx,
    voiceEnd:()=>ctx.taleraInlineVoiceEnded(s),
    finishVideo:i=>log.videos[i].done(),
    tick:()=>{const timer=log.timers.shift();assert.ok(timer);timer.fn();return timer.ms;}
  };
}

test('exact V9 code outside one helper and THREE original transition hooks',()=>{
  const result=addRemainingPhotosToInlinePlayer(native);
  assert.equal(result.status,'installed');
  assert.equal(result.html.split(INLINE_PHOTO_HELPER).length-1,1);
  assert.equal(result.html.split(PATCHED_VIDEO_SELECTION).length-1,1);
  assert.equal(result.html.split(PATCHED_VIDEO_DONE).length-1,1);
  assert.equal(result.html.split(PATCHED_NO_VIDEOS).length-1,1);
  assert.equal(result.html.replace(INLINE_PHOTO_HELPER+'\n','')
    .replace(PATCHED_VIDEO_SELECTION,ORIGINAL_VIDEO_SELECTION)
    .replace(PATCHED_VIDEO_DONE,ORIGINAL_VIDEO_DONE)
    .replace(PATCHED_NO_VIDEOS,ORIGINAL_NO_VIDEOS),native);
  assert.equal(addRemainingPhotosToInlinePlayer(result.html).status,'already-installed');
  assert.match(result.html,/taleraInlineVoiceEnded\(s\)/);
  assert.doesNotMatch(result.html,/iframe|taleraStartOriginalRound\s*=/);
});

test('two videos replay WITH sound BEFORE remaining photos',()=>{
  const h=harness([video('v1'),photo('p1'),video('v2'),photo('p2'),photo('p3')],
    [cue('v1'),cue('p1'),cue('v2')]);
  h.voiceEnd();
  assert.deepEqual(h.log.shown,[0]);
  assert.deepEqual(h.log.videos.map(v=>v.key),['v1']);
  assert.equal(h.log.timers.length,0);
  h.finishVideo(0);
  assert.deepEqual(h.log.shown,[0,2]);
  assert.deepEqual(h.log.videos.map(v=>v.muted),[false,false]);
  assert.equal(h.log.timers.length,0);
  h.finishVideo(1);
  assert.deepEqual(h.log.shown,[0,2,3]);
  assert.equal(h.tick(),4000);
  assert.deepEqual(h.log.shown,[0,2,3,4]);
  assert.equal(h.tick(),4000);
  assert.equal(h.s.phase,'done');
});

test('without a video, only unused photos follow the actual voice-ended event',()=>{
  const h=harness([photo('p1'),photo('p2'),photo('p3')],[cue('p2')]);
  h.voiceEnd();
  assert.deepEqual(h.log.shown,[0]);
  assert.equal(h.log.videos.length,0);
  h.tick();
  assert.deepEqual(h.log.shown,[0,2]);
  h.tick();
  assert.equal(h.s.phase,'done');
});

test('all pictures used means no second slideshow and no timer',()=>{
  const h=harness([photo('a'),video('v'),photo('b')],[cue('a'),cue('v'),cue('b')]);
  h.voiceEnd();h.finishVideo(0);
  assert.equal(h.s.phase,'done');
  assert.equal(h.log.timers.length,0);
  assert.deepEqual(h.log.shown,[1]);
});

test('repeated cue IDs do not duplicate photographs; stored order wins',()=>{
  const h=harness([photo('a'),photo('b'),photo('c'),photo('d')],
    [cue('d'),cue('a'),cue('d')]);
  h.voiceEnd();h.tick();h.tick();
  assert.deepEqual(h.log.shown,[1,2]);
  assert.equal(h.s.phase,'done');
});

test('switching memories prevents delayed photos changing the new memory',()=>{
  const h=harness([photo('a'),photo('b'),photo('c')],[cue('a')]);
  h.voiceEnd();
  h.ctx.taleraInline={memory:{id:'different'}};
  h.tick();
  assert.deepEqual(h.log.shown,[1]);
});

test('narrated video is replayed fully, then alternating remaining photos and videos keep their saved order',()=>{
  const h=harness([video('v1'),photo('p1'),photo('p2'),video('v2'),photo('p3')],
    [cue('v1'),cue('p1')]);
  h.voiceEnd();
  assert.deepEqual(h.log.videos.map(v=>v.key),['v1']);
  assert.equal(h.log.videos[0].muted,false);
  h.finishVideo(0);
  assert.deepEqual(h.log.shown,[0,2]);
  assert.equal(h.tick(),4000);
  assert.deepEqual(h.log.shown,[0,2,3]);
  assert.deepEqual(h.log.videos.map(v=>v.key),['v1','v2']);
  assert.deepEqual(h.log.videos.map(v=>v.muted),[false,false]);
  h.finishVideo(1);
  assert.deepEqual(h.log.shown,[0,2,3,4]);
  assert.equal(h.tick(),4000);
  assert.equal(h.s.phase,'done');
});

test('when no video was narrated, a later video stays between its original photos',()=>{
  const h=harness([photo('p1'),photo('p2'),video('v3'),photo('p4')],
    [cue('p1')]);
  h.voiceEnd();
  assert.deepEqual(h.log.shown,[1]);
  assert.equal(h.tick(),4000);
  assert.deepEqual(h.log.shown,[1,2]);
  assert.deepEqual(h.log.videos.map(v=>({key:v.key,muted:v.muted})),[{key:'v3',muted:false}]);
  h.finishVideo(0);
  assert.deepEqual(h.log.shown,[1,2,3]);
  assert.equal(h.tick(),4000);
  assert.equal(h.s.phase,'done');
});

test('different or duplicated V9 playback anchors fail closed',()=>{
  for(const broken of ['other page',native.replace(ORIGINAL_NO_VIDEOS,'noop()'),
    native+'\n'+ORIGINAL_VIDEO_DONE]){
    const r=addRemainingPhotosToInlinePlayer(broken);
    assert.equal(r.status,'anchor-unmatched');
    assert.equal(r.html,broken);
  }
});

test('only the presentation HTML is changed, not recording or storage',async()=>{
  const env={STYLE_BASE:{fetch:async()=>new Response(native,{
    headers:{'content-type':'text/html; charset=utf-8',etag:'v9'}})}};
  const r=await worker.fetch(new Request('https://test.local/present'),env);
  assert.equal(r.headers.get('x-talera-v12-inline-restfotos'),'installed');
  assert.ok((await r.text()).includes(PATCHED_VIDEO_DONE));
  for(const route of ['/','/tell','/vertelmodus-embed?mode=record']){
    const original=await worker.fetch(new Request('https://test.local'+route),env);
    assert.equal(original.headers.get('x-talera-v12-inline-restfotos'),null);
    assert.equal(await original.text(),native);
  }
});
