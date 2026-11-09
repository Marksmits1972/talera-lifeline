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

function exact(label,s,needle,before=650,after=4800){
 const i=s.indexOf(needle);
 if(i<0){console.log('MEDIA_EXACT_MISSING',JSON.stringify({label,needle}));return}
 const block=s.slice(Math.max(0,i-before),Math.min(s.length,i+after));
 console.log('MEDIA_EXACT_SOURCE',JSON.stringify({label,needle,at:i,excerpt:block}));
}
for(const [label,url] of Object.entries({whatsapp:bases.whatsapp,previouslyWorking:bases.previouslyWorking})){
 for(const route of ['/tell','/vertelmodus-embed?mode=record']){
  const res=await fetch(url+route,{redirect:'error',signal:AbortSignal.timeout(17000)});
  assert.equal(res.status,200);
  const s=await res.text();
  if(route==='/tell'){
   exact(label+' '+route,s,'async function taleraV61MakeVideoPreview',150,4100);
   exact(label+' '+route,s,'function taleraV61MountNativeCover',120,3300);
   exact(label+' '+route,s,"talera-v61-native-cover",500,2600);
   exact(label+' '+route,s,'previewBlobs.set',120,2700);
  }else{
   exact(label+' '+route,s,"el.muted=true;el.defaultMuted=true",950,3100);
   exact(label+' '+route,s,'function taleraReplayNext()',450,3200);
   exact(label+' '+route,s,'function setMedia(',200,4200);
   exact(label+' '+route,s,'function taleraZero',300,2000);
  }
 }
}


{
 const s=source;
 const patterns=[
   ['video-audio-property',/\.muted\s*=\s*(?:true|false)|\.volume\s*=|\.defaultMuted\s*=|setAttribute\(['"]muted/gi],
   ['native-cover-js',/v\.className\s*=\s*['"]talera-v61-native-cover/gi],
   ['thumbnail-render',/function\s+(?:refreshPreview|renderTiles|renderWork|drawFrame|renderGroup|renderTile)\b|previewBlobs\.get|<div class="video"|videoIcon/gi],
   ['top-level-video',/createElement\(['"]video['"]\)|<video\b/gi],
   ['recorder-iframe',/vertelmodus-embed|taleraZero|narrationCues|taleraV61RecStart/gi]
 ];
 for(const [kind,re] of patterns){
  const matches=[...s.matchAll(re)];
  const hits=matches.slice(0,kind==='thumbnail-render'?30:80).map(m=>{
   const p=m.index;return {at:p,text:s.slice(Math.max(0,p-500),Math.min(s.length,p+(kind==='native-cover-js'?3500:1300)))};
  });
  console.log('MEDIA_DEEP_HITS',JSON.stringify({kind,total:matches.length,hits}));
 }
}

console.log('TALERA_MEDIA_SOURCE_INVENTORY_COMPLETE');
