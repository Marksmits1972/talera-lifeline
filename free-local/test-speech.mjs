import assert from 'node:assert/strict';
import {createSpeech,resample} from './speech.browser.js';
const samples=resample(new Float32Array(48000).fill(.1),48000);assert.equal(samples.length,16000);assert.ok(Math.abs(samples[0]-.1)<1e-5);
let worker,contextClosed=0;const messages=[],texts=[],statuses=[];
globalThis.Worker=class{constructor(url,options){assert.equal(url,'/local/speech-worker.js');assert.equal(options.type,'module');worker=this;}postMessage(data){messages.push(data);}terminate(){}};
globalThis.AudioContext=class{async decodeAudioData(){return {sampleRate:48000,getChannelData:()=>new Float32Array(48000*25).fill(.1)};}async close(){contextClosed++;}};
const speech=createSpeech({onText:text=>texts.push(text),onStatus:text=>statuses.push(text),onError:error=>{throw Error(error);}});
await speech.transcribeBlob(new Blob(['local audio']));assert.equal(contextClosed,1);assert.ok(speech.busy());assert.deepEqual(messages,[{kind:'prepare'}]);
worker.onmessage({data:{kind:'ready'}});assert.equal(messages[1].kind,'transcribe');assert.ok(messages[1].samples instanceof Float32Array);assert.equal(messages[1].samples.length,320000);
worker.onmessage({data:{kind:'text',id:1,text:'De eerste woorden.'}});assert.deepEqual(texts,['De eerste woorden.']);assert.equal(messages[2].samples.length,80000);
worker.onmessage({data:{kind:'text',id:2,text:'Het vervolg.'}});assert.equal(speech.busy(),false);assert.equal(statuses.at(-1),'Tekst bewaard.');console.log('Speech: 16 kHz resampling, local waveform queue, model preparation, successive text chunks and completion passed.');

// Pausing flushes the words already captured; paused microphone frames are excluded.
const {readFile}=await import('node:fs/promises');const vm=await import('node:vm');let Processor;const blocks=[];
vm.runInNewContext(await readFile(new URL('./speech-worklet.browser.js',import.meta.url),'utf8'),{AudioWorkletProcessor:class{constructor(){this.port={postMessage:data=>blocks.push(data)};}},sampleRate:48000,Float32Array,registerProcessor:(_,klass)=>Processor=klass});
const processor=new Processor();processor.process([[new Float32Array(128).fill(.1)]]);processor.port.onmessage({data:'pause'});assert.equal(blocks[0].samples.length,128);processor.process([[new Float32Array(128).fill(.2)]]);processor.port.onmessage({data:'flush'});assert.equal(blocks.length,1);processor.port.onmessage({data:'resume'});processor.process([[new Float32Array(128).fill(.3)]]);processor.port.onmessage({data:'flush'});assert.equal(blocks.length,2);assert.ok(Math.abs(blocks[1].samples[0]-.3)<1e-5);console.log('Speech worklet: pause retains captured words and excludes paused frames.');
