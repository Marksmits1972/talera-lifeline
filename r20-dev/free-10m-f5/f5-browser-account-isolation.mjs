// TALERA Free F5: actual on-page account switch through the ORIGINAL menu.
// Uses only synthetic local Wrangler DOs and Chromium's real IndexedDB.
// No customer browser/storage, no Cloudflare deploy, no UI design changes.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
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
     const buttons=[...document.querySelectorAll('nav.flow-nav button,nav.flow-nav a')];
     const trigger=buttons.find(n=>/meer|mijn talera|account/i.test(
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
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e?.message||e).slice(0,180)));
 page.on('requestfailed',r=>console.log('TALERA_F5_BROWSER_FAILED_REQUEST',
   r.url().slice(0,200),r.failure()?.errorText));
 page.on('console',m=>{
   if(['error','warning'].includes(m.type()))
     console.log('TALERA_F5_BROWSER_JS_CONSOLE',m.type(),m.text().slice(0,320));
 });
 const start=await page.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
 assert.equal(start.status(),200);
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
 assert.notEqual(a.dbs.find(x=>x?.startsWith('talera-free-local-')),
   b.dbs.find(x=>x?.startsWith('talera-free-local-')),
   'Two signed-in accounts were bound to same local IndexedDB');
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
