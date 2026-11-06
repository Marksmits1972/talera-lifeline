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
  "async function load(){const url=await store.mediaUrl(frame.key);s.videoUrl=url;video.src=url;}\n"+nativeVideoHint+"\n}"+
  'function taleraInlineCleanVideo(s){}'+
  'function taleraInlineReplayNext(s){}'+
  INSERT_BEFORE+'}'+
  "function taleraInlineInstallAudioControls(){\n"+
  "  const retry=e=>{\n    const s=taleraInline;};\n"+
  "  document.addEventListener('click',e=>{\n"+
  "    if(s?.engine!=='narrated'||s.phase!=='narration')return;},true);\n"+nativeVoiceHint+"\n}"+
  "async function present(memory){\n  taleraInline=s;\n  if(hasVoice){const audio=window.__taleraInlineSharedAudio||document.createElement('audio');"+
  "audio.preload='auto';audio.playsInline=true;audio.style.display='none';}}"+
  "function showPhoto(memory,index,manual=false){\n"+ 
  "if(!memory||!Array.isArray(memory.photos)||memory.photos.length<=1)return;\n"+
  "memory._photoIndex=((index%memory.photos.length)+memory.photos.length)%memory.photos.length;\n"+
  "memory.image=memory.photos[memory._photoIndex];}\n"+
  "function hydrate(memory){loaded.set(memory.id,urls);}\n"+
  "function registerThem(memories){runtime.registerMemories(memories);}\n"+
  "/* TALERA V13: V3 continuous wheel is sole owner of photo gestures and position. */"+
  "function assign(tile,index,mem){if(tile.index===index)return;}"+
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
  assert.equal(listeners.has('pointerup'),true,'visual-only pointer handler may observe swipe release');
  listeners.get('pointerup')({pointerId:123});
  assert.equal(playCalls,0,'pointer swipe release must never prime any video');
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
  for(const event of ['pointerdown','pointermove','pointerup']){
    assert.equal(listeners.has(event),true,event+' observes only visual wheel reveal');
  }
  for(const event of ['touchend','touchstart']){
    assert.equal(listeners.has(event),false,event+' must not create playback or internal navigation');
  }
  listeners.get('pointerup')({pointerId:456});
  assert.deepEqual(plays,[],'visual-only pointer release cannot start audio');
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

