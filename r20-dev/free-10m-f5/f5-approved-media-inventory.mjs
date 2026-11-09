// Read-only inventory: exact approved anonymous /tell and nested recorder behavior.
// No accounts, media uploads, Cloudflare writes, or changes to approved UI.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const source=readFileSync('r20-dev/free-10m-delivery/generated/reference-tell.html','utf8');
const present=readFileSync('r20-dev/free-10m-delivery/generated/reference-present.html','utf8');
const bases={
 whatsapp:'https://talera-design-cleanup-fase1-test-20261107.mark-a39.workers.dev',
 previouslyWorking:'https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev',
 registeredOfficial:'https://talera-account-birthdate-test-20261107.mark-a39.workers.dev'
};
const digest=s=>createHash('sha256').update(s).digest('hex');
function excerpts(label,s,expressions,max=24){
 console.log('MEDIA_SOURCE_LENGTH',JSON.stringify({label,bytes:Buffer.byteLength(s),sha256:digest(s)}));
 for(const [kind,pattern] of expressions){
   const all=[...s.matchAll(pattern)];
   const items=all.slice(0,max).map(m=>{
     const at=m.index;
     return {at,before:s.slice(Math.max(0,at-180),at).replace(/\s+/g,' ').slice(-180),
       match:s.slice(at,at+Math.min(250,kind.includes('poster')?500:260)).replace(/\s+/g,' ').slice(0,260)};
   });
   console.log('MEDIA_SOURCE_HITS',JSON.stringify({label,kind,total:all.length,items}));
 }
}
const patterns=[
 ['muted',/\.muted\s*=|\bmuted\b|volume\s*=|\bdefaultMuted\b/gi],
 ['poster',/poster|thumbnail|thumb|preview|captureStream|toDataURL|videoFrame|videostill/gi],
 ['video creation',/createElement\(['"]video|<video|video\.play\(/gi],
 ['recorder',/MediaRecorder|VOICE|recording|recorder|mic|narration/gi],
 ['tile',/work-tiles|tile\[|preview:|videoPoster/gi]
];
excerpts('WhatsApp tell original',source,patterns,14);
excerpts('WhatsApp present original',present,patterns.slice(0,2),10);
for(const [key,url] of Object.entries(bases)){
 for(const suffix of ['/tell','/vertelmodus-embed?mode=record']){
  try{
    const r=await fetch(url+suffix,{headers:{accept:'text/html'},redirect:'error',signal:AbortSignal.timeout(18000)});
    assert.equal(r.status,200,'Public approved source '+key+suffix);
    assert.ok(!r.headers.get('set-cookie'),'Unexpected private cookie in public source');
    const s=await r.text();
    excerpts(key+suffix,s,patterns.slice(0,3),key==='whatsapp'?18:8);
  }catch(e){console.log('MEDIA_SOURCE_READ_ERROR',JSON.stringify({key,suffix,error:String(e.message||e)}))}
 }
}
console.log('TALERA_MEDIA_SOURCE_INVENTORY_COMPLETE');
