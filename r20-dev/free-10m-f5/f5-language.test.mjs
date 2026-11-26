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
