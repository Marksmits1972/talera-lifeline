// Actual browser E2E on the isolated staging Worker. All media are synthetic.
// Uses the *real* TALERA IndexedDB storage, native presenter, WAV narration,
// in-page video and saved cue IDs. No production data is touched.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
const base='https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev';
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
const evaluate=async(expression,awaitPromise=false,userGesture=false)=>{
 const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise,userGesture});
 if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
 return r.result?.value;
};
const until=async(expression,tries=240)=>{
 for(let i=0;i<tries;i++){if(await evaluate(expression))return true;await sleep(80)}
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
   // Keep the opening keyframe blue, then render ACTUAL moving frames.
   // A static canvas only encodes 1-2 frames and cannot prove image playback.
   ctx.fillStyle='#244b71';ctx.fillRect(0,0,60,60);stream.getVideoTracks()[0]?.requestFrame?.();
   let frameNo=0;
   const animation=setInterval(()=>{
     frameNo++;ctx.fillStyle=frameNo%2?'#416b96':'#244b71';ctx.fillRect(0,0,60,60);
     ctx.fillStyle='#f5ead6';ctx.fillRect((frameNo*7)%50,12,9,32);
     stream.getVideoTracks()[0]?.requestFrame?.();
   },90);
   setTimeout(()=>{clearInterval(animation);r.stop()},1300);
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

const quiet=expr=>evaluate(expr,false,false);
const wait=async(expr,tries=240)=>{
 for(let i=0;i<tries;i++){if(await quiet(expr))return true;await sleep(80)}
 return false;
};
async function swipe(dir){
 const r=await quiet("(()=>{let x=document.getElementById('memoryStoryScroll').getBoundingClientRect();return{x:x.x,y:x.y,w:x.width,h:x.height}})()");
 const x0=Math.round(r.x+r.w*(dir>0?.8:.2)),x1=Math.round(r.x+r.w*(dir>0?.2:.8));
 const y=Math.round(r.y+r.h*.55);
 await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y,id:34}]});
 for(let i=1;i<=9;i++){
  await cmd('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:Math.round(x0+(x1-x0)*i/9),y,id:34}]});
  await sleep(40);
 }
 await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
await cmd('Page.navigate',{url:base+'/present?memory='+encodeURIComponent(saved.id)});
const idOfStory='pwa:'+saved.id;
assert.ok(await wait('window.__taleraTimelineRuntime?.currentMemory()?.id==='+JSON.stringify(idOfStory),180));
assert.ok(await wait("Boolean(window.__taleraInlineSharedAudio?.src)&&Boolean(window.__taleraTimelineRuntime?.currentMemory()?._zeroFrames?.length)",180));
const initial=await quiet("(()=>{const m=window.__taleraTimelineRuntime.currentMemory(),b=window.__taleraPhotoBook;return{"+
"id:m.id,frames:m.photos.length,cover:m.previewImage,first:m.photos[0],"+
"entries:b.list().filter(x=>x.id===m.id).length,"+
"hidden:document.querySelectorAll('video[style*=\"-9999px\"]').length,"+
"engine:document.documentElement.outerHTML.includes('TALERA_CLOSED_MEMORY_CORE_20261106')}})()");
assert.equal(initial.entries,1,'voice + media is ONE memory record');
assert.equal(initial.frames,6,'one video and five photos belong to that one record');
assert.equal(initial.cover,initial.first,'fixed V13 cover is first visual, NOT currently spoken photo');
assert.equal(initial.hidden,0,'no invisible priming video or secondary player');
assert.equal(initial.engine,true,'REAL NEW staging worker must run the closed core');
console.log('PASS ONE complete memory, stable cover, no hidden second player, correct staging');

const installTrace=()=>{
 const statement="(()=>{"+
 "const a=window.__taleraInlineSharedAudio,m=window.__taleraTimelineRuntime.currentMemory();"+
 "const t={voice:0,silent:0,original:0,originalVideoTime:0,originalVisualPlaying:false,originalPaintedFrames:0,originalVisualVisible:false,originalEnded:false,originalStarts:0,voiceEndedAt:0,voiceSrc:a.src,soundtrackAudible:false,"+
 "frames:[],last:-1,start:performance.now(),hintCount:0};"+
 "const seen=new WeakSet();window.__taleraClosedTrace=t;"+
 "a.addEventListener('ended',()=>{if(!t.voiceEndedAt)t.voiceEndedAt=performance.now()},{once:true});t.timer=setInterval(()=>{"+
 "if(window.__taleraClosedTrace!==t){clearInterval(t.timer);return}"+
 "const mem=window.__taleraTimelineRuntime.currentMemory(),now=performance.now();"+
 "if(mem?.id!==m.id){clearInterval(t.timer);return}"+
 "t.voice=Math.max(t.voice,a.currentTime||0);"+
 "if(a.ended&&!t.voiceEndedAt)t.voiceEndedAt=now;"+
 "if(mem._photoIndex!==t.last){t.last=mem._photoIndex;t.frames.push({index:t.last,at:now})}"+
 "for(const v of document.querySelectorAll('video.talera-v61-inline-video')){"+
 "if(v.muted){if(!t.voiceEndedAt&&mem._photoIndex===0)t.silent=Math.max(t.silent,v.currentTime||0);if(t.voiceEndedAt&&a.src!==t.voiceSrc){t.soundtrackAudible=t.soundtrackAudible||!a.muted;t.original=Math.max(t.original,a.currentTime||0);t.originalVideoTime=Math.max(t.originalVideoTime,v.currentTime||0);t.originalVisualPlaying=t.originalVisualPlaying||(!v.paused&&!v.ended&&v.currentTime>.18);t.originalPaintedFrames=Math.max(t.originalPaintedFrames,v.getVideoPlaybackQuality?.().totalVideoFrames||0);t.originalVisualVisible=t.originalVisualVisible||(v.isConnected&&v.getBoundingClientRect().width>0&&v.getBoundingClientRect().height>0&&getComputedStyle(v).visibility!=='hidden');if(!seen.has(v)){seen.add(v);t.originalStarts++;v.addEventListener('ended',()=>{t.originalEnded=true},{once:true})}}}"+
 "else{t.original=Math.max(t.original,v.currentTime||0);t.originalVideoTime=Math.max(t.originalVideoTime,v.currentTime||0);t.originalVisualPlaying=t.originalVisualPlaying||(!v.paused&&!v.ended&&v.currentTime>.18);t.originalPaintedFrames=Math.max(t.originalPaintedFrames,v.getVideoPlaybackQuality?.().totalVideoFrames||0);t.originalVisualVisible=t.originalVisualVisible||(v.isConnected&&v.getBoundingClientRect().width>0&&v.getBoundingClientRect().height>0&&getComputedStyle(v).visibility!=='hidden');"+
 "if(!seen.has(v)){seen.add(v);t.originalStarts++;v.addEventListener('ended',()=>{t.originalEnded=true},{once:true})}}}"+
 "if(document.querySelector('button.talera-v61-audio-permission-hint'))t.hintCount++;"+
 "},30);return true})()";
 return evaluate(statement,false,false);
};
let requiredVoiceTap=0,requiredVideoTap=0;
for(let round=1;round<=3;round++){
 assert.ok(await wait('window.__taleraTimelineRuntime?.currentMemory()?.id==='+JSON.stringify(idOfStory),110));
 assert.ok(await wait("Boolean(window.__taleraInlineSharedAudio?.src)",110));
 await installTrace();
 let began=await wait('window.__taleraInlineSharedAudio.currentTime>.15',24);
 if(!began){
  requiredVoiceTap++;
  // A single EXPLICIT listening action is permitted for strict Chrome's
  // autoplay policy. Do not trigger playback in polling or via photo swipe.
  const button=await quiet("Boolean(document.querySelector('button.talera-v61-audio-permission-hint'))");
  if(button)await evaluate("document.querySelector('button.talera-v61-audio-permission-hint').click()",false,true);
  else await evaluate("window.__taleraInlineSharedAudio.play().catch(()=>{})",false,true);
  began=await wait('window.__taleraInlineSharedAudio.currentTime>.15',65);
 }
 assert.ok(began,'narration voice must begin, round '+round);
 assert.ok(await wait('window.__taleraClosedTrace.silent>.15',80),
  'FIRST muted video must MOVE during voice, not wait behind a hint');
 assert.ok(await wait('window.__taleraClosedTrace.voiceEndedAt>0',90),
  'voice must end and yield to missing photos');
 for(const idx of [3,4,5])assert.ok(await wait(
  'window.__taleraClosedTrace.frames.some(x=>x.index==='+idx+'&&x.at>=window.__taleraClosedTrace.voiceEndedAt-150)',95),
  'unseen photo '+idx+' must follow voice');
 assert.ok(await wait('window.__taleraClosedTrace.originalStarts>=1',90),
  'original video round must start with existing native viewport');
 let originalMoved=await wait('window.__taleraClosedTrace.original>.18',22);
 if(!originalMoved){
  requiredVideoTap++;
  const found=await evaluate("(()=>{let b=[...document.querySelectorAll('button')].find(x=>x.textContent?.includes('Beluister'));if(!b)return false;b.click();return true})()",false,true);
  assert.equal(found,true,'if audible autoplay denied, native Beluister MUST be usable');
  originalMoved=await wait('window.__taleraClosedTrace.original>.18',60);
 }
 assert.ok(originalMoved,'original VIDEO soundtrack must play');
 const visibleVideoPassed=await wait('window.__taleraClosedTrace.originalVisualPlaying&&window.__taleraClosedTrace.originalVideoTime>.3&&window.__taleraClosedTrace.originalPaintedFrames>=3&&window.__taleraClosedTrace.originalVisualVisible',60);
 const visualDiag=await quiet("(()=>{const t=window.__taleraClosedTrace,v=document.querySelector('video.talera-v61-inline-video'),a=window.__taleraInlineSharedAudio;return{originalSound:t.original,originalVideoTime:t.originalVideoTime,originalVisualPlaying:t.originalVisualPlaying,originalPaintedFrames:t.originalPaintedFrames,originalVisualVisible:t.originalVisualVisible,audioPaused:a?.paused,audioEnded:a?.ended,videoPaused:v?.paused,videoEnded:v?.ended,videoReadyState:v?.readyState,videoCurrentTime:v?.currentTime,videoFrames:v?.getVideoPlaybackQuality?.().totalVideoFrames,videoStyle:v?.style.cssText,hint:document.querySelector('button.talera-v61-audio-permission-hint')?.textContent||null}})()");
 console.log('ORIGINAL VISUAL DIAGNOSTIC',JSON.stringify(visualDiag));
 assert.ok(visibleVideoPassed,
  'original VIDEO must display moving decoded frames in the native viewport, NOT only a still preview with audio');
 assert.ok(await wait('window.__taleraClosedTrace.originalEnded',60),'the original video must end');
 const out=await quiet("(()=>{const t=window.__taleraClosedTrace,m=window.__taleraTimelineRuntime.currentMemory();"+
 "clearInterval(t.timer);return{id:m.id,cover:m.previewImage,first:m.photos[0],index:m._photoIndex,"+
 "voice:t.voice,silent:t.silent,original:t.original,ended:t.originalEnded,frames:t.frames,"+
 "originalStarts:t.originalStarts,hints:t.hintCount,soundtrackAudible:t.soundtrackAudible,originalVideoTime:t.originalVideoTime,originalPaintedFrames:t.originalPaintedFrames,originalVisualPlaying:t.originalVisualPlaying}})()");
 assert.equal(out.id,idOfStory);
 assert.equal(out.cover,out.first,'the wheel cover must NOT change to an internal photo');
 assert.equal(out.originalStarts,1,'each original plays once, no duplicate video round');
 assert.equal(out.soundtrackAudible,true,'the reused WAV audio element owns audible video soundtrack');
 const tailFrames=out.frames.filter(x=>[3,4,5].includes(x.index));
 assert.equal(tailFrames.length,3,'exactly three unshown photos, none skipped or repeated');
 for(let i=1;i<tailFrames.length;i++){
  const diff=tailFrames[i].at-tailFrames[i-1].at;
  assert.ok(diff>3300&&diff<5000,'each unseen photo lasts 4sec, delta='+diff);
 }
 console.log('PASS CLOSED STORY round '+round+' voice '+out.voice.toFixed(1)+'s, muted video '+out.silent.toFixed(1)+
  's, 3x4sec photos, original soundtrack '+out.original.toFixed(1)+'s, visible video '+out.originalVideoTime.toFixed(1)+'s / '+out.originalPaintedFrames+' decoded frames');
 const rect=await quiet("(()=>{const r=document.getElementById('memoryStoryScroll').getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})()");
 const tx=Math.round(rect.x+rect.w/2),ty=Math.round(rect.y+rect.h/2);
 await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty,id:89}]});
 await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await sleep(180);
 const afterTap=await quiet("(()=>{let m=window.__taleraTimelineRuntime.currentMemory();return{id:m.id,index:m._photoIndex}})()");
 assert.equal(afterTap.id,idOfStory);
 assert.equal(afterTap.index,out.index,'tap AFTER VIDEO cannot advance any narrated photo');
 if(round<3){
  const neighbor=await quiet("(()=>{let b=window.__taleraPhotoBook,l=b.list(),m=window.__taleraTimelineRuntime.currentMemory(),"+
   "i=l.findIndex(x=>x.id===m.id);return{id:l[i+1]?.id||l[i-1]?.id,dir:l[i+1]?1:-1}})()");
  assert.ok(neighbor.id);
  await swipe(neighbor.dir);
  assert.ok(await wait('window.__taleraTimelineRuntime?.currentMemory()?.id==='+JSON.stringify(neighbor.id),95),
   'swipe goes to NEXT WHOLE memory, never inside its photos');
  await swipe(-neighbor.dir);
  assert.ok(await wait('window.__taleraTimelineRuntime?.currentMemory()?.id==='+JSON.stringify(idOfStory),95),
   'swipe back reopens exact same memory ID');
  assert.ok(await wait("Boolean(window.__taleraInlineSharedAudio?.src)",110));
 }
}
console.log('AUDIO PERMISSION AUDIT voice clicks='+requiredVoiceTap+', original-video clicks='+requiredVideoTap+
 ' (browser policy can still require a real user gesture; no hidden synthetic activation)');
