import assert from 'node:assert/strict';
import {capturePlaceApi,selectNearbyPlace} from './f5-geonames.mjs';
const place={name:'Schijndel',countryCode:'NL',fcl:'P',fcode:'PPL',distance:'0.3'};
const postal={postalCodes:[{placeName:'Schijndel',countryCode:'NL',distance:'0.1'}]};
assert.deepEqual(selectNearbyPlace({geonames:[place]},postal),{countryCode:'NL',country:'Nederland',city:'Schijndel',source:'geonames-locality-v2'});
for(const data of [{status:{value:19}},{geonames:[]},{geonames:[{...place,distance:3}]},{geonames:[{...place,countryCode:'ZZ'}]},{geonames:[{...place,name:'<bad>\u0000'}]},{geonames:[{...place,fcode:'PPLX'}]}])assert.equal(selectNearbyPlace(data,postal),null);
let calls=0,allowed=true,actor={id:'account-id'},hits=[];
const scope='a'.repeat(32);
const env={AUTH_STORAGE_JURISDICTION:'local-test',GEONAMES_USERNAME:'talera_test',AUTH_RATES:{idFromName:x=>x,get:key=>({hit:async opts=>{hits.push({key,...opts});return allowed}})}};
const deps={getAccount:async()=>actor,getScope:async()=>scope,fetcher:async(url,opts)=>{
 calls++;assert.equal(url.origin,'https://secure.geonames.org');assert.ok(['/findNearbyPlaceNameJSON','/findNearbyPostalCodesJSON'].includes(url.pathname));assert.equal(url.searchParams.get('lat'),'51.622');assert.equal(url.searchParams.get('lng'),'5.432');assert.equal(url.searchParams.get('localCountry'),'true');assert.equal(url.searchParams.get('username'),'talera_test');assert.equal(opts.redirect,'manual');assert.ok(!url.href.includes(actor.id));return Response.json(url.pathname==='/findNearbyPlaceNameJSON'?{geonames:[place]}:postal)
}};
const req=(input={latitude:51.62172,longitude:5.4322},origin='https://talera.example',localScope=scope)=>new Request('https://talera.example/api/capture-place',{method:'POST',headers:{origin,'content-type':'application/json','x-talera-local-scope':localScope},body:JSON.stringify(input)});
assert.equal((await capturePlaceApi(req(),{},deps)).status,503);
assert.equal((await capturePlaceApi(req(undefined,'https://other.example'),env,deps)).status,403);
assert.equal((await capturePlaceApi(req(undefined,undefined,'b'.repeat(32)),env,deps)).status,403);
actor=null;assert.equal((await capturePlaceApi(req(),env,deps)).status,401);actor={id:'account-id'};
assert.equal((await capturePlaceApi(req({latitude:91,longitude:1}),env,deps)).status,400);
assert.equal((await capturePlaceApi(req({latitude:1,longitude:1,story:'private'}),env,deps)).status,400);
assert.equal(calls,0);
const result=await capturePlaceApi(req(),env,deps);
assert.equal(result.status,200);assert.equal((await result.json()).place.city,'Schijndel');assert.equal(calls,2);
assert.equal(hits[0].limit,24);assert.equal(hits[1].limit,72);
allowed=false;assert.equal((await capturePlaceApi(req(),env,deps)).status,429);assert.equal(calls,2);
console.log('TALERA_GEONAMES_AUTH_SCOPE_LIMIT_PRIVACY_CONTRACT_PASS');

