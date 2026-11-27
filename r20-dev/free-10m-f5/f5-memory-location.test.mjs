import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {normalizeManualLocation,manualLocationPatch,selectDisplayedLocation,localizedCountryRows,filterCountryRows,normalizePhotoLocation,applyPhotoLocationInputs,localPhotoState,draftPhotoChanges,draftPhotoInputs,moveDraftPhotoLocation} from './f5-memory-location.mjs';
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
 applyPhotoLocationInputs(items,[{automatic:{state:'pending'}},{automatic:{state:'unknown'}},{automatic:{state:'unknown',reason:'no-readable-gps'}},{automatic:{state:'unknown',reason:'no-place'}}],codes);
 assert.equal(items[0].capturePlaceChecked,'v3');assert.equal(items[1].capturePlaceChecked,undefined);
 assert.equal(items[2].capturePlaceChecked,'v4-no-readable-gps');assert.equal(items[3].capturePlaceChecked,'v4-no-place');
 assert.deepEqual(localPhotoState(items[2],codes),{state:'unknown',reason:'no-readable-gps'});
 assert.deepEqual(localPhotoState(items[3],codes),{state:'unknown',reason:'no-place'});
 const oldDraft={media:['a','b'],photoLocationAutomatic:{a:{state:'unknown'},b:{state:'unknown',reason:'no-place'}},photoLocations:{a:fill}};
 assert.deepEqual(draftPhotoChanges(oldDraft),{photoLocations:{a:fill},photoLocationAutomatic:{b:{state:'unknown',reason:'no-place'}}});
 assert.deepEqual(draftPhotoInputs(oldDraft,()=>({type:'image/jpeg'})),[{manual:fill},{automatic:{state:'unknown',reason:'no-place'}}]);
 applyPhotoLocationInputs(items,[{automatic:{state:'known',place:auto(nl).capturePlace}},null,null,null],codes);
 assert.deepEqual(items[0].capturePlace,auto(nl).capturePlace);assert.equal(items[0].capturePlaceChecked,undefined);

 const draft={media:['b','a'],voice:'v',photoLocations:{a:fill,unused:correct,v:correct},taleraLocationResults:new Map([['b',{state:'known',place:auto(nl).capturePlace}]])};
 assert.deepEqual(draftPhotoChanges(draft),{photoLocations:{a:fill},photoLocationAutomatic:{b:{state:'known',place:auto(nl).capturePlace}}});
 const inputs=draftPhotoInputs(draft,id=>({type:id==='v'?'audio/mp4':'image/png'}));
 assert.deepEqual(inputs,[{automatic:{state:'known',place:auto(nl).capturePlace}},{manual:fill},null]);
 const target={media:['a','b']};moveDraftPhotoLocation(draft,target,'a');moveDraftPhotoLocation(draft,target,'b');assert.deepEqual(draftPhotoChanges(target),{photoLocations:{a:fill},photoLocationAutomatic:{b:{state:'known',place:auto(nl).capturePlace}}});
});
test('country list is local and translated; every new independent location key exists in all five languages',()=>{
 const regions=new Set(codes);assert.equal(regions.size,codes.length);assert.ok(codes.length>=195);
 const keys=Object.keys(languageCatalog.nl).filter(x=>x.startsWith('core.editor.location.'));
 assert.equal(keys.length,36);
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
 const media={key:'local-12345678:0',kind:'photo',name:'a.png',mime:'image/png',size:3,capturePlace:auto(nl).capturePlace,manualPhotoLocation:correct};
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
  if(route==='/tell'){
   if(process.env.CI)assert.ok(html.includes("className='talera-memory-location'"),'Actual packaged editor control missing');
   else if(!html.includes("className='talera-memory-location'"))html=installMemoryLocationEditor(html);
   assert.equal(html.split('mountMemoryLocationEditor({g,anchor:').length,2);
   assert.ok(html.includes("photoLocations:draftPhotoInputs(g,id=>assets.get(id))")&&html.includes("g.taleraLocationStop?.()"));
  }
  for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(m[2].includes('function normalizeManualLocation'))new vm.Script(m[2]);
 }
});
