// Local contract integration against the SAME F5 Worker and existing DOs.
// Synthetic accounts only. No new application, config, binding or deployment.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {rmSync,mkdirSync,existsSync} from 'node:fs';
const here=path.dirname(fileURLToPath(import.meta.url)),port=8879,origin='http://127.0.0.1:'+port;
const gate='1'.repeat(64);
const nonce=randomUUID().replaceAll('-','').slice(0,12);
const persist=path.join(here,'generated','people-link-test-'+nonce);
mkdirSync(persist,{recursive:true});
let logs='',worker;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 worker=spawn(path.resolve('node_modules/.bin/wrangler'),['dev','--local','--ip','127.0.0.1','--port',String(port),
  '--config',path.join(here,'wrangler.jsonc'),'--persist-to',persist,
  '--var','STAGING_F5_KEY:'+gate,'--var','STAGING_ACCESS_KEY:'+'2'.repeat(64),
  '--var','STAGING_SOCIAL_KEY:'+'3'.repeat(64),
  '--var','AUTH_NAMESPACE_KEY:SYNTHETIC_PEOPLE_LINK_TEST_NEVER_PRODUCTION_20261128',
  '--var','DEMO_IDENTITY_KEY:SYNTHETIC_PEOPLE_LINK_SOCIAL_NEVER_PRODUCTION_20261128','--log-level','error'],
  {env:{...process.env,CI:'true',BROWSER:'none'},stdio:['ignore','pipe','pipe']});
 for(const channel of [worker.stdout,worker.stderr])channel.on('data',v=>logs=(logs+v.toString()).slice(-10000));
 let up=false;
 for(let i=0;i<100;i++){
  if(worker.exitCode!==null)throw Error('Worker exited: '+logs);
  try{if((await fetch(origin+'/__f5/health',{signal:AbortSignal.timeout(800)})).ok){up=true;break}}catch{}
  await wait(350);
 }
 assert.ok(up,'Local Worker not ready: '+logs);
 async function register(i){
  const data={email:'people-'+nonce+'-'+i+'@example.invalid',username:'talerap'+nonce+i,displayName:'Synthetic Person '+i,password:'Fake_People_Only_123456!'+i,birthDate:'1980-01-01'};
  const r=await fetch(origin+'/api/register',{method:'POST',headers:{origin,'x-talera-f5-key':gate,'content-type':'application/json','cf-connecting-ip':'192.0.2.'+(80+i)},body:JSON.stringify(data),signal:AbortSignal.timeout(20000)});
  const answer=await r.json();assert.equal(r.status,200,JSON.stringify(answer));
  const cookie=/talera_sid=[a-f0-9]{64}/.exec(r.headers.get('set-cookie')||'')?.[0];assert.ok(cookie);
  return {id:answer.account.id,cookie};
 }
 const [a,b,c]=await Promise.all([register(1),register(2),register(3)]);
 const post=async(user,command,options={})=>{
  const headers={origin,'x-talera-f5-key':gate,'content-type':'application/json','x-talera-expected-account':user?.id||'',...options.headers};
  if(user)headers.cookie=user.cookie;
  const r=await fetch(origin+'/api/people/link',{method:options.method||'POST',headers,...options.method==='GET'?{}:{body:JSON.stringify(command)},signal:AbortSignal.timeout(15000)});
  assert.equal(r.headers.get('cache-control'),'private, no-store');
  return {status:r.status,data:await r.json()};
 };
 const contact=randomUUID(),create={action:'create',contact};
 assert.equal((await post(null,create)).status,401);
 assert.equal((await post(a,create,{headers:{origin:'https://foreign.invalid'}})).status,403);
 assert.equal((await post(a,create,{headers:{'x-talera-expected-account':b.id}})).status,409);
 assert.equal((await post(a,create,{method:'GET'})).status,403);
 const inv=await post(a,create);assert.equal(inv.status,200,JSON.stringify(inv.data));
 assert.ok(!inv.data.invitation.includes(a.id));
 const join={action:'claim',invitation:inv.data.invitation};
 assert.equal((await post(a,join)).status,409);
 const reply=await post(b,join);assert.equal(reply.status,200,JSON.stringify(reply.data));
 assert.equal((await post(b,join)).data.confirmation,reply.data.confirmation);
 assert.equal((await post(c,join)).status,409);
 assert.deepEqual((await post(a,{action:'list',contacts:[contact]})).data.linked,[]);
 const answer={action:'confirm',contact,confirmation:reply.data.confirmation};
 assert.equal((await post(c,answer)).status,409);
 assert.equal((await post(b,{action:'block',other:a.id})).status,200);
 assert.equal((await post(a,answer)).status,409);
 assert.equal((await post(b,{action:'unblock',other:a.id})).status,200);
 assert.equal((await post(a,{...answer,confirmation:'0'.repeat(32)})).status,409);
 assert.deepEqual((await post(a,{...answer,action:'preview'})).data,{ok:true,name:'Synthetic Person 2'});
 assert.deepEqual((await post(a,{action:'list',contacts:[contact]})).data.linked,[]);
 assert.equal((await post(a,answer)).status,200);
 assert.equal((await post(a,answer)).status,200);
 assert.deepEqual((await post(a,{action:'list',contacts:[contact]})).data.linked,[contact]);
 assert.deepEqual((await post(c,{action:'list',contacts:[contact]})).data.linked,[]);
 const inbound=await post(b,{action:'inbound-list',after:null});
 assert.deepEqual(inbound.data.items,[{id:a.id,name:'Synthetic Person 1',blocked:false}]);
 // A linked contact must never create a story or a legacy direct grant.
 const grants=await fetch(origin+'/api/my-grants',{headers:{cookie:a.cookie,'x-talera-f5-key':gate},signal:AbortSignal.timeout(8000)});
 assert.equal(grants.status,200);assert.deepEqual((await grants.json()).items,[]);
 // Actual same Worker, account DO and per-memory DO. Synthetic media bytes
 // prove transport integrity; device playback remains a separate acceptance.
 const share=async(user,body,options={})=>{
  const method=options.method||'POST',headers={origin,'content-type':options.mime||'application/json','x-talera-expected-account':user?.id||''};
  if(user)headers.cookie=user.cookie;
  const r=await fetch(origin+(options.path||'/api/internal-share'),{method,headers,...method==='GET'?{}:{body:options.raw??JSON.stringify(body)},signal:AbortSignal.timeout(15000)});
  assert.equal(r.headers.get('cache-control'),'private, no-store');
  return {status:r.status,data:options.binary&&r.ok?new Uint8Array(await r.arrayBuffer()):await r.json()};
 };
 const expiresAt=Date.now()+3600000;
 const stage={action:'stage',localMemoryId:'synthetic-account-share-'+nonce,requestId:randomUUID(),expiresAt,contacts:[contact],title:'Synthetic complete memory',storyText:'Original text',eventDate:'2025-01-02',consent:true};
 assert.equal((await share(a,{...stage,contacts:[randomUUID()]})).status,409);
 const made=await share(a,stage);assert.equal(made.status,200,JSON.stringify(made.data));
 const k=made.data.key;assert.equal((await share(a,stage)).data.key,k);
 const image=new Uint8Array([255,216,42,255,217]),hash=createHash('sha256').update(image).digest('hex');
 const item='/api/internal-share/item/'+k,upload='/api/internal-share/upload/'+k+'/media/0/0';
 const get=(user,path=item,binary=false)=>share(user,null,{method:'GET',path,binary});
 const list=user=>share(user,{action:'list',direction:'in',after:null});
 const manifest={version:1,items:[{kind:'photo',mediaId:'source:original:1',mime:'image/jpeg',size:image.byteLength,parts:1,hashes:[hash]}],posters:[],narrationCues:[],narrationDurationMs:0};
 const finalize={action:'finalize',key:k,manifest,consent:true};
 assert.equal((await share(a,finalize)).status,409);
 assert.equal((await get(b)).status,404);assert.deepEqual((await list(b)).data.items,[]);
 assert.equal((await share(c,null,{path:upload,mime:'image/jpeg',raw:image})).status,404);
 assert.equal((await share(a,null,{path:upload,mime:'image/jpeg',raw:image})).data.sha256,hash);
 assert.equal((await share(a,finalize)).data.state,'ready');
 assert.equal((await share(a,finalize)).data.state,'ready');
 assert.deepEqual((await get(b)).data.content.manifest,manifest);
 assert.deepEqual((await get(b,item+'/media/0/0',true)).data,image);
 assert.equal((await get(c)).status,404);assert.equal((await get(null)).status,401);
 assert.equal((await list(b)).data.items[0].unread,true);
 assert.equal((await share(b,{action:'seen',key:k})).status,200);
 assert.equal((await share(b,{action:'seen',key:k})).status,200);
 assert.equal((await list(b)).data.items[0].unread,false);
 assert.equal((await post(b,{action:'block',other:a.id})).status,200);
 assert.equal((await get(b)).status,404);
 assert.equal((await post(b,{action:'unblock',other:a.id})).status,200);
 assert.equal((await get(b)).status,200);
 assert.equal((await share(a,{action:'revoke',key:k,contact:null})).status,200);
 assert.equal((await get(b)).status,404);
 console.log('TALERA_F5_INTERNAL_SHARE_EXACT_BYTES_ACCOUNT_INBOX_REVOKE_PASS');
 assert.equal((await post(a,{action:'unlink',contact})).status,200);
 assert.equal((await post(a,answer)).status,409);
 assert.deepEqual((await post(a,{action:'list',contacts:[contact]})).data.linked,[]);
 // Original authenticated discovery remains disabled; no public account listing.
 const discovery=await fetch(origin+'/api/discovery',{headers:{cookie:a.cookie,'x-talera-f5-key':gate},signal:AbortSignal.timeout(8000)});
 assert.equal(discovery.status,200);assert.equal((await discovery.json()).discoverable,false);
 console.log('TALERA_F5_PEOPLE_LINK_REAL_ACCOUNT_DO_PASS');
 // Exercise the same actual app UI and worker (not a second app), only with
 // test accounts and a tiny synthetic original photo. No live requests.
 if(process.env.TALERA_PEOPLE_UI_BROWSER){
  const {chromium,webkit}=await import('playwright');
  const engine=process.env.TALERA_PEOPLE_UI_BROWSER==='webkit'?webkit:chromium;
  const browser=await engine.launch({headless:true,...engine===chromium&&existsSync('/usr/bin/google-chrome')?{channel:'chrome'}:{}});
  try{
   const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/hJkAAAAASUVORK5CYII=';
   const contextFor=async u=>{
    const cx=await browser.newContext({locale:'nl-NL',viewport:{width:390,height:844},extraHTTPHeaders:{'x-talera-f5-key':gate}});
    await cx.addCookies([{name:'talera_sid',value:u.cookie.split('=')[1],url:origin,httpOnly:true,sameSite:'Lax'}]);
    const pg=await cx.newPage();
    pg.on('pageerror',error=>console.log('TALERA_LOCAL_PEOPLE_UI_ERROR',error.message.slice(0,300)));
    const response=await pg.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
    await pg.waitForFunction(account=>window.__taleraMoreMenu?.state()?.accountId===account&&!!window.TaleraMemories?.save,u.id,{timeout:25000});
    return pg;
   };
   const ownerPage=await contextFor(a),readerPage=await contextFor(b);
   const ownRecord=async(pg,title)=>pg.evaluate(async({png,title})=>{
    const file=new File([Uint8Array.from(atob(png),c=>c.charCodeAt(0))],'synthetic.png',{type:'image/png'});
    const row=await window.TaleraMemories.save({title,date:'2024-03-19',text:'Synthetic test only',narrationCues:[]},[file]);
    const saved=await window.TaleraMemories.get(row.id);
    return {id:row.id,media:saved.items[0].key};
   },{png,title});
   const original=await ownRecord(ownerPage,'Internal roundtrip '+nonce);
   const readerOwn=await ownRecord(readerPage,'Reader owns this separate story '+nonce);
   const openPeople=async pg=>{
    await pg.evaluate(()=>window.__taleraMoreMenu.open('people'));
    const panel=pg.locator('[data-talera-people]');await panel.waitFor({timeout:12000});return panel;
   };
   const ownerPeople=await openPeople(ownerPage);
   await ownerPeople.getByRole('button',{name:'Contact toevoegen',exact:true}).click();
   await ownerPeople.locator('[data-people-field="name"]').fill('Synthetic relative');
   await ownerPeople.locator('[data-people-field="phone"]').fill('+31600000123');
   await ownerPeople.getByRole('button',{name:'Opslaan',exact:true}).click();
   await ownerPeople.getByText('Synthetic relative',{exact:true}).waitFor();
   await ownerPeople.getByRole('button',{name:'TALERA koppelen',exact:true}).click();
   await ownerPeople.getByRole('button',{name:'Uitnodiging maken',exact:true}).click();
   const invite=ownerPeople.locator('textarea[readonly]');
   await invite.waitFor({timeout:15000});const invitation=await invite.inputValue();assert.ok(invitation.length>30);
   const readerPeople=await openPeople(readerPage);
   await readerPeople.getByRole('button',{name:'Uitnodiging ontvangen',exact:true}).click();
   await readerPeople.locator('textarea:not([readonly])').fill(invitation);
   await readerPeople.getByRole('button',{name:'Uitnodiging accepteren',exact:true}).click();
   const confirmation=readerPeople.locator('textarea[readonly]');
   await confirmation.waitFor({timeout:15000});
   await ownerPeople.locator('textarea:not([readonly])').fill(await confirmation.inputValue());
   ownerPage.once('dialog',dialog=>dialog.accept());
   await ownerPeople.getByRole('button',{name:'Koppeling bevestigen',exact:true}).click();
   await ownerPeople.getByText('TALERA gekoppeld',{exact:true}).waitFor({timeout:15000});
   await ownerPeople.getByRole('button',{name:'Synthetic relative als favoriet markeren'}).click();
   await ownerPeople.getByRole('button',{name:'Synthetic relative uit favorieten halen'}).waitFor();
   const presentation=await ownerPage.goto(origin+'/present?memory='+original.id,{waitUntil:'domcontentloaded'});
   assert.equal(presentation.status(),200);
   await ownerPage.waitForFunction(id=>window.__taleraTimelineRuntime?.currentMemory()?.storyId===id&&!window.__taleraTimelineRuntime.currentMemory()._photoLoading,original.id,{timeout:25000});
   await ownerPage.waitForFunction(account=>window.__taleraMoreMenu?.state()?.accountId===account,a.id,{timeout:20000});
   await ownerPage.locator('#talera-clean-social [data-action="share"]').click();
   await ownerPage.locator('#talera-clean-panel [data-action="internal-route"]').click({timeout:15000});
   const sendPanel=ownerPage.locator('#talera-clean-panel');
   const check=sendPanel.getByRole('checkbox',{name:/Synthetic relative/});await check.waitFor({timeout:15000});
   const send=sendPanel.getByRole('button',{name:'Herinnering versturen',exact:true});
   assert.equal(await send.isEnabled(),false);
   await sendPanel.getByRole('button',{name:'Iedereen',exact:true}).click();assert.equal(await check.isChecked(),true);
   await sendPanel.getByRole('button',{name:'Wissen',exact:true}).click();assert.equal(await check.isChecked(),false);
   await sendPanel.getByRole('button',{name:'Favorieten',exact:true}).click();assert.equal(await check.isChecked(),true);
   await send.click();
   await sendPanel.getByText('Herinnering klaar voor aflevering.',{exact:true}).waitFor({timeout:30000});
   assert.equal((await list(b)).data.items.length,1);
   assert.deepEqual((await list(c)).data.items,[]);
   const entry=(await list(b)).data.items[0],receivedPath='/api/internal-share/item/'+entry.key;
   await readerPage.bringToFront();
   await readerPage.reload({waitUntil:'domcontentloaded'});
   await readerPage.waitForFunction(account=>window.__taleraMoreMenu?.state()?.accountId===account,b.id,{timeout:20000});
   await readerPage.evaluate(()=>window.__taleraMoreMenu.open('messages'));
   const inbox=readerPage.locator('[data-talera-internal-inbox]');
   const itemButton=inbox.locator('[data-internal-received="'+entry.key+'"]');
   await itemButton.waitFor({timeout:15000});
   assert.ok((await itemButton.innerText()).includes('Internal roundtrip'));
   assert.match(await itemButton.innerText(),/●/);
   await itemButton.click();
   await readerPage.waitForURL('**/present?received='+entry.key,{timeout:30000});
   await readerPage.waitForFunction(key=>!document.documentElement.classList.contains('talera-received-loading')&&window.__taleraTimelineRuntime?.currentMemory()?.storyId==='local-received-'+key,entry.key,{timeout:30000});
   assert.equal(await readerPage.locator('#talera-clean-social').count(),0,'Received story must not be reshared as owner');
   const proof=await readerPage.evaluate(async({id,media})=>{
    const rows=await window.TaleraMemories.list();
    const projection=window.__taleraReceivedPresentationLibrary;
    const [received]=await projection.list();
    return {owned:rows.map(r=>r.id),receivedId:received.id,receivedMedia:received.items[0].key,
     bytes:Array.from(new Uint8Array(await (await projection.blob(media)).arrayBuffer())),canSave:!!projection.save,foundOwned:rows.some(r=>r.id===id)};
   },{id:readerOwn.id,media:original.media});
   assert.deepEqual(proof.owned,[readerOwn.id]);assert.equal(proof.receivedMedia,original.media);assert.equal(proof.canSave,false);
   assert.deepEqual(proof.bytes,[...Buffer.from(png,'base64')]);assert.equal(proof.foundOwned,true);
   assert.equal((await get(b,receivedPath)).status,404,'Receipt must immediately remove server copy for the last recipient');
   await readerPage.locator('#talera-received-control a').click();
   await readerPage.waitForURL('**/meldingen',{timeout:20000});
   await readerPage.waitForFunction(account=>window.__taleraMoreMenu?.state()?.accountId===account,b.id,{timeout:20000});
   await readerPage.evaluate(()=>window.__taleraMoreMenu.open('messages'));
   await itemButton.waitFor({timeout:15000});assert.doesNotMatch(await itemButton.innerText(),/●/);
   await itemButton.click();
   await readerPage.waitForURL('**/present?received='+entry.key,{timeout:20000});
   await readerPage.waitForFunction(key=>!document.documentElement.classList.contains('talera-received-loading')&&window.__taleraTimelineRuntime?.currentMemory()?.storyId==='local-received-'+key,entry.key,{timeout:20000});
   console.log('TALERA_INTERNAL_ACTUAL_UI_ROUNDTRIP_PASS',process.env.TALERA_PEOPLE_UI_BROWSER);
  }finally{await browser.close()}
 }

}catch(e){console.error(logs);throw e}
finally{
 if(worker&&worker.exitCode===null){worker.kill('SIGTERM');await Promise.race([new Promise(r=>worker.once('exit',r)),wait(4000)])}
 rmSync(persist,{recursive:true,force:true});
}
