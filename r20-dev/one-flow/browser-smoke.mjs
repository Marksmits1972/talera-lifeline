// Actual browser E2E on the isolated staging Worker. All media are synthetic.
// Uses the *real* TALERA IndexedDB storage, native presenter, WAV narration,
// in-page video and saved cue IDs. No production data is touched.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
const base='https://talera-one-memory-clean-test-20261105.mark-a39.workers.dev';
const dir=process.env.TALERA_CDP_DIR;
assert.ok(dir,'Chrome CDP profile required');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let tab;
for(let i=0;i<300;i++){
 try{
  const port=Number((await readFile(join(dir,'DevToolsActivePort'),'utf8')).split('\n')[0]);
  const res=await fetch('http://127.0.0.1:'+port+'/json');
  const a=await res.json();tab=a.find(t=>t.type==='page');
  if(tab?.webSocketDebuggerUrl)break;
 }catch{}await sleep(200);
}
assert.ok(tab?.webSocketDebuggerUrl,'headless Chrome not ready');
const ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
let id=0;const requests=new Map();
ws.addEventListener('message',e=>{
 const o=JSON.parse(String(e.data));
 if(!o.id||!requests.has(o.id))return;
 const {resolve,reject}=requests.get(o.id);requests.delete(o.id);
 o.error?reject(Error(JSON.stringify(o.error))):resolve(o.result);
});
const cmd=(method,params={})=>new Promise((resolve,reject)=>{
 const n=++id;requests.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));
});
const evaluate=async(expression,awaitPromise=false,userGesture=true)=>{
 const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise,userGesture});
 if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
 return r.result?.value;
};
const until=async(expression,tries=240)=>{
 // User-gesture-free waits: simulated CDP gestures on every poll hid Safari
 // autoplay denial on the SECOND timeline playback.
 for(let i=0;i<tries;i++){if(await evaluate(expression,false,false))return true;await sleep(80)}
 return false;
};
await cmd('Page.enable');await cmd('Runtime.enable');
await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await cmd('Page.navigate',{url:base+'/present'});
assert.ok(await until('Boolean(window.TaleraMemories)&&Boolean(window.__taleraTimelineRuntime)'),'TALERA native storage and viewport must load');
const saved=await evaluate(`(async()=>{
 const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZcAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
 const canvas=document.createElement('canvas');canvas.width=60;canvas.height=60;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#244b71';ctx.fillRect(0,0,60,60);
 const stream=canvas.captureStream(12);
 // Prime the synthetic canvas stream before recording. Otherwise Chrome may
 // sporadically encode a black frame at t=0, making the BLUE-cover assertion
 // flaky even though TALERA selects the correct source video.
 await new Promise(resolve=>setTimeout(resolve,180));
 ctx.fillRect(0,0,60,60);
 stream.getVideoTracks()[0]?.requestFrame?.();
 // Give the video an actual audible track, not just an unmuted-but-silent picture.
 const audioContext=new AudioContext(),destination=audioContext.createMediaStreamDestination();
 const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
 oscillator.frequency.value=440;gain.gain.value=.13;
 oscillator.connect(gain);gain.connect(destination);oscillator.start();
 await audioContext.resume();
 const mixedStream=new MediaStream([...stream.getVideoTracks(),...destination.stream.getAudioTracks()]);
 const mime=['video/webm;codecs=vp8,opus','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
 if(!mime)throw Error('Browser has no WebM recorder');
 const recording=await new Promise((resolve,reject)=>{
   const r=new MediaRecorder(mixedStream,{mimeType:mime}),pieces=[];
   r.ondataavailable=e=>{if(e.data?.size)pieces.push(e.data)};
   r.onstop=()=>resolve(new Blob(pieces,{type:mime}));
   r.onerror=reject;r.start();
   // Force blue opening keyframes after recording is actively running.
   ctx.fillRect(0,0,60,60);stream.getVideoTracks()[0]?.requestFrame?.();
   setTimeout(()=>r.stop(),1300);
 });
 oscillator.stop();
 mixedStream.getTracks().forEach(t=>t.stop());
 await audioContext.close();
 const files=[new File([recording],'narrated-video-with-sound.webm',{type:mime})];
 for(let i=1;i<=5;i++)files.push(new File([png],'photo-'+i+'.png',{type:'image/png'}));
 const samples=24000;const buf=new ArrayBuffer(44+samples*2),v=new DataView(buf);
 const str=(at,text)=>{for(let i=0;i<text.length;i++)v.setUint8(at+i,text.charCodeAt(i))};
 str(0,'RIFF');v.setUint32(4,36+samples*2,true);str(8,'WAVE');str(12,'fmt ');
 v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
 v.setUint32(24,8000,true);v.setUint32(28,16000,true);
 v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');
 v.setUint32(40,samples*2,true);
 files.push(new File([buf],'voice.wav',{type:'audio/wav'}));
 const row=await TaleraMemories.save({
   title:'Clean flow automatic browser test',date:'2026-11-04',time:'12:00:00',
   datePrecision:'exact',text:'Only synthetic local browser data',
   narrationCues:[{t:0,index:0},{t:1200,index:1},{t:1900,index:2}],narrationDurationMs:3000
 },files);
 const fetched=await TaleraMemories.get(row.id);
 return {id:row.id,files:fetched?.items?.length,cues:fetched?.narrationCues?.length};
})()`,true);
assert.ok(saved?.id?.startsWith('local-'),JSON.stringify(saved));
assert.equal(saved.files,7);assert.equal(saved.cues,3);
console.log('PASS native IndexedDB: five photos, narrated video WITH audio track, real WAV and three cues');