import {enrichCapturePlaces,mountCapturePlaceEnrichment} from './f5-capture-place-enrichment.mjs';
import {createOfflineCountryResolver} from './f5-offline-country.mjs';
import {readFileSync} from 'node:fs';
const countryResolver=createOfflineCountryResolver(JSON.parse(readFileSync(new URL('./f5-offline-country-data.json',import.meta.url),'utf8')));
// Geographic fixtures are public coordinates, never the user's photos or position.
for(const [countryCode,latitude,longitude] of [
 ['FR',48.8566,2.3522],['NL',51.59,5.32],['DE',52.52,13.405],['ES',40.4168,-3.7038],
 ['IT',41.902,12.496],['NO',59.91,10.75],['GB',51.5074,-.1278],['BE',50.85,4.35],
 ['US',38.9072,-77.0369],['CA',45.42,-75.69],['BR',-15.79,-47.88],['KE',-1.29,36.82],
 ['IN',28.61,77.21],['JP',35.68,139.65],['AU',-33.8688,151.2093],['NZ',-41.29,174.78],
 ['FJ',-17.8,178.0]
]){
 const place=countryResolver({latitude,longitude});
 assert.deepEqual(place,{countryCode,country:new Intl.DisplayNames(['nl'],{type:'region',fallback:'none'}).of(countryCode),city:'',source:'offline-country-v1'});
}
for(const gps of [{latitude:0,longitude:0},{latitude:48.57,longitude:7.79},{latitude:91,longitude:0},{latitude:NaN,longitude:0},{latitude:0,longitude:181},{}])assert.equal(countryResolver(gps),null);
console.log('TALERA_OFFLINE_COUNTRY_17_COUNTRIES_BORDER_OCEAN_INVALID_PASS');
const original=new Blob(['gps'],{type:'image/jpeg'});
const record={id:'story-a',source:'pwa-local',items:[{key:'photo-a',kind:'photo',mime:'image/jpeg',size:3,name:'a.jpg'}]};
const duplicate={...record,id:'story-b',items:[{...record.items[0]}]};
let catalog=[structuredClone(record),structuredClone(duplicate)],requests=0,writes=0,online=false,fail=false,deleted=false;
const resolved={countryCode:'NL',country:'Nederland',city:'Schijndel',source:'geonames-locality-v2'};
const options={list:async()=>structuredClone(catalog),blob:async()=>original,
 readPlace:async()=>null,readGps:async()=>({latitude:51.62,longitude:5.43}),
 available:()=>online,lookup:async()=>{requests++;return fail?{ok:false}:{ok:true,place:resolved}},
 commit:async(expected,index,value,reason)=>{
  if(deleted)return null;
  const current=catalog.find(x=>x.id===expected.id);
  assert.deepEqual(current,expected);writes++;
  if(value)current.items[index].capturePlace=value;else current.items[index].capturePlaceChecked=reason==='no-country'?'v5-no-country':'v4-no-readable-gps';
  return structuredClone(current);
 }};
await enrichCapturePlaces(options);assert.equal(requests,0);assert.equal(writes,0);
online=true;fail=true;const temporary=await enrichCapturePlaces(options);assert.deepEqual(temporary,{more:true,blocked:true,retryAfterMs:60000});assert.equal(requests,1);assert.equal(writes,0);
fail=false;await enrichCapturePlaces(options);assert.equal(requests,2);assert.equal(writes,2);
assert.deepEqual(catalog[0].items[0].capturePlace,resolved);
assert.deepEqual(catalog[1].items[0].capturePlace,resolved);
await enrichCapturePlaces(options);assert.equal(requests,2);assert.equal(writes,2);
catalog=[structuredClone(record)];deleted=true;await enrichCapturePlaces(options);assert.equal(writes,2);assert.equal(catalog[0].items[0].capturePlace,undefined);
deleted=false;catalog=[structuredClone(record)];await enrichCapturePlaces({...options,readGps:async()=>null});
assert.equal(catalog[0].items[0].capturePlaceChecked,'v4-no-readable-gps');
const before=requests;await enrichCapturePlaces(options);assert.equal(requests,before);
console.log('TALERA_GEONAMES_LOCAL_ENRICHMENT_OFFLINE_RETRY_DEDUP_PASS');

