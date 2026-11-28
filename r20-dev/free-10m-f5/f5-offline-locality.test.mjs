import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createOfflineLocalityResolver,createOfflineLocalityLoader,createOfflineWorldLocalityLoader} from './f5-offline-locality.mjs';
import {enrichCapturePlaces,makeLocationWork,syncLocationWork,nextLocationWork,finishLocationWork,inspectLocationWork,installLocationQueueWrites} from './f5-capture-place-enrichment.mjs';
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
 commit:async(story,i,place,reason,checked)=>{items[i].capturePlace=place;if(checked&&!place.city)items[i].captureLocalityChecked='offline-locality-world-v2';return {id:'one',source:'pwa-local',items:structuredClone(items)}}};
 assert.equal((await enrichCapturePlaces(options)).retryAfterMs,1000);
 assert.deepEqual(items[0].capturePlace,country);assert.equal(requests,0);
 clock+=1000;await enrichCapturePlaces(options);
 assert.deepEqual(items[0].capturePlace,refined);assert.equal(requests,1);
 await enrichCapturePlaces(options);assert.equal(requests,1);
 items[0].capturePlace=country;items[0].manualPhotoLocation={countryCode:'NL',city:'Eigen plaats',mode:'correct'};
 await enrichCapturePlaces(options);assert.equal(requests,1);
 delete items[0].manualPhotoLocation;
 await enrichCapturePlaces({...options,resolveLocality:async()=>({ready:true,place:country})});
 assert.equal(items[0].captureLocalityChecked,'offline-locality-world-v2');assert.deepEqual(items[0].capturePlace,country);
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
 // Published GeoNames public place-centre test coordinates, not owner photo GPS.
 assert.equal(lookup(gps(45.08268,13.63457),'HR'),'Rovinj');
 assert.equal(lookup(gps(47.79941,13.04399),'AT'),'Salzburg');
 assert.equal(lookup(gps(51.98000,5.91111),'HR'),null);
 assert.equal(lookup(gps(47.074,12.695),'AT'),null); // high mountain, no nearby populated centre
 assert.equal(lookup(gps(0,-150),'NL'),null);
});

