// TALERA Free: permanent published media IDs, independent of visual order.
// Patch only the ORIGINAL private-account TaleraMemories save and editor call.
// No migration, secondary database, Worker, UI change or media deletion.
export function preserveOriginalMediaIdsOnEdit(html){
 if(typeof html!=='string'||!html.includes('talera-memory-store-v1'))
  throw Error('TALERA_LIBRARY_EDITOR_SAVE_SOURCE_MISSING');
 const exact=(a,b,label)=>{
  const n=html.split(a).length-1;
  if(n!==1)throw Error('TALERA_LIBRARY_EDITOR_SAVE_DRIFT_'+label+':'+n);
  html=html.replace(a,b);
 };
 exact("async function save(input,uploads,editId){","async function save(input,uploads,editId,canonicalIds){","SAVE_ARG");
 exact("if(editId&&(!existing||existing.source!=='pwa-local'))throw Error('Deze herinnering kan niet worden bewerkt.');","if(editId&&(!existing||existing.source!=='pwa-local'))throw Error('Deze herinnering kan niet worden bewerkt.');\n if(existing&&uploads.length&&canonicalIds===undefined)\n  throw Error('De oorspronkelijke media-ID-koppeling ontbreekt. De bestaande herinnering blijft intact.');\n if(existing&&canonicalIds!==undefined){\n  if(!Array.isArray(canonicalIds)||canonicalIds.length!==uploads.length)\n   throw Error('Het oorspronkelijke media-overzicht is onvolledig.');\n  const originals=new Map((existing.items||[]).map(item=>[item.key,item]));\n  const used=new Set();\n  for(let n=0;n<uploads.length;n++){\n   const key=canonicalIds[n];\n   if(key===null||key===undefined)continue;\n   if(typeof key!=='string'||!originals.has(key)||used.has(key))\n    throw Error('Een oorspronkelijk media-ID kan niet veilig worden teruggevonden.');\n   const item=originals.get(key),original=await blob(key);\n   if(item.kind!==typeOf(uploads[n])||item.size!==uploads[n].size||\n      !(original instanceof Blob)||!original.size)\n    throw Error('Het oorspronkelijke mediabestand is niet meer hetzelfde. De herinnering blijft behouden.');\n   used.add(key);\n  }\n }\n","PREFLIGHT_ORIGINAL");
 exact("files.push({key:id+':'+i,kind:kind,name:safeName(f.name||kind),mime:f.type||'',size:f.size});","const mediaKey=existing&&canonicalIds!==undefined?\n   (canonicalIds[i]||id+':new-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2))):\n   id+':'+i;\n  files.push({key:mediaKey,kind:kind,name:safeName(f.name||kind),mime:f.type||'',size:f.size});","STABLE_KEYS");
 exact("birthYear:Number(input.birthYear)||null,source:'pwa-local'};","birthYear:Number(input.birthYear)||(existing?.birthYear||null),source:'pwa-local'};","PRESERVE_YEAR");
 exact("phoneCopies.push(typeOf(uploads[p])==='photo'?await phoneRendition(uploads[p]):null);","phoneCopies.push(!(existing&&canonicalIds!==undefined&&canonicalIds[p])&&typeOf(uploads[p])==='photo'?await phoneRendition(uploads[p]):null);","NO_COPY_REUSED");
 exact("if(existing)for(var k=0;k<(existing.items||[]).length;k++){","if(existing&&canonicalIds===undefined)for(var k=0;k<(existing.items||[]).length;k++){","KEEP_ORIGINALS");
 // Keep the already approved media-ID-safe editor write compatible with the
 // byte-owned original PHOTO File input of the CURRENT packaged /tell page.
 // The old anonymous reference is retained only for existing source tests.
 // Exactly one writer must be present; ambiguous or changed sources fail closed.
 const pickerWriter="for(var j=0;j<files.length;j++)tx.objectStore('files').put({key:files[j].key,blob:uploads[j]});";
 const ownedWriter="for(var j=0;j<files.length;j++)tx.objectStore('files').put({key:files[j].key,blob:taleraOwnedPhotoUploads[j]});";
 const pickerCount=html.split(pickerWriter).length-1;
 const ownedCount=html.split(ownedWriter).length-1;
 if(pickerCount+ownedCount!==1)
  throw Error('TALERA_LIBRARY_EDITOR_SAVE_DRIFT_ADD_ONLY_NEW:'+(pickerCount+ownedCount));
 const blobArray=ownedCount?'taleraOwnedPhotoUploads':'uploads';
 exact(ownedCount?ownedWriter:pickerWriter,
  "for(var j=0;j<files.length;j++){\n   if(existing&&canonicalIds!==undefined&&canonicalIds[j])continue;\n   const row={key:files[j].key,blob:"+blobArray+"[j]};\n   if(existing&&canonicalIds!==undefined)tx.objectStore('files').add(row);\n   else tx.objectStore('files').put(row);\n  }",
  "ADD_ONLY_NEW");
 exact("const title=g.title.trim();const row=await mem.save(","const title=g.title.trim();\n const canonicalIds=g.existing?(()=>{\n  if(!g.canonicalByDraft||typeof g.canonicalByDraft!=='object')\n   throw Error('Deze oudere conceptbewerking bevat geen veilige media-ID-koppelingen. De bestaande herinnering blijft intact.');\n  return [...g.media,...(g.voice?[g.voice]:[])].map(id=>g.canonicalByDraft[id]||null);\n })():undefined;\n const row=await mem.save(","EDITOR_IDS");
 exact("},uploads,g.existing||undefined);const persisted=await mem.get(row.id);","},uploads,g.existing||undefined,canonicalIds);const persisted=await mem.get(row.id);","EDITOR_SAVE_FOURTH_ARG");
 exact("window.TaleraMemories={save:save,","async function setNarrationCuesForStory(storyId,cues){\n const story=await get(storyId);\n if(!story||story.source!=='pwa-local'||!Array.isArray(cues))\n  throw Error('Het vertelplan kan niet veilig aan deze herinnering worden gekoppeld.');\n const updated={...story,narrationCues:cues,narrationSchema:'media-id-v1'};\n const db=await open(),tx=db.transaction('stories','readwrite'),finished=done(tx);\n tx.objectStore('stories').put(updated);\n await finished;\n return updated;\n}\nwindow.TaleraMemories={save:save,updateCues:setNarrationCuesForStory,","CUE_WRITER_LIBRARY_OWNER");
 exact("const updated={...persisted,narrationCues:mapped,narrationSchema:'media-id-v1'};\n  const db=await dbOpen();\n  try{\n    const tx=db.transaction('stories','readwrite'),complete=done(tx);\n    tx.objectStore('stories').put(updated);\n    await complete;\n  }finally{db.close()}","await mem.updateCues(persisted.id,mapped);","CUE_EDITOR_WRITES_THROUGH_LIBRARY");
 // Editor concept writes are now owned by the SAME account-local library.
 // Existing keys, stored Blob values and transaction semantics stay identical.
 exact("window.TaleraMemories={save:save,updateCues:setNarrationCuesForStory,",
   "async function writeDraftRows(rows){\n"+
   " if(!Array.isArray(rows)||rows.some(x=>!Array.isArray(x)||x.length!==2||typeof x[0]!=='string'||!x[0]))\n"+
   "  throw Error('Ongeldige conceptbestanden voor de bibliotheek.');\n"+
   " if(!rows.length)return;\n"+
   " const db=await open(),tx=db.transaction('files','readwrite'),finished=done(tx);\n"+
   " for(const [key,value] of rows)tx.objectStore('files').put({key,blob:value});\n"+
   " await finished;\n"+
   "}\n"+
   "async function deleteDraftKeys(keys){\n"+
   " if(!Array.isArray(keys)||keys.some(key=>typeof key!=='string'||!key))\n"+
   "  throw Error('Ongeldige conceptsleutels voor de bibliotheek.');\n"+
   " if(!keys.length)return;\n"+
   " const db=await open(),tx=db.transaction('files','readwrite'),finished=done(tx);\n"+
   " for(const key of keys)tx.objectStore('files').delete(key);\n"+
   " await finished;\n"+
   "}\n"+
   "async function readDraftPayload(manifestKey,prefix){\n"+
   " if(typeof manifestKey!=='string'||!manifestKey||\n"+
   "    typeof prefix!=='string'||!prefix)\n"+
   "  throw Error('Ongeldige conceptverwijzing voor de bibliotheek.');\n"+
   " const db=await open();\n"+
   " const store=db.transaction('files','readonly').objectStore('files');\n"+
   "  const manifest=await new Promise(resolve=>{\n"+
   "   const q=store.get(manifestKey);\n"+
   "   q.onsuccess=()=>resolve(q.result);\n"+
   "   q.onerror=()=>resolve(null);\n"+
   "  });\n"+
   "  const catalog=Array.isArray(manifest&&manifest.blob)?manifest.blob:[];\n"+
   "  const ids=[...new Set(catalog.flatMap(g=>[\n"+
   "   ...(g.media||[]),...(g.voice?[g.voice]:[])\n"+
   "  ]))];\n"+
   "  const fetchRows=async preview=>{\n"+
   "   if(!ids.length)return[];\n"+
   "   const objectStore=db.transaction('files','readonly').objectStore('files');\n"+
   "   return Promise.all(ids.map(id=>new Promise(resolve=>{\n"+
   "    const key=prefix+(preview?'preview:':'')+id;\n"+
   "    const q=objectStore.get(key);\n"+
   "    q.onsuccess=()=>resolve([id,q.result&&q.result.blob]);\n"+
   "    q.onerror=()=>resolve([id,null]);\n"+
   "   })));\n"+
   "  };\n"+
   "  const originals=await fetchRows(false);\n"+
   "  const previews=await fetchRows(true);\n"+
   "  return {catalog,originals,previews};\n"+
   "}\n"+
   "window.TaleraMemories={save:save,updateCues:setNarrationCuesForStory,"+
   "draftWriteRows:writeDraftRows,draftDeleteKeys:deleteDraftKeys,draftReadPayload:readDraftPayload,",
   "DRAFT_LIBRARY_OWNER");
 exact("async function writeFiles(entries){const db=await dbOpen();try{const t=db.transaction('files','readwrite'),d=done(t);for(const [id,file] of entries)t.objectStore('files').put({key:PREFIX+id,blob:file});await d}finally{db.close()}}",
   "async function writeFiles(entries){return mem.draftWriteRows(entries.map(([id,file])=>[PREFIX+id,file]))}",
   "DRAFT_WRITE_GATEWAY");
 exact("async function deleteFiles(ids){if(!ids.length)return;const db=await dbOpen();try{const t=db.transaction('files','readwrite'),d=done(t);ids.forEach(id=>t.objectStore('files').delete(PREFIX+id));await d}finally{db.close()}}",
   "async function deleteFiles(ids){return mem.draftDeleteKeys(ids.map(id=>PREFIX+id))}",
   "DRAFT_DELETE_GATEWAY");
 exact("async function readDraft(){const db=await dbOpen();try{const t=db.transaction('files','readonly'),s=t.objectStore('files');const m=await new Promise(res=>{const r=s.get(MANIFEST);r.onsuccess=()=>res(r.result);r.onerror=()=>res(null)});const a=Array.isArray(m&&m.blob)?m.blob:[];const ids=[...new Set(a.flatMap(g=>[...(g.media||[]),...(g.voice?[g.voice]:[])]))];const t2=db.transaction('files','readonly'),s2=t2.objectStore('files');const r=await Promise.all(ids.map(id=>new Promise(res=>{const q=s2.get(PREFIX+id);q.onsuccess=()=>res([id,q.result&&q.result.blob]);q.onerror=()=>res([id,null])})));r.forEach(([id,f])=>{if(f)assets.set(id,f)});const thumbTx=db.transaction('files','readonly'),thumbStore=thumbTx.objectStore('files');const found=await Promise.all(ids.map(id=>new Promise(res=>{const r=thumbStore.get(PREFIX+'preview:'+id);r.onsuccess=()=>res([id,r.result?.blob]);r.onerror=()=>res([id,null])})));found.forEach(([id,f])=>{if(f)previewBlobs.set(id,f)});groups=a.map(g=>({...g,media:(g.media||[]).filter(id=>assets.has(id)),voice:assets.has(g.voice)?g.voice:''})).filter(g=>g&&g.id)}finally{db.close()}}","async function readDraft(){\n const {catalog,originals,previews}=await mem.draftReadPayload(MANIFEST,PREFIX);\n originals.forEach(([id,f])=>{if(f)assets.set(id,f)});\n previews.forEach(([id,f])=>{if(f)previewBlobs.set(id,f)});\n groups=catalog.map(g=>({...g,\n  media:(g.media||[]).filter(id=>assets.has(id)),\n  voice:assets.has(g.voice)?g.voice:''\n })).filter(g=>g&&g.id);\n}","DRAFT_READ_GATEWAY");
 exact("async function loadDuplicateCache(){\n if(taleraDuplicateCache)return taleraDuplicateCache;\n const db=await dbOpen();\n try{const req=db.transaction('files','readonly').objectStore('files').get(PREFIX+'duplicate-index-v7');\n const row=await new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)});\n taleraDuplicateCache=row&&typeof row.blob==='object'&&!Array.isArray(row.blob)?row.blob:{};return taleraDuplicateCache;\n }finally{db.close()}\n}","async function loadDuplicateCache(){\n if(taleraDuplicateCache)return taleraDuplicateCache;\n const cached=await mem.blob(PREFIX+'duplicate-index-v7');\n taleraDuplicateCache=cached&&typeof cached==='object'&&!Array.isArray(cached)?cached:{};\n return taleraDuplicateCache;\n}","DUPLICATE_INDEX_READ_GATEWAY");
 return relocateApprovedDeletionIntoLibrary(html);
}
function relocateApprovedDeletionIntoLibrary(html){
 // Same approved full-delete and orphan-repair algorithms, physically moved
 // inside the existing account-local TaleraMemories library, not re-created.
 const tag='<script id="talera-v9-complete-delete">';
 const start=html.indexOf(tag);
 const end=start<0?-1:html.indexOf('</script>',start+tag.length);
 if(start<0||end<0||html.indexOf(tag,start+tag.length)!==-1)
  throw Error('TALERA_LIBRARY_DELETE_SCRIPT_DRIFT');
 const original=html.slice(start+tag.length,end);
 const extract=(begin,finish,label)=>{
  const at=original.indexOf(begin),last=at<0?-1:original.indexOf(finish,at+begin.length);
  if(at<0||last<0||original.indexOf(begin,at+begin.length)!==-1)
   throw Error('TALERA_LIBRARY_DELETE_SOURCE_DRIFT_'+label);
  return original.slice(at,last);
 };
 const deletionCore=extract('const DB=','function dropLocalHandoff(id){','ATOMIC_CORE');
 const localHandoff=extract('function dropLocalHandoff(id){',
  'window.__taleraV9FullDelete=async id=>{','LOCAL_HANDOFF');
 const repairAnchor='window.__taleraV9RepairOrphans=()=>transaction({run(';
 const repairAt=original.indexOf(repairAnchor),endIife=original.lastIndexOf('\n})();');
 if(repairAt<0||endIife<repairAt||original.slice(endIife).trim()!== '})();' ||
    !original.slice(repairAt,endIife).trim().endsWith('}});'))
  throw Error('TALERA_LIBRARY_DELETE_ORPHAN_SOURCE_DRIFT');
 const repair=original.slice(repairAt,endIife).replace(
  'window.__taleraV9RepairOrphans=','const repairOrphans=');
 if(!deletionCore.includes("db.transaction(['stories','files'],'readwrite')") ||
    !deletionCore.includes('if(keep.has(key))continue;') ||
    !deletionCore.includes('const used=new Set(') ||
    !repair.includes('const live=new Set('))
  throw Error('TALERA_LIBRARY_DELETE_SAFETY_GUARD_DRIFT');
 const owner="const taleraLibraryRemoval=(()=>{\n"+
  deletionCore+"\n"+repair+"\n"+
  "const removePublishedStory=async id=>{\n"+
  " const key=String(id||'');\n"+
  " if(!LOCAL.test(key))throw Error('Ongeldig herinnerings-ID.');\n"+
  " return removeStorage(key);\n"+
  "};\n"+
  "return Object.freeze({removePublishedStory,repairOrphans});\n"+
  "})();\n";
 const api="window.TaleraMemories={save:save,updateCues:setNarrationCuesForStory,"+
  "draftWriteRows:writeDraftRows,draftDeleteKeys:deleteDraftKeys,draftReadPayload:readDraftPayload,";
 if(html.split(api).length!==2)throw Error('TALERA_LIBRARY_DELETE_API_DRIFT');
 html=html.replace(api,owner+api+
  "removePublishedStory:taleraLibraryRemoval.removePublishedStory,"+
  "repairOrphanDrafts:taleraLibraryRemoval.repairOrphans,");
 // The original public functions keep exactly the same names and localStorage
 // cleanup; they now ask the library to do its atomic storage work.
 const wrapper="(()=>{\n'use strict';\n"+
  "if(window.__taleraV9FullDelete)return;\n"+
  "const LOCAL=/^local-[a-z0-9-]+$/i;\n"+
  localHandoff+
  "window.__taleraV9FullDelete=async id=>{\n"+
  " const key=String(id||'');\n"+
  " if(!LOCAL.test(key))throw Error('Ongeldig herinnerings-ID.');\n"+
  " if(typeof window.TaleraMemories?.removePublishedStory!=='function')\n"+
  "  throw Error('De bibliotheek is niet beschikbaar.');\n"+
  " const result=await window.TaleraMemories.removePublishedStory(key);\n"+
  " dropLocalHandoff(key);\n"+
  " return result;\n"+
  "};\n"+
  "window.__taleraV9RepairOrphans=()=>{\n"+
  " if(typeof window.TaleraMemories?.repairOrphanDrafts!=='function')\n"+
  "  throw Error('De bibliotheek is niet beschikbaar.');\n"+
  " return window.TaleraMemories.repairOrphanDrafts();\n"+
  "};\n"+
  "})();";
 const originalTag=tag+original+'</script>';
 if(html.split(originalTag).length!==2)throw Error('TALERA_LIBRARY_DELETE_REPLACEMENT_DRIFT');
 html=html.replace(originalTag,tag+wrapper+'</script>');
 return html;
}