// Narrated memory only: the FIRST visual cue is a VIDEO in this fixture.
// The wheel should show JPEG frame zero of that VIDEO, not the next photo.
await cmd('Page.navigate',{url:base+'/present?memory='+encodeURIComponent(saved.id)});
assert.ok(await until('Boolean(window.__taleraTimelineRuntime?.currentMemory()?._zeroFrames?.length)',150),
  'narrated story frames must hydrate before cover creation');
assert.ok(await until("Boolean(window.__taleraPhotoBook?.list?.().find(x=>x.id==='pwa:"+saved.id+"')?.previewImage)",190),
  'video frame 0 should be attached to the ORIGINAL V13 memory wheel');
const firstCover=await evaluate("(async()=>{"+
"const id='pwa:"+saved.id+"';"+
"const m=window.__taleraPhotoBook.list().find(x=>x.id===id);"+
"const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('talera-narrated-swipe-covers-v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});"+
"const row=await new Promise((resolve,reject)=>{const r=db.transaction('covers','readonly').objectStore('covers').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});"+
"const image=await createImageBitmap(row.blob);"+
"const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;"+
"const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);"+
"const pixel=Array.from(ctx.getImageData(Math.floor(image.width/2),Math.floor(image.height/2),1,1).data);"+
"db.close();"+
"return {url:m.previewImage,key:row.photoKey,size:row.blob.size,type:row.blob.type,"+
"width:image.width,height:image.height,pixel,openingKey:m._zeroItems[0].key,"+
"openingKind:m._zeroItems[0].kind,photoCount:m.photos.length,mediaCount:m._zeroItems.length};})()",true);
assert.ok(firstCover.url.startsWith('blob:'));
assert.equal(firstCover.type,'image/jpeg');
assert.equal(firstCover.openingKind,'video','this test narration begins with a video');
assert.equal(firstCover.key,firstCover.openingKey,'the cover MUST reference the opening video, not the first later photo');
assert.ok(firstCover.pixel[2]>firstCover.pixel[0]+30&&firstCover.pixel[2]>firstCover.pixel[1]+15,
  'frame-zero JPEG should contain the BLUE video opening, not the following photo');
assert.ok(firstCover.size>100);
assert.ok(Math.max(firstCover.width,firstCover.height)<=720);
assert.equal(firstCover.photoCount,6,'cover is NOT another photo in narrated memory');
assert.equal(firstCover.mediaCount,7,'original video, photos and voice remain untouched');
console.log('PASS narrated cover: FRAME ZERO of opening video, not later photograph; persistent V13 cover');
await cmd('Page.navigate',{url:base+'/present?memory='+encodeURIComponent(saved.id)});
assert.ok(await until("Boolean(window.__taleraPhotoBook?.list?.().find(x=>x.id==='pwa:"+saved.id+"')?.previewImage)",150),
  'the same first-video-frame thumbnail must be restored from browser storage on reload');
const secondCover=await evaluate("(()=>{const m=window.__taleraPhotoBook.list().find(x=>x.id==='pwa:"+saved.id+"');"+
"return {url:m?.previewImage,mediaCount:m?._zeroItems?.length};})()");
assert.ok(secondCover.url.startsWith('blob:'));
assert.equal(secondCover.mediaCount,7);
console.log('PASS video frame-zero cover reused after reload, no extra photo or player');

