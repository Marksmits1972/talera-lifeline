// Fixed public speech-model downloads only; no user data, cookies, or arbitrary proxy URLs.
const models=[{prefix:'/speech-model/Xenova/whisper-tiny/resolve/main/',repo:'Xenova/whisper-tiny',revision:'5332fcc35e32a33b86612b9a57a89be7906102b1',files:new Set(['config.json','generation_config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json','onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx'])},{prefix:'/speech-model/onnx-community/Qwen2.5-0.5B-Instruct/resolve/main/',repo:'onnx-community/Qwen2.5-0.5B-Instruct',revision:'cc5cc01a65cc3ff17bdb73a7de33d879f62599b0',files:new Set(['config.json','generation_config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','onnx/model_q4.onnx'])}];
export async function modelDownload(request,download=fetch){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/speech-model/'))return null;
  const model=models.find(m=>url.pathname.startsWith(m.prefix));
  const file=model?url.pathname.slice(model.prefix.length):'';
  if(!['GET','HEAD'].includes(request.method))return new Response('Downloads only',{status:405});
  if(!model||url.search||!model.files.has(file))return new Response('Not found',{status:404});
  try{
    const upstream=await download('https://huggingface.co/'+model.repo+'/resolve/'+model.revision+'/'+file,{method:request.method,redirect:'follow'});
    if(!upstream.ok)return new Response('Public model unavailable',{status:502});
    return new Response(request.method==='HEAD'?null:upstream.body,{headers:{'content-type':file.endsWith('.json')?'application/json':'application/octet-stream','cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff'}});
  }catch{return new Response('Public model download unavailable',{status:503});}
}