// A legacy original may contain a reliable explicit place while offline.
// Only the library enriches it; GPS remains pending until networking is enabled.
const legacyPhoto={...record,id:'legacy-iptc',items:[{...record.items[0],key:'iptc-photo'}]};
const pendingGps={...record,id:'pending-gps',items:[{...record.items[0],key:'gps-photo'}]};
const iptc={...resolved,source:'iptc-location-created'};
const iptcBlob=new Blob(['ipt'],{type:'image/jpeg'});
catalog=[structuredClone(pendingGps),structuredClone(legacyPhoto)];
const deferred=new Set();let offlineLookups=0;
const localOptions={...options,available:()=>true,canLookup:()=>false,deferred,limit:1,
 blob:async id=>id==='iptc-photo'?iptcBlob:original,readPlace:async blob=>blob===iptcBlob?iptc:null,
 lookup:async()=>{offlineLookups++;return {ok:true,place:resolved}}};
assert.equal((await enrichCapturePlaces(localOptions)).more,true);
assert.equal(catalog[0].items[0].capturePlaceChecked,undefined);
assert.equal((await enrichCapturePlaces(localOptions)).more,false);
assert.deepEqual(catalog[1].items[0].capturePlace,iptc);
assert.equal(offlineLookups,0);
await enrichCapturePlaces({...localOptions,canLookup:()=>true});
assert.deepEqual(catalog[0].items[0].capturePlace,resolved);
assert.equal(offlineLookups,1);
console.log('TALERA_LIBRARY_FIRST_LOCAL_METADATA_OFFLINE_AND_GPS_DEFERRED_PASS');

// Rate limit does not mark an original as resolved and must back off for a full hour.
catalog=[structuredClone(record)];const rateLimited=await enrichCapturePlaces({...options,lookup:async()=>({ok:false,retryAfterMs:3600000})});assert.deepEqual(rateLimited,{more:true,blocked:true,retryAfterMs:3600000});assert.equal(catalog[0].items[0].capturePlaceChecked,undefined);assert.equal(catalog[0].items[0].capturePlace,undefined);
console.log('TALERA_GEONAMES_TRANSIENT_AND_QUOTA_BACKOFF_PASS');

// Old proximity-only values and negative markers are rechecked once; old
// confirmed explicit metadata remains untouched.
const legacy={...record,id:'legacy-location',items:[{...record.items[0],capturePlace:{...resolved,city:'Breukelen',source:'geonames-nearby-place'}}]};
const oldNegative={...record,id:'legacy-negative',items:[{...record.items[0],key:'legacy-negative',capturePlaceChecked:'v2'}]};
const legacyV3={...record,id:'legacy-v3',items:[{...record.items[0],key:'legacy-v3',capturePlaceChecked:'v3'}]};
const currentNegative={...record,id:'current-negative',items:[{...record.items[0],key:'current-negative',capturePlaceChecked:'v4-no-readable-gps'}]};
catalog=[legacy,oldNegative,legacyV3,currentNegative].map(x=>structuredClone(x));
let retries=0;
const retryOptions={...options,lookup:async()=>{retries++;return {ok:true,place:resolved}}};
await enrichCapturePlaces(retryOptions);assert.equal(retries,3);
for(const index of [0,1,2])assert.deepEqual(catalog[index].items[0].capturePlace,resolved);
assert.equal(catalog[3].items[0].capturePlace,undefined);
await enrichCapturePlaces(retryOptions);assert.equal(retries,3);
console.log('TALERA_OLD_LOCALITY_RECHECK_ONCE_PASS');
 // Coordinates exist yet the provider cannot safely identify a locality.
 // Preserve that reason and do not repeat a request on every screen.
 catalog=[structuredClone(record)];
 let unknownPlaceRequests=0;
 const noPlace={...options,lookup:async()=>{unknownPlaceRequests++;return {ok:true,place:null}}};
 await enrichCapturePlaces(noPlace);
 assert.equal(catalog[0].items[0].capturePlaceChecked,'v5-no-country');
 assert.equal(catalog[0].items[0].capturePlace,undefined);
 await enrichCapturePlaces(noPlace);assert.equal(unknownPlaceRequests,1);
 console.log('TALERA_GPS_FOUND_BUT_UNRESOLVED_LOCATION_DISTINCT_NEGATIVE_PASS');


