// Same approved TALERA /tell storage code, synthetic media only.
// Browser roundtrip for immutable canonical media IDs on edits and reorder.
// No second app, cloud, customer IDB, Worker deployment or live account.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import {scopeLocalMemories} from './f5-local-scope.mjs';
import {alignEditedNarrationCueRefs} from './f5-edit-cue-rebind.mjs';
import {retainEditorCanonicalMediaIds} from './f5-editor-canonical-refs.mjs';
import {preserveOriginalMediaIdsOnEdit,completePublishedRemovalOnOtherPage} from './f5-library-editor-stable-save.mjs';

const original=readFileSync('r20-dev/free-10m-delivery/generated/reference-tell.html','utf8');
const accountHash='b'.repeat(64);
const scoped=scopeLocalMemories(original,accountHash);
const mapped=retainEditorCanonicalMediaIds(alignEditedNarrationCueRefs(scoped));
const edited=preserveOriginalMediaIdsOnEdit(mapped);
const scripts=[...edited.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const storage=scripts.find(m=>m[1].includes('talera-memory-store-v1'))?.[2];
const deletion=scripts.find(m=>m[1].includes('talera-v9-complete-delete'))?.[2];
assert.ok(deletion&&deletion.includes('window.TaleraMemories.removePublishedStory(key)'));
assert.ok(!deletion.includes('indexedDB.open('),'UI deletion must not know physical storage');
assert.ok(storage.includes('removePublishedStory:taleraLibraryRemoval.removePublishedStory,'));
assert.ok(storage.includes('repairOrphanDrafts:taleraLibraryRemoval.repairOrphans,'));
assert.ok(storage.includes("db.transaction(['stories','files'],'readwrite')"),
 'Original atomic deletion must live in the one library owner');
assert.ok(storage&&storage.includes('async function save(input,uploads,editId,canonicalIds){'));
assert.ok(storage.includes('if(existing&&canonicalIds===undefined)for('));
assert.ok(storage.includes("taleraPayload.writePlans(tx.objectStore('files'),fresh"));
assert.ok(edited.includes("draftWriteRows:writeDraftRows,draftDeleteKeys:deleteDraftKeys,"));
assert.ok(edited.includes("async function writeFiles(entries){return mem.draftWriteRows("));
assert.ok(edited.includes("async function deleteFiles(ids){return mem.draftDeleteKeys("));
assert.ok(!edited.includes("async function writeFiles(entries){const db=await dbOpen()"));
assert.ok(edited.includes("draftReadPayload:readDraftPayload,"));
assert.ok(edited.includes("const {catalog,originals,previews}=await mem.draftReadPayload(MANIFEST,PREFIX);"));
assert.ok(!edited.includes("async function readDraft(){const db=await dbOpen()"));
assert.ok(edited.includes("const cached=await mem.blob(PREFIX+'duplicate-index-v7');"));
assert.ok(!edited.includes("const req=db.transaction('files','readonly').objectStore('files').get(PREFIX+'duplicate-index-v7')"));



const homeRaw=readFileSync('r20-dev/free-10m-delivery/generated/reference-mijn-leven.html','utf8');
const homeFixed=scopeLocalMemories(completePublishedRemovalOnOtherPage(homeRaw,original),accountHash);
const homeStorage=[...homeFixed.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
 .find(m=>m[1].includes('talera-memory-store-v1'))?.[2];
assert.ok(homeStorage?.includes('await taleraSharedPublishedRemoval(key)'));
const html='<!doctype html><html lang="nl"><head><meta charset="utf-8"></head><body>'+
 '<script id="talera-v9-complete-delete">'+deletion+'</'+'script>'+
 '<script id="talera-memory-store-v1">'+storage+'</'+'script></body></html>';
let page,browser,server,otherRequests=0;
const port=8963;
try{
 server=createServer((req,res)=>{
  if(req.method!=='GET'){otherRequests++;res.writeHead(405).end();return}
  const moduleName=String(req.url||'').slice(1);
  if(['f5-portable-idb.mjs','f5-portable-archive.mjs',
      'f5-library-persistence.mjs'].includes(moduleName)){
   res.writeHead(200,{'content-type':'text/javascript; charset=utf-8',
    'cache-control':'no-store'});
   res.end(readFileSync('r20-dev/free-10m-f5/'+moduleName,'utf8'));return;
  }
  if(req.url!=='/'){res.writeHead(404).end();return}
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
  res.end(html);
 });
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext();
 page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'load'});
 const outcome=await page.evaluate(async()=>{
  const mem=window.TaleraMemories;
  if(!mem||typeof mem.save!=='function')throw Error('Original TALERA library not loaded');
  async function originalPhoto(color,name){
   const cv=document.createElement('canvas');cv.width=3;cv.height=3;
   const ctx=cv.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,3,3);
   const file=await new Promise(resolve=>cv.toBlob(resolve,'image/png'));
   if(!(file instanceof Blob)||!file.size)throw Error('Cannot create synthetic photo');
   return new File([file],name,{type:'image/png'});
  }
  const first=await originalPhoto('#cc1122','fictief-a.png');
  const second=await originalPhoto('#22cc11','fictief-b.png');
  const third=await originalPhoto('#1122cc','fictief-c.png');
  const namespace='talera-f5-local-draft-test:';
  const conceptId='test-concept-photo';
  const manifestKey=namespace+'manifest';
  const draftRows=[
   [manifestKey,[{id:'synthetic-concept-01',media:[conceptId],voice:''}]],
   [namespace+conceptId,first],
   [namespace+'preview:'+conceptId,second]
  ];
  await mem.draftWriteRows(draftRows);
  const recovered=await mem.draftReadPayload(manifestKey,namespace);
  if(recovered.catalog.length!==1||
     recovered.catalog[0].media[0]!==conceptId||
     recovered.originals.length!==1||recovered.originals[0][0]!==conceptId||
     recovered.originals[0][1]?.size!==first.size||
     recovered.previews.length!==1||recovered.previews[0][1]?.size!==second.size)
   throw Error('Editor draft library did not read original, manifest and preview intact');
  const duplicateKey=namespace+'duplicate-index-v7';
  const duplicates={'test-hash':{signature:'synthetic',size:first.size}};
  await mem.draftWriteRows([[duplicateKey,duplicates]]);
  const restoredIndex=await mem.blob(duplicateKey);
  if(!restoredIndex||restoredIndex['test-hash']?.signature!=='synthetic')
   throw Error('Duplicate index could not be read via canonical library');
  await mem.draftDeleteKeys([duplicateKey]);
  await mem.draftDeleteKeys(draftRows.map(row=>row[0]));
  if(await mem.blob(manifestKey)||await mem.blob(namespace+conceptId)||
     await mem.blob(namespace+'preview:'+conceptId))
   throw Error('Test draft cleanup failed');
  const story=await mem.save({title:'Fictieve test',date:'1990-01-01',
   text:'geen persoonsgegevens'},[first,second]);
  // Temporary draft writes/deletes use the SAME account-local owner.
  // No alternate store or copied original media should be created.
  const draftKey='talera-v4-work:synthetic-test-draft';
  if(typeof mem.draftWriteRows!=='function'||typeof mem.draftDeleteKeys!=='function')
    throw Error('Draft writes do not use the library owner');
  await mem.draftWriteRows([[draftKey,first]]);
  const draftRead=await mem.blob(draftKey);
  if(!(draftRead instanceof Blob)||draftRead.size!==first.size)
    throw Error('Concept was not written to the original account-local library');
  await mem.draftDeleteKeys([draftKey]);
  if(await mem.blob(draftKey))
    throw Error('Temporary draft deletion left a stale original library record');
  // Rejection must not partially write unvalidated draft records.
  let invalidDraftRejected=false;
  try{await mem.draftWriteRows([[draftKey,first],['',second]])}
  catch(error){invalidDraftRejected=String(error.message).includes('conceptbestanden')}
  if(!invalidDraftRejected||await mem.blob(draftKey))
    throw Error('Invalid draft batch wrote partial data');
  const keys=story.items.map(item=>item.key);
  if(keys.length!==2||keys[0]===keys[1])throw Error('Initial canonical IDs invalid');
  const bytes=async id=>[...new Uint8Array(await (await mem.blob(id)).arrayBuffer())];
  const oldA=await bytes(keys[0]),oldB=await bytes(keys[1]);
  const reordered=await mem.save({title:'Herschikt',date:'1990-01-01',
   text:'zelfde oorspronkelijke bestanden'},[second,first],story.id,[keys[1],keys[0]]);
  const order=reordered.items.map(item=>item.key);
  if(order[0]!==keys[1]||order[1]!==keys[0])throw Error('Canonical IDs changed during reorder');
  if(JSON.stringify(await bytes(keys[0]))!==JSON.stringify(oldA)||
     JSON.stringify(await bytes(keys[1]))!==JSON.stringify(oldB))
   throw Error('One original changed during reorder');
  const grown=await mem.save({title:'Uitgebreid',date:'1990-01-01',
   text:'twee bestaand en een nieuw'},[second,first,third],story.id,[keys[1],keys[0],null]);
  const thirdKey=grown.items[2]?.key;
  if(!thirdKey||keys.includes(thirdKey))throw Error('Added file reused existing canonical ID');
  if(!(await mem.blob(thirdKey)))throw Error('New original not available');
  if(typeof mem.updateCues!=='function')throw Error('Cue writer missing from original library');
  const planned=[{t:0,index:0,mediaId:grown.items[0].key},
   {t:3000,index:1,mediaId:grown.items[1].key,videoAtMs:200}];
  await mem.updateCues(story.id,planned);
  const storedPlan=(await mem.get(story.id)).narrationCues;
  if(JSON.stringify(storedPlan)!==JSON.stringify(planned))
   throw Error('Narration cues did not survive library writer readback');
  const before=JSON.stringify((await mem.get(story.id)).items);
  let rejected=false;
  try{
   await mem.save({title:'Ongeldige koppeling',date:'1990-01-01',text:'onveilig'},
    [first,second],story.id,[keys[0],keys[0]]);
  }catch(e){rejected=String(e.message).includes('media-ID')}
  if(!rejected)throw Error('Duplicate canonical reference accepted');
  const after=JSON.stringify((await mem.get(story.id)).items);
  if(after!==before)throw Error('Rejected edit changed original story');
  // A missing original-ID mapping MUST fail before any destructive replacement.
  let unmappedRejected=false;
  try{
   await mem.save({title:'Bewerking zonder ID-koppeling',date:'1990-01-01',
    text:'niet opslaan'},[first,second],story.id);
  }catch(error){
   unmappedRejected=String(error.message).includes('media-ID-koppeling ontbreekt');
  }
  if(!unmappedRejected)throw Error('Editor accepted an edit without original media ID mapping');
  if(JSON.stringify((await mem.get(story.id)).items)!==before||
     JSON.stringify(await bytes(keys[0]))!==JSON.stringify(oldA)||
     JSON.stringify(await bytes(keys[1]))!==JSON.stringify(oldB))
   throw Error('Unmapped edit modified an original story or original bytes');
  const audit=await mem.audit();
  if(!audit.consistent)throw Error('Incomplete library after edit');
  // The SAME published library must survive complete lossless export and
  // readback/restore without changing any original file or permanent ID.
  const sourceDb='talera-free-local-'+('b'.repeat(32))+'-v1';
  const targetDb='talera-free-local-'+('c'.repeat(32))+'-v1';
  const backup=await import('/f5-portable-idb.mjs');
  const codec=await import('/f5-portable-archive.mjs');
  const archive=await backup.exportExistingFreeLibrary(sourceDb);
  const decoded=await codec.decodeFreeArchive(archive);
  const archived=decoded.stories.find(row=>row.id===story.id);
  if(!archived||archived.items.map(x=>x.key).join(',')!==
       grown.items.map(x=>x.key).join(','))
   throw Error('Backup lost permanent media IDs or ordering');
  if(JSON.stringify(archived.narrationCues)!==JSON.stringify(planned))
   throw Error('Backup changed narration cues');
  const exportedFiles=new Map(decoded.files.map(file=>[file.key,file.blob]));
  for(const key of grown.items.map(item=>item.key)){
   const file=exportedFiles.get(key),src=await mem.blob(key);
   if(!(file instanceof Blob)||!(src instanceof Blob))
    throw Error('Backup missing original media');
   if(JSON.stringify([...new Uint8Array(await file.arrayBuffer())])!==
      JSON.stringify([...new Uint8Array(await src.arrayBuffer())]))
    throw Error('Backup modified original bytes');
  }
  const createTarget=await new Promise((resolve,reject)=>{
   const req=indexedDB.open(targetDb,1);
   req.onupgradeneeded=()=>{
    req.result.createObjectStore('stories',{keyPath:'id'});
    req.result.createObjectStore('files',{keyPath:'key'});
   };
   req.onerror=()=>reject(req.error);
   req.onsuccess=()=>resolve(req.result);
  });
  createTarget.close();
  // Modern private account archives cannot cross into another account.
  let blocked=false;
  try{await backup.previewFreeLibraryRestore(archive,targetDb,{allowOtherOrigin:true})}
  catch(e){blocked=String(e.message).includes('TALERA_RESTORE_OTHER_ACCOUNT_BLOCKED')}
  if(!blocked)throw Error('Cross-account import unexpectedly accepted');
  // Exercise historical legacy-file migration with an explicitly unscoped
  // synthetic archive. Same-account cross-origin is covered by backup UI test.
  const legacyArchive=await codec.createFreeArchive({
   stories:decoded.stories,files:decoded.files,
   sourceScope:'talera-lifeline-dev-local-v1',
   sourceOrigin:location.origin,createdAt:new Date().toISOString()
  });
  const preview=await backup.previewFreeLibraryRestore(legacyArchive,targetDb,
   {allowOtherOrigin:true});
  if(!preview.safeToRestore)throw Error('Safe restore preview refused valid empty target');
  const imported=await backup.restoreFreeLibrary(legacyArchive,targetDb,
   {allowOtherOrigin:true,confirmed:true});
  if(!imported.readbackPassed||!imported.sourcePreserved)
   throw Error('Restore was incomplete');
  const persistence=await import('/f5-library-persistence.mjs');
  const target=await persistence.openExisting(targetDb,true);
  const restored=await persistence.readAll(target);
  target.close();
  const restoredStory=restored.stories.find(row=>row.id===story.id);
  if(!restoredStory||restoredStory.items.map(x=>x.key).join(',')!==
      grown.items.map(x=>x.key).join(',')||
      JSON.stringify(restoredStory.narrationCues)!==JSON.stringify(planned))
   throw Error('Restored story changed permanent media IDs, order or cues');
  const restoredMedia=new Map(restored.files.map(file=>[file.key,file.blob]));
  for(const key of grown.items.map(item=>item.key)){
   const file=restoredMedia.get(key),src=await mem.blob(key);
   if(!(file instanceof Blob)||!(src instanceof Blob)||
       JSON.stringify([...new Uint8Array(await file.arrayBuffer())])!==
       JSON.stringify([...new Uint8Array(await src.arrayBuffer())]))
    throw Error('Restored original media bytes are not identical');
  }
  // Existing complete-delete button MUST use the original bookcase and
  // preserve media shared with another memory in one atomic transaction.
  // Separate fixture originals: no overlap with the earlier edited story.
  const sharePhoto=await originalPhoto('#3399aa','shared-fixture.png');
  const deletePhoto=await originalPhoto('#991199','unique-fixture.png');
  const deleteMe=await mem.save({title:'Weg te halen testherinnering',
   date:'1990-01-01',text:'synthetisch'},[sharePhoto,deletePhoto]);
  const [sharedKey,uniqueKey]=deleteMe.items.map(item=>item.key);
  const input={title:'Gedeelde video',date:'1990-01-01',text:'synthetisch'};
  const staleFile=new File([Uint8Array.of(5,8,13)],'stale-edit.mov',
   {type:'video/quicktime',lastModified:1700000000000});
  const stale=await mem.save(input,[staleFile]);
  // Interpose the existing IndexedDB get request during edit preflight.
  // The code under test is unchanged: only the timing of a concurrent
  // synthetic deletion is controlled by this fixture.
  const originalGet=IDBObjectStore.prototype.get;
  let armed=true,deleted=false;
  IDBObjectStore.prototype.get=function(key){
   const req=originalGet.call(this,key);
   if(armed&&this.name==='files'&&key===stale.items[0].key){
    armed=false;
    req.addEventListener('success',()=>{
     const db=this.transaction.db;
     const tx=db.transaction(['stories','files'],'readwrite');
     tx.objectStore('stories').delete(stale.id);
     tx.objectStore('files').delete(stale.items[0].key);
     tx.oncomplete=()=>{deleted=true};
    });
   }
   return req;
  };
  let staleRejected=false;
  try{await mem.save(input,[staleFile],stale.id,[stale.items[0].key])}
  catch(e){staleRejected=/intussen|oorspronkelijk/i.test(String(e.message))}
  finally{IDBObjectStore.prototype.get=originalGet}
  if(!staleRejected||!deleted||await mem.get(stale.id)||await mem.blob(stale.items[0].key))
   throw Error('Concurrent deleted story was resurrected or stale edit not rejected');
  const originalVideo=new File([Uint8Array.of(3,9,2,5,1)],'shared-original.mov',
   {type:'video/quicktime',lastModified:1700000000000});
  const identicalVideo=new File([Uint8Array.of(3,9,2,5,1)],originalVideo.name,
   {type:originalVideo.type,lastModified:originalVideo.lastModified});
  const differentVideo=new File([Uint8Array.of(3,9,2,5,2)],originalVideo.name,
   {type:originalVideo.type,lastModified:originalVideo.lastModified});
  const differentName=new File([identicalVideo],'other-original.mov',
   {type:originalVideo.type,lastModified:originalVideo.lastModified});
  const firstVideoStory=await mem.save(input,[originalVideo]);
  const secondVideoStory=await mem.save(input,[identicalVideo]);
  const separateVideoStory=await mem.save(input,[differentVideo]);
  const separateMetadataStory=await mem.save(input,[differentName]);
  const sharedVideoKey=firstVideoStory.items[0].key;
  if(secondVideoStory.items[0].key!==sharedVideoKey||
     separateVideoStory.items[0].key===sharedVideoKey||
     separateMetadataStory.items[0].key===sharedVideoKey)
   throw Error('New video reuse lost bytes, metadata or exact canonical ID');
  // Different chunks must not be treated as equal even if their first
  // four MiB and original File metadata match. Use bounded synthetic bytes.
  const chunk=new Uint8Array(4*1024*1024);chunk.fill(19);
  const options={type:'video/quicktime',lastModified:1700000000000};
  const largeA=new File([chunk,Uint8Array.of(1)],'chunk-check.mov',options);
  const largeB=new File([chunk,Uint8Array.of(2)],'chunk-check.mov',options);
  const multiA=await mem.save(input,[largeA]);
  const multiB=await mem.save(input,[largeB]);
  const multiCopy=await mem.save(input,[new File([largeA],largeA.name,options)]);
  if(multiA.items[0].key===multiB.items[0].key||
     multiA.items[0].key!==multiCopy.items[0].key)
   throw Error('Multi-chunk comparison did not preserve exact content identity');
  await mem.removePublishedStory(multiA.id);
  if(!(await mem.blob(multiCopy.items[0].key)))
   throw Error('Multi-chunk shared original was removed prematurely');
  await mem.removePublishedStory(multiCopy.id);
  await mem.removePublishedStory(multiB.id);
  const twinFrames=await mem.save(input,[identicalVideo,identicalVideo]);
  if(twinFrames.items[0].key===twinFrames.items[1].key)
   throw Error('Distinct cue positions in one story lost their IDs');
  const payloadDb='talera-free-local-'+('b'.repeat(32))+'-v1';
  const rawFiles=async()=>{
   const database=await new Promise((ok,bad)=>{const q=indexedDB.open(payloadDb,1);q.onsuccess=()=>ok(q.result);q.onerror=()=>bad(q.error)});
   try{return await new Promise((ok,bad)=>{const q=database.transaction('files','readonly').objectStore('files').getAll();q.onsuccess=()=>ok(q.result);q.onerror=()=>bad(q.error)})}
   finally{database.close()}
  };
  const raw=await rawFiles();
  const distinctIds=[sharedVideoKey,separateMetadataStory.items[0].key,...twinFrames.items.map(item=>item.key)];
  const links=distinctIds.map(key=>raw.find(row=>row.key===key));
  if(links.some(row=>!row?.payloadKey||row.blob!==undefined)||new Set(links.map(row=>row.payloadKey)).size!==1)
   throw Error('Different media IDs and File metadata did not share one physical original');
  const payloadId=links[0].payloadKey;
  if(raw.filter(row=>row.key===payloadId&&row.blob===undefined&&Array.isArray(row.binaryParts)&&row.binaryParts.reduce((n,b)=>n+b.byteLength,0)===originalVideo.size).length!==1)
   throw Error('One physical payload was not stored exactly once');
  // Use the real archive and restore code for distinct IDs sharing the same
  // original bytes, not merely a direct storage-helper roundtrip.
  const sourceConn=await persistence.openExisting(payloadDb,false);
  const sourceSnapshot=await persistence.readAll(sourceConn);
  sourceConn.close();
  const selectedStories=sourceSnapshot.stories.filter(row=>[firstVideoStory.id,separateMetadataStory.id,twinFrames.id].includes(row.id));
  const selectedKeys=new Set(selectedStories.flatMap(row=>row.items.map(item=>item.key)));
  const selectedFiles=sourceSnapshot.files.filter(row=>selectedKeys.has(row.key));
  const compact=await codec.createFreeArchive({stories:selectedStories,files:selectedFiles,
   sourceScope:targetDb,sourceOrigin:location.origin});
  const compactSummary=await codec.inspectFreeArchive(compact);
  if(compactSummary.sharedEntries!==selectedKeys.size-1||compactSummary.binaryBytes!==originalVideo.size)
   throw Error('Backup did not store the shared original payload exactly once');
  const compactResult=await backup.restoreFreeLibrary(compact,targetDb,{confirmed:true});
  if(!compactResult.readbackPassed)throw Error('Shared-payload restore failed');
  const restoredConn=await persistence.openExisting(targetDb,true);
  const restoredRaw=await new Promise((ok,bad)=>{
   const q=restoredConn.transaction('files','readonly').objectStore('files').getAll();
   q.onsuccess=()=>ok(q.result);q.onerror=()=>bad(q.error);
  });
  const restoredLogical=await persistence.readAll(restoredConn);restoredConn.close();
  const restoredLinks=restoredRaw.filter(row=>selectedKeys.has(row.key));
  if(restoredLinks.length!==selectedKeys.size||
     restoredLinks.some(row=>row.payloadKey!==payloadId||row.blob!==undefined)||
     restoredRaw.filter(row=>row.key===payloadId&&row.blob===undefined&&Array.isArray(row.binaryParts)&&row.binaryParts.reduce((n,b)=>n+b.byteLength,0)===originalVideo.size).length!==1)
   throw Error('Restore recreated duplicate physical original payloads');
  await persistence.verifyRestoredLibraryReadback({stories:selectedStories,files:selectedFiles},restoredLogical);
  console.log('TALERA_SHARED_ORIGINAL_COMPACT_BACKUP_AND_RESTORE_PHYSICAL_RECORDS_PASS');
  const added=await mem.save(input,[differentVideo,identicalVideo],separateVideoStory.id,
   [separateVideoStory.items[0].key,null]);
  if(added.items[1].key!==sharedVideoKey||added.items[0].key!==separateVideoStory.items[0].key)
   throw Error('Adding identical media during edit changed original IDs');
  // The actual deletion owner must keep the shared video until its last link.
  await mem.removePublishedStory(firstVideoStory.id);
  if(!(await mem.blob(sharedVideoKey))||!(await mem.get(secondVideoStory.id)))
   throw Error('First removal deleted a shared video');
  await mem.removePublishedStory(secondVideoStory.id);
  if(!(await mem.blob(sharedVideoKey)))throw Error('Second removal deleted a shared video');
  await mem.removePublishedStory(separateVideoStory.id);
  if(!(await mem.blob(sharedVideoKey)))throw Error('Edit removal deleted another memory video');
  await mem.removePublishedStory(twinFrames.id);
  if(await mem.blob(sharedVideoKey))throw Error('Last shared video link retained its original');
  if(!(await mem.blob(separateMetadataStory.items[0].key)))throw Error('Distinct metadata original lost');
  await mem.removePublishedStory(separateMetadataStory.id);
  if((await rawFiles()).some(row=>row.key===payloadId))
   throw Error('Last reference deletion left the physical payload');
  console.log('TALERA_NEW_SHARED_ORIGINALS_AND_REFERENCE_DELETE_PASS');
  const privateDb='talera-free-local-'+('b'.repeat(32))+'-v1';
  const shareId='local-shared-synthetic-media';
  const req=indexedDB.open(privateDb,1);
  const db=await new Promise((ok,bad)=>{
   req.onsuccess=()=>ok(req.result);req.onerror=()=>bad(req.error);
  });
  const tx=db.transaction('stories','readwrite');
  tx.objectStore('stories').add({id:shareId,source:'pwa-local',
   title:'Gedeeld origineel',items:[{key:sharedKey,kind:'photo'}]});
  await new Promise((ok,bad)=>{
   tx.oncomplete=ok;tx.onabort=()=>bad(tx.error);
  });
  db.close();
  // A backup must preserve both memories and their ONE shared media ID.
  // No duplicate logical original, even with distinct narrative catalog rows.
  const sharedDb=await new Promise((ok,bad)=>{
   const q=indexedDB.open(privateDb,1);
   q.onsuccess=()=>ok(q.result);q.onerror=()=>bad(q.error);
  });
  const {stories:sharedStories,files:sharedFiles}=await persistence.readAll(sharedDb);
  sharedDb.close();
  const {createFreeArchive,decodeFreeArchive}=await import('/f5-portable-archive.mjs');
  const sharedRoundtrip=await decodeFreeArchive(await createFreeArchive({
   stories:sharedStories,files:sharedFiles,sourceScope:privateDb}));
  if(sharedRoundtrip.stories.filter(row=>row.items?.some(item=>item.key===sharedKey)).length!==2||
     sharedRoundtrip.files.filter(row=>row.key===sharedKey).length!==1)
   throw Error('Backup did not preserve one shared original and both catalog links');
  if(typeof window.__taleraV9FullDelete!=='function'||
     typeof mem.removePublishedStory!=='function'||
     typeof mem.repairOrphanDrafts!=='function')
   throw Error('Original deletion UI is not linked to the library');
  let invalidDeleteRejected=false;
  try{await window.__taleraV9FullDelete('invalid-id')}
  catch(e){invalidDeleteRejected=String(e.message).includes('Ongeldig herinnerings-ID')}
  if(!invalidDeleteRejected)throw Error('Invalid deletion ID was accepted');
  const removal=await window.__taleraV9FullDelete(deleteMe.id);
  if(!removal||removal.removedMedia!==1||await mem.get(deleteMe.id)||
     !(await mem.blob(sharedKey))||(await mem.blob(uniqueKey)))
   throw Error('Deletion lost shared original or retained deleted record');
  if(!(await mem.get(shareId)))
   throw Error('Unrelated story was deleted');
  // Orphan cleanup removes only edits for missing published stories.
  const draftPrefix='talera-v4-work:',draftManifest=draftPrefix+'manifest';
  const goneDraft='orphan-synthetic-photo',keepDraft='new-independent-photo';
  await mem.draftWriteRows([
   [draftManifest,[
    {id:'orphan-synthetic',existing:'local-already-gone',
     media:[goneDraft],voice:''},
    {id:'new-synthetic',existing:'',media:[keepDraft],voice:''}
   ]],
   [draftPrefix+goneDraft,first],
   [draftPrefix+keepDraft,second]
  ]);
  const repaired=await window.__taleraV9RepairOrphans();
  const survivors=await mem.blob(draftManifest);
  if(repaired!==1||!Array.isArray(survivors)||survivors.length!==1||
     survivors[0].id!=='new-synthetic'||await mem.blob(draftPrefix+goneDraft)||
     !(await mem.blob(draftPrefix+keepDraft)))
   throw Error('Orphan cleanup deleted independent draft or retained orphan');
  // Synthetic cleanup is explicit and never touches owner/device data.
  await window.__taleraV9FullDelete(shareId);
  if(await mem.get(shareId)||await mem.blob(sharedKey))
   throw Error('Last reference removal retained shared original or story');
  if(!(await mem.get(grown.id))||!(await mem.blob(keys[0])))
   throw Error('Last reference removal damaged unrelated original');
  console.log('TALERA_SHARED_ORIGINAL_BACKUP_AND_LAST_REFERENCE_DELETE_PASS');
  await mem.draftDeleteKeys([draftManifest,draftPrefix+keepDraft]);
  return {storyUnchangedId:grown.id===story.id,
   reorderedExistingKeys:order.join(',')===keys.slice().reverse().join(','),
   existingOriginalBytesIdentical:true,newFileHasNewId:true,
   invalidEditRejected:true,originalReferencesValid:audit.consistent,
   narrationCuesStoredByLibrary:true,
   backupAndRestoreByteIdentical:true,restoredMediaIdsAndCuesIdentical:true,
   accountPrivate:true,photos:audit.photos,originals:audit.bytes};
 });
 // Verify the SAME Home storage remove method used by the owner's reset.
 // Execute only the actual generated storage script in the existing browser harness.
 await page.evaluate(async()=>{
  const mem=window.TaleraMemories;
  const photo=new File([new Uint8Array([1,2,3])],'delete-test.jpg',{type:'image/jpeg'});
  const doomed=await mem.save({title:'Delete regression',date:'1990-01-01',text:'test'},[photo]);
  const draft='home-linked-synthetic',independent='home-independent-synthetic';
  await mem.draftWriteRows([
   ['talera-v4-work:manifest',[{id:'linked',existing:doomed.id,media:[draft],voice:''},{id:'independent',existing:'',media:[independent],voice:''}]],
   ['talera-v4-work:'+draft,photo],['talera-v4-work:preview:'+draft,photo],
   ['talera-v4-work:'+independent,photo]
  ]);
  window.__homeDeleteFixture={id:doomed.id,key:doomed.items[0].key,draft,independent};
 });
 const homeFixture=await page.evaluate(()=>window.__homeDeleteFixture);
 const homePage=await context.newPage();
 const homeErrors=[];
 homePage.on('pageerror',e=>homeErrors.push(e.message));
 // Same existing test server/origin and same account IndexedDB, but a
 // fresh document so the old editor's library cannot mask the Home code.
 await homePage.route('http://127.0.0.1:'+port+'/',route=>route.fulfill({
  contentType:'text/html; charset=utf-8',
  body:'<!doctype html><html><body><script id="talera-memory-store-v1">'+homeStorage+'</'+'script></body></html>'
 }));
 await homePage.goto('http://127.0.0.1:'+port+'/',{waitUntil:'load'});
 await homePage.evaluate(async f=>{
  const mem=window.TaleraMemories;
  if(await mem.remove(f.id)!==true||await mem.get(f.id)||await mem.blob(f.key)||
     await mem.blob('talera-v4-work:'+f.draft)||await mem.blob('talera-v4-work:preview:'+f.draft))
   throw Error('Home remove left linked media or draft records');
  const manifest=await mem.blob('talera-v4-work:manifest');
  if(!Array.isArray(manifest)||manifest.some(g=>g.existing===f.id)||
     !(await mem.blob('talera-v4-work:'+f.independent)))
   throw Error('Home remove lost unrelated draft or retained deleted draft');
 },homeFixture);
 assert.deepEqual(homeErrors,[],'Original Home storage must load without errors');
 await homePage.close();
 console.log('TALERA_HOME_COMPLETE_DELETE_LINKED_DRAFT_PRESERVED_OTHER_DRAFT_PASS');
 assert.deepEqual(errors,[],'Original TALERA editor storage must load without JS errors');
 assert.equal(otherRequests,0,'No outgoing write requests permitted');
 assert.ok(outcome.storyUnchangedId&&outcome.reorderedExistingKeys&&outcome.newFileHasNewId);
 console.log('TALERA_LIBRARY_EDITOR_PERMANENT_ID_BROWSER_PASS',JSON.stringify({
  ...outcome,syntheticOnly:true,customerDataTouched:false,
  onPhysicalIPhoneValidated:false
 }));
}finally{
 await browser?.close();
 if(server)await new Promise(resolve=>server.close(resolve));
}
