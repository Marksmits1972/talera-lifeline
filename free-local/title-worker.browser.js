// Inference runs on this device. Only pinned public model files are downloaded.
let model;
self.onmessage=async({data})=>{try{
  if(!model){const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');env.allowLocalModels=false;env.remoteHost=self.location.origin+'/speech-model/';env.backends.onnx.wasm.numThreads=1;
    model=await pipeline('text-generation','onnx-community/Qwen2.5-0.5B-Instruct',{dtype:'q4',device:'wasm',progress_callback:p=>self.postMessage({kind:'progress',id:data.id,status:p.status})});}
  const result=await model([{role:'system',content:'Create a concise Dutch title (2 to 5 words) for the memory below. Do not repeat the full sentence. Output only the Dutch title, nothing else. Do not invent facts. Example: We liepen samen door het bos en zagen herten. Title: Wandeling tussen de herten.'},{role:'user',content:data.text.slice(0,1800)}],{max_new_tokens:32,do_sample:false,return_full_text:false});
  const output=result[0].generated_text;
  const title=(typeof output==='string'?output:output.at(-1).content).replace(/^\s*(titel\s*:\s*)?/i,'').replace(/^["“']|["”']$/g,'').trim().split('\n')[0].split(/\s+/).slice(0,8).join(' ').slice(0,140);
  if(!title)throw new Error('Geen titel ontvangen');self.postMessage({kind:'title',id:data.id,title});
}catch(error){self.postMessage({kind:'error',id:data.id,message:error.message});}};
