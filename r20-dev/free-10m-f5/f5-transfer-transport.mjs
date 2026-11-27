// Ordered, reliable binary frames; no relay service. STUN only on the second attempt.
// No entire archive arrayBuffer. Keep the channel send buffer and RAM bounded.
const CHUNK=16*1024, HIGH=512*1024, WINDOW=256*1024;
export const MAX_CONTROL=8*1024*1024, MAX_ARCHIVE=2*1024*1024*1024;
const MEMORY_LIMIT=64*1024*1024;
const types=new Set(['ready','inventory','plan','archive','done','error']);
const fail=()=>Error('TALERA_TRANSFER_PROTOCOL');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const checkpointHash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
// A short human comparison of the exact local signaling transcript.
export async function pairingVerificationCode(locator,offer,answer){
 if(typeof locator!=='string'||!/^[a-f0-9]{32}$/.test(locator)||typeof offer!=='string'||typeof answer!=='string'||!offer||!answer)throw fail();
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(['talera-transfer-verify-v1',locator,offer,answer])));
 return String(new DataView(bytes).getUint32(0)%100000000).padStart(8,'0').replace(/^(....)(....)$/,'$1 $2');
}
export async function gather(peer,description){
 await peer.setLocalDescription(description);
 const until=Date.now()+12000;
 while(peer.iceGatheringState!=='complete'&&Date.now()<until)await sleep(100);
 if(peer.iceGatheringState!=='complete'||!peer.localDescription?.sdp)throw Error('TALERA_TRANSFER_NETWORK');
 return peer.localDescription.sdp;
}
// Inspect only the datachannel candidates; never log addresses or SDP.
export function candidateCounts(sdp){
 const counts={host:0,srflx:0,prflx:0,relay:0,unknown:0};let application=false;
 for(const line of String(sdp).split(/\r?\n/)){
  if(line.startsWith('m='))application=line.startsWith('m=application ');
  if(application&&line.startsWith('a=candidate:')){
   const type=/\styp\s+(host|srflx|prflx|relay)(?:\s|$)/.exec(line)?.[1]||'unknown';
   counts[type]++;
  }
 }
 return counts;
}
export function checkDirectSDP(sdp,route){
 const c=candidateCounts(sdp);
 if(c.relay||c.unknown||(!route&&(c.srflx||c.prflx)))throw Error('TALERA_TRANSFER_NETWORK');
 return c;
}
// An ICE restart may change candidates and credentials, never the verified DTLS identity.
export function assertSameFingerprint(original,restarted){
 const fingerprints=sdp=>[...new Set(String(sdp).split(/\r?\n/).filter(line=>line.startsWith('a=fingerprint:')).map(line=>line.toLowerCase().trim()))].sort();
 const before=fingerprints(original),after=fingerprints(restarted);
 if(before.length!==1||before.some(x=>!/^a=fingerprint:sha-256 (?:[0-9a-f]{2}:){31}[0-9a-f]{2}$/.test(x))||JSON.stringify(before)!==JSON.stringify(after))throw Error('TALERA_TRANSFER_SECURITY');
 return restarted;
}
// A fresh peer can preserve the human-verified certificate only on engines
// supporting explicit ephemeral certificate creation. Never persist the key.
export async function createTransferCertificate(){
 try{return await RTCPeerConnection.generateCertificate({name:'ECDSA',namedCurve:'P-256'})}catch{return null}
}
export function newDirectPeer(route=0,certificate=null){
 if(typeof RTCPeerConnection!=='function')throw Error('TALERA_TRANSFER_NOT_SUPPORTED');
 if(route!==0&&route!==1)throw Error('TALERA_TRANSFER_NOT_SUPPORTED');
 return new RTCPeerConnection({iceServers:route===1?[{urls:'stun:stun.cloudflare.com:3478'}]:[],iceTransportPolicy:'all',bundlePolicy:'max-bundle',...(certificate?{certificates:[certificate]}:{})});
}
export async function sendFrame(channel,kind,blob,progress=()=>{},awaitConnection=async()=>0,recoverArchive=null){
 if(!types.has(kind)||!(blob instanceof Blob)||blob.size>(kind==='archive'?MAX_ARCHIVE:MAX_CONTROL))throw fail();
 const ensure=()=>{if(channel.readyState!=='open')throw fail()};
 if(kind==='archive')return sendArchive(channel,blob,progress,awaitConnection,recoverArchive);
 let acknowledged=0;
 const ack=event=>{if(typeof event.data==='string'&&event.data.startsWith('ack:')){
  const n=Number(event.data.slice(4));if(Number.isSafeInteger(n)&&n>acknowledged&&n<=blob.size)acknowledged=n;
 }};
 channel.addEventListener('message',ack);
 try{
 await awaitConnection();ensure();channel.send(JSON.stringify({kind,bytes:blob.size}));
 for(let offset=0;offset<blob.size;offset+=CHUNK){
  let deadline=Date.now()+30000;
  while(channel.bufferedAmount>HIGH){
   deadline+=await awaitConnection();ensure();if(Date.now()>deadline)throw Error('TALERA_TRANSFER_TIMEOUT');await sleep(20);
  }
  const bytes=await blob.slice(offset,offset+CHUNK).arrayBuffer();await awaitConnection();ensure();channel.send(bytes);const sent=Math.min(blob.size,offset+CHUNK);
  if(sent%WINDOW===0||sent===blob.size){
   let until=Date.now()+30000;
   while(acknowledged<sent){until+=await awaitConnection();ensure();if(Date.now()>until)throw Error('TALERA_TRANSFER_TIMEOUT');await sleep(20)}
   progress(sent,blob.size);
  }
 }
 }finally{channel.removeEventListener('message',ack)}
}
// Each archive checkpoint is verified on the receiving device before it
// enters the local sink. No whole-archive hash or additional copy in RAM.
async function sendArchive(channel,blob,progress,awaitConnection,recoverArchive){
 const zero={offset:0,digest:'0'.repeat(64)};
 let last=zero,attempt=null,expected=null,acknowledged=false,resume=null,recovered=false,headerSent=false;
 const ack=event=>{
  if(typeof event.data!=='string')return;
  if(event.data===expected)acknowledged=true;
  const hit=/^resume!:(\d+):([a-f0-9]{64})$/.exec(event.data);
  if(hit)resume={offset:Number(hit[1]),digest:hit[2]};
 };
 const ensure=()=>{if(channel.readyState!=='open')throw Error('TALERA_TRANSFER_NETWORK')};
 const waitFor=async predicate=>{
  let until=Date.now()+30000;
  while(!predicate()){until+=await awaitConnection();ensure();if(Date.now()>until)throw Error('TALERA_TRANSFER_TIMEOUT');await sleep(20)}
 };
 channel.addEventListener('message',ack);
 try{
  while(true){
   try{
    if(!headerSent){await awaitConnection();ensure();channel.send(JSON.stringify({kind:'archive',bytes:blob.size}));headerSent=true}
    while(last.offset<blob.size){
     const bytes=new Uint8Array(await blob.slice(last.offset,last.offset+WINDOW).arrayBuffer());
     const end=last.offset+bytes.byteLength,digest=await checkpointHash(bytes);attempt={offset:end,digest};
     expected='ack:'+end+':'+digest;acknowledged=false;
     for(let i=0;i<bytes.length;i+=CHUNK){
      let deadline=Date.now()+30000;
      while(channel.bufferedAmount>HIGH){deadline+=await awaitConnection();ensure();if(Date.now()>deadline)throw Error('TALERA_TRANSFER_TIMEOUT');await sleep(20)}
      await awaitConnection();ensure();channel.send(bytes.slice(i,i+CHUNK).buffer);
     }
     await awaitConnection();ensure();channel.send('block:'+end+':'+digest);
     await waitFor(()=>acknowledged);last=attempt;attempt=null;progress(last.offset,blob.size);
    }
    return;
   }catch(error){
    // Replacement must be authorized by the controller, never by an incoming
    // message. Only a closed old channel may use one replacement; no retry on
    // a checksum/protocol error or arbitrary network ACK.
    if(!recoverArchive||recovered||channel.readyState==='open')throw error;
    recovered=true;channel.removeEventListener('message',ack);
    channel=await recoverArchive();ensure();channel.addEventListener('message',ack);
    expected=null;resume=null;channel.send('resume?:'+blob.size);
    await waitFor(()=>resume!==null);
    const matches=point=>point&&resume.offset===point.offset&&resume.digest===point.digest;
    if(!matches(last)&&!matches(attempt))throw Error('TALERA_TRANSFER_SECURITY_CHECKPOINT');
    if(resume.offset>last.offset){last=attempt;progress(last.offset,blob.size)}
    attempt=null;headerSent=true;
   }
  }
 }finally{channel.removeEventListener('message',ack)}
}
export const jsonBlob=value=>new Blob([JSON.stringify(value)],{type:'application/json'});
export async function readJSON(blob){return JSON.parse(await blob.text())}
async function sink(kind,size){
 if(kind!=='archive'||size<=MEMORY_LIMIT){
  const parts=[];
  return {append:async data=>{parts.push(data)},finish:async()=>new Blob(parts),dispose:async()=>{parts.length=0}};
 }
 if(!navigator.storage?.getDirectory)throw Error('TALERA_TRANSFER_STORAGE_LIMIT');
 const estimate=await navigator.storage.estimate?.();
 if(estimate&&Number.isFinite(estimate.quota)&&Number.isFinite(estimate.usage)&&estimate.quota-estimate.usage<size*2)
  throw Error('TALERA_TRANSFER_STORAGE_LIMIT');
 const dir=await navigator.storage.getDirectory(),name='talera-transfer-'+Date.now()+'-'+crypto.randomUUID()+'.tmp';
 // Only expired files created by this transfer module, never user files.
 try{for await(const [entry] of dir.entries()){
  const hit=/^talera-transfer-(\d{13})-[a-f0-9-]{36}\.tmp$/.exec(entry);
  if(hit&&Date.now()-Number(hit[1])>24*60*60*1000)await dir.removeEntry(entry);
 }}catch{}
 let handle,writer;
 try{handle=await dir.getFileHandle(name,{create:true});writer=await handle.createWritable()}
 catch(e){try{await dir.removeEntry(name)}catch{}throw e}
 return {append:data=>writer.write(data),finish:async()=>{await writer.close();writer=null;return handle.getFile()},
   dispose:async()=>{try{await writer?.abort()}catch{}try{await dir.removeEntry(name)}catch{}}};
}
export function frameReceiver(channel,onFrame,onError,progress=()=>{},acceptHeader=()=>true){
 channel.binaryType='arraybuffer';
 let current=null,lastArchiveCheckpoint=null,lastArchiveSize=null,queue=Promise.resolve(),closed=false,replaced=false,resumeUsed=false;const sinks=new Set();
 async function dispose(){
  closed=true;channel.removeEventListener('message',onMessage);await queue.catch(()=>{});
  await Promise.all([...sinks].map(s=>s.dispose()));sinks.clear();current=null;lastArchiveCheckpoint=null;
 }
 async function complete(){
  const done=current;current=null;
  if(done.kind==='archive'){lastArchiveCheckpoint=done.checkpoint;lastArchiveSize=done.size;}
  const blob=await done.sink.finish();
  await onFrame(done.kind,blob);
 }
 async function accept(data,source){
  if(closed)return;
  if(typeof data==='string'){
   if(data.startsWith('resume?:')){
    const hit=/^resume\?:(\d+)$/.exec(data),size=Number(hit?.[1]);
    if(!replaced||resumeUsed||!hit||!Number.isSafeInteger(size)||size<=0||size>MAX_ARCHIVE)throw fail();
    resumeUsed=true;
    if(!current&&!lastArchiveCheckpoint){
     if(!acceptHeader('archive',size))throw fail();
     const target=await sink('archive',size);sinks.add(target);
     current={kind:'archive',size,received:0,sink:target,parts:[],blockLength:0,checkpoint:null};
    }
    if(current?(current.kind!=='archive'||current.size!==size):lastArchiveSize!==size)throw fail();
    const point=current?current.checkpoint:lastArchiveCheckpoint;
    source.send('resume!:'+(point?.offset||0)+':'+(point?.digest||'0'.repeat(64)));
    return;
   }
   if(data.startsWith('block:')){
    const hit=/^block:(\d+):([a-f0-9]{64})$/.exec(data);
    if(!hit||current?.kind!=='archive'||!current.blockLength)throw fail();
    const end=Number(hit[1]),expected=Math.min(current.size,current.received+WINDOW);
    if(end!==expected||current.received+current.blockLength!==end)throw fail();
    const block=new Uint8Array(current.blockLength);let pos=0;
    for(const part of current.parts){block.set(new Uint8Array(part),pos);pos+=part.byteLength}
    const digest=await checkpointHash(block);
    if(digest!==hit[2])throw Error('TALERA_TRANSFER_PROTOCOL_CHECKSUM');
    await current.sink.append(block);current.received=end;current.checkpoint={offset:end,digest};current.parts=[];current.blockLength=0;
    progress(current.kind,end,current.size);
    if(source.readyState==='open')source.send('ack:'+end+':'+digest);
    if(end===current.size)await complete();
    return;
   }
   if(current||data.length>200)throw fail();
   const h=JSON.parse(data);
   if(Object.keys(h).sort().join()!=='bytes,kind'||!types.has(h.kind)||!Number.isSafeInteger(h.bytes)||h.bytes<0||h.bytes>(h.kind==='archive'?MAX_ARCHIVE:MAX_CONTROL))throw fail();
   if(!acceptHeader(h.kind,h.bytes))throw fail();
   const target=await sink(h.kind,h.bytes);sinks.add(target);
   current={kind:h.kind,size:h.bytes,received:0,sink:target,parts:[],blockLength:0,checkpoint:null};
   if(!h.bytes)await complete();
  }else{
   if(!current||!(data instanceof ArrayBuffer)||!data.byteLength||data.byteLength>CHUNK||current.received+data.byteLength>current.size)throw fail();
   if(current.kind==='archive'){
    if(current.blockLength+data.byteLength>Math.min(WINDOW,current.size-current.received))throw fail();
    current.parts.push(data);current.blockLength+=data.byteLength;return;
   }
   await current.sink.append(data);current.received+=data.byteLength;progress(current.kind,current.received,current.size);
   if(current.received%WINDOW===0||current.received===current.size)source.send('ack:'+current.received);
   if(current.received===current.size)await complete();
  }
 }
 let pending=0;
 function onMessage(event){
  if(closed||(typeof event.data==='string'&&(event.data.startsWith('ack:')||event.data.startsWith('resume!:'))))return;
  const source=channel;
  pending+=typeof event.data==='string'?event.data.length:event.data?.byteLength||0;
  if(pending>4*1024*1024){closed=true;onError(fail());return}
  queue=queue.then(async()=>{try{await accept(event.data,source)}finally{pending-=typeof event.data==='string'?event.data.length:event.data?.byteLength||0}}).catch(error=>{if(!closed){closed=true;onError(error)}});
 }
 channel.addEventListener('message',onMessage);
 async function replaceChannel(next){
  if(closed||replaced||channel.readyState==='open'||next.readyState!=='open')throw fail();
  channel.removeEventListener('message',onMessage);
  // Drain old-channel messages before accepting the new channel's messages;
  // install its listener immediately so the first resume request isn't lost.
  const drained=queue.then(()=>{
   if(closed||(current&&current.kind!=='archive'))throw fail();
   if(current){current.parts=[];current.blockLength=0}
  });
  queue=drained;replaced=true;channel=next;channel.binaryType='arraybuffer';channel.addEventListener('message',onMessage);
  await drained;
 }
 return {dispose,replaceChannel,checkpoint:()=>{const p=current?.kind==='archive'?current.checkpoint:lastArchiveCheckpoint;return p?{...p}:null}};
}
