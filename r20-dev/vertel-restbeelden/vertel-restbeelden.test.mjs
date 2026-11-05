import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import worker,{
  missingStillIndices,ORIGINAL_VOICE_END,PHOTO_HOLD_MS,PHOTO_TAIL_PATCH,
  applyMissingPhotoTail
} from './vertel-restbeelden.worker.mjs';

const origin='https://talera-v10.test';
const image=id=>({id,type:'image'});
const video=id=>({id,type:'video'});
const SIX=[image('a'),image('b'),image('c'),image('d'),image('e'),image('f')];

function mock(html,{contentType='text/html; charset=utf-8',status=200}={}){
 const requests=[];
 const env={STYLE_BASE:{fetch:async request=>{
   requests.push({method:request.method,path:new URL(request.url).pathname});
   return new Response(html,{status,headers:{
     'content-type':contentType,etag:'original-unchanged',
     'cache-control':'no-store','x-upstream':'stil-luxe'
   }});
 }}};
 return {env,requests};
}
const marker='<script>const taleraZero=true;function taleraStartOriginalRound(){return true;}';
const fixture='<!doctype html><html><head><title>Player</title></head><body>'+
 marker+'var recorder="untouched";'+ORIGINAL_VOICE_END+
 'voice.addEventListener("timeupdate",follow);</script><p>Originele speler</p></body></html>';

test('six images, first three narrated: remaining 4, 5 and 6 are scheduled',()=>{
 assert.deepEqual(missingStillIndices(SIX,[{t:0,index:0},{t:2300,index:1},{t:5400,index:2}]),[3,4,5]);
});
test('only genuinely unseen photos; never append a video into the photo tail',()=>{
 const media=[image('a'),video('b'),image('c'),video('d'),image('e'),image('f')];
 const cues=[{t:0,index:0},{t:2000,index:1},{t:6000,index:3}];
 assert.deepEqual(missingStillIndices(media,cues),[2,4,5]);
});
test('not just trailing: all unvisited images in original order; repeated cues are ignored',()=>{
 const cues=[{t:0,index:2},{t:800,index:2},{t:1400,index:0}];
 const snapshot=JSON.stringify({SIX,cues});
 assert.deepEqual(missingStillIndices(SIX,cues),[1,3,4,5]);
 assert.equal(JSON.stringify({SIX,cues}),snapshot,'original saved IDs/cues never modified');
});
test('all discussed, video-only or no media: nothing appended',()=>{
 assert.deepEqual(missingStillIndices(SIX,SIX.map((_,index)=>({t:index*1000,index}))),[]);
 assert.deepEqual(missingStillIndices([video('a'),video('b')],[]),[]);
 assert.deepEqual(missingStillIndices([],[]),[]);
 assert.deepEqual(missingStillIndices(null,[{index:0}]),[]);
});
test('invalid cue indices do not mark a photo discussed',()=>{
 assert.deepEqual(missingStillIndices([image('a'),image('b')],[{index:-1},{index:7},{index:1.2},{index:'foo'},{index:'1'}]),[0]);
});
test('patch targets exactly one original ended handler, preserves the other player byte-for-byte',()=>{
 const result=applyMissingPhotoTail(fixture);
 assert.equal(result.status,'installed');
 assert.equal(result.html.slice(0,fixture.indexOf(ORIGINAL_VOICE_END)),fixture.slice(0,fixture.indexOf(ORIGINAL_VOICE_END)));
 assert.equal(result.html.slice(result.html.indexOf('voice.addEventListener("timeupdate",follow)')),
  fixture.slice(fixture.indexOf('voice.addEventListener("timeupdate",follow)')));
 assert.match(result.html,/function taleraV10StartRemainingPhotos/);
 assert.match(result.html,/taleraStartOriginalRound\(\)/);
 assert.match(result.html,/msg\("Terugkijken afgelopen"\)/);
 assert.doesNotMatch(result.html,/const recorder="changed"/);
 const again=applyMissingPhotoTail(result.html);
 assert.equal(again.status,'already-installed');
 assert.equal(again.html,result.html);
});
test('missing or ambiguous source anchor fails closed; never blindly overwrites player code',()=>{
 assert.deepEqual(applyMissingPhotoTail('no original cues'),{html:'no original cues',status:'anchor-unmatched'});
 const duplicate=fixture.replace('</script>',ORIGINAL_VOICE_END+'</script>');
 assert.equal(applyMissingPhotoTail(duplicate).status,'anchor-unmatched');
});
test('GET embed only is patched, preserving upstream status and caching controls',async()=>{
 const {env,requests}=mock(fixture);
 const response=await worker.fetch(new Request(origin+'/vertelmodus-embed?mode=present'),env);
 const s=await response.text();
 assert.equal(response.status,200);
 assert.equal(response.headers.get('x-talera-v10-tail-photos'),'installed');
 assert.equal(response.headers.get('etag'),null);
 assert.equal(response.headers.get('x-upstream'),'stil-luxe');
 assert.match(s,/taleraV10MissingPhotos/);
 assert.equal(requests[0].path,'/vertelmodus-embed');
});
test('presenter, home, editor, APIs, POST and non-HTML are strictly passed through',async()=>{
 for(const route of ['/','/present','/tell','/api/v9/memory']){
   const {env}=mock(fixture);
   const r=await worker.fetch(new Request(origin+route),env);
   assert.equal(await r.text(),fixture);
   assert.equal(r.headers.get('x-talera-v10-tail-photos'),null);
   assert.equal(r.headers.get('etag'),'original-unchanged');
 }
 const {env}=mock(fixture);
 const post=await worker.fetch(new Request(origin+'/vertelmodus-embed',{method:'POST',body:'original data'}),env);
 assert.equal(await post.text(),fixture);
 const {env:jsonEnv}=mock('{"unchanged":true}',{contentType:'application/json'});
 const json=await worker.fetch(new Request(origin+'/vertelmodus-embed'),jsonEnv);
 assert.equal(await json.text(),'{"unchanged":true}');
});
test('missing service binding fails safely without touching the protected V9',async()=>{
 const response=await worker.fetch(new Request(origin+'/vertelmodus-embed'),{});
 assert.equal(response.status,503);
 assert.match(await response.text(),/stijltestbasis ontbreekt/);
});

