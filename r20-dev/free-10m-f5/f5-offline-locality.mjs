// GeoNames cities500, CC BY 4.0 — https://www.geonames.org/.
// Read the one immutable public dataset, never transmit coordinates.
export function createOfflineLocalityResolver(buffer){
 const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),slots=676,head=16+slots*8,record=14,scale=100000;
 if(bytes.length<head||String.fromCharCode(...bytes.subarray(0,8))!=='TLPLC001')throw Error('INVALID_LOCALITY_DATA');
 const count=view.getUint32(8,true),nameBytes=view.getUint32(12,true),names=head+count*record;
 if(count<1||names+nameBytes!==bytes.length)throw Error('INVALID_LOCALITY_LENGTH');
 let expected=0;
 for(let slot=0;slot<slots;slot++){
  const first=view.getUint32(16+slot*8,true),n=view.getUint32(20+slot*8,true);
  if(n&&(first!==expected||first+n>count))throw Error('INVALID_LOCALITY_DIRECTORY');
  expected+=n;
 }
 if(expected!==count)throw Error('INVALID_LOCALITY_DIRECTORY');
 const decoder=new TextDecoder('utf-8',{fatal:true}),rad=Math.PI/180;
 const getLat=i=>view.getInt32(head+i*record,true);
 const distance=(lat,lon,bLat,bLon)=>{
  const y=(bLat-lat)*rad,x=(((bLon-lon+540)%360)-180)*rad;
  const a=Math.sin(y/2)**2+Math.cos(lat*rad)*Math.cos(bLat*rad)*Math.sin(x/2)**2;
  return 12742*Math.asin(Math.sqrt(Math.min(1,Math.max(0,a))));
 };
 const name=i=>{
  const p=head+i*record,off=view.getUint32(p+8,true),len=view.getUint16(p+12,true);
  if(!len||off+len>nameBytes)throw Error('INVALID_LOCALITY_NAME');
  const label=decoder.decode(bytes.subarray(names+off,names+off+len));
  if(label.length>120||/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(label))throw Error('INVALID_LOCALITY_NAME');
  return label;
 };
 // Only recognise a nearby populated centre within already-confirmed country.
 // A point gazetteer is NOT a settlement boundary: always label the vicinity.
 return (gps,countryCode)=>{
  const lat=gps?.latitude,lon=gps?.longitude;
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180||!/^[A-Z]{2}$/.test(countryCode))return null;
  const slot=(countryCode.charCodeAt(0)-65)*26+countryCode.charCodeAt(1)-65;
  const start=view.getUint32(16+slot*8,true),n=view.getUint32(20+slot*8,true);
  let lo=start,hi=start+n;const min=(lat-0.046)*scale,max=(lat+0.046)*scale;
  while(lo<hi){const mid=(lo+hi)>>>1;if(getLat(mid)<min)lo=mid+1;else hi=mid}
  let best=Infinity,bestName='',second=Infinity;
  // Do not use population or an arbitrarily large search radius to invent
  // a city in wilderness. Near-equal distinct candidates remain country-only.
  for(let i=lo;i<start+n&&getLat(i)<=max;i++){
   const p=head+i*record,bLat=getLat(i)/scale,bLon=view.getInt32(p+4,true)/scale;
   if(Math.abs(bLat)>90||Math.abs(bLon)>180)throw Error('INVALID_LOCALITY_COORDINATE');
   const d=distance(lat,lon,bLat,bLon);
   if(d>3||d>Math.max(best,second))continue;
   const candidate=name(i);
   if(candidate===bestName){best=Math.min(best,d);continue}
   if(d<best){second=best;best=d;bestName=candidate}
   else if(d<second)second=d;
  }
  if(!bestName||best>3||second-best<Math.max(0.12,best*0.20))return null;
  return bestName;
 };
}
export function createOfflineLocalityLoader(url,bytes,fetcher=fetch){
 // No URL contains GPS, an account identifier or user input. Same immutable
 // public asset shared by the existing service-worker/HTTP cache.
 if(!/^\/__talera_free\/places-[a-f0-9]{64}\.bin$/.test(url)||!Number.isInteger(bytes)||bytes<1||bytes>12000000)throw Error('INVALID_LOCALITY_ASSET');
 let installed=null,loading=null,retryAt=0;
 return async(gps,place)=>{
  if(!place?.countryCode||place.source!=='offline-country-v1')return {ready:true,place};
  if(!installed){
   if(Date.now()<retryAt)return {ready:false,place};
   loading??=(async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
     const response=await fetcher(url,{credentials:'omit',cache:'force-cache',signal:controller.signal,redirect:'error'});
     if(!response?.ok||!String(response.headers.get('content-type')).includes('application/octet-stream'))throw Error('LOCALITY_ASSET_NOT_AVAILABLE');
     const buffer=await response.arrayBuffer();
     if(buffer.byteLength!==bytes)throw Error('LOCALITY_ASSET_LENGTH');
     installed=createOfflineLocalityResolver(buffer);
    }catch(_){retryAt=Date.now()+30000}
    finally{clearTimeout(timer);loading=null}
   })();
   await loading;
  }
  if(!installed)return {ready:false,place};
  const city=installed(gps,place.countryCode);
  return {ready:true,place:city?{...place,city,source:'offline-locality-v1'}:place};
 };
}

