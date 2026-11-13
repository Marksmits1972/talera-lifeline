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
 ['firstVideoPoster','async function taleraClosedMakeCover(',3500],
 ['coverPoster','function taleraClosedMakeCover(',4500],
 ['localMemory','function toMemory(',2600],
 ['storageGlobal','window.TaleraMemories=',4000],
 ['storageApi','TaleraMemories =',3800],
 ['fileStore','function fileStore(',5700],
 ['saveStored','async function save(',5300],
 ['blobStored','async function blob(',1700],
 ['dbNames','var DB_NAME=',3000],
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

const wheelMarkers=[
 ['wheelController','const N=11,pages=[],cache=new Map()',20500],
 ['wheelPointerDown',"story.addEventListener('pointerdown'",10200],
 ['wheelPointerMove',"story.addEventListener('pointermove'",7200],
 ['wheelPointerUp',"story.addEventListener('pointerup'",5900],
 ['wheelGestureBlock',"talera-v61-narration-visual",1600],
 ['wheelRender',"function beginLanding(",2500],
 ['wheelTarget',"id=\"memoryStoryScroll\"",1600],
 ['wheelSource',"function activate(memory)",3200]
];
for(const [name,needle,bytes] of wheelMarkers){
 const at=page.indexOf(needle);
 console.log('TALERA_WHEEL_GESTURE_SOURCE',JSON.stringify({
   name,found:at>=0,offset:at,sample:at<0?'':page.slice(at,at+bytes)
 }));
}
