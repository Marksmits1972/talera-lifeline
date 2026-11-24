// End-to-end TWO origins in a real browser, synthetic memory/media only.
// Original approved app and physical iPhone PWA never touched.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const base='r20-dev/free-10m-f5/';
let posts=0;
function server(port){
 const s=createServer((req,res)=>{
  if(req.method!=='GET')posts++;
  const path=req.url==='/'?'':req.url;
  const allowed=new Set(['','/f5-portable-idb.mjs','/f5-portable-archive.mjs','/f5-library-persistence.mjs']);
  if(!allowed.has(path)){res.writeHead(404).end();return}
  res.setHeader('access-control-allow-origin','none');
  res.setHeader('cache-control','no-store');
  res.setHeader('content-type',path.endsWith('.mjs')?'text/javascript':'text/html');
  if(!path){res.end('<!doctype html><title>TALERA synthetic origin</title>');return}
  res.end(readFileSync(base+path.slice(1),'utf8'));
 });
 return new Promise(resolve=>s.listen(port,'127.0.0.1',()=>resolve(s)));
}
const src='http://127.0.0.1:8855',dst='http://127.0.0.1:8856';
const targetDb='talera-free-local-'+'a'.repeat(32)+'-v1';
const legacyDb='talera-lifeline-dev-local-v1';
const id='local-1980-01-01-preserved-synthetic-id';
const image=new Uint8Array([1,2,3,4,5,6,7,8,9,0]);
const movie=new Uint8Array([11,22,33,44,55,66,77]);
const audio=new Uint8Array([99,88,77,66,55,44]);
let s1,s2,browser;
try{
 [s1,s2]=await Promise.all([server(8855),server(8856)]);
 browser=await chromium.launch();
 const context=await browser.newContext();
 const pageA=await context.newPage(),pageB=await context.newPage();
 await pageA.goto(src);await pageB.goto(dst);
 await pageA.evaluate(async data=>{
  const req=indexedDB.open(data.db,1);
  req.onupgradeneeded=()=>{
   req.result.createObjectStore('stories',{keyPath:'id'});
   req.result.createObjectStore('files',{keyPath:'key'});
  };
  const db=await new Promise((ok,err)=>{req.onsuccess=()=>ok(req.result);req.onerror=()=>err(req.error)});
  const tx=db.transaction(['stories','files'],'readwrite');
  tx.objectStore('stories').add({
   id:data.id,source:'pwa-local',title:'Oude fictieve herinnering',
   date:'1980-01-01',narrationDurationMs:8000,
   narrationCues:[{t:0,index:0},{t:2000,index:1,videoAtMs:250},{t:5000,index:0}],
   items:[{key:data.id+':0',kind:'photo'},{key:data.id+':1',kind:'video'},
    {key:data.id+':2',kind:'audio'}]
  });
  tx.objectStore('files').add({key:data.id+':0',blob:new File([new Uint8Array(data.image)],
    'origineel.png',{type:'image/png'})});
  tx.objectStore('files').add({key:data.id+':1',blob:new File([new Uint8Array(data.movie)],
    'origineel.mov',{type:'video/quicktime'})});
  tx.objectStore('files').add({key:data.id+':2',blob:new File([new Uint8Array(data.audio)],
    'origineel.wav',{type:'audio/wav'})});
  tx.objectStore('files').add({key:'talera-v4-work:manifest',blob:[{voice:data.id+':2'}]});
  await new Promise((ok,err)=>{tx.oncomplete=ok;tx.onerror=()=>err(tx.error)});
  db.close();
 },{db:legacyDb,id,image:Array.from(image),movie:Array.from(movie),audio:Array.from(audio)});
 const archiveData=await pageA.evaluate(async dbname=>{
  const {exportExistingFreeLibrary}=await import('/f5-portable-idb.mjs');
  const file=await exportExistingFreeLibrary(dbname);
  return Array.from(new Uint8Array(await file.arrayBuffer()));
 },legacyDb);
 assert.ok(archiveData.length>90);
 // Construct a checksum-valid but semantically damaged synthetic archive.
 // Preview/restore must reject the stale voice media ID BEFORE writing.
 const badCueArchiveData=await pageA.evaluate(async databaseName=>{
  const p=await import('/f5-library-persistence.mjs');
  const {createFreeArchive}=await import('/f5-portable-archive.mjs');
  const db=await p.openExisting(databaseName,false);
  let rows;try{rows=await p.readAll(db)}finally{db.close()}
  const invalid={...rows.stories[0],
   narrationCues:[{t:0,index:0,mediaId:'nonexistent-visual-media'}]};
  const bad=await createFreeArchive({stories:[invalid],files:rows.files,
   sourceScope:databaseName,sourceOrigin:location.origin});
  return Array.from(new Uint8Array(await bad.arrayBuffer()));
 },legacyDb);
 // A local export must also refuse a story referring to missing originals.
 const missingOriginalExportRejected=await pageA.evaluate(async dbname=>{
  const original=indexedDB.open(dbname,1);
  const db=await new Promise((ok,bad)=>{
   original.onsuccess=()=>ok(original.result);
   original.onerror=()=>bad(original.error);
  });
  const brokenId='local-missing-original-synthetic';
  const write=async row=>{
   const tx=db.transaction('stories','readwrite');
   if(row)tx.objectStore('stories').add(row);
   else tx.objectStore('stories').delete(brokenId);
   await new Promise((ok,bad)=>{
    tx.oncomplete=ok;tx.onabort=()=>bad(tx.error);
   });
  };
  let refused=false;
  try{
   await write({id:brokenId,source:'pwa-local',
    items:[{key:'no-such-original',kind:'photo'}]});
   try{
    const p=await import('/f5-portable-idb.mjs');
    await p.exportExistingFreeLibrary(dbname);
   }catch(e){refused=String(e.message).includes('MISSING_ORIGINAL_MEDIA_ID')}
  }finally{
   await write(null);
   db.close();
  }
  return refused;
 },legacyDb);
 assert.equal(missingOriginalExportRejected,true,
   'Back-up export must fail closed on a missing original file');
 await pageB.evaluate(async target=>{
  const req=indexedDB.open(target,1);
  req.onupgradeneeded=()=>{
   req.result.createObjectStore('stories',{keyPath:'id'});
   req.result.createObjectStore('files',{keyPath:'key'});
  };
  const db=await new Promise((ok,err)=>{req.onsuccess=()=>ok(req.result);req.onerror=()=>err(req.error)});
  const tx=db.transaction(['stories','files'],'readwrite');
  tx.objectStore('stories').put({id:'local-existing-new-story',source:'pwa-local',
   title:'NIET OVERSCHRIJVEN',items:[]});
  await new Promise((ok,err)=>{tx.oncomplete=ok;tx.onerror=()=>err(tx.error)});
  db.close();
 },targetDb);
 const result=await pageB.evaluate(async data=>{
  const m=await import('/f5-portable-idb.mjs');
  const backup=new Blob([new Uint8Array(data.bytes)]);
  async function rejects(fn){try{await fn();return false}catch{return true}}
  const disallowOther=await rejects(()=>m.previewFreeLibraryRestore(backup,data.target));
  // Existing identical media and technical manifest records must be reused
  // without any overwrite. A differing file must block the entire restore.
  const persistence=await import('/f5-library-persistence.mjs');
  const {decodeFreeArchive}=await import('/f5-portable-archive.mjs');
  const decoded=await decodeFreeArchive(backup);
  const conn=await persistence.openExisting(data.target,true);
  const shared=decoded.files.find(row=>row.key===data.id+':0');
  const manifest=decoded.files.find(row=>row.key==='talera-v4-work:manifest');
  const wrong=decoded.files.find(row=>row.key===data.id+':1');
  const change=async(removeWrong=false)=>{
   const tx=conn.transaction('files','readwrite'),f=tx.objectStore('files');
   if(removeWrong)f.delete(wrong.key);
   else{
    f.add(shared);f.add(manifest);
    f.add({...wrong,blob:new Blob(['different'],{type:wrong.blob.type})});
   }
   await new Promise((ok,bad)=>{tx.oncomplete=ok;tx.onabort=()=>bad(tx.error)});
  };
  await change();
  const blocked=await m.previewFreeLibraryRestore(backup,data.target,{allowOtherOrigin:true});
  if(blocked.safeToRestore||blocked.conflictingMediaEntries!==1||
     blocked.identicalMediaEntries!==2||blocked.alreadyPresentStories!==0)
   throw Error('Conflict classification failed');
  if(!await rejects(()=>m.restoreFreeLibrary(backup,data.target,{allowOtherOrigin:true,confirmed:true})))
   throw Error('Conflicting media import accepted');
  // Exercise the atomic writer itself, including a race after preview.
  if(!await rejects(()=>persistence.restoreRowsAtomic(conn,decoded)))
   throw Error('Atomic writer overwrote a differing record');
  const untouched=await persistence.readAll(conn);
  if(untouched.stories.some(row=>row.id===data.id)||
     untouched.files.some(row=>row.key===data.id+':2')||
     !(await persistence.identicalLibraryFile(shared,untouched.files.find(row=>row.key===shared.key))))
   throw Error('Failed atomic restore changed existing records or added partial data');
  await change(true);
  conn.close();
  const reviewed=await m.previewFreeLibraryRestore(backup,data.target,{allowOtherOrigin:true});
  if(!reviewed.safeToRestore||reviewed.identicalMediaEntries!==2)
   throw Error('Identical retained records did not permit restore');
  const rejectUnconfirmed=await rejects(()=>m.restoreFreeLibrary(backup,data.target,
    {allowOtherOrigin:true}));
  const invalidCues=new Blob([new Uint8Array(data.badCue)]);
  const invalidCuePreviewRejected=await rejects(()=>
   m.previewFreeLibraryRestore(invalidCues,data.target,{allowOtherOrigin:true}));
  const invalidCueRestoreRejected=await rejects(()=>
   m.restoreFreeLibrary(invalidCues,data.target,
    {allowOtherOrigin:true,confirmed:true}));
  const changed=new Uint8Array(data.bytes.slice());changed[changed.length-1]^=255;
  const corruptRejected=await rejects(()=>m.restoreFreeLibrary(new Blob([changed]),data.target,
    {allowOtherOrigin:true,confirmed:true}));
  const finished=await m.restoreFreeLibrary(backup,data.target,
    {allowOtherOrigin:true,confirmed:true});
  const duplicateRejected=await rejects(()=>m.restoreFreeLibrary(backup,data.target,
    {allowOtherOrigin:true,confirmed:true}));
  const req=indexedDB.open(data.target,1);
  const db=await new Promise((ok,err)=>{req.onsuccess=()=>ok(req.result);req.onerror=()=>err(req.error)});
  const tx=db.transaction(['stories','files'],'readonly');
  const s=tx.objectStore('stories'),f=tx.objectStore('files');
  const get=req=>new Promise((ok,err)=>{req.onsuccess=()=>ok(req.result);req.onerror=()=>err(req.error)});
  const preserved=await get(s.get('local-existing-new-story'));
  const restored=await get(s.get(data.id));
  const originals=await Promise.all([0,1,2].map(n=>get(f.get(data.id+':'+n))));
  const binary=await Promise.all(originals.map(async row=>Array.from(new Uint8Array(await row.blob.arrayBuffer()))));
  db.close();
  return {disallowOther,reviewed,rejectUnconfirmed,
   invalidCuePreviewRejected,invalidCueRestoreRejected,
   corruptRejected,finished,duplicateRejected,preserved,restored,binary};
 },{bytes:archiveData,badCue:badCueArchiveData,target:targetDb,id});
 assert.equal(result.disallowOther,true);
 assert.equal(result.rejectUnconfirmed,true);
 assert.equal(result.corruptRejected,true);
 assert.equal(result.invalidCuePreviewRejected,true);
 assert.equal(result.invalidCueRestoreRejected,true);
 assert.equal(result.reviewed.safeToRestore,true);
 assert.equal(result.reviewed.storyCount,1);
 assert.equal(result.reviewed.mediaStoreEntries,4);
 assert.equal(result.reviewed.identicalMediaEntries,2);
 assert.equal(result.finished.restoredStories,1);
 assert.equal(result.finished.readbackPassed,true);
 assert.equal(result.duplicateRejected,true);
 assert.equal(result.preserved.title,'NIET OVERSCHRIJVEN');
 assert.equal(result.restored.id,id);
 assert.deepEqual(result.restored.narrationCues.map(x=>x.t),[0,2000,5000]);
 assert.deepEqual(result.restored.items.map(x=>x.key),[id+':0',id+':1',id+':2']);
 assert.deepEqual(result.binary,[Array.from(image),Array.from(movie),Array.from(audio)]);
 assert.equal(posts,0,'No personal content may travel to any HTTP API');
 console.log('TALERA_F5_REAL_BROWSER_CROSS_ORIGIN_ARCHIVE_PASS',JSON.stringify({
  syntheticTwoOrigins:true,originalsByteIdentical:true,voiceCuesUnchanged:true,
  preservedExistingStory:true,checkedBeforeImport:true,explicitConsentRequired:true,
  corruptedFileRejected:true,repeatImportRefusedWithoutOverwrite:true,
  singleAtomicIdbTransaction:true,cloudMediaUploads:0,appPlayerModified:false,
  realIPhoneImported:false
 }));
 await context.close();
}finally{
 if(browser)await browser.close();
 await Promise.all([s1,s2].filter(Boolean).map(x=>new Promise(ok=>x.close(ok))));
}