const testBaseUrl='/__talera_free/places-'+'a'.repeat(64)+'.bin';
const partInfo=(bytes,countries)=>({sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,countries});
const worldUrl=part=>'/__talera_free/assets/places-'+part.sha256+'.bin';
const asBinary=bytes=>new Response(bytes,{headers:{'content-type':'application/octet-stream'}});
const toArrayBuffer=bytes=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const mockPublicCache=()=>{
 const stored=new Map();
 return {stored,get:async key=>structuredClone(stored.get(key)??null),put:async(key,b)=>{stored.set(key,structuredClone(b))},delete:async key=>stored.delete(key)};
};
test('world: preserve baseline before requesting more; one immutable group download, cache re-use across documents, no coordinates or credentials',async()=>{
 const data=fixture([['NL',53,6,'Extra village'],['NL',51.98,5.91111,'Competing new label'],['DE',53,6,'Another country']]);
 const part=partInfo(data,['NL','DE']),url=worldUrl(part),cache=mockPublicCache();
 let baseRequests=0,worldRequests=0;
 const fetcher=async(path,opts)=>{
  assert.equal(opts.credentials,'omit');assert.equal(opts.cache,'force-cache');assert.equal(opts.redirect,'error');assert.equal(opts.body,undefined);
  if(path===testBaseUrl){baseRequests++;return asBinary(sample)}
  worldRequests++;assert.equal(path,url);assert.equal(opts.referrerPolicy,'no-referrer');
  return asBinary(data);
 };
 const load=createOfflineWorldLocalityLoader(testBaseUrl,sample.length,[part],fetcher,cache);
 assert.deepEqual(await load(gps(51.98,5.91111),country),{ready:true,place:refined});
 assert.equal(worldRequests,0,'A published name never downloads the world file');
 const expected={...country,city:'Extra village',source:'offline-locality-v1'};
 assert.deepEqual(await Promise.all([load(gps(53,6),country),load(gps(53,6),country)]),[{ready:true,place:expected},{ready:true,place:expected}]);
 assert.equal(baseRequests,1);assert.equal(worldRequests,1);
 assert.equal(cache.stored.size,2);
 const second=createOfflineWorldLocalityLoader(testBaseUrl,sample.length,[part],async(path)=>{
  if(path===testBaseUrl)return asBinary(sample);throw Error('network must not be needed');
 },cache);
 assert.deepEqual(await second(gps(53,6),country),{ready:true,place:expected});
 assert.deepEqual(await second(gps(53,6),{...country,countryCode:'BE'}),{ready:true,place:{...country,countryCode:'BE'}});
 assert.deepEqual(await second(gps(NaN,6),country),{ready:true,place:country});
 assert.deepEqual(await second(gps(53,6),refined),{ready:true,place:refined});
});
test('world: reject corrupt bytes and cache; offline stays pending, no false negative, retry succeeds',async()=>{
 const data=fixture([['NL',53,6,'Extra village']]),part=partInfo(data,['NL']),url=worldUrl(part),cache=mockPublicCache();
 const corrupt=Buffer.from(data);corrupt[corrupt.length-1]^=255;
 cache.stored.set(part.sha256,toArrayBuffer(corrupt));
 let now=1000,requests=0,online=false;
 const load=createOfflineWorldLocalityLoader(testBaseUrl,sample.length,[part],async(path)=>{
  if(path===testBaseUrl)return asBinary(sample);
  requests++;return online?asBinary(data):asBinary(corrupt);
 },cache,()=>now);
 assert.equal((await load(gps(53,6),country)).blocked,'retry');
 assert.equal(cache.stored.has(part.sha256),false);assert.equal(requests,1);
 assert.equal((await load(gps(53,6),country)).blocked,'retry');assert.equal(requests,1);
 now+=300001;online=true;
 assert.equal((await load(gps(53,6),country)).place.city,'Extra village');
 assert.equal(requests,2);assert.equal(cache.stored.has(part.sha256),true);
 assert.throws(()=>createOfflineWorldLocalityLoader(testBaseUrl,sample.length,[part,{...part,sha256:'b'.repeat(64)}]),/INVALID_WORLD_LOCALITY_DIRECTORY/);
});
test('world: existing negative marker is re-evaluated once, manual correction and positive labels unchanged',async()=>{
 const original=new Blob(['jpeg'],{type:'image/jpeg'});
 const make=(key,place,marker,manual)=>({kind:'photo',key,size:original.size,mime:original.type,capturePlace:place,captureLocalityChecked:marker,...(manual?{manualPhotoLocation:manual}:{})});
 let items=[
  make('old-miss',country,'offline-locality-v1'),
  make('positive',refined,'offline-locality-v1'),
  make('manual',country,'offline-locality-v1',{countryCode:'NL',city:'Eigen keuze',mode:'correct'}),
  make('new-miss',country,'offline-locality-world-v2')
 ];
 let reads=0,commits=0;
 const result=await enrichCapturePlaces({list:async()=>[{id:'one',source:'pwa-local',items:structuredClone(items)}],blob:async()=>{reads++;return original},readPlace:async()=>null,readGps:async()=>gps(53,6),lookup:async()=>({ok:true,place:country}),available:()=>true,resolveLocality:async()=>({ready:true,place:{...country,city:'Extra village',source:'offline-locality-v1'}}),commit:async(story,i,place)=>{commits++;items[i].capturePlace=place;delete items[i].captureLocalityChecked;return {id:'one',source:'pwa-local',items:structuredClone(items)}}});
 assert.equal(reads,1);assert.equal(commits,1);assert.equal(items[0].capturePlace.city,'Extra village');
 assert.deepEqual(items[1].capturePlace,refined);assert.equal(items[2].manualPhotoLocation.city,'Eigen keuze');assert.equal(items[3].captureLocalityChecked,'offline-locality-world-v2');
 assert.equal(localPhotoState({capturePlace:country,captureLocalityChecked:'offline-locality-v1'},['NL']).localityChecked,undefined);
 assert.equal(localPhotoState(items[3],['NL']).localityChecked,true);
 assert.equal(result.more,false);
});
test('world: real frozen independent settlement data, actual country directory and exact packaged public bytes',()=>{
 const root=new URL('./f5-world-settlement-data/',import.meta.url);
 const meta=JSON.parse(readFileSync(new URL('world-manifest.json',root)));
 assert.equal(meta.sourceSha256,'6a0850259892fa149f51a1ae0204d1654b1db7739886ef88127b986931d9dcd5');
 assert.equal(meta.settlementPolicy,'independent-settlement-v1');
 assert.equal(meta.layers.populated.records,5001680);assert.equal(meta.excluded.non_independent_settlement_or_unknown,171418);
 assert.equal(meta.featureCounts['P.PPLX'],undefined);
 let records=0,bytes=0;const countries=new Set();
 for(const part of meta.layers.populated.parts){
  const b=readFileSync(new URL(part.file,root));
  assert.equal(createHash('sha256').update(b).digest('hex'),part.sha256);
  assert.equal(b.length,part.bytes);assert.ok(b.length<=24*1024*1024);
  assert.equal(b.readUInt32LE(8),part.records);
  assert.equal(typeof createOfflineLocalityResolver(b),'function');
  records+=part.records;bytes+=part.bytes;
  for(const cc of Object.keys(part.coverage)){assert.ok(!countries.has(cc));countries.add(cc)}
  if(process.env.CI){
   const publicFile=new URL('../free-10m-delivery/public/__talera_free/assets/'+part.file,import.meta.url);
   assert.equal(createHash('sha256').update(readFileSync(publicFile)).digest('hex'),part.sha256);
  }
 }
 assert.equal(records,5001680);assert.equal(bytes,103864734);assert.equal(countries.size,248);
 console.log('TALERA_WORLD_VERIFIED_STATIC_DATA_AND_DIRECTORY_PASS');
});

