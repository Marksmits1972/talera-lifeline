// TALERA Free F5: actual on-page account switch through the ORIGINAL menu.
// Uses only synthetic local Wrangler DOs and Chromium's real IndexedDB.
// No customer browser/storage, no Cloudflare deploy, no UI design changes.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,devices} from 'playwright';
import {guestClientScript} from './f5-guest-experience.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const generated=path.join(here,'generated');
mkdirSync(generated,{recursive:true});
const origin='http://127.0.0.1:8829',gate='1'.repeat(64);
const testKey=randomUUID().replaceAll('-','').slice(0,12);
const syntheticStoragePath=path.join(generated,'browser-account-test-'+testKey);
const users=[1,2].map(n=>({
  email:'f5-browser-account-'+testKey+'-'+n+'@example.invalid',
  username:'f5browser'+testKey+n,
  displayName:'F5 fictieve browser '+n,
  password:'Synthetic_Browser_Test_Only_2026_'+n+'!',
  birthDate:n===1?'1974-04-02':'1983-03-09'
}));
let worker=null,browser=null,logs='';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function workerStart(){
  const executable=path.resolve('node_modules/.bin/wrangler');
  worker=spawn(executable,['dev','--local','--ip','127.0.0.1','--port','8829',
    '--config',path.join(here,'wrangler.jsonc'),'--persist-to',
    syntheticStoragePath,
    '--var','STAGING_F5_KEY:'+gate,'--var','STAGING_ACCESS_KEY:'+'2'.repeat(64),
    '--var','STAGING_SOCIAL_KEY:'+'3'.repeat(64),
    '--var','AUTH_NAMESPACE_KEY:SYNTHETIC_F5_ACCOUNT_BROWSER_ONLY_NEVER_PRODUCTION_20261109',
    '--var','DEMO_IDENTITY_KEY:SYNTHETIC_F5_ACCOUNT_SOCIAL_ONLY_NEVER_PRODUCTION_20261109',
    '--log-level','error'],{
    env:{...process.env,CI:'true',BROWSER:'none'},
    stdio:['ignore','pipe','pipe']
  });
  for(const channel of [worker.stdout,worker.stderr])
    channel.on('data',d=>logs=(logs+d.toString()).slice(-7000));
  for(let i=0;i<100;i++){
    if(worker.exitCode!==null)throw Error('Local Worker exited '+logs);
    try{
      const r=await fetch(origin+'/__f5/health',{signal:AbortSignal.timeout(1200)});
      if(r.status===200)return;
    }catch{}
    await delay(400);
  }
  throw Error('Local Worker failed to start: '+logs);
}
async function createUser(user,i){
 const r=await fetch(origin+'/api/register',{
  method:'POST',headers:{
    origin,'content-type':'application/json','x-talera-f5-key':gate,
    'cf-connecting-ip':'192.0.2.'+(71+i)},
  body:JSON.stringify(user),signal:AbortSignal.timeout(25000)
 });
 const data=await r.json();
 assert.equal(r.status,200,'Synthetic account create failed '+JSON.stringify(data));
 assert.match(data.account?.id||'',/^[a-f0-9-]{36}$/);
 return data.account.id;
}
async function waitForLibrary(page){
 try{
   await page.waitForFunction(()=>!!window.TaleraMemories?.list&&
     !!document.getElementById('talera-more-menu'),null,{timeout:18000});
 }catch(e){
   const diagnostic=await page.evaluate(()=>({
     url:location.href,title:document.title,ready:document.readyState,
     menu:!!document.getElementById('talera-more-menu'),
     memories:typeof window.TaleraMemories,
     scripts:[...document.querySelectorAll('script')].map(x=>({
       type:x.type,src:x.src?.slice(0,180),length:x.textContent?.length
     })).slice(-22),
     body:(document.body?.innerText||'').slice(0,750),
     nav:[...document.querySelectorAll('nav button')].map(n=>({
       id:n.id,aria:n.getAttribute('aria-label'),text:n.textContent?.slice(0,45)
     })).slice(0,24)
   }));
   console.log('TALERA_F5_BROWSER_BOOT_DIAGNOSTIC',JSON.stringify(diagnostic));
   throw e;
 }
}
async function menu(page){
 const state=await page.evaluate(()=>{
   const shell=document.getElementById('talera-more-menu');
   if(!shell)throw Error('Approved account menu script did not initialize');
   if(!shell.hidden)return {opened:true};
   const selectors=['#navMore','#navAccount','#navProfile',
    'nav.flow-nav [aria-label*="Meer"]','[aria-label="Mijn TALERA"]',
    '[data-action="more"]','[data-view="more"]'];
   for(const css of selectors){
     const node=document.querySelector(css);
     if(node&&!shell.contains(node)){node.click();break}
   }
   if(shell.hidden){
     const buttons=[...document.querySelectorAll('button,a')].filter(n=>!shell.contains(n));
     const trigger=buttons.find(n=>/meer|more|mijn talera|account/i.test(
       n.getAttribute('aria-label')||n.textContent||''));
     if(trigger)trigger.click();
   }
   return {opened:!shell.hidden,nav:[...document.querySelectorAll('nav.flow-nav button,nav.flow-nav a')]
     .map(n=>({id:n.id,label:n.getAttribute('aria-label'),text:(n.textContent||'').slice(0,36)}))};
 });
 assert.equal(state.opened,true,'Cannot open ORIGINAL menu: '+JSON.stringify(state));
 await page.locator('#talera-more-menu:not([hidden])').waitFor({timeout:7000});
}
async function view(page,target){
 if(await page.locator('#talera-more-menu [data-view="'+target+'"]').count()){
   await page.locator('#talera-more-menu [data-view="'+target+'"]').first().click();
   return;
 }
 throw Error('Original menu has no '+target+' action; available: '+
   JSON.stringify(await page.locator('#talera-more-menu [data-view]')
     .evaluateAll(rows=>rows.map(n=>n.getAttribute('data-view')).slice(0,35))));
}
let passwordRecoveryUiChecked=false;
async function login(page,user){
 await menu(page);
 if(!(await page.locator('#talera-more-menu form[data-form="login"]').count())){
   if(!(await page.locator('#talera-more-menu [data-view="login"]').count()))
     await view(page,'account');
   await view(page,'login');
 }
 const form=page.locator('#talera-more-menu form[data-form="login"]');
 await form.waitFor({timeout:10000});
 // Test the actual signed-out TALERA menu and same-origin recovery views.
 // Email delivery is NOT faked here: missing verified sender must fail closed.
 if(!passwordRecoveryUiChecked){
  const recovery=page.locator('#talera-more-menu a[href="/wachtwoord-vergeten"]');
  assert.equal(await recovery.count(),1,'Recovery link should appear exactly once in login');
  assert.equal(await recovery.isVisible(),true,'Recovery link must be visible');
  const tab=await page.context().newPage();
  try{
   const opening=await tab.goto(origin+(await recovery.getAttribute('href')));
   assert.equal(opening.status(),200);
   assert.match(await tab.title(),/Wachtwoord vergeten/);
   await tab.locator('input[name="email"]').fill(user.email);
   await tab.locator('form button[type="submit"]').click();
   // A native local send-email binding may be present even when real sender
   // verification is NOT proven. Both safe responses are allowed: explicit
   // service unavailable or non-enumerating conditional acknowledgement.
   await tab.waitForFunction(()=>/tijdelijk niet beschikbaar|Als dit e-mailadres bij een TALERA-account hoort/i.test(
    document.querySelector('#status')?.textContent||''),null,{timeout:12000});
   const statusText=await tab.locator('#status').innerText();
   assert.ok(!/mail (?:is |werd )?verzonden/i.test(statusText),
     'Never claim real email delivery in a synthetic browser test');
   const confirmation=await tab.goto(origin+'/wachtwoord-instellen#e='+
    encodeURIComponent(user.email)+'&t='+'a'.repeat(64));
   assert.equal(confirmation.status(),200);
   await tab.waitForFunction(()=>location.hash==='',null,{timeout:8000});
   assert.equal(await tab.locator('input[name="newPassword"]').count(),1);
  }finally{await tab.close()}
  passwordRecoveryUiChecked=true;
 }
 await form.locator('[name="email"]').fill(user.email);
 await form.locator('[name="login-password"]').fill(user.password);
 await Promise.all([
   page.waitForEvent('load',{timeout:18000}),
   form.locator('button[type="submit"]').click()
 ]);
 await waitForLibrary(page);
 const own=await page.evaluate(async()=>{
   const r=await fetch('/api/me',{credentials:'same-origin'});
   return {status:r.status,data:await r.json()};
 });
 assert.equal(own.status,200,'Login must have active account');
 return own.data.account.id;
}
async function logout(page){
 await menu(page);
 if(!(await page.locator('#talera-more-menu [data-action="logout"]').count()))
   await view(page,'account');
 const exit=page.locator('#talera-more-menu [data-action="logout"]');
 await exit.waitFor({timeout:8000});
 await Promise.all([page.waitForEvent('load',{timeout:18000}),exit.click()]);
 await waitForLibrary(page);
 const r=await page.evaluate(async()=>{
   const result=await fetch('/api/me',{credentials:'same-origin'});
   return result.status;
 });
 assert.equal(r,401,'Signed-out session must be revoked');
}
const onePixelPng='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/hJkAAAAASUVORK5CYII=';
async function saveSyntheticPhoto(page,n){
 return page.evaluate(async({png,n})=>{
   const photo=new File(
     [Uint8Array.from(atob(png),c=>c.charCodeAt(0))],
     'synthetic-account-'+n+'.png',{type:'image/png'});
   const row=await window.TaleraMemories.save({
     title:'synthetic ACCOUNT ISOLATION '+n,
     date:'2000-01-01',text:'Local-only imaginary image',
     narrationCues:[]
   },[photo]);
   const saved=await window.TaleraMemories.get(row.id);
   const blob=await window.TaleraMemories.blob(saved.items[0].key);
   return {id:row.id,kind:saved.items[0].kind,bytes:blob?.size||0,
     dbs:(await indexedDB.databases()).map(x=>x.name)};
 },{png:onePixelPng,n});
}
// Real DOM layout check on the SAME /tell page and synthetic account only.
// Verify original UI controls and photo IDs are unchanged while the *existing*
// tags box is rendered below the original photo grid, never cloned.
async function verifyTellEditorLayout(page,storyId){
 const edit=await page.context().newPage();
 try{
  const response=await edit.goto(origin+'/tell?edit='+encodeURIComponent(storyId),
   {waitUntil:'domcontentloaded',timeout:25000});
  assert.equal(response.status(),200,'Original editing route must remain available');
  const work=edit.locator('.work.talera-compact-work.talera-r16-editor');
  try{await work.waitFor({state:'visible',timeout:11000})}
  catch(err){
   const opener=edit.locator('[data-open]').first();
   if(!(await opener.count()))throw err;
   await opener.click();
   await work.waitFor({state:'visible',timeout:11000});
  }
  await edit.locator('.talera-tags-toggle').waitFor({state:'visible',timeout:12000});
  const layout=await edit.evaluate(()=>{
   const work=document.querySelector('.work.talera-r16-editor');
   const photos=work?.querySelector('.talera-work-tiles');
   const tags=work?.querySelector('.talera-tags-v20');
   const title=work?.querySelector('#title');
   const date=work?.querySelector('#dateToggle');
   const toolbar=work?.querySelector('.work-tools.talera-r16-toolbar');
   const toggle=tags?.querySelector('.talera-tags-toggle');
   const rect=e=>e?.getBoundingClientRect().toJSON()||null;
   return {
     originalButtons:['speak','write','publish'].map(id=>work?.querySelectorAll('#'+id).length||0),
     originalMediaTiles:photos?.querySelectorAll('.tile').length||0,
     topicBelowPhotos:!!photos&&tags?.previousElementSibling===photos,
     tagButtonText:toggle?.textContent||'',
     title:rect(title),date:rect(date),photos:rect(photos),tags:rect(tags),
     toolbar:rect(toolbar),height:innerHeight,
     mainColor:getComputedStyle(document.querySelector('#main')).backgroundColor,
     workColor:getComputedStyle(work).backgroundColor,
     hasLayoutCss:!!document.getElementById('talera-free-tell-layout-only')
   };
  });
  assert.equal(layout.hasLayoutCss,true,'Approved layout CSS not installed in original Tell');
  assert.deepEqual(layout.originalButtons,[1,1,1],
    'Original Tell, Write or Publish button was replaced or duplicated');
  assert.ok(layout.originalMediaTiles>=1,'Existing photo grid must remain intact');
  assert.equal(layout.topicBelowPhotos,true,'Tags must follow the original photo grid');
  assert.match(layout.tagButtonText,/herinnering|memory|souvenir|Erinnerung|recuerdo/i);
  assert.ok(layout.title&&layout.date&&layout.date.top>=layout.title.bottom+3,
    'Editor title and date need visible breathing room: '+JSON.stringify(layout));
  assert.ok(layout.photos&&layout.tags&&layout.tags.top>=layout.photos.bottom-2,
    'Topic row must remain under photos, not between title and media');
  assert.ok(layout.toolbar&&layout.toolbar.bottom>layout.height*.69,
    'Editor action row is unnecessarily high, leaving unused lower screen space');
  assert.equal(layout.workColor,'rgb(255, 255, 255)',
    'Original editing surface must have one even background');
  const beforeY=layout.photos.top;
  await edit.locator('.talera-tags-toggle').click();
  await edit.waitForFunction(()=>
    document.querySelector('.talera-tags-toggle')?.getAttribute('aria-expanded')==='true'&&
    !document.querySelector('.talera-tags-panel')?.hidden,
    null,{timeout:7000});
  const expanded=await edit.evaluate(()=>({
    photosTop:document.querySelector('.talera-work-tiles').getBoundingClientRect().top,
    tagPanelVisible:!document.querySelector('.talera-tags-panel').hidden,
    selectedMediaCount:document.querySelectorAll('.talera-work-tiles .tile').length,
    originalButtons:['speak','write','publish'].map(id=>document.querySelectorAll('#'+id).length)
  }));
  assert.ok(Math.abs(expanded.photosTop-beforeY)<3,
    'Opening topics must not push or jump the photo grid');
  assert.equal(expanded.tagPanelVisible,true);
  assert.equal(expanded.selectedMediaCount,layout.originalMediaTiles);
  assert.deepEqual(expanded.originalButtons,[1,1,1]);
  console.log('TALERA_TELL_EDITOR_LAYOUT_ONLY_PASS',JSON.stringify({
    photos:layout.originalMediaTiles,topicBelowPhotos:true,
    titleAndDateSeparated:true,bottomActionsRebalanced:true,
    originalButtonsPreserved:true,topicOpenDoesNotMovePhotos:true,
    originalMediaUntouched:true,syntheticOnly:true,realIphoneAccepted:false
  }));
 }finally{await edit.close()}
}
async function inventory(page){
 return page.evaluate(async()=>{
   const rows=await window.TaleraMemories.list();
   return {ids:rows.map(r=>r.id),
     dbs:(await indexedDB.databases()).map(x=>x.name)};
 });
}
// Logout hides private memories without deleting their original IndexedDB bytes.
// A fresh request to ALL THREE original PWA screens must contain zero personal
// records; no test data is ever uploaded to the deployed app or other accounts.
async function assertSignedOutEmpty(page,previousStoryId){
 const immediate=await page.evaluate(async()=>({
   count:(await window.TaleraMemories.list()).length,
   previousIdVisible:(document.body?.innerText||'').includes('synthetic ACCOUNT ISOLATION 1')
 }));
 assert.equal(immediate.count,0,'Logout must immediately hide private story rows');
 assert.equal(immediate.previousIdVisible,false,
   'Logout must immediately remove old account story text');
 const checked=[];
 for(const route of ['/mijn-leven','/present','/tell']){
   const response=await page.goto(origin+route,{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200,'Signed-out TALERA screen unavailable '+route);
   await page.waitForFunction(()=>typeof window.TaleraMemories?.list==='function',
     null,{timeout:18000});
   const state=await page.evaluate(async id=>{
     const rows=await window.TaleraMemories.list();
     const session=await fetch('/api/me',{credentials:'same-origin'});
     const active=window.__taleraTimelineRuntime?.currentMemory?.();
     const hero=document.getElementById('heroImage');
     const heroVisible=hero?.getAttribute('src')||null;
     return {
       rows:rows.length,previousIdInRows:rows.some(x=>x?.id===id),
       privateStoryReadable:!!(await window.TaleraMemories.get(id)),
       privateOriginalReadable:!!(await window.TaleraMemories.blob(id+':0')),
       sessionStatus:session.status,privatePresentation:!!active?._taleraLocal,
       previousStoryInPage:(document.body?.innerText||'').includes(
         'synthetic ACCOUNT ISOLATION 1'),
       visibleHero:heroVisible,
       demoCards:[...document.querySelectorAll('#demoCards > *')].length,
       guestEditorLayout:!!document.getElementById('talera-free-tell-layout-only'),
       guestEditorMovesTags:[...document.scripts].some(script=>
         script.textContent.includes("media.insertAdjacentElement('afterend',box)")),
       guestEditorHasTopicPrompt:[...document.scripts].some(script=>
         script.textContent.includes('Waar gaat deze herinnering over?'))
     };
   },previousStoryId);
   assert.equal(state.sessionStatus,401,'Signed-out account must be revoked '+route);
   assert.equal(state.rows,0,'Signed-out page read a personal library '+route);
   assert.equal(state.previousIdInRows,false,'Account story leaked to guest '+route);
   assert.equal(state.privateStoryReadable,false,
     'Guest could read a signed-out original story '+route);
   assert.equal(state.privateOriginalReadable,false,
     'Guest could read a signed-out original media Blob '+route);
   assert.equal(state.privatePresentation,false,
     'Signed-out presentation selected a private memory '+route);
   assert.equal(state.previousStoryInPage,false,
     'Signed-out page still contains original story text '+route);
   if(route==='/tell'){
     assert.ok(state.guestEditorLayout&&state.guestEditorMovesTags&&
       state.guestEditorHasTopicPrompt,
       'Signed-out Tell must render SAME approved layout, not old editor');
   }
   if(route==='/mijn-leven'){
     assert.equal(state.visibleHero,null,'Signed-out Home shows old private photo');
     assert.equal(state.demoCards,0,'Signed-out Home must not add example cards');
   }
   checked.push(route);
 }
 // Signed-out Home is intentionally an empty guest surface without an
 // account menu. Return through the ORIGINAL /present menu for login.
 const entry=await page.goto(origin+'/present',{waitUntil:'domcontentloaded'});
 assert.equal(entry.status(),200);
 await waitForLibrary(page);
 console.log('TALERA_F5_LOGOUT_ALL_THREE_SCREENS_EMPTY_PASS',
   JSON.stringify({checked,originalMediaNeverDeleted:true,syntheticOnly:true,
     sameDeployedOriginUntouched:true,realIphoneAccepted:false}));
}
let result;
try{
 await workerStart();
 // Regression for the owner's reported 18-Nov defect: an expired/missing
 // session must never expose the immutable 7-Nov example catalog.
 // Test the EXACT same locally built Worker and existing two app routes.
 for(const route of ['/mijn-leven','/present']){
   const response=await fetch(origin+route,{headers:{'x-talera-f5-key':gate}});
   assert.equal(response.status,200,'Anonymous original route must remain available');
   assert.equal(response.headers.get('x-talera-free-f5'),'anonymous-snapshot-only');
   const html=await response.text();
   assert.ok(!html.includes('talera-500-fotoband-')&&
     !html.includes('Test 081')&&!html.includes('TALERA_STRESS_MEMORIES'),
     'No demo source may return after account session expires: '+route);
   if(route==='/mijn-leven'){
     assert.ok(html.includes('window.__taleraReferenceMemories=[];'),
       'Signed-out Home must have zero bundled memories');
     assert.ok(html.includes('rows=[];'),
       'Signed-out Home must not read an unscoped local library');
   }else{
     assert.ok(html.includes('const MEMORIES = [];'),
       'Signed-out presentation must contain no 50+450 examples');
     assert.ok(html.includes('const rows=[]; // Login required: no local media read.')&&
       !html.includes('const rows=await store.list();'),
       'Expired session must NEVER start a personal video in the unscoped V61 Beluister player');
   }
   assert.ok(html.includes('</head>')&&html.includes('</body>')&&
     (route!=='/mijn-leven'||html.includes('id="navMore"'))&&
     (route!=='/present'||html.includes('id="photoStage"')),
     'Existing same-origin app entry and navigation must remain intact');
 }
 console.log('TALERA_F5_GUEST_HOME_PRESENT_ZERO_DEMO_SOURCE_PASS',
   JSON.stringify({routes:2,examples:0,privateRecordsAccessed:false,realIphoneAccepted:false}));
 const ids=await Promise.all(users.map(createUser));
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({
   ...devices['iPhone 13'],serviceWorkers:'allow',
   extraHTTPHeaders:{'x-talera-f5-key':gate,'cf-connecting-ip':'192.0.2.73'}
 });
 const registrationContext=await browser.newContext({
   ...devices['iPhone 13'],serviceWorkers:'allow',
   extraHTTPHeaders:{'x-talera-f5-key':gate,'cf-connecting-ip':'192.0.2.79'}
 });
 const registrationPage=await registrationContext.newPage();
 try{
   const route=await registrationPage.goto(origin+'/present?talera_menu=hub',
     {waitUntil:'domcontentloaded'});
   assert.equal(route.status(),200,'Existing account menu route unavailable');
   await waitForLibrary(registrationPage);
   await menu(registrationPage);
   let navigation=await registrationPage.evaluate(()=>
     [...document.querySelectorAll('#talera-more-menu [data-view]')]
       .map(x=>({view:x.getAttribute('data-view'),label:(x.textContent||'').trim().slice(0,70)})));
   console.log('TALERA_REAL_REGISTRATION_NAVIGATION',JSON.stringify(navigation));
   if(!navigation.some(x=>['signup','register','create'].includes(x.view))){
     const account=registrationPage.locator('#talera-more-menu [data-view="account"]');
     if(await account.count())await account.first().click();
     navigation=await registrationPage.evaluate(()=>
       [...document.querySelectorAll('#talera-more-menu [data-view]')]
         .map(x=>({view:x.getAttribute('data-view'),label:(x.textContent||'').trim().slice(0,70)})));
     console.log('TALERA_REAL_REGISTRATION_ACCOUNT_NAVIGATION',JSON.stringify(navigation));
   }
   const next=navigation.find(x=>['signup','register','create'].includes(x.view));
   assert.ok(next,'Owner registration action unreachable from original account menu');
   await registrationPage.locator('#talera-more-menu [data-view="'+next.view+'"]').first().click();
   const structure=await registrationPage.evaluate(()=>{
     const container=document.getElementById('talera-more-menu');
     return {
       forms:[...container.querySelectorAll('form')].map(f=>({
         formName:f.dataset.form||'',noValidate:f.noValidate,
         fields:[...f.elements].map(e=>({
           tag:e.tagName,name:e.name||'',type:e.type||'',
           required:e.required||false,minLength:e.minLength,
           min:e.min||'',max:e.max||'',pattern:e.pattern||'',
           placeholder:e.placeholder||'',text:e.tagName==='BUTTON'?(e.textContent||'').trim().slice(0,55):''
         }))
       })),
       buttons:[...container.querySelectorAll('button')].map(b=>({
         type:b.type,action:b.dataset.action||'',view:b.dataset.view||'',
         text:(b.textContent||'').trim().slice(0,55)})).slice(-15)
     };
   });
   console.log('TALERA_REAL_REGISTRATION_FORM_STRUCTURE',JSON.stringify(structure));
   const menuSource=readFileSync(path.join(here,'generated','approved-menu-original.mjs'),'utf8');
   const sourceLocations=['/api/register',"data-form=\"register\"","form.dataset.form","case 'register'","data-form='register'"];
   console.log('TALERA_REGISTRATION_SOURCE_HANDLERS',JSON.stringify(
     sourceLocations.map(needle=>{
       const at=menuSource.indexOf(needle);
       return {needle,found:at>=0,context:at<0?'':menuSource.slice(
         Math.max(0,at-900),Math.min(menuSource.length,at+1250))};
     })
   ));
   const signupUser={
     email:'f5-ui-register-'+testKey+'@example.invalid',
     username:'f5uiregister'+testKey,
     displayName:'F5 synthetic UI registration',
     password:'F5_Synthetic_Registration_Test_Only_2026!'
   };
   const registrationTraffic=[];
   registrationPage.on('response',response=>{
     const url=new URL(response.url());
     if(url.origin===origin&&url.pathname==='/api/register')
       registrationTraffic.push({status:response.status(),method:response.request().method()});
   });
   const form=registrationPage.locator('#talera-more-menu form[data-form="register"]');
   await form.locator('input[name="displayName"]').fill(signupUser.displayName);
   await form.locator('input[name="username"]').fill(signupUser.username);
   await form.locator('input[name="email"]').fill(signupUser.email);
   await form.locator('input[name="register-password"]').fill(signupUser.password);
   await form.locator('input[name="register-confirm"]').fill(signupUser.password);
   // DOB is injected after the legacy menu's first synchronous render.
   // Wait for the real visible input just as the owner does on their iPhone.
   await form.locator('input[name="birthDate"]').waitFor({state:'visible',timeout:10000});
   await form.locator('input[name="birthDate"]').fill('1974-04-02');
   const nativeValidity=await form.evaluate(form=>({
     valid:form.checkValidity(),
     invalid:[...form.elements].filter(e=>e.willValidate&&!e.checkValidity())
       .map(e=>({name:e.name,reason:e.validity?.valueMissing?'required':e.validity?.patternMismatch?'pattern':e.validationMessage.slice(0,130)}))
   }));
   await form.locator('button[type="submit"]').first().click();
   await registrationPage.waitForTimeout(1800);
   const afterSubmit=await registrationPage.evaluate(()=>({
     url:location.pathname,menu:document.getElementById('talera-more-menu')?.innerText?.slice(-750),
     registered:document.documentElement.dataset.taleraAuth||'',
     registrationOpen:!!document.querySelector('form[data-form="register"]')
   }));
   console.log('TALERA_REAL_REGISTRATION_SUBMIT_DIAGNOSTIC',JSON.stringify({
     nativeValidity,registrationTraffic,afterSubmit
   }));
   assert.equal(nativeValidity.valid,true,'Fully completed registration must satisfy browser validation');
   assert.equal(registrationTraffic.length,1,'Confirmation tap must send exactly one account request');
   assert.equal(registrationTraffic[0].status,200,
     'Fully completed original TALERA registration must succeed (server status only)');
   const registered=await registrationPage.evaluate(async()=>{
     const res=await fetch('/api/me',{credentials:'same-origin'});
     return {status:res.status,hasAccount:!!(await res.json()).account?.id};
   });
   assert.deepEqual(registered,{status:200,hasAccount:true},
     'The original confirmation tap must leave the user really signed in');
   // A second browser with the same email must never silently appear to
   // accept registration: reproduce a real owner-visible 409 in the SAME app.
   const existingContext=await browser.newContext({
     ...devices['iPhone 13'],serviceWorkers:'allow',
     extraHTTPHeaders:{'x-talera-f5-key':gate,'cf-connecting-ip':'192.0.2.78'}
   });
   try{
     const existingPage=await existingContext.newPage();
     const registeredPage=await existingPage.goto(origin+'/present',{waitUntil:'domcontentloaded'});
     assert.equal(registeredPage.status(),200);
     await waitForLibrary(existingPage);
     await menu(existingPage);
     await view(existingPage,'account');
     await view(existingPage,'register');
     const previous=existingPage.locator('#talera-more-menu form[data-form="register"]');
     await previous.locator('input[name="birthDate"]').waitFor({state:'visible',timeout:10000});
     await previous.locator('input[name="displayName"]').fill(signupUser.displayName);
     await previous.locator('input[name="username"]').fill(signupUser.username+'2');
     await previous.locator('input[name="birthDate"]').fill('1974-04-02');
     await previous.locator('input[name="email"]').fill(signupUser.email);
     await previous.locator('input[name="register-password"]').fill(signupUser.password);
     await previous.locator('input[name="register-confirm"]').fill(signupUser.password);
     const duplicateResponse=existingPage.waitForResponse(res=>
       new URL(res.url()).pathname==='/api/register',{timeout:17000});
     await previous.locator('button[type="submit"]').first().click();
     const duplicate=await duplicateResponse;
     await existingPage.waitForTimeout(350);
     const result=await existingPage.evaluate(()=>{
       const panel=document.getElementById('talera-more-menu');
       const form=panel?.querySelector('form[data-form="register"]');
       const status=[...panel.querySelectorAll('[role="alert"],.feedback,.notice,.message')]
         .map(el=>({text:(el.textContent||'').trim().slice(0,250),
           visible:!!el.getBoundingClientRect().height})).filter(x=>x.text);
       return {formStillVisible:!!form,allNotice:status,
         tailText:(panel?.innerText||'').slice(-700)};
     });
     console.log('TALERA_DUPLICATE_ACCOUNT_REGISTRATION_FEEDBACK',JSON.stringify({
       serverStatus:duplicate.status(),ui:result
     }));
     assert.equal(duplicate.status(),409,
       'Existing email in new Free system must refuse duplicate registration');
     assert.ok(/Registreren is niet gelukt|niet beschikbaar|bestaat al|bezet/i.test(result.tailText),
       'The user must see a clear refusal when their email is already in Free');
   }finally{await existingContext.close()}
   assert.ok(structure.forms.some(f=>/register|signup/i.test(f.formName)),
     'Original account registration form missing in actual mobile UI');
 }finally{await registrationContext.close()}
 const page=await context.newPage();
 // Passive synthetic-only trace: which original UI account/settings screens
 // actually call a Free API? Never record queries, bodies, cookies or tokens.
 const apiTrace=[];
 page.on('response',response=>{
   try{
     const u=new URL(response.url());
     if(u.origin===origin&&u.pathname.startsWith('/api/'))
       apiTrace.push({path:u.pathname,method:response.request().method(),
         status:response.status()});
   }catch{}
 });
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e?.message||e).slice(0,180)));
 page.on('requestfailed',r=>console.log('TALERA_F5_BROWSER_FAILED_REQUEST',
   r.url().slice(0,200),r.failure()?.errorText));
 page.on('console',m=>{
   if(['error','warning'].includes(m.type()))
     console.log('TALERA_F5_BROWSER_JS_CONSOLE',m.type(),m.text().slice(0,320));
 });
 // Read the three exact original public HTML snapshots first. The menu
 // script can be shipped as a static asset without being loaded by any page.
 const sourceChecks=['mijn-leven','present','tell'].map(route=>{
   const src=readFileSync(path.join(here,'../free-10m-delivery/generated',
      'reference-'+route+'.html'),'utf8');
   return {route,length:src.length,menuMentions:
     (src.match(/menu-integration/g)||[]).length,
     accountMenuMentions:(src.match(/talera-more-menu/g)||[]).length,
     externalScriptMentions:(src.match(/__clean\//g)||[]).length};
 });
 console.log('TALERA_F5_APPROVED_ACCOUNT_MENU_SOURCE_PAGES',JSON.stringify(sourceChecks));
 let activeRoute=null;
 for(const route of ['/mijn-leven','/present','/tell']){
   const pageResult=await page.goto(origin+route,{waitUntil:'domcontentloaded'});
   assert.equal(pageResult.status(),200,'Original page unavailable: '+route);
   await page.waitForTimeout(1500);
   // An old, unscoped guest database may remain on a real iPhone from earlier
   // F5 builds. No signed-out route may expose it or publish more records.
   const guestLibrary=await page.evaluate(async()=>{
     const store=window.TaleraMemories;
     if(!store?.localOnly||typeof store.list!=='function')return {available:false};
     const rows=await store.list();
     let publishRejected=false;
     try{await store.save({title:'Synthetisch gastverhaal',date:'2001-01-01',text:'geen data'},[])}
     catch{publishRejected=true}
     return {available:true,records:rows.length,publishRejected};
   });
   assert.deepEqual(guestLibrary,{available:true,records:0,publishRejected:true},
     'Signed-out TALERA route must not access or write any unscoped guest records: '+route);
   const check=await page.evaluate(()=>({
     menu:!!document.getElementById('talera-more-menu'),
     library:typeof window.TaleraMemories?.list,
     buttons:[...document.querySelectorAll('button')].slice(0,22)
       .map(x=>({id:x.id,aria:x.getAttribute('aria-label'),
        text:(x.textContent||'').slice(0,28)}))
   }));
   console.log('TALERA_F5_ACCOUNT_MENU_ROUTE_PROBE',JSON.stringify({route,...check}));
   if(route==='/present'){
     const guestState=await page.evaluate(()=>({
       ownerMemory:!!window.__taleraTimelineRuntime?.currentMemory?.()?._taleraLocal,
       legacyListenButtons:document.querySelectorAll('button.talera-v61-audio-permission-hint').length,
       activeVideo:!!document.querySelector('video.talera-v61-inline-video')
     }));
     assert.deepEqual(guestState,{ownerMemory:false,legacyListenButtons:0,activeVideo:false},
       'Guest presentation must not start personal media or legacy Beluister');
     console.log('TALERA_F5_GUEST_NO_LEGACY_BELUISTER_PASS',
       JSON.stringify({...guestState,realIphoneAccepted:false}));
   }
   // The published iPhone bug was VISIBLE example tiles after login expired,
   // not just unused demo data in a build. Verify the actual rendered surface.
   if(route==='/mijn-leven'){
     const visibleExamples=await page.evaluate(()=>{
       const visible=el=>{
         const s=getComputedStyle(el),r=el.getBoundingClientRect();
         return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
       };
       return {
         topicCards:[...document.querySelectorAll('.talera-topic-card')].filter(visible).length,
         demoCards:[...document.querySelectorAll('#demoCards > *')].filter(visible).length,
         exampleStoryVisible:/Test 081|Voorbeelden hieronder bekijken/i.test(document.body.innerText)
       };
     });
     assert.deepEqual(visibleExamples,{topicCards:0,demoCards:0,exampleStoryVisible:false},
       'Logged-out Home MUST visually contain no example stories: '+
       JSON.stringify(visibleExamples));
     console.log('TALERA_F5_GUEST_HOME_VISUALLY_EMPTY_PASS',
       JSON.stringify({...visibleExamples,realIphoneAccepted:false}));
   }
   if(route==='/mijn-leven'){
     // The home-screen Meer tap was not covered by the old successful menu
     // test, which fell back to /present. Record the REAL home entry behavior
     // without changing its handlers, routes, design or account.
     const tap=await page.evaluate(()=>{
       const triggers=[...document.querySelectorAll('button,a,[role="button"]')]
         .filter(n=>/^(meer|more)$|^(•••\\s*)?(meer|more)$|\\bmeer\\b|\\bmore\\b/i.test(
           [n.getAttribute('aria-label')||'',n.textContent||''].join(' ').trim()))
         .filter(n=>!n.closest('#talera-more-menu'));
       const candidates=triggers.slice(0,8).map(n=>({
         tag:n.tagName,id:n.id,text:(n.textContent||'').trim().slice(0,65),
         aria:n.getAttribute('aria-label'),href:n.getAttribute('href'),
         dataAction:n.getAttribute('data-action'),html:n.outerHTML.slice(0,450)
       }));
       const b=triggers.find(n=>n.getBoundingClientRect().width>0&&
         n.getBoundingClientRect().height>0);
       if(b)b.click();
       const labelNodes=[...document.querySelectorAll('body *')]
         .filter(e=>e.children.length===0&&/^(meer|more)$/i.test((e.textContent||'').trim()))
         .slice(0,4).map(e=>({leaf:e.outerHTML.slice(0,260),
           parent:e.parentElement?.outerHTML.slice(0,950)}));
       const textNodes=[];
       const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
       while(tw.nextNode()&&textNodes.length<4){
         const value=(tw.currentNode.textContent||'').trim();
         if(/^(meer|more)$/i.test(value)){
           const p=tw.currentNode.parentElement;
           textNodes.push({value,parent:p?.outerHTML.slice(0,700),
             grandparent:p?.parentElement?.outerHTML.slice(0,1200)});
         }
       }
       return {candidates,tapped:!!b,labelNodes,textNodes};
     });
     await page.waitForTimeout(700);
     const after=await page.evaluate(()=>({
       href:location.href,
       menuExists:!!document.getElementById('talera-more-menu'),
       menuVisible:!!document.getElementById('talera-more-menu')&&
         !document.getElementById('talera-more-menu').hidden,
       bodyEnd:(document.body?.innerText||'').slice(-420)
     }));
     console.log('TALERA_F5_HOME_MORE_ACTUAL_NAV_DIAGNOSTIC',JSON.stringify({
       tap,after
     }));
     const homeMore=page.locator('#navMore');
     assert.equal(await homeMore.getAttribute('href'),'/present?talera_menu=hub',
       'Original home menu href changed; preserve its navigation contract');
     const [menuNav]=await Promise.all([
       page.waitForResponse(r=>r.url().includes('/present?talera_menu=hub')&&
         r.request().isNavigationRequest(),{timeout:14000}),
       homeMore.click()
     ]);
     assert.equal(menuNav.status(),200,'Original home More link must not land on JSON 404');
     await page.waitForFunction(()=>{
       const n=document.getElementById('talera-more-menu');
       return !!n&&!n.hidden;
     },null,{timeout:11000});
     console.log('TALERA_F5_HOME_MORE_END_TO_END_PASS',JSON.stringify({
       originalMenuOpened:true,sameOrigin:true,newSeparateApp:false,
       originalBottomNavigationMarkupUntouched:true
     }));

   }

   if(check.menu&&check.library==='function'){activeRoute=route;break}
 }
 assert.ok(activeRoute,
   'No original PWA screen initializes a live account menu and local memory store');
 console.log('TALERA_F5_ACCOUNT_MENU_TEST_ROUTE',activeRoute);
 await waitForLibrary(page);
 const owner=await login(page,users[0]);
 assert.equal(owner,ids[0],'First actual menu login must select existing account ID');
 const a=await saveSyntheticPhoto(page,1);
 assert.equal(a.kind,'photo');
 assert.ok(a.bytes>10,'Synthetic local original photo Blob was not saved');
 await verifyTellEditorLayout(page,a.id);
 await logout(page);
 await assertSignedOutEmpty(page,a.id);
 const guest=await login(page,users[1]);
 assert.equal(guest,ids[1],'Second login must switch browser to second ID');
 const beforeB=await inventory(page);
 assert.ok(!beforeB.ids.includes(a.id),'Second account can see FIRST local story');
 const foreignOriginal=await page.evaluate(async id=>({
   story:await window.TaleraMemories.get(id),
   media:await window.TaleraMemories.blob(id+':0')
 }),a.id);
 assert.ok(foreignOriginal.story==null,
   'Second account must not read first account original story');
 assert.equal(foreignOriginal.media,null,
   'Second account must not read first account original media Blob');
 const b=await saveSyntheticPhoto(page,2);
 assert.ok(b.bytes>10);
 const afterB=await inventory(page);
 assert.ok(!afterB.ids.includes(a.id),'First story appeared after second save');
 await logout(page);
 await assertSignedOutEmpty(page,b.id);
 assert.equal(await login(page,users[0]),ids[0]);
 const returning=await inventory(page);
 assert.ok(returning.ids.includes(a.id),'Returning original account lost local memory');
 assert.ok(!returning.ids.includes(b.id),'Original account can see SECOND story');
 const readback=await page.evaluate(async id=>{
   const row=await window.TaleraMemories.get(id);
   const file=await window.TaleraMemories.blob(row.items[0].key);
   return {id:row.id,size:file?.size||0,type:file?.type||''};
 },a.id);
 assert.equal(readback.id,a.id);
 assert.equal(readback.size,a.bytes,'Original file changed during account switches');
 assert.match(readback.type,/image\/png/);
 // The original signed-in app must expose the SAME account-local story in
 // Home, the ordinary presentation and the Tell editor on the SAME origin.
 // Do not create a second app, account, test Worker, or copy any media.
 for(const route of ['/mijn-leven','/present','/tell']){
   const follower=await context.newPage();
   try{
     const response=await follower.goto(origin+route,{waitUntil:'domcontentloaded'});
     assert.equal(response.status(),200,'Authenticated route unavailable: '+route);
     await follower.waitForFunction(async id=>{
       const store=window.TaleraMemories;
       if(typeof store?.list!=='function')return false;
       const rows=await store.list();
       return rows.some(row=>row?.id===id&&
         row.title==='synthetic ACCOUNT ISOLATION 1');
     },a.id,{timeout:20000});
     if(route==='/present'){
       await follower.waitForFunction(id=>{
         const memory=window.__taleraTimelineRuntime?.currentMemory?.();
         return memory?.storyId===id && memory._taleraLocal &&
           memory._zeroFrames?.length===1 && !memory._photoLoading;
       },a.id,{timeout:20000});
     }
     const proof=await follower.evaluate(async id=>{
       const store=window.TaleraMemories;
       const story=await store.get(id);
       const original=await store.blob(story.items[0].key);
       const current=window.__taleraTimelineRuntime?.currentMemory?.();
       return {
         storyId:story?.id,mediaId:story?.items?.[0]?.key,
         title:story?.title,text:story?.text,photoBytes:original?.size||0,
         selectedPresentationId:current?.storyId||null,
         libraryReader:typeof window.TaleraLibrary?.get==='function'
       };
     },a.id);
     assert.equal(proof.storyId,a.id,'Story ID changed across app screens');
     assert.equal(proof.mediaId,readback.id+':0',
       'Original stored media ID must survive every screen');
     assert.equal(proof.title,'synthetic ACCOUNT ISOLATION 1');
     assert.equal(proof.text,'Local-only imaginary image');
     assert.equal(proof.photoBytes,a.bytes,'Original photo bytes changed across screens');
     if(route==='/present')assert.equal(proof.selectedPresentationId,a.id,
       'Ordinary presentation failed to select the stored story');
     if(route==='/present'){
       // The existing WhatsApp sheet is part of the ORIGINAL presentation.
       // Trace its first failed request using only synthetic local memories,
       // not the owner's account or an external WhatsApp delivery.
       const shareTraffic=[];
       follower.on('response',r=>{
         if(/\/api\/(?:pwa|memories|shares)/.test(new URL(r.url()).pathname))
           shareTraffic.push({method:r.request().method(),
             pathname:new URL(r.url()).pathname,status:r.status()});
       });
       await follower.waitForFunction(()=>{
         const bar=document.querySelector('#talera-clean-social');
         return !!bar&&!bar.hidden&&!!bar.querySelector('[data-action=share]');
       },null,{timeout:15000});
       await follower.waitForTimeout(1700);
       await follower.locator('#talera-clean-social [data-action=share]').click();
       await follower.waitForFunction(()=>
         !!document.querySelector('#talera-clean-overlay:not([hidden]) [data-action=prepare]'),
         null,{timeout:12000});
       await follower.waitForTimeout(250);
       const modalSnapshot=()=>follower.evaluate(()=>{
         const el=document.querySelector('#talera-clean-overlay');
         const panel=el?.firstElementChild;
         const z=element=>{if(!element)return null;const cs=getComputedStyle(element),
           b=element.getBoundingClientRect();return {top:b.top,bottom:b.bottom,
             height:b.height,scrollHeight:element.scrollHeight,
             clientHeight:element.clientHeight,overflowY:cs.overflowY,
             touchAction:cs.touchAction,webkitOverflowScrolling:cs.webkitOverflowScrolling,
             position:cs.position,maxHeight:cs.maxHeight};
         };
         return {overlay:z(el),panel:z(panel),status:panel?.querySelector('.status')?.textContent,
           prepareDisabled:panel?.querySelector('[data-action=prepare]')?.disabled,
           sendDisabled:panel?.querySelector('[data-action=send]')?.disabled,
           checkbox:!!panel?.querySelector('#talera-clean-consent')};
       });
       const initialShareModal=await modalSnapshot();
       await follower.setViewportSize({width:390,height:610});
       await follower.waitForTimeout(140);
       const smallShareModal=await modalSnapshot();
       const sheetScroll=await follower.evaluate(()=>{
         const sheet=document.querySelector('#talera-clean-overlay')?.firstElementChild;
         const before=sheet?.scrollTop||0;
         if(sheet)sheet.scrollTop=120;
         return {before,after:sheet?.scrollTop||0,
           scrollable:!!sheet&&sheet.scrollHeight>sheet.clientHeight};
       });
       assert.ok(smallShareModal.panel?.touchAction==='pan-y'&&
         smallShareModal.panel?.overflowY==='auto'&&
         sheetScroll.scrollable&&sheetScroll.after>sheetScroll.before+25,
         'Original WhatsApp sheet must support iPhone touch scrolling: '+
           JSON.stringify({smallShareModal,sheetScroll}));
       console.log('TALERA_F5_WHATSAPP_NATIVE_SCROLL_PASS',JSON.stringify({
         touchAction:smallShareModal.panel.touchAction,
         overflowY:smallShareModal.panel.overflowY,
         scrollTop:sheetScroll.after,onlyOriginalModal:true,
         realIphoneAccepted:false
       }));
     }
     if(route==='/tell'){
       // Visual-only regression on the ORIGINAL editor of this same account.
       // No change to title, date, photo order, tag data or publish handlers.
       const editor=await follower.goto(origin+'/tell?edit='+encodeURIComponent(a.id),
         {waitUntil:'domcontentloaded'});
       assert.equal(editor.status(),200,'Existing Tell editor edit route must open');
       await follower.waitForFunction(()=>
         !!document.querySelector('.work.talera-r16-editor .talera-tags-v20')&&
         !!document.querySelector('.work.talera-r16-editor .talera-work-tiles .tile'),
         null,{timeout:20000});
       const layout=await follower.evaluate(()=>{
         const q=s=>document.querySelector(s);
         const bounds=s=>{const e=q(s);if(!e)return null;
           const r=e.getBoundingClientRect();
           return {top:r.top,bottom:r.bottom,left:r.left,width:r.width,
             height:r.height,visible:r.height>0&&r.width>0}};
         const bg=s=>{const e=q(s);return e?getComputedStyle(e).backgroundColor:null};
         return {
           title:bounds('.talera-v14-heading #title'),
           date:bounds('.talera-v14-heading #dateToggle'),
           photos:bounds('.talera-work-tiles'),
           topics:bounds('.talera-tags-v20'),
           topicButton:bounds('.talera-tags-toggle'),
           actions:bounds('.work-tools.talera-r16-toolbar'),
           backgrounds:{body:bg('body'),app:bg('#app'),work:bg('.work.talera-r16-editor')},
           nativeActions:['speak','write','publish'].map(id=>({
             id,exists:!!q('#'+id),text:(q('#'+id)?.textContent||'').trim()
           })),
           originalTiles:document.querySelectorAll('.talera-work-tiles .tile[data-id]').length
         };
       });
       assert.ok(layout.title?.visible&&layout.date?.visible&&
         layout.photos?.visible&&layout.topics?.visible&&
         layout.topicButton?.height>=46&&layout.actions?.visible,
         'Approved Tell layout missing original editor controls: '+JSON.stringify(layout));
       assert.ok(layout.date.top-layout.title.bottom>=1,
         'Title and date still crowd each other: '+JSON.stringify(layout));
       assert.ok(layout.photos.top>=layout.date.bottom-1,
         'Photo tiles overlap title/date: '+JSON.stringify(layout));
       assert.ok(layout.topics.top>=layout.photos.bottom-1,
         'Characteristics must stay BELOW photo grid: '+JSON.stringify(layout));
       assert.ok(layout.actions.top>=layout.topics.bottom-1,
         'Original actions must stay below topic editor: '+JSON.stringify(layout));
       assert.equal(layout.originalTiles,1,'Same one original photo tile expected');
       assert.deepEqual(layout.nativeActions.map(x=>x.exists),[true,true,true],
         'Tell/Speak/Publish handlers must not be removed');
       assert.equal(layout.backgrounds.work,'rgb(255, 255, 255)',
         'Tell editor background must be uniform white');
       // Four DOM-only visual tiles mimic the owner's five-photo iPhone grid.
       // No IndexedDB writes, media uploads, or test memories persist.
       await follower.evaluate(()=>{
         const grid=document.querySelector('.talera-work-tiles .tiles');
         if(!grid)throw Error('Original photo grid absent');
         for(let i=0;i<4;i++){
           const tile=document.createElement('div');
           tile.className='tile';
           tile.dataset.visualOnly='yes';
           tile.setAttribute('aria-hidden','true');
           grid.insertBefore(tile,grid.lastElementChild);
         }
       });
       const beforePhotos=await follower.evaluate(()=>
         document.querySelector('.talera-work-tiles')?.getBoundingClientRect().top);
       // The iPhone owner reports the entire editor width jumping when
       // opening characteristics. Verify the same dimensions before/after.
       const sizeSnapshot=()=>follower.evaluate(()=>{
         const rect=s=>{const el=document.querySelector(s),r=el?.getBoundingClientRect();
           return r?{x:r.x,y:r.y,width:r.width,height:r.height}:null};
         const css=s=>{const el=document.querySelector(s),v=el&&getComputedStyle(el);
           return v?{width:v.width,padding:v.padding,maxWidth:v.maxWidth,
             fontSize:v.fontSize,transform:v.transform,zoom:v.zoom}:null};
         const heading=document.querySelector('.talera-tags-toggle');
         const range=document.createRange();
         if(heading?.firstChild)range.selectNodeContents(heading.firstChild);
         const headingMetrics=heading?{
           lineRects:range.getClientRects().length,
           scrollWidth:heading.scrollWidth,clientWidth:heading.clientWidth,
           whiteSpace:getComputedStyle(heading).whiteSpace
         }:null;
         return {
           viewport:{innerWidth,innerHeight,clientWidth:document.documentElement.clientWidth,
             visibleHeight:visualViewport?.height||innerHeight,
             scale:visualViewport?.scale,dpr:devicePixelRatio},
           headingMetrics,
           app:rect('#app'),main:rect('#main'),
           work:rect('.work.talera-r16-editor'),
           title:rect('.talera-v14-heading #title'),
           date:rect('.talera-v14-heading #dateToggle'),
           photos:rect('.talera-work-tiles'),toggle:rect('.talera-tags-toggle'),
           toolbar:rect('.work-tools.talera-r16-toolbar'),
           workStyle:css('.work.talera-r16-editor'),mainStyle:css('#main')
         };
       });
       const beforeSize=await sizeSnapshot();
       await follower.locator('.talera-tags-toggle').click();
       await follower.waitForTimeout(120);
       const afterSize=await sizeSnapshot();
       console.log('TALERA_FREE_TELL_SIZE_BEFORE_AFTER_OPEN',
         JSON.stringify({beforeSize,afterSize}));
       assert.ok(beforeSize.work&&afterSize.work&&beforeSize.photos&&afterSize.photos,
         'The original editor and photo grid must exist');
       assert.ok(beforeSize.title&&beforeSize.date&&
         beforeSize.title.y>=beforeSize.work.y-1 &&
         beforeSize.date.y>=beforeSize.title.y+beforeSize.title.height-1 &&
         beforeSize.photos.y>=beforeSize.date.y+beforeSize.date.height-1 &&
         beforeSize.photos.y<=180,
         'Title, date, and photos must move UP without overlap: '+
           JSON.stringify(beforeSize));
       assert.ok(beforeSize.toolbar&&afterSize.toolbar&&
         Math.abs(afterSize.toolbar.y-beforeSize.toolbar.y)<3 &&
         afterSize.toolbar.y+afterSize.toolbar.height<=
           afterSize.viewport.visibleHeight-8,
         'Original action controls must remain stationary');
       assert.ok(beforeSize.work.width>=beforeSize.viewport.innerWidth-34 &&
         afterSize.work.width>=afterSize.viewport.innerWidth-34,
         'Tell editor must retain full original wide layout: '+
         JSON.stringify({beforeSize,afterSize}));
       assert.ok([beforeSize,afterSize].every(x=>x.headingMetrics &&
         x.headingMetrics.lineRects===1 &&
         x.headingMetrics.whiteSpace==='nowrap' &&
         x.headingMetrics.scrollWidth<=x.headingMetrics.clientWidth+1),
         'Full characteristics question must fit on ONE line with no clipping: '+
         JSON.stringify({beforeSize,afterSize}));
       assert.ok(Math.abs(beforeSize.work.width-afterSize.work.width)<2 &&
         Math.abs(beforeSize.photos.width-afterSize.photos.width)<2 &&
         Math.abs(beforeSize.photos.x-afterSize.photos.x)<2 &&
         Math.abs((beforeSize.viewport.scale||1)-(afterSize.viewport.scale||1))<.01,
         'Editor must not change width or visual zoom on characteristics expansion: '+
           JSON.stringify({beforeSize,afterSize}));
       const scroller=await follower.evaluate(()=>{
         const panel=document.querySelector('.talera-tags-panel');
         const toolbar=document.querySelector('.work.talera-r16-editor .work-tools.talera-r16-toolbar');
         const before=panel.scrollTop;
         const toolbarBeforeScroll=toolbar?.getBoundingClientRect().bottom;
         const pageBeforeScroll=document.scrollingElement?.scrollTop||0;
         panel.scrollTop=panel.scrollHeight;
         const after=panel.scrollTop;
         return {
           before,after,scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight,
           overflow:getComputedStyle(panel).overflowY,
           toolbarBottom:toolbar?.getBoundingClientRect().bottom,
           toolbarBeforeScroll,
           pageBeforeScroll,pageAfterScroll:document.scrollingElement?.scrollTop||0,
           viewport:window.visualViewport?.height||innerHeight,
           fakeTiles:document.querySelectorAll('.talera-work-tiles .tile[data-visual-only=yes]').length,
           photoTop:document.querySelector('.talera-work-tiles')?.getBoundingClientRect().top
         };
       });
       assert.equal(scroller.fakeTiles,4,'Five-photo visual test missing tiles');
       assert.equal(scroller.overflow,'auto','Topic panel must independently scroll');
       assert.ok(scroller.scrollHeight>scroller.clientHeight+15,
         'Long topic options must be bounded: '+JSON.stringify(scroller));
       assert.ok(scroller.after>scroller.before+15,
         'The final characteristic must be reachable: '+JSON.stringify(scroller));
       assert.ok(Math.abs(scroller.toolbarBottom-scroller.toolbarBeforeScroll)<2,
         'Scrolling the choices must NOT move the original toolbar: '+
           JSON.stringify(scroller));
       assert.equal(scroller.pageAfterScroll,scroller.pageBeforeScroll,
         'Scrolling the choices must NOT scroll the whole page');
       const expanded=await follower.evaluate(()=>{
         const panel=document.querySelector('.talera-tags-panel');
         return {expanded:document.querySelector('.talera-tags-toggle')?.getAttribute('aria-expanded'),
           panelVisible:!!panel&&!panel.hidden,
           photoTop:document.querySelector('.talera-work-tiles')?.getBoundingClientRect().top,
           topicTop:document.querySelector('.talera-tags-v20')?.getBoundingClientRect().top};
       });
       assert.equal(expanded.expanded,'true','Original characteristic toggle no longer opens');
       assert.equal(expanded.panelVisible,true,'Characteristic choices are still hidden');
       assert.ok(Math.abs(expanded.photoTop-beforePhotos)<3,
         'Opening characteristics must not shift photos upward: '+JSON.stringify(expanded));
       await follower.locator('.talera-tags-toggle').click();
       assert.equal(await follower.locator('.talera-tags-toggle').getAttribute('aria-expanded'),'false');
       // The owner's larger iPhone has substantially more unused space.
       // On that viewport the choices must grow into the free region, while
       // the unchanged, original bottom action bar stays pinned in layout.
       await follower.setViewportSize({width:390,height:844});
       await follower.waitForTimeout(120);
       const tallBefore=await follower.evaluate(()=>{
         const bounds=s=>document.querySelector(s)?.getBoundingClientRect();
         return {
           toolbarTop:bounds('.work-tools.talera-r16-toolbar')?.top,
           toolbarBottom:bounds('.work-tools.talera-r16-toolbar')?.bottom,
           photoTop:bounds('.talera-work-tiles')?.top,
           photoWidth:bounds('.talera-work-tiles')?.width,
           titleTop:bounds('.talera-v14-heading #title')?.top,
           dateTop:bounds('.talera-v14-heading #dateToggle')?.top,
           tagsTop:bounds('.talera-tags-toggle')?.top
         };
       });
       await follower.locator('.talera-tags-toggle').click();
       await follower.waitForTimeout(140);
       const tallAfter=await follower.evaluate(()=>{
         const bounds=s=>document.querySelector(s)?.getBoundingClientRect();
         const panel=document.querySelector('.talera-tags-panel');
         const publish=document.querySelector('#publish');
         const rect=publish?.getBoundingClientRect();
         const bottom=window.visualViewport?.height||innerHeight;
         return {
           toolbarTop:bounds('.work-tools.talera-r16-toolbar')?.top,
           toolbarBottom:bounds('.work-tools.talera-r16-toolbar')?.bottom,
           photoTop:bounds('.talera-work-tiles')?.top,
           photoWidth:bounds('.talera-work-tiles')?.width,
           panelHeight:panel?.getBoundingClientRect().height,
           panelClientHeight:panel?.clientHeight,
           panelScrollHeight:panel?.scrollHeight,
           publishTouchable:!!rect&&rect.top>=0&&rect.bottom<=bottom-8&&
             document.elementFromPoint(rect.left+rect.width*.5,
               rect.top+rect.height*.5)?.closest('#publish')===publish
         };
       });
       console.log('TALERA_FREE_TELL_TALL_GAP_USE',
         JSON.stringify({before:tallBefore,after:tallAfter}));
       assert.ok(tallAfter.panelHeight>=120&&
         tallAfter.panelScrollHeight>tallAfter.panelClientHeight+12,
         'Tall iPhone must use the otherwise empty gap for scrollable topics: '+
           JSON.stringify({tallBefore,tallAfter}));
       assert.ok(Math.abs(tallBefore.toolbarTop-tallAfter.toolbarTop)<2 &&
         Math.abs(tallBefore.toolbarBottom-tallAfter.toolbarBottom)<2 &&
         Math.abs(tallBefore.photoTop-tallAfter.photoTop)<2 &&
         Math.abs(tallBefore.photoWidth-tallAfter.photoWidth)<2 &&
         tallAfter.publishTouchable,
         'Tall iPhone must preserve photos and the original fixed action bar: '+
           JSON.stringify({tallBefore,tallAfter}));
       // A selected characteristic must not create a new hidden footer.
       // Test with a DOM-only chip: never persist data in a real account.
       const selectedChip=await follower.evaluate(()=>{
         const selected=document.querySelector('.talera-tags-selected');
         if(!selected)return {exists:false};
         const chip=document.createElement('span');
         chip.textContent='Jeugd ×';
         chip.dataset.visualOnly='yes';
         selected.append(chip);
         window.dispatchEvent(new Event('resize'));
         return {exists:true};
       });
       assert.ok(selectedChip.exists,'Original selected-characteristics area missing');
       await follower.waitForTimeout(120);
       const chosenTall=await follower.evaluate(()=>{
         const bar=document.querySelector('.work-tools.talera-r16-toolbar')?.getBoundingClientRect();
         const panel=document.querySelector('.talera-tags-panel')?.getBoundingClientRect();
         const chosen=document.querySelector('.talera-tags-selected')?.getBoundingClientRect();
         return {barTop:bar?.top,barBottom:bar?.bottom,
           panelHeight:panel?.height,chosenHeight:chosen?.height,
           chosenTop:chosen?.top,viewport:visualViewport?.height||innerHeight};
       });
       console.log('TALERA_FREE_TELL_SELECTED_TAG_GAP',JSON.stringify(chosenTall));
       assert.ok(Math.abs(tallBefore.toolbarTop-chosenTall.barTop)<2 &&
         chosenTall.barBottom<=chosenTall.viewport-8,
         'Selected topic may NOT move original bottom actions: '+
           JSON.stringify({tallBefore,chosenTall}));
       await follower.evaluate(()=>{
         document.querySelector('.talera-tags-selected [data-visual-only=yes]')?.remove();
       });
       await follower.locator('.talera-tags-toggle').click();
       await follower.setViewportSize({width:390,height:664});
       // Six-photo visual regression in the EXISTING original writer and same
       // account context. Five extra previews are DOM-only clones of the
       // original local Blob image: never alter the library, media or story.
       await follower.locator('#write').click();
       await follower.locator('#taleraWriterOverlay #taleraWriterText').waitFor();
       const originalWriterText=await follower.locator('#taleraWriterText').inputValue();
       await follower.evaluate(()=>{
         const strip=document.querySelector('#taleraWriterPhotos');
         const first=strip.querySelector('.talera-writer-thumbnail');
         if(!first)throw Error('Existing local story has no original writer photo');
         while(strip.children.length<6){
           const visual=first.cloneNode(true);
           visual.dataset.visualOnly='yes';
           strip.append(visual);
         }
       });
       await follower.waitForTimeout(90);
       // The real iPhone adds this class when its keyboard reduces the visual
       // viewport. Simulate the same rule without changing the test phone.
       await follower.evaluate(()=>
         document.body.classList.add('talera-writer-keyboard-open'));
       const writerInitial=await follower.evaluate(()=>{
         const q=s=>document.querySelector(s),r=e=>e.getBoundingClientRect();
         const strip=q('#taleraWriterPhotos'),body=q('.talera-writer-body');
         const area=q('#taleraWriterText'),done=q('#taleraWriterDone');
         const thumbs=Array.from(strip.querySelectorAll('.talera-writer-thumbnail'));
         const cols=getComputedStyle(strip).gridTemplateColumns.split(' ').length;
         return {
           count:thumbs.length,columns:cols,display:getComputedStyle(strip).display,
           photoSrcLocal:strip.querySelector('img')?.src.startsWith('blob:'),
           photoTop:r(strip).top,photoBottom:r(strip).bottom,
           sixthBottom:r(thumbs[5]).bottom,bodyBottom:r(body).bottom,
           textTop:r(area).top,textHeight:r(area).height,scrollTop:body.scrollTop,
           doneTop:r(done).top
         };
       });
       console.log('TALERA_FREE_WRITE_PHOTOS_INITIAL',JSON.stringify(writerInitial));
       assert.ok(writerInitial.count===6&&writerInitial.columns===3&&
         writerInitial.display==='grid'&&writerInitial.photoSrcLocal&&
         writerInitial.sixthBottom<=writerInitial.bodyBottom-60&&
         writerInitial.textTop<writerInitial.bodyBottom-40&&
         writerInitial.scrollTop<3,
         'All six existing/local previews must be visible with the keyboard '+ 
         'and the original textarea must remain accessible: '+JSON.stringify(writerInitial));
       const longStory=Array.from({length:70},(_,i)=>
         'Dit moment herinner ik me nog goed, regel '+(i+1)).join('\n');
       await follower.locator('#taleraWriterText').fill(longStory);
       await follower.waitForTimeout(180);
       const writerGrowth=await follower.evaluate(()=>{
         const strip=document.querySelector('#taleraWriterPhotos');
         const body=document.querySelector('.talera-writer-body');
         const area=document.querySelector('#taleraWriterText');
         const done=document.querySelector('#taleraWriterDone');
         return {
           bodyScroll:body.scrollTop,textHeight:area.getBoundingClientRect().height,
           photosBottom:strip.getBoundingClientRect().bottom,
           doneVisible:done.getBoundingClientRect().bottom>=0&&
             done.getBoundingClientRect().bottom<innerHeight,
           photoCount:strip.querySelectorAll('img').length
         };
       });
       console.log('TALERA_FREE_WRITE_PHOTOS_PROGRESSIVE_SCROLL',
         JSON.stringify(writerGrowth));
       assert.ok(writerGrowth.textHeight>writerInitial.textHeight+100&&
         writerGrowth.bodyScroll>60&&
         writerGrowth.photosBottom<writerInitial.photoBottom-60&&
         writerGrowth.doneVisible&&writerGrowth.photoCount===6,
         'As text grows the ORIGINAL writer must gradually scroll photos out '+ 
         'of view without losing Done or media: '+JSON.stringify({writerInitial,writerGrowth}));
       // Preserve the original unchanged synthetic story and save it using
       // the ORIGINAL Done handler. Never write the long visual test text.
       await follower.locator('#taleraWriterText').fill(originalWriterText);
       await follower.locator('#taleraWriterDone').click();
       assert.equal(await follower.locator('#story').inputValue(),
         originalWriterText,'Original story must survive the writer overlay');
       assert.equal(await follower.locator('#taleraWriterOverlay').count(),0,
         'The original Done handler must still close the writer');
       console.log('TALERA_FREE_WRITE_SIX_PHOTO_CARET_AND_SAVE_PASS',
         JSON.stringify({realIphoneAccepted:false,originalLocalMedia:true,
           sixPreviewsVisibleInitially:true,photosScrollAwayAsTextGrows:true,
           originalDoneAndStoryPreserved:true,noNewMediaOrUserData:true}));
              console.log('TALERA_FREE_TELL_LAYOUT_BELOW_PHOTOS_PASS',JSON.stringify({
         visualOnly:true,titleAndDateSeparated:true,topicBelowMedia:true,
         openKeepsPhotoPosition:true,originalControlsPreserved:true,
         fivePhotoScreenSimulated:true,onlyTagPanelScrollable:true,
         lastCharacteristicReachable:true,bottomToolbarStationary:true,
         noPersonalData:true,realIphoneAccepted:false
       }));
     }
     console.log('TALERA_F5_ONE_LIBRARY_THREE_AUTHENTICATED_SCREENS_PASS',
       JSON.stringify({route,accountIdUnchanged:true,storyIdUnchanged:true,
         photoBytesIntact:true,realIPhoneAccepted:false}));
   }finally{await follower.close()}
 }

 // Synthetic social reference ONLY: the photo is still inside IndexedDB.
 // Exercise the ORIGINAL menu end-to-end with a real local story title and
 // actual Durable Object link. No photo/media payload is uploaded.
 const linked=await page.evaluate(async id=>{
   const base='/__social/memory/'+encodeURIComponent(id);
   const opts={method:'POST',credentials:'same-origin'};
   const init=await fetch(base+'/init',opts);
   const shared=await fetch(base+'/share',opts);
   const share=await shared.json();
   const listing=await fetch('/api/shares',{credentials:'same-origin'});
   return {init:init.status,shareStatus:shared.status,
     listStatus:listing.status,link:share.link,
     items:(await listing.json()).items};
 },a.id);
 assert.equal(linked.init,200,'Synthetic local story social reference must be owned');
 assert.equal(linked.shareStatus,200,'Social metadata link failed');
 assert.equal(linked.listStatus,200,'Original menu source list not connected');
 assert.equal(linked.items.length,1,'Issued link is missing from real account list');
 const issuedShareHash=createHash('sha256').update(linked.link.split('/').at(-1)).digest('hex');
 assert.equal(linked.items[0].id,issuedShareHash,
   'Link issued to this browser must match its exact owner account share hash');
 assert.equal(linked.items[0].revoked_at,null,
   'Newly issued capability must start unrevoked');
 assert.equal(linked.items[0].memory_id,a.id,
   'Real server social record must refer back to original IndexedDB story');
 const given=await page.evaluate(async({storyId,recipientId})=>{
   const r=await fetch('/__social/memory/'+encodeURIComponent(storyId)+'/grant',{
     method:'POST',credentials:'same-origin',
     headers:{'content-type':'application/json'},
     body:JSON.stringify({recipientId})});
   const listing=await fetch('/api/my-grants',{credentials:'same-origin'});
   return {grantStatus:r.status,listStatus:listing.status,
     items:(await listing.json()).items};
 },{storyId:a.id,recipientId:ids[1]});
 assert.equal(given.grantStatus,200,'Synthetic grant metadata must be stored in DO');
 assert.equal(given.listStatus,200);
 assert.equal(given.items.length,1,'Direct recipient right must be discoverable in owner menu');
 assert.equal(given.items[0].recipient_name,users[1].displayName);

 await menu(page);
 await view(page,'mine');
 try{
 await page.waitForFunction(title=>{
   const shell=document.getElementById('talera-more-menu');
   return !shell?.hidden&&shell.textContent.includes(title)&&
      shell.querySelectorAll('[data-revoke]').length===1&&
      shell.querySelectorAll('[data-revoke-grant]').length===1;
 },'synthetic ACCOUNT ISOLATION 1',{timeout:15000});
 }catch(error){
   const diagnostic=await page.evaluate(()=>({
     open:!document.getElementById('talera-more-menu')?.hidden,
     text:(document.getElementById('talera-more-menu')?.innerText||'').slice(0,2000),
     revokeButtons:document.querySelectorAll('#talera-more-menu [data-revoke]').length,
     directButtons:document.querySelectorAll('#talera-more-menu [data-revoke-grant]').length
   }));
   console.log('TALERA_F5_MINE_SOCIAL_DIAGNOSTIC',JSON.stringify({
     syntheticOnly:true,...diagnostic,lastApiRequests:apiTrace.slice(-20),
     pageErrors:errors.slice(-8)}));
   throw error;
 }
 const actualMenu=await page.evaluate(async()=>{
   const r=await fetch('/api/my-grants',{credentials:'same-origin'});
   return {text:(document.getElementById('talera-more-menu')?.innerText||'').slice(0,1800),
     grantStatus:r.status,grants:(await r.json()).items,
     grantControls:document.querySelectorAll('#talera-more-menu [data-revoke-grant]').length};
 });
 console.log('TALERA_F5_OWNER_DIRECT_LIST_PROBE',JSON.stringify({
   syntheticOnly:true,...actualMenu,lastApi:apiTrace.slice(-15)}));
 const revoke=page.locator('#talera-more-menu [data-revoke]').first();
 assert.equal(await revoke.count(),1,'Original menu must show revoke control');
 // Approved menu is localized: do not rely on a Dutch heading when
 // the exact same UI is displaying English.
 await page.waitForFunction(name=>{
   const shell=document.getElementById('talera-more-menu');
   return !shell?.hidden&&shell.querySelectorAll('[data-revoke-grant]').length===1&&
     shell.textContent.includes(name);
 },users[1].displayName,{timeout:15000});
 const grantRevoke=page.locator('#talera-more-menu [data-revoke-grant]').first();
 assert.equal(await grantRevoke.count(),1,
   'Original menu must offer revoke on a real direct grant');
 page.on('dialog',async dialog=>{await dialog.accept()});
 await grantRevoke.click();
 try{
   await page.waitForFunction(async()=>{
     const r=await fetch('/api/my-grants',{credentials:'same-origin'});
     return r.ok&&(await r.json()).items?.length===0;
   },null,{timeout:7000});
 }catch(error){
   const snapshot=await page.evaluate(async()=>{
     const r=await fetch('/api/my-grants',{credentials:'same-origin'});
     return {url:location.pathname,status:r.status,
       items:(await r.json()).items,
       menu:(document.getElementById('talera-more-menu')?.innerText||'').slice(0,1600)};
   });
   console.log('TALERA_F5_DIRECT_GRANT_REVOKE_DIAGNOSTIC',JSON.stringify({
     snapshot,trace:apiTrace.slice(-25),pageErrors:errors.slice(-10)}));
   throw error;
 }

 const menuLinkStatus=await page.locator('#talera-more-menu').innerText();
 assert.ok(menuLinkStatus.includes('synthetic ACCOUNT ISOLATION 1'),
   'Original menu must resolve real link to LOCAL story title, not a remote copy');
 // Click the APPROVED original revoke control, never a replacement UI.
 await revoke.click();
 await page.waitForFunction(async hash=>{
   const r=await fetch('/api/shares',{credentials:'same-origin',cache:'no-store'});
   if(!r.ok)return false;
   return (await r.json()).items?.some(x=>x.id===hash&&x.revoked_at!=null);
 },issuedShareHash,{timeout:15000});
 const revokedProof=await page.evaluate(async hash=>{
   const r=await fetch('/api/shares',{credentials:'same-origin',cache:'no-store'});
   const rows=(await r.json()).items||[];
   const row=rows.find(x=>x.id===hash);
   return {status:r.status,matchingRows:rows.filter(x=>x.id===hash).length,
     revoked:row?.revoked_at!==null&&row?.revoked_at!==undefined};
 },issuedShareHash);
 assert.deepEqual(revokedProof,{status:200,matchingRows:1,revoked:true},
   'Only the exact issued capability may be considered revoked');
 const cachedRead=await page.evaluate(async link=>{
   const response=await fetch(link,{credentials:'same-origin'});
   return {status:response.status,contentType:response.headers.get('content-type')||'',
     bodyPrefix:(await response.text()).slice(0,70)};
 },linked.link);
 console.log('TALERA_F5_REVOKED_SHARE_DEFAULT_BROWSER_FETCH',JSON.stringify(cachedRead));
 const revokedLink=await page.evaluate(async link=>{
   const r=await fetch(link,{credentials:'same-origin',cache:'no-store'});
   const contentType=r.headers.get('content-type')||'';
   const text=(await r.text()).slice(0,70);
   return {status:r.status,contentType,bodyPrefix:text};
 },linked.link);
 // Distinguish service-worker caching from real shared-link authorization.
 const rawResponse=await page.request.get(origin+linked.link,{
   headers:{'x-talera-f5-key':gate,'cf-connecting-ip':'192.0.2.73'},
   failOnStatusCode:false
 });
 const rawInfo={status:rawResponse.status(),
   contentType:rawResponse.headers()['content-type']||'',
   bodyPrefix:(await rawResponse.text()).slice(0,70)};
 console.log('TALERA_F5_REVOKED_SHARE_NETWORK_DIAGNOSTIC',JSON.stringify({
   browser:revokedLink,direct:rawInfo
 }));
 assert.equal(rawInfo.status,403,
   'Direct network MUST reject revoked share, independent of PWA service worker');
 assert.equal(revokedLink.status,403,
   'Original account menu revoke MUST prevent reuse of real share capability');
 await page.locator('#talera-more-menu [data-action="close"]').first().click();
 console.log('TALERA_F5_ACTUAL_MINE_MENU_LOCAL_SOCIAL',JSON.stringify({
   syntheticOnly:true,realLocalStoryTitleShown:true,shareListedFromDO:true,
   originalRevokeControlUsed:true,originalGrantRevokeUsed:true,
   reuseDenied:true,cloudMediaUploads:0,
   officialUiMarkupChanged:false}));

 // indexedDB.databases() lists ALL names on the same origin, including
 // the previous account's private DB. Comparing .find() would select that
 // previous DB twice and incorrectly reject a correctly isolated browser.
 const ownedA=a.dbs.filter(x=>x?.startsWith('talera-free-local-'));
 const ownedB=b.dbs.filter(x=>x?.startsWith('talera-free-local-'));
 const newlyOpenedB=ownedB.filter(x=>!ownedA.includes(x));
 assert.equal(ownedA.length,1,'First synthetic account needs its own local DB');
 assert.equal(newlyOpenedB.length,1,
   'Second synthetic account must open a DIFFERENT private IndexedDB');
 assert.ok(ownedB.includes(ownedA[0]),
   'Browser must retain original account DB without deleting photos');
 console.log('TALERA_F5_BROWSER_PRIVATE_DB_COUNTS',JSON.stringify({
   afterFirstOwner:ownedA.length,afterSecondOwner:ownedB.length,
   secondOwnerNewPrivateDatabases:newlyOpenedB.length,
   noOriginalDatabaseDeleted:true
 }));
 // Owner-approved 14-Nov menu cleanup on the SAME real mobile browser page.
 // Only functioning Free controls are visible. The account, private storage,
 // narration player and timeline are unchanged and explicitly not re-created.
 await menu(page);
 const cleanHub=await page.evaluate(()=>{
   const panel=document.getElementById('talera-more-menu');
   return {
     listed:[...panel.querySelectorAll('button[data-view]')].map(x=>x.dataset.view),
     hrefs:[...panel.querySelectorAll('a[href]')].map(x=>x.href)
   };
 });
 for(const active of ['account','mine','privacy','settings','help'])
   assert.ok(cleanHub.listed.includes(active),'Working More destination removed: '+active);
 for(const unavailable of ['people','shared','subscription','forgot'])
   assert.ok(!cleanHub.listed.includes(unavailable),
     'Unavailable Free option must not pretend to be working: '+unavailable);
 assert.equal(cleanHub.listed.filter(v=>v==='privacy').length,1,
   'Exactly one visible privacy option on the main More page');

 await view(page,'help');
 const helpLink=page.locator('#talera-more-menu a[href="https://talera-website.pages.dev/welkom/"]');
 assert.equal(await helpLink.count(),1,'Keep the existing TALERA help web link');
 assert.equal(await helpLink.getAttribute('target'),'_blank');
 assert.equal(await page.locator('#talera-more-menu [data-view="privacy"]').count(),0,
   'Help should not repeat a second privacy shortcut');
 await page.locator('#talera-more-menu [data-action="back"]').first().click();
 await view(page,'privacy');
 assert.equal(await page.locator('#talera-more-menu form[data-form="privacy"]').count(),0,
   'Disabled discoverability must never have a misleading save control');
 assert.equal(await page.locator('#talera-more-menu [data-view="mine"]').count(),1,
   'Private account must still be able to revoke already issued share links');
 assert.match(await page.locator('#talera-more-menu').innerText(),/niet vindbaar/i);
 await page.locator('#talera-more-menu [data-action="back"]').first().click();
 await view(page,'settings');
 for(const saved of ['account','language','storage'])
   assert.equal(await page.locator('#talera-more-menu [data-view="'+saved+'"]').count(),1,
     'Original functional setting missing: '+saved);
 assert.equal(await page.locator('#talera-more-menu [data-view="privacy"]').count(),0,
   'Settings must not duplicate the top-level privacy route');
 assert.equal(await page.locator('#talera-more-menu [data-action="enable-listening"],#talera-more-menu [data-action="disable-listening"]').count(),1,
   'Existing voice on/off control remains usable');
 const beforeStorageReads=apiTrace.length;
 await view(page,'storage');
 await page.waitForFunction(()=>{
   const menu=document.getElementById('talera-more-menu');
   const text=menu?.innerText||'';
   return text.includes('In deze app')&&/\d+ herinnering/.test(text)&&
     !text.includes('Controleren…');
 },null,{timeout:16000});
 const storageOverview=await page.evaluate(async()=>{
   const menu=document.getElementById('talera-more-menu');
   const own=await window.TaleraMemories.list();
   const text=menu.innerText;
   return {
     saved:own.length,
     text,
     backupButtons:menu.querySelectorAll('[data-action="open-backup"]').length,
     refreshButtons:menu.querySelectorAll('[data-action="storage-refresh"]').length,
     count:text.includes(own.length+' herinnering'+(own.length===1?'':'en'))
   };
 });
 assert.equal(storageOverview.backupButtons,1,
   'One and only one real backup route is visible on the storage screen');
 assert.equal(storageOverview.refreshButtons,0,
   'No unnecessary retry action is shown while the local count succeeds');
 assert.equal(storageOverview.count,true,
   'The only visible count must match real locally stored memories');
 for(const gone of ['account-herinneringen','Met mij gedeeld','Controle niet volledig',
    'Ontvangen herinneringen niet beschikbaar','Let op']){
   assert.ok(!storageOverview.text.includes(gone),
     'Storage overview contains a duplicate or irrelevant item: '+gone);
 }
 assert.ok(storageOverview.text.includes('Back-up maken of terugzetten'));
 const newStorageRequests=apiTrace.slice(beforeStorageReads);
 assert.ok(!newStorageRequests.some(x=>x.path==='/api/shared-with-me'||x.path==='/api/memories'),
   'Local storage must not call the unfinished social endpoint or duplicate account count');
 await page.locator('#talera-more-menu [data-action="back"]').first().click();
 await page.locator('#talera-more-menu [data-action="back"]').first().click();
 await view(page,'account');
 assert.equal(await page.locator('#talera-more-menu [data-view="forgot"]').count(),0,
   'Unimplemented email password recovery must not be offered as working');
 assert.equal(await page.locator('#talera-more-menu [data-action="logout"]').count(),1,
   'Real sign-out button remains available');
 await page.locator('#talera-more-menu [data-action="back"]').first().click();
 console.log('TALERA_FREE_MENU_WORKING_ONLY_AND_HELP_WEBSITE_PASS',JSON.stringify({
   helpLinkUnchanged:true,privacyOneEntry:true,privacySaveHidden:true,
   localBackupsPreserved:true,languagePreserved:true,audioTogglePreserved:true,
   socialRevokePreserved:true,missingRoutesHidden:true,iphoneAccepted:false
 }));

 // Test the ORIGINAL presentation's WhatsApp click AFTER existing social
 // list/revoke checks, so this new temporary share cannot change their counts.
 // All data are unique, local synthetic test inputs in the SAME F5 code.
 const sharePage=await context.newPage();
 const createdLinks=[],shareNetwork=[];
 sharePage.on('request',req=>{
   if(new URL(req.url()).pathname==='/api/pwa/memory-link'&&req.method()==='POST'){
     const payload=req.postDataJSON()||{};
     shareNetwork.push({phase:'payload-structure',keys:Object.keys(payload),
       localMemoryIdType:typeof payload.localMemoryId,
       localMemoryIdLength:String(payload.localMemoryId||'').length,
       localMemoryIdFits:/^[A-Za-z0-9_.:-]{8,160}$/.test(String(payload.localMemoryId||'')),
       consent:payload.consent,titleLength:String(payload.title||'').length,
       storyLength:String(payload.storyText||'').length});
   }
 });
 sharePage.on('response',async r=>{
   const p=new URL(r.url()).pathname;
   if(/^\/api\/(?:pwa\/memory-link|memories\/[^/]+\/shares|shares\/)/.test(p))
     shareNetwork.push({method:r.request().method(),path:p,status:r.status()});
   if(/^\/api\/memories\/[a-f0-9]{64}\/shares$/.test(new URL(r.url()).pathname)&&
      r.request().method()==='POST'){
     const data=await r.json().catch(()=>({}));
     createdLinks.push({status:r.status(),...data});
   }
 });
 try{
   const route=await sharePage.goto(origin+'/present',{waitUntil:'domcontentloaded'});
   assert.equal(route.status(),200);
   await sharePage.waitForFunction(id=>
     window.__taleraTimelineRuntime?.currentMemory?.()?.storyId===id,a.id,
     {timeout:20000});
   await sharePage.waitForFunction(()=>
     !!document.querySelector('#talera-clean-social [data-action=share]'),
     null,{timeout:15000});
   await sharePage.waitForTimeout(1600);
   // Source of truth: inspect the AUTHENTIC TALERA comment sheet.
   // Never invent a second guest comment form without checking this markup.
   await sharePage.locator('#talera-clean-social [data-action=comments]').click();
   await sharePage.waitForTimeout(250);
   const originalReplyUi=await sharePage.evaluate(()=>{
     const overlay=document.querySelector('#talera-clean-overlay');
     const panel=overlay?.querySelector('#talera-clean-panel');
     const buttons=panel?[...panel.querySelectorAll('button')].map(x=>({
       text:x.textContent?.trim().slice(0,60),action:x.dataset.action,
       outer:x.outerHTML.slice(0,600)})):[];
     const body=panel?.innerHTML.slice(0,11500)||'';
     const inputs=panel?[...panel.querySelectorAll('input,textarea,form')].map(x=>x.outerHTML.slice(0,500)):[];
     return {overlayVisible:!!overlay&&!overlay.hidden,
       panelClass:panel?.className,panelMarkup:body,buttons,inputs};
   });
   console.log('TALERA_ORIGINAL_COMMENT_SHEET_MARKUP_SOURCE',JSON.stringify(originalReplyUi));
   if(await sharePage.locator('#talera-clean-overlay [data-action=close]').count())
     await sharePage.locator('#talera-clean-overlay [data-action=close]').click();
   // Reproduce an iPhone display URL that is stale/not yet an image. Sharing
   // must read the unchanged original photo Blob by its account-library key,
   // NOT dereference this temporary player URL or create a text-only link.
   const originalPhotoSafe=await sharePage.evaluate(()=>{
     const memory=window.__taleraTimelineRuntime?.currentMemory?.();
     if(!memory?._taleraLocal||!memory.storyId||
        !memory._zeroFrames?.some(f=>f.kind==='photo'))return false;
     memory.image='data:text/plain,stale-player-image-is-not-original';
     memory.previewImage='data:text/plain,stale-player-preview-is-not-original';
     return true;
   });
   assert.equal(originalPhotoSafe,true,'Synthetic account needs an original local photo');
   await sharePage.locator('#talera-clean-social [data-action=share]').click();
   await sharePage.waitForFunction(()=>
     !!document.querySelector('#talera-clean-overlay:not([hidden]) [data-action=prepare]'),
     null,{timeout:15000});
   // One compact selector, truly EMPTY personal field, and draft survives
   // changing the expiry and switching back to the default invitation.
   const choices=sharePage.locator('#talera-clean-overlay .talera-share-choice');
   assert.equal(await choices.count(),2,'Exactly two original WhatsApp message options');
   assert.equal(await sharePage.locator('#talera-clean-overlay [data-action=message-standard]').getAttribute('aria-pressed'),'true');
   assert.equal(await sharePage.locator('#talera-clean-personal').count(),0);
   await sharePage.locator('#talera-clean-overlay [data-action=message-personal]').click();
   assert.equal(await sharePage.locator('#talera-clean-personal').inputValue(),'',
     'Own WhatsApp message must start with an entirely blank text field');
   const personalDraft='Hé, weet je nog die middag?';
   await sharePage.locator('#talera-clean-personal').fill(personalDraft);
   await sharePage.locator('#talera-clean-expiry').selectOption('24');
   assert.equal(await sharePage.locator('#talera-clean-personal').inputValue(),personalDraft,
     'Changing validity may not delete the unsent personal message');
   await sharePage.locator('#talera-clean-expiry').selectOption('168');
   await sharePage.locator('#talera-clean-overlay [data-action=message-standard]').click();
   assert.equal(await sharePage.locator('#talera-clean-personal').count(),0);
   await sharePage.locator('#talera-clean-overlay [data-action=message-personal]').click();
   assert.equal(await sharePage.locator('#talera-clean-personal').inputValue(),personalDraft);
   await sharePage.locator('#talera-clean-overlay [data-action=message-standard]').click();
   // Use the standard message in the previously proven one-invite test.
   await sharePage.locator('#talera-clean-consent').check();
   await sharePage.locator('#talera-clean-overlay [data-action=prepare]').click();
   await sharePage.waitForTimeout(1900);
   const status=await sharePage.evaluate(()=>{
     const sheet=document.querySelector('#talera-clean-overlay:not([hidden])');
     return {status:sheet?.querySelector('.status')?.textContent,
       enabled:!sheet?.querySelector('[data-action=send]')?.disabled};
   });
   console.log('TALERA_FREE_WHATSAPP_ACTUAL_PREPARE_DIAG',JSON.stringify({
     status,createdLinks,shareNetwork,onlySyntheticAccount:true
   }));
   assert.equal(status.enabled,true,
     'The ORIGINAL WhatsApp button must prepare a real live share, not 404');
   assert.equal(createdLinks.length,1,'Only ONE temporary share should be created');
   const issued=createdLinks[0];
   assert.equal(issued.status,200,'Share creation must succeed');
   assert.match(issued.id,/^[a-f0-9]{64}$/);
   assert.ok(issued.link.startsWith(origin+'/s/'),
     'Recipient link must use the compact SAME-app origin without shortening token entropy');
   assert.ok(Math.abs(issued.expiresAt-(Date.now()+168*3600000))<60000,
     'Temporary share must use exactly the original seven-day expiry');
   // Native iOS share is invoked from the final click, with no asynchronous
   // photo lookup after the user gesture. Verify all THREE required items
   // use the SAME previously prepared invitation, no fake WhatsApp send.
   await sharePage.evaluate(()=>{
     window.__taleraNativeShareProbe=[];
     Object.defineProperty(navigator,'canShare',{configurable:true,value:data=>
       Array.isArray(data?.files)&&data.files.length===1&&
       data.files[0].type==='image/jpeg'});
     Object.defineProperty(navigator,'share',{configurable:true,value:data=>{
       const file=data.files?.[0];
       window.__taleraNativeShareProbe.push({
         name:file?.name,type:file?.type,size:file?.size,
         count:data.files?.length,text:data.text,
         hasSeparateUrl:Object.hasOwn(data,'url')
       });
       return Promise.resolve();
     }});
   });
   await sharePage.locator('#talera-clean-overlay [data-action=send]').click();
   const nativeDiag=await sharePage.evaluate(()=>({
     payload:window.__taleraNativeShareProbe?.at(-1),
     count:window.__taleraNativeShareProbe?.length,
     pathname:location.pathname,
     status:document.querySelector('#talera-clean-overlay .status')?.textContent,
     buttonDisabled:document.querySelector('#talera-clean-overlay [data-action=send]')?.disabled,
     hasNative:typeof navigator.share,hasCapability:typeof navigator.canShare,
     overlayHidden:document.querySelector('#talera-clean-overlay')?.hidden
   }));
   console.log('TALERA_NATIVE_PHOTO_SHARE_PREPARE_PROBE',JSON.stringify(nativeDiag));
   const payload=nativeDiag.payload;
   assert.equal(payload?.name,'talera-herinnering.jpg');
   assert.equal(payload?.type,'image/jpeg');
   assert.ok(payload.size>100,'Native iOS share must attach actual JPEG pixels');
   assert.equal(payload.count,1,'Only the selected memory photo may be shared');
   assert.equal(payload.text,
     'Hoi! Ik deel graag een persoonlijke herinnering met je via TALERA.\n'+issued.link,
     'The exact default caption and restricted recipient URL must travel together');
   assert.equal(payload.hasSeparateUrl,false,
     'iOS text with the URL must be one share body, not a second URL item');
   assert.equal(new URL(sharePage.url()).pathname,'/present',
     'Simulated native photo share must not navigate away from the same app');
   console.log('TALERA_FREE_NATIVE_IOS_PHOTO_CAPTION_AND_LINK_SHARE_PAYLOAD_PASS',
     JSON.stringify({picture:true,caption:true,sameSecureLink:true,realIphoneAccepted:false}));

   const compactPath=new URL(issued.link).pathname;
   assert.match(compactPath,/^\/s\/[A-Za-z0-9_-]{43}$/);
   assert.equal(issued.id.length,64,'Original 256-bit capability and revocation ID unchanged');
   // Verify the recipient's public invitation keeps both photo metadata
   // and friendly caption, not a large raw 64-character token in the URL.

   const withoutConsent=await sharePage.evaluate(async id=>{
     const r=await fetch('/api/pwa/memory-link',{
       method:'POST',credentials:'same-origin',
       headers:{'content-type':'application/json'},
       body:JSON.stringify({localMemoryId:id,title:'No consent',
         storyText:'Never publish',eventDate:'',consent:false})
     });
     return r.status;
   },a.id);
   assert.equal(withoutConsent,400,
     'Share may never publish memory content without explicit consent');
   const anonymous=await browser.newContext({
     ...devices['iPhone 13'],extraHTTPHeaders:{'x-talera-f5-key':gate,
       'cf-connecting-ip':'192.0.2.91'}
   });
   try{
     const guest=await anonymous.newPage();
     const received=await guest.goto(issued.link,{waitUntil:'domcontentloaded'});
     console.log('TALERA_FREE_WHATSAPP_RECIPIENT_DIAG',JSON.stringify({
       status:received.status(),contentType:received.headers()['content-type'],
       prefix:received.status()!==200?(await received.text()).slice(0,400):'expected HTML'}));
     assert.equal(received.status(),200,
       'Receiver must see the actual consented photo/text, not JSON or 404');
     // Compare the exact existing authenticated presentation geometry with
     // this single-memory guest route; source of truth is the SAME PWA Worker.
     const visualMetrics=async(page,selectors)=>page.evaluate(map=>{
      const measure=selector=>{
       const el=document.querySelector(selector);
       if(!el)return {exists:false};
       const c=getComputedStyle(el),b=el.getBoundingClientRect();
       return {exists:true,visible:c.display!=='none'&&c.visibility!=='hidden',
        tag:el.tagName,
        rect:{top:Math.round(b.top),left:Math.round(b.left),
         width:Math.round(b.width),height:Math.round(b.height)},
        position:c.position,objectFit:c.objectFit,
        backgroundColor:c.backgroundColor,borderRadius:c.borderRadius,
        fontSize:c.fontSize,zIndex:c.zIndex};
      };
      return Object.fromEntries(Object.entries(map).map(([key,selector])=>[key,measure(selector)]));
     },selectors);
     const originalGeometry=await visualMetrics(sharePage,{
      photoStage:'#photoStage',photo:'#memoryPhotoA',
      social:'#talera-clean-social',caption:'#memoryCaption',
      home:'#talera-flow-home',editor:'#talera-v5-editor-pencil'
     });
     // The recipient MUST get the original presentation DOM, timeline,
     // lift-to-read panel and media motor. No custom navy hero or story modal.
     await guest.waitForFunction(()=>window.__taleraTimelineRuntime?.currentMemory?.()?._taleraLocal,
       null,{timeout:20000});
     const guestGeometry=await visualMetrics(guest,{
       photoStage:'#photoStage',photo:'#memoryPhotoA',
       social:'#talera-clean-social',caption:'#memoryCaption',
       home:'#talera-flow-home',editor:'#talera-v5-editor-pencil'
     });
     assert.equal(guestGeometry.photoStage.exists,true);
     assert.equal(guestGeometry.caption.exists,true);
     assert.deepEqual(guestGeometry.photoStage.rect,originalGeometry.photoStage.rect,
       'Guest uses the original TALERA presenter geometry, not a second design');
     const guestNativeSocial=await guest.evaluate(()=>{
       const bar=document.getElementById('talera-clean-social');
       const oldExtra=document.getElementById('taleraNativeGuestBar');
       const share=bar?.querySelector('[data-action=share]');
       return {bar:!!bar,oldExtra:!!oldExtra,
         actions:[...(bar?.querySelectorAll('button[data-action]')||[])].map(b=>b.dataset.action),
         shareHidden:share?getComputedStyle(share).display==='none':false,
         heart:!!bar?.querySelector('[data-action=heart]'),
         comments:!!bar?.querySelector('[data-action=comments]')};
     });
     assert.equal(guestNativeSocial.bar,true,'Reuse original TALERA social toolbar');
     assert.equal(guestNativeSocial.oldExtra,false,'No duplicate bespoke guest reaction toolbar');
     assert.equal(guestNativeSocial.heart,true);
     assert.equal(guestNativeSocial.comments,true);
     assert.equal(guestNativeSocial.shareHidden,true,
       'Anonymous visitor cannot share another memory from original toolbar');
     console.log('TALERA_GUEST_EXACT_ORIGINAL_PRESENTATION_VISUAL_METRICS',
       JSON.stringify({originalGeometry,guestGeometry,iphoneAccepted:false}));
     const html=await received.text();
     assert.match(html,/synthetic ACCOUNT ISOLATION 1/);
     assert.match(html,/Local-only imaginary image/);
     assert.match(html,/<meta property="og:title" content="Een persoonlijke herinnering via TALERA">/);
     assert.match(html,/<meta property="og:image" content=/);
     assert.ok(html.includes(issued.link+'/photo'));
     assert.ok(!html.includes('class="stage"'),
       'Separate improvised WhatsApp guest hero has been retired');
     assert.ok(html.includes('id="photoStage"')&&
       html.includes('id="memoryStoryScroll"')&&
       html.includes('id="memoryCaption"')&&
       html.includes('window.TaleraGuestOneMemory={list,get}'),
       'Guest must have the ORIGINAL timeline, photo, story lift and scoped library adapter');
     const nativeState=await guest.evaluate(async()=>{
       const rows=await window.TaleraMemories.list();
       const current=window.__taleraTimelineRuntime.currentMemory();
       return {rows:rows.map(x=>({id:x.id,title:x.title,text:x.text,items:x.items.map(y=>y.kind)})),
         current:{storyId:current.storyId,local:current._taleraLocal,
          story:current.fullStory,photos:current.photos.length},
         timeline:!!document.querySelector('.timeline'),
         storyLift:!!document.querySelector('#memoryStoryScroll'),
         photosInStage:!!document.querySelector('#photoStage'),
         canEdit:typeof window.TaleraMemories.save==='function'};
     });
     assert.equal(nativeState.rows.length,1,'Bearer token must see exactly one memory');
     assert.equal(nativeState.rows[0].text,'Local-only imaginary image');
     assert.deepEqual(nativeState.rows[0].items,['photo']);
     assert.equal(nativeState.current.storyId,nativeState.rows[0].id);
     assert.equal(nativeState.current.story,'Local-only imaginary image');
     await guest.waitForFunction(()=>window.__taleraTimelineRuntime?.currentMemory?.()?.fullStory==='Local-only imaginary image',
       null,{timeout:9000});
     assert.ok((await guest.locator('#memoryStoryScroll').boundingBox())?.width>250,
       'Actual original TALERA pull-up story surface must be present');
     console.log('TALERA_GUEST_ORIGINAL_PULL_UP_STORY_TEXT_HYDRATED_PASS');
     assert.ok(nativeState.timeline&&nativeState.storyLift&&nativeState.photosInStage);
     await guest.waitForFunction(()=>{
       const m=window.__taleraTimelineRuntime?.currentMemory?.();
       return !m?._photoLoading&&m?.photos?.[0]?.startsWith('blob:');
     },null,{timeout:18000});
     const nativePhoto=await guest.evaluate(()=>{
       const stage=document.getElementById('photoStage');
       const m=window.__taleraTimelineRuntime.currentMemory();
       const photo=document.getElementById('memoryPhotoA');
       const rect=stage.getBoundingClientRect();
       return {kind:m._zeroFrames[0].kind,blobSource:m.photos[0].startsWith('blob:'),
         width:rect.width,height:rect.height,viewportW:innerWidth,viewportH:innerHeight,
         renderedNaturalWidth:photo?.naturalWidth||0};
     });
     assert.equal(nativePhoto.kind,'photo');
     assert.equal(nativePhoto.blobSource,true);
     assert.equal(nativePhoto.width,nativePhoto.viewportW,
       'The real TALERA photo stage must fill the phone width');
     assert.equal(nativePhoto.height,nativePhoto.viewportH,
       'The real TALERA photo stage must fill the available phone viewport');
     console.log('TALERA_GUEST_TRUE_ORIGINAL_PHOTO_FULL_AVAILABLE_VIEWPORT_PASS',
       JSON.stringify({...nativePhoto,iphoneAccepted:false}));

     assert.equal((await guest.evaluate(async()=>window.TaleraMemories.get('local-unrelated-secret'))),null,
       'A guessed local memory ID is inaccessible to a guest');
     assert.equal((await guest.evaluate(async()=>window.TaleraMemories.blob('local-unrelated-secret:0'))),null,
       'A guessed local media key is inaccessible to a guest');
     const deniedGuestWrite=await guest.evaluate(async()=>{
       try{await window.TaleraMemories.save({title:'FORBIDDEN'},[]);return false}
       catch{return true}
     });
     assert.equal(deniedGuestWrite,true,'Guest cannot write to the owner library');
     // The original presentation has no separate story modal. Only the
     // optional TALERA introduction appears after 10s of idle viewing.
     assert.equal(await guest.locator('#taleraNativeInvite').isHidden(),true);
     try{
       await guest.locator('#taleraNativeInvite:not([hidden])').waitFor({timeout:15000});
     }catch(error){
       console.log('TALERA_GUEST_NATIVE_PROMO_BLOCK_DIAGNOSTIC',
         JSON.stringify(await guest.evaluate(()=>{
           const e=document.getElementById('taleraNativeInvite');
           const key=Object.keys(localStorage).filter(k=>k.startsWith('talera-promo-seen-v1-'));
           const media=[...document.querySelectorAll('audio,video')];
           return {nativeSocialInitialized:window.__taleraGuestUsesOriginalCommentSheet,
             promoExists:!!e,promoHidden:e?.hidden,promoDisplay:e?getComputedStyle(e).display:null,
             seenKeys:key.map(k=>[k,localStorage.getItem(k)]),
             reading:document.body.classList.contains('talera-v18-reading'),
             sheetReading:document.querySelector('.memory-space')?.classList.contains('talera-v26-reading'),
             modalHidden:document.getElementById('talera-clean-overlay')?.hidden,
             activeMedia:media.filter(m=>!m.paused&&!m.ended).map(m=>m.tagName),
             focused:document.activeElement?.tagName,
             originalHeart:!!document.querySelector('#talera-clean-social [data-action=heart]')};
         })));
       throw error;
     }
     assert.equal(await guest.locator('#taleraNativeInvite').isVisible(),true);
     await guest.locator('#taleraNativeInviteClose').click();
     assert.equal(await guest.locator('#taleraNativeInvite').isHidden(),true);
     const guestSeen=await guest.evaluate(()=>Object.keys(localStorage).some(
       k=>k.startsWith('talera-promo-seen-v1-')&&localStorage.getItem(k)==='1'));
     assert.equal(guestSeen,true,'Do not repeat the same optional TALERA invitation');
     console.log('TALERA_GUEST_ORIGINAL_PRESENTATION_UNINTERRUPTED_TEN_SECOND_INTRO_PASS');
     // User acceptance requirement: the actual original caption panel MUST
     // rise on a phone touch-drag, not merely exist as hidden HTML.
     const guestReaderBefore=await guest.evaluate(()=>{
       const sheet=document.querySelector('.memory-space');
       const caption=document.getElementById('memoryCaption');
       const story=document.getElementById('memoryStory');
       const rect=sheet?.getBoundingClientRect();
       return {top:rect?.top,height:rect?.height,
         reading:sheet?.classList.contains('talera-v26-reading'),
         body:document.body.classList.contains('talera-v18-reading'),
         text:story?.textContent?.trim(),caption:caption?.innerText?.slice(0,250),
         storyScroll:document.getElementById('memoryStoryScroll')?.innerText?.slice(0,350),
         pageHasText:document.body.innerText.includes('Local-only imaginary image'),
         captionTop:caption?.getBoundingClientRect()?.top};
     });
     console.log('TALERA_GUEST_ORIGINAL_STORY_TEXT_SURFACE_DIAGNOSTIC',
       JSON.stringify(guestReaderBefore));
     assert.ok(guestReaderBefore.height>100&&guestReaderBefore.captionTop>=0,
       'The existing TALERA story reader surface must be present before the touch gesture');
     const nativeTouch=await guest.context().newCDPSession(guest);
     const phoneX=195,top=guestReaderBefore.top||520,phoneY=Math.min(guest.viewportSize().height-45,top+68);
     await nativeTouch.send('Input.dispatchTouchEvent',{
       type:'touchStart',touchPoints:[{x:phoneX,y:phoneY}]});
     for(let i=1;i<=7;i++){
       await nativeTouch.send('Input.dispatchTouchEvent',{
         type:'touchMove',touchPoints:[{x:phoneX,y:phoneY-i*55}]});
       await guest.waitForTimeout(30);
     }
     await nativeTouch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
     await guest.waitForTimeout(450);
     const guestReaderAfter=await guest.evaluate(()=>{
       const sheet=document.querySelector('.memory-space');
       const caption=document.getElementById('memoryCaption');
       return {top:sheet?.getBoundingClientRect()?.top,
         reading:sheet?.classList.contains('talera-v26-reading'),
         body:document.body.classList.contains('talera-v18-reading'),
         captionTop:caption?.getBoundingClientRect()?.top,
         text:document.getElementById('memoryStory')?.textContent?.trim()};
     });
     console.log('TALERA_GUEST_REAL_ORIGINAL_UPWARD_STORY_GESTURE_DIAGNOSTIC',
       JSON.stringify({before:guestReaderBefore,after:guestReaderAfter,
         originalPresenter:true,realIphoneAccepted:false}));
     assert.ok(guestReaderAfter.reading||guestReaderAfter.body||
       guestReaderAfter.top<guestReaderBefore.top-55||
       guestReaderAfter.captionTop<guestReaderBefore.captionTop-55,
       'Original TALERA guest story must be raised by real mobile touch gesture');
     console.log('TALERA_GUEST_ORIGINAL_UPWARD_STORY_READER_PASS');


     const intro=guest.locator('#talera-flow-home');
     assert.ok((await intro.getAttribute('href')).startsWith('/ontdek-talera#s/'));
     await intro.click();
     await guest.waitForURL(/\/ontdek-talera#s\//);
     assert.equal(await guest.locator('#returnGuestStory').isVisible(),true);
     await guest.locator('#returnGuestStory').click();
     await guest.waitForURL(issued.link);
     await guest.waitForFunction(()=>window.__taleraTimelineRuntime?.currentMemory?.()?._taleraLocal,
       null,{timeout:20000});
     await guest.locator('#talera-clean-social [data-action=heart]').click();
     await guest.waitForFunction(()=>document.querySelector('#talera-clean-social [data-action=heart] .count')?.textContent==='1');
     assert.equal(await guest.locator('#talera-clean-social [data-action=heart]').getAttribute('aria-pressed'),'true');
     await guest.locator('#talera-clean-social [data-action=comments]').click();
     assert.equal(await guest.locator('#talera-clean-overlay').isVisible(),true,
       'The exact original TALERA reaction pane opens for a guest');
     assert.equal(await guest.locator('#taleraNativeGuestDialog').count(),0,
       'No independently designed guest comments pane may be mounted');
     assert.equal(await guest.locator('#talera-clean-panel h2').textContent(),'Berichten');
     assert.equal(await guest.evaluate(()=>window.__taleraGuestUsesOriginalCommentSheet),true);
     await guest.locator('#taleraGuestFirstName').fill('Iris');
     await guest.locator('#clean-comment').fill('Dit is uitsluitend een fictieve browserreactie.');
     await guest.locator('#talera-clean-comment-form button[type="submit"]').click();
     await guest.waitForFunction(()=>document.getElementById('taleraGuestResponseStatus')?.textContent.includes('geplaatst'));
     const nativePanelCss=async page=>page.evaluate(()=>{
       const el=document.querySelector('#talera-clean-panel'),style=getComputedStyle(el);
       return {background:style.backgroundColor,borderRadius:style.borderRadius,
        padding:style.padding,font:style.font,maxHeight:style.maxHeight,overflow:style.overflowY};
     });
     const standard=await nativePanelCss(sharePage),receiver=await nativePanelCss(guest);
     assert.deepEqual(receiver,standard,'Reaction sheet must use identical original TALERA CSS');
     console.log('TALERA_GUEST_ORIGINAL_REACTIONS_STYLE_IDENTICAL_PASS',
       JSON.stringify({sameOriginalPanel:true,sameOriginalButtons:true,onlyGuestNameInput:true}));
     console.log('TALERA_FREE_GUEST_NATIVE_ONE_MEMORY_ACCESS_AND_REACTIONS_PASS',
       JSON.stringify({oneOnly:true,originalPresentation:true,originalStory:true,
         privateLibraryDenied:true,writeDenied:true,originalMediaKey:true,
         feedback:true,introReturn:true,iphoneAccepted:false}));
     const guestSnapshot=await guest.request.get(issued.link+'/feedback',
       {headers:{'x-talera-guest-id':await guest.evaluate(()=>
         sessionStorage.getItem('talera-guest-browser-v1'))}});
     assert.equal(guestSnapshot.status(),200);
     const guestFeedback=await guestSnapshot.json();
     assert.equal(guestFeedback.likes,1);
     assert.equal(guestFeedback.commentCount,1);
     assert.equal(guestFeedback.comments[0].name,'Iris');
     assert.ok(!guestFeedback.accountName,'Anonymous guest requires no TALERA account');
     // An owner-authenticated private TALERA comment on the very SAME memory
     // must never appear in the WhatsApp guest's token-scoped response.
     const shareRequest=shareNetwork.find(x=>x.method==='POST'&&
       /^\/api\/memories\/[a-f0-9]{64}\/shares$/.test(x.path));
     assert.ok(shareRequest,'Existing social owner route must be known');
     const sharedStoryId=shareRequest.path.split('/')[3];
     const internalText='PRIVATE_TALERA_COMMENT_MUST_NOT_LEAK_TO_GUEST';
     const privateComment=await sharePage.evaluate(async({id,text})=>{
       const result=await fetch('/__social/memory/'+id+'/comment',{
         method:'POST',credentials:'same-origin',
         headers:{'content-type':'application/json'},
         body:JSON.stringify({body:text})
       });
       return {status:result.status,data:await result.json()};
     },{id:sharedStoryId,text:internalText});
     assert.equal(privateComment.status,200,
       'Original signed-in conversation remains functional');
     const privateView=await sharePage.evaluate(async id=>{
       const result=await fetch('/__social/memory/'+id+'/view',{
         credentials:'same-origin'});
       return {status:result.status,data:await result.json()};
     },sharedStoryId);
     assert.equal(privateView.status,200);
     assert.ok(privateView.data.comments?.some(x=>x.body===internalText),
       'Signed-in owner must keep their original private comment');
     const privateCountBefore=privateView.data.commentCount;

     const guestPrivateProbe=await guest.request.get(issued.link+'/feedback');
     assert.equal(guestPrivateProbe.status(),200);
     const guestIsolated=await guestPrivateProbe.json();
     assert.equal(guestIsolated.commentCount,1,
       'Account-only private comments may not be counted by guest');
     assert.equal(guestIsolated.likes,1,
       'Only the hearts on this invitation may be counted');
     assert.ok(guestIsolated.comments.every(x=>x.body!==internalText),
       'Private account messages must never leak to a share-token recipient');
     // Old internal social read route is reachable only with the same
     // capability. It must NOT reveal the owner's account-only thread.
     const rawShare=Buffer.from(new URL(issued.link).pathname.split('/')[2],'base64url');
     assert.equal(rawShare.byteLength,32,'Original capability entropy remains 256 bits');
     const rawShareToken=rawShare.toString('hex');
     const legacyGuest=await guest.request.get(origin+
       '/__social/memory/'+sharedStoryId+'/view',{
        headers:{'x-qa-share-token':rawShareToken}});
     assert.equal(legacyGuest.status(),200,
       'Legacy token-view remains functional for the same guest invitation');
     const legacyBody=await legacyGuest.json();
     assert.equal(legacyBody.commentCount,1,
       'Legacy token-view must not count account-only comments');
     assert.equal(legacyBody.likes,1,
       'Legacy token-view must not include account-only hearts');
     assert.ok(legacyBody.comments.every(x=>x.body!==internalText),
       'Legacy token-view must never expose account-only comment text');
     // Anonymous share rights must never mutate the original signed-in
     // TALERA account's conversation via legacy social endpoints.
     const privateSocialPath=origin+'/__social/memory/'+sharedStoryId;
     const tokenOnlyReply=await guest.request.post(privateSocialPath+'/comment',{
       headers:{origin,'x-qa-share-token':rawShareToken,
        'content-type':'application/json'},
       data:{body:'DO_NOT_WRITE_PRIVATE_THREAD'}});
     assert.equal(tokenOnlyReply.status(),403,
       'Only the protected guest /s/:token/comment can accept anonymous text');
     const tokenOnlyHeart=await guest.request.post(privateSocialPath+'/like',{
       headers:{origin,'x-qa-share-token':rawShareToken,
        'content-type':'application/json'},data:{}});
     assert.equal(tokenOnlyHeart.status(),403,
       'Only the protected guest /s/:token/heart can accept anonymous hearts');
     const unauthenticated=await guest.request.get(origin+
       '/__social/memory/'+sharedStoryId+'/view');
     assert.equal(unauthenticated.status(),403,
       'No free access by guessing a story ID without the capability');
     const ownerAfterTokenAttempts=await sharePage.evaluate(async id=>{
       const r=await fetch('/__social/memory/'+id+'/view',{credentials:'same-origin'});
       return {status:r.status,data:await r.json()};
     },sharedStoryId);
     assert.equal(ownerAfterTokenAttempts.status,200);
     assert.equal(ownerAfterTokenAttempts.data.commentCount,privateCountBefore,
       'Anonymous token-only write attempts never change original account comments');
     assert.ok(ownerAfterTokenAttempts.data.comments.some(x=>x.body===internalText),
       'Original account-only comment is unchanged after guest attempts');

     console.log('TALERA_GUEST_OLD_SOCIAL_TOKEN_VIEW_PRIVACY_PASS',
      JSON.stringify({onlyOwnSharedReactions:true,accountConversationProtected:true}));

     console.log('TALERA_FREE_ONE_GUEST_SHARE_PRIVATE_ACCOUNT_COMMENT_ISOLATION_PASS',
       JSON.stringify({guestComments:guestIsolated.commentCount,
        originalPrivateCommentStillPresent:true,originalPresenterUnchanged:true}));
     // Two invitations to the SAME selected memory are independent access
     // capabilities: neither comments nor temporary media may cross links.
     const siblingInvite=await sharePage.evaluate(async id=>{
       const r=await fetch('/api/memories/'+id+'/shares',{
         method:'POST',credentials:'same-origin',
         headers:{'content-type':'application/json'},
         body:JSON.stringify({hours:1,consent:true})
       });
       return {status:r.status,data:await r.json()};
     },sharedStoryId);
     assert.equal(siblingInvite.status,200,'Existing owner can share the same memory twice');
     const siblingUrl=new URL(siblingInvite.data.link,origin).href;
     assert.notEqual(siblingUrl,issued.link,'Different recipients get separate share capabilities');
     const siblingFeedbackRes=await guest.request.get(siblingUrl+'/feedback');
     assert.equal(siblingFeedbackRes.status(),200);
     const siblingFeedback=await siblingFeedbackRes.json();
     assert.deepEqual({likes:siblingFeedback.likes,comments:siblingFeedback.commentCount},
       {likes:0,comments:0},'Two links must never exchange guest reactions');
     assert.equal((await guest.request.get(siblingUrl+'/photo')).status(),404,
       'An unuploaded photo for share B cannot reuse share A media');
     assert.equal((await guest.request.get(issued.link+'/photo')).status(),200,
       'An existing valid share A keeps its own permitted media');
     const siblingRevoke=await sharePage.evaluate(async id=>{
       const r=await fetch('/api/shares/'+id+'/revoke',{
         method:'POST',credentials:'same-origin'});
       return r.status;
     },siblingInvite.data.id);
     assert.equal(siblingRevoke,200);
     assert.equal((await guest.request.get(siblingUrl+'/feedback')).status(),404);
     assert.equal((await guest.request.get(issued.link+'/feedback')).status(),200,
       'Revoking one invitation must not revoke another');
     console.log('TALERA_FREE_ONE_MEMORY_MULTIPLE_LINK_RIGHTS_ISOLATION_PASS',
       JSON.stringify({oneMemory:true,separateGuestReactions:true,separateMedia:true,
        selectiveRevoke:true,presenterUnchanged:true}));


     const alienReaction=await guest.request.post(issued.link+'/heart',{
       headers:{origin:'https://attacker.invalid','content-type':'application/json'},
       data:{guestId:'00000000-0000-4000-8000-000000000000'}});
     assert.equal(alienReaction.status(),403);
     await guest.locator('#talera-clean-overlay [data-action=close]').click();
     console.log('TALERA_FREE_GUEST_NAMED_REACTION_AND_ORIGIN_PROTECTION_PASS',
       JSON.stringify({accountRequired:false,guestLike:true,
         guestFirstName:true,foreignOriginDenied:true,realIphoneAccepted:false}));
     const imageResponse=await guest.request.get(issued.link+'/photo');
     assert.equal(imageResponse.status(),200,'Temporary shared photo must load');
     assert.match(imageResponse.headers()['content-type']||'',/image\/jpeg/i);
     assert.ok((await imageResponse.body()).length>100,
       'Temp shared photo must contain actual pixels');
     // The CURRENT running browser suite validates the real deployed Worker
     // source, not the obsolete F5 local helper. Synthetic transport bytes
     // only: this proves iPhone Range/HEAD, NOT actual iPhone codec playback.
     const syntheticVideo=await sharePage.evaluate(async token=>{
       const bytes=Uint8Array.from({length:1024},(_,i)=>i&255);
       bytes.set(new TextEncoder().encode('ftyp'),4);
       const r=await fetch('/api/shares/'+token+'/video',{
         method:'POST',credentials:'same-origin',
         headers:{'content-type':'video/mp4'},body:bytes});
       return {status:r.status,details:await r.json()};
     },issued.id);
     assert.equal(syntheticVideo.status,200,'Consented video test is stored under the existing share token');
     const videoPath=issued.link+'/video';
     const probe=await guest.request.get(videoPath,{headers:{range:'bytes=0-1'}});
     assert.equal(probe.status(),206,'iPhone must get two-byte video probe');
     assert.equal(probe.headers()['content-range'],'bytes 0-1/1024');
     assert.equal(probe.headers()['accept-ranges'],'bytes');
     assert.deepEqual([...await probe.body()],[0,1]);
     const seek=await guest.request.get(videoPath,{headers:{range:'bytes=128-159'}});
     assert.equal(seek.status(),206);
     assert.equal((await seek.body()).length,32);
     const suffix=await guest.request.get(videoPath,{headers:{range:'bytes=-16'}});
     assert.equal(suffix.status(),206);
     assert.equal(suffix.headers()['content-range'],'bytes 1008-1023/1024');
     const pastEnd=await guest.request.get(videoPath,{headers:{range:'bytes=1000-999999'}});
     assert.equal(pastEnd.status(),206,'iPhone range extending beyond the end must be clipped');
     assert.equal(pastEnd.headers()['content-range'],'bytes 1000-1023/1024');
     assert.equal((await pastEnd.body()).length,24);
     const bad=await guest.request.get(videoPath,{headers:{range:'bytes=1024-1030'}});
     assert.equal(bad.status(),416,'Out-of-bounds ranges must not reveal media');
     assert.equal(bad.headers()['content-range'],'bytes */1024');
     const headVideo=await guest.request.fetch(videoPath,{method:'HEAD'});
     assert.equal(headVideo.status(),200);
     assert.equal(headVideo.headers()['content-length'],'1024');
     assert.equal((await headVideo.body()).length,0);
     console.log('TALERA_GUEST_IPHONE_SAFARI_RANGE_HEAD_AND_SEEK_PASS',
      JSON.stringify({byteProbe:true,seek:true,suffix:true,
       invalidRangeDenied:true,mediaPrivateToSameToken:true,realIphoneAccepted:false}));
     // The original TALERA local presenter, not a custom modal, must
     // contain the selected real share media after a fresh guest opening.
     await guest.goto(issued.link,{waitUntil:'domcontentloaded'});
     await guest.waitForFunction(()=>window.__taleraTimelineRuntime?.currentMemory?.()?._taleraLocal,
       null,{timeout:20000});
     const sharedMediaKinds=await guest.evaluate(()=>{
       const m=window.__taleraTimelineRuntime.currentMemory();
       return m?._zeroItems?.map(x=>x.kind);
     });
     assert.deepEqual(sharedMediaKinds,['photo','video']);
     assert.equal(await guest.locator('#photoStage').count(),1);
     assert.equal(await guest.locator('#memoryStoryScroll').count(),1);
     assert.equal(await guest.locator('#openGuestVideo').count(),0,
       'The old independent video overlay must not be part of native TALERA');
     console.log('TALERA_GUEST_NATIVE_MEDIA_USES_ORIGINAL_PRESENTER_PASS',
       JSON.stringify({photoAndVideo:true,originalTimeline:true,iphoneAccepted:false}));
     // Revoke only the newly generated synthetic share. Verify that the raw
     // capability and photo are both immediately inaccessible.
     const revoke=await sharePage.evaluate(async token=>{
       const r=await fetch('/api/shares/'+token+'/revoke',{
         method:'POST',credentials:'same-origin'
       });
       return {status:r.status,data:await r.json()};
     },issued.id);
     assert.equal(revoke.status,200,'Synthetic owner must revoke own share');
     assert.equal((await guest.request.get(issued.link,{headers:{accept:'text/html'}})).status(),404);
     assert.equal((await guest.request.get(issued.link+'/photo')).status(),404);
     assert.equal((await guest.request.get(origin+
       '/__social/memory/'+sharedStoryId+'/view',{
        headers:{'x-qa-share-token':rawShareToken}})).status(),403,
       'Legacy capability access is denied immediately after revocation');
     assert.equal((await guest.request.get(videoPath,{headers:{range:'bytes=0-1'}})).status(),404,
       'Revoked guest media must not be streamable anymore');
     // Photo-only Free memories are legitimate. Verify NO public access before
     // the consented photo arrives; after upload verify the same one-memory
     // token opens, and revoke it without touching the private original.
     const pictureOnly=await sharePage.evaluate(async localId=>{
       const post=async(path,data)=>{
         const r=await fetch(path,{method:'POST',credentials:'same-origin',
           headers:{'content-type':'application/json'},body:JSON.stringify(data)});
         return {status:r.status,data:await r.json()};
       };
       const created=await post('/api/pwa/memory-link',{
         localMemoryId:localId+'-photo-only',
         title:'synthetic PHOTO ONLY',storyText:'',eventDate:'',consent:true
       });
       if(created.status!==200)return {step:'stage',created};
       const share=await post('/api/memories/'+created.data.memoryId+'/shares',
         {hours:1,consent:true});
       if(share.status!==200)return {step:'token',share};
       const before=await fetch(share.data.link,{
         headers:{accept:'text/html'},credentials:'omit'});
       const canvas=document.createElement('canvas');
       canvas.width=96;canvas.height=96;
       const ctx=canvas.getContext('2d');
       ctx.fillStyle='#224466';ctx.fillRect(0,0,96,96);
       const jpeg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.83));
       const media=await fetch('/api/shares/'+share.data.id+'/photo',{
         method:'POST',credentials:'same-origin',
         headers:{'content-type':'image/jpeg'},body:jpeg
       });
       const after=await fetch(share.data.link,{
         headers:{accept:'text/html'},credentials:'omit'});
       const html=await after.text();
       const revoke=await fetch('/api/shares/'+share.data.id+'/revoke',{
         method:'POST',credentials:'same-origin'});
       const unavailable=await fetch(share.data.link,{
         headers:{accept:'text/html'},credentials:'omit'});
       return {before:before.status,after:after.status,
         media:media.status,revoke:revoke.status,
         unavailable:unavailable.status,
         hasPhoto:html.includes('/photo'),hasTitle:html.includes('synthetic PHOTO ONLY'),
         expiresAt:share.data.expiresAt};
     },a.id);
     assert.deepEqual({
       before:pictureOnly.before,after:pictureOnly.after,
       media:pictureOnly.media,revoke:pictureOnly.revoke,
       unavailable:pictureOnly.unavailable,
       hasPhoto:pictureOnly.hasPhoto,hasTitle:pictureOnly.hasTitle
     },{before:404,after:200,media:200,revoke:200,unavailable:404,
       hasPhoto:true,hasTitle:true},
       'Photo-only memory must be private until consented media exists, then revocable');
     assert.ok(Math.abs(pictureOnly.expiresAt-(Date.now()+3600000))<60000,
       'Photo-only temporary share must honour one-hour choice');
     console.log('TALERA_FREE_WHATSAPP_SHARE_READY_RECIPIENT_PHOTO_REVOKED_PASS',
       JSON.stringify({originalWhatsAppUI:true,receiverHtml:200,photo:200,
         revoke:200,expiredLinkAfterRevoke:404,otherStoriesUntouched:true,
         noRealRecipients:true,oneExistingWorker:true,realIphoneAccepted:false}));
     // Verify the actual original share sheet also accepts an UNTITLED,
     // TEXTLESS memory which contains an existing account-private photo.
     // This is a temporary synthetic browser record, removed afterwards.
     const untitledId=await sharePage.evaluate(async png=>{
       const blob=new File([Uint8Array.from(atob(png),c=>c.charCodeAt(0))],
         'untitled-whatsapp-synthetic.png',{type:'image/png'});
       const record=await window.TaleraMemories.save({
         title:'temporary synthetic placeholder',
         date:'2001-02-01',text:'temporary synthetic placeholder',
         narrationCues:[]
       },[blob]);
       return record.id;
     },onePixelPng);
     try{
       await sharePage.goto(origin+'/present?memory='+encodeURIComponent(untitledId),
         {waitUntil:'domcontentloaded'});
       await sharePage.waitForFunction(id=>
         window.__taleraTimelineRuntime?.currentMemory?.()?.storyId===id,
         untitledId,{timeout:20000});
       await sharePage.waitForFunction(()=>
         !!document.querySelector('#talera-clean-social [data-action=share]'),
         null,{timeout:15000});
       await sharePage.waitForTimeout(1700);
       const blank=await sharePage.evaluate(()=>{
         const m=window.__taleraTimelineRuntime.currentMemory();
         if(!m._taleraLocal||!m._zeroItems.some(x=>x.kind==='photo'))return false;
         m.title='';m.story='';m.fullStory='';m.text='';m.description='';
         return true;
       });
       assert.equal(blank,true,'Synthetic photo needs an original media reference');
       // Verify the share button itself pauses both media types in the
       // ORIGINAL page; never rely on a vacant audio/video DOM.
       await sharePage.evaluate(()=>{
         window.__taleraWhatsappMediaProbe=[];
         for(const kind of ['audio','video']){
           const node=document.createElement(kind);
           let playing=true,calls=0;
           Object.defineProperty(node,'paused',{configurable:true,get:()=>!playing});
           node.pause=()=>{calls++;playing=false};
           node.dataset.taleraShareProbe=kind;
           document.body.append(node);
           window.__taleraWhatsappMediaProbe.push({node,kind,get calls(){return calls}});
         }
       });
       await sharePage.locator('#talera-clean-social [data-action=share]').click();
       await sharePage.waitForFunction(()=>
         !!document.querySelector('#talera-clean-overlay:not([hidden]) [data-action=prepare]'),
         null,{timeout:12000});
       const paused=await sharePage.evaluate(()=>({
         requested:window.__taleraSharePauseActive===true,
         media:[...document.querySelectorAll('audio,video')].every(m=>m.paused)
       }));
       assert.deepEqual(paused,{requested:true,media:true},
         'Opening WhatsApp must pause picture and all audio/video');
       const halted=await sharePage.evaluate(()=>
         window.__taleraWhatsappMediaProbe.map(x=>({kind:x.kind,calls:x.calls})));
       assert.deepEqual(halted,[{kind:'audio',calls:1},{kind:'video',calls:1}],
         'WhatsApp must synchronously stop playing audio AND video elements');
       await sharePage.locator('#talera-clean-overlay [data-action=message-personal]').click();
       assert.equal(await sharePage.locator('#talera-clean-personal').inputValue(),'');
       await sharePage.locator('#talera-clean-personal').fill('Weet je nog dat moment? Dit wilde ik met je delen.');
       await sharePage.locator('#talera-clean-consent').check();
       await sharePage.locator('#talera-clean-overlay [data-action=prepare]').click();
       await sharePage.waitForFunction(()=>
         !document.querySelector('#talera-clean-overlay [data-action=send]')?.disabled,
         null,{timeout:20000});
       assert.equal(await sharePage.locator('#talera-clean-personal').inputValue(),
         'Weet je nog dat moment? Dit wilde ik met je delen.');
       assert.equal(await sharePage.locator('.talera-share-progress').count(),0,
         'Loading indicator must disappear after the invitation is ready');
       // The second memory navigated to a fresh document. Its native share
       // bridge must be simulated again; nothing is sent to a real contact.
       await sharePage.evaluate(()=>{
         window.__taleraNativeShareProbe=[];
         Object.defineProperty(navigator,'canShare',{configurable:true,value:data=>
           Array.isArray(data?.files)&&data.files.length===1&&
           data.files[0].type==='image/jpeg'});
         Object.defineProperty(navigator,'share',{configurable:true,value:data=>{
           const file=data.files?.[0];
           window.__taleraNativeShareProbe.push({
             name:file?.name,type:file?.type,size:file?.size,
             count:data.files?.length,text:data.text
           });
           return Promise.resolve();
         }});
       });
       await sharePage.locator('#talera-clean-overlay [data-action=send]').click();
       const personalPayload=await sharePage.evaluate(()=>
         window.__taleraNativeShareProbe?.at(-1));
       assert.equal(personalPayload?.type,'image/jpeg');
       assert.ok(personalPayload.size>100);
       const personalLink=createdLinks.at(-1)?.link;
       assert.equal(personalPayload.text,
         'Weet je nog dat moment? Dit wilde ik met je delen.\n'+personalLink,
         'Personal invitation must NOT receive any automatic promotional copy');
       console.log('TALERA_FREE_NATIVE_IOS_PERSONAL_PHOTO_AND_LINK_SHARE_PAYLOAD_PASS',
         JSON.stringify({image:true,ownWordsOnly:true,secureLink:true,realIphoneAccepted:false}));

       const issuedUntitled=createdLinks.at(-1);
       assert.equal(createdLinks.length,4,'Original, independent sibling, direct photo-only and untitled UI invitations are distinct');
       assert.equal(issuedUntitled.status,200);
       const photoOnlyView=await guest.goto(issuedUntitled.link,
         {waitUntil:'domcontentloaded'});
       assert.equal(photoOnlyView.status(),200);
       const untitledHtml=await photoOnlyView.text();
       assert.ok(untitledHtml.includes('id="photoStage"')&&
         untitledHtml.includes('id="memoryStoryScroll"')&&
         untitledHtml.includes('/photo'),
         'Untitled photo-only sharing must use the original TALERA presentation');
       await guest.waitForFunction(async()=>{
         const rows=await window.TaleraMemories?.list?.();
         return rows?.length===1&&window.__taleraTimelineRuntime?.currentMemory?.()?._taleraLocal;
       },null,{timeout:20000});
       const untitledRow=await guest.evaluate(async()=>(
         await window.TaleraMemories.list())[0]);
       assert.equal(untitledRow.title,'',
         'A truly untitled memory must not display the invented title Herinnering');
       assert.equal(untitledRow.text,'');
       assert.deepEqual(untitledRow.items.map(x=>x.kind),['photo']);
       console.log('TALERA_NATIVE_UNTITLED_PHOTO_NO_FAKE_HEADING_PASS');
       assert.equal((await guest.request.get(issuedUntitled.link+'/photo')).status(),200);
       const stopped=await sharePage.evaluate(async token=>{
         const response=await fetch('/api/shares/'+token+'/revoke',
           {method:'POST',credentials:'same-origin'});
         return response.status;
       },issuedUntitled.id);
       assert.equal(stopped,200);
       await sharePage.locator('#talera-clean-overlay [data-action=close]').click();
       assert.equal(await sharePage.evaluate(()=>
         window.__taleraSharePauseActive),false,
         'Closing the share sheet may release pause without autoplay');
       const stillHalted=await sharePage.evaluate(()=>{
         const list=window.__taleraWhatsappMediaProbe;
         const result=list.every(x=>x.node.paused&&x.calls===1);
         list.forEach(x=>x.node.remove());
         delete window.__taleraWhatsappMediaProbe;
         return result;
       });
       assert.equal(stillHalted,true,'Closing WhatsApp must never restart media');
       console.log('TALERA_FREE_UNTITLED_PHOTO_WHATSAPP_AND_PLAYBACK_PAUSE_PASS',
         JSON.stringify({realTitleRequired:false,realStoryTextRequired:false,
           originalPhotoByMediaId:true,playbackPaused:true,
           syntheticShareRevoked:true,realIphoneAccepted:false}));
     }finally{
       await sharePage.evaluate(async id=>{
         await window.TaleraMemories?.remove?.(id);
       },untitledId).catch(()=>{});
     }
   }finally{await anonymous.close()}
 }finally{await sharePage.close()}
 // This complements the STATIC source-route inventory with REAL requests
 // made by existing menu controls, without activating any privacy toggle,
 // publishing, sharing, or unported media/upload path.
 const visitedViews=[];
 for(const name of ['hub','account','privacy','settings']){
   await menu(page);
   const nav=page.locator('#talera-more-menu [data-view="'+name+'"]').first();
   if(!(await nav.count())||!(await nav.isVisible()))continue;
   await nav.click();
   await page.waitForTimeout(650);
   visitedViews.push(name);
 }
 const distinct=Array.from(new Map(apiTrace.map(r=>[
   r.method+' '+r.path+' '+r.status,r])).values());
 const unexpectedReads=distinct.filter(r=>r.method==='GET'&&r.status>=400&&
    r.path!=='/api/me');
 const traceSummary={syntheticOnly:true,approvedUiUntouched:true,
   visitedViews,requests:distinct,
   failedActiveReads:unexpectedReads,
   scanIsLimitedToMenuViews:true,allFreeActionsProven:false};
 console.log('TALERA_F5_ACTIVE_MENU_API_TRACE',JSON.stringify(traceSummary));
 // An existing account/menu screen must not lose server access silently.
 // Report missing old flows explicitly, but do not pretend 404 is success.
 assert.ok(visitedViews.length>=1,'Original signed-in menu views not reachable');
 assert.ok(!distinct.some(r=>r.status>=500),'Original Free account view caused server error');
 result={ok:true,syntheticOnly:true,realBrowser:'Chromium iPhone mobile emulation',
   accounts:2,accountTransitions:5,
   originalLocalStoryAndBlobPreserved:true,secondAccountCannotReadFirst:true,
   firstAccountCannotReadSecond:true,
   menuAndStylesUnmodified:true,realIphoneAccepted:false,
   browserPageErrors:errors.slice(0,10)};
 console.log('TALERA_F5_ACTUAL_MENU_BROWSER_ISOLATION',JSON.stringify(result));
}finally{
 if(browser)await browser.close();
 if(worker){worker.kill('SIGTERM');await delay(300)}
 // Remove ONLY this run's unique local synthetic Durable Object directory.
 // Never touch browser-owner storage, other tests or a deployed TALERA Worker.
 rmSync(syntheticStoragePath,{recursive:true,force:true});
}
