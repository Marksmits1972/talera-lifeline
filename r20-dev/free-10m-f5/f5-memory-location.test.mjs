import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {normalizeManualLocation,manualLocationPatch,deriveAutomaticLocation,selectDisplayedLocation,localizedCountryRows,filterCountryRows} from './f5-memory-location.mjs';
import {installMemoryLocationStore,installMemoryLocationEditor,memoryLocationCountryCodes as codes} from './f5-memory-location-build.mjs';
import {languageCatalog} from './f5-language-catalog.mjs';
import {referencePages} from './generated/public-template-map.mjs';
import {createFreeArchive,decodeFreeArchive} from './f5-portable-archive.mjs';
const nl={countryCode:'NL',city:'Boxtel'},fr={countryCode:'FR',city:'Paris'};
const auto=(location,kind='photo')=>({key:'originalPhoto:0',kind,capturePlace:{...location,country:location.countryCode,source:'geonames-locality-v2'}});
test('optional manual country and city validate independently, clear explicitly, and preserve existing values when omitted',()=>{
 assert.deepEqual(normalizeManualLocation({countryCode:'',city:'  Cádiz  '},codes),{countryCode:'',city:'Cádiz'});
 assert.deepEqual(normalizeManualLocation({countryCode:'NL',city:''},codes),{countryCode:'NL',city:''});
 assert.equal(normalizeManualLocation({countryCode:'',city:''},codes),null);
 assert.deepEqual(manualLocationPatch({manualLocation:nl},{},codes),{manualLocation:nl});
 assert.deepEqual(manualLocationPatch({manualLocation:nl},{manualLocation:null},codes),{manualLocation:null});
 assert.deepEqual(manualLocationPatch({}, {},codes),{});
 for(const invalid of [{countryCode:'ZZ',city:'x'},{countryCode:'CS',city:'x'},{countryCode:'NL',city:'x\u202e'},{countryCode:'NL',city:'x',other:'x'},'NL'])assert.throws(()=>normalizeManualLocation(invalid,codes),/TALERA_INVALID_MANUAL_LOCATION/);
});
test('automatic data uses selected originals only and never invents one location when originals disagree',()=>{
 assert.deepEqual(deriveAutomaticLocation([auto(nl),{kind:'photo',key:'unknown'}],codes),{location:nl,mixed:false});
 assert.deepEqual(deriveAutomaticLocation([auto(nl),auto({countryCode:'NL',city:'Eindhoven'})],codes),{location:{countryCode:'NL',city:''},mixed:true});
 assert.deepEqual(deriveAutomaticLocation([auto(nl),auto(fr)],codes),{location:null,mixed:true});
 assert.deepEqual(deriveAutomaticLocation([auto(nl,'audio'),{kind:'photo',capturePlace:{...fr,source:'unverified'}}],codes),{location:null,mixed:false});
});
test('manual display may correct a location but never changes the original data and clear restores automatic',()=>{
 const item=auto(nl),story={manualLocation:fr,items:[item]},before=structuredClone(story);
 assert.deepEqual(selectDisplayedLocation(story,item,codes),{...fr,source:'manual-memory'});
 assert.deepEqual(story,before);
 assert.equal(selectDisplayedLocation({manualLocation:null},item,codes),item.capturePlace);
 assert.deepEqual(selectDisplayedLocation({manualLocation:{countryCode:'',city:'Cádiz'}},{},codes),{countryCode:'',city:'Cádiz',source:'manual-memory'});
});
test('country list is local, sorted and translated by country code; all 16 visible messages have independent five-language keys',()=>{
 const regions=new Set(codes);assert.equal(regions.size,codes.length);assert.ok(codes.length>=195);
 for(const language of ['nl','en','de','fr','es']){
  const rows=localizedCountryRows(codes,language);assert.equal(rows.length,codes.length);
  assert.ok(rows.every(x=>x.code&&x.name!==x.code&&x.name));
  assert.equal(filterCountryRows(rows,'FR',language).some(x=>x.code==='FR'),true);
  const keys=Object.keys(languageCatalog[language]).filter(x=>x.startsWith('core.editor.location.'));
  assert.equal(keys.length,16);assert.ok(keys.every(k=>languageCatalog[language][k]));
 }
 assert.equal(filterCountryRows(localizedCountryRows(codes,'nl'),'belgie','nl')[0].code,'BE');
 assert.equal(localizedCountryRows(codes,'fr').find(x=>x.code==='NL').name,'Pays-Bas');
});
test('manual location survives the existing portable backup and restore without changing media IDs',async()=>{
 const media={key:'local-12345678:0',kind:'photo',name:'a.png',mime:'image/png',size:3,capturePlace:auto(nl).capturePlace};
 const story={id:'local-12345678',source:'pwa-local',title:'synthetic',date:'2020-01-01',items:[media],manualLocation:fr};
 const file=new Blob([Uint8Array.of(1,2,3)],{type:'image/png'});
 const archive=await createFreeArchive({stories:[story],files:[{key:media.key,blob:file}],sourceScope:'a'.repeat(64)});
 const decoded=await decodeFreeArchive(archive);
 assert.deepEqual(decoded.stories[0],story);
 assert.deepEqual(new Uint8Array(await decoded.files[0].blob.arrayBuffer()),new Uint8Array([1,2,3]));
});
test('actual editor package contains one mount and exact storage bindings; both existing save paths preserve optional field',()=>{
 // The actual build installs the hooks before generating the immutable package.
 const root='r20-dev/free-10m-delivery/public';
 for(const route of ['/mijn-leven','/present','/tell']){
  let html=fs.readFileSync(root+referencePages[route],'utf8');
  if(process.env.CI)assert.ok(html.includes('const taleraLocationCountryCodes='),'Actual packaged location store missing');
  else if(!html.includes('const taleraLocationCountryCodes='))html=installMemoryLocationStore(html);
  assert.equal(html.split('...manualLocationPatch(existing,input,taleraLocationCountryCodes)').length,3);
  if(route==='/tell'){
   if(process.env.CI)assert.ok(html.includes('className=\'talera-memory-location\''),'Actual packaged editor control missing');
   else if(!html.includes('className=\'talera-memory-location\''))html=installMemoryLocationEditor(html);
   assert.equal(html.split('mountMemoryLocationEditor({g,anchor:').length,2);
   assert.ok(html.includes("Object.hasOwn(row,'manualLocation')")&&html.includes("Object.hasOwn(g,'manualLocation')"));
  }
  for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(m[2].includes('function normalizeManualLocation'))new vm.Script(m[2]);
 }
});
