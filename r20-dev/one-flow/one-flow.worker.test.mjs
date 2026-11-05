import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker,{applyUnifiedTail,INLINE_TAIL,remainingMedia,
  AUDIO_END_BEFORE,AUDIO_END_AFTER,INSTALL_MARKER,INSERT_BEFORE,restoreApprovedV9} from './one-flow.worker.mjs';

const frames=()=>[
  {kind:'photo',key:'p1'},{kind:'video',key:'v1'}, {kind:'photo',key:'p2'},
  {kind:'photo',key:'p3'},{kind:'video',key:'v2'}, {kind:'photo',key:'p4'}
];
const cues=()=>[{mediaId:'p1',index:0,t:0},{mediaId:'v1',index:1,t:5000},
  {mediaId:'p2',index:2,t:12000}];
const nativeVideoHint="          const hint=document.createElement('div');\n          hint.textContent='Tik op de foto om het geluid te starten';\n          hint.style.cssText='position:absolute;left:50%;bottom:22%;transform:translateX(-50%);z-index:20;padding:9px 15px;border-radius:15px;background:rgba(250,250,247,.94);color:#173d52;font:650 13px system-ui;pointer-events:none';";
const nativeVoiceHint="    const hint=document.createElement('div');\n    hint.className='talera-v61-audio-permission-hint';\n    hint.textContent='Tik op de foto om het geluid te starten';\n    hint.style.cssText='position:absolute;left:50%;bottom:22%;transform:translateX(-50%);z-index:20;padding:9px 15px;border-radius:15px;background:rgba(250,250,247,.94);color:#173d52;font:650 13px system-ui;pointer-events:none';";
const nativePage='<html><script>'+
  "function taleraInlineDispose(){\n  const s=taleraInline;\n  taleraInline=null;}"+
  'function taleraInlineSetFrame(s,index){}'+
  "function taleraInlinePlayMedia(s,frame,muted,finished){"+
  "const video=document.createElement('video');"+
  "async function load(){const url=await store.mediaUrl(frame.key);}\n"+nativeVideoHint+"\n}"+
  'function taleraInlineCleanVideo(s){}'+
  'function taleraInlineReplayNext(s){}'+
  INSERT_BEFORE+'}'+
  "function taleraInlineInstallAudioControls(){\n"+
  "  const retry=e=>{\n    const s=taleraInline;};\n"+
  "  document.addEventListener('click',e=>{\n"+
  "    if(s?.engine!=='narrated'||s.phase!=='narration')return;},true);\n"+nativeVoiceHint+"\n}"+
  "async function present(memory){\n  taleraInline=s;\n  if(hasVoice){}}"+
  AUDIO_END_BEFORE+'</script></html>';

function fixture({ordered=frames(),recorded=cues(),lastVideo=null,soundEnabled=true}={}){
  const s={memory:{id:'m1'},frames:ordered,cues:recorded,timer:null,ordinaryTimer:null,phase:'narration',
    video:lastVideo,videoKey:lastVideo?.key||'',audio:{currentTime:20},videoSerial:0};
  const shown=[],played=[],timers=[],errors=[],nativeCalls=[];
  let now=20000;
  const timersMap=new Map();
  let env;
  const nativeNext=()=>{
    const frame=s.replayFrames[++s.replayIndex];
    if(!frame){env.taleraInlineCleanVideo(s);s.phase='done';return}
    env.taleraInlineSetFrame(s,s.frames.indexOf(frame));
    // This is the original V9 replay: always fresh native video at t=0,
    // with sound controlled by the existing V9 listening setting.
    env.taleraInlinePlayMedia(s,frame,!soundEnabled,nativeNext);
  };
  env={
    taleraInline:s,runtime:{currentMemory:()=>({id:'m1'})},document:{hidden:false,addEventListener(){}},
    performance:{now:()=>now},console:{warn:(...a)=>errors.push(a)},
    setTimeout:(fn,ms)=>{const t={fn,ms};timers.push(t);timersMap.set(t,true);return t;},
    clearTimeout:t=>{timersMap.delete(t)},
    clearInterval:()=>{},
    taleraInlineCleanVideo:()=>{s.video=null;s.videoKey='';},
    taleraInlineSetFrame:(session,index)=>{shown.push(index)},
    taleraInlinePlayMedia:(session,frame,muted,onended)=>{
      played.push({key:frame.key,muted,onended,at:0});
      const video={key:frame.key,muted,defaultMuted:muted,paused:false,ended:false,readyState:4,
        currentTime:0,duration:frame.kind==='video'?10:0};s.video=video;s.videoKey=frame.key;
    },
    taleraInlineVoiceEnded:session=>{
      assert.equal(session.phase,'narration','hand back to the original native V9 video replay');
      nativeCalls.push('original-v9');
      env.taleraInlineCleanVideo(s);
      s.replayFrames=s.frames.filter(f=>f.kind==='video');
      if(!s.replayFrames.length){s.phase='done';return}
      s.phase='originals';s.replayIndex=-1;nativeNext();
    }
  };
  vm.runInNewContext(INLINE_TAIL,env);
  const tick=()=>{const current=timers.find(x=>timersMap.has(x));assert.ok(current,'photo timer');timersMap.delete(current);now+=current.ms;current.fn();return current.ms;};
  const endVideo=()=>{assert.ok(played.length);played.at(-1).onended();};
  return {s,shown,played,timers,errors,nativeCalls,tick,endVideo,end:()=>env.taleraUnifiedNarrationEnded(s),runtime:env.runtime};
}

