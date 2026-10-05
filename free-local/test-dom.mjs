const {JSDOM,VirtualConsole}=await import(process.env.FREE_JSDOM_MODULE||'jsdom');
await import(process.env.FREE_INDEXEDDB_MODULE||'fake-indexeddb/auto');
import {createDraft} from './draft.browser.js';
import {storage} from './storage.browser.js';
import {makePages} from './pages.js';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await storage.putMedia({id:'dom-photo',blob:new Blob(['photo']),thumbnail:new Blob(['thumb'])});
await storage.save({id:'dom-story',photos:[{id:'dom-photo'}],title:'Lokale proef',date:'2021-04-10',storyText:'De tekst blijft hier.',status:'published'});
const errors=[];const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM((await makePages()).timeline,{url:'http://localhost/#story=dom-story',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console});
const w=dom.window;w.__createDraft=createDraft;w.__testStorage=storage;w.__copy=(await import('./copy.browser.js')).t;w.Blob=Blob;w.Response=Response;w.URL=URL;
w.requestAnimationFrame=()=>1;w.ResizeObserver=class{observe(){}disconnect(){}};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:t=>({width:String(t).length*6}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});};
w.HTMLElement.prototype.getBoundingClientRect=function(){return {width:390,height:212,left:0,top:0,right:390,bottom:212};};
const dates=await import('./dates.browser.js');w.__dates=dates;
const bridge=(await readFile(new URL('./bridge.browser.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
await w.eval('(async()=>{const createDraft=window.__createDraft;const {validTime,seasonTime,timelineStories,timeLabel}=window.__dates;const storage=window.__testStorage;const compactPhoto=()=>{};const t=window.__copy;const installDateStyle=()=>{};const chooseTime=async()=>null;const installOverview=()=>{};const installTimelineActions=()=>{};const installBulkImport=()=>{};const installTellMedia=()=>({renderManager:async()=>{}});const installGuidedTell=()=>{};const installBackup=()=>{};const installDeviceExperience=()=>{};const installTellExperience=()=>{};const installTimelineExperience=()=>{};const importPhotos=()=>{};'+bridge+'})()');
assert.equal(w.__taleraTimelineRuntime.currentMemory().storyId,'dom-story');
assert.equal(w.document.getElementById('memoryStory').textContent,'Lokale proef');
assert.equal(w.document.getElementById('memoryStoryMore').textContent,'De tekst blijft hier.');
assert.ok(Number.isFinite(w.__taleraTimelineRuntime.centerMs()));
assert.deepEqual(errors,[]);
dom.window.close();
const tellErrors=[];const tellConsole=new VirtualConsole();tellConsole.on('jsdomError',e=>tellErrors.push(e.message));
const tellDom=new JSDOM((await makePages()).tell,{url:'http://localhost/tell#edit=dom-story',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:tellConsole});
const tw=tellDom.window;tw.__dates=dates;tw.__createDraft=createDraft;tw.__testStorage=storage;tw.__copy=(await import('./copy.browser.js')).t;tw.Blob=Blob;tw.Response=Response;tw.URL=URL;tw.requestAnimationFrame=()=>1;tw.ResizeObserver=class{observe(){}disconnect(){}};
await tw.eval('(async()=>{const createDraft=window.__createDraft;const {validTime,seasonTime,timelineStories,timeLabel}=window.__dates;const storage=window.__testStorage;const compactPhoto=()=>{};const t=window.__copy;const installDateStyle=()=>{};const chooseTime=async()=>null;const installOverview=()=>{};const installTimelineActions=()=>{};const installBulkImport=()=>{};const installTellMedia=()=>({renderManager:async()=>{}});const installGuidedTell=()=>{};const installBackup=()=>{};const installDeviceExperience=()=>{};const installTellExperience=()=>{};const installTimelineExperience=()=>{};const importPhotos=()=>{};'+bridge+'})()');
await new Promise(resolve=>setTimeout(resolve,100));
assert.equal(tw.document.getElementById('title').value,'Lokale proef');
assert.equal(tw.document.getElementById('dateInput').value,'2021-04-10');
assert.equal(tw.document.getElementById('storyText').value,'De tekst blijft hier.');
// Drag to a middle position, release, then resize: no snap to open/closed.
const panel=tw.document.getElementById('sheet');
function touch(type,y){
  const event=new tw.Event(type,{bubbles:true,cancelable:true});
  Object.defineProperty(event,'touches',{value:type==='touchend'?[]:[{clientY:y}]});
  Object.defineProperty(event,'changedTouches',{value:[{clientY:y}]});
  panel.dispatchEvent(event);
}
const originalOffset=Number(panel.style.transform.match(/,([\d.]+)px/)[1]);
touch('touchstart',600);touch('touchmove',400);touch('touchend',400);
const heldOffset=Number(panel.style.transform.match(/,([\d.]+)px/)[1]);
assert.ok(Math.abs(heldOffset-(originalOffset-200))<1);
tw.dispatchEvent(new tw.Event('resize'));
assert.equal(Number(panel.style.transform.match(/,([\d.]+)px/)[1]),heldOffset);
tw.document.getElementById('storyText').value='De tekst blijft hier.';
tw.document.getElementById('storyText').dispatchEvent(new tw.Event('input'));
assert.equal(tw.document.getElementById('sheetPreview').textContent,'De tekst blijft hier.');
tw.document.getElementById('sheetClose').click();
// A photo is now sufficient content. Still require a time and never offer unknown date.
tw.document.getElementById('dateInput').value='';
tw.document.getElementById('timelinePublish').click();
assert.ok(tw.document.getElementById('editModal').classList.contains('open'));
assert.equal(tw.document.getElementById('notice').textContent,tw.__copy('addDate'));
tw.document.getElementById('editBtn').click();
tw.document.getElementById('freeTimeKind').value='season';tw.document.getElementById('freeTimeKind').dispatchEvent(new tw.Event('change'));
tw.document.getElementById('freeSeason').value='zomer';tw.document.getElementById('freeSeasonYear').value='2020';tw.document.getElementById('saveEdit').click();
await new Promise(resolve=>setTimeout(resolve,30));
assert.deepEqual((await storage.story('dom-story')).eventTime,{kind:'season',season:'zomer',year:2020});
assert.equal(tw.document.getElementById('dateInput').value,'');assert.equal(tw.document.getElementById('dateText').textContent,'zomer 2020');
assert.equal(tw.document.getElementById('freeUnknownDate'),null);
assert.ok(tw.document.querySelector('#moreModal .free-close'));
// Exercise the real compatibility boundary with a delayed transaction and an
// inherited snapshot whose photo/title fields are obsolete.
const realSave=storage.save;let releaseSave,firstSave=true;
storage.save=async story=>{if(firstSave){firstSave=false;await new Promise(resolve=>{releaseSave=resolve;});}return realSave.call(storage,story);};
const liveText=tw.document.getElementById('storyText');liveText.value='Tijdens de foto-opslag';liveText.dispatchEvent(new tw.Event('input'));
const pendingSave=tw.__taleraFreeApi('/api/storylab-clean/state',{method:'PUT',body:JSON.stringify({photos:[],title:'Oude titel',storyText:'Oude tekst',currentIndex:0})});
for(let i=0;i<50&&!releaseSave;i++)await new Promise(resolve=>setTimeout(resolve,2));
assert.ok(releaseSave);liveText.value='Tijdens de foto-opslag verder verteld';liveText.dispatchEvent(new tw.Event('input'));
releaseSave();const savedResponse=await pendingSave;storage.save=realSave;
assert.equal(savedResponse.ok,true);const liveStory=await storage.story('dom-story');
assert.equal(liveStory.storyText,'Tijdens de foto-opslag verder verteld');
assert.equal(liveStory.title,'Lokale proef');assert.deepEqual(liveStory.photos,[{id:'dom-photo'}]);

assert.deepEqual(tellErrors.filter(e=>!e.includes('navigation')),[]);tellDom.window.close();
process.stdout.write('DOM timeline handoff: passed (canvas mocked; visual/browser QA remains open)\n');
