/* V11 browser integration: actual WAV voice.play() -> native ended -> photo 5 -> photo 6 -> original video.
   No personal data, recording permissions, storage writes or web APIs. */
import assert from 'node:assert/strict';

const base='https://talera-vertel-restfotos-v11-test-20261105.mark-a39.workers.dev';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let tabs;
for(let i=0;i<70;i++){
 try{const r=await fetch('http://127.0.0.1:9224/json');
 if(r.ok){tabs=await r.json();if(tabs.some(x=>x.type==='page'))break}}
 catch{}
 await sleep(200);
}
const tab=tabs?.find(x=>x.type==='page');
assert.ok(tab?.webSocketDebuggerUrl,'Chrome remote browser unavailable');
const ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{
 ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});
});
let id=0;const waits=new Map();
ws.addEventListener('message',event=>{
 const item=JSON.parse(String(event.data));
 if(!item.id)return;
 const waiter=waits.get(item.id);if(!waiter)return;waits.delete(item.id);
 if(item.error)waiter.reject(Error(JSON.stringify(item.error)));
 else waiter.resolve(item.result);
});
const command=(method,params={})=>new Promise((resolve,reject)=>{
 const key=++id;waits.set(key,{resolve,reject});
 ws.send(JSON.stringify({id:key,method,params}));
});
async function evaluate(expression){
 const v=await command('Runtime.evaluate',{expression,returnByValue:true,userGesture:true});
 if(v.exceptionDetails)throw Error('Chrome error: '+(v.exceptionDetails.exception?.description||v.exceptionDetails.text));
 return v.result?.value;
}
async function until(expression,{attempts=120,interval=100}={}){
 for(let i=0;i<attempts;i++){
  try{if(await evaluate(expression))return true}catch{}
  await sleep(interval);
 }
 return false;
}
await command('Runtime.enable');await command('Page.enable');
await command('Page.navigate',{url:base+'/'});
assert.ok(await until('location.origin==='+JSON.stringify(base)+'&&document.readyState==="complete"'),
 'V11 staging root did not load');

