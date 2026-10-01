import {t} from './copy.browser.js';
export function createRecorder({save,onState=()=>{},onLevel=()=>{},onError=()=>{}}){
  let recorder,stream,chunks=[],pending=Promise.resolve(),phase='idle',started=0,elapsed=0,id,context,analyser,frame,interrupted=false,failure=null,bytes=0,cancelled=false;
  const state=value=>{phase=value;onState(value);};
  const duration=()=>elapsed+(phase==='recording'?performance.now()-started:0);
  function release(){cancelAnimationFrame(frame);context?.close().catch(()=>{});context=null;stream?.getTracks().forEach(track=>track.stop());stream=null;onLevel(0);}
  function checkpoint(final=false){
    if(!bytes)return pending;
    const blob=new Blob(chunks,{type:recorder.mimeType||chunks[0]?.type||'audio/mp4'});
    const audio={id,kind:'audio',blob,mime:blob.type,duration:duration()/1000,incomplete:!final||interrupted,createdAt:Date.now()};
    pending=pending.then(()=>save(audio)).catch(error=>{failure=error;onError(error);stop(true);});return pending;
  }
  async function start(){
    if(!['idle','saved','error'].includes(phase))return;
    if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder)throw new Error(t('audioUnsupported'));
    cancelled=false;state('permission');
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if(cancelled){release();state('idle');return;}
      const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(value=>MediaRecorder.isTypeSupported(value));
      recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);chunks=[];bytes=0;elapsed=0;interrupted=false;failure=null;pending=Promise.resolve();id=crypto.randomUUID();
      recorder.ondataavailable=event=>{if(event.data.size){chunks.push(event.data);bytes+=event.data.size;checkpoint();if(bytes>64*1024*1024)stop(true);}};
      recorder.onerror=event=>{failure=event.error||new Error(t('audioFailed'));onError(failure);stop(true);};
      recorder.onstop=async()=>{release();await checkpoint(true);if(!bytes){state('error');onError(new Error(t('audioEmpty')));}else state(failure?'error':'saved');};
      stream.getAudioTracks().forEach(track=>{track.onended=()=>stop(true);track.onmute=()=>stop(true);});
      recorder.start(5000);started=performance.now();state('recording');
      try{const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;context=new AudioContext();analyser=context.createAnalyser();analyser.fftSize=256;context.createMediaStreamSource(stream).connect(analyser);const buffer=new Uint8Array(analyser.fftSize);const meter=()=>{if(!context)return;analyser.getByteTimeDomainData(buffer);const level=Math.sqrt(buffer.reduce((n,v)=>n+(v-128)**2,0)/buffer.length)/128;onLevel(phase==='recording'?level:0);frame=requestAnimationFrame(meter);};meter();}catch{}
    }catch(error){release();state('error');throw new Error(t(error.name==='NotAllowedError'?'audioDenied':error.name==='NotFoundError'?'audioMissing':'audioFailed'));}
  }
  function pause(){if(phase!=='recording'||typeof recorder.pause!=='function')return;elapsed+=performance.now()-started;recorder.pause();recorder.requestData();state('paused');}
  function resume(){if(phase!=='paused')return;recorder.resume();started=performance.now();state('recording');}
  function stop(wasInterrupted=false){if(phase==='permission'){cancelled=true;return;}if(!['recording','paused'].includes(phase))return;interrupted=wasInterrupted;if(phase==='recording')elapsed+=performance.now()-started;state('saving');if(recorder.state!=='inactive')recorder.stop();}
  return {start,pause,resume,stop,phase:()=>phase,busy:()=>!['idle','saved','error'].includes(phase)};
}
