/* TALERA Premium cloud pilot — synthetic data only, no personal Free uploads.
 * Injected alongside premiumRoutes into the existing Clean Core Worker.
 * Assumes authenticated `user` supplied by the current Clean Core session check.
 */
const premiumPilotPath='/api/me/premium/cloud/pilot';
const premiumPilotMemoryId='talera-pilot-synthetic-v1';
const premiumPilotBytesLimit=16384;
const premiumPilotResponse=(payload,status=200)=>new Response(JSON.stringify(payload),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
 'x-content-type-options':'nosniff'}
});
const premiumPilotKey=id=>`pilot/v1/${id}/${premiumPilotMemoryId}.json`;
const premiumPilotFixture=Object.freeze({
 schemaVersion:1,synthetic:true,memoryId:premiumPilotMemoryId,
 title:'Fictieve herinnering — opslagproef',
 storyText:'Dit is uitsluitend een technische TALERA-test. Geen persoonlijke herinnering.',
 eventDate:'2000-01-01',media:[]
});
async function premiumPilotSha(bytes){
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
async function premiumCloudPilotRoutes(req,env,user,p,m){
 if(p!==premiumPilotPath)return null;
 if(!user||typeof user.id!=='string'||!uuidRule.test(user.id))
  return premiumPilotResponse({error:'Aanmelden bij TALERA is nodig'},401);
 // Off unless intentionally enabled for exact existing TEST account IDs.
 if(env.PREMIUM_CLOUD_PILOT_ENABLED!=='true')
  return premiumPilotResponse({error:'Cloudproef is niet actief'},404);
 const allowed=new Set(String(env.PREMIUM_CLOUD_PILOT_ACCOUNT_IDS||'')
  .split(',').map(s=>s.trim()).filter(s=>uuidRule.test(s)));
 if(!allowed.has(user.id))return premiumPilotResponse({error:'Geen toegang tot cloudproef'},403);
 const rights=await premiumGrantView(env,user.id);
 if(rights.source!=='manual_test'||rights.permissions.cloud_storage!==true)
  return premiumPilotResponse({error:'Geen actief Premium-testrecht'},403);
 if(!env.PREMIUM_MEDIA||typeof env.PREMIUM_MEDIA.get!=='function'||
    typeof env.PREMIUM_MEDIA.put!=='function'||typeof env.PREMIUM_MEDIA.delete!=='function')
  return premiumPilotResponse({error:'Cloudopslag is nog niet aangesloten'},503);
 if(!['GET','POST','DELETE'].includes(m))
  return premiumPilotResponse({error:'Methode niet toegestaan'},405);
 if(m!=='GET'){
  if(!allowedWrite(req))return premiumPilotResponse({error:'Ongeldige herkomst'},403);
  if(!await rateLimit(req,env,'premium-cloud-pilot',5))
   return premiumPilotResponse({error:'Te veel testverzoeken'},429);
 }
 const key=premiumPilotKey(user.id);
 if(m==='DELETE'){
  await env.PREMIUM_MEDIA.delete(key);
  return premiumPilotResponse({ok:true,deleted:true,synthetic:true});
 }
 if(m==='POST'){
  // Ignore request body entirely: only server-generated, fixed synthetic fixture.
  const data=new TextEncoder().encode(JSON.stringify(premiumPilotFixture));
  const checksum=await premiumPilotSha(data);
  const stored=await env.PREMIUM_MEDIA.put(key,data,{
   httpMetadata:{contentType:'application/json'},
   customMetadata:{sha256:checksum,synthetic:'true',schemaVersion:'1'}
  });
  if(!stored)return premiumPilotResponse({error:'Upload niet bevestigd'},503);
  // Read back and compare; never claim successful storage on PUT alone.
  const read=await env.PREMIUM_MEDIA.get(key);
  if(!read||read.size>premiumPilotBytesLimit||
     read.customMetadata?.sha256!==checksum)
   return premiumPilotResponse({error:'Opslagcontrole mislukt'},503);
  const got=new Uint8Array(await read.arrayBuffer());
  if(await premiumPilotSha(got)!==checksum)
   return premiumPilotResponse({error:'Opslagcontrole mislukt'},503);
  return premiumPilotResponse({ok:true,synthetic:true,memoryId:premiumPilotMemoryId,
   bytes:got.byteLength,sha256:checksum,verified:true});
 }
 const stored=await env.PREMIUM_MEDIA.get(key);
 if(!stored)return premiumPilotResponse({error:'Geen proefherinnering gevonden'},404);
 if(stored.size>premiumPilotBytesLimit||stored.customMetadata?.synthetic!=='true'||
    !/^[0-9a-f]{64}$/.test(stored.customMetadata?.sha256||''))
  return premiumPilotResponse({error:'Opslagintegriteit niet bevestigd'},409);
 const bytes=new Uint8Array(await stored.arrayBuffer());
 const hash=await premiumPilotSha(bytes);
 if(hash!==stored.customMetadata.sha256)
  return premiumPilotResponse({error:'Opslagintegriteit niet bevestigd'},409);
 let payload;
 try{payload=JSON.parse(new TextDecoder().decode(bytes));}
 catch{return premiumPilotResponse({error:'Ongeldige proefinhoud'},409);}
 if(payload?.synthetic!==true||payload?.memoryId!==premiumPilotMemoryId||
    payload?.schemaVersion!==1)
  return premiumPilotResponse({error:'Ongeldige proefinhoud'},409);
 return premiumPilotResponse({ok:true,synthetic:true,verified:true,
  memory:payload,sha256:hash});
}
