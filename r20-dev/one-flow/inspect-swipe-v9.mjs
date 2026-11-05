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
