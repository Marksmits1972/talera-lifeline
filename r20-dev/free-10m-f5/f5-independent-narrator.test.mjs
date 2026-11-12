// TALERA F5 narrator isolation: source contract + actual synthetic state machine.
// No separate app, no cloud media, no customer accounts or live publication.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {referencePages} from './generated/public-template-map.mjs';
const dir='r20-dev/free-10m-f5/';
const base='r20-dev/free-10m-delivery/public/';
const source=readFileSync(dir+'f5-independent-narrator.browser.js','utf8');
const page=readFileSync(base+referencePages['/present'].slice(1),'utf8');
const record=readFileSync(base+referencePages['/vertelmodus-embed-record'].slice(1),'utf8');
const original=readFileSync(base+referencePages['/vertelmodus-embed'].slice(1),'utf8');
const worker=readFileSync(dir+'f5-worker.mjs','utf8');
assert.notEqual(referencePages['/vertelmodus-embed'],
  referencePages['/vertelmodus-embed-record']);
assert.match(record,/TALERA_RECORD_ENGINE_ONLY independent source copy/);
assert.ok(!original.includes('TALERA_RECORD_ENGINE_ONLY'),'Original presentation code changed');
assert.ok(worker.includes("'/vertelmodus-embed-record':'/vertelmodus-embed'"),
  'Worker still sends recording through presentation asset');
assert.ok(page.includes('const taleraIndependentNarrator=taleraCreateIndependentNarrator'));
assert.ok(page.includes("if(memory._zeroItems?.some(item=>item.kind==='audio'))"));
assert.ok(page.includes('return; // No ordinary presentation functions for voice memories.'));
assert.ok(page.includes('function taleraInlineOrdinaryStep(s,index)'),
  'Existing ordinary presentation must remain unchanged');
assert.ok(!/taleraInline|__taleraV31SelectPhoto|scheduleAuto|showPhoto\(/.test(source),
  'Narrator must not execute ordinary presentation timers, event hooks or controls');
assert.ok(source.includes('mediaId:frames[index].key'),'Narrator cues must use original media IDs');
const sandbox={};
vm.runInNewContext(source+
  '\nthis.plan=taleraIndependentNarrationPlan;this.create=taleraCreateIndependentNarrator;',sandbox);
const memory={
 id:'pwa:local-narrator-synthetic',
 _zeroItems:[{kind:'audio',key:'voice-original'}],
 _zeroFrames:[
  {kind:'photo',key:'photo-A',url:'blob:photo-A'},
  {kind:'photo',key:'photo-B',url:'blob:photo-B'},
  {kind:'video',key:'video-C'},
  {kind:'photo',key:'photo-D',url:'blob:photo-D'},
  {kind:'video',key:'video-E'}
 ],
 _taleraNarrationCues:[
  {t:0,mediaId:'photo-A',index:3},
  {t:12000,mediaId:'video-C',index:0,videoAtMs:400},
  {t:21000,mediaId:'photo-B',index:2},
  {t:28000,mediaId:'photo-A',index:3},
  {t:35000,mediaId:'video-C',index:1,videoAtMs:200}
 ]
};
const plan=sandbox.plan(memory);
assert.deepEqual(JSON.parse(JSON.stringify(plan.cues.map(c=>c.t))),
  [0,12000,21000,28000,35000]);
assert.deepEqual(JSON.parse(JSON.stringify(plan.cues.map(c=>c.mediaId))),
  ['photo-A','video-C','photo-B','photo-A','video-C']);
assert.deepEqual(JSON.parse(JSON.stringify(plan.cues.map(c=>c.index))),[0,2,1,0,2],
  'Stable IDs, not stale indexes, own all swipes');
assert.deepEqual(JSON.parse(JSON.stringify(plan.remainingPhotos.map(f=>f.key))),['photo-D']);
assert.deepEqual(JSON.parse(JSON.stringify(plan.videos.map(f=>f.key))),['video-C'],
  'Only video referenced by a cue is repeated once with original audio');
const invalid=structuredClone(memory);
invalid._taleraNarrationCues=[{t:100,mediaId:'different-account-photo',index:0}];
assert.throws(()=>sandbox.plan(invalid),/oorspronkelijke media-ID/);
const early=structuredClone(memory);
early._taleraNarrationCues=[{t:900,mediaId:'photo-B',index:3}];
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.plan(early).cues.map(c=>c.t))),
  [0,900]);
