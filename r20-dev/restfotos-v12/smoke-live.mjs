import assert from 'node:assert/strict';
import {INLINE_PHOTO_HELPER,ORIGINAL_AUDIO_END,PATCHED_AUDIO_END} from './restfotos.worker.mjs';
const a='https://talera-v12-restfotos-veilige-test-20261105.mark-a39.workers.dev';
const b='https://talera-v9-stille-luxe-stijlstaging-20261104.mark-a39.workers.dev';
for(const p of ['/present','/','/tell','/vertelmodus-embed?mode=present','/vertelmodus-embed?mode=record']){
 const [r,t]=await Promise.all([fetch(a+p),fetch(b+p)]);
 assert.equal(r.status,200);assert.equal(t.status,200);
 const [x,y]=await Promise.all([r.text(),t.text()]);
 let z=x;
 if(p==='/present'){
  assert.equal(r.headers.get('x-talera-v12-inline-restfotos'),'installed');
  assert.equal(x.split(INLINE_PHOTO_HELPER).length-1,1);
  assert.equal(x.split(PATCHED_AUDIO_END).length-1,1);
  z=x.replace(INLINE_PHOTO_HELPER+'\n','').replace(PATCHED_AUDIO_END,ORIGINAL_AUDIO_END);
 }else assert.equal(r.headers.get('x-talera-v12-inline-restfotos'),null);
 assert.equal(z,y.replaceAll(b,a),'V12 and original V9 differ only at native voice end');
 console.log('PASS live parity',p);
}