// Invalid historical originals cannot occupy every slot of every bounded batch.
const brokenItems=Array.from({length:3},(_,i)=>({...record.items[0],key:'unreadable-'+i}));
catalog=[{...record,id:'old-unreadable',items:brokenItems},{...record,id:'healthy-after-old',items:[{...record.items[0],key:'healthy'}]}].map(x=>structuredClone(x));
const unreadable=new Set();let goodLookups=0;
const independent={...options,unreadable,limit:2,blob:async id=>{if(id==='unreadable-0')throw Error('TALERA_LIBRARY_INVALID_SHARED_ORIGINAL');if(id.startsWith('unreadable-'))return null;return original;},lookup:async()=>{goodLookups++;return {ok:true,place:resolved}}};
assert.equal((await enrichCapturePlaces(independent)).more,true);
assert.equal(unreadable.size,2);
assert.equal((await enrichCapturePlaces(independent)).more,false);
assert.equal(goodLookups,1);
assert.deepEqual(catalog[1].items[0].capturePlace,resolved);
assert.ok(catalog[0].items.every(x=>!x.capturePlace&&!x.capturePlaceChecked));
console.log('TALERA_UNREADABLE_HISTORICAL_MEDIA_DO_NOT_STARVE_LATER_GPS_PASS');

// TEMPORARY diagnostic contracts: codes only; failed lookups do not mark/write.
catalog=[structuredClone(record)];const diagnosticCodes=[];
await enrichCapturePlaces({...options,diagnose:(key,code)=>diagnosticCodes.push(code),lookup:async()=>({ok:false,diagnostic:'api-503'})});
assert.deepEqual(diagnosticCodes,['bestand-lezen','gps-gevonden','land-lokaal-bepalen','api-503']);
assert.equal(catalog[0].items[0].capturePlace,undefined);
assert.equal(catalog[0].items[0].capturePlaceChecked,undefined);
catalog=[structuredClone(record)];diagnosticCodes.length=0;
await enrichCapturePlaces({...options,diagnose:(key,code)=>diagnosticCodes.push(code),readGps:async()=>null});
assert.deepEqual(diagnosticCodes,['bestand-lezen','gps-niet-herkend']);
console.log('TALERA_LOCATION_TEMPORARY_SAFE_DIAGNOSTIC_CODES_PASS');

// Reproduce a stalled queue: first original fails, second must be visited
// on the first allowed retry instead of the same item monopolising all scans.
const stuck={...record,id:'stuck',items:[{...record.items[0],key:'stuck'}]};
const healthy={...record,id:'healthy',items:[{...record.items[0],key:'healthy'}]};
catalog=[structuredClone(stuck),structuredClone(healthy)];const retryItems=new Map();let clock=1000,attempts=[];const queueOptions={...options,retryItems,now:()=>clock,blob:async key=>new Blob([key==='stuck'?'bad':'gps'],{type:'image/jpeg'}),readGps:async blob=>({latitude:(await blob.text())==='bad'?1:2,longitude:0}),lookup:async gps=>{attempts.push(gps.latitude);return gps.latitude===1?{ok:false,diagnostic:'api-503'}:{ok:true,place:resolved}}};
const failedScan=await enrichCapturePlaces(queueOptions);assert.equal(failedScan.retryAfterMs,60000);assert.equal(failedScan.diagnostic,'api-503');assert.deepEqual(attempts,[1]);
clock+=60000;await enrichCapturePlaces(queueOptions);assert.deepEqual(attempts,[1,2]);assert.deepEqual(catalog[1].items[0].capturePlace,resolved);assert.equal(catalog[0].items[0].capturePlaceChecked,undefined);
clock+=60000;await enrichCapturePlaces(queueOptions);assert.deepEqual(attempts,[1,2,1]);
console.log('TALERA_LIBRARY_FAILED_ORIGINAL_DOES_NOT_MONOPOLISE_RETRY_QUEUE_PASS');