test('visual-only swipe: existing V13 wheel becomes visible at the FIRST horizontal drag, never for taps or vertical motion',()=>{
  const listeners=new Map(),styles=[],set=new Set();
  const classes={add:name=>set.add(name),remove:name=>set.delete(name),
    contains:name=>set.has(name)};
  const document={hidden:false,body:{classList:classes},head:{appendChild:style=>styles.push(style)},
    getElementById:id=>styles.find(x=>x.id===id)||null,
    createElement:tag=>{assert.equal(tag,'style');return {id:'',textContent:''}},
    addEventListener:(type,fn)=>{listeners.set(type,fn)}};
  const window={__taleraBandRolling:false};
  const env={document,window};
  vm.runInNewContext(INLINE_TAIL,env);
  assert.equal(styles.length,1);
  assert.match(styles[0].textContent,/body\.talera-v61-narration-visual\.talera-unified-wheel-in-motion/);
  assert.match(styles[0].textContent,/\.talera-photo-strip\.talera-wheel-strip\.is-visible/);
  assert.match(styles[0].textContent,/display:block!important/);
  const photo={closest:selector=>selector==='#memoryStoryScroll'?{}:null};
  const button={closest:selector=>selector==='#memoryStoryScroll'||selector.includes('button,')?{}:null};
  const evt=(id,x,y,target=photo)=>({pointerId:id,pointerType:'touch',isPrimary:true,
    clientX:x,clientY:y,target});
  const shown=()=>classes.contains('talera-unified-wheel-in-motion');
  // Neither touching nor leaving a stationary finger should change visibility.
  listeners.get('pointerdown')(evt(1,80,90));
  window.__taleraBandRolling=true;
  listeners.get('pointermove')(evt(1,85,92));
  assert.equal(shown(),false,'subthreshold movement must not reveal wheel');
  listeners.get('pointerup')(evt(1,85,92));
  assert.equal(shown(),false,'stationary finger-up never reveals wheel');
  // A vertical drag is not a timeline memory swipe.
  listeners.get('pointerdown')(evt(2,80,90));
  listeners.get('pointermove')(evt(2,94,125));
  assert.equal(shown(),false,'vertical motion must not reveal wheel');
  listeners.get('pointerup')(evt(2,94,125));
  // Control gestures are excluded even if the finger moves far horizontally.
  listeners.get('pointerdown')(evt(3,80,90,button));
  listeners.get('pointermove')(evt(3,180,90,button));
  assert.equal(shown(),false,'audio/playback buttons stay independent of wheel visual');
  // The native wheel must be active: this is ONLY a visual overlay, not a motor.
  window.__taleraBandRolling=false;
  listeners.get('pointerdown')(evt(4,80,90));
  listeners.get('pointermove')(evt(4,160,90));
  assert.equal(shown(),false,'no wheel movement is fabricated');
  // Native V13 is rolling. Reveal immediately at the 13px drag threshold.
  window.__taleraBandRolling=true;
  listeners.get('pointerdown')(evt(5,80,90));
  listeners.get('pointermove')(evt(5,93,91));
  assert.equal(shown(),true,'pre-existing wheel becomes visible during active drag');
  listeners.get('pointerup')(evt(5,120,90));
  assert.equal(shown(),true,'wheel stays visible through its native landing animation');
  listeners.get('talera:wheel-motion')({detail:{active:false}});
  assert.equal(shown(),false,'old narration frame returns when the existing wheel settles');
  // Native document visibility / tab pause must not leave the strip exposed.
  listeners.get('pointerdown')(evt(6,80,90));
  listeners.get('pointermove')(evt(6,120,90));
  assert.equal(shown(),true);
  document.hidden=true;
  listeners.get('visibilitychange')();
  assert.equal(shown(),false);
  assert.equal(typeof listeners.get('talera:enable-listening'),'function',
    'working Beluister control is retained untouched');
});

test('cover is ONLY for narrated memories, selects first visual cue EVEN IF VIDEO',()=>{
  const env={document:{addEventListener(){}},window:{},URL:{createObjectURL:()=> 'blob:cover'}};
  vm.runInNewContext(INLINE_TAIL,env);
  const regular={id:'pwa:normal',_taleraLocal:true,
    _zeroItems:[{kind:'photo',key:'ordinary'}],_taleraNarrationCues:[]};
  assert.equal(env.taleraSwipeCoverFirst(regular),null);
  const narrated={id:'pwa:narrated',_taleraLocal:true,_zeroItems:[
    {kind:'video',key:'silent-video'},{kind:'photo',key:'first-photo'},
    {kind:'photo',key:'later-photo'},{kind:'audio',key:'voice'}
  ],_taleraNarrationCues:[{t:2500,index:2},{t:1200,index:1},{t:0,index:0}]};
  assert.equal(env.taleraSwipeCoverFirst(narrated).key,'silent-video');
  assert.equal(env.taleraSwipeCoverFirst(narrated).kind,'video');
  // The still is an artifact of the video frame 0, not the second photo.
  assert.equal(narrated.previewImage,undefined,'the selection does not add a new photo');
  const changed={...narrated,_taleraNarrationCues:[{t:0,mediaId:'later-photo',index:2}]};
  assert.equal(env.taleraSwipeCoverFirst(changed).key,'later-photo',
    'new opening visual must invalidate old video-frame cover');
  assert.equal(env.taleraSwipeCoverFirst({...narrated,_taleraNarrationCues:[]}).key,
    'silent-video','older stories without cues start with first original media frame');
});

