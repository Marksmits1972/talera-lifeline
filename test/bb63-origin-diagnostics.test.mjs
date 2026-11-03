import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const menu=readFileSync(new URL('../src/mijn-talera/menu-integration.txt',import.meta.url),'utf8');
const beginning='async function inspectOriginReadOnly(){';
const ending='\nfunction diagnoseSummaryHtml(){';
const start=menu.indexOf(beginning),end=menu.indexOf(ending,start);
assert.ok(start>0&&end>start,'diagnostics must remain in the existing V62 menu');
const source=menu.slice(start,end);
function execute({known=true,exists=true,supported=true,stories=1,files=10}={}){
 const calls={opens:0,transactions:[],closes:0,network:0,writes:0};
 const db={
  objectStoreNames:{contains:name=>['stories','files'].includes(name)},
  transaction:(names,mode)=>{
   calls.transactions.push({names,mode});
   if(mode!=='readonly')throw Error('A diagnostic database write is forbidden');
   const tx={objectStore:name=>({
    count:()=>({result:name==='stories'?stories:files}),
    get:()=>{calls.writes++;throw Error('No record contents permitted')},
    getAll:()=>{calls.writes++;throw Error('No record contents permitted')}
   })};
   queueMicrotask(()=>tx.oncomplete?.());return tx;
  },
  close:()=>{calls.closes++}
 };
 const idb={
  databases:supported?async()=>exists?[{name:'talera-lifeline-dev-local-v1'}]:[{name:'other-test-db'}]:undefined,
  open:()=>{calls.opens++;if(!exists)throw Error('Must not create a database');
   const req={};queueMicrotask(()=>{req.result=db;req.onsuccess?.()});return req}
 };
 const window={
  indexedDB:known?idb:undefined,
  caches:{keys:async()=>['cache-A']},
  matchMedia:()=>({matches:false})
 };
 const navigator={standalone:false,serviceWorker:{getRegistration:async()=>({scope:'https://test.example/app/'})}};
 const document={querySelector:selector=>{
  if(selector.startsWith('script['))return {getAttribute:()=>'/__clean/menu-integration.mjs?v=abc'};
  if(selector.startsWith('link['))return {getAttribute:()=>'/manifest.webmanifest'};
  return null;
 }};
 const location={origin:'https://test.example',pathname:'/present'};
 const fn=vm.runInNewContext('('+source+')',{window,navigator,document,location},{timeout:1000});
 return {run:()=>fn(),calls};
}
test('only counts locally existing Free records using a read-only transaction',async()=>{
 const fixture=execute({stories:1,files:10});
 const result=await fixture.run();
 assert.equal(result.origin,'https://test.example');
 assert.equal(result.displayMode,'browser');
 assert.equal(result.menuScript,'/__clean/menu-integration.mjs?v=abc');
 assert.equal(result.serviceWorkerScope,'https://test.example/app/');
 assert.equal(result.freeDatabase,'present');
 assert.equal(result.localStories,1);assert.equal(result.localFiles,10);
 assert.equal(result.cacheCount,1);
 assert.equal(fixture.calls.opens,1);
 assert.equal(fixture.calls.closes,1);
 assert.equal(fixture.calls.transactions.length,1);
 assert.equal(fixture.calls.transactions[0].mode,'readonly');
 assert.equal(fixture.calls.writes,0);
 assert.equal(fixture.calls.network,0);
});
test('missing Free DB returns zeros without opening or creating IndexedDB',async()=>{
 const fixture=execute({exists:false});
 const result=await fixture.run();
 assert.equal(result.freeDatabase,'not_present');
 assert.equal(result.localStories,0);
 assert.equal(result.localFiles,0);
 assert.equal(fixture.calls.opens,0);
});
test('browser lacking database enumeration must not open or create a database',async()=>{
 const fixture=execute({supported:false});
 const result=await fixture.run();
 assert.equal(result.freeDatabase,'unavailable');
 assert.equal(result.localStories,'unavailable');
 assert.equal(fixture.calls.opens,0);
});
test('no IndexedDB never triggers a write attempt',async()=>{
 const fixture=execute({known:false});
 const result=await fixture.run();
 assert.equal(result.freeDatabase,'unavailable');
 assert.equal(fixture.calls.opens,0);
});
test('diagnostic code contains no persistence, cloud calls or media enumeration',()=>{
 const executable=source.replace(/\/\/[^\n]*/g,''); // comments are not executable behavior
 assert.doesNotMatch(executable,/\bfetch\s*\(|\bapi\s*\(|\blocalStorage\b|\.put\s*\(|\.add\s*\(|\.delete\s*\(|\.clear\s*\(|\.getAll\s*\(|\.get\s*\(|\bXMLHttpRequest\b/);
 assert.match(source,/\.transaction\(\['stories','files'\],'readonly'\)/);
 assert.match(menu,/if\(taleraDiagnoseMode\)return;\s*if\(premiumSyncUi\.working/);
 assert.match(menu,/if\(requestedMenu==='diagnose'&&taleraDiagnoseMode\)open\('diagnose'\)/);
 assert.match(menu,/if\(view==='diagnose'\)\{\s*diagnoseState\.phase='working'/);
 assert.match(menu,/Alleen metagegevens en aantallen/);
});
test('no extra route, Worker, new database or permanent settings menu item added',()=>{
 const start=menu.indexOf("case 'settings':"),end=menu.indexOf("case 'diagnose':",start);
 assert.ok(start>0&&end>start);
 assert.doesNotMatch(menu.slice(start,end),/option\('diagnose'/);
 assert.equal((menu.match(/const taleraDiagnoseMode=/g)||[]).length,1);
 assert.match(menu,/new URLSearchParams\(location\.search\)\.get\('talera_diagnose'\)==='1'/);
});
