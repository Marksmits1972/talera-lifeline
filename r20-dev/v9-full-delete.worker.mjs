/* TALERA V9 — complete local deletion, including linked edit draft.
   Wrapper around the preserved V8, no new editor and no new database.
   Every deletion is one atomic IndexedDB transaction. */
const DELETE_JS="(()=>{\n'use strict';\nif(window.__taleraV9FullDelete)return;\nconst DB='talera-lifeline-dev-local-v1';\nconst PREFIX='talera-v4-work:';\nconst MANIFEST=PREFIX+'manifest';\nconst CACHE=PREFIX+'duplicate-index-v7';\nconst LOCAL=/^local-[a-z0-9-]+$/i;\nconst unique=a=>[...new Set(a.filter(Boolean).map(String))];\n\nfunction open(){\n return new Promise((resolve,reject)=>{\n  const r=indexedDB.open(DB,1);\n  r.onupgradeneeded=()=>{const db=r.result;\n    if(!db.objectStoreNames.contains('stories'))db.createObjectStore('stories',{keyPath:'id'});\n    if(!db.objectStoreNames.contains('files'))db.createObjectStore('files',{keyPath:'key'});\n  };\n  r.onerror=()=>reject(r.error||Error('De browseropslag kan niet worden geopend.'));\n  r.onsuccess=()=>resolve(r.result);\n });\n}\nfunction refs(groups){\n return new Set(groups.flatMap(g=>[...(Array.isArray(g.media)?g.media:[]),...(g.voice?[g.voice]:[])].map(String)));\n}\nfunction cleanDraftFiles(files,removed,survivors){\n const keep=refs(survivors);\n for(const key of unique([...removed.flatMap(g=>Array.isArray(g.media)?g.media:[]),...removed.map(g=>g.voice)])){\n  if(keep.has(key))continue;\n  files.delete(PREFIX+key);\n  files.delete(PREFIX+'preview:'+key);\n }\n}\nfunction transaction(action){\n return open().then(db=>new Promise((resolve,reject)=>{\n  let fail=null,output;\n  let tx;\n  try{tx=db.transaction(['stories','files'],'readwrite')}catch(e){db.close();reject(e);return}\n  tx.oncomplete=()=>{db.close();resolve(output)};\n  tx.onabort=()=>{db.close();reject(fail||tx.error||Error('Verwijderen is onderbroken.'))};\n  tx.onerror=()=>{};\n  const stories=tx.objectStore('stories'),files=tx.objectStore('files');\n  const tasks={\n   rows:stories.getAll(),\n   manifest:files.get(MANIFEST),\n   cache:files.get(CACHE)\n  };\n  if(action.id)tasks.target=stories.get(action.id);\n  const values={},entries=Object.entries(tasks);\n  let remaining=entries.length;\n  for(const [key,req] of entries){\n   req.onerror=()=>{fail=req.error||Error('Opslag is niet bereikbaar.');try{tx.abort()}catch(e){}};\n   req.onsuccess=()=>{\n    values[key]=req.result;\n    if(--remaining!==0)return;\n    try{output=action.run({stories,files,...values})}\n    catch(e){fail=e;try{tx.abort()}catch(x){}}\n   };\n  }\n }));\n}\nfunction removeStorage(id){\n return transaction({id,run({stories,files,rows,manifest,cache,target}){\n  if(!target||target.source!=='pwa-local'||String(target.id)!==id)\n   throw Error('Deze gepubliceerde herinnering is niet meer aanwezig.');\n  const groups=Array.isArray(manifest?.blob)?manifest.blob:[];\n  const removed=groups.filter(g=>String(g.existing||'')===id);\n  const survivors=groups.filter(g=>String(g.existing||'')!==id);\n  if(removed.length){\n   files.put({...manifest,key:MANIFEST,blob:survivors});\n   cleanDraftFiles(files,removed,survivors);\n  }\n  const used=new Set((rows||[]).filter(r=>r.id!==id)\n   .flatMap(r=>(r.items||[]).map(x=>x.key).filter(Boolean)));\n  const gone=unique((target.items||[]).map(x=>x.key).filter(k=>!used.has(k)));\n  for(const key of gone){files.delete(key);files.delete(key+':phone-v1')}\n  if(cache?.blob&&typeof cache.blob==='object'&&!Array.isArray(cache.blob)){\n   const next={...cache.blob};\n   for(const key of gone)delete next[key];\n   files.put({...cache,key:CACHE,blob:next});\n  }\n  stories.delete(id);\n  return{removedDrafts:removed.length,removedMedia:gone.length};\n }});\n}\nfunction dropLocalHandoff(id){\n try{\n  const key='talera-last-v9-timeline-handoff-v1',data=JSON.parse(localStorage.getItem(key)||'null');\n  if(data&&String(data.storyId)===id)localStorage.removeItem(key);\n }catch(e){}\n try{\n  const key='talera-linked-memory-credentials-v1';\n  const data=JSON.parse(localStorage.getItem(key)||'null');\n  if(data&&Object.prototype.hasOwnProperty.call(data,id)){\n   delete data[id];localStorage.setItem(key,JSON.stringify(data));\n  }\n }catch(e){}\n}\nwindow.__taleraV9FullDelete=async id=>{\n const key=String(id||'');\n if(!LOCAL.test(key))throw Error('Ongeldig herinnerings-ID.');\n const result=await removeStorage(key);\n dropLocalHandoff(key);\n return result;\n};\n// Old versions could remove a published story but leave its edit draft.\n// Remove ONLY orphaned edit drafts; preserve all independent new drafts\n// and all existing published stories. Never delete a whole DB or folder.\nwindow.__taleraV9RepairOrphans=()=>transaction({run({files,rows,manifest}){\n const groups=Array.isArray(manifest?.blob)?manifest.blob:[];\n if(!groups.length)return 0;\n const live=new Set((rows||[]).map(r=>String(r.id)));\n const removed=groups.filter(g=>{\n  const id=String(g.existing||'');\n  return LOCAL.test(id)&&!live.has(id);\n });\n if(!removed.length)return 0;\n const survivors=groups.filter(g=>!removed.includes(g));\n files.put({...manifest,key:MANIFEST,blob:survivors});\n cleanDraftFiles(files,removed,survivors);\n return removed.length;\n }});\n})();";
const BOOT_ANCHOR="await readDraft();const edit=new URLSearchParams(location.search).get('edit');";
const FULL_BOOT="await window.__taleraV9RepairOrphans();await readDraft();const edit=new URLSearchParams(location.search).get('edit');";
const EDITOR_DELETE="await store.remove(id);";
const FULL_EDITOR_DELETE="await window.__taleraV9FullDelete(id);";
const LIBRARY_DELETE="await window.TaleraMemories.remove(id);";
const FULL_LIBRARY_DELETE="await window.__taleraV9FullDelete(id);";
export default {
 async fetch(request,env){
  if(!env?.V8_BASE?.fetch)return new Response('Werkende TALERA V8-servicebinding ontbreekt',{status:503});
  const upstream=await env.V8_BASE.fetch(request);
  const path=new URL(request.url).pathname;
  if(request.method!=='GET'||!upstream.ok||
    !['/tell','/tell/','/mijn-leven'].includes(path)||
    !(upstream.headers.get('content-type')||'').includes('text/html'))return upstream;
  const original=await upstream.text();
  const edit=path==='/tell'||path==='/tell/';
  let text=original,changed=false;
  const match=(s,token)=>s.split(token).length-1;
  const boot=edit&&match(text,BOOT_ANCHOR)===1;
  const editorDelete=edit&&match(text,EDITOR_DELETE)===1;
  const libraryDelete=!edit&&match(text,LIBRARY_DELETE)===1;
  if(boot){
   text=text.replace(BOOT_ANCHOR,FULL_BOOT);
   changed=true;
  }
  if(editorDelete){
   text=text.replace(EDITOR_DELETE,FULL_EDITOR_DELETE);
   changed=true;
  }
  if(libraryDelete){
   text=text.replace(LIBRARY_DELETE,FULL_LIBRARY_DELETE);
   changed=true;
  }
  // Do not allow old partial-delete buttons if the source contract changes.
  const safe=edit?boot:libraryDelete;
  if(safe&&text.includes('</head>')){
   text=text.replace('</head>','<script id="talera-v9-complete-delete">'+DELETE_JS+'</script></head>');
  }else{
   const guard=`<script>document.addEventListener('click',function(e){
     if(e.target.closest('#taleraV6Confirm,#taleraV7PublishedConfirmButton')){
      e.stopImmediatePropagation();e.preventDefault();
      alert('Verwijderen is uitgeschakeld omdat de nieuwe volledige opruiming niet geladen is.');
     }},true)</script>`;
   if(text.includes('</head>'))text=text.replace('</head>',guard+'</head>');
  }
  if(!safe&&edit&&editorDelete)text=text.replace(FULL_EDITOR_DELETE,EDITOR_DELETE);
  const headers=new Headers(upstream.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
  headers.set('cache-control','no-store');
  headers.set('x-talera-v9-full-delete',safe?'ready':'delete-disabled-contract-mismatch');
  return new Response(text,{status:upstream.status,statusText:upstream.statusText,headers});
 }
};