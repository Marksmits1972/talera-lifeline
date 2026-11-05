/* Read-only check: only one source edit in the native narration player. */
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {
 VOICE_END_ORIGINAL,VOICE_END_WITH_PHOTOS,PHOTO_HELPER,
 READ_ONLY_AUDIT_SCRIPT,READ_ONLY_AUDIT_ID,
 FRONT_DIAG_SCRIPT,FRONT_DIAG_ID
} from './restfotos.worker.mjs';

const base='https://talera-vertel-restfotos-v11-test-20261105.mark-a39.workers.dev';
const originalBase='https://talera-v9-stille-luxe-stijlstaging-20261104.mark-a39.workers.dev';

for(const [path,patched] of [
 ['/vertelmodus-embed?mode=present',true],
 ['/vertelmodus-embed?mode=record',true],
 ['/',false],['/present','front'],['/tell','front']
]){
 const [a,b]=await Promise.all([
  fetch(base+path,{headers:{'cache-control':'no-cache'}}),
  fetch(originalBase+path,{headers:{'cache-control':'no-cache'}})
 ]);
 assert.equal(a.status,200,path+' new staging status');
 assert.equal(b.status,200,path+' protected style status');
 const [newHtml,oldHtml]=await Promise.all([a.text(),b.text()]);
 assert.ok(newHtml.length>200,path+' returns real page');
 if(patched===true){
  assert.equal(a.headers.get('x-talera-v11-photos'),'installed');
  assert.ok(newHtml.includes(PHOTO_HELPER),'only one photo helper added');
  assert.ok(newHtml.includes(VOICE_END_WITH_PHOTOS));
  assert.equal(newHtml.split(PHOTO_HELPER).length-1,1,'one helper only');
  assert.equal(newHtml.split(VOICE_END_WITH_PHOTOS).length-1,1,'one native voice handler only');
  assert.doesNotMatch(newHtml,/taleraV10SavedStartOriginalVideoRound|taleraV10PendingStillIndices/);
  const auditTag='<script id="'+READ_ONLY_AUDIT_ID+'">'+READ_ONLY_AUDIT_SCRIPT+'</script>';
  assert.ok(newHtml.includes(auditTag),'read-only audit script is appended once');
  assert.equal(newHtml.split(auditTag).length-1,1);
  const reverted=newHtml.replace(auditTag,'').replace(PHOTO_HELPER+'\n'+VOICE_END_WITH_PHOTOS,VOICE_END_ORIGINAL);
  assert.equal(reverted,oldHtml.replaceAll(originalBase,base),'original delivered player is byte-identical aside from normal per-host absolute metadata URLs');
  const scripts=[...newHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]);
  assert.ok(scripts.length,'embed scripts exist');
  for(let i=0;i<scripts.length;i++)if(scripts[i].trim())
   assert.doesNotThrow(()=>new Script(scripts[i],{filename:'v11-live-embed-'+i}),
    'actual served JavaScript must parse');
 }else if(patched==='front'){
  assert.equal(a.headers.get('x-talera-v11-front-diagnostic'),'installed');
  const tag='<script id="'+FRONT_DIAG_ID+'">'+FRONT_DIAG_SCRIPT+'</script>';
  assert.equal(newHtml.split(tag).length-1,1,'only one front diagnostic script is appended');
  assert.equal(newHtml.replace(tag,''),oldHtml.replaceAll(originalBase,base),
    'the complete original present/tell page must remain byte-identical apart from the temporary debug button');
  assert.doesNotThrow(()=>new Script(FRONT_DIAG_SCRIPT),'temporary parent debug script must parse');
  assert.match(FRONT_DIAG_SCRIPT,/talera-v11-debug-toggle/);
  assert.match(FRONT_DIAG_SCRIPT,/Kopieer/);
  assert.doesNotMatch(FRONT_DIAG_SCRIPT,/indexedDB|localStorage|fetch\s*\(|voice\.play\s*\(|taleraStartOriginalRound\s*=/);
 }else{
  assert.equal(a.headers.get('x-talera-v11-photos'),null);
  assert.equal(newHtml,oldHtml.replaceAll(originalBase,base),'home and other pages unchanged');
 }
 console.log('PASS V11 real HTTP',path,patched?'single safe native voice-call extension':'byte-exact original');
}
console.log('V11 live original-source comparison: 5/5 passed');
