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
 ['timelineBridge','window.__taleraTimelineRuntime=',1400],
 ['photoHost','const stage=',3200],
 ['presentationDispose','function disposePresentation(',2200],
 ['narratedFrame','function taleraInlineSetFrame(',3700],
 ['voiceEnded','function taleraInlineVoiceEnded(',5900],
 ['mediaRead','async function hydrate(',1700],
 ['soundControlInit','window.__taleraAudioControls',2100],
 ['renderDots','function renderDots(',4600],
 ['renderDotsAlternate','renderDots=(memory)',3600],
 ['dotsMarkup','photoDots',1500],
 ['orangeDotCss','dot-active',1200]
];
for(const [name,marker,bytes] of markers){
 const at=page.indexOf(marker),sample=at>=0?page.slice(at,at+bytes):'';
 console.log('TALERA_ACTUAL_PRESENT_ENGINE',JSON.stringify({
  name,found:at>=0,offset:at,length:page.length,sample
 }));
}
