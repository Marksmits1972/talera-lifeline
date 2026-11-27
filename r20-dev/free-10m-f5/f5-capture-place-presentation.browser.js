// Passive presentation decoration: the current decoded image remains the
// authority; never modify a playback clock, cue, media index or storage.
function mountTaleraCapturePlace(flagPositions,countryCodes=Object.keys(flagPositions)){
 const title=document.getElementById('memoryStory'),caption=document.getElementById('memoryCaption');
 const stage=document.getElementById('photoStage'),runtime=window.__taleraTimelineRuntime;
 const library=window.TaleraLibrary;
 if(!title||!caption||!stage||
    document.getElementById('talera-capture-place'))return;
 const row=document.createElement('div');row.id='talera-capture-place';row.hidden=true;row.dataset.taleraExplicitLanguage='';
 const flag=document.createElement('span');flag.className='talera-capture-flag';flag.setAttribute('aria-hidden','true');
 const label=document.createElement('span');label.className='talera-capture-label';
 row.append(flag,label);title.after(row);
 let active='',serial=0,queued=false;
 const cache=new Map();
 const hidden=()=>{row.hidden=true;row.removeAttribute('data-location-diagnosis');label.textContent='';flag.hidden=false;flag.style.removeProperty('background-position')};
 const visibleImage=(image,urls)=>image&&!image.closest('[hidden]')&&
  image.complete&&image.naturalWidth>0&&image.getClientRects().length>0&&
  getComputedStyle(image).visibility!=='hidden'&&
  urls.some(url=>url&&(image.src===url||image.currentSrc===url));
 function selected(){
  if(!runtime?.currentMemory)return {guard:'presentatie-niet-actief',identity:'guard:runtime'};
  const memory=runtime.currentMemory();
  if(!memory?._taleraLocal||!memory.storyId||memory._photoLoading||
    runtime.isMoving?.()||window.__taleraBandRolling||
    document.hidden||document.documentElement.classList.contains('talera-direct-memory-entering')||
    caption.classList.contains('talera-v21-title-tracking')||
    document.body.classList.contains('talera-v18-reading'))return null;
  const frames=memory._zeroFrames;if(!Array.isArray(frames)||!frames.length)return {guard:'foto-niet-gekoppeld',identity:'guard:frames'};
  const voiced=memory._zeroItems?.some(item=>item.kind==='audio');
  let index=Number(memory._photoIndex)||0;
  if(voiced){
   if(!document.body.classList.contains('talera-v61-narration-visual'))return null;
   const dots=Array.from(document.querySelectorAll('.talera-photo-dot'));
   if(frames.length===1)index=0;
   else{
    if(dots.length!==frames.length)return null;
    const activeDots=dots.map((dot,i)=>dot.classList.contains('active')?i:-1).filter(i=>i>=0);
    if(activeDots.length!==1)return null;
    index=activeDots[0];
   }
  }
  const frame=frames[index];
  if(frame?.kind!=='photo'||typeof frame.key!=='string')return null;
  const urls=[frame.url,memory.photos?.[index]].filter(x=>typeof x==='string');
  const images=voiced?stage.querySelectorAll('.talera-independent-narrator-photo'):
   stage.querySelectorAll('.talera-story-synced-sharp,.photo-layer.is-front .example-photo');
  const guard=Array.from(images).some(image=>visibleImage(image,urls))?null:'foto-niet-zichtbaar';
  return {storyId:memory.storyId,key:frame.key,guard,identity:JSON.stringify([memory.storyId,frame.key,guard])};
 }
 function valid(place){
  if(!place||!['iptc-location-created','geonames-locality-v2','offline-country-v1','offline-locality-v1'].includes(place.source)||!Object.hasOwn(flagPositions,place.countryCode))return null;
  const safe=x=>typeof x==='string'&&x.length>0&&x.length<=120&&
   !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(x);
  if((place.city!==''&&!safe(place.city))||(['geonames-locality-v2','offline-locality-v1'].includes(place.source)&&!place.city)||!safe(place.country))return null;
  try{
   const country=new Intl.DisplayNames(['nl'],{type:'region',fallback:'none'}).of(place.countryCode);
   if(country!==place.country)return null;
  }catch(_){return null}
  return place;
 }
 async function lookup(selection){
  if(!library?.readStory)return {code:'bibliotheek-niet-actief'};
  const story=await library.readStory(selection.storyId);
  const item=story?.items?.find(x=>x.key===selection.key&&x.kind==='photo');
  if(!item)return {code:'catalogus-item-ontbreekt'};
  // The catalog is the only authority. Even older original files must be
  // enriched by the library, never inspected for location by presentation.
  const selected=selectDisplayedLocation(story,item,countryCodes);
  const place=selected?.source==='manual-photo'?selected:valid(selected);
  if(place)return {place};
  return {code:'plaats-onbekend'};
 }
 function refresh(){
  queued=false;const current=selected();
  const next=current?.identity||'';
  if(active===next)return;
  active=next;const own=++serial;hidden();
  if(!current)return;
  if(current.guard)return;
  let work=cache.get(next);
  if(!work){
   work=lookup(current).catch(()=>({code:'catalogus-leesfout'}));cache.set(next,work);
   if(cache.size>64)cache.delete(cache.keys().next().value);
  }
  void work.then(result=>{
   if(own!==serial||selected()?.identity!==next)return;
   if(current.guard||!result.place)return;
   const place=result.place;
   const xy=flagPositions[place.countryCode];
   flag.hidden=!xy;if(xy)flag.style.backgroundPosition=xy[0]+'px '+xy[1]+'px';
   const locale=window.TaleraI18n?.locale||document.documentElement.lang||'en';
   let localizedCountry=place.country||place.countryCode||'';if(place.countryCode)try{localizedCountry=new Intl.DisplayNames([locale],{type:'region',fallback:'none'}).of(place.countryCode)||localizedCountry}catch{}
   const locationLabel=place.source==='geonames-locality-v2'
    ?window.TaleraI18n.t('core.present.captureNear',{city:place.city}):place.source==='offline-locality-v1'?window.TaleraI18n.t('core.present.captureOfflineNear',{city:place.city}):place.city;
   label.textContent=[localizedCountry,locationLabel].filter(Boolean).join(' · ');row.hidden=false;
  });
 }
 function schedule(){if(!queued){queued=true;queueMicrotask(refresh)}}
 const observer=new MutationObserver(schedule);
 observer.observe(stage,{subtree:true,childList:true,attributes:true,attributeFilter:['src','class','hidden']});
 observer.observe(caption,{attributes:true,attributeFilter:['class']});
 observer.observe(title,{subtree:true,childList:true,characterData:true});
 observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
 observer.observe(document.body,{attributes:true,attributeFilter:['class']});
 // Dots are outside the stage in some approved layouts.
 const dots=document.querySelector('.talera-photo-dot')?.parentElement;
 if(dots)observer.observe(dots,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 stage.addEventListener('load',schedule,true);stage.addEventListener('error',schedule,true);
 runtime?.subscribe?.(schedule);
 // The independent library may finish while this same photo is on screen.
 // Drop stale negative reads as well as resolved cache entries. No GPS/API call
 // or playback changes here; only a new read of the existing catalog.
 function catalogChanged(){cache.clear();active=null;serial++;schedule()}
 window.addEventListener('talera-capture-place-updated',catalogChanged);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)catalogChanged();else schedule()});
 window.addEventListener('pageshow',catalogChanged);
 document.addEventListener('talera:languagechange',catalogChanged);
 schedule();
}
