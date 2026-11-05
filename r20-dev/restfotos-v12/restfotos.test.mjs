import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext,Script} from 'node:vm';
import worker,{
 ORIGINAL_VOICE_END,PATCHED_VOICE_END,PHOTO_TAIL_HELPER,
 ORIGINAL_RESTORE,PATCHED_RESTORE,ORIGINAL_PRESENTER_GUARD,PATCHED_PRESENTER_GUARD,patchEmbed,patchPresentation
} from './restfotos.worker.mjs';

const image=id=>({id,type:'image'});
const video=id=>({id,type:'video'});
const pics=Array.from({length:6},(_,i)=>image('photo-'+i));
const originalEmbed='<!doctype html><html><body><script>const taleraZero=true;'+
  'function taleraStartOriginalRound(){return true;}function show(n){}'+
  'const oldRecordingStillWorks=true;'+ORIGINAL_VOICE_END+
  'voice.addEventListener("timeupdate",follow);</script></body></html>';
const originalPresent='<!doctype html><html><body><script>'+
  'async function present(memory){'+ORIGINAL_PRESENTER_GUARD+'}'+
  'runtime.subscribe(activate);runtime.registerMemories(memories);'+
  'const visible=runtime.currentMemory();'+ORIGINAL_RESTORE+
  '</script></body></html>';

test('original V9 narrator code is byte-identical except ONE helper and voice ended call',()=>{
 const r=patchEmbed(originalEmbed);
 assert.equal(r.status,'installed');
 assert.equal(r.html.split(PHOTO_TAIL_HELPER).length-1,1);
 assert.equal(r.html.split(PATCHED_VOICE_END).length-1,1);
 assert.equal(r.html.replace(PHOTO_TAIL_HELPER+'\n'+PATCHED_VOICE_END,ORIGINAL_VOICE_END),originalEmbed);
 assert.equal(patchEmbed(r.html).status,'already-installed');
 assert.doesNotMatch(r.html,/taleraStartOriginalRound\s*=/);
 assert.match(r.html,/voice\.addEventListener\("timeupdate",follow\)/);
 assert.match(r.html,/const oldRecordingStillWorks=true/);
});
test('freshly reloaded local memory explicitly activates after hydration',()=>{
 const r=patchPresentation(originalPresent);
 assert.equal(r.status,'installed');
 assert.equal(r.html.replace(PATCHED_RESTORE,ORIGINAL_RESTORE)
  .replace(PATCHED_PRESENTER_GUARD,ORIGINAL_PRESENTER_GUARD),originalPresent);
 assert.equal(patchPresentation(r.html).status,'already-installed');
 assert.equal(r.html.split(PATCHED_RESTORE).length-1,1);
});
test('presentation activation guard does not affect nonlocal memories',async()=>{
 const visited=[];
 const fixture=PATCHED_RESTORE;
 for(const memory of [{_taleraLocal:true}, {_taleraLocal:false}, null]){
  visited.length=0;
  const ctx={visible:memory,hydrate:async()=>visited.push('hydrate'),activate:()=>visited.push('activate')};
  await runInNewContext('(async()=>{'+fixture+'})()',ctx);
  assert.deepEqual(visited,memory?._taleraLocal?['hydrate','activate']:[]);
 }
});
function harness(items,cues,{present=true,hasVideo=false}={}){
 const state={items,cues,voiceUrl:'blob:voice',media:{pause(){}},duration:6000,mode:'playing'};
 const shown=[],timers=[],msgs=[],listeners={};
 const button={hidden:false},clock={textContent:''};
 let starts=0;
 runInNewContext(PHOTO_TAIL_HELPER+'\n'+PATCHED_VOICE_END,{
  state,
  document:{body:{classList:{contains:x=>x==='present'&&present}}},
  voice:{addEventListener:(type,cb)=>listeners[type]=cb},
  taleraStartOriginalRound:()=>{starts++;return hasVideo},
  show:n=>shown.push(n),
  mode:x=>{state.mode=x},
  msg:x=>msgs.push(x),
  $:x=>x==='play'?button:clock,
  clock:ms=>String(ms/1000),
  setTimeout:(cb,ms)=>timers.push({cb,ms})
 });
 return{state,shown,timers,msgs,button,
  end:()=>listeners.ended(),tick:()=>{
   const timer=timers.shift();assert.ok(timer,'photo timer expected');
   timer.cb();return timer.ms;
  },
  get videoStarts(){return starts;}
 };
}
test('six photos, 4 recorded positions: only 5 and 6 shown, THEN native video round',()=>{
 const cues=[0,1,2,3].map((index,i)=>({t:i*1200,index}));
 const h=harness(pics,cues,{hasVideo:true});
 const prior=JSON.stringify({pics,cues});
 h.end();assert.deepEqual(h.shown,[4]);
 assert.equal(h.videoStarts,0);
 assert.equal(h.state.mode,'ready');
 assert.equal(h.tick(),4000);assert.deepEqual(h.shown,[4,5]);
 assert.equal(h.tick(),4000);assert.equal(h.videoStarts,1);
 assert.equal(h.timers.length,0);
 assert.equal(JSON.stringify({pics,cues}),prior,'no new ID, cue or persistence writes');
});
test('five photos plus one video first: only remaining 3 photos, not video',()=>{
 const items=[video('video1'),...Array.from({length:5},(_,i)=>image('photo'+(i+1)))];
 const cues=[{t:0,index:0},{t:1200,index:1},{t:2800,index:2}];
 const h=harness(items,cues,{hasVideo:true});
 h.end();assert.deepEqual(h.shown,[3]);
 h.tick();assert.deepEqual(h.shown,[3,4]);
 h.tick();assert.deepEqual(h.shown,[3,4,5]);
 h.tick();assert.equal(h.videoStarts,1);
});
test('recording/preview mode remains original, no extra photo timers',()=>{
 const h=harness(pics,[{index:0}],{present:false,hasVideo:false});
 h.end();
 assert.equal(h.videoStarts,1);
 assert.deepEqual(h.shown,[]);
 assert.equal(h.timers.length,0);
});
test('all stills narrated: native video round starts at once',()=>{
 const h=harness(pics,pics.map((_,index)=>({index})),{hasVideo:true});
 h.end();assert.equal(h.videoStarts,1);
 assert.deepEqual(h.shown,[]);
 assert.equal(h.timers.length,0);
});
test('out-of-order cues, repeated photos, adjacent video: no double appearance',()=>{
 const h=harness([image('a'),video('v'),image('b'),image('c'),image('d')],
  [{index:3},{index:0},{index:3},{index:1}],{hasVideo:true});
 h.end();assert.deepEqual(h.shown,[2]);
 h.tick();assert.deepEqual(h.shown,[2,4]);
 h.tick();assert.equal(h.videoStarts,1);
});
test('switching memories cancels old timers',()=>{
 const h=harness(pics,[{index:0},{index:1},{index:2},{index:3}]);
 h.end();h.state.items=[image('different')];
 h.tick();assert.deepEqual(h.shown,[4]);assert.equal(h.videoStarts,0);
});
test('starting another voice playback cancels old timers',()=>{
 const h=harness(pics,[{index:0},{index:1},{index:2},{index:3}]);
 h.end();h.state.mode='playing';h.tick();
 assert.deepEqual(h.shown,[4]);assert.equal(h.videoStarts,0);
});
test('photo-only narration ends normally with original ready/play state',()=>{
 const h=harness(pics,[{index:0},{index:1},{index:2},{index:3}]);
 h.end();h.tick();h.tick();
 assert.equal(h.videoStarts,1);
 assert.equal(h.button.hidden,false);
 assert.match(h.msgs.at(-1),/afgelopen/);
});
test('fail closed if V9 player changes, never rewrite unrelated HTML',()=>{
 assert.equal(patchEmbed('html').status,'anchor-unmatched');
 assert.equal(patchPresentation('html').status,'anchor-unmatched');
 assert.equal(patchEmbed(originalEmbed.replace('</script>',ORIGINAL_VOICE_END+'</script>')).status,'anchor-unmatched');
 assert.equal(patchPresentation(originalPresent.replace('</script>',ORIGINAL_RESTORE+'</script>')).status,'anchor-unmatched');
});

