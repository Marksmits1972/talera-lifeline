// Unit contracts on the actual one-component code. Real browser/audio acceptance is separate.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./f5-voice-orb.browser.js',import.meta.url),'utf8');
let clock=0,serial=0,scheduled=new Map(),micLevel=0,sourceDisconnects=0,closed=0,decodeCalls=0;
const doc={hidden:false};
class Element{
  constructor(tag){this.tagName=tag;this.style={};this.children=[];this.dataset={};this.hidden=false;this.textContent=''}
  append(...els){els.forEach(e=>this.appendChild(e))}
  appendChild(e){e.parent=this;this.children.push(e);return e}
  remove(){this.parent.children=this.parent.children.filter(x=>x!==this)}
  setAttribute(){}
  getContext(){return null} // test signal + lifecycle independently of browser canvas rendering
}
doc.createElement=tag=>new Element(tag);
class TestAudioContext{
  resume(){return Promise.resolve()}
  close(){closed++;return Promise.resolve()}
  createMediaStreamSource(stream){
    assert.equal(stream.id,'existing-mic');return {connect(target){assert.equal(target.kind,'analyser')},disconnect(){sourceDisconnects++}};
  }
  createAnalyser(){return {kind:'analyser',disconnect(){},getFloatTimeDomainData(data){
    for(let i=0;i<data.length;i++)data[i]=micLevel*Math.sin(i*2*Math.PI/32);
  }}}
}
class TestOfflineAudioContext{
  constructor(channels,length,rate){assert.equal(rate,8000)}
  async decodeAudioData(buffer){
    decodeCalls++;assert.equal(buffer.byteLength,16_000);
    const pcm=new Int16Array(buffer);const data=Float32Array.from(pcm,v=>v/32768);
    return {length:data.length,sampleRate:8000,duration:1,numberOfChannels:1,getChannelData:()=>data};
  }
}
const ctx={window:{AudioContext:TestAudioContext,OfflineAudioContext:TestOfflineAudioContext,
 TaleraI18n:{setText(el,key){assert.equal(key,'core.tell.voiceOrbGuide');el.textContent='Richttijd: ongeveer 5 minuten'}}},
 document:doc,Blob,performance:{now:()=>clock},
 requestAnimationFrame(fn){scheduled.set(++serial,fn);return serial},
 cancelAnimationFrame(id){scheduled.delete(id)}};
vm.runInNewContext(source+'\nthis.mount=taleraMountVoiceOrb;',ctx);
const host=new Element('stage'),orb=ctx.mount(host,{recording:true}),root=host.children[0];
assert.equal(host.children.length,1);assert.equal(root.dataset.level,'0.000');
const timing=root.children[1],progress=timing.children[0],time=timing.children[1],guide=timing.children[2];
assert.equal(progress.style.display,'none');assert.equal(guide.textContent,'Richttijd: ongeveer 5 minuten');
assert.equal(time.hidden,true,'Recorder owns its existing single elapsed clock');
orb.prepareMic();const rec={state:'recording'};orb.startMic({id:'existing-mic'},rec);
function runFrames(n){for(let i=0;i<n;i++){
 clock+=50;const callbacks=[...scheduled.values()];scheduled.clear();callbacks.forEach(cb=>cb(clock));
}}
micLevel=.4;runFrames(10);assert.ok(Number(root.dataset.level)>.15,'Voice amplitude drives ORB');
micLevel=0;runFrames(40);assert.ok(Number(root.dataset.level)<.003,'Silence settles');
micLevel=.4;runFrames(10);rec.state='paused';runFrames(1);assert.equal(root.dataset.level,'0.000');
rec.state='recording';runFrames(10);assert.ok(Number(root.dataset.level)>.15,'Resume uses same signal');
orb.stopMic();assert.equal(closed,1);assert.equal(sourceDisconnects,1);assert.equal(scheduled.size,0);
assert.equal(root.dataset.level,'0.000');
const pcm=new Int16Array(8000);
for(let i=0;i<4000;i++)pcm[i]=Math.round(9000*Math.sin(i*2*Math.PI/24)); // half tone, half silence
const original=new Blob([pcm],{type:'audio/test-fixture'});
await orb.preparePlayback(original);
assert.equal(decodeCalls,1);assert.equal(progress.style.display,'block');
assert.equal(time.hidden,false);assert.equal(guide.style.display,'none');
const audio={duration:1,currentTime:.1,paused:false,ended:false,seeking:false,readyState:4};
for(let i=0;i<10;i++){clock+=90;orb.playbackTick(audio)}
assert.ok(Number(root.dataset.level)>.1);assert.equal(progress.value,.1);
audio.currentTime=.75;for(let i=0;i<40;i++){clock+=90;orb.playbackTick(audio)}
assert.ok(Number(root.dataset.level)<.003,'Actual later silent audio samples settle the orb');
audio.currentTime=.3;audio.paused=true;orb.playbackTick(audio);assert.equal(root.dataset.level,'0.000');
assert.equal(progress.value,.3,'Visualization never seeks or advances the native audio clock');
await orb.preparePlayback(original);assert.equal(decodeCalls,1,'Resume must not decode original again');
audio.currentTime=1;audio.ended=true;orb.playbackTick(audio);assert.equal(root.dataset.level,'0.000');
assert.equal(progress.value,1);assert.equal(time.textContent,'00:01 / 00:01');
orb.destroy();assert.equal(host.children.length,0);assert.equal(scheduled.size,0);
assert.ok(!/\b(fetch|indexedDB|localStorage|sessionStorage|MediaRecorder|createMediaElementSource)\s*\(/.test(source));
console.log('TALERA_VOICE_ORB_SIGNAL_LIFECYCLE_CONTRACT_PASS');