for(const playbackRound of [1,2,3]){
console.log('BEGIN playback round',playbackRound);
await cmd('Page.navigate',{url:base+'/present?memory='+encodeURIComponent(saved.id)});
assert.ok(await until('Boolean(window.__taleraInlineSharedAudio?.src)'),'native V9 audio must load');
// Verify iOS warm video is present BEFORE the user's first Beluister action.
assert.ok(await until('Boolean(document.querySelector(\'video[style*="-9999px"]\'))'),
 'original video must be prepared before first listener gesture');
await evaluate(`(()=>{
 window.__oneFlowTest={voiceEndedAt:0,photos:[],videos:[],errors:[]};
 const t=window.__oneFlowTest,rt=window.__taleraTimelineRuntime;
 const controls=window.__taleraAudioControls;
 if(!controls||typeof controls.isEnabled!=='function')throw Error('Original V9 listening controls missing');
 window.__taleraAudioUiControls=
  Array.from(document.querySelectorAll('button,[role="button"]'))
    .filter(el=>/luister|geluid|audio|afspelen|play/i.test((el.textContent||'')+' '+(el.className||'')+' '+(el.getAttribute('aria-label')||'')))
    .map(el=>({tag:el.tagName,cls:String(el.className).slice(0,80),id:el.id,
      label:(el.textContent||'').trim().slice(0,60),hidden:el.hidden,
      aria:el.getAttribute('aria-label')})).slice(0,15);

 const prepared=document.querySelector('video[style*="-9999px"]');
 if(!prepared)throw Error('Preloaded original video is missing before user gesture');
 prepared.dataset.primedVideo='yes';
 const record=()=>{
  const index=rt.currentMemory()?._photoIndex;
  if(Number.isInteger(index)&&t.photos.at(-1)?.index!==index)
    t.photos.push({index,at:performance.now()});
  for(const video of document.querySelectorAll('video.talera-v61-inline-video')){
    if(!t.videos.some(v=>v.elementId===video.dataset.testID)){
      video.dataset.testID=String(t.videos.length+1);
      const item={elementId:video.dataset.testID,muted:video.muted,at:performance.now(),
        warmed:video.dataset.primedVideo==='yes',
        sameAudible:video===window.__taleraInlineSharedAudio,progress:0,duration:0};
      t.videos.push(item);
      video.addEventListener('timeupdate',()=>{
        item.progress=Math.max(item.progress,video.currentTime||0);
        item.duration=Number.isFinite(video.duration)?video.duration:0;
      });
    }
    if(!video.muted&&t.voiceEndedAt===0)t.errors.push('video not silent during narration');
  }
 };
 new MutationObserver(record).observe(document.body,{subtree:true,childList:true});
 setInterval(record,45);
 const a=window.__taleraInlineSharedAudio;
 a.addEventListener('ended',()=>{t.voiceEndedAt=performance.now();record()},{once:true});
 record();
 // First playback uses the normal listening setting. On timeline replay
 // there is NO repeated Beluister click or talera:enable-listening event.
 // If strict Chrome blocks the VOICE too, allow the voice to start with
 // one gesture; the original video may NOT receive a new gesture.
 if(${playbackRound}===1){
   const consent=document.querySelector('button.talera-audio-consent');
   if(consent&&!consent.hidden)consent.click();
   else document.dispatchEvent(new Event('talera:enable-listening'));
 }
 if(a.paused){
   t.voiceStartedWithGesture=true;
   a.play().catch(e=>{t.errors.push('voice play '+String(e))});
 }else t.voiceStartedWithGesture=false;
})()`);
if(playbackRound===1)console.log('AUDIO_UI_CONTROLS',JSON.stringify(await evaluate('window.__taleraAudioUiControls')));
assert.ok(await until('window.__oneFlowTest.voiceEndedAt>0'),'real narration must finish');
assert.ok(await until('window.__oneFlowTest.videos.some(v=>v.muted&&v.at<window.__oneFlowTest.voiceEndedAt)'),
 'narrated video must have played silently during the voice');
for(const index of [3,4,5]){
 assert.ok(await until('window.__oneFlowTest.photos.some(p=>p.index==='+index+'&&p.at>=window.__oneFlowTest.voiceEndedAt-100)',330),
  'unseen photo '+index+' must appear in the original viewport');
}
const result=await evaluate(`(()=>{
 const t=window.__oneFlowTest;
 return {voiceEndedAt:t.voiceEndedAt,photos:t.photos,videos:t.videos,
 errors:t.errors,iframes:document.querySelectorAll('iframe.talera-zero-present-frame').length,
 voiceStartedWithGesture:t.voiceStartedWithGesture}
})()`,false,false);
const remaining=result.photos.filter(p=>p.index>=3&&p.at>=result.voiceEndedAt-100);
assert.deepEqual(remaining.map(p=>p.index),[3,4,5]);
assert.ok(remaining[1].at-remaining[0].at>=3200);
assert.ok(remaining[2].at-remaining[1].at>=3200);
assert.ok(await until('window.__oneFlowTest.videos.some(v=>!v.muted&&v.progress>.6)',200),
 'the original video must replay from 0 with sound after the remaining photos');
const videoPlayback=await evaluate(`window.__oneFlowTest.videos.map(v=>({muted:v.muted,at:v.at,warmed:v.warmed,sameAudible:v.sameAudible,progress:v.progress,duration:v.duration}))`,false,false);
const narrated=videoPlayback.find(v=>v.muted&&v.at<result.voiceEndedAt);
const replay=videoPlayback.find(v=>!v.muted&&v.at>remaining.at(-1).at);
assert.ok(narrated,'narrated video exists and was muted');
assert.ok(replay,'original native video replay starts AFTER the last remaining photo');
assert.equal(replay.sameAudible,true,'original MUST be the SAME authorized media element as the voice');
assert.equal(replay.warmed,false,'do not promote a separate hidden video as audible replay');
assert.ok(replay.progress>.6,'unmuted replay advanced from t=0');
assert.ok(replay.duration>=1,'replay has the original full clip duration');
assert.deepEqual(result.errors,[]);
assert.equal(result.iframes,0);
console.log('PASS browser playback round '+playbackRound+': voice->original SAME media element, no second Beluister; voice needed gesture='+result.voiceStartedWithGesture);
}
// Regression: a narrated story is ONE timeline item; photo taps do nothing,
// and a real horizontal swipe leaves the whole active story (even mid-voice).
const nextMemory=await evaluate("(async()=>{"+
"const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZcAAAAASUVORK5CYII='),c=>c.charCodeAt(0));"+
"const f=[new File([png],'simple-1.png',{type:'image/png'}),new File([png],'simple-2.png',{type:'image/png'})];"+
"const row=await TaleraMemories.save({title:'Adjacent ordinary photo memory',date:'2026-11-05',time:'12:00:00',datePrecision:'exact',text:'Second memory'},f);"+
"return {id:'pwa:'+row.id}})()",true);
assert.ok(nextMemory?.id?.startsWith('pwa:local-'));
await cmd('Page.navigate',{url:base+'/present?memory='+encodeURIComponent(saved.id)});
assert.ok(await until('Boolean(window.__taleraInlineSharedAudio?.src)&&Boolean(document.querySelector(\'video[style*="-9999px"]\'))'),
  'narrated memory must load before navigation test');
