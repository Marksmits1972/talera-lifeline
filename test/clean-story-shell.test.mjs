import assert from 'node:assert/strict';
import test from 'node:test';
import { CLEAN_REBUILD_V2_REV, handleCleanRebuildV2 } from '../xxory-test/src/clean-rebuild-v2.js';

class MemoryBucket {
  constructor(){ this.items=new Map(); }
  async put(key, bytes, options={}){
    const data=bytes instanceof ArrayBuffer?new Uint8Array(bytes):new Uint8Array(bytes);
    this.items.set(key,{bytes:data,size:data.byteLength,httpMetadata:options.httpMetadata||{},customMetadata:options.customMetadata||{}});
  }
  async head(key){const item=this.items.get(key);if(!item)return null;return {size:item.size,httpMetadata:item.httpMetadata,customMetadata:item.customMetadata};}
  async get(key){
    const item=this.items.get(key);if(!item)return null;
    return {size:item.size,customMetadata:item.customMetadata,body:item.bytes,writeHttpMetadata(headers){for(const [key,value] of Object.entries(item.httpMetadata||{})){if(value!==undefined)headers.set(key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()),String(value));}}};
  }
  async delete(key){this.items.delete(key);}
}

test('clean story page is photo-first, supports multiple photos, native date, mic and transcript drawer', async () => {
  const response=await handleCleanRebuildV2(new Request('https://example.test/clean'),{MEDIA:new MemoryBucket()});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-talera-clean-rebuild'),CLEAN_REBUILD_V2_REV);
  const html=await response.text();
  assert.match(html,/id="firstPhotoInput" type="file" accept="image\/\*" multiple/);
  assert.match(html,/id="addPhotoInput" type="file" accept="image\/\*" multiple/);
  assert.match(html,/CAROUSEL_MS=2500/);
  assert.match(html,/id="titleInput"/);
  assert.match(html,/id="dateInput" class="dateInput" type="date"/);
  assert.match(html,/id="micButton"/);
  assert.match(html,/navigator\.mediaDevices\.getUserMedia\(\{audio:true\}\)/);
  assert.match(html,/new MediaRecorder/);
  assert.match(html,/id="transcriptSheet"/);
  assert.match(html,/Veeg omhoog voor je verhaal/);
  assert.doesNotMatch(html,/__taleraOptimizePhoto|__taleraPhotoStaging|ORB/);
});

test('clean story photo upload stores exact bytes and reads them back', async () => {
  const MEDIA=new MemoryBucket();
  const form=new FormData();
  form.append('photo',new File([new Uint8Array([8,7,6,5])],'memory.jpg',{type:'image/jpeg'}));
  const upload=await handleCleanRebuildV2(new Request('https://example.test/api/clean/photo',{method:'POST',body:form}),{MEDIA});
  assert.equal(upload.status,201);
  const result=await upload.json();
  assert.equal(result.ok,true);
  assert.equal(result.kind,'photo');
  assert.equal(result.bytes,4);
  const read=await handleCleanRebuildV2(new Request('https://example.test'+result.playbackUrl),{MEDIA});
  assert.equal(read.status,200);
  assert.deepEqual([...new Uint8Array(await read.arrayBuffer())],[8,7,6,5]);
});

test('clean story audio uses the same exact-byte storage rule as the validated audio train', async () => {
  const MEDIA=new MemoryBucket();
  const form=new FormData();
  form.append('audio',new File([new Uint8Array([1,3,3,7,9])],'voice.m4a',{type:'audio/mp4'}));
  const upload=await handleCleanRebuildV2(new Request('https://example.test/api/clean/audio',{method:'POST',body:form}),{MEDIA});
  assert.equal(upload.status,201);
  const result=await upload.json();
  assert.equal(result.ok,true);
  assert.equal(result.kind,'audio');
  assert.equal(result.bytes,5);
  assert.equal(result.mimeType,'audio/mp4');
  const read=await handleCleanRebuildV2(new Request('https://example.test'+result.playbackUrl),{MEDIA});
  assert.equal(read.status,200);
  assert.equal(read.headers.get('content-type'),'audio/mp4');
  assert.deepEqual([...new Uint8Array(await read.arrayBuffer())],[1,3,3,7,9]);
});

test('clean date policy accepts today/past and blocks a future day in the supplied timezone', async () => {
  const today=new Date();
  const localToday=new Date(Date.now()-today.getTimezoneOffset()*60*1000).toISOString().slice(0,10);
  const ok=await handleCleanRebuildV2(new Request('https://example.test/api/clean/date-policy',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({date:localToday,timezoneOffsetMinutes:today.getTimezoneOffset()})}),{});
  assert.equal(ok.status,200);
  assert.equal((await ok.json()).ok,true);

  const futureDate=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
  const future=await handleCleanRebuildV2(new Request('https://example.test/api/clean/date-policy',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({date:futureDate,timezoneOffsetMinutes:0})}),{});
  assert.equal(future.status,422);
  assert.match((await future.json()).error,/toekomst/);
});
