// User-triggered transfer on the EXISTING private backup page only.
import {readTransferLibrary,inventory,makeTransfer,reviewTransfer,commitTransfer} from './f5-transfer-library.mjs';
import {newDirectPeer,gather,sendFrame,frameReceiver,jsonBlob,readJSON,pairingVerificationCode} from './f5-transfer-transport.mjs';
import {newDiagnostic,safeCandidateKinds,diagnosticError,validDiagnosticEvents} from './f5-transfer-diagnostic.mjs';
import {drawPairingQR} from './f5-transfer-qr.mjs';
import {pairingScanner} from './f5-transfer-scan.mjs';
const el=id=>document.getElementById(id),scope=el('talera-free-backup')?.dataset.database;
const status=el('transfer-status'),receive=el('transfer-receive'),send=el('transfer-send');
const pair=el('transfer-pair'),join=el('transfer-join'),approve=el('transfer-approve'),apply=el('transfer-import'),stop=el('transfer-cancel');
const input=el('transfer-input'),encoder=new TextEncoder(),hex=v=>Array.from(new Uint8Array(v),b=>b.toString(16).padStart(2,'0')).join('');
const receiveManual=el('transfer-receive-manual'),found=el('transfer-found'),search=el('transfer-search'),connectFound=el('transfer-connect-found');
const verify=el('transfer-verify'),verifyCode=el('transfer-verify-code'),pairManual=el('transfer-pair-manual'),waiting=el('transfer-waiting');
let active=null,flow=0,connecting=false,discovered=null;
const diagEnable=el('transfer-diagnostic-enable'),diagPanel=el('transfer-diagnostic-panel'),diagReport=el('transfer-diagnostic-report'),diagStatus=el('transfer-diagnostic-status');
let diag=null;
function renderDiagnostic(d){
 if(diag!==d)return;
 const format=events=>events.length?events.map(([ms,phase,detail])=>(ms/1000).toFixed(3)+'s  '+phase+(detail?' '+detail:'')).join('\n'):'Nog geen gegevens';
 const own=d.events,other=d.remote?.[d.role==='receive'?'send':'receive']||[];
 diagReport.textContent='TALERA diagnose v1 — '+d.role+'\nEIGEN APPARAAT\n'+format(own)+'\n\nANDER APPARAAT\n'+format(other);
}
async function syncDiagnostic(d,manual=false){
 if(diag!==d||!diagEnable.checked||!d.locator||d.busy||(!manual&&d.sends>=12))return;
 d.busy=true;d.sends++;d.lastSync=performance.now();
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),6000);
 try{
  const r=await fetch('/api/device-transfer',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',
   headers:{'content-type':'application/json'},body:JSON.stringify({action:'diagnostic',code:d.locator,role:d.role,events:d.events}),
   signal:abort.signal});
  if(!r.ok)throw Error('DIAG');
  const result=await r.json();if(diag!==d)return;
  if(!result.reports||!validDiagnosticEvents(result.reports.receive)||!validDiagnosticEvents(result.reports.send))throw Error('DIAG');
  d.remote=result.reports;diagStatus.textContent='Technische diagnose bijgewerkt.';renderDiagnostic(d);
 }catch{if(diag===d)diagStatus.textContent='Andere apparaat nog niet bereikbaar voor diagnose. Eigen diagnose blijft beschikbaar.'}
 finally{clearTimeout(timer);d.busy=false;if(diag===d&&d.dirty){d.dirty=false;scheduleDiagnostic(d)}}
}
function scheduleDiagnostic(d){
 if(diag!==d||!d.locator||d.sends>=12)return;
 if(d.busy){d.dirty=true;return}
 if(d.timer)return;
 d.timer=setTimeout(()=>{d.timer=null;void syncDiagnostic(d)},Math.max(0,1200-(performance.now()-d.lastSync)));
}
function markDiagnostic(phase,detail=0){
 const d=diag;if(!d||!diagEnable.checked)return;
 d.mark(phase,detail);renderDiagnostic(d);scheduleDiagnostic(d);
}
function beginDiagnostic(role){
 if(diag?.timer)clearTimeout(diag.timer);
 diag=null;if(!diagEnable.checked)return;
 diag=newDiagnostic(role);diag.lastSync=-10000;diag.sends=0;diagStatus.textContent='';diagEnable.disabled=true;
 markDiagnostic('START');
}
function diagnosticLocator(locator){if(diag)diag.locator=locator}
function observePeer(s){
 if(!diag)return;
 const peer=s.peer,d=diag;
 const emit=(phase)=>{if(diag===d&&active===s)markDiagnostic(phase)};
 const snapshot=()=>{
  emit('GATHER_'+String(peer.iceGatheringState).toUpperCase());
  emit('ICE_'+String(peer.iceConnectionState).toUpperCase());
  emit('PEER_'+String(peer.connectionState).toUpperCase());
 };
 for(const event of ['icegatheringstatechange','iceconnectionstatechange','connectionstatechange'])peer.addEventListener(event,snapshot);
 peer.addEventListener('icecandidate',e=>{for(const kind of safeCandidateKinds(e.candidate))emit(kind)});
 snapshot();
}
diagEnable.addEventListener('change',()=>{if(diag?.timer)clearTimeout(diag.timer);diag=null;diagPanel.hidden=!diagEnable.checked;diagReport.textContent='';diagStatus.textContent=diagEnable.checked?'Start nu een verbinding.':''});
el('transfer-diagnostic-refresh').addEventListener('click',()=>{if(diag)void syncDiagnostic(diag,true)});
el('transfer-diagnostic-copy').addEventListener('click',async()=>{
 if(!diag)return;try{await navigator.clipboard.writeText(diagReport.textContent);diagStatus.textContent='Diagnose gekopieerd.'}
 catch{diagStatus.textContent='Kopiëren niet beschikbaar; selecteer de technische tekst hieronder.'}
});
const say=text=>{status.textContent=text};
const qr=el('transfer-qr'),scanButton=el('transfer-scan'),scanStop=el('transfer-scan-stop');
const scan=pairingScanner({video:el('transfer-camera'),report:msg=>{say(msg);if(el('transfer-camera').hidden){scanButton.disabled=false;scanStop.hidden=true}},onCode:code=>{
 if(join.hidden||active)return;
 scanButton.disabled=false;scanStop.hidden=true;
 input.value=code.match(/.{1,5}/g).join('-').toUpperCase();
 say('QR-code gelezen. Tik op Verbinden.');el('transfer-connect').focus();
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
 headers:{'content-type':'application/json'},body:JSON.stringify({action,code:locator,...extra})});
 markDiagnostic(action.toUpperCase()+'_HTTP',r.status);
 if(!r.ok)throw Error('PAIR');
 return r.json();
}
function live(s){if(active!==s||s.closed)throw Error('STOPPED')}
function reset(){
 diagEnable.disabled=false;
 flow++;connecting=false;el('transfer-connect').disabled=false;closeCamera();clearQR();
 receive.disabled=send.disabled=receiveManual.disabled=false;pair.hidden=join.hidden=approve.hidden=apply.hidden=stop.hidden=true;
 found.hidden=verify.hidden=pairManual.hidden=true;waiting.hidden=false;search.disabled=connectFound.disabled=false;
 discovered=null;verifyCode.textContent='';el('transfer-manual-receive').open=el('transfer-manual-send').open=false;
 el('transfer-code').textContent='';input.value='';
}
async function finish(s,message,{signal=true}={}){
 if(active!==s)return;
 if(s.phase==='complete')markDiagnostic('TRANSFER_DONE');
 active=null;s.closed=true;clearTimeout(s.timer);
 try{s.channel?.close()}catch{}try{s.peer?.close()}catch{}
 reset();say(message);
 if(signal&&s.locator)api('cancel',s.locator).catch(()=>{});
 void s.receiver?.dispose();
}
function failure(s,error){
 if(active!==s)return;
 markDiagnostic(diagnosticError(error));
 const raw=String(error?.message||'');
 const message=/CONFLICT|EXISTING_CONTENT|DUPLICATE/.test(raw)?
  'Er is een verschil met een bestaande herinnering. De overdracht is gestopt; niets wordt overschreven.':
  /ACCOUNT/.test(raw)?'Je account is gewijzigd. Open dit onderdeel opnieuw.':
  /STORAGE|Quota|MEMORY/.test(raw)?'Niet genoeg beschikbare opslag of geheugen. Gebruik de bestaande back-up.':
  s.committing?'De opslag kon niet volledig worden bevestigd. Controleer Mijn leven; probeer niet blind opnieuw.':
  'De verbinding of overdracht is niet gelukt. Houd beide apps open op hetzelfde wifi-netwerk of gebruik de bestaande back-up.';
 void finish(s,message);
}
function timeout(s,ms){
 clearTimeout(s.timer);s.timer=setTimeout(()=>failure(s,Error('TIMEOUT')),ms);
}
function newSession(role){
 if(active)throw Error('BUSY');
 const s={role,peer:newDirectPeer(),closed:false,approved:false,otherReady:false,started:false,plan:null,archive:null};
 active=s;observePeer(s);receive.disabled=send.disabled=receiveManual.disabled=true;stop.hidden=false;timeout(s,140000);
 s.peer.addEventListener('connectionstatechange',()=>{if(['failed','closed'].includes(s.peer.connectionState)&&active===s&&!s.committing)failure(s,Error('NETWORK'))});
 return s;
}
function queueFrame(s,kind,blob,progress){
 const next=(s.outbound||Promise.resolve()).then(()=>{live(s);return sendFrame(s.channel,kind,blob,progress)});
 s.outbound=next;return next;
}
async function sendJSON(s,kind,value){await queueFrame(s,kind,jsonBlob(value))}
async function maybeStart(s){
 if(s.started||!s.approved||!s.otherReady)return;
 markDiagnostic('TRANSFER_START');s.started=true;s.phase=s.role==='receive'?'plan':'inventory';timeout(s,30*60*1000);await account();live(s);
 if(s.role==='receive'){
  say('Lokale bibliotheek controleren…');
  const own=await inventory(await readTransferLibrary(scope));live(s);
  s.phase='plan';await sendJSON(s,'inventory',own);
 }else if(s.phase==='inventory'){say('Wachten op controle van het andere apparaat…')}
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
  s.phase='preparing';say('Nieuwe herinneringen bepalen…');
  await account();live(s);
  const result=await makeTransfer(await readTransferLibrary(scope),await readJSON(blob),scope,location.origin);live(s);
  s.phase='done';s.expected=result.count;
  await sendJSON(s,'plan',{count:result.count,duplicates:result.duplicates,reuse:result.reuse});
  if(result.archive){say('Herinneringen versturen…');await queueFrame(s,'archive',result.archive,(n,total)=>say('Versturen: '+Math.floor(100*n/total)+'%'));}
  else say('Geen nieuwe herinneringen gevonden.');
  return;
 }
 if(s.role==='receive'&&kind==='plan'&&s.phase==='plan'){
  const plan=await readJSON(blob);
  if(Object.keys(plan).sort().join()!=='count,duplicates,reuse'||!Number.isSafeInteger(plan.count)||plan.count<0||plan.count>100000||
     !Number.isSafeInteger(plan.duplicates)||plan.duplicates<0||!Array.isArray(plan.reuse))throw Error('PROTOCOL');
  s.plan=plan;
  if(!plan.count){
   s.phase='complete';s.resultMessage='Geen nieuwe herinneringen. Beide bibliotheken blijven ongewijzigd.';say(s.resultMessage);
   await sendJSON(s,'done',{count:0});return;
  }
  s.phase='archive';say(plan.count+' nieuwe herinneringen ontvangen…');return;
 }
 if(s.role==='receive'&&kind==='archive'&&s.phase==='archive'){
  s.phase='review';say('Bestanden en originele media controleren…');
  await account();live(s);
  const result=await reviewTransfer(blob,s.plan.reuse,await readTransferLibrary(scope),scope,location.origin);live(s);
  if(result.stories.length!==s.plan.count)throw Error('PROTOCOL');
  s.archive=blob;s.phase='confirm';
  say(result.stories.length+' nieuwe herinneringen gecontroleerd. '+s.plan.duplicates+' bestaande herinneringen blijven ongewijzigd.');
  apply.hidden=false;apply.disabled=false;return;
 }
 if(s.role==='send'&&kind==='done'&&s.phase==='done'){
  const result=await readJSON(blob);
  if(!Number.isSafeInteger(result.count)||result.count!==s.expected)throw Error('PROTOCOL');
  s.phase='complete';
  await finish(s,result.count+' herinneringen toegevoegd en gecontroleerd op het andere apparaat. Je eigen herinneringen blijven behouden.');return;
 }
 throw Error('PROTOCOL');
}
function attach(s,channel){
 if(s.channel)throw Error('PROTOCOL');
 s.channel=channel;markDiagnostic('CHANNEL_CREATED');
 s.receiver=frameReceiver(channel,(kind,blob)=>handleFrame(s,kind,blob),error=>{if(!s.committing)failure(s,error)},(kind,n,total)=>{
  if(kind==='archive')say('Ontvangen: '+Math.floor(n*100/total)+'%');
 },(kind,bytes)=>{
  // Reject unexpected frames BEFORE allocating memory or OPFS. The
  // prior queued frame has completed protocol validation at this point.
  if(active!==s||s.closed||s.committing||bytes<=0)return false;
  if(kind==='ready')return !s.otherReady&&bytes<=100;
  if(!s.approved||!s.otherReady)return false;
  if(kind==='inventory')return s.role==='send'&&s.phase==='inventory';
  if(kind==='plan')return s.role==='receive'&&s.phase==='plan';
  if(kind==='archive')return s.role==='receive'&&s.phase==='archive';
  if(kind==='done')return s.role==='send'&&s.phase==='done'&&bytes<=100;
  return false;
 });
 channel.addEventListener('open',async()=>{
  if(active!==s)return;markDiagnostic('CHANNEL_OPEN');clearQR();closeCamera();pair.hidden=join.hidden=true;el('transfer-code').textContent='';input.value='';
  try{
   s.verification=await pairingVerificationCode(s.locator,s.offer,s.answer);live(s);
   markDiagnostic('VERIFICATION_READY');verifyCode.textContent=s.verification;verify.hidden=false;
   say('Vergelijk de beveiligingscodes en bevestig op beide apparaten.');approve.hidden=false;approve.disabled=false;
   if(s.locator)api('cancel',s.locator).catch(()=>{});
  }catch(e){failure(s,e)}
 });
 channel.addEventListener('close',()=>{
  if(active!==s)return;markDiagnostic('CHANNEL_CLOSE');
  if(s.committing&&s.phase!=='complete')return;
  if(s.phase==='complete')void finish(s,s.resultMessage||'Overdracht voltooid.');
  else failure(s,Error('NETWORK'));
 });
}
async function startReceive(automatic){
 if(active||connecting)return;beginDiagnostic('receive');
 const run=++flow;connecting=true;receive.disabled=send.disabled=receiveManual.disabled=true;stop.hidden=false;
 let s;
 try{
  await account();if(run!==flow)return;connecting=false;s=newSession('receive');say('Verbinding voorbereiden…');
  attach(s,s.peer.createDataChannel('talera-transfer-v1',{ordered:true}));
  const code=hex(crypto.getRandomValues(new Uint8Array(10)));
  s.locator=(await codeHash(code)).slice(0,32);live(s);
  markDiagnostic('LOCAL_OFFER_BEGIN');const offer=await gather(s.peer,await s.peer.createOffer());live(s);s.offer=offer;markDiagnostic('LOCAL_OFFER_OK');
  const signature=await proof(code,'offer',offer);live(s);
  await api('create',s.locator,{sdp:offer,proof:signature,...(automatic?{secret:code}:{})});
  if(active!==s){void api('cancel',s.locator).catch(()=>{});return}
  diagnosticLocator(s.locator);markDiagnostic('CREATE_OK');
  pairManual.hidden=automatic;waiting.hidden=!automatic;pair.hidden=false;
  if(!automatic){
   el('transfer-code').textContent=code.match(/.{1,5}/g).join('-').toUpperCase();
   try{drawPairingQR(qr,code);qr.hidden=false}catch{clearQR()}
  }
  say(automatic?'Je andere apparaat kan je nu vinden. Twee minuten geldig.':'Verbindingscode is twee minuten geldig.');
  const until=Date.now()+120000;
  while(Date.now()<until){
   await wait(2000);live(s);const r=await api('poll',s.locator);live(s);
   if(!r.answer)continue;markDiagnostic('ANSWER_RECEIVED');
   if(r.answer.proof!==await proof(code,'answer',r.answer.sdp))throw Error('PAIR');
   live(s);s.answer=r.answer.sdp;
   markDiagnostic('REMOTE_ANSWER_BEGIN');await s.peer.setRemoteDescription({type:'answer',sdp:s.answer});live(s);markDiagnostic('REMOTE_ANSWER_OK');return;
  }
  throw Error('TIMEOUT');
 }catch(e){if(s)failure(s,e);else if(run===flow){markDiagnostic(diagnosticError(e));reset();say('Verbinding niet beschikbaar. Open TALERA met je eigen account.')}}
}
receive.addEventListener('click',()=>void startReceive(true));
receiveManual.addEventListener('click',()=>void startReceive(false));
async function discover(){
 if(active||connecting||join.hidden)return;
 const run=++flow;connecting=true;search.disabled=true;discovered=null;found.hidden=true;
 closeCamera();say('Zoeken naar je ontvangende apparaat…');
 try{
  await account();if(run!==flow)return;
  const r=await api('discover');if(run!==flow)return;
  const invitation=r.invitation;
  if(invitation===null){markDiagnostic('DISCOVER_EMPTY');say('Nog geen apparaat gevonden. Kies eerst Ontvangen op het andere apparaat en tik op Opnieuw zoeken.');return}
  if(!invitation||Object.keys(invitation).sort().join()!=='code,secret'||typeof invitation.code!=='string'||typeof invitation.secret!=='string'||!/^[a-f0-9]{32}$/.test(invitation.code)||!/^[a-f0-9]{20}$/.test(invitation.secret)||(await codeHash(invitation.secret)).slice(0,32)!==invitation.code)throw Error('PAIR');
  if(run!==flow)return;discovered=invitation;diagnosticLocator(invitation.code);markDiagnostic('DISCOVER_FOUND');found.hidden=false;say('Ontvangend apparaat gevonden. Tik op Verbinden.');
 }catch(e){if(run===flow){markDiagnostic('DISCOVER_ERROR');say('Zoeken is niet gelukt. Probeer opnieuw met hetzelfde account of verbind handmatig.')}}
 finally{if(run===flow){connecting=false;search.disabled=false}}
}
send.addEventListener('click',()=>{
 if(active||connecting)return;beginDiagnostic('send');join.hidden=false;stop.hidden=false;receive.disabled=send.disabled=receiveManual.disabled=true;void discover();
});
search.addEventListener('click',()=>void discover());
scanButton.addEventListener('click',()=>{
 if(active||connecting||join.hidden)return;
 scanButton.disabled=true;scanStop.hidden=false;void scan.start();
});
scanStop.addEventListener('click',()=>{closeCamera();say('Camera gesloten. Je kunt de code ook typen.')});
async function connect(code,expectedLocator=null){
 if(active||connecting||join.hidden)return;
 if(!/^[a-f0-9]{20}$/.test(code)){say('Voer de volledige verbindingscode in.');return}
 let s;const run=++flow;
 try{
  connecting=true;discovered=null;el('transfer-connect').disabled=connectFound.disabled=search.disabled=true;closeCamera();
  await account();if(run!==flow)return;connecting=false;s=newSession('send');join.hidden=true;say('Verbinding maken…');
  s.locator=(await codeHash(code)).slice(0,32);live(s);
  if(expectedLocator&&expectedLocator!==s.locator)throw Error('PAIR');
  const r=await api('offer',s.locator);live(s);
  if(!r.offer||r.offer.proof!==await proof(code,'offer',r.offer.sdp))throw Error('PAIR');
  live(s);s.offer=r.offer.sdp;diagnosticLocator(s.locator);markDiagnostic('OFFER_OK');
  s.peer.addEventListener('datachannel',event=>{try{if(event.channel.label!=='talera-transfer-v1')throw Error('PROTOCOL');attach(s,event.channel)}catch(e){failure(s,e)}});
  markDiagnostic('REMOTE_OFFER_BEGIN');await s.peer.setRemoteDescription({type:'offer',sdp:s.offer});live(s);markDiagnostic('REMOTE_OFFER_OK');
  markDiagnostic('LOCAL_ANSWER_BEGIN');const answer=await gather(s.peer,await s.peer.createAnswer());live(s);s.answer=answer;markDiagnostic('LOCAL_ANSWER_OK');
  const signature=await proof(code,'answer',answer);live(s);
  await api('join',s.locator,{sdp:answer,proof:signature});live(s);markDiagnostic('JOIN_OK');
 }catch(e){if(s)failure(s,e);else if(run===flow){markDiagnostic(diagnosticError(e));reset();say('Verbinding niet beschikbaar. Probeer opnieuw.')}}
}
el('transfer-connect').addEventListener('click',()=>void connect(input.value.trim().replace(/-/g,'').toLowerCase()));
connectFound.addEventListener('click',()=>{if(discovered)void connect(discovered.secret,discovered.code)});
approve.addEventListener('click',async()=>{
 const s=active;if(!s||s.approved||!s.verification)return;approve.disabled=true;
 try{await account();live(s);s.approved=true;markDiagnostic('APPROVED');if(s.role==='send'&&s.otherReady)s.phase='inventory';
  await sendJSON(s,'ready',{ready:true});say('Wachten op bevestiging van beide apparaten…');await maybeStart(s);
 }catch(e){failure(s,e)}
});
apply.addEventListener('click',async()=>{
 const s=active;if(!s||s.phase!=='confirm')return;
 apply.disabled=true;stop.disabled=true;s.committing=true;clearTimeout(s.timer);
 try{
  await account();live(s);say('Herinneringen veilig toevoegen…');
  const result=await commitTransfer(s.archive,s.plan.reuse,scope,location.origin,{confirmed:true});
  s.phase='complete';s.resultMessage=result.count+' herinneringen toegevoegd en gecontroleerd.';
  say(s.resultMessage);apply.hidden=true;
  await sendJSON(s,'done',{count:result.count});
 }catch(e){failure(s,e)}finally{stop.disabled=false}
});
stop.addEventListener('click',()=>{markDiagnostic('STOPPED');if(active&&!active.committing)void finish(active,'Overdracht gestopt. Geen herinneringen verwijderd.');else if(!active){reset();say('Verbinding gestopt.')}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)closeCamera()});
window.addEventListener('pagehide',()=>{closeCamera();clearQR();if(active&&!active.committing)void finish(active,'Overdracht gestopt.');else if(!active)reset()});
