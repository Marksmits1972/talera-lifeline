// TALERA Free: one account-local library interface, shared by existing players.
// This file has NO storage schema, UI, Worker, cloud, or media-writing side effects.
// The existing TaleraMemories store remains the sole owner of IndexedDB/IDs.
(function attachTaleraLibraryFactory(root){
 'use strict';
 const validId=value=>typeof value==='string'&&value.length>0&&value.length<=4096;
 const requireId=(value,label)=>{
  if(!validId(value))throw Error('TALERA_LIBRARY_INVALID_'+label);
  return value;
 };
 // Local capture metadata, first supported format: JPEG EXIF.
 // Coordinates are temporary; this is not a place-name resolver.
 function parseExifCaptureGps(bytes,start,end){
 const v=new DataView(bytes.buffer,bytes.byteOffset+start,end-start);
 if(v.byteLength<8)return null;
 const order=v.getUint16(0);
 if(order!==0x4949&&order!==0x4d4d)return null;
 const le=order===0x4949;
 const u16=i=>v.getUint16(i,le),u32=i=>v.getUint32(i,le);
 const within=(i,n)=>Number.isInteger(i)&&i>=0&&n>=0&&i<=v.byteLength-n;
 if(u16(2)!==42)return null;
 function ifd(offset,limit){
  if(offset<8||!within(offset,2))return null;
  const count=u16(offset);
  if(count>limit||!within(offset+2,count*12+4))return null;
  const tags=new Map();
  for(let i=0;i<count;i++){
   const pos=offset+2+i*12,tag=u16(pos);
   if(tags.has(tag))return null;
   tags.set(tag,{pos,type:u16(pos+2),count:u32(pos+4)});
  }
  return tags;
 }
 const root=ifd(u32(4),512),pointer=root?.get(0x8825);
 if(!pointer||pointer.type!==4||pointer.count!==1)return null;
 const gps=ifd(u32(pointer.pos+8),128);
 if(!gps)return null;
 function ref(tag,allowed){
  const x=gps.get(tag);
  if(!x||x.type!==2||x.count!==2||v.getUint8(x.pos+9)!==0)return null;
  const s=String.fromCharCode(v.getUint8(x.pos+8));
  return allowed.includes(s)?s:null;
 }
 if(gps.has(9)&&ref(9,['A'])!=='A')return null;
 function angle(tag,max){
  const x=gps.get(tag);
  if(!x||x.type!==5||x.count!==3)return null;
  const offset=u32(x.pos+8);
  if(offset<8||!within(offset,24))return null;
  const parts=[];
  for(let i=0;i<3;i++){
   const n=u32(offset+i*8),d=u32(offset+i*8+4);
   if(!d)return null;
   parts.push(n/d);
  }
  const [deg,min,sec]=parts;
  if(deg>max||min>=60||sec>=60)return null;
  const result=deg+min/60+sec/3600;
  return result<=max?result:null;
 }
 const latRef=ref(1,['N','S']),lonRef=ref(3,['E','W']);
 const lat=angle(2,90),lon=angle(4,180);
 if(!latRef||!lonRef||lat===null||lon===null||(lat===0&&lon===0))return null;
 return Object.freeze({latitude:latRef==='S'?-lat:lat,longitude:lonRef==='W'?-lon:lon,source:'jpeg-exif-gps'});
}
 async function readJpegCaptureGps(blob){
 // Bounded original-header read only; never fetch or read a phone preview.
 const bytes=new Uint8Array(await blob.slice(0,2*1024*1024).arrayBuffer());
 if(bytes.length<4||bytes[0]!==0xff||bytes[1]!==0xd8)return null;
 let pos=2,seen=false,result=null;
 while(pos<bytes.length){
  if(bytes[pos++]!==0xff)return null;
  while(pos<bytes.length&&bytes[pos]===0xff)pos++;
  if(pos>=bytes.length)return null;
  const marker=bytes[pos++];
  if(marker===0xda||marker===0xd9)return result;
  if(marker===0x01)continue;
  if(marker===0||marker===0xd8||(marker>=0xd0&&marker<=0xd7)||pos+2>bytes.length)return null;
  const length=bytes[pos]*256+bytes[pos+1],end=pos+length,start=pos+2;
  if(length<2||end>bytes.length)return null;
  if(marker===0xe1&&end-start>=6&&bytes[start]===69&&bytes[start+1]===120&&bytes[start+2]===105&&bytes[start+3]===102&&bytes[start+4]===0&&bytes[start+5]===0){
   if(seen)return null; // Conflicting/duplicate metadata is not trusted.
   seen=true;
   result=parseExifCaptureGps(bytes,start+6,end);
  }
  pos=end;
 }
 return null; // Header exceeded our safe read budget or was truncated.
}
 function create(store){
  if(!store||typeof store.list!=='function'||typeof store.get!=='function'||
     typeof store.blob!=='function'||typeof store.mediaUrl!=='function')
   throw Error('TALERA_LIBRARY_STORAGE_INTERFACE_MISSING');
  const readStory=async id=>{
   requireId(id,'STORY_ID');
   const result=await store.get(id);
   if(!result||result.id!==id)throw Error('TALERA_LIBRARY_STORY_NOT_FOUND');
   return result;
  };
  const listStories=async()=>{
   const result=await store.list();
   if(!Array.isArray(result))throw Error('TALERA_LIBRARY_INVALID_STORY_LIST');
   return result;
  };
  const originalBlob=async id=>{
   requireId(id,'MEDIA_ID');
   const file=await store.blob(id);
   if(!(file instanceof Blob)||!file.size)
    throw Error('TALERA_LIBRARY_ORIGINAL_MEDIA_NOT_FOUND');
   return file;
  };
  const mediaUrl=async id=>{
   requireId(id,'MEDIA_ID');
   // Same missing-file behavior as the approved motor. The motor decides
   // whether a missing optional cover or original media ends the phase.
   return store.mediaUrl(id);
  };
  const displayUrl=async id=>{
   requireId(id,'MEDIA_ID');
   return typeof store.displayUrl==='function'?store.displayUrl(id):store.mediaUrl(id);
  };
  // Returns permanent catalog references; does not create or move original files.
  const orderedMedia=async id=>{
   const story=await readStory(id);
   if(!Array.isArray(story.items))throw Error('TALERA_LIBRARY_INVALID_MEDIA_LIST');
   return story.items.map((item,index)=>{
    if(!validId(item?.key))throw Error('TALERA_LIBRARY_INVALID_MEDIA_REFERENCE');
    return Object.freeze({mediaId:item.key,kind:item.kind,index});
   });
  };
  // Compatibility boundary for ALREADY-HYDRATED player state. This is temporary
  // display data, not a second library or a replacement for the stored row.
  const playback=memory=>{
   if(!memory||memory.id===undefined)throw Error('TALERA_LIBRARY_INVALID_PLAYBACK_MEMORY');
   const items=Array.isArray(memory._zeroItems)?memory._zeroItems:
     (Array.isArray(memory.items)?memory.items:[]);
   const frames=Array.isArray(memory._zeroFrames)?memory._zeroFrames:[];
   const cues=Array.isArray(memory._taleraNarrationCues)?memory._taleraNarrationCues:
     (Array.isArray(memory.narrationCues)?memory.narrationCues:[]);
   return Object.freeze({
    voice:items.find(item=>item?.kind==='audio')||null,
    hasVoice:items.some(item=>item?.kind==='audio'),
    frames, cues
   });
  };
  const api={
   listStories,readStory,orderedMedia,originalBlob,mediaUrl,displayUrl,playback,
   async captureGps(id){
    requireId(id,'MEDIA_ID');
    try{return await readJpegCaptureGps(await originalBlob(id))}
    catch(_){return null} // Optional metadata never blocks existing playback.
   },
   // Compatibility names used by the two approved playback engines.
   // Original read-signatures remain compatible, including null on a miss.
   list:(...args)=>store.list(...args),
   get:(...args)=>store.get(...args),
   blob:id=>{requireId(id,'MEDIA_ID');return store.blob(id)},
   // Writing stays controlled by the existing editor/storage implementation;
   // neither player receives a second database handle or a write method.
   localOnly:true
  };
  return Object.freeze(api);
 }
 Object.defineProperty(root,'TaleraLibraryFactory',{
  configurable:false,enumerable:false,writable:false,
  value:Object.freeze({create,version:1})
 });
})(globalThis);
