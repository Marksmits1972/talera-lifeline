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
// Read-only audit of the ACTUAL /mijn-leven page, never assume /present is equivalent.
const videoStart=original.indexOf('function taleraInlineLoadVideo(');
const videoEnd=original.indexOf('function taleraInlineSetFrame(',videoStart);
console.log('NATIVE_V9_SILENT_VIDEO_SOURCE',JSON.stringify({start:videoStart,end:videoEnd,source:videoStart>=0?original.slice(videoStart,Math.min(videoEnd>videoStart?videoEnd:videoStart+11000,videoStart+11000)):''}));
for(const route of ['/sw.js']){
 const res=await fetch(origin+route);
 const js=await res.text();
 console.log('NATIVE_V9_SERVICE_WORKER',JSON.stringify({route,status:res.status,length:js.length,source:js.slice(0,12500)}));
}
const actualRes=await fetch(origin+'/mijn-leven',{headers:{accept:'text/html'}});
const actual=await actualRes.text();
const needles=[
 'function taleraInlinePlayMedia(s,frame,muted,finished){',
 'function taleraInlineReplayNext(s){',
 'function taleraInlineVoiceEnded(s){',
 'function showPhoto(memory,index,manual=false){',
 'function taleraInlineLoadVideo(',
 'function taleraInlineSetFrame(',
 'function taleraInlineInstallAudioControls()',
 'memoryStoryScroll',
 'talera-v61-inline-video',
 'talera-v61-audio-permission-hint',
 'TALERA_CLOSED_MEMORY_CORE_20261106',
 'video.autoplay=true',
 'video.play()',
 'audio.play()',
 '<video',
 'play-button'
];
const locs=Object.fromEntries(needles.map(needle=>[needle,actual.indexOf(needle)]));
const attempted=applyClosedCore(actual);
const scriptCount=(actual.split('<script').length-1);
const scriptHeads=actual.split('<script').slice(1).map(s=>s.slice(0,s.indexOf('>')).trim().slice(0,220));
const probes=['Beluister','beluister','play()','play(','autoplay','playsinline','video','Video','onclick','media','iframe','src=','import(','<button','controls'];
const probeReport=Object.fromEntries(probes.map(needle=>{const pos=actual.indexOf(needle);return [needle,{at:pos,context:pos<0?'':actual.slice(Math.max(0,pos-160),pos+360)}]}));
const iframeKeys=['talera-zero-present-frame','createElement(\'iframe\')','createElement("iframe")','/present?','/present','contentWindow','frame.src','iframe.src','taleraZero','new URL('];
const iframeSpots={};
for(const key of iframeKeys){
 let at=0,found=[],count=0;
 while((at=actual.indexOf(key,at))>=0&&count<16){
  found.push({at,near:actual.slice(Math.max(0,at-270),Math.min(actual.length,at+480))});
  at+=key.length;count++;
 }
 iframeSpots[key]=found;
}
console.log('MYN_LEVEN_IFRAME_BINDINGS',JSON.stringify(iframeSpots));
const relevantTags=['talera-v8-handoff-script','talera-v18-phases-js','talera-flow-v16','talera-flow-v17-time'];
for(const id of relevantTags){
 const start=actual.indexOf('<script id="'+id+'"');
 const open=start>=0?actual.indexOf('>',start):-1;
 const end=open>=0?actual.indexOf('</script>',open):-1;
 const source=open>=0&&end>=0?actual.slice(open+1,end):'';
 console.log('MYN_LEVEN_SCRIPT_'+id,JSON.stringify({length:source.length,source:source.slice(0,22000)}));
}
console.log('MYN_LEVEN_DEEP_SOURCE',JSON.stringify({scripts:scriptHeads,probes:probeReport}));
console.log('MYN_LEVEN_CODE_AUDIT',JSON.stringify({status:actualRes.status,
 bytes:actual.length,url:actualRes.url,patchStatus:attempted.status,
 title:actual.includes('<title>')?actual.split('<title>')[1].split('</title>')[0]:null,
 anchors:locs,scriptCount}));
for(const path of ['/','/tell','/vertelmodus-embed?mode=record']){
 const r=await fetch(origin+path);
 assert.equal(r.status,200);
 console.log('PASS original protected V9 route '+path+' bytes='+String((await r.text()).length));
}
