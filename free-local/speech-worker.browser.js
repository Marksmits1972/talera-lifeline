// Only public model/runtime downloads leave this worker. Waveforms stay in memory.
let transcriber,pipeline;
async function runtime(){if(pipeline)return;const library=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.web.min.js');pipeline=library.pipeline;library.env.allowLocalModels=false;library.env.backends.onnx.wasm.numThreads=1;}
self.onmessage=async({data})=>{try{
  await runtime();
  if(!transcriber)transcriber=await pipeline('automatic-speech-recognition','Xenova/whisper-tiny',{dtype:'q8',device:'wasm',progress_callback:progress=>self.postMessage({kind:'progress',status:progress.status,progress:progress.progress})});
  if(data.kind==='prepare'){self.postMessage({kind:'ready'});return;}
  const result=await transcriber(data.samples,{language:'dutch',task:'transcribe',return_timestamps:false});
  self.postMessage({kind:'text',id:data.id,text:result.text||''});
}catch(error){self.postMessage({kind:'error',id:data.id,message:error.message});}};
