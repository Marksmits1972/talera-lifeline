// Read-only mobile Chrome check for the header strip.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
const dir=process.env.TALERA_CDP_DIR;
assert.ok(dir,'Chrome profile required');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let tab;
for(let n=0;n<100;n++){
 try{
  const port=Number((await readFile(join(dir,'DevToolsActivePort'),'utf8')).split('\n')[0]);
  const r=await fetch('http://127.0.0.1:'+port+'/json');
  tab=(await r.json()).find(x=>x.type==='page');
  if(tab?.webSocketDebuggerUrl)break;
 }catch{}
 await sleep(150);
}
assert.ok(tab?.webSocketDebuggerUrl,'Chrome debugging tab not found');
const ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
let serial=0;const pending=new Map();
ws.addEventListener('message',e=>{
 const m=JSON.parse(String(e.data));
 if(!m.id||!pending.has(m.id))return;
 const q=pending.get(m.id);pending.delete(m.id);
 m.error?q.reject(Error(JSON.stringify(m.error))):q.resolve(m.result);
});
const send=(method,params={})=>new Promise((resolve,reject)=>{
 const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));
});
async function evalPage(expression){
 const r=await send('Runtime.evaluate',{expression,returnByValue:true});
 if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));
 return r.result?.value;
}
await send('Page.enable');await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
const probe=[
'(()=>{',
'const header=document.querySelector("#app > header.top");',
'const back=header?.querySelector("#back");',
'const title=header?.querySelector("strong");',
'if(!header||!back||!title)return null;',
'const bounds=header.getBoundingClientRect(),control=back.getBoundingClientRect();',
'return {headerColor:getComputedStyle(header).backgroundColor,bodyColor:getComputedStyle(document.body).backgroundColor,',
'headerHeight:bounds.height,buttonHeight:control.height,title:title.textContent.trim(),',
'buttonId:back.id,headerClass:header.className,hasHeader:bounds.width>0};',
'})()'].join('');
async function inspect(origin){
 await send('Page.navigate',{url:origin+'/tell'});
 let result=null;
 for(let i=0;i<100;i++){
  result=await evalPage(probe);
  if(result?.hasHeader)break;
  await sleep(100);
 }
 assert.ok(result?.hasHeader,'TALERA header never appeared');
 console.log('HEADER_CHECK',origin,JSON.stringify(result));
 return result;
}
const old=await inspect('https://talera-design-headerfix-test-20261107.mark-a39.workers.dev');
const corrected=await inspect('https://talera-design-cleanup-fase4-test-20261107.mark-a39.workers.dev');
assert.equal(old.headerColor,'rgb(248, 247, 244)','Previously approved warm header must remain warm');
assert.equal(corrected.bodyColor,'rgb(248, 247, 244)','Existing warm page color is reference');
assert.equal(corrected.headerColor,corrected.bodyColor,'Header and page must have identical background');
assert.equal(corrected.headerClass,old.headerClass,'Existing header element remains');
assert.equal(corrected.headerHeight,old.headerHeight,'Header geometry must not move');
assert.equal(corrected.buttonHeight,old.buttonHeight,'Back button hit area unchanged');
assert.equal(corrected.title,old.title,'TALERA title unchanged');
assert.equal(corrected.buttonId,old.buttonId,'Back navigation element unchanged');

async function inspectRail(origin){
 await send('Page.navigate',{url:origin+'/mijn-leven'});
 let ready=false;
 for(let i=0;i<100;i++){
  ready=await evalPage('location.pathname==="/mijn-leven" && Boolean(document.querySelector("style#talera-stille-luxe"))');
  if(ready)break;
  await sleep(100);
 }
 assert.ok(ready,'Home page stylesheet not ready');
 const properties=await evalPage([
 '(()=>{',
 'let sheetBody=document.querySelector("#sheetBody");',
 'if(!sheetBody){sheetBody=document.createElement("div");sheetBody.id="sheetBody";document.body.appendChild(sheetBody)}',
 'let box=sheetBody.querySelector("#v17-timebox");',
 'if(!box){box=document.createElement("div");box.id="v17-timebox";sheetBody.appendChild(box)}',
 'return ["v17-rail-ruler","v17-rail-progress"].map(name=>{',
 'let rail=box.querySelector("."+name);',
 'if(!rail){rail=document.createElement("div");rail.className=name;box.appendChild(rail)}',
 'const style=getComputedStyle(rail);',
 'return {name,backgroundColor:style.backgroundColor,backgroundImage:style.backgroundImage,',
 'borderTopWidth:style.borderTopWidth,borderTopStyle:style.borderTopStyle,boxShadow:style.boxShadow}});',
 '})()'
 ].join(''));
 assert.equal(properties?.length,2,'Both timeline rails measured');
 console.log('RAIL_CHECK',origin,JSON.stringify(properties));
 return properties;
}
const beforeRail=await inspectRail('https://talera-design-headerfix-test-20261107.mark-a39.workers.dev');
const afterRail=await inspectRail('https://talera-design-cleanup-fase4-test-20261107.mark-a39.workers.dev');
assert.deepEqual(afterRail,beforeRail,'Two timeline rails must compute identically');
for(const rail of afterRail){
 assert.equal(rail.backgroundColor,'rgba(0, 0, 0, 0)','The approved timeline rails remain invisible');
 assert.equal(rail.backgroundImage,'none','No unexpected rail background image');
}
console.log('PASS: computed timeline rail styles identical between approved and phase 4 test');

ws.close();
console.log('PASS: warm header matches page; back button and dimensions preserved');
