/* Browser-level integration: synthetic media only, no user data or writes. */
import assert from 'node:assert/strict';
const base='https://talera-vertel-restbeelden-v10-test-20261105.mark-a39.workers.dev';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let targets;
for(let attempt=0;attempt<50;attempt++){
 try{const res=await fetch('http://127.0.0.1:9223/json');
 if(res.ok){targets=await res.json();if(targets.some(t=>t.type==='page'))break}}
 catch{}
 await sleep(200);
}
const tab=targets?.find(t=>t.type==='page');
assert.ok(tab?.webSocketDebuggerUrl,'Chrome DevTools target unavailable');
const socket=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{
 socket.addEventListener('open',resolve,{once:true});
 socket.addEventListener('error',reject,{once:true});
});
let id=0;
const waiting=new Map();
socket.addEventListener('message',e=>{
 const m=JSON.parse(String(e.data));
 if(!m.id)return;
 const p=waiting.get(m.id);if(!p)return;
 waiting.delete(m.id);
 if(m.error)p.reject(Error(JSON.stringify(m.error)));else p.resolve(m.result);
});
const cdp=(method,params={})=>new Promise((resolve,reject)=>{
 const key=++id;waiting.set(key,{resolve,reject});
 socket.send(JSON.stringify({id:key,method,params}));
});
async function evaluate(expression,awaitPromise=false){
 const response=await cdp('Runtime.evaluate',{
  expression,awaitPromise,returnByValue:true,userGesture:true
 });
 if(response.exceptionDetails)
  throw Error('Chrome script exception: '+response.exceptionDetails.text+' '+
   String(response.exceptionDetails.exception?.description||''));
 return response.result?.value;
}
await cdp('Runtime.enable');
await cdp('Page.enable');
await cdp('Page.navigate',{url:base+'/'});
let ready=false;
for(let i=0;i<100;i++){
 await sleep(100);
 try{ready=await evaluate('location.origin==='+JSON.stringify(base)+' && document.readyState==="complete"')}
 catch{}
 if(ready)break;
}
assert.equal(ready,true,'TALERA home page did not load in Chrome');
const result=await evaluate("new Promise(resolve=>{\n const frame=document.createElement('iframe');\n frame.style.cssText='position:fixed;inset:0;width:100%;height:100%';\n frame.src='/vertelmodus-embed?mode=present&v10synthetic=1';\n const evidence={};\n let initialized=false;\n const watchdog=setTimeout(()=>finish({error:'timeout',evidence}),20000);\n function finish(v){clearTimeout(watchdog);window.removeEventListener('message',onMessage);frame.remove();resolve(v)}\n function onMessage(e){\n  if(e.source!==frame.contentWindow||e.origin!==location.origin||\n     !e.data?.taleraZero||e.data.type!=='INITIALIZED'||initialized)return;\n  initialized=true;evidence.initialized=e.data;\n  const child=frame.contentDocument;\n  const voice=child.getElementById('voice'),count=child.getElementById('count');\n  evidence.presentation=child.body.classList.contains('present');\n  if(!voice||!count){finish({error:'missing voice or count',evidence});return}\n  voice.dispatchEvent(new child.defaultView.Event('ended'));\n  const photo=()=>child.querySelector('#view > img')?.dataset.index??null;\n  setTimeout(()=>{\n   evidence.first=photo();evidence.firstCount=count.textContent;\n   setTimeout(()=>{\n    evidence.second=photo();evidence.secondCount=count.textContent;\n    setTimeout(()=>{\n     evidence.final=photo();evidence.finalCount=count.textContent;\n     finish({evidence});\n    },4250);\n   },4250);\n  },100);\n }\n window.addEventListener('message',onMessage);\n frame.addEventListener('load',()=>{\n  const items=Array.from({length:6},(_,i)=>({\n   blob:new Blob(['<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\"><text x=\"3\" y=\"20\">'+i+'</text></svg>'],{type:'image/svg+xml'}),\n   type:'image',name:'Synthetic '+i\n  }));\n  const voice=new Blob(['fake audio'],{type:'audio/webm'});\n  frame.contentWindow.postMessage({taleraZero:true,type:'INIT',items,voice,\n   cues:[{t:0,index:0},{t:1000,index:1},{t:2500,index:2},{t:4000,index:3}],\n   duration:6000},location.origin);\n },{once:true});\n document.body.append(frame);\n})",true);
socket.close();
assert.ok(!result.error,'real player error '+JSON.stringify(result));
const e=result.evidence;
assert.equal(e.presentation,true,'present mode must be enabled');
assert.equal(e.initialized.itemCount,6,'real player must receive six images');
assert.equal(e.first,'4','fifth photo must be displayed immediately after audio');
assert.equal(e.second,'5','sixth photo must follow automatically');
assert.equal(e.final,'5','final photo stays visible at cycle end');
console.log('PASS Chrome real iframe audio ended and six-photo playback',JSON.stringify(e));
