/* Read-only check: only one source edit in the native narration player. */
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {
 VOICE_END_ORIGINAL,VOICE_END_WITH_PHOTOS,PHOTO_HELPER
} from './restfotos.worker.mjs';

const base='https://talera-vertel-restfotos-v11-test-20261105.mark-a39.workers.dev';
const originalBase='https://talera-v9-stille-luxe-stijlstaging-20261104.mark-a39.workers.dev';

for(const [path,patched] of [
 ['/vertelmodus-embed?mode=present',true],
 ['/vertelmodus-embed?mode=record',true],
 ['/',false],['/present',false],['/tell',false]
]){
 const [a,b]=await Promise.all([
  fetch(base+path,{headers:{'cache-control':'no-cache'}}),
  fetch(originalBase+path,{headers:{'cache-control':'no-cache'}})
 ]);
 assert.equal(a.status,200,path+' new staging status');
 assert.equal(b.status,200,path+' protected style status');
 const [newHtml,oldHtml]=await Promise.all([a.text(),b.text()]);
 assert.ok(newHtml.length>200,path+' returns real page');
 if(patched){
  assert.equal(a.headers.get('x-talera-v11-photos'),'installed');
  assert.ok(newHtml.includes(PHOTO_HELPER),'only one photo helper added');
  assert.ok(newHtml.includes(VOICE_END_WITH_PHOTOS));
  assert.equal(newHtml.split(PHOTO_HELPER).length-1,1,'one helper only');
  assert.equal(newHtml.split(VOICE_END_WITH_PHOTOS).length-1,1,'one native voice handler only');
  assert.doesNotMatch(newHtml,/taleraV10SavedStartOriginalVideoRound|taleraV10PendingStillIndices/);
  const reverted=newHtml.replace(PHOTO_HELPER+'\n'+VOICE_END_WITH_PHOTOS,VOICE_END_ORIGINAL);
  assert.equal(reverted,oldHtml.replaceAll(originalBase,base),'original delivered player is byte-identical aside from normal per-host absolute metadata URLs');
  const scripts=[...newHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]);
  assert.ok(scripts.length,'embed scripts exist');
  for(let i=0;i<scripts.length;i++)if(scripts[i].trim())
   assert.doesNotThrow(()=>new Script(scripts[i],{filename:'v11-live-embed-'+i}),
    'actual served JavaScript must parse');
 }else{
  assert.equal(a.headers.get('x-talera-v11-photos'),null);
  assert.equal(newHtml,oldHtml.replaceAll(originalBase,base),'root and other pages match original after hostname normalization');
 }
 console.log('PASS V11 real HTTP',path,patched?'single safe native voice-call extension':'byte-exact original');
}
console.log('V11 live original-source comparison: 5/5 passed');