console.log('PASS three replay cycles, closed internal media, normal V13 whole-memory navigation');
// End of test: 3 complete real browser rounds already verified, including
// no extra Beluister on original video and post-video whole-memory swipes.
assert.equal(requiredVideoTap,0,'original video must never need a separate Beluister action');

// The ACTUAL iPhone failure occurred MID-NARRATION, not only after DONE.
// Navigate back into the whole story, let the voice + silent video move,
// then swipe while they are still playing. That swipe must go DIRECTLY to
// the neighboring memory. It MUST NOT reveal any internal photo or leave
// the old spoken voice playing under the next memory.
const nextWhole=await quiet("(()=>{const b=window.__taleraPhotoBook,l=b.list(),m=window.__taleraTimelineRuntime.currentMemory(),i=l.findIndex(x=>x.id===m.id);return{id:l[i+1]?.id||l[i-1]?.id,dir:l[i+1]?1:-1}})()");
assert.ok(nextWhole.id,'need an adjacent WHOLE memory for mid-narration regression');
await swipe(nextWhole.dir);
assert.ok(await wait('window.__taleraTimelineRuntime.currentMemory()?.id==='+JSON.stringify(nextWhole.id),105));
await swipe(-nextWhole.dir);
assert.ok(await wait('window.__taleraTimelineRuntime.currentMemory()?.id==='+JSON.stringify(idOfStory),105));
assert.ok(await wait("Boolean(window.__taleraInlineSharedAudio?.src)",105));
if(!await wait('window.__taleraInlineSharedAudio.currentTime>.12',10)){
 // Strict Chrome may require the FIRST voice gesture, but no extra video
 // gesture is given; progress checks never grant a hidden gesture.
 await evaluate("window.__taleraInlineSharedAudio.play().catch(()=>{})",false,true);
}
assert.ok(await wait("(()=>{const a=window.__taleraInlineSharedAudio,v=document.querySelector('video.talera-v61-inline-video');return a?.currentTime>.12&&a.currentTime<2.75&&v?.muted&&v.currentTime>.06})()",35),
  'voice and first silent VIDEO must move together before the swipe');