// GeoNames allCountries independent settlements; no per-photo geocoding.
// The published small resolver has absolute priority. Only its misses request
// an immutable public group, never an account, GPS, filename or photo token.
// One expanded resolver is resident at a time, and public bytes are cached
// separately from private shell/account state.
export function createOfflineWorldLocalityLoader(baseUrl,baseBytes,parts,fetcher=fetch,cacheStorage=globalThis.caches,clock=Date.now){
 const baseline=createOfflineLocalityLoader(baseUrl,baseBytes,fetcher);
 const byCountry=new Map(),seen=new Set();
 for(const part of parts){
  if(!part||!/^[a-f0-9]{64}$/.test(part.sha256)||!Number.isInteger(part.bytes)||part.bytes<1||part.bytes>24*1024*1024||seen.has(part.sha256)||!Array.isArray(part.countries)||!part.countries.length)
   throw Error('INVALID_WORLD_LOCALITY_PART');
  seen.add(part.sha256);
  for(const cc of part.countries){
   if(!/^[A-Z]{2}$/.test(cc)||byCountry.has(cc))throw Error('INVALID_WORLD_LOCALITY_DIRECTORY');
   byCountry.set(cc,part);
  }
 }
 let resident=null,queue=Promise.resolve();
 const failures=new Map();
 const cacheName='talera-free-public-places-v1';
 const responseHeaders={'content-type':'application/octet-stream','cache-control':'public, max-age=31536000, immutable'};
 const cacheBound=async task=>{
  let timer;
  try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('WORLD_LOCALITY_CACHE_TIMEOUT')),5000)})])}
  finally{clearTimeout(timer)}
 };
 const attemptCache=async()=>{try{return await cacheBound(cacheStorage?.open(cacheName))}catch{return null}};
 const validate=async(response,part)=>{
  if(!response?.ok||!String(response.headers.get('content-type')).toLowerCase().includes('application/octet-stream'))throw Error('WORLD_LOCALITY_ASSET_NOT_AVAILABLE');
  const length=response.headers.get('content-length');
  if(length!==null&&!response.headers.get('content-encoding')&&Number(length)!==part.bytes)throw Error('WORLD_LOCALITY_ASSET_LENGTH');
  const buffer=await response.arrayBuffer();
  if(buffer.byteLength!==part.bytes)throw Error('WORLD_LOCALITY_ASSET_LENGTH');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==part.sha256)throw Error('WORLD_LOCALITY_ASSET_DIGEST');
  return {buffer,resolve:createOfflineLocalityResolver(buffer)};
 };
 const getPart=async(part)=>{
  if(resident?.sha256===part.sha256)return resident.resolve;
  if(clock()<(failures.get(part.sha256)||0))return null;
  resident=null;
  const url='/__talera_free/assets/places-'+part.sha256+'.bin';
  const cache=await attemptCache();
  try{
   let data=null;
   try{
    const cached=await cacheBound(cache?.match(url));
    if(cached){
     try{data=await validate(cached,part)}
     catch{await cacheBound(cache.delete(url)).catch(()=>{});}
    }
   }catch{/* Cache failure is not a negative geographic result. */}
   if(!data){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
    try{
     const response=await fetcher(url,{credentials:'omit',cache:failures.has(part.sha256)?'reload':'force-cache',signal:controller.signal,redirect:'error',referrerPolicy:'no-referrer'});
     data=await validate(response,part);
    }finally{clearTimeout(timer)}
    if(cache)try{await cacheBound(cache.put(url,new Response(data.buffer,{headers:responseHeaders})))}catch{/* Browser storage quota may be unavailable. */}
   }
   resident={sha256:part.sha256,resolve:data.resolve};
   failures.delete(part.sha256);
   return resident.resolve;
  }catch{failures.set(part.sha256,clock()+30000);return null}
 };
 return async(gps,place)=>{
  if(!place?.countryCode||place.source!=='offline-country-v1'||place.city)return {ready:true,place};
  if(!Number.isFinite(gps?.latitude)||!Number.isFinite(gps?.longitude)||Math.abs(gps.latitude)>90||Math.abs(gps.longitude)>180)return {ready:true,place};
  const old=await baseline(gps,place);
  if(!old.ready||old.place?.city)return old;
  const part=byCountry.get(place.countryCode);
  if(!part)return old;
  const run=queue.then(async()=>{
   const resolve=await getPart(part);
   if(!resolve)return {ready:false,place};
   const city=resolve(gps,place.countryCode);
   return {ready:true,place:city?{...place,city,source:'offline-locality-v1'}:place};
  });
  queue=run.then(()=>undefined,()=>undefined);
  return run;
 };
}
