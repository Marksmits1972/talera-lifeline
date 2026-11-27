// Optional local catalog enrichment. No GPS persistence, no new store and no media uploads.
// The caller supplies the existing account-local library and its transaction owner.
// Re-evaluate old proximity-only results and negative markers once using the new rule.
const checkedVersion=()=> 'v3';
const confirmedPlace=item=>['iptc-location-created','geonames-locality-v2'].includes(item?.capturePlace?.source);
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
   if(!item||!['photo','video'].includes(item.kind)||typeof item.key!=='string'||confirmedPlace(item)||item.capturePlaceChecked===checkedVersion(item))continue;
   if(!available())return paused();
   if(unreadable.has(keyOf(item))||!canLookup()&&deferred.has(keyOf(item)))continue;
   const retryKey=keyOf(item),retryAt=retryItems?.get(retryKey)||0;
   if(retryAt>now()){nextRetry=Math.min(nextRetry,retryAt);continue}
   retryItems?.delete(retryKey);
   if(count>=limit)return {more:true,blocked:false};
   count++;
   diagnose(item.key,'bestand-lezen');
   try{
    let place=known.get(keyOf(item))||null;
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
      // Offline or before provider configuration, only explicit metadata
      // is needed. Do not scan GPS or persist negative results yet.
      if(!canLookup()){diagnose(item.key,'wacht-internet-of-configuratie');deferred.add(keyOf(item));continue}
      const gps=await readGps(original);
      if(!available())return paused();
      diagnose(item.key,gps?'gps-gevonden':'gps-niet-herkend');
      if(gps){
       if(!available())return paused();
       // A stored original can be inspected locally without internet. Do not
       // mark unresolved GPS as checked or delay other local metadata.
       if(!canLookup()){deferred.add(keyOf(item));continue}
       diagnose(item.key,'geonames-aanvraag');
       const result=await lookup(gps);
       if(!available())return paused();
       diagnose(item.key,result?.ok?(result.place?'geonames-plaats':'geonames-geen-plaats'):(result?.diagnostic||'geonames-fout'));
       if(!result?.ok){
        const delay=result?.retryAfterMs===3600000?3600000:60000;
        // A single failed original may not monopolise the next scan. The
        // actual provider/account backoff remains global, then another item
        // gets its turn before retrying this one. No writes on failed lookup.
        if(retryItems){retryItems.set(retryKey,now()+delay+60000)}
        return {more:true,blocked:true,retryAfterMs:delay,...(retryItems?{diagnostic:result?.diagnostic||'geonames-fout'}:{})};
       }
       place=result.place;
      }
     }
    }
    if(!available())return paused();
    // commit must compare the full snapshot and never recreate a deleted story.
    const updated=await commit(story,i,place);
    if(!available())return paused();
    if(!updated){diagnose(item.key,'catalogus-conflict');if(retryItems){const at=now()+1000;retryItems.set(retryKey,at);nextRetry=Math.min(nextRetry,at)}break}
    story=updated;
    if(place){known.set(keyOf(item),place);diagnose(item.key,'plaats-opgeslagen')}
   }catch(_){if(!available())return paused();diagnose(item.key,'verwerking-fout');if(retryItems){const at=now()+60000;retryItems.set(retryKey,at);nextRetry=Math.min(nextRetry,at)} /* optional: never block normal save, read, playback or backup */ }
  }
 }
 return Number.isFinite(nextRetry)?{more:true,blocked:true,retryAfterMs:Math.max(250,nextRetry-now()),itemRetryOnly:true}:{more:false,blocked:false};
}
export function mountCapturePlaceEnrichment({store,open,done,dbName,readPlace,readGps,enabled}){
 if(!/^talera-free-local-[a-f0-9]{32}-v1$/.test(dbName)||!['/mijn-leven','/meldingen','/present','/tell'].includes(location.pathname)||window.top!==window)return;
 const scope=dbName.slice('talera-free-local-'.length,-3);
 let activeController=null,running=false,timer=null,timerDue=Infinity,departing=false,pendingDelay=null,blockedUntil=0;
 const available=()=>!departing&&!document.hidden;
 const canLookup=()=>enabled&&available()&&navigator.onLine!==false;
 const deferred=new Set(),unreadable=new Set();
 // TEMPORARY location diagnosis: in-memory codes only; no logs or persistent fields.
 const retryItems=new Map();
 const queueStatus=()=>{};
 // Bound reads in this optional service only. A slow historical original or
 // unexpected IDB read must not prevent subsequent originals from being seen.
 const bounded=(work,ms=12000)=>{let id;return Promise.race([Promise.resolve().then(work),new Promise((_,reject)=>{id=setTimeout(()=>reject(Error('CAPTURE_READ_TIMEOUT')),ms)})]).finally(()=>clearTimeout(id))};
 const diagnose=()=>{};
 const safe=s=>typeof s==='string'&&s.length>0&&s.length<=120&&!/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(s);
 const valid=p=>{
  if(!p||p.source!=='geonames-locality-v2'||!/^[A-Z]{2}$/.test(p.countryCode)||p.countryCode==='ZZ'||!safe(p.city)||!safe(p.country))return false;
  try{return new Intl.DisplayNames(['nl'],{type:'region',fallback:'none'}).of(p.countryCode)===p.country}catch(_){return false}
 };
 const lookup=async(gps,signal)=>{
  try{
   if(!canLookup()||signal.aborted)return {ok:false};
   // Standard AbortController also works on WebKit versions that do not
   // expose AbortSignal.timeout. Never leave a request hanging indefinitely.
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
   const cancel=()=>controller.abort();
   signal.addEventListener('abort',cancel,{once:true});
   try{
    const response=await fetch('/api/capture-place',{method:'POST',credentials:'same-origin',cache:'no-store',
     headers:{'content-type':'application/json','x-talera-local-scope':scope},
     body:JSON.stringify({latitude:gps.latitude,longitude:gps.longitude}),signal:controller.signal});
    if(!response.ok){
     let reason=null;try{reason=(await response.json()).diagnostic}catch(_){}
     const safeReasons=['api-configuratie','api-limiet-opslag','api-provider-http','api-provider-status','api-provider-netwerk','api-provider-antwoord'];
     return {ok:false,retryAfterMs:response.status===429?3600000:60000,diagnostic:safeReasons.includes(reason)?reason:({401:'api-401',403:'api-403',429:'api-429',503:'api-503',400:'api-400'})[response.status]||'api-overige-fout'};
    }
    const result=await response.json();
    if(result.place===null)return {ok:true,place:null};
    return valid(result.place)?{ok:true,place:result.place}:{ok:false,diagnostic:'api-antwoord-ongeldig'};
   }finally{clearTimeout(timeout);signal.removeEventListener('abort',cancel)}
  }catch(_){return {ok:false,diagnostic:'api-netwerk-fout'}}
 };
 const commit=async(expected,index,place,active)=>{
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
   if(!item||confirmedPlace(item)||item.capturePlaceChecked===checkedVersion(item))return;
   if(place){item.capturePlace=place;delete item.capturePlaceChecked}
   else item.capturePlaceChecked=checkedVersion(item);
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
    if(!gps){const result={state:'unknown'};draftResults.set(original,result);return result}
    metadata={gps};draftMetadata.set(original,metadata);
   }
   if(localOnly||!canLookup()||Date.now()<blockedUntil)return pending;
   const outcome=await lookup(metadata.gps,signal||new AbortController().signal);
   if(!active())return pending;
   if(!outcome.ok){blockedUntil=Math.max(blockedUntil,Date.now()+(outcome.retryAfterMs||60000));return pending}
   const result=outcome.place?{state:'known',place:outcome.place}:{state:'unknown'};
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
   const result=await enrichCapturePlaces({list:async()=>{const rows=await bounded(()=>store.list());queueStatus('wachtrij-bestanden');return rows},blob:id=>bounded(()=>store.blob(id)),readPlace:blob=>readBounded(readPlace,blob),readGps:blob=>readBounded(readGps,blob),lookup:gps=>lookup(gps,signal),commit:(expected,index,place)=>commit(expected,index,place,active),available:active,canLookup:()=>active()&&canLookup(),deferred,unreadable,diagnose,retryItems});
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
