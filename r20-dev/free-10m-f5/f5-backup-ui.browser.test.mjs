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
// Same authenticated account across two separate browser origins.
const dbB='talera-free-local-'+(await privateAccountScope(accountA)).slice(0,32)+'-v1';
const currentAccount=new Map([[8865,accountA],[8866,accountA]]);
const originA='http://127.0.0.1:8865',originB='http://127.0.0.1:8866';
let serverA,serverB,browser,posts=0,accountReads=0;
function serve(port,db){
 const names=new Set(['f5-backup-controller.mjs','f5-portable-idb.mjs','f5-portable-archive.mjs','f5-library-persistence.mjs']);
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
  }else if(present==='new'){
   stories.add({id:'local-existing-1980-synthetic',title:'Bestaande herinnering',items:[]});
  } // present==='empty': initialize the ORIGINAL schema without any stories/media
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
 assert.equal(await a.locator('#preview-restore').isDisabled(),true,
  'Step 2 must remain disabled until a backup file is selected');
 assert.equal(await a.locator('#backup-step-check').isVisible(),false);
 assert.equal(await a.locator('#backup-step-confirm').isVisible(),false);
 assert.match(await a.locator('#selected-file').textContent(),/Nog geen back-upbestand/);
 const chooserBox=await a.locator('.file-choose').boundingBox();
 assert.ok(chooserBox&&chooserBox.height>=56&&chooserBox.width>=250,
  'Step 1 must offer a prominent mobile-size file selection target');
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
 // RONDE 2: a *truly empty* account-local library, using the exact SAME
 // existing TALERA backup page + same origin in a fresh browser storage
 // context. This is disposable CI state, NOT a second app/Worker/user URL.
 // The owner's iPhone IndexedDB, account and real media remain untouched.
 const emptyContext=await browser.newContext({acceptDownloads:true,
  viewport:{width:390,height:844}});
 try{
  const empty=await emptyContext.newPage();
  empty.on('pageerror',e=>errors.push('EMPTY '+e.message));
  await empty.goto(originA+'/__f5/backup');
  const startsEmpty=await empty.evaluate(async expectedDb=>{
   const databases=await indexedDB.databases();
   return !databases.some(row=>row.name===expectedDb);
  },dbA);
  assert.equal(startsEmpty,true,
   'Fresh TALERA Free storage must not contain prefilled sample memories');
  await empty.locator('#restore-file').setInputFiles({
   name:'talera-lokale-proef-backup.talera',
   mimeType:'application/octet-stream',buffer:fileBytes
  });
  assert.equal(await empty.locator('#backup-step-check').isVisible(),true,
   'Only after step 1 may step 2 be shown');
  assert.equal(await empty.locator('#preview-restore').isEnabled(),true);
  assert.equal(await empty.locator('#backup-step-confirm').isVisible(),false,
   'Step 3 must not be offered before validation');
  assert.equal(await empty.locator('#selected-file').textContent(),
   'Gekozen bestand: talera-lokale-proef-backup.talera');
  // The live app opens its original stories/files schema via Mijn leven.
  // Never weaken openExisting(): a direct back-up deep link must refuse to
  // silently INVENT a missing database or pretend missing iPhone data is empty.
  await empty.locator('#preview-restore').click();
  await empty.waitForFunction(()=>
   document.getElementById('restore-status').textContent.includes('Geen lokale herinneringen'));
  assert.equal(await empty.evaluate(async db=>
   !(await indexedDB.databases()).some(row=>row.name===db),dbA),true,
   'A failed preview must never create or replace private iPhone storage');
  await seed(empty,dbA,'empty'); // original schema, ZERO stories and ZERO files
  const counts=await empty.evaluate(async db=>{
   const req=indexedDB.open(db,1);
   const opened=await new Promise((ok,bad)=>{
    req.onsuccess=()=>ok(req.result);req.onerror=()=>bad(req.error);
   });
   const tx=opened.transaction(['stories','files'],'readonly');
   const count=name=>new Promise((ok,bad)=>{
    const q=tx.objectStore(name).count();
    q.onsuccess=()=>ok(q.result);q.onerror=()=>bad(q.error);
   });
   const result=await Promise.all([count('stories'),count('files')]);
   opened.close();return result;
  },dbA);
  assert.deepEqual(counts,[0,0],
   'The existing Free account library must truly be empty before import');
  await empty.locator('#preview-restore').click();
  await empty.waitForFunction(()=>
   document.getElementById('restore-status').textContent.includes('Geen dubbele'));
  assert.match(await empty.locator('#restore-status').textContent(),
   /Gecontroleerd: 1 herinnering/);
  assert.equal(await empty.locator('#backup-step-confirm').isVisible(),true,
   'Step 3 may be shown only after successful conflict-free preview');
  assert.equal(await empty.locator('#other-origin').isChecked(),false,
   'Same origin/same account must not need the other-origin override');
  assert.equal(await empty.locator('#run-restore').isDisabled(),true,
   'Even a totally empty library must require explicit restore consent');
  await empty.locator('#confirm-restore').check();
  await empty.locator('#run-restore').click();
  await empty.waitForFunction(()=>
   document.getElementById('restore-status').textContent.includes('Herstel voltooid'));
  await empty.reload({waitUntil:'domcontentloaded'});
  const afterReload=await empty.evaluate(async db=>{
   const open=indexedDB.open(db,1);
   const database=await new Promise((ok,bad)=>{
    open.onsuccess=()=>ok(open.result);open.onerror=()=>bad(open.error)
   });
   const tx=database.transaction(['stories','files'],'readonly');
   const all=store=>new Promise((ok,bad)=>{
    const q=tx.objectStore(store).getAll();
    q.onsuccess=()=>ok(q.result);q.onerror=()=>bad(q.error)
   });
   const [stories,files]=await Promise.all([all('stories'),all('files')]);
   database.close();
   const video=files.find(row=>row.key==='local-old-1950-01-01-synthetic-record:1');
   const voice=files.find(row=>row.key==='local-old-1950-01-01-synthetic-record:2');
   const image=files.find(row=>row.key==='local-old-1950-01-01-synthetic-record:0');
   return {
    stories:stories.map(row=>({
     id:row.id,title:row.title,items:row.items,cues:row.narrationCues
    })),
    fileIds:files.map(row=>row.key).sort(),
    videoName:video?.blob?.name,
    videoBytes:video?.blob?Array.from(new Uint8Array(await video.blob.arrayBuffer())):[],
    voiceBytes:voice?.blob?Array.from(new Uint8Array(await voice.blob.arrayBuffer())):[],
    imageBytes:image?.blob?Array.from(new Uint8Array(await image.blob.arrayBuffer())):[]
   };
  },dbA);
  assert.equal(afterReload.stories.length,1,
   'An empty Free library restore must not generate any example stories');
  assert.equal(afterReload.stories[0].id,'local-old-1950-01-01-synthetic-record');
  assert.equal(afterReload.stories[0].title,'Oud origineel fictief verhaal');
  assert.deepEqual(afterReload.stories[0].items.map(row=>row.key),[
   'local-old-1950-01-01-synthetic-record:0',
   'local-old-1950-01-01-synthetic-record:1',
   'local-old-1950-01-01-synthetic-record:2'
  ]);
  assert.equal(afterReload.stories[0].cues[1].videoAtMs,300);
  assert.deepEqual(afterReload.imageBytes,[2,4,6,8]);
  assert.deepEqual(afterReload.videoBytes,[33,22,11,99]);
  assert.deepEqual(afterReload.voiceBytes,[7,6,5,4]);
  assert.equal(afterReload.videoName,'origineel.mov');
  assert.equal(afterReload.fileIds.length,4,
   'Exact originals and existing preview must be restored, no extra media');
  await empty.locator('#restore-file').setInputFiles({
   name:'talera-lokale-proef-backup.talera',
   mimeType:'application/octet-stream',buffer:fileBytes
  });
  await empty.locator('#preview-restore').click();
  await empty.waitForFunction(()=>
   document.getElementById('restore-status').textContent.includes('Conflict'));
  assert.equal(await empty.locator('#run-restore').isDisabled(),true,
   'Restoring twice must never silently duplicate or overwrite the record');
  assert.equal(await empty.locator('#backup-step-confirm').isVisible(),false,
   'Conflict must hide step 3 instead of presenting a confusing grey restore button');
  console.log('TALERA_FREE_EMPTY_LOCAL_LIBRARY_RESTORE_SAME_ORIGIN_PASS',
   JSON.stringify({startsWithoutStories:true,prefilledExamples:0,
    sameExistingOrigin:true,separatePrivateBrowserStorageOnly:true,
    explicitConsent:true,restoredStoryCount:1,allOriginalMediaBytesIdentical:true,
    exactOriginalMediaIDs:true,voiceCuesIdentical:true,afterReopenReadable:true,
    duplicateRestoreBlocked:true,serverUploadCount:posts,
    personalIphoneDataTouched:false,physicalIPhoneAcceptance:false}));
 }finally{await emptyContext.close()}
 // Cross-origin consent must never authorize an unrelated account.
 const foreignDb='talera-free-local-'+(await privateAccountScope(accountB)).slice(0,32)+'-v1';
 const foreignBlocked=await b.evaluate(async({bytes,foreignDb})=>{
  const backup=await import('/__f5/f5-portable-idb.mjs');
  try{
   await backup.previewFreeLibraryRestore(new Blob([new Uint8Array(bytes)]),
    foreignDb,{allowOtherOrigin:true});
   return false;
  }catch(e){return String(e.message).includes('TALERA_RESTORE_OTHER_ACCOUNT_BLOCKED')}
 },{bytes:Array.from(fileBytes),foreignDb});
 assert.equal(foreignBlocked,true,'Different account cannot import private backup');
 await b.locator('#restore-file').setInputFiles({name:'mijn-talera.talera',
  mimeType:'application/octet-stream',buffer:fileBytes});
 await b.locator('#preview-restore').click();
 await b.waitForFunction(()=>document.getElementById('restore-status').textContent.includes('Vink eerst aan'));
 assert.equal(await b.locator('#run-restore').isDisabled(),true);
 await b.locator('#other-origin').check();
 await b.locator('#preview-restore').click();
 await b.waitForFunction(()=>document.getElementById('restore-status').textContent.includes('Geen dubbele'));
 assert.equal(await b.locator('#run-restore').isDisabled(),true);
 assert.equal(await b.locator('#backup-step-confirm').isVisible(),true);
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
 currentAccount.set(8866,accountB);
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
  originalMovBytesIntact:true,sameAccountOtherOriginRestored:true,
  foreignAccountBlocked:true,preexistingStoriesPreserved:true,duplicateRestoresRejected:true,
  corruptedArchiveRejected:true,networkUploads:posts,realIPhoneValidated:false,
  mainTaleraUiModified:false
 }));
 await context.close();
}finally{
 if(browser)await browser.close();
 await Promise.all([serverA,serverB].filter(Boolean).map(s=>new Promise(ok=>s.close(ok))));
}
