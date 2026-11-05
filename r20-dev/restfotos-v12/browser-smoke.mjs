/* Browser: native IndexedDB save -> V9 iframe opens -> true WAV audio ended
   -> three remaining stills -> same original, unmuted video round. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
const base='https://talera-v12-restfotos-veilige-test-20261105.mark-a39.workers.dev';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const cdpDir=process.env.TALERA_CDP_DIR;
assert.ok(cdpDir,'test browser profile directory must be set');
let tabs=[];
for(let i=0;i<100;i++){
 try{
  const port=Number((await readFile(join(cdpDir,'DevToolsActivePort'),'utf8')).split('\n')[0]);
  if(Number.isInteger(port)&&port>0){
   const r=await fetch('http://127.0.0.1:'+port+'/json');
   if(r.ok){tabs=await r.json();if(tabs.some(x=>x.type==='page'))break}
  }
 }catch{}await sleep(200);
}
const tab=tabs.find(x=>x.type==='page');
assert.ok(tab?.webSocketDebuggerUrl,'Chrome remote debugging unavailable');
const ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((res,rej)=>{ws.addEventListener('open',res,{once:true});ws.addEventListener('error',rej,{once:true})});
let id=0;const pending=new Map(),browserWarnings=[];
ws.addEventListener('message',ev=>{
 const e=JSON.parse(String(ev.data));if(e.method==='Runtime.consoleAPICalled'&&['warning','error'].includes(e.params?.type))browserWarnings.push(e.params.args?.map(a=>a.value??a.description).slice(0,4));if(!e.id||!pending.has(e.id))return;
 const p=pending.get(e.id);pending.delete(e.id);
 e.error?p.reject(Error(JSON.stringify(e.error))):p.resolve(e.result);
});
const command=(method,params={})=>new Promise((resolve,reject)=>{
 const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));
});
async function evalJs(expression,awaitPromise=false){
 const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise,userGesture:true});
 if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
 return r.result?.value;
}
async function until(expr,{tries=170,ms=75}={}){
 for(let i=0;i<tries;i++){try{if(await evalJs(expr))return true}catch{}await sleep(ms)}
 return false;
}
await command('Runtime.enable');await command('Page.enable');
await command('Page.addScriptToEvaluateOnNewDocument',{source:"(()=>{\n window.__v12trace=[];\n function log(type,element){\n  try{window.__v12trace.push({\n   type,t:Math.round(performance.now()),cls:element?.className,src:element?.getAttribute?.('src'),\n   stack:new Error().stack?.slice(0,2000)\n  })}catch(e){}\n }\n const originalAppend=Node.prototype.appendChild;\n Node.prototype.appendChild=function(node){\n  if(node?.tagName==='IFRAME')log('iframe-append',node);\n  return originalAppend.apply(this,arguments);\n };\n const originalAppendVariadic=Element.prototype.append;\n Element.prototype.append=function(...nodes){\n  for(const node of nodes)if(node?.tagName==='IFRAME')log('iframe-append',node);\n  return originalAppendVariadic.apply(this,nodes);\n };\n const originalRemove=Element.prototype.remove;\n Element.prototype.remove=function(){\n  if(this.tagName==='IFRAME')log('iframe-remove',this);\n  return originalRemove.apply(this,arguments);\n };\n window.addEventListener('error',e=>log('error-'+String(e.message).slice(0,200),null));\n window.addEventListener('unhandledrejection',e=>log('rejection-'+String(e.reason).slice(0,200),null));\n})()"});
await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await command('Page.navigate',{url:base+'/present'});
assert.ok(await until("document.readyState==='complete'&&Boolean(window.TaleraMemories)&&Boolean(window.__taleraTimelineRuntime)"),
 'native V9 IndexedDB and timeline runtime exist');

const saved=await evalJs("(async()=>{\n const raw=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZcAAAAASUVORK5CYII='),x=>x.charCodeAt(0));\n const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;\n const ctx=canvas.getContext('2d');ctx.fillStyle='#194b6d';ctx.fillRect(0,0,48,48);\n const stream=canvas.captureStream(8);\n const mime=['video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));\n if(!mime)throw Error('No supported video recorder in real browser');\n const recording=await new Promise((resolve,reject)=>{\n  const recorder=new MediaRecorder(stream,{mimeType:mime}),chunks=[];\n  recorder.addEventListener('dataavailable',e=>{if(e.data?.size)chunks.push(e.data)});\n  recorder.addEventListener('stop',()=>resolve(new Blob(chunks,{type:mime})),{once:true});\n  recorder.addEventListener('error',reject,{once:true});\n  recorder.start();setTimeout(()=>recorder.stop(),700);\n });\n stream.getTracks().forEach(t=>t.stop());\n if(!recording.size)throw Error('Video recording empty');\n const files=[new File([recording],'clip.webm',{type:mime})];\n for(let i=0;i<5;i++)files.push(new File([raw],'photo'+i+'.png',{type:'image/png'}));\n const count=24000,buf=new ArrayBuffer(44+count*2),v=new DataView(buf);\n const str=(i,s)=>{for(let j=0;j<s.length;j++)v.setUint8(i+j,s.charCodeAt(j))};\n str(0,'RIFF');v.setUint32(4,36+count*2,true);str(8,'WAVE');str(12,'fmt ');\n v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);\n v.setUint32(24,8000,true);v.setUint32(28,16000,true);v.setUint16(32,2,true);\n v.setUint16(34,16,true);str(36,'data');v.setUint32(40,count*2,true);\n files.push(new File([buf],'voice.wav',{type:'audio/wav'}));\n const saved=await TaleraMemories.save({\n title:'TALERA V12 synthetic browser check',date:'2026-11-04',time:'12:00:00',\n datePrecision:'exact',text:'Synthetic browser-only memory',\n narrationCues:[{t:0,index:0},{t:700,index:1},{t:1400,index:2}],\n narrationDurationMs:3000\n },files);\n const row=await TaleraMemories.get(saved.id);\n return{id:saved.id,total:row?.items?.length,cues:row?.narrationCues?.length};\n})()",true);
assert.ok(saved?.id?.startsWith('local-'),'native IndexedDB save must succeed: '+JSON.stringify(saved));
assert.equal(saved.total,7);assert.equal(saved.cues,3);
console.log('PASS local saved six media + voice + three cues');
await command('Page.navigate',{url:base+'/present?memory='+encodeURIComponent(saved.id)});

assert.ok(await until("Boolean(window.__taleraInlineSharedAudio?.src)",{tries:180,ms:80}),
 'approved V9 must create native inline audio for saved narration');
assert.equal(await evalJs("Boolean(document.querySelector('iframe.talera-zero-present-frame'))"),false,
 'no obsolete iframe is allowed');
const initial=await evalJs("(()=>{\n const audio=window.__taleraInlineSharedAudio,rt=window.__taleraTimelineRuntime;\n window.__v12={photos:[],videos:[],ended:false,at:0};\n const o=window.__v12;\n const record=()=>{\n  const i=rt.currentMemory()?._photoIndex;\n  const last=o.photos.at(-1);\n  if(Number.isInteger(i)&&(!last||last.index!==i))o.photos.push({index:i,t:performance.now()});\n  const v=document.querySelector('video.talera-v61-inline-video');\n  if(v&&(!o.videos.length||o.videos.at(-1).muted!==v.muted))\n   o.videos.push({muted:v.muted,t:performance.now()});\n };\n setInterval(record,60);\n audio.addEventListener('ended',()=>{o.ended=true;o.at=performance.now();record()},{once:true});\n record();\n if(audio.paused)audio.play().catch(e=>{o.error=String(e)});\n return {src:!!audio.src,started:!audio.paused};\n})()");
assert.ok(initial?.src);
assert.ok(await until("window.__v12?.ended",{tries:140,ms:80}),'natural voice-ended fires');
for(const i of [3,4,5])
 assert.ok(await until("window.__v12.photos.some(x=>x.index==="+i+"&&x.t>=window.__v12.at-150)",{tries:135,ms:80}),
  'rest photo '+i+' shows');
assert.ok(await until("window.__v12.videos.some(x=>x.muted===false&&x.t>window.__v12.at)",{tries:140,ms:80}),
 'original video with sound shows after photos');
const result=await evalJs("({at:window.__v12.at,photos:window.__v12.photos,videos:window.__v12.videos,error:window.__v12.error})");
const photos=result.photos.filter(x=>[3,4,5].includes(x.index)&&x.t>=result.at-150);
assert.deepEqual(photos.map(x=>x.index),[3,4,5]);
assert.ok(photos[1].t-photos[0].t>=3200);
assert.ok(photos[2].t-photos[1].t>=3200);
assert.ok(result.videos.some(v=>v.muted===false&&v.t>photos[2].t));
console.log('PASS native V9 inline voice -> three rest photos -> original unmuted video',JSON.stringify({
 photos:photos.map(x=>x.index),holds:[Math.round(photos[1].t-photos[0].t),Math.round(photos[2].t-photos[1].t)]
}));
await command('Page.navigate',{url:base+'/vertelmodus-embed?mode=record'});
assert.ok(await until("document.readyState==='complete'&&Boolean(document.getElementById('voice'))"));
console.log('PASS original recorder untouched');
ws.close();
