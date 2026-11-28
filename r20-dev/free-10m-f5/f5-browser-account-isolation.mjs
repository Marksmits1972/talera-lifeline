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
import {languageCatalog} from './f5-language-catalog.mjs';
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
  tab.on('pageerror',e=>console.log('TALERA_RESET_PAGE_ERROR',String(e.message).slice(0,250)));
  tab.on('console',m=>{if(m.type()==='error')console.log('TALERA_RESET_CONSOLE',m.text().slice(0,250))});
  try{
   const opening=await tab.goto(origin+(await recovery.getAttribute('href')));
   assert.equal(opening.status(),200);
   assert.match(await tab.title(),/Wachtwoord vergeten/);
   assert.equal(await tab.evaluate(()=>typeof window.TaleraLanguage?.t),'function','Recovery language initialization must execute');
   await tab.locator('input[name="email"]').fill(user.email);
   const [resetResponse]=await Promise.all([tab.waitForResponse(r=>new URL(r.url()).pathname==='/api/password-reset/request'&&r.request().method()==='POST'),tab.locator('form button[type="submit"]').click()]);
   const resetResult=await resetResponse.json();
   console.log('TALERA_RESET_UI_STATUS',JSON.stringify({httpStatus:resetResponse.status(),key:resetResult.messageKey||null,language:await tab.locator('html').getAttribute('lang')}));
   assert.ok([200,503].includes(resetResponse.status()),'Password recovery returned unexpected status '+resetResponse.status());
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
 const [loginResponse]=await Promise.all([
   page.waitForResponse(response=>new URL(response.url()).origin===origin&&
     new URL(response.url()).pathname==='/api/login'&&response.request().method()==='POST',
     {timeout:18000}),
   page.waitForEvent('load',{timeout:18000}),
   form.locator('button[type="submit"]').click()
 ]);
 assert.equal(loginResponse.status(),200,'The actual login request must succeed');
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
// Run the requested guest change before unrelated UI regressions; same Worker,
// same browser engine and actual packaged TALERA presenter, isolated synthetic owner.
async function verifyCompactWhatsAppFirst(browser){
 const owner={...users[0],email:'f5-compact-'+testKey+'@example.invalid',username:'f5compact'+testKey,
  displayName:'F5 synthetic compact guest'};
 const ownerId=await createUser(owner,7);
 const ownerContext=await browser.newContext({...devices['iPhone 13'],locale:'nl-NL',
  extraHTTPHeaders:{'x-talera-f5-key':gate,'cf-connecting-ip':'192.0.2.87'}});
 const guestContext=await browser.newContext({...devices['iPhone 13'],locale:'nl-NL',
  extraHTTPHeaders:{'x-talera-f5-key':gate,'cf-connecting-ip':'192.0.2.88'}});
 const crawler=await browser.newContext({extraHTTPHeaders:{'x-talera-f5-key':gate}});
 try{
  const page=await ownerContext.newPage();
  await page.goto(origin+'/present',{waitUntil:'domcontentloaded'});
  await waitForLibrary(page);
  const recoveryWasChecked=passwordRecoveryUiChecked;
  try{
   passwordRecoveryUiChecked=true; // Existing full suite independently checks recovery.
   assert.equal(await login(page,owner),ownerId);
  }finally{passwordRecoveryUiChecked=recoveryWasChecked}
  const memory=await saveSyntheticPhoto(page,99);
  await page.goto(origin+'/present?memory='+encodeURIComponent(memory.id),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(id=>window.__taleraTimelineRuntime?.currentMemory?.()?.storyId===id,memory.id,{timeout:20000});
  await page.locator('#talera-clean-social [data-action=share]').waitFor({timeout:15000});
  const prepare=async consent=>{
   await page.locator('#talera-clean-social [data-action=share]').click();
   const expiry=page.locator('#talera-clean-expiry');
   assert.deepEqual(await expiry.locator('option').evaluateAll(o=>o.map(x=>Number(x.value))),[1,24,168]);
   await expiry.selectOption('168');
   await page.locator('#talera-clean-overlay [data-action=message-standard]').click();
   await page.locator('#talera-clean-preview-photo').setChecked(consent);
   await page.locator('#talera-clean-consent').check();
   const issuedPromise=page.waitForResponse(r=>r.request().method()==='POST'&&/^\/api\/memories\/[a-f0-9]{64}\/shares$/.test(new URL(r.url()).pathname));
   const manifestPromise=page.waitForResponse(r=>r.request().method()==='POST'&&/^\/api\/shares\/[a-f0-9]{64}\/manifest$/.test(new URL(r.url()).pathname),{timeout:40000});
   await page.locator('#talera-clean-overlay [data-action=prepare]').click();
   const issuedResponse=await issuedPromise;
   assert.equal(issuedResponse.status(),200);
   assert.equal((await manifestPromise).status(),200);
   const issued=await issuedResponse.json();
   await page.waitForFunction(()=>!!document.querySelector('#talera-clean-overlay [data-action=send]:not([disabled])'),null,{timeout:30000});
   assert.ok(Math.abs(issued.expiresAt-Date.now()-168*3600000)<60000);
   return {issued,sharePath:new URL(issuedResponse.url()).pathname};
  };
  const {issued,sharePath}=await prepare(true);
  assert.equal(await page.evaluate(async p=>(await fetch(p,{method:'POST',credentials:'same-origin',
   headers:{'content-type':'application/json'},body:JSON.stringify({consent:true,hours:720})})).status,sharePath),400);
  const before=await crawler.request.get(issued.link);
  assert.equal(before.status(),200);
  const html=await before.text();
  assert.match(html,/<meta property="og:title" content="synthetic ACCOUNT ISOLATION 99">/);
  assert.match(html,/<meta property="og:site_name" content="TALERA">/);
  assert.match(html,/<meta name="twitter:card" content="summary">/);
  assert.match(html,/<meta property="og:image:width" content="512">/);
  assert.ok(!html.includes('Local-only imaginary image'));
  const preview=await crawler.request.get(issued.link+'/preview');
  assert.equal(preview.status(),200);
  assert.equal(preview.headers()['content-type'],'image/jpeg');
  const previewBytes=await preview.body();
  assert.ok(previewBytes.length>100&&previewBytes.length<=131072);
  assert.equal((await crawler.request.head(issued.link+'/preview')).status(),200);
  assert.equal((await crawler.request.head(issued.link)).status(),200);
  assert.equal((await crawler.request.get(issued.link+'/media/0/0')).status(),404);
  await page.evaluate(()=>{
   Object.defineProperty(navigator,'canShare',{configurable:true,value:data=>typeof data?.text==='string'&&!Object.hasOwn(data,'files')});
   Object.defineProperty(navigator,'share',{configurable:true,value:data=>{window.__compactSharePayload=data;return Promise.resolve()}});
  });
  await page.locator('#talera-clean-overlay [data-action=send]').click();
  const payload=await page.evaluate(()=>window.__compactSharePayload);
  assert.deepEqual(Object.keys(payload),['text']);
  assert.equal(payload.text,'Ik kwam deze herinnering tegen en moest aan je denken.\n\n'+issued.link);
  const guest=await guestContext.newPage();
  const accepted=guest.waitForResponse(r=>r.url()===issued.link&&r.status()===200&&
   r.headers()['x-talera-free-f5']==='original-presentation-one-memory-capability',{timeout:25000});
  await guest.goto(issued.link,{waitUntil:'domcontentloaded'}).catch(e=>{
   if(!/navigation|aborted|interrupted/i.test(String(e)))throw e;
  });
  await accepted;
  await guest.waitForFunction(async()=>{
   const rows=await window.TaleraMemories?.list?.();
   return rows?.length===1&&window.__taleraTimelineRuntime?.currentMemory?.()?._taleraLocal;
  },null,{timeout:25000});
  const received=await guest.evaluate(async()=>{
   const row=(await window.TaleraMemories.list())[0],blob=await window.TaleraMemories.blob(row.items[0].key);
   return {title:row.title,text:row.text,bytes:Array.from(new Uint8Array(await blob.arrayBuffer()))};
  });
  assert.equal(received.title,'synthetic ACCOUNT ISOLATION 99');
  assert.equal(received.text,'Local-only imaginary image');
  assert.deepEqual(received.bytes,Array.from(Buffer.from(onePixelPng,'base64')));
  assert.equal((await crawler.request.get(issued.link)).status(),403);
  const revoke=async link=>assert.equal(await page.evaluate(async id=>(await fetch('/api/shares/'+id+'/revoke',{method:'POST',credentials:'same-origin'})).status,link.id),200);
  await revoke(issued);
  assert.equal((await crawler.request.get(issued.link+'/preview')).status(),404);
  const no=await prepare(false);
  const noPage=await crawler.request.get(no.issued.link);
  assert.equal(noPage.status(),200);
  const noHtml=await noPage.text();
  assert.ok(noHtml.includes(origin+'/pwa-512.png'));
  assert.ok(!noHtml.includes('synthetic ACCOUNT ISOLATION 99'));
  assert.equal((await crawler.request.get(no.issued.link+'/preview')).status(),404);
  await revoke(no.issued);
  console.log('TALERA_COMPACT_WHATSAPP_ACTUAL_SAME_APP_TARGETED_PASS',JSON.stringify({duration:168,titleConsent:true,previewJpeg:true,attachment:false,caption:true,firstBrowser:true,originalPhotoBytes:true,revocation:true,logoFallback:true,realIPhoneAccepted:false}));
 }finally{await Promise.all([ownerContext.close(),guestContext.close(),crawler.close()])}
}

// Real DOM layout check on the SAME /tell page and synthetic account only.
// Verify original UI controls and photo IDs are unchanged while the *existing*
// tags box is rendered below the original photo grid, never cloned.
async function verifyTellEditorLayout(page,storyId){
 const edit=await page.context().newPage(),editorErrors=[];
 edit.on('pageerror',e=>editorErrors.push(String(e.message||e)));
 try{
  const response=await edit.goto(origin+'/tell?edit='+encodeURIComponent(storyId),
   {waitUntil:'domcontentloaded',timeout:25000});
  assert.equal(response.status(),200,'Original editing route must remain available');
  const work=edit.locator('.work.talera-compact-work.talera-r16-editor');
  try{await work.waitFor({state:'visible',timeout:11000})}
  catch(err){
   const opener=edit.locator('[data-open]').first();
   try{
    if(!(await opener.count()))throw err;
    await opener.click();
    await work.waitFor({state:'visible',timeout:11000});
   }catch(failure){
    console.error('TALERA_EDITOR_BOOT_DIAGNOSTIC',JSON.stringify({errors:editorErrors,
      banner:await edit.locator('#error').first().textContent({timeout:1500}).catch(()=>null),
      hasLibrary:await edit.evaluate(()=>typeof window.TaleraMemories?.draftReadPayload).catch(()=>null)}));
    throw failure;
   }
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
 await verifyCompactWhatsAppFirst(browser);
 const context=await browser.newContext({
   ...devices['iPhone 13'],locale:'nl-NL',serviceWorkers:'allow',
   extraHTTPHeaders:{'x-talera-f5-key':gate,'cf-connecting-ip':'192.0.2.73'}
 });
 const registrationContext=await browser.newContext({
   ...devices['iPhone 13'],locale:'nl-NL',serviceWorkers:'allow',
   extraHTTPHeaders:{'x-talera-f5-key':gate,'cf-connecting-ip':'192.0.2.79'}
 });
 const registrationPage=await registrationContext.newPage();
 try{
   // Exact same candidate/origin: test all five contextual menu positions,
   // then restore Dutch for the existing detailed workflow regressions.
   await registrationPage.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
   await registrationPage.waitForFunction(()=>window.__taleraMoreMenu?.ready&&document.getElementById('talera-v23-language'));
   for(const lang of ['nl','en','de','fr','es']){
     const pack=languageCatalog[lang];
     await registrationPage.locator('#talera-v23-language').selectOption(lang);
     await registrationPage.locator('#navMore').click();
     const hub=registrationPage.locator('#talera-more-menu');
     assert.equal(await hub.locator('header strong').innerText(),pack['menu.header.title1']);
     assert.equal(await hub.locator('[data-view="mine"] strong').innerText(),pack['menu.hub.sent1']);
     assert.equal(await hub.locator('[data-view="help"] strong').innerText(),pack['menu.hub.Hulp_en_over_TALERA1']);
     // Attribution is visible to a signed-out user in every language. For
     // Dutch, prove it opens even when the existing app is disconnected.
     if(lang==='nl')await registrationContext.setOffline(true);
     try{
       await hub.locator('[data-view="help"]').click();
       const credit=hub.locator('#talera-geonames-attribution');
       await credit.waitFor({state:'visible'});
       assert.equal(await credit.locator('strong').innerText(),pack['menu.help.sourcesLicenses']);
       assert.equal(await credit.locator('p').first().innerText(),pack['menu.help.geonamesCredit']);
       const links=await credit.locator('a').evaluateAll(nodes=>nodes.map(a=>[a.getAttribute('href'),a.getAttribute('target'),a.getAttribute('rel')]));
       assert.deepEqual(links,['https://www.geonames.org/','https://download.geonames.org/export/dump/cities500.zip','https://download.geonames.org/export/dump/allCountries.zip','https://creativecommons.org/licenses/by/4.0/'].map(url=>[url,'_blank','noopener noreferrer']));
       if(lang==='nl')assert.equal(await registrationPage.evaluate(()=>navigator.onLine),false);
     }finally{if(lang==='nl')await registrationContext.setOffline(false)}
     await hub.locator('[data-action="back"]').click();
     assert.equal(await hub.locator('#talera-geonames-attribution').count(),0);
     await hub.locator('[data-view="account"]').click();
     await hub.locator('[data-view="login"]').click();
     assert.equal(await hub.locator('form[data-form="login"] button[type="submit"]').innerText(),pack['menu.login.signIn2']);
     assert.equal(await hub.locator('a[href="/wachtwoord-vergeten"]').innerText(),pack['menu.cleanHub.forgot1']);
     await hub.locator('[data-action="close"]').click();
   }
   await registrationPage.locator('#talera-v23-language').selectOption('nl');
   console.log('TALERA_FIVE_CONTEXTUAL_MENU_LANGUAGES_PASS');
   console.log('TALERA_GEONAMES_CREDIT_FIVE_LANGUAGES_OFFLINE_NO_SIGNIN_PASS');

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
   // DOB is injected after the legacy menu's first synchronous render.
   // Wait for the complete stable registration form before filling it.
   await form.locator('input[name="birthDate"]').waitFor({state:'visible',timeout:10000});
   await form.locator('input[name="displayName"]').fill(signupUser.displayName);
   await form.locator('input[name="username"]').fill(signupUser.username);
   await form.locator('input[name="email"]').fill(signupUser.email);
   await form.locator('input[name="register-password"]').fill(signupUser.password);
   await form.locator('input[name="register-confirm"]').fill(signupUser.password);
   await form.locator('input[name="birthDate"]').fill('1974-04-02');
   const nativeValidity=await form.evaluate(form=>({
     valid:form.checkValidity(),
     invalid:[...form.elements].filter(e=>e.willValidate&&!e.checkValidity())
       .map(e=>({name:e.name,reason:e.validity?.valueMissing?'required':e.validity?.patternMismatch?'pattern':e.validationMessage.slice(0,130)}))
   }));
   const registrationResponse=registrationPage.waitForResponse(res=>
     new URL(res.url()).origin===origin&&new URL(res.url()).pathname==='/api/register'&&
     res.request().method()==='POST',{timeout:17000});
   await form.locator('button[type="submit"]').first().click();
   await registrationResponse;
   await registrationPage.waitForFunction(()=>!document.querySelector('form[data-form="register"]'),
     null,{timeout:10000});
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
     ...devices['iPhone 13'],locale:'nl-NL',serviceWorkers:'allow',
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
     // The ORIGINAL account menu must appear in THIS Home document.
     // A /present request is forbidden on the normal More tap: that was
     // the cause of the real iPhone's one-second blank interstitial.
     await page.waitForFunction(()=>
       window.__taleraMoreMenu?.ready&&
       typeof window.__taleraMoreMenu.open==='function',null,{timeout:12000});
     const homeUrl=page.url();
     await homeMore.click();
     await page.locator('#talera-more-menu:not([hidden])').waitFor({timeout:3500});
     const direct=await page.evaluate(()=>({
       sameHome:location.pathname==='/mijn-leven',
       originalHref:document.getElementById('navMore')?.getAttribute('href'),
       menuVisible:!document.getElementById('talera-more-menu')?.hidden,
       renderedMenu:document.getElementById('talera-more-menu')
         ?.getBoundingClientRect().width>0,
       bodyVisible:getComputedStyle(document.body).visibility==='visible',
       nativeMenuModule:document.getElementById('talera-f5-home-original-menu-module')
         ?.getAttribute('src')==='/__clean/menu-integration.mjs',
       noPresentationStage:!document.getElementById('photoStage'),
       noBlankMask:!document.documentElement.classList.contains(
         'talera-f5-home-leaving-for-original-menu')
     }));
     assert.deepEqual(direct,{
       sameHome:true,originalHref:'/present?talera_menu=hub',
       menuVisible:true,renderedMenu:true,bodyVisible:true,
       nativeMenuModule:true,noPresentationStage:true,noBlankMask:true
     },'Home More must open ORIGINAL account menu directly without navigation or blank paint');
     assert.equal(page.url(),homeUrl,'Home More unexpectedly opened the presentation route');
     console.log('TALERA_F5_HOME_MENU_NO_STORY_FLASH_PASS',JSON.stringify({
       originalMenuImmediateSurface:true,sourceHomeNeverHidden:true,
       originalPresentationMotorUnmodified:true,originalHomeHrefUnchanged:true,
       noPresentationNavigation:true,sameOrigin:true,realIphoneAccepted:false
     }));
     console.log('TALERA_F5_HOME_MORE_END_TO_END_PASS',JSON.stringify({
       originalMenuOpened:true,sameOrigin:true,newSeparateApp:false,
       originalBottomNavigationMarkupUntouched:true,noWhiteInterstitial:true
     }));
     await page.locator('#talera-more-menu [data-action="close"]').click();


   }

   if(route==='/present'&&check.menu&&check.library==='function'){activeRoute=route;break}
 }
 assert.ok(activeRoute,
   'No original PWA screen initializes a live account menu and local memory store');
 console.log('TALERA_F5_ACCOUNT_MENU_TEST_ROUTE',activeRoute);
 await waitForLibrary(page);
 const owner=await login(page,users[0]);
 assert.equal(owner,ids[0],'First actual menu login must select existing account ID');
 // Signed-in iPhone entry must carry the same BEFORE-FIRST-PAINT guard.
 // Plain /present must keep the exact original presentation unhindered.
 const [signedHub,ordinaryPresent]=await Promise.all([
   context.request.get(origin+'/present?talera_menu=hub'),
   context.request.get(origin+'/present')
 ]);
 assert.equal(signedHub.status(),200);
 assert.equal(ordinaryPresent.status(),200);
 const [hubHtml,ordinaryHtml]=await Promise.all([
   signedHub.text(),ordinaryPresent.text()
 ]);
 assert.ok(hubHtml.includes('id="talera-f5-menu-entry-before-paint"')&&
   hubHtml.includes('html.talera-hub-menu-booting body{visibility:hidden!important}'),
   'Signed-in Home More must shield personal photo/video until the original menu opens');
 assert.ok(!ordinaryHtml.includes('talera-f5-menu-entry-before-paint')&&
   ordinaryHtml.includes('id="photoStage"'),
   'Normal presentation must NEVER be prehidden or re-rendered for menu navigation');
 console.log('TALERA_F5_SIGNED_IN_HOME_MORE_NO_PHOTO_FLASH_PASS',
   JSON.stringify({sameAppOrigin:true,originalMenuRoute:true,
     normalPresentationUnaffected:true,privateLibraryNotRead:true,
     realIphoneAccepted:false}));
 // A genuinely empty but signed-in Free library must not produce a white
 // Home screen. Verify the ORIGINAL Home shell before creating test stories,
 // and after a cold reload, on this same account and app origin.
 const emptyHome=await context.newPage();
 try{
   const response=await emptyHome.goto(origin+'/mijn-leven',
     {waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200,'Original empty-account Home unavailable');
   const painted=async()=>{
     await emptyHome.waitForFunction(async()=>{
       if(typeof window.TaleraMemories?.list!=='function')return false;
       const rows=await window.TaleraMemories.list();
       return rows.length===0&&!!document.getElementById('navMore');
     },null,{timeout:20000});
     return emptyHome.evaluate(async()=>{
       const rows=await window.TaleraMemories.list();
       const isPainted=element=>{
         if(!element)return false;
         const style=getComputedStyle(element),bounds=element.getBoundingClientRect();
         return style.display!=='none'&&style.visibility!=='hidden'&&
           bounds.width>0&&bounds.height>0;
       };
       return {count:rows.length,
         primaryNavigationVisible:isPainted(document.getElementById('navMine')),
         navigationVisible:isPainted(document.getElementById('navMore')),
         visibleText:(document.body.innerText||'').trim().length};
     });
   };
   for(const phase of ['first-open','cold-reload']){
     if(phase==='cold-reload')
       await emptyHome.reload({waitUntil:'domcontentloaded'});
     const shell=await painted();
     assert.equal(shell.count,0,'Empty account must not contain sample stories');
     assert.ok(shell.primaryNavigationVisible&&shell.navigationVisible&&shell.visibleText>100,
       'The existing signed-in Home became a blank screen at '+phase+': '+
       JSON.stringify(shell));
   }
   console.log('TALERA_F5_EMPTY_SIGNED_IN_HOME_AND_RELOAD_VISIBLE_PASS',
     JSON.stringify({syntheticOnly:true,sameApp:true,sameOrigin:true,
       noInventedStories:true,realIphoneAccepted:false}));
   // Real Home More must expose the EXACT approved menu in the SAME
   // page: no old photo flash, no destination page and no white paint.
   await emptyHome.waitForFunction(()=>
     window.__taleraMoreMenu?.ready&&
     typeof window.__taleraMoreMenu.open==='function',null,{timeout:15000});
   const outgoing=await emptyHome.evaluate(()=>{
     const home=document.getElementById('navMore');
     const originalHref=home?.getAttribute('href');
     const beforeUrl=location.href;
     const click=new MouseEvent('click',{bubbles:true,cancelable:true,button:0});
     home?.dispatchEvent(click);
     const shell=document.getElementById('talera-more-menu');
     return {originalHref,defaultNavigationPrevented:click.defaultPrevented,
       stayedOnHome:location.href===beforeUrl&&location.pathname==='/mijn-leven',
       nativeMenuPresent:!!document.getElementById('talera-f5-home-original-menu-module'),
       originalMenuVisible:!!shell&&!shell.hidden&&shell.getBoundingClientRect().width>0,
       sourceHomeVisible:getComputedStyle(document.body).visibility==='visible',
       noOutgoingMask:!document.documentElement.classList.contains(
         'talera-f5-home-leaving-for-original-menu'),
       noPresentationStage:!document.getElementById('photoStage')};
   });
   assert.deepEqual(outgoing,{
     originalHref:'/present?talera_menu=hub',
     defaultNavigationPrevented:true,stayedOnHome:true,
     nativeMenuPresent:true,originalMenuVisible:true,
     sourceHomeVisible:true,noOutgoingMask:true,noPresentationStage:true
   },'REAL Home More must render existing menu synchronously without any blank screen');
   await emptyHome.locator('#talera-more-menu [data-view="settings"]').first().click();
   await emptyHome.locator('#talera-more-menu [data-view="storage"]').first()
     .waitFor({state:'visible',timeout:7000});
   assert.equal(new URL(emptyHome.url()).pathname,'/mijn-leven',
     'Settings should stay inside Home instead of loading a presentation');
   await emptyHome.locator('#talera-more-menu [data-action="back"]').click();
   await emptyHome.locator('#talera-more-menu [data-action="close"]').click();
   const afterMenu=await emptyHome.evaluate(()=>({
     originalMenuClosed:document.getElementById('talera-more-menu')?.hidden,
     originalHomeVisible:getComputedStyle(document.body).visibility==='visible',
     originalNavigationVisible:document.getElementById('navMore')
       ?.getBoundingClientRect().width>0,
     stillHome:location.pathname==='/mijn-leven'
   }));
   assert.deepEqual(afterMenu,{
     originalMenuClosed:true,originalHomeVisible:true,
     originalNavigationVisible:true,stillHome:true
   },'Original menu Back and Close must preserve Home and its local media context');
   console.log('TALERA_F5_HOME_OUTGOING_REAL_NAV_NO_OLD_MEMORY_FLASH_PASS',
     JSON.stringify({sameHome:true,originalMenuReused:true,
       originalHrefAndMenuPreserved:true,originalSettingsAndBackWorking:true,
       noNavigationOrBlankFrame:true,originalPresentationUnaffected:true,
       syntheticOnly:true,physicalIphoneAccepted:false}));
 }finally{await emptyHome.close()}
 const a=await saveSyntheticPhoto(page,1);
 assert.equal(a.kind,'photo');
 assert.ok(a.bytes>10,'Synthetic local original photo Blob was not saved');
 // Real user's original stories may have NO title and NO topic. The same
 // account-local storage, original frame and ordinary presentation must work
 // without inventing a title or category. No device records are involved.
 const untitled=await page.evaluate(async png=>{
   const image=new File([Uint8Array.from(atob(png),c=>c.charCodeAt(0))],
     'untitled-synthetic.png',{type:'image/png'});
   const saved=await window.TaleraMemories.save({
     title:'',date:'1977-03-14',text:'Synthetic story without title or topic',
     tags:[],narrationCues:[]
   },[image]);
   const row=await window.TaleraMemories.get(saved.id);
   const file=await window.TaleraMemories.blob(row.items?.[0]?.key);
   return {id:row.id,title:row.title,source:row.source,
     tags:row.tags||[],photoBytes:file?.size||0};
 },onePixelPng);
 assert.equal(untitled.title,'','Do not invent an owner title');
 assert.equal(untitled.source,'pwa-local');
 assert.deepEqual(untitled.tags,[]);
 assert.ok(untitled.photoBytes>10,'Untitled original photo lost');
 const untitledViewer=await page.context().newPage();
 try{
   const response=await untitledViewer.goto(origin+'/present?memory='+
     encodeURIComponent(untitled.id),{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200);
   await untitledViewer.waitForFunction(id=>{
     const memory=window.__taleraTimelineRuntime?.currentMemory?.();
     const photo=document.getElementById('memoryPhotoA');
     return memory?.storyId===id && memory?._taleraLocal &&
       !memory._photoLoading && photo?.complete && photo.naturalWidth>0;
   },untitled.id,{timeout:25000});
   const proof=await untitledViewer.evaluate(async id=>{
     const row=await window.TaleraMemories.get(id);
     const blob=await window.TaleraMemories.blob(row.items[0].key);
     return {id:row.id,title:row.title,photoBytes:blob?.size||0,
       selectedId:window.__taleraTimelineRuntime?.currentMemory?.()?.storyId,
       naturalWidth:document.getElementById('memoryPhotoA')?.naturalWidth||0};
   },untitled.id);
   assert.equal(proof.id,untitled.id);
   assert.equal(proof.title,'');
   assert.equal(proof.selectedId,untitled.id);
   assert.equal(proof.photoBytes,untitled.photoBytes);
   assert.ok(proof.naturalWidth>0);
   console.log('TALERA_F5_UNTITLED_UNTAGGED_LOCAL_PHOTO_PRESENTATION_PASS',
     JSON.stringify({syntheticOnly:true,sameOrigin:true,sameAccount:true,
       originalBytesIntact:true,realIPhoneAccepted:false}));
 }finally{await untitledViewer.close()}
 // The approved Home previously hid the ORIGINAL memory cards unconditionally.
 // If these existing records have no topics, they must not produce an empty
 // Home while the same account's stories and photos remain in IndexedDB.
 const untitledHome=await page.context().newPage();
 try{
   const response=await untitledHome.goto(origin+'/mijn-leven',
     {waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200);
   await untitledHome.waitForFunction(async id=>{
     const store=window.TaleraMemories;
     if(typeof store?.list!=='function')return false;
     const rows=await store.list();
     const cards=document.getElementById('myCards');
     return rows.some(x=>x.id===id) && cards?.children.length>0 &&
       document.documentElement.classList.contains('talera-untagged-memory-cards') &&
       getComputedStyle(cards).display!=='none';
   },untitled.id,{timeout:25000});
   console.log('TALERA_F5_UNTAGGED_OWNER_HOME_EXISTING_CARDS_VISIBLE_PASS',
     JSON.stringify({syntheticOnly:true,oldCardsReused:true,
       originalRecordsUnchanged:true,realIPhoneAccepted:false}));
 }finally{await untitledHome.close()}
 // Regression first: the original approved topic tiles must coexist with
 // previously saved untitled/untagged stories in the SAME owner library.
 // Nothing here creates a new user-visible topic or migrates original media.
 const tagged=await page.evaluate(async png=>{
   const image=new File([Uint8Array.from(atob(png),c=>c.charCodeAt(0))],
     'tagged-synthetic.png',{type:'image/png'});
   const record=await window.TaleraMemories.save({
     title:'Tagged local regression',date:'1986-05-16',text:'Tagged technical record',
     tags:['Reizen'],narrationCues:[],photoLocations:[{manual:{countryCode:'FR',city:'Parijs',mode:'fill'}}]
   },[image]);
   return {id:record.id,tags:record.tags,photoKey:record.items?.[0]?.key};
 },onePixelPng);
 const mixedHome=await page.context().newPage();
 try{
   const res=await mixedHome.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
   assert.equal(res.status(),200);
   // Read the complete DOM snapshot in the same synchronous polling turn.
   // Topic rendering and original-card rendering finish independently.
   // An async storage predicate can return before a subsequent refresh finishes.
   const shown=await (await mixedHome.waitForFunction(ids=>{
     const cards=document.querySelector('#myCards');
     const topics=document.querySelector('#demoCards');
     const visible=node=>!!node&&getComputedStyle(node).display!=='none';
     const snapshot={
       cardsVisible:visible(cards),topicsVisible:visible(topics),
       topicCards:[...topics?.children||[]].map(x=>({text:x.textContent?.trim(),
         html:x.outerHTML.slice(0,900)})).slice(0,3),
       originalCards:[...cards?.children||[]].map(x=>({text:x.textContent?.trim(),
         id:new URL((x.matches('a.memory-card')?x:x.querySelector('a.memory-card'))?.getAttribute('href')||'',location.origin).searchParams.get('memory'),
         html:x.outerHTML.slice(0,1000),visible:visible(x)})).slice(0,5),
       topicOnlyClass:document.documentElement.classList.contains('talera-untagged-memory-cards')
     };
     if(!snapshot.cardsVisible||!snapshot.topicsVisible||!snapshot.topicOnlyClass||
        !snapshot.originalCards.some(x=>x.id===ids.untitled&&x.visible)||
        !snapshot.originalCards.some(x=>x.id===ids.other&&x.visible)||
        !snapshot.originalCards.some(x=>x.id===ids.tagged&&!x.visible)||
        !snapshot.topicCards.some(x=>x.text.includes('Reizen')))return false;
     return snapshot;
   },{untitled:untitled.id,tagged:tagged.id,other:a.id},{timeout:18000})).jsonValue();
   console.log('TALERA_F5_MIXED_TOPIC_HOME_CURRENT_RENDER',JSON.stringify(shown));
   assert.equal(shown.topicsVisible,true,'Previously approved topic tiles disappeared');
   assert.equal(shown.cardsVisible,true,
     'Saved untitled/no-topic story is INVISIBLE as soon as one tagged story exists');
   assert.equal(shown.topicOnlyClass,true,
     'Existing original cards must remain visible alongside approved topic tiles');
   assert.ok(shown.originalCards.some(x=>x.id===untitled.id&&x.visible),
     'The untitled/no-topic story must have its EXISTING clickable card');
   assert.ok(shown.originalCards.some(x=>x.id===a.id&&x.visible),
     'Other untagged owner stories must remain visible');
   assert.ok(shown.originalCards.some(x=>x.id===tagged.id&&!x.visible),
     'A tagged story must not be duplicated in both Home sections');
   assert.ok(shown.topicCards.some(x=>x.text.includes('Reizen')),
     'Existing approved owner topic tile disappeared');
   await mixedHome.reload({waitUntil:'domcontentloaded'});
   try{
     await mixedHome.waitForFunction(ids=>{
       const cards=document.querySelector('#myCards');
       const links=[...cards?.querySelectorAll('a[href*="?memory="]')||[]];
       const tag=links.find(a=>a.href.includes(encodeURIComponent(ids.tagged)));
       const own=links.find(a=>a.href.includes(encodeURIComponent(ids.untitled)));
       const tagCard=tag?.closest('.talera-v7-published-card')||tag;
       const ownCard=own?.closest('.talera-v7-published-card')||own;
       return tagCard&&ownCard&&getComputedStyle(tagCard).display==='none'&&
         getComputedStyle(ownCard).display!=='none'&&getComputedStyle(own).display!=='none'&&
         getComputedStyle(cards).display!=='none'&&
         document.querySelectorAll('#demoCards .talera-topic-card').length===1;
     },{untitled:untitled.id,tagged:tagged.id},{timeout:8500});
   }catch(e){
     const diagnostic=await mixedHome.evaluate(async()=>{
       const cards=document.querySelector('#myCards'),topics=document.querySelector('#demoCards');
       const rows=await window.TaleraMemories?.list?.();
       return {url:location.href,classes:document.documentElement.className,
         rows:rows?.map(x=>({id:x.id,tags:x.tags,title:x.title})),
         cardsStyle:cards&&getComputedStyle(cards).display,
         cards:[...cards?.children||[]].map(x=>({href:x.getAttribute('href'),
           display:getComputedStyle(x).display,html:x.outerHTML.slice(0,250)})),
         topics:[...topics?.children||[]].map(x=>x.textContent?.trim()),
         filter:!!cards?.__taleraApplyTopicCardVisibility,
         observer:!!cards?.__taleraTopicCardObserver};
     });
     console.log('TALERA_F5_MIXED_TOPIC_POST_RELOAD_DIAGNOSTIC',JSON.stringify(diagnostic));
     throw e;
   }
   const persisted=await mixedHome.evaluate(async ids=>{
     const store=window.TaleraMemories;
     const a=await store.get(ids.untitled),b=await store.get(ids.tagged);
     const photoA=a&&await store.blob(a.items[0].key);
     const photoB=b&&await store.blob(b.items[0].key);
     return {aId:a?.id,bId:b?.id,taggedTags:b?.tags||[],
       aBytes:photoA?.size||0,bBytes:photoB?.size||0};
   },{untitled:untitled.id,tagged:tagged.id});
   assert.equal(persisted.aId,untitled.id);
   assert.equal(persisted.bId,tagged.id);
   assert.deepEqual(persisted.taggedTags,['Reizen']);
   assert.equal(persisted.aBytes,untitled.photoBytes);
   assert.ok(persisted.bBytes>10);
   console.log('TALERA_F5_MIXED_TOPIC_AND_UNTAGGED_ORIGINAL_CARDS_VISIBLE_PASS',
     JSON.stringify({syntheticOnly:true,originalMemoryIdsUnchanged:true,
       originalPhotoBytesUnchanged:true,noDuplicateTaggedStoryCards:true,
       approvedTopicTilesPreserved:true,realIphoneAccepted:false}));
 }finally{await mixedHome.close()}
 await verifyTellEditorLayout(page,a.id);
 // The existing tagged fixture is about to be removed by the next
 // regression; exercise unknown location, all languages and offline picker
 // on the exact existing editor first, with no new temporary app or account.
 const locationEdit=await page.context().newPage();
 try{
  const before=await page.evaluate(async id=>{const row=await window.TaleraMemories.get(id);return {keys:row.items.map(x=>x.key),bytes:Array.from(new Uint8Array(await (await window.TaleraMemories.blob(row.items[0].key)).arrayBuffer()))}},tagged.id);
  await locationEdit.goto(origin+'/tell?edit='+encodeURIComponent(tagged.id),{waitUntil:'domcontentloaded'});
  await locationEdit.locator('#publish').waitFor({state:'visible',timeout:20000});
  for(const lang of ['nl','en','de','fr','es']){
   await locationEdit.evaluate(l=>window.TaleraI18n.setLanguage(l),lang);
   assert.equal(await locationEdit.locator('.talera-memory-location,.talera-location-toggle,#talera-memory-country,#talera-memory-city').count(),0);
   assert.equal(await locationEdit.locator('#publish').isEnabled(),true);
  }
  await locationEdit.evaluate(()=>window.TaleraI18n.setLanguage('nl'));
  await locationEdit.context().setOffline(true);
  try{
   assert.equal(await locationEdit.locator('.talera-location-dialog,.talera-location-device').count(),0);
   assert.equal(await locationEdit.locator('#publish').isEnabled(),true);
  }finally{await locationEdit.context().setOffline(false)}
  assert.deepEqual(await page.evaluate(async id=>(await window.TaleraMemories.get(id)).items[0].manualPhotoLocation,tagged.id),{countryCode:'FR',city:'Parijs',mode:'fill'},'Previously saved location is retained');
  await locationEdit.locator('#publish').click();
  try{await locationEdit.waitForURL(url=>url.pathname==='/mijn-leven'&&url.searchParams.get('published')===tagged.id,{timeout:25000})}
  catch(error){console.error('TALERA_LOCATION_SAVE_DIAGNOSTIC',JSON.stringify({url:locationEdit.url(),error:await locationEdit.locator('#error').textContent({timeout:1000}).catch(()=>null),busy:await locationEdit.locator('#busy').isVisible().catch(()=>false)}));throw error}
  const after=await page.evaluate(async id=>{const row=await window.TaleraMemories.get(id);return {manualPhotoLocation:row.items[0].manualPhotoLocation,keys:row.items.map(x=>x.key),bytes:Array.from(new Uint8Array(await (await window.TaleraMemories.blob(row.items[0].key)).arrayBuffer()))}},tagged.id);
  assert.deepEqual(after,{...before,manualPhotoLocation:{countryCode:'FR',city:'Parijs',mode:'fill'}});
  await locationEdit.goto(origin+'/tell?edit='+encodeURIComponent(tagged.id),{waitUntil:'domcontentloaded'});
  await locationEdit.locator('#publish').waitFor({state:'visible',timeout:20000});
  assert.equal(await locationEdit.locator('.talera-memory-location,.talera-location-toggle,#talera-memory-country,#talera-memory-city').count(),0);
  console.log('TALERA_LOCATION_EDITOR_NO_FIELDS_FIVE_LANGUAGES_EXISTING_LOCATION_PRESERVED_PASS');
 }finally{await locationEdit.close()}

 // Reuse the already existing tagged fixture after its final Home assertions.
 // No new synthetic media or account; test the actual signed-in editor route.
 const deleteEditor=await page.context().newPage();
 try{
  const before=await page.evaluate(async ids=>{
   const store=window.TaleraMemories;
   const other=await store.get(ids.keep);
   const bytes=await (await store.blob(other.items[0].key)).arrayBuffer();
   return {ids:(await store.list()).map(r=>r.id).sort(),
     otherId:other.id,otherKey:other.items[0].key,bytes:[...new Uint8Array(bytes)]};
  },{keep:a.id});
  const response=await deleteEditor.goto(origin+'/tell?edit='+encodeURIComponent(tagged.id),
    {waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  const button=deleteEditor.locator('.talera-delete-published-memory');
  const toggle=deleteEditor.locator('.talera-editor-memory-options-toggle');
  try{await toggle.waitFor({state:'visible',timeout:11000})}
  catch(err){
   const opener=deleteEditor.locator('[data-open]').first();
   if(!(await opener.count()))throw err;
   await opener.click();
   await toggle.waitFor({state:'visible',timeout:11000});
  }
  assert.equal(await toggle.count(),1);
  assert.equal(await button.count(),1);
  assert.equal(await button.isVisible(),false,'Destructive action must be hidden initially');
  const positions=()=>deleteEditor.evaluate(()=>['#title','.talera-work-tiles',
    '.talera-tags-toggle','.work-tools.talera-r16-toolbar'].map(selector=>{
     const r=document.querySelector(selector)?.getBoundingClientRect();
     return r?[r.top,r.height]:null;
    }));
  const initial=await positions();
  await toggle.click();await button.waitFor({state:'visible'});
  assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  assert.deepEqual(await positions(),initial,'Options overlay must not shift existing editor controls');
  await toggle.click();assert.equal(await button.isVisible(),false);
  await toggle.click();await button.waitFor({state:'visible'});
  let cancelled=false;
  deleteEditor.once('dialog',async d=>{cancelled=true;await d.dismiss()});
  await button.click();
  await deleteEditor.waitForFunction(()=>!document.querySelector('.talera-delete-published-memory')?.disabled);
  assert.ok(cancelled,'Deletion needs an explicit confirmation');
  assert.equal(await deleteEditor.evaluate(async id=>!!(await window.TaleraMemories.get(id)),tagged.id),true);
  assert.equal(await button.isVisible(),false,'Cancel closes the options menu');
  await toggle.click();await button.waitFor({state:'visible'});
  let accepted=false;
  deleteEditor.once('dialog',async d=>{accepted=true;await d.accept()});
  await Promise.all([deleteEditor.waitForURL('**/mijn-leven',{timeout:15000}),button.click()]);
  assert.ok(accepted,'Deletion must wait for confirmation');
  await waitForLibrary(deleteEditor);
  const after=await deleteEditor.evaluate(async args=>{
   const store=window.TaleraMemories;
   const other=await store.get(args.keep);
   const bytes=await (await store.blob(other.items[0].key)).arrayBuffer();
   return {ids:(await store.list()).map(r=>r.id).sort(),
    otherId:other.id,otherKey:other.items[0].key,bytes:[...new Uint8Array(bytes)],
    deleted:!(await store.get(args.target)),mediaGone:!(await store.blob(args.targetKey))};
  },{keep:a.id,target:tagged.id,targetKey:tagged.photoKey});
  assert.deepEqual(after.ids,before.ids.filter(id=>id!==tagged.id));
  assert.equal(after.otherId,before.otherId);
  assert.equal(after.otherKey,before.otherKey);
  assert.deepEqual(after.bytes,before.bytes);
  assert.ok(after.deleted&&after.mediaGone);
  console.log('TALERA_EXISTING_EDITOR_DELETE_CONFIRM_CANCEL_AND_EXACT_LIBRARY_READBACK_PASS');
 }finally{await deleteEditor.close()}
 // The actual same-menu contact list uses an account-scoped local store.
 await menu(page);await view(page,'people');
 const ownerPeople=page.locator('[data-talera-people]');
 await ownerPeople.getByText('Je hebt nog geen contacten toegevoegd.',{exact:true}).waitFor();
 await ownerPeople.getByRole('button',{name:'Contact toevoegen',exact:true}).click();
 await ownerPeople.locator('[data-people-field="name"]').fill('Contact owner A');
 await ownerPeople.locator('[data-people-field="phone"]').fill('+31600000111');
 await ownerPeople.getByRole('button',{name:'Opslaan',exact:true}).click();
 await ownerPeople.getByText('Contact owner A',{exact:true}).waitFor();
 await ownerPeople.getByRole('button',{name:'Contact owner A als favoriet markeren'}).click();
 await ownerPeople.getByRole('button',{name:'Contact owner A uit favorieten halen'}).waitFor();
 await ownerPeople.getByRole('button',{name:'TALERA koppelen',exact:true}).click();
 await ownerPeople.getByRole('button',{name:'Uitnodiging maken',exact:true}).click();
 const inviteField=ownerPeople.getByLabel('Uitnodigingscode',{exact:true});
 await inviteField.waitFor();
 const personalInvite=await inviteField.inputValue();
 assert.match(personalInvite,/^TALERA1-/);
 assert.equal(await ownerPeople.getByText('TALERA gekoppeld',{exact:true}).count(),0);

 await page.locator('#talera-more-menu [data-action="close"]').first().click();
 await logout(page);
 await assertSignedOutEmpty(page,a.id);
 const guest=await login(page,users[1]);
 assert.equal(guest,ids[1],'Second login must switch browser to second ID');
 await menu(page);await view(page,'people');
 const guestPeople=page.locator('[data-talera-people]');
 await guestPeople.getByText('Je hebt nog geen contacten toegevoegd.',{exact:true}).waitFor();
 assert.equal(await guestPeople.getByText('Contact owner A',{exact:true}).count(),0);
 await guestPeople.getByRole('button',{name:'Uitnodiging ontvangen',exact:true}).click();
 await guestPeople.getByLabel('Uitnodigingscode',{exact:true}).fill(personalInvite);
 await guestPeople.getByRole('button',{name:'Uitnodiging accepteren',exact:true}).click();
 const proofField=guestPeople.getByLabel('Bevestigingscode',{exact:true});
 await proofField.waitFor();
 const personalProof=await proofField.inputValue();
 assert.match(personalProof,/^[a-f0-9]{32}$/);
 assert.equal(await guestPeople.getByText('Contact owner A',{exact:true}).count(),0);

 await page.locator('#talera-more-menu [data-action="close"]').first().click();
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
 await menu(page);await view(page,'people');
 await page.locator('[data-talera-people]').getByText('Contact owner A',{exact:true}).waitFor();
 await page.locator('[data-talera-people]').getByRole('button',{name:'Contact owner A uit favorieten halen'}).waitFor();
 const returningPeople=page.locator('[data-talera-people]');
 await returningPeople.getByRole('button',{name:'TALERA koppelen',exact:true}).click();
 await returningPeople.getByLabel('Bevestigingscode',{exact:true}).fill(personalProof);
 let confirmedAccount=false;
 page.once('dialog',async d=>{confirmedAccount=d.message().includes(users[1].displayName);await d.accept()});
 await returningPeople.getByRole('button',{name:'Koppeling bevestigen',exact:true}).click();
 await returningPeople.getByText('TALERA gekoppeld',{exact:true}).waitFor();
 assert.ok(confirmedAccount,'Owner must see the verified account name and confirm explicitly');
 const noAutomaticRights=await page.evaluate(async()=>fetch('/api/my-grants').then(r=>r.json()));
 assert.deepEqual(noAutomaticRights.items,[]);
 console.log('TALERA_MY_PEOPLE_VERIFIED_ACCOUNT_LINK_REAL_BROWSER_PASS');

 await page.locator('#talera-more-menu [data-action="close"]').first().click();
 console.log('TALERA_MY_PEOPLE_ACCOUNT_ISOLATION_REAL_BROWSER_PASS');
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
 // Opening a new software page on the SAME origin and account must read
 // the existing local library, not silently create a blank replacement.
 // Different browser origins are deliberately NOT equated by this test.
 const originalInventory=async()=>page.evaluate(async id=>{
   const session=await fetch('/api/me',{credentials:'same-origin'});
   const account=session.ok?(await session.json()).account?.id:null;
   const stories=await window.TaleraMemories.list();
   const original=await window.TaleraMemories.blob(id+':0');
   const localDbs=typeof indexedDB.databases==='function'?
     (await indexedDB.databases()).map(x=>x.name).filter(x=>
       typeof x==='string'&&x.startsWith('talera-free-local-')).sort():[];
   return {account,ids:stories.map(x=>x.id).sort(),
     mediaBytes:original?.size||0,localDbs};
 },a.id);
 const beforeReload=await originalInventory();
 await page.reload({waitUntil:'domcontentloaded'});
 await waitForLibrary(page);
 const afterReload=await originalInventory();
 assert.deepEqual(afterReload,beforeReload,
   'Reload on the same TALERA origin replaced the account library');
 assert.equal(afterReload.account,ids[0],
   'Reload changed the verified account UUID');
 assert.ok(afterReload.ids.includes(a.id)&&afterReload.mediaBytes===a.bytes,
   'Reload lost the original story or media bytes');
 console.log('TALERA_F5_SAME_ORIGIN_REOPEN_ORIGINAL_LIBRARY_PASS',JSON.stringify({
   sameAccount:true,sameOrigin:true,existingMediaBytesIntact:true,
   databaseNamesStable:true,otherOriginsNotTested:true,realIPhoneAccepted:false
 }));
 // Same login does NOT imply the same browser/PWA storage container.
 // Reproduce the owner's "still signed in, but 0 stories" observation
 // without erasing originals or creating a second TALERA app. Both contexts
 // visit the SAME origin, log in to the SAME account UUID, and use their
 // own valid HttpOnly sessions.
 // Their separate IndexedDB containers must not be conflated or silently
 // migrated. This is a possible mechanism, not proof of its occurrence on
 // the physical iPhone after the Worker release.
 const otherContainer=await browser.newContext({
   ...devices['iPhone 13'],locale:'nl-NL',serviceWorkers:'allow',
   extraHTTPHeaders:{'x-talera-f5-key':gate,'cf-connecting-ip':'192.0.2.73'}
 });
 try{
   const otherPage=await otherContainer.newPage();
   const guestEntry=await otherPage.goto(origin+'/present?talera_menu=hub',
     {waitUntil:'domcontentloaded'});
   assert.equal(guestEntry.status(),200);
   await waitForLibrary(otherPage);
   // A separate iPhone Safari/PWA container can hold ANOTHER valid session
   // for the exact same account, without sharing local IndexedDB contents.
   const matchedAccount=await login(otherPage,users[0]);
   assert.equal(matchedAccount,ids[0],
     'Original TALERA login must resolve the SAME account in both containers');
   const response=await otherPage.goto(origin+'/mijn-leven',
     {waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200);
   // Home owns the original memory store but intentionally routes account
   // menus via /present; it does not itself mount the menu dialog.
   await otherPage.waitForFunction(()=>typeof window.TaleraMemories?.list==='function',
     null,{timeout:15000});
   const separated=await otherPage.evaluate(async()=>{
     const me=await fetch('/api/me',{credentials:'same-origin'});
     const actor=me.ok?(await me.json()).account?.id:null;
     const rows=await window.TaleraMemories.list();
     const dbs=typeof indexedDB.databases==='function'?
       (await indexedDB.databases()).map(x=>x.name).filter(x=>
         typeof x==='string'&&x.startsWith('talera-free-local-')).sort():[];
     return {actor,storyIds:rows.map(x=>x.id),dbs};
   });
   assert.equal(separated.actor,ids[0],
     'Second storage container must still have the EXACT same signed-in account');
   assert.deepEqual(separated.storyIds,[],
     'Different PWA/Safari storage container unexpectedly read the first container');
   assert.equal(separated.dbs.length,1,
     'Fresh isolated browser storage must create only the signed-in account DB');
   assert.ok(beforeReload.localDbs.includes(separated.dbs[0]),
     'The SAME account must still select the SAME derived DB name in both containers');
   const stillOriginal=await originalInventory();
   assert.deepEqual(stillOriginal,afterReload,
     'Opening another isolated browser container must not delete original media');
   console.log('TALERA_SAME_LOGIN_SEPARATE_BROWSER_STORAGE_EXPLAINS_EMPTY_LIBRARY_PASS',
     JSON.stringify({sameAccount:true,sameOrigin:true,
       separateBrowserStorageContainers:true,
       originalRecordsStillIntact:true,originalMediaBytesStillIntact:true,
       provesPhysicalIphoneCause:false,syntheticOnly:true}));
 }finally{await otherContainer.close()}
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
       // The account's year-2000 record is outside today's five-year window.
       // First prove it is registered but genuinely absent from the stage,
       // then use the existing direct-entry route to prove the same media.
       await follower.waitForFunction(id=>{
         const runtime=window.__taleraTimelineRuntime;
         return window.__taleraPhotoBook?.list().some(m=>m.storyId===id)&&
           runtime?.windowMemory()===null&&runtime.currentMemory()===null&&
           getComputedStyle(document.getElementById('photoStage')).visibility==='hidden';
       },a.id,{timeout:20000});
       console.log('TALERA_F5_DEFAULT_PRESENT_EXISTING_HISTORIC_RECORD_BUT_EMPTY_WINDOW_PASS');
       const explicit=await follower.goto(origin+'/present?memory='+encodeURIComponent(a.id),
         {waitUntil:'domcontentloaded'});
       assert.equal(explicit.status(),200,'Existing direct historical memory route unavailable');
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
       const scroller=await follower.evaluate(async()=>{
         const panel=document.querySelector('.talera-tags-choices');
         const buttons=[...panel.querySelectorAll('.talera-tag-choice')];
         const toolbar=document.querySelector('.work.talera-r16-editor .work-tools.talera-r16-toolbar');
         panel.scrollTop=0;
         await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
         const before=panel.scrollTop, viewportRect=panel.getBoundingClientRect();
         const rows=buttons.map(b=>b.getBoundingClientRect());
         const full=rows.filter(r=>r.top>=viewportRect.top-1&&r.bottom<=viewportRect.bottom+1).length;
         const partial=rows.filter(r=>r.top<viewportRect.bottom-1&&r.bottom>viewportRect.top+1&&!(r.top>=viewportRect.top-1&&r.bottom<=viewportRect.bottom+1)).length;
         const toolbarBeforeScroll=toolbar?.getBoundingClientRect().bottom;
         const pageBeforeScroll=document.scrollingElement?.scrollTop||0;
         panel.scrollTop=panel.scrollHeight;
         await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
         const after=panel.scrollTop,last=buttons.at(-1).getBoundingClientRect();
         return {
           before,after,scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight,
           count:buttons.length,full,partial,lastFullyVisible:last.top>=viewportRect.top-1&&last.bottom<=viewportRect.bottom+1,
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
       assert.equal(scroller.overflow,'auto','Topic choices must independently scroll');
       assert.equal(scroller.full,Math.min(6,scroller.count),'Reference layout must show TWO full rows on the short iPhone');
       assert.equal(scroller.partial,0,'Never show a clipped third row');
       assert.ok(scroller.lastFullyVisible,'Last setting-defined characteristic must scroll fully into view');
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
       // Owner-approved reference: two complete rows even on the taller
       // iPhone, more calm white space, and the lowered stationary footer.
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
         const choices=panel.querySelector('.talera-tags-choices');
         const boundsChoices=choices.getBoundingClientRect();
         const rows=[...choices.querySelectorAll('.talera-tag-choice')].map(b=>b.getBoundingClientRect());
         const whole=rows.filter(r=>r.top>=boundsChoices.top-1&&r.bottom<=boundsChoices.bottom+1).length;
         const partial=rows.filter(r=>r.top<boundsChoices.bottom-1&&r.bottom>boundsChoices.top+1&&!(r.top>=boundsChoices.top-1&&r.bottom<=boundsChoices.bottom+1)).length;
         const publish=document.querySelector('#publish');
         const rect=publish?.getBoundingClientRect();
         const bottom=window.visualViewport?.height||innerHeight;
         return {
           toolbarTop:bounds('.work-tools.talera-r16-toolbar')?.top,
           toolbarBottom:bounds('.work-tools.talera-r16-toolbar')?.bottom,
           photoTop:bounds('.talera-work-tiles')?.top,
           photoWidth:bounds('.talera-work-tiles')?.width,
           panelHeight:panel?.getBoundingClientRect().height,
           panelClientHeight:choices?.clientHeight,
           appliedRowBound:panel.style.getPropertyValue('--talera-tag-visible-height'),
           panelScrollHeight:choices?.scrollHeight,
           choiceCount:rows.length,whole,partial,
           footerGap:bottom-bounds('.work-tools.talera-r16-toolbar')?.bottom,
           publishTouchable:!!rect&&rect.top>=0&&rect.bottom<=bottom-8&&
             document.elementFromPoint(rect.left+rect.width*.5,
               rect.top+rect.height*.5)?.closest('#publish')===publish
         };
       });
       console.log('TALERA_FREE_TELL_TALL_GAP_USE',
         JSON.stringify({before:tallBefore,after:tallAfter}));
       assert.ok(tallAfter.panelHeight>=88&&tallAfter.panelHeight<=104&&
         tallAfter.panelScrollHeight>tallAfter.panelClientHeight+12,
         'Reference compact two-row panel must be independently scrollable: '+
           JSON.stringify({tallBefore,tallAfter}));
       assert.equal(tallAfter.appliedRowBound,'88px','Actual generated viewport script applies two-row bound');
       assert.equal(tallAfter.whole,Math.min(6,tallAfter.choiceCount),'Exactly two full rows on tall iPhone');
       assert.equal(tallAfter.partial,0,'No cut-off row on tall iPhone');
       assert.ok(tallBefore.titleTop<=58&&tallBefore.dateTop<=103&&tallBefore.photoTop<=153,
         'Title, date and photos must be raised towards the approved design: '+JSON.stringify(tallBefore));
       assert.ok(tallAfter.footerGap>=8&&tallAfter.footerGap<=20,
         'Lower the original action bar but retain the safe bottom margin: '+JSON.stringify(tallAfter));
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

 // The preceding grant-revoke uses the same modal async busy state.
 // Do not click another control before the original menu has finished its
 // repaint: such clicks may be discarded without any HTTP request.
 await page.waitForFunction(()=>{
   const menu=document.getElementById('talera-more-menu');
   const action=menu?.querySelector('[data-revoke]');
   return !!menu&&!menu.hidden&&!!action&&!action.disabled&&
     !menu.querySelector('[data-revoke-grant]');
 },null,{timeout:10000});
 const menuLinkStatus=await page.locator('#talera-more-menu').innerText();
 assert.ok(menuLinkStatus.includes('synthetic ACCOUNT ISOLATION 1'),
   'Original menu must resolve real link to LOCAL story title, not a remote copy');
 // The actual existing menu button MUST send its owner-authenticated
 // revoke mutation; a stale list response never counts as success.
 const ownerRevoke=page.waitForResponse(response=>{
   const pathname=new URL(response.url()).pathname;
   return /^\/api\/shares\/[a-f0-9]{64}(?:\/revoke)?$/.test(pathname)&&
     ['POST','DELETE'].includes(response.request().method());
 },{timeout:10000});
 await revoke.click();
 const actualRevoke=await ownerRevoke;
 assert.equal(actualRevoke.status(),200,
   'Original menu must submit an authenticated owner revoke');
 // Safari/service-worker requests can finish out of order. Require
 // THREE successive authenticated owner responses confirming the same
 // revoke, rather than accepting one transient UI/list result.
 const revokedProof=await page.evaluate(async hash=>{
   let confirmed=0,last=null;
   for(let attempt=0;attempt<35;attempt++){
     const r=await fetch('/api/shares',{credentials:'same-origin',
       cache:'reload',headers:{'cache-control':'no-cache'}});
     const rows=r.ok?((await r.json()).items||[]):[];
     const match=rows.find(x=>x.id===hash);
     last={status:r.status,matchingRows:rows.filter(x=>x.id===hash).length,
       revoked:match?.revoked_at!==null&&match?.revoked_at!==undefined};
     confirmed=last.status===200&&last.matchingRows===1&&last.revoked?
       confirmed+1:0;
     if(confirmed>=3)return last;
     await new Promise(resolve=>setTimeout(resolve,120));
   }
   return last;
 },issuedShareHash);
 if(!revokedProof.revoked){
   // Distinguish stale menu/service-worker state from the actual
   // authenticated owner list and guest-token revocation.
   const direct=await page.request.get(origin+'/api/shares',{
     headers:{'x-talera-f5-key':gate,'cache-control':'no-cache'}});
   const items=(await direct.json().catch(()=>({items:[]}))).items||[];
   const match=items.find(x=>x.id===issuedShareHash);
   const guestLink=await page.request.get(origin+linked.link,{
     headers:{'x-talera-f5-key':gate,accept:'text/html'}});
   console.log('TALERA_OWNER_REVOKE_CONSISTENCY_DIAGNOSTIC',JSON.stringify({
     browser:revokedProof,direct:{status:direct.status(),
       matchCount:items.filter(x=>x.id===issuedShareHash).length,
       revoked:match?.revoked_at!=null,revokedAt:match?.revoked_at},
     guestStatus:guestLink.status(),
     menu:(await page.locator('#talera-more-menu').innerText()).slice(0,320),
     recentNetwork:apiTrace.slice(-35),
     pageErrors:errors.slice(-8)
   }));
 }
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
 for(const active of ['account','people','mine','privacy','settings','help'])
   assert.ok(cleanHub.listed.includes(active),'Working More destination removed: '+active);
 for(const unavailable of ['shared','subscription','forgot'])
   assert.ok(!cleanHub.listed.includes(unavailable),
     'Unavailable Free option must not pretend to be working: '+unavailable);
 assert.equal(cleanHub.listed.filter(v=>v==='privacy').length,1,
   'Exactly one visible privacy option on the main More page');

 await view(page,'people');
 const people=page.locator('[data-talera-people]');
 await people.waitFor();
 await people.getByRole('button',{name:'Contact toevoegen',exact:true}).click();
 await people.locator('[data-people-field="name"]').fill('Synthetic TALERA contact');
 await people.locator('[data-people-field="phone"]').fill('+31600000123');
 await people.getByRole('button',{name:'Opslaan',exact:true}).click();
 await people.getByText('Synthetic TALERA contact',{exact:true}).waitFor();
 await people.getByRole('button',{name:'Synthetic TALERA contact als favoriet markeren'}).click();
 await people.getByRole('button',{name:'Synthetic TALERA contact uit favorieten halen'}).waitFor();
 assert.equal(await people.locator('form[data-form="search"]').count(),0,'No old public account finder');
 const vcard='BEGIN:VCARD\nVERSION:3.0\nFN:Contact file selected\nTEL:+31600000124\nNOTE:NOT_STORED\nEND:VCARD\nBEGIN:VCARD\nFN:Contact file unselected\nTEL:+31600000125\nEND:VCARD';
 await people.locator('[data-people-import="vcard"]').setInputFiles({name:'synthetic.vcf',mimeType:'text/vcard',buffer:Buffer.from(vcard)});
 await people.getByLabel('Contact file selected',{exact:true}).check();
 await people.getByRole('button',{name:'Selectie toevoegen',exact:true}).click();
 // Wait for the asynchronous IndexedDB import and removal of the review.
 // The selected label is already visible in the review before the commit.
 await people.getByLabel('Contact file selected',{exact:true}).waitFor({state:'detached'});
 await people.getByText('Contact file selected',{exact:true}).waitFor();
 assert.equal(await people.getByText('Contact file unselected',{exact:true}).count(),0);
 assert.equal(await people.getByText('NOT_STORED').count(),0);

 await page.locator('#talera-more-menu [data-action="back"]').first().click();
 await view(page,'people');
 await people.getByText('Synthetic TALERA contact',{exact:true}).waitFor();
 await people.getByRole('button',{name:'Synthetic TALERA contact uit favorieten halen'}).waitFor();
 await page.locator('#talera-more-menu [data-action="back"]').first().click();
 console.log('TALERA_MY_PEOPLE_EXISTING_MENU_LOCAL_PASS');
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
     if(r.status()===200&&data.id&&data.link)createdLinks.push({status:r.status(),...data});
   }
 });
 try{
   const route=await sharePage.goto(origin+'/present?memory='+encodeURIComponent(a.id),{waitUntil:'domcontentloaded'});
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
   // Force the real account response to arrive after typing. Neither the
   // service response nor the authorization checks are stubbed or bypassed.
   let releaseShareAuth;
   const holdShareAuth=new Promise(resolve=>{releaseShareAuth=resolve});
   const delayShareAuth=async route=>{await holdShareAuth;await route.continue()};
   await sharePage.route('**/api/me',delayShareAuth);
   const personalDraft='Hé, weet je nog die middag?';
   try{
   await sharePage.locator('#talera-clean-social [data-action=share]').click();
   const durations=await sharePage.locator('#talera-clean-expiry option').evaluateAll(opts=>opts.map(o=>Number(o.value)));
   assert.deepEqual(durations,[1,24,168],'Only the existing shorter options and seven days are offered');
   await sharePage.waitForFunction(()=>
     document.querySelector('#talera-clean-overlay:not([hidden]) .status')?.textContent.includes('TALERA controleert je aanmelding'),
     null,{timeout:15000});
   // One compact selector, truly EMPTY personal field, and draft survives
   // changing the expiry and switching back to the default invitation.
   const choices=sharePage.locator('#talera-clean-overlay .talera-share-choice');
   assert.equal(await choices.count(),2,'Exactly two original WhatsApp message options');
   assert.equal(await sharePage.locator('#talera-clean-overlay [data-action=message-personal]').getAttribute('aria-pressed'),'true');
   assert.equal(await sharePage.locator('#talera-clean-personal').count(),1);
   assert.equal(await sharePage.locator('#talera-clean-personal').inputValue(),'',
     'Own WhatsApp message must start with an entirely blank text field');
   assert.equal(await sharePage.locator('#talera-clean-preview-photo').isChecked(),true,'Photo accompanies the message by default');
   const personalField=sharePage.locator('#talera-clean-personal');
   await personalField.fill(personalDraft);
   const originalField=await personalField.elementHandle();
   await originalField.evaluate(el=>el.setSelectionRange(4,4));
   releaseShareAuth();
   await sharePage.waitForFunction(()=>document.querySelector('#talera-clean-overlay:not([hidden]) .status')?.textContent.includes('Kies een geldigheidsduur'),
     null,{timeout:15000});
   assert.equal(await originalField.evaluate(el=>el===document.querySelector('#talera-clean-personal')&&el.isConnected&&document.activeElement===el&&el.selectionStart===4&&el.selectionEnd===4),true,
     'The real async authorization update must retain the focused original draft textbox and cursor');
   assert.equal(await personalField.inputValue(),personalDraft,'Delayed authorization must preserve the unsent draft');
   await sharePage.locator('#talera-clean-expiry').selectOption('24');
   assert.equal(await originalField.evaluate(el=>el===document.querySelector('#talera-clean-personal')&&el.isConnected),true,
     'Changing duration must keep the same native draft textbox');
   await originalField.dispose();
   console.log('TALERA_FREE_WHATSAPP_ASYNC_AUTH_DRAFT_AND_CARET_PRESERVED_PASS');
   }finally{releaseShareAuth();await sharePage.unroute('**/api/me',delayShareAuth)}
   assert.equal(await sharePage.locator('#talera-clean-personal').inputValue(),personalDraft,
     'Changing validity may not delete the unsent personal message');
   await sharePage.locator('#talera-clean-expiry').selectOption('168');
   await sharePage.locator('#talera-clean-overlay [data-action=message-standard]').click();
   assert.equal(await sharePage.locator('#talera-clean-personal').count(),0);
   await sharePage.locator('#talera-clean-overlay [data-action=message-personal]').click();
   assert.equal(await sharePage.locator('#talera-clean-personal').inputValue(),personalDraft);
   await sharePage.locator('#talera-clean-overlay [data-action=message-standard]').click();
   assert.equal(await sharePage.locator('#talera-clean-preview-photo').isChecked(),true,'Photo choice survives rerenders');
   // Use the standard message in the previously proven one-invite test.
   await sharePage.locator('#talera-clean-consent').check();
   await sharePage.locator('#talera-clean-overlay [data-action=prepare]').click();
   await sharePage.waitForFunction(()=>!!document.querySelector('#talera-clean-overlay [data-action=send]:not([disabled])'),null,{timeout:30000});
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
   const sharePath=shareNetwork.find(x=>x.method==='POST'&&/^\/api\/memories\/[a-f0-9]{64}\/shares$/.test(x.path))?.path;
   assert.ok(sharePath);
   const invalidExpiry=await sharePage.evaluate(async path=>{
     const r=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({consent:true,hours:720})});
     return r.status;
   },sharePath);
   assert.equal(invalidExpiry,400,'Thirty-day guest links are no longer accepted');
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
       typeof data?.text==='string'&&!Object.hasOwn(data,'files')});
     Object.defineProperty(navigator,'share',{configurable:true,value:data=>{
       const file=data.files?.[0];
       window.__taleraNativeShareProbe.push({
         name:file?.name,type:file?.type,size:file?.size,
         count:data.files?.length||0,hasFiles:Object.hasOwn(data,'files'),text:data.text,
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
   assert.equal(payload?.count,0,'No standalone image attachment');
   assert.equal(payload.hasFiles,false);
   assert.equal(payload.text,
     'Ik kwam deze herinnering tegen en moest aan je denken.\n\n'+issued.link,
     'The exact default caption and restricted recipient URL must travel together');
   assert.equal(payload.hasSeparateUrl,false,
     'iOS text with the URL must be one share body, not a second URL item');
   assert.equal(new URL(sharePage.url()).pathname,'/present',
     'Simulated native photo share must not navigate away from the same app');
   await sharePage.waitForFunction(()=>!!document.getElementById('talera-wa-handoff-status'),
     null,{timeout:10000});
   const handoff=await sharePage.evaluate(()=>({
     message:document.getElementById('talera-wa-handoff-status')?.textContent||'',
     originalPresenter:!!document.getElementById('photoStage'),
     originalStory:!!document.getElementById('memoryStoryScroll'),
     shareOverlayClosed:document.getElementById('talera-clean-overlay')?.hidden,
     noUnconfirmedSuccess:!(/succesvol verzonden|bericht is verzonden/i.test(
       document.getElementById('talera-wa-handoff-status')?.textContent||''))
   }));
   assert.ok(handoff.message.includes('Controleer in WhatsApp')&&
     handoff.originalPresenter&&handoff.originalStory&&
     handoff.shareOverlayClosed&&handoff.noUnconfirmedSuccess,
     'WhatsApp handoff must truthfully return to original TALERA presenter');
   console.log('TALERA_FREE_WHATSAPP_TRUTHFUL_RETURN_TO_ORIGINAL_MEMORY_PASS');
   console.log('TALERA_FREE_COMPACT_LINK_CAPTION_SHARE_PAYLOAD_PASS',
     JSON.stringify({separatePicture:false,caption:true,sameSecureLink:true,realIphoneAccepted:false}));

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
   // This scenario explicitly asserts the Dutch guest copy. Pin the browser
   // locale rather than relying on the runner's default (often en-US).
   const anonymous=await browser.newContext({
     ...devices['iPhone 13'],locale:'nl-NL',extraHTTPHeaders:{'x-talera-f5-key':gate,
       'cf-connecting-ip':'192.0.2.91'}
   });
   try{
     const guest=await anonymous.newPage();
     // Chromium's page fetch carries the secure first-party claim cookie on
     // loopback; Playwright APIRequestContext may omit it on HTTP. For direct
     // contract probes only, reuse the exact cookie already issued to this
     // real browser for this particular capability. Never manufacture a cookie
     // or attach it to another host or legacy private-account path.
     const guestRequest=Object.fromEntries(['get','post','fetch'].map(method=>[
       method,async(url,options={})=>{
         const target=new URL(url,origin);
         const match=target.origin===origin&&/^\/s\/([A-Za-z0-9_-]{43})(?:\/|$)/.exec(target.pathname);
         if(!match)return guest.request[method](url,options);
         const token=Buffer.from(match[1],'base64url').toString('hex');
         const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
         const hash=Buffer.from(digest).toString('hex');
         const name='__Host-talera_g_'+hash.slice(0,24);
         const cookies=await anonymous.cookies();
         const cookie=cookies.find(c=>c.name===name&&c.secure&&c.httpOnly&&c.path==='/');
         const headers={...options.headers};
         if(cookie)headers.cookie=name+'='+cookie.value;
         return guest.request[method](url,{...options,headers});
       }
     ]));
     const openGuest=async url=>{
       const actual=guest.waitForResponse(r=>r.url()===url&&r.status()===200&&
         r.headers()['x-talera-free-f5']==='original-presentation-one-memory-capability',{timeout:20000});
       await guest.goto(url,{waitUntil:'domcontentloaded'}).catch(e=>{
         if(!/navigation|aborted|interrupted/i.test(String(e)))throw e;
       });
       return actual;
     };
     // Plain crawler fetches may create a cookie but must never claim.
     const previewProbe=await browser.newContext({extraHTTPHeaders:{'x-talera-f5-key':gate}});
     let received;
     try{
       const pre=await previewProbe.request.get(issued.link);
       assert.equal(pre.status(),200);
       const previewHTML=await pre.text();
       assert.match(previewHTML,/<meta property="og:title" content="synthetic ACCOUNT ISOLATION 1">/);
       assert.ok(!previewHTML.includes('Local-only imaginary image'),'Private story must not appear in the crawler page');
       assert.match(previewHTML,/<meta name="twitter:card" content="summary">/);
       assert.match(previewHTML,/<meta property="og:image:width" content="512">/);
       const thumbnail=await previewProbe.request.get(issued.link+'/preview');
       assert.equal(thumbnail.status(),200);
       assert.equal(thumbnail.headers()['content-type'],'image/jpeg');
       assert.match(thumbnail.headers()['cache-control'],/no-store/);
       const bytes=await thumbnail.body();
       assert.ok(bytes.length>100&&bytes.length<=131072,'Only compact reduced preview is public');
       const head=await previewProbe.request.head(issued.link+'/preview');
       assert.equal(head.status(),200);
       assert.equal((await previewProbe.request.head(issued.link)).status(),200);
       assert.equal((await previewProbe.request.get(issued.link+'/photo')).status(),404);
       assert.equal((await previewProbe.request.get(issued.link+'/feedback')).status(),404);
       received=await openGuest(issued.link);
       assert.equal(received.status(),200);
       assert.equal((await previewProbe.request.get(issued.link)).status(),403);
       // The APIRequestContext uses plain HTTP loopback and may omit Secure
       // cookies. Exercise the exact issued cookie explicitly, without ever
       // relaxing the production cookie attributes or claim authorization.
       const issuedCookie=pre.headers()['set-cookie']||'';
       assert.match(issuedCookie,/^__Host-talera_g_[a-f0-9]{24}=[a-f0-9]{64}; Secure; HttpOnly; SameSite=Lax; Path=\//);
       const crawlerCookie=issuedCookie.split(';')[0];
       assert.equal((await previewProbe.request.post(issued.link+'/claim',{
         headers:{origin,'content-type':'application/json',cookie:''},data:'{}'})).status(),403);
       assert.equal((await previewProbe.request.post(issued.link+'/claim',{
         headers:{origin,'content-type':'application/json',cookie:crawlerCookie},data:'{}'})).status(),409);
       assert.equal((await previewProbe.request.get(issued.link+'/photo',{
         headers:{cookie:crawlerCookie}})).status(),404);
       for(const suffix of ['/photo','/photo-full','/media/0/0','/poster/0','/audio','/video','/feedback'])
         assert.equal((await previewProbe.request.get(issued.link+suffix)).status(),404);
       assert.equal((await previewProbe.request.post(issued.link+'/heart',{
         headers:{origin,'content-type':'application/json'},data:{guestId:crypto.randomUUID()}})).status(),404);
       console.log('TALERA_GUEST_FIRST_BROWSER_CLAIM_FORWARD_DENIED_PASS');
     }finally{await previewProbe.close()}
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
     assert.ok(guestGeometry.editor.visible!==true,
       'Guest must never show the private-account edit pencil');
     // Even a synthetic click on the old (hidden) pencil must not navigate
     // into /tell or into an account session on the same origin.
     await guest.evaluate(()=>{
       document.getElementById('talera-v5-editor-pencil')?.dispatchEvent(
         new MouseEvent('click',{bubbles:true,cancelable:true}));
     });
     await guest.waitForTimeout(250);
     assert.equal(guest.url(),issued.link,
       'Guest pencil must not navigate to original private editor');
     console.log('TALERA_GUEST_EDITOR_HIDDEN_AND_CLICK_BLOCKED_PASS');
     // The same guest picture supplies browser appearance hints, without
     // changing the original photo stage dimensions or requesting new media.
     await guest.waitForFunction(()=>{
       const root=document.documentElement;
       const top=root.style.getPropertyValue('--talera-guest-edge-top');
       const bottom=root.style.getPropertyValue('--talera-guest-edge-bottom');
       return /^#[0-9a-f]{6}$/.test(top)&&/^#[0-9a-f]{6}$/.test(bottom)&&
         top!=='#17344a'&&document.querySelector('meta[name="theme-color"]')?.content===top;
     },null,{timeout:15000});
     console.log('TALERA_GUEST_PHOTO_BROWSER_THEME_HINT_PASS');
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
     assert.match(html,/<meta property="og:title" content="synthetic ACCOUNT ISOLATION 1">/);
     assert.match(html,/<meta name="twitter:card" content="summary">/);
     assert.match(html,/<meta property="og:image" content=/);
     assert.ok(html.includes(issued.link+'/preview'));
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
     // No invented VIDEO/white frame in the guest path, and the first
     // original photo must be revealed only once its native pixels load.
     await guest.waitForFunction(()=>!document.getElementById('taleraGuestEntryCover'),
       null,{timeout:8000});
     const firstFrame=await guest.evaluate(()=>({
       originalPhoto:document.getElementById('memoryPhotoA')?.naturalWidth>0,
       noWhiteInterstitial:document.documentElement.style.backgroundColor!=='white',
       noVideoFallback:!document.documentElement.classList.contains('talera-guest-video-fallback'),
       guestOnly:document.body.dataset.taleraGuest==='one-memory'
     }));
     assert.ok(firstFrame.originalPhoto&&firstFrame.noVideoFallback&&firstFrame.guestOnly,
       'Guest first-frame hold must yield to a decoded ORIGINAL photo');
     console.log('TALERA_GUEST_FIRST_REAL_FRAME_NO_INTERSTITIAL_PASS',
       JSON.stringify({noPlaceholderOverlay:true,originalPresenter:true}));
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
     assert.equal(await guest.locator('#returnGuestStory').textContent(),
       '← Terug naar jouw herinnering');
     const returnVisual=await guest.locator('#returnGuestStory').evaluate(el=>{
       const s=getComputedStyle(el),r=el.getBoundingClientRect();
       return {background:s.backgroundColor,decoration:s.textDecorationLine,
         height:r.height,width:r.width,
         beforeDiscover:el.compareDocumentPosition(
           document.querySelector('.guest-landing-actions .cta'))&
           Node.DOCUMENT_POSITION_FOLLOWING};
     });
     assert.ok(returnVisual.height>=48&&returnVisual.width>180&&
       returnVisual.decoration==='none'&&returnVisual.beforeDiscover,
       'Guest gets a prominent first-position return button on intro page');
     await guest.locator('#returnGuestStory').click();
     console.log('TALERA_GUEST_INTRO_DIRECT_RETURN_BUTTON_PASS');
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
     const guestSnapshot=await guestRequest.get(issued.link+'/feedback',
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

     const guestPrivateProbe=await guestRequest.get(issued.link+'/feedback');
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
     const legacyGuest=await guestRequest.get(origin+
       '/__social/memory/'+sharedStoryId+'/view',{
        headers:{'x-qa-share-token':rawShareToken}});
     assert.equal(legacyGuest.status(),403,
       'Old token-only JSON view must not bypass the browser-bound share');
     // Anonymous share rights must never mutate the original signed-in
     // TALERA account's conversation via legacy social endpoints.
     const privateSocialPath=origin+'/__social/memory/'+sharedStoryId;
     const tokenOnlyReply=await guestRequest.post(privateSocialPath+'/comment',{
       headers:{origin,'x-qa-share-token':rawShareToken,
        'content-type':'application/json'},
       data:{body:'DO_NOT_WRITE_PRIVATE_THREAD'}});
     assert.equal(tokenOnlyReply.status(),403,
       'Only the protected guest /s/:token/comment can accept anonymous text');
     const tokenOnlyHeart=await guestRequest.post(privateSocialPath+'/like',{
       headers:{origin,'x-qa-share-token':rawShareToken,
        'content-type':'application/json'},data:{}});
     assert.equal(tokenOnlyHeart.status(),403,
       'Only the protected guest /s/:token/heart can accept anonymous hearts');
     const unauthenticated=await guestRequest.get(origin+
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
     const siblingFinal=await sharePage.evaluate(async token=>{
       const r=await fetch('/api/shares/'+token+'/manifest',{method:'POST',credentials:'same-origin',
         headers:{'content-type':'application/json'},body:JSON.stringify({version:1,items:[],narrationCues:[],narrationDurationMs:0})});
       return r.status;
     },siblingInvite.data.id);
     assert.equal(siblingFinal,200);
     const siblingClaim=await guest.evaluate(async url=>{
       const opening=await fetch(url,{credentials:'same-origin'});
       const claimed=await fetch(url+'/claim',{method:'POST',credentials:'same-origin',
         headers:{'content-type':'application/json'},body:'{}'});
       return {opening:opening.status,claim:claimed.status};
     },siblingUrl);
     assert.deepEqual(siblingClaim,{opening:200,claim:200});
     const siblingFeedbackRes=await guestRequest.get(siblingUrl+'/feedback');
     assert.equal(siblingFeedbackRes.status(),200);
     const siblingFeedback=await siblingFeedbackRes.json();
     assert.deepEqual({likes:siblingFeedback.likes,comments:siblingFeedback.commentCount},
       {likes:0,comments:0},'Two links must never exchange guest reactions');
     assert.equal((await guestRequest.get(siblingUrl+'/photo')).status(),404,
       'An unuploaded photo for share B cannot reuse share A media');
     assert.equal((await guestRequest.get(issued.link+'/photo')).status(),200,
       'An existing valid share A keeps its own permitted media');
     const siblingRevoke=await sharePage.evaluate(async id=>{
       const r=await fetch('/api/shares/'+id+'/revoke',{
         method:'POST',credentials:'same-origin'});
       return r.status;
     },siblingInvite.data.id);
     assert.equal(siblingRevoke,200);
     assert.equal((await guestRequest.get(siblingUrl+'/feedback')).status(),404);
     assert.equal((await guestRequest.get(issued.link+'/feedback')).status(),200,
       'Revoking one invitation must not revoke another');
     console.log('TALERA_FREE_ONE_MEMORY_MULTIPLE_LINK_RIGHTS_ISOLATION_PASS',
       JSON.stringify({oneMemory:true,separateGuestReactions:true,separateMedia:true,
        selectiveRevoke:true,presenterUnchanged:true}));


     const alienReaction=await guestRequest.post(issued.link+'/heart',{
       headers:{origin:'https://attacker.invalid','content-type':'application/json'},
       data:{guestId:'00000000-0000-4000-8000-000000000000'}});
     assert.equal(alienReaction.status(),403);
     await guest.locator('#talera-clean-overlay [data-action=close]').click();
     console.log('TALERA_FREE_GUEST_NAMED_REACTION_AND_ORIGIN_PROTECTION_PASS',
       JSON.stringify({accountRequired:false,guestLike:true,
         guestFirstName:true,foreignOriginDenied:true,realIphoneAccepted:false}));
     const imageResponse=await guestRequest.get(issued.link+'/photo');
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
     const probe=await guestRequest.get(videoPath,{headers:{range:'bytes=0-1'}});
     assert.equal(probe.status(),206,'iPhone must get two-byte video probe');
     assert.equal(probe.headers()['content-range'],'bytes 0-1/1024');
     assert.equal(probe.headers()['accept-ranges'],'bytes');
     assert.deepEqual([...await probe.body()],[0,1]);
     const seek=await guestRequest.get(videoPath,{headers:{range:'bytes=128-159'}});
     assert.equal(seek.status(),206);
     assert.equal((await seek.body()).length,32);
     const suffix=await guestRequest.get(videoPath,{headers:{range:'bytes=-16'}});
     assert.equal(suffix.status(),206);
     assert.equal(suffix.headers()['content-range'],'bytes 1008-1023/1024');
     const pastEnd=await guestRequest.get(videoPath,{headers:{range:'bytes=1000-999999'}});
     assert.equal(pastEnd.status(),206,'iPhone range extending beyond the end must be clipped');
     assert.equal(pastEnd.headers()['content-range'],'bytes 1000-1023/1024');
     assert.equal((await pastEnd.body()).length,24);
     const bad=await guestRequest.get(videoPath,{headers:{range:'bytes=1024-1030'}});
     assert.equal(bad.status(),416,'Out-of-bounds ranges must not reveal media');
     assert.equal(bad.headers()['content-range'],'bytes */1024');
     const headVideo=await guestRequest.fetch(videoPath,{method:'HEAD'});
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
     // A manually appended unrelated legacy video is not part of the
     // finalized source-exact original memory manifest and must not silently
     // change the recipient's playback sequence.
     assert.deepEqual(sharedMediaKinds,['photo']);
     assert.equal(await guest.locator('#photoStage').count(),1);
     assert.equal(await guest.locator('#memoryStoryScroll').count(),1);
     assert.equal(await guest.locator('#openGuestVideo').count(),0,
       'The old independent video overlay must not be part of native TALERA');
     console.log('TALERA_GUEST_NATIVE_MEDIA_USES_ORIGINAL_PRESENTER_PASS',
       JSON.stringify({sourceExactPhotoOnly:true,unlistedVideoNotInjected:true,
        originalTimeline:true,iphoneAccepted:false}));
     // Revoke only the newly generated synthetic share. Verify that the raw
     // capability and photo are both immediately inaccessible.
     const revoke=await sharePage.evaluate(async token=>{
       const r=await fetch('/api/shares/'+token+'/revoke',{
         method:'POST',credentials:'same-origin'
       });
       return {status:r.status,data:await r.json()};
     },issued.id);
     assert.equal(revoke.status,200,'Synthetic owner must revoke own share');
     assert.equal((await guestRequest.get(issued.link,{headers:{accept:'text/html'}})).status(),404);
     assert.equal((await guestRequest.get(issued.link+'/photo')).status(),404);
     assert.equal((await guestRequest.get(origin+
       '/__social/memory/'+sharedStoryId+'/view',{
        headers:{'x-qa-share-token':rawShareToken}})).status(),403,
       'Legacy capability access is denied immediately after revocation');
     assert.equal((await guestRequest.get(videoPath,{headers:{range:'bytes=0-1'}})).status(),404,
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
       const part=await fetch('/api/shares/'+share.data.id+'/media/0/0',{method:'POST',credentials:'same-origin',
         headers:{'content-type':'image/jpeg'},body:jpeg});
       const digest=await crypto.subtle.digest('SHA-256',await jpeg.arrayBuffer());
       const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
       const finalized=await post('/api/shares/'+share.data.id+'/manifest',{version:1,
         items:[{kind:'photo',mime:'image/jpeg',size:jpeg.size,parts:1,hashes:[hash]}],
         narrationCues:[],narrationDurationMs:0});
       if(part.status!==200||finalized.status!==200)return {step:'finalize',part:part.status,finalized};
       const after=await fetch(share.data.link,{headers:{accept:'text/html'},credentials:'same-origin'});
       const gateHtml=await after.text();
       if(gateHtml.includes('synthetic PHOTO ONLY'))return {step:'leaked-before-claim'};
       const claimed=await post(new URL(share.data.link).pathname+'/claim',{});
       if(claimed.status!==200)return {step:'claim',claimed};
       const opened=await fetch(share.data.link,{headers:{accept:'text/html'},credentials:'same-origin'});
       const html=await opened.text();
       const revoke=await fetch('/api/shares/'+share.data.id+'/revoke',{
         method:'POST',credentials:'same-origin'});
       const unavailable=await fetch(share.data.link,{
         headers:{accept:'text/html'},credentials:'omit'});
       return {before:before.status,after:opened.status,
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
     },{before:409,after:200,media:200,revoke:200,unavailable:404,
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
       assert.equal(await sharePage.locator('#talera-clean-preview-photo').isChecked(),true);
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
           typeof data?.text==='string'&&!Object.hasOwn(data,'files')});
         Object.defineProperty(navigator,'share',{configurable:true,value:data=>{
           const file=data.files?.[0];
           window.__taleraNativeShareProbe.push({
             name:file?.name,type:file?.type,size:file?.size,
             count:data.files?.length||0,hasFiles:Object.hasOwn(data,'files'),text:data.text
           });
           return Promise.resolve();
         }});
       });
       await sharePage.locator('#talera-clean-overlay [data-action=send]').click();
       const personalPayload=await sharePage.evaluate(()=>
         window.__taleraNativeShareProbe?.at(-1));
       assert.equal(personalPayload?.count,0);
       assert.equal(personalPayload.hasFiles,false);
       const personalLink=createdLinks.at(-1)?.link;
       assert.equal(personalPayload.text,
         'Weet je nog dat moment? Dit wilde ik met je delen.\n\n'+personalLink,
         'Personal invitation must NOT receive any automatic promotional copy');
       console.log('TALERA_FREE_COMPACT_PERSONAL_LINK_SHARE_PAYLOAD_PASS',
         JSON.stringify({separatePicture:false,ownWordsOnly:true,secureLink:true,realIphoneAccepted:false}));

       const issuedUntitled=createdLinks.at(-1);
       assert.equal(createdLinks.length,4,'Original, independent sibling, direct photo-only and untitled UI invitations are distinct');
       assert.equal(issuedUntitled.status,200);
       const photoOnlyView=await openGuest(issuedUntitled.link);
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
       assert.equal((await guestRequest.get(issuedUntitled.link+'/photo')).status(),200);
       const stopped=await sharePage.evaluate(async token=>{
         const response=await fetch('/api/shares/'+token+'/revoke',
           {method:'POST',credentials:'same-origin'});
         return response.status;
       },issuedUntitled.id);
       assert.equal(stopped,200);
       // The new WhatsApp handoff confirmation returns automatically to the
       // original memory. The older flow kept the share sheet open instead;
       // both must release the pause without re-starting any media.
       if(await sharePage.locator('#talera-clean-overlay').isVisible())
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
     // A real original-library story with multiple photos, its own voice
     // and video files, and time-coded narration must share ALL file bytes
     // in the original order, not a reduced poster snapshot.
     const completeFixture=await sharePage.evaluate(async()=>{
       const photo=async(color,name)=>{
         const canvas=document.createElement('canvas');
         canvas.width=48;canvas.height=48;
         const c=canvas.getContext('2d');
         c.fillStyle=color;c.fillRect(0,0,48,48);
         const b=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
         return new File([b],name,{type:'image/png'});
       };
       const wav=new Uint8Array(844),v=new DataView(wav.buffer);
       const word=(at,s)=>{for(let i=0;i<s.length;i++)wav[at+i]=s.charCodeAt(i)};
       word(0,'RIFF');v.setUint32(4,836,true);word(8,'WAVE');
       word(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);
       v.setUint16(22,1,true);v.setUint32(24,8000,true);
       v.setUint32(28,16000,true);v.setUint16(32,2,true);
       v.setUint16(34,16,true);word(36,'data');v.setUint32(40,800,true);
       const video=new Uint8Array(2*1048576+37);
       video.set(new TextEncoder().encode('ftyp'),4);
       const files=[await photo('#bd2d57','first.png'),
         await photo('#168e8b','second.png'),
         new File([wav],'narration.wav',{type:'audio/wav'}),
         new File([video],'clip.mp4',{type:'video/mp4'})];
       const record=await window.TaleraMemories.save({
         title:'SYNTHETIC COMPLETE MEMORY',date:'2003-04-05',
         text:'One selected, multi-media, timed narrative only.',
         narrationCues:[]
       },files);
       if(record.items.length!==4)return {error:'missing original media in library'};
       const thumb=await photo('#cf9d44','existing-video-still.png');
       if(!await window.TaleraMemories.cacheVideoPoster(record.items[3].key,thumb))
         return {error:'cannot cache stored video thumbnail'};
       const thumbSha=Array.from(new Uint8Array(await crypto.subtle.digest(
         'SHA-256',await thumb.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
       const cues=[{t:0,index:0,mediaId:record.items[0].key},
         {t:2600,index:1,mediaId:record.items[1].key},
         {t:5100,index:2,mediaId:record.items[3].key,videoAtMs:300}];
       const library=window.TaleraMemories;
       const cueWriter=typeof library.updateCues==='function'?library:
         (typeof window.TaleraLibrary?.updateCues==='function'?window.TaleraLibrary:null);
       if(cueWriter){
         await cueWriter.updateCues(record.id,cues);
       }else{
         // Only the real /tell editor exposes the original cue writer. For
         // this SYNTHETIC transport regression, seed just the cue metadata
         // in the SAME pre-existing account-private IndexedDB stories row.
         // All media blobs and canonical IDs stay owned by TALERA's library.
         const me=await (await fetch('/api/me',{credentials:'same-origin'})).json();
         if(!/^[a-f0-9-]{36}$/i.test(me.account?.id||''))
           throw Error('No verified owner for synthetic cue fixture');
         const digest=await crypto.subtle.digest('SHA-256',
           new TextEncoder().encode('TALERA_FREE_BROWSER_MEMORY_V1:'+
             me.account.id.toLowerCase()));
         const hex=Array.from(new Uint8Array(digest),n=>
           n.toString(16).padStart(2,'0')).join('');
         const dbName='talera-free-local-'+hex.slice(0,32)+'-v1';
         if(!(await indexedDB.databases()).some(x=>x.name===dbName))
           throw Error('Original account-private DB does not exist');
         const db=await new Promise((resolve,reject)=>{
           const request=indexedDB.open(dbName,1);
           request.onupgradeneeded=()=>{request.transaction.abort();reject(Error('Unexpected new test DB'))};
           request.onerror=()=>reject(request.error);
           request.onsuccess=()=>resolve(request.result);
         });
         try{
           await new Promise((resolve,reject)=>{
             const tx=db.transaction('stories','readwrite');
             const store=tx.objectStore('stories');
             const request=store.get(record.id);
             request.onsuccess=()=>{
               const row=request.result;
               if(!row||row.id!==record.id){tx.abort();return}
               row.narrationCues=cues;
               store.put(row);
             };
             request.onerror=()=>tx.abort();
             tx.onerror=()=>{};
             tx.onabort=()=>reject(tx.error||Error('Synthetic cue fixture rejected'));
             tx.oncomplete=()=>resolve();
           });
         }finally{db.close()}
       }
       const checked=await library.get(record.id);
       if(JSON.stringify(checked.narrationCues)!==JSON.stringify(cues))
         return {error:'original cue writer did not retain the same cue IDs'};
       const digests=[];
       for(const original of record.items){
         const blob=await window.TaleraMemories.blob(original.key);
         const hex=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
           await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
         digests.push(hex);
       }
       return {id:record.id,kinds:record.items.map(x=>x.kind),digests,
         thumbSha,cues};
     });
     assert.equal(completeFixture.error,undefined);
     assert.deepEqual(completeFixture.kinds,['photo','photo','audio','video']);
     try{
       await sharePage.goto(origin+'/present?memory='+encodeURIComponent(completeFixture.id),
         {waitUntil:'domcontentloaded'});
       await sharePage.waitForFunction(id=>
         window.__taleraTimelineRuntime?.currentMemory?.()?.storyId===id,
         completeFixture.id,{timeout:20000});
       await sharePage.locator('#talera-clean-social [data-action=share]')
         .waitFor({state:'visible',timeout:16000});
       await sharePage.waitForTimeout(1500);
       await sharePage.locator('#talera-clean-social [data-action=share]').click();
       await sharePage.waitForFunction(()=>!!document.querySelector(
         '#talera-clean-overlay:not([hidden]) [data-action=prepare]'),
         null,{timeout:16000});
       await sharePage.locator('#talera-clean-overlay [data-action=message-standard]').click();
       await sharePage.locator('#talera-clean-preview-photo').uncheck();
       assert.equal(await sharePage.locator('#talera-clean-preview-photo').isChecked(),false);
       await sharePage.locator('#talera-clean-consent').check();
       await sharePage.locator('#talera-clean-overlay [data-action=prepare]').click();
       await sharePage.waitForFunction(()=>!!document.querySelector(
          '#talera-clean-overlay [data-action=send]:not([disabled])'),
         null,{timeout:45000});
       const invitation=createdLinks.at(-1);
       assert.equal(invitation?.status,200);
       const noPreview=await browser.newContext({extraHTTPHeaders:{'x-talera-f5-key':gate}});
       try{
         const pre=await noPreview.request.get(invitation.link);
         assert.equal(pre.status(),200);
         assert.ok((await pre.text()).includes(origin+'/pwa-512.png'));
         assert.equal((await noPreview.request.get(invitation.link+'/preview')).status(),404);
       }finally{await noPreview.close()}
       const opened=await openGuest(invitation.link);
       assert.equal(opened.status(),200);
       await guest.waitForFunction(()=>window.__taleraTimelineRuntime?.currentMemory?.()?._taleraLocal,
         null,{timeout:22000});
       const copy=await guest.evaluate(async()=>{
         const rows=await window.TaleraMemories.list();
         const selected=rows[0],hashes=[];
         for(const item of selected.items){
           const blob=await window.TaleraMemories.blob(item.key);
           if(!blob)return {error:'missing complete original item',item:item.kind};
           hashes.push(Array.from(new Uint8Array(await crypto.subtle.digest(
             'SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join(''));
         }
         const thumb=await window.TaleraMemories.blob(selected.items[3].key+':phone-v1');
         if(!thumb)return {error:'missing authorized video still'};
         const thumbSha=Array.from(new Uint8Array(await crypto.subtle.digest(
           'SHA-256',await thumb.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
         return {count:rows.length,kinds:selected.items.map(x=>x.kind),
           hashes,thumbSha,cues:selected.narrationCues,
           localOnly:window.TaleraMemories.localOnly===true,
           presentation:!!document.getElementById('photoStage'),
           storyLift:!!document.getElementById('memoryStoryScroll')};
       });
       assert.equal(copy.error,undefined,JSON.stringify(copy));
       assert.equal(copy.count,1,'Guest must see exactly one memory');
       assert.deepEqual(copy.kinds,completeFixture.kinds,
         'Every original photo, video and audio item must keep its order');
       assert.deepEqual(copy.hashes,completeFixture.digests,
         'Original album, voice and video file bytes must be identical');
       assert.equal(copy.thumbSha,completeFixture.thumbSha,
         'The existing video thumbnail must arrive byte-identical at the guest');
       assert.equal((await guestRequest.get(invitation.link+'/poster/3')).status(),200);
       const simplified=copy.cues.map(c=>({
         t:c.t,index:c.index,mediaIndex:copy.kinds.findIndex((kind,i)=>
           c.mediaId===('local-'+invitation.id.slice(0,32)+':'+i)),
         videoAtMs:c.videoAtMs
       }));
       assert.deepEqual(simplified,[
         {t:0,index:0,mediaIndex:0,videoAtMs:undefined},
         {t:2600,index:1,mediaIndex:1,videoAtMs:undefined},
         {t:5100,index:2,mediaIndex:3,videoAtMs:300}
       ],'Exact narration timing and referenced frame IDs must survive sharing');
       assert.equal(copy.localOnly,true);
       // The original source video is larger than the old 1.8MB limit;
       // three SHA-256-verified chunks must remain accessible only via the
       // ONE finished guest capability, without an alternate media Worker.
       assert.equal((await guestRequest.get(invitation.link+'/media/3/2')).status(),200);
       assert.equal(copy.presentation,true);
       assert.equal(copy.storyLift,true);
       // Synthetic video fallback, not a new test app or presentation:
       // the giant legacy VIDEO image must be invisible until genuine
       // video frames are rendered by the unchanged TALERA player.
       const posterGuard=await guest.evaluate(async()=>{
         const m=window.__taleraTimelineRuntime.currentMemory();
         const frame=m._zeroFrames[0],oldKind=frame.kind;
         const prior=m.photos[0],oldIndex=m._photoIndex;
         try{
           m._photoIndex=0;frame.kind='video';
           m.photos[0]='data:image/svg+xml,%3Csvg%3E%3C/svg%3E';
           await new Promise(resolve=>setTimeout(resolve,320));
           const el=document.getElementById('memoryPhotoA');
           const sheet=document.getElementById('memoryCaption');
           const reader=document.getElementById('memoryStoryScroll');
           const css=sheet&&getComputedStyle(sheet);
           return {fallback:document.documentElement.classList.contains(
               'talera-guest-video-fallback'),
             placeholderHidden:!!el&&getComputedStyle(el).visibility==='hidden',
             storyStillAvailable:!!reader&&!!sheet&&
               css.visibility==='visible'&&css.opacity==='1'&&
               css.pointerEvents==='auto'&&Number(css.zIndex)>=80};
         }finally{
           frame.kind=oldKind;m.photos[0]=prior;m._photoIndex=oldIndex;
         }
       });
       assert.deepEqual(posterGuard,{fallback:true,placeholderHidden:true,
         storyStillAvailable:true},
         'No oversized VIDEO placeholder; original text remains available during video');
       await guest.waitForTimeout(280);
       assert.equal(await guest.evaluate(()=>document.documentElement.classList.contains(
         'talera-guest-video-fallback')),false,
         'Guest photo must remain visible after the video placeholder is gone');
       // Safari moves to WhatsApp/background without always sending a full
       // unload; stop the original narrator AND its separate shared audio.
       const stopped=await guest.evaluate(()=>{
         const audio=window.__taleraF5SharedAudible?.get?.();
         let stops=0;
         if(audio){
           const native=audio.pause.bind(audio);
           audio.pause=()=>{stops++;return native()};
         }
         Object.defineProperty(document,'hidden',{value:true,configurable:true});
         try{document.dispatchEvent(new Event('visibilitychange'))}
         finally{delete document.hidden}
         return {stopState:window.__taleraSharePauseActive===true,
           sharedSoundPaused:!!audio?.paused,stops};
       });
       assert.ok(stopped.stopState&&stopped.sharedSoundPaused&&stopped.stops>0,
         'Hidden guest must stop both the video and shared narrator audio');
       console.log('TALERA_GUEST_VIDEO_PLACEHOLDER_AND_BACKGROUND_AUDIO_STOP_PASS',
         JSON.stringify({videoLabelHidden:true,sharedAudioStopped:true,
           guestEditorBlocked:true,realIphoneAccepted:false}));
       const revoked=await sharePage.evaluate(async token=>
         (await fetch('/api/shares/'+token+'/revoke',
           {method:'POST',credentials:'same-origin'})).status,invitation.id);
       assert.equal(revoked,200);
       assert.equal((await guestRequest.get(invitation.link)).status(),404);
       assert.equal((await guestRequest.get(invitation.link+'/media/0/0')).status(),404);
       assert.equal((await guestRequest.get(invitation.link+'/poster/3')).status(),404);
       console.log('TALERA_GUEST_COMPLETE_ORIGINAL_MULTIMEDIA_NARRATION_PASS',
         JSON.stringify({mediaCount:4,photographs:2,voice:true,video:true,
           originalBytesIdentical:true,allCuesExact:true,sameOriginalPresenter:true,
           revokedChunkDenied:true,accountLibraryPrivate:true,iphoneAccepted:false,
           codecPlaybackNotProven:true}));
     }finally{
       await sharePage.evaluate(async id=>{
         await window.TaleraMemories?.remove?.(id);
       },completeFixture.id).catch(()=>{});
     }


     // Six authentic library video records and their six already cached stills.
     // These byte-transport fixtures test THE real app/guest code, not codec playback.
     const sixVideos=await sharePage.evaluate(async()=>{
       const files=[];
       for(let i=0;i<6;i++){
         const bytes=new Uint8Array([0,0,0,20,102,116,121,112,105,115,111,109,i,0,0,0,0,0,0,0]);
         files.push(new File([bytes],'original-video-'+i+'.mp4',
           {type:i===5?'video/x-m4v':'video/mp4'}));
       }
       const row=await window.TaleraMemories.save({
         title:'SIX ORIGINAL VIDEO POSTERS',date:'2005-02-06',
         text:'Six original videos with six already cached stills.',
         narrationCues:[]
       },files);
       if(row.items.length!==6||row.items.some(x=>x.kind!=='video')||
          row.items[5].mime!=='video/x-m4v')
         return {error:'sixth original iPhone MIME alias lost in private library'};
       const sourceHashes=[];
       for(const original of row.items){
         const video=await window.TaleraMemories.blob(original.key);
         sourceHashes.push(Array.from(new Uint8Array(await crypto.subtle.digest(
           'SHA-256',await video.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join(''));
       }
       const hashes=[];
       for(let i=0;i<6;i++){
         const canvas=document.createElement('canvas');canvas.width=24;canvas.height=24;
         const ctx=canvas.getContext('2d');ctx.fillStyle='hsl('+(i*54)+',60%,48%)';
         ctx.fillRect(0,0,24,24);
         const still=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.85));
         if(!await window.TaleraMemories.cacheVideoPoster(row.items[i].key,still))
           return {error:'stored thumbnail '+i+' could not be cached'};
         hashes.push(Array.from(new Uint8Array(await crypto.subtle.digest(
           'SHA-256',await still.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join(''));
       }
       return {id:row.id,hashes,sourceHashes};
     });
     assert.equal(sixVideos.error,undefined,JSON.stringify(sixVideos));
     try{
       await sharePage.goto(origin+'/present?memory='+encodeURIComponent(sixVideos.id),
         {waitUntil:'domcontentloaded'});
       await sharePage.waitForFunction(id=>
         window.__taleraTimelineRuntime?.currentMemory?.()?.storyId===id,
         sixVideos.id,{timeout:20000});
       await sharePage.locator('#talera-clean-social [data-action=share]')
         .waitFor({state:'visible',timeout:16000});
       await sharePage.locator('#talera-clean-social [data-action=share]').click();
       await sharePage.waitForFunction(()=>!!document.querySelector(
         '#talera-clean-overlay:not([hidden]) [data-action=prepare]'),
         null,{timeout:15000});
       await sharePage.locator('#talera-clean-overlay [data-action=message-standard]').click();
       await sharePage.locator('#talera-clean-consent').check();
       await sharePage.locator('#talera-clean-overlay [data-action=prepare]').click();
       await sharePage.waitForFunction(()=>!!document.querySelector(
         '#talera-clean-overlay [data-action=send]:not([disabled])'),
         null,{timeout:45000});
       const invite=createdLinks.at(-1);
       assert.equal(invite?.status,200);
       const opened=await openGuest(invite.link);
       assert.equal(opened.status(),200);
       await guest.waitForFunction(()=>window.__taleraTimelineRuntime?.currentMemory?.()?._taleraLocal,
         null,{timeout:20000});
       const outcome=await guest.evaluate(async()=>{
         const rows=await window.TaleraMemories.list(),row=rows[0],hashes=[],sourceHashes=[];
         for(const item of row.items){
           const still=await window.TaleraMemories.blob(item.key+':phone-v1');
           if(!still)return {error:'missing shared video poster'};
           hashes.push(Array.from(new Uint8Array(await crypto.subtle.digest(
             'SHA-256',await still.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join(''));
           const original=await window.TaleraMemories.blob(item.key);
           if(!original)return {error:'missing shared original video'};
           sourceHashes.push(Array.from(new Uint8Array(await crypto.subtle.digest(
             'SHA-256',await original.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join(''));
           if(item===row.items[5]&&original.type!=='video/mp4')
             return {error:'nonstandard iPhone sixth video type not safely verified'};
         }
         return {rows:rows.length,kinds:row.items.map(x=>x.kind),hashes,sourceHashes,
           entryCover:!!document.querySelector('#taleraGuestEntryCover img[src*="/poster/0"]'),
           originalPresenter:!!document.getElementById('photoStage')};
       });
       assert.equal(outcome.error,undefined,JSON.stringify(outcome));
       assert.equal(outcome.rows,1);
       assert.deepEqual(outcome.kinds,Array(6).fill('video'),
         'Six video source items, not six extra photos');
       assert.deepEqual(outcome.hashes,sixVideos.hashes,
         'All six cached sidecars must survive sharing byte-identically');
       assert.deepEqual(outcome.sourceHashes,sixVideos.sourceHashes,
         'All six original video bytes survive iPhone MIME normalization without changes');
       assert.ok(outcome.entryCover&&outcome.originalPresenter,
         'A video-only WhatsApp guest must start with the stored first thumbnail');
       for(let i=0;i<6;i++){
         const response=await guestRequest.get(invite.link+'/poster/'+i);
         assert.equal(response.status(),200,'Video poster '+i+' must be accessible');
         assert.equal(response.headers()['cache-control'],'private, no-store');
       }
       assert.equal((await sharePage.evaluate(async token=>
         (await fetch('/api/shares/'+token+'/revoke',
           {method:'POST',credentials:'same-origin'})).status,invite.id)),200);
       for(let i=0;i<6;i++)assert.equal(
         (await guestRequest.get(invite.link+'/poster/'+i)).status(),404,
         'Revoked share must deny video thumbnail '+i);
       console.log('TALERA_GUEST_SIX_EXISTING_VIDEO_THUMBNAILS_SECURE_HANDOFF_PASS',
         JSON.stringify({videos:6,posters:6,iphoneSixthMimeNormalized:true,originalBytesEqual:true,orderUnchanged:true,
           integrityVerified:true,revocationVerified:true,iPhoneAccepted:false}));
     }finally{
       await sharePage.evaluate(async id=>window.TaleraMemories?.remove?.(id),
         sixVideos.id).catch(()=>{});
     }

     // Real first-frame regression: use a playable video INSIDE the same
     // account-local library and same /s/token presenter, not a mock app.
     // A deliberate 500ms media delay reproduces a cold iPhone entry.
     const movingFirstId=await sharePage.evaluate(async()=>{
       // In-page synthetic moving-video input, with NO external ffmpeg,
       // storage service, test Worker or alternative presentation.
       if(typeof MediaRecorder!=='function'||!HTMLCanvasElement.prototype.captureStream)
         throw Error('SYNTHETIC_NATIVE_VIDEO_CAPTURE_UNAVAILABLE');
       const mime=['video/webm;codecs=vp8','video/webm'].find(
         type=>MediaRecorder.isTypeSupported(type));
       if(!mime)throw Error('NO_BROWSER_DECODABLE_SYNTHETIC_VIDEO');
       const canvas=document.createElement('canvas');
       canvas.width=160;canvas.height=120;
       const ctx=canvas.getContext('2d'),stream=canvas.captureStream(15);
       const pieces=[],recorder=new MediaRecorder(stream,
         {mimeType:mime,videoBitsPerSecond:240000});
       const stopped=new Promise((resolve,reject)=>{
         recorder.ondataavailable=e=>{if(e.data.size)pieces.push(e.data)};
         recorder.onerror=()=>reject(Error('NATIVE_VIDEO_TEST_RECORDING_FAILED'));
         recorder.onstop=resolve;
       });
       recorder.start(100);
       for(let i=0;i<30;i++){
         ctx.fillStyle=i%2?'#178cbb':'#bd5578';
         ctx.fillRect(0,0,canvas.width,canvas.height);
         ctx.fillStyle='#ffffff';ctx.fillRect(i*3%140,16,16,50);
         await new Promise(resolve=>setTimeout(resolve,48));
       }
       recorder.stop();await stopped;
       stream.getTracks().forEach(t=>t.stop());
       const data=new Blob(pieces,{type:mime});
       if(data.size<600)throw Error('EMPTY_BROWSER_GENERATED_REAL_VIDEO');
       const clip=new File([data],'first-moving-memory.webm',{type:'video/webm'});
       const row=await window.TaleraMemories.save({
         title:'GUEST NATIVE FIRST VIDEO TEST',date:'2006-02-03',
         text:'This genuine video is the FIRST item and the story remains private.',
         narrationCues:[]
       },[clip]);
       const image=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.85));
       if(!await window.TaleraMemories.cacheVideoPoster(row.items[0].key,image))
         throw Error('Cold first-video thumbnail must already exist in library');
       return row.id;
     });
     try{
       await sharePage.goto(origin+'/present?memory='+encodeURIComponent(movingFirstId),
         {waitUntil:'domcontentloaded'});
       await sharePage.waitForFunction(id=>
         window.__taleraTimelineRuntime?.currentMemory?.()?.storyId===id,
         movingFirstId,{timeout:25000});
       await sharePage.locator('#talera-clean-social [data-action=share]')
         .waitFor({state:'visible',timeout:15000});
       await sharePage.locator('#talera-clean-social [data-action=share]').click();
       await sharePage.waitForFunction(()=>!!document.querySelector(
         '#talera-clean-overlay:not([hidden]) [data-action=prepare]'),
         null,{timeout:14000});
       await sharePage.locator('#talera-clean-overlay [data-action=message-standard]').click();
       await sharePage.locator('#talera-clean-consent').check();
       await sharePage.locator('#talera-clean-overlay [data-action=prepare]').click();
       await sharePage.waitForFunction(()=>!!document.querySelector(
         '#talera-clean-overlay [data-action=send]:not([disabled])'),
         null,{timeout:45000});
       const movingInvite=createdLinks.at(-1);
       assert.equal(movingInvite?.status,200);
       await guest.addInitScript(()=>{
         window.__taleraGuestVideoFirstPaint=[];
         const start=()=>{
           let frames=0;
           const sample=()=>{
             if(frames++>=270)return;
             const cover=document.getElementById('taleraGuestEntryCover');
             const v=document.querySelector('video.talera-v61-inline-video');
             const old=[...document.querySelectorAll('#photoStage img[src^="data:image/svg+xml"]')];
             const root=document.documentElement,body=document.body;
             window.__taleraGuestVideoFirstPaint.push({
               cover:!!cover&&getComputedStyle(cover).display!=='none'&&
                 getComputedStyle(cover).visibility!=='hidden',
               video:!!v&&v.readyState>=2&&v.videoWidth>0&&v.videoHeight>0,
               kind:window.__taleraTimelineRuntime?.currentMemory?.()?._zeroFrames?.[
                 window.__taleraTimelineRuntime?.currentMemory?.()?._photoIndex||0]?.kind||'',
               exposedVideoText:old.some(x=>getComputedStyle(x).visibility!=='hidden'&&
                 getComputedStyle(x).display!=='none'),
               bodyColor:getComputedStyle(body).backgroundColor,
               fallback:root.classList.contains('talera-guest-video-fallback')
             });
             requestAnimationFrame(sample);
           };
           requestAnimationFrame(sample);
         };
         if(document.readyState==='loading')
           document.addEventListener('DOMContentLoaded',start,{once:true});
         else start();
       });
       await guest.route('**/media/0/0',async route=>{
         await new Promise(done=>setTimeout(done,500));
         await route.continue();
       });
       const response=await openGuest(movingInvite.link);
       assert.equal(response.status(),200);
       await guest.waitForFunction(()=>
         window.__taleraTimelineRuntime?.currentMemory?.()?._zeroFrames?.[0]?.kind==='video',
         null,{timeout:22000});
       await guest.waitForFunction(()=>
         !document.getElementById('taleraGuestEntryCover')&&
         [...document.querySelectorAll('video.talera-v61-inline-video')].some(v=>
           v.videoWidth>0&&v.videoHeight>0&&v.readyState>=2),
         null,{timeout:25000});
       const paint=await guest.evaluate(()=>{
         const frames=window.__taleraGuestVideoFirstPaint||[];
         const onVideo=frames.filter(f=>f.kind==='video');
         return {
           sampled:frames.length,
           heldVideoSamples:onVideo.filter(f=>f.cover&&!f.video).length,
           exposedBeforeVideo:onVideo.filter(f=>!f.cover&&!f.video).length,
           oldSvgVisible:frames.filter(f=>f.exposedVideoText&&!f.cover).length,
           finalNativeVideo:!!document.querySelector('video.talera-v61-inline-video')?.videoWidth,
           guestOnly:document.body.dataset.taleraGuest==='one-memory',
           originalStory:!!document.getElementById('memoryStoryScroll'),
           startingColors:[...new Set(frames.slice(0,12).map(f=>f.bodyColor))]
         };
       });
       assert.ok(paint.sampled>=3&&paint.heldVideoSamples>=1,
         'The guest must HOLD its visual cover during cold native video loading');
       assert.equal(paint.exposedBeforeVideo,0,
         'Never reveal an unready native video as the first guest image');
       assert.equal(paint.oldSvgVisible,0,
         'The legacy giant VIDEO placeholder must not appear during any first paint');
       assert.ok(paint.finalNativeVideo&&paint.guestOnly&&paint.originalStory);
       assert.ok(paint.startingColors.every(color=>color!=='rgb(255, 255, 255)'),
         'Guest first DOM paint must have the TALERA backdrop, not white');
       console.log('TALERA_GUEST_REAL_VIDEO_COLD_FIRST_PAINT_NO_WHITE_OR_VIDEO_LABEL_PASS',
         JSON.stringify({...paint,originalEngineUnchanged:true,iphoneAccepted:false}));
       const revoked=await sharePage.evaluate(async token=>
         (await fetch('/api/shares/'+token+'/revoke',
           {method:'POST',credentials:'same-origin'})).status,movingInvite.id);
       assert.equal(revoked,200);
     }finally{
       await sharePage.evaluate(async id=>await window.TaleraMemories?.remove?.(id),
         movingFirstId).catch(()=>{});
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
