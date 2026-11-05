/* Browser: native IndexedDB save -> V9 iframe opens -> true WAV audio ended
   -> three remaining stills -> same original, unmuted video round. */
import assert from 'node:assert/strict';
const base='https://talera-v12-restfotos-veilige-test-20261105.mark-a39.workers.dev';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let tabs=[];
for(let i=0;i<60;i++){
 try{const r=await fetch('http://127.0.0.1:9224/json');if(r.ok){tabs=await r.json();if(tabs.some(x=>x.type==='page'))break}}
 catch{}await sleep(200);
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

const saved=await evalJs("(async()=>{\n const raw=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZcAAAAASUVORK5CYII='),x=>x.charCodeAt(0));\n const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;\n const ctx=canvas.getContext('2d');ctx.fillStyle='#194b6d';ctx.fillRect(0,0,48,48);\n const stream=canvas.captureStream(8);\n const mime=['video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));\n if(!mime)throw Error('No supported video recorder in real browser');\n const recording=await new Promise((resolve,reject)=>{\n  const recorder=new MediaRecorder(stream,{mimeType:mime}),chunks=[];\n  recorder.addEventListener('dataavailable',e=>{if(e.data?.size)chunks.push(e.data)});\n  recorder.addEventListener('stop',()=>resolve(new Blob(chunks,{type:mime})),{once:true});\n  recorder.addEventListener('error',reject,{once:true});\n  recorder.start();setTimeout(()=>recorder.stop(),700);\n });\n stream.getTracks().forEach(t=>t.stop());\n if(!recording.size)throw Error('Video recording empty');\n const files=[new File([recording],'clip.webm',{type:mime})];\n for(let i=0;i<5;i++)files.push(new File([raw],'photo'+i+'.png',{type:'image/png'}));\n const count=4800,buf=new ArrayBuffer(44+count*2),v=new DataView(buf);\n const str=(i,s)=>{for(let j=0;j<s.length;j++)v.setUint8(i+j,s.charCodeAt(j))};\n str(0,'RIFF');v.setUint32(4,36+count*2,true);str(8,'WAVE');str(12,'fmt ');\n v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);\n v.setUint32(24,8000,true);v.setUint32(28,16000,true);v.setUint16(32,2,true);\n v.setUint16(34,16,true);str(36,'data');v.setUint32(40,count*2,true);\n files.push(new File([buf],'voice.wav',{type:'audio/wav'}));\n const saved=await TaleraMemories.save({\n title:'TALERA V12 synthetic browser check',date:'2026-11-04',time:'12:00:00',\n datePrecision:'exact',text:'Synthetic browser-only memory',\n narrationCues:[{t:0,index:0},{t:180,index:1},{t:360,index:2}],\n narrationDurationMs:600\n },files);\n const row=await TaleraMemories.get(saved.id);\n return{id:saved.id,total:row?.items?.length,cues:row?.narrationCues?.length};\n})()",true);
assert.ok(saved?.id?.startsWith('local-'),'native IndexedDB save must succeed: '+JSON.stringify(saved));
assert.equal(saved.total,7);assert.equal(saved.cues,3);
console.log('PASS local saved six media + voice + three cues');
await command('Page.navigate',{url:base+'/present?memory='+encodeURIComponent(saved.id)});
const iframeOpened=await until("Boolean(document.querySelector('iframe.talera-zero-present-frame')?.contentDocument?.getElementById('play'))",{tries:125,ms:75});
if(!iframeOpened){
 const diagnostic=await evalJs("(async()=>({href:location.href,title:document.title,ready:document.readyState,activeMemory:window.__taleraTimelineRuntime?.currentMemory()?.id,activeStory:window.__taleraTimelineRuntime?.currentMemory()?.storyId,activeLocal:window.__taleraTimelineRuntime?.currentMemory()?._taleraLocal,activeLoading:window.__taleraTimelineRuntime?.currentMemory()?._photoLoading,activePhotos:window.__taleraTimelineRuntime?.currentMemory()?.photos?.length,activeKinds:window.__taleraTimelineRuntime?.currentMemory()?._zeroItems?.map(x=>x.kind),photoStage:!!document.getElementById('photoStage'),photoStageSize:document.getElementById('photoStage')?.getBoundingClientRect()?.toJSON?.(),adapterScript:!!document.getElementById('talera-zero-memory-adapter'),adapterPatched:document.getElementById('talera-zero-memory-adapter')?.textContent?.includes('activate(visible)'),localFrameBridge:typeof window.__taleraLocalFrameChanged,runtimeVersion:window.__taleraTimelineRuntime?.version,trace:window.__v12trace,frames:[...document.querySelectorAll('iframe')].map(f=>({cls:f.className,src:f.getAttribute('src'),ready:f.contentDocument?.readyState,play:Boolean(f.contentDocument?.getElementById('play'))})),saved:(await window.TaleraMemories.list()).map(x=>({id:x.id,date:x.date,total:x.items?.length})),error:document.getElementById('taleraV8LoadError')?.textContent}))()",true);
 console.log('V12 MISSING IFRAME INVESTIGATION',JSON.stringify(diagnostic));
 console.log('V12 CONSOLE WARNING/ERROR',JSON.stringify(browserWarnings.slice(-25)));
 const viaExistingBridge=await evalJs("(()=>{const m=window.__taleraTimelineRuntime.currentMemory();window.__taleraLocalFrameChanged(m);return !!document.querySelector('iframe.talera-zero-present-frame')})()");
 const bridgeOpened=await until("Boolean(document.querySelector('iframe.talera-zero-present-frame')?.contentDocument?.getElementById('play'))",{tries:80,ms:75});
 console.log('V12 EXISTING FRAME-CHANGED BRIDGE CALLED DIRECTLY IN DISPOSABLE TEST BROWSER',
  JSON.stringify({immediate:viaExistingBridge,eventually:bridgeOpened,trace:await evalJs('window.__v12trace')}));

}
assert.ok(iframeOpened,'real saved memory MUST activate original narration iframe');
assert.ok(await until("document.querySelector('iframe.talera-zero-present-frame')?.contentDocument?.getElementById('count')?.textContent.includes(' / 6')",{tries:200,ms:80}),
 'real V9 player must receive six stored media files');
assert.equal(await evalJs("document.querySelector('iframe.talera-zero-present-frame').contentDocument.body.classList.contains('present')"),true);
console.log('PASS real V9 iframe activated and six saved media transmitted');
assert.equal(await evalJs("(()=>{\n const d=document.querySelector('iframe.talera-zero-present-frame').contentDocument;\n const v=d.getElementById('view'),play=d.getElementById('play');\n window.__v12={frames:[],ended:false};\n function log(){\n  const x=v.querySelector(':scope > img[data-index],:scope > video[data-index]');\n  const idx=x?Number(x.dataset.index):null,prior=window.__v12.frames.at(-1);\n  if(!prior||prior.index!==idx||prior.tag!==x?.tagName)\n   window.__v12.frames.push({index:idx,tag:x?.tagName,muted:x?.tagName==='VIDEO'?x.muted:null,t:performance.now()});\n }\n new MutationObserver(log).observe(v,{childList:true,subtree:true});\n d.getElementById('voice').addEventListener('ended',()=>{window.__v12.ended=true;window.__v12.endedAt=performance.now();log()});\n log();play.click();return true;\n})()"),true);
assert.ok(await until("window.__v12?.ended",{tries:150,ms:80}),
 'true audio WAV ended, not synthetic event');
for(const idx of [3,4,5]){
 assert.ok(await until("window.__v12?.frames?.some(x=>x.index==="+idx+")",{tries:100,ms:80}),
  'unused photo index '+idx+' actually displayed');
}
assert.ok(await until("window.__v12?.frames?.some(x=>x.index===0&&x.tag==='VIDEO'&&x.muted===false)",{tries:105,ms:80}),
 'unchanged original video round is unmuted after remaining photos');
const report=await evalJs("({ended:window.__v12.ended,at:window.__v12.endedAt,frames:window.__v12.frames})");
const rest=report.frames.filter(x=>[3,4,5].includes(x.index));
assert.deepEqual(rest.map(x=>x.index),[3,4,5]);
assert.ok(rest[0].t>=report.at-30);
assert.ok(rest[1].t-rest[0].t>=3500);
assert.ok(rest[2].t-rest[1].t>=3500);
const video=report.frames.find(x=>x.index===0&&x.tag==='VIDEO'&&x.muted===false);
assert.ok(video.t>rest[2].t);
console.log('PASS true voice ended -> 3 unused photos -> unchanged unmuted video',JSON.stringify({
 indexes:report.frames.map(x=>x.index),hold1:Math.round(rest[1].t-rest[0].t),hold2:Math.round(rest[2].t-rest[1].t)
}));
await command('Page.navigate',{url:base+'/vertelmodus-embed?mode=record'});
assert.ok(await until("Boolean(document.getElementById('voice'))"));
assert.equal(await evalJs("document.body.classList.contains('present')"),false);
assert.equal(await evalJs("Boolean(document.getElementById('talera-v11-debug-toggle'))"),false);
console.log('PASS recorder unchanged: no diagnosis, no new separate player');
ws.close();
