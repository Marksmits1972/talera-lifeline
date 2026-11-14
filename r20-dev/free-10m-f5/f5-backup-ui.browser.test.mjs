// Browser-driven opt-in backup/restore proof, two separate synthetic origins.
// No actual iPhone memories, customer data, production Cloudflare or deployment.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {localBackupPage} from './f5-local-backup-page.mjs';
import {privateAccountScope} from './f5-local-scope.mjs';
const prefix='r20-dev/free-10m-f5/';
const accountA='11111111-1111-4111-8111-111111111111';
const accountB='22222222-2222-4222-8222-222222222222';
const dbA='talera-free-local-'+(await privateAccountScope(accountA)).slice(0,32)+'-v1';
const dbB='talera-free-local-'+(await privateAccountScope(accountB)).slice(0,32)+'-v1';
const currentAccount=new Map([[8865,accountA],[8866,accountB]]);
const originA='http://127.0.0.1:8865',originB='http://127.0.0.1:8866';
let serverA,serverB,browser,posts=0,accountReads=0;
function serve(port,db){
 const names=new Set(['f5-backup-controller.mjs','f5-portable-idb.mjs','f5-portable-archive.mjs']);
 const srv=createServer((req,res)=>{
  if(req.method!=='GET'){posts++;res.writeHead(405).end();return}
  res.setHeader('cache-control','no-store');
  res.setHeader('x-content-type-options','nosniff');
  if(req.url==='/api/me'){
   accountReads++;
   res.setHeader('content-type','application/json');
   res.end(JSON.stringify({ok:true,account:{id:currentAccount.get(port)}}));return;
  }
  if(req.url==='/__f5/backup'){
   res.setHeader('content-type','text/html; charset=utf-8');
   res.end(localBackupPage(db));return;
  }
  const requested=req.url?.startsWith('/__f5/')?req.url.slice('/__f5/'.length):'';
  const path=requested==='backup-controller.mjs'?'f5-backup-controller.mjs':requested;
  if(!names.has(path)){res.writeHead(404).end();return}
  res.setHeader('content-type','text/javascript; charset=utf-8');
  res.end(readFileSync(prefix+path,'utf8'));
 });
 return new Promise(ok=>srv.listen(port,'127.0.0.1',()=>ok(srv)));
}
const seed=async(page,db,present)=>{
 await page.evaluate(async ({db,present})=>{
  const open=indexedDB.open(db,1);
  open.onupgradeneeded=()=>{
   open.result.createObjectStore('stories',{keyPath:'id'});
   open.result.createObjectStore('files',{keyPath:'key'});
  };
  const d=await new Promise((ok,bad)=>{open.onsuccess=()=>ok(open.result);open.onerror=()=>bad(open.error)});
  const tx=d.transaction(['stories','files'],'readwrite');
  const stories=tx.objectStore('stories'),files=tx.objectStore('files');
  if(present==='old'){
   const id='local-old-1950-01-01-synthetic-record';
   stories.add({id,title:'Oud origineel fictief verhaal',source:'pwa-local',
    items:[{key:id+':0',kind:'photo'},{key:id+':1',kind:'video'},
     {key:id+':2',kind:'audio'}],
    narrationCues:[{t:0,index:0},{t:4000,index:1,videoAtMs:300},{t:7000,index:0}]});
   files.add({key:id+':0',blob:new File([Uint8Array.from([2,4,6,8])],
    'origineel.heic',{type:'image/heic'})});
   files.add({key:id+':1',blob:new File([Uint8Array.from([33,22,11,99])],
    'origineel.mov',{type:'video/quicktime'})});
   files.add({key:id+':2',blob:new File([Uint8Array.from([7,6,5,4])],
    'stem.wav',{type:'audio/wav'})});
   files.add({key:'talera-v4-work:preview:synthetic',blob:new Blob(['preview'],{type:'image/jpeg'})});
  }else{
   stories.add({id:'local-existing-1980-synthetic',title:'Bestaande herinnering',items:[]});
  }
  await new Promise((ok,bad)=>{tx.oncomplete=ok;tx.onabort=()=>bad(tx.error);tx.onerror=()=>bad(tx.error)});
  d.close();
 },{db,present});
};
try{
 [serverA,serverB]=await Promise.all([serve(8865,dbA),serve(8866,dbB)]);
 browser=await chromium.launch();
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844}});
 const a=await context.newPage(),b=await context.newPage();
 const errors=[];a.on('pageerror',e=>errors.push('A '+e.message));b.on('pageerror',e=>errors.push('B '+e.message));
 await a.goto(originA+'/__f5/backup');
 await b.goto(originB+'/__f5/backup');
 await seed(a,dbA,'old');await seed(b,dbB,'new');
 assert.equal(await a.locator('#talera-free-backup').getAttribute('data-database'),dbA);
 assert.equal(await a.getByRole('heading',{name:'Back-ups'}).count(),1);
 assert.equal(await a.getByRole('heading',{name:'Back-up maken'}).count(),1);
 assert.equal(await a.getByRole('heading',{name:'Back-up terugzetten'}).count(),1);
 assert.equal(await a.locator('#export-status').textContent(),'',
  'A second or tenth back-up must not falsely claim this is the first');
 assert.equal(await a.locator('#restore-status').textContent(),'');
 assert.equal(await a.getByRole('button',{name:'Back-up maken'}).count(),1);
 await a.getByRole('button',{name:'Back-up maken'}).click();
 await a.waitForFunction(()=>document.getElementById('export-status').textContent.includes('Bestanden'));
 await a.locator('#save-backup').waitFor({state:'visible'});
 assert.equal(await a.locator('#save-backup').textContent(),'Bewaar bestand');
 assert.equal(await a.getByRole('button',{name:'Back-up maken'}).isEnabled(),true);
 // A subsequent back-up uses EXACTLY the same labels and original local
 // workflow, without a first-run or expired-success label.
 await a.getByRole('button',{name:'Back-up maken'}).click();
 await a.waitForFunction(()=>document.getElementById('export-status')?.textContent.includes('Back-up klaar'));
 assert.equal(await a.locator('#save-backup').textContent(),'Bewaar bestand');
 assert.match(await a.locator('#export-status').textContent(),/Bestanden/);
 const downloadPromise=a.waitForEvent('download');
 await a.locator('#save-backup').click();
 const download=await downloadPromise;
 assert.match(download.suggestedFilename(),/\.talera$/);
 const fileBytes=readFileSync(await download.path());
 assert.ok(fileBytes.length>200);
 await b.locator('#restore-file').setInputFiles({name:'mijn-talera.talera',
  mimeType:'application/octet-stream',buffer:fileBytes});
 await b.locator('#preview-restore').click();
 await b.waitForFunction(()=>document.getElementById('restore-status').textContent.includes('Vink eerst aan'));
 assert.equal(await b.locator('#run-restore').isDisabled(),true);
 await b.locator('#other-origin').check();
 await b.locator('#preview-restore').click();
 await b.waitForFunction(()=>document.getElementById('restore-status').textContent.includes('Geen dubbele'));
 assert.equal(await b.locator('#run-restore').isDisabled(),true);
 await b.locator('#confirm-restore').check();
 assert.equal(await b.locator('#run-restore').isEnabled(),true);
 await b.locator('#run-restore').click();
 await b.waitForFunction(()=>document.getElementById('restore-status').textContent.includes('Herstel voltooid'));
 const state=await b.evaluate(async db=>{
  const req=indexedDB.open(db,1);
  const conn=await new Promise((ok,bad)=>{req.onsuccess=()=>ok(req.result);req.onerror=()=>bad(req.error)});
  const tx=conn.transaction(['stories','files'],'readonly');
  const getAll=s=>new Promise((ok,bad)=>{const q=tx.objectStore(s).getAll();q.onsuccess=()=>ok(q.result);q.onerror=()=>bad(q.error)});
  const [stories,files]=await Promise.all([getAll('stories'),getAll('files')]);
  conn.close();
  const movie=files.find(f=>f.key.endsWith(':1'));
  return {stories:stories.map(x=>({id:x.id,title:x.title,cues:x.narrationCues})),
   files:files.map(f=>f.key),videoName:movie.blob.name,videoBytes:Array.from(new Uint8Array(await movie.blob.arrayBuffer()))};
 },dbB);
 assert.equal(state.stories.length,2);
 assert.equal(state.stories.find(x=>x.id.startsWith('local-old')).cues[1].videoAtMs,300);
 assert.deepEqual(state.videoBytes,[33,22,11,99]);assert.equal(state.videoName,'origineel.mov');
 // Attempt to re-import: conflicts are presented, and the restore button stays disabled.
 await b.locator('#preview-restore').click();
 await b.waitForFunction(()=>document.getElementById('restore-status').textContent.includes('Conflict'));
 assert.equal(await b.locator('#run-restore').isDisabled(),true);
 // Corrupt archive cannot be previewed, let alone restored.
 const corrupt=Buffer.from(fileBytes);corrupt[corrupt.length-1]^=255;
 await b.locator('#restore-file').setInputFiles({name:'beschadigd.talera',
  mimeType:'application/octet-stream',buffer:corrupt});
 await b.locator('#preview-restore').click();
 await b.waitForFunction(()=>document.getElementById('restore-status').textContent.includes('Bestand beschadigd'));
 assert.equal(await b.locator('#run-restore').isDisabled(),true);
 // Simulate a different account logging in while this old page stays open.
 // The UI must fail closed rather than export the previous account's library.
 currentAccount.set(8866,accountA);
 await b.locator('#restore-file').setInputFiles({name:'opnieuw.talera',
  mimeType:'application/octet-stream',buffer:fileBytes});
 await b.locator('#preview-restore').click();
 await b.waitForFunction(()=>document.getElementById('restore-status').textContent.includes('account is gewijzigd'));
 assert.equal(await b.locator('#run-restore').isDisabled(),true);
 assert.ok(accountReads>=4,'Every archive action must check current account session');
 assert.equal(await b.getByRole('button',{name:'Bestand controleren'}).count(),1,
  'Restore inspection must always be named exactly the same');
 assert.equal(await b.getByRole('button',{name:'Herinneringen terugzetten'}).count(),1,
  'Restore label must not change after success or repeated restore');
 assert.match(await a.locator('main').innerText(),/niet versleuteld/i);
 assert.ok(!(await a.locator('main').innerText()).includes('besloten proef'),
  'Existing real Free backup must not be falsely marked as a demo');
 assert.equal(posts,0,'No archive or media sent to any server POST');
 assert.deepEqual(errors,[],'No browser errors allowed');
 console.log('TALERA_FREE_F5_BACKUP_UI_TWO_ORIGINS_PASS',JSON.stringify({
  voluntarySaveDownload:true,twoIsolatedBrowserOrigins:true,permissionRequired:true,
  consentRequiredBeforeWrite:true,recordIdsIntact:true,voiceCuesIntact:true,
  originalMovBytesIntact:true,preexistingStoriesPreserved:true,duplicateRestoresRejected:true,
  corruptedArchiveRejected:true,networkUploads:posts,realIPhoneValidated:false,
  mainTaleraUiModified:false
 }));
 await context.close();
}finally{
 if(browser)await browser.close();
 await Promise.all([serverA,serverB].filter(Boolean).map(s=>new Promise(ok=>s.close(ok))));
}
