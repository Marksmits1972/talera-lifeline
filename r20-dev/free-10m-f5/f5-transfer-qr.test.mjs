import {translate} from './f5-language.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {pairingMatrix,pairingPayload,readPairingPayload} from './f5-transfer-qr.mjs';
import {pairingScanner} from './f5-transfer-scan.mjs';
import jsQR from './f5-transfer-jsqr.mjs';
const fixture=i=>i.toString(16).padStart(20,'0');
function pixels(matrix,scale=5){
 const size=(matrix.length+8)*scale,data=new Uint8ClampedArray(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const v=matrix[Math.floor(y/scale)-4]?.[Math.floor(x/scale)-4]?0:255;
  data.set([v,v,v,255],(y*size+x)*4);
 }
 return {data,width:size,height:size};
}
function rotate(m){return m[0].map((_,x)=>m.map(row=>row[x]).reverse())}
test('independent pinned jsQR decodes 64 codes, varying masks and all four rotations',()=>{
 for(let i=0;i<64;i++){
  const code=fixture(i*65521+91439);
  let m=pairingMatrix(code);assert.equal(m.length,25);
  for(let turn=0;turn<4;turn++){
   const p=pixels(m,4+turn);
   assert.equal(readPairingPayload(jsQR(p.data,p.width,p.height,{inversionAttempts:'dontInvert'})?.data),code);
   m=rotate(m);
  }
 }
});
test('only TALERA pairing text accepted; arbitrary URLs and malformed codes are ignored',()=>{
 const code='0123456789abcdef0123';
 assert.equal(readPairingPayload(pairingPayload(code)),code);
 for(const s of ['https://example.com','TALERA1:abc','TALERA1:'+code,'TALERA1:'+code.toUpperCase()+' ','TALERA2:'+code.toUpperCase(),null])assert.equal(readPairingPayload(s),null);
 assert.throws(()=>pairingPayload('abc'));
});
function fakeVideo(){
 return {hidden:true,srcObject:null,readyState:2,videoWidth:100,videoHeight:100,pause(){},async play(){}};
}
function stream(){
 const state={stops:0};return {state,getTracks:()=>[{stop:()=>state.stops++}]};
}
test('camera permission resolving after cancellation immediately stops the stream, no frame or code',async()=>{
 const video=fakeVideo(),camera=stream();let resolve;
 const scanner=pairingScanner({translate:(key,params)=>translate('nl',key,params),video,getMedia:()=>new Promise(r=>{resolve=r}),decoder:async()=>()=>assert.fail('must not decode'),
  report:()=>assert.fail('must not report late result'),onCode:()=>assert.fail('must not join')});
 const running=scanner.start();scanner.stop();resolve(camera);await running;
 assert.equal(camera.state.stops,1);assert.equal(video.srcObject,null);assert.equal(video.hidden,true);
});
test('scanner ignores unrelated QR, recognizes only app pairing code and stops camera before reporting',async()=>{
 const video=fakeVideo(),camera=stream(),jobs=[],codes=[];
 let attempts=0;
 const fakeCanvas={getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(4),width:1,height:1})})};
 const scanner=pairingScanner({translate:(key,params)=>translate('nl',key,params),video,getMedia:async()=>camera,decoder:async()=>()=>({data:attempts++===0?'https://example.test':pairingPayload(fixture(4))}),
 makeCanvas:()=>fakeCanvas,schedule:fn=>{jobs.push(fn);return jobs.length},cancel:()=>{},
 report:()=>{},onCode:code=>{assert.equal(camera.state.stops,1);assert.equal(video.srcObject,null);codes.push(code)}});
 await scanner.start();assert.deepEqual(codes,[]);jobs.shift()();
 assert.deepEqual(codes,[fixture(4)]);assert.equal(video.hidden,true);
});
test('camera denied and decoder failure safely fall back without retaining tracks',async()=>{
 for(const mode of ['denied','decoder']){
  const video=fakeVideo(),camera=stream(),messages=[];
  const scanner=pairingScanner({translate:(key,params)=>translate('nl',key,params),video,getMedia:async()=>{if(mode==='denied')throw Error('denied');return camera},
    decoder:async()=>{if(mode==='decoder')throw Error('decoder');return ()=>null},
    report:m=>messages.push(m),onCode:()=>assert.fail('must not connect')});
  await scanner.start();assert.equal(video.hidden,true);assert.equal(video.srcObject,null);
  assert.match(messages.at(-1),/verbindingscode/);assert.equal(camera.state.stops,mode==='decoder'?1:0);
 }
});
