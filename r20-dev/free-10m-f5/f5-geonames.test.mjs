import assert from 'node:assert/strict';
import {capturePlaceApi,selectNearbyPlace} from './f5-geonames.mjs';
const place={name:'Schijndel',countryCode:'NL',fcl:'P',distance:'0.3'};
assert.deepEqual(selectNearbyPlace({geonames:[place]}),{countryCode:'NL',country:'Nederland',city:'Schijndel',source:'geonames-nearby-place'});
for(const data of [{status:{value:19}},{geonames:[]},{geonames:[{...place,distance:3}]},{geonames:[{...place,countryCode:'ZZ'}]},{geonames:[{...place,name:'<bad>\u0000'}]},{geonames:[place,{...place,name:'Another',distance:'0.4'}]}])assert.equal(selectNearbyPlace(data),null);
let calls=0,allowed=true,actor={id:'account-id'},hits=[];
const scope='a'.repeat(32);
const env={GEONAMES_USERNAME:'talera_test',AUTH_RATES:{idFromName:x=>x,get:key=>({hit:async opts=>{hits.push({key,...opts});return allowed}})}};
const deps={getAccount:async()=>actor,getScope:async()=>scope,fetcher:async(url,opts)=>{
 calls++;assert.equal(url.origin,'https://secure.geonames.org');assert.equal(url.pathname,'/findNearbyPlaceNameJSON');assert.equal(url.searchParams.get('lat'),'51.622');assert.equal(url.searchParams.get('lng'),'5.432');assert.equal(url.searchParams.get('localCountry'),'true');assert.equal(url.searchParams.get('username'),'talera_test');assert.equal(opts.redirect,'error');assert.ok(!url.href.includes(actor.id));return Response.json({geonames:[place]})
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
assert.equal(result.status,200);assert.equal((await result.json()).place.city,'Schijndel');assert.equal(calls,1);
assert.equal(hits[0].limit,24);assert.equal(hits[1].limit,120);
allowed=false;assert.equal((await capturePlaceApi(req(),env,deps)).status,429);assert.equal(calls,1);
console.log('TALERA_GEONAMES_AUTH_SCOPE_LIMIT_PRIVACY_CONTRACT_PASS');

import {enrichCapturePlaces} from './f5-capture-place-enrichment.mjs';
const original=new Blob(['gps'],{type:'image/jpeg'});
const record={id:'story-a',source:'pwa-local',items:[{key:'photo-a',kind:'photo',mime:'image/jpeg',size:3,name:'a.jpg'}]};
const duplicate={...record,id:'story-b',items:[{...record.items[0]}]};
let catalog=[structuredClone(record),structuredClone(duplicate)],requests=0,writes=0,online=false,fail=false,deleted=false;
const resolved={countryCode:'NL',country:'Nederland',city:'Schijndel',source:'geonames-nearby-place'};
const options={list:async()=>structuredClone(catalog),blob:async()=>original,
 readPlace:async()=>null,readGps:async()=>({latitude:51.62,longitude:5.43}),
 available:()=>online,lookup:async()=>{requests++;return fail?{ok:false}:{ok:true,place:resolved}},
 commit:async(expected,index,value)=>{
  if(deleted)return null;
  const current=catalog.find(x=>x.id===expected.id);
  assert.deepEqual(current,expected);writes++;
  if(value)current.items[index].capturePlace=value;else current.items[index].capturePlaceChecked='v1';
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
assert.equal(catalog[0].items[0].capturePlaceChecked,'v1');
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

// Existing HEIF negatives are retried once after the parser correction, not
// previously confirmed places or unrelated JPEG negatives. Simulated commit.
const oldHeif={...record,id:'legacy-heif',items:[{...record.items[0],mime:'image/heif',name:'a.heic',capturePlaceChecked:'v1'}]};
const oldJpeg={...record,id:'legacy-jpeg',items:[{...record.items[0],capturePlaceChecked:'v1'}]};
const stillMissing={...oldHeif,id:'heif-v2',items:[{...oldHeif.items[0],capturePlaceChecked:'v2'}]};
const alreadyResolved={...oldHeif,id:'heif-resolved',items:[{...oldHeif.items[0],capturePlace:resolved}]};
catalog=[oldJpeg,oldHeif,stillMissing,alreadyResolved].map(x=>structuredClone(x));
const heifOriginal=new Blob(['gps'],{type:'image/heif'});let retries=0;
const retryOptions={...options,blob:async()=>heifOriginal,lookup:async()=>{retries++;return {ok:true,place:resolved}},commit:async(expected,index,value)=>{const current=catalog.find(x=>x.id===expected.id);assert.deepEqual(current,expected);if(value)current.items[index].capturePlace=value;else current.items[index].capturePlaceChecked='v2';return structuredClone(current)}};
// Different physical key for confirmed item prevents shortcutting the lookup.
catalog[3].items[0].key='other-heif';
await enrichCapturePlaces(retryOptions);assert.equal(retries,1);assert.deepEqual(catalog[1].items[0].capturePlace,resolved);assert.equal(catalog[0].items[0].capturePlace,undefined);assert.equal(catalog[2].items[0].capturePlace,undefined);
await enrichCapturePlaces(retryOptions);assert.equal(retries,1);
console.log('TALERA_HEIF_PREVIOUS_NEGATIVE_RECHECK_ONCE_PASS');