// Invalid historical row and optional IPTC failure cannot stop intact GPS.
catalog=[{id:'broken',source:'pwa-local',items:[null]}, {id:'malformed',source:'pwa-local',items:{}},structuredClone(record)];
await enrichCapturePlaces({...options,readPlace:async()=>{throw Error('bad optional XMP')}});
assert.deepEqual(catalog[2].items[0].capturePlace,resolved);
await assert.rejects(enrichCapturePlaces({...options,list:async()=>null}),/CAPTURE_INVALID_CATALOG_LIST/);
// Production uses the EU rate namespace; the mock must prove it is selected.
allowed=true;let eu=0;const euEnv={...env,AUTH_STORAGE_JURISDICTION:'eu',AUTH_RATES:{...env.AUTH_RATES,jurisdiction:region=>{assert.equal(region,'eu');eu++;return env.AUTH_RATES}}};
const euResult=await capturePlaceApi(req(),euEnv,deps);assert.equal(euResult.status,200);assert.equal(eu,1);
const noRegion=await capturePlaceApi(req(),{...env,AUTH_STORAGE_JURISDICTION:'eu'},deps);assert.equal(noRegion.status,503);assert.equal((await noRegion.json()).diagnostic,'api-limiet-opslag');
for(const [fetcher,code] of [[async()=>new Response('',{status:502}),'api-provider-http'],[async()=>Response.json({status:{value:10}}),'api-provider-status'],[async()=>Response.json({unexpected:true}),'api-provider-antwoord'],[async()=>{throw Error('private upstream message')},'api-provider-netwerk']]){
 const response=await capturePlaceApi(req(),euEnv,{...deps,fetcher});assert.equal(response.status,503);assert.deepEqual(await response.json(),{place:null,diagnostic:code});
}
console.log('TALERA_LOCATION_MALFORMED_ROW_IPTC_AND_EU_PROVIDER_FAILURE_CONTRACT_PASS');

// Reject redirections without forwarding the provider credential or GPS.
let redirects=0;const redirected=await capturePlaceApi(req(),euEnv,{...deps,fetcher:async(url,opts)=>{redirects++;assert.equal(opts.redirect,'manual');return new Response(null,{status:302,headers:{location:'https://untrusted.example/'}})}});
assert.equal(redirected.status,503);assert.equal((await redirected.json()).diagnostic,'api-provider-http');assert.equal(redirects,1);
console.log('TALERA_GEONAMES_WORKER_COMPATIBLE_MANUAL_REDIRECT_FAIL_CLOSED_PASS');

// Public place names, simulated provider distances: never hardcode a town.
const populated=(name,distance,fcode='PPL',countryCode='NL')=>({name,distance,fcode,countryCode,fcl:'P'});
const post=(placeName,distance,countryCode='NL')=>({placeName,distance,countryCode});
const choose=(geonames,postalCodes)=>selectNearbyPlace({geonames},{postalCodes});
const breukelen=populated('Breukelen',0.12),boxtel=populated('Boxtel',0.7);
assert.equal(choose([breukelen,boxtel],[post('Boxtel',0.06)])?.city,'Boxtel');
assert.equal(choose([breukelen,boxtel],[post('Boxtel',0.06),post('Lennisheuvel',0.12)]),null);
assert.equal(choose([populated('Breukelen',0.12),populated('Maarssen',1.7)],[post('Breukelen',0.08)])?.city,'Breukelen');
assert.equal(choose([populated('Liempde',0.14),boxtel],[post('Liempde',0.05)])?.city,'Liempde');
assert.equal(choose([populated('Montmartre',0.1,'PPLX','FR'),populated('Paris',1.1,'PPLC','FR')],[post('Paris',0.05,'FR')])?.city,'Paris');
assert.equal(choose([populated('District',0.1,'PPLX','US')],[post('District',0.1,'US')]),null);
assert.equal(choose([breukelen,boxtel],[]),null);
assert.equal(choose([populated('Accra',0.1,'PPLC','GH')],[])?.city,'Accra');
assert.equal(choose([populated('Other',0.05,'PPL','GH'),populated('Accra',0.1,'PPLC','GH')],[]),null);
console.log('TALERA_LOCALITY_POSTAL_CORROBORATION_AND_SMALL_VILLAGE_PASS');