test('exact existing V9 hooks are required; cached cover never enters the ordinary media sequence',()=>{
  const patched=applyUnifiedTail(nativePage);
  assert.equal(patched.status,'installed');
  assert.equal(patched.html.split("loaded.set(memory.id,urls);taleraSwipeCoverEnsure(memory,true);").length-1,1);
  assert.equal(patched.html.split("runtime.registerMemories(memories);taleraSwipeCoverObserve(memories);").length-1,1);
  assert.ok(patched.html.includes('window.__taleraPhotoBook?.list?.().find(x=>x.id===memory.id)'));
  assert.ok(patched.html.includes('talera-narrated-swipe-covers-v1'));
  assert.ok(patched.html.includes("720/Math.max(w,h)"));
  assert.ok(patched.html.includes("taleraSwipeCoverEnsure(list[i],true)"),
    'upcoming narrated neighbors must get their cover before the first swipe');
  assert.ok(patched.html.includes("store.displayUrl(first.key)"),
    'unvisited narrated neighbor reads ONLY first chosen photo, never all media');
  assert.ok(patched.html.includes("tile.el.dataset.url!==mem.previewImage"),
    'narrated wheel must refresh a stale tile when the cover arrives after render');
  assert.ok(!patched.html.includes("if(tile.index===index)return;"),
    'stale V13 tile shortcut is revised in staging only');
  assert.equal(restoreApprovedV9(patched.html),nativePage,'the approved V9 is byte-identical when reverted');
  const noHydrate=nativePage.replace('loaded.set(memory.id,urls);','');
  assert.equal(applyUnifiedTail(noHydrate).status,'anchor-unmatched',
    'fail closed if memory hydration source changes');
  const noRegister=nativePage.replace('runtime.registerMemories(memories);','');
  assert.equal(applyUnifiedTail(noRegister).status,'anchor-unmatched',
    'fail closed if original memory registry changes');
  const noWheel=nativePage.replace("if(tile.index===index)return;",'');
  assert.equal(applyUnifiedTail(noWheel).status,'anchor-unmatched',
    'fail closed if native wheel renderer changes');

});

test('wheel refresh only when narrated cover changes; ordinary images remain unchanged',()=>{
  const p=applyUnifiedTail(nativePage);
  assert.equal(p.status,'installed');
  const old="if(tile.index===index)return;";
  const changed="if(tile.index===index&&!(mem?._zeroItems?.some(x=>x.kind==='audio')&&mem.previewImage&&tile.el.dataset.url!==mem.previewImage))return;";
  assert.ok(p.html.includes(changed));
  assert.equal(p.html.split(changed).length-1,1);
  assert.ok(!p.html.includes(old));
  const fixtureSource="function check(tile,index,mem){"+changed+"return true;}";
  const env={};
  vm.runInNewContext(fixtureSource,env);
  const same={index:0,el:{dataset:{url:'blob:old'}}};
  assert.equal(env.check(same,0,{_zeroItems:[{kind:'photo'}],previewImage:'blob:new'}),undefined,
    'normal photo remains untouched even if preview URL differs');
  assert.equal(env.check(same,0,{_zeroItems:[{kind:'audio'}],previewImage:'blob:new'}),true,
    'narrated page is reassigned if its cover changed');
  assert.equal(env.check(same,0,{_zeroItems:[{kind:'audio'}],previewImage:'blob:old'}),undefined,
    'same narrated cover is already ready and requires no repaint');
  assert.equal(restoreApprovedV9(p.html),nativePage);
});

