// Optional local catalog enrichment. No GPS persistence, no new store and no media uploads.
// The caller supplies the existing account-local library and its transaction owner.
// Legacy geocoder misses (v4-no-place) are rechecked once against offline boundaries.
// Confirmed original metadata and historical reliable place names are retained.
const capturePlaceCheckDone=item=>['v4-no-readable-gps','v5-no-country'].includes(item?.capturePlaceChecked);
const confirmedPlace=item=>['iptc-location-created','geonames-locality-v2','offline-country-v1','offline-locality-v1'].includes(item?.capturePlace?.source);
const needsOfflineLocality=item=>item?.kind==='photo'&&item.capturePlace?.source==='offline-country-v1'&&!item.capturePlace.city&&item.captureLocalityChecked!=='offline-locality-world-v2'&&!item.manualPhotoLocation;
export async function enrichCapturePlaces({list,blob,readPlace,readGps,lookup,commit,resolveLocality=null,available,canLookup=available,deferred=new Set(),unreadable=new Set(),limit=12,diagnose=()=>{},retryItems=null,now=Date.now}){
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
   const upgrading=!!resolveLocality&&needsOfflineLocality(item);
   if(!item||item.manualPhotoLocation||item.captureLocationFailed||!['photo','video'].includes(item.kind)||typeof item.key!=='string'||(confirmedPlace(item)&&!upgrading)||capturePlaceCheckDone(item))continue;
   if(!available())return paused();
   if(unreadable.has(keyOf(item))||!canLookup()&&deferred.has(keyOf(item)))continue;
   const retryKey=keyOf(item),retryAt=retryItems?.get(retryKey)||0;
   if(retryAt>now()){nextRetry=Math.min(nextRetry,retryAt);continue}
   retryItems?.delete(retryKey);
   if(count>=limit)return {more:true,blocked:false};
   count++;
   diagnose(item.key,'bestand-lezen');
   try{
    let place=upgrading?null:known.get(keyOf(item))||null,reason='no-readable-gps',localityChecked=false;
    // A duplicate country-only descriptor must not suppress the independent
    // original GPS read while the optional offline locality is available.
    if(resolveLocality&&item.kind==='photo'&&place?.source==='offline-country-v1')place=null;
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
     if(!place||upgrading&&!place.city){
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
       if(upgrading&&place?.source==='offline-country-v1'){
        if(place.countryCode===item.capturePlace.countryCode){
         const locality=await resolveLocality(gps,place);
         if(!available())return paused();
         if(locality?.ready){place=locality.place;localityChecked=true}
         else if(upgrading){if(retryItems){const at=now()+60000;retryItems.set(retryKey,at);nextRetry=Math.min(nextRetry,at)}continue}
        }
       }
      }
     }
    }
    if(!available())return paused();
    if(upgrading){
     // Country-only results may be enriched, never replaced with a different
     // country or erased. An original metadata place outranks approximate data.
     if(!place||place.countryCode!==item.capturePlace.countryCode||!place.city&&!localityChecked){
      place=item.capturePlace;
      if(reason==='no-readable-gps'||reason==='no-country')localityChecked=true;
      else continue;
     }
    }
    // commit must compare the full snapshot and never recreate a deleted story.
    const updated=await commit(story,i,place,reason,localityChecked);
    if(!available())return paused();
    if(!updated){diagnose(item.key,'catalogus-conflict');if(retryItems){const at=now()+1000;retryItems.set(retryKey,at);nextRetry=Math.min(nextRetry,at)}break}
    story=updated;
    if(place){known.set(keyOf(item),place);diagnose(item.key,'plaats-opgeslagen');
     if(resolveLocality&&item.kind==='photo'&&place.source==='offline-country-v1'&&!localityChecked&&!item.manualPhotoLocation&&retryItems){
      const at=now()+1000;retryItems.set(retryKey,at);nextRetry=Math.min(nextRetry,at)
     }
    }
   }catch(_){if(!available())return paused();diagnose(item.key,'verwerking-fout');if(retryItems){const at=now()+60000;retryItems.set(retryKey,at);nextRetry=Math.min(nextRetry,at)} /* optional: never block normal save, read, playback or backup */ }
  }
 }
 return Number.isFinite(nextRetry)?{more:true,blocked:true,retryAfterMs:Math.max(250,nextRetry-now()),itemRetryOnly:true}:{more:false,blocked:false};
}
// Derived technical state inside the existing account-local files store.
// No schema upgrade: old app versions can still open their original v1 DB.
// This row contains only pending media IDs, not media bytes or coordinates.
export const LOCATION_WORK_KEY='talera-location-work-index-v1';
const LOCATION_WORK_VERSION='offline-locality-world-v2';
const LOCATION_RETRY_DELAYS=[300000,1800000];
const locationWorkSignature=item=>JSON.stringify([item.key,item.kind,item.size,item.mime,item.name]);
export function locationWorkEligible(item){
 return !!item&&['photo','video'].includes(item.kind)&&typeof item.key==='string'&&
  !item.manualPhotoLocation&&!item.captureLocationFailed&&!capturePlaceCheckDone(item)&&
  (!confirmedPlace(item)||needsOfflineLocality(item));
}
export function syncLocationWork(state,story){
 const previous=new Map(state.items.filter(e=>e.story===story.id).map(e=>[e.signature,e]));
 const other=state.items.filter(e=>e.story!==story.id);
 if(story.source==='pwa-local')for(const item of story.items||[]){
  if(!locationWorkEligible(item))continue;
  const signature=locationWorkSignature(item),old=previous.get(signature);
  other.push(old||{story:story.id,key:item.key,signature,attempts:0,at:0});
 }
 state.items=other;
 return state;
}
const locationWorkValid=state=>state?.version===LOCATION_WORK_VERSION&&Array.isArray(state.items);
export function makeLocationWork(stories){
 const state={version:LOCATION_WORK_VERSION,items:[],count:stories.length,lease:null};
 for(const story of stories)if(story?.id&&story.source==='pwa-local')for(const item of story.items||[]){
  if(locationWorkEligible(item))state.items.push({story:story.id,key:item.key,signature:locationWorkSignature(item),attempts:0,at:0});
 }
 return state;
}
// Called inside the existing story save transaction, after put(meta).
// An uninitialized index is built once by the next foreground scan.
export function locationQueueWrite(tx,story){
 const files=tx.objectStore('files'),req=files.get(LOCATION_WORK_KEY);
 // Derived optional bookkeeping must never abort an original media save.
 const ignore=e=>{e.preventDefault();e.stopPropagation()};
 req.onerror=e=>{ignore(e);files.delete(LOCATION_WORK_KEY).onerror=ignore};
 req.onsuccess=()=>{
  const state=req.result?.blob;
  if(!locationWorkValid(state))return;
  const count=tx.objectStore('stories').count();
  count.onerror=e=>{ignore(e);files.delete(LOCATION_WORK_KEY).onerror=ignore};
  count.onsuccess=()=>{
   // A count mismatch beyond a single new row means old software or a
   // separate restore changed the catalog. Force one controlled rebuild.
   if(Math.abs(state.count-count.result)>1){files.delete(LOCATION_WORK_KEY).onerror=ignore;return}
   syncLocationWork(state,story);state.count=count.result;
   files.put({key:LOCATION_WORK_KEY,blob:state}).onerror=e=>{ignore(e);files.delete(LOCATION_WORK_KEY).onerror=ignore};
  };
 };
}
// The Worker applies this only AFTER its existing source-exact editor adapter.
// No edits to the original save/draft receipt or media binding code.
export function installLocationQueueWrites(html){
 if(!html.includes('mountCapturePlaceEnrichment('))return html;
 const marker="tx.objectStore("+"'stories'"+").put(meta);";
 if(html.split(marker).length!==2)throw Error('LOCATION_QUEUE_SAVE_SOURCE_DRIFT');
 html=html.replace(marker,marker+'locationQueueWrite(tx,meta);');
 // The approved complete-deletion core owns the same stores in its own
 // closure on some screens. Remove only the derived task, atomically with
 // the existing deletion; never change the original deletion result.
 const deleteMarker='stories.'+'delete(id);';
 if(html.split(deleteMarker).length>2)throw Error('LOCATION_QUEUE_DELETE_SOURCE_DRIFT');
 const patch=`(()=>{const key='talera-location-work-index-v1',ignore=e=>{e.preventDefault();e.stopPropagation()};
 const r=files.get(key);r.onerror=e=>{ignore(e);files.delete(key).onerror=ignore};
 r.onsuccess=()=>{const state=r.result?.blob;if(state?.version!=='offline-locality-world-v2'||!Array.isArray(state.items))return;
 const count=stories.count();count.onerror=e=>{ignore(e);files.delete(key).onerror=ignore};
 count.onsuccess=()=>{if(state.count!==count.result+1){files.delete(key).onerror=ignore;return}
 state.items=state.items.filter(e=>e.story!==id);if(state.lease?.story===id)state.lease=null;state.count=count.result;
 files.put({key,blob:state}).onerror=e=>{ignore(e);files.delete(key).onerror=ignore};
 };};})();`;
 return html.replace(deleteMarker,deleteMarker+patch);
}
export function nextLocationWork(state,now=Date.now()){
 if(state.lease&&state.lease.until>now)return {at:state.lease.until};
 let next=Infinity;
 for(const entry of state.items){
  if(entry.at<=now)return {entry};
  next=Math.min(next,entry.at);
 }
 return {at:Number.isFinite(next)?next:null};
}
export function finishLocationWork(state,entry,result,now=Date.now()){
 const index=state.items.findIndex(e=>e.story===entry.story&&e.signature===entry.signature);
 if(index<0)return state;
 const current=state.items[index];
 if(result.kind==='done')state.items.splice(index,1);
 else if(result.kind==='wait'){current.offline=false;current.at=Math.max(now+250,result.at||now+300000)}
 else if(result.kind==='offline'){current.offline=true;current.at=now+300000;}
 else if(result.kind==='retry'){
  current.attempts=(current.attempts||0)+1;
  if(current.attempts>=3)state.items.splice(index,1);
  else current.at=now+LOCATION_RETRY_DELAYS[current.attempts-1];
 }
 return state;
}
// Separate bounded local reads from the shared public download. A missing GPS
// or an already checked/manual item is terminal, not a network failure.
export async function inspectLocationWork({item,blob,readPlace,readGps,lookup,resolveLocality,signal,available=()=>!signal?.aborted}){
 const upgrading=needsOfflineLocality(item);
 const keep=item.capturePlace||null;
 const active=()=>available()&&!signal?.aborted;
 if(!active())return {kind:'offline'};
 const original=await blob(item.key);
 if(!active())return {kind:'offline'};
 if(!(original instanceof Blob)||!original.size||original.size!==item.size||original.type!==item.mime)return {kind:'done',failure:'unreadable'};
 let place=null;
 let metadataError=false;
 if(item.kind==='photo')try{place=await readPlace(original,signal)}catch{metadataError=true}
 if(!active())return {kind:'offline'};
 if(place&&(!upgrading||place.city&&place.countryCode===keep.countryCode)&&place.source!=='offline-country-v1')return {kind:'done',place};
 const gps=await readGps(original,signal);
 if(!active())return {kind:'offline'};
 if(!gps&&metadataError)return {kind:'retry'};
 if(!gps||!Number.isFinite(gps.latitude)||!Number.isFinite(gps.longitude)||Math.abs(gps.latitude)>90||Math.abs(gps.longitude)>180)
  return {kind:'done',place:keep||place,reason:'no-readable-gps',checked:!!keep};
 const outcome=await lookup(gps,signal);
 if(!outcome?.ok)return {kind:'retry'};
 place=outcome.place||null;
 if(!place||upgrading&&place.countryCode!==keep.countryCode)return {kind:'done',place:keep,reason:'no-country',checked:!!keep};
 if(item.kind!=='photo'||!resolveLocality||place.source!=='offline-country-v1')return {kind:'done',place};
 // Preserve the already approved quick country result; expanded place
 // recognition is a subsequent bounded task, never a delay to the flag.
 if(!upgrading)return {kind:'wait',place,at:Date.now()+250};
 const result=await resolveLocality(gps,place,signal);
 if(!active())return {kind:'offline',place};
 if(result?.ready)return {kind:'done',place:result.place||place,checked:true};
 if(result?.blocked==='exhausted')return {kind:'done',place,failure:'register-unavailable'};
 if(result?.blocked==='offline')return {kind:'offline',place};
 return {kind:'wait',place,at:result?.retryAt};
}
function createLocationWorkIndex({open,done,clock=Date.now}){
 const transact=async(callback)=>{
  const db=await open(),tx=db.transaction(['stories','files'],'readwrite'),finished=done(tx);
  const stories=tx.objectStore('stories'),files=tx.objectStore('files');
  let output;
  const request=files.get(LOCATION_WORK_KEY);
  request.onsuccess=()=>{
   const stored=request.result?.blob;
   const use=(state,initial=false)=>{output=callback(state,stories,files,tx,initial)};
   if(!locationWorkValid(stored)){
    const all=stories.getAll();
    all.onsuccess=()=>use(makeLocationWork(all.result||[]),true);
   }else{
    // Cheap native count detects additions/deletions by older app software.
    // No getAll on normal startup or on repeated completed work.
    const count=stories.count();
    count.onsuccess=()=>{
     if(stored.count===count.result)use(stored);
     else {const all=stories.getAll();all.onsuccess=()=>use(makeLocationWork(all.result||[]),true)}
    };
   }
  };
  await finished;return typeof output==='function'?output():output;
 };
 const put=(files,state)=>files.put({key:LOCATION_WORK_KEY,blob:state});
 const claim=(onlineWake=false)=>transact((state,stories,files,tx,initial)=>{
  if(onlineWake)for(const entry of state.items)if(entry.offline){entry.at=0;entry.offline=false;initial=true}
  const now=clock();
  if(state.lease&&state.lease.until<=now){
   const old=state.items.find(e=>e.story===state.lease.story&&e.signature===state.lease.signature);
   if(old){old.attempts=(old.attempts||0)+1;old.at=old.attempts>=3?0:now+LOCATION_RETRY_DELAYS[old.attempts-1]}
   state.lease=null;initial=true;
  }
  const next=nextLocationWork(state,now);
  if(!next.entry){if(initial)put(files,state);return next}
  const token=crypto.randomUUID(),entry={...next.entry};
  state.lease={token,until:now+35000,story:entry.story,signature:entry.signature};
  let row;
  const req=stories.get(entry.story);
  req.onsuccess=()=>{row=req.result;put(files,state)};
  return ()=>({entry,token,row});
 });
 const finish=(claim,result)=>transact((state,stories,files)=>{
  if(state.lease?.token!==claim.token)return false;
  // Revalidate the exact original descriptor in the SAME story transaction.
  // Never recreate a deleted story or overwrite a manual correction.
  const req=stories.get(claim.entry.story);
  let changed=false;
  req.onsuccess=()=>{
   const row=req.result,item=row?.items?.find(i=>locationWorkSignature(i)===claim.entry.signature);
   if(!row||!locationWorkEligible(item)){
    if(row)syncLocationWork(state,row);else state.items=state.items.filter(e=>e.story!==claim.entry.story);
   }else{
    const actual=state.items.find(e=>e.story===claim.entry.story&&e.signature===claim.entry.signature);
    if(actual){
     const terminal=result.kind==='retry'&&(actual.attempts||0)>=2;
     if(result.place&&(!item.capturePlace||item.capturePlace.countryCode===result.place.countryCode)){
      item.capturePlace=result.place;delete item.capturePlaceChecked;
      if(result.checked&&!result.place.city)item.captureLocalityChecked=LOCATION_WORK_VERSION;
      changed=true;
     }
     if(result.kind==='done'&&result.reason&&!item.capturePlace){
      item.capturePlaceChecked=result.reason==='no-country'?'v5-no-country':'v4-no-readable-gps';changed=true;
     }
     if(result.kind==='done'&&result.failure||terminal){
      item.captureLocationFailed=result.failure||'retry-exhausted';changed=true;
     }
     if(changed)stories.put(row);
     finishLocationWork(state,claim.entry,result,clock());
    }
   }
   state.lease=null;put(files,state);
  };
  return ()=>changed;
 });
 return {claim,finish};
}

