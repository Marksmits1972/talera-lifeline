// Keep the legacy memory-level value readable, but never use it as a photo's
// capture location. The existing account-local item is the unit of editing.
export function normalizeManualLocation(value,codes){
 if(value===null)return null;
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='city,countryCode'||typeof value.countryCode!=='string'||typeof value.city!=='string')throw Error('TALERA_INVALID_MANUAL_LOCATION');
 const countryCode=value.countryCode,city=value.city.trim();
 if(countryCode&&!codes.includes(countryCode)||city.length>120||/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(city))throw Error('TALERA_INVALID_MANUAL_LOCATION');
 return countryCode||city?{countryCode,city}:null;
}
export function manualLocationPatch(existing,input,codes){
 if(Object.hasOwn(input,'manualLocation'))return {manualLocation:normalizeManualLocation(input.manualLocation,codes)};
 return existing&&Object.hasOwn(existing,'manualLocation')?{manualLocation:existing.manualLocation}:{};
}
export function confirmedPhotoLocation(place,codes){
 if(!place||!['iptc-location-created','geonames-locality-v2','offline-country-v1','offline-locality-v1'].includes(place.source)||typeof place.country!=='string')return null;
 try{
  const location=normalizeManualLocation({countryCode:place.countryCode,city:place.city},codes);
  if(!location?.countryCode||(['geonames-locality-v2','offline-locality-v1'].includes(place.source)&&!location.city)||(place.source==='offline-country-v1'&&location.city)||new Intl.DisplayNames(['nl'],{type:'region',fallback:'none'}).of(location.countryCode)!==place.country)return null;
  return {...location,country:place.country,source:place.source};
 }catch(_){return null}
}
export function normalizePhotoLocation(value,codes){
 if(value===null)return null;
 if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).sort().join(',')!=='city,countryCode,mode'||!['fill','correct'].includes(value.mode))throw Error('TALERA_INVALID_PHOTO_LOCATION');
 const normalized=normalizeManualLocation({countryCode:value.countryCode,city:value.city},codes);
 if(!normalized)throw Error('TALERA_INVALID_PHOTO_LOCATION');
 return {...normalized,mode:value.mode};
}
export function selectDisplayedLocation(story,item,codes){
 const automatic=confirmedPhotoLocation(item?.capturePlace,codes);
 let manual=null;try{manual=normalizePhotoLocation(item?.manualPhotoLocation??null,codes)}catch(_){}
 if(manual&&(manual.mode==='correct'||!automatic))return {countryCode:manual.countryCode,city:manual.city,source:'manual-photo'};
 if(manual&&automatic&&(!automatic.city||automatic.source==='offline-locality-v1')&&manual.city&&(!manual.countryCode||manual.countryCode===automatic.countryCode))return {countryCode:automatic.countryCode,city:manual.city,source:'manual-photo'};
 return automatic;
}
// Legacy v3 and old draft negatives had no proof of whether GPS was read.
 // Never treat them as settled; re-read the original with the current reader.
