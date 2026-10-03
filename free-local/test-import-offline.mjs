import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const moduleSource=await readFile(new URL('./photos.browser.js',import.meta.url),'utf8');
let concurrent=0,maxConcurrent=0;
globalThis.__testCompact=async(file,id)=>{concurrent++;maxConcurrent=Math.max(maxConcurrent,concurrent);await new Promise(resolve=>setTimeout(resolve,1));concurrent--;if(file.name==='broken.jpg')throw Error('bad image');return {id,blob:file,thumbnail:file};};
const source=moduleSource.replace("import {compactPhoto} from './media.js';",'const compactPhoto=globalThis.__testCompact;').replace("'./copy.browser.js'",JSON.stringify(new URL('./copy.browser.js',import.meta.url).href));
const {importPhotos,photoDate}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const one=new File(['one'],'one.jpg',{type:'image/jpeg'}),same=new File(['one'],'same.jpg',{type:'image/jpeg'}),two=new File(['two'],'two.jpg',{type:'image/jpeg'}),broken=new File(['bad'],'broken.jpg',{type:'image/jpeg'});
const committed=[],progress=[];
const result=await importPhotos([one,same,broken,two],{getStory:()=>({photos:[]}),existingFingerprints:async()=>[],commit:async(item,photo)=>committed.push(photo),preview:()=>{},progress:(...values)=>progress.push(values)});
assert.equal(maxConcurrent,1);assert.equal(result.done,2);assert.equal(result.duplicates,1);assert.equal(result.failed,1);assert.equal(committed.length,2);assert.ok(progress.some(values=>values[4]==='bad image'));
const many=await importPhotos(Array.from({length:20},(_,i)=>new File([String(i)],i+'.jpg',{type:'image/jpeg'})),{getStory:()=>({photos:[]}),existingFingerprints:async()=>[],commit:async()=>{},preview:()=>{},progress:()=>{}});assert.equal(many.done,20);
assert.equal(await photoDate(new File(['no EXIF'],'plain.jpg',{type:'image/jpeg',lastModified:Date.parse('2020-01-01')})),'');
// Build a little-endian EXIF DateTimeOriginal fixture.
const bytes=new Uint8Array(100),view=new DataView(bytes.buffer);bytes.set([255,216,255,225]);view.setUint16(4,96);bytes.set(new TextEncoder().encode('Exif\0\0'),6);const base=12;view.setUint16(base,0x4949);view.setUint16(base+2,42,true);view.setUint32(base+4,8,true);view.setUint16(base+8,1,true);view.setUint16(base+10,0x8769,true);view.setUint32(base+18,26,true);view.setUint16(base+26,1,true);view.setUint16(base+28,0x9003,true);view.setUint16(base+30,2,true);view.setUint32(base+32,20,true);view.setUint32(base+36,44,true);bytes.set(new TextEncoder().encode('2020:06:10 12:30:00\0'),base+44);
assert.equal(await photoDate(new File([bytes],'exif.jpg',{type:'image/jpeg'})),'2020-06-10');
const swSource=await readFile(new URL('./sw.browser.js',import.meta.url),'utf8'),listeners={},stored=new Map(),removed=[],outgoing=[];
const cache={addAll:async paths=>{for(const path of paths)stored.set(path,path);},match:async path=>stored.get(path)};
vm.runInNewContext(swSource,{URL,self:{location:{origin:'https://local.test'},clients:{claim:async()=>{}},addEventListener:(event,fn)=>listeners[event]=fn},caches:{open:async()=>cache,keys:async()=>['unrelated-app','talera-free-old','talera-free-reader-speech-v7'],delete:async name=>removed.push(name)},fetch:async request=>{outgoing.push(request);return 'network';}});
let pending;listeners.install({waitUntil:p=>pending=p});await pending;assert.ok(stored.has('/tell'));assert.ok(stored.has('/local/recorder.js'));
listeners.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(removed,['talera-free-old']);
listeners.fetch({request:{url:'https://local.test/tell?new=1',method:'GET'},respondWith:p=>pending=p});assert.equal(await pending,'/tell');assert.equal(outgoing.length,0);
let intercepted=false;for(const request of [{url:'https://local.test/api/story',method:'POST'},{url:'https://external.test/anything',method:'GET'},{url:'https://local.test/private-story-content',method:'GET'}])listeners.fetch({request,respondWith:()=>intercepted=true});assert.equal(intercepted,false);
for(const name of ['bridge','recorder','experience','photos','backup','backup-ui','storage','media']){const code=await readFile(new URL('./'+name+'.browser.js',import.meta.url),'utf8');assert.doesNotMatch(code,/\bfetch\s*\(|sendBeacon|XMLHttpRequest|WebSocket/);}
console.log('Import/offline checks passed: serial queue, exact duplicates, failed-photo isolation, EXIF date versus lastModified, 20-photo sequential import, full shell caching, offline navigation and restricted static network surface.');
