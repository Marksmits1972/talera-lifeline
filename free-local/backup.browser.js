import {t} from './copy.browser.js';
const MAGIC=new TextEncoder().encode('TALERA1\n');
export const backupLimits=Object.freeze({bytes:256*1024*1024,header:4*1024*1024,items:10000});
const invalid=()=>new Error(t('backupInvalid'));
const hash=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
function text(value,max=1000000){if(typeof value!=='string'||value.length>max)throw invalid();return value;}
function identifier(value){return text(value,200)||(()=>{throw invalid();})();}
function numeric(value){if(!Number.isFinite(value)||value<0)throw invalid();return value;}
function normalizeStories(stories,ids){
  if(!Array.isArray(stories)||stories.length>backupLimits.items)throw invalid();
  const seen=new Set();
  return stories.map(s=>{
    const id=identifier(s.id);if(seen.has(id))throw invalid();seen.add(id);
    if(!Array.isArray(s.photos)||s.photos.length>1000||!['draft','published'].includes(s.status))throw invalid();
    const date=text(s.date||'',10);
    if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))throw invalid();
    const photos=s.photos.map(p=>{
      if(!ids.has(p.id))throw invalid();
      return {id:identifier(p.id),name:text(p.name||'foto',1000),type:text(p.type||'image/jpeg',100),createdAt:numeric(p.createdAt||0)};
    });
    const storyText=text(s.storyText||'');
    if(s.audioId)throw new Error(t('backupUnsupported'));
    if(s.status==='published'&&(!date||!photos.length||!storyText.trim()))throw invalid();
    return {id,title:text(s.title||'',1000),date,datePrecision:date?'day':'unknown',storyText,note:text(s.note||''),photos,
      createdAt:numeric(s.createdAt||0),updatedAt:numeric(s.updatedAt||0),schemaVersion:1,status:s.status,
      currentIndex:Math.min(Math.max(0,Number.isInteger(s.currentIndex)?s.currentIndex:0),Math.max(0,photos.length-1)),fit:s.fit==='contain'?'contain':'cover',audioId:''};
  });
}
export async function createBackup(storage){
  const snapshot=await storage.snapshot();
  if(!snapshot.stories.length)throw new Error(t('backupEmpty'));
  if(snapshot.media.length>backupLimits.items)throw invalid();
  const ids=new Set(snapshot.media.map(m=>identifier(m.id)));
  if(ids.size!==snapshot.media.length)throw invalid();
  const stories=normalizeStories(snapshot.stories,ids),parts=[],media=[];
  let bytes=0;
  for(const item of snapshot.media){
    const entry={id:item.id,width:item.width||0,height:item.height||0,sourceBytes:item.sourceBytes||0,createdAt:item.createdAt||0};
    for(const key of ['blob','thumbnail']){
      const blob=item[key];if(!(blob instanceof Blob)||!blob.size)throw invalid();
      bytes+=blob.size;if(bytes>backupLimits.bytes)throw new Error(t('backupTooLarge'));
      entry[key]={size:blob.size,type:blob.type||'image/jpeg',sha256:await hash(blob)};parts.push(blob);
    }
    media.push(entry);
  }
  const createdAt=new Date().toISOString();
  const header=new TextEncoder().encode(JSON.stringify({format:'TALERA Free',version:1,createdAt,stories,media}));
  if(header.length>backupLimits.header||bytes+12+header.length>backupLimits.bytes)throw new Error(t('backupTooLarge'));
  const length=new Uint8Array(4);new DataView(length.buffer).setUint32(0,header.length);
  const file=new File([MAGIC,length,header,...parts],'TALERA-reservekopie-'+createdAt.replace(/[:.]/g,'-')+'.talera',{type:'application/octet-stream'});
  return {file,createdAt,storyCount:stories.length,photoCount:media.length};
}
export async function readBackup(file){
  if(!file||file.size<12||file.size>backupLimits.bytes)throw new Error(file?.size>backupLimits.bytes?t('backupTooLarge'):t('backupInvalid'));
  const prefix=new Uint8Array(await file.slice(0,12).arrayBuffer());
  if(!MAGIC.every((byte,i)=>prefix[i]===byte))throw invalid();
  const size=new DataView(prefix.buffer).getUint32(8);
  if(!size||size>backupLimits.header||12+size>file.size)throw invalid();
  let manifest;try{manifest=JSON.parse(await file.slice(12,12+size).text());}catch{throw invalid();}
  if(manifest.format!=='TALERA Free'||manifest.version!==1)throw new Error(t('backupUnsupported'));
  if(!Array.isArray(manifest.media)||manifest.media.length>backupLimits.items||!Number.isFinite(Date.parse(manifest.createdAt)))throw invalid();
  let offset=12+size;const media=[],ids=new Set();
  for(const item of manifest.media){
    const id=identifier(item.id);if(ids.has(id))throw invalid();ids.add(id);
    const result={id,width:numeric(item.width),height:numeric(item.height),sourceBytes:numeric(item.sourceBytes),createdAt:numeric(item.createdAt)};
    for(const key of ['blob','thumbnail']){
      const desc=item[key];
      if(!desc||!Number.isSafeInteger(desc.size)||desc.size<=0||offset+desc.size>file.size||!/^image\/(jpeg|png|webp|gif|avif)$/.test(desc.type)||!/^[a-f0-9]{64}$/.test(desc.sha256))throw invalid();
      const blob=file.slice(offset,offset+desc.size,desc.type);offset+=desc.size;
      if(await hash(blob)!==desc.sha256)throw invalid();result[key]=blob;
    }
    media.push(result);
  }
  if(offset!==file.size)throw invalid();
  const stories=normalizeStories(manifest.stories,ids);
  return {stories,media,createdAt:manifest.createdAt};
}
