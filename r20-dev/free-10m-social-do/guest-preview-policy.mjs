// New guest links use a separate consented, compact JPEG, not an original.
export const GUEST_HOURS=Object.freeze([1,24,168]);
export const PREVIEW_SIZE=512;
export const PREVIEW_LIMIT=131072;
export function validCompactPreview(value){
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===3&&value.version===1&&
  typeof value.title==='boolean'&&typeof value.photo==='boolean'&&
  (!value.photo||value.title);
}
export function compactPreviewPolicy(raw){
 if(!raw)return null;
 const value=JSON.parse(raw)?.compactPreview;
 return validCompactPreview(value)?value:null;
}
export function validCompactJPEG(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<20||bytes.length>PREVIEW_LIMIT||
  bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)return false;
 let i=2,dimensions=false;
 while(i+4<bytes.length){
  if(bytes[i++]!==255)return false;
  while(bytes[i]===255)i++;
  const marker=bytes[i++],length=bytes[i]*256+bytes[i+1];
  if(length<2||i+length>bytes.length)return false;
  // Canvas JPEGs may carry JFIF and color profiles, never EXIF or comments.
  if(marker===225||marker===237||marker===254)return false;
  if(marker===192||marker===193||marker===194){
   if(length<8||bytes[i+2]!==8||bytes[i+3]*256+bytes[i+4]!==PREVIEW_SIZE||
    bytes[i+5]*256+bytes[i+6]!==PREVIEW_SIZE)return false;
   dimensions=true;
  }
  if(marker===218)return dimensions&&i+length<bytes.length-2;
  i+=length;
 }
 return false;
}
