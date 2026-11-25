// Optional local catalog enrichment. No GPS persistence, no new store and no media uploads.
// The caller supplies the existing account-local library and its transaction owner.
// Recheck only previously unresolved HEIF originals once after the parser fix.
const checkedVersion=item=>/^image\/(?:heic|heif|heic-sequence|heif-sequence)$/i.test(item?.mime||'')||/\.(?:heic|heif)$/i.test(item?.name||'')?'v2':'v1';
export async function enrichCapturePlaces({list,blob,readPlace,readGps,lookup,commit,available,canLookup=available,deferred=new Set(),limit=12}){
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
   if(!canLookup()&&deferred.has(keyOf(item)))continue;
   if(count>=limit)return {more:true,blocked:false};
   count++;
   try{
    let place=known.get(keyOf(item))||null;
    if(!place){
     const original=await blob(item.key);
     if(!(original instanceof Blob)||!original.size||original.size!==item.size||original.type!==item.mime)continue;
     if(item.kind==='photo')place=await readPlace(original);
     if(!place){
      // Offline or before provider configuration, only explicit metadata
      // is needed. Do not scan GPS or persist negative results yet.
      if(!canLookup()){deferred.add(keyOf(item));continue}
      const gps=await readGps(original);
      if(gps){
       if(!available())return {more:true,blocked:true};
       // A stored original can be inspected locally without internet. Do not
       // mark unresolved GPS as checked or delay other local metadata.
       if(!canLookup()){deferred.add(keyOf(item));continue}
       const result=await lookup(gps);
       if(!result?.ok)return {more:true,blocked:true,retryAfterMs:result?.retryAfterMs===3600000?3600000:60000};
       place=result.place;
      }
     }
    }
    if(!available())return {more:true,blocked:true};
    // commit must compare the full snapshot and never recreate a deleted story.
    const updated=await commit(story,i,place);
    if(!updated)break;
    story=updated;
    if(place)known.set(keyOf(item),place);
   }catch(_){ /* optional: never block normal save, read, playback or backup */ }
  }
 }
 return {more:false,blocked:false};
}
export function mountCapturePlaceEnrichment({store,open,done,dbName,readPlace,readGps,enabled}){
 if(!/^talera-free-local-[a-f0-9]{32}-v1$/.test(dbName)||location.pathname!=='/mijn-leven')return;
 const scope=dbName.slice('talera-free-local-'.length,-3);
 let running=false,timer=null,departing=false;
 const available=()=>!departing&&!document.hidden;
 const canLookup=()=>enabled&&available()&&navigator.onLine!==false;
 const deferred=new Set();
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
    if(!response.ok)return {ok:false,retryAfterMs:response.status===429?3600000:60000};
    const result=await response.json();
    if(result.place===null)return {ok:true,place:null};
    return valid(result.place)?{ok:true,place:result.place}:{ok:false};
   }finally{clearTimeout(timeout)}
  }catch(_){return {ok:false}}
 };
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
  return updated;
 };
 const run=async()=>{
  timer=null;if(running||!available())return;
  running=true;
  try{
   const result=await enrichCapturePlaces({list:()=>store.list(),blob:id=>store.blob(id),readPlace,readGps,lookup,commit,available,canLookup,deferred});
   if(result.more&&available()){
    if(!result.blocked)schedule(30000);
    else if(result.retryAfterMs&&canLookup())schedule(result.retryAfterMs);
   }
  }catch(_){}finally{running=false}
 };
 function schedule(ms=250){if(timer!==null||!available())return;timer=setTimeout(run,ms)}
 window.addEventListener('online',()=>schedule());
 window.addEventListener('pagehide',()=>{departing=true;if(timer!==null){clearTimeout(timer);timer=null}});
 window.addEventListener('pageshow',()=>{departing=false;schedule()});
 document.addEventListener('visibilitychange',()=>{if(available())schedule()});
 schedule();
}
