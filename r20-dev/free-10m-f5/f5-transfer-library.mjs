// A transfer contains saved memories and their linked originals/mobile files.
// Editor drafts, account state and unrelated local administration stay local.
import {createFreeArchive,decodeFreeArchive} from './f5-portable-archive.mjs';
import {openExisting,readAll,verifyLibraryMediaIntegrity,verifyRestoredLibraryReadback,restoreRowsAtomic} from './f5-library-persistence.mjs';
const fail=()=>{throw Error('TALERA_TRANSFER_CONFLICT')};
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const digest=async bytes=>hex(await crypto.subtle.digest('SHA-256',bytes));
const enc=new TextEncoder();
const fileMap=rows=>new Map(rows.map(r=>[r.key,r]));
function linked(story,map){
 const keys=new Set();
 for(const item of story.items||[]){
  keys.add(item.key);
  if(map.has(item.key+':phone-v1'))keys.add(item.key+':phone-v1');
 }
 return [...keys].sort().map(k=>{if(!map.has(k))fail();return map.get(k)});
}
// Digest canonical typed metadata and bounded chunks of exact binary values.
// File type/name/time and ordered arrays participate in equality.
async function fingerprint(value,depth=0){
 if(depth>=48)fail();
 if(value instanceof Blob){
  const hashes=[];
  for(let i=0;i<value.size;i+=4194304)hashes.push(await digest(await value.slice(i,i+4194304).arrayBuffer()));
  return ['blob',value.type,value.size,typeof File==='function'&&value instanceof File?[value.name,value.lastModified]:null,hashes];
 }
 if(value instanceof ArrayBuffer)return ['buffer',await digest(value)];
 if(value instanceof Date)return ['date',value.toISOString()];
 if(value===undefined)return ['undefined'];
 if(typeof value==='bigint')return ['bigint',String(value)];
 if(value===null)return ['null'];
 if(typeof value==='number'){if(!Number.isFinite(value))fail();return ['number',Object.is(value,-0)?'-0':String(value)]}
 if(['string','boolean'].includes(typeof value))return [typeof value,value];
 if(Array.isArray(value)){const out=[];for(const v of value)out.push(await fingerprint(v,depth+1));return ['array',out]}
 if(typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype){
  const out=[];for(const k of Object.keys(value).sort())out.push([k,await fingerprint(value[k],depth+1)]);
  return ['object',out];
 }
 fail();
}
const hashRecord=async row=>digest(enc.encode(JSON.stringify(await fingerprint(row))));
export async function inventory(snapshot){
 verifyLibraryMediaIntegrity(snapshot);
 const map=fileMap(snapshot.files),files=new Map(),stories=[];
 for(const story of snapshot.stories){
  const refs=linked(story,map);
  for(const f of refs)if(!files.has(f.key))files.set(f.key,await hashRecord(f));
  stories.push([story.id,await hashRecord(story)]);
 }
 return {stories,files:[...files]};
}
function validatePairs(rows){
 if(!Array.isArray(rows)||rows.length>100000)fail();
 const map=new Map();
 for(const row of rows){
  if(!Array.isArray(row)||row.length!==2||typeof row[0]!=='string'||!row[0]||row[0].length>300||
     !/^[a-f0-9]{64}$/.test(row[1])||map.has(row[0]))fail();
  map.set(...row);
 }
 return map;
}
export async function planTransfer(source,target){
 const own=await inventory(source),old=validatePairs(target.stories),oldFiles=validatePairs(target.files);
 const files=fileMap(source.files),ownFiles=new Map(own.files),ownStories=new Map(source.stories.map(s=>[s.id,s])),stories=[],selected=new Map(),missing=new Map();
 let duplicates=0;
 for(const [id,hash] of own.stories){
  const story=ownStories.get(id),refs=linked(story,files);
  if(old.has(id)&&old.get(id)!==hash)fail();
  for(const row of refs){
   const h=ownFiles.get(row.key);
   if(oldFiles.has(row.key)&&oldFiles.get(row.key)!==h)fail();
   if(!old.has(id)){
    if(oldFiles.has(row.key))missing.set(row.key,h);
    else selected.set(row.key,row);
   }else if(!oldFiles.has(row.key))fail(); // existing story with incomplete media: do not silently repair
  }
  if(old.has(id))duplicates++;else stories.push(story);
 }
 return {stories,files:[...selected.values()],reuse:[...missing],duplicates};
}
export async function readTransferLibrary(dbName){
 const db=await openExisting(dbName,true);
 try{return await readAll(db)}finally{db.close()}
}
export async function makeTransfer(source,target,scope,origin){
 const planned=await planTransfer(source,target);
 if(!planned.stories.length)return {archive:null,reuse:[],duplicates:planned.duplicates,count:0};
 // The unchanged codec verifies reference keys. Transfer-only reference rows
 // are not valid originals and cannot pass normal backup restore validation.
 // Resolve them ONLY against matching local physical bytes before import.
 const referenceRows=planned.reuse.map(([key,hash])=>({key,transferReuseHash:hash}));
 const archive=await createFreeArchive({stories:planned.stories,files:[...planned.files,...referenceRows],sourceScope:scope,sourceOrigin:origin,createdAt:new Date().toISOString()});
 return {archive,reuse:planned.reuse,duplicates:planned.duplicates,count:planned.stories.length};
}
export async function reviewTransfer(archive,reuse,target,scope,origin){
 const decoded=await decodeFreeArchive(archive),refs=validatePairs(reuse);
 if(decoded.sourceScope!==scope||decoded.sourceOrigin!==origin||!decoded.stories.length)fail();
 const existing=fileMap(target.files),incoming=fileMap(decoded.files);
 for(const [id,hash] of refs){
  const ref=incoming.get(id);
  if(!ref||Object.keys(ref).sort().join()!=='key,transferReuseHash'||ref.transferReuseHash!==hash||
     !existing.has(id)||await hashRecord(existing.get(id))!==hash)fail();
  incoming.set(id,existing.get(id));
 }
 if([...incoming.values()].some(row=>Object.hasOwn(row,'transferReuseHash')))fail();
 const result={stories:decoded.stories,files:[...incoming.values()]};
 verifyLibraryMediaIntegrity(result);
 const used=new Set(result.stories.flatMap(s=>linked(s,incoming).map(r=>r.key)));
 if(result.files.some(f=>!used.has(f.key)))fail();
 if(result.stories.some(s=>target.stories.some(t=>t.id===s.id)))fail();
 for(const row of result.files)if(existing.has(row.key)&&await hashRecord(existing.get(row.key))!==await hashRecord(row))fail();
 return result;
}
export async function commitTransfer(archive,reuse,scope,origin,{confirmed=false}={}){
 if(!confirmed)throw Error('TALERA_TRANSFER_CONFIRMATION_REQUIRED');
 const db=await openExisting(scope,true);
 try{
  const reviewed=await reviewTransfer(archive,reuse,await readAll(db),scope,origin);
  await restoreRowsAtomic(db,reviewed);
  await verifyRestoredLibraryReadback(reviewed,await readAll(db));
  return {count:reviewed.stories.length,readback:true};
 }finally{db.close()}
}