test('video cover uses exact first decoded video frame, entirely muted, never plays video',async()=>{
  const calls=[],still={size:12500,type:'image/jpeg'};
  const video={
    readyState:2,videoWidth:1280,videoHeight:720,duration:2,
    currentTime:0,playsInline:false,muted:false,defaultMuted:false,
    setAttribute(k){calls.push('attribute:'+k)},
    pause(){calls.push('pause')},
    removeAttribute(k){calls.push('removed:'+k)},
    load(){
      calls.push('load');
      if(this.src&&this.onloadedmetadata)this.onloadedmetadata();
    },
    play(){throw Error('video preview MAY NOT autoplay')}
  };
  const canvas={width:0,height:0,
    getContext(){return {drawImage:(source,x,y,w,h)=>{
      assert.equal(source,video);calls.push('draw:'+source.currentTime+':'+w+'x'+h);
    }}},
    toBlob(callback,type,quality){calls.push('jpeg:'+type+':'+quality);callback(still)}
  };
  const env={window:{},document:{
    addEventListener(){},
    createElement(tag){
      if(tag==='video')return video;
      if(tag==='canvas')return canvas;
      throw Error(tag)
    }
  },setTimeout,clearTimeout};
  vm.runInNewContext(INLINE_TAIL,env);
  const output=await env.taleraSwipeCoverVideoFrame('blob:original-video');
  assert.equal(output,still);
  assert.equal(video.muted,true);
  assert.equal(video.defaultMuted,true);
  assert.equal(video.playsInline,true);
  assert.equal(video.currentTime,0);
  assert.equal(canvas.width,720);
  assert.equal(canvas.height,405);
  assert.ok(calls.includes('draw:0:720x405'));
  assert.equal(calls.filter(c=>c==='pause').length,1);
  assert.equal(calls.filter(c=>c==='load').length,2,'decoder loads and disposes exactly once');
  assert.equal(calls.filter(c=>c.startsWith('jpeg:')).length,1);
  assert.ok(!calls.includes('play'));
});

test('automatic voice: ORIGINAL prepared video is adopted despite no explicit listening gesture',async()=>{
  const events=[],revoked=[];
  const s={frames:[{kind:'video',key:'original-v1'}],engine:'narrated',phase:'narration'};
  const video={
    style:{},paused:true,currentTime:0,muted:false,volume:0,
    setAttribute(){},load(){events.push('loaded')},
    play(){events.push('play');this.paused=false;return Promise.resolve()},
    pause(){events.push('pause');this.paused=true},
    removeAttribute(){events.push('removeAttribute')},remove(){events.push('remove')}
  };
  const env={taleraInline:s,document:{addEventListener(){},createElement:tag=>{
    assert.equal(tag,'video');return video
  }},stage:{appendChild(){}},console:{warn(){}},
    URL:{revokeObjectURL:url=>revoked.push(url)},
    store:{mediaUrl:async()=> 'blob:original-v1'}};
  vm.runInNewContext(INLINE_TAIL,env);
  await env.taleraUnifiedWarmVideos(s);
  assert.equal(events.filter(e=>e==='play').length,0,
    'unprompted automatic narration must NOT start silent/hidden video as a second player');
  s.phase='originals';
  const taken=env.taleraUnifiedTakePrimed(s,s.frames[0]);
  assert.equal(taken,video,'native original round must REUSE preloaded video instead of making a new one');
  assert.equal(s.taleraUnifiedReplayHandoff.key,'original-v1');
  assert.equal(s.taleraUnifiedReplayHandoff.reused,true);
  assert.equal(s.taleraUnifiedReplayHandoff.gesturePrimed,false,
    'unprimed handoff is not mistaken for Safari sound permission');
  assert.equal(s.taleraUnifiedReplayUrl,'blob:original-v1');
  assert.equal(video.currentTime,0);
  assert.equal(s.taleraUnifiedPrepared.size,0);
  env.taleraUnifiedDropPrepared(s);
  assert.deepEqual(revoked,[],'original native video now owns its source URL');
});