const noCues=structuredClone(memory);
noCues._taleraNarrationCues=[];
assert.equal(sandbox.plan(noCues).cues[0].mediaId,'photo-A');

// Browser engine runs entirely within its own DOM and media state.
// Test actual lifecycle with synthetic Blob/File references; never use
// the original Talera presentation controller as a mocked dependency.
const made=[],revoked=[],intervals=[],timeouts=[];
class FakeBlob{constructor(size=17){this.size=size}}
class FakeElement{
 constructor(tag){this.tag=tag;this.style={position:'relative'};this.children=[];
  this.hidden=false;this.paused=true;this.currentTime=0;this.readyState=4;this.duration=90}
 appendChild(node){this.children.push(node);node.parentElement=this;return node}
 remove(){this.removed=true;if(this.parentElement)
  this.parentElement.children=this.parentElement.children.filter(x=>x!==this)}
 setAttribute(k,v){if(k!=='muted')this[k]=v}
 removeAttribute(k){if(k!=='muted')delete this[k]}
 load(){}
 pause(){this.paused=true;this.onpause?.()}
 play(){this.paused=false;this.onplay?.();return Promise.resolve()}
}
const host=new FakeElement('host');const stage=new FakeElement('stage');
stage.parentElement=host;
let current=memory.id;
const bodyClasses=new Set();
const fakeDots=Array.from({length:memory._zeroFrames.length},()=>({
  active:false,classList:{toggle(name,on){assert.equal(name,'active');this.active=on}}
}));
const ctx={
 window:{__taleraAudioControls:{isEnabled:()=>true}},
 document:{createElement(tag){const el=new FakeElement(tag);made.push(el);return el},
  querySelectorAll(selector){assert.equal(selector,'.talera-photo-dot');return fakeDots},
  body:{classList:{add(x){bodyClasses.add(x)},remove(x){bodyClasses.delete(x)}}},
  addEventListener(){},removeEventListener(){}},
 Blob:FakeBlob,console,
 URL:{createObjectURL:()=>{const x='blob:independent-voice';return x},
  revokeObjectURL(x){revoked.push(x)}},
 getComputedStyle:()=>({position:'relative'}),
 setInterval:(fn,ms)=>{intervals.push({fn,ms});return intervals.length},
 clearInterval(){},
 setTimeout:(fn,ms)=>{timeouts.push({fn,ms});return timeouts.length},
 clearTimeout(){},
 Promise
};
vm.runInNewContext(source+
  '\nthis.create=taleraCreateIndependentNarrator;',ctx);
let fetchedMedia=[];
const motor=ctx.create({
 stage,store:{
  blob:async id=>{assert.equal(id,'voice-original');return new FakeBlob()},
  mediaUrl:async id=>{fetchedMedia.push(id);return 'blob:synthetic-'+id}
 },runtime:{currentMemory:()=>({id:current})}
});
await motor.open(memory);
await Promise.resolve();await Promise.resolve();
const audio=made.find(x=>x.tag==='audio');
assert.ok(audio&&audio.src==='blob:independent-voice',
  'One original voice Blob must own the narrator clock');
assert.equal(audio.muted,false,'Recorded voice MUST be audible when listening is on');
assert.equal(fakeDots[0].classList.active,true,'First orange dot must be active at t=0');
assert.ok(bodyClasses.has('talera-v61-narration-visual'));
assert.ok(made.some(x=>x.tag==='img'&&x.src==='blob:photo-A'),
  'Narration must render media-ID A at t=0 without the presenter');
audio.currentTime=12.1;audio.ontimeupdate();
await Promise.resolve();await Promise.resolve();
const silentVideo=made.find(x=>x.tag==='video');
assert.ok(silentVideo&&silentVideo.muted&&silentVideo.controls===false,
  'Narrated preview must be silent');