test('patch only one callback and preserve original native V9 video helpers',()=>{
  const r=applyUnifiedTail(nativePage);
  assert.equal(r.status,'installed');
  assert.equal(r.html.split(INSTALL_MARKER).length-1,1);
  assert.equal(r.html.split(AUDIO_END_AFTER).length-1,1);
  assert.equal(restoreApprovedV9(r.html),nativePage);
  assert.equal(applyUnifiedTail(r.html).status,'already-installed');
  assert.equal(applyUnifiedTail(nativePage.replace(AUDIO_END_BEFORE,'')).status,'anchor-unmatched');
});

test('only photos missing in narration go before the full original video round',()=>{
  const r=remainingMedia(frames(),[...cues(),{mediaId:'p1',index:0,t:19000}]);
  assert.deepEqual(r.map(x=>x.frame.key),['p3','p4']);
});

test('unseen photos 4s each -> ALL original videos full-length with sound, same player',()=>{
  const h=fixture();
  h.end();
  assert.deepEqual(h.shown,[3]);
  assert.equal(h.s.phase,'unifiedTail');
  assert.equal(h.played.length,0);
  assert.equal(h.tick(),4000);
  assert.deepEqual(h.shown,[3,5]);
  assert.equal(h.tick(),4000);
  assert.deepEqual(h.shown,[3,5,1]);
  assert.deepEqual(h.nativeCalls,['original-v9']);
  assert.equal(h.s.phase,'originals');
  assert.deepEqual(h.played.map(x=>[x.key,x.muted,x.at]),[['v1',false,0]]);
  h.endVideo();
  assert.deepEqual(h.shown,[3,5,1,4]);
  assert.deepEqual(h.played.map(x=>[x.key,x.muted,x.at]),[['v1',false,0],['v2',false,0]]);
  h.endVideo();
  assert.equal(h.s.phase,'done');
});

test('narration ends on an active silent video -> finish it -> photos -> REPLAY FROM ZERO WITH SOUND',async()=>{
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
  h.tick();assert.deepEqual(h.shown,[2,3,5]);
  h.tick();assert.equal(h.s.phase,'originals');
  assert.equal(h.played[0].key,'v1');
  assert.equal(h.played[0].muted,false);
  assert.equal(h.played[0].at,0);
  h.endVideo();
  assert.equal(h.played[1].key,'v2');
  assert.equal(h.played[1].muted,false);
});

test('even when the spoken video already ended, it still replays in full with sound',()=>{
  const last={key:'v1',muted:true,paused:true,ended:true,readyState:4,currentTime:10,duration:10};
  const h=fixture({recorded:[{mediaId:'v1',index:1,t:0}],lastVideo:last});
  h.end();
  assert.deepEqual(h.shown,[0]);
  assert.equal(h.played.length,0);
  for(let i=0;i<4;i++)h.tick();
  assert.equal(h.nativeCalls.length,1);
  assert.equal(h.played[0].key,'v1');
  assert.equal(h.played[0].muted,false);
  assert.equal(h.played[0].at,0);
});