// Navigation while any optional step is awaiting: abandon this scan, not the
// original, do not mark negative metadata, and allow the next page to retry.
for(const phase of ['blob','readPlace','readGps','lookup']){
 catalog=[structuredClone(record)];
 let visible=true,after=0;
 const retryItems=new Map(),deferred=new Set(),unreadable=new Set();
 const callbacks={
  blob:async()=>{if(phase==='blob')visible=false;return original},
  readPlace:async()=>{if(phase==='readPlace'){visible=false;throw Error('CAPTURE_READ_ABORTED')}return null},
  readGps:async()=>{if(phase==='readGps'){visible=false;throw Error('CAPTURE_READ_ABORTED')}return {latitude:51.62,longitude:5.43}},
  lookup:async()=>{if(phase==='lookup')visible=false;return {ok:true,place:resolved}},
  commit:async()=>{after++;throw Error('must not commit after navigation')}
 };
 const paused=await enrichCapturePlaces({...options,...callbacks,available:()=>visible,canLookup:()=>visible,retryItems,deferred,unreadable});
 assert.deepEqual(paused,{more:true,blocked:true},phase);
 assert.equal(after,0,phase);assert.equal(retryItems.size,0,phase);
 assert.equal(deferred.size,0,phase);assert.equal(unreadable.size,0,phase);
 assert.deepEqual(catalog,[structuredClone(record)],phase);
 visible=true;
 await enrichCapturePlaces({...options,available:()=>visible,canLookup:()=>visible,retryItems,deferred,unreadable});
 assert.deepEqual(catalog[0].items[0].capturePlace,resolved,phase);
}
console.log('TALERA_CAPTURE_NAVIGATION_INTERRUPTION_RETRY_PASS');

 // Exercise the actual mounting lifecycle, including a restored page. No
 // browser test error filter, no navigation delay and no original replacement.
 {
  const names=['window','document','location'];
  const originals=new Map(names.map(n=>[n,Object.getOwnPropertyDescriptor(globalThis,n)]));
  const win=new EventTarget(),doc=new EventTarget();
  win.top=win;doc.hidden=false;
  for(const [n,v] of Object.entries({window:win,document:doc,location:{pathname:'/tell'}}))
   Object.defineProperty(globalThis,n,{configurable:true,writable:true,value:v});
  let firstResolve,secondResolve,firstSignal,secondSignal,reads=0,opened=0,finishes=[];
  const first=new Promise(resolve=>{firstResolve=resolve});
  const second=new Promise(resolve=>{secondResolve=resolve});
  try{
   mountCapturePlaceEnrichment({
    dbName:'talera-free-local-'+'a'.repeat(32)+'-v1',resolveCountry:countryResolver,
    store:{list:async()=>{throw Error('optional work must not list the full catalog')},blob:async()=>original},
    workIndex:{
     claim:async()=>({entry:{story:record.id,key:record.items[0].key,signature:JSON.stringify([record.items[0].key,record.items[0].kind,record.items[0].size,record.items[0].mime,record.items[0].name]),attempts:0},row:structuredClone(record),token:'test'}),
     finish:async(_entry,result)=>{finishes.push(result);return false}
    },
    open:async()=>{opened++;throw Error('no transaction during interrupted read')},
    done:()=>{throw Error('unexpected transaction')},
    readPlace:async(blob,signal)=>{
     assert.strictEqual(blob,original);assert.equal(signal.aborted,false);
     if(++reads===1){
      firstSignal=signal;firstResolve();
      return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('CAPTURE_READ_ABORTED')),{once:true}));
     }
     secondSignal=signal;secondResolve();return null;
    },
    readGps:async()=>{throw Error('interrupted scan must not commit')}
   });
   await first;
   win.dispatchEvent(new Event('beforeunload'));assert.equal(firstSignal.aborted,true);
   win.dispatchEvent(new Event('pagehide'));
   win.dispatchEvent(new Event('pageshow'));
   await second;
   assert.notStrictEqual(secondSignal,firstSignal);
   // The callback above proves the fresh signal was active when reading began.
   assert.equal(reads,2);assert.equal(opened,0);
   assert.deepEqual(finishes,[{kind:'offline'}]);
   win.dispatchEvent(new Event('pagehide'));
  }finally{
   for(const [name,descriptor] of originals)
    if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
  }
 }
 console.log('TALERA_CAPTURE_MOUNT_PAGEHIDE_PAGESHOW_RETRY_PASS');

