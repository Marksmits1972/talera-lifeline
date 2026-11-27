import {validDiagnosticEvents,DIAG_TTL,INVITATION_TTL,VERIFICATION_TTL,PAIR_STALE_MS} from './f5-transfer-diagnostic.mjs';
// Temporary, per-account signaling. No media or library data.
const CODE=/^[a-f0-9]{32}$/;
const HASH=/^[a-f0-9]{64}$/;
const SECRET=/^[a-f0-9]{20}$/;
// Retire only on a new, valid invitation request, never on a timer alone.
// Allow the existing 90-second recovery window plus a safety margin.
const ACTIVITY_WRITE_INTERVAL=10000;
const err=()=>{throw Error('TALERA_PAIR_UNAVAILABLE')};
const validSDP=(s,type)=>typeof s==='string'&&s.length<=12000&&s.startsWith('v=0')&&
 s.split(/\r?\n/).some(l=>l.startsWith('m=application '))&&
 !s.split(/\r?\n/).some(l=>/^m=(audio|video) /.test(l))&&
 ['offer','answer'].includes(type);
export class TransferSignaling {
 constructor(now=()=>Date.now()){this.now=now;this.state=null;this.nextCreate=0;this.diagnostic=null}
 prune(now=this.now()){
  if(this.state&&this.state.expires<=now)this.state=null;
  // Older persisted invitations have no activity clock. Start a full grace
  // window on first observation instead of declaring them abandoned.
  if(this.state&&!Number.isSafeInteger(this.state.activityAt))this.state.activityAt=now;
  for(const key of ['repair','replacement'])if(this.state?.[key]?.expires<=now&&this.state[key].offer!==undefined)this.state[key]={expires:this.state[key].expires};
  if(this.diagnostic&&this.diagnostic.expires<=now)this.diagnostic=null;
  if(this.nextCreate<=now)this.nextCreate=0;
 }
 handle(session,command){
  const result=this.handleCommand(session,command);
  const st=this.state,now=this.now();
  // Only successful, authorized pair traffic counts. Diagnostic and discovery
  // reads must not keep an abandoned record alive. Coalesce durable writes.
  if(result.ok&&st&&command.code===st.code&&
     (st.owner===session||st.joiner===session)&&!['diagnostic','discover'].includes(command.action)&&
     now-st.activityAt>=ACTIVITY_WRITE_INTERVAL)st.activityAt=now;
  return result;
 }
 handleCommand(session,command){
  if(!HASH.test(session)||!command||typeof command!=='object'||Array.isArray(command))err();
  const {action,code,sdp,proof,secret}=command;
  const now=this.now();
  this.prune(now);
  if(action==='diagnostic'){
   const {role,events}=command;
   if(Object.keys(command).sort().join()!=='action,code,events,role'||typeof code!=='string'||!CODE.test(code)||
      !['receive','send'].includes(role)||!validDiagnosticEvents(events))err();
   const st=this.state;
   let d=this.diagnostic;
   if(!d||d.code!==code){
    if(!st||st.code!==code||role==='receive'&&st.owner!==session||role==='send'&&(st.owner===session||st.joiner&&st.joiner!==session))err();
    d=this.diagnostic={code,owner:st.owner,joiner:st.joiner,expires:Math.max(now,st.expires)+DIAG_TTL,receive:null,send:null};
   }
   if(role==='receive'&&d.owner!==session||role==='send'&&(d.owner===session||d.joiner&&d.joiner!==session||st?.code===code&&st.joiner&&st.joiner!==session))err();
   if(role==='send')d.joiner=session;
   const previous=d[role];
   // Rate and memory bounded; permit a read without replacing a trace.
   if(events.length&&(!previous||now-previous.at>=1000)&&JSON.stringify(previous?.events)!==JSON.stringify(events)){
    d[role]={at:now,events:events.map(e=>e.slice())};
    if(st?.code===code)d.expires=st.expires+DIAG_TTL;
   }
   const recent=role=>d[role]?.events||[];
   return {ok:true,reports:{receive:recent('receive'),send:recent('send')}};
  }
  if(action==='discover'){
   if(Object.keys(command).join()!=='action')err();
   const st=this.state;
   if(!st||st.owner===session||st.joiner||!st.secret)return {ok:true,invitation:null};
   // The authenticated account boundary is enforced by the calling Worker/DO.
   // No device ID, account data, SDP or media is included in this discovery.
   return {ok:true,invitation:{code:st.code,secret:st.secret}};
  }
  const fields={create:['action','code','sdp','proof'],join:['action','code','sdp','proof'],poll:['action','code'],cancel:['action','code'],keep:['action','code'],retry:['action','code','sdp','proof'],retryOffer:['action','code'],retryJoin:['action','code','sdp','proof'],opened:['action','code'],active:['action','code'],repairRequest:['action','code'],repairPoll:['action','code'],repairOffer:['action','code','sdp','proof'],repairAnswer:['action','code','sdp','proof'],replaceRequest:['action','code'],replaceOffer:['action','code','sdp','proof'],replaceAnswer:['action','code','sdp','proof']};
  if(action==='create'&&Object.hasOwn(command,'secret')){
   if(typeof secret!=='string'||!SECRET.test(secret))err();
   fields.create.push('secret');
  }
  if(!Object.hasOwn(fields,action)||Object.keys(command).sort().join()!==fields[action].sort().join()||!CODE.test(code))err();
  if(action==='create'){
   if(!validSDP(sdp,'offer')||!HASH.test(proof))err();
   const old=this.state;
   const remaining=Math.max(old?old.activityAt+PAIR_STALE_MS-now:0,this.nextCreate-now);
   if(remaining>0)return {ok:false,reason:'PAIR_BUSY',retryAfterMs:Math.min(PAIR_STALE_MS,remaining)};
   if(old?.code===code)err();
   // A prior attempt is retired atomically with creation of the new locator;
   // late requests using the old locator cannot cancel or modify the new one.
   if(old&&this.diagnostic?.code===old.code)this.diagnostic.expires=now+DIAG_TTL;
   this.nextCreate=now+3000;
   this.state={code,owner:session,offer:{sdp,proof},expires:now+INVITATION_TTL,joiner:null,answer:null,route:0,secret:secret||null,activityAt:now};
   return old?{ok:true,retired:true}:{ok:true};
  }
  const st=this.state;
  if(!st||code!==st.code)err();
  const participant=st.owner===session?'receive':st.joiner===session?'send':null;
  if(action==='keep'){
   if(!participant)err();
   return {ok:true};
  }
  if(['opened','active','repairRequest','repairPoll','repairOffer','repairAnswer','replaceRequest','replaceOffer','replaceAnswer'].includes(action)){
   if(!participant||!st.joiner||(!st.answer&&!st.negotiated))err();
   if(action==='opened'){
    st.opened??={};if(!st.opened[participant]){
     st.opened[participant]=now||1;
     st.expires=Math.max(st.expires,now+VERIFICATION_TTL);this.extendDiagnostic(st);
    }
    return {ok:true};
   }
   if(action==='active'){
    if(!st.opened?.[participant])err();
    st.active??={};if(!st.active[participant]){
     st.active[participant]=true;
     if(st.active.receive&&st.active.send){
      st.expires=now+30*60000;st.negotiated=true;st.offer=null;st.answer=null;this.extendDiagnostic(st);
     }
    }
    return {ok:true};
   }
   if(!st.opened?.[participant])err();
   if(action.startsWith('replace')){
    if(!st.active?.receive||!st.active?.send)err();
    if(action==='replaceRequest'){
     st.replacement??={expires:Math.min(st.expires,now+90000),offer:null,answer:null};
     if(st.replacement.expires<=now)err();
     return {ok:true};
    }
    const replacement=st.replacement;
    if(!replacement||replacement.expires<=now||!HASH.test(proof)||!validSDP(sdp,action==='replaceOffer'?'offer':'answer'))err();
    if(action==='replaceOffer'){
     if(participant!=='receive'||replacement.offer)err();
     replacement.offer={sdp,proof};return {ok:true};
    }
    if(participant!=='send'||!replacement.offer||replacement.answer)err();
    replacement.answer={sdp,proof};return {ok:true};
   }
   if(action==='repairRequest'){
    st.repair??={expires:Math.min(st.expires,now+90000),offer:null,answer:null};
    if(st.repair.expires<=now)err();
    return {ok:true};
   }
   const repair=st.repair;
   if(action==='repairPoll')return {ok:true,repair:repair&&repair.expires>now?repair:null,replacement:st.replacement&&st.replacement.expires>now?st.replacement:null};
   if(!repair||repair.expires<=now||!HASH.test(proof)||!validSDP(sdp,action==='repairOffer'?'offer':'answer'))err();
   if(action==='repairOffer'){
    if(participant!=='receive'||repair.offer)err();
    repair.offer={sdp,proof};return {ok:true};
   }
   if(participant!=='send'||!repair.offer||repair.answer)err();
   repair.answer={sdp,proof};return {ok:true};
  }
  // Only the original pair may negotiate ONE fallback, with fresh SDP proofs.
  if(action==='retry'){
   if(st.owner!==session||!st.joiner||!st.answer||st.route!==0||!validSDP(sdp,'offer')||!HASH.test(proof))err();
   st.route=1;st.offer={sdp,proof};st.answer=null;st.expires=now+VERIFICATION_TTL;this.extendDiagnostic(st);return {ok:true};
  }
  if(action==='retryOffer'){
   if(st.joiner!==session)err();
   return {ok:true,offer:st.route===1?st.offer:null};
  }
  if(action==='retryJoin'){
   if(st.route!==1||st.joiner!==session||st.answer||!validSDP(sdp,'answer')||!HASH.test(proof))err();
   st.answer={sdp,proof};st.expires=now+VERIFICATION_TTL;this.extendDiagnostic(st);return {ok:true};
  }
  if(action==='join'){
   if(st.owner===session||st.joiner||!validSDP(sdp,'answer')||!HASH.test(proof))err();
   st.joiner=session;st.answer={sdp,proof};st.secret=null;
   if(this.diagnostic?.code===code&&this.diagnostic.joiner!==session){this.diagnostic.joiner=session;this.diagnostic.send=null;}st.expires=now+VERIFICATION_TTL;this.extendDiagnostic(st);return {ok:true};
  }
  if(action==='poll'){
   if(st.owner!==session)err();
   return {ok:true,answer:st.answer};
  }
  if(action==='cancel'){
   if(st.owner!==session&&st.joiner!==session)err();
   if(this.diagnostic?.code===code)this.diagnostic.expires=now+DIAG_TTL;
   this.state=null;return {ok:true};
  }
  err();
 }
 extendDiagnostic(st){if(this.diagnostic?.code===st.code)this.diagnostic.expires=st.expires+DIAG_TTL;}
 // The joiner needs the offer before creating its answer. Reserve only after
 // proof-bearing answer; a leaked locator alone cannot forge HMAC.
 offer(session,code){
  const st=this.state;
  if(!HASH.test(session)||!CODE.test(code)||!st||st.expires<=this.now()||
     st.code!==code||st.owner===session||st.joiner)err();
  return {ok:true,offer:st.offer};
 }
}

