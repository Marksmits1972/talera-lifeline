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
async function chunkHashes(blob){
 const checksums=[];
 for(let off=0;off<blob.size;off+=CHUNK_BYTES){
  ensure(checksums.length<MAX_CHUNKS,'TOO_MANY_MEDIA_CHUNKS');
  checksums.push(await hash(await blob.slice(off,Math.min(off+CHUNK_BYTES,blob.size)).arrayBuffer()));
 }
 return checksums;
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
export async function createFreeArchive({stories,files,sourceScope,sourceOrigin=null,createdAt='2026-11-09T00:00:00.000Z'}){
 ensure(Array.isArray(stories)&&Array.isArray(files),'INVALID_STORES');
 ensure(stories.length+files.length<=MAX_RECORDS,'TOO_MANY_RECORDS');
 ensure(typeof sourceScope==='string'&&sourceScope.length>5&&sourceScope.length<200,'INVALID_SCOPE');
 if(sourceOrigin!==null){
  ensure(typeof sourceOrigin==='string'&&sourceOrigin.length<250,'INVALID_ORIGIN');
  let u;try{u=new URL(sourceOrigin)}catch{throw Error('TALERA_ARCHIVE_INVALID_ORIGIN')}
  ensure(u.origin===sourceOrigin&&['https:','http:'].includes(u.protocol),'INVALID_ORIGIN');
 }
 ensure(!Number.isNaN(Date.parse(createdAt)),'INVALID_DATE');
 const binaries=[],chunks=[];
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
   const index=binaries.length;
   binaries.push({length:v.size,chunkBytes:CHUNK_BYTES,sha256Chunks:await chunkHashes(v),
    type:v.type||'',name:typeof File!=='undefined'&&v instanceof File?v.name:null,
    lastModified:typeof File!=='undefined'&&v instanceof File?v.lastModified:null});
   chunks.push(v);
   return ['bin',index];
  }
  if(v instanceof Date){
   ensure(Number.isFinite(v.getTime()),'INVALID_DATE');return['date',v.toISOString()];
  }
  if(v instanceof ArrayBuffer){
   ensure(Number.isSafeInteger(v.byteLength),'INVALID_BINARY_SIZE');
   const index=binaries.length;
   const blob=new Blob([v]);
   binaries.push({length:v.byteLength,chunkBytes:CHUNK_BYTES,
    sha256Chunks:await chunkHashes(blob),type:'application/octet-stream',arrayBuffer:true});
   chunks.push(blob);return ['bin',index];
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
 const body={
  schema:'talera-free-lossless-local-2',
  sourceScope,
  sourceOrigin,
  createdAt,
  stories:await encodeStore(stories,'stories'),
  files:await encodeStore(files,'files'),
  binaries
 };
 const manifest=te.encode(JSON.stringify(body));
 ensure(manifest.length<=MAX_MANIFEST,'MANIFEST_TOO_LARGE');
 const prefix=new Uint8Array(MAGIC.length+4+32);
 prefix.set(MAGIC);
 new DataView(prefix.buffer).setUint32(MAGIC.length,manifest.length,true);
 prefix.set(Uint8Array.from((await hash(manifest)).match(/.{2}/g).map(x=>parseInt(x,16))),MAGIC.length+4);
 return new Blob([prefix,manifest,...chunks],{type:'application/octet-stream'});
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
 ensure(legacy||parsed?.schema==='talera-free-lossless-local-2','UNSUPPORTED_VERSION');
 ensure(typeof parsed.sourceScope==='string'&&parsed.sourceScope.length>5,'INVALID_SCOPE');
 const provenance=parsed.sourceOrigin;
 if(provenance!==undefined&&provenance!==null){
  let u;try{u=new URL(provenance)}catch{throw Error('TALERA_ARCHIVE_INVALID_ORIGIN')}
  ensure(typeof provenance==='string'&&provenance.length<250&&
    provenance===u.origin&&['https:','http:'].includes(u.protocol),'INVALID_ORIGIN');
 }
 ensure(Array.isArray(parsed.stories)&&Array.isArray(parsed.files)&&Array.isArray(parsed.binaries),'INVALID_STORES');
 ensure(parsed.stories.length+parsed.files.length<=MAX_RECORDS,'TOO_MANY_RECORDS');
 let offset=end;
 for(const bin of parsed.binaries){
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
  ensure(Number.isSafeInteger(offset+bin.length)&&offset+bin.length<=archive.size,'TRUNCATED_MEDIA');
  bin._offset=offset;
  offset+=bin.length;
 }
 ensure(offset===archive.size,'EXTRA_BYTES');
 return {sourceScope:parsed.sourceScope,sourceOrigin:parsed.sourceOrigin??null,createdAt:parsed.createdAt,
  stories:parsed.stories.length,files:parsed.files.length,binaries:parsed.binaries.length,
  binaryBytes:parsed.binaries.reduce((total,b)=>total+b.length,0),
  parsed};
}
export async function decodeFreeArchive(archive){
 const summary=await inspectFreeArchive(archive),p=summary.parsed;
 const reconstructed=[];
 for(const bin of p.binaries){
  const parts=[];
  if(p.schema==='talera-free-lossless-local-1'){
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
