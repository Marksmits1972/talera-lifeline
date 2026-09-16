import assert from 'node:assert/strict';
import test from 'node:test';
import { CLEAN_REBUILD_REV, handleCleanRebuild } from '../xxory-test/src/clean-rebuild-v1.js';
import cleanRouter from '../xxory-test/src/clean-router-worker.js';

class MemoryBucket {
  constructor(){ this.items=new Map(); }
  async put(key, bytes, options={}){
    const data=bytes instanceof ArrayBuffer?new Uint8Array(bytes):new Uint8Array(bytes);
    this.items.set(key,{
      bytes:data,
      size:data.byteLength,
      httpMetadata:options.httpMetadata||{},
      customMetadata:options.customMetadata||{}
    });
  }
  async head(key){
    const item=this.items.get(key);if(!item)return null;
    return {size:item.size,httpMetadata:item.httpMetadata,customMetadata:item.customMetadata};
  }
  async get(key){
    const item=this.items.get(key);if(!item)return null;
    return {
      size:item.size,
      customMetadata:item.customMetadata,
      body:item.bytes,
      writeHttpMetadata(headers){for(const [key,value] of Object.entries(item.httpMetadata||{})){if(value!==undefined)headers.set(key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()),String(value));}}
    };
  }
  async delete(key){this.items.delete(key);}
}

test('clean rebuild page is isolated and contains one real native photo input', async () => {
  const response=await handleCleanRebuild(new Request('https://example.test/clean'),{MEDIA:new MemoryBucket()});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-talera-clean-rebuild'),CLEAN_REBUILD_REV);
  const html=await response.text();
  assert.match(html,/id="photoInput" type="file" accept="image\/\*"/);
  assert.match(html,/URL\.createObjectURL\(file\)/);
  assert.match(html,/fetch\('\/api\/clean\/photo'/);
  assert.doesNotMatch(html,/__taleraOptimizePhoto|__taleraPhotoStaging|orb-app-v79|workblad-v9/);
});

test('clean photo upload stores exact bytes server-side and survives a direct read', async () => {
  const MEDIA=new MemoryBucket();
  const form=new FormData();
  form.append('photo',new File([new Uint8Array([1,2,3,4,5])],'test.jpg',{type:'image/jpeg'}));
  const upload=await handleCleanRebuild(new Request('https://example.test/api/clean/photo',{method:'POST',body:form}),{MEDIA});
  assert.equal(upload.status,201);
  const result=await upload.json();
  assert.equal(result.ok,true);
  assert.ok(result.id);
  assert.equal(result.bytes,5);

  const read=await handleCleanRebuild(new Request('https://example.test'+result.playbackUrl),{MEDIA});
  assert.equal(read.status,200);
  assert.equal(read.headers.get('content-type'),'image/jpeg');
  const bytes=new Uint8Array(await read.arrayBuffer());
  assert.deepEqual([...bytes],[1,2,3,4,5]);
});

test('clean route leaves the existing product untouched outside /clean and /api/clean', async () => {
  const response=await handleCleanRebuild(new Request('https://example.test/v9'),{MEDIA:new MemoryBucket()});
  assert.equal(response,null);
  assert.equal(typeof cleanRouter.fetch,'function');
});
