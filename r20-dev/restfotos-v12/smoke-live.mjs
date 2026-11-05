/* Verify LIVE source is byte-for-byte original outside TWO exact changes. */
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {
 ORIGINAL_VOICE_END,PATCHED_VOICE_END,PHOTO_TAIL_HELPER,
 ORIGINAL_RESTORE,PATCHED_RESTORE
} from './restfotos.worker.mjs';

const base='https://talera-v12-restfotos-veilige-test-20261105.mark-a39.workers.dev';
const original='https://talera-v9-stille-luxe-stijlstaging-20261104.mark-a39.workers.dev';

for(const [path,kind] of [
 ['/vertelmodus-embed?mode=present','embed'],
 ['/vertelmodus-embed?mode=record','embed'],
 ['/present','present'],
 ['/','original'],
 ['/tell','original']
]){
 const [newRes,originalRes]=await Promise.all([
  fetch(base+path,{headers:{'cache-control':'no-cache'}}),
  fetch(original+path,{headers:{'cache-control':'no-cache'}})
 ]);
 assert.equal(newRes.status,200,'V12 '+path);
 assert.equal(originalRes.status,200,'V9 '+path);
 const [newHtml,origHtml]=await Promise.all([newRes.text(),originalRes.text()]);
 let reconstructed=newHtml;
 if(kind==='embed'){
  assert.equal(newRes.headers.get('x-talera-v12-restfotos'),'installed');
  assert.equal(newHtml.split(PHOTO_TAIL_HELPER).length-1,1,'ONE helper');
  assert.equal(newHtml.split(PATCHED_VOICE_END).length-1,1,'ONE voice-ended change');
  reconstructed=newHtml.replace(PHOTO_TAIL_HELPER+'\n'+PATCHED_VOICE_END,ORIGINAL_VOICE_END);
  assert.doesNotMatch(newHtml,/taleraV10PlayRemainingPhotosThenVideos|taleraV11ShowRemainingPhotos|talera-v11-readonly-audit|talera-v11-front-diagnostic/);
 }else if(kind==='present'){
  assert.equal(newRes.headers.get('x-talera-v12-restfotos'),'installed');
  assert.equal(newHtml.split(PATCHED_RESTORE).length-1,1);
  reconstructed=newHtml.replace(PATCHED_RESTORE,ORIGINAL_RESTORE);
  assert.doesNotMatch(newHtml,/talera-v11-front-diagnostic/);
 }else{
  assert.equal(newRes.headers.get('x-talera-v12-restfotos'),null);
 }
 assert.equal(reconstructed,origHtml.replaceAll(original,base),
  'V9 and V12 HTML MUST be byte-identical except approved lines and host metadata');
 const scripts=[...newHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
 for(const [i,script] of scripts.entries())if(script.trim())
  assert.doesNotThrow(()=>new Script(script,{filename:kind+'-script-'+i+'.js'}),'parser: '+kind+' script '+i);
 console.log('PASS V12 live',path,kind==='original'?'original exactly':'single surgical change');
}
console.log('5/5 real HTTP source comparisons passed');
