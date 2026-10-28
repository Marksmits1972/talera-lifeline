
/* Microphone monitor is READ-ONLY: not connected to speakers or MediaRecorder.
   No new recorder and no changes to cue timing. */
let taleraV7AudioContext=null,taleraV7Source=null,taleraV7Analyser=null,taleraV7Frame=0,taleraV7Smooth=0;
function taleraV7EnsureEmpty(){
 const view=$('view');
 let wrap=$('taleraV7Empty');
 if(!wrap){
  wrap=document.createElement('div');wrap.id='taleraV7Empty';
  wrap.innerHTML='<p class="talera-v7-empty-title">Jouw verhaal</p>'+
    '<canvas id="taleraV7Wave" width="480" height="110" role="img" aria-label="Geluidsgolf tijdens opnemen"></canvas>'+
    '<p class="talera-v7-empty-hint">Een herinnering begint met jouw stem</p>';
  view.insertBefore(wrap,$('count'));
 }
 const visible=!state.items.length&&!document.body.classList.contains('present');
 wrap.hidden=!visible;
 $('count').hidden=visible;
 if(visible)taleraV7DrawWave();
}
function taleraV7DrawWave(){
 if(taleraV7Frame)cancelAnimationFrame(taleraV7Frame);
 const canvas=$('taleraV7Wave'); if(!canvas||state.items.length||document.body.classList.contains('present')){taleraV7Frame=0;return}
 const ctx=canvas.getContext('2d');
 if(!ctx){taleraV7Frame=0;return}
 const w=canvas.width,h=canvas.height,recording=state.mode==='recording';
 let rms=0;
 if(recording&&taleraV7Analyser){
  const data=new Uint8Array(taleraV7Analyser.fftSize);
  taleraV7Analyser.getByteTimeDomainData(data);
  let sum=0;for(let i=0;i<data.length;i++){const x=(data[i]-128)/128;sum+=x*x}
  rms=Math.sqrt(sum/data.length);
 }
 taleraV7Smooth=recording?taleraV7Smooth*.68+Math.min(.33,rms)*.32:taleraV7Smooth*.82;
 ctx.clearRect(0,0,w,h);
 const center=h/2,amp=recording?4+Math.min(43,taleraV7Smooth*190):3;
 const now=performance.now()/800;
 ctx.lineWidth=3;ctx.strokeStyle='#2b7184';ctx.lineCap='round';ctx.lineJoin='round';
 ctx.beginPath();
 for(let x=0;x<=w;x+=3){
  const edge=Math.sin(Math.PI*x/w)**1.5;
  const y=center+Math.sin(x/25-now*2)*amp*edge*Math.sin(x/44+now*.8);
  if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
 }
 ctx.stroke();
 if(recording||state.mode==='paused')taleraV7Frame=requestAnimationFrame(taleraV7DrawWave);
 else taleraV7Frame=0;
}
function taleraV7AttachMic(stream){
 if(!stream||state.items.length)return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return;
  taleraV7AudioContext=new Audio();
  taleraV7AudioContext.resume?.().catch(()=>{});
  taleraV7Source=taleraV7AudioContext.createMediaStreamSource(stream);
  taleraV7Analyser=taleraV7AudioContext.createAnalyser();
  taleraV7Analyser.fftSize=512;
  taleraV7Source.connect(taleraV7Analyser);
  // Intentionally no connection to AudioContext.destination.
  taleraV7DrawWave();
 }catch(err){console.warn('TALERA microphone visualization unavailable',err)}
}
function taleraV7ReleaseMic(){
 if(taleraV7Frame)cancelAnimationFrame(taleraV7Frame);taleraV7Frame=0;
 try{taleraV7Source?.disconnect()}catch(e){}
 try{taleraV7Analyser?.disconnect()}catch(e){}
 try{taleraV7AudioContext?.close()}catch(e){}
 taleraV7Source=null;taleraV7Analyser=null;taleraV7AudioContext=null;taleraV7Smooth=0;
 if(!state.items.length)taleraV7DrawWave();
}