async function testMode(mode,{withVideo=false}={}){
 await evaluate('window.__taleraV11Mode='+JSON.stringify(mode)+';window.__taleraV11IncludeVideo='+JSON.stringify(withVideo));
 await evaluate("(()=>{\n  const result={ready:false,events:[],mode:null,error:null};\n  const frame=document.createElement('iframe');\n  frame.id='taleraV11FactualAudioTest';\n  frame.style.cssText='position:fixed;inset:0;width:100%;height:100%';\n  const mode=window.__taleraV11Mode||'present';\n  frame.src='/vertelmodus-embed?mode='+mode+'&v11-browsertest=1';\n  window.__taleraV11Test=result;\n  result.mode=mode;\n  result.frame=frame;\n  const begin=Date.now();\n  function onMessage(event){\n    if(event.source!==frame.contentWindow||event.origin!==location.origin||!event.data?.taleraZero)return;\n    if(event.data.type==='INITIALIZED'){\n      result.ready=true;\n      result.initialized=event.data;\n      result.child=frame.contentDocument;\n      const child=result.child;\n      result.audio=child.getElementById('voice');\n      result.count=child.getElementById('count');\n      result.initialPhoto=child.querySelector('#view > img')?.dataset.index||null;\n      result.presenter=child.body.classList.contains('present');\n      const count=result.count;\n      const log=()=>result.events.push({t:Date.now()-begin,count:count?.textContent||'',\n        img:child.querySelector('#view > img')?.dataset.index??null,\n        video:child.querySelector('#view > video')?.dataset.index??null,\n        stage:child.body.dataset.stage});\n      result.log=log;\n      result.observer=new MutationObserver(log);\n      result.observer.observe(count,{subtree:true,characterData:true,childList:true});\n      result.audio.addEventListener('ended',()=>{\n         result.endedReal=true;result.endedAt=Date.now()-begin;log()\n      });\n      log();\n    }\n  }\n  result.onMessage=onMessage;\n  window.addEventListener('message',onMessage);\n  frame.addEventListener('load',()=>{\n    const svg=i=>'<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\"><text x=\"5\" y=\"20\">'+i+'</text></svg>';\n    const items=Array.from({length:6},(_,i)=>({\n      blob:new Blob([svg(i)],{type:'image/svg+xml'}),\n      type:'image',name:'Photo ID '+i\n    }));\n    if(window.__taleraV11IncludeVideo)items.push({\n      blob:new Blob(['fake-video-for-playlist'],{type:'video/webm'}),type:'video',name:'Unchanged original video'});\n    const sr=8000,n=sr*0.6;\n    const bytes=new ArrayBuffer(44+n*2),view=new DataView(bytes);\n    const str=(offset,text)=>{for(let k=0;k<text.length;k++)view.setUint8(offset+k,text.charCodeAt(k))};\n    str(0,'RIFF');view.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');\n    view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);\n    view.setUint32(24,sr,true);view.setUint32(28,sr*2,true);\n    view.setUint16(32,2,true);view.setUint16(34,16,true);\n    str(36,'data');view.setUint32(40,n*2,true);\n    const voice=new Blob([bytes],{type:'audio/wav'});\n    frame.contentWindow.postMessage({taleraZero:true,type:'INIT',items,voice,\n      cues:[{t:0,index:0},{t:100,index:1},{t:200,index:2},{t:300,index:3}],\n      duration:600,waveform:[]},location.origin);\n  },{once:true});\n  document.body.append(frame);\n  return {launched:true,mode};\n})()");
 assert.ok(await until('Boolean(window.__taleraV11Test?.ready)'),mode+' embed did not initialize');
 const initial=await evaluate('({count:window.__taleraV11Test.initialized.itemCount,mode:window.__taleraV11Test.mode, presenter:window.__taleraV11Test.presenter})');
 assert.equal(initial.count,withVideo?7:6,mode+': player sees all media');
 assert.equal(initial.presenter,mode==='present');
 assert.ok(await until("window.__taleraV11Test?.child?.getElementById('talera-v11-readonly-audit')?.textContent.includes('Restfoto’s: 2')"),mode+': actual INIT data recognized as exactly two remaining photos');
 const beforeAudit=await evaluate("window.__taleraV11Test.child.getElementById('talera-v11-readonly-audit').textContent");
 assert.match(beforeAudit,/Spraak: 4 tijdcodes, 4 foto’s/);
 assert.match(beforeAudit,/Stem afgelopen: nee/);
 if(mode==='record'){
   // Simulate the native recording UI updating its already-existing cue details.
   // This changes only the visible diagnostic <pre>, NEVER the actual player state.
   await evaluate("(()=>{window.__taleraV11Test.child.getElementById('cues').textContent=JSON.stringify({cues:[{t:0,index:0},{t:100,index:1}]});return true})()");
   assert.ok(await until("window.__taleraV11Test.child.getElementById('talera-v11-readonly-audit').textContent.includes('Restfoto’s: 4')",{attempts:35,interval:30}),
    'diagnostic tracks live recording cues without affecting playback');
   await evaluate("(()=>{window.__taleraV11Test.child.getElementById('cues').textContent=JSON.stringify({cues:[{t:0,index:0},{t:100,index:1},{t:200,index:2},{t:300,index:3}]});return true})()");
   assert.ok(await until("window.__taleraV11Test.child.getElementById('talera-v11-readonly-audit').textContent.includes('Restfoto’s: 2')",{attempts:35,interval:30}));
 }

 // Initiate the REAL audio playback, rather than dispatching a synthetic ended event.
 const clicked=await evaluate("(()=>{const x=window.__taleraV11Test;const b=x.child.getElementById('play'); if(!b)return false;b.click();return true})()");
 assert.equal(clicked,true,mode+': real play button exists');
 assert.ok(await until('window.__taleraV11Test?.child?.body.dataset.stage==="playing"',{attempts:60,interval:40}),
  mode+': native voice playback actually started');
 assert.ok(await until('Boolean(window.__taleraV11Test?.endedReal)',{attempts:100,interval:40}),
  mode+': browser emitted REAL audio ended event');
 assert.ok(await until('window.__taleraV11Test?.events?.some(x=>x.img==="4")',{attempts:80,interval:50}),
  mode+': fifth unused image must be genuinely displayed');
 assert.ok(await until('window.__taleraV11Test?.events?.some(x=>x.img==="5")',{attempts:105,interval:50}),
  mode+': sixth unused image must be displayed four seconds later');
 const result=await evaluate("(()=>{const x=window.__taleraV11Test;return {mode:x.mode,count:x.initialized.itemCount,ended:x.endedReal,endedAt:x.endedAt,events:x.events.map(e=>({t:e.t,img:e.img,video:e.video,count:e.count,stage:e.stage})),tailStage:x.child.body.dataset.stage}})()");
 const images=result.events.filter(e=>e.img==='4'||e.img==='5');
 assert.ok(images.some(e=>e.img==='4')&&images.some(e=>e.img==='5'));
 assert.ok(images.find(e=>e.img==='4').t>=result.endedAt-20,'fifth photo does not show before voice finishes');
 assert.ok(images.find(e=>e.img==='5').t-images.find(e=>e.img==='4').t>=3500,'photo hold is ~4 seconds');
 assert.ok(result.events.some(e=>e.stage==='playing'),'voice playback existed');
 const auditText=await evaluate("window.__taleraV11Test.child.getElementById('talera-v11-readonly-audit').textContent");
 assert.match(auditText,/Stem afgelopen: JA/);
 assert.match(auditText,/Na stem gezien: 5, 6/,'actual photo elements reported by independent read-only observer');
 console.log('PASS read-only audit saw real input and real post-voice images',JSON.stringify({mode,summary:auditText}));
 if(withVideo){
  assert.ok(await until('window.__taleraV11Test?.child?.querySelector("#view > video")?.muted===false',{attempts:110,interval:50}),
   mode+': ORIGINAL video with original sound begins only after photos');
  const video=await evaluate('({muted:window.__taleraV11Test.child.querySelector("#view > video")?.muted,count:window.__taleraV11Test.count.textContent})');
  assert.equal(video.muted,false,'original video remains unmuted');
  assert.match(video.count,/Video met geluid/);
 }
 console.log('PASS native audio->remaining photo #5->photo #6->original videos',JSON.stringify({mode,withVideo,endedAt:result.endedAt,observed:images.slice(0,5)}));
 await evaluate("(()=>{const x=window.__taleraV11Test;x.observer?.disconnect();window.removeEventListener('message',x.onMessage);x.frame.remove();delete window.__taleraV11Test;return true})()");
}
await testMode('present',{withVideo:true});
await testMode('record',{withVideo:false});

