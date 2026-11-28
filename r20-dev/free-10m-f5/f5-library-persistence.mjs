// TALERA Free: the existing account-local bookcase I/O, without a new database.
// All original stories/files, media IDs, Blob/File bytes and atomic write rules remain unchanged.
// Only the library knows the physical IndexedDB schema; no media cloud or player code.
const SOURCE_LEGACY='talera-lifeline-dev-local-v1';
const PRIVATE=/^talera-free-local-[a-f0-9]{32}-v1$/;
export const requireName=(name,restoring)=>{
 if(typeof name!=='string'||!(PRIVATE.test(name)||(!restoring&&name===SOURCE_LEGACY)))
  throw Error('TALERA_RESTORE_DATABASE_NOT_ALLOWED');
};
function requestResult(request){
 return new Promise((resolve,reject)=>{
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error('TALERA_RESTORE_INDEXEDDB_REQUEST'));
 });
}
export async function openExisting(name,restoring){
 requireName(name,restoring);
 if(typeof indexedDB==='undefined')throw Error('TALERA_RESTORE_NO_INDEXEDDB');
 if(typeof indexedDB.databases==='function'){
  const names=await indexedDB.databases();
  if(!names.some(x=>x.name===name))
   throw Error('TALERA_RESTORE_DATABASE_NOT_FOUND');
 }
 return new Promise((resolve,reject)=>{
  let settled=false;
  const fail=e=>{if(!settled){settled=true;reject(e)}};
  const req=indexedDB.open(name,1);
  // IMPORTANT: opening a missing database must NEVER create an empty
  // replacement that could be mistaken for a previous iPhone memory library.
  req.onupgradeneeded=()=>{try{req.transaction.abort()}catch{}
    fail(Error('TALERA_RESTORE_NO_NEW_DATABASE_ALLOWED'))};
  req.onerror=()=>fail(req.error||Error('TALERA_RESTORE_OPEN_FAILED'));
  req.onblocked=()=>fail(Error('TALERA_RESTORE_BLOCKED'));
  req.onsuccess=()=>{
   const db=req.result;
   if(settled){db.close();return}
   if(!db.objectStoreNames.contains('stories')||!db.objectStoreNames.contains('files')
      ||db.version!==1){db.close();fail(Error('TALERA_RESTORE_SCHEMA_MISMATCH'));return}
   settled=true;resolve(db);
  };
 });
}

