import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<dialog id="freeStorageInfo"><p>Opslag</p></dialog><div id="memoryDate"></div><div class="app"><article id="memoryStoryScroll"></article></div>',{pretendToBeVisual:true});
const w=dom.window;w.HTMLMediaElement.prototype.pause=()=>{};w.HTMLMediaElement.prototype.load=()=>{};
Object.assign(globalThis,{document:w.document,window:w,innerHeight:800,PointerEvent:w.MouseEvent,Audio:class{pause(){}removeAttribute(){}}});
const stories=[{id:'a',date:'2020-01-01',photos:[{id:'a0'},{id:'a1'},{id:'a2'}]},{id:'b',date:'2020-01-02',photos:[{id:'b0'},{id:'b1'}]}];
const memories=stories.map(story=>({storyId:story.id,fullStory:'Verhaal'}));let current=memories[0],subscriber,releaseFirst;const reads=new Map(),registered=new Map(),visible=[];
const code=(await readFile(new URL('./presentation.browser.js',import.meta.url),'utf8')).replace("'./photo-cache.js'",JSON.stringify(new URL('./photo-cache.browser.js',import.meta.url).href)).replace("'./video.browser.js'",JSON.stringify(new URL('./video.browser.js',import.meta.url).href)).replace("'./dates.browser.js'",JSON.stringify(new URL('./dates.browser.js',import.meta.url).href));
const {installPresentation}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
installPresentation({stories,getMemories:()=>memories,runtime:{subscribe:fn=>subscriber=fn,currentMemory:()=>current,settlePhoto:memory=>visible.push(registered.get(memory.image)),writeMemory:memory=>subscriber(memory)},storage:{story:async()=>{throw new Error('Redundant story read');},media:async id=>{reads.set(id,(reads.get(id)||0)+1);if(id==='a0')await new Promise(resolve=>{releaseFirst=resolve;});const blob=new Blob([id]);blob.photoId=id;return {blob};}},registerPhoto:(url,blob)=>registered.set(url,blob.photoId),releasePhoto:url=>registered.delete(url)});
await subscriber(current);await new Promise(resolve=>setImmediate(resolve));
function tap(){const surface=document.getElementById('memoryStoryScroll');for(const type of ['pointerdown','pointerup']){const event=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:50,clientY:300});Object.defineProperty(event,'pointerId',{value:1});surface.dispatchEvent(event);}}
// Two taps before the initial photo resolves must select photo 3, not repeatedly
// request photo 2, and the old initial load must never overwrite the selection.
tap();tap();await new Promise(resolve=>setImmediate(resolve));assert.equal(visible.at(-1),'a2');
releaseFirst();await new Promise(resolve=>setImmediate(resolve));assert.equal(visible.at(-1),'a2');
assert.equal(reads.get('a0'),1,'Concurrent foreground/prefetch share one read');
assert.equal(reads.get('b0'),1,'Next story first photo is prepared before swiping');
current=memories[1];await subscriber(current);await new Promise(resolve=>setImmediate(resolve));assert.equal(visible.at(-1),'b0');assert.equal(reads.get('b0'),1,'Swipe reuses the warmed photo');
tap();await new Promise(resolve=>setImmediate(resolve));assert.equal(visible.at(-1),'b1');assert.equal(reads.get('b1'),1,'Tap reuses the prepared next photo');
w.dispatchEvent(new w.PageTransitionEvent('pagehide',{persisted:true}));w.dispatchEvent(new w.PageTransitionEvent('pageshow',{persisted:true}));await new Promise(resolve=>setImmediate(resolve));assert.equal(visible.at(-1),'b0');
w.dispatchEvent(new w.PageTransitionEvent('pagehide',{persisted:false}));
const {createPhotoCache}=await import('./photo-cache.browser.js');
let active='keep',cacheReads=0;const retained=new Set();
const bounded=createPhotoCache({limit:3,keep:()=>active,storage:{media:async()=>{cacheReads++;return {blob:new Blob(['image'])};}},register:url=>retained.add(url),release:url=>retained.delete(url)});
const kept=await bounded.get('keep');for(let i=0;i<20;i++)await bounded.get('photo'+i);
assert.equal(retained.size,3);assert.equal((await bounded.get('keep')).url,kept.url);assert.equal(cacheReads,21);
bounded.close();assert.equal(retained.size,0);
dom.window.close();console.log('Photo prefetch: immediate tap intent, stale loads ignored, shared reads, neighbouring/next photos warmed, BFCache restoration.');
