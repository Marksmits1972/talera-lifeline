import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import worker,{
  VOICE_END_ORIGINAL,VOICE_END_WITH_PHOTOS,PHOTO_HELPER,addRemainingPhotos,
  READ_ONLY_AUDIT_SCRIPT,READ_ONLY_AUDIT_ID,addReadOnlyAudit
} from './restfotos.worker.mjs';

const photo=id=>({id,type:'image'});
const video=id=>({id,type:'video'});
const SIX=Array.from({length:6},(_,i)=>photo('real-id-'+i));
const original='<!doctype html><html><body><script>const taleraZero=true;'+
 'function taleraStartOriginalRound(){return true;}' +
 'const marker="original-recording-unchanged";'+VOICE_END_ORIGINAL+
 'voice.addEventListener("timeupdate",follow);</script></body></html>';

function fakePlayer(items,cues,{hasVideo=false,initialMode='playing'}={}){
 const shown=[],messages=[],modes=[],timers=[],listeners={};
 const state={items,cues,voiceUrl:'blob:original-recording',duration:5400,mode:initialMode,
  media:{pause(){}}};
 const button={hidden:false},clock={textContent:''};
 let starts=0;
 const context={
  state,voice:{addEventListener:(event,fn)=>listeners[event]=fn},
  mode:m=>{state.mode=m;modes.push(m)},
  msg:message=>messages.push(message),
  show:index=>shown.push(index),
  $:id=>id==='play'?button:clock,
  clock:value=>String(Math.floor(value/1000)),
  setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},
  taleraStartOriginalRound:()=>{starts++;return hasVideo}
 };
 runInNewContext(PHOTO_HELPER+'\n'+VOICE_END_WITH_PHOTOS,context);
 return{state,shown,modes,messages,timers,button,clock,
  end:()=>listeners.ended(),
  next:()=>{const t=timers.shift();assert.ok(t,'expected next photo');t.fn();return t.ms},
  get starts(){return starts}
 };
}
test('only a helper + one call: original narration, photos and video function remain byte-exact',()=>{
 const result=addRemainingPhotos(original);
 assert.equal(result.status,'installed');
 const prefix=original.split(VOICE_END_ORIGINAL)[0];
 const suffix=original.split(VOICE_END_ORIGINAL)[1];
 assert.equal(result.html.slice(0,prefix.length),prefix);
 assert.equal(result.html.slice(-suffix.length),suffix);
 assert.equal(result.html.split(VOICE_END_WITH_PHOTOS).length-1,1);
 assert.equal(result.html.split('function taleraV11ShowRemainingPhotos(){').length-1,1);
 assert.doesNotMatch(result.html,/taleraStartOriginalRound\s*=|taleraV10|taleraV11Pending|taleraV11Cancel/);
 assert.ok(result.html.includes('function taleraStartOriginalRound(){return true;}'));
 assert.ok(result.html.includes('voice.addEventListener("timeupdate",follow)'));
 assert.equal(addRemainingPhotos(result.html).status,'already-installed');
});
test('six stored IDs, four spoken cue positions: photos five and six automatically play',()=>{
 const cues=[{index:0,t:0},{index:1,t:750},{index:2,t:2500},{index:3,t:4900}];
 const before=JSON.stringify({SIX,cues});
 const s=fakePlayer(SIX,cues);
 s.end();
 assert.deepEqual(s.shown,[4]);
 assert.equal(s.state.mode,'ready','existing voice cue-follow stops before showing photo five');
 assert.equal(s.button.hidden,true,'replay button cannot interrupt the remaining photos');
 assert.equal(s.starts,0);
 assert.equal(s.next(),4000);
 assert.deepEqual(s.shown,[4,5]);
 assert.equal(s.next(),4000);
 assert.equal(s.starts,1);
 assert.equal(s.timers.length,0);
 assert.equal(s.button.hidden,false);
 assert.equal(JSON.stringify({SIX,cues}),before,'no ID or cue mutation');
});
test('interspersed images and videos: only unspoken stills added, video round once',()=>{
 const items=[photo('A'),video('B'),photo('C'),video('D'),photo('E'),photo('F')];
 const s=fakePlayer(items,[{index:0},{index:1},{index:3}],{hasVideo:true});
 s.end();assert.deepEqual(s.shown,[2]);
 s.next();assert.deepEqual(s.shown,[2,4]);
 s.next();assert.deepEqual(s.shown,[2,4,5]);
 s.next();assert.equal(s.starts,1);
 assert.equal(s.timers.length,0);
});
test('no missing photo: original video starts immediately, no extra timer',()=>{
 const s=fakePlayer(SIX,SIX.map((_,index)=>({index,t:index*1000})),{hasVideo:true});
 s.end();assert.deepEqual(s.shown,[]);
 assert.equal(s.starts,1);assert.equal(s.timers.length,0);
});
test('unordered and repeated cues do not repeat images',()=>{
 const s=fakePlayer(SIX,[{index:4},{index:4},{index:0},{index:2}]);
 s.end();assert.deepEqual(s.shown,[1]);
 s.next();assert.deepEqual(s.shown,[1,3]);
 s.next();assert.deepEqual(s.shown,[1,3,5]);
 s.next();assert.equal(s.starts,1);
});
test('existing recorder preview can also show remaining images, without modifying recording code',()=>{
 const s=fakePlayer(SIX,[{index:0},{index:1},{index:2},{index:3}],{initialMode:'playing'});
 s.end();assert.deepEqual(s.shown,[4]);s.next();
 assert.deepEqual(s.shown,[4,5]);
});
test('audio end only uses existing call if no items',()=>{
 const s=fakePlayer([],[],{hasVideo:false});
 s.end();assert.equal(s.starts,1);
 assert.deepEqual(s.shown,[]);
});
test('a different memory loaded while stills pending does not receive old remaining photos',()=>{
 const s=fakePlayer(SIX,[{index:0},{index:1},{index:2},{index:3}]);
 s.end();s.state.items=[photo('another-story')];s.next();
 assert.deepEqual(s.shown,[4]);
 assert.equal(s.starts,0);
});
test('injection is fail-closed if source changed or voice handler duplicated',()=>{
 assert.equal(addRemainingPhotos('unrelated html').status,'anchor-unmatched');
 assert.equal(addRemainingPhotos(original.replace('</script>',VOICE_END_ORIGINAL+'</script>')).status,'anchor-unmatched');
});
test('only GET /vertelmodus-embed is affected, all other routes and POST untouched',async()=>{
 const env={STYLE_BASE:{fetch:async()=>new Response(original,{headers:{
  'content-type':'text/html; charset=utf-8',etag:'original-html'
 }})}};
 const embed=await worker.fetch(new Request('https://stage.test/vertelmodus-embed?mode=present'),env);
 assert.equal(embed.headers.get('x-talera-v11-photos'),'installed');
 assert.equal(embed.headers.get('etag'),null);
 assert.match(await embed.text(),/taleraV11ShowRemainingPhotos/);
 for(const path of ['/','/present','/tell','/api/memory']){
  const response=await worker.fetch(new Request('https://stage.test'+path),env);
  assert.equal(await response.text(),original);
  assert.equal(response.headers.get('etag'),'original-html');
 }
 const post=await worker.fetch(new Request('https://stage.test/vertelmodus-embed',{method:'POST'}),env);
 assert.equal(await post.text(),original);
});
test('no service binding fails without modifying protected original',async()=>{
 const response=await worker.fetch(new Request('https://stage.test/vertelmodus-embed'),{});
 assert.equal(response.status,503);
});


test('read-only diagnostic is appended only after the native player, never inside voice logic',()=>{
 const player=addRemainingPhotos(original).html;
 const audited=addReadOnlyAudit(player);
 const bodyEnd=player.indexOf('</body>');
 assert.equal(audited.slice(0,bodyEnd),player.slice(0,bodyEnd),
  'all existing native HTML and player code stay untouched');
 assert.equal(audited.slice(audited.indexOf('</body>')),player.slice(bodyEnd),
  'the original closing tags remain untouched');
 assert.ok(audited.includes('id="'+READ_ONLY_AUDIT_ID+'"'));
 assert.ok(audited.includes(READ_ONLY_AUDIT_SCRIPT));
 assert.equal(addReadOnlyAudit(audited),audited,'idempotent and no duplicate listener');
 assert.match(audited,/window\.addEventListener\('message'/);
 assert.match(audited,/new MutationObserver\(render\)\.observe/);
 assert.doesNotMatch(READ_ONLY_AUDIT_SCRIPT,/indexedDB|localStorage|fetch\s*\(|taleraStartOriginalRound\s*=|voice\.play\s*\(|audio\.play\s*\(|state\.items\s*=/);
});