const initial=await evaluate("(()=>{"+
"const rt=window.__taleraTimelineRuntime,m=rt.currentMemory();"+
"const story=document.getElementById('memoryStoryScroll');"+
"if(!story)throw Error('Native story swipe surface missing');"+
"const initialIndex=m._photoIndex;"+
"story.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));"+
"return {memoryId:m.id,indexBefore:initialIndex,indexAfter:m._photoIndex,"+
"warmedVideos:Array.from(document.querySelectorAll('video[style*=\"-9999px\"]')).map(v=>({paused:v.paused,time:v.currentTime})),"+
"bookList:window.__taleraPhotoBook?.list?.().map(x=>x.id),"+
"bookIndex:window.__taleraPhotoBook?.state?.().index,"+
"storyRect:(()=>{const r=story.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()};})()");
assert.equal(initial.memoryId,'pwa:'+saved.id);
assert.equal(initial.indexAfter,initial.indexBefore,'narrated tap cannot step photos');
assert.ok(initial.warmedVideos.length);
assert.ok(initial.warmedVideos.every(v=>v.paused),'tapping narrated photo does NOT prime any video');
assert.ok(Array.isArray(initial.bookList)&&initial.bookList.includes(nextMemory.id),'both memories are single timeline entries');
assert.equal(initial.bookList.filter(x=>x===initial.memoryId).length,1,'three playback phases form exactly ONE timeline item');
console.log('PASS whole memory seal: image tap ignored, all preloaded originals paused, ONE timeline entry');
// A real stationary finger TAP may trigger the unchanged V13 wheel's
// pointerdown/up; it still must not invoke any narrated media frame or play().
await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
// Freeze narration: an automatic cue at 1.2s is not evidence of a tap.
const stateBeforeTap=await evaluate("(()=>{const rt=window.__taleraTimelineRuntime,b=window.__taleraPhotoBook,"+
"bs=b?.state?.(),entries=b?.list?.();const wh=window.__taleraIntegratedBand?.getState?.();"+
"return {current:rt?.currentMemory?.()?.id,index:bs?.index,bookSelected:entries?.[bs?.index]?.id,"+
"wheel:wh,visible:document.body.classList.contains('talera-unified-wheel-in-motion'),"+
"cover:!!rt?.currentMemory?.()?.previewImage};})()");
console.log('COVER_TAP_BEFORE',JSON.stringify(stateBeforeTap));
const frozen=await evaluate("(()=>{window.__taleraInlineSharedAudio?.pause();"+
"const m=window.__taleraTimelineRuntime.currentMemory();return {id:m.id,index:m._photoIndex};})()");
const tapX=Math.round(initial.storyRect.x+initial.storyRect.w*.5),
      tapY=Math.round(initial.storyRect.y+initial.storyRect.h*.5);
await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tapX,y:tapY,id:9}]});
await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await sleep(1100);
const stateAfterTap=await evaluate("(()=>{const rt=window.__taleraTimelineRuntime,b=window.__taleraPhotoBook,"+
"bs=b?.state?.(),entries=b?.list?.();const wh=window.__taleraIntegratedBand?.getState?.();"+
"return {current:rt?.currentMemory?.()?.id,index:bs?.index,bookSelected:entries?.[bs?.index]?.id,"+
"wheel:wh,visible:document.body.classList.contains('talera-unified-wheel-in-motion')};})()");
console.log('COVER_TAP_AFTER',JSON.stringify(stateAfterTap));
const afterRealTap=await evaluate("(()=>{const m=window.__taleraTimelineRuntime.currentMemory();"+
"return {id:m.id,index:m._photoIndex,prepared:Array.from(document.querySelectorAll('video[style*=\"-9999px\"]')).map(v=>v.paused)};})()");
assert.equal(afterRealTap.id,'pwa:'+saved.id,'stationary tap must not navigate to a different memory');
assert.equal(afterRealTap.index,frozen.index,'stationary finger tap cannot step narrated photos');
assert.ok(afterRealTap.prepared.every(Boolean),'stationary finger tap cannot start any prepared video');
console.log('PASS real touch tap on narrated memory: no media stepping, no hidden video activation');
assert.equal(await evaluate("document.body.classList.contains('talera-unified-wheel-in-motion')"),false,
  'stationary tap must never reveal the wheel');

await evaluate("(()=>{document.dispatchEvent(new Event('talera:enable-listening'));"+
"const a=window.__taleraInlineSharedAudio;if(a.paused)a.play().catch(()=>{});})()");
assert.ok(await until('window.__taleraInlineSharedAudio?.currentTime>.25&&window.__taleraInlineSharedAudio?.currentTime<2.6',80),
  'speech must be actively playing before the swipe');
const from=initial.storyRect;
assert.ok(from.w>150&&from.h>70,'native V9 story surface must have swipe area');
// Use the existing V13 wheel unchanged: its book.list() is a list of MEMORIES,
// never individual narration/photo/video frame IDs. Chromium touch input mimics iPhone.
await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
const centerY=Math.round(from.y+from.h*.50);
const x0=Math.round(from.x+from.w*.78), x1=Math.round(from.x+from.w*.22);
const wheelBefore=await evaluate("(()=>{const b=document.querySelector('#photoStage .talera-photo-strip.talera-wheel-strip');"+
"return b?{display:getComputedStyle(b).display,visible:b.classList.contains('is-visible')}:null})()");
assert.ok(wheelBefore,'V13 original wheel must exist within native stage');
assert.equal(wheelBefore.display,'none','narrated wheel remains hidden when not swiping');
await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:centerY,id:11}]});
assert.equal(await evaluate("document.body.classList.contains('talera-unified-wheel-in-motion')"),false,
  'pointerdown alone is not a horizontal swipe');
