import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {applyClosedCore,CLOSED_VOICE_END,CORE_MARKER,unseenPhotos} from './one-flow.worker.mjs';

const frames=[
  {key:'video-a',kind:'video'},{key:'photo-b',kind:'photo'},
  {key:'photo-c',kind:'photo'},{key:'photo-d',kind:'photo'},
  {key:'video-e',kind:'video'}
];
const cues=[
  {mediaId:'video-a',t:0,index:0,videoAtMs:0},
  {mediaId:'photo-b',t:1500,index:1,videoAtMs:0}
];
function make({frames:items=frames,cues:marks=cues,lastVideo=null,id='m1'}={}){
 const s={memory:{id},frames:items,cues:marks,timer:1,
   phase:'narration',ordinaryTimer:null,video:lastVideo,
   videoKey:lastVideo?.key||'',replayFrames:[],replayIndex:-1};
 const shown=[],played=[],timerMap=new Map(),errors=[];
 let taleraInline=s,nextTimer=0;
 const env={
  taleraInline:s,runtime:{currentMemory:()=>({id})},
  console:{warn:(...e)=>errors.push(e)},
  clearInterval(){},clearTimeout(k){timerMap.delete(k)},
  setTimeout(cb,ms){const k=++nextTimer;timerMap.set(k,{cb,ms});return k},
  taleraInlineSetFrame(session,index){shown.push(index)},
  taleraInlineCleanVideo(session){session.video=null;session.videoKey=''},
  taleraInlineReplayNext(session){
    assert.equal(session.phase,'originals');
    const frame=session.replayFrames[++session.replayIndex];
    if(!frame){session.phase='done';session.video=null;return}
    session.video={key:frame.key,muted:false,currentTime:0};
    session.videoKey=frame.key;
    played.push({key:frame.key,muted:false,currentTime:0});
  }
 };
 vm.runInNewContext(CLOSED_VOICE_END,env);
 const advance=()=>{
   const first=timerMap.entries().next().value;
   assert.ok(first,'expected pending timed photo');
   const [k,t]=first;
   timerMap.delete(k);t.cb();return t.ms;
 };
 return {
   s,shown,played,errors,advance,
   end:()=>env.taleraInlineVoiceEnded(s),
   videoEnded:()=>env.taleraInlineReplayNext(s),
   stale:()=>{env.taleraInline=null},
   getTimers:()=>timerMap.size
 };
}

