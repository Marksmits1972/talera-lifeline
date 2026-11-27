import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createOfflineLocalityResolver,createOfflineLocalityLoader} from './f5-offline-locality.mjs';
import {enrichCapturePlaces} from './f5-capture-place-enrichment.mjs';
import {applyPhotoLocationInputs,selectDisplayedLocation,localPhotoState} from './f5-memory-location.mjs';
const gps=(latitude,longitude)=>({latitude,longitude});
const country={countryCode:'NL',country:'Nederland',city:'',source:'offline-country-v1'};
const refined={...country,city:'Arnhem',source:'offline-locality-v1'};
const fixture=(entries)=>{
 const sorted=entries.sort((a,b)=>a[0].localeCompare(b[0])||a[1]-b[1]);
 const pool=Buffer.concat(sorted.map(e=>Buffer.from(e[3]))),head=16+676*8;
 const b=Buffer.alloc(head+sorted.length*14+pool.length);
 b.write('TLPLC001');b.writeUInt32LE(sorted.length,8);b.writeUInt32LE(pool.length,12);
 let offset=0;
 sorted.forEach(([code,lat,lon,name],i)=>{
  const slot=(code.charCodeAt(0)-65)*26+code.charCodeAt(1)-65,p=16+slot*8,count=b.readUInt32LE(p+4);
  if(!count)b.writeUInt32LE(i,p);b.writeUInt32LE(count+1,p+4);
  const at=head+14*i,len=Buffer.byteLength(name);b.writeInt32LE(Math.round(lat*100000),at);b.writeInt32LE(Math.round(lon*100000),at+4);b.writeUInt32LE(offset,at+8);b.writeUInt16LE(len,at+12);offset+=len;
 });pool.copy(b,head+14*sorted.length);return b;
};
const sample=fixture([['NL',51.98,5.91111,'Arnhem'],['NL',52,5.9,'A'],['NL',52.0002,5.9,'B'],['DE',51.98,5.91111,'Deutschland']]);
test('logic: distance, country lock, ambiguity, invalid and remote location',()=>{
 const lookup=createOfflineLocalityResolver(sample);
 assert.equal(lookup(gps(51.98,5.91111),'NL'),'Arnhem');
 assert.equal(lookup(gps(51.98,5.91111),'DE'),'Deutschland');
 assert.equal(lookup(gps(52.0001,5.9),'NL'),null);
 assert.equal(lookup(gps(54,5),'NL'),null);
 assert.equal(lookup(gps(51.98,5.91111),'BE'),null);
 assert.equal(lookup(gps(NaN,5),'NL'),null);
 assert.throws(()=>createOfflineLocalityResolver(sample.subarray(0,100)),/INVALID_LOCALITY_DATA/);
});
test('logic: one shared public download, no coordinates or personal headers, offline failure leaves country',async()=>{
 let requests=0;
 const url='/__talera_free/places-'+'a'.repeat(64)+'.bin';
 const load=createOfflineLocalityLoader(url,sample.length,async(path,options)=>{
  requests++;assert.equal(path,url);assert.equal(options.credentials,'omit');assert.equal(options.cache,'force-cache');assert.ok(!options.body);
  return new Response(sample,{headers:{'content-type':'application/octet-stream'}});
 });
 const [a,b]=await Promise.all([load(gps(51.98,5.91111),country),load(gps(54,5),country)]);
 assert.deepEqual(a,{ready:true,place:refined});assert.deepEqual(b,{ready:true,place:country});assert.equal(requests,1);
 const offline=createOfflineLocalityLoader(url,sample.length,()=>Promise.reject(Error('offline')));
 assert.deepEqual(await offline(gps(51.98,5.91111),country),{ready:false,place:country});
});
test('logic: background stores country first, then refines same photo; misses settle and manual locations survive',async()=>{
 const original=new Blob(['jpeg'],{type:'image/jpeg'});
 let items=[{kind:'photo',key:'p',size:original.size,mime:original.type}];
 let requests=0,clock=1000;const retryItems=new Map();
 const options={list:async()=>[{id:'one',source:'pwa-local',items:structuredClone(items)}],blob:async()=>original,readPlace:async()=>null,readGps:async()=>gps(51.98,5.91111),lookup:async()=>({ok:true,place:country}),available:()=>true,resolveLocality:async()=>{requests++;return {ready:true,place:refined}},retryItems,now:()=>clock,
 commit:async(story,i,place,reason,checked)=>{items[i].capturePlace=place;if(checked&&!place.city)items[i].captureLocalityChecked='offline-locality-v1';return {id:'one',source:'pwa-local',items:structuredClone(items)}}};
 assert.equal((await enrichCapturePlaces(options)).retryAfterMs,1000);
 assert.deepEqual(items[0].capturePlace,country);assert.equal(requests,0);
 clock+=1000;await enrichCapturePlaces(options);
 assert.deepEqual(items[0].capturePlace,refined);assert.equal(requests,1);
 await enrichCapturePlaces(options);assert.equal(requests,1);
 items[0].capturePlace=country;items[0].manualPhotoLocation={countryCode:'NL',city:'Eigen plaats',mode:'correct'};
 await enrichCapturePlaces(options);assert.equal(requests,1);
 delete items[0].manualPhotoLocation;
 await enrichCapturePlaces({...options,resolveLocality:async()=>({ready:true,place:country})});
 assert.equal(items[0].captureLocalityChecked,'offline-locality-v1');assert.deepEqual(items[0].capturePlace,country);
 const rec={kind:'photo',capturePlace:country};
 applyPhotoLocationInputs([rec],[{automatic:{state:'known',place:refined,localityChecked:true}}],['NL']);
 assert.deepEqual(rec.capturePlace,refined);
 const manual={countryCode:'NL',city:'Eigen plaats',mode:'correct'};
 applyPhotoLocationInputs([rec],[{manual}],['NL']);
 assert.equal(selectDisplayedLocation(null,rec,['NL']).city,'Eigen plaats');
 assert.equal(localPhotoState(items[0],['NL']).localityChecked,true);
});
test('actual frozen GeoNames data: digest, actual locations, cross-country and remote safe fallback',()=>{
 const data=readFileSync(new URL('./f5-offline-locality-data.bin',import.meta.url));
 const meta=JSON.parse(readFileSync(new URL('./f5-offline-locality-data.json',import.meta.url)));
 assert.equal(data.length,5426386);assert.equal(meta.bytes,data.length);assert.equal(meta.records,237408);
 assert.equal(createHash('sha256').update(data).digest('hex'),meta.sha256);
 const lookup=createOfflineLocalityResolver(data);
 assert.equal(lookup(gps(51.98000,5.91111),'NL'),'Arnhem');
 assert.equal(lookup(gps(51.6225,5.43194),'NL'),'Schijndel');
 assert.equal(lookup(gps(51.98000,5.91111),'HR'),null);
 assert.equal(lookup(gps(47.074,12.695),'AT'),null); // high mountain, no nearby populated centre
 assert.equal(lookup(gps(0,-150),'NL'),null);
});