test('location work: 50,000 completed descriptors are skipped; only eligible IDs enter index; save only adds its own row',()=>{
 const known={kind:'photo',key:'p',capturePlace:refined},unknown={kind:'photo',key:'u'};
 const rows=Array.from({length:50000},(_,i)=>({id:'s'+i,source:'pwa-local',items:[known]}));
 rows.push({id:'pending',source:'pwa-local',items:[unknown,{...unknown,key:'manual',manualPhotoLocation:{city:'Own'}},{...unknown,key:'failed',captureLocationFailed:'retry-exhausted'},{...unknown,key:'no-gps',capturePlaceChecked:'v4-no-readable-gps'},{...unknown,key:'checked-country',capturePlace:country,captureLocalityChecked:'offline-locality-world-v2'}]});
 const state=makeLocationWork(rows);
 assert.deepEqual(state.items.map(x=>x.key),['u']);
 const entry=nextLocationWork(state,1).entry;
 finishLocationWork(state,entry,{kind:'retry'},1);
 assert.equal(state.items[0].attempts,1);assert.equal(nextLocationWork(state,2).entry,undefined);
 const after=structuredClone(state);
 syncLocationWork(after,{id:'pending',source:'pwa-local',items:[unknown]});
 assert.equal(after.items[0].attempts,1);
 finishLocationWork(after,after.items[0],{kind:'offline'},300001);
 assert.equal(after.items[0].attempts,1);
 finishLocationWork(after,after.items[0],{kind:'retry'},600001);
 assert.equal(after.items[0].at,2400001);assert.equal(after.items[0].attempts,2);
 finishLocationWork(after,after.items[0],{kind:'retry'},2400001);
 assert.deepEqual(nextLocationWork(after,99999999),{at:null});
 syncLocationWork(after,{id:'fresh',source:'pwa-local',items:[{...unknown,key:'new'}]});
 assert.deepEqual(after.items.map(x=>x.key),['new']);
 assert.match(installLocationQueueWrites("mountCapturePlaceEnrichment({});tx.objectStore('stories').put(meta);stories.delete(id);"),/locationQueueWrite\(tx,meta\)/);
});
test('location work: invalid or absent GPS is terminal without network; corrupt file is not called again',async()=>{
 const b=new Blob(['abc'],{type:'image/jpeg'});
 const item={kind:'photo',key:'x',size:3,mime:'image/jpeg'};
 let reads=0,network=0;
 const options={item,blob:async()=>{reads++;return b},readPlace:async()=>null,readGps:async()=>null,lookup:async()=>{network++;return {ok:false}},resolveLocality:async()=>{network++;return {ready:false}}};
 assert.deepEqual(await inspectLocationWork(options),{kind:'done',place:null,reason:'no-readable-gps',checked:false});
 assert.equal(reads,1);assert.equal(network,0);
 assert.deepEqual(await inspectLocationWork({...options,blob:async()=>null}),{kind:'done',failure:'unreadable'});
 assert.equal(network,0);
});
test('public register: 100 photos, three shared attempts persist after re-open, disconnected phone spends none',async()=>{
 const data=fixture([['NL',53,6,'Extra village']]),part=partInfo(data,['NL']),cache=mockPublicCache();
 let now=1000,requests=0,online=false;
 const fetcher=async url=>{if(url===testBaseUrl)return asBinary(sample);requests++;throw Error('offline server')};
 // Warm the verified baseline once, then simulate disconnected network.
 await cache.put(testBaseUrl.match(/[a-f0-9]{64}/)[0],toArrayBuffer(sample));
 const create=()=>createOfflineWorldLocalityLoader(testBaseUrl,sample.length,[part],fetcher,cache,()=>now,()=>online);
 let load=create();assert.equal((await load(gps(53,6),country)).blocked,'offline');assert.equal(requests,0);
 online=true;
 for(let i=0;i<100;i++)assert.equal((await load(gps(53,6),country)).blocked,'retry');
 assert.equal(requests,1);now+=300000;
 load=create();assert.equal((await load(gps(53,6),country)).blocked,'retry');assert.equal(requests,2);
 now+=1800000;load=create();assert.equal((await load(gps(53,6),country)).blocked,'exhausted');assert.equal(requests,3);
 now+=86400000;load=create();
 for(let i=0;i<100;i++)assert.equal((await load(gps(53,6),country)).blocked,'exhausted');
 assert.equal(requests,3);
});