let movingWheel=null;
for(let i=1;i<=8;i++){
 const x=Math.round(x0+(x1-x0)*i/8);
 await cmd('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:centerY,id:11}]});
 await sleep(25);
 if(i===2){
  movingWheel=await evaluate("(()=>{const b=document.querySelector('#photoStage .talera-photo-strip.talera-wheel-strip');const css=getComputedStyle(b);"+
   "return {active:document.body.classList.contains('talera-unified-wheel-in-motion'),"+
   "display:css.display,visibility:css.visibility,opacity:css.opacity,"+
   "isVisible:b.classList.contains('is-visible'),pointer:css.pointerEvents};})()");
  assert.equal(movingWheel.active,true,'narrated wheel becomes visible during finger movement, not after release');
  assert.equal(movingWheel.isVisible,true,'the native V13 wheel is already active on pointerdown');
  assert.notEqual(movingWheel.display,'none','the original wheel must NOT be display:none during finger movement');
  assert.equal(movingWheel.visibility,'visible');
  assert.ok(Number(movingWheel.opacity)>.95);
  assert.equal(movingWheel.pointer,'none','moving wheel cannot hijack click or touch events');
 }
}
assert.ok(movingWheel,'in-flight swipe state was measured');
console.log('PASS visual under finger: original narrated wheel is visible BEFORE finger-up');
await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
assert.ok(await until('window.__taleraTimelineRuntime?.currentMemory()?.id!=='+JSON.stringify('pwa:'+saved.id),100),
  'swipe must leave narrated memory, not step between its internal media');
const away=await evaluate("(()=>{const m=window.__taleraTimelineRuntime.currentMemory();"+
"return {id:m?.id,voicePaused:window.__taleraInlineSharedAudio?.paused,"+
"activeVideoCount:document.querySelectorAll('video.talera-v61-inline-video').length,"+
"visibleNarration:document.body.classList.contains('talera-v61-narration-visual')};})()");
assert.notEqual(away.id,'pwa:'+saved.id);
assert.equal(away.voicePaused,true,'leaving story must pause speech');
assert.equal(away.activeVideoCount,0,'leaving story must dispose current native inline video');
assert.ok(await until("!document.body.classList.contains('talera-unified-wheel-in-motion')",80),
  'visual swipe class must clear after native wheel landing');
console.log('PASS real touch swipe while narrating: next WHOLE memory, previous voice stopped, no orphan video');
// Navigate BACK using the same native V13 memory-wheel (no separate player).
const rback=await evaluate("(()=>{const r=document.getElementById('memoryStoryScroll').getBoundingClientRect();"+
"return {x:r.x,y:r.y,w:r.width,h:r.height}})()");
const by=Math.round(rback.y+rback.h*.50);
const right0=Math.round(rback.x+rback.w*.22),right1=Math.round(rback.x+rback.w*.78);
await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:right0,y:by,id:12}]});
for(let i=1;i<=8;i++){
 const x=Math.round(right0+(right1-right0)*i/8);
 await cmd('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:by,id:12}]});
 await sleep(25);
}
await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
assert.ok(await until('window.__taleraTimelineRuntime?.currentMemory()?.id==='+JSON.stringify('pwa:'+saved.id),100),
  'reverse swipe must restore the original narrated MEMORY, not an internal clip');
assert.ok(await until('Boolean(window.__taleraInlineSharedAudio?.src)',100),
  'return to narrated memory must reinitialize one native voice element');
const restored=await evaluate("(()=>{const m=window.__taleraTimelineRuntime.currentMemory();"+
"const index=m._photoIndex;document.getElementById('memoryStoryScroll').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));"+
"return {id:m.id,indexBefore:index,indexAfter:m._photoIndex,voiceNodes:document.querySelectorAll('audio').length};})()");
assert.equal(restored.id,'pwa:'+saved.id);
assert.equal(restored.indexAfter,restored.indexBefore,'narrated memory stays closed to clicks after return');
console.log('PASS reverse swipe: same whole narrated memory restored, internal photo taps still ignored');

// Ordinary memories keep their original tap-to-next-photo interaction.
await cmd('Page.navigate',{url:base+'/present?memory='+encodeURIComponent(nextMemory.id.slice(4))});
assert.ok(await until('window.__taleraTimelineRuntime?.currentMemory()?.id==='+JSON.stringify(nextMemory.id)+
  '&&!window.__taleraTimelineRuntime.currentMemory()._photoLoading',160),
  'ordinary adjacent memory must load');
const ordinaryTap=await evaluate("(()=>{const m=window.__taleraTimelineRuntime.currentMemory();"+
"const before=m._photoIndex,count=m.photos.length;"+
"document.getElementById('memoryStoryScroll').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));"+
"return {before,after:m._photoIndex,count,kind:m._zeroItems.some(x=>x.kind==='audio')?'narrated':'ordinary'};})()");
assert.equal(ordinaryTap.kind,'ordinary');
assert.equal(ordinaryTap.count,2);
assert.equal(ordinaryTap.after,(ordinaryTap.before+1)%ordinaryTap.count,
  'normal photo memory TAP must still advance its photo');
console.log('PASS ordinary photo memory: tap advances to next photo exactly as approved V9');

const noOrdinaryCover=await evaluate("(async()=>{"+
"const id="+JSON.stringify(nextMemory.id)+";"+
"const m=window.__taleraPhotoBook.list().find(x=>x.id===id);"+
"const db=await new Promise(resolve=>{const r=indexedDB.open('talera-narrated-swipe-covers-v1');r.onsuccess=()=>resolve(r.result)});"+
"const row=await new Promise(resolve=>{const r=db.transaction('covers','readonly').objectStore('covers').get(id);r.onsuccess=()=>resolve(r.result)});"+
"db.close();return {preview:!!m?.previewImage,cached:!!row};})()",true);
assert.deepEqual(noOrdinaryCover,{preview:false,cached:false},
  'normal photo memories must never generate narrated cover entries');
console.log('PASS normal photo memory: no narrated cover or extra storage copy');


// Safari permission regression: autoplay blocked -> the white hint must be a
// real button that plays the ORIGINAL native voice. The photo stays sealed.
await cmd('Page.navigate',{url:base+'/present?memory='+encodeURIComponent(saved.id)});
assert.ok(await until('Boolean(window.__taleraInlineSharedAudio?.src)&&Boolean(document.querySelector(\'video[style*="-9999px"]\'))'),
  'narrated memory and original video must load');
await sleep(200);
await evaluate("(()=>{const a=window.__taleraInlineSharedAudio;"+
"a.pause();a.play=()=>Promise.reject(Object.assign(new Error('iOS user activation required'),{name:'NotAllowedError'}));"+
"window.__taleraInlineTryAutoPlay?.();})()");
assert.ok(await until('Boolean(document.querySelector("button.talera-v61-audio-permission-hint"))',80),
  'autoplay rejection must present a REAL Beluister button');
const permission=await evaluate("(()=>{"+
"const btn=document.querySelector('button.talera-v61-audio-permission-hint');"+
"const rect=btn.getBoundingClientRect(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;"+
"return {tag:btn.tagName,text:btn.textContent,pointer:getComputedStyle(btn).pointerEvents,"+
"aria:btn.getAttribute('aria-label'),onTop:btn.contains(document.elementFromPoint(x,y)),"+
"x:Math.round(x),y:Math.round(y),voicePaused:window.__taleraInlineSharedAudio.paused};})()");
assert.equal(permission.tag,'BUTTON');
assert.match(permission.text,/Beluister/);
assert.equal(permission.pointer,'auto','permission prompt must be tappable');
assert.equal(permission.aria,'Ingesproken herinnering afspelen');
assert.equal(permission.onTop,true,'button may not be covered by picture or wheel');
assert.equal(permission.voicePaused,true);
await evaluate('delete window.__taleraInlineSharedAudio.play');
await cmd('Input.dispatchMouseEvent',{type:'mousePressed',x:permission.x,y:permission.y,button:'left',clickCount:1});
await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',x:permission.x,y:permission.y,button:'left',clickCount:1});
assert.ok(await until('Boolean(window.__taleraInlineSharedAudio&&!window.__taleraInlineSharedAudio.paused&&window.__taleraInlineSharedAudio.currentTime>.12)',80),
  'clicking Beluister must start the EXISTING native voice');
assert.ok(await until('!document.querySelector("button.talera-v61-audio-permission-hint")',50),
  'permission button disappears when narration plays');
console.log('PASS Safari permission: clicking real Beluister button plays native narration, not photo');

// Regression from REAL iPhone screenshots: a new, NEVER-OPENED narrated
// neighbor must have its FIRST-VISUAL cover BEFORE a swipe. Otherwise the
// native wheel paints an all-white rectangle until hydration after landing.
const unopenedNarrated=await evaluate("(async()=>{"+
"const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZcAAAAASUVORK5CYII='),c=>c.charCodeAt(0));"+
"const n=8000,b=new ArrayBuffer(44+n*2),v=new DataView(b);"+
"const w=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i))};"+
"w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');"+
"v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);"+
"v.setUint32(24,8000,true);v.setUint32(28,16000,true);v.setUint16(32,2,true);"+
"v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);"+
"const original=await TaleraMemories.get('"+saved.id+"');"+
"const first=original.items.find(x=>x.kind==='video');"+
"const video=await TaleraMemories.blob(first.key);"+
"const files=[new File([video],'neighbor-opening-video.webm',{type:video.type}),"+
"new File([png],'cover-only-photo.png',{type:'image/png'}),"+
"new File([b],'neighbor-voice.wav',{type:'audio/wav'})];"+
"const row=await TaleraMemories.save({title:'Unopened narrated neighbor',"+
"date:'2026-11-04',time:'11:59:00',datePrecision:'exact',"+
"narrationCues:[{t:0,index:0}],narrationDurationMs:1000},files);"+
"return {id:'pwa:'+row.id};})()",true);
assert.ok(unopenedNarrated.id.startsWith('pwa:local-'));
await cmd('Page.navigate',{url:base+'/present?memory='+encodeURIComponent(saved.id)});
const sibling=JSON.stringify(unopenedNarrated.id);
assert.ok(await until("Boolean(window.__taleraPhotoBook?.list?.().find(x=>x.id==="+sibling+")?.previewImage)",170),
 'the unopened narrated neighbor MUST have a persisted first-photo preview before gesture');
const coverAhead=await evaluate("(()=>{const l=window.__taleraPhotoBook.list(),"+
"a=l.findIndex(x=>x.id==="+sibling+"),"+
"b=l.findIndex(x=>x.id==="+JSON.stringify('pwa:'+saved.id)+");"+
"const neighbor=l[a],current=l[b];"+
"return {distance:Math.abs(a-b),neighborHydrated:!neighbor._photoLoading,"+
"neighborHasCover:!!neighbor.previewImage,neighborFirstKey:neighbor._zeroItems.find(x=>x.kind==='video').key,"+
"neighborFrameCount:neighbor._zeroFrames?.length||0,currentHasCover:!!current.previewImage};})()");
assert.equal(coverAhead.distance,1,'new narrated memory should be next to the current one');
assert.equal(coverAhead.neighborHydrated,false,
 'neighbor is NOT opened or hydrated: cover comes from exactly one original video');
assert.equal(coverAhead.neighborHasCover,true);
assert.equal(coverAhead.neighborFrameCount,0);
assert.equal(coverAhead.currentHasCover,true);
console.log('PASS adjacent VIDEO frame-zero cover: generated BEFORE first visit with zero original frames hydrated');
const rect=await evaluate("(()=>{const r=document.getElementById('memoryStoryScroll').getBoundingClientRect();"+
"return {x:r.x,y:r.y,w:r.width,h:r.height}})()");
await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
const y=Math.round(rect.y+rect.h*.5),sX=Math.round(rect.x+rect.w*.2),eX=Math.round(rect.x+rect.w*.78);
await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sX,y,id:31}]});
for(let i=1;i<=4;i++){
 const x=Math.round(sX+(eX-sX)*i/4);
 await cmd('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y,id:31}]});
 await sleep(38);
}
const adjacentPaint=await evaluate("(()=>{"+
"const l=window.__taleraPhotoBook.list(),m=l.find(x=>x.id==="+sibling+");"+
"const page=[...document.querySelectorAll('.talera-wheel-page')].find(e=>e.dataset.url===m.previewImage);"+
"const img=page?.querySelector('.example-photo');"+
"const cs=page&&getComputedStyle(page);"+
"return {found:!!page,src:img?.src,complete:img?.complete,naturalWidth:img?.naturalWidth,"+
"visibility:cs?.visibility,paintDisplay:cs?.display,cover:m.previewImage,"+
"wheelActive:document.body.classList.contains('talera-unified-wheel-in-motion')};})()");
assert.equal(adjacentPaint.found,true,'adjacent wheel slot must own the PREPARED cover URL');
assert.equal(adjacentPaint.complete,true,'neighbor image must already be decoded while finger is down');
assert.ok(adjacentPaint.naturalWidth>0,'neighbor strip tile must contain a painted picture, not white');
assert.equal(adjacentPaint.visibility,'visible','neighbor tile should never be hidden during drag');
assert.equal(adjacentPaint.wheelActive,true);
await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
console.log('PASS native V13 drag: fully loaded neighbor preview fills its tile before finger-up; no reserved white slot');

// Auto-continuation path: the voice starts with a browser-permitted playback
// action but WITHOUT the consent button or talera:enable-listening event.
// Strict Chrome requires user activation even for muted voice; the important
// regression is that no explicit original-video priming has happened.
// The preloaded original MUST still be adopted rather than replaced.
// Autoplay policies may still reject sound for the next video; existing real
// Beluister button must recover without touching the photo/swipe controls.
const evaluateQuiet=(expression,awaitPromise=false)=>evaluate(expression,awaitPromise,false);
const untilQuiet=async(expression,tries=240)=>{
 for(let i=0;i<tries;i++){
  if(await evaluateQuiet(expression))return true;
  await sleep(80);
 }
 return false;
};
await cmd('Page.navigate',{url:base+'/present?memory='+encodeURIComponent(saved.id)});
assert.ok(await untilQuiet('Boolean(window.__taleraInlineSharedAudio?.src)&&Boolean(document.querySelector(\'video[style*="-9999px"]\'))',160),
 'auto-start scenario must load native voice and prewarmed original without a click');
const autoStart=await evaluate("(async()=>{"+
"const video=document.querySelector('video[style*=\"-9999px\"]');"+
"video.dataset.autostartPrepared='yes';"+
"const a=window.__taleraInlineSharedAudio;a.muted=true;"+
"try{await a.play();return {ok:true,muted:a.muted}}catch(e){return {ok:false,error:e.name}}"+
"})()",true);
assert.equal(autoStart.ok,true,'voice must begin without clicking the consent button or priming originals');
assert.ok(await untilQuiet('document.querySelector("video.talera-v61-inline-video")?.dataset.autostartPrepared==="yes"',300),
 'first original video MUST be SAME prepared element even with zero listening gestures');
const autoHandoff=await evaluateQuiet("(()=>{const video=document.querySelector('video.talera-v61-inline-video');"+
"const hint=document.querySelector('button.talera-v61-audio-permission-hint');"+
"return {reused:video?.dataset.autostartPrepared==='yes',paused:video?.paused,"+
"muted:video?.muted,currentTime:video?.currentTime,blocked:!!hint};})()");
assert.equal(autoHandoff.reused,true,'the existing preloaded original, not a new video');
if(autoHandoff.blocked){
 const coords=await evaluateQuiet("(()=>{const b=document.querySelector('button.talera-v61-audio-permission-hint');"+
"const r=b.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};})()");
 await cmd('Input.dispatchMouseEvent',{type:'mousePressed',x:coords.x,y:coords.y,button:'left',clickCount:1});
 await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',x:coords.x,y:coords.y,button:'left',clickCount:1});
 assert.ok(await untilQuiet('document.querySelector("video.talera-v61-inline-video")?.currentTime>.25',80),
  'real Beluister control resumes the SAME original after browser-level autoplay denial');
 console.log('PASS no-gesture auto start: same preloaded video adopted; Safari-style restriction recovered by existing Beluister button');
}else{
 assert.ok(await untilQuiet('document.querySelector("video.talera-v61-inline-video")?.currentTime>.25',80),
  'if the browser grants automatic sound, the same preloaded original must actually advance');
 console.log('PASS no-gesture auto start: same preloaded video started automatically and progressed');
}

// Regression from iPhone: AFTER the LAST audible original video has finished,
// the narrated memory is still ONE CLOSED MEMORY. Native RH19 must not
// advance its internal photos when the finger taps or swipes. V13 must choose
// exactly one adjacent memory, not a media frame from inside the narration.
await cmd('Page.navigate',{url:base+'/present?memory='+encodeURIComponent(saved.id)});
assert.ok(await until('Boolean(window.__taleraInlineSharedAudio?.src)&&Boolean(document.querySelector(\'video[style*="-9999px"]\'))',180),
  'post-original swipe regression must load complete narrated memory');
await evaluate("(()=>{"+
"window.__taleraPostVideoEnded=false;window.__taleraPostVideoCount=0;"+
"const observed=new WeakSet();"+
"const timer=setInterval(()=>{"+
" for(const v of document.querySelectorAll('video.talera-v61-inline-video')){"+
"  if(v.muted||observed.has(v))continue;observed.add(v);"+
"  window.__taleraPostVideoCount++;"+
"  v.addEventListener('ended',()=>{window.__taleraPostVideoEnded=true},{once:true});"+
" }"+
" if(window.__taleraPostVideoEnded)clearInterval(timer);"+
"},25);"+
"const consent=document.querySelector('button.talera-audio-consent');"+
"if(consent&&!consent.hidden)consent.click();"+
"else document.dispatchEvent(new Event('talera:enable-listening'));"+
"const a=window.__taleraInlineSharedAudio;if(a.paused)a.play().catch(()=>{});"+
"})()");
assert.ok(await until('window.__taleraPostVideoEnded===true',380),
  'the last original video must actually finish before checking the closed memory');
await sleep(220);
assert.equal(await evaluate("document.querySelectorAll('video.talera-v61-inline-video').length"),0,
  'final video has finished and native presenter is fully settled');
const postVideoState=await evaluate("(()=>{const r=window.__taleraTimelineRuntime;"+
"const m=r.currentMemory(),b=window.__taleraPhotoBook;const list=b.list(),idx=list.findIndex(x=>x.id===m.id);"+
"const rect=document.getElementById('memoryStoryScroll').getBoundingClientRect();"+
"return {id:m.id,frameIndex:m._photoIndex,photoCount:m.photos.length,"+
"narrated:m._zeroItems.some(x=>x.kind==='audio'),"+
"index:idx,totalEntries: list.filter(x=>x.id===m.id).length,"+
"next: list[idx+1]?.id||null,rect:{x:rect.x,y:rect.y,w:rect.width,h:rect.height}};})()");
assert.equal(postVideoState.id,'pwa:'+saved.id);
assert.equal(postVideoState.narrated,true);
assert.equal(postVideoState.totalEntries,1,'whole story is stored in exactly ONE V13 memory slot');
assert.ok(postVideoState.photoCount>3);
assert.ok(postVideoState.next,'a neighboring complete memory is needed to verify swipe');
await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
const postTapX=Math.round(postVideoState.rect.x+postVideoState.rect.w*.5);
const postTapY=Math.round(postVideoState.rect.y+postVideoState.rect.h*.5);
await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:postTapX,y:postTapY,id:51}]});
await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await sleep(250);
const postTapState=await evaluate("(()=>{const m=window.__taleraTimelineRuntime.currentMemory();"+
"return {id:m.id,frameIndex:m._photoIndex,photoCount:m.photos.length};})()");
assert.equal(postTapState.id,postVideoState.id,'touch AFTER final video may not select a different memory');
assert.equal(postTapState.frameIndex,postVideoState.frameIndex,
  'touch AFTER final video may not advance any internal narrated photo');
const postX0=Math.round(postVideoState.rect.x+postVideoState.rect.w*.8),
      postX1=Math.round(postVideoState.rect.x+postVideoState.rect.w*.2);
await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:postX0,y:postTapY,id:52}]});
for(let i=1;i<=8;i++){
 const x=Math.round(postX0+(postX1-postX0)*i/8);
 await cmd('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:postTapY,id:52}]});
 await sleep(25);
}
await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
assert.ok(await until('window.__taleraTimelineRuntime?.currentMemory()?.id==='+JSON.stringify(postVideoState.next),100),
  'swipe AFTER last original video must move directly to NEXT WHOLE memory');
const postSelectedState=await evaluate("(()=>{const b=window.__taleraPhotoBook,m=window.__taleraTimelineRuntime.currentMemory();"+
"return {id:m.id,index:b.state().index,bookId:b.list()[b.state().index]?.id};})()");
assert.equal(postSelectedState.id,postVideoState.next);
assert.equal(postSelectedState.bookId,postSelectedState.id,
  'visible V13 wheel and selected memory must agree after post-video swipe');
console.log('PASS post-original VIDEO seal: stationary touch cannot change narrated photo; horizontal swipe moves ONE WHOLE memory');
ws.close();
