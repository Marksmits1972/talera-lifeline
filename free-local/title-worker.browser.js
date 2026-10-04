import {cleanTitle,cleanAnalysis,topicNames} from './analysis.browser.js';
// Inference runs on this device. Only pinned public model files are downloaded.
let model;
const output=result=>{const value=result[0].generated_text;return typeof value==='string'?value:value.at(-1).content;};
self.onmessage=async({data})=>{try{
  if(!model){const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');env.allowLocalModels=false;env.remoteHost=self.location.origin+'/speech-model/';env.backends.onnx.wasm.numThreads=1;
    model=await pipeline('text-generation','onnx-community/Qwen2.5-0.5B-Instruct',{dtype:'q4',device:'wasm',progress_callback:p=>self.postMessage({kind:'progress',id:data.id,status:p.status})});}
  const text=data.text.slice(0,5000);let title;
  for(let attempt=0;attempt<2&&!title;attempt++){const result=await model([{role:'system',content:'Bedenk een pakkende Nederlandse titel van 2 tot maximaal 4 woorden voor deze herinnering. Schrijf uitsluitend de titel, altijd in het Nederlands. Beschrijf het onderwerp, kopieer niet simpelweg het begin van het verhaal en verzin geen feiten. Voorbeeld: We liepen samen door het bos en zagen herten. Titel: Wandeling tussen herten.'},{role:'user',content:text}],{max_new_tokens:24,do_sample:false,return_full_text:false});try{title=cleanTitle(output(result));}catch{}}
  if(!title)throw new Error('Geen korte titel ontvangen');
  self.postMessage({kind:'partial',id:data.id,title});
  let analysis=cleanAnalysis({},data.text);
  try{const result=await model([{role:'system',content:'Extract names and dates explicitly present in this memory. Return a short JSON object only, with exactly these three keys: persons, places, timeReferences. Each value is an array of exact quotations. Example memory: Ik ging met Anna naar Arnhem in de zomer van 2020. Output: {"persons":["Anna"],"places":["Arnhem"],"timeReferences":["zomer van 2020"]}. Use empty arrays when absent. No invented facts.'},{role:'user',content:text}],{max_new_tokens:140,do_sample:false,return_full_text:false});const raw=output(result);analysis=cleanAnalysis(JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1)),data.text);}catch{}
  self.postMessage({kind:'title',id:data.id,title,analysis});
}catch(error){self.postMessage({kind:'error',id:data.id,message:error.message});}};
