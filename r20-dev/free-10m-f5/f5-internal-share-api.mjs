// One existing F5 Worker, two existing account/memory DO namespaces.
// Internal share IDs are locators, NEVER capabilities; every media request
// requires the current recipient session, account-local inbox, and live ACL.
import {validAccountId,shaHex,json,sameOrigin} from '../free-10m-auth-pilot/auth-util.mjs';
const H=/^[a-f0-9]{64}$/,LOCAL=/^[A-Za-z0-9_.:-]{8,160}$/;
const is=(re,v)=>typeof v==='string'&&re.test(v);
const fields=(v,k)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===k.split(',').sort().join(',');
const bad=(status=409,reason='unavailable')=>json({ok:false,reason},status);
async function readBounded(req,max){
 const expected=Number(req.headers.get('content-length')||0);
 if(expected>max)throw Error('REQUEST_TOO_LARGE');
 const reader=req.body?.getReader();
 if(!reader)return new Uint8Array();
 const chunks=[];let size=0;
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error('REQUEST_TOO_LARGE')}chunks.push(value)}
 }finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let n=0;for(const chunk of chunks){bytes.set(chunk,n);n+=chunk.length}return bytes;
}
const boundedJson=async req=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readBounded(req,65536)));
const group=async (list,fn)=>{
 const result=[];for(let i=0;i<list.length;i+=20)result.push(...await Promise.all(list.slice(i,i+20).map(fn)));return result;
};
export async function internalShareApi(request,env,{getAccount,getHome,getMemory,scopedStoryId}){
 const u=new URL(request.url),path=u.pathname,method=request.method;
 if(u.search)return bad(404);
 const actor=await getAccount();
 if(!actor)return bad(401);
 const own=command=>getHome(actor.id).peopleCommand({...command,epoch:actor.epoch});
 const command=(id,payload)=>getHome(id).peopleCommand(payload);
 const getIndex=async(direction,key)=>{
  if(!is(H,key))return null;
  const r=await own({action:'internal-index-get',direction,key});
  return r.ok?r.item:null;
 };
 const lookup=async(direction,key)=>{
  const row=await getIndex(direction,key);return row?{row,memory:getMemory(row.story)}:null;
 };
 const resolveTargets=async ids=>{
  if(!Array.isArray(ids)||!ids.length||ids.length>1000)throw Error('INVALID_SELECTION');
  ids=ids.map(validAccountId);
  if(new Set(ids).size!==ids.length)throw Error('INVALID_SELECTION');
  const links=[];
  for(let i=0;i<ids.length;i+=100){
   const r=await own({action:'list',contacts:ids.slice(i,i+100)});
   if(!r.ok)throw Error('INVALID_SELECTION');
   links.push(...r.items);
  }
  if(links.length!==ids.length||new Set(links.map(x=>x.account)).size!==ids.length)throw Error('CONTACT_NOT_LINKED');
  const recipients=await group(links,async link=>{
   const r=await command(link.account,{action:'can-receive',other:actor.id});
   if(!r.ok||!r.allowed)throw Error('CONTACT_UNAVAILABLE');
   return {account:link.account,contact:link.contact};
  });
  return recipients.sort((a,b)=>a.account.localeCompare(b.account));
 };
 const isMutation=method==='POST';
 if(isMutation&&(!sameOrigin(request)||request.headers.get('x-talera-expected-account')!==actor.id))return bad(403);
 try{
  // Recipient read paths are not guest links. An opaque package ID alone is
  // insufficient, including when it was copied or forwarded.
  const read=/^\/api\/internal-share\/item\/([a-f0-9]{64})(?:\/(media\/(\d{1,2})\/(\d{1,2})|poster\/(\d{1,2})))?$/.exec(path);
  if(read){
   if(!['GET','HEAD'].includes(method))return bad(405);
   if(request.headers.get('x-talera-expected-account')!==actor.id)return bad(403);
   const target=await lookup('in',read[1]);if(!target)return bad(404);
   if(!read[2]){
    const content=await target.memory.internalShareContent(actor.id,read[1]);
    if(!content)return bad(404);
    return method==='HEAD'?new Response(null,{headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}}):json({ok:true,content});
   }
   const stored=read[5]===undefined?await target.memory.internalSharePart(actor.id,read[1],Number(read[3]),Number(read[4])):
    await target.memory.internalSharePoster(actor.id,read[1],Number(read[5]));
   if(!stored)return bad(404);
   return new Response(method==='HEAD'?null:stored.bytes,{headers:{'content-type':stored.mime,'content-length':String(stored.bytes.byteLength),
    'cache-control':'private, no-store','x-content-type-options':'nosniff','cross-origin-resource-policy':'same-origin','referrer-policy':'no-referrer'}});
  }
  const upload=/^\/api\/internal-share\/upload\/([a-f0-9]{64})\/(media\/(\d{1,2})\/(\d{1,2})|poster\/(\d{1,2}))$/.exec(path);
  if(upload){
   if(method!=='POST')return bad(405);
   const target=await lookup('out',upload[1]);if(!target)return bad(404);
   const poster=upload[5]!==undefined;
   const bytes=await readBounded(request,poster?1500000:1048576);
   const mime=(request.headers.get('content-type')||'').split(';')[0].toLowerCase();
   const result=poster?await target.memory.uploadInternalPoster(actor.id,upload[1],Number(upload[5]),mime,bytes):
    await target.memory.uploadInternalPart(actor.id,upload[1],Number(upload[3]),Number(upload[4]),mime,bytes);
   return json(result);
  }
  if(path!=='/api/internal-share'||method!=='POST'||!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))return bad(405);
  const input=await boundedJson(request),op=input?.action;
  if(op==='stage'&&fields(input,'action,localMemoryId,requestId,expiresAt,contacts,title,storyText,eventDate,consent')){
   if(input.consent!==true||!is(LOCAL,input.localMemoryId))return bad(400,'consent_or_memory_required');
   const requestId=validAccountId(input.requestId);
   if(!Number.isSafeInteger(input.expiresAt)||input.expiresAt<=Date.now()||input.expiresAt>Date.now()+7*86400000)return bad(400,'expiry_required');
   const recipients=await resolveTargets(input.contacts);
   const story=await scopedStoryId(actor.id,input.localMemoryId),key=await shaHex('talera-internal-package-v1:'+actor.id+':'+story+':'+requestId);
   const memory=getMemory(story),initial=await memory.initialize(story,actor.id);
   if(!initial.ok)return bad(409);
   const staged=await memory.stageInternalShare(actor.id,key,{title:input.title,storyText:input.storyText,eventDate:input.eventDate},recipients,input.expiresAt);
   const index=await own({action:'internal-index-prepare',direction:'out',key,story,sender:actor.id,expiresAt:input.expiresAt});
   if(!index.ok)return bad(409,'preparation_incomplete');
   return json({ok:true,key,state:staged.state,expiresAt:staged.expiresAt,uploadUntil:staged.uploadUntil});
  }
  if(op==='finalize'&&fields(input,'action,key,manifest,consent')&&input.consent===true){
   const target=await lookup('out',input.key);if(!target)return bad(404);
   const sealed=await target.memory.sealInternalShare(actor.id,input.key,input.manifest);
   if(['ready','delivered'].includes(sealed.state))return json({ok:true,state:sealed.state,expiresAt:target.row.expiresAt});
   const pending=await target.memory.internalPendingTargets(actor.id,input.key);
   const links=await resolveTargets(pending.targets.map(x=>x.contact));
   if(JSON.stringify(links)!==JSON.stringify([...pending.targets].sort((a,b)=>a.account.localeCompare(b.account))))return bad(409,'recipient_changed');
   // Durable locators are pre-indexed BEFORE making a complete package
   // available. A partial failure leaves even the already indexed recipients
   // unable to view the content or receive a visible unread notification.
   const prepared=await group(links,async x=>{
    const result=await command(x.account,{action:'internal-index-prepare',direction:'in',key:input.key,story:target.row.story,sender:actor.id,expiresAt:pending.expiresAt});
    return result.ok?x.account:null;
   });
   if(prepared.includes(null))return bad(409,'delivery_incomplete');
   const result=await target.memory.activateInternalShare(actor.id,input.key,prepared);
   return json(result);
  }
  if(op==='list'&&fields(input,'action,direction,after')&&['in','out'].includes(input.direction)){
   const r=await own({action:'internal-index-list',direction:input.direction,after:input.after});
   if(!r.ok)return bad();
   const results=await group(r.items,async row=>{
    const memory=getMemory(row.story),summary=input.direction==='in'?await memory.internalShareSummary(actor.id,row.key):await memory.internalOwnerSummary(actor.id,row.key);
    if(!summary)return null; // incomplete, expired or revoked recipient
    return input.direction==='in'?{key:row.key,sender:row.sender,createdAt:row.createdAt,unread:row.unread,...summary}:
     {key:row.key,createdAt:row.createdAt,...summary}; // no view/read receipts to sender
   });
   return json({ok:true,items:results.filter(Boolean),next:r.next});
  }
  if(op==='received'&&fields(input,'action,key,manifestHash')&&is(H,input.manifestHash)){
   const target=await lookup('in',input.key);if(!target)return bad(404);
   const r=await target.memory.receiveInternalShare(actor.id,input.key,input.manifestHash);
   return r.ok?json({ok:true,received:true}):bad(404);
  }
  if(op==='seen'&&fields(input,'action,key')){
   const target=await lookup('in',input.key);if(!target)return bad(404);
   if(!await target.memory.internalShareSummary(actor.id,input.key))return bad(404);
   // Client invokes after actual presentation opening, never merely listing
   // or requesting media. This flag is recipient-local, idempotent.
   const r=await own({action:'internal-index-seen',direction:'in',key:input.key});
   return r.ok?json({ok:true}):bad(404);
  }
  if(op==='revoke'&&fields(input,'action,key,contact')){
   const target=await lookup('out',input.key);if(!target)return bad(404);
   const recipient=input.contact===null?null:await target.memory.internalRecipientForContact(actor.id,input.key,validAccountId(input.contact));
   if(input.contact!==null&&!recipient)return bad(404);
   const r=await target.memory.revokeInternalShare(actor.id,input.key,recipient);
   return r.ok?json({ok:true}):bad(404);
  }
  return bad(400);
 }catch(e){
  if(e?.message==='REQUEST_TOO_LARGE')return bad(413,'too_large');
  if(['INVALID_SELECTION','CONTACT_NOT_LINKED','CONTACT_UNAVAILABLE'].includes(e?.message))return bad(409,'recipient_unavailable');
  return bad(409,'preparation_or_access_failed');
 }
}
