// Technical browser regression of the EXACT generated existing TALERA /sw.js.
// Local loopback fixtures only: never deploy a second app or read owner's media.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {chromium,webkit} from 'playwright';
import {OFFLINE_RUNTIME} from './f5-offline-sw.mjs';
// Exercise the REAL SW's account transition before creating a browser fixture.
// A request may still be awaiting a local logout check when the next login wins.
{
 const first=OFFLINE_RUNTIME.indexOf('async function me(event){');
 const last=OFFLINE_RUNTIME.indexOf('\nasync function auth(request)',first);
 assert.ok(first>=0&&last>first,'Real offline account checker missing');
 const source=OFFLINE_RUNTIME.slice(first,last);
 let entered,release;
 const paused=new Promise(ok=>{release=ok});
 const started=new Promise(ok=>{entered=ok});
 const Response=class{
  constructor(body,opts={}){this.status=opts.status||200;this.body=body}
 };
 const state={epoch:0,grant:{id:'old-account'},locks:0};
 const scope={...state,Response,
  finishLogout:async()=>{entered();await paused;return true},
  // Mirror the actual SW's account-store read used by stale response mapping.
  read:async key=>scope[key],
  lock:async()=>{scope.locks++;scope.grant=null;scope.epoch++},
  fetch:async()=>new Response('{"ok":false}',{status:401})
 };
 const checker=new Function('scope','with(scope){'+source+';return me;}')(scope);
 const request=checker({request:'/api/me',waitUntil:()=>{}});
 await started;
 scope.epoch++;
 scope.grant={id:'new-account'};
 release();
 const answer=await request;
 assert.equal(answer.status,409,'Old preflight must not authorize a late guest response');
 assert.equal(scope.grant.id,'new-account','New local account was erased by stale preflight');
 assert.equal(scope.locks,0,'Old preflight requested account lock after newer login');
 console.log('TALERA_OFFLINE_STALE_PREFLIGHT_NEWER_ACCOUNT_PROTECTED_PASS');
}
// Same actual TALERA offline invitation on an iOS service-worker update.
// Verify a page that first sees the OLD worker prepares the replacement too.
{
 const source=readFileSync('r20-dev/free-10m-f5/f5-worker.mjs','utf8');
 const literal=source.match(/const OFFLINE_PREPARE_SNIPPET=("(?:\\.|[^"\\])*");/);
 assert.ok(literal,'Approved private page offline preparation snippet missing');
 const html=JSON.parse(literal[1]);
 const script=/<script[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
 assert.ok(script,'Existing private offline preparation script missing');
 const seen=[],listeners=new Map();
 let active={postMessage:data=>seen.push(['old',data.type])};
 const serviceWorker={
  ready:Promise.resolve({get active(){return active}}),
  addEventListener:(type,fn)=>listeners.set(type,fn)
 };
 new Function('navigator',script)({serviceWorker});
 await new Promise(ok=>setImmediate(ok));
 assert.deepEqual(seen,[['old','TALERA_OFFLINE_PREPARE_V1']],
  'Initial verified active service worker did not receive offline prepare');
 active={postMessage:data=>seen.push(['new',data.type])};
 assert.equal(typeof listeners.get('controllerchange'),'function',
  'A replacement iPhone PWA worker cannot receive offline preparation');
 listeners.get('controllerchange')();
 await new Promise(ok=>setImmediate(ok));
 assert.deepEqual(seen,[
  ['old','TALERA_OFFLINE_PREPARE_V1'],
  ['new','TALERA_OFFLINE_PREPARE_V1']
 ],'Replacement service worker missed same-account offline preparation');
 console.log('TALERA_OFFLINE_CONTROLLERCHANGE_PREPARE_PASS');
}
const {verifiedPublicSupport}=await import('./generated/public-template-map.mjs');
const swPath=verifiedPublicSupport['/sw.js'];
assert.match(swPath,/^\/__talera_free\/f5support\/[a-f0-9]{64}\.js$/);
const sw=readFileSync(path.join('r20-dev/free-10m-delivery/public',swPath.slice(1)));
const manifestPath=verifiedPublicSupport['/manifest.webmanifest'];
assert.ok(manifestPath,'Approved PWA manifest missing');
const manifest=JSON.parse(readFileSync(path.join('r20-dev/free-10m-delivery/public',manifestPath.slice(1)),'utf8'));
const installStart=new URL(manifest.start_url,'http://127.0.0.1:8872');
assert.equal(installStart.origin,'http://127.0.0.1:8872','Install route must stay within one same-origin TALERA app');
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const at='http://127.0.0.1:8872';
// WebKit's Playwright offline flag can abort navigation before SW responds.
// For WebKit disconnect the SAME synthetic origin's actual transport instead.
const webkitTransportOnly=process.env.TALERA_OFFLINE_BROWSER==='webkit';
let server,browser,activePage,requests=0,serverLogouts=0,offlineBackend=false,offlineBlocked=0;const trace=[];
let releaseStaleGuestCheck=null,markStaleGuestCheckStarted;
const staleGuestCheckStarted=new Promise(ok=>{markStaleGuestCheckStarted=ok});
const account=req=>{
 const c=req.headers.cookie||'';
 return c.includes('sid=A')?A:c.includes('sid=B')?B:null;
};
function documentPage(req,id){
 const which=req.url?.split('?')[0]||'/';
 const title=id?'PRIVATE '+id+' '+which:'ANONYMOUS';
 // The REAL F5 Worker inserts offline preparation ONLY in authenticated HTML.
 const privatePrepare=id?'<script>(function(){if(!("serviceWorker" in navigator))return;'+
  'navigator.serviceWorker.ready.then(r=>r.active?.postMessage({type:"TALERA_OFFLINE_PREPARE_V1"})).catch(()=>{})})();</script>':'';
 const body='<!doctype html><html lang="nl"><head><meta charset="utf-8"></head><body>'+
  '<h1>'+title+'</h1>'+privatePrepare+'</body></html>';
 return body;
}
function fixture(req,res){
 requests++;
 // Chromium may leave Service Worker fetches online despite Playwright offline mode.
 // Block backend transport too, preserving the genuine offline-logout contract.
 if(offlineBackend){offlineBlocked++;req.socket.destroy();return}
 const pathname=new URL(req.url,at).pathname,id=account(req);
 if(['/mijn-leven','/present','/tell','/__f5/backup','/api/me','/api/login','/api/logout'].includes(pathname))
  trace.push({path:pathname,method:req.method,verified:!!id});
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
 // Hold a signed-out account reply until a later valid login is prepared.
 // Both tabs use the SAME existing TALERA service worker and test origin.
 if(pathname==='/api/me'&&req.headers['x-talera-delayed-guest-check']==='yes'&&!id){
  releaseStaleGuestCheck=()=>{
   res.writeHead(401,{'content-type':'application/json','cache-control':'no-store'});
   res.end('{"ok":false}');
  };
  markStaleGuestCheckStarted();
  return;
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
async function waitReady(page,id){
 let last;
 for(let i=0;i<260;i++){
  last=await state(page);
  if(last.account===id&&last.ready===id&&last.pageEncrypted&&last.keyExtractable===false)
   return last;
  await new Promise(ok=>setTimeout(ok,150));
 }
 throw Error('OFFLINE_PREPARATION_INCOMPLETE '+JSON.stringify(last));
}
try{
 server=createServer(fixture);await new Promise(ok=>server.listen(8872,'127.0.0.1',ok));
 browser=process.env.TALERA_OFFLINE_BROWSER==='webkit'?
  await webkit.launch():await chromium.launch();
 const ctx=await browser.newContext({serviceWorkers:'allow'});
 const page=await ctx.newPage();activePage=page;
 // Only for the WebKit diagnostic: fail clearly rather than hanging on a
 // disconnected network during service-worker navigation. No app changes.
 if(webkitTransportOnly)page.setDefaultNavigationTimeout(15000);
 await page.goto(at+'/mijn-leven');
 await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js',{scope:'/'});
  await navigator.serviceWorker.ready});
 await page.reload();
 const side=await ctx.newPage();
 await side.goto(at+'/mijn-leven');
 assert.equal(await side.evaluate(()=>!!navigator.serviceWorker.controller),true,
  'Second tab must use the SAME original service worker');
 const staleGuestMe=side.evaluate(async()=>{
  const r=await fetch('/api/me',{credentials:'same-origin',
   headers:{'x-talera-delayed-guest-check':'yes'}});
  return r.status;
 });
 await staleGuestCheckStarted;
 await page.evaluate(async()=>{const r=await fetch('/api/login',{method:'POST',
  credentials:'same-origin',headers:{'content-type':'application/json'},
  body:JSON.stringify({account:'A'})});if(!r.ok)throw Error('LOGIN_A_FAILED')});
 await page.reload();
 await waitReady(page,A);
 const initial=await state(page);
 // Safe diagnostic: only synthetic account IDs and state booleans.
 // Distinguish a missing grant from a race or an absent SW controller.
 const controller=await page.evaluate(()=>!!navigator.serviceWorker.controller);
 console.log('TALERA_OFFLINE_A_PRECHECK',JSON.stringify({initial,controller,trace:trace.slice(-24),page:(await page.locator('h1').innerText())}));
 assert.equal(initial.account,A,'Local encrypted grant vanished immediately after readiness');assert.equal(initial.ready,A);
 assert.equal(initial.keyExtractable,false);assert.equal(initial.pageEncrypted,true);
 assert.equal(typeof releaseStaleGuestCheck,'function');
 releaseStaleGuestCheck();
 assert.equal(await staleGuestMe,409,
  'A delayed guest 401 must not invalidate a newer verified account login');
 const afterStale=await state(page);
 assert.equal(afterStale.account,A,'Stale guest request erased valid offline account');
 assert.equal(afterStale.ready,A,'Stale guest request erased local offline readiness');
 await side.close();
 const cached=await page.evaluate(()=>caches.match('/mijn-leven').then(x=>!!x));
 assert.equal(cached,false,'Private HTML must NEVER be stored unencrypted in CacheStorage');
 offlineBackend=true;
 if(!webkitTransportOnly)await ctx.setOffline(true);
 await page.goto(at+'/mijn-leven');
 assert.match(await page.locator('h1').innerText(),/PRIVATE 11111111/);
 await page.goto(at+'/tell');
 assert.match(await page.locator('h1').innerText(),/PRIVATE 11111111/);
 await page.goto(at+'/present?talera_menu=hub');
 assert.match(await page.locator('h1').innerText(),/PRIVATE 11111111/);
 await page.goto(installStart.href);
 assert.match(await page.locator('h1').innerText(),/PRIVATE 11111111/,
  'Installed PWA must reopen its ACTUAL approved manifest start URL offline');
 await page.goto(at+'/__f5/backup');
 assert.match(await page.locator('h1').innerText(),/PRIVATE 11111111/);
 const me=await page.evaluate(async()=>{const r=await fetch('/api/me');return r.json()});
 assert.equal(me.account.id,A);
 const logout=await page.evaluate(async()=>{const r=await fetch('/api/logout',{method:'POST',credentials:'same-origin',
  headers:{'content-type':'application/json'},body:'{}'});return r.json()});
 assert.equal(logout.ok,true);
 assert.equal((await state(page)).pending,true,'Offline logout must remain pending until reconnect');
 assert.equal(serverLogouts,0,'Offline logout must not reach the account server while disconnected');
 assert.ok(offlineBlocked>0,'Offline logout must attempt the disconnected backend');
 const denied=await page.goto(at+'/mijn-leven');
 assert.equal(denied.status(),503,'Local logout MUST block offline private page');
 offlineBackend=false;
 if(!webkitTransportOnly)await ctx.setOffline(false);
 await page.goto(at+'/mijn-leven');
 assert.match(await page.locator('h1').innerText(),/ANONYMOUS/);
 assert.ok(serverLogouts>=1,'Pending offline logout must revoke the server session online');
 await page.evaluate(async()=>{const r=await fetch('/api/login',{method:'POST',
  credentials:'same-origin',headers:{'content-type':'application/json'},
  body:JSON.stringify({account:'B'})});if(!r.ok)throw Error('LOGIN_B_FAILED')});
 await page.reload();
 await waitReady(page,B);
 if(!webkitTransportOnly)await ctx.setOffline(true);
 offlineBackend=true;
 await page.goto(at+'/mijn-leven');
 assert.match(await page.locator('h1').innerText(),/PRIVATE 22222222/);
 assert.doesNotMatch(await page.locator('h1').innerText(),/11111111/);
 assert.equal((await state(page)).account,B);
 console.log('TALERA_F5_ENCRYPTED_OFFLINE_COLD_START_ACCOUNT_LOGOUT_SWITCH_PASS',
  JSON.stringify({sameServiceWorker:true,accountAOffline:true,accountBOffline:true,
   encryptedShell:true,plainPrivatePageCached:false,offlineLogoutBlocks:true,
   reconnectRevokesSession:true,separateUserAppCreated:false,actualIphoneTested:false,requestCount:requests}));
 await ctx.close();
}catch(error){
 // The diagnostic is bounded, synthetic and strictly read-only. A red test
 // must show whether failure preceded login, local preparation or offline navigation.
 let local=null,controller=null,location=null;
 if(activePage&&!activePage.isClosed()){
  try{local=await state(activePage)}catch(e){local='unavailable:'+String(e)}
  try{controller=await activePage.evaluate(()=>!!navigator.serviceWorker.controller)}catch{}
  try{location=activePage.url()}catch{}
 }
 console.error('TALERA_OFFLINE_FAILURE_DIAGNOSTIC',JSON.stringify({
  error:String(error),local,controller,location,requests,serverLogouts,
  offlineBackend,offlineBlocked,trace:trace.slice(-80)
 }));
 throw error;
}finally{
 if(browser)await browser.close();
 if(server)await new Promise(ok=>server.close(ok));
}
