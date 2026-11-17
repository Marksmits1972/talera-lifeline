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
import {preserveOriginalMediaIdsOnEdit} from './f5-library-editor-stable-save.mjs';

const original=readFileSync('r20-dev/free-10m-delivery/generated/reference-tell.html','utf8');
const accountHash='b'.repeat(64);
const scoped=scopeLocalMemories(original,accountHash);
const mapped=retainEditorCanonicalMediaIds(alignEditedNarrationCueRefs(scoped));
const edited=preserveOriginalMediaIdsOnEdit(mapped);
const scripts=[...edited.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const storage=scripts.find(m=>m[1].includes('talera-memory-store-v1'))?.[2];
assert.ok(storage&&storage.includes('async function save(input,uploads,editId,canonicalIds){'));
assert.ok(storage.includes('if(existing&&canonicalIds===undefined)for('));
assert.ok(storage.includes("tx.objectStore('files').add(row)"));
assert.ok(edited.includes("draftWriteRows:writeDraftRows,draftDeleteKeys:deleteDraftKeys,"));
assert.ok(edited.includes("async function writeFiles(entries){return mem.draftWriteRows("));
assert.ok(edited.includes("async function deleteFiles(ids){return mem.draftDeleteKeys("));
assert.ok(!edited.includes("async function writeFiles(entries){const db=await dbOpen()"));
assert.ok(edited.includes("draftReadPayload:readDraftPayload,"));
assert.ok(edited.includes("const {catalog,originals,previews}=await mem.draftReadPayload(MANIFEST,PREFIX);"));
assert.ok(!edited.includes("async function readDraft(){const db=await dbOpen()"));


const html='<!doctype html><html lang="nl"><head><meta charset="utf-8"></head><body>'+
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
  const preview=await backup.previewFreeLibraryRestore(archive,targetDb,
   {allowOtherOrigin:true});
  if(!preview.safeToRestore)throw Error('Safe restore preview refused valid empty target');
  const imported=await backup.restoreFreeLibrary(archive,targetDb,
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
  return {storyUnchangedId:grown.id===story.id,
   reorderedExistingKeys:order.join(',')===keys.slice().reverse().join(','),
   existingOriginalBytesIdentical:true,newFileHasNewId:true,
   invalidEditRejected:true,originalReferencesValid:audit.consistent,
   narrationCuesStoredByLibrary:true,
   backupAndRestoreByteIdentical:true,restoredMediaIdsAndCuesIdentical:true,
   accountPrivate:true,photos:audit.photos,originals:audit.bytes};
 });
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
