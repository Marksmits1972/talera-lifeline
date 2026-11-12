// Read-only V9 source inspection; print only existing native playback functions.
const url='https://talera-v9-stille-luxe-stijlstaging-20261104.mark-a39.workers.dev/present';
const res=await fetch(url);if(!res.ok)throw Error('Approved V9 unavailable: '+res.status);
const html=await res.text();
for(const [name,start,end] of [
  ['nativePlayMedia','function taleraInlinePlayMedia(s,frame,muted,finished){','function taleraInlineReplayNext(s){'],
  ['nativeReplay','function taleraInlineReplayNext(s){','function taleraInlineOrdinaryStep(s,index){'],
  ['nativeControls','function taleraInlineInstallAudioControls(){','async function present(memory){'],
]) {
 const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
 if(a<0||b<0)throw Error('Cannot inspect '+name);
 console.log('FUNCTION',name, 'LENGTH',b-a);
 console.log(html.slice(a,Math.min(b,a+20000)));
}
for(const anchor of ['Beluister','beluister','talera-v61-listening-enabled','__taleraAudioControls']){
 let pos=html.indexOf(anchor),n=0;while(pos>=0&&n<7){console.log('AUDIO_ANCHOR',anchor,JSON.stringify(html.slice(Math.max(0,pos-650),pos+650)));pos=html.indexOf(anchor,pos+anchor.length);n++}
}
