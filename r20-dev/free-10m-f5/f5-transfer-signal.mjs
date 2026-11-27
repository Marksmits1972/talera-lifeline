import {validDiagnosticEvents,DIAG_TTL} from './f5-transfer-diagnostic.mjs';
// Temporary, per-account, non-persistent signaling. No media or library data.
const CODE=/^[a-f0-9]{32}$/;
const HASH=/^[a-f0-9]{64}$/;
const SECRET=/^[a-f0-9]{20}$/;
const TTL=120000;
const err=()=>{throw Error('TALERA_PAIR_UNAVAILABLE')};
const validSDP=(s,type)=>typeof s==='string'&&s.length<=12000&&s.startsWith('v=0')&&
 s.split(/\r?\n/).some(l=>l.startsWith('m=application '))&&
 !s.split(/\r?\n/).some(l=>/^m=(audio|video) /.test(l))&&
 ['offer','answer'].includes(type);
export class TransferSignaling {
 constructor(now=()=>Date.now()){this.now=now;this.state=null;this.nextCreate=0;this.diagnostic=null}
 handle(session,command){
  if(!HASH.test(session)||!command||typeof command!=='object'||Array.isArray(command))err();
  const {action,code,sdp,proof,secret}=command;
  const now=this.now();
  if(this.state&&this.state.expires<=now)this.state=null;
  if(this.diagnostic&&this.diagnostic.expires<=now)this.diagnostic=null;
  if(action==='diagnostic'){
   const {role,events}=command;
   if(Object.keys(command).sort().join()!=='action,code,events,role'||typeof code!=='string'||!CODE.test(code)||
      !['receive','send'].includes(role)||!validDiagnosticEvents(events))err();
   const st=this.state;
   let d=this.diagnostic;
   if(!d||d.code!==code){
    if(!st||st.code!==code||role==='receive'&&st.owner!==session||role==='send'&&(st.owner===session||st.joiner&&st.joiner!==session))err();
    d=this.diagnostic={code,owner:st.owner,joiner:st.joiner,expires:now+DIAG_TTL,receive:null,send:null};
   }
   if(role==='receive'&&d.owner!==session||role==='send'&&(d.owner===session||d.joiner&&d.joiner!==session||st?.code===code&&st.joiner&&st.joiner!==session))err();
   if(role==='send')d.joiner=session;
   const previous=d[role];
   // Rate and memory bounded; permit a read without replacing a trace.
   if(events.length&&(!previous||now-previous.at>=1000))d[role]={at:now,events:events.map(e=>e.slice())};
   return {ok:true,reports:{receive:d.receive?.events||[],send:d.send?.events||[]}};
  }
  if(action==='discover'){
   if(Object.keys(command).join()!=='action')err();
   const st=this.state;
   if(!st||st.owner===session||st.joiner||!st.secret)return {ok:true,invitation:null};
   // The authenticated account boundary is enforced by the calling Worker/DO.
   // No device ID, account data, SDP or media is included in this discovery.
   return {ok:true,invitation:{code:st.code,secret:st.secret}};
  }
  const fields={create:['action','code','sdp','proof'],join:['action','code','sdp','proof'],poll:['action','code'],cancel:['action','code'],retry:['action','code','sdp','proof'],retryOffer:['action','code'],retryJoin:['action','code','sdp','proof']};
  if(action==='create'&&Object.hasOwn(command,'secret')){
   if(typeof secret!=='string'||!SECRET.test(secret))err();
   fields.create.push('secret');
  }
  if(!Object.hasOwn(fields,action)||Object.keys(command).sort().join()!==fields[action].sort().join()||!CODE.test(code))err();
  if(action==='create'){
   if(this.state||now<this.nextCreate||!validSDP(sdp,'offer')||!HASH.test(proof))err();
   this.nextCreate=now+3000;
   this.state={code,owner:session,offer:{sdp,proof},expires:now+TTL,joiner:null,answer:null,route:0,secret:secret||null};
   return {ok:true};
  }
  const st=this.state;
  if(!st||code!==st.code)err();
  // Only the original pair may negotiate ONE fallback, with fresh SDP proofs.
  if(action==='retry'){
   if(st.owner!==session||!st.joiner||!st.answer||st.route!==0||!validSDP(sdp,'offer')||!HASH.test(proof))err();
   st.route=1;st.offer={sdp,proof};st.answer=null;st.expires=now+60000;return {ok:true};
  }
  if(action==='retryOffer'){
   if(st.joiner!==session)err();
   return {ok:true,offer:st.route===1?st.offer:null};
  }
  if(action==='retryJoin'){
   if(st.route!==1||st.joiner!==session||st.answer||!validSDP(sdp,'answer')||!HASH.test(proof))err();
   st.answer={sdp,proof};return {ok:true};
  }
  if(action==='join'){
   if(st.owner===session||st.joiner||!validSDP(sdp,'answer')||!HASH.test(proof))err();
   st.joiner=session;st.answer={sdp,proof};st.secret=null;st.expires=Math.max(st.expires,now+60000);return {ok:true};
  }
  if(action==='poll'){
   if(st.owner!==session)err();
   return {ok:true,answer:st.answer};
  }
  if(action==='cancel'){
   if(st.owner!==session&&st.joiner!==session)err();
   this.state=null;return {ok:true};
  }
  err();
 }
 // The joiner needs the offer before creating its answer. Reserve only after
 // proof-bearing answer; a leaked locator alone cannot forge HMAC.
 offer(session,code){
  const st=this.state;
  if(!HASH.test(session)||!CODE.test(code)||!st||st.expires<=this.now()||
     st.code!==code||st.owner===session||st.joiner)err();
  return {ok:true,offer:st.offer};
 }
}