// A media ID identifies a story position; identical original bytes can live
// once in the SAME existing files store. No schema/database migration.
// Raw pre-existing File/Blob records remain valid and are never rewritten.
export function createOriginalPayloadStorage(){
 const prefix='talera-original-payload-v1:';
 const payloadKey=value=>typeof value==='string'&&
  /^talera-original-payload-v1:[a-f0-9]{64}$/.test(value);
 const link=row=>row&&Object.hasOwn(row,'payloadKey');
 const failFormat=(reason='invalid-format')=>{const error=Error('TALERA_LIBRARY_INVALID_SHARED_ORIGINAL');error.reason=reason;throw error};
 const chunk=4*1024*1024;
 const hex=bytes=>Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
 const originalMetadata=original=>{
  const isFile=typeof File==='function'&&original instanceof File;
  return {length:original.size,type:original.type,name:isFile?original.name:null,
   lastModified:isFile?original.lastModified:null};
 };
 function binaryLength(parts){
  if(!Array.isArray(parts)||parts.some((part,i)=>!(part instanceof ArrayBuffer)||
    part.byteLength<=0||part.byteLength>chunk||(i<parts.length-1&&part.byteLength!==chunk)))
   failFormat('binary-parts-shape');
  const length=parts.reduce((sum,part)=>sum+part.byteLength,0);
  if(!Number.isSafeInteger(length))failFormat('binary-length');
  return length;
 }
 function fileFromParts(parts,m,length){
  if(!m||Object.keys(m).sort().join(',')!=='lastModified,length,name,type'||
     !Number.isSafeInteger(m.length)||m.length<0||length!==m.length||
     typeof m.type!=='string'||!(m.name===null&&m.lastModified===null||
      typeof m.name==='string'&&Number.isFinite(m.lastModified)))failFormat('logical-metadata');
  const blob=m.name===null?new Blob(parts,{type:m.type}):
   new File(parts,m.name,{type:m.type,lastModified:m.lastModified});
  if(blob.size!==m.length||blob.type!==m.type||
     (m.name!==null&&(blob.name!==m.name||blob.lastModified!==m.lastModified)))failFormat('materialized-file-metadata');
  return blob;
 }
 // Technical draft/preview Blob values use the same binary compatibility
 // adapter; non-media manifest/cache objects retain their original shape.
 async function encodeInline(row){
  if(!(row?.blob instanceof Blob))return row;
  if(Object.keys(row).sort().join(',')!=='blob,key')failFormat('inline-row-shape');
  const parts=[];
  for(let offset=0;offset<row.blob.size;offset+=chunk){
   const end=Math.min(offset+chunk,row.blob.size);
   const bytes=await row.blob.slice(offset,end).arrayBuffer();
   if(bytes.byteLength!==end-offset)failFormat('inline-incomplete-bytes');
   parts.push(bytes);
  }
  return {key:row.key,binaryParts:parts,metadata:originalMetadata(row.blob)};
 }
 function decodeInline(row){
  if(!row||!Object.hasOwn(row,'binaryParts'))return row;
  if(Object.keys(row).sort().join(',')!=='binaryParts,key,metadata')failFormat('inline-row-shape');
  return {key:row.key,blob:fileFromParts(row.binaryParts,row.metadata,binaryLength(row.binaryParts))};
 }
 function payloadParts(row){
  if(Object.keys(row).sort().join(',')==='blob,key'&&row.blob instanceof Blob)
   return {parts:[row.blob],length:row.blob.size};
  if(Object.keys(row).sort().join(',')==='binaryParts,key'){
   return {parts:row.binaryParts,length:binaryLength(row.binaryParts)};
  }
  failFormat('payload-shape');
 }
 async function prepare(key,original){
  if(typeof key!=='string'||!key||key.startsWith(prefix)||!(original instanceof Blob)||!original.size)failFormat('prepare-original');
  const hashes=[],binaryParts=[];
  for(let offset=0;offset<original.size;offset+=chunk){
   const end=Math.min(offset+chunk,original.size);
   const bytes=await original.slice(offset,end).arrayBuffer();
   if(bytes.byteLength!==end-offset)failFormat('prepare-incomplete-bytes');
   hashes.push(hex(await crypto.subtle.digest('SHA-256',bytes)));
   binaryParts.push(bytes);
  }
  const hash=hex(await crypto.subtle.digest('SHA-256',
   new TextEncoder().encode(original.size+':'+hashes.join(':'))));
  return {key,payloadKey:prefix+hash,blob:original,binaryParts,
   metadata:originalMetadata(original)};
 }
 function materialize(row,payload){
  if(!link(row))return row;
  if(Object.keys(row).sort().join(',')!=='key,metadata,payloadKey'||
     !payloadKey(row.payloadKey))failFormat('logical-link-shape');
  if(!payload||payload.key!==row.payloadKey)failFormat('missing-payload');
  const physical=payloadParts(payload);
  if(!row.metadata?.length)failFormat('logical-metadata');
  const blob=fileFromParts(physical.parts,row.metadata,physical.length);
  return {key:row.key,blob};
 }
 // Redundant length/type can be missing in older records. Reconstruct only
 // independently known fields; never infer a filename, date or arbitrary
 // MIME from a physical payload shared with other media IDs.
 async function recoverVerifiedMetadata(row,payload,stories){
  if(!row||Object.keys(row).sort().join(',')!=='key,metadata,payloadKey'||
     !payloadKey(row.payloadKey)||!payload||payload.key!==row.payloadKey||
     !Array.isArray(stories)||!row.metadata||
     !Object.hasOwn(row.metadata,'name')||!Object.hasOwn(row.metadata,'lastModified')||
     Object.keys(row.metadata).some(k=>!['lastModified','length','name','type'].includes(k)))
   failFormat('logical-metadata');
  const physical=payloadParts(payload),m=row.metadata;
  if(!physical.length)failFormat('logical-metadata');
  let references=0,mime;
  for(const story of stories){
   if(!story||!Array.isArray(story.items))failFormat('unverified-catalog');
   for(const item of story.items){
    if(item?.key!==row.key)continue;
    if(story.source!=='pwa-local'||item.size!==physical.length||
       typeof item.mime!=='string'||new Blob([],{type:item.mime}).type!==item.mime||
       (references&&mime!==item.mime))failFormat('unverified-catalog');
    mime=item.mime;references++;
   }
  }
  if(!references)failFormat('unverified-catalog');
  // Do not overwrite a contradictory, otherwise valid MIME field.
  if(typeof m.type==='string'){
   const normalized=new Blob([],{type:m.type}).type;
   if((normalized||m.type==='')&&normalized!==mime)failFormat('unverified-catalog');
  }
  if(m.length===physical.length&&m.type===mime)failFormat('logical-metadata');
  const blob=fileFromParts(physical.parts,{length:physical.length,type:mime,name:m.name,lastModified:m.lastModified},physical.length);
  const hashes=[];
  for(let offset=0;offset<blob.size;offset+=chunk){
   const end=Math.min(offset+chunk,blob.size),bytes=await blob.slice(offset,end).arrayBuffer();
   if(bytes.byteLength!==end-offset)failFormat('unverified-payload');
   hashes.push(hex(await crypto.subtle.digest('SHA-256',bytes)));
  }
  const hash=hex(await crypto.subtle.digest('SHA-256',
   new TextEncoder().encode(blob.size+':'+hashes.join(':'))));
  if(prefix+hash!==row.payloadKey)failFormat('unverified-payload');
  return {key:row.key,blob};
 }
 function logicalRows(rows){
  if(!Array.isArray(rows))failFormat();
  const map=new Map(rows.map(row=>[row.key,row]));
  if(map.size!==rows.length)failFormat();
  return rows.filter(row=>!payloadKey(row.key)).map(row=>
   link(row)?materialize(row,map.get(row.payloadKey)):decodeInline(row));
 }
 async function logicalRowsVerified(rows,stories){
  if(!Array.isArray(rows))failFormat();
  const map=new Map(rows.map(row=>[row.key,row]));
  if(map.size!==rows.length)failFormat();
  const result=[];
  for(const row of rows){
   if(payloadKey(row.key))continue;
   if(!link(row)){result.push(decodeInline(row));continue}
   const payload=map.get(row.payloadKey);
   try{result.push(materialize(row,payload))}
   catch(error){
    if(!['logical-metadata','materialized-file-metadata'].includes(error?.reason))throw error;
    result.push(await recoverVerifiedMetadata(row,payload,stories));
   }
  }
  return result;
 }
 function read(store,key,ok,fail){
  const q=store.get(key);
  q.onerror=()=>fail(q.error||Error('TALERA_LIBRARY_ORIGINAL_READ'));
  q.onsuccess=()=>{
   try{
    const row=q.result;
    if(!link(row)){ok(decodeInline(row));return}
    if(!payloadKey(row.payloadKey))failFormat('logical-link-key');
    const p=store.get(row.payloadKey);
    p.onerror=()=>fail(p.error||Error('TALERA_LIBRARY_PAYLOAD_READ'));
    p.onsuccess=()=>{
     try{ok(materialize(row,p.result))}
     catch(error){
      if(!['logical-metadata','materialized-file-metadata'].includes(error?.reason)||!store.transaction.objectStoreNames.contains('stories')){
       fail(error);return;
      }
      const catalog=store.transaction.objectStore('stories').getAll();
      catalog.onerror=()=>fail(catalog.error||error);
      catalog.onsuccess=()=>{
       let settled=false,result=null,problem=null;
       recoverVerifiedMetadata(row,p.result,catalog.result).then(
        value=>{result=value;settled=true},e=>{problem=e;settled=true});
       // The read may be inside an existing write transaction. Keep it alive,
       // so its caller can continue atomically after hashing the original.
       const pulse=()=>{
        const ping=store.getKey(key);
        ping.onerror=()=>fail(ping.error||error);
        ping.onsuccess=()=>{
         if(!settled){pulse();return}
         if(problem){fail(problem);return}
         if(ping.result!==key){fail(error);return}
         ok(result);
        };
       };
       pulse();
      };
     }
    };
   }catch(e){fail(e)}
  };
 }
 async function sameBytes(a,b){
  if(!(a instanceof Blob)||a.size!==b.size)return false;
  for(let offset=0;offset<a.size;offset+=chunk){
   const end=Math.min(offset+chunk,a.size);
   const x=new Uint8Array(await a.slice(offset,end).arrayBuffer());
   const y=new Uint8Array(await b.slice(offset,end).arrayBuffer());
   if(x.length!==end-offset||y.length!==x.length)return false;
   for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;
  }
  return true;
 }
 // Prevalidate byte equality within a batch BEFORE IndexedDB opens its write
 // transaction. WebKit cannot reliably read a newly inserted, uncommitted
 // File through a second get() in the same transaction.
 const verifiedPlanGroups=new WeakMap(),verifiedTransactionGroups=new WeakMap();
 async function verifyBatch(plans){
  const groups=new Map();
  for(const p of plans){
   if(!p||!payloadKey(p.payloadKey)||!(p.blob instanceof Blob)||
      binaryLength(p.binaryParts)!==p.blob.size)failFormat('batch-plan');
   let g=groups.get(p.payloadKey);
   if(!g){g={blob:p.blob};groups.set(p.payloadKey,g)}
   else if(!await sameBytes(g.blob,p.blob))failFormat('batch-digest-collision');
   verifiedPlanGroups.set(p,g);
  }
 }
 // The caller owns the existing readwrite transaction and aborts on failure.
 // A previously committed payload is still checked byte-for-byte before reuse.
 // Never reread a freshly inserted File before WebKit commits it.
 function writePlans(store,plans,ok,fail,{replace=false}={}){
  let checked=verifiedTransactionGroups.get(store.transaction);
  if(!checked){checked=new Map();verifiedTransactionGroups.set(store.transaction,checked)}
  let index=0;
  const next=()=>{
   try{
    if(index===plans.length){ok();return}
    const p=plans[index++];
    if(!p||!payloadKey(p.payloadKey))failFormat('write-plan');
    const group=verifiedPlanGroups.get(p);
    const addLink=()=>{
     const row={key:p.key,payloadKey:p.payloadKey,metadata:p.metadata};
     const linkRequest=replace?store.put(row):store.add(row);
     linkRequest.onerror=()=>fail(linkRequest.error||Error('TALERA_LIBRARY_LINK_WRITE'));
     if(group)checked.set(p.payloadKey,group);
     next();
    };
    if(group&&checked.get(p.payloadKey)===group){addLink();return}
    const q=store.get(p.payloadKey);
    q.onerror=()=>fail(q.error||Error('TALERA_LIBRARY_PAYLOAD_READ'));
    q.onsuccess=()=>{
     try{
      if(q.result===undefined){
       const payloadRequest=store.add({key:p.payloadKey,binaryParts:p.binaryParts});
       payloadRequest.onerror=()=>fail(payloadRequest.error||Error('TALERA_LIBRARY_PAYLOAD_WRITE'));
       addLink();return;
      }
      const physical=payloadParts(q.result);
      if(physical.length!==p.blob.size)failFormat('existing-payload-shape');
      if(q.result.binaryParts){
       if(physical.parts.length!==p.binaryParts.length)failFormat('existing-payload-bytes');
       for(let j=0;j<p.binaryParts.length;j++){
        const a=new Uint8Array(physical.parts[j]),b=new Uint8Array(p.binaryParts[j]);
        if(a.length!==b.length)failFormat('existing-payload-bytes');
        for(let i=0;i<a.length;i++)if(a[i]!==b[i])failFormat('existing-payload-bytes');
       }
       addLink();return;
      }
      let settled=false,equal=false,error=null;
      sameBytes(q.result.blob,p.blob).then(v=>{equal=v;settled=true},
       e=>{error=e;settled=true});
      const pulse=()=>{
       const check=store.getKey(p.payloadKey);
       check.onerror=()=>fail(check.error||Error('TALERA_LIBRARY_PAYLOAD_READ'));
       check.onsuccess=()=>{
        try{
         if(!settled){pulse();return}
         if(error)throw error;
         if(!equal||check.result!==p.payloadKey)failFormat('existing-payload-bytes');
         addLink();
        }catch(e){fail(e)}
       };
      };
      pulse();
     }catch(e){fail(e)}
    };
   }catch(e){fail(e)}
  };
  next();
 }
 // Called only after an explicitly requested deletion in the SAME transaction.
 // Never delete a payload referenced by a surviving media-ID record.
 function collectUnreferenced(store,fail){
  const q=store.getAll();
  q.onerror=()=>fail(q.error||Error('TALERA_LIBRARY_PAYLOAD_GC_READ'));
  q.onsuccess=()=>{
   try{
    const rows=q.result||[],keys=new Set(rows.map(row=>row.key)),used=new Set();
    let uncertain=false;
    for(const row of rows){
     if(!link(row))continue;
     if(!payloadKey(row.payloadKey)){uncertain=true;continue}
     used.add(row.payloadKey);
     if(!keys.has(row.payloadKey))uncertain=true;
    }
    // A corrupt unrelated link is not permission to delete any ambiguous
    // payload and must not prevent deletion of a verified story ID.
    if(uncertain)return;
    for(const row of rows)if(payloadKey(row.key)&&!used.has(row.key)){
     try{payloadParts(row)}catch(error){
      if(error?.message==='TALERA_LIBRARY_INVALID_SHARED_ORIGINAL')continue;
      throw error;
     }
     store.delete(row.key);
    }
   }catch(e){fail(e)}
  };
 }
 return Object.freeze({prepare,verifyBatch,encodeInline,decodeInline,read,writePlans,logicalRows,logicalRowsVerified,collectUnreferenced,
  isPayloadKey:payloadKey,isLink:link});
}

