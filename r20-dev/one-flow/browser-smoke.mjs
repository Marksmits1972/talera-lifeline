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
for(let i=0;i<100;i++){
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
const evaluate=async(expression,awaitPromise=false)=>{
 const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise,userGesture:true});
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
   r.onerror=reject;r.start();setTimeout(()=>r.stop(),1300);
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
        warmed:video.dataset.primedVideo==='yes',progress:0,duration:0};
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
 // One initial Beluister gesture starts the whole memory, including later video.
 document.dispatchEvent(new Event('talera:enable-listening'));
 if(a.paused)a.play().catch(e=>{t.errors.push('voice play '+String(e))});
})()`);
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
 errors:t.errors,iframes:document.querySelectorAll('iframe.talera-zero-present-frame').length}
})()`);
const remaining=result.photos.filter(p=>p.index>=3&&p.at>=result.voiceEndedAt-100);
assert.deepEqual(remaining.map(p=>p.index),[3,4,5]);
assert.ok(remaining[1].at-remaining[0].at>=3200);
assert.ok(remaining[2].at-remaining[1].at>=3200);
assert.ok(await until('window.__oneFlowTest.videos.some(v=>!v.muted&&v.progress>.6)',200),
 'the original video must replay from 0 with sound after the remaining photos');
const videoPlayback=await evaluate(`window.__oneFlowTest.videos.map(v=>({muted:v.muted,at:v.at,warmed:v.warmed,progress:v.progress,duration:v.duration}))`);
const narrated=videoPlayback.find(v=>v.muted&&v.at<result.voiceEndedAt);
const replay=videoPlayback.find(v=>!v.muted&&v.at>remaining.at(-1).at);
assert.ok(narrated,'narrated video exists and was muted');
assert.ok(replay,'original native video replay starts AFTER the last remaining photo');
assert.equal(replay.warmed,true,'native replay MUST reuse video authorized by the FIRST listener gesture');
assert.ok(replay.progress>.6,'unmuted replay advanced from t=0');
assert.ok(replay.duration>=1,'replay has the original full clip duration');
assert.deepEqual(result.errors,[]);
assert.equal(result.iframes,0);
console.log('PASS browser playback round '+playbackRound+': silent narration -> remaining photos -> audible video from zero, no second Beluister');
}
ws.close();