export function completedDraftLocation(result){
 return !!result&&(result.state==='known'&&!!result.place||result.state==='unknown'&&
  Object.keys(result).sort().join(',')==='reason,state'&&['no-readable-gps','no-country','retry-exhausted'].includes(result.reason));
}
// Called only for the existing save's ordered uploads, after original metadata
// was retained/read. Explicit single correction is distinct from bulk fill.
export function applyPhotoLocationInputs(items,inputs,codes){
 if(inputs===undefined)return;
 if(!Array.isArray(inputs)||inputs.length!==items.length)throw Error('TALERA_INVALID_PHOTO_LOCATION_INPUTS');
 for(let i=0;i<items.length;i++){
  const item=items[i],input=inputs[i];
  if(input==null)continue;
  if(item.kind!=='photo'||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['automatic','manual'].includes(k)))throw Error('TALERA_INVALID_PHOTO_LOCATION_INPUT');
  if(input.automatic){
   const previous=confirmedPhotoLocation(item.capturePlace,codes),result=input.automatic,place=confirmedPhotoLocation(result.place,codes);
   const refinable=previous?.source==='offline-country-v1'&&place?.countryCode===previous.countryCode&&!item.manualPhotoLocation;
   if(result.state==='known'&&place&&(!previous||refinable)){
    item.capturePlace=place;delete item.capturePlaceChecked;
    if(result.failure==='register-unavailable')item.captureLocationFailed=result.failure;
    else if(result.localityChecked===true&&place.source==='offline-country-v1')item.captureLocalityChecked='offline-locality-world-v2';
    else if(place.source==='offline-locality-v1')delete item.captureLocalityChecked;
   }
   else if(!previous&&result.state==='unknown'&&completedDraftLocation(result)){
    if(result.reason==='retry-exhausted')item.captureLocationFailed=result.reason;
    else item.capturePlaceChecked=result.reason==='no-country'?'v5-no-country':'v4-no-readable-gps';
   }
  }
  if(Object.hasOwn(input,'manual')){
   const manual=normalizePhotoLocation(input.manual,codes);
   if(!manual)delete item.manualPhotoLocation;
   else if(manual.mode==='correct'||!confirmedPhotoLocation(item.capturePlace,codes)||(!item.capturePlace.city||item.capturePlace.source==='offline-locality-v1')&&manual.city&&(!manual.countryCode||manual.countryCode===item.capturePlace.countryCode))item.manualPhotoLocation=manual;
  }
 }
}
export function localPhotoState(item,codes){
 if(confirmedPhotoLocation(item?.capturePlace,codes))return {state:'known',place:confirmedPhotoLocation(item.capturePlace,codes),...(item.captureLocalityChecked==='offline-locality-world-v2'||item.captureLocationFailed?{localityChecked:true}:{})};
 if(item?.captureLocationFailed)return {state:'unknown',reason:item.captureLocationFailed};
 if(['v4-no-readable-gps','v5-no-country'].includes(item?.capturePlaceChecked))return {state:'unknown',reason:item.capturePlaceChecked.slice(3)};
 return {state:'pending'};
}
export function draftPhotoChanges(g){
 const filtered=Object.fromEntries((g.media||[]).filter(id=>Object.hasOwn(g.photoLocations||{},id)).map(id=>[id,g.photoLocations[id]]));
 const automatic=Object.fromEntries((g.media||[]).map(id=>[id,g.taleraLocationResults?.get(id)??g.photoLocationAutomatic?.[id]]).filter(([,v])=>completedDraftLocation(v)));
 return {...(Object.keys(filtered).length?{photoLocations:filtered}:{}),...(Object.keys(automatic).length?{photoLocationAutomatic:automatic}:{})};
}
export function moveDraftPhotoLocation(source,target,id){
 if(source===target)return;
 for(const key of ['photoLocations','photoLocationAutomatic']){
  if(Object.hasOwn(source[key]||{},id)){target[key]={...(target[key]||{}),[id]:source[key][id]};delete source[key][id]}
 }
 if(source.taleraLocationResults?.has(id)){
  if(!target.taleraLocationResults)Object.defineProperty(target,'taleraLocationResults',{configurable:true,value:new Map(Object.entries(target.photoLocationAutomatic||{}))});
  target.taleraLocationResults.set(id,source.taleraLocationResults.get(id));source.taleraLocationResults.delete(id);
 }
}
export function draftPhotoInputs(g,assets){
 return [...g.media,...(g.voice?[g.voice]:[])].map(id=>{
  const file=assets(id);if(!file||!String(file.type||'').startsWith('image/'))return null;
  const entry={};const automatic=g.taleraLocationResults?.get(id)??g.photoLocationAutomatic?.[id];
  if(completedDraftLocation(automatic))entry.automatic=automatic;
  if(Object.hasOwn(g.photoLocations||{},id))entry.manual=g.photoLocations[id];
  return Object.keys(entry).length?entry:null;
 });
}
export function localizedCountryRows(codes,locale){
 const names=new Intl.DisplayNames([locale],{type:'region',fallback:'none'});
 return codes.map(code=>({code,name:names.of(code)||code})).sort((a,b)=>a.name.localeCompare(b.name,locale,{sensitivity:'base'}));
}
export function filterCountryRows(rows,query,locale){
 const plain=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase(locale).trim();
 const q=plain(query);return rows.filter(row=>!q||plain(row.name).includes(q)||plain(row.code)===q);
}
// Mounted inside the existing editor whether or not its optional panel is open.
// All selections are draft IDs, not array positions; reordering cannot retarget.
export function mountMemoryLocationEditor({g,anchor,saveDraft,readStory,getAsset,inspect,codes}){
 // The existing editor anchor owns the lifetime; no panel, control, progress
 // indicator, or geolocation permission request is created.
 if(!anchor||anchor.dataset.taleraAutomaticLocation==='true')return;
 const doc=anchor.ownerDocument,win=doc.defaultView||window;
 const photoIds=()=>g.media.filter(id=>String(getAsset(id)?.type||'').startsWith('image/'));
 if(!photoIds().length)return;
 anchor.dataset.taleraAutomaticLocation='true';
 if(!g.taleraLocationResults)Object.defineProperty(g,'taleraLocationResults',{configurable:true,value:new Map(Object.entries(g.photoLocationAutomatic||{}))});
 const result=g.taleraLocationResults,existing=new Map();let disposed=false,running=false,wakeAgain=false,controller=null,timer=null,serial=0;
 const state=id=>{const catalog=localPhotoState(existing.get(id),codes),candidate=result.get(id);return catalog.state!=='pending'?catalog:completedDraftLocation(candidate)?candidate:catalog};
 const manual=id=>{try{return normalizePhotoLocation(Object.hasOwn(g.photoLocations||{},id)?g.photoLocations[id]:existing.get(id)?.manualPhotoLocation??null,codes)}catch(_){return null}};
 async function refreshExisting(){
  const own=++serial;if(!g.existing)return;
  let row;try{row=await readStory(g.existing)}catch(_){return}
  if(disposed||own!==serial||row?.id!==g.existing)return;
  const canonical=g.taleraSavedReceipt?.canonicalByDraft||g.canonicalByDraft||{};
  existing.clear();for(const id of photoIds()){const key=canonical[id];const item=row.items?.find(x=>x.key===key&&x.kind==='photo');if(item)existing.set(id,item)}
 }
 async function scan(){
  if(running||disposed||doc.hidden||g.taleraLocationPublishing)return;
  running=true;controller=new AbortController();const signal=controller.signal;
  try{
   await refreshExisting();if(signal.aborted||disposed||!anchor.isConnected)return;
   const canonical=g.taleraSavedReceipt?.canonicalByDraft||g.canonicalByDraft||{};
   for(const localOnly of [true,false])for(const id of photoIds()){
    if(signal.aborted||disposed||!anchor.isConnected||g.taleraLocationPublishing)return;
    if(manual(id)||canonical[id])continue;
    const current=state(id),refine=!localOnly&&!canonical[id]&&!manual(id)&&current.place?.source==='offline-country-v1'&&!current.localityChecked;
    if(!refine&&(current.state!=='pending'||canonical[id]&&!localOnly))continue;
    const original=getAsset(id);if(!original)continue;
    let value;try{value=await inspect(original,'photo',signal,localOnly)}catch(_){value={state:'pending'}}
    if(signal.aborted||disposed||!anchor.isConnected||g.taleraLocationPublishing)return;
    if(!photoIds().includes(id)||getAsset(id)!==original)continue;
    if(completedDraftLocation(value)){result.set(id,value);saveDraft()}
   }
  }finally{
   controller=null;running=false;
   if(wakeAgain){wakeAgain=false;wake()}
   else if(!disposed&&!doc.hidden&&!g.taleraLocationPublishing&&photoIds().some(id=>{
    if((g.taleraSavedReceipt?.canonicalByDraft||g.canonicalByDraft||{})[id]||manual(id))return false;
    const current=state(id);
    // Offline country-only results wait for the actual online event. Local
    // metadata reads may retry independently of connectivity.
    return current.state==='pending'||win.navigator.onLine!==false&&current.place?.source==='offline-country-v1'&&!current.localityChecked;
   }))timer=win.setTimeout(scan,300000);
  }
 }
 // An online/visible event can arrive while the previous pass is unwinding.
 // Coalesce it into ONE follow-up, rather than losing it until the retry timer.
 function wake(){if(timer!==null){win.clearTimeout(timer);timer=null}if(!disposed&&!doc.hidden&&!g.taleraLocationPublishing){if(running)wakeAgain=true;else void scan()}}
 function stop(){wakeAgain=false;controller?.abort();if(timer!==null){win.clearTimeout(timer);timer=null}}
 const changed=()=>{if(anchor.isConnected)void refreshExisting();else dispose()};
 const visibility=()=>{if(doc.hidden)stop();else wake()};
 const dispose=()=>{if(disposed)return;disposed=true;stop();observer.disconnect();win.removeEventListener('talera-capture-place-updated',changed);win.removeEventListener('online',wake);win.removeEventListener('pageshow',wake);win.removeEventListener('pagehide',stop);win.removeEventListener('beforeunload',stop);doc.removeEventListener('visibilitychange',visibility)};
 const observer=new MutationObserver(()=>{if(!anchor.isConnected)dispose()});observer.observe(doc.getElementById('main')||anchor.parentElement,{childList:true,subtree:true});
 win.addEventListener('talera-capture-place-updated',changed);win.addEventListener('online',wake);win.addEventListener('pageshow',wake);win.addEventListener('pagehide',stop);win.addEventListener('beforeunload',stop);doc.addEventListener('visibilitychange',visibility);
 Object.defineProperty(g,'taleraLocationStop',{configurable:true,value:stop});Object.defineProperty(g,'taleraLocationWake',{configurable:true,value:wake});
 wake();return anchor;
}

