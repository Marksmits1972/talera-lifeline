import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './worker.mjs';

const origin='https://talera-iphone-photo-picker-lab-20261106.workers.dev';

test('isolated photos experiment returns HTML without any storage actions',async()=>{
  const response=await worker.fetch(new Request(origin+'/'));
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/text\/html/);
  assert.equal(response.headers.get('x-talera-lab'),'iphone-photo-picker-isolated-20261106');
  const html=await response.text();
  assert.match(html,/type="file"/);
  assert.match(html,/accept="image\/\*,video\/\*"/);
  assert.match(html,/multiple/);
  assert.match(html,/80% iPhone-ruimte/);
  assert.match(html,/geen cloud-upload/);
  assert.ok(!html.includes('https://api.'));
  assert.ok(!html.includes('fetch('));
  assert.ok(!html.includes('XMLHttpRequest'));
  assert.ok(!html.includes('localStorage'));
});

test('worker is read-only and has no write/API routes',async()=>{
  for(const method of ['POST','PUT','PATCH','DELETE']){
    const response=await worker.fetch(new Request(origin+'/',{method}));
    assert.equal(response.status,405);
  }
  assert.equal((await worker.fetch(new Request(origin+'/api/upload'))).status,404);
  assert.equal((await worker.fetch(new Request(origin+'/index.html',{method:'HEAD'}))).status,200);
});

test('worker health identifies the separately deployed lab',async()=>{
  const r=await worker.fetch(new Request(origin+'/health'));
  assert.equal(r.status,200);
  assert.deepEqual(await r.json(),{name:'talera-iphone-photo-picker-lab-20261106',isolated:true,upload:false});
});
