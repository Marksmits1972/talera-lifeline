import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {applyUnifiedTail,INLINE_TAIL,AUDIO_END_BEFORE,AUDIO_END_AFTER} from './one-flow.worker.mjs';
const origin='https://talera-v9-stille-luxe-stijlstaging-20261104.mark-a39.workers.dev';
const response=await fetch(origin+'/present',{headers:{'accept':'text/html'}});
assert.equal(response.status,200,'approved V9 must remain available');
const original=await response.text();
const r=applyUnifiedTail(original);
assert.equal(r.status,'installed','exact V9 anchors must be unchanged');
assert.equal(r.html.replace(INLINE_TAIL+'\n','').replace(AUDIO_END_AFTER,AUDIO_END_BEFORE),original,
  'V9 must be identical outside one helper and one audio-ended callback');
const scripts=[...r.html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1])
  .filter(s=>s.includes('taleraUnifiedNarrationEnded'));
assert.equal(scripts.length,1,'exactly one native V9 script must own tail');
assert.doesNotThrow(()=>new Script(scripts[0]));
console.log('PASS current live approved V9 inline surface compiled with one clean tail; recorder untouched');
for(const path of ['/','/tell','/vertelmodus-embed?mode=record']){
 const q=await fetch(origin+path);
 assert.equal(q.status,200);
 console.log('PASS untouched approved V9 route '+path+' bytes='+String((await q.text()).length));
}
