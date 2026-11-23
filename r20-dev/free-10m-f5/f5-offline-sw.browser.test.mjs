// Technical browser regression of the EXACT generated existing TALERA /sw.js.
// Local loopback fixtures only: never deploy a second app or read owner's media.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const {verifiedPublicSupport}=await import('./generated/public-template-map.mjs');
const swPath=verifiedPublicSupport['/sw.js'];
assert.match(swPath,/^\/__talera_free\/f5support\/[a-f0-9]{64}\.js$/);
const sw=readFileSync(path.join('r20-dev/free-10m-delivery/public',swPath.slice(1)));
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const at='http://127.0.0.1:8872';
let server,browser,requests=0,serverLogouts=0;
const account=req=>{
 const c=req.headers.cookie||'';
 return c.includes('sid=A')?A:c.includes('sid=B')?B:null;
};
function documentPage(req,id){
 const which=req.url?.split('?')[0]||'/';
 const title=id?'PRIVATE '+id+' '+which:'ANONYMOUS';
 const body='<!doctype html><html lang="nl"><head><meta charset="utf-8"></head><body>'+
  '<h1>'+title+'</h1><script>(function(){if(!("serviceWorker" in navigator))return;'+
  'navigator.serviceWorker.ready.then(r=>r.active?.postMessage({type:"TALERA_OFFLINE_PREPARE_V1"})).catch(()=>{})})();</script>'+
  '</body></html>';
 return body;
}
function fixture(req,res){
 requests++;
 const pathname=new URL(req.url,at).pathname,id=account(req);
 if(req.method==='POST'&&pathname==='/api/login'){
  let input='';req.on('data',b=>input+=b);req.on('end',()=>{
   const selected=JSON.parse(input||'{}').account;
   res.setHeader('set-cookie','sid='+(selected==='B'?'B':'A')+'; HttpOnly; SameSite=Lax; Path=/');
   res.setHeader('content-type','application/json');res.end('{"ok":true}');
  });return;
 }
 if(req.method==='POST'&&pathname==='/api/logout'){
  serverLogouts++;
  res.setHeader('set-cookie','sid=; HttpOnly; Max-Age=0; Path=/');
  res.setHeader('content-type','application/json');res.end('{"ok":true}');
  return;
 }
 if(pathname==='/sw.js'){
  res.writeHead(200,{'content-type':'text/javascript','service-worker-allowed':'/'});
  res.end(sw);return;
 }
 if(pathname==='/api/me'){
  res.writeHead(id?200:401,{'content-type':'application/json','cache-control':'no-store'});
  res.end(id?JSON.stringify({ok:true,account:{id,displayName:id===A?'A':'B'}}):'{"ok":false}');return;
 }
 if(pathname.startsWith('/__f5/')&&pathname.endsWith('.mjs')){
  res.writeHead(id?200:401,{'content-type':'text/javascript','cache-control':'private, no-store'});
  res.end(id?'export const sameTaleraBackupModule=true;':'unauthorized');return;
 }
 if(['/mijn-leven','/meldingen','/present','/tell','/__f5/backup','/vertelmodus-embed'].includes(pathname)){
  res.writeHead(200,{'content-type':'text/html; charset=utf-8',
   'cache-control':'private, no-store','content-security-policy':"script-src 'self' 'unsafe-inline'",
   ...(id?{'x-talera-offline-account':id,'x-talera-free-f5':'personalized-durable-account'}:
   {'x-talera-free-f5':'anonymous-snapshot-only'})});
  res.end(documentPage(req,id));return;
 }
 res.writeHead(404).end();
}
const state=async page=>page.evaluate(async()=>{
 const db=await new Promise((ok,bad)=>{
  const r=indexedDB.open('talera-f5-offline-shell-v1',1);
  r.onsuccess=()=>ok(r.result);r.onerror=()=>bad(r.error);
 });
 try{
  const tx=db.transaction('shell','readonly');
  const get=key=>new Promise((ok,bad)=>{
   const r=tx.objectStore('shell').get(key);
   r.onsuccess=()=>ok(r.result);r.onerror=()=>bad(r.error);
  });
  const [grant,ready,pageRecord,pending]=await Promise.all([
   get('grant'),get('ready'),get('page:/tell'),get('pending-logout')]);
  return {account:grant?.id,keyExtractable:grant?.key?.extractable,
   ready:ready?.id,pageEncrypted:pageRecord?.bytes instanceof ArrayBuffer,
   pending:!!pending};
 }finally{db.close()}
});
try{
 server=createServer(fixture);await new Promise(ok=>server.listen(8872,'127.0.0.1',ok));
 browser=await chromium.launch();
 const ctx=await browser.newContext({serviceWorkers:'allow'});
 const page=await ctx.newPage();
 await page.goto(at+'/mijn-leven');
 await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js',{scope:'/'});
  await navigator.serviceWorker.ready});
 await page.reload();
 await page.evaluate(async()=>{const r=await fetch('/api/login',{method:'POST',
  credentials:'same-origin',headers:{'content-type':'application/json'},
  body:JSON.stringify({account:'A'})});if(!r.ok)throw Error('LOGIN_A_FAILED')});
 await page.reload();
 await page.waitForFunction(async()=>{
  const db=await new Promise((ok,bad)=>{const r=indexedDB.open('talera-f5-offline-shell-v1',1);r.onsuccess=()=>ok(r.result);r.onerror=()=>bad(r.error)});
  try{return await new Promise(ok=>{const store=db.transaction('shell','readonly').objectStore('shell'),q=store.get('ready'),g=store.get('grant');let ready,grant;const finish=()=>{if(ready!==undefined&&grant!==undefined)ok(ready==='11111111-1111-4111-8111-111111111111'&&grant===ready)};q.onsuccess=()=>{ready=q.result?.id||null;finish()};g.onsuccess=()=>{grant=g.result?.id||null;finish()};q.onerror=g.onerror=()=>ok(false)})}
  finally{db.close()}
 },null,{timeout:60000});
 const initial=await state(page);
 assert.equal(initial.account,A);assert.equal(initial.ready,A);
 assert.equal(initial.keyExtractable,false);assert.equal(initial.pageEncrypted,true);
 const cached=await page.evaluate(()=>caches.match('/mijn-leven').then(x=>!!x));
 assert.equal(cached,false,'Private HTML must NEVER be stored unencrypted in CacheStorage');
 await ctx.setOffline(true);
 await page.goto(at+'/mijn-leven');
 assert.match(await page.locator('h1').innerText(),/PRIVATE 11111111/);
 await page.goto(at+'/tell');
 assert.match(await page.locator('h1').innerText(),/PRIVATE 11111111/);
 await page.goto(at+'/__f5/backup');
 assert.match(await page.locator('h1').innerText(),/PRIVATE 11111111/);
 const me=await page.evaluate(async()=>{const r=await fetch('/api/me');return r.json()});
 assert.equal(me.account.id,A);
 const logout=await page.evaluate(async()=>{const r=await fetch('/api/logout',{method:'POST',credentials:'same-origin',
  headers:{'content-type':'application/json'},body:'{}'});return r.json()});
 assert.equal(logout.ok,true);
 assert.equal((await state(page)).pending,true);
 const denied=await page.goto(at+'/mijn-leven');
 assert.equal(denied.status(),503,'Local logout MUST block offline private page');
 await ctx.setOffline(false);
 await page.goto(at+'/mijn-leven');
 assert.match(await page.locator('h1').innerText(),/ANONYMOUS/);
 assert.ok(serverLogouts>=1,'Pending offline logout must revoke the server session online');
 await page.evaluate(async()=>{const r=await fetch('/api/login',{method:'POST',
  credentials:'same-origin',headers:{'content-type':'application/json'},
  body:JSON.stringify({account:'B'})});if(!r.ok)throw Error('LOGIN_B_FAILED')});
 await page.reload();
 await page.waitForFunction(async()=>{
  const db=await new Promise((ok,bad)=>{const r=indexedDB.open('talera-f5-offline-shell-v1',1);r.onsuccess=()=>ok(r.result);r.onerror=()=>bad(r.error)});
  try{return await new Promise(ok=>{const store=db.transaction('shell','readonly').objectStore('shell'),q=store.get('ready'),g=store.get('grant');let ready,grant;const finish=()=>{if(ready!==undefined&&grant!==undefined)ok(ready==='22222222-2222-4222-8222-222222222222'&&grant===ready)};q.onsuccess=()=>{ready=q.result?.id||null;finish()};g.onsuccess=()=>{grant=g.result?.id||null;finish()};q.onerror=g.onerror=()=>ok(false)})}
  finally{db.close()}
 },null,{timeout:60000});
 await ctx.setOffline(true);
 await page.goto(at+'/mijn-leven');
 assert.match(await page.locator('h1').innerText(),/PRIVATE 22222222/);
 assert.doesNotMatch(await page.locator('h1').innerText(),/11111111/);
 assert.equal((await state(page)).account,B);
 console.log('TALERA_F5_ENCRYPTED_OFFLINE_COLD_START_ACCOUNT_LOGOUT_SWITCH_PASS',
  JSON.stringify({sameServiceWorker:true,accountAOffline:true,accountBOffline:true,
   encryptedShell:true,plainPrivatePageCached:false,offlineLogoutBlocks:true,
   reconnectRevokesSession:true,separateUserAppCreated:false,actualIphoneTested:false,requestCount:requests}));
 await ctx.close();
}finally{
 if(browser)await browser.close();
 if(server)await new Promise(ok=>server.close(ok));
}