const originalPayloadStorage=createOriginalPayloadStorage();
export async function readAll(db){
 const tx=db.transaction(['stories','files'],'readonly');
 const stories=requestResult(tx.objectStore('stories').getAll());
 const files=requestResult(tx.objectStore('files').getAll());
 const catalog=await stories;
 return {stories:catalog,files:await originalPayloadStorage.logicalRowsVerified((await files).filter(row=>row.key!=='talera-location-work-index-v1'),catalog)};
}

// Fail-closed relationship check for the ORIGINAL media within the single
// account-local library. Cache/manifest records need not be Blob originals.
// Existing legacy index-only voice cues are still supported without migration.
export function verifyLibraryMediaIntegrity({stories,files}={}){
 if(!Array.isArray(stories)||!Array.isArray(files))
  throw Error('TALERA_LIBRARY_INVALID_SNAPSHOT');
 const filesByKey=new Map();
 for(const row of files){
  if(typeof row?.key!=='string'||!row.key||filesByKey.has(row.key))
   throw Error('TALERA_LIBRARY_INVALID_OR_DUPLICATE_FILE_ID');
  filesByKey.set(row.key,row);
 }
 const seenStories=new Set();
 let originalsChecked=0,explicitCuesChecked=0;
 for(const story of stories){
  if(typeof story?.id!=='string'||!story.id||seenStories.has(story.id))
   throw Error('TALERA_LIBRARY_INVALID_OR_DUPLICATE_STORY_ID');
  seenStories.add(story.id);
  const items=story.items??[];
  if(!Array.isArray(items))throw Error('TALERA_LIBRARY_INVALID_STORY_MEDIA');
  const visuals=new Set();
  let visualCount=0;
  for(const item of items){
   const key=item?.key;
   if(typeof key!=='string'||!key||!filesByKey.has(key))
    throw Error('TALERA_LIBRARY_MISSING_ORIGINAL_MEDIA_ID');
   const original=filesByKey.get(key)?.blob;
   if(!(original instanceof Blob)||!Number.isSafeInteger(original.size)||original.size<=0)
    throw Error('TALERA_LIBRARY_MISSING_OR_EMPTY_ORIGINAL_MEDIA');
   originalsChecked++;
   if(item.kind==='photo'||item.kind==='video'){
    visuals.add(key);
    visualCount++;
   }
  }
  const cues=story.narrationCues??[];
  if(!Array.isArray(cues))throw Error('TALERA_LIBRARY_INVALID_VOICE_CUES');
  for(const cue of cues){
   // Match the existing narrator: permanent mediaId overrides an old index.
   // Legacy index-only cues stay supported, but must resolve to a real frame.
   const time=Number(cue?.t);
   if(!Number.isFinite(time)||time<0)
    throw Error('TALERA_LIBRARY_INVALID_VOICE_CUE_TIME');
   const ref=cue?.mediaId;
   if(ref!==undefined&&ref!==null&&ref!==''){
    if(typeof ref!=='string'||!visuals.has(ref))
     throw Error('TALERA_LIBRARY_INVALID_VOICE_MEDIA_ID');
    explicitCuesChecked++;
   }else{
    const index=Number(cue?.index);
    if(!Number.isInteger(index)||index<0||index>=visualCount)
     throw Error('TALERA_LIBRARY_INVALID_VOICE_MEDIA_INDEX');
   }
  }
 }
 return Object.freeze({stories:stories.length,originalsChecked,
  explicitCuesChecked});
}

