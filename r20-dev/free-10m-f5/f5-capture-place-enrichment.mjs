// Optional local catalog enrichment. No GPS persistence, no new store and no media uploads.
// The caller supplies the existing account-local library and its transaction owner.
// Recheck only previously unresolved HEIF originals once after the parser fix.
const checkedVersion=item=>/^image\/(?:heic|heif|heic-sequence|heif-sequence)$/i.test(item?.mime||'')||/\.(?:heic|heif)$/i.test(item?.name||'')?'v2':'v1';
export async function enrichCapturePlaces({list,blob,readPlace,readGps,lookup,commit,available,canLookup=available,deferred=new Set(),unreadable=new Set(),limit=12,diagnose=()=>{}}){
 const stories=await list();
 if(!Array.isArray(stories))return {more:false,blocked:true};
 const known=new Map();
 const keyOf=item=>JSON.stringify([item.key,item.kind,item.size,item.mime,item.name]);
 for(const story of stories)if(story?.source==='pwa-local')for(const item of story.items||[]){
  if(item.capturePlace)known.set(keyOf(item),item.capturePlace);
 }
 let count=0;
 for(const initial of stories){
  if(initial?.source!=='pwa-local'||!Array.isArray(initial.items))continue;
  let story=initial;
  for(let i=0;i<story.items.length;i++){
   const item=story.items[i];
   if(!item||!['photo','video'].includes(item.kind)||typeof item.key!=='string'||item.capturePlace||item.capturePlaceChecked===checkedVersion(item))continue;
   if(!available())return {more:true,blocked:true};
   if(unreadable.has(keyOf(item))||!canLookup()&&deferred.has(keyOf(item)))continue;
   if(count>=limit)return {more:true,blocked:false};
   count++;
   diagnose(item.key,'bestand-lezen');
   try{
    let place=known.get(keyOf(item))||null;
    if(!place){
     let original;
     try{original=await blob(item.key)}catch(error){
      // An invalid historical original is not a confirmed absence of GPS.
      // Skip only within this bounded scan, so later intact media still get a turn.
      if(error?.message!=='TALERA_LIBRARY_INVALID_SHARED_ORIGINAL')throw error;
      diagnose(item.key,'bestand-onleesbaar');unreadable.add(keyOf(item));continue;
     }
     if(!(original instanceof Blob)||!original.size||original.size!==item.size||original.type!==item.mime){
      diagnose(item.key,'bestand-afwijkend');unreadable.add(keyOf(item));continue;
     }
     if(item.kind==='photo')place=await readPlace(original);
     if(!place){
      // Offline or before provider configuration, only explicit metadata
      // is needed. Do not scan GPS or persist negative results yet.
      if(!canLookup()){diagnose(item.key,'wacht-internet-of-configuratie');deferred.add(keyOf(item));continue}
      const gps=await readGps(original);
      diagnose(item.key,gps?'gps-gevonden':'gps-niet-herkend');
      if(gps){
       if(!available())return {more:true,blocked:true};
       // A stored original can be inspected locally without internet. Do not
       // mark unresolved GPS as checked or delay other local metadata.
       if(!canLookup()){deferred.add(keyOf(item));continue}
       diagnose(item.key,'geonames-aanvraag');
       const result=await lookup(gps);
       diagnose(item.key,result?.ok?(result.place?'geonames-plaats':'geonames-geen-plaats'):(result?.diagnostic||'geonames-fout'));
       if(!result?.ok)return {more:true,blocked:true,retryAfterMs:result?.retryAfterMs===3600000?3600000:60000};
       place=result.place;
      }
     }
    }
    if(!available())return {more:true,blocked:true};
    // commit must compare the full snapshot and never recreate a deleted story.
    const updated=await commit(story,i,place);
    if(!updated){diagnose(item.key,'catalogus-conflict');break}
    story=updated;
    if(place){known.set(keyOf(item),place);diagnose(item.key,'plaats-opgeslagen')}
   }catch(_){diagnose(item.key,'verwerking-fout'); /* optional: never block normal save, read, playback or backup */ }
  }
 }
 return {more:false,blocked:false};
}
export function mountCapturePlaceEnrichment({store,open,done,dbName,readPlace,readGps,enabled}){
 if(!/^talera-free-local-[a-f0-9]{32}-v1$/.test(dbName)||!['/mijn-leven','/meldingen','/present','/tell'].includes(location.pathname)||window.top!==window)return;
 const scope=dbName.slice('talera-free-local-'.length,-3);
 let running=false,timer=null,departing=false,pendingDelay=null,blockedUntil=0;
 const available=()=>!departing&&!document.hidden;
 const canLookup=()=>enabled&&available()&&navigator.onLine!==false;
 const deferred=new Set(),unreadable=new Set();
 // TEMPORARY location diagnosis: in-memory codes only; no logs or persistent fields.
 const states=new Map(),probes=new Map();let diagnosticLookupUsed=false;
 const diagnose=(key,code)=>{if(states.get(key)===code)return;states.set(key,code);if(states.size>256)states.delete(states.keys().next().value);window.dispatchEvent(new Event('talera-location-diagnosis'))};
 const safe=s=>typeof s==='string'&&s.length>0&&s.length<=120&&!/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(s);
 const valid=p=>{
  if(!p||p.source!=='geonames-nearby-place'||!/^[A-Z]{2}$/.test(p.countryCode)||p.countryCode==='ZZ'||!safe(p.city)||!safe(p.country))return false;
  try{return new Intl.DisplayNames(['nl'],{type:'region',fallback:'none'}).of(p.countryCode)===p.country}catch(_){return false}
 };
 const lookup=async gps=>{
  try{
   if(!canLookup())return {ok:false};
   // Standard AbortController also works on WebKit versions that do not
   // expose AbortSignal.timeout. Never leave a request hanging indefinitely.
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
   try{
    const response=await fetch('/api/capture-place',{method:'POST',credentials:'same-origin',cache:'no-store',
     headers:{'content-type':'application/json','x-talera-local-scope':scope},
     body:JSON.stringify({latitude:gps.latitude,longitude:gps.longitude}),signal:controller.signal});
    if(!response.ok)return {ok:false,retryAfterMs:response.status===429?3600000:60000,diagnostic:({401:'api-401',403:'api-403',429:'api-429',503:'api-503',400:'api-400'})[response.status]||'api-overige-fout'};
    const result=await response.json();
    if(result.place===null)return {ok:true,place:null};
    return valid(result.place)?{ok:true,place:result.place}:{ok:false,diagnostic:'api-antwoord-ongeldig'};
   }finally{clearTimeout(timeout)}
  }catch(_){return {ok:false,diagnostic:'api-netwerk-fout'}}
 };
 // TEMPORARY read-only probe of the selected original. A previous negative
 // marker cannot say WHY it was negative. At most one extra provider probe
 // per page, only for previously checked GPS-bearing media. Never write/clear.
 window.TaleraLocationDiagnosis=Object.freeze({read:async(storyId,key)=>{
  try{
   const story=await store.get(storyId),item=story?.items?.find(x=>x.key===key&&x.kind==='photo');
   if(story?.source!=='pwa-local'||!item)return 'catalogus-item-ontbreekt';
   if(item.capturePlace)return 'plaats-opgeslagen';
   const state=states.get(key);
   if(state&&state!=='wacht-internet-of-configuratie')return state;
   const checked=item.capturePlaceChecked===checkedVersion(item);
   const cacheKey=JSON.stringify([key,checked,enabled,navigator.onLine!==false]);
   if(!probes.has(cacheKey)){
    const work=(async()=>{
     let original;try{original=await store.blob(key)}catch(_){return 'bestand-onleesbaar'}
     if(!(original instanceof Blob)||!original.size||original.size!==item.size||original.type!==item.mime)return 'bestand-afwijkend';
     const gps=await readGps(original);
     if(!gps)return 'gps-niet-herkend';
     if(!enabled)return 'gps-api-uitgeschakeld';
     if(!canLookup())return 'gps-wacht-internet';
     if(!checked)return 'gps-wacht-verwerking';
     if(diagnosticLookupUsed||Date.now()<blockedUntil)return 'gps-eerder-gecontroleerd';
     diagnosticLookupUsed=true;
     const result=await lookup(gps);
     return result?.ok?(result.place?'api-plaats-niet-opgeslagen':'geonames-geen-plaats'):(result?.diagnostic||'geonames-fout');
    })();probes.set(cacheKey,work);if(probes.size>64)probes.delete(probes.keys().next().value);
   }
   return await probes.get(cacheKey);
  }catch(_){return 'diagnose-fout'}
 }});
 const commit=async(expected,index,place)=>{
  if(!available())return null;
  const db=await open(),tx=db.transaction('stories','readwrite'),finished=done(tx);
  let updated=null;
  const rows=tx.objectStore('stories'),req=rows.get(expected.id);
  req.onsuccess=()=>{
   const current=req.result;
   if(!available()||!current||current.source!=='pwa-local'||JSON.stringify(current)!==JSON.stringify(expected))return;
   const item=current.items[index];
   if(!item||item.capturePlace||item.capturePlaceChecked===checkedVersion(item))return;
   if(place)item.capturePlace=place;
   else item.capturePlaceChecked=checkedVersion(item);
   rows.put(current);updated=current;
  };
  await finished;
  // Notify passive readers only AFTER the existing catalog transaction commits.
  if(updated&&place)window.dispatchEvent(new Event('talera-capture-place-updated'));
  return updated;
 };
 const run=async()=>{
  timer=null;if(running||!available())return;
  running=true;
  try{
   const result=await enrichCapturePlaces({list:()=>store.list(),blob:id=>store.blob(id),readPlace,readGps,lookup,commit,available,canLookup,deferred,unreadable,diagnose});
   if(!result.more)unreadable.clear();
   if(result.retryAfterMs)blockedUntil=Date.now()+result.retryAfterMs;
   if(result.more&&available()){
    if(!result.blocked)schedule(30000);
    else if(result.retryAfterMs&&canLookup())schedule(result.retryAfterMs);
   }
  }catch(_){}finally{
   running=false;
   if(pendingDelay!==null){const delay=pendingDelay;pendingDelay=null;schedule(delay)}
  }
 };
 function schedule(ms=250){
  if(!available())return;
  if(running){pendingDelay=pendingDelay===null?ms:Math.min(ms,pendingDelay);return}
  if(timer!==null)return;
  timer=setTimeout(run,Math.max(ms,blockedUntil-Date.now(),0));
 }
 // Wake on a successfully saved original, even when the editor stays open.
 // A direct navigation after save is covered by the next screen's mount.
 // Do not await geocoding in the save path or delay the existing UI.
 if(typeof store.save==='function'){
  const originalSave=store.save;
  store.save=async function(...args){
   const saved=await originalSave.apply(this,args);
   schedule();return saved;
  };
 }
 window.addEventListener('online',()=>{probes.clear();window.dispatchEvent(new Event('talera-location-diagnosis'));schedule()});
 window.addEventListener('pagehide',()=>{departing=true;if(timer!==null){clearTimeout(timer);timer=null}});
 window.addEventListener('pageshow',()=>{departing=false;schedule()});
 document.addEventListener('visibilitychange',()=>{if(available())schedule()});
 schedule();
}
