// Only public model/runtime downloads leave this worker. Waveforms stay in memory.
let transcriber,pipeline,stage='runtime';
const publicFetch=self.fetch.bind(self);self.fetch=async(input,options)=>{try{return await publicFetch(input,options);}catch(error){const url=new URL(typeof input==='string'?input:input.url);throw new Error('Public model download failed: '+url.origin+url.pathname+' ('+error.message+')');}};
async function runtime(){if(pipeline)return;const library=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');pipeline=library.pipeline;library.env.allowLocalModels=false;library.env.remoteHost=self.location.origin+'/speech-model/';library.env.backends.onnx.wasm.numThreads=1;}
self.onmessage=async({data})=>{try{
  await runtime();
  stage='model';
  if(!transcriber)transcriber=await pipeline('automatic-speech-recognition','Xenova/whisper-base',{dtype:'q8',device:'wasm',progress_callback:progress=>self.postMessage({kind:'progress',status:progress.status,progress:progress.progress})});
  if(data.kind==='prepare'){self.postMessage({kind:'ready'});return;}
  stage='transcription';
  const result=await transcriber(data.samples,{language:'dutch',task:'transcribe',return_timestamps:false});
  self.postMessage({kind:'text',id:data.id,text:result.text||''});
}catch(error){self.postMessage({kind:'error',id:data.id,message:stage+': '+error.message});}};