// Compare every restored record to the already-verified archive after the
// IndexedDB transaction commits. Large original media are checked in bounded
// chunks; no media is sent to a server, copied into a second library or changed.
export async function verifyRestoredLibraryReadback(expected,actual){
 const bad=()=>{throw Error('TALERA_RESTORE_READBACK_MISMATCH')};
 if(!Array.isArray(expected?.stories)||!Array.isArray(expected?.files)||
    !Array.isArray(actual?.stories)||!Array.isArray(actual?.files))bad();
 const chunkBytes=4*1024*1024;
 const same=async(a,b,depth=0)=>{
  if(depth>=48)bad();
  if(a instanceof Blob||b instanceof Blob){
   if(!(a instanceof Blob)||!(b instanceof Blob)||
      a.size!==b.size||a.type!==b.type)bad();
   const aFile=typeof File==='function'&&a instanceof File;
   const bFile=typeof File==='function'&&b instanceof File;
   if(aFile!==bFile||(aFile&&(a.name!==b.name||a.lastModified!==b.lastModified)))bad();
   for(let start=0;start<a.size;start+=chunkBytes){
    const end=Math.min(a.size,start+chunkBytes);
    const left=new Uint8Array(await a.slice(start,end).arrayBuffer());
    const right=new Uint8Array(await b.slice(start,end).arrayBuffer());
    if(left.length!==right.length)bad();
    for(let i=0;i<left.length;i++)if(left[i]!==right[i])bad();
   }
   return;
  }
  if(a instanceof Date||b instanceof Date){
   if(!(a instanceof Date)||!(b instanceof Date)||a.getTime()!==b.getTime())bad();
   return;
  }
  if(a instanceof ArrayBuffer||b instanceof ArrayBuffer){
   if(!(a instanceof ArrayBuffer)||!(b instanceof ArrayBuffer)||
      a.byteLength!==b.byteLength)bad();
   const left=new Uint8Array(a),right=new Uint8Array(b);
   for(let i=0;i<left.length;i++)if(left[i]!==right[i])bad();
   return;
  }
  if(a===null||b===null||typeof a!=='object'||typeof b!=='object'){
   if(!Object.is(a,b))bad();
   return;
  }
  if(Array.isArray(a)||Array.isArray(b)){
   if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)bad();
   for(let i=0;i<a.length;i++)await same(a[i],b[i],depth+1);
   return;
  }
  const keysA=Object.keys(a).sort(),keysB=Object.keys(b).sort();
  if(keysA.length!==keysB.length||keysA.some((key,i)=>key!==keysB[i]))bad();
  for(const key of keysA)await same(a[key],b[key],depth+1);
 };
 const gotStories=new Map(actual.stories.map(row=>[row.id,row]));
 const gotFiles=new Map(actual.files.map(row=>[row.key,row]));
 for(const row of expected.stories){
  if(!gotStories.has(row.id))bad();
  await same(row,gotStories.get(row.id));
 }
 for(const row of expected.files){
  if(!gotFiles.has(row.key))bad();
  await same(row,gotFiles.get(row.key));
 }
 return Object.freeze({storyCount:expected.stories.length,fileCount:expected.files.length,exact:true});
}