// The prior iframe-only diagnostic was not visible on the user's presentation.
for(const route of ['/present','/tell']){
 await command('Page.navigate',{url:base+route});
 assert.ok(await until('document.readyState==="complete"&&location.pathname==='+JSON.stringify(route)),
  route+': TALERA page loads');
 assert.ok(await until('Boolean(document.getElementById("talera-v11-debug-toggle"))',{attempts:70,interval:100}),
  route+': front-side Diagnose button exists outside the photograph iframe');
 const buttonState=await evaluate("(()=>{\n const b=document.getElementById('talera-v11-debug-toggle');\n const r=b.getBoundingClientRect(),s=getComputedStyle(b);\n return {visible:r.width>75&&r.height>35&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,\n   zIndex:getComputedStyle(b.parentElement).zIndex,display:s.display,position:getComputedStyle(b.parentElement).position};\n})()");
 assert.equal(buttonState.visible,true,route+': button is inside viewport');
 assert.equal(buttonState.position,'fixed',route+': button floats above main photograph');
 assert.ok(Number(buttonState.zIndex)>100000,route+': button has top visual layer');
 assert.equal(await evaluate("(()=>{document.getElementById('talera-v11-debug-toggle').click();return !document.getElementById('talera-v11-debug-panel').hidden})()"),
  true,route+': opening Diagnose shows the panel');
 assert.ok(await until("document.getElementById('talera-v11-debug-panel')?.textContent.includes('Vertelspeler-venster:')",{attempts:70,interval:60}),
  route+': diagnostic reports whether a real narrator iframe exists, even when there is none');
 const localSummary=await evaluate("document.getElementById('talera-v11-debug-text').textContent");
 assert.match(localSummary,/Opgeslagen herinneringen:|Lokale geheugenbibliotheek:/,
  route+': parent diagnostic reads local storage status without relying on the narrator iframe');
 console.log('PASS front-side Diagnose button',route,JSON.stringify(buttonState));
 if(route==='/present'){
  const result=await command('Runtime.evaluate',{expression:"new Promise(resolve=>{\n const f=document.createElement('iframe');\n f.className='talera-zero-present-frame';\n f.style.cssText='width:3px;height:3px;position:fixed;left:0;bottom:0';\n f.src='/vertelmodus-embed?mode=present&diagnostic_browser_test=1';\n f.addEventListener('load',()=>{\n  const svg='<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"8\" height=\"8\"></svg>';\n  const items=Array.from({length:6},()=>({type:'image',name:'fake',blob:new Blob([svg],{type:'image/svg+xml'})}));\n  f.contentWindow.postMessage({\n   taleraZero:true,type:'INIT',items,\n   cues:[{t:0,index:0},{t:100,index:1},{t:200,index:2},{t:300,index:3}],\n   duration:500,voice:null\n  },location.origin);\n  resolve(true);\n },{once:true});\n document.body.appendChild(f);\n})",returnByValue:true,awaitPromise:true,userGesture:true});
  if(result.exceptionDetails)throw Error('iframe diagnostic test: '+result.exceptionDetails.text);
  assert.equal(result.result.value,true);
  assert.ok(await until("document.getElementById('talera-v11-debug-text')?.textContent.includes('Restfoto’s: 2')",{attempts:70,interval:100}),
   'real narrator iframe counts reach the TOP-LEVEL diagnostic panel');
  const report=await evaluate("document.getElementById('talera-v11-debug-text').textContent");
  assert.match(report,/Media 6/);
  assert.match(report,/Spraak: 4 tijdcodes, 4 foto’s/);
  assert.match(report,/Restfoto’s: 2 \(5, 6\)/);
  console.log('PASS iframe report visible in parent Diagnosis panel',report.replace(/\n/g,' | '));
  // Deliberately mock only the store's read method in the disposable Chrome
  // session. This proves that a real locally saved voice is diagnosed even
  // when the narrator iframe itself is not supplying any useful report.
  const synthetic=await evaluate("(()=>{\n const runtime=window.__taleraLifelineDemo,store=window.TaleraMemories;\n if(!runtime||!store||typeof runtime.currentMemory!=='function'||typeof store.list!=='function')\n  return {error:'No current memory or local store API'};\n const current=runtime.currentMemory, list=store.list;\n const id='local-v11-synthetic-readonly';\n store.list=async()=>[{\n  id,items:[\n   {kind:'photo'},{kind:'photo'},{kind:'photo'},\n   {kind:'photo'},{kind:'photo'},{kind:'photo'},{kind:'audio'}\n  ],\n  narrationCues:[{t:0,index:0},{t:1300,index:1},\n   {t:3000,index:2},{t:4500,index:3}]\n }];\n runtime.currentMemory=()=>({id:'pwa:'+id,storyId:id});\n window.__taleraV11RestoreDemo=()=>{store.list=list;runtime.currentMemory=current};\n const buttons=[...document.querySelectorAll('#talera-v11-debug-panel button')];\n buttons.find(b=>b.textContent==='Ververs')?.click();\n return {success:true};\n})()");
  assert.equal(synthetic.success,true,'runtime and local memory source exposed in the real page');
  assert.ok(await until("document.getElementById('talera-v11-debug-text').textContent.includes('Stem opgeslagen: JA')",{attempts:80,interval:50}),
    'parent must recognize an existing audio item independently of narrator messages');
  const storeReport=await evaluate("document.getElementById('talera-v11-debug-text').textContent");
  assert.match(storeReport,/Opgeslagen herinneringen: 1 \| Met stemopname: 1/);
  assert.match(storeReport,/Tijdcodes: 4 \| Gebruikte foto’s: 4 \(1, 2, 3, 4\)/);
  assert.match(storeReport,/Ontbrekende foto’s: 2 \(5, 6\)/);
  assert.match(storeReport,/Vertelspeler-venster: AANWEZIG/);
  await evaluate('window.__taleraV11RestoreDemo();delete window.__taleraV11RestoreDemo;true');
  console.log('PASS parent diagnoses locally stored narration with 2 unmatched photos',storeReport.replace(/\n/g,' | '));

 }
}
ws.close();
