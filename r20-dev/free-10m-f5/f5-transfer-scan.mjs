// In-PWA camera only. Never opens a URL or uploads camera frames.
// Decoder loaded on demand and only from this authenticated app origin.
import {readPairingPayload} from './f5-transfer-qr.mjs';
const stopTracks=stream=>{for(const track of stream?.getTracks?.()||[])track.stop()};
export function pairingScanner({video,report,onCode,translate,
 getMedia=()=>navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:720},height:{ideal:720}},audio:false}),
 decoder=()=>import('./f5-transfer-jsqr.mjs').then(m=>m.default),
 makeCanvas=()=>document.createElement('canvas'),schedule=fn=>setTimeout(fn,120),cancel=clearTimeout}){
 let epoch=0,stream=null,timer=null;
 function stop(){
  epoch++;if(timer!==null)cancel(timer);timer=null;
  stopTracks(stream);stream=null;video.pause();video.srcObject=null;video.hidden=true;
 }
 async function start(){
  stop();const run=epoch;
  try{
   // Call getUserMedia during the actual scan-button gesture.
   const request=getMedia(),load=decoder();
   void load.catch(()=>{});
   // A canceled permission dialog can resolve later: stop those tracks too.
   const local=await request;
   if(run!==epoch){stopTracks(local);void load.catch(()=>{});return}
   stream=local;
   // Capture no frames before decoder is ready; handle late cancel.
   const decode=await load;
   if(run!==epoch)return;
   if(typeof decode!=='function')throw Error('DECODER');
   video.srcObject=local;video.hidden=false;await video.play();
   if(run!==epoch)return;
   const canvas=makeCanvas(),ctx=canvas.getContext('2d',{willReadFrequently:true});
   if(!ctx)throw Error('CAMERA');
   const scan=()=>{
    if(run!==epoch)return;
    try{
     if(video.videoWidth&&video.videoHeight&&video.readyState>=2){
      const scale=Math.min(1,720/Math.max(video.videoWidth,video.videoHeight));
      canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
      ctx.drawImage(video,0,0,canvas.width,canvas.height);
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
      const found=decode(pixels.data,pixels.width,pixels.height,{inversionAttempts:'attemptBoth'});
      const code=readPairingPayload(found?.data);
      if(code){stop();onCode(code);return}
     }
     timer=schedule(scan);
    }catch{stop();report(translate('transfer.scan.readFailed'))}
   };
   report(translate('transfer.scan.aim'));scan();
  }catch{
   if(run!==epoch)return;
   stop();report(translate('transfer.scan.unavailable'));
  }
 }
 return {start,stop};
}
