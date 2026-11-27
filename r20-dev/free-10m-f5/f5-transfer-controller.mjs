const t=(key,params)=>window.TaleraLanguage.t(key,params);
const CHANNEL_LABEL='talera-transfer-v2';
// User-triggered transfer on the EXISTING private backup page only.
import {readTransferLibrary,inventory,makeTransfer,reviewTransfer,commitTransfer} from './f5-transfer-library.mjs';
import {newDirectPeer,gather,checkDirectSDP,sendFrame,frameReceiver,jsonBlob,readJSON,pairingVerificationCode,assertSameFingerprint,createTransferCertificate} from './f5-transfer-transport.mjs';
import {newDiagnostic,safeCandidateKinds,diagnosticError,validDiagnosticEvents,INVITATION_TTL,VERIFICATION_TTL} from './f5-transfer-diagnostic.mjs';
import {drawPairingQR} from './f5-transfer-qr.mjs';
import {pairingScanner} from './f5-transfer-scan.mjs';
const el=id=>document.getElementById(id),scope=el('talera-free-backup')?.dataset.database;
const status=el('transfer-status'),receive=el('transfer-receive'),send=el('transfer-send');
const pair=el('transfer-pair'),join=el('transfer-join'),approve=el('transfer-approve'),apply=el('transfer-import'),stop=el('transfer-cancel');
const input=el('transfer-input'),encoder=new TextEncoder(),hex=v=>Array.from(new Uint8Array(v),b=>b.toString(16).padStart(2,'0')).join('');
const receiveManual=el('transfer-receive-manual'),found=el('transfer-found'),search=el('transfer-search'),connectFound=el('transfer-connect-found');
const verify=el('transfer-verify'),verifyCode=el('transfer-verify-code'),pairManual=el('transfer-pair-manual'),waiting=el('transfer-waiting');
let active=null,flow=0,connecting=false,discovered=null,discoveryTimer=null,discoveryUntil=0,discoveryDelay=2000;
const diagEnable=el('transfer-diagnostic-enable'),diagPanel=el('transfer-diagnostic-panel'),diagReport=el('transfer-diagnostic-report'),diagStatus=el('transfer-diagnostic-status');
let diag=null;
function renderDiagnostic(d){
 if(diag!==d)return;
 const format=events=>events.length?events.map(([ms,phase,detail])=>(ms/1000).toFixed(3)+'s  '+phase+(detail?' '+detail:'')).join('\n'):t('transfer.status.diagEmpty');
 const own=d.events,other=d.remote?.[d.role==='receive'?'send':'receive']||[];
 diagReport.textContent=t('transfer.status.diagReport',{role:d.role,own:format(own),other:(d.stale&&other.length?'['+t('transfer.status.diagUnavailable')+']\n':'')+format(other)});
}
async function syncDiagnostic(d,manual=false){
 if(diag!==d||!diagEnable.checked||!d.locator||(!manual&&d.sends>=24))return;
 if(d.busy){if(!manual)return;while(d.busy&&diag===d)await wait(50);if(diag!==d)return;}
 d.busy=true;d.sends++;d.lastSync=performance.now();
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),6000);
 try{
  const r=await fetch('/api/device-transfer',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',
   headers:{'content-type':'application/json'},body:JSON.stringify({action:'diagnostic',code:d.locator,role:d.role,events:d.events}),
   signal:abort.signal});
  d.mark('DIAG_HTTP',r.status);renderDiagnostic(d);if(!r.ok)throw Error('DIAG');
  const result=await r.json();if(diag!==d)return;
  if(!result.reports||!validDiagnosticEvents(result.reports.receive)||!validDiagnosticEvents(result.reports.send))throw Error('DIAG');
  const remoteRole=d.role==='receive'?'send':'receive';
  if(result.reports[remoteRole].length){d.remote=result.reports;d.stale=false}
  else d.stale=true;
  diagStatus.textContent=t(!d.stale?'transfer.status.diagUpdated':'transfer.status.diagUnavailable');renderDiagnostic(d);
 }catch{if(diag===d){d.stale=true;renderDiagnostic(d);diagStatus.textContent=t('transfer.status.diagUnavailable')}}
 finally{clearTimeout(timer);d.busy=false;if(diag===d&&d.dirty){d.dirty=false;scheduleDiagnostic(d)}}
}
function scheduleDiagnostic(d){
 if(diag!==d||!d.locator||d.sends>=24)return;
 if(d.busy){d.dirty=true;return}
 if(d.timer)return;
 d.timer=setTimeout(()=>{d.timer=null;void syncDiagnostic(d)},Math.max(0,1200-(performance.now()-d.lastSync)));
}
function markDiagnostic(phase,detail=0){
 const d=diag;if(!d||!diagEnable.checked)return;
 // Routine polling must not exhaust the bounded diagnostic upload budget.
 if(['POLL_HTTP','DISCOVER_HTTP','DISCOVER_EMPTY','RETRYOFFER_HTTP'].includes(phase)){
  d.routine||=new Map();
  if(d.routine.get(phase)===detail)return;
  d.routine.set(phase,detail);
 }
 d.mark(phase,detail);renderDiagnostic(d);scheduleDiagnostic(d);
}
function beginDiagnostic(role){
 if(diag?.timer)clearTimeout(diag.timer);
 diag=null;if(!diagEnable.checked)return;
 diag=newDiagnostic(role);diag.lastSync=-10000;diag.sends=0;diagStatus.textContent='';diagEnable.disabled=true;
 markDiagnostic('START');
}
function diagnosticLocator(locator){if(diag){diag.locator=locator;scheduleDiagnostic(diag)}}
function observePeer(s){
 const peer=s.peer,d=diag;
 const emit=(phase)=>{if(diag===d&&active===s&&s.peer===peer)markDiagnostic(phase)};
 const last=new Map();
 const snapshot=()=>{
  if(active!==s||s.peer!==peer)return;
  for(const [kind,state] of [['GATHER',peer.iceGatheringState],['ICE',peer.iceConnectionState],['PEER',peer.connectionState]]){
   if(last.get(kind)===state)continue;last.set(kind,state);emit(kind+'_'+String(state).toUpperCase());
  }
  monitorConnection(s);
 };
 for(const event of ['icegatheringstatechange','iceconnectionstatechange','connectionstatechange'])peer.addEventListener(event,snapshot);
 peer.addEventListener('icecandidate',e=>{for(const kind of safeCandidateKinds(e.candidate))emit(kind)});
 snapshot();
}
diagEnable.addEventListener('change',()=>{if(diag?.timer)clearTimeout(diag.timer);diag=null;diagPanel.hidden=!diagEnable.checked;diagReport.textContent='';diagStatus.textContent=diagEnable.checked?t('transfer.status.diagStart'):''});
el('transfer-diagnostic-refresh').addEventListener('click',()=>{if(diag){if(diag.locator)void syncDiagnostic(diag,true);else{renderDiagnostic(diag);diagStatus.textContent=t('transfer.status.diagUnavailable')}}});
el('transfer-diagnostic-copy').addEventListener('click',async()=>{
 if(!diag)return;
 // Copy the already displayed snapshot synchronously from the tap; the separate
 // refresh button fetches both devices without depending on clipboard permission.
 try{await navigator.clipboard.writeText(diagReport.textContent);diagStatus.textContent=t('transfer.status.diagCopied')}
 catch{diagStatus.textContent=t('transfer.status.diagCopyFail')}
});
const say=text=>{status.textContent=text};
const qr=el('transfer-qr'),scanButton=el('transfer-scan'),scanStop=el('transfer-scan-stop');
const scan=pairingScanner({translate:t,video:el('transfer-camera'),report:msg=>{say(msg);if(el('transfer-camera').hidden){scanButton.disabled=false;scanStop.hidden=true}},onCode:code=>{
 if(join.hidden||active)return;
 scanButton.disabled=false;scanStop.hidden=true;
 input.value=code.match(/.{1,5}/g).join('-').toUpperCase();
 say(t('transfer.status.qrRead'));el('transfer-connect').focus();
}});
function closeCamera(){scan.stop();scanButton.disabled=false;scanStop.hidden=true}
function clearQR(){qr.hidden=true;qr.width=qr.height=1}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const codeHash=async code=>hex(await crypto.subtle.digest('SHA-256',encoder.encode('talera-transfer-v1:'+code)));
async function proof(code,type,sdp){
 const key=await crypto.subtle.importKey('raw',encoder.encode(code),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(await crypto.subtle.sign('HMAC',key,encoder.encode(type+'\n'+sdp)));
}
async function account(){
 markDiagnostic('ACCOUNT_BEGIN');
 const r=await fetch('/api/me',{credentials:'same-origin',cache:'no-store',redirect:'error'});
 markDiagnostic('ACCOUNT_HTTP',r.status);
 if(!r.ok)throw Error('ACCOUNT');
 const id=(await r.json())?.account?.id;
 if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw Error('ACCOUNT');
 const hash=hex(await crypto.subtle.digest('SHA-256',encoder.encode('TALERA_FREE_BROWSER_MEMORY_V1:'+id.toLowerCase())));
 if(scope!=='talera-free-local-'+hash.slice(0,32)+'-v1')throw Error('ACCOUNT');
 markDiagnostic('ACCOUNT_OK');
}
async function api(action,locator,extra={}){
 markDiagnostic(action.toUpperCase()+'_BEGIN');
 const r=await fetch('/api/device-transfer',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',
 headers:{'content-type':'application/json'},body:JSON.stringify({action,code:locator,...extra}),signal:AbortSignal.timeout(8000)});
 markDiagnostic(action.toUpperCase()+'_HTTP',r.status);
 if(!r.ok)throw Error('PAIR');
 return r.json();
}
function live(s){if(active!==s||s.closed)throw Error('STOPPED')}
function reset(){
 diagEnable.disabled=false;
 clearTimeout(discoveryTimer);discoveryTimer=null;flow++;connecting=false;el('transfer-connect').disabled=false;closeCamera();clearQR();
 receive.disabled=send.disabled=receiveManual.disabled=false;pair.hidden=join.hidden=approve.hidden=apply.hidden=stop.hidden=true;
 found.hidden=verify.hidden=pairManual.hidden=true;waiting.hidden=false;search.disabled=connectFound.disabled=false;
 discovered=null;verifyCode.textContent='';el('transfer-manual-receive').open=el('transfer-manual-send').open=false;
 el('transfer-code').textContent='';input.value='';
}
async function finish(s,message,{signal=true}={}){
 if(active!==s)return;
 if(s.phase==='complete')markDiagnostic('TRANSFER_DONE');
 active=null;s.closed=true;clearTimeout(s.timer);clearTimeout(s.recoveryTimer);clearTimeout(s.repairPollTimer);
 try{s.channel?.close()}catch{}try{s.peer?.close()}catch{}
 reset();say(message);
 if(signal&&s.locator){
  const d=diag;
  // Cancel signaling immediately; retain the opted-in report separately.
  void api('cancel',s.locator).catch(()=>{});
  void (async()=>{
   if(d?.locator===s.locator&&diagEnable.checked){
    if(d.timer){clearTimeout(d.timer);d.timer=null}
    // Wait for any in-flight upload and the existing rate limit before the final snapshot.
    while(d.busy&&diag===d)await wait(50);
    if(diag===d){await wait(Math.max(0,1200-(performance.now()-d.lastSync)));await syncDiagnostic(d,true)}
   }
  })();
 }
 void s.receiver?.dispose();
}
function failure(s,error){
 if(active!==s)return;
 markDiagnostic(diagnosticError(error));
 const raw=String(error?.message||'');
 const message=/CONFLICT|EXISTING_CONTENT|DUPLICATE/.test(raw)?
  t('transfer.status.conflict'):
  /ACCOUNT/.test(raw)?t('transfer.status.accountChanged'):
  /STORAGE|Quota|MEMORY/.test(raw)?t('transfer.status.storage'):
  s.committing?t('transfer.status.commitUnconfirmed'):
  t('transfer.status.failed');
 void finish(s,message);
}
function timeout(s,ms){
 clearTimeout(s.timer);s.timer=setTimeout(()=>failure(s,Error('TIMEOUT')),ms);
}
function newSession(role,certificate){
 if(active)throw Error('BUSY');
 let peer;
 try{peer=newDirectPeer(0,certificate)}catch(e){if(!certificate)throw e;certificate=null;peer=newDirectPeer(0)}
 const s={role,route:0,peer,certificate,closed:false,approved:false,otherReady:false,started:false,plan:null,archive:null};
 active=s;markDiagnostic('ROUTE_LOCAL');observePeer(s);receive.disabled=send.disabled=receiveManual.disabled=true;stop.hidden=false;timeout(s,INVITATION_TTL+20000);

 return s;
}
// Keep the same reliable data channel and temporary receive sink during a
// short network interruption. Never re-send unverified bytes on a new channel.
const RECOVERY_LIMIT=90000,REPAIR_AFTER=8000,REPAIR_POLL=15000;
function connectionInterrupted(s){
 return s.replacing||s.repairNegotiating||['disconnected','failed'].includes(s.peer.iceConnectionState)||
  ['disconnected','failed'].includes(s.peer.connectionState);
}
function monitorConnection(s){
 if(!s.openHandled||s.closed||s.committing||active!==s)return;
 if(connectionInterrupted(s)){
  if(s.recoveryTimer){scheduleRepair(s,0);return;}
  s.recoverySince=Date.now();s.recoveryStatus=status.textContent;
  markDiagnostic('RECOVERY_WAIT');say(t('transfer.status.connecting'));
  s.recoveryTimer=setTimeout(()=>{if(active===s&&connectionInterrupted(s)){
   markDiagnostic('RECOVERY_TIMEOUT');failure(s,Error('NETWORK'));
  }},RECOVERY_LIMIT);
  scheduleRepair(s,REPAIR_AFTER);
 }else if(s.recoveryTimer){
  clearTimeout(s.recoveryTimer);s.recoveryTimer=null;s.recoverySince=null;
  markDiagnostic('RECOVERY_OK');
  if(status.textContent===t('transfer.status.connecting'))say(s.recoveryStatus);
 }
}
// One active restart per verified pair. The receiving device is the sole
// offerer, even when the sender notices loss first. Poll slowly in healthy
// periods only while the authorized transfer is open; accelerate on loss.
function scheduleRepair(s,delay=REPAIR_POLL){
 if(!s.verification||!s.openRegistered||s.replacementDone||s.repairDone&&!s.certificate||s.repairBusy||active!==s||s.closed||s.committing)return;
 clearTimeout(s.repairPollTimer);
 s.repairPollTimer=setTimeout(()=>void repairTick(s),delay);
}
async function repairTick(s){
 if(active!==s||s.closed||s.replacementDone||s.repairBusy||s.committing)return;
 s.repairBusy=true;
 try{
  const failed=s.peer.iceConnectionState==='failed'||s.peer.connectionState==='failed';
  if(s.replacing&&!s.replacementRequested){
   await account();live(s);await api('replaceRequest',s.locator);live(s);
   s.replacementRequested=true;markDiagnostic('REPLACE_REQUEST');
  }
  if(!s.replacing&&!s.repairDone&&!s.repairRequested&&!s.repairNegotiating&&connectionInterrupted(s)&&(failed||Date.now()-(s.recoverySince??Date.now())>=REPAIR_AFTER)){
   await account();live(s);await api('repairRequest',s.locator);live(s);
   s.repairRequested=true;markDiagnostic('REPAIR_REQUEST');
  }
  const {repair,replacement}=await api('repairPoll',s.locator);live(s);
  if(replacement){await replacementTick(s,replacement);return}
  if(s.replacing||s.repairDone||!repair)return;
  if(s.channel?.readyState!=='open')throw Error('NETWORK');
  s.repairNegotiating=true;monitorConnection(s);
  const auth=(type,sdp)=>proof(s.secret,'repair-v1:'+s.locator+':'+s.verification+':'+type,sdp);
  const checked=(original,sdp,side)=>routeSDP(s,assertSameFingerprint(original,sdp),side);
  if(s.role==='receive'){
   if(!s.repairOffer){
    if(repair.offer)throw Error('PAIR');
    await account();live(s);
    const offer=checked(s.offer,await gather(s.peer,await s.peer.createOffer({iceRestart:true})),'LOCAL');live(s);
    await api('repairOffer',s.locator,{sdp:offer,proof:await auth('offer',offer)});live(s);
    s.repairOffer=offer;markDiagnostic('REPAIR_OFFER');
   }
   if(repair.answer&&!s.repairApplied){
    if(repair.answer.proof!==await auth('answer',repair.answer.sdp))throw Error('PAIR');
    const answer=checked(s.answer,repair.answer.sdp,'REMOTE');live(s);
    await s.peer.setRemoteDescription({type:'answer',sdp:answer});live(s);
    s.repairApplied=true;markDiagnostic('REPAIR_ANSWER');
   }
  }else if(repair.offer&&!s.repairApplied){
   if(repair.offer.proof!==await auth('offer',repair.offer.sdp))throw Error('PAIR');
   await account();live(s);const offer=checked(s.offer,repair.offer.sdp,'REMOTE');
   await s.peer.setRemoteDescription({type:'offer',sdp:offer});live(s);
   const answer=checked(s.answer,await gather(s.peer,await s.peer.createAnswer()),'LOCAL');live(s);
   await api('repairAnswer',s.locator,{sdp:answer,proof:await auth('answer',answer)});live(s);
   s.repairApplied=true;markDiagnostic('REPAIR_ANSWER');
  }
  if(s.repairApplied){
   s.repairNegotiating=false;s.repairDone=true;markDiagnostic('REPAIR_APPLIED');monitorConnection(s);
  }
 }catch(e){
  // A transient HTTP fault before negotiation does not break an otherwise
  // healthy data channel. A failed authenticated negotiation fails closed.
  if((s.repairNegotiating||s.replacementPeer)&&active===s)failure(s,e);
 }finally{
  s.repairBusy=false;if(active===s&&!s.replacementDone)scheduleRepair(s,connectionInterrupted(s)||s.repairRequested?2000:REPAIR_POLL);
 }
}
function canReplace(s){
 return s.certificate&&s.started&&s.approved&&s.otherReady&&!s.committing&&!s.replacementDone&&
  (s.role==='send'?s.phase==='done'&&s.outgoingArchive:['archive','review','confirm'].includes(s.phase));
}
function requestReplacement(s){
 if(!canReplace(s))throw Error('NETWORK');
 s.replacing=true;s.repairNegotiating=false;monitorConnection(s);scheduleRepair(s,0);
}
async function replacementTick(s,record){
 live(s);if(!canReplace(s))throw Error('NETWORK');
 if(!s.replacing)requestReplacement(s);
 const auth=(type,sdp)=>proof(s.secret,'replace-v1:'+s.locator+':'+s.verification+':'+type,sdp);
 const checked=(original,sdp,side)=>routeSDP(s,assertSameFingerprint(original,sdp),side);
 if(!s.replacementPeer){
  await account();live(s);
  // A new peer uses ONLY the exact ephemeral certificate whose fingerprint
  // was verified by the human comparison on the original channel.
  const old=s.peer;s.replacementPeer=newDirectPeer(s.route,s.certificate);s.peer=s.replacementPeer;
  observePeer(s);try{s.channel.close()}catch{}try{old.close()}catch{}
  if(s.role==='receive')watchReplacementChannel(s,s.peer.createDataChannel(CHANNEL_LABEL,{ordered:true}));
  else s.peer.addEventListener('datachannel',event=>{if(active===s&&s.peer===s.replacementPeer)try{watchReplacementChannel(s,event.channel)}catch(e){failure(s,e)}});
 }
 if(s.role==='receive'){
  if(!s.replacementOffer){
   if(record.offer)throw Error('PAIR');
   const offer=checked(s.offer,await gather(s.peer,await s.peer.createOffer()),'LOCAL');live(s);
   await api('replaceOffer',s.locator,{sdp:offer,proof:await auth('offer',offer)});live(s);
   s.replacementOffer=offer;markDiagnostic('REPLACE_OFFER');
  }
  if(record.answer&&!s.replacementApplied){
   if(record.answer.proof!==await auth('answer',record.answer.sdp))throw Error('PAIR');
   const answer=checked(s.answer,record.answer.sdp,'REMOTE');live(s);
   await s.peer.setRemoteDescription({type:'answer',sdp:answer});live(s);
   s.replacementApplied=true;markDiagnostic('REPLACE_ANSWER');
  }
 }else if(record.offer&&!s.replacementApplied){
  if(record.offer.proof!==await auth('offer',record.offer.sdp))throw Error('PAIR');
  const offer=checked(s.offer,record.offer.sdp,'REMOTE');live(s);
  await s.peer.setRemoteDescription({type:'offer',sdp:offer});live(s);
  const answer=checked(s.answer,await gather(s.peer,await s.peer.createAnswer()),'LOCAL');live(s);
  await api('replaceAnswer',s.locator,{sdp:answer,proof:await auth('answer',answer)});live(s);
  s.replacementApplied=true;markDiagnostic('REPLACE_ANSWER');
 }
}
function watchReplacementChannel(s,channel){
 if(channel.label!==CHANNEL_LABEL||s.replacementChannel)throw Error('PROTOCOL');
 s.replacementChannel=channel;
 const opened=async()=>{
  if(active!==s||s.replacementDone||s.installingReplacement)return;
  s.installingReplacement=true;
  try{
   // The remote description has been authenticated before the DTLS channel
   // opens. The old queued blocks are drained before accepting resume.
   await s.receiver.replaceChannel(channel);live(s);
   s.channel=channel;s.replacementDone=true;s.replacing=false;s.repairDone=true;
   markDiagnostic('REPLACE_OPEN');monitorConnection(s);
  }catch(e){failure(s,e)}
 };
 channel.addEventListener('open',opened);if(channel.readyState==='open')void opened();
 channel.addEventListener('close',()=>{if(active===s&&!s.committing)failure(s,Error('NETWORK'))});
}
async function recoverArchiveChannel(s,old){
 if(!s.replacing&&!s.replacementDone)requestReplacement(s);
 const until=Date.now()+RECOVERY_LIMIT;
 while(active===s&&Date.now()<until){
  if(s.replacementDone&&s.channel!==old&&s.channel.readyState==='open')return s.channel;
  await wait(100);
 }
 throw Error('NETWORK');
}
async function awaitConnection(s){
 live(s);monitorConnection(s);
 if(!connectionInterrupted(s))return 0;
 const start=Date.now();
 while(connectionInterrupted(s)){
  live(s);
  if(Date.now()-(s.recoverySince??start)>=RECOVERY_LIMIT)throw Error('NETWORK');
  if(s.channel?.readyState!=='open'&&!s.replacing)throw Error('NETWORK');
  await wait(100);
 }
 live(s);monitorConnection(s);return Date.now()-start;
}
function queueFrame(s,kind,blob,progress){
 const next=(s.outbound||Promise.resolve()).then(()=>{live(s);const old=s.channel;return sendFrame(old,kind,blob,progress,()=>awaitConnection(s),kind==='archive'?()=>recoverArchiveChannel(s,old):null)});
 s.outbound=next;return next;
}
async function sendJSON(s,kind,value){await queueFrame(s,kind,jsonBlob(value))}
async function maybeStart(s){
 if(s.started||!s.approved||!s.otherReady)return;
 markDiagnostic('TRANSFER_START');s.started=true;s.phase=s.role==='receive'?'plan':'inventory';timeout(s,30*60*1000);await account();live(s);await api('active',s.locator);live(s);
 if(s.role==='receive'){
  say(t('transfer.status.checkLibrary'));
  const own=await inventory(await readTransferLibrary(scope));live(s);
  s.phase='plan';await sendJSON(s,'inventory',own);
 }else if(s.phase==='inventory'){say(t('transfer.status.waitOtherCheck'))}
}
async function handleFrame(s,kind,blob){
 live(s);
 if(kind==='ready'){
  if(s.otherReady||(await readJSON(blob))?.ready!==true)throw Error('PROTOCOL');
  markDiagnostic('OTHER_READY');s.otherReady=true;await maybeStart(s);return;
 }
 if(!s.started&&s.approved&&s.otherReady)await maybeStart(s);
 if(!s.started)throw Error('PROTOCOL');
 if(kind==='error')throw Error('CONFLICT');
 if(s.role==='send'&&kind==='inventory'&&s.phase==='inventory'){
  s.phase='preparing';say(t('transfer.status.determineNew'));
  await account();live(s);
  const result=await makeTransfer(await readTransferLibrary(scope),await readJSON(blob),scope,location.origin);live(s);
  s.phase='done';s.expected=result.count;
  await sendJSON(s,'plan',{count:result.count,duplicates:result.duplicates,reuse:result.reuse});
  if(result.archive){s.outgoingArchive=true;say(t('transfer.status.sending'));void queueFrame(s,'archive',result.archive,(n,total)=>say(t('transfer.status.sendProgress',{percent:Math.floor(100*n/total)}))).catch(e=>failure(s,e));}
  else say(t('transfer.status.noneFound'));
  return;
 }
 if(s.role==='receive'&&kind==='plan'&&s.phase==='plan'){
  const plan=await readJSON(blob);
  if(Object.keys(plan).sort().join()!=='count,duplicates,reuse'||!Number.isSafeInteger(plan.count)||plan.count<0||plan.count>100000||
     !Number.isSafeInteger(plan.duplicates)||plan.duplicates<0||!Array.isArray(plan.reuse))throw Error('PROTOCOL');
  s.plan=plan;
  if(!plan.count){
   s.phase='complete';s.resultMessage=t('transfer.status.noneBoth');say(s.resultMessage);
   await sendJSON(s,'done',{count:0});return;
  }
  s.phase='archive';say(t('transfer.status.receivingCount',{count:plan.count}));return;
 }
 if(s.role==='receive'&&kind==='archive'&&s.phase==='archive'){
  s.phase='review';say(t('transfer.status.checkMedia'));
  await account();live(s);
  const result=await reviewTransfer(blob,s.plan.reuse,await readTransferLibrary(scope),scope,location.origin);live(s);
  if(result.stories.length!==s.plan.count)throw Error('PROTOCOL');
  s.archive=blob;s.phase='confirm';
  say(t('transfer.status.review',{count:result.stories.length,duplicates:s.plan.duplicates}));
  apply.hidden=false;apply.disabled=false;return;
 }
 if(s.role==='send'&&kind==='done'&&s.phase==='done'){
  const result=await readJSON(blob);
  if(!Number.isSafeInteger(result.count)||result.count!==s.expected)throw Error('PROTOCOL');
  s.phase='complete';
  await finish(s,t('transfer.status.doneOther',{count:result.count}));return;
 }
 throw Error('PROTOCOL');
}
function routeSDP(s,sdp,side){
 const counts=checkDirectSDP(sdp,s.route);
 for(const kind of ['host','srflx'])markDiagnostic(side+'_'+kind.toUpperCase(),Math.min(counts[kind],600));
 return sdp;
}
function watchChannel(s){
 const peer=s.peer;
 peer.addEventListener('datachannel',event=>{
  if(active!==s||s.peer!==peer)return;
  try{if(event.channel.label!==CHANNEL_LABEL)throw Error('PROTOCOL');attach(s,event.channel)}catch(e){failure(s,e)}
 });
}
async function switchToStun(s){
 live(s);
 if(s.route!==0||s.verification||s.channel?.readyState==='open')throw Error('NETWORK');
 const old=s.peer,oldChannel=s.channel,oldReceiver=s.receiver;
 s.route=1;s.openHandled=false;
 try{s.peer=newDirectPeer(1,s.certificate)}catch(e){if(!s.certificate)throw e;s.certificate=null;s.peer=newDirectPeer(1)}
 s.channel=null;s.receiver=null;
 try{oldChannel?.close()}catch{}try{old.close()}catch{}void oldReceiver?.dispose();
 markDiagnostic('ROUTE_STUN');observePeer(s);
 say(t('transfer.status.connecting'));timeout(s,45000);
}
async function awaitChannel(s,ms){
 const until=Date.now()+ms;
 while(Date.now()<until){live(s);if(s.channel?.readyState==='open'||s.verification)return true;await wait(200)}
 live(s);return s.channel?.readyState==='open';
}
async function reportSelectedRoute(s,peer){
 try{
  const stats=await Promise.race([peer.getStats(),wait(2000).then(()=>null)]);
  if(!stats||active!==s||s.peer!==peer)return;
  const transport=[...stats.values()].find(entry=>entry.type==='transport'&&entry.selectedCandidatePairId);
  const pair=transport?stats.get(transport.selectedCandidatePairId):[...stats.values()].find(entry=>entry.type==='candidate-pair'&&entry.state==='succeeded'&&entry.nominated);
  if(!pair)return;
  for(const [side,id] of [['LOCAL',pair.localCandidateId],['REMOTE',pair.remoteCandidateId]]){
   const kind=String(stats.get(id)?.candidateType||'').toUpperCase();
   if(['HOST','SRFLX','PRFLX','RELAY'].includes(kind))markDiagnostic('SELECTED_'+side+'_'+kind);
  }
 }catch{} // optional diagnostics must not block transfer
}
function attach(s,channel){
 if(s.channel)throw Error('PROTOCOL');
 s.channel=channel;markDiagnostic('CHANNEL_CREATED');
 const receiver=frameReceiver(channel,(kind,blob)=>{if(s.receiver===receiver)return handleFrame(s,kind,blob)},error=>{if(s.receiver===receiver&&!s.committing)failure(s,error)},(kind,n,total)=>{
  if(kind==='archive')say(t('transfer.status.receiveProgress',{percent:Math.floor(n*100/total)}));
 },(kind,bytes)=>{
  // Reject unexpected frames BEFORE allocating memory or OPFS. The
  // prior queued frame has completed protocol validation at this point.
  if(active!==s||s.receiver!==receiver||s.closed||s.committing||bytes<=0)return false;
  if(kind==='ready')return !s.otherReady&&bytes<=100;
  if(!s.approved||!s.otherReady)return false;
  if(kind==='inventory')return s.role==='send'&&s.phase==='inventory';
  if(kind==='plan')return s.role==='receive'&&s.phase==='plan';
  if(kind==='archive')return s.role==='receive'&&s.phase==='archive';
  if(kind==='done')return s.role==='send'&&s.phase==='done'&&bytes<=100;
  return false;
 });
 s.receiver=receiver;
 const onOpen=async()=>{
  if(active!==s||s.channel!==channel||s.openHandled)return;s.openHandled=true;markDiagnostic('CHANNEL_OPEN');markDiagnostic('ROUTE_OPEN',s.route);if(diag)void reportSelectedRoute(s,s.peer);timeout(s,VERIFICATION_TTL);clearQR();closeCamera();pair.hidden=join.hidden=true;el('transfer-code').textContent='';input.value='';
  try{
   s.verification=await pairingVerificationCode(s.locator,s.offer,s.answer);live(s);
   await api('opened',s.locator);live(s);s.openRegistered=true;scheduleRepair(s);
   markDiagnostic('VERIFICATION_READY');verifyCode.textContent=s.verification;verify.hidden=false;
   say(t('transfer.status.verify'));approve.hidden=false;approve.disabled=false;
   // Keep temporary signaling available until the pair is finished or expires.
  }catch(e){failure(s,e)}
 };
 channel.addEventListener('open',onOpen);
 if(channel.readyState==='open')void onOpen();
 channel.addEventListener('close',()=>{
  if(active!==s||s.channel!==channel)return;markDiagnostic('CHANNEL_CLOSE');
  if(!s.verification&&!s.started)return; // bounded negotiation can still retry
  if(s.committing&&s.phase!=='complete')return;
  if(s.phase==='complete')void finish(s,s.resultMessage||t('transfer.status.complete'));
  else if(s.replacing)return;
  else if(canReplace(s))requestReplacement(s);
  else failure(s,Error('NETWORK'));
 });
}
async function startReceive(automatic){
 if(active||connecting)return;beginDiagnostic('receive');
 const run=++flow;connecting=true;receive.disabled=send.disabled=receiveManual.disabled=true;stop.hidden=false;
 let s;
 try{
  await account();const certificate=await createTransferCertificate();if(run!==flow)return;connecting=false;s=newSession('receive',certificate);say(t('transfer.status.prepare'));
  attach(s,s.peer.createDataChannel(CHANNEL_LABEL,{ordered:true}));
  const code=hex(crypto.getRandomValues(new Uint8Array(10)));
  s.secret=code;s.locator=(await codeHash(code)).slice(0,32);live(s);
  markDiagnostic('LOCAL_OFFER_BEGIN');const offer=routeSDP(s,await gather(s.peer,await s.peer.createOffer()),'LOCAL');live(s);s.offer=offer;markDiagnostic('LOCAL_OFFER_OK');
  const signature=await proof(code,'offer',offer);live(s);
  await api('create',s.locator,{sdp:offer,proof:signature,...(automatic?{secret:code}:{})});
  if(active!==s){void api('cancel',s.locator).catch(()=>{});return}
  diagnosticLocator(s.locator);markDiagnostic('CREATE_OK');
  pairManual.hidden=automatic;waiting.hidden=!automatic;pair.hidden=false;
  if(!automatic){
   el('transfer-code').textContent=code.match(/.{1,5}/g).join('-').toUpperCase();
   try{drawPairingQR(qr,code);qr.hidden=false}catch{clearQR()}
  }
  say(automatic?t('transfer.status.autoReady'):t('transfer.status.codeReady'));
  const until=Date.now()+INVITATION_TTL;timeout(s,INVITATION_TTL+10000);
  let pollDelay=2000;
  while(Date.now()<until){
   await wait(Math.min(pollDelay,Math.max(0,until-Date.now())));live(s);const r=await api('poll',s.locator);live(s);
   if(!r.answer){pollDelay=Math.min(5000,pollDelay+1000);continue}markDiagnostic('ANSWER_RECEIVED');
   if(r.answer.proof!==await proof(code,'answer',r.answer.sdp))throw Error('PAIR');
   live(s);s.answer=routeSDP(s,r.answer.sdp,'REMOTE');
   markDiagnostic('REMOTE_ANSWER_BEGIN');await s.peer.setRemoteDescription({type:'answer',sdp:s.answer});live(s);markDiagnostic('REMOTE_ANSWER_OK');
   if(!s.openHandled)timeout(s,60000);
   if(await awaitChannel(s,9000))return;
   await switchToStun(s);
   attach(s,s.peer.createDataChannel(CHANNEL_LABEL,{ordered:true}));
   s.offer=routeSDP(s,await gather(s.peer,await s.peer.createOffer()),'LOCAL');live(s);
   await api('retry',s.locator,{sdp:s.offer,proof:await proof(code,'offer-stun',s.offer)});live(s);
   const retryUntil=Date.now()+25000;
   while(Date.now()<retryUntil){
    await wait(1500);live(s);const next=await api('poll',s.locator);live(s);
    if(!next.answer)continue;
    if(next.answer.proof!==await proof(code,'answer-stun',next.answer.sdp))throw Error('PAIR');
    live(s);s.answer=routeSDP(s,next.answer.sdp,'REMOTE');
    await s.peer.setRemoteDescription({type:'answer',sdp:s.answer});live(s);
    if(await awaitChannel(s,15000))return;
    throw Error('NETWORK');
   }
   throw Error('TIMEOUT');
  }
  throw Error('TIMEOUT');
 }catch(e){if(s)failure(s,e);else if(run===flow){markDiagnostic(diagnosticError(e));reset();say(t('transfer.status.noAccount'))}}
}
receive.addEventListener('click',()=>void startReceive(true));
receiveManual.addEventListener('click',()=>void startReceive(false));
function cancelDiscovery(){clearTimeout(discoveryTimer);discoveryTimer=null}
async function discover(){
 cancelDiscovery();
 if(active||connecting||join.hidden||el('transfer-manual-send').open)return;
 if(Date.now()>=discoveryUntil){say(t('transfer.status.notFound'));return}
 const run=++flow;connecting=true;search.disabled=true;discovered=null;found.hidden=true;
 closeCamera();say(t('transfer.status.search'));
 try{
  await account();if(run!==flow)return;
  const r=await api('discover');if(run!==flow)return;
  const invitation=r.invitation;
  if(invitation===null){
   if(el('transfer-manual-send').open)return;
   markDiagnostic('DISCOVER_EMPTY');
   if(Date.now()<discoveryUntil){discoveryTimer=setTimeout(()=>void discover(),Math.min(discoveryDelay,discoveryUntil-Date.now()));discoveryDelay=Math.min(15000,discoveryDelay*2)}
   else say(t('transfer.status.notFound'));
   return
  }
  if(!invitation||Object.keys(invitation).sort().join()!=='code,secret'||typeof invitation.code!=='string'||typeof invitation.secret!=='string'||!/^[a-f0-9]{32}$/.test(invitation.code)||!/^[a-f0-9]{20}$/.test(invitation.secret)||(await codeHash(invitation.secret)).slice(0,32)!==invitation.code)throw Error('PAIR');
  if(run!==flow)return;discovered=invitation;diagnosticLocator(invitation.code);markDiagnostic('DISCOVER_FOUND');found.hidden=false;say(t('transfer.status.found'));
  if(!el('transfer-manual-send').open){connecting=false;void connect(invitation.secret,invitation.code)}
 }catch(e){if(run===flow){markDiagnostic('DISCOVER_ERROR');say(t('transfer.status.searchFailed'))}}
 finally{if(run===flow){connecting=false;search.disabled=false}}
}
send.addEventListener('click',()=>{
 if(active||connecting)return;beginDiagnostic('send');join.hidden=false;stop.hidden=false;receive.disabled=send.disabled=receiveManual.disabled=true;discoveryUntil=Date.now()+INVITATION_TTL;discoveryDelay=2000;void discover();
});
search.addEventListener('click',()=>{el('transfer-manual-send').open=false;discoveryUntil=Date.now()+INVITATION_TTL;discoveryDelay=2000;void discover()});
el('transfer-manual-send').addEventListener('toggle',()=>{if(el('transfer-manual-send').open)cancelDiscovery()});
scanButton.addEventListener('click',()=>{
 if(active||connecting||join.hidden)return;
 scanButton.disabled=true;scanStop.hidden=false;void scan.start();
});
scanStop.addEventListener('click',()=>{closeCamera();say(t('transfer.status.cameraClosed'))});
async function connect(code,expectedLocator=null){
 if(active||connecting||join.hidden)return;
 if(!/^[a-f0-9]{20}$/.test(code)){say(t('transfer.status.codeIncomplete'));return}
 cancelDiscovery();let s;const run=++flow;
 try{
  connecting=true;discovered=null;el('transfer-connect').disabled=connectFound.disabled=search.disabled=true;closeCamera();
  await account();const certificate=await createTransferCertificate();if(run!==flow)return;connecting=false;s=newSession('send',certificate);join.hidden=true;say(t('transfer.status.connecting'));
  s.secret=code;s.locator=(await codeHash(code)).slice(0,32);live(s);
  if(expectedLocator&&expectedLocator!==s.locator)throw Error('PAIR');
  diagnosticLocator(s.locator);
  const r=await api('offer',s.locator);live(s);
  if(!r.offer||r.offer.proof!==await proof(code,'offer',r.offer.sdp))throw Error('PAIR');
  live(s);s.offer=routeSDP(s,r.offer.sdp,'REMOTE');diagnosticLocator(s.locator);markDiagnostic('OFFER_OK');
  watchChannel(s);
  markDiagnostic('REMOTE_OFFER_BEGIN');await s.peer.setRemoteDescription({type:'offer',sdp:s.offer});live(s);markDiagnostic('REMOTE_OFFER_OK');
  markDiagnostic('LOCAL_ANSWER_BEGIN');const answer=routeSDP(s,await gather(s.peer,await s.peer.createAnswer()),'LOCAL');live(s);s.answer=answer;markDiagnostic('LOCAL_ANSWER_OK');
  const signature=await proof(code,'answer',answer);live(s);
  await api('join',s.locator,{sdp:answer,proof:signature});live(s);markDiagnostic('JOIN_OK');if(!s.openHandled)timeout(s,65000);
  const retryUntil=Date.now()+35000;
  while(Date.now()<retryUntil){
   if(await awaitChannel(s,1500))return;
   const next=await api('retryOffer',s.locator);live(s);
   if(s.channel?.readyState==='open'||s.verification)return;
   if(!next.offer)continue;
   if(next.offer.proof!==await proof(code,'offer-stun',next.offer.sdp))throw Error('PAIR');
   live(s);await switchToStun(s);watchChannel(s);
   s.offer=routeSDP(s,next.offer.sdp,'REMOTE');
   await s.peer.setRemoteDescription({type:'offer',sdp:s.offer});live(s);
   s.answer=routeSDP(s,await gather(s.peer,await s.peer.createAnswer()),'LOCAL');live(s);
   await api('retryJoin',s.locator,{sdp:s.answer,proof:await proof(code,'answer-stun',s.answer)});live(s);
   if(await awaitChannel(s,25000))return;
   throw Error('NETWORK');
  }
  throw Error('TIMEOUT');
 }catch(e){if(s)failure(s,e);else if(run===flow){markDiagnostic(diagnosticError(e));reset();say(t('transfer.status.connectFailed'))}}
}
el('transfer-connect').addEventListener('click',()=>void connect(input.value.trim().replace(/-/g,'').toLowerCase()));
connectFound.addEventListener('click',()=>{if(discovered)void connect(discovered.secret,discovered.code)});
approve.addEventListener('click',async()=>{
 const s=active;if(!s||s.approved||!s.verification)return;approve.disabled=true;
 try{await account();live(s);s.approved=true;markDiagnostic('APPROVED');if(s.role==='send'&&s.otherReady)s.phase='inventory';
  await sendJSON(s,'ready',{ready:true});say(t('transfer.status.waitConfirm'));await maybeStart(s);
 }catch(e){failure(s,e)}
});
apply.addEventListener('click',async()=>{
 const s=active;if(!s||s.phase!=='confirm')return;
 apply.disabled=true;stop.disabled=true;s.committing=true;clearTimeout(s.timer);
 try{
  await account();live(s);say(t('transfer.status.committing'));
  const result=await commitTransfer(s.archive,s.plan.reuse,scope,location.origin,{confirmed:true});
  s.phase='complete';s.resultMessage=t('transfer.status.doneLocal',{count:result.count});
  say(s.resultMessage);apply.hidden=true;
  await sendJSON(s,'done',{count:result.count});
 }catch(e){failure(s,e)}finally{stop.disabled=false}
});
stop.addEventListener('click',()=>{markDiagnostic('STOPPED');if(active&&!active.committing)void finish(active,t('transfer.status.stopped'));else if(!active){reset();say(t('transfer.status.connectionStopped'))}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)closeCamera();markDiagnostic(document.hidden?'PAGE_HIDDEN':'PAGE_VISIBLE')});
window.addEventListener('pagehide',()=>{closeCamera();clearQR();if(active&&!active.committing)void finish(active,t('transfer.status.pageExit'));else if(!active)reset()});

window.addEventListener('online',()=>markDiagnostic('NETWORK_ONLINE'));
window.addEventListener('offline',()=>markDiagnostic('NETWORK_OFFLINE'));