// Compare complete file records, not merely IDs, size or media type.
// The same bounded byte/metadata comparison also verifies restored readback.
export async function identicalLibraryFile(expected,actual){
 if(!expected||!actual||expected.key!==actual.key)return false;
 try{
  await verifyRestoredLibraryReadback({stories:[],files:[expected]},
    {stories:[],files:[actual]});
  return true;
 }catch(error){
  if(error?.message==='TALERA_RESTORE_READBACK_MISMATCH')return false;
  throw error;
 }
}

export async function restoreRowsAtomic(db,decoded){
  // The chosen iPhone .talera File can be disk-backed. Its Blob slices are
  // perfectly readable during an immediate checksum/readback, but retaining
  // those slices in IndexedDB can leave later WebKit object URLs unreadable.
  // Make an owned, byte-exact copy of photos and image previews BEFORE opening
  // the write transaction. Never transcode, rename, migrate or touch players.
  const photoKeys=new Set(decoded.stories.flatMap(story=>
    (story.items||[]).filter(item=>item?.kind==='photo').map(item=>item.key)));
  const originalKeys=new Set(decoded.stories.flatMap(story=>(story.items||[]).map(item=>item.key)));
  const ownedFiles=[];
  for(const row of decoded.files){
   if(originalPayloadStorage.isPayloadKey(row?.key)||originalPayloadStorage.isLink(row))
    throw Error('TALERA_RESTORE_RESERVED_INTERNAL_PAYLOAD');
   const original=row?.blob;
   if(!(original instanceof Blob)||
      !(photoKeys.has(row.key)||String(original.type).startsWith('image/'))){
    ownedFiles.push(row);continue;
   }
   // A Uint8Array, not a Blob slice, severs the storage object's dependency
   // on the picker/File-provider lifetime. Fail before writing on read errors.
   const bytes=new Uint8Array(await original.arrayBuffer());
   if(bytes.byteLength!==original.size)
    throw Error('TALERA_RESTORE_PHOTO_COPY_SIZE_MISMATCH');
   const isFile=typeof File==='function'&&original instanceof File;
   const owned=isFile?
    new File([bytes],original.name,{type:original.type,lastModified:original.lastModified}):
    new Blob([bytes],{type:original.type});
   if(owned.size!==original.size||owned.type!==original.type||
      (isFile&&(owned.name!==original.name||
        owned.lastModified!==original.lastModified)))
    throw Error('TALERA_RESTORE_PHOTO_COPY_METADATA_MISMATCH');
   ownedFiles.push({...row,blob:owned});
  }
  const plans=new Map();
  for(const row of ownedFiles)if(originalKeys.has(row.key)){
   if(Object.keys(row).sort().join(',')!=='blob,key')throw Error('TALERA_RESTORE_INVALID_ORIGINAL_ROW');
   plans.set(row.key,await originalPayloadStorage.prepare(row.key,row.blob));
  }
  await originalPayloadStorage.verifyBatch([...plans.values()]);
  const technical=new Map();
  for(const row of ownedFiles)if(!plans.has(row.key))
   technical.set(row.key,await originalPayloadStorage.encodeInline(row));
  // One atomic IndexedDB transaction for both stores: fail/QuotaExceeded
  // aborts the WHOLE import, never deletes or replaces existing media/stories.
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(['stories','files'],'readwrite');
   let finished=false;
   const finish=(err)=>{
    if(finished)return;finished=true;
    err?reject(err):resolve();
   };
   tx.oncomplete=()=>finish(null);
   tx.onabort=()=>finish(tx.error||Error('TALERA_RESTORE_ATOMIC_IMPORT_ABORTED'));
   tx.onerror=()=>{};
   // Revalidate file collisions inside the SAME read/write transaction:
   // another editor/tab cannot change a checked record before commit.
   // Keep the transaction active only during an asynchronous byte comparison,
   // using key-only requests (no repeated copies of large media).
   const abort=error=>{try{tx.abort()}catch{}finish(error)};
   try{
    const s=tx.objectStore('stories'),f=tx.objectStore('files');
    for(const row of decoded.stories)s.add(row);
    f.delete('talera-location-work-index-v1'); // derived work index only; never original data
    let index=0;
    const next=()=>{
     if(index>=ownedFiles.length)return;
     const row=ownedFiles[index++];
     originalPayloadStorage.read(f,row.key,existing=>{
      try{
       if(existing===undefined){
        const plan=plans.get(row.key);
        if(plan)originalPayloadStorage.writePlans(f,[plan],next,abort);
        else{f.add(technical.get(row.key));next()}
        return;
       }
       let settled=false,equal=false,failed=null;
       identicalLibraryFile(row,existing).then(
        result=>{equal=result;settled=true},
        error=>{failed=error;settled=true});
       const keepAlive=()=>{
        const pulse=f.getKey(row.key);
        pulse.onsuccess=()=>{
         try{
          if(!settled){keepAlive();return}
          if(failed)throw failed;
          if(!equal)throw Error('TALERA_RESTORE_EXISTING_CONTENT_MUST_NOT_BE_OVERWRITTEN');
          next(); // exact match: do not write this record at all
         }catch(error){abort(error)}
        };
       };
       keepAlive();
      }catch(error){abort(error)}
     },abort);
    };
    next();
   }catch(error){abort(error)}
  });
}