test('ONE stored memory: all media IDs remain in their recorded order',()=>{
 assert.equal(frames.length,5);
 assert.deepEqual(unseenPhotos(frames,cues).map(x=>x.frame.key),['photo-c','photo-d']);
 assert.deepEqual(unseenPhotos(frames,[{mediaId:'photo-d'}]).map(x=>x.frame.key),['photo-b','photo-c']);
});
test('one CLOSED core: voice -> unseen photos 4s -> originals full length from zero with sound -> done',()=>{
 const h=make();h.end();
 assert.equal(h.s.phase,'tail');
 assert.deepEqual(h.shown,[2]);
 assert.equal(h.advance(),4000);
 assert.deepEqual(h.shown,[2,3]);
 assert.equal(h.advance(),4000);
 assert.equal(h.s.phase,'originals');
 assert.deepEqual(h.played,[{key:'video-a',muted:false,currentTime:0}]);
 h.videoEnded();
 assert.deepEqual(h.played.map(x=>x.key),['video-a','video-e']);
 h.videoEnded();assert.equal(h.s.phase,'done');
 assert.equal(h.getTimers(),0);
 assert.deepEqual(h.shown,[2,3]);
});
test('spoken voice finishes MID-video: finish THAT muted clip first then photo-tail then originals',async()=>{
 const video={key:'video-a',paused:true,ended:false,readyState:4,duration:5,currentTime:2,
   play(){this.paused=false;return Promise.resolve()}};
 const h=make({lastVideo:video,cues:[{mediaId:'video-a',index:0,t:0,videoAtMs:0}]});
 h.end();await Promise.resolve();
 assert.equal(h.s.phase,'tail');assert.equal(video.muted,true);assert.equal(video.paused,false);
 assert.deepEqual(h.shown,[]);
 video.onended();assert.deepEqual(h.shown,[1]);
 h.advance();h.advance();h.advance();
 assert.equal(h.s.phase,'originals');
 assert.equal(h.played[0].key,'video-a');
 assert.equal(h.played[0].muted,false);
 assert.equal(h.played[0].currentTime,0);
});
test('already finished silent video does not get a second silent playback round',()=>{
 const video={key:'video-a',paused:true,ended:true,readyState:4,duration:1,currentTime:1};
 const h=make({lastVideo:video});
 h.end();assert.deepEqual(h.shown,[2]);
 assert.equal(h.s.phase,'tail');
});
test('no missing photos transitions directly, without temporarily reopening narration phase',()=>{
 const h=make({cues:[{mediaId:'photo-b',index:1,t:0},{mediaId:'photo-c',index:2,t:1},{mediaId:'photo-d',index:3,t:2}]});
 h.end();assert.equal(h.s.phase,'originals');
 assert.deepEqual(h.shown,[]);
});
test('no videos: final unseen photos close cleanly in done',()=>{
 const h=make({frames:[{kind:'photo',key:'a'},{kind:'photo',key:'b'}],cues:[{mediaId:'a',index:0,t:0}]});
 h.end();assert.equal(h.advance(),4000);
 assert.equal(h.s.phase,'done');assert.equal(h.getTimers(),0);
});
test('swipe away invalidates callbacks: no late internal photo or video transitions',()=>{
 const h=make();h.end();
 assert.deepEqual(h.shown,[2]);
 h.stale();h.advance();
 assert.deepEqual(h.shown,[2]);
 assert.deepEqual(h.played,[]);
});
test('source transform denies old photo tap, audio retry on swipe, and refreshes first-frame cover',()=>{
 const src=[
 'function taleraInlinePlayMedia(s,frame,muted,finished){}',
 'function taleraInlineReplayNext(s){}',
 'function taleraInlineVoiceEnded(s){return 123;}',
 "      else if(s.phase==='originals'&&s.video){\n        s.video.muted=!enabled();\n        if(s.video.paused)void s.video.play().catch(err=>{\n          if(err?.name==='NotAllowedError'&&enabled())informGesture(s);\n        });\n      }",
 "    }else if(s.engine==='narrated'&&s.phase==='narration')tryVoice(s);\n    else if(s.video?.paused&&!s.video.ended)void s.video.play().catch(()=>{});",
 'function taleraInlineOrdinaryStep(s,index){}',
 'function showPhoto(memory,index,manual=false){return index;}',
 '  const retry=e=>{\n    const s=taleraInline;',
 "    if(s?.engine!=='narrated'||s.phase!=='narration')return;",
 '       memory._photoIndex=0;\n       memory.image=photos[0]||placeholder;',
 ' async function hydrate(memory){}',
 'function assign(tile,index,mem){if(tile.index===index)return;}',
 "    const hint=document.createElement('div');\n    hint.className='talera-v61-audio-permission-hint';\n    hint.textContent='Tik op de foto om het geluid te starten';",
 "    hint.style.cssText='pointer-events:none';\n    (stage.parentElement||stage).appendChild(hint);s.hint=hint;",
 "          const hint=document.createElement('div');\n          hint.textContent='Tik op de foto om het geluid te starten';",
 "          hint.style.cssText='pointer-events:none';\n          (stage.parentElement||stage).appendChild(hint);s.hint=hint;",
 '/* TALERA V13: V3 continuous wheel is sole owner of photo gestures and position. */'
 ].join('\n');
 const r=applyClosedCore(src);
 assert.equal(r.status,'installed',r.status);
 assert.equal(r.html.includes(CORE_MARKER),true);
 assert.equal(r.html.includes('s.closedAudioSoundtrack=true'),true,'same audible element plays WAV and original sound');
 assert.equal(r.html.includes("video.muted=muted||audioOwner"),true,'original video remains muted while audio element plays track');
 assert.equal(r.html.includes("if(manual&&memory?._zeroItems?.some(item=>item.kind==='audio'))return;"),true);
 assert.equal(r.html.includes("if(s?.engine==='narrated')return;"),true);
 assert.equal(r.html.includes("memory.previewImage=photos[coverIndex]"),true);
 assert.equal(r.html.includes("s.phase='narration';\n      taleraInlineVoiceEnded(s)"),false);
 assert.equal(r.html.includes('taleraUnifiedWarmVideos'),false);
 assert.equal(r.html.includes('taleraUnifiedNarrationEnded'),false);
 assert.equal(applyClosedCore(r.html).status,'already-installed');
 assert.equal(applyClosedCore(src.replace('if(tile.index===index)return;','')).status,'anchor-unmatched:wheel-cover');
});
