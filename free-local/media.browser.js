import {t} from './copy.browser.js';
export const mediaConfig = Object.freeze({maxSide:1600,thumbnailSide:320,quality:0.82});
function encode(image, side, quality) {
  const ratio = Math.min(1,side/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
    const width=canvas.width,height=canvas.height;canvas.width=canvas.height=1;
    if(blob?.size)resolve({blob,width,height});else reject(new Error(t('photoProcessingError')));
  },'image/jpeg',quality));
}
export async function compactPhoto(file,id) {
  const url=URL.createObjectURL(file),image=new Image();
  try {
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error(t('unsupportedPhoto')));image.src=url;});
    const display=await encode(image,mediaConfig.maxSide,mediaConfig.quality);
    const thumbnail=await encode(image,mediaConfig.thumbnailSide,0.75);
    return {id,...display,thumbnail:thumbnail.blob,sourceBytes:file.size,createdAt:Date.now()};
  } finally {URL.revokeObjectURL(url);image.src='';}
}