// The actual installed candidate must finish recognition on a disconnected
// device. No external API, no private catalog write and no current location.
{
 const names=['window','document','location','navigator','fetch'];
 const originals=new Map(names.map(n=>[n,Object.getOwnPropertyDescriptor(globalThis,n)]));
 const win=new EventTarget(),doc=new EventTarget();win.top=win;doc.hidden=false;
 const nav={onLine:false},tagged=new Blob([Uint8Array.of(1)],{type:'image/jpeg'}),plain=new Blob([Uint8Array.of(2)],{type:'image/jpeg'}),gps=new Blob([Uint8Array.of(3)],{type:'image/jpeg'}),ocean=new Blob([Uint8Array.of(4)],{type:'image/jpeg'});
 let requests=0,reads=0,lookups=0;
 const local={countryCode:'NL',country:'Nederland',city:'',source:'offline-country-v1'};
 try{
  for(const [n,v] of Object.entries({window:win,document:doc,location:{pathname:'/tell'},navigator:nav,
   fetch:async()=>{requests++;throw Error('No location network request permitted')}}))
   Object.defineProperty(globalThis,n,{configurable:true,writable:true,value:v});
  const store={list:async()=>[]};
  mountCapturePlaceEnrichment({dbName:'talera-free-local-'+'b'.repeat(32)+'-v1',resolveCountry:gps=>{lookups++;return countryResolver(gps)},store,
   open:()=>{throw Error('draft inspection must not create a catalog row')},done:()=>{},
   readPlace:async original=>{reads++;return original===tagged?iptc:null},
   readGps:async original=>original===gps?{latitude:51.985,longitude:5.88}:original===ocean?{latitude:0,longitude:0}:null});
  const signal=new AbortController().signal;
  assert.deepEqual(await store.inspectDraftCapturePlace(tagged,'photo',signal,true),{state:'known',place:iptc});
  assert.deepEqual(await store.inspectDraftCapturePlace(plain,'photo',signal,true),{state:'unknown',reason:'no-readable-gps'});
  assert.deepEqual(await store.inspectDraftCapturePlace(gps,'photo',signal,true),{state:'known',place:local});
  assert.deepEqual(await store.inspectDraftCapturePlace(gps,'photo',signal),{state:'known',place:local});
  assert.deepEqual(await store.inspectDraftCapturePlace(ocean,'photo',signal,true),{state:'unknown',reason:'no-country'});
  assert.deepEqual(await store.inspectDraftCapturePlace(ocean,'photo',signal),{state:'unknown',reason:'no-country'});
  assert.equal(lookups,2);assert.equal(reads,4);assert.equal(requests,0);
  const device={latitude:51.985,longitude:5.88};
  assert.deepEqual(await store.lookupConfirmedDevicePlace(device,signal),{ok:true,place:local});
  assert.deepEqual(await store.lookupConfirmedDevicePlace({...device,latitude:91},signal),{ok:false});
  assert.deepEqual(await store.inspectDraftCapturePlace(plain,'photo',signal),{state:'unknown',reason:'no-readable-gps'});
  assert.equal(lookups,3);assert.equal(requests,0);
  const canceled=new AbortController();canceled.abort();
  assert.deepEqual(await store.inspectDraftCapturePlace(gps,'photo',canceled.signal),{state:'pending'});
  win.dispatchEvent(new Event('pagehide'));
 }finally{
  for(const [n,d] of originals)if(d)Object.defineProperty(globalThis,n,d);else delete globalThis[n];
 }
}
console.log('TALERA_DRAFT_INSPECTION_GPS_COUNTRY_OFFLINE_NO_CATALOG_WRITE_NO_NETWORK_PASS');
