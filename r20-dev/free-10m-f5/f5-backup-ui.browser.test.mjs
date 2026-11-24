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
  // Generate genuine JPEG bytes for the SAME existing local backup code path.
  // The prior four-byte "photo" could pass checksum tests without decoding.
  // Prepare before starting IndexedDB's synchronous write transaction.
  let genuineJpeg=null;
  if(present==='old'){
   const canvas=document.createElement('canvas');
   canvas.width=3;canvas.height=2;
   const ctx=canvas.getContext('2d');
   ctx.fillStyle='#2b568d';ctx.fillRect(0,0,3,2);
   const jpeg=await new Promise((ok,bad)=>canvas.toBlob(
    value=>value?ok(value):bad(Error('SYNTHETIC_JPEG_NOT_ENCODED')),'image/jpeg',.91));
   genuineJpeg=new Uint8Array(await jpeg.arrayBuffer());
   if(genuineJpeg.length<100||genuineJpeg[0]!==255||genuineJpeg[1]!==216)
    throw Error('SYNTHETIC_JPEG_BYTES_INVALID');
  }
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
   files.add({key:id+':0',blob:new File([genuineJpeg],
    'origineel.jpg',{type:'image/jpeg'})});
   files.add({key:id+':1',blob:new File([Uint8Array.from([33,22,11,99])],
    'origineel.mov',{type:'video/quicktime'})});
   files.add({key:id+':2',blob:new File([Uint8Array.from([7,6,5,4])],
    'stem.wav',{type:'audio/wav'})});
   files.add({key:'talera-v4-work:preview:synthetic',blob:new Blob(['preview'],{type:'image/jpeg'})});
   files.add({key:'talera-v4-work:synthetic-duplicate-video',blob:new Blob([Uint8Array.from([33,22,11,99])],{type:'video/quicktime'})});
   files.add({key:'talera-v4-work:manifest',blob:[]});
   files.add({key:'talera-v4-work:duplicate-index-v7',blob:{
    [id+':0']:{signature:'synthetic-source-index',size:genuineJpeg.length,updated:'2026-11-24T00:00:00.000Z'}
   }});
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
 // Confirm that the ORIGINAL IndexedDB photo really decodes before export.
 const sourceJpeg=await a.evaluate(async name=>{
  const req=indexedDB.open(name,1);
  const db=await new Promise((ok,bad)=>{req.onsuccess=()=>ok(req.result);req.onerror=()=>bad(req.error)});
  const tx=db.transaction('files','readonly');
  const row=await new Promise((ok,bad)=>{
   const q=tx.objectStore('files').get('local-old-1950-01-01-synthetic-record:0');
   q.onsuccess=()=>ok(q.result);q.onerror=()=>bad(q.error);
  });
  db.close();
  const source=row.blob,bytes=Array.from(new Uint8Array(await source.arrayBuffer()));
  const url=URL.createObjectURL(source),image=new Image();
  try{
   image.src=url;
   await image.decode();
   return {bytes,width:image.naturalWidth,height:image.naturalHeight,
    name:source.name,type:source.type};
  }finally{URL.revokeObjectURL(url)}
 },dbA);
 assert.equal(sourceJpeg.width,3);
 assert.equal(sourceJpeg.height,2);
 assert.equal(sourceJpeg.name,'origineel.jpg');
 assert.equal(sourceJpeg.type,'image/jpeg');
 assert.ok(sourceJpeg.bytes.length>100);
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
 assert.equal(await a.locator('#export-details').isVisible(),true);
 assert.equal(await a.locator('#export-details-text').isVisible(),false);
 await a.locator('#export-details summary').click();
 assert.match(await a.locator('#export-details-text').textContent(),/Originele video’s: 1/);
 assert.match(await a.locator('#export-details-text').textContent(),/Extra binaire kopieën met identieke inhoud: 0 /);
 assert.match(await a.locator('#export-details-text').textContent(),/Verliesvrij bespaard in deze back-up: .*\(1 gedeelde inhoudsverwijzingen\)/);
 // A subsequent back-up uses EXACTLY the same labels and original local
 // workflow, without a first-run or expired-success label.
 await a.getByRole('button',{name:'Back-up maken'}).click();
 await a.waitForFunction(()=>document.getElementById('export-status')?.textContent.includes('Back-up klaar'));
 assert.equal(await a.locator('#save-backup').textContent(),'Bewaar bestand');
 assert.match(await a.locator('#export-status').textContent(),/Bestanden/);
 assert.equal(await a.locator('#save-backup').getAttribute('download'),'TALERA-back-up.talera');
 // Exercise the exact native share action with a synthetic share target.
 // This proves the payload, not iOS Files replacement or actual persistence.
 await a.evaluate(()=>{
  Object.defineProperty(navigator,'canShare',{configurable:true,value:({files})=>
   files.length===1&&files[0] instanceof File});
  Object.defineProperty(navigator,'share',{configurable:true,value:async ({files})=>{
   const file=files[0];
   window.__backupShareResult={name:file.name,size:file.size,type:file.type};
  }});
 });
 await a.locator('#save-backup').click();
 await a.waitForFunction(()=>window.__backupShareResult?.name==='TALERA-back-up.talera');
 const shared=await a.evaluate(()=>window.__backupShareResult);
 assert.ok(shared.size>200);
 assert.equal(shared.type,'application/octet-stream');
 await a.waitForFunction(()=>document.getElementById('export-status').textContent.includes('niet zelfstandig controleren'));
 await a.evaluate(()=>{
  delete navigator.share;
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false});
 });
 const downloadPromise=a.waitForEvent('download');
 await a.locator('#save-backup').click();
 const download=await downloadPromise;
 assert.equal(download.suggestedFilename(),'TALERA-back-up.talera');
 assert.match(await a.locator('#export-status').textContent(),/extra kopie/);
 const fileBytes=readFileSync(await download.path());
 assert.ok(fileBytes.length>200);
 const {inspectFreeArchive:inspectDownloaded}=await import('./f5-portable-archive.mjs');
 const compactInfo=await inspectDownloaded(new Blob([fileBytes]));
 assert.equal(compactInfo.sharedEntries,1);
 assert.ok(compactInfo.savedBytes>0);
 assert.equal(await a.locator('#legacy-backup').count(),0);
 assert.equal(await a.locator('#save-backup').getAttribute('download'),'TALERA-back-up.talera');
 // Simulate an iOS Blob assembly anomaly affecting ONLY the final .talera Blob.
 // The existing app must NEVER offer download of an archive whose bytes do not
 // agree with its checksum-verified manifest. Synthetic browser fixture only.
 await a.evaluate(()=>{
  const NativeBlob=window.Blob;
  window.__taleraNativeBackupBlob=NativeBlob;
  window.Blob=new Proxy(NativeBlob,{construct(target,args,newTarget){
   const [parts,opts]=args;
   if(Array.isArray(parts)&&parts.length>2&&
      parts[0] instanceof Uint8Array&&parts[1] instanceof Uint8Array){
    return Reflect.construct(target,[[...parts,Uint8Array.of(0xa5)],opts],newTarget);
   }
   return Reflect.construct(target,args,newTarget);
  }});
 });
 await a.getByRole('button',{name:'Back-up maken'}).click();
 await a.waitForFunction(()=>document.getElementById('export-status').textContent.includes('Back-up niet gemaakt'));
 assert.match(await a.locator('#export-status').textContent(),/EXTRA_BYTES/,
  'Export must reject a malformed archive BEFORE a download is offered');
 assert.equal(await a.locator('#save-backup').isVisible(),false,
  'A failed pre-download archive check may not leave a stale download button');
 await a.evaluate(()=>{window.Blob=window.__taleraNativeBackupBlob;delete window.__taleraNativeBackupBlob});
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
  // Reproduce the real iPhone flow: no stories, but a retained identical
  // technical file record from the archive. No destructive cleanup.
  await empty.evaluate(async({db,bytes})=>{
   const {decodeFreeArchive}=await import('/__f5/f5-portable-archive.mjs');
   const p=await import('/__f5/f5-library-persistence.mjs');
   const decoded=await decodeFreeArchive(new Blob([new Uint8Array(bytes)]));
   const retained=decoded.files.find(row=>row.key==='talera-v4-work:preview:synthetic');
   if(!retained)throw Error('Existing technical fixture absent');
   const conn=await p.openExisting(db,true);
   const tx=conn.transaction('files','readwrite');
   const store=tx.objectStore('files');
   store.add(retained);
   store.add({key:'talera-v4-work:manifest',blob:[]});
   store.add({key:'talera-v4-work:duplicate-index-v7',blob:{}});
   await new Promise((ok,bad)=>{tx.oncomplete=ok;tx.onabort=()=>bad(tx.error)});
   conn.close();
  },{db:dbA,bytes:Array.from(fileBytes)});
  // The owner's iPhone showed zero stories plus an identical record and
  // one DIFFERENT record. Never enable restore or overwrite the latter.
  const stray=await empty.evaluate(async({db,bytes})=>{
   const {decodeFreeArchive}=await import('/__f5/f5-portable-archive.mjs');
   const p=await import('/__f5/f5-library-persistence.mjs');
   const decoded=await decodeFreeArchive(new Blob([new Uint8Array(bytes)]));
   const key=decoded.stories[0].items[0].key;
   const conn=await p.openExisting(db,true);
   const tx=conn.transaction('files','readwrite');
   tx.objectStore('files').add({key,blob:new Blob(['different synthetic bytes'],{type:'image/jpeg'})});
   await new Promise((ok,bad)=>{tx.oncomplete=ok;tx.onabort=()=>bad(tx.error)});
   conn.close();return key;
  },{db:dbA,bytes:Array.from(fileBytes)});
  await empty.locator('#preview-restore').click();
  await empty.waitForFunction(()=>document.getElementById('restore-hint').textContent.includes('Conflict'));
  assert.equal(await empty.locator('#restore-details-text').isVisible(),false);
  await empty.locator('#restore-details summary').click();
  const blocked=await empty.locator('#restore-details-text').textContent();
  assert.match(blocked,/Afwijkende bestandsrecords: 1/);
  assert.match(blocked,/Huidige bibliotheek: 0 herinnering/);
  assert.match(blocked,/Identieke bestandsrecords veilig herbruikbaar: 1/);
  assert.match(blocked,/losstaand herinneringsbestand/);
  assert.equal(await empty.locator('#backup-step-confirm').isVisible(),true);
  assert.equal(await empty.locator('#run-restore').isDisabled(),true);
  assert.equal(await empty.locator('#confirm-restore').isDisabled(),true);
  // Cleanup of ONLY our own synthetic conflicting fixture, no customer records.
  await empty.evaluate(async({db,key})=>{
   const p=await import('/__f5/f5-library-persistence.mjs');
   const conn=await p.openExisting(db,true);
   const tx=conn.transaction('files','readwrite');
   tx.objectStore('files').delete(key);
   await new Promise((ok,bad)=>{tx.oncomplete=ok;tx.onabort=()=>bad(tx.error)});
   conn.close();
  },{db:dbA,key:stray});
  console.log('TALERA_EMPTY_STORIES_DIFFERENT_ORPHAN_FILE_BLOCKED_AND_CLASSIFIED_PASS');
  await empty.locator('#preview-restore').click();
  await empty.waitForFunction(()=>
   document.getElementById('restore-hint').textContent.includes('Geen dubbele'));
  assert.equal(await empty.locator('#restore-details-text').isVisible(),false);
  assert.match(await empty.locator('#restore-details-text').textContent(),
   /Identieke bestandsrecords veilig herbruikbaar: 1/);
  assert.match(await empty.locator('#restore-details-text').textContent(),
   /Technische editorrecords zonder herinneringen of conceptinhoud: 2/);
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
   const persistence=await import('/__f5/f5-library-persistence.mjs');
   const {stories,files}=await persistence.readAll(database);
   database.close();
   const video=files.find(row=>row.key==='local-old-1950-01-01-synthetic-record:1');
   const voice=files.find(row=>row.key==='local-old-1950-01-01-synthetic-record:2');
   const image=files.find(row=>row.key==='local-old-1950-01-01-synthetic-record:0');
   // Byte equality alone is not proof the restored photo can be displayed.
   const imageUrl=URL.createObjectURL(image.blob),decodedPhoto=new Image();
   let photoDimensions=null;
   try{
    decodedPhoto.src=imageUrl;
    await decodedPhoto.decode();
    photoDimensions=[decodedPhoto.naturalWidth,decodedPhoto.naturalHeight];
   }catch(_){photoDimensions=null}
   finally{URL.revokeObjectURL(imageUrl)}
   return {
    stories:stories.map(row=>({
     id:row.id,title:row.title,items:row.items,cues:row.narrationCues
    })),
    fileIds:files.map(row=>row.key).sort(),
    technicalIndex:files.find(row=>row.key==='talera-v4-work:duplicate-index-v7')?.blob,
    technicalManifest:files.find(row=>row.key==='talera-v4-work:manifest')?.blob,
    videoName:video?.blob?.name,
    videoBytes:video?.blob?Array.from(new Uint8Array(await video.blob.arrayBuffer())):[],
    voiceBytes:voice?.blob?Array.from(new Uint8Array(await voice.blob.arrayBuffer())):[],
    imageBytes:image?.blob?Array.from(new Uint8Array(await image.blob.arrayBuffer())):[],
    imageMime:image?.blob?.type,imageName:image?.blob?.name,photoDimensions
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
  assert.deepEqual(afterReload.imageBytes,sourceJpeg.bytes,
   'The genuine JPEG must be byte-identical before export and after IndexedDB restore');
  assert.deepEqual(afterReload.photoDimensions,[3,2],
   'The RESTORED original JPEG must actually decode and display after page reload');
  assert.equal(afterReload.imageMime,'image/jpeg');
  assert.equal(afterReload.imageName,'origineel.jpg');
  assert.deepEqual(afterReload.videoBytes,[33,22,11,99]);
  assert.deepEqual(afterReload.voiceBytes,[7,6,5,4]);
  assert.equal(afterReload.videoName,'origineel.mov');
  assert.equal(afterReload.fileIds.length,7,
   'Exact originals and existing preview plus the untouched two technical records');
  assert.deepEqual(afterReload.technicalIndex,{},'Existing technical index must not be overwritten');
  assert.deepEqual(afterReload.technicalManifest,[],'Existing empty draft manifest must stay intact');
  await empty.locator('#restore-file').setInputFiles({
   name:'talera-lokale-proef-backup.talera',
   mimeType:'application/octet-stream',buffer:fileBytes
  });
  await empty.locator('#preview-restore').click();
  await empty.waitForFunction(()=>
   document.getElementById('restore-hint').textContent.includes('al aanwezig'));
  assert.equal(await empty.locator('#run-restore').isDisabled(),true,
   'Restoring twice must never silently duplicate or overwrite the record');
  assert.equal(await empty.locator('#backup-step-confirm').isVisible(),true,
   'A completed check keeps the disabled restore button visible');
  assert.equal(await empty.locator('#confirm-restore').isDisabled(),true);
  console.log('TALERA_FREE_EMPTY_LOCAL_LIBRARY_RESTORE_SAME_ORIGIN_PASS',
   JSON.stringify({startsWithoutStories:true,prefilledExamples:0,
    sameExistingOrigin:true,separatePrivateBrowserStorageOnly:true,
    explicitConsent:true,restoredStoryCount:1,allOriginalMediaBytesIdentical:true,
    exactOriginalMediaIDs:true,voiceCuesIdentical:true,afterReopenReadable:true,
    restoredJpegActuallyDecodes:true,
    duplicateRestoreBlocked:true,technicalIndexConflictNotBlocking:true,
    actualOriginalConflictBlocked:true,localTechnicalRecordsUnchanged:true,serverUploadCount:posts,
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
 await b.waitForFunction(()=>document.getElementById('restore-hint').textContent.includes('Geen dubbele'));
 assert.equal(await b.locator('#run-restore').isDisabled(),true);
 assert.equal(await b.locator('#backup-step-confirm').isVisible(),true);
 await b.locator('#confirm-restore').check();
 assert.equal(await b.locator('#run-restore').isEnabled(),true);
 await b.locator('#run-restore').click();
 await b.waitForFunction(()=>document.getElementById('restore-status').textContent.includes('Herstel voltooid'));
 const state=await b.evaluate(async db=>{
  const req=indexedDB.open(db,1);
  const conn=await new Promise((ok,bad)=>{req.onsuccess=()=>ok(req.result);req.onerror=()=>bad(req.error)});
  const persistence=await import('/__f5/f5-library-persistence.mjs');
  const {stories,files}=await persistence.readAll(conn);
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
 await b.waitForFunction(()=>document.getElementById('restore-hint').textContent.includes('al aanwezig'));
 assert.equal(await b.locator('#run-restore').isDisabled(),true);
 // Corrupt archive cannot be previewed, let alone restored.
 const corrupt=Buffer.from(fileBytes);corrupt[corrupt.length-1]^=255;
 await b.locator('#restore-file').setInputFiles({name:'beschadigd.talera',
  mimeType:'application/octet-stream',buffer:corrupt});
 await b.locator('#preview-restore').click();
 await b.waitForFunction(()=>document.getElementById('restore-status').textContent.includes('Bestand beschadigd'));
 assert.match(await b.locator('#restore-status').textContent(),/controlecode: MEDIA_CHECKSUM/,
  'An invalid media chunk must show a safe, specific LOCAL error code to diagnose the iPhone .talera selection');
 assert.equal(await b.locator('#run-restore').isDisabled(),true);
 // A valid archive with even one appended byte must STILL be rejected.
 // Never silently trim unexpected data from a personal iPhone backup.
 await b.locator('#restore-file').setInputFiles({name:'extra-bytes.talera',
  mimeType:'application/octet-stream',buffer:Buffer.concat([fileBytes,Buffer.from([0xa5])])});
 await b.locator('#preview-restore').click();
 await b.waitForFunction(()=>document.getElementById('restore-status').textContent.includes('EXTRA_BYTES'));
 assert.equal(await b.locator('#run-restore').isDisabled(),true);
 // A manifest checksum failure is distinct from a corrupt media chunk.
 // Neither may expose memory titles, file IDs, media bytes, or an import button.
 const brokenManifest=Buffer.from(fileBytes);
 const magicBytes=new TextEncoder().encode('TALERA-FREE-LOCAL-V1\\n'.replace('\\n','\n')).length;
 brokenManifest[magicBytes+4]^=1;
 await b.locator('#restore-file').setInputFiles({name:'beschadigd-manifest.talera',
  mimeType:'application/octet-stream',buffer:brokenManifest});
 await b.locator('#preview-restore').click();
 await b.waitForFunction(()=>document.getElementById('restore-status').textContent.includes('Bestand beschadigd'));
 assert.match(await b.locator('#restore-status').textContent(),/controlecode: MANIFEST_CHECKSUM/,
  'An invalid manifest must have a different safe local error code');
 assert.equal(await b.locator('#run-restore').isDisabled(),true);
 assert.equal(await b.locator('#backup-step-confirm').isVisible(),false);
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
 assert.equal(await b.locator('#run-restore').count(),1,
  'The protected restore action must remain intact after success or repeated restore');
 assert.equal(await b.locator('#backup-step-confirm').isVisible(),false,
  'After an invalid file or account check, the final restore step must stay hidden');
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
