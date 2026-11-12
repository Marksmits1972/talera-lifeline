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

const origin=page.indexOf('const MEMORIES = [');
const tail=page.slice(origin);
const closers=['\n];','\n].','\n].concat(','\n  ];','\n].map('];
for (const closer of closers) {
 const end=tail.indexOf(closer);
 console.log('TALERA_REFERENCE_ARRAY_CLOSER',JSON.stringify({
  closer,end,context:end>=0?tail.slice(Math.max(0,end-450),end+1750):''
 }));
}
for(const marker of ['Array.from({length:450','Array.from({length:','const STRESS','stressMemories','DEMO_MEMORIES',
 'const memory','function writeMemory(','function nearestMemory(','function taleraRebuildDensity(']){
 const at=page.indexOf(marker);
 console.log('TALERA_REFERENCE_SEED_DETAIL',JSON.stringify({marker,at,source:at<0?'':page.slice(Math.max(0,at-250),at+2600)}));
}
