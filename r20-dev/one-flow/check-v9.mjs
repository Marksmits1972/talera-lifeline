import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {applyClosedCore,CORE_MARKER} from './one-flow.worker.mjs';
const origin='https://talera-v9-stille-luxe-stijlstaging-20261104.mark-a39.workers.dev';
const response=await fetch(origin+'/present',{headers:{accept:'text/html'}});
assert.equal(response.status,200,'protected native V9 must remain available');
const original=await response.text();
const {html,status}=applyClosedCore(original);
assert.equal(status,'installed','native V9 anchors must be proven before any deployment');
assert.ok(html.includes(CORE_MARKER));
assert.equal(html.includes('taleraUnifiedNarrationEnded'),false,
 'old extra narrated-tail engine must NOT exist');
assert.equal(html.includes('taleraUnifiedWarmVideos'),false,
 'no second hidden or prewarmed audible video layer');
assert.equal(html.includes("if(manual&&memory?._zeroItems?.some(item=>item.kind==='audio'))return;"),true,
 'native tap-to-next-frame disabled on all narrated phases');
assert.equal(html.includes("memory.previewImage=photos[coverIndex]"),true,
 'whole timeline tile has fixed first visual cover independent of current photo');
assert.equal(html.includes("s.phase='narration';\n      taleraInlineVoiceEnded(s)"),false,
 'the engine must never artificially reopen the narration phase');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .map(m=>m[1]).filter(s=>s.includes(CORE_MARKER));
assert.equal(scripts.length,1,'one native V9 script must own the full cycle');
assert.doesNotThrow(()=>new Script(scripts[0]),
 'live native HTML must compile with the rewritten engine');
console.log('PASS one closed native storyteller compiled; old layers ABSENT');
for(const path of ['/','/tell','/vertelmodus-embed?mode=record']){
 const r=await fetch(origin+path);
 assert.equal(r.status,200);
 console.log('PASS original protected V9 route '+path+' bytes='+String((await r.text()).length));
}
