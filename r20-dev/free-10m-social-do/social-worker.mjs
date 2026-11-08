// TALERA Free Social experimental, strictly isolated staging/test gateway.
// QA authentication only: not a replacement for official TALERA sessions.
// NO production social / account D1 and NO customer media are linked.
import {shaHex,safeEqualHex} from '../free-10m-auth-pilot/auth-util.mjs';
import {verifyStoryId,verifyAccountId,FreeSocialMemory,FreeSocialSharePointer} from './social-objects.mjs';
export {FreeSocialMemory,FreeSocialSharePointer} from './social-objects.mjs';

const json=(data,status=200)=>Response.json(data,{status,headers:{
 'cache-control':'private, no-store','x-content-type-options':'nosniff'
}});
const denied=(message='Geen toegang',status=403)=>json({ok:false,error:message},status);
const textEncoder=new TextEncoder();
async function signedActor(req,env){
 const id=req.headers.get('x-qa-account'),sig=req.headers.get('x-qa-signature');
 if(!id&&!sig)return null;
 try{verifyAccountId(id)}catch{return null}
 if(!/^[a-f0-9]{64}$/.test(sig||'')||!env.DEMO_IDENTITY_KEY)return null;
 const key=await crypto.subtle.importKey('raw',textEncoder.encode(env.DEMO_IDENTITY_KEY),
  {name:'HMAC',hash:'SHA-256'},false,['verify']);
 const proof=Uint8Array.from(sig.match(/../g),x=>parseInt(x,16));
 const good=await crypto.subtle.verify('HMAC',key,proof,textEncoder.encode(id));
 return good?id:null;
}
async function shareHash(req){
 const token=req.headers.get('x-qa-share-token');
 return /^[a-f0-9]{64}$/.test(token||'')?shaHex(token):null;
}
async function parse(req){
 const length=Number(req.headers.get('content-length')||0);
 if(length>4096)throw Error('BODY_TOO_LARGE');
 const raw=await req.text();
 if(raw.length>4096)throw Error('BODY_TOO_LARGE');
 return raw?JSON.parse(raw):{};
}
function testNamespace(env,name){
 const base=env[name];
 if(!base?.idFromName||!base?.get)throw Error('MISSING_SOCIAL_NAMESPACE');
 if(env.SOCIAL_STORAGE_JURISDICTION==='eu')return base.jurisdiction('eu');
 if(env.SOCIAL_STORAGE_JURISDICTION==='local-test')return base;
 throw Error('SOCIAL_JURISDICTION_NOT_EXPLICIT');
}
function memory(env,id){
 verifyStoryId(id);
 const ns=testNamespace(env,'SOCIAL_MEMORY');
 return ns.get(ns.idFromName('talera-free-social-v1:'+id));
}
function pointer(env,hash){
 const ns=testNamespace(env,'SOCIAL_POINTER');
 return ns.get(ns.idFromName('talera-free-share-pointer-v1:'+hash));
}
function requireActor(actor){
 if(!actor)throw Error('AUTH_REQUIRED');
 return actor;
}
export default{
 async fetch(req,env){
  const url=new URL(req.url),route=url.pathname,method=req.method;
  if(route==='/__social/health'&&method==='GET')
   return json({ok:true,syntheticOnly:true,linkedToProduction:false,sharedD1Used:false});
  if(!/^[a-f0-9]{64}$/.test(env.STAGING_SOCIAL_KEY||'')||
     !safeEqualHex(req.headers.get('x-qa-staging-key')||'',env.STAGING_SOCIAL_KEY))
   return denied('Afgesloten testomgeving');
  if(method!=='GET'&&req.headers.get('origin')!==url.origin)return denied('Ongeldige herkomst');
  const actor=await signedActor(req,env);
  const tokenHash=await shareHash(req);
  try{
   const link=/^\/__social\/shared\/([a-f0-9]{64})$/.exec(route);
   if(link&&method==='GET'){
    const hash=await shaHex(link[1]);
    const id=await pointer(env,hash).locate(hash);
    if(!id)return denied('Koppeling verlopen of niet gevonden',404);
    return json(await memory(env,id).view(null,hash));
   }
   const m=/^\/__social\/memory\/([A-Za-z0-9_-]{8,80})\/(init|grant|revoke-grant|share|revoke-share|like|comment|view)$/.exec(route);
   if(!m)return denied('Niet gevonden',404);
   const [,id,op]=m,home=memory(env,id);
   if(op==='view'&&method==='GET')return json(await home.view(actor,tokenHash));
   if(method!=='POST')return denied('Methode niet toegestaan',405);
   const payload=await parse(req);
   if(op==='init'){
    const result=await home.initialize(id,requireActor(actor));
    return json(result,result.ok?200:409);
   }
   if(op==='grant')return json(await home.grant(requireActor(actor),verifyAccountId(payload.recipientId)));
   if(op==='revoke-grant')return json(await home.revokeGrant(requireActor(actor),verifyAccountId(payload.recipientId)));
   if(op==='share'){
    const raw=[...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');
    const hash=await shaHex(raw),expires=Date.now()+3600000;
    await home.addShare(requireActor(actor),hash,expires);
    const stored=await pointer(env,hash).point(id,hash,expires);
    if(!stored.ok)throw Error('POINTER_UNAVAILABLE');
    return json({ok:true,link:'/__social/shared/'+raw,expiresAt:expires});
   }
   if(op==='revoke-share'){
    if(!/^[a-f0-9]{64}$/.test(payload.token||''))return denied('Ongeldig deelbewijs',400);
    const hash=await shaHex(payload.token);
    return json(await home.revokeShare(requireActor(actor),hash));
   }
   if(op==='like')return json(await home.like(actor,tokenHash));
   if(op==='comment')return json(await home.comment(actor,tokenHash,payload.body));
   return denied('Niet gevonden',404);
  }catch(e){
   const code=String(e?.message||'INTERNAL');
   if(code==='ACCESS_DENIED'||code==='OWNER_REQUIRED'||code==='AUTH_REQUIRED')return denied();
   if(code.startsWith('INVALID_')||code==='BODY_TOO_LARGE')return denied('Ongeldige invoer',400);
   return denied('Testopslag tijdelijk onbereikbaar',503);
  }
 }
};
