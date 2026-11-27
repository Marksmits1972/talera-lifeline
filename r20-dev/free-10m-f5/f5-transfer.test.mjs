import test from 'node:test';
import assert from 'node:assert/strict';
import {newDiagnostic,safeCandidateKinds,validDiagnosticEvents,diagnosticError} from './f5-transfer-diagnostic.mjs';
import {TransferSignaling} from './f5-transfer-signal.mjs';
import {inventory,planTransfer,makeTransfer,reviewTransfer} from './f5-transfer-library.mjs';
import {sendFrame,frameReceiver,pairingVerificationCode} from './f5-transfer-transport.mjs';
const code='a'.repeat(32),sid='a'.repeat(64),other='b'.repeat(64),proof='c'.repeat(64);
const sdp='v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n';
test('pairing bound to separate sessions, one join, expiry and cancel',()=>{
 let now=0;const signal=new TransferSignaling(()=>now);
 assert.deepEqual(signal.handle(sid,{action:'create',code,sdp,proof}),{ok:true});
 assert.throws(()=>signal.offer(sid,code));assert.throws(()=>signal.offer(other,'b'.repeat(32)));
 assert.deepEqual(signal.offer(other,code).offer,{sdp,proof});
 assert.throws(()=>signal.handle(other,{action:'poll',code}));
 assert.throws(()=>signal.handle(other,{action:'cancel',code}));
 assert.throws(()=>signal.handle(other,{action:'join',code,sdp,proof,media:'private'}));
 signal.handle(other,{action:'join',code,sdp,proof});
 assert.deepEqual(signal.handle(sid,{action:'poll',code}).answer,{sdp,proof});
 assert.throws(()=>signal.handle('d'.repeat(64),{action:'join',code,sdp,proof}));
 signal.handle(other,{action:'cancel',code});assert.throws(()=>signal.handle(sid,{action:'poll',code}));
 now=4000;signal.handle(sid,{action:'create',code,sdp,proof});now+=120001;
 assert.throws(()=>signal.offer(other,code));assert.throws(()=>signal.handle(sid,{action:'poll',code}));
});
test('pairing rejects media SDP and oversized messages',()=>{
 const s=new TransferSignaling();
 assert.throws(()=>s.handle(sid,{action:'create',code,proof,sdp:sdp+'m=video 9 UDP\r\n'}));
 assert.throws(()=>s.handle(sid,{action:'create',code,proof,sdp:sdp+'x'.repeat(12000)}));
});
test('automatic discovery is temporary, account-local, invisible to its owner and after joining',()=>{
 let now=0;const signal=new TransferSignaling(()=>now),unrelatedAccount=new TransferSignaling(()=>now);
 const secret='f'.repeat(20),invitation={code,secret},search={action:'discover'};
 assert.deepEqual(signal.handle(other,search),{ok:true,invitation:null});
 assert.throws(()=>signal.handle(sid,{action:'create',code,sdp,proof,secret:[secret]}));
 assert.throws(()=>signal.handle(sid,{action:'create',code,sdp,proof,secret:'invalid'}));
 signal.handle(sid,{action:'create',code,sdp,proof,secret});
 assert.deepEqual(signal.handle(sid,search),{ok:true,invitation:null});
 assert.deepEqual(signal.handle(other,search),{ok:true,invitation});
 assert.deepEqual(unrelatedAccount.handle(other,search),{ok:true,invitation:null});
 assert.throws(()=>signal.handle(other,{action:'discover',code}));
 assert.throws(()=>signal.handle(other,{action:'cancel',code}));
 signal.handle(other,{action:'join',code,sdp,proof});
 assert.deepEqual(signal.handle('d'.repeat(64),search),{ok:true,invitation:null});
 assert.equal(signal.state.secret,null);
 signal.handle(sid,{action:'cancel',code});
 assert.deepEqual(signal.handle(other,search),{ok:true,invitation:null});
 now=4000;signal.handle(sid,{action:'create',code,sdp,proof,secret});
 now+=120000;assert.deepEqual(signal.handle(other,search),{ok:true,invitation:null});
 now+=4000;signal.handle(sid,{action:'create',code,sdp,proof});
 assert.deepEqual(signal.handle(other,search),{ok:true,invitation:null});
 assert.deepEqual(signal.offer(other,code).offer,{sdp,proof});
});
test('diagnostic report is bounded, sanitized, temporary and account/session isolated',()=>{
 let now=0;const signal=new TransferSignaling(()=>now),unrelated=new TransferSignaling(()=>now);
 const events=[[0,'START',0],[100,'CREATE_HTTP',200]],sendEvents=[[0,'START',0],[110,'JOIN_HTTP',200]];
 const cmd=(role,events)=>({action:'diagnostic',code,role,events});
 assert.throws(()=>signal.handle(sid,cmd('receive',events))); // no pairing
 signal.handle(sid,{action:'create',code,sdp,proof,secret:'f'.repeat(20)});
 assert.throws(()=>signal.handle(other,cmd('receive',events)));
 assert.throws(()=>signal.handle(sid,cmd('send',events)));
 assert.throws(()=>signal.handle(sid,cmd('receive',[[0,'local IP: 10.1.1.2',0]])));
 assert.throws(()=>signal.handle(sid,cmd('receive',[[0,'START','private']])));
 assert.throws(()=>signal.handle(sid,cmd('receive',Array(65).fill([0,'START',0]))));
 assert.deepEqual(signal.handle(sid,cmd('receive',events)).reports,{receive:events,send:[]});
 assert.deepEqual(signal.handle(other,cmd('send',sendEvents)).reports,{receive:events,send:sendEvents});
 assert.throws(()=>unrelated.handle(other,cmd('send',sendEvents)));
 assert.throws(()=>signal.handle('d'.repeat(64),cmd('send',sendEvents)));
 signal.handle(other,{action:'join',code,sdp,proof});
 signal.handle(sid,{action:'cancel',code});
 assert.deepEqual(signal.handle(sid,cmd('receive',[])).reports,{receive:events,send:sendEvents});
 now=300001;assert.throws(()=>signal.handle(sid,cmd('receive',[])));
});
test('local diagnostics omit addresses, ICE strings, raw errors, and cap trace length',()=>{
 let t=0;const d=newDiagnostic('send',()=>t++);
 d.mark('START');d.mark('NOT_VALID');d.mark('ACCOUNT_HTTP','secret');
 const kinds=safeCandidateKinds({candidate:'candidate:123 1 UDP 100 192.0.2.1 1234 typ host'});
 assert.deepEqual(kinds,['CANDIDATE_HOST','CANDIDATE_IPV4','CANDIDATE_UDP']);
 assert.deepEqual(safeCandidateKinds({type:'host',address:'private-address.local',protocol:'tcp'}),['CANDIDATE_HOST','CANDIDATE_MDNS','CANDIDATE_TCP']);
 assert.equal(diagnosticError(new Error('private diagnostic text')),'ERROR_OTHER');
 for(let i=0;i<100;i++)d.mark(i%2?'ICE_NEW':'ICE_CHECKING');
 assert.equal(d.events.length,64);assert.equal(d.events[0][1],'START');assert.ok(validDiagnosticEvents(d.events));
 assert.ok(!JSON.stringify(d.events).includes('secret'));
});
test('confirmation code binds both SDP messages and locator',async()=>{
 const a=await pairingVerificationCode(code,sdp,sdp+'answer');
 assert.match(a,/^\d{4} \d{4}$/);
 assert.equal(a,await pairingVerificationCode(code,sdp,sdp+'answer'));
 assert.notEqual(a,await pairingVerificationCode(code,sdp+'changed',sdp+'answer'));
 assert.notEqual(a,await pairingVerificationCode(code,sdp,sdp+'changed'));
 assert.notEqual(a,await pairingVerificationCode('b'.repeat(32),sdp,sdp+'answer'));
 await assert.rejects(pairingVerificationCode('',sdp,sdp));
});
const scope='talera-free-local-'+('a'.repeat(32))+'-v1',origin='https://example.test';
const photo={key:'local-test:0',blob:new File([new Uint8Array([0,1,2,3])],'a.jpg',{type:'image/jpeg',lastModified:10})};
const video={key:'local-test:1',blob:new File([new Uint8Array([4,5,6,7])],'b.mov',{type:'video/quicktime',lastModified:20})};
const a={id:'local-a',items:[{key:photo.key,kind:'photo'}],narrationCues:[{t:0,index:0}],title:'A'};
const b={id:'local-b',items:[{key:photo.key,kind:'photo'},{key:video.key,kind:'video'}],narrationCues:[{t:0,mediaId:photo.key}],title:'B'};
const full={stories:[a,b],files:[photo,video,{key:'talera-v4-work:manifest',blob:['private draft']}]};
const empty={stories:[],files:[]},partial={stories:[a],files:[photo]};
test('first copy keeps original story metadata and file bytes, excludes drafts',async()=>{
 const result=await makeTransfer(full,await inventory(empty),scope,origin);
 assert.equal(result.count,2);assert.deepEqual(result.reuse,[]);
 const checked=await reviewTransfer(result.archive,result.reuse,empty,scope,origin);
 assert.deepEqual(checked.stories,[a,b]);assert.deepEqual(checked.files.map(x=>x.key),[photo.key,video.key]);
 assert.equal(checked.files[0].blob.name,'a.jpg');
 assert.deepEqual(new Uint8Array(await checked.files[0].blob.arrayBuffer()),new Uint8Array([0,1,2,3]));
});
test('repeat transfer sends only new stories and absent media; reconstructs identical shared media locally',async()=>{
 const result=await makeTransfer(full,await inventory(partial),scope,origin);
 assert.equal(result.count,1);assert.equal(result.duplicates,1);assert.equal(result.reuse[0][0],photo.key);
 const checked=await reviewTransfer(result.archive,result.reuse,partial,scope,origin);
 assert.deepEqual(checked.stories,[b]);assert.equal(checked.files.length,2);
 const again=await makeTransfer(full,await inventory(full),scope,origin);
 assert.equal(again.count,0);assert.equal(again.archive,null);
});
test('changed story and changed original bytes block instead of overwrite',async()=>{
 await assert.rejects(planTransfer(full,await inventory({stories:[{...a,title:'modified'}],files:[photo]})),/CONFLICT/);
 await assert.rejects(planTransfer(full,await inventory({stories:[a],files:[{...photo,blob:new File(['diff'],'a.jpg',{type:'image/jpeg',lastModified:10})}]})),/CONFLICT/);
});
test('wrong account/origin, corrupt archives and target changed since preview fail',async()=>{
 const result=await makeTransfer(full,await inventory(partial),scope,origin);
 await assert.rejects(reviewTransfer(result.archive,result.reuse,partial,'different',origin),/CONFLICT/);
 await assert.rejects(reviewTransfer(result.archive,result.reuse,partial,scope,'https://other.test'),/CONFLICT/);
 await assert.rejects(reviewTransfer(result.archive,result.reuse,full,scope,origin),/CONFLICT/);
 const changed={stories:[a],files:[{...photo,blob:new File(['diff'],'a.jpg',{type:'image/jpeg',lastModified:10})}]};
 await assert.rejects(reviewTransfer(result.archive,result.reuse,changed,scope,origin),/CONFLICT/);
 const corrupt=new Uint8Array(await result.archive.arrayBuffer());corrupt[corrupt.length-1]^=1;
 await assert.rejects(reviewTransfer(new Blob([corrupt]),result.reuse,partial,scope,origin));
});
class Channel extends EventTarget{
 readyState='open';bufferedAmount=0;
 send(data){queueMicrotask(()=>this.other.dispatchEvent(new MessageEvent('message',{data})))}
}
test('ordered binary frames with flow control preserve data',async()=>{
 const a=new Channel(),b=new Channel();a.other=b;b.other=a;
 const data=new Uint8Array(600000);for(let i=0;i<data.length;i++)data[i]=i%251;
 let received;const receiver=frameReceiver(b,async(kind,blob)=>{assert.equal(kind,'archive');received=new Uint8Array(await blob.arrayBuffer())},e=>{throw e});
 await sendFrame(a,'archive',new Blob([data]));await receiver.dispose();
 assert.deepEqual(received,data);
});
test('reject invalid frame length before accepting data',async()=>{
 const c=new Channel();let error;
 const receiver=frameReceiver(c,()=>assert.fail('must not accept'),e=>{error=e});
 c.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'archive',bytes:99999999999})}));
 await new Promise(r=>setTimeout(r,5));assert.match(error.message,/PROTOCOL/);await receiver.dispose();
});
test('unexpected archive headers are rejected before allocating a receive sink',async()=>{
 const c=new Channel();let error,checked=0;
 const receiver=frameReceiver(c,()=>assert.fail('unexpected frame'),e=>{error=e},()=>{},(kind,bytes)=>{
  assert.equal(kind,'archive');assert.equal(bytes,1024*1024*100);checked++;return false;
 });
 c.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'archive',bytes:1024*1024*100})}));
 await new Promise(r=>setTimeout(r,5));assert.equal(checked,1);assert.match(error.message,/PROTOCOL/);await receiver.dispose();
});

