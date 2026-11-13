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

assert.ok(page.includes('id="talera-f5-narrated-swipe-band"'),
  'Narrated memories must expose the existing photo strip during horizontal swipe');
assert.ok(page.includes(
  'body.talera-v61-narration-visual #photoStage .talera-photo-strip.talera-wheel-strip.is-visible'),
  'Original 11-page wheel must be visible ONLY while actually active in narration');
assert.ok(page.includes(
  'const ordinaryTap=Boolean(window.__taleraTimelineRuntime?.currentMemory()?._taleraLocal);'),
  'Narrated and ordinary local memories must use the same real-swipe entry condition');
assert.ok(page.includes('if(d.ordinaryTap&&d.started&&!d.wheelOpened)'),
  'A tap may not reveal the wheel; a horizontal swipe must open it at the first threshold');
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
const documentListeners=new Map();
const dispatch=(type,event={})=>{
  for(const handler of [...(documentListeners.get(type)||[])])handler(event);
};
class FakeBlob{constructor(size=17){this.size=size}}
let blockNextVoice=false;
class FakeElement{
 constructor(tag){this.tag=tag;this.style={position:'relative'};this.children=[];
  this.hidden=false;this.paused=true;this.currentTime=0;this.readyState=4;this.duration=90;
  this.blockOnce=tag==='audio'&&blockNextVoice;
  if(this.blockOnce)blockNextVoice=false}
 appendChild(node){this.children.push(node);node.parentElement=this;return node}
 remove(){this.removed=true;if(this.parentElement)
  this.parentElement.children=this.parentElement.children.filter(x=>x!==this)}
 setAttribute(k,v){if(k!=='muted')this[k]=v}
 removeAttribute(k){if(k!=='muted')delete this[k]}
 load(){}
 pause(){this.paused=true;this.onpause?.()}
 play(){
  if(this.blockOnce){
    this.blockOnce=false;
    return Promise.reject(Object.assign(new Error('iOS gesture required'),{name:'NotAllowedError'}));
  }
  this.paused=false;this.onplay?.();return Promise.resolve()}
}
const host=new FakeElement('host');const stage=new FakeElement('stage');
stage.parentElement=host;
let current=memory.id;
const bodyClasses=new Set();
const fakeDots=Array.from({length:memory._zeroFrames.length},()=>({
  active:false,classList:{toggle(name,on){assert.equal(name,'active');this.active=on}}
}));
const ctx={
 window:{__taleraAudioControls:{isEnabled:()=>false}}, // Presenter is OFF; narrator must not import it.
 navigator:{audioSession:{type:'ambient'}},
 document:{createElement(tag){const el=new FakeElement(tag);made.push(el);return el},
  querySelectorAll(selector){assert.equal(selector,'.talera-photo-dot');return fakeDots},
  body:{classList:{add(x){bodyClasses.add(x)},remove(x){bodyClasses.delete(x)}}},
  addEventListener(name,fn){
    if(!documentListeners.has(name))documentListeners.set(name,new Set());
    documentListeners.get(name).add(fn);
  },
  removeEventListener(name,fn){documentListeners.get(name)?.delete(fn)}},
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
assert.equal(audio.muted,false,
  'Narrator voice must be unmuted even if presenter audio preference is OFF');
assert.equal(ctx.navigator.audioSession.type,'playback',
  'iPhone PWA narration must request audio-session playback, not ambient');
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
// Narrator video compositor must stop immediately at horizontal swipe intent,
// independently of the existing photo-wheel gesture implementation.
const voiceLayer=host.children.find(x=>x.className==='talera-independent-narrator-layer'&&!x.removed);
const validPhotoTarget={
 closest(selector){return selector==='#memoryStoryScroll'?{}:null}
};
await silentVideo.play(); // Simulate active video decode on a real iPhone.
assert.equal(silentVideo.paused,false);
dispatch('pointerdown',{pointerId:9,pointerType:'touch',isPrimary:true,
  clientX:180,clientY:200,target:validPhotoTarget});
assert.equal(audio.paused,false,'A tap without horizontal movement must keep voice playing');
dispatch('pointermove',{pointerId:9,clientX:177,clientY:239});
assert.equal(audio.paused,false,'Vertical scrolling must not pause narrator voice');
assert.equal(silentVideo.paused,false,'Vertical scrolling must not pause video');
dispatch('pointermove',{pointerId:9,clientX:132,clientY:204});
assert.equal(audio.paused,true,'Horizontal swipe must pause the voice timer immediately');
assert.equal(silentVideo.paused,true,'Horizontal swipe must stop iOS video decoding immediately');
assert.equal(voiceLayer.style.visibility,'hidden',
  'Narrator video compositor must be hidden behind the existing wheel');
dispatch('pointerup',{pointerId:9});
dispatch('talera:wheel-motion',{detail:{active:false}});
await Promise.resolve();
assert.equal(voiceLayer.style.visibility,'','Canceled swipe must restore narrator layer');
assert.equal(audio.paused,false,'Canceled swipe must restore audible narration');
assert.equal(silentVideo.paused,false,'Canceled swipe must restore silent video preview');
assert.equal(ctx.navigator.audioSession.type,'playback');

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
assert.equal(videos.at(-1).muted,true,
  'Original video image must stay muted: sound is played by the existing voice element');
assert.strictEqual(made.filter(x=>x.tag==='audio').at(-1),audio,
  'The SAME audio element that spoke the voice must reproduce original soundtrack');
assert.equal(audio.src,'blob:synthetic-video-C',
  'The unlocked voice element must play the unmodified original video bytes');
assert.equal(audio.muted,false,'Replayed original audio must be audible');
assert.equal(audio.paused,false,'Original sound must start automatically, no new button tap');
assert.equal(host.children.some(x=>x.tag==='button'&&!x.removed),false,
  'The original-video round must NOT require a separate Listen button');
assert.equal(fakeDots[2].classList.active,true,'Original-video round selects correct dot');
const finalPicture=made.filter(x=>x.tag==='video').at(-1);
await finalPicture.play();
dispatch('pointerdown',{pointerId:14,pointerType:'touch',isPrimary:true,
  clientX:202,clientY:210,target:validPhotoTarget});
dispatch('pointermove',{pointerId:14,clientX:166,clientY:212});
assert.equal(finalPicture.paused,true,'Original final video must also freeze during swipe');
assert.equal(audio.paused,true,'Original soundtrack must also freeze during swipe');
assert.equal(voiceLayer.style.visibility,'hidden');

current='pwa:another-memory';motor.stop();
assert.equal(bodyClasses.has('talera-v61-narration-visual'),false);
assert.equal(ctx.navigator.audioSession.type,'ambient',
  'Narrator must restore original native audio session when switching motors');
assert.equal(documentListeners.get('pointerdown')?.size||0,0,
  'Narrator pointer listeners must be removed after story change');
assert.equal(documentListeners.get('talera:wheel-motion')?.size||0,0,
  'Narrator wheel-finish listener must never leak into ordinary presentation');
assert.ok(host.children.every(x=>x.removed||!x.className?.includes('talera-independent-narrator-layer')));
assert.ok(revoked.includes('blob:independent-voice'));

// A persistent global presenter OFF must not silence the separated narrator.
current=memory.id;
ctx.window.__taleraAudioControls.isEnabled=()=>false;
await motor.open(memory);
await Promise.resolve();await Promise.resolve();
const independentAudio=made.filter(x=>x.tag==='audio').at(-1);
assert.equal(independentAudio.muted,false);
assert.equal(ctx.navigator.audioSession.type,'playback');
independentAudio.onended();
await new Promise(resolve=>setImmediate(resolve));
const photoTimer=timeouts.at(-1);photoTimer.fn();
await new Promise(resolve=>setImmediate(resolve));
assert.equal(made.filter(x=>x.tag==='video').at(-1).muted,true,
  'Original video must be visually muted while audio comes from voice element');
assert.equal(independentAudio.muted,false,
  'Original video soundtrack must be audible independently of presenter');
assert.equal(independentAudio.src,'blob:synthetic-video-C');
motor.stop();
assert.equal(ctx.navigator.audioSession.type,'ambient');

// Simulate genuine iOS sound autoplay failure. Must expose an accessible
// native-gesture Listen button; button handler directly calls media.play().
blockNextVoice=true;
await motor.open(memory);
await new Promise(resolve=>setImmediate(resolve));
const blockedAudio=made.filter(x=>x.tag==='audio').at(-1);
const permission=host.children.find(x=>x.tag==='button'&&
  x.textContent==='▶ Beluister'&&!x.removed);
assert.ok(permission,'Voice autoplay blocked by iOS must show an actual Listen button');
assert.equal(blockedAudio.paused,true,'iOS blocked autoplay must not be mistaken for playback');
permission.onclick({preventDefault(){},stopPropagation(){}});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(blockedAudio.paused,false,'iPhone Listen gesture must start original voice');
assert.equal(blockedAudio.muted,false);
assert.equal(permission.removed,true);
motor.stop();
assert.equal(ctx.navigator.audioSession.type,'ambient');

console.log('TALERA_INDEPENDENT_NARRATOR_TEST_PASS',JSON.stringify({
 originalIdsUnchanged:true,repeatSwipesRetained:true,
 recorderAndPresentationSourcesDistinct:true,
 narrationNoPresentationFunctions:true,voiceClockDrivesCues:true,
 videoSilentDuringVoice:true,remainingPhotosAfterVoice:true,
 originalVideoAudioAfterVoice:true,originalSoundUsesUnlockedVoicePlayer:true,
 noSecondListenButton:true,videoCompositorStopsOnSwipe:true,
 tapOrVerticalMoveKeepsPlayback:true,abortedSwipeResumes:true,
 orangeDotsFollowAllCues:true,
 nativeAudioSessionPlayback:true,nativeSessionRestored:true,
 originalAudioIndependentOfPresenter:true,iOSListenGestureRecoverable:true,
 isolatedCleanup:true,
 actualIphoneAccepted:false,productionChanged:false
}));
