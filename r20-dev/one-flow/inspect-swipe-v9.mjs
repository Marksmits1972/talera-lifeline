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

for(const needle of ["function taleraInlineInstallAudioControls()","const retry=e=>","Beluister","beluister","controls.enable()","__taleraAudioControls.enable","__taleraAudioControls?.enable","__taleraInlineTryAutoPlay","talera:enable-listening","storySurface.addEventListener('click'"]){
 let p=0,n=0;
 while((p=html.indexOf(needle,p))>=0&&n<15){
    console.log('INTERACTION_DETAIL',needle,n,p,JSON.stringify(html.slice(Math.max(0,p-(needle==='const retry=e=>'?1200:450)),Math.min(html.length,p+(needle==='function taleraInlineInstallAudioControls()'?5500:1000)))));
    p+=needle.length;n++;
 }
}

const v13Start=html.indexOf("/* TALERA V13: V3 continuous wheel is sole owner of photo gestures and position. */");
const v13End=html.indexOf("</script>",v13Start);
console.log("V13_FULL",v13Start,v13End,JSON.stringify(html.slice(v13Start,v13End)));
const v3=html.indexOf("__taleraPhotoBook=");
console.log("V3_BOOK",v3,JSON.stringify(html.slice(Math.max(0,v3-3500),v3+10000)));

for(const needle of ['talera:enable-listening','__taleraAudioControls','Beluister','beluister','Luisteren','luisteren','audioEnabled','setUi()','consent.addEventListener','talera-v61-listening-pref']){
 let at=0,count=0;
 while((at=html.indexOf(needle,at))>=0){
  if(count<12)console.log('LISTEN_CONTROL',needle,at,JSON.stringify(html.slice(Math.max(0,at-1400),Math.min(html.length,at+2200))));
  count++;at+=needle.length;
 }
 console.log('LISTEN_COUNTS',needle,count);
}

for(const needle of ["phone-v1","videoPoster","captureVideo","currentTime=0","captureStream","drawImage(video","video.currentTime","store.blob(item.key+':phone-v1')"]){
 let i=0,n=0;
 while((i=html.indexOf(needle,i))>=0&&n<20){
  console.log('VIDEO_POSTER_AUDIT',needle,n,i,JSON.stringify(html.slice(Math.max(0,i-2200),Math.min(html.length,i+2400))));
  n++;i+=needle.length;
 }
}

for(const needle of ["showPhoto(","__taleraV31SelectPhoto(","addEventListener('touchend'","addEventListener('touchstart'","addEventListener('pointerup'","_photoIndex++","_photoIndex + 1","_photoIndex+1","function onStory","function setupPhoto","function photoTouch","talera:wheel-motion"]){
 let at=0,n=0;
 while((at=html.indexOf(needle,at))>=0&&n<45){
  if(needle==="showPhoto("||needle==="__taleraV31SelectPhoto("||needle.includes("touch")||needle.includes("pointer"))
    console.log("NARRATED_GESTURE_AUDIT",needle,n,at,JSON.stringify(html.slice(Math.max(0,at-1750),Math.min(html.length,at+2500))));
  n++;at+=needle.length;
 }
 console.log("NARRATED_GESTURE_TOTAL",needle,n);
}
