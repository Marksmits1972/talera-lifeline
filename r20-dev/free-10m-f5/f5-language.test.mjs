import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {languageCatalog} from './f5-language-catalog.mjs';
import {chooseLanguage,translate,languageBootstrap} from './f5-language.mjs';
import {localBackupPage} from './f5-local-backup-page.mjs';
import {passwordResetPage} from './f5-password-reset-page.mjs';
import {renderOriginalTaleraShare,renderTaleraLanding,guestClientScript} from './f5-guest-experience.mjs';

import {referencePages,guestPages,verifiedPublicScripts} from './generated/public-template-map.mjs';
import {localizeApprovedMenu} from './f5-menu-language-build.mjs';
import {keepOnlyFunctionalFreeMenu,removeInactiveDisplayMenu,removeInactiveAccessibilityMenu,connectExistingStorageBackup,secureAccountMenuTransitions} from './f5-account-switch-guard.mjs';
const langs=['nl','en','de','fr','es'];
const fields=x=>[...String(x).matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(m=>m[1]).sort();
test('five complete central dictionaries preserve placeholders and independent contexts',()=>{
 const keys=Object.keys(languageCatalog.nl).sort();
 assert.equal(keys.length,new Set(keys).size);
 for(const lang of langs){
  assert.deepEqual(Object.keys(languageCatalog[lang]).sort(),keys);
  for(const key of keys){
   const value=languageCatalog[lang][key];
   assert.ok(typeof value==='string'&&value.trim(),lang+' '+key);
   assert.deepEqual(fields(value),fields(languageCatalog.nl[key]),lang+' parameter '+key);
  }
 }
 assert.equal(translate('nl','backup.page.createHeading'),translate('nl','backup.page.createButton'));
 assert.notEqual('backup.page.createHeading','backup.page.createButton');
 assert.equal(translate('en','transfer.status.sendProgress',{percent:42}),'Sending: 42%');
 assert.equal(chooseLanguage(null,['ja-JP']),'en');
 assert.equal(chooseLanguage(null,['ja-JP','fr-FR']),'fr');
 assert.equal(chooseLanguage('de',['en-US']),'de');
 assert.equal(translate('xx','backup.page.heading'),translate('en','backup.page.heading'));
});
function executeBootstrap(source,preferred,device,key='backup.page.heading'){
 const el={dataset:{taleraText:key},textContent:'untranslated'};
 const userContent={textContent:'Opslaan'};
 const doc={documentElement:{lang:'nl'},querySelectorAll:q=>q==='[data-talera-text]'?[el]:[]};
 const context={window:{},document:doc,localStorage:{getItem:()=>preferred},navigator:{languages:device}};
 vm.runInNewContext(source,context);
 return {language:doc.documentElement.lang,value:el.textContent,userContent:userContent.textContent,t:context.window.TaleraLanguage.t};
}
test('same standalone page picks stored language and does not scan personal text',()=>{
 assert.ok(!languageBootstrap(['backup.']).includes('__name('),'Bundler-only helpers must never enter browser code');
 assert.ok(!fs.readFileSync(new URL('./f5-language.mjs',import.meta.url),'utf8').includes('}.toString()'),'Browser bootstrap must not serialize a bundled function');
 for(const lang of langs){
  const result=executeBootstrap(languageBootstrap(['backup.','transfer.']),lang,['nl-NL']);
  assert.equal(result.language,lang);assert.equal(result.value,translate(lang,'backup.page.heading'));
  assert.equal(result.userContent,'Opslaan');
  assert.equal(result.t('backup.status.fileSelected',{filename:'<original>.talera'}),translate(lang,'backup.status.fileSelected',{filename:'<original>.talera'}));
 }
 const fallback=executeBootstrap(languageBootstrap(['backup.']),null,['ja-JP']);
 assert.equal(fallback.language,'en');
});
test('private backup markup uses separate contexts and preserves order, IDs and exact filename',()=>{
 const html=localBackupPage('talera-free-local-'+'a'.repeat(32)+'-v1');
 const keys=[...html.matchAll(/data-talera-(?:text|aria-label)="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(keys.length,new Set(keys).size);
 assert.ok(keys.length>=50);
 assert.ok(html.includes('<strong>TALERA-back-up.talera</strong>'));
 for(const id of ['restore-file','backup-step-check','backup-step-confirm','run-restore','transfer-approve','transfer-import']){
  assert.equal([...html.matchAll(new RegExp('id="'+id+'"','g'))].length,1);
 }
 for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
});
test('password recovery keeps nonce, credentials in fragment, no new origin and explicit localized status keys',async()=>{
 for(const mode of ['request','confirm']){
  const response=passwordResetPage(mode);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  const html=await response.text(),nonce=/script-src 'nonce-([^']+)'/.exec(response.headers.get('content-security-policy'))[1];
  assert.ok(html.includes('<script nonce="'+nonce+'">'));assert.ok(html.includes('location.hash'));
  for(const match of html.matchAll(/<script nonce="[^"]+">([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
  assert.ok(html.includes('data-talera-text="reset.'+mode+'.title"'));
 }
});
test('guest landing uses dedicated catalog and existing same-origin script',()=>{
 const html=renderTaleraLanding();
 assert.ok(html.includes('data-talera-text="guest.landing.heading"'));
 assert.ok(html.includes('src="/__f5/guest-ui.js"'));
 new vm.Script(guestClientScript);
});

test('password reset executes submit handler for every language with safe keyed or unavailable feedback',async()=>{
 const response=passwordResetPage('request');
 const code=/<script nonce="[^"]+">([\s\S]*?)<\/script>/.exec(await response.text())[1];
 for(const lang of langs){
  for(const [http,result,expected] of [[200,{messageKey:'reset.api.requestAck'},'reset.api.requestAck'],[503,{},'reset.api.unavailable']]){
   let submitHandler;
   const button={disabled:false};
   const form={hidden:false,elements:{email:{value:'synthetic@example.invalid'}},querySelector:()=>button,addEventListener:(event,handler)=>{assert.equal(event,'submit');submitHandler=handler}};
   const status={textContent:''};
   const context={window:{},navigator:{languages:['en-US']},localStorage:{getItem:()=>lang},document:{body:{dataset:{mode:'request'}},documentElement:{lang:'nl'},querySelectorAll:()=>[],querySelector:()=>form,getElementById:()=>status},fetch:async(route,options)=>{
    assert.equal(route,'/api/password-reset/request');assert.equal(options.headers['x-talera-language'],lang);return {status:http,ok:http===200,json:async()=>result};
   }};
   vm.runInNewContext(code,context);
   assert.equal(typeof submitHandler,'function');
   await submitHandler({preventDefault(){}});
   assert.equal(status.textContent,translate(lang,expected));
   assert.equal(button.disabled,false);assert.equal(form.hidden,http===200);
  }
 }
});

test('specific menu texts are compiled from the exact original, never from personal strings',()=>{
 const original=fs.readFileSync(new URL('./generated/approved-menu-original.mjs',import.meta.url),'utf8');
 const approved=keepOnlyFunctionalFreeMenu(removeInactiveDisplayMenu(removeInactiveAccessibilityMenu(connectExistingStorageBackup(secureAccountMenuTransitions(original)))));
 const output=localizeApprovedMenu(approved);
 assert.equal(output,fs.readFileSync('r20-dev/free-10m-delivery/public'+verifiedPublicScripts['/__clean/menu-integration.mjs'],'utf8'));
 new vm.Script(output);
 assert.throws(()=>localizeApprovedMenu(approved+' '),/TALERA_MENU_LANGUAGE_SOURCE_DRIFT/);
 assert.ok(output.includes('dataset.taleraExplicitLanguage'));
 assert.ok(!output.includes("label.textContent.trim()==="));
 assert.ok(output.includes("date.toLocaleDateString(window.TaleraI18n.locale)"));
 assert.ok(output.includes('menu.password.login.show')&&output.includes('menu.password.registration.show')&&output.includes('menu.password.repeat.show'));
 for(const key of new Set([...output.matchAll(/menu\.[a-zA-Z0-9_.]+/g)].map(m=>m[0])))assert.ok(languageCatalog.nl[key],key);
});
test('actual recipient adapter retains one original presentation, localized comment controls and escaped personal data',()=>{
 const original=fs.readFileSync('r20-dev/free-10m-delivery/public'+referencePages['/present'],'utf8');
 const share={title:'<Keep title>',storyText:'Opslaan',eventDate:'1990-01-01',hasPhoto:false,hasVideo:false,hasAudio:false};
 const html=renderOriginalTaleraShare(original,share,'/s/'+'A'.repeat(43),'a'.repeat(64));
 assert.ok(html.includes('data-i18n="guest.native.inviteHeading"'));
 assert.ok(html.includes('window.TaleraGuestOneMemory={list,get}'));
 const script=/<script id="talera-native-guest-social">([\s\S]*?)<\/script>/.exec(html)[1];
 new vm.Script(script);
 assert.ok(script.includes('guest.native.commentInitial')&&script.includes('guest.native.emptyFeedback'));
 assert.ok(script.includes('panel.dataset.taleraExplicitLanguage'));
 assert.ok(script.includes("body.textContent=c.body||''"));
});

test('whole contextual phrases, singular and plural stay independently editable in all five languages',()=>{
 const keys=['core.home.decadeTitle','core.home.decadeOwnOne','core.home.decadeOwnMany','core.home.yearOwnOne','core.home.yearOwnMany','core.home.heroYearOwn','core.home.heroYearExample','core.home.moreYearOne','core.home.moreYearMany','menu.messages.summaryOneUnreadOne','menu.messages.summaryOneUnreadMany','menu.messages.summaryManyUnreadMany','menu.storage.accountCountOne','menu.storage.receivedCountOne','backup.status.reviewOne','backup.status.reviewMany','backup.detail.reviewOneBlocked','backup.detail.reviewManyBlocked','embed.record.videoPosition','embed.present.videoPosition','reset.status.confirmComplete'];
 const params={year:1990,count:1,unread:1,index:1,total:2,current:1,present:0,conflicts:0,identical:1,technical:0,kinds:'synthetic',size:'1 MB'};
 for(const lang of langs)for(const key of keys){
  const result=translate(lang,key,params);
  assert.ok(result&&!/\{\w+\}/.test(result),lang+' '+key);
 }
 assert.equal(translate('en','core.home.decadeTitle',{year:1990}),'1990s');
 assert.equal(translate('nl','core.home.decadeOwnOne',{count:1}),'1 eigen herinnering');
 assert.equal(translate('nl','core.home.decadeOwnMany',{count:5}),'5 eigen herinneringen');
 assert.equal(translate('fr','menu.messages.summaryOneUnreadMany',{unread:1,count:3}),'1 non lu · 3 messages');
 assert.equal(translate('fr','menu.messages.summaryManyUnreadMany',{unread:2,count:3}),'2 non lus · 3 messages');
 for(const lang of langs)for(const key of ['backup.status.reviewOne','backup.status.reviewMany','backup.status.restoredOne','backup.status.restoredMany']){
  assert.ok(!/\(en\)|\(s\)/.test(translate(lang,key,params)));
 }
});
test('same core translated element preserves whole phrase, parameters and live language switch',()=>{
 const home=fs.readFileSync('r20-dev/free-10m-delivery/public'+referencePages['/mijn-leven'],'utf8');
 const src=/<script id="talera-v23-i18n">([\s\S]*?)<\/script>/.exec(home)[1];
 const attrs=new Map(),node={textContent:'',setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};
 const personal={textContent:'Opslaan'};
 const doc={
  readyState:'loading',documentElement:{setAttribute(){}},body:{},
  addEventListener(){},dispatchEvent(){},querySelector:()=>null,getElementById:()=>null,
  createTreeWalker(){return {nextNode:()=>null}},
  querySelectorAll:s=>s==='[data-talera-bound-text]'&&attrs.has('data-talera-bound-text')?[node]:[]
 };
 const context={window:{},document:doc,navigator:{languages:['nl-NL']},localStorage:{getItem:()=>null,setItem(){}},location:{pathname:'/mijn-leven'},CustomEvent:class{},NodeFilter:{SHOW_TEXT:4}};
 vm.runInNewContext(src,context);
 const api=context.window.TaleraI18n;
 api.setText(node,'core.home.decadeTitle',{year:1990});
 assert.equal(node.textContent,'Jaren 1990');
 for(const lang of langs){api.setLanguage(lang);assert.equal(node.textContent,translate(lang,'core.home.decadeTitle',{year:1990}));assert.equal(personal.textContent,'Opslaan')}
 api.setText(node,'core.home.decadeOwnOne',{count:1});
 api.setLanguage('nl');assert.equal(node.textContent,'1 eigen herinnering');
 node.textContent='extern bijgewerkt';api.setLanguage('fr');assert.equal(node.textContent,'extern bijgewerkt');
 assert.ok(!attrs.has('data-talera-bound-text'));
 assert.ok(home.includes("window.TaleraI18n.setText(summary,own?"));
 assert.ok(!home.includes("detail.textContent=ownCount?ownCount+' eigen herinneringen'"));
});
test('both existing independent embedded player sources use their own complete contextual keys',()=>{
 for(const [mode,route] of [['present','/vertelmodus-embed'],['record','/vertelmodus-embed-record']]){
  const html=fs.readFileSync('r20-dev/free-10m-delivery/public'+referencePages[route],'utf8');
  const prefix='embed.'+mode+'.';
  assert.ok(html.includes('data-talera-text="'+prefix+'intro"'));
  assert.ok(html.includes('data-talera-text="'+prefix+'pauseButton"'));
  assert.ok(html.includes('data-talera-text="'+prefix+'playPauseButton"'));
  assert.ok(html.includes('msg(t("noSound"),true)'));
  assert.ok(html.includes('t("videoPosition",{index:taleraOriginalIndex+1,total:taleraOriginalQueue.length})'));
  assert.ok(!html.includes('msg("Geen geluid opgenomen.",true)'));
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  assert.equal(scripts.length,2);
  for(const script of scripts)new vm.Script(script);
  for(const lang of langs){
   const resolved=executeBootstrap(scripts[0],lang,['en-US'],prefix+'intro');
   assert.equal(resolved.value,translate(lang,prefix+'intro'));
   assert.equal(resolved.t(prefix+'videoPosition',{index:1,total:2}),translate(lang,prefix+'videoPosition',{index:1,total:2}));
  }
  for(const sub of ['pauseButton','playPauseButton','recordingStarted','recordingResumed'])assert.ok(languageCatalog.nl[prefix+sub]);
 }
});

// Characteristics contract tests run in this existing CI group.
import "./f5-topic-search.test.mjs";

test('compiled app keeps the new control on own Home and excludes the signed-out shells',()=>{
 const load=ref=>fs.readFileSync('r20-dev/free-10m-delivery/public'+ref,'utf8');
 const home=load(referencePages['/mijn-leven']);
 const present=load(referencePages['/present']);
 assert.ok(home.includes("if(location.pathname==='/mijn-leven')window.__taleraCharacteristicSearch.render(grid,available);"));
 assert.ok(present.includes('window.__taleraCharacteristicSearch.selection(location)'));
 for(const route of ['/mijn-leven','/present','/tell'])
  assert.ok(!load(guestPages[route]).includes('talera-characteristic-search-script'));
 assert.ok(!load(referencePages['/tell']).includes('talera-characteristic-search-script'));
 const share=renderOriginalTaleraShare(present,{title:'Original recipient story',storyText:'Synthetic',eventDate:'1990-01-01',hasPhoto:false,hasVideo:false,hasAudio:false},'/s/'+'A'.repeat(43),'a'.repeat(64));
 assert.ok(share.includes('window.TaleraGuestOneMemory={list,get}'));
 for(const source of [home,present,share]){
  const search=/<script id="talera-characteristic-search-script">([\s\S]*?)<\/script>/.exec(source);
  assert.ok(search);new vm.Script(search[1]);
 }
});

test('compiled presentation registration preserves matching own IDs, date order and legacy topic behavior',()=>{
 const html=fs.readFileSync('r20-dev/free-10m-delivery/public'+referencePages['/present'],'utf8');
 const api=/<script id="talera-characteristic-search-script">([\s\S]*?)<\/script>/.exec(html)[1];
 const start=html.indexOf('const TALERA_ACTIVE_TOPIC =');
 const end=html.indexOf('const MEMORIES = [];',start);
 assert.ok(start>=0&&end>start);
 const scope=html.slice(start,end);
 const first=html.indexOf('  registerMemories(memories){');
 const last=html.indexOf('  restrictToMemory(memory){',first);
 assert.ok(first>=0&&last>first);
 const actual=html.slice(first,last);
 const rows=[
  {id:'b',storyId:'local-b',ms:200,tags:['Familie','Vakantie'],_taleraLocal:true},
  {id:'single',storyId:'local-single',ms:150,tags:['Familie'],_taleraLocal:true},
  {id:'a',storyId:'local-a',ms:100,tags:['Familie','Vakantie','Kinderen'],_taleraLocal:true},
  {id:'guest',storyId:'guest',ms:300,tags:['Familie','Vakantie'],_taleraLocal:false},
  {id:'other',storyId:'local-other',ms:350,tags:['Werk'],_taleraLocal:true}
 ];
 const run=route=>{
  const location=new URL(route,'https://example.invalid');
  let empty=0,replaced=0,selected=null;
  location.replace=()=>replaced++;
  const context={URLSearchParams,location,window:{},MEMORIES:[{storyId:'stale',ms:0}],taleraRecipientLock:false,centerMs:0,activeMemoryId:null,
    taleraRebuildDensity(){},keepCenterValid(){},writeMemory:m=>selected=m.storyId,draw(){},
    document:{documentElement:{classList:{remove(){}}}}};
  vm.runInNewContext(api,context);
  context.window.__taleraCharacteristicSearch.showEmpty=()=>empty++;
  const result=vm.runInNewContext(scope+'\n({'+actual+'})',context);
  const count=result.registerMemories(rows);
  return {count,ids:context.MEMORIES.map(m=>m.storyId),empty,replaced,selected};
 };
 const url=tags=>'/present#talera-kenmerken='+encodeURIComponent(JSON.stringify(tags));
 assert.deepEqual(run(url(['familie','vakantie'])),{count:2,ids:['local-a','local-b'],empty:0,replaced:0,selected:'local-b'});
 assert.deepEqual(run(url(['familie','vakantie','kinderen'])),{count:1,ids:['local-a'],empty:0,replaced:0,selected:'local-a'});
 assert.deepEqual(run(url(['familie','werk'])),{count:0,ids:[],empty:1,replaced:0,selected:null});
 assert.deepEqual(run('/present?theme=Familie'),{count:3,ids:['local-a','local-single','local-b'],empty:0,replaced:0,selected:'local-b'});
 assert.deepEqual(run('/present?memory=local-a'+url(['familie']).slice('/present'.length)),{count:0,ids:[],empty:1,replaced:0,selected:null});
});

test('compiled characteristic filter retains account-isolated private library and existing offline base route',async()=>{
 const {scopeLocalMemories}=await import('./f5-local-scope.mjs');
 const {OFFLINE_RUNTIME}=await import('./f5-offline-sw.mjs');
 for(const route of ['/mijn-leven','/present']){
  const source=fs.readFileSync('r20-dev/free-10m-delivery/public'+referencePages[route],'utf8');
  const a=scopeLocalMemories(source,'a'.repeat(64));
  const b=scopeLocalMemories(source,'b'.repeat(64));
  assert.ok(a.includes("var DB_NAME='talera-free-local-"+'a'.repeat(32)+"-v1'"));
  assert.ok(b.includes("var DB_NAME='talera-free-local-"+'b'.repeat(32)+"-v1'"));
  assert.ok(!a.includes('talera-lifeline-dev-local-v1'));
  assert.ok(!b.includes('talera-free-local-'+'a'.repeat(32)+'-v1'));
  assert.ok(a.includes('talera-characteristic-search-script')&&b.includes('talera-characteristic-search-script'));
 }
 // Execute the existing offline routing logic. This is not a substitute for
 // the disconnected real-Worker browser test in the presentation CI suite.
 const context={URL,self:{navigator:{languages:['nl']},location:{origin:'https://example.invalid'},addEventListener(){}}};
 vm.runInNewContext(OFFLINE_RUNTIME.replaceAll('__TALERA_OFFLINE_PACKAGE_VERSION__','a'.repeat(32)).replace('__TALERA_OFFLINE_LANGUAGE_PACKS__','{}')+'\nglobalThis.localOfflinePage=offlinePage;',context);
 const u=new URL('/present#talera-kenmerken='+encodeURIComponent(JSON.stringify(['familie','vakantie'])),'https://example.invalid');
 assert.equal(context.localOfflinePage(u),'/present');
 assert.equal(context.localOfflinePage(new URL('/present?memory=local-12345678','https://example.invalid')),'/present');
 assert.equal(context.localOfflinePage(new URL('/present?theme=Familie&extra=1','https://example.invalid')),null);
});
