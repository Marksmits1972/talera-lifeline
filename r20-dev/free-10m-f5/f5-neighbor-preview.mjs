// F5-only presentation polish. The user-observed first transition can show
// an unhydrated local-memory placeholder before the next iPhone-owned image
// URL is ready. Preserve original RH19 timing, gestures, timeline and players.
//
// One cold-start prewarm only: immediately adjacent local memories (max TWO).
// Only decode their first PHOTO, never read/decode full video or audio.
// Native IndexedDB remains the only source of original media. No cloud calls,
// no extra copies of full video, no new store, no user-memory writes.
export function eliminateFirstSwipeBlank(html){
 if(typeof html!=='string')throw Error('TALERA_F5_PREVIEW_SOURCE_MISSING');
 const matches=[
  'function renderJourneyPreview() {',
  'setPhotoLayer(photoLayerA, memoryPhotoA, memoryBackdropA, left.image, 1-p, -7*p);',
  'setPhotoLayer(photoLayerB, memoryPhotoB, memoryBackdropB, right.image, p, 7*(1-p));',
  'const map=new Map(),loaded=new Map(),pending=new Map();',
  'runtime.subscribe(activate);',
  'runtime.registerMemories(memories);',
  'const selected=isLocalId(wanted)?map.get(\'pwa:\'+wanted):null;',
  'if(visible?._taleraLocal)await hydrate(visible);'
 ];
 for(const text of matches){
  const count=html.split(text).length-1;
  if(count!==1)throw Error('TALERA_F5_PREVIEW_REFERENCE_CHANGED:'+count+':'+text);
 }
 // During an as-yet unread private memory, show a STILL-READY neighboring
 // image rather than fading in the blank default placeholder. Keep EXACT
 // original transforms and opacity curves, no new animation logic.
 const oldA=matches[1],oldB=matches[2];
 html=html.replace(oldA,
  'setPhotoLayer(photoLayerA, memoryPhotoA, memoryBackdropA, '+
  '(left._taleraLocal&&left._photoLoading?'+
  '(runtime.currentMemory()?._photoLoading?right.image:runtime.currentMemory()?.image||right.image):left.image), 1-p, -7*p);');
 html=html.replace(oldB,
  'setPhotoLayer(photoLayerB, memoryPhotoB, memoryBackdropB, '+
  '(right._taleraLocal&&right._photoLoading?'+
  '(runtime.currentMemory()?._photoLoading?left.image:runtime.currentMemory()?.image||left.image):right.image), p, 7*(1-p));');

 const bootMarker=matches[3];
 const prewarm=`
 let f5ColdAdjacentStarted=false;
 async function f5PrewarmFirstAdjacent(memory){
   if(f5ColdAdjacentStarted||!memory?._taleraLocal)return;
   // Strictly one cold-start task per page, only one local story on either
   // side. Do not warm the entire account's media library on 10M Free scale.
   f5ColdAdjacentStarted=true;
   const sorted=[...map.values()].sort((a,b)=>a.ms-b.ms);
   const i=sorted.findIndex(x=>x.id===memory.id);
   if(i<0)return;
   const nearby=[sorted[i-1],sorted[i+1]].filter(Boolean);
   await Promise.all(nearby.map(async next=>{
     try{
       await hydrate(next);
       const first=next.photos?.[0];
       if(typeof first!=='string'||!first.startsWith('blob:'))return;
       const picture=new Image();
       picture.decoding='async';
       picture.src=first;
       if(typeof picture.decode==='function')await picture.decode();
     }catch(err){
       // Optional speed optimization only. Retain the original safe,
       // lazy hydration if a media file cannot be decoded in advance.
     }
   }));
 }
 `;
 html=html.replace(bootMarker,bootMarker+prewarm);
 // Do not interfere with normal subscription/activation; prewarm only once
 // the initial private story and its first image are already available.
 html=html.replace(matches[4],
  'runtime.subscribe(activate);');
 html=html.replace('    activate(selected);',
  '    activate(selected);\n    void f5PrewarmFirstAdjacent(selected);');
 html=html.replace(matches[7],
  'if(visible?._taleraLocal){await hydrate(visible);void f5PrewarmFirstAdjacent(visible)}');
 // R20's one-photo CSS intentionally hides its ordinary photo-strip while a
 // narrated story rests. However V3's EXISTING 11-page continuous photo band
 // is the sole gesture owner during a swipe. Its dynamic .is-visible class
 // MUST override that resting-mode hide, otherwise the belt stays invisible
 // until narration mode switches off and the next photo snaps into place.
 // Do not change the narration engine, the two RH19 layers or any timings.
 const ownerId='id="talera-v61-r12-one-photo-owner"';
 if(html.split(ownerId).length!==2)
   throw Error('TALERA_F5_APPROVED_ONE_PHOTO_OWNER_NOT_FOUND');
 if(!html.includes('talera-photo-strip talera-wheel-strip')||
    !html.includes("belt.classList.add('is-visible')")||
    !html.includes("belt.classList.remove('is-visible')"))
   throw Error('TALERA_F5_ORIGINAL_V3_BAND_NOT_FOUND');
 if(!html.includes('</head>'))throw Error('TALERA_F5_PRESENTATION_HEAD_NOT_FOUND');
 const gestureStyle='<style id="talera-f5-narrated-swipe-band">'+
  'body.talera-v61-narration-visual #photoStage .talera-photo-strip.talera-wheel-strip.is-visible'+
  '{display:block!important;visibility:visible!important;opacity:1!important}'+
  '</style>';
 html=html.replace('</head>',gestureStyle+'</head>');
 if(!html.includes('void f5PrewarmFirstAdjacent(selected);')||
  !html.includes('void f5PrewarmFirstAdjacent(visible)'))
  throw Error('TALERA_F5_PREVIEW_COLD_START_INCOMPLETE');
 return html;
}
