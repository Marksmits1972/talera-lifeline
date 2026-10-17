import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {TALERA_UI_CATALOGS,TALERA_UI_LANGUAGES,TALERA_I18N_SCRIPT} from '../experiments/lifeline-main/i18n.js';

const load=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const worker=load('../experiments/lifeline-main/worker.js');
const tell=load('../experiments/lifeline-main/tell-local-page.js');
const home=load('../experiments/lifeline-main/visual-v8-photo-space.html');
const datepicker=load('../experiments/lifeline-main/free-date-picker.js');
function bootstrap(markup=TALERA_I18N_SCRIPT){
 const match=markup.match(/<script[^>]*>([\s\S]*?)<\/script>/);
 assert.ok(match,'i18n bootstrap script exists');
 assert.doesNotThrow(()=>new vm.Script(match[1]));
 return match[1];
}
function context(language,initial){
 const memory=new Map(initial?Object.entries(initial):[]);
 const documentNode={nodeType:9,readyState:'complete',documentElement:{lang:''},
  querySelectorAll(){return [example]},querySelector(){return null},
  dispatchEvent(){},addEventListener(){}};
 const example={textContent:'',attributes:{'data-i18n':'nav.timeline'},hasAttribute(k){return k in this.attributes},
  getAttribute(k){return this.attributes[k]},setAttribute(k,v){this.attributes[k]=v}};
 const browser={window:{},navigator:{languages:[language],language},document:documentNode,
  localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},
  CustomEvent:class CustomEvent{constructor(type,options){this.type=type;this.detail=options?.detail}},
  Intl,Date,Object,String,Array};
 vm.runInNewContext(bootstrap(),browser);
 return {api:browser.window.TaleraI18n,documentNode,example,memory};
}
test('exactly five launch languages share one set of stable keys',()=>{
 assert.deepEqual(TALERA_UI_LANGUAGES,['nl','en','de','fr','es']);
 const keys=Object.keys(TALERA_UI_CATALOGS.en).sort();
 assert.ok(keys.length>=100);
 for(const code of TALERA_UI_LANGUAGES){
  assert.deepEqual(Object.keys(TALERA_UI_CATALOGS[code]).sort(),keys,'catalog '+code);
  assert.ok(keys.every(k=>typeof TALERA_UI_CATALOGS[code][k]==='string'&&TALERA_UI_CATALOGS[code][k].length));
 }
});
test('locale from device, persistent manual choice, English fallback and safe interpolation',()=>{
 const dutch=context('nl-NL');
 assert.equal(dutch.api.getLanguage(),'nl');
 assert.equal(dutch.example.textContent,'Tijdlijn');
 assert.equal(dutch.documentNode.documentElement.lang,'nl');
 assert.equal(dutch.api.setLanguage('de-DE'),true);
 assert.equal(dutch.example.textContent,'Zeitleiste');
 assert.equal(dutch.memory.get('talera.ui.language.v1'),'de');
 assert.equal(dutch.api.t('timeline.openMemory',{title:'Familie',date:'1976'}),'Erinnerung ansehen: Familie, 1976');
 assert.equal(dutch.api.setLanguage('invalid'),false);
 const english=context('pl-PL');
 assert.equal(english.api.getLanguage(),'en');
 assert.equal(english.api.t('nav.timeline'),'Timeline');
 assert.equal(english.api.t('unknown.key'),'unknown.key');
 const saved=context('fr-FR',{'talera.ui.language.v1':'es'});
 assert.equal(saved.api.getLanguage(),'es');
 assert.equal(saved.api.formatDate(new Date(2020,0,15),{month:'long'}),'enero');
});
test('new language works by extending only the catalog, not changing runtime or UI logic',()=>{
 const original=bootstrap();
 const marker=original.match(/const CATALOGS=(\{[^\n]+\});\nconst SUPPORTED=/);
 assert.ok(marker,'one serializable language dictionary');
 const data=JSON.parse(marker[1]);
 data.it={...data.en,'nav.timeline':'Cronologia'};
 const extended=original.replace(marker[1],JSON.stringify(data));
 assert.doesNotThrow(()=>new vm.Script(extended));
 const documentNode={nodeType:9,readyState:'complete',documentElement:{lang:''},
  querySelectorAll(){return[]},querySelector(){return null},dispatchEvent(){}};
 const browser={window:{},document:documentNode,navigator:{language:'it-IT',languages:['it-IT']},
  localStorage:{getItem(){return null},setItem(){}},Intl,Date,Object,String,Array};
 vm.runInNewContext(extended,browser);
 assert.equal(browser.window.TaleraI18n.getLanguage(),'it');
 assert.equal(browser.window.TaleraI18n.t('nav.timeline'),'Cronologia');
 assert.equal(browser.window.TaleraI18n.t('nav.tell'),'Tell');
});
test('one bootstrap serves all three existing pages without changing storage schema or RH19 engine',()=>{
 assert.match(worker,/import \{ TALERA_I18N_SCRIPT \} from "\.\/i18n\.js"/);
 assert.match(worker,/icon\+TALERA_I18N_SCRIPT\+"<\/head>"/);
 assert.match(tell,/data-i18n="tell\.heading"/);
 assert.match(tell,/data-i18n="tell\.save"/);
 assert.match(tell,/data-i18n-placeholder=\\"tell\.titlePlaceholder\\"/);
 assert.match(home,/data-i18n="nav\.timeline"/);
 assert.match(home,/data-i18n="nav\.presentation"/);
 assert.match(home,/id="taleraLanguageChoice"/);
 assert.match(datepicker,/data-i18n=\\"date\.yearOnly\\"/);
 assert.match(datepicker,/const months=\['januari'/);
 assert.match(datepicker,/window\.TaleraI18n\?\.locale\(\)/);
 assert.doesNotMatch(worker,/deleteDatabase\(|localStorage\.clear\(|sessionStorage\.clear\(/);
 assert.match(worker,/import r19Worker from "\.\.\/\.\.\/src\/reference-r19h2-carousel-combined-worker\.js"/);
 assert.match(worker,/import \{ MEMORY_STORE_SCRIPT \} from "\.\/memory-store\.js"/);
});