assert.ok(fetchedMedia.includes('video-C'));
assert.equal(fakeDots[2].classList.active,true,'Orange video dot must follow voice cue');
assert.equal(fakeDots[0].classList.active,false);
audio.currentTime=21.1;audio.ontimeupdate();
await Promise.resolve();await Promise.resolve();
assert.ok(made.some(x=>x.tag==='img'&&x.src==='blob:photo-B'));
assert.equal(fakeDots[1].classList.active,true,'Orange photo dot must follow voice cue');
audio.currentTime=35.1;audio.ontimeupdate();
await Promise.resolve();await Promise.resolve();
assert.equal(fakeDots[2].classList.active,true,'Repeated video cue must update orange dot');
audio.onended();
await Promise.resolve();await Promise.resolve();
assert.ok(timeouts.some(x=>x.ms===4000),
  'Only AFTER voice ends may unused photos use the post-voice clock');
assert.equal(fakeDots[3].classList.active,true,'Unshown-photo phase moves orange dot');
const s1=timeouts.at(-1);s1.fn(); // Skip synthetic unused photo.
await new Promise(resolve=>setImmediate(resolve)); // Let original ID Blob resolve.
const videos=made.filter(x=>x.tag==='video');
assert.ok(videos.length>=2,'Original soundtrack round must use a new video element');
assert.equal(videos.at(-1).muted,false,
  'Original soundtrack must not inherit narrated preview mute');
assert.equal(fakeDots[2].classList.active,true,'Original-video round selects correct dot');
current='pwa:another-memory';motor.stop();
assert.equal(bodyClasses.has('talera-v61-narration-visual'),false);
assert.ok(host.children.every(x=>x.removed||!x.className?.includes('talera-independent-narrator-layer')));
assert.ok(revoked.includes('blob:independent-voice'));

// A persistent explicit listening OFF must not silently hide the remedy.
// Existing '▶ Beluister' is a real native iPhone gesture and enables both
// the voice AND the subsequent original video in this ONE narrated playback.
current=memory.id;
ctx.window.__taleraAudioControls.isEnabled=()=>false;
await motor.open(memory);
await Promise.resolve();await Promise.resolve();
const offAudio=made.filter(x=>x.tag==='audio').at(-1);
assert.equal(offAudio.muted,true,'Explicit user OFF remains respected');
const permission=host.children.find(x=>x.textContent==='▶ Beluister'&&!x.removed);
assert.ok(permission,'A muted narration must expose the existing Listen action');
permission.onclick({preventDefault(){},stopPropagation(){}});
await Promise.resolve();await Promise.resolve();
assert.equal(offAudio.muted,false,'Listen tap must actually unmute the recording');
assert.ok(permission.removed,'Permission prompt should disappear after the gesture');
offAudio.onended();
await Promise.resolve();await Promise.resolve();
const photoTimer=timeouts.at(-1);photoTimer.fn();
await new Promise(resolve=>setImmediate(resolve)); // Let original ID Blob resolve.
assert.equal(made.filter(x=>x.tag==='video').at(-1).muted,false,
  'After a Listen gesture, original video must also become audible');
motor.stop();

// Missing UI control during iOS cold start must never silently mute voice.
ctx.window.__taleraAudioControls=undefined;
await motor.open(memory);
await Promise.resolve();await Promise.resolve();
const coldAudio=made.filter(x=>x.tag==='audio').at(-1);
assert.equal(coldAudio.muted,false,
  'Absent sound controller must mean audible, not silent default playback');
motor.stop();
console.log('TALERA_INDEPENDENT_NARRATOR_TEST_PASS',JSON.stringify({
 originalIdsUnchanged:true,repeatSwipesRetained:true,
 recorderAndPresentationSourcesDistinct:true,
 narrationNoPresentationFunctions:true,voiceClockDrivesCues:true,
 videoSilentDuringVoice:true,remainingPhotosAfterVoice:true,
 originalVideoAudioAfterVoice:true,orangeDotsFollowAllCues:true,
 explicitOffHasAudibleGesture:true,missingAudioControllerAudible:true,
 isolatedCleanup:true,
 actualIphoneAccepted:false,productionChanged:false
}));
