// Account-local delivery, separate from the owner's original life timeline.
// No server receipt until original bytes, manifest and metadata have been
// committed and read back. No background service worker or guest-link change.
const H=/^[a-f0-9]{64}$/,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const MIME=/^(image\/(?:jpeg|png|webp|gif|heic|heif)|video\/(?:mp4|webm|quicktime)|audio\/(?:mpeg|mp4|webm|ogg|wav|x-m4a|aac|aiff|x-aiff))$/;
const is=(re,v)=>typeof v==='string'&&re.test(v);
const requireValid=(ok,error='INVALID_RECEIVED_PACKAGE')=>{if(!ok)throw Error(error)};
const json=value=>JSON.stringify(value);
const sha=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',value)),x=>x.toString(16).padStart(2,'0')).join('');
const digestJson=value=>sha(new TextEncoder().encode(json(value)));
const checkCurrent=fn=>requireValid(fn(),'ACCOUNT_CHANGED');
function validEntry(entry){
 requireValid(entry&&is(H,entry.key)&&is(UUID,entry.sender)&&Number.isSafeInteger(entry.createdAt)&&Number.isSafeInteger(entry.expiresAt)&&entry.expiresAt>entry.createdAt);
}
export function receiveParts(manifest){
 requireValid(manifest?.version===1&&Array.isArray(manifest.items)&&manifest.items.length<=24&&Array.isArray(manifest.narrationCues)&&manifest.narrationCues.length<=1000&&Number.isSafeInteger(manifest.narrationDurationMs)&&manifest.narrationDurationMs>=0&&manifest.narrationDurationMs<=86400000);
 const parts=[],mediaIds=new Set();let total=0,count=0;
 for(const [i,item] of manifest.items.entries()){
  requireValid(item&&['photo','video','audio'].includes(item.kind)&&is(/^[A-Za-z0-9_.:-]{1,240}$/,item.mediaId)&&is(MIME,item.mime)&&item.mime.startsWith(item.kind==='photo'?'image/':item.kind+'/')&&Number.isSafeInteger(item.size)&&item.size>0&&Number.isSafeInteger(item.parts)&&item.parts===Math.ceil(item.size/1048576)&&item.parts<=96&&Array.isArray(item.hashes)&&item.hashes.length===item.parts&&item.hashes.every(h=>is(H,h)));
  requireValid(!mediaIds.has(item.mediaId));mediaIds.add(item.mediaId);
  total+=item.size;count+=item.parts;
  requireValid(total<=96*1048576&&count<=192);
  for(let part=0;part<item.parts;part++)parts.push({id:'asset-'+i+'-'+part,path:'/media/'+i+'/'+part,size:Math.min(1048576,item.size-part*1048576),mime:item.mime,hash:item.hashes[part]});
 }
 const posters=manifest.posters??[],seen=new Set();
 requireValid(Array.isArray(posters)&&posters.length<=manifest.items.length);
 for(const p of posters){
  requireValid(p&&Number.isInteger(p.mediaIndex)&&manifest.items[p.mediaIndex]?.kind==='video'&&!seen.has(p.mediaIndex)&&['image/jpeg','image/png','image/webp'].includes(p.mime)&&Number.isSafeInteger(p.size)&&p.size>0&&p.size<=1500000&&is(H,p.sha256));
  requireValid(!mediaIds.has(manifest.items[p.mediaIndex].mediaId+':phone-v1'));
  seen.add(p.mediaIndex);total+=p.size;requireValid(total<=96*1048576);
  parts.push({id:'poster-'+p.mediaIndex,path:'/poster/'+p.mediaIndex,size:p.size,mime:p.mime,hash:p.sha256});
 }
 return parts;
}
async function validateContent(content){
 requireValid(content&&typeof content.title==='string'&&content.title.length<=180&&typeof content.storyText==='string'&&content.storyText.length<=12000&&typeof content.eventDate==='string'&&/^\d{0,4}(?:-\d{2}-\d{2})?$/.test(content.eventDate)&&is(H,content.manifestHash));
 requireValid(await digestJson(content.manifest)===content.manifestHash,'RECEIVED_MANIFEST_HASH');
 const parts=receiveParts(content.manifest);
 requireValid(parts.length||content.storyText.trim());
 return parts;
}
async function validPart(bytes,part){
 return bytes instanceof Uint8Array&&bytes.byteLength===part.size&&await sha(bytes)===part.hash;
}
export async function openReceivedStore(account,{isCurrent=()=>true,indexedDB=globalThis.indexedDB}={}){
 requireValid(is(UUID,account),'ACCOUNT_REQUIRED');checkCurrent(isCurrent);
 const scope=await digestJson(['TALERA_FREE_RECEIVED_V1',account]);checkCurrent(isCurrent);
 const db=await new Promise((resolve,reject)=>{
  const r=indexedDB.open('talera-free-received-'+scope+'-v1',1);
  r.onupgradeneeded=()=>{
   r.result.createObjectStore('packages',{keyPath:'key'});
   r.result.createObjectStore('parts',{keyPath:['key','id']});
  };
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('RECEIVED_STORAGE_BLOCKED'));
 });
 try{checkCurrent(isCurrent)}catch(e){db.close();throw e}
 db.onversionchange=()=>db.close();
 // Wait for transaction completion rather than request success. Catch quota,
 // failed transaction and account changes; do not acknowledge on any failure.
 const tx=(names,mode,fn)=>new Promise((resolve,reject)=>{
  checkCurrent(isCurrent);
  const tr=db.transaction(names,mode),stores=Object.fromEntries(names.map(n=>[n,tr.objectStore(n)]));
  let result,failed;
  const fail=e=>{failed=e;try{tr.abort()}catch{}};
  tr.oncomplete=()=>{try{checkCurrent(isCurrent);resolve(result)}catch(e){reject(e)}};
  tr.onabort=()=>reject(failed||tr.error||Error('RECEIVED_STORAGE'));
  tr.onerror=()=>reject(failed||tr.error||Error('RECEIVED_STORAGE'));
  const done=v=>{result=v};
  const read=(req,cb)=>{req.onsuccess=()=>{try{checkCurrent(isCurrent);cb(req.result)}catch(e){fail(e)}};req.onerror=()=>fail(req.error)};
  try{fn(stores,read,done)}catch(e){fail(e)}
 });
 const get=key=>tx(['packages'],'readonly',(s,read,done)=>read(s.packages.get(key),done));
 const putMeta=(key,fn)=>tx(['packages'],'readwrite',(s,read,done)=>read(s.packages.get(key),prior=>{
  const next=fn(prior);s.packages.put(next);done(next);
 }));
 const getPart=(key,id)=>tx(['parts'],'readonly',(s,read,done)=>read(s.parts.get([key,id]),row=>done(row?.bytes)));
 return {
  get, getPart,
  stage:record=>putMeta(record.key,prior=>{
   requireValid(!prior||json(prior.content)===json(record.content)&&prior.sender===record.sender&&prior.expiresAt===record.expiresAt,'RECEIVED_CONFLICT');
   return prior||{...record,state:'partial',unread:true,receiptPending:true};
  }),
  putPart:(key,id,bytes)=>tx(['parts'],'readwrite',(s,read,done)=>{s.parts.put({key,id,bytes});done(true)}),
  markReady:key=>putMeta(key,prior=>{requireValid(prior);return {...prior,state:'ready'}}),
  confirmReceipt:key=>putMeta(key,prior=>{requireValid(prior?.state==='ready');return {...prior,receiptPending:false}}),
  markSeen:key=>putMeta(key,prior=>{requireValid(prior?.state==='ready');return {...prior,unread:false}}),
  list:()=>tx(['packages'],'readonly',(s,read,done)=>read(s.packages.getAll(),rows=>done(rows.filter(r=>r.state==='ready').sort((a,b)=>b.createdAt-a.createdAt)))),
  close:()=>db.close()
 };
}
// "entry" originates from the authenticated inbox, never a guest link.
// Transport functions are injected for deterministic failure-path testing.
export async function receiveInternalShare(entry,{store:receivedStore,fetchContent,fetchPart,acknowledge,isCurrent=()=>true,now=()=>Date.now()}){
 validEntry(entry);checkCurrent(isCurrent);
 let record=await receivedStore.get(entry.key),descriptors;
 checkCurrent(isCurrent);
 if(record?.state==='ready'){
  requireValid(record.sender===entry.sender&&record.expiresAt===entry.expiresAt,'RECEIVED_CONFLICT');
  descriptors=await validateContent(record.content);
 }else{
  requireValid(entry.expiresAt>now(),'RECEIVED_EXPIRED');
  const content=await fetchContent(entry.key);checkCurrent(isCurrent);
  descriptors=await validateContent(content);checkCurrent(isCurrent);
  record=await receivedStore.stage({key:entry.key,sender:entry.sender,senderName:typeof entry.senderName==='string'?entry.senderName.slice(0,120):'',createdAt:entry.createdAt,expiresAt:entry.expiresAt,content});
 }
 for(const part of descriptors){
  checkCurrent(isCurrent);
  let bytes=await receivedStore.getPart(record.key,part.id);
  if(await validPart(bytes,part))continue;
  requireValid(record.state!=='ready','RECEIVED_LOCAL_CORRUPT');
  requireValid(record.expiresAt>now(),'RECEIVED_EXPIRED');
  bytes=await fetchPart(record.key,part);checkCurrent(isCurrent);
  requireValid(await validPart(bytes,part),'RECEIVED_PART_HASH');
  checkCurrent(isCurrent);await receivedStore.putPart(record.key,part.id,bytes);
  const readback=await receivedStore.getPart(record.key,part.id);
  requireValid(await validPart(readback,part),'RECEIVED_READBACK');
 }
 checkCurrent(isCurrent);
 // A fully committed package is visible locally even if the last network
 // request is lost. A later retry reuses it without downloading media again.
 if(record.state!=='ready')await receivedStore.markReady(record.key);
 const ready=await receivedStore.get(record.key);
 requireValid(ready?.state==='ready'&&json(ready.content)===json(record.content),'RECEIVED_READBACK');
 checkCurrent(isCurrent);
 if(ready.receiptPending&&ready.expiresAt>now()){
  try{
   const receipt=await acknowledge(ready.key,ready.content.manifestHash);checkCurrent(isCurrent);
   if(receipt?.received===true)await receivedStore.confirmReceipt(ready.key);
  }catch(e){checkCurrent(isCurrent);/* local delivery is safe; retry later */}
 }
 checkCurrent(isCurrent);
 return await receivedStore.get(record.key);
}
export function receivedTransport(account,{isCurrent=()=>true,fetch=globalThis.fetch}={}){
 requireValid(is(UUID,account),'ACCOUNT_REQUIRED');
 const request=async(path,opts={})=>{
  checkCurrent(isCurrent);
  const r=await fetch(path,{credentials:'same-origin',cache:'no-store',...opts,headers:{...opts.headers,'x-talera-expected-account':account}});
  checkCurrent(isCurrent);requireValid(r.ok,'RECEIVED_UNAVAILABLE');return r;
 };
 const path=key=>{requireValid(is(H,key));return '/api/internal-share/item/'+key};
 return {
  fetchContent:async key=>{const r=await request(path(key));const x=await r.json();requireValid(x.ok);return x.content},
  fetchPart:async(key,part)=>{
   const r=await request(path(key)+part.path);
   requireValid(r.headers.get('content-type')===part.mime&&Number(r.headers.get('content-length'))===part.size,'RECEIVED_PART_LENGTH');
   const data=new Uint8Array(await r.arrayBuffer());checkCurrent(isCurrent);return data;
  },
  acknowledge:async(key,manifestHash)=>(await request('/api/internal-share',{method:'POST',headers:{'content-type':'application/json'},body:json({action:'received',key,manifestHash})})).json()
 };
}