test('HTTP wrapper only transforms GET present and embed, not /, /tell, writes',async()=>{
 const root='https://v12.test';
 const store={STYLE_BASE:{fetch:async req=>{
  const path=new URL(req.url).pathname;
  return new Response(path==='/present'?originalPresent:originalEmbed,
   {headers:{'content-type':'text/html; charset=utf-8','etag':'safe-original'}});
 }}};
 for(const [path,anchor] of [['/present',PATCHED_RESTORE],['/vertelmodus-embed?mode=present',PHOTO_TAIL_HELPER]]){
  const response=await worker.fetch(new Request(root+path),store);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('etag'),null);
  assert.equal(response.headers.get('x-talera-v12-restfotos'),'installed');
  assert.ok((await response.text()).includes(anchor));
 }
 for(const path of ['/','/tell','/api/saved']){
  const response=await worker.fetch(new Request(root+path),store);
  assert.equal(response.headers.get('x-talera-v12-restfotos'),null);
  assert.equal(response.headers.get('etag'),'safe-original');
 }
 const response=await worker.fetch(new Request(root+'/present',{method:'POST'}),store);
 assert.equal(response.headers.get('x-talera-v12-restfotos'),null);
});
test('missing bound V9 fails safely, never falls back to an unknown source',async()=>{
 assert.equal((await worker.fetch(new Request('https://stage.test/present'),{})).status,503);
});

test('same memory is skipped only while ORIGINAL iframe is still connected',()=>{
 const simulate=(same,connected)=>{
  const log={dispose:0};
  const code="let activeId='story-a',currentPresentation={frame:{isConnected:"+connected+
   "}};function disposePresentation(){log.dispose++}function present(memory){const id=memory.id;"+
   PATCHED_PRESENTER_GUARD+"return true;}present({id:'"+(same?'story-a':'story-b')+"'})";
  const returned=runInNewContext(code,{log});
  return{returned,disposed:log.dispose};
 };
 assert.deepEqual(simulate(true,true),{returned:undefined,disposed:0},
   'connected original player keeps existing behavior');
 assert.deepEqual(simulate(true,false),{returned:true,disposed:1},
   'missing original player must reopen with same memory ID');
 assert.deepEqual(simulate(false,true),{returned:true,disposed:1},
   'a different story must open normally');
});
