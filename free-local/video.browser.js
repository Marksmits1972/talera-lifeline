import {mediaTimeout} from './media.browser.js';
// The selected phone file is read only. A local copy and JPEG poster are stored.
export async function prepareVideo(file,id){
  const url=URL.createObjectURL(file),video=document.createElement('video');video.preload='auto';video.muted=true;video.playsInline=true;
  // iOS can leave a detached preload waiting forever; keep the decoder in the document.
  video.setAttribute('playsinline','');video.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:0;top:0';document.body.append(video);
  try{
    await new Promise((resolve,reject)=>{
      let settled=false;const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);video.onloadedmetadata=video.onloadeddata=video.oncanplay=video.onseeked=video.onerror=null;error?reject(error):resolve();};
      const frame=()=>{if(video.readyState>=2&&video.videoWidth&&video.videoHeight)finish();};
      const timer=setTimeout(()=>finish(new Error('Deze video kon niet worden geopend. Probeer hem opnieuw te kiezen.')),15000);
      video.onloadeddata=video.oncanplay=video.onseeked=frame;
      video.onloadedmetadata=()=>{if(video.readyState>=2)frame();else{try{video.currentTime=Math.min(.01,Number.isFinite(video.duration)?video.duration/2:.01);}catch{}}};
      video.onerror=()=>finish(new Error('Deze video wordt op dit toestel niet ondersteund.'));
      video.src=url;video.load();frame();
    });
    const canvas=document.createElement('canvas'),scale=Math.min(1,640/Math.max(video.videoWidth,video.videoHeight));canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
    const thumbnail=await mediaTimeout(new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.7)),'Het videobeeld kon niet worden gemaakt.',10000);if(!thumbnail?.size)throw new Error('Geen videobeeld beschikbaar.');
    return {id,kind:'video',blob:file.slice(0,file.size,file.type||'video/mp4'),thumbnail,width:video.videoWidth,height:video.videoHeight,duration:Number.isFinite(video.duration)?video.duration:0,sourceBytes:file.size,createdAt:Date.now()};
  }finally{video.pause();video.removeAttribute('src');video.load();video.remove();URL.revokeObjectURL(url);}
}
// Suspend narrative at exactly its current position; resume only when still wanted.
export function videoNarration(video,narration,wanted=()=>true){
  let resume=false;const start=()=>{resume=resume||Boolean(narration&&!narration.paused);narration?.pause();};
  const end=()=>{if(resume&&wanted())narration?.play().catch(()=>{});resume=false;};
  const guard=()=>{if(!video.paused&&!video.ended){resume=true;narration.pause();}};narration?.addEventListener?.('play',guard);
  video.addEventListener('play',start);video.addEventListener('ended',end);
  return {start,end,cancel:()=>{resume=false;video.pause();},release:()=>{video.pause();end();video.removeEventListener('play',start);video.removeEventListener('ended',end);narration?.removeEventListener?.('play',guard);}};
}
