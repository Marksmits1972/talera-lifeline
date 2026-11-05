import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext,Script} from 'node:vm';
import worker,{INLINE_PHOTO_HELPER,ORIGINAL_AUDIO_END,PATCHED_AUDIO_END,
 INSERT_ANCHOR,addRemainingPhotosToInlinePlayer} from './restfotos.worker.mjs';

const page='<html><body><script>'+
 'function taleraInlineCleanVideo(s){}'+
 'function taleraInlineSetFrame(s,index){}'+
 'function taleraInlineReplayNext(s){}'+
 INSERT_ANCHOR+'s.phase="originals";taleraInlineReplayNext(s)}'+
 'function present(){'+ORIGINAL_AUDIO_END+'}'+
 '</script></body></html>';
const photo=n=>({kind:'photo',key:'p'+n});
const video=n=>({kind:'video',key:'v'+n});
const cues=(...keys)=>keys.map((mediaId,t)=>({mediaId,t:t*700,index:t}));
function setup(frames,cueList,{same=true,active=true}={}){
 const s={frames,cues:cueList,memory:{id:'mem'},phase:'narration',ordinaryTimer:null};
 let session=s;
 if(!same)session={other:true};
 const shown=[],timers=[],events=[];let originalCalls=0;
 const audio={};
 const env={s,audio,taleraInline:session,
 runtime:{currentMemory:()=>({id:active?'mem':'other'})},
 taleraInlineSetFrame:(s,n)=>{shown.push(n);events.push('photo-'+n)},
 taleraInlineCleanVideo:()=>events.push('clean-old-video'),
 taleraInlineVoiceEnded:()=>{originalCalls++;events.push('original-videos')},
 setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.at(-1)},
 stopTimer:()=>{},tick:()=>{}};
 runInNewContext(INLINE_PHOTO_HELPER+'\n'+PATCHED_AUDIO_END,env);
 return{s,shown,timers,events,end:()=>audio.onended(),
 tick:()=>{const x=timers.shift();assert.ok(x);x.fn();return x.ms},
 original:()=>originalCalls};
}
test('exact original V9 HTML recovered from 1 helper + 1 callback',()=>{
 const r=addRemainingPhotosToInlinePlayer(page);
 assert.equal(r.status,'installed');
 assert.equal(r.html.split(INLINE_PHOTO_HELPER).length-1,1);
 assert.equal(r.html.split(PATCHED_AUDIO_END).length-1,1);
 assert.equal(r.html.replace(INLINE_PHOTO_HELPER+'\n','').replace(PATCHED_AUDIO_END,ORIGINAL_AUDIO_END),page);
 assert.equal(addRemainingPhotosToInlinePlayer(r.html).status,'already-installed');
 assert.doesNotThrow(()=>new Script(INLINE_PHOTO_HELPER+'\n'+PATCHED_AUDIO_END));
});
test('5 photos plus a video: three unused photo IDs then original video',()=>{
 const frames=[video(0),photo(1),photo(2),photo(3),photo(4),photo(5)];
 const spoken=cues('v0','p1','p2'),originalJSON=JSON.stringify({frames,spoken});
 const h=setup(frames,spoken);h.end();assert.deepEqual(h.shown,[3]);
 assert.equal(h.tick(),4000);assert.deepEqual(h.shown,[3,4]);
 assert.equal(h.tick(),4000);assert.deepEqual(h.shown,[3,4,5]);
 assert.equal(h.tick(),4000);assert.equal(h.original(),1);
 assert.deepEqual(h.events.slice(-4),['photo-3','photo-4','photo-5','original-videos']);
 assert.equal(JSON.stringify({frames,spoken}),originalJSON);
});
test('six photos, four narrated, exactly two restphotos',()=>{
 const h=setup(Array.from({length:6},(_,i)=>photo(i)),cues('p0','p1','p2','p3'));
 h.end();assert.deepEqual(h.shown,[4]);h.tick();assert.deepEqual(h.shown,[4,5]);
 h.tick();assert.equal(h.original(),1);
});
test('all photos narrated: native replay follows immediately',()=>{
 const h=setup([video(0),photo(0),photo(1)],cues('v0','p0','p1'));
 h.end();assert.deepEqual(h.shown,[]);assert.equal(h.timers.length,0);assert.equal(h.original(),1);
});
test('duplicate / out of order cues never count another photo as spoken',()=>{
 const h=setup([photo(0),photo(1),photo(2),photo(3)],cues('p3','p0','p3'));
 h.end();assert.deepEqual(h.shown,[1]);h.tick();assert.deepEqual(h.shown,[1,2]);
});
test('unspoken videos never enter rest photo queue',()=>{
 const h=setup([video(0),photo(0),video(1)],cues('p0'));
 h.end();assert.deepEqual(h.shown,[]);assert.equal(h.original(),1);
});
test('canceled session and another memory cannot show a stale photo',()=>{
 for(const options of [{same:false},{active:false}]){
  const h=setup([photo(0),photo(1)],cues('p0'),options);
  h.end();assert.deepEqual(h.shown,[]);assert.equal(h.original(),0);
 }
 const x=setup([photo(0),photo(1)],cues('p0'));x.end();
 x.s.phase='ordinary';x.tick();assert.equal(x.original(),0);
});
test('native ordinaryTimer is reused for cleanup, no new player state',()=>{
 const h=setup([photo(0),photo(1)],cues('p0'));h.end();
 assert.equal(h.s.phase,'remainingPhotos');
 assert.equal(h.s.ordinaryTimer,h.timers[0]);h.tick();
 assert.equal(h.s.ordinaryTimer,null);
 assert.equal(h.s.phase,'narration');
});
test('fails closed for missing or duplicate native anchors',()=>{
 assert.equal(addRemainingPhotosToInlinePlayer('unknown').status,'anchor-unmatched');
 assert.equal(addRemainingPhotosToInlinePlayer(page.replace('</script>',ORIGINAL_AUDIO_END+'</script>')).status,'anchor-unmatched');
});
test('GET /present only; original editor, recorder, timeline, POST unchanged',async()=>{
 const env={STYLE_BASE:{fetch:async()=>new Response(page,{headers:{'content-type':'text/html; charset=utf-8',etag:'old'}})}};
 const p=await worker.fetch(new Request('https://x.test/present'),env);
 assert.equal(p.headers.get('x-talera-v12-inline-restfotos'),'installed');
 assert.equal(p.headers.get('etag'),null);
 for(const path of ['/','/tell','/vertelmodus-embed?mode=present']){
  const r=await worker.fetch(new Request('https://x.test'+path),env);
  assert.equal(await r.text(),page);assert.equal(r.headers.get('etag'),'old');
 }
});
test('no protected base: safe 503',async()=>{
 assert.equal((await worker.fetch(new Request('https://x.test/present'),{})).status,503);
});
