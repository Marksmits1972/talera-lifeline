// Optional local catalog enrichment. No GPS persistence, no new store and no media uploads.
// The caller supplies the existing account-local library and its transaction owner.
export async function enrichCapturePlaces({list,blob,readPlace,readGps,lookup,commit,available,limit=12}){
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
   if(!item||!['photo','video'].includes(item.kind)||typeof item.key!=='string'||item.capturePlace||item.capturePlaceChecked==='v1')continue;
   if(!available())return {more:true,blocked:true};
   if(count>=limit)return {more:true,blocked:false};
   count++;
   try{
    let place=known.get(keyOf(item))||null;
    if(!place){
     const original=await blob(item.key);
     if(!(original instanceof Blob)||!original.size||original.size!==item.size||original.type!==item.mime)continue;
     if(item.kind==='photo')place=await readPlace(original);
     if(!place){
      const gps=await readGps(original);
      if(gps){
       if(!available())return {more:true,blocked:true};
       const result=await lookup(gps);
       if(!result?.ok)return {more:true,blocked:true};
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
 if(!enabled||!/^talera-free-local-[a-f0-9]{32}-v1$/.test(dbName)||location.pathname!=='/mijn-leven')return;
 const scope=dbName.slice('talera-free-local-'.length,-3);
 let running=false,timer=null,departing=false;
 const available=()=>!departing&&!document.hidden&&navigator.onLine!==false;
 const safe=s=>typeof s==='string'&&s.length>0&&s.length<=120&&!/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(s);
 const valid=p=>{
  if(!p||p.source!=='geonames-nearby-place'||!/^[A-Z]{2}$/.test(p.countryCode)||p.countryCode==='ZZ'||!safe(p.city)||!safe(p.country))return false;
  try{return new Intl.DisplayNames(['nl'],{type:'region',fallback:'none'}).of(p.countryCode)===p.country}catch(_){return false}
 };
 const lookup=async gps=>{
  try{
   const response=await fetch('/api/capture-place',{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json','x-talera-local-scope':scope},
    body:JSON.stringify({latitude:gps.latitude,longitude:gps.longitude}),signal:AbortSignal.timeout(8000)});
   if(!response.ok)return {ok:false};
   const result=await response.json();
   if(result.place===null)return {ok:true,place:null};
   return valid(result.place)?{ok:true,place:result.place}:{ok:false};
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
   if(!item||item.capturePlace||item.capturePlaceChecked==='v1')return;
   if(place)item.capturePlace=place;
   else item.capturePlaceChecked='v1';
   rows.put(current);updated=current;
  };
  await finished;
  return updated;
 };
 const run=async()=>{
  timer=null;if(running||!available())return;
  running=true;
  try{
   const result=await enrichCapturePlaces({list:()=>store.list(),blob:id=>store.blob(id),readPlace,readGps,lookup,commit,available});
   if(result.more&&!result.blocked&&available())schedule(30000);
  }catch(_){}finally{running=false}
 };
 function schedule(ms=2000){if(timer!==null||!available())return;timer=setTimeout(run,ms)}
 window.addEventListener('online',()=>schedule());
 window.addEventListener('pagehide',()=>{departing=true;if(timer!==null){clearTimeout(timer);timer=null}});
 window.addEventListener('pageshow',()=>{departing=false;schedule()});
 document.addEventListener('visibilitychange',()=>{if(available())schedule()});
 schedule();
}
