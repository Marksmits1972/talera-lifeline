// TALERA Free F5 — proof-only portable, LOSSLESS private archive codec.
// Does not read cookies, use network, delete original media or touch the player.
// Not yet exposed in the iPhone PWA: independent device acceptance is required.
const te=new TextEncoder(),td=new TextDecoder('utf-8',{fatal:true});
const MAGIC=te.encode('TALERA-FREE-LOCAL-V1\n');
const MAX_MANIFEST=32*1024*1024;
const LEGACY_MAX_SINGLE_BINARY=128*1024*1024; // protect old v1 archives on decode
const CHUNK_BYTES=4*1024*1024; // limit one SHA-256 read to 4 MiB, including on Safari
const MAX_CHUNKS=250000; // bound untrusted manifest work; manifest size is bounded separately
const MAX_RECORDS=100000;
const MAX_DEPTH=48;
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const hash=async bytes=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)));
// Hash EXACTLY the bounded Blob slices we later append to the archive.
 // iPhone IndexedDB can return File objects whose whole-object Blob
 // composition behaves differently from their slice().arrayBuffer() reads.
 // Keep the original untouched; never transcode, truncate, or load full media.
async function checkedChunks(blob){
 const checksums=[],parts=[],size=blob.size;
 for(let off=0;off<size;off+=CHUNK_BYTES){
  ensure(checksums.length<MAX_CHUNKS,'TOO_MANY_MEDIA_CHUNKS');
  const end=Math.min(off+CHUNK_BYTES,size);
  const part=blob.slice(off,end);
  ensure(part.size===end-off,'SOURCE_SLICE_SIZE');
  const bytes=await part.arrayBuffer();
  ensure(bytes.byteLength===end-off,'SOURCE_READ_SIZE');
  checksums.push(await hash(bytes));
  parts.push(part);
 }
 return {checksums,parts};
}
const ensure=(ok,code)=>{if(!ok)throw Error('TALERA_ARCHIVE_'+code)};
function keyString(row,store){
 ensure(row&&typeof row==='object','INVALID_RECORD');
 const key=store==='stories'?row.id:row.key;
 ensure(typeof key==='string'&&key.length>0&&key.length<=4096,'INVALID_KEY');
 return key;
}
function isPlain(v){
 if(!v||typeof v!=='object')return false;
 const p=Object.getPrototypeOf(v);
 return p===Object.prototype||p===null;
}
export async function createFreeArchive({stories,files,sourceScope,sourceOrigin=null,createdAt='2026-11-09T00:00:00.000Z',legacyCompatible=false}){
 ensure(typeof legacyCompatible==='boolean','INVALID_COMPATIBILITY_OPTION');
 ensure(Array.isArray(stories)&&Array.isArray(files),'INVALID_STORES');
 ensure(stories.length+files.length<=MAX_RECORDS,'TOO_MANY_RECORDS');
 ensure(typeof sourceScope==='string'&&sourceScope.length>5&&sourceScope.length<200,'INVALID_SCOPE');
 if(sourceOrigin!==null){
  ensure(typeof sourceOrigin==='string'&&sourceOrigin.length<250,'INVALID_ORIGIN');
  let u;try{u=new URL(sourceOrigin)}catch{throw Error('TALERA_ARCHIVE_INVALID_ORIGIN')}
  ensure(u.origin===sourceOrigin&&['https:','http:'].includes(u.protocol),'INVALID_ORIGIN');
 }
 ensure(!Number.isNaN(Date.parse(createdAt)),'INVALID_DATE');
 const binaries=[],chunks=[],payloads=new Map();
 let sharedPayloads=0;
 // Keep a distinct binary descriptor for every logical record, including
 // each File name, MIME, timestamp and ArrayBuffer/Blob kind. Only the
 // payload is shared. A full ordered list of SHA-256 chunks identifies
 // content, including its exact length. No filename/size-only matching.
 const addBinary=(descriptor,parts)=>{
  const index=binaries.length;
  const signature=descriptor.length+':'+descriptor.sha256Chunks.join(',');
  if(!legacyCompatible&&payloads.has(signature)){
   descriptor.aliasOf=payloads.get(signature);
   sharedPayloads++;
  }else{
   payloads.set(signature,index);
   chunks.push(...parts);
  }
  binaries.push(descriptor);
  return ['bin',index];
 };
 const seen=new WeakSet();
 const encode=async(v,depth)=>{
  ensure(depth<MAX_DEPTH,'OBJECT_TOO_DEEP');
  if(v===null)return ['null'];
  if(v===undefined)return ['undefined'];
  if(typeof v==='string')return ['str',v];
  if(typeof v==='boolean')return ['bool',v];
  if(typeof v==='number'){
   ensure(Number.isFinite(v),'NONFINITE_NUMBER');return ['num',v];
  }
  if(typeof v==='bigint')return ['big',String(v)];
  ensure(typeof v==='object','UNSUPPORTED_OBJECT');
  if(v instanceof Blob){
   ensure(Number.isSafeInteger(v.size)&&v.size>=0,'INVALID_BINARY_SIZE');
   const {checksums,parts}=await checkedChunks(v);
   return addBinary({length:v.size,chunkBytes:CHUNK_BYTES,sha256Chunks:checksums,
    type:v.type||'',name:typeof File!=='undefined'&&v instanceof File?v.name:null,
    lastModified:typeof File!=='undefined'&&v instanceof File?v.lastModified:null},parts);
  }
  if(v instanceof Date){
   ensure(Number.isFinite(v.getTime()),'INVALID_DATE');return['date',v.toISOString()];
  }
  if(v instanceof ArrayBuffer){
   ensure(Number.isSafeInteger(v.byteLength),'INVALID_BINARY_SIZE');
   const blob=new Blob([v]);
   ensure(blob.size===v.byteLength,'SOURCE_BINARY_SIZE');
   const {checksums,parts}=await checkedChunks(blob);
   return addBinary({length:v.byteLength,chunkBytes:CHUNK_BYTES,
    sha256Chunks:checksums,type:'application/octet-stream',arrayBuffer:true},parts);
  }
  ensure(!seen.has(v),'CYCLIC_VALUE');seen.add(v);
  try{
   if(Array.isArray(v)){
    const array=[];
    for(const item of v)array.push(await encode(item,depth+1));
    return ['arr',array];
   }
   ensure(isPlain(v),'UNKNOWN_RECORD_TYPE');
   const entries=[];
   for(const key of Object.keys(v)){
    ensure(key.length<=2048,'FIELD_NAME_TOO_LONG');
    entries.push([key,await encode(v[key],depth+1)]);
   }
   return ['obj',entries];
  }finally{seen.delete(v)}
 };
 const encodeStore=async(rows,name)=>{
  const ids=new Set(),result=[];
  for(const row of rows){
   const id=keyString(row,name);
   ensure(!ids.has(id),'DUPLICATE_KEY');ids.add(id);
   result.push(await encode(row,0));
  }
  return result;
 };
 // Determine format only AFTER encoding both stores and discovering aliases.
 const encodedStories=await encodeStore(stories,'stories');
 const encodedFiles=await encodeStore(files,'files');
 const body={
  schema:sharedPayloads?'talera-free-lossless-local-3':'talera-free-lossless-local-2',
  sourceScope,
  sourceOrigin,
  createdAt,
  stories:encodedStories,
  files:encodedFiles,
  binaries
 };
 const manifest=te.encode(JSON.stringify(body));
 ensure(manifest.length<=MAX_MANIFEST,'MANIFEST_TOO_LARGE');
 const prefix=new Uint8Array(MAGIC.length+4+32);
 prefix.set(MAGIC);
 new DataView(prefix.buffer).setUint32(MAGIC.length,manifest.length,true);
 prefix.set(Uint8Array.from((await hash(manifest)).match(/.{2}/g).map(x=>parseInt(x,16))),MAGIC.length+4);
 const expected=prefix.byteLength+manifest.byteLength+
  binaries.reduce((total,bin)=>total+(bin.aliasOf===undefined?bin.length:0),0);
 ensure(Number.isSafeInteger(expected),'INVALID_ARCHIVE_SIZE');
 const archive=new Blob([prefix,manifest,...chunks],{type:'application/octet-stream'});
 ensure(archive.size===expected,archive.size>expected?'EXTRA_BYTES':'TRUNCATED_MEDIA');
 return archive;
}
export async function inspectFreeArchive(archive){
 ensure(archive instanceof Blob,'FILE_REQUIRED');
 ensure(archive.size>=MAGIC.length+4+32,'TRUNCATED_HEADER');
 const raw=new Uint8Array(await archive.slice(0,MAGIC.length+4+32).arrayBuffer());
 ensure(MAGIC.every((n,i)=>raw[i]===n),'BAD_MAGIC');
 const size=new DataView(raw.buffer).getUint32(MAGIC.length,true);
 ensure(size>10&&size<=MAX_MANIFEST,'INVALID_MANIFEST_SIZE');
 const start=raw.length,end=start+size;
 ensure(end<=archive.size,'TRUNCATED_MANIFEST');
 const bytes=new Uint8Array(await archive.slice(start,end).arrayBuffer());
 ensure(hex(raw.slice(MAGIC.length+4))===await hash(bytes),'MANIFEST_CHECKSUM');
 let parsed;
 try{parsed=JSON.parse(td.decode(bytes))}catch{throw Error('TALERA_ARCHIVE_INVALID_MANIFEST')}
 const legacy=parsed?.schema==='talera-free-lossless-local-1';
 const shared=parsed?.schema==='talera-free-lossless-local-3';
 ensure(legacy||shared||parsed?.schema==='talera-free-lossless-local-2','UNSUPPORTED_VERSION');
 ensure(typeof parsed.sourceScope==='string'&&parsed.sourceScope.length>5,'INVALID_SCOPE');
 const provenance=parsed.sourceOrigin;
 if(provenance!==undefined&&provenance!==null){
  let u;try{u=new URL(provenance)}catch{throw Error('TALERA_ARCHIVE_INVALID_ORIGIN')}
  ensure(typeof provenance==='string'&&provenance.length<250&&
    provenance===u.origin&&['https:','http:'].includes(u.protocol),'INVALID_ORIGIN');
 }
 ensure(Array.isArray(parsed.stories)&&Array.isArray(parsed.files)&&Array.isArray(parsed.binaries),'INVALID_STORES');
 ensure(parsed.stories.length+parsed.files.length<=MAX_RECORDS,'TOO_MANY_RECORDS');
 let offset=end,savedBytes=0,sharedEntries=0,logicalBinaryBytes=0;
 for(let index=0;index<parsed.binaries.length;index++){
  const bin=parsed.binaries[index];
  ensure(Number.isSafeInteger(bin?.length)&&bin.length>=0,'INVALID_BINARY_SIZE');
  if(legacy){
   ensure(bin.length<=LEGACY_MAX_SINGLE_BINARY,'INVALID_BINARY_SIZE');
   ensure(/^[a-f0-9]{64}$/.test(bin?.sha256||''),'INVALID_BINARY_CHECKSUM');
  }else{
   const count=Math.ceil(bin.length/CHUNK_BYTES);
   ensure(bin.chunkBytes===CHUNK_BYTES&&count<=MAX_CHUNKS&&
    Array.isArray(bin.sha256Chunks)&&bin.sha256Chunks.length===count,
    'INVALID_CHUNK_MANIFEST');
   for(const checksum of bin.sha256Chunks)
    ensure(typeof checksum==='string'&&/^[a-f0-9]{64}$/.test(checksum),'INVALID_BINARY_CHECKSUM');
  }
  logicalBinaryBytes+=bin.length;
  ensure(Number.isSafeInteger(logicalBinaryBytes),'INVALID_ARCHIVE_SIZE');
  if(Object.hasOwn(bin,'aliasOf')){
   ensure(shared&&Number.isInteger(bin.aliasOf)&&bin.aliasOf>=0&&bin.aliasOf<index,'INVALID_SHARED_PAYLOAD_REF');
   const original=parsed.binaries[bin.aliasOf];
   ensure(!Object.hasOwn(original,'aliasOf')&&original.length===bin.length&&
    original.sha256Chunks.length===bin.sha256Chunks.length&&
    original.sha256Chunks.every((hash,i)=>hash===bin.sha256Chunks[i]),'INVALID_SHARED_PAYLOAD');
   bin._offset=original._offset;
   savedBytes+=bin.length;sharedEntries++;
  }else{
   ensure(Number.isSafeInteger(offset+bin.length)&&offset+bin.length<=archive.size,'TRUNCATED_MEDIA');
   bin._offset=offset;
   offset+=bin.length;
  }
 }
 ensure(offset===archive.size,'EXTRA_BYTES');
 return {sourceScope:parsed.sourceScope,sourceOrigin:parsed.sourceOrigin??null,createdAt:parsed.createdAt,
  stories:parsed.stories.length,files:parsed.files.length,binaries:parsed.binaries.length,
  binaryBytes:offset-end,logicalBinaryBytes,savedBytes,sharedEntries,
  parsed};
}
export async function decodeFreeArchive(archive){
 const summary=await inspectFreeArchive(archive),p=summary.parsed;
 const reconstructed=[],verifiedParts=[];
 for(const bin of p.binaries){
  // Aliases can only reference a previously verified physical payload.
  // Reconstruct independent File/Blob metadata without a second hash read.
  const parts=bin.aliasOf===undefined?[]:verifiedParts[bin.aliasOf];
  if(bin.aliasOf!==undefined){
   ensure(Array.isArray(parts),'INVALID_SHARED_PAYLOAD_REF');
  }else if(p.schema==='talera-free-lossless-local-1'){
   const original=archive.slice(bin._offset,bin._offset+bin.length);
   ensure(await hash(await original.arrayBuffer())===bin.sha256,'MEDIA_CHECKSUM');
   parts.push(original);
  }else{
   for(let i=0;i<bin.sha256Chunks.length;i++){
    const start=bin._offset+i*CHUNK_BYTES;
    const part=archive.slice(start,Math.min(start+CHUNK_BYTES,bin._offset+bin.length));
    ensure(await hash(await part.arrayBuffer())===bin.sha256Chunks[i],'MEDIA_CHECKSUM');
    parts.push(part);
   }
  }
  verifiedParts.push(parts);
  let value;
  if(bin.arrayBuffer)value=await new Blob(parts).arrayBuffer();
  else if(bin.name!==null&&bin.name!==undefined){
   ensure(typeof bin.name==='string'&&bin.name.length<=4096,'INVALID_FILENAME');
   value=new File(parts,bin.name,{type:bin.type||'',lastModified:bin.lastModified||0});
  }else value=new Blob(parts,{type:bin.type||''});
  reconstructed.push(value);
 }
 const decode=(node,depth)=>{
  ensure(depth<MAX_DEPTH&&Array.isArray(node),'INVALID_VALUE');
  const [type,val]=node;
  if(type==='null')return null;
  if(type==='undefined')return undefined;
  if(type==='str'){ensure(typeof val==='string','INVALID_STRING');return val}
  if(type==='bool'){ensure(typeof val==='boolean','INVALID_BOOLEAN');return val}
  if(type==='num'){ensure(typeof val==='number'&&Number.isFinite(val),'INVALID_NUMBER');return val}
  if(type==='big'){ensure(/^-?\d+$/.test(val||''),'INVALID_BIGINT');return BigInt(val)}
  if(type==='date'){ensure(typeof val==='string'&&!Number.isNaN(Date.parse(val)),'INVALID_DATE');return new Date(val)}
  if(type==='bin'){
   ensure(Number.isInteger(val)&&val>=0&&val<reconstructed.length,'INVALID_MEDIA_REF');
   return reconstructed[val];
  }
  if(type==='arr'){
   ensure(Array.isArray(val),'INVALID_ARRAY');return val.map(v=>decode(v,depth+1));
  }
  if(type==='obj'){
   ensure(Array.isArray(val),'INVALID_OBJECT');
   // Preserve normal IndexedDB object semantics while defineProperty protects
   // even __proto__ against prototype pollution in untrusted backup metadata.
   const obj={};
   const keys=new Set();
   for(const entry of val){
    ensure(Array.isArray(entry)&&entry.length===2&&typeof entry[0]==='string','INVALID_FIELD');
    ensure(!keys.has(entry[0]),'DUPLICATE_FIELD');keys.add(entry[0]);
    Object.defineProperty(obj,entry[0],{value:decode(entry[1],depth+1),
     enumerable:true,configurable:true,writable:true});
   }
   return obj;
  }
  throw Error('TALERA_ARCHIVE_UNSUPPORTED_VALUE');
 };
 const stories=p.stories.map(v=>decode(v,0)),files=p.files.map(v=>decode(v,0));
 const ids=new Set(),keys=new Set();
 for(const row of stories){const k=keyString(row,'stories');ensure(!ids.has(k),'DUPLICATE_KEY');ids.add(k)}
 for(const row of files){const k=keyString(row,'files');ensure(!keys.has(k),'DUPLICATE_KEY');keys.add(k)}
 for(const row of stories){
  for(const item of row.items||[]){
   ensure(typeof item?.key==='string'&&keys.has(item.key),'MISSING_STORY_MEDIA');
  }
 }
 return {sourceScope:p.sourceScope,sourceOrigin:p.sourceOrigin??null,createdAt:p.createdAt,stories,files,
  verifiedBinaryCount:p.binaries.length};
}

// Explicit recovery conversion. Validate all source checksums and logical
// records FIRST, then re-encode a format understood by the protected older
// TALERA reader. No mutation of the archive, local library or account.
// This can increase archive size; never perform it automatically.
export async function expandFreeArchiveForLegacy(archive){
 const decoded=await decodeFreeArchive(archive);
 return createFreeArchive({stories:decoded.stories,files:decoded.files,
  sourceScope:decoded.sourceScope,sourceOrigin:decoded.sourceOrigin,
  createdAt:decoded.createdAt,legacyCompatible:true});
}