// The account object's isolate may restart between requests. Store only the
// bounded pairing record and its opt-in sanitized report, not account or media.
// One alarm removes the expired record even when both browsers are gone.
export const TRANSFER_STORAGE_KEY='f5-transfer-ephemeral-v1';
async function accessSignaling(storage,operation,now){
 return storage.transaction(async txn=>{
  const original=await txn.get(TRANSFER_STORAGE_KEY);
  const signal=new TransferSignaling(()=>now);
  if(original){signal.state=original.state;signal.nextCreate=original.nextCreate;signal.diagnostic=original.diagnostic;}
  const before=JSON.stringify(original||null);
  signal.prune(now);
  let result,error;
  try{result=operation?.(signal)}catch(e){error=e}
  const expiries=[signal.state?.expires,signal.state?.repair?.expires,signal.state?.replacement?.expires,signal.diagnostic?.expires].filter(x=>x>now);
  if(!expiries.length&&signal.nextCreate>now)expiries.push(signal.nextCreate);
  const record=expiries.length?{state:signal.state,nextCreate:signal.nextCreate,diagnostic:signal.diagnostic}:null;
  if(JSON.stringify(record)!==before){
   if(record)await txn.put(TRANSFER_STORAGE_KEY,record);
   else await txn.delete(TRANSFER_STORAGE_KEY);
  }
  const next=expiries.length?Math.min(...expiries):null;
  if(await txn.getAlarm()!==next){
   if(next===null)await txn.deleteAlarm();
   else await txn.setAlarm(next);
  }
  return {result,error:error?.message};
 }).then(({result,error})=>{if(error)throw Error(error);return result});
}
export const storedTransferSignal=(storage,session,command,now=Date.now())=>
 accessSignaling(storage,s=>command?.action==='offer'?s.offer(session,command.code):s.handle(session,command),now);
export const expireTransferSignaling=(storage,now=Date.now())=>accessSignaling(storage,null,now);