function simulate(items,cues,{present=true,voiceUrl='blob:narration',videos=true}={}){
 const shown=[],notices=[],stages=[],eventHandlers=new Map(),timers=new Map();
 let seq=0,videoStarts=0;
 const state={items,cues,voiceUrl,media:{pause(){}} ,duration:9000};
 const playButton={hidden:false},clockLabel={textContent:''};
 const context={
   state,voice:{addEventListener(name,fn){eventHandlers.set(name,fn);}},
   document:{body:{classList:{contains:name=>name==='present'&&present}}},
   window:{addEventListener(name,fn){eventHandlers.set('window:'+name,fn);}},
   location:{origin},
   setTimeout(fn,ms){const id=++seq;timers.set(id,{fn,ms});return id;},
   clearTimeout(id){timers.delete(id);},
   show(index){shown.push(index);},
   mode(name){stages.push(name);},
   msg(message){notices.push(message);},
   $(id){return id==='play'?playButton:clockLabel;},
   clock(ms){return (ms/1000)+' sec';},
   taleraStartOriginalRound(){videoStarts++;return videos;}
 };
 runInNewContext(PHOTO_TAIL_PATCH,context);
 function nextPhotoTimer(){
   const first=timers.entries().next().value;
   assert.ok(first,'a photo tail timer must exist');
   const [key,{fn,ms}]=first;
   timers.delete(key);
   fn();
   return ms;
 }
 return {state,shown,notices,stages,clockLabel,timers,playButton,
   end:()=>eventHandlers.get('ended')(),
   nextPhotoTimer,
   message:data=>eventHandlers.get('window:message')({origin,data}),
   hide:()=>eventHandlers.get('window:pagehide')(),
   get videoStarts(){return videoStarts;}
 };
}
test('full replay: narration, three missing images in 4-second turns, then original video audio',()=>{
 const items=[image('a'),image('b'),image('c'),image('d'),image('e'),image('f'),video('g')];
 const cues=[{t:0,index:0},{t:3000,index:1},{t:6700,index:2}];
 const frozen=JSON.stringify({items,cues});
 const s=simulate(items,cues);
 s.end();
 assert.deepEqual(s.shown,[3]);
 assert.equal(s.videoStarts,0);
 assert.equal(s.playButton.hidden,true);
 assert.equal(s.clockLabel.textContent,'9 sec');
 assert.equal(s.nextPhotoTimer(),PHOTO_HOLD_MS);
 assert.deepEqual(s.shown,[3,4]);
 assert.equal(s.nextPhotoTimer(),PHOTO_HOLD_MS);
 assert.deepEqual(s.shown,[3,4,5]);
 assert.equal(s.nextPhotoTimer(),PHOTO_HOLD_MS);
 assert.equal(s.videoStarts,1,'original second video round starts only after final photo');
 assert.equal(s.timers.size,0);
 assert.equal(JSON.stringify({items,cues}),frozen,'saved audio/photo mapping is unchanged');
});
test('fully narrated photos go directly to existing original video-sound round',()=>{
 const s=simulate([image('a'),video('b'),image('c')],[{index:0},{index:2}]);
 s.end();
 assert.deepEqual(s.shown,[]);
 assert.equal(s.videoStarts,1);
 assert.equal(s.timers.size,0);
});
test('photo-only story: final still then normal end, no fake audio or duplicate video',()=>{
 const s=simulate(SIX,[{t:0,index:0},{t:4000,index:1}],{videos:false});
 s.end();
 for(let k=0;k<4;k++)s.nextPhotoTimer();
 assert.equal(s.shown.length,4);
 s.nextPhotoTimer();
 assert.equal(s.videoStarts,1);
 assert.equal(s.notices.at(-1),'Terugkijken afgelopen');
});
test('reinitializing or pausing the iframe cancels timers and forbids an orphan advance',()=>{
 for(const type of ['INIT','PAUSE_PLAYER']){
   const s=simulate(SIX,[{index:0}]);
   s.end();
   assert.equal(s.shown.length,1);
   s.message({taleraZero:true,type});
   assert.equal(s.timers.size,0);
   assert.equal(s.videoStarts,0);
 }
 const s=simulate(SIX,[{index:0}]);
 s.end();s.hide();
 assert.equal(s.timers.size,0);
});
test('recorder and non-present preview retain their original ended logic',()=>{
 const s=simulate(SIX,[{index:0}],{present:false,videos:false});
 s.end();
 assert.deepEqual(s.shown,[]);
 assert.equal(s.videoStarts,1,'original video handling invoked as before');
 assert.equal(s.timers.size,0);
});
