class TaleraSamples extends AudioWorkletProcessor{
  constructor(){super();this.chunks=[];this.length=0;this.paused=false;this.port.onmessage=event=>{if(event.data==='flush'||event.data==='pause')this.flush();if(event.data==='pause')this.paused=true;if(event.data==='resume')this.paused=false;};}
  flush(){if(!this.length)return;const samples=new Float32Array(this.length);let at=0;for(const chunk of this.chunks){samples.set(chunk,at);at+=chunk.length;}this.port.postMessage({samples,rate:sampleRate},[samples.buffer]);this.chunks=[];this.length=0;}
  process(inputs){const input=inputs[0]?.[0];if(input&&!this.paused){this.chunks.push(input.slice());this.length+=input.length;if(this.length>=sampleRate*6)this.flush();}return true;}
}
registerProcessor('talera-samples',TaleraSamples);
