import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderNavigation,NAV_SLOT} from '../experiments/lifeline-main/navigation.js';
import {TALERA_UI_CATALOGS} from '../experiments/lifeline-main/i18n.js';

const read=(p)=>readFileSync(new URL(p,import.meta.url),'utf8');
const page=read('../experiments/lifeline-main/visual-v8-photo-space.html');
const tellModule=read('../experiments/lifeline-main/tell-local-page.js');
const tell=JSON.parse(tellModule.slice(tellModule.indexOf(' = ')+3).trim().replace(/;$/,''));
const adapterModule=read('../experiments/lifeline-main/local-rh19-adapter.js');
const adapter=JSON.parse(adapterModule.slice(adapterModule.indexOf(' = ')+3).trim().replace(/;$/,''));
const storeModule=read('../experiments/lifeline-main/memory-store.js');
const store=JSON.parse(storeModule.slice(storeModule.indexOf(' = ')+3).trim().replace(/;$/,''));
const worker=read('../experiments/lifeline-main/worker.js');
const reposition=read('../experiments/lifeline-main/timeline-reposition.js');
const originalEngine=read('../src/presentation-controller.js');

test('one memory ID connects creation, timeline, native RH19 and return',()=>{
 assert.match(tell,/location\.replace\('\/\?memory='\+encodeURIComponent\(saved\.id\)\)/);
 assert.match(page,/previewLink\.href='\/present\?memory='\+encodeURIComponent\(m\.localId\|\|m\.refId\)/);
 assert.match(adapter,/const routeId=route\.get\('memory'\)/);
 assert.match(worker,/this\.href='\/\?memory='\+encodeURIComponent\(id\)/);
 assert.match(reposition,/location\.replace\('\/\?memory='\+encodeURIComponent\(item\.row\.id\)\)/);
 assert.doesNotMatch(page,/taleraVisualMemoryHandoff/);
 assert.doesNotMatch(worker,/taleraVisualMemoryHandoff|id:51001/);
 assert.doesNotMatch(reposition,/\?local=/);
});

test('all three routes use the one explicit footer, without scraping another page',()=>{
 assert.equal((page.match(/<!--TALERA_SHARED_NAV-->/g)||[]).length,1);
 assert.equal((tell.match(/<!--TALERA_SHARED_NAV-->/g)||[]).length,1);
 assert.match(worker,/renderNavigation\("timeline"\)/);
 assert.match(worker,/renderNavigation\("present"\)/);
 assert.match(worker,/renderNavigation\('tell'\)/);
 assert.doesNotMatch(worker,/ORIGINAL_TIMELINE_NAV|unifiedFooter|replace\(\/.+bottom-nav/);
 for(const route of ['tell','timeline','present']){
  const html=renderNavigation(route);
  assert.equal((html.match(/<a href=/g)||[]).length,3);
  assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
 }
 assert.equal(NAV_SLOT,'<!--TALERA_SHARED_NAV-->');
});

test('Free memories and original media remain on one untouched local store',()=>{
 assert.match(store,/talera-lifeline-dev-local-v1/);
 for(const objectStore of ["'stories'","'files'"])assert.ok(store.includes(objectStore));
 assert.match(store,/tx\.objectStore\('stories'\)\.put\(meta\)/);
 assert.match(store,/tx\.objectStore\('files'\)\.put\(\{key:files\[j\]\.key,blob:uploads\[j\]\}\)/);
 assert.match(store,/async function displayUrl\(key\)/);
 assert.match(adapter,/runtime\.registerMemories\(memories\)/);
 for(const x of [store,tell,page,adapter,worker])assert.doesNotMatch(x,/indexedDB\.deleteDatabase\(|localStorage\.clear\(|sessionStorage\.clear\(/);
});

test('language migration does not leave undefined month table or mutate memory data',()=>{
 assert.doesNotMatch(page,/\bML\s*\[/);
 assert.match(page,/return d\.getDate\(\)\+' '\+monthLabel\(m\.month\)/);
 assert.match(page,/new Intl\.DateTimeFormat\(/);
 for(const code of ['nl','en','de','fr','es']){
  assert.ok(TALERA_UI_CATALOGS[code]['nav.timeline']);
  assert.ok(TALERA_UI_CATALOGS[code]['tell.save']);
 }
 assert.match(worker,/TALERA_I18N_SCRIPT/);
 assert.doesNotMatch(store,/TaleraI18n\.setLanguage/);
});

test('native RH19 presentation is still the sole carousel and story-sheet engine',()=>{
 assert.match(worker,/reference-r19h2-carousel-combined-worker\.js/);
 assert.match(worker,/LOCAL_RH19_ADAPTER/);
 assert.match(originalEngine,/function prepareStrip\(/);
 assert.match(originalEngine,/book\.step\(direction\)/);
 assert.doesNotMatch(adapter,/talera-local-controls|__taleraLocalAdvance|restrictToMemory/);
 const originalSheet=read('../src/html/chunk2.js');
 assert.match(originalSheet,/memory-story-scroll/);
 assert.match(originalSheet,/memory-sheet is-visible/);
});

test.todo('RH19 must support every valid memory date beyond September 2026 without losing original gestures');
test.todo('Free must offer a separately restorable backup independent of removable browser storage');
test.todo('Original RH19 demo catalog must have one canonical source instead of two 50-story copies');
test.todo('Five-language UI strings and photo-loading latency require real iPhone acceptance tests');