// This is an explicit user-confirmed fallback, never a photo-source inference.
// Native iOS file-picker results do not reliably prove which option was used.
// A fresh, adequately accurate fix may be used only for the exact confirmed photo.
export async function requestConfirmedPhotoPlace({geolocation,lookup,signal,now=Date.now}){
 const stopped=()=>signal?.aborted;
 if(stopped())return {status:'aborted'};
 if(typeof geolocation?.getCurrentPosition!=='function'||typeof lookup!=='function')return {status:'unavailable'};
 const start=now();
 const fix=await new Promise(resolve=>{
  let finished=false,timer;
  const finish=value=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);resolve(value)};
  const abort=()=>finish({status:'aborted'});
  signal?.addEventListener('abort',abort,{once:true});
  if(stopped()){abort();return}
  timer=setTimeout(()=>finish({status:'unavailable'}),20000);
  try{
   geolocation.getCurrentPosition(position=>{
    const c=position?.coords,at=position?.timestamp,time=now();
    if(!c||![c.latitude,c.longitude,c.accuracy,at].every(Number.isFinite)||
      Math.abs(c.latitude)>90||Math.abs(c.longitude)>180||c.accuracy<0||c.accuracy>250||
      at<start-1000||at>time+1000||time-at>10000){finish({status:'unavailable'});return}
    finish({status:'fix',latitude:c.latitude,longitude:c.longitude});
   },error=>finish({status:error?.code===1?'denied':'unavailable'}),
   {enableHighAccuracy:true,maximumAge:0,timeout:12000});
  }catch(_){finish({status:'unavailable'})}
 });
 if(stopped())return {status:'aborted'};
 if(fix.status!=='fix')return fix;
 let result;try{result=await lookup({latitude:fix.latitude,longitude:fix.longitude},signal)}catch(_){return {status:stopped()?'aborted':'unavailable'}}
 if(stopped())return {status:'aborted'};
 return result?.ok?(result.place?{status:'known',place:result.place}:{status:'no-place'}):{status:'unavailable'};
}