test('a delayed Safari prime promise cannot pause the already-adopted original video',async()=>{
  let resolveStart;const events=[];
  const video={style:{},paused:true,currentTime:0,
    setAttribute(){},load(){},
    play(){events.push('prime');this.paused=false;
      return new Promise(resolve=>{resolveStart=resolve})},
    pause(){events.push('pause');this.paused=true},
    removeAttribute(){},remove(){}};
  const s={frames:[{kind:'video',key:'clip'}],phase:'narration',engine:'narrated'};
  const handlers=new Map();
  const env={taleraInline:s,document:{addEventListener:(name,fn)=>handlers.set(name,fn),
    createElement:()=>video},stage:{appendChild(){}},console:{warn(){}},
    URL:{revokeObjectURL(){}},store:{mediaUrl:async()=> 'blob:clip'}};
  vm.runInNewContext(INLINE_TAIL,env);
  await env.taleraUnifiedWarmVideos(s);
  handlers.get('talera:enable-listening')();
  assert.deepEqual(events,['prime']);
  s.phase='originals';
  assert.equal(env.taleraUnifiedTakePrimed(s,s.frames[0]),video);
  const pauseCount=events.filter(e=>e==='pause').length;
  video.paused=false; // original V9 replay has now started in the SAME video
  resolveStart();
  await Promise.resolve();await Promise.resolve();await Promise.resolve();
  assert.equal(events.filter(e=>e==='pause').length,pauseCount,
    'resolved prewarm must never stop a video already adopted by original replay');
  assert.equal(video.paused,false);
});

test('native originals keep the exact SAME blob URL instead of reassigning it and losing Safari activation',()=>{
  const patched=applyUnifiedTail(nativePage);
  assert.equal(patched.status,'installed');
  assert.ok(patched.html.includes('s.videoUrl=url;if(video.src!==url)video.src=url;'),
    'setting src on an already prepared media element is a fresh resource load');
  assert.ok(patched.html.includes('taleraUnifiedTakePrimed(s,frame)||document.createElement(\'video\')'),
    'ordinary player unchanged; narrated originals may reuse their prepared video');
  assert.equal(restoreApprovedV9(patched.html),nativePage,
    'approved V9 must remain byte-for-byte reversible');
});

test('narrated story remains ONE sealed memory after the FINAL video, not only while voice plays',()=>{
  const patched=applyUnifiedTail(nativePage);
  assert.equal(patched.status,'installed');
  const guarded="function showPhoto(memory,index,manual=false){"+String.fromCharCode(10)+"    if(manual&&memory?._zeroItems?.some(item=>item.kind==='audio'))return;";
  assert.ok(patched.html.includes(guarded),
    'manual RH19 photo stepping must be denied for narrated memory even after original video');
  const first=patched.html.indexOf('function showPhoto(memory,index,manual=false){');
  const end=patched.html.indexOf('}'+String.fromCharCode(10),first);
  const fn=patched.html.slice(first,end+1);
  assert.ok(first>0&&end>first);
  const env={};vm.runInNewContext(fn,env);
  const narrated={id:'one-story',photos:['video-first','second-photo','third-photo'],
    _photoIndex:0,image:'video-first',
    _zeroItems:[{kind:'video',key:'opening'},{kind:'photo',key:'second'},{kind:'audio',key:'voice'}]};
  // Session has already ended; no audio and video element remain. Still sealed.
  env.showPhoto(narrated,1,true);
  assert.equal(narrated._photoIndex,0,'legacy manual photo event must NOT advance narrated media');
  assert.equal(narrated.image,'video-first');
  env.showPhoto(narrated,2,false);
  assert.equal(narrated._photoIndex,2,'narrator programmatic cue selection must still work');
  assert.equal(narrated.image,'third-photo');
  env.showPhoto(narrated,0,true);
  assert.equal(narrated._photoIndex,2,'manual taps must remain blocked after any phase');
  const ordinary={id:'simple-photos',photos:['a','b','c'],image:'a',
    _photoIndex:0,_zeroItems:[{kind:'photo',key:'a'},{kind:'photo',key:'b'}]};
  env.showPhoto(ordinary,1,true);
  assert.equal(ordinary._photoIndex,1,'ordinary memories retain native tap-to-next-photo');
  assert.equal(ordinary.image,'b');
  assert.equal(restoreApprovedV9(patched.html),nativePage,'every V9 byte must restore exactly');
  assert.equal(applyUnifiedTail(nativePage.replace('function showPhoto(memory,index,manual=false){','')).status,
    'anchor-unmatched','fail closed if RH19 changes');
});

