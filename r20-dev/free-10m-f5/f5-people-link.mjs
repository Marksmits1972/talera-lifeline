import {INTERNAL_INDEX_DUE,internalIndexCommand,expireInternalIndex} from './f5-internal-share-index.mjs';
// Account connection only. No contact names/phones, address book, grant,
// memory, raw invitation or confirmation secret stored on the server.
import {validAccountId,shaHex,safeEqualHex,freshToken,namespacedHash,json,sameOrigin,body} from '../free-10m-auth-pilot/auth-util.mjs';
export const PEOPLE_INVITES='f5-people-invitations-v1';
const LINK='f5-people-link-v1:', REVERSE='f5-people-link-reverse-v1:', BLOCK='f5-people-block-v1:', INBOUND='f5-people-inbound-v1:';
const TTL=24*60*60*1000, MAX_PENDING=32;
const uuid=x=>validAccountId(x);
const hash=x=>{if(typeof x!=='string'||!/^[a-f0-9]{64}$/.test(x))throw Error('PEOPLE_INVALID');return x};
const no=()=>({ok:false});
const validCode=x=>typeof x==='string'&&/^[a-f0-9]{32}$/.test(x);
const sameFields=(x,fields)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===fields.split(',').sort().join(',');
const encode=x=>btoa(String.fromCharCode(...x)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=x=>Uint8Array.from(atob(x.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-x.length%4)%4)),c=>c.charCodeAt(0));
const te=new TextEncoder(),td=new TextDecoder('utf-8',{fatal:true});
async function inviteKey(secret){
 if(typeof secret!=='string'||secret.length<40)throw Error('PEOPLE_SECRET');
 return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',te.encode('TALERA-PEOPLE-INVITE-V1\0'+secret)),{name:'AES-GCM'},false,['encrypt','decrypt']);
}
export async function makePeopleInvite(secret,owner,contact,token,expires){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const value=JSON.stringify([uuid(owner),uuid(contact),hash(token),expires]);
 return 'TALERA1-'+encode(iv)+'.'+encode(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await inviteKey(secret),te.encode(value))));
}
export async function openPeopleInvite(secret,code,now=Date.now()){
 if(typeof code!=='string'||!/^TALERA1-[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{150,300}$/.test(code))throw Error('PEOPLE_INVALID');
 const [iv,cipher]=code.slice(8).split('.');
 const value=JSON.parse(td.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv)},await inviteKey(secret),decode(cipher))));
 if(!Array.isArray(value)||value.length!==4||!Number.isSafeInteger(value[3])||value[3]<=now||value[3]>now+TTL)throw Error('PEOPLE_INVALID');
 return {owner:uuid(value[0]),contact:uuid(value[1]),token:hash(value[2]),expires:value[3]};
}
// Coordinate the one existing account alarm with device-transfer expiry.
// Each side computes the same earliest deadline; never cancel the other.
export async function syncAccountEphemeralAlarm(txn,now){
 const transfer=await txn.get('f5-transfer-ephemeral-v1');
 const t=transfer?.state,d=transfer?.diagnostic;
 const deadlines=[t?.expires,t?.repair?.expires,t?.replacement?.expires,d?.expires].filter(x=>Number.isSafeInteger(x)&&x>now);
 if(!deadlines.length&&transfer?.nextCreate>now)deadlines.push(transfer.nextCreate);
 const inboxDue=await txn.get(INTERNAL_INDEX_DUE);
 if(Number.isSafeInteger(inboxDue))deadlines.push(Math.max(now+1,inboxDue));
 const people=await txn.get(PEOPLE_INVITES)||{};
 for(const row of Object.values(people))if(row.expires>now)deadlines.push(row.expires);
 const next=deadlines.length?Math.min(...deadlines):null;
 if(await txn.getAlarm()!==next){if(next===null)await txn.deleteAlarm();else await txn.setAlarm(next)}
}
export async function expirePeopleInvites(storage,now=Date.now()){
 return storage.transaction(async txn=>{
  const rows=await txn.get(PEOPLE_INVITES)||{},kept=Object.fromEntries(Object.entries(rows).filter(([,r])=>r.expires>now));
  if(Object.keys(kept).length!==Object.keys(rows).length){
   if(Object.keys(kept).length)await txn.put(PEOPLE_INVITES,kept);else await txn.delete(PEOPLE_INVITES);
  }
  await expireInternalIndex(storage,txn,now);
  await syncAccountEphemeralAlarm(txn,now);
 });
}
// Internal RPC only. Public callers cannot supply actor, epoch or arbitrary
// remote mutations. The worker authorizes the current session before routing.
export async function storedPeopleCommand(storage,command,now=Date.now()){
 return storage.transaction(async txn=>{
  const a=await txn.get('account');
  if(!a||a.status!=='active'||(command.epoch!==undefined&&a.epoch!==command.epoch))return no();
  const own=uuid(a.id),op=command.action;
  const canReceive=async id=>id!==own&&!!await txn.get(INBOUND+uuid(id))&&!await txn.get(BLOCK+uuid(id));
  if(op==='can-receive')return {ok:true,allowed:await canReceive(uuid(command.other))};
  if(typeof op==='string'&&op.startsWith('internal-index-')){
   const r=await internalIndexCommand(storage,txn,own,command,now,canReceive);
   if(r.changed)await syncAccountEphemeralAlarm(txn,now);
   return r;
  }

  if(op==='blocked')return {ok:true,blocked:!!await txn.get(BLOCK+uuid(command.other))};
  if(op==='incoming'){
   const id=uuid(command.other);if(id===own||await txn.get(BLOCK+id))return no();
   const old=await txn.get(INBOUND+id);
   if(typeof command.name!=='string'||!command.name.trim()||command.name.length>100)return no();
   if(!old||old.name!==command.name)await txn.put(INBOUND+id,{id,name:command.name});
   return {ok:true};
  }
  if(op==='block'||op==='unblock'){
   const id=uuid(command.other);if(id===own||!await txn.get(INBOUND+id))return no();
   if(op==='block')await txn.put(BLOCK+id,true);else await txn.delete(BLOCK+id);
   return {ok:true};
  }
  if(op==='inbound-list'){
   const result=[];
   const start=command.after?{startAfter:INBOUND+uuid(command.after)}:{};
   const rows=await txn.list({prefix:INBOUND,limit:51,...start});
   for(const row of [...rows.values()].slice(0,50))
    result.push({id:row.id,name:row.name,blocked:!!await txn.get(BLOCK+row.id)});
   return {ok:true,items:result,next:rows.size>50?result.at(-1).id:null};
  }
  if(op==='list'){
   if(!Array.isArray(command.contacts)||command.contacts.length>100)return no();
   const items=[];
   for(const id of new Set(command.contacts.map(uuid))){
    const row=await txn.get(LINK+id);
    if(row)items.push({contact:id,account:row.account});
   }
   return {ok:true,items};
  }
  if(op==='unlink'){
   const id=uuid(command.contact),row=await txn.get(LINK+id);
   const rows=await txn.get(PEOPLE_INVITES)||{};
   if(rows[id]){delete rows[id];if(Object.keys(rows).length)await txn.put(PEOPLE_INVITES,rows);else await txn.delete(PEOPLE_INVITES);await syncAccountEphemeralAlarm(txn,now)}
   if(row){await txn.delete(LINK+id);await txn.delete(REVERSE+row.account)}
   return {ok:true};
  }
  const contact=uuid(command.contact),all=await txn.get(PEOPLE_INVITES)||{};
  const rows=Object.fromEntries(Object.entries(all).filter(([,r])=>r.expires>now));
  const save=async()=>{
   if(Object.keys(rows).length)await txn.put(PEOPLE_INVITES,rows);else await txn.delete(PEOPLE_INVITES);
   await syncAccountEphemeralAlarm(txn,now);
  };
  const linked=await txn.get(LINK+contact);
  if(op==='create'){
   if(linked||!Number.isSafeInteger(command.expires)||command.expires<=now||command.expires>now+TTL||
      (!rows[contact]&&Object.keys(rows).length>=MAX_PENDING))return no();
   if(rows[contact]&&rows[contact].createdAt+3000>now)return no();
   rows[contact]={hash:hash(command.tokenHash),createdAt:now,expires:command.expires,claimed:null,attempts:0};
   await save();return {ok:true};
  }
  const row=rows[contact];
  if(op==='claim'){
   const recipient=uuid(command.recipient);
   if(recipient===own||linked||!row||!safeEqualHex(row.hash,hash(command.tokenHash)))return no();
   if(row.claimed){
    if(row.claimed.account!==recipient||row.claimed.expires<=now)return no();
    return {ok:true,name:a.display_name}; // network retry, exact same recipient
   }
   if(await txn.get(REVERSE+recipient))return no();
   row.claimed={account:recipient,proof:hash(command.proof),expires:row.expires};
   await save();return {ok:true,name:a.display_name};
  }
  if(op==='candidate'){
   if(linked)return {ok:true,account:linked.account};
   return row?.claimed&&row.claimed.expires>now?{ok:true,account:row.claimed.account}:no();
  }
  if(op==='confirm'||op==='preview'){
   const proof=hash(command.proof),recipient=uuid(command.recipient);
   if(linked)return safeEqualHex(linked.receipt,proof)&&linked.account===recipient?{ok:true,account:recipient}:no();
   if(!row?.claimed||row.claimed.account!==recipient||row.claimed.expires<=now||row.attempts>=5)return no();
   if(!safeEqualHex(row.claimed.proof,proof)){
    row.attempts++;
    if(row.attempts>=5)delete rows[contact];
    await save();return no();
   }
   if(await txn.get(REVERSE+recipient))return no();
   if(op==='preview')return {ok:true,account:recipient};
   await txn.put(LINK+contact,{account:recipient,receipt:proof});
   await txn.put(REVERSE+recipient,contact);
   delete rows[contact];await save();return {ok:true,account:recipient};
  }
  return no();
 });
}
// All commands use POST JSON, verified same-origin account session; no token
// in URL, directory, email/phone lookup or auto-association on first opening.
export async function peopleLinkApi(request,env,{getAccount,getHome}){
 if(request.method!=='POST'||!sameOrigin(request)||!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))return json(no(),403);
 const actor=await getAccount();
 if(!actor)return json(no(),401);
 // Client guard against a delayed action after a browser account switch;
 // this header never authenticates anyone or selects a server account.
 if(request.headers.get('x-talera-expected-account')!==actor.id)return json(no(),409);
 const home=getHome(actor.id),now=Date.now();
 const own=cmd=>home.peopleCommand({...cmd,epoch:actor.epoch});
 const remote=(id,cmd)=>getHome(id).peopleCommand(cmd);
 try{
  const input=await body(request),op=input?.action;
  if(op==='create'&&sameFields(input,'action,contact')){
   const contact=uuid(input.contact),token=freshToken(),expires=now+TTL;
   const result=await own({action:'create',contact,tokenHash:await shaHex(token),expires});
   if(!result.ok)return json(no(),409);
   return json({ok:true,invitation:await makePeopleInvite(env.AUTH_NAMESPACE_KEY,actor.id,contact,token,expires),expires});
  }
  if(op==='claim'&&sameFields(input,'action,invitation')){
   const info=await openPeopleInvite(env.AUTH_NAMESPACE_KEY,input.invitation,now);
   if(info.owner===actor.id)return json(no(),409);
   const permission=await own({action:'blocked',other:info.owner});
   if(!permission.ok||permission.blocked)return json(no(),409);
   // Deterministic per invitation and authenticated claimant, so a lost
   // response can be retried without storing or regenerating raw proofs.
   const proof=(await namespacedHash(env.AUTH_NAMESPACE_KEY,'people-confirm-v1:'+info.token+':'+actor.id)).slice(0,32);
   const result=await remote(info.owner,{action:'claim',contact:info.contact,recipient:actor.id,tokenHash:await shaHex(info.token),proof:await shaHex(proof)});
   if(!result.ok||!(await own({action:'incoming',other:info.owner,name:result.name})).ok)return json(no(),409);
   return json({ok:true,confirmation:proof});
  }
  if(['preview','confirm'].includes(op)&&sameFields(input,'action,contact,confirmation')&&validCode(input.confirmation)){
   const contact=uuid(input.contact),candidate=await own({action:'candidate',contact});
   if(!candidate.ok)return json(no(),409);
   const permission=await remote(candidate.account,{action:'blocked',other:actor.id});
   if(!permission.ok||permission.blocked)return json(no(),409);
   const result=await own({action:op,contact,recipient:candidate.account,proof:await shaHex(input.confirmation)});
   if(!result.ok)return json(no(),409);
   if(op==='preview'){
    const profile=await getHome(candidate.account).getProfile();
    if(profile?.status!=='active')return json(no(),409);
    return json({ok:true,name:profile.displayName});
   }
   return json({ok:true});
  }
  if(op==='list'&&sameFields(input,'action,contacts')){
   const result=await own({action:'list',contacts:input.contacts});
   // Only existing local contact IDs and authorized linkage status returned.
   // Do not expose account identifiers as user-editable contact metadata.
   return json(result.ok?{ok:true,linked:result.items.map(r=>r.contact)}:no(),result.ok?200:409);
  }
  if(op==='unlink'&&sameFields(input,'action,contact')){
   const r=await own({action:'unlink',contact:uuid(input.contact)});return json(r,r.ok?200:409);
  }
  if(op==='inbound-list'&&sameFields(input,'action,after')){
   const r=await own({action:'inbound-list',after:input.after===null?null:uuid(input.after)});
   return json(r,r.ok?200:409);
  }
  if(['block','unblock'].includes(op)&&sameFields(input,'action,other')){
   const r=await own({action:op,other:uuid(input.other)});return json(r,r.ok?200:409);
  }
 }catch{return json(no(),409)}
 return json(no(),400);
}
