/* TALERA Premium media: only original local files, no second database.
 * Not deployed. Called AFTER privateMemoryCloudRoutes' authentication,
 * Premium test entitlement, explicit account allowlist and EU bucket checks.
 * R2 validates client SHA256 when uploading (no public media URLs).
 */
const privateMediaRoute='/api/me/premium/cloud/media';
const privateMediaLimits={photo:20*1048576,video:95*1048576,audio:60*1048576};
const privateMediaKeyValid=k=>typeof k==='string'&&k.length>0&&k.length<=240&&!/[\u0000-\u001f\u007f]/.test(k);
const privateMediaHex=h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h);
function privateMediaEntryValid(item){
 if(!item||typeof item!=='object'||!privateMediaKeyValid(item.key)||
    !Object.hasOwn(privateMediaLimits,item.kind)||
    !Number.isSafeInteger(item.size)||item.size<1||
    item.size>privateMediaLimits[item.kind]||
    typeof item.mime!=='string'||item.mime.length>120||
    !item.mime.startsWith(({photo:'image/',video:'video/',audio:'audio/'})[item.kind])||
    !privateMediaHex(item.sha256))return false;
 return true;
}
async function privateMediaObjectKey(accountId,memoryId,itemKey){
 const memoryHash=await privateMemoryHash(memoryId),itemHash=await privateMemoryHash(itemKey);
 return 'private/v1/'+accountId+'/'+memoryHash+'/media/'+itemHash;
}
async function privateMediaConfirmed(env,user,memoryId,files){
 if(!Array.isArray(files)||files.length>7||files.some(x=>!privateMediaEntryValid(x)))
  return false;
 const seen=new Set(),types={photo:0,video:0,audio:0};
 for(const file of files){
  if(seen.has(file.key))return false;
  seen.add(file.key);types[file.kind]++;
  const key=await privateMediaObjectKey(user.id,memoryId,file.key);
  const obj=await env.PREMIUM_PRIVATE.head(key);
  if(!obj||obj.size!==file.size||obj.customMetadata?.sha256!==file.sha256||
     obj.customMetadata?.mime!==file.mime||obj.customMetadata?.kind!==file.kind)
   return false;
 }
 return types.photo+types.video<=6&&types.audio<=1;
}
async function privateMediaRoutes(req,env,user,m,u){
 const memoryId=u.searchParams.get('id'),itemKey=u.searchParams.get('key');
 if(!privateMemoryValidId(memoryId)||!privateMediaKeyValid(itemKey))
  return privateMemoryReply({error:'Ongeldige herinnering of bestand'},400);
 if(typeof env.PREMIUM_PRIVATE.head!=='function')
  return privateMemoryReply({error:'Privéopslag is niet aangesloten'},503);
 const objectKey=await privateMediaObjectKey(user.id,memoryId,itemKey);
 const manifestKey=await privateMemoryKey(user.id,memoryId);
 if(m==='GET'){
  const manifest=await privateMemoryRetrieve(env,user,memoryId);
  if(manifest.status!==200)return privateMemoryReply({error:'Herinnering is nog niet volledig opgeslagen'},404);
  const data=await manifest.json();
  const file=data.media?.find(x=>x.key===itemKey);
  if(!privateMediaEntryValid(file))return privateMemoryReply({error:'Bestand hoort niet bij deze herinnering'},404);
  const object=await env.PREMIUM_PRIVATE.get(objectKey);
  if(!object||object.size!==file.size||object.customMetadata?.sha256!==file.sha256)
   return privateMemoryReply({error:'Bestand mist of is niet betrouwbaar'},409);
  return new Response(object.body,{status:200,headers:{
   'content-type':file.mime,'content-length':String(file.size),
   'cache-control':'private, no-store','x-content-type-options':'nosniff',
   'x-talera-sha256':file.sha256,'vary':'Cookie'}});
 }
 if(!['PUT','DELETE'].includes(m))return privateMemoryReply({error:'Methode niet toegestaan'},405);
 if(!allowedWrite(req))return privateMemoryReply({error:'Ongeldige herkomst'},403);
 if(!await rateLimit(req,env,'premium-private-media-write',25))
  return privateMemoryReply({error:'Te veel bestandsverzoeken'},429);
 if(await env.PREMIUM_PRIVATE.head(manifestKey))
  return privateMemoryReply({error:'Herinnering is al definitief opgeslagen'},409);
 if(m==='DELETE'){
  await env.PREMIUM_PRIVATE.delete(objectKey);
  return privateMemoryReply({ok:true,removed:true},200);
 }
 const entry={key:itemKey,kind:req.headers.get('x-talera-kind'),
  size:Number(req.headers.get('x-talera-size')),mime:req.headers.get('content-type'),
  sha256:req.headers.get('x-talera-sha256')};
 if(!privateMediaEntryValid(entry))return privateMemoryReply({error:'Bestandstype, omvang of controlewaarde ongeldig'},422);
 // Identical retry is safe, but replacing the original binary never is.
 const prior=await env.PREMIUM_PRIVATE.head(objectKey);
 if(prior){
  if(prior.size===entry.size&&prior.customMetadata?.sha256===entry.sha256&&
     prior.customMetadata?.mime===entry.mime&&prior.customMetadata?.kind===entry.kind)
   return privateMemoryReply({ok:true,key:itemKey,bytes:entry.size,sha256:entry.sha256,verified:true,alreadyUploaded:true},200);
  return privateMemoryReply({error:'Bestand bestaat al met andere inhoud'},409);
 }
 const knownLength=req.headers.get('content-length');
 if(knownLength!==null&&Number(knownLength)!==entry.size)
  return privateMemoryReply({error:'Bestandsgrootte komt niet overeen'},400);
 if(!req.body)return privateMemoryReply({error:'Geen bestand meegestuurd'},400);
 let streamed=0;
 const limited=req.body.pipeThrough(new TransformStream({
  transform(chunk,ctrl){
   streamed+=chunk.byteLength;
   if(streamed>entry.size)throw Error('Bestand groter dan opgegeven');
   ctrl.enqueue(chunk);
  }
 }));
 let saved;
 try{
  saved=await env.PREMIUM_PRIVATE.put(objectKey,limited,{
   onlyIf:{etagDoesNotMatch:'*'},sha256:entry.sha256,
   httpMetadata:{contentType:entry.mime},
   customMetadata:{sha256:entry.sha256,mime:entry.mime,kind:entry.kind}
  });
 }catch{return privateMemoryReply({error:'Bestandsintegriteit of overdracht mislukt'},422)}
 if(!saved)return privateMemoryReply({error:'Bestand staat al in de cloud'},409);
 if(streamed!==entry.size){
  await env.PREMIUM_PRIVATE.delete(objectKey);
  return privateMemoryReply({error:'Bestand is onvolledig'},422);
 }
 const checked=await env.PREMIUM_PRIVATE.head(objectKey);
 if(!checked||checked.size!==entry.size||checked.customMetadata?.sha256!==entry.sha256)
  return privateMemoryReply({error:'Bestandscontrole niet bevestigd'},503);
 return privateMemoryReply({ok:true,key:itemKey,bytes:entry.size,sha256:entry.sha256,verified:true},201);
}
