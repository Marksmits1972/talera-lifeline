// Verify EXACT presentation engine from the current approved public page.
// Read anonymous build snapshot only; never read local user media or accounts.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const page=readFileSync('r20-dev/free-10m-delivery/generated/reference-present.html','utf8');
assert.ok(page.includes('talera-zero-memory-adapter'));
const markers=[
 ['present','async function present(memory)',10300],
 ['activate','function activate(memory)',2400],
 ['inlineSync','function taleraInlineSync(',6100],
 ['inlineOrdinaryStep','function taleraInlineOrdinaryStep(',4700],
 ['inlineSetup','let taleraInline=',2600],
 ['playerHooks','window.__taleraLocalFrameChanged=',1050],
 ['timelineBridge','window.__taleraTimelineRuntime=',1400]
];
for(const [name,marker,bytes] of markers){
 const at=page.indexOf(marker),sample=at>=0?page.slice(at,at+bytes):'';
 console.log('TALERA_ACTUAL_PRESENT_ENGINE',JSON.stringify({
  name,found:at>=0,offset:at,length:page.length,sample
 }));
}

// Read-only source audit of built-in demonstration memories. This diagnostic
// prints only anonymous, build-time reference HTML, never personal IDB content.
for (const marker of ['const MEMORIES','let MEMORIES','MEMORIES.push','1001','1450',
 'sampleRows(','generate','demo','examples','500']){
 const at=page.indexOf(marker),hits=page.split(marker).length-1;
 console.log('TALERA_REFERENCE_GENERATOR_SCAN',JSON.stringify({
  marker,hits,offset:at,
  source:at<0?'':page.slice(Math.max(0,at-300),at+1900)
 }));
}
