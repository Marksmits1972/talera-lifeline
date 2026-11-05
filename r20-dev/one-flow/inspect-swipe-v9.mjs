// READ-ONLY performance/swipe audit of approved TALERA V9 /present.
const url='https://talera-v9-stille-luxe-stijlstaging-20261104.mark-a39.workers.dev/present';
const response=await fetch(url);
if(!response.ok)throw Error('Approved V9 not reachable: '+response.status);
const html=await response.text();
console.log('V9_SOURCE_BYTES',html.length);
const needles=[
 'function taleraInlineSetFrame(s,index){',
 'function taleraInlineDispose(){',
 'function taleraInlinePlayMedia(s,frame,muted,finished){',
 'async function present(memory){',
 'function taleraInlineStart',
 'function taleraInlineInstallAudioControls',
 'function taleraInlineVoiceEnded',
 'function taleraInlineReplayNext',
 'function taleraInlineOn',
 'talera-v61-narration-visual',
 'photoStage','memoryStoryScroll',
 'swipe','touch-action','touchmove','touchstart','touchend',
 'pointermove','pointerdown','pointerup',
 'passive:false','preventDefault()',
 'MutationObserver','requestAnimationFrame'
];
for(const needle of needles){
 const matches=[];let i=html.indexOf(needle);
 while(i!==-1&&matches.length<20){matches.push(i);i=html.indexOf(needle,i+needle.length)}
 console.log('SEARCH',JSON.stringify(needle),'COUNT_FIRST_20',matches.length,'POSITIONS',matches);
 if(needle.startsWith('function taleraInline')||needle.startsWith('async function present')){
   const pos=matches[0];if(pos!==undefined)console.log('FUNCTION_EXCERPT',needle,JSON.stringify(html.slice(pos,Math.min(html.length,pos+(needle==='async function present(memory){'?9500:5500)))));
 }else if(['swipe','touchmove','touchstart','touchend','pointermove','pointerdown','pointerup','passive:false','MutationObserver','talera-v61-narration-visual'].includes(needle)){
   for(const p of matches.slice(0,10))console.log('EXCERPT',needle,p,JSON.stringify(html.slice(Math.max(0,p-360),Math.min(html.length,p+560))));
 }
}

for(const needle of ['async function hydrate(', 'function hydrate(', 'function toMemory(', 'function disposePresentation(', 'window.__taleraV31SelectPhoto=', 'const hydrate=', 'const toMemory=', "s.warmImages=frames.map(frame=>{"]){
 const p=html.indexOf(needle);
 console.log('FOCUSED',needle,p, p<0?'':JSON.stringify(html.slice(p,Math.min(html.length,p+6100))));
}

// Only read, never change the approved V9 script: map audio intent, taps, and swipe dispatch.
for(const needle of ["talera:enable-listening","__taleraInlineTryAutoPlay","function showPhoto(","function toMemory(","function taleraInlineSetFrame(","function taleraInlineSync(","function taleraInlineLoadVideo("]){
  let p=html.indexOf(needle),n=0;
  while(p>=0&&n<12){
    console.log('GESTURE_LINK',needle,'MATCH',n,'AT',p,
       JSON.stringify(html.slice(Math.max(0,p-1100),Math.min(html.length,p+1800))));
    p=html.indexOf(needle,p+needle.length);n++;
  }
}