test('one STUN retry stays bound to original authenticated pair, cannot become relay or be replayed',()=>{
 let now=0;const signal=new TransferSignaling(()=>now),third='d'.repeat(64);
 signal.handle(sid,{action:'create',code,sdp,proof});
 assert.throws(()=>signal.handle(sid,{action:'retry',code,sdp,proof}));
 signal.handle(other,{action:'join',code,sdp,proof});
 assert.deepEqual(signal.handle(other,{action:'retryOffer',code}),{ok:true,offer:null});
 assert.throws(()=>signal.handle(third,{action:'retryOffer',code}));
 assert.throws(()=>signal.handle(other,{action:'retry',code,sdp,proof}));
 const retrySDP=sdp+'a=ice-ufrag:new\r\n';
 signal.handle(sid,{action:'retry',code,sdp:retrySDP,proof});
 assert.equal(signal.handle(sid,{action:'poll',code}).answer,null);
 assert.deepEqual(signal.handle(other,{action:'retryOffer',code}).offer,{sdp:retrySDP,proof});
 assert.throws(()=>signal.handle(third,{action:'retryJoin',code,sdp,proof}));
 assert.throws(()=>signal.handle(other,{action:'join',code,sdp,proof}));
 signal.handle(other,{action:'retryJoin',code,sdp:retrySDP,proof});
 assert.deepEqual(signal.handle(sid,{action:'poll',code}).answer,{sdp:retrySDP,proof});
 assert.throws(()=>signal.handle(sid,{action:'retry',code,sdp,proof}));
 assert.throws(()=>signal.handle(other,{action:'retryJoin',code,sdp,proof}));
 now+=60001;assert.throws(()=>signal.handle(other,{action:'retryOffer',code}));
});
test('local then STUN configuration never creates a TURN peer; datachannel candidate counts omit addresses',async()=>{
 const {newDirectPeer,checkDirectSDP}=await import('./f5-transfer-transport.mjs');
 const before=globalThis.RTCPeerConnection;
 globalThis.RTCPeerConnection=class{constructor(config){this.config=config}};
 try{
  assert.deepEqual(newDirectPeer(0).config.iceServers,[]);
  assert.deepEqual(newDirectPeer(1).config.iceServers,[{urls:'stun:stun.cloudflare.com:3478'}]);
  assert.throws(()=>newDirectPeer(2));
 }finally{if(before)globalThis.RTCPeerConnection=before;else delete globalThis.RTCPeerConnection}
 const host='a=candidate:1 1 UDP 100 private.local 1234 typ host\r\n';
 const srflx='a=candidate:2 1 UDP 100 192.0.2.1 1234 typ srflx\r\n';
 const relay='a=candidate:3 1 UDP 100 192.0.2.2 1234 typ relay\r\n';
 assert.deepEqual(checkDirectSDP(sdp+host,0),{host:1,srflx:0,prflx:0,relay:0,unknown:0});
 assert.throws(()=>checkDirectSDP(sdp+host+srflx,0));
 assert.equal(checkDirectSDP(sdp+host+srflx,1).srflx,1);
 assert.throws(()=>checkDirectSDP(sdp+relay,1));
});

