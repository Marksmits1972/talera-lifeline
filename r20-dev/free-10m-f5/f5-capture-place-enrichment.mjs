// Optional local catalog enrichment. No GPS persistence, no new store and no media uploads.
// The caller supplies the existing account-local library and its transaction owner.
// Legacy geocoder misses (v4-no-place) are rechecked once against offline boundaries.
// Confirmed original metadata and historical reliable place names are retained.
const capturePlaceCheckDone=item=>['v4-no-readable-gps','v5-no-country'].includes(item?.capturePlaceChecked);
const confirmedPlace=item=>['iptc-location-created','geonames-locality-v2','offline-country-v1'].includes(item?.capturePlace?.source);
export async function enrichCapturePlaces({list,blob,readPlace,readGps,lookup,commit,available,canLookup=available,deferred=new Set(),unreadable=new Set(),limit=12,diagnose=()=>{},retryItems=null,now=Date.now}){
 const paused=()=>({more:true,blocked:true});
 const stories=await list();
 if(!available())return paused();
 if(!Array.isArray(stories))throw Error('CAPTURE_INVALID_CATALOG_LIST');
 const known=new Map();
 const keyOf=item=>JSON.stringify([item.key,item.kind,item.size,item.mime,item.name]);
 for(const story of stories)if(story?.source==='pwa-local'&&Array.isArray(story.items))for(const item of story.items){
  if(item&&typeof item.key==='string'&&confirmedPlace(item))known.set(keyOf(item),item.capturePlace);
 }
 let count=0,nextRetry=Infinity;
 for(const initial of stories){
  if(initial?.source!=='pwa-local'||!Array.isArray(initial.items))continue;
  let story=initial;
  for(let i=0;i<story.items.length;i++){
   const item=story.items[i];
   if(!item||!['photo','video'].includes(item.kind)||typeof item.key!=='string'||confirmedPlace(item)||capturePlaceCheckDone(item))continue;
   if(!available())return paused();
   if(unreadable.has(keyOf(item))||!canLookup()&&deferred.has(keyOf(item)))continue;
   const retryKey=keyOf(item),retryAt=retryItems?.get(retryKey)||0;
   if(retryAt>now()){nextRetry=Math.min(nextRetry,retryAt);continue}
   retryItems?.delete(retryKey);
   if(count>=limit)return {more:true,blocked:false};
   count++;
   diagnose(item.key,'bestand-lezen');
   try{
    let place=known.get(keyOf(item))||null,reason='no-readable-gps';
    if(!place){
     let original;
     try{original=await blob(item.key)}catch(error){
      if(!available())return paused();
      // An invalid historical original is not a confirmed absence of GPS.
      // Skip only within this bounded scan, so later intact media still get a turn.
      if(error?.message!=='TALERA_LIBRARY_INVALID_SHARED_ORIGINAL')throw error;
      diagnose(item.key,'bestand-onleesbaar');unreadable.add(keyOf(item));continue;
     }
     if(!available())return paused();
     if(!(original instanceof Blob)||!original.size||original.size!==item.size||original.type!==item.mime){
      diagnose(item.key,'bestand-afwijkend');unreadable.add(keyOf(item));continue;
     }
     // A malformed optional IPTC/XMP packet may not prevent independent GPS extraction.
     if(item.kind==='photo')try{place=await readPlace(original)}catch(_){if(!available())return paused();diagnose(item.key,'iptc-leesfout')}
     if(!available())return paused();
     if(!place){
      // If the caller is paused, defer GPS. In the real app,
      // local lookup is available even without a network.
      if(!canLookup()){diagnose(item.key,'wacht-internet-of-configuratie');deferred.add(keyOf(item));continue}
      const gps=await readGps(original);
      if(!available())return paused();
      diagnose(item.key,gps?'gps-gevonden':'gps-niet-herkend');
      if(gps){
       if(!available())return paused();
       // Resolve coordinates strictly inside local country boundaries.
       if(!canLookup()){deferred.add(keyOf(item));continue}
       diagnose(item.key,'land-lokaal-bepalen');
       const result=await lookup(gps);
       if(!available())return paused();
       diagnose(item.key,result?.ok?(result.place?'land-bekend':'land-onbekend'):(result?.diagnostic||'land-verwerking-fout'));
       if(!result?.ok){
        const delay=result?.retryAfterMs===3600000?3600000:60000;
        // An unexpected local processing failure must not monopolise the
        // queue. A transient failure is not a negative GPS result.
        if(retryItems){retryItems.set(retryKey,now()+delay+60000)}
        return {more:true,blocked:true,retryAfterMs:delay,...(retryItems?{diagnostic:result?.diagnostic||'land-verwerking-fout'}:{})};
       }
       place=result.place;reason='no-country';
      }
     }
    }
    if(!available())return paused();
    // commit must compare the full snapshot and never recreate a deleted story.
    const updated=await commit(story,i,place,reason);
    if(!available())return paused();
    if(!updated){diagnose(item.key,'catalogus-conflict');if(retryItems){const at=now()+1000;retryItems.set(retryKey,at);nextRetry=Math.min(nextRetry,at)}break}
    story=updated;
    if(place){known.set(keyOf(item),place);diagnose(item.key,'plaats-opgeslagen')}
   }catch(_){if(!available())return paused();diagnose(item.key,'verwerking-fout');if(retryItems){const at=now()+60000;retryItems.set(retryKey,at);nextRetry=Math.min(nextRetry,at)} /* optional: never block normal save, read, playback or backup */ }
  }
 }
 return Number.isFinite(nextRetry)?{more:true,blocked:true,retryAfterMs:Math.max(250,nextRetry-now()),itemRetryOnly:true}:{more:false,blocked:false};
}
export function mountCapturePlaceEnrichment({store,open,done,dbName,readPlace,readGps,resolveCountry}){
 if(!/^talera-free-local-[a-f0-9]{32}-v1$/.test(dbName)||!['/mijn-leven','/meldingen','/present','/tell'].includes(location.pathname)||window.top!==window)return;
 let activeController=null,running=false,timer=null,timerDue=Infinity,departing=false,pendingDelay=null,blockedUntil=0;
 const available=()=>!departing&&!document.hidden;
 const canLookup=()=>available();
 const deferred=new Set(),unreadable=new Set();
 // TEMPORARY location diagnosis: in-memory codes only; no logs or persistent fields.
 const retryItems=new Map();
 const queueStatus=()=>{};
 // Bound reads in this optional service only. A slow historical original or
 // unexpected IDB read must not prevent subsequent originals from being seen.
 const bounded=(work,ms=12000)=>{let id;return Promise.race([Promise.resolve().then(work),new Promise((_,reject)=>{id=setTimeout(()=>reject(Error('CAPTURE_READ_TIMEOUT')),ms)})]).finally(()=>clearTimeout(id))};
 const diagnose=()=>{};
 // Pure local geometry; no fetch, credentials, timeout, external provider
 // dependency or raw GPS persistence. Old clients may still use the existing
 // server route; this installed candidate never calls it.
 const lookup=async(gps,signal)=>{
  if(!canLookup()||signal?.aborted||!gps||!Number.isFinite(gps.latitude)||!Number.isFinite(gps.longitude)||Math.abs(gps.latitude)>90||Math.abs(gps.longitude)>180)return {ok:false};
  try{return {ok:true,place:resolveCountry(gps)}}catch(_){return {ok:false}}
 };
 if(location.pathname==='/tell')store.lookupConfirmedDevicePlace=lookup;
 const commit=async(expected,index,place,reason,active)=>{
  if(!active())return null;
  const db=await bounded(()=>open());
  if(!active())return null;
  const tx=db.transaction('stories','readwrite'),finished=done(tx);
  // Abort only this optional metadata transaction, never an editor transaction.
  const timeout=setTimeout(()=>{try{tx.abort()}catch(_){}},12000);
  let updated=null;
  const rows=tx.objectStore('stories'),req=rows.get(expected.id);
  req.onsuccess=()=>{
   const current=req.result;
   if(!active()||!current||current.source!=='pwa-local'||JSON.stringify(current)!==JSON.stringify(expected))return;
   const item=current.items[index];
   if(!item||confirmedPlace(item)||capturePlaceCheckDone(item))return;
   if(place){item.capturePlace=place;delete item.capturePlaceChecked}
   else if(['no-readable-gps','no-country'].includes(reason))item.capturePlaceChecked=reason==='no-country'?'v5-no-country':'v4-no-readable-gps';
   else return;
   rows.put(current);updated=current;
  };
  try{await finished}finally{clearTimeout(timeout)}
  // Notify passive readers only AFTER the existing catalog transaction commits.
  if(active()&&updated)window.dispatchEvent(new Event('talera-capture-place-updated'));
  return updated;
 };
 // The existing /tell editor may inspect draft originals immediately, without
 // a published catalog row or an additional database. Only validated results
 // leave this private reader; coordinates live in a per-document WeakMap.
 const draftMetadata=new WeakMap(),draftResults=new WeakMap();
 store.inspectDraftCapturePlace=async(original,kind,signal,localOnly=false)=>{
  const pending={state:'pending'},active=()=>available()&&!signal?.aborted;
  if(!active()||kind!=='photo'||!(original instanceof Blob)||!original.size)return pending;
  if(draftResults.has(original))return draftResults.get(original);
  const read=async(fn)=>{
   const controller=new AbortController(),cancel=()=>controller.abort();
   signal?.addEventListener('abort',cancel,{once:true});if(!active())cancel();
   try{return await bounded(()=>fn(original,controller.signal))}
   finally{signal?.removeEventListener('abort',cancel);cancel()}
  };
  try{
   let metadata=draftMetadata.get(original);
   if(!metadata){
    let place=null;try{place=await read(readPlace)}catch(_){if(!active())return pending}
    if(!active())return pending;
    if(place){const result={state:'known',place};draftResults.set(original,result);return result}
    const gps=await read(readGps);if(!active())return pending;
    if(!gps){const result={state:'unknown',reason:'no-readable-gps'};draftResults.set(original,result);return result}
    metadata={gps};draftMetadata.set(original,metadata);
   }
   if(!canLookup())return pending;
   const outcome=await lookup(metadata.gps,signal||new AbortController().signal);
   if(!active())return pending;
   if(!outcome.ok){blockedUntil=Math.max(blockedUntil,Date.now()+(outcome.retryAfterMs||60000));return pending}
   const result=outcome.place?{state:'known',place:outcome.place}:{state:'unknown',reason:'no-country'};
   draftMetadata.delete(original);draftResults.set(original,result);return result;
  }catch(_){return pending}
 };
 const run=async()=>{
  timer=null;timerDue=Infinity;if(running||!available())return;
  running=true;queueStatus('wachtrij-bibliotheek-lezen');
  const controller=new AbortController(),signal=controller.signal;
  activeController=controller;
  const active=()=>available()&&!signal.aborted;
  // Each bounded read also cancels its own FileReader on timeout. A previous
  // timed-out read must not outlive the scan or the page's controller.
  const readBounded=(read,original)=>{
   const readerController=new AbortController(),cancel=()=>readerController.abort();
   signal.addEventListener('abort',cancel,{once:true});
   if(signal.aborted)cancel();
   return bounded(()=>read(original,readerController.signal)).finally(()=>{
    signal.removeEventListener('abort',cancel);cancel();
   });
  };
  try{
   const result=await enrichCapturePlaces({list:async()=>{const rows=await bounded(()=>store.list());queueStatus('wachtrij-bestanden');return rows},blob:id=>bounded(()=>store.blob(id)),readPlace:blob=>readBounded(readPlace,blob),readGps:blob=>readBounded(readGps,blob),lookup:gps=>lookup(gps,signal),commit:(expected,index,place,reason)=>commit(expected,index,place,reason,active),available:active,canLookup:()=>active()&&canLookup(),deferred,unreadable,diagnose,retryItems});
   if(!active())return;
   if(!result.more)unreadable.clear();
   // Old entries cannot grow without bound during long active sessions.
   for(const [key,at] of retryItems)if(at<Date.now()-3600000)retryItems.delete(key);
   if(result.retryAfterMs&&!result.itemRetryOnly){blockedUntil=Date.now()+result.retryAfterMs;queueStatus(result.diagnostic||'wachtrij-pauze')}
   else queueStatus(result.more?'wachtrij-vervolg':'wachtrij-klaar');
   if(result.more&&available()){
    if(!result.blocked)schedule(1000);
    else if(result.retryAfterMs&&(canLookup()||result.itemRetryOnly))schedule(result.retryAfterMs);
   }
  }catch(_){if(active()){queueStatus('wachtrij-leesfout');schedule(60000)}}finally{
   activeController=null;running=false;
   if(pendingDelay!==null){const delay=pendingDelay;pendingDelay=null;schedule(delay)}
  }
 };
 function schedule(ms=250){
  if(!available())return;
  if(running){pendingDelay=pendingDelay===null?ms:Math.min(ms,pendingDelay);return}
  const delay=Math.max(ms,blockedUntil-Date.now(),0),due=Date.now()+delay;
  // A later scheduled retry may not suppress an earlier save/online wake-up.
  // The provider's global cooldown is still an absolute lower bound.
  if(timer!==null){if(timerDue<=due)return;clearTimeout(timer)}
  timerDue=due;timer=setTimeout(run,delay);
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
 window.addEventListener('online',()=>schedule());
 const suspend=()=>{
  activeController?.abort();
  if(timer!==null){clearTimeout(timer);timer=null;timerDue=Infinity}
 };
 // Stop optional work at the earliest document-navigation notification.
 // Never prevent navigation or prompt the user; pagehide is the fallback.
 window.addEventListener('beforeunload',suspend);
 window.addEventListener('pagehide',()=>{departing=true;suspend()});
 window.addEventListener('pageshow',()=>{departing=false;schedule()});
 window.addEventListener('focus',()=>schedule());
 // Recovery for missed browser wake-up events, only on a visible active page.
 // No provider polling for already resolved originals; the pass reads the
 // local catalog and retains the existing backoff and checked markers.
 document.addEventListener('visibilitychange',()=>{if(available())schedule();else suspend()});
 schedule();
}
