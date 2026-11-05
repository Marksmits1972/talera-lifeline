import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker,{applyUnifiedTail,INLINE_TAIL,remainingMedia,
  AUDIO_END_BEFORE,AUDIO_END_AFTER,INSTALL_MARKER,INSERT_BEFORE} from './one-flow.worker.mjs';

const frames=()=>[
  {kind:'photo',key:'p1'},{kind:'video',key:'v1'}, {kind:'photo',key:'p2'},
  {kind:'photo',key:'p3'},{kind:'video',key:'v2'}, {kind:'photo',key:'p4'}
];
const cues=()=>[{mediaId:'p1',index:0,t:0},{mediaId:'v1',index:1,t:5000},
  {mediaId:'p2',index:2,t:12000}];
const nativePage='<html><script>function taleraInlineSetFrame(s,index){}'+
  'function taleraInlinePlayMedia(s,frame,muted,finished){}'+
  'function taleraInlineCleanVideo(s){}'+
  INSERT_BEFORE+'}'+AUDIO_END_BEFORE+'</script></html>';

function fixture({ordered=frames(),recorded=cues(),lastVideo=null}={}){
  const s={memory:{id:'m1'},frames:ordered,cues:recorded,timer:null,ordinaryTimer:null,phase:'narration',
    video:lastVideo,videoKey:lastVideo?.key||'',audio:{currentTime:20},videoSerial:0};
  const shown=[],played=[],timers=[],errors=[];
  let now=20000;
  const timersMap=new Map();
  const env={
    taleraInline:s,runtime:{currentMemory:()=>({id:'m1'})},document:{hidden:false,addEventListener(){}},
    performance:{now:()=>now},console:{warn:(...a)=>errors.push(a)},
    setTimeout:(fn,ms)=>{const t={fn,ms};timers.push(t);timersMap.set(t,true);return t;},
    clearTimeout:t=>{timersMap.delete(t)},
    clearInterval:()=>{},
    taleraInlineCleanVideo:()=>{s.video=null;s.videoKey='';},
    taleraInlineSetFrame:(session,index)=>{shown.push(index)},
    taleraInlinePlayMedia:(session,frame,muted,onended)=>{played.push({key:frame.key,muted,onended});
      const video={key:frame.key,muted,defaultMuted:muted,paused:false,ended:false,readyState:4,
        currentTime:0,duration:frame.kind==='video'?10:0};s.video=video;s.videoKey=frame.key;},
  };
  vm.runInNewContext(INLINE_TAIL,env);
  const tick=()=>{const current=timers.find(x=>timersMap.has(x));assert.ok(current,'timer');timersMap.delete(current);now+=current.ms;current.fn();return current.ms;};
  const endVideo=()=>{assert.ok(played.length);played.at(-1).onended();};
  return {s,shown,played,timers,errors,tick,endVideo,end:()=>env.taleraUnifiedNarrationEnded(s),runtime:env.runtime};
}

test('only target existing native V9 /present anchors; does not duplicate player',()=>{
  const r=applyUnifiedTail(nativePage);
  assert.equal(r.status,'installed');
  assert.equal(r.html.split(INSTALL_MARKER).length-1,1);
  assert.equal(r.html.split(AUDIO_END_AFTER).length-1,1);
  assert.equal(r.html.replace(INLINE_TAIL+'\n','').replace(AUDIO_END_AFTER,AUDIO_END_BEFORE),nativePage);
  assert.equal(applyUnifiedTail(r.html).status,'already-installed');
  assert.equal(applyUnifiedTail(nativePage.replace(AUDIO_END_BEFORE,'')).status,'anchor-unmatched');
});

test('visited IDs are not added a second time, including revisits',()=>{
  const r=remainingMedia(frames(),[...cues(),{mediaId:'p1',index:0,t:19000}]);
  assert.deepEqual(r.map(x=>x.frame.key),['p3','v2','p4']);
});

test('unvisited photos and muted video run in saved order without new player',()=>{
  const h=fixture();
  h.end();
  assert.deepEqual(h.shown,[3]);
  assert.equal(h.s.phase,'unifiedTail');
  assert.equal(h.tick(),4000);
  assert.deepEqual(h.shown,[3,4]);
  assert.equal(h.played.length,1);
  assert.deepEqual(h.played.map(x=>[x.key,x.muted]),[['v2',true]]);
  h.endVideo();
  assert.deepEqual(h.shown,[3,4,5]);
  assert.equal(h.tick(),4000);
  assert.equal(h.s.phase,'done');
});

test('narration ends on active video: let remaining clip finish first, never replay it',async()=>{
  let finished=false;
  const last={key:'v1',muted:true,defaultMuted:true,paused:true,ended:false,readyState:4,
    currentTime:6,duration:10,play(){this.paused=false;return Promise.resolve()}};
  const h=fixture({recorded:[{mediaId:'p1',index:0,t:0},{mediaId:'v1',index:1,t:14000}],
    lastVideo:last});
  h.end();
  await Promise.resolve();
  assert.equal(last.paused,false);
  assert.equal(h.shown.length,0);
  assert.equal(h.played.length,0);
  last.onended();
  assert.deepEqual(h.shown,[2]);
  h.tick();assert.deepEqual(h.shown,[2,3]);
  h.tick();assert.deepEqual(h.shown,[2,3,4]);
  assert.equal(h.played[0].key,'v2');
  assert.equal(h.played[0].muted,true);
  h.endVideo();assert.deepEqual(h.shown,[2,3,4,5]);
});

test('finished narration video does not duplicate; only unseen files remain',()=>{
  const last={key:'v1',muted:true,paused:true,ended:true,readyState:4,currentTime:10,duration:10};
  const h=fixture({recorded:[{mediaId:'v1',index:1,t:0}],lastVideo:last});
  h.end();
  assert.deepEqual(h.shown,[0]);
  assert.equal(h.played.length,0);
});

test('navigation to another memory halts next photo tick',()=>{
  const h=fixture();
  h.end();
  h.runtime.currentMemory=()=>({id:'another'});
  h.tick();
  assert.deepEqual(h.shown,[3]);
});

test('only /present is modified; known existing recorder and all other routes identical',async()=>{
  const env={STYLE_BASE:{fetch:async()=>new Response(nativePage,{headers:{'content-type':'text/html; charset=utf-8',etag:'old'}})}};
  const changed=await worker.fetch(new Request('https://test.local/present'),env);
  assert.equal(changed.headers.get('x-talera-clean-one-memory'),'installed');
  assert.equal(changed.headers.get('etag'),null);
  for(const p of ['/','/tell','/vertelmodus-embed?mode=record','/vertelmodus-embed?mode=present']){
    const resp=await worker.fetch(new Request('https://test.local'+p),env);
    assert.equal(await resp.text(),nativePage);
    assert.equal(resp.headers.get('etag'),'old');
  }
});

test('no protected base or changed native anchors fails safely',async()=>{
  assert.equal((await worker.fetch(new Request('https://test.local/present'),{})).status,503);
  const env={STYLE_BASE:{fetch:async()=>new Response('<html>changed</html>',{headers:{'content-type':'text/html'}})}};
  assert.equal((await worker.fetch(new Request('https://test.local/present'),env)).status,503);
});
