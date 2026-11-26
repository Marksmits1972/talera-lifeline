// Ordered, reliable binary frames; no external ICE/relay service.
// No entire archive arrayBuffer. Keep the channel send buffer and RAM bounded.
const CHUNK=16*1024, HIGH=512*1024, WINDOW=256*1024;
export const MAX_CONTROL=8*1024*1024, MAX_ARCHIVE=2*1024*1024*1024;
const MEMORY_LIMIT=64*1024*1024;
const types=new Set(['ready','inventory','plan','archive','done','error']);
const fail=()=>Error('TALERA_TRANSFER_PROTOCOL');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function gather(peer,description){
 await peer.setLocalDescription(description);
 const until=Date.now()+12000;
 while(peer.iceGatheringState!=='complete'&&Date.now()<until)await sleep(100);
 if(peer.iceGatheringState!=='complete'||!peer.localDescription?.sdp)throw Error('TALERA_TRANSFER_NETWORK');
 return peer.localDescription.sdp;
}
export function newDirectPeer(){
 if(typeof RTCPeerConnection!=='function')throw Error('TALERA_TRANSFER_NOT_SUPPORTED');
 return new RTCPeerConnection({iceServers:[],iceTransportPolicy:'all',bundlePolicy:'max-bundle'});
}
export async function sendFrame(channel,kind,blob,progress=()=>{}){
 if(!types.has(kind)||!(blob instanceof Blob)||blob.size>(kind==='archive'?MAX_ARCHIVE:MAX_CONTROL))throw fail();
 const ensure=()=>{if(channel.readyState!=='open')throw fail()};
 let acknowledged=0;
 const ack=event=>{if(typeof event.data==='string'&&event.data.startsWith('ack:')){
  const n=Number(event.data.slice(4));if(Number.isSafeInteger(n)&&n>acknowledged&&n<=blob.size)acknowledged=n;
 }};
 channel.addEventListener('message',ack);
 try{
 ensure();channel.send(JSON.stringify({kind,bytes:blob.size}));
 for(let offset=0;offset<blob.size;offset+=CHUNK){
  const deadline=Date.now()+30000;
  while(channel.bufferedAmount>HIGH){
   ensure();if(Date.now()>deadline)throw Error('TALERA_TRANSFER_TIMEOUT');await sleep(20);
  }
  ensure();channel.send(await blob.slice(offset,offset+CHUNK).arrayBuffer());const sent=Math.min(blob.size,offset+CHUNK);progress(sent,blob.size);
  if(sent%WINDOW===0||sent===blob.size){
   const until=Date.now()+30000;
   while(acknowledged<sent){ensure();if(Date.now()>until)throw Error('TALERA_TRANSFER_TIMEOUT');await sleep(20)}
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
 let current=null,queue=Promise.resolve(),closed=false;const sinks=new Set();
 async function dispose(){
  closed=true;await queue.catch(()=>{});
  await Promise.all([...sinks].map(s=>s.dispose()));sinks.clear();
 }
 async function complete(){
  const done=current;current=null;
  const blob=await done.sink.finish();
  await onFrame(done.kind,blob);
 }
 async function accept(data){
  if(closed)return;
  if(typeof data==='string'){
   if(current||data.length>200)throw fail();
   const h=JSON.parse(data);
   if(Object.keys(h).sort().join()!=='bytes,kind'||!types.has(h.kind)||!Number.isSafeInteger(h.bytes)||h.bytes<0||h.bytes>(h.kind==='archive'?MAX_ARCHIVE:MAX_CONTROL))throw fail();
   if(!acceptHeader(h.kind,h.bytes))throw fail();
   const target=await sink(h.kind,h.bytes);sinks.add(target);
   current={kind:h.kind,size:h.bytes,received:0,sink:target};
   if(!h.bytes)await complete();
  }else{
   if(!current||!(data instanceof ArrayBuffer)||!data.byteLength||data.byteLength>CHUNK||current.received+data.byteLength>current.size)throw fail();
   await current.sink.append(data);current.received+=data.byteLength;progress(current.kind,current.received,current.size);
   if(current.received%WINDOW===0||current.received===current.size)channel.send('ack:'+current.received);
   if(current.received===current.size)await complete();
  }
 }
 let pending=0;
 channel.addEventListener('message',event=>{
  if(closed||(typeof event.data==='string'&&event.data.startsWith('ack:')))return;
  pending+=typeof event.data==='string'?event.data.length:event.data?.byteLength||0;
  if(pending>4*1024*1024){closed=true;onError(fail());return}
  queue=queue.then(async()=>{try{await accept(event.data)}finally{pending-=typeof event.data==='string'?event.data.length:event.data?.byteLength||0}}).catch(error=>{if(!closed){closed=true;onError(error)}});
 });
 return {dispose};
}
