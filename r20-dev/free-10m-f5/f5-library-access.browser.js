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
 // Optional metadata only: FileReader gives the browser a cancellable read,
 // unlike Blob.arrayBuffer(). A navigation must not leave a native blob read
 // running in the old document. The Node contract test uses the same bytes.
 function readCaptureMetadataSlice(blob,start,end,signal){
  const aborted=()=>Error('CAPTURE_READ_ABORTED');
  if(signal?.aborted)return Promise.reject(aborted());
  if(typeof FileReader!=='function')return blob.slice(start,end).arrayBuffer();
  return new Promise((resolve,reject)=>{
   const reader=new FileReader();
   const cleanup=()=>{
    reader.onload=reader.onerror=reader.onabort=null;
    signal?.removeEventListener('abort',cancel);
   };
   const cancel=()=>{
    cleanup();
    try{if(reader.readyState===1)reader.abort()}catch(_){}
    reject(aborted());
   };
   reader.onload=()=>{const value=reader.result;cleanup();resolve(value)};
   reader.onerror=()=>{const error=reader.error;cleanup();reject(error||Error('CAPTURE_READ_FAILED'))};
   reader.onabort=()=>{cleanup();reject(aborted())};
   signal?.addEventListener('abort',cancel,{once:true});
   try{reader.readAsArrayBuffer(blob.slice(start,end))}
   catch(error){cleanup();reject(error)}
  });
 }
 // Photo pickers may convert native HEIF to JPEG while retaining the old
 // filename (or provide an unhelpful MIME type). Inspect the original
 // container signature before selecting either strict metadata reader.
 async function detectCapturePhotoFormat(blob,signal){
  const bytes=new Uint8Array(await readCaptureMetadataSlice(blob,0,Math.min(12,blob.size),signal));
  if(bytes.length>=2&&bytes[0]===255&&bytes[1]===216)return 'jpeg';
  if(bytes.length>=12&&bytes[4]===102&&bytes[5]===116&&bytes[6]===121&&bytes[7]===112)return 'heif';
  // A valid HEIF can have a leading padding box instead of ftyp.
  // Preserve support for these when hinted; the HEIF reader still validates the container.
  if(/^image\/(?:heic|heif|heic-sequence|heif-sequence)$/i.test(blob.type)||/\.(?:heic|heif)$/i.test(blob.name||''))return 'heif';
  return null;
 }
 async function readJpegCaptureGps(blob,signal){
 // Bounded original-header read only; never fetch or read a phone preview.
 const bytes=new Uint8Array(await readCaptureMetadataSlice(blob,0,2*1024*1024,signal));
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
 async function readQuickTimeCaptureGps(blob,signal){
 // ISO-BMFF/QuickTime movie-level metadata only. Skip mdat without loading it.
 // No raw string search, track-location guessing, network, or file mutation.
 const limit=2*1024*1024;
 let budget=limit,headers=0;
 const read=async(p,n)=>{
  if(!Number.isSafeInteger(p)||!Number.isSafeInteger(n)||p<0||n<0||p>blob.size-n||n>budget)throw Error('metadata bounds');
  budget-=n;
  const b=new Uint8Array(await readCaptureMetadataSlice(blob,p,p+n,signal));
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
 async function readJpegCapturePlace(blob,signal){
 // Only the explicit IPTC Extension LocationCreated structure, never
 // LocationShown, filename, current phone position or generic keywords.
 const bytes=new Uint8Array(await readCaptureMetadataSlice(blob,0,2*1024*1024,signal));
 if(bytes.length<4||bytes[0]!==255||bytes[1]!==216)return null;
 const signature='http://ns.adobe.com/xap/1.0/\0';
 const extension='http://ns.adobe.com/xmp/extension/\0';
 const begins=(p,end,s)=>end-p>=s.length&&[...s].every((c,i)=>bytes[p+i]===c.charCodeAt(0));
 let packet=null,complete=false;
 for(let p=2;p<bytes.length;){
  if(bytes[p++]!==255)return null;
  while(p<bytes.length&&bytes[p]===255)p++;
  if(p>=bytes.length)return null;
  const marker=bytes[p++];
  if(marker===0xda||marker===0xd9){complete=true;break}
  if(marker===1)continue;
  if(marker===0||marker===0xd8||(marker>=0xd0&&marker<=0xd7)||p+2>bytes.length)return null;
  const n=bytes[p]*256+bytes[p+1],start=p+2,end=p+n;
  if(n<2||end>bytes.length)return null;
  if(marker===0xe1){
   if(begins(start,end,extension))return null;
   if(begins(start,end,signature)){
    if(packet!==null)return null;
    packet=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(start+signature.length,end));
   }
  }
  p=end;
 }
 if(!complete)return null;
 return parseCapturePlacePacket(packet);
 }
 function parseCapturePlacePacket(packet){
 if(!packet||/<!DOCTYPE|<!ENTITY/i.test(packet)||typeof DOMParser!=='function')return null;
 const xml=new DOMParser().parseFromString(packet,'application/xml');
 if(xml.getElementsByTagNameNS('*','parsererror').length)return null;
 const IPTC='http://iptc.org/std/Iptc4xmpExt/2008-02-29/',RDF='http://www.w3.org/1999/02/22-rdf-syntax-ns#';
 const children=(n,ns,name)=>Array.from(n.children).filter(x=>x.namespaceURI===ns&&x.localName===name);
 const created=Array.from(xml.getElementsByTagNameNS(IPTC,'LocationCreated'));
 if(created.length!==1)return null;
 const bags=children(created[0],RDF,'Bag');
 if(bags.length!==1||created[0].children.length!==1)return null;
 const entries=children(bags[0],RDF,'li');
 if(entries.length!==1||bags[0].children.length!==1)return null;
 const item=entries[0],descs=children(item,RDF,'Description');
 if(descs.length>1||(descs.length===1&&item.children.length!==1))return null;
 const node=descs[0]||item;
 function field(name){
  const el=children(node,IPTC,name);
  const attr=node.getAttributeNS(IPTC,name);
  if(el.length>1||(el.length&&attr!==null)||el.some(x=>x.children.length))return null;
  const s=(attr??el[0]?.textContent??'').normalize('NFC').trim();
  if(!s||s.length>120||/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(s))return null;
  return s;
 }
 const countryCode=field('CountryCode'),city=field('City'),country=field('CountryName');
 const hasCountry=children(node,IPTC,'CountryName').length>0||node.hasAttributeNS(IPTC,'CountryName');
 // Initial support is intentionally limited to ISO alpha-2 with a
 // recognisable country name. Unknown/contradictory codes fail closed.
 if(!countryCode||!/^[A-Z]{2}$/.test(countryCode)||!city||(hasCountry&&!country))return null;
 const iso='AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW';
 if(!iso.split(' ').includes(countryCode))return null;
 const names=['nl','en','de','fr','es'].map(l=>new Intl.DisplayNames([l],{type:'region',fallback:'none'}).of(countryCode)).filter(Boolean);
 const norm=s=>s.normalize('NFC').toLocaleLowerCase('en');
 if(!names.length||hasCountry&&!names.some(x=>norm(x)===norm(country)))return null;
 return Object.freeze({countryCode,country:names[0],city,source:'iptc-location-created'});
}
 async function readCapturePlace(blob,signal){
 const format=await detectCapturePhotoFormat(blob,signal);
 if(format==='heif'){
  const packet=await readHeifCaptureMetadata(blob,'xmp',signal);
  return packet?parseCapturePlacePacket(new TextDecoder('utf-8',{fatal:true}).decode(packet)):null;
 }
 return format==='jpeg'?readJpegCapturePlace(blob,signal):null;
 }
 async function readHeifCaptureGps(blob,signal){
 return readHeifCaptureMetadata(blob,'exif',signal);
 }
 async function readHeifCaptureMetadata(blob,kind,signal){
 // Only metadata explicitly describing the primary image. Ignore thumbnails,
 // other images, motion tracks and unlinked metadata. Bounded slice reads.
 let budget=2*1024*1024, count=0;
 const read=async(p,n)=>{
  if(!Number.isSafeInteger(p)||!Number.isSafeInteger(n)||p<0||n<0||p>blob.size-n||n>budget)throw Error('HEIF read bounds');
  budget-=n;const b=new Uint8Array(await readCaptureMetadataSlice(blob,p,p+n,signal));
  if(b.length!==n)throw Error('HEIF short read');return b;
 };
 const string=b=>String.fromCharCode(...b);
 const cursor=b=>{
  let p=0;
  return {take(n){if(!Number.isInteger(n)||n<0||p>b.length-n)throw Error('HEIF field bounds');const r=b.subarray(p,p+n);p+=n;return r},
   int(n){if(n>8)throw Error('HEIF integer width');let v=0;for(const x of this.take(n))v=v*256+x;if(!Number.isSafeInteger(v))throw Error('HEIF integer overflow');return v},
   left(){return b.length-p}};
 };
 async function boxes(start,end){
  const result=[];
  for(let p=start;p<end;){
   if(++count>2048||end-p<8)throw Error('HEIF box bounds');
   const c=cursor(await read(p,8));let size=c.int(4),type=string(c.take(4)),header=8;
   if(size===1){if(end-p<16)throw Error('HEIF extended box');size=cursor(await read(p+8,8)).int(8);header=16}
   if(size===0)size=end-p;
   if(size<header||size>end-p)throw Error('HEIF box size');
   result.push({type,start:p+header,end:p+size});p+=size;
  }
  return result;
 }
 const one=(list,type)=>{const a=list.filter(x=>x.type===type);if(a.length>1)throw Error('HEIF duplicate box');return a[0]};
 const payload=async(a,max=262144)=>{if(!a||a.end-a.start>max)throw Error('HEIF metadata size');return cursor(await read(a.start,a.end-a.start))};
 const full=c=>{const v=c.int(1);if(c.int(3)!==0)throw Error('HEIF flags');return v};
 const top=await boxes(0,blob.size);
 const ftyp=await payload(one(top,'ftyp'),1024);
 const brands=[];brands.push(string(ftyp.take(4)));ftyp.int(4);
 while(ftyp.left())brands.push(string(ftyp.take(4)));
 if(!brands.some(b=>['heic','heix','hevc','hevx','mif1','msf1'].includes(b)))return null;
 const meta=one(top,'meta');if(!meta||meta.end-meta.start<4)return null;
 if(full(cursor(await read(meta.start,4)))!==0)return null;
 const children=await boxes(meta.start+4,meta.end);
 const pitm=await payload(one(children,'pitm'),16),pv=full(pitm);
 if(pv>1)return null;
 const primary=pitm.int(pv?4:2);if(!primary||pitm.left())return null;
 const iinf=one(children,'iinf');if(!iinf||iinf.end-iinf.start<6)return null;
 const ih=cursor(await read(iinf.start,4)),iv=full(ih);
 if(iv>1)return null;
 const width=iv?4:2,entries=cursor(await read(iinf.start+4,width)).int(width);
 if(entries>1024)return null;
 const infos=await boxes(iinf.start+4+width,iinf.end);
 if(infos.length!==entries)return null;
 const candidates=new Set(),seen=new Set();
 for(const info of infos){
  if(info.type!=='infe')return null;
  const c=await payload(info,4096),v=c.int(1),flags=c.int(3);
  // ItemInfoEntry bit 0 denotes a hidden item (e.g. a HEIF grid tile).
  // It does not invalidate the primary image's separately linked Exif.
  if((flags&~1)!==0||v!==2&&v!==3)return null;
  const id=c.int(v===3?4:2),protection=c.int(2),type=string(c.take(4));
  if(seen.has(id)||(id===primary&&(flags&1)))return null;seen.add(id);
  if(kind==='exif'&&type==='Exif'&&!protection)candidates.add(id);
  if(kind==='xmp'&&type==='mime'&&!protection){
   const cString=()=>{let value='';while(c.left()){const b=c.int(1);if(!b)return value;value+=String.fromCharCode(b)}throw Error('HEIF unterminated MIME field')};
   cString(); // item_name, not location evidence
   const mime=cString(),encoding=c.left()?cString():'';
   if(mime==='application/rdf+xml'&&!encoding&&!c.left())candidates.add(id);
  }
 }
 if(!seen.has(primary)||!candidates.size)return null;
 const iref=one(children,'iref');if(!iref||iref.end-iref.start<4)return null;
 const rv=full(cursor(await read(iref.start,4)));if(rv>1)return null;
 const rw=rv?4:2,linked=[];
 for(const entry of await boxes(iref.start+4,iref.end)){
  if(entry.type!=='cdsc')continue;
  const c=await payload(entry,16384),from=c.int(rw),n=c.int(2);
  if(n>1024||c.left()!==n*rw)return null;
  const targets=[];for(let i=0;i<n;i++)targets.push(c.int(rw));
  if(candidates.has(from)&&targets.includes(primary)){
   // A shared Exif record is not an unambiguous primary capture location.
   if(n!==1)return null;linked.push(from);
  }
 }
 if(linked.length!==1)return null;
 const iloc=await payload(one(children,'iloc')),lv=full(iloc);
 if(lv>2)return null;
 const a=iloc.int(1),b=iloc.int(1),os=a>>4,ls=a&15,bs=b>>4,is=lv?b&15:0;
 if([os,ls,bs,is].some(n=>n>8)||!ls||(!lv&&(b&15)))return null;
 const iw=lv===2?4:2,n=iloc.int(iw);
 if(n>1024)return null;
 let match=null;const ids=new Set();
 for(let i=0;i<n;i++){
  const id=iloc.int(iw),method=lv?iloc.int(2):0,ref=iloc.int(2),base=iloc.int(bs),extCount=iloc.int(2);
  if(ids.has(id)||extCount>1024)return null;ids.add(id);
  const ext=[];
  for(let j=0;j<extCount;j++){
   const idx=iloc.int(is),offset=iloc.int(os),length=iloc.int(ls);
   if(id===linked[0])ext.push({idx,offset,length});
  }
  if(id===linked[0])match={method,ref,base,ext};
 }
 if(iloc.left()||!match||match.ref||![0,1].includes(match.method)||!match.ext.length||match.ext.length>16)return null;
 const idat=match.method===1?one(children,'idat'):null;
 if(match.method===1&&!idat)return null;
 const parts=[];let total=0;
 for(const e of match.ext){
  const start=(idat?.start||0)+match.base+e.offset;
  if(e.idx||!e.length||!Number.isSafeInteger(start)||start<0||start>blob.size-e.length)return null;
  if(idat&&(start<idat.start||start>idat.end-e.length))return null;
  total+=e.length;if(total>512*1024)return null;
  parts.push(await read(start,e.length));
 }
 const data=new Uint8Array(total);let pos=0;for(const p of parts){data.set(p,pos);pos+=p.length}
 if(kind==='xmp')return data.length?data:null;
 if(data.length<12)return null;
 const offset=4+cursor(data).int(4);
 if(offset>data.length-8)return null;
 const gps=parseExifCaptureGps(data,offset,data.length);
 return gps?Object.freeze({...gps,source:'heif-exif-gps'}):null;
}
 // Shared by the gateway, passive saved-media enrichment and draft preview.
 async function readOriginalCaptureGps(original,signal){
  if(/^video\/(?:quicktime|mp4|x-m4v)$/i.test(original.type))return readQuickTimeCaptureGps(original,signal);
  const format=await detectCapturePhotoFormat(original,signal);
  if(format==='heif')return readHeifCaptureGps(original,signal);
  return format==='jpeg'?readJpegCaptureGps(original,signal):null;
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
   async capturePlace(id){
    requireId(id,'MEDIA_ID');
    try{return await readCapturePlace(await originalBlob(id))}
    catch(_){return null}
   },
   async captureGps(id){
    requireId(id,'MEDIA_ID');
    try{
     const original=await originalBlob(id);
     return await readOriginalCaptureGps(original);
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
