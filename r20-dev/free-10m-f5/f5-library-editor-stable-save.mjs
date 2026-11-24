// TALERA Free: permanent published media IDs, independent of visual order.
// Patch only the ORIGINAL private-account TaleraMemories save and editor call.
// No migration, secondary database or Worker. Existing full-delete is exposed in the editor.
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

 // Expose the existing complete-delete action in the original signed-in editor.
 // The published ID comes from the current editor group, never from an arbitrary
 // URL alone. The unchanged library owns the atomic deletion and media cleanup.
 return exposeCompleteMemoryDelete(relocateApprovedDeletionIntoLibrary(html));
}
export function exposeCompleteMemoryDelete(html){
 const start=html.indexOf('function setupV20Tags(g,details){');
 const end=html.indexOf('}function setupV10(',start);
 if(start<0||end<=start)throw Error('TALERA_EDITOR_DELETE_UI_SOURCE_DRIFT');
 const section=html.slice(start,end+1);
 const anchor=' details.append(box);';
 if(section.split(anchor).length!==2||html.includes('talera-delete-published-memory'))
  throw Error('TALERA_EDITOR_DELETE_UI_ANCHOR_DRIFT');
 const action=String.raw`
 // Only a genuinely published memory in this editor gets a destructive action.
 (()=> {
  const id=g.existing;
  if(typeof id!=='string'||!/^local-[a-z0-9-]+$/i.test(id))return;
  const requested=new URLSearchParams(location.search).get('edit');
  if(requested&&requested!==id)return;
  const strings={
   nl:['Herinnering verwijderen','Wil je deze complete herinnering definitief verwijderen? Ook de bijbehorende foto’s, video’s en opname worden verwijderd. Dit kan niet ongedaan worden gemaakt zonder back-up.','Verwijderen is niet bevestigd. Controleer Mijn leven voordat je het opnieuw probeert.'],
   en:['Delete memory','Permanently delete this entire memory, including its photos, videos and recording? This cannot be undone without a backup.','Deletion was not confirmed. Check My Life before trying again.'],
   de:['Erinnerung löschen','Diese gesamte Erinnerung samt Fotos, Videos und Aufnahme endgültig löschen? Ohne Sicherung kann dies nicht rückgängig gemacht werden.','Löschen nicht bestätigt. Prüfe Mein Leben, bevor du es erneut versuchst.'],
   fr:['Supprimer le souvenir','Supprimer définitivement ce souvenir, ses photos, vidéos et enregistrement ? Sans sauvegarde, cette action est irréversible.','Suppression non confirmée. Vérifiez Ma vie avant de réessayer.'],
   es:['Eliminar recuerdo','¿Eliminar definitivamente este recuerdo, sus fotos, vídeos y grabación? No se puede deshacer sin una copia de seguridad.','No se ha confirmado la eliminación. Revisa Mi vida antes de volver a intentarlo.']
  };
  const lang=String(window.TaleraI18n?.language||document.documentElement.lang||'nl').slice(0,2);
  const labels=strings[lang]||strings.en;
  const optionsLabels={nl:'Meer opties voor deze herinnering',en:'More options for this memory',
   de:'Weitere Optionen für diese Erinnerung',fr:'Plus d’options pour ce souvenir',
   es:'Más opciones para este recuerdo'};
  const menu=document.createElement('div');
  menu.className='talera-editor-memory-options';
  menu.style.cssText='position:absolute;right:0;top:0;z-index:30;width:44px;height:44px;';
  const toggle=document.createElement('button');
  toggle.type='button';toggle.className='talera-editor-memory-options-toggle';
  toggle.setAttribute('aria-label',optionsLabels[lang]||optionsLabels.en);
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-controls','talera-editor-memory-options-panel');
  toggle.style.cssText='display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:transparent;color:#476376;font:700 23px/1 system-ui;cursor:pointer;';
  toggle.textContent='⋯';
  const panel=document.createElement('div');
  panel.id='talera-editor-memory-options-panel';panel.hidden=true;
  panel.style.cssText='position:absolute;top:44px;right:0;width:max-content;max-width:calc(100vw - 32px);background:#fff;border:1px solid #dbe4ef;border-radius:12px;box-shadow:0 4px 14px #0b1d401c;padding:4px;box-sizing:border-box;';
  const button=document.createElement('button');
  button.type='button';button.className='talera-delete-published-memory';
  button.textContent=labels[0];
  button.style.cssText='display:block;min-height:44px;max-width:100%;padding:10px 12px;border:0;border-radius:8px;background:transparent;color:#a52229;font:inherit;font-size:14px;font-weight:600;text-align:left;cursor:pointer;';
  panel.append(button);menu.append(toggle,panel);
  let busy=false;
  const closeMenu=()=>{
   panel.hidden=true;toggle.setAttribute('aria-expanded','false');
   document.removeEventListener('pointerdown',outside,true);
   document.removeEventListener('keydown',escape,true);
  };
  const outside=event=>{if(!menu.contains(event.target)||!menu.isConnected)closeMenu()};
  const escape=event=>{if(event.key==='Escape'){closeMenu();toggle.focus()}};
  toggle.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();
   if(busy)return;
   if(!panel.hidden){closeMenu();return}
   panel.hidden=false;toggle.setAttribute('aria-expanded','true');
   document.addEventListener('pointerdown',outside,true);
   document.addEventListener('keydown',escape,true);
  });
  button.addEventListener('click',async event=>{
   event.preventDefault();event.stopPropagation();
   if(busy||panel.hidden||!button.isConnected||g.existing!==id)return;
   closeMenu();
   const store=window.TaleraMemories,remove=window.__taleraV9FullDelete;
   if(typeof store?.get!=='function'||typeof remove!=='function'){
    window.alert(labels[2]);return;
   }
   busy=true;button.disabled=true;toggle.disabled=true;
   const work=button.closest('.work.talera-r16-editor');
   let locked=false;
   try{
    const row=await store.get(id);
    if(!button.isConnected||g.existing!==id||!row||row.id!==id||row.source!=='pwa-local')
     throw Error('TALERA_DELETE_TARGET_NOT_CURRENT');
    if(!window.confirm(labels[1]))return;
    if(work){work.inert=true;locked=true;}
    await remove(id);
    if(await store.get(id))throw Error('TALERA_DELETE_READBACK_FAILED');
    // Leave the deleted draft/editor route, not the original presentation.
    location.replace('/mijn-leven');
   }catch(_){window.alert(labels[2]);}
   finally{
    if(locked&&work)work.inert=false;
    busy=false;button.disabled=false;toggle.disabled=false;
   }
  });
  requestAnimationFrame(()=>{
   const work=box.closest('.work.talera-r16-editor');
   const heading=work?.querySelector('.talera-v14-heading');
   const title=heading?.querySelector('#title');
   if(!box.isConnected||!work||!heading||!title||g.existing!==id||
      work.querySelector('.talera-editor-memory-options'))return;
   // Absolute overlay uses the previously blank upper-right corner, never
   // another flex row. Reserve only horizontal room within the original title.
   if(getComputedStyle(heading).position==='static')heading.style.position='relative';
   title.style.setProperty('box-sizing','border-box','important');
   title.style.setProperty('padding-right','48px','important');
   heading.append(menu);
  });
 })();
 `;
 return html.slice(0,start)+section.replace(anchor,anchor+action)+html.slice(end+1);
}
export function completePublishedRemovalOnOtherPage(html,editorHtml){
 const startTag='<script id="talera-v9-complete-delete">';
 const start=editorHtml.indexOf(startTag);
 const end=start<0?-1:editorHtml.indexOf('</script>',start+startTag.length);
 if(start<0||end<0||editorHtml.indexOf(startTag,start+startTag.length)!==-1)
  throw Error('TALERA_SHARED_DELETE_SOURCE_DRIFT');
 const source=editorHtml.slice(start+startTag.length,end);
 const first=source.indexOf('const DB='),last=source.indexOf('function dropLocalHandoff(id){');
 if(first<0||last<=first||source.indexOf('const DB=',first+1)!==-1)
  throw Error('TALERA_SHARED_DELETE_CORE_DRIFT');
 const core=source.slice(first,last);
 if(!core.includes("db.transaction(['stories','files'],'readwrite')")||
    !core.includes('if(keep.has(key))continue;')||
    !core.includes('const used=new Set(')||
    !core.includes('talera-lifeline-dev-local-v1'))
  throw Error('TALERA_SHARED_DELETE_GUARD_DRIFT');
 // Reuse the existing library's DB_NAME; the account scoper must still
 // see exactly one legacy DB marker in the memory-store script.
 const scopedCore=core.replace(/(['"])talera-lifeline-dev-local-v1\1/g,'DB_NAME');
 if(scopedCore.includes('talera-lifeline-dev-local-v1'))
  throw Error('TALERA_SHARED_DELETE_DB_DRIFT');
 const old="async function remove(id){const key=String(id||'');const old=await get(key);if(!old||old.source!=='pwa-local'||!/^local-[a-z0-9-]+$/i.test(key))throw Error('Deze herinnering kan niet lokaal verwijderd worden.');const others=(await list()).filter(row=>row.id!==key);const used=new Set(others.flatMap(row=>(row.items||[]).map(item=>item.key)));const keys=[...new Set((old.items||[]).map(item=>item.key).filter(k=>k&&!used.has(k)))];const db=await open(),tx=db.transaction(['stories','files'],'readwrite'),finish=done(tx);tx.objectStore('stories').delete(key);for(const item of keys){tx.objectStore('files').delete(item);tx.objectStore('files').delete(item+PHONE_VARIANT)}await finish;return true;}";
 if(html.split(old).length!==2)throw Error('TALERA_SHARED_DELETE_ORIGINAL_DRIFT');
 const replacement="const taleraSharedPublishedRemoval=(()=>{\n"+scopedCore+
  "\nreturn removeStorage;\n})();\n"+
  "async function remove(id){const key=String(id||'');const old=await get(key);if(!old||old.source!=='pwa-local'||!/^local-[a-z0-9-]+$/i.test(key))throw Error('Deze herinnering kan niet lokaal verwijderd worden.');await taleraSharedPublishedRemoval(key);return true;}";
 return html.replace(old,()=>replacement);
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
 // The simpler legacy library.remove API must use the same complete-delete
 // core as the existing editor menu. Keep its boolean result contract.
 const oldRemove="remove:remove,";
 if(html.split(oldRemove).length!==2)throw Error('TALERA_LIBRARY_DELETE_ALIAS_DRIFT');
 html=html.replace(oldRemove,
  "remove:async id=>{await taleraLibraryRemoval.removePublishedStory(id);return true},");
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

