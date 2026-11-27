import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {normalizeManualLocation,manualLocationPatch,selectDisplayedLocation,localizedCountryRows,filterCountryRows,normalizePhotoLocation,applyPhotoLocationInputs,localPhotoState,draftPhotoChanges,draftPhotoInputs,moveDraftPhotoLocation,requestConfirmedPhotoPlace} from './f5-memory-location.mjs';
import {installMemoryLocationStore,installMemoryLocationEditor,memoryLocationCountryCodes as codes} from './f5-memory-location-build.mjs';
import {languageCatalog} from './f5-language-catalog.mjs';
import {referencePages} from './generated/public-template-map.mjs';
import {createFreeArchive,decodeFreeArchive} from './f5-portable-archive.mjs';
const nl={countryCode:'NL',city:'Boxtel'},fr={countryCode:'FR',city:'Paris'};
const auto=(location,kind='photo')=>({key:'originalPhoto:0',kind,capturePlace:{...location,country:location.countryCode==='NL'?'Nederland':'Frankrijk',source:'geonames-locality-v2'}});
const fill={...fr,mode:'fill'},correct={...fr,mode:'correct'};
test('legacy optional country and city validate and old memory data survive without presentation override',()=>{
 assert.deepEqual(normalizeManualLocation({countryCode:'',city:'  Cádiz  '},codes),{countryCode:'',city:'Cádiz'});
 assert.deepEqual(normalizeManualLocation({countryCode:'NL',city:''},codes),{countryCode:'NL',city:''});
 assert.equal(normalizeManualLocation({countryCode:'',city:''},codes),null);
 assert.deepEqual(manualLocationPatch({manualLocation:nl},{},codes),{manualLocation:nl});
 assert.deepEqual(manualLocationPatch({manualLocation:nl},{manualLocation:null},codes),{manualLocation:null});
 assert.deepEqual(manualLocationPatch({}, {},codes),{});
 for(const invalid of [{countryCode:'ZZ',city:'x'},{countryCode:'CS',city:'x'},{countryCode:'NL',city:'x\u202e'},{countryCode:'NL',city:'x',other:'x'},'NL'])assert.throws(()=>normalizeManualLocation(invalid,codes),/TALERA_INVALID_MANUAL_LOCATION/);
 const original=auto(nl);assert.deepEqual(selectDisplayedLocation({manualLocation:fr},original,codes),original.capturePlace);
 assert.equal(selectDisplayedLocation({manualLocation:fr},{kind:'photo'},codes),null);
});
test('bulk filling cannot override known photos, even if recognition arrives after selection; only explicit correction takes precedence',()=>{
 const items=[auto(nl),{kind:'photo',key:'unknown'},{kind:'photo',key:'new-known'},{kind:'photo',key:'pending'},{kind:'photo',key:'not-selected'},{kind:'audio',key:'voice'}];
 const untouched=structuredClone(items[0]);
 applyPhotoLocationInputs(items,[{manual:fill},{manual:fill},{automatic:{state:'known',place:auto(nl).capturePlace},manual:fill},{automatic:{state:'pending'}},null,null],codes);
 assert.deepEqual(items[0],untouched);assert.deepEqual(items[1].manualPhotoLocation,fill);
 assert.deepEqual(items[2].capturePlace,untouched.capturePlace);assert.equal(items[2].manualPhotoLocation,undefined);
 assert.equal(items[3].capturePlaceChecked,undefined);assert.equal(items[4].manualPhotoLocation,undefined);assert.equal(items[5].manualPhotoLocation,undefined);
 assert.deepEqual(selectDisplayedLocation({},items[1],codes),{...fr,source:'manual-photo'});
 items[1].capturePlace=untouched.capturePlace;assert.deepEqual(selectDisplayedLocation({},items[1],codes),untouched.capturePlace);
 applyPhotoLocationInputs(items,[{manual:correct},null,null,null,null,null],codes);
 assert.deepEqual(selectDisplayedLocation({},items[0],codes),{...fr,source:'manual-photo'});
 assert.deepEqual(items[0].capturePlace,untouched.capturePlace);
 applyPhotoLocationInputs(items,[{manual:null},null,null,null,null,null],codes);
 assert.deepEqual(items[0],untouched);
 assert.throws(()=>applyPhotoLocationInputs(items,[{manual:fill}],codes),/INVALID_PHOTO_LOCATION_INPUTS/);
 assert.throws(()=>normalizePhotoLocation({...fr,mode:'x'},codes),/INVALID_PHOTO_LOCATION/);
});
test('only a completed unknown result produces negative marker; durable changes follow draft IDs and never order, removed IDs or voice',()=>{
 const items=[{kind:'photo',key:'p1',capturePlaceChecked:'v3'},{kind:'photo',key:'p2'},{kind:'photo',key:'p3'},{kind:'photo',key:'p4'}];
 assert.deepEqual(localPhotoState(items[0],codes),{state:'pending'},'Old v3 negative must not prevent a new original inspection');
 applyPhotoLocationInputs(items,[{automatic:{state:'pending'}},{automatic:{state:'unknown'}},{automatic:{state:'unknown',reason:'no-readable-gps'}},{automatic:{state:'unknown',reason:'no-country'}}],codes);
 assert.equal(items[0].capturePlaceChecked,'v3');assert.equal(items[1].capturePlaceChecked,undefined);
 assert.equal(items[2].capturePlaceChecked,'v4-no-readable-gps');assert.equal(items[3].capturePlaceChecked,'v5-no-country');
 assert.deepEqual(localPhotoState(items[2],codes),{state:'unknown',reason:'no-readable-gps'});
 assert.deepEqual(localPhotoState(items[3],codes),{state:'unknown',reason:'no-country'});
 assert.deepEqual(localPhotoState({capturePlaceChecked:'v4-no-place'},codes),{state:'pending'});
 const oldDraft={media:['a','b'],photoLocationAutomatic:{a:{state:'unknown'},b:{state:'unknown',reason:'no-country'}},photoLocations:{a:fill}};
 assert.deepEqual(draftPhotoChanges(oldDraft),{photoLocations:{a:fill},photoLocationAutomatic:{b:{state:'unknown',reason:'no-country'}}});
 assert.deepEqual(draftPhotoInputs(oldDraft,()=>({type:'image/jpeg'})),[{manual:fill},{automatic:{state:'unknown',reason:'no-country'}}]);
 applyPhotoLocationInputs(items,[{automatic:{state:'known',place:auto(nl).capturePlace}},null,null,null],codes);
 assert.deepEqual(items[0].capturePlace,auto(nl).capturePlace);assert.equal(items[0].capturePlaceChecked,undefined);

 const draft={media:['b','a'],voice:'v',photoLocations:{a:fill,unused:correct,v:correct},taleraLocationResults:new Map([['b',{state:'known',place:auto(nl).capturePlace}]])};
 assert.deepEqual(draftPhotoChanges(draft),{photoLocations:{a:fill},photoLocationAutomatic:{b:{state:'known',place:auto(nl).capturePlace}}});
 const inputs=draftPhotoInputs(draft,id=>({type:id==='v'?'audio/mp4':'image/png'}));
 assert.deepEqual(inputs,[{automatic:{state:'known',place:auto(nl).capturePlace}},{manual:fill},null]);
 const target={media:['a','b']};moveDraftPhotoLocation(draft,target,'a');moveDraftPhotoLocation(draft,target,'b');assert.deepEqual(draftPhotoChanges(target),{photoLocations:{a:fill},photoLocationAutomatic:{b:{state:'known',place:auto(nl).capturePlace}}});
});
test('country-only original location shows a flag and preserves optional same-country manual town',()=>{
 const country={countryCode:'FR',country:'Frankrijk',city:'',source:'offline-country-v1'};
 const items=[{key:'fr',kind:'photo'},{key:'nl',kind:'photo',capturePlace:auto(nl).capturePlace},{key:'metadata',kind:'photo'}];
 applyPhotoLocationInputs(items,[{automatic:{state:'known',place:country},manual:{countryCode:'FR',city:'Lyon',mode:'fill'}},null,{automatic:{state:'known',place:{...country,source:'iptc-location-created'}}}],codes);
 assert.deepEqual(items[0].capturePlace,country);
 assert.deepEqual(selectDisplayedLocation({},items[0],codes),{countryCode:'FR',city:'Lyon',source:'manual-photo'});
 assert.deepEqual(selectDisplayedLocation({},items[2],codes),{...country,source:'iptc-location-created'});
 assert.equal(selectDisplayedLocation({},items[1],codes).city,'Boxtel');
 applyPhotoLocationInputs(items,[{manual:null},null,null],codes);
 assert.deepEqual(selectDisplayedLocation({},items[0],codes),country);
 assert.equal(selectDisplayedLocation({}, {capturePlace:{...country,city:'Paris'}},codes),null);
});
test('explicit photo confirmation requests one fresh device fix and uses only validated coordinates',async()=>{
 let requests=0,lookups=0;
 const now=()=>100000;
 const location={coords:{latitude:51.6,longitude:5.3,accuracy:40},timestamp:100000};
 const geolocation={getCurrentPosition(ok,_error,opts){requests++;assert.deepEqual(opts,{enableHighAccuracy:true,maximumAge:0,timeout:12000});ok(location)}};
 const lookup=async(gps,signal)=>{lookups++;assert.deepEqual(gps,{latitude:51.6,longitude:5.3});assert.equal(signal.aborted,false);return {ok:true,place:auto(nl).capturePlace}};
 const signal=new AbortController().signal;
 const value=await requestConfirmedPhotoPlace({geolocation,lookup,signal,now});
 assert.deepEqual(value,{status:'known',place:auto(nl).capturePlace});assert.equal(requests,1);assert.equal(lookups,1);
 for(const x of [
  {...location,timestamp:90000},{...location,timestamp:110000},
  {...location,coords:{...location.coords,accuracy:251}},
  {...location,coords:{...location.coords,latitude:91}},
  {...location,coords:{...location.coords,longitude:Infinity}},
  {coords:{latitude:51,longitude:5,accuracy:20}}
 ]){
  assert.deepEqual(await requestConfirmedPhotoPlace({geolocation:{getCurrentPosition(ok){ok(x)}},lookup,signal,now}),{status:'unavailable'});
 }
 assert.equal(lookups,1,'Invalid, stale or inaccurate fixes never reach the provider');
 assert.deepEqual(await requestConfirmedPhotoPlace({geolocation:{getCurrentPosition(_ok,bad){bad({code:1})}},lookup,signal,now}),{status:'denied'});
 assert.deepEqual(await requestConfirmedPhotoPlace({geolocation:{getCurrentPosition(_ok,bad){bad({code:3})}},lookup,signal,now}),{status:'unavailable'});
 assert.deepEqual(await requestConfirmedPhotoPlace({geolocation,lookup:async()=>({ok:true,place:null}),signal,now}),{status:'no-place'});
 assert.deepEqual(await requestConfirmedPhotoPlace({geolocation,lookup:async()=>({ok:false}),signal,now}),{status:'unavailable'});
});
test('cancelled location consent or navigation ignores late fixes and late provider responses',async()=>{
 let late,lookups=0;const controller=new AbortController(),now=()=>100000;
 const location={coords:{latitude:51.6,longitude:5.3,accuracy:40},timestamp:100000};
 const pending=requestConfirmedPhotoPlace({geolocation:{getCurrentPosition(ok){late=ok}},lookup:async()=>{lookups++;return {ok:true,place:auto(nl).capturePlace}},signal:controller.signal,now});
 controller.abort();late(location);
 assert.deepEqual(await pending,{status:'aborted'});assert.equal(lookups,0);
 const second=new AbortController();let resolveLookup,lookupStarted;
 const started=new Promise(r=>lookupStarted=r);
 const lookupPending=requestConfirmedPhotoPlace({geolocation:{getCurrentPosition(ok){ok(location)}},lookup:()=>{lookupStarted();return new Promise(r=>resolveLookup=r)},signal:second.signal,now});
 await started;second.abort();resolveLookup({ok:true,place:auto(nl).capturePlace});
 assert.deepEqual(await lookupPending,{status:'aborted'});
 const draft={media:['original','second'],photoLocations:{second:{...nl,mode:'fill'}}};
 const items=[auto(fr),{kind:'photo',key:'second',capturePlaceChecked:'v4-no-readable-gps'}];
 applyPhotoLocationInputs(items,draftPhotoInputs(draft,()=>({type:'image/jpeg'})),codes);
 assert.equal(items[0].capturePlace.city,'Paris');assert.deepEqual(items[1].manualPhotoLocation,{...nl,mode:'fill'});
 assert.equal(items[1].capturePlace,undefined);assert.equal(items[1].capturePlaceChecked,'v4-no-readable-gps');
});
test('country list is local and translated; every new independent location key exists in all five languages',()=>{
 const regions=new Set(codes);assert.equal(regions.size,codes.length);assert.ok(codes.length>=195);
 const keys=Object.keys(languageCatalog.nl).filter(x=>x.startsWith('core.editor.location.'));
 assert.equal(keys.length,50);
 for(const language of ['nl','en','de','fr','es']){
  const rows=localizedCountryRows(codes,language);assert.equal(rows.length,codes.length);
  assert.ok(rows.every(x=>x.code&&x.name!==x.code&&x.name));
  assert.equal(filterCountryRows(rows,'FR',language).some(x=>x.code==='FR'),true);
  assert.ok(keys.every(k=>languageCatalog[language][k]));
 }
 assert.equal(filterCountryRows(localizedCountryRows(codes,'nl'),'belgie','nl')[0].code,'BE');
 assert.equal(localizedCountryRows(codes,'fr').find(x=>x.code==='NL').name,'Pays-Bas');
});
test('per-photo manual and legacy location survive existing archive with original IDs and bytes',async()=>{
 const media={key:'local-12345678:0',kind:'photo',name:'a.png',mime:'image/png',size:3,capturePlace:{countryCode:'NL',country:'Nederland',city:'',source:'offline-country-v1'},manualPhotoLocation:correct};
 const story={id:'local-12345678',source:'pwa-local',title:'synthetic',date:'2020-01-01',items:[media],manualLocation:fr};
 const file=new Blob([Uint8Array.of(1,2,3)],{type:'image/png'});
 const archive=await createFreeArchive({stories:[story],files:[{key:media.key,blob:file}],sourceScope:'a'.repeat(64)});
 const decoded=await decodeFreeArchive(archive);
 assert.deepEqual(decoded.stories[0],story);assert.deepEqual(new Uint8Array(await decoded.files[0].blob.arrayBuffer()),new Uint8Array([1,2,3]));
});
test('actual editor package contains one mount and ordered inputs; legacy stored on both original save paths',()=>{
 const root='r20-dev/free-10m-delivery/public';
 for(const route of ['/mijn-leven','/present','/tell']){
  let html=fs.readFileSync(root+referencePages[route],'utf8');
  if(process.env.CI)assert.ok(html.includes('const taleraLocationCountryCodes='),'Actual packaged location store missing');
  else if(!html.includes('const taleraLocationCountryCodes='))html=installMemoryLocationStore(html);
  assert.equal(html.split('...manualLocationPatch(existing,input,taleraLocationCountryCodes)').length,3);
  assert.equal(html.split('applyPhotoLocationInputs(files,input.photoLocations,taleraLocationCountryCodes)').length,2);
  assert.equal(html.split('resolveCountry:createOfflineCountryResolver(').length,2,'One offline location resolver on the existing page');
  assert.ok(html.includes('v5-no-country')&&!html.includes('/*TALERA_GEONAMES_ENABLED*/false'),'Current recognition must not wait for provider configuration');
  if(route==='/tell'){
   if(process.env.CI)assert.ok(html.includes("className='talera-memory-location'"),'Actual packaged editor control missing');
   else if(!html.includes("className='talera-memory-location'"))html=installMemoryLocationEditor(html);
   assert.equal(html.split('mountMemoryLocationEditor({g,anchor:').length,2);
   assert.ok(html.includes("photoLocations:draftPhotoInputs(g,id=>assets.get(id))")&&html.includes("g.taleraLocationStop?.()"));
   assert.ok(html.includes("use.onclick=()=>{const id=single;if(id)void confirmDevicePlace(id)}")&&html.includes("lookupDevicePlace:(...args)=>mem.lookupConfirmedDevicePlace(...args)")&&html.includes("deviceAttempt?.controller.abort()"));
   assert.ok(html.includes("const rows=node('div','talera-location-list',panel)")&&html.includes("setManual(single,{...value,mode:singleMode})"));
   assert.ok(!html.includes("talera-location-thumb")&&!html.includes("talera-location-check"),'Simplified location panel must not repeat photos or use selection boxes');
  }
  for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(m[2].includes('function normalizeManualLocation'))new vm.Script(m[2]);
 }
});
