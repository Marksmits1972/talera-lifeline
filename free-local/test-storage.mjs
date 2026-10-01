import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {makePages,htmlHeaders} from './pages.js';
await import(process.env.FREE_INDEXEDDB_MODULE||'fake-indexeddb/auto');
const {storage}=await import('./storage.browser.js');
test('stored bytes and metadata survive closing and reopening the database',async()=>{
  const blob=new Blob(['photo-bytes'],{type:'image/jpeg'});
  await storage.putMedia({id:'photo-a',blob,thumbnail:new Blob(['thumb'])});
  await storage.save({id:'story-a',photos:[{id:'photo-a'}],storyText:'My story',date:'2021-04-10',status:'published'});
  const db=await new Promise(resolve=>{const request=indexedDB.open('talera-free-local-v1',1);request.onsuccess=()=>resolve(request.result);});
  const persisted=await new Promise(resolve=>{db.transaction('stories').objectStore('stories').get('story-a').onsuccess=e=>resolve(e.target.result);});
  db.close();
  assert.equal(persisted.storyText,'My story');assert.equal(persisted.schemaVersion,1);
  assert.equal(await (await storage.media('photo-a')).blob.text(),'photo-bytes');
  assert.equal(await blob.text(),'photo-bytes');
});
test('missing photo bytes abort the entire update and preserve the previous story',async()=>{
  await assert.rejects(storage.save({id:'story-a',photos:[{id:'missing'}],storyText:'Wrong'}));
  assert.equal((await storage.story('story-a')).storyText,'My story');
  assert.equal(await (await storage.media('photo-a')).blob.text(),'photo-bytes');
});
test('removing a photo commits metadata and removes only the local media copy',async()=>{
  await storage.save({id:'story-a',photos:[],storyText:'My story'});
  assert.equal((await storage.story('story-a')).photos.length,0);
  assert.equal(await storage.media('photo-a'),undefined);
});
test('empty or invalid media cannot be saved',async()=>{
  await assert.rejects(storage.putMedia({id:'bad',blob:new Blob([]),thumbnail:new Blob(['x'])}));
  assert.equal(await storage.media('bad'),undefined);
});
test('generated UI scripts parse, make no fetch calls and disable cloud speech recognition',async()=>{
  const pages=await makePages();
  for(const html of Object.values(pages)){
    for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
    assert.doesNotMatch(html,/\bfetch\(/);
    assert.match(html,/type="module" src="\/local\/bridge.js(?:\?[^"]*)?"/);
  }
  assert.match(pages.tell,/const SpeechRecognition=null/);
  assert.match(htmlHeaders['content-security-policy'],/connect-src 'self'/);
});
test('isolated deployment has no D1 or R2 bindings and does not route to legacy APIs',async()=>{
  const config=await readFile(new URL('./wrangler.jsonc',import.meta.url),'utf8');
  assert.doesNotMatch(config,/d1_databases|r2_buckets|xxory-test|talera-r19-reference/);
  const source=await readFile(new URL('./worker.js',import.meta.url),'utf8');
  assert.match(source,/\['GET','HEAD'\]/);
  assert.doesNotMatch(source,/env\.DB|env\.MEDIA|fetch\(.*https/);
});
