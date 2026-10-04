import assert from 'node:assert/strict';
import {modelDownload} from './model-download.js';
const base='https://app.test/speech-model/Xenova/whisper-tiny/resolve/main/';
let calls=0;
const download=async(url,options)=>{calls++;assert.equal(url,'https://huggingface.co/Xenova/whisper-tiny/resolve/5332fcc35e32a33b86612b9a57a89be7906102b1/tokenizer.json');assert.deepEqual(options,{method:'GET',redirect:'follow'});return new Response('{"public":true}');};
const result=await modelDownload(new Request(base+'tokenizer.json',{headers:{cookie:'must-not-forward'}}),download);assert.equal(result.status,200);assert.equal(await result.text(),'{"public":true}');
for(const [path,method,status] of [['tokenizer.json','POST',405],['tokenizer.json?voice=private','GET',404],['audio.wav','GET',404],['../../other/model.bin','GET',404]])assert.equal((await modelDownload(new Request(base+path,{method}),download)).status,status);
assert.equal(calls,1);assert.equal(await modelDownload(new Request('https://app.test/anything'),download),null);
assert.equal((await modelDownload(new Request(base+'config.json'),async()=>{throw Error('network');})).status,503);
console.log('Model downloads: fixed pinned public files only, no forwarded user headers, no uploads, failures preserved.');

const titleBase='https://app.test/speech-model/onnx-community/Qwen2.5-0.5B-Instruct/resolve/main/';
assert.equal((await modelDownload(new Request(titleBase+'tokenizer.json'),async url=>{assert.ok(url.includes('/cc5cc01a65cc3ff17bdb73a7de33d879f62599b0/'));return new Response('{}');})).status,200);
assert.equal((await modelDownload(new Request(titleBase+'story.txt'))).status,404);