test('no unseen photos: hand off straight away to the original native video round',()=>{
  const h=fixture({ordered:[{kind:'photo',key:'p1'},{kind:'video',key:'v1'}],
    recorded:[{mediaId:'p1',index:0,t:0},{mediaId:'v1',index:1,t:1000}]});
  h.end();
  assert.equal(h.s.phase,'originals');
  assert.equal(h.nativeCalls.length,1);
  assert.deepEqual(h.played.map(x=>[x.key,x.muted]),[['v1',false]]);
});

test('existing native audio permission remains authoritative when sound disabled',()=>{
  const h=fixture({soundEnabled:false});
  h.end();h.tick();h.tick();
  assert.equal(h.played[0].muted,true);
});

test('without any videos, photos end cleanly after 4-second final photo',()=>{
  const h=fixture({ordered:[{kind:'photo',key:'p1'},{kind:'photo',key:'p2'}],
    recorded:[{mediaId:'p1',index:0,t:0}]});
  h.end();
  assert.deepEqual(h.shown,[1]);
  h.tick();
  assert.equal(h.nativeCalls.length,1);
  assert.equal(h.s.phase,'done');
  assert.equal(h.played.length,0);
});

test('leaving to another memory stops all pending photo and video changes',()=>{
  const h=fixture();
  h.end();
  h.runtime.currentMemory=()=>({id:'another'});
  h.tick();
  assert.deepEqual(h.shown,[3]);
  assert.equal(h.nativeCalls.length,0);
});

