class TaleraSamples extends AudioWorkletProcessor{
  constructor(){super();this.chunks=[];this.length=0;this.quiet=0;this.voiced=0;this.paused=false;this.port.onmessage=event=>{if(event.data==='flush'||event.data==='pause')this.flush();if(event.data==='pause')this.paused=true;if(event.data==='resume')this.paused=false;};}
  flush(){if(!this.length)return;const samples=new Float32Array(this.length);let at=0;for(const chunk of this.chunks){samples.set(chunk,at);at+=chunk.length;}this.port.postMessage({samples,rate:sampleRate},[samples.buffer]);this.chunks=[];this.length=0;this.quiet=0;this.voiced=0;}
  process(inputs){const input=inputs[0]?.[0];if(input&&!this.paused){let power=0;for(const value of input)power+=value*value;const speaking=Math.sqrt(power/input.length)>=.003;if(!this.length&&!speaking)return true;this.chunks.push(input.slice());this.length+=input.length;if(speaking){this.voiced+=input.length;this.quiet=0;}else this.quiet+=input.length;
    // Prefer natural pauses, not a hard cut through every six-second sentence.
    if(this.length>=sampleRate*20||this.voiced>=sampleRate*1.5&&this.quiet>=sampleRate*.75)this.flush();}return true;}
}
registerProcessor('talera-samples',TaleraSamples);