test('existing audio ON preference: one audible media element survives voice-to-original handoff and timeline replay',()=>{
  const patched=applyUnifiedTail(nativePage);
  assert.equal(patched.status,'installed','native V9 voice element constructor remains exact');
  assert.ok(patched.html.includes("const audio=window.__taleraInlineSharedAudio||document.createElement('video');"));
  assert.ok(patched.html.includes("audio.setAttribute('webkit-playsinline','')"),
    'real iPhone Safari must keep reusable media inline');
  assert.equal(restoreApprovedV9(patched.html),nativePage,'approved V9 restores byte for byte');
  const events=[],voice={
    tagName:'VIDEO',paused:false,currentTime:3.1,
    pause(){events.push('voice pause');this.paused=true},
    onplay(){},onpause(){},onended(){},ontimeupdate(){},onseeking(){},onseeked(){}
  };
  const temp={paused:true,pause(){events.push('temp pause')},
    removeAttribute(){events.push('temp release source')},remove(){events.push('temp removal')}};
  const s={engine:'narrated',audio:voice,phase:'originals',
    taleraUnifiedPrepared:new Map([['movie',{video:temp,url:'blob:movie',primed:false,pending:false}]])};
  const env={document:{addEventListener(){}},window:{},console:{warn(){}}};
  vm.runInNewContext(INLINE_TAIL,env);
  const first=env.taleraUnifiedTakePrimed(s,{kind:'video',key:'movie'});
  assert.equal(first,voice,'do NOT allocate another audible media element');
  assert.equal(first.currentTime,0);
  assert.equal(s.taleraUnifiedReplayUrl,'blob:movie');
  assert.equal(s.taleraUnifiedReplayHandoff.sameAudibleElement,true);
  assert.equal(s.taleraUnifiedReplayHandoff.gesturePrimed,false,
    'automatic playback is not falsely labeled as a physical tap');
  assert.equal(s.taleraUnifiedPrepared.size,0);
  assert.equal(first.onended,null,'old voice ended callback must not restart the timeline');
  assert.ok(events.includes('temp removal'));
  s.taleraUnifiedReplayUrl=null;
  const second=env.taleraUnifiedTakePrimed(s,{kind:'video',key:'movie-two'});
  assert.equal(second,voice,'the same media element is reused for a second original video');
  assert.equal(s.taleraUnifiedReplayUrl,null,'missing prepared next URL correctly loads from original storage');
  assert.equal(s.taleraUnifiedReplayHandoff.sameAudibleElement,true);
});

test('no change to ordinary photo/video memories: shared audible handoff requires narrated engine',()=>{
  const s={engine:'ordinary',audio:{tagName:'VIDEO'},phase:'originals',
    taleraUnifiedPrepared:new Map()};
  const env={document:{addEventListener(){}},window:{}};
  vm.runInNewContext(INLINE_TAIL,env);
  assert.equal(env.taleraUnifiedTakePrimed(s,{key:'v'}),null);
  assert.equal(restoreApprovedV9(applyUnifiedTail(nativePage).html),nativePage);
});

test('normal sound setting: shared narrator element makes hidden video priming unnecessary',()=>{
  let hiddenPlay=0;
  const hidden={play(){hiddenPlay++;return Promise.resolve()},pause(){}};
  const s={engine:'narrated',phase:'narration',
    audio:{tagName:'VIDEO'},taleraUnifiedPrepared:new Map([
      ['video-1',{video:hidden,primed:false,pending:false}]
    ])};
  const env={taleraInline:s,window:{},document:{addEventListener(){}}};
  vm.runInNewContext(INLINE_TAIL,env);
  env.taleraUnifiedPrimeCurrent();
  assert.equal(hiddenPlay,0,
    'NO second hidden video may start when the native voice element itself can play the originals');
  assert.equal(s.taleraUnifiedPrepared.size,1,
    'preloaded original URL must remain available until original replay');
  assert.equal(restoreApprovedV9(applyUnifiedTail(nativePage).html),nativePage);
});
