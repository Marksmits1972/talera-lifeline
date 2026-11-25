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
 async function readQuickTimeCaptureGps(blob){
 // ISO-BMFF/QuickTime movie-level metadata only. Skip mdat without loading it.
 // No raw string search, track-location guessing, network, or file mutation.
 const limit=2*1024*1024;
 let budget=limit,headers=0;
 const read=async(p,n)=>{
  if(!Number.isSafeInteger(p)||!Number.isSafeInteger(n)||p<0||n<0||p>blob.size-n||n>budget)throw Error('metadata bounds');
  budget-=n;
  const b=new Uint8Array(await blob.slice(p,p+n).arrayBuffer());
  if(b.length!==n)throw Error('short metadata read');
  return b;
 };
 const view=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
 const str=b=>String.fromCharCode(...b);
 const u32=(b,i=0)=>view(b).getUint32(i);
 const atoms=async(start,end)=>{
  const list=[];
  for(let p=start;p<end;){
   if(++headers>2048||end-p<8)throw Error('atom header bounds');
   const h=await read(p,8),type=str(h.subarray(4)),id=u32(h,4);
   let size=u32(h),header=8;
   if(size===1){
    if(end-p<16)throw Error('extended size');
    const ext=await read(p+8,8);
    size=u32(ext)*4294967296+u32(ext,4);header=16;
   }else if(size===0)size=end-p;
   if(!Number.isSafeInteger(size)||size<header||size>end-p)throw Error('atom bounds');
   list.push({type,id,start:p+header,end:p+size});
   p+=size;
  }
  return list;
 };
 const only=(list,type)=>{
  const a=list.filter(x=>x.type===type);
  if(a.length>1)throw Error('duplicate metadata atom');
  return a[0];
 };
 const decode=s=>{
  const m=/^([+-]\d{2}(?:\.\d+)?)([+-]\d{3}(?:\.\d+)?)(?:[+-]\d+(?:\.\d+)?)?\/$/.exec(s);
  if(!m)throw Error('unsupported ISO6709');
  const latitude=Number(m[1]),longitude=Number(m[2]);
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180||(latitude===0&&longitude===0))throw Error('invalid coordinates');
  return {latitude,longitude,source:'quicktime-iso6709'};
 };
 const found=[];
 async function meta(a){
  // QuickTime meta may be a plain container; ISO full-box adds 4 zero bytes.
  if(a.end-a.start<8)throw Error('short meta');
  const h=await read(a.start,4),p=a.start+(u32(h)===0?4:0);
  const list=await atoms(p,a.end);
  const handler=only(list,'hdlr');
  if(!handler||handler.end-handler.start<12)return;
  const hb=await read(handler.start,12);
  if(str(hb.subarray(8,12))!=='mdta')return;
  const keys=only(list,'keys'),ilst=only(list,'ilst');
  if(!keys||!ilst||keys.end-keys.start<8||keys.end-keys.start>65536)throw Error('metadata keys missing');
  const k=await read(keys.start,keys.end-keys.start),count=u32(k,4);
  if(u32(k)!==0||count>512)throw Error('keys bounds');
  let offset=8,index=0;
  for(let i=1;i<=count;i++){
   if(k.length-offset<8)throw Error('key header');
   const n=u32(k,offset);
   if(n<8||n>k.length-offset||n>1024)throw Error('key bounds');
   if(str(k.subarray(offset+4,offset+8))==='mdta'&&str(k.subarray(offset+8,offset+n))==='com.apple.quicktime.location.ISO6709'){
    if(index)throw Error('duplicate location key');index=i;
   }
   offset+=n;
  }
  if(offset!==k.length)throw Error('trailing keys');
  if(!index)return;
  const matches=(await atoms(ilst.start,ilst.end)).filter(x=>x.id===index);
  if(matches.length!==1)throw Error('ambiguous location item');
  const data=only(await atoms(matches[0].start,matches[0].end),'data');
  if(!data||data.end-data.start<9||data.end-data.start>136)throw Error('location data bounds');
  const d=await read(data.start,data.end-data.start);
  if(u32(d)!==1)throw Error('not UTF8 coordinates');
  found.push(decode(str(d.subarray(8))));
 }
 const top=await atoms(0,blob.size),moov=only(top,'moov');
 if(!moov)return null;
 const movie=await atoms(moov.start,moov.end);
 const direct=only(movie,'meta');if(direct)await meta(direct);
 const udta=only(movie,'udta');
 if(udta){
  const children=await atoms(udta.start,udta.end);
  const nested=only(children,'meta');if(nested)await meta(nested);
  // Classic QuickTime/Android userdata location: length, language, ISO6709.
  const xyz=only(children,'\xa9xyz');
  if(xyz){
   const len=xyz.end-xyz.start;
   if(len<5||len>132)throw Error('xyz bounds');
   const b=await read(xyz.start,len);
   if(view(b).getUint16(0)!==len-4)throw Error('xyz length');
   found.push(decode(str(b.subarray(4))));
  }
 }
 if(!found.length)return null;
 if(found.some(x=>x.latitude!==found[0].latitude||x.longitude!==found[0].longitude))return null;
 return Object.freeze(found[0]);
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
    try{
     const original=await originalBlob(id);
     if(/^video\/(?:quicktime|mp4|x-m4v)$/i.test(original.type))return await readQuickTimeCaptureGps(original);
     return await readJpegCaptureGps(original);
    }
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