test('only /present is modified; recorder, editor, timeline and other routes stay unchanged',async()=>{
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

test('missing protected V9 or changed native anchors fail safely',async()=>{
  assert.equal((await worker.fetch(new Request('https://test.local/present'),{})).status,503);
  const env={STYLE_BASE:{fetch:async()=>new Response('<html>changed</html>',{headers:{'content-type':'text/html'}})}};
  assert.equal((await worker.fetch(new Request('https://test.local/present'),env)).status,503);
});

test('first genuine listening gesture unlocks each *original* video element for its later replay',async()=>{
  const listeners=new Map(),events=[],nodes=[],revoked=[];
  let playCalls=0;
  const document={
    addEventListener:(type,fn)=>{listeners.set(type,fn)},
    createElement:tag=>{
      assert.equal(tag,'video');
      const video={muted:false,defaultMuted:false,paused:true,currentTime:0,style:{},
        setAttribute(){},load(){events.push('load')},
        play(){playCalls++;events.push('gesture-play');this.paused=false;return Promise.resolve()},
        pause(){this.paused=true;events.push('pause')},
        removeAttribute(){},remove(){events.push('remove')}};
      nodes.push(video);return video;
    }
  };
  const s={frames:[{kind:'video',key:'original-v1'}],engine:'narrated',phase:'narration'};
  const stage={parentElement:null,appendChild:n=>events.push('append')};
  const env={document,stage,store:{mediaUrl:async key=>{assert.equal(key,'original-v1');return 'blob:original'}},
    URL:{revokeObjectURL:u=>revoked.push(u)},console:{warn:()=>{}},taleraInline:s};
  vm.runInNewContext(INLINE_TAIL,env);
  await env.taleraUnifiedWarmVideos(s);
  assert.equal(s.taleraUnifiedPrepared.size,1);
  assert.equal(playCalls,0,'do not autoplay an audible video before a user gesture');
  assert.equal(listeners.has('pointerup'),false,'swiping may never be a video-prime handler');
  assert.equal(listeners.has('touchend'),false,'touch swipe may never prime videos');
  const photoTap={target:{closest:()=>null}};
  listeners.get('click')(photoTap);
  assert.equal(playCalls,0,'photo taps must not prime narrator videos');
  assert.equal(playCalls,0,'prepared clips remain paused on a narrated memory');
  // The existing, explicit Beluister action alone is allowed to authorize sound.
  listeners.get('talera:enable-listening')();
  await Promise.resolve();await Promise.resolve();await Promise.resolve();
  assert.equal(playCalls,1);
  assert.equal(s.taleraUnifiedPrepared.get('original-v1').primed,true);
  assert.equal(nodes[0].paused,true);
  assert.equal(nodes[0].currentTime,0);
  s.phase='originals';
  assert.equal(env.taleraUnifiedTakePrimed(s,s.frames[0]),nodes[0]);
  assert.equal(s.taleraUnifiedReplayUrl,'blob:original');
  assert.equal(s.taleraUnifiedPrepared.size,0);
  env.taleraUnifiedDropPrepared(s);
  assert.deepEqual(revoked,[],'native V9 owns blob URL of adopted replay video');
});

test('navigation away frees non-used video preparation objects and URLs',async()=>{
  const revoked=[],removed=[];
  const s={frames:[{kind:'video',key:'v1'},{kind:'video',key:'v2'}],
    engine:'narrated',phase:'narration'};
  const env={taleraInline:s,URL:{revokeObjectURL:u=>revoked.push(u)},
    console:{warn:()=>{}},stage:{appendChild:()=>{}},store:{mediaUrl:async k=>'blob:'+k},
    document:{addEventListener(){},createElement:()=>({
      style:{},setAttribute(){},load(){},pause(){},removeAttribute(){},remove(){removed.push(true)}
    })}};
  vm.runInNewContext(INLINE_TAIL,env);
  await env.taleraUnifiedWarmVideos(s);
  env.taleraUnifiedDropPrepared(s);
  assert.deepEqual(revoked,['blob:v1','blob:v2']);
  assert.equal(removed.length,2);
});


test('narrated photo is closed: no pointer, touch or click handler primes original videos',async()=>{
  const listeners=new Map(),plays=[];
  const document={addEventListener:(name,cb)=>listeners.set(name,cb),
    createElement:()=>({style:{},setAttribute(){},load(){},currentTime:0,
      play(){plays.push('video-play');return Promise.resolve()},
      pause(){plays.push('pause')},removeAttribute(){},remove(){}})};
  const memory={id:'saved-memory',_zeroItems:[{kind:'audio'}]};
  const s={memory,frames:[{kind:'video',key:'clip'}],engine:'narrated',phase:'unifiedTail'};
  const env={document,stage:{appendChild(){}},store:{mediaUrl:async()=> 'blob:clip'},
    URL:{revokeObjectURL(){}},console:{warn(){}},taleraInline:s};
  vm.runInNewContext(INLINE_TAIL,env);
  await env.taleraUnifiedWarmVideos(s);
  for(const event of ['pointerup','touchend','pointerdown','touchstart']){
    assert.equal(listeners.has(event),false,event+' must not create playback or internal navigation');
  }
  listeners.get('click')({target:{closest:()=>null}});
  assert.deepEqual(plays,[],'story photo tapping cannot call video.play');
  assert.equal(s.taleraUnifiedPrepared.size,1);
});

test('native V9 tap suppression spans the ENTIRE narrated memory, including photos and originals',()=>{
  const patched=applyUnifiedTail(nativePage);
  assert.equal(patched.status,'installed');
  assert.ok(patched.html.includes(
    "if(s?.engine!=='narrated'&&!(runtime.currentMemory()?._zeroItems?.some(x=>x.kind==='audio')))return;"
  ),'narrated tap guard must not depend on narration phase');
  assert.ok(!patched.html.includes("if(s?.engine!=='narrated'||s.phase!=='narration')return;"),
    'old narration-only guard must not remain');
  assert.ok(patched.html.includes("if(s?.engine==='narrated')return;"),
    'generic pointer/touch audio retry must not run for any narrated phase');
  assert.ok(patched.html.includes("document.addEventListener('talera:enable-listening',taleraUnifiedPrimeCurrent,true);"),
    'Beluister keeps native iOS unlocking gesture');
  assert.ok(patched.html.includes("'.talera-audio-consent,.talera-memory-audio'")||
    patched.html.includes(".talera-audio-consent,.talera-memory-audio"),
    'only a real existing audio control can unlock narrated video sound');
  assert.equal(restoreApprovedV9(patched.html),nativePage);
});

test('existing ordinary photo memories still use V9 tap-to-advance unchanged',()=>{
  const patched=applyUnifiedTail(nativePage);
  assert.equal(patched.status,'installed');
  assert.ok(patched.html.includes("if(s?.engine!=='narrated'&&!(runtime.currentMemory()?._zeroItems?.some(x=>x.kind==='audio')))return;"));
  assert.equal(restoreApprovedV9(patched.html),nativePage,
    'ordinary photo handlers and whole native V9 are untouched');
});

test('existing Luister consent button is a valid Safari gesture but the photo itself is NOT',async()=>{
  const listeners=new Map(),played=[];
  const document={addEventListener:(name,cb)=>listeners.set(name,cb),
    createElement:()=>({style:{},setAttribute(){},load(){},currentTime:0,
      play(){played.push('play');return Promise.resolve()},
      pause(){played.push('pause')},removeAttribute(){},remove(){}})};
  const s={frames:[{kind:'video',key:'original'}],engine:'narrated',phase:'narration'};
  const env={document,stage:{appendChild(){}},store:{mediaUrl:async()=> 'blob:original'},
    URL:{revokeObjectURL(){}},console:{warn(){}},taleraInline:s};
  vm.runInNewContext(INLINE_TAIL,env);
  await env.taleraUnifiedWarmVideos(s);
  const photo={closest:()=>null};
  const consent={closest:selector=>selector.includes('.talera-audio-consent')?{}:null};
  listeners.get('click')({target:photo});
  assert.deepEqual(played,[]);
  listeners.get('click')({target:consent});
  await Promise.resolve();await Promise.resolve();await Promise.resolve();
  assert.deepEqual(played,['play','pause'],'existing consent button primes once and immediately pauses');
});

test('a Safari autoplay permission hint is a REAL accessible replay button, not a dead image overlay',async()=>{
  const handler=new Map(),plays=[],audioPlays=[];
  const document={
    addEventListener(name,fn){handler.set(name,fn)},
    createElement(tag){
      assert.equal(tag,'button');
      return {
        tagName:'BUTTON',type:'',className:'',style:{},textContent:'',removed:false,
        setAttribute(name,value){this[name]=value},
        addEventListener(name,fn){this['on'+name]=fn},
        remove(){this.removed=true}
      };
    }
  };
  const s={engine:'narrated',phase:'narration',frames:[],
    audio:{paused:true,addEventListener(name,fn){this.onplaying=fn}},
    video:null,hint:null};
  const env={document,taleraInline:s,
    window:{__taleraAudioControls:{
      isEnabled:()=>true
    },__taleraInlineTryAutoPlay:()=>{
      audioPlays.push('resume existing voice element');
      s.audio.paused=false;
      s.audio.onplaying?.();
    }}};
  vm.runInNewContext(INLINE_TAIL,env);
  const button=env.taleraUnifiedCreateListeningButton(s);
  s.hint=button;
  assert.equal(button.tagName,'BUTTON');
  assert.equal(button.type,'button');
  assert.equal(button['aria-label'],'Ingesproken herinnering afspelen');
  assert.match(button.textContent,/Beluister/);
  assert.match(button.style.cssText,/pointer-events:auto/);
  assert.equal(typeof button.onclick,'function');
  const event={preventDefault(){plays.push('prevent')},stopPropagation(){plays.push('stop')}};
  button.onclick(event);
  assert.deepEqual(audioPlays,['resume existing voice element']);
  assert.equal(button.removed,true);
  assert.equal(s.hint,null);
  assert.deepEqual(plays,['prevent','stop']);
});

test('the native voice and audible-video permission prompts both use one clickable button; V9 reverses exactly',()=>{
  const patched=applyUnifiedTail(nativePage);
  assert.equal(patched.status,'installed');
  assert.equal(patched.html.split('const hint=taleraUnifiedCreateListeningButton(s);').length-1,2);
  assert.ok(!patched.html.includes("hint.textContent='Tik op de foto om het geluid te starten';"));
  assert.equal(restoreApprovedV9(patched.html),nativePage);
});
