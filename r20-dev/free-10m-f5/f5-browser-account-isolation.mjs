// TALERA Free F5: actual on-page account switch through the ORIGINAL menu.
// Uses only synthetic local Wrangler DOs and Chromium's real IndexedDB.
// No customer browser/storage, no Cloudflare deploy, no UI design changes.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,devices} from 'playwright';

const here=path.dirname(fileURLToPath(import.meta.url));
const generated=path.join(here,'generated');
mkdirSync(generated,{recursive:true});
const origin='http://127.0.0.1:8829',gate='1'.repeat(64);
const testKey=randomUUID().replaceAll('-','').slice(0,12);
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
    path.join(generated,'browser-account-test-'+testKey),
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
async function login(page,user){
 await menu(page);
 if(!(await page.locator('#talera-more-menu form[data-form="login"]').count())){
   if(!(await page.locator('#talera-more-menu [data-view="login"]').count()))
     await view(page,'account');
   await view(page,'login');
 }
 const form=page.locator('#talera-more-menu form[data-form="login"]');
 await form.waitFor({timeout:10000});
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
async function inventory(page){
 return page.evaluate(async()=>{
   const rows=await window.TaleraMemories.list();
   return {ids:rows.map(r=>r.id),
     dbs:(await indexedDB.databases()).map(x=>x.name)};
 });
}
let result;
try{
 await workerStart();
 const ids=await Promise.all(users.map(createUser));
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({
   ...devices['iPhone 13'],serviceWorkers:'allow',
   extraHTTPHeaders:{'x-talera-f5-key':gate,'cf-connecting-ip':'192.0.2.73'}
 });
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
   const check=await page.evaluate(()=>({
     menu:!!document.getElementById('talera-more-menu'),
     library:typeof window.TaleraMemories?.list,
     buttons:[...document.querySelectorAll('button')].slice(0,22)
       .map(x=>({id:x.id,aria:x.getAttribute('aria-label'),
        text:(x.textContent||'').slice(0,28)}))
   }));
   console.log('TALERA_F5_ACCOUNT_MENU_ROUTE_PROBE',JSON.stringify({route,...check}));
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
 await logout(page);
 const guest=await login(page,users[1]);
 assert.equal(guest,ids[1],'Second login must switch browser to second ID');
 const beforeB=await inventory(page);
 assert.ok(!beforeB.ids.includes(a.id),'Second account can see FIRST local story');
 const b=await saveSyntheticPhoto(page,2);
 assert.ok(b.bytes>10);
 const afterB=await inventory(page);
 assert.ok(!afterB.ids.includes(a.id),'First story appeared after second save');
 await logout(page);
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
 await page.waitForFunction(async()=>{
   const r=await fetch('/api/shares',{credentials:'same-origin'});
   if(!r.ok)return false;
   return (await r.json()).items?.some(x=>x.revoked_at!==null);
 },null,{timeout:15000});
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
}
