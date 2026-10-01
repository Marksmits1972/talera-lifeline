import {compactPhoto} from './media.js';
import {t} from './copy.browser.js';
export const photoLimit=12;
export async function photoFingerprint(file){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');}
// Only EXIF DateTimeOriginal counts as a camera date; file.lastModified never does.
export async function photoDate(file){
  try{
    const bytes=new Uint8Array(await file.slice(0,256*1024).arrayBuffer()),view=new DataView(bytes.buffer);
    for(let p=2;p+10<bytes.length;){if(bytes[p]!==255)break;const marker=bytes[p+1],size=view.getUint16(p+2);if(marker===225&&String.fromCharCode(...bytes.slice(p+4,p+10))==='Exif\0\0'){
      const base=p+10,little=view.getUint16(base)===0x4949;
      const read16=o=>view.getUint16(base+o,little),read32=o=>view.getUint32(base+o,little);
      const find=(offset,tag)=>{const n=read16(offset);if(n>512)throw Error();for(let i=0;i<n;i++){const o=offset+2+i*12;if(read16(o)===tag)return o;}return 0;};
      const exif=find(read32(4),0x8769);if(!exif)return '';const date=find(read32(exif+8),0x9003);if(!date)return '';
      const at=base+read32(date+8),value=new TextDecoder().decode(bytes.slice(at,at+10)).replaceAll(':','-');
      return /^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value).toISOString().slice(0,10)===value?value:'';
    }if(size<2)break;p+=2+size;}
  }catch{}return '';
}
export async function importPhotos(files,{getStory,existingFingerprints,commit,preview,progress}){
  const story=getStory(),list=Array.from(files||[]).filter(file=>file.type.startsWith('image/')||/\.(heic|heif|jpe?g|png|webp|gif|avif)$/i.test(file.name));
  if(!list.length)throw new Error(t('noPhoto'));
  if(list.length+story.photos.length>photoLimit)throw new Error(t('photoLimit'));
  const seen=new Set(await existingFingerprints());let done=0,duplicates=0,failed=0;
  for(const file of list){let url;
    try{
      if(file.size>64*1024*1024)throw new Error(t('photoTooLarge'));
      const fingerprint=await photoFingerprint(file);if(seen.has(fingerprint)){duplicates++;continue;}
      url=URL.createObjectURL(file);preview(url);const media=await compactPhoto(file,crypto.randomUUID());
      const captureDate=await photoDate(file);
      await commit(media,{id:media.id,name:file.name||'foto',type:media.blob.type,createdAt:Date.now(),fingerprint,captureDate});seen.add(fingerprint);done++;
    }catch(error){failed++;progress(done,duplicates,failed,list.length,error.message);}
    finally{if(url)URL.revokeObjectURL(url);progress(done,duplicates,failed,list.length);}
  }
  return {done,duplicates,failed};
}