const midBefore=await quiet("(()=>{const m=window.__taleraTimelineRuntime.currentMemory(),b=window.__taleraPhotoBook;return{id:m.id,frame:m._photoIndex,entries:b.list().filter(x=>x.id===m.id).length}})()");
assert.equal(midBefore.entries,1,'story is ONE memory ID even during moving video');
await swipe(nextWhole.dir);
assert.ok(await wait('window.__taleraTimelineRuntime.currentMemory()?.id==='+JSON.stringify(nextWhole.id),105),
 'swipe MID-VOICE must land at the neighboring entire memory, never an internal photo');
const midAfter=await quiet("(()=>{const b=window.__taleraPhotoBook,m=window.__taleraTimelineRuntime.currentMemory(),"+
"old=b.list().find(x=>x.id==="+JSON.stringify(idOfStory)+"),state=b.state();"+
"return{id:m.id,oldIndex:old?._photoIndex,oldEntries:b.list().filter(x=>x.id===old.id).length,"+
"bookId:b.list()[state.index]?.id,oldAudioPaused:window.__taleraInlineSharedAudio?.paused}})()");
assert.equal(midAfter.id,nextWhole.id);
assert.equal(midAfter.bookId,nextWhole.id,'V13 wheel must select exactly the whole next memory');
assert.equal(midAfter.oldEntries,1);
assert.ok([0,1,2].includes(midAfter.oldIndex),
 'only legitimate narrated time-coded cues may change the old photo index while audio runs');
assert.equal(midAfter.oldAudioPaused,true,'old narration audio must stop when leaving its memory');
// A cue may naturally fire in the milliseconds BEFORE the swipe completes.
// After landing, the disposed old storyteller must never mutate the media again.
await sleep(650);
const stopped=await quiet("(()=>{const b=window.__taleraPhotoBook,old=b.list().find(x=>x.id==="+JSON.stringify(idOfStory)+");return{oldIndex:old?._photoIndex,current:window.__taleraTimelineRuntime.currentMemory()?.id,audioPaused:window.__taleraInlineSharedAudio?.paused}})()");
assert.equal(stopped.oldIndex,midAfter.oldIndex,'no old media cue may fire AFTER swipe has completed');
assert.equal(stopped.current,nextWhole.id,'no late callback may reopen old narrated memory');
assert.equal(stopped.audioPaused,true,'the old narrator must remain stopped after swipe');
console.log('PASS MID-NARRATION swipe: voice+silent VIDEO stopped and wheel selected ONE neighboring memory; internal media remained sealed');
ws.close();
