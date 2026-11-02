/* TALERA Premium: opt-in, text-only memory cloud prototype.
 * Existing Clean Core login / D1 Premium test grants; never auto-read IndexedDB.
 * NOT routed or deployed until a private EU-jurisdiction bucket is bound.
 */
const privateMemoryRoute='/api/me/premium/cloud/memory';
const privateMemoryMaxBytes=128*1024;
const privateMemoryType='talera-premium-private-memory-v1';
const privateMemoryReply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
 'x-content-type-options':'nosniff','vary':'Cookie'}});
const privateMemoryValidId=id=>typeof id==='string'&&id.length>0&&id.length<=192&&
 !/[\u0000-\u001f\u007f]/.test(id);
async function privateMemoryHash(data){
 const sha=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data));
 return [...new Uint8Array(sha)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function privateMemoryBody(req){
 if(Number(req.headers.get('content-length')||0)>privateMemoryMaxBytes)
  return null;
 if(!req.body)return null;
 const reader=req.body.getReader(),parts=[];
 let n=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   n+=value.byteLength;
   if(n>privateMemoryMaxBytes){await reader.cancel();return null}
   parts.push(value);
  }
 }finally{reader.releaseLock()}
 const data=new Uint8Array(n);let offset=0;
 for(const part of parts){data.set(part,offset);offset+=part.byteLength}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data))}
 catch{return null}
}
async function privateMemoryKey(accountId,memoryId){
 return 'private/v1/'+accountId+'/'+await privateMemoryHash(memoryId)+'/memory.json';
}
async function privateMemoryRetrieve(env,user,memoryId){
 const key=await privateMemoryKey(user.id,memoryId);
 const object=await env.PREMIUM_PRIVATE.get(key);
 if(!object)return privateMemoryReply({error:'Herinnering niet gevonden'},404);
 if(object.size>privateMemoryMaxBytes||!/^([a-f0-9]{64})$/.test(object.customMetadata?.sha256||''))
  return privateMemoryReply({error:'Cloudbestand niet betrouwbaar'},409);
 const bytes=new Uint8Array(await object.arrayBuffer());
 const hash=await privateMemoryHash(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(hash!==object.customMetadata.sha256)
  return privateMemoryReply({error:'Cloudbestand niet betrouwbaar'},409);
 let saved;
 try{saved=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}
 catch{return privateMemoryReply({error:'Cloudbestand niet leesbaar'},409)}
 if(saved?.type!==privateMemoryType||saved?.accountId!==user.id||
    saved?.memoryId!==memoryId||saved?.memory?.id!==memoryId||
    !Array.isArray(saved.memory.items)||saved.memory.items.length!==0)
  return privateMemoryReply({error:'Cloudbestand komt niet overeen'},409);
 return privateMemoryReply({ok:true,memoryId,savedAt:saved.savedAt,memory:saved.memory,
   verified:true,sha256:hash,mediaIncluded:false});
}
async function privateMemoryCloudRoutes(req,env,user,p,m,u){
 if(p!==privateMemoryRoute)return null;
 if(!user||typeof user.id!=='string'||!uuidRule.test(user.id))
  return privateMemoryReply({error:'Aanmelden bij TALERA is nodig'},401);
 // Explicitly test-only: never enabled by a package grant alone.
 if(env.PREMIUM_PRIVATE_MEMORY_ENABLED!=='true')
  return privateMemoryReply({error:'Persoonlijke cloudopslag is niet vrijgegeven'},404);
 const permitted=String(env.PREMIUM_PRIVATE_MEMORY_TEST_IDS||'')
  .split(',').map(x=>x.trim());
 if(!permitted.includes(user.id))
  return privateMemoryReply({error:'Niet toegestaan voor dit testaccount'},403);
 const rights=await premiumGrantView(env,user.id);
 if(rights.source!=='manual_test'||rights.permissions?.cloud_storage!==true)
  return privateMemoryReply({error:'Geen geldig testrecht'},403);
 if(!env.PREMIUM_PRIVATE||typeof env.PREMIUM_PRIVATE.get!=='function'||
   typeof env.PREMIUM_PRIVATE.put!=='function')
  return privateMemoryReply({error:'Privéopslag niet aangesloten'},503);
 if(m==='GET'){
  const memoryId=u.searchParams.get('id');
  if(!privateMemoryValidId(memoryId))return privateMemoryReply({error:'Ongeldige herinnering'},400);
  return privateMemoryRetrieve(env,user,memoryId);
 }
 if(m!=='PUT')return privateMemoryReply({error:'Methode niet toegestaan'},405);
 if(!allowedWrite(req))return privateMemoryReply({error:'Ongeldige herkomst'},403);
 if(!await rateLimit(req,env,'premium-private-memory-write',5))
  return privateMemoryReply({error:'Te veel verzoeken'},429);
 if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))
  return privateMemoryReply({error:'Alleen JSON toegestaan'},415);
 const request=await privateMemoryBody(req),memory=request?.memory;
 if(request?.consent!==true||!memory||typeof memory!=='object'||
    Array.isArray(memory)||!privateMemoryValidId(memory.id)||
    !Array.isArray(memory.items))
  return privateMemoryReply({error:'Kies zelf één geldige herinnering'},400);
 // A text-only test must refuse media instead of silently creating partial backups.
 if(memory.items.length>0)return privateMemoryReply({
  error:'Herinneringen met media worden pas ondersteund na veilige media-overdracht'},422);
 const saved={type:privateMemoryType,version:1,accountId:user.id,
  memoryId:memory.id,memory,savedAt:new Date().toISOString()};
 const text=JSON.stringify(saved),data=new TextEncoder().encode(text);
 if(data.length>privateMemoryMaxBytes)
  return privateMemoryReply({error:'Herinnering te groot voor deze proef'},413);
 const key=await privateMemoryKey(user.id,memory.id);
 // Atomic create-if-absent. Never overwrite an existing memory silently.
 const wrote=await env.PREMIUM_PRIVATE.put(key,data,{
  onlyIf:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'},
  customMetadata:{sha256:await privateMemoryHash(text),type:privateMemoryType}
 });
 if(!wrote)return privateMemoryReply({error:'Deze herinnering bestaat al in de cloud; overschrijven is geblokkeerd'},409);
 const verified=await privateMemoryRetrieve(env,user,memory.id);
 if(verified.status!==200)return privateMemoryReply({error:'Opslag niet bevestigd; lokale versie behouden'},503);
 const result=await verified.json();
 return privateMemoryReply({ok:true,memoryId:memory.id,sha256:result.sha256,
  savedAt:result.savedAt,verified:true,mediaIncluded:false},201);
}
