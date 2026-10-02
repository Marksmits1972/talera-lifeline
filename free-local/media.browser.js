import {t} from './copy.browser.js';
// A phone display copy plus a tiny timeline thumbnail; never retain the original bytes.
export const mediaConfig = Object.freeze({maxSide:1280,thumbnailSide:240,quality:0.78,targetBytes:96*1024,maxBytes:128*1024,thumbnailTargetBytes:8*1024,thumbnailMaxBytes:12*1024});
function encode(image, side, quality) {
  const ratio=Math.min(1,side/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error(t('photoProcessingError'));
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
    const width=canvas.width,height=canvas.height;canvas.width=canvas.height=1;
    if(blob?.size&&blob.type==='image/jpeg')resolve({blob,width,height});else reject(new Error(t('photoProcessingError')));
  },'image/jpeg',quality));
}
async function fit(image,maxSide,targetBytes,maxBytes){
  let side=Math.min(maxSide,Math.max(image.naturalWidth,image.naturalHeight));
  for(let attempt=0;attempt<8;attempt++){
    let acceptable;
    for(const quality of [mediaConfig.quality,0.68,0.58]){
      const result=await encode(image,side,quality);
      if(result.blob.size<=targetBytes)return result;
      if(!acceptable&&result.blob.size<=maxBytes)acceptable=result;
    }
    // Preserve resolution and quality when already inside the hard storage budget.
    if(acceptable)return acceptable;
    if(side===1)break;side=Math.max(1,Math.floor(side*0.72));
  }
  throw new Error(t('photoCompactError'));
}
export async function compactPhoto(file,id) {
  const url=URL.createObjectURL(file),image=new Image();
  try {
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error(t('unsupportedPhoto')));image.src=url;});
    const display=await fit(image,mediaConfig.maxSide,mediaConfig.targetBytes,mediaConfig.maxBytes);
    const thumbnail=await fit(image,mediaConfig.thumbnailSide,mediaConfig.thumbnailTargetBytes,mediaConfig.thumbnailMaxBytes);
    return {id,...display,thumbnail:thumbnail.blob,sourceBytes:file.size,createdAt:Date.now()};
  } finally {URL.revokeObjectURL(url);image.src='';}
}
// Re-encode sequentially, then replace all changed copies in one atomic transaction.
// Original names/fingerprints, text, audio and story IDs remain untouched.
export async function compactCollection(storage){
  const snapshot=await storage.snapshot(),replacements=[];let before=0,after=0;
  for(const item of snapshot.media){
    if(item.kind==='audio')continue;
    const oldSize=item.blob.size+item.thumbnail.size;before+=oldSize;
    if(item.width<=mediaConfig.maxSide&&item.height<=mediaConfig.maxSide&&item.blob.size<=mediaConfig.maxBytes&&item.thumbnail.size<=mediaConfig.thumbnailMaxBytes){after+=oldSize;continue;}
    const compact=await compactPhoto(item.blob,item.id),newSize=compact.blob.size+compact.thumbnail.size;
    if(newSize<oldSize){replacements.push({...item,...compact,sourceBytes:item.sourceBytes,createdAt:item.createdAt});after+=newSize;}else after+=oldSize;
  }
  if(replacements.length)await storage.replacePhotoCopies(replacements);
  return {count:replacements.length,before,after};
}