test('public register: losing connection during a transfer and leaving the page release the reservation',async()=>{
 const data=fixture([['NL',53,6,'Extra village']]),part=partInfo(data,['NL']),cache=mockPublicCache();
 let now=1000,requests=0,online=true,mode='disconnect',controller=new AbortController();
 await cache.put(testBaseUrl.match(/[a-f0-9]{64}/)[0],toArrayBuffer(sample));
 const fetcher=async()=>{requests++;
  if(mode==='disconnect'){online=false;throw Error('connection lost')}
  if(mode==='pause'){controller.abort();throw Error('page left')}
  throw Error('server unavailable')
 };
 const create=()=>createOfflineWorldLocalityLoader(testBaseUrl,sample.length,[part],fetcher,cache,()=>now,()=>online);
 assert.equal((await create()(gps(53,6),country)).blocked,'offline');
 assert.equal((await cache.get('retry:'+part.sha256)).attempts,0);
 online=true;mode='pause';controller=new AbortController();
 assert.equal((await create()(gps(53,6),country,controller.signal)).blocked,'offline');
 assert.equal((await cache.get('retry:'+part.sha256)).attempts,0);
 mode='server';assert.equal((await create()(gps(53,6),country)).blocked,'retry');
 assert.equal((await cache.get('retry:'+part.sha256)).attempts,1);
 assert.equal(requests,3);
});
