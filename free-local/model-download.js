// Fixed public speech-model downloads only; no user data, cookies, or arbitrary proxy URLs.
const prefix='/speech-model/Xenova/whisper-tiny/resolve/main/';
const revision='5332fcc35e32a33b86612b9a57a89be7906102b1';
const files=new Set(['config.json','generation_config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json','onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx']);
export async function modelDownload(request,download=fetch){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/speech-model/'))return null;
  const file=url.pathname.slice(prefix.length);
  if(!['GET','HEAD'].includes(request.method))return new Response('Downloads only',{status:405});
  if(!url.pathname.startsWith(prefix)||url.search||!files.has(file))return new Response('Not found',{status:404});
  try{
    const upstream=await download('https://huggingface.co/Xenova/whisper-tiny/resolve/'+revision+'/'+file,{method:request.method,redirect:'follow'});
    if(!upstream.ok)return new Response('Public model unavailable',{status:502});
    return new Response(request.method==='HEAD'?null:upstream.body,{headers:{'content-type':file.endsWith('.json')?'application/json':'application/octet-stream','cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff'}});
  }catch{return new Response('Public model download unavailable',{status:503});}
}