// Execute the actual controller in two isolated JavaScript contexts, with
// shared production signaling and simulated browser APIs. This demonstrates
// orchestration, not ICE/NAT behavior or real iPhone acceptance.
async function controllerFixture(successRoute){
 const vm=await import('node:vm'),{readFile}=await import('node:fs/promises');
 const transport=await import('./f5-transfer-transport.mjs');
 const diagnostic=await import('./f5-transfer-diagnostic.mjs');
 const library=await import('./f5-transfer-library.mjs');
 const {pairingScanner}=await import('./f5-transfer-scan.mjs');
 const {drawPairingQR}=await import('./f5-transfer-qr.mjs');
 const {localBackupPage}=await import('./f5-local-backup-page.mjs');
 const raw=await readFile(new URL('./f5-transfer-controller.mjs',import.meta.url),'utf8');
 const controller=raw.replace(/^import .*;$/gm,'');
 const account='12345678-1234-4123-8123-123456789abc';
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('TALERA_FREE_BROWSER_MEMORY_V1:'+account));
 const db='talera-free-local-'+Buffer.from(bytes).toString('hex').slice(0,32)+'-v1';
 const clockStart=Date.now(),clock=()=>clockStart+(Date.now()-clockStart)*25,timers=new Set();
 const schedule=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn()},Math.max(1,Math.ceil(ms/25)));timers.add(id);return id};
 const clear=id=>{clearTimeout(id);timers.delete(id)};
 const signaling=new TransferSignaling(clock),actions=[],peers=[],frames=[];
 class Element extends EventTarget{
  constructor(hidden){super();this.hidden=hidden;this.disabled=false;this.checked=false;this.textContent='';this.value='';this.dataset={database:db};}
  pause(){} focus(){}
  click(){assert.equal(this.disabled,false,'button unexpectedly disabled');this.dispatchEvent(new Event('click'))}
 }
 class Wire extends EventTarget{
  readyState='connecting';bufferedAmount=0;label='talera-transfer-v1';
  send(data){assert.equal(this.readyState,'open');frames.push(data);queueMicrotask(()=>this.other.dispatchEvent(new MessageEvent('message',{data})))}
  close(){if(this.readyState==='closed')return;this.readyState='closed';this.dispatchEvent(new Event('close'));this.other?.close()}
 }
 class Peer extends EventTarget{
  iceGatheringState='complete';iceConnectionState='new';connectionState='new';
  constructor(role,route){super();this.role=role;this.route=route;peers.push(this)}
  createDataChannel(){return this.channel=new Wire()}
  description(type){return {type,sdp:sdp+'a=ice-ufrag:'+this.role+this.route+'\r\n'+'a=candidate:1 1 UDP 100 private.local 1234 typ host\r\n'}}
  async createOffer(){return this.description('offer')}
  async createAnswer(){return this.description('answer')}
  async setLocalDescription(desc){this.localDescription=desc}
  async setRemoteDescription(desc){
   this.remoteDescription=desc;
   if(this.role!=='receive'||this.route!==successRoute)return;
   const sender=peers.find(p=>p.role==='send'&&p.route===this.route);
   assert.ok(sender);
   const receiverChannel=this.channel,senderChannel=sender.channel=new Wire();
   receiverChannel.other=senderChannel;senderChannel.other=receiverChannel;
   const incoming=new Event('datachannel');incoming.channel=senderChannel;sender.dispatchEvent(incoming);
   schedule(()=>{if(this.connectionState==='closed'||sender.connectionState==='closed')return;
    for(const p of [this,sender]){p.connectionState='connected';p.iceConnectionState='connected';p.channel.readyState='open';p.channel.dispatchEvent(new Event('open'))}
   },100);
  }
  close(){this.connectionState='closed';this.channel?.close()}
  async getStats(){return new Map()}
 }
 function page(role,session){
  const html=localBackupPage(db),nodes=new Map([...html.matchAll(/<[^>]+ id="([^"]+)"[^>]*>/g)].map(m=>[m[1],new Element(/\shidden(?:\s|>)/.test(m[0]))]));
  const document=new EventTarget();document.getElementById=id=>nodes.get(id);
  const window=new EventTarget();window.TaleraLanguage={t:(key,params)=>key==='transfer.status.diagReport'?params.own+'\nANDER APPARAAT\n'+params.other:key};
  const fetch=async(url,opts)=>{
   if(url==='/api/me')return {ok:true,status:200,json:async()=>({account:{id:account}})};
   const cmd=JSON.parse(opts.body);actions.push([role,cmd.action]);
   try{const result=cmd.action==='offer'?signaling.offer(session,cmd.code):signaling.handle(session,cmd);
    return {ok:true,status:200,json:async()=>result};
   }catch{return {ok:false,status:409}}
  };
  const context=vm.createContext({document,window,crypto,TextEncoder,ArrayBuffer,Uint8Array,Blob,AbortController,AbortSignal,
   Date:class extends Date{static now(){return clock()}},performance:{now:clock},setTimeout:schedule,clearTimeout:clear,fetch,
   ...transport,...diagnostic,...library,newDirectPeer:route=>new Peer(role,route),pairingScanner,drawPairingQR,
   location:{origin},console});
  vm.runInContext(controller,context,{filename:'f5-transfer-controller.mjs'});
  nodes.get('transfer-diagnostic-enable').checked=true;
  nodes.get('transfer-diagnostic-enable').dispatchEvent(new Event('change'));
  return nodes;
 }
 const receiver=page('receive',sid),sender=page('send',other);
 const waitFor=async predicate=>{const deadline=Date.now()+4000;while(!predicate()){if(Date.now()>deadline)throw Error('FIXTURE_TIMEOUT '+receiver.get('transfer-status').textContent+' / '+sender.get('transfer-status').textContent);await new Promise(r=>setTimeout(r,5))}};
 const click=(nodes,id)=>nodes.get(id).click(),visible=(nodes,id)=>!nodes.get(id).hidden;
 const start=async()=>{click(receiver,'transfer-receive');await waitFor(()=>visible(receiver,'transfer-pair'));
  click(sender,'transfer-send');await waitFor(()=>visible(sender,'transfer-found'));click(sender,'transfer-connect-found')};
 const cancel=()=>{for(const page of [receiver,sender])if(visible(page,'transfer-cancel'))click(page,'transfer-cancel');for(const timer of timers)clearTimeout(timer)};
 return {receiver,sender,waitFor,visible,click,start,cancel,actions,peers,frames};
}
for(const route of [0,1,null])test('controller orchestration: '+(route===null?'both routes fail safely':route?'local fails, one STUN attempt':'local succeeds without STUN'),async()=>{
 const f=await controllerFixture(route);
 try{
  await f.start();
  if(route===null){
   await f.waitFor(()=>!f.receiver.get('transfer-receive').disabled&&!f.sender.get('transfer-send').disabled);
   assert.equal(f.visible(f.receiver,'transfer-approve'),false);
   assert.equal(f.visible(f.sender,'transfer-approve'),false);
  }else{
   await f.waitFor(()=>f.visible(f.receiver,'transfer-approve')&&f.visible(f.sender,'transfer-approve'));
   assert.match(f.receiver.get('transfer-verify-code').textContent,/^\d{4} \d{4}$/);
   assert.equal(f.receiver.get('transfer-verify-code').textContent,f.sender.get('transfer-verify-code').textContent);
  }
  assert.equal(f.actions.filter(x=>x[1]==='retry').length,route===0?0:1);
  assert.equal(f.actions.filter(x=>x[1]==='retryJoin').length,route===0?0:1);
  assert.deepEqual(f.peers.map(p=>p.route).sort(),route===0?[0,0]:[0,0,1,1]);
  assert.equal(f.frames.length,0,'no data before mutual confirmation');
 }finally{f.cancel()}
});