export function mountCapturePlaceEnrichment({store,open,done,dbName,readPlace,readGps,resolveCountry,resolveLocality=null,workIndex=null}){
 if(!/^talera-free-local-[a-f0-9]{32}-v1$/.test(dbName)||!['/mijn-leven','/meldingen','/present','/tell'].includes(location.pathname)||window.top!==window)return;
 let activeController=null,running=false,timer=null,timerDue=Infinity,departing=false,pendingDelay=null,blockedUntil=0;
 const available=()=>!departing&&!document.hidden;
 const canLookup=()=>available();
 // Bound reads in this optional service only. A slow historical original or
 // unexpected IDB read must not prevent subsequent originals from being seen.
 const bounded=(work,ms=12000)=>{let id;return Promise.race([Promise.resolve().then(work),new Promise((_,reject)=>{id=setTimeout(()=>reject(Error('CAPTURE_READ_TIMEOUT')),ms)})]).finally(()=>clearTimeout(id))};
 // Pure local geometry; no fetch, credentials, timeout, external provider
 // dependency or raw GPS persistence. Old clients may still use the existing
 // server route; this installed candidate never calls it.
 const lookup=async(gps,signal)=>{
  if(!canLookup()||signal?.aborted||!gps||!Number.isFinite(gps.latitude)||!Number.isFinite(gps.longitude)||Math.abs(gps.latitude)>90||Math.abs(gps.longitude)>180)return {ok:false};
  try{return {ok:true,place:resolveCountry(gps)}}catch(_){return {ok:false}}
 };
 if(location.pathname==='/tell')store.lookupConfirmedDevicePlace=lookup;
 // The existing /tell editor may inspect draft originals immediately, without
 // a published catalog row or an additional database. Only validated results
 // leave this private reader; coordinates live in a per-document WeakMap.
 const draftMetadata=new WeakMap(),draftResults=new WeakMap(),draftFailures=new WeakMap();
 const inspectDraftCapturePlace=async(original,kind,signal,localOnly=false)=>{
  const pending={state:'pending'},active=()=>available()&&!signal?.aborted;
  if(!active()||kind!=='photo'||!(original instanceof Blob)||!original.size)return pending;
  const previous=draftResults.get(original);
  const canRefine=!!resolveLocality&&previous?.place?.source==='offline-country-v1'&&!previous.localityChecked;
  if(previous&&(!canRefine||localOnly))return previous;
  const prior=draftFailures.get(original);
  if(prior&&Date.now()<prior.at)return pending;
  const failDraft=()=>{
   if(!active())return pending;
   const attempts=(draftFailures.get(original)?.attempts||0)+1;
   if(attempts>=3){const stopped={state:'unknown',reason:'retry-exhausted'};draftResults.set(original,stopped);return stopped}
   draftFailures.set(original,{attempts,at:Date.now()+LOCATION_RETRY_DELAYS[attempts-1]});return pending
  };
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
   if(!outcome.ok)return failDraft();
   let result=outcome.place?{state:'known',place:outcome.place}:{state:'unknown',reason:'no-country'};
   // Always return the country on the first pass without loading the data.
   // The second pass refines it locally; no GPS is saved to the draft.
   if(resolveLocality&&outcome.place?.source==='offline-country-v1'){
    if(localOnly){draftResults.set(original,result);return result}
    const locality=await resolveLocality(metadata.gps,outcome.place,signal);
    if(!active())return pending;
    if(!locality?.ready){
     if(locality?.blocked==='exhausted')result={...result,localityChecked:true,failure:'register-unavailable'};
     draftResults.set(original,result);return result
    }
    result={state:'known',place:locality.place,localityChecked:true};
   }
   draftMetadata.delete(original);draftResults.set(original,result);return result;
  }catch(_){return failDraft()}
 };
 store.inspectDraftCapturePlace=async(original,kind,outerSignal,localOnly=false)=>{
  const c=new AbortController(),cancel=()=>c.abort();
  outerSignal?.addEventListener('abort',cancel,{once:true});if(outerSignal?.aborted)cancel();
  let timer;
  try{
   return await Promise.race([inspectDraftCapturePlace(original,kind,c.signal,localOnly),
    new Promise(resolve=>{timer=setTimeout(()=>{
     c.abort();
     const old=draftResults.get(original);
     if(old){resolve(old);return}
     const attempts=(draftFailures.get(original)?.attempts||0)+1;
     if(attempts>=3){const stopped={state:'unknown',reason:'retry-exhausted'};draftResults.set(original,stopped);resolve(stopped)}
     else{draftFailures.set(original,{attempts,at:Date.now()+LOCATION_RETRY_DELAYS[attempts-1]});resolve({state:'pending'})}
    },30000)})]);
  }finally{clearTimeout(timer);outerSignal?.removeEventListener('abort',cancel);cancel()}
 };
 const work=workIndex||createLocationWorkIndex({open,done});
 let onlineWake=navigator.onLine!==false;
 const run=async()=>{
  timer=null;timerDue=Infinity;if(running||!available())return;
  running=true;
  const controller=new AbortController(),signal=controller.signal;
  activeController=controller;
  let claim=null,deadline=null;
  try{
   const wake=onlineWake;onlineWake=false;claim=await work.claim(wake);
   if(!claim.entry){
    if(Number.isFinite(claim.at)&&claim.at!==null&&available()&&navigator.onLine!==false)schedule(Math.max(250,claim.at-Date.now()));
    return;
   }
   const item=claim.row?.items?.find(i=>locationWorkSignature(i)===claim.entry.signature);
   let result;
   if(!locationWorkEligible(item))result={kind:'done'};
   else if(claim.entry.attempts>=3)result={kind:'done',failure:'retry-exhausted'};
   else if(!available())result={kind:'offline'};
   else{
    // Thirty seconds end-to-end, including local reads; the shared asset may
    // have its own smaller timeout. Abort FileReaders and network on pause.
    let timedOut=false;
    const timeout=new Promise(resolve=>{
     signal.addEventListener('abort',()=>resolve({kind:timedOut?'retry':'offline'}),{once:true});
     deadline=setTimeout(()=>{timedOut=true;controller.abort()},30000);
    });
    const task=inspectLocationWork({item,blob:key=>store.blob(key),readPlace,readGps,lookup,resolveLocality,signal,available}).catch(error=>
     error?.message==='TALERA_LIBRARY_INVALID_SHARED_ORIGINAL'?{kind:'done',failure:'unreadable'}:{kind:'retry'});
    result=await Promise.race([task,timeout]);
    if(!available())result={kind:'offline'};
   }
   clearTimeout(deadline);
   const changed=await work.finish(claim,result);
   if(changed&&available())window.dispatchEvent(new Event('talera-capture-place-updated'));
   if(available())schedule(250);
  }catch(_){/* Optional work must never block the library. Wait for a real wakeup. */}
  finally{
   clearTimeout(deadline);activeController=null;running=false;
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
 window.addEventListener('online',()=>{onlineWake=true;schedule()});
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
