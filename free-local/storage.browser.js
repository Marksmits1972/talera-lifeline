import {t} from './copy.browser.js';
// Public storage interface. This module never sends network requests.
const DB_NAME = 'talera-free-local-v1';
let opening;
function open() {
  if (!opening) opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if(!db.objectStoreNames.contains('stories'))db.createObjectStore('stories', {keyPath:'id'});
      if(!db.objectStoreNames.contains('media'))db.createObjectStore('media', {keyPath:'id'});
      if(!db.objectStoreNames.contains('imports'))db.createObjectStore('imports', {keyPath:'id'});
    };
    request.onerror = () => { opening = null; reject(request.error); };
    request.onblocked = () => { opening = null; reject(new Error(t('closeTabs'))); };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {db.close(); opening = null;};
      resolve(db);
    };
  });
  return opening;
}
async function transaction(storeNames, mode, action) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onabort = tx.onerror = () => reject(tx.error || new Error(t('storageUnavailable')));
    try { action(tx, value => { result = value; }); }
    catch (error) { tx.abort(); reject(error); }
  });
}
export const storage = {
  async snapshot() {
    return transaction(['stories','media','imports'],'readonly',(tx,set)=>{
      const result={stories:[],media:[],imports:[]};set(result);
      tx.objectStore('stories').getAll().onsuccess=e=>{result.stories=e.target.result;};
      tx.objectStore('media').getAll().onsuccess=e=>{result.media=e.target.result;};
      tx.objectStore('imports').getAll().onsuccess=e=>{result.imports=e.target.result;};
    });
  },
  async restore(collection) {
    const mediaIds=new Set(collection.media.map(item=>item.id));
    if(mediaIds.size!==collection.media.length||new Set(collection.stories.map(item=>item.id)).size!==collection.stories.length)throw new Error(t('backupInvalid'));
    for(const item of collection.media)if(!(item.blob instanceof Blob)||!item.blob.size||(item.kind!=='audio'&&(!(item.thumbnail instanceof Blob)||!item.thumbnail.size)))throw new Error(t('backupInvalid'));
    for(const story of collection.stories)if(!story.id||!Array.isArray(story.photos)||story.photos.some(photo=>!mediaIds.has(photo.id))||([story.audioId,...(story.audioIds||[])].filter(Boolean).some(id=>!mediaIds.has(id))))throw new Error(t('backupInvalid'));
    // Clear and restore in one transaction; quota errors roll everything back.
    await transaction(['stories','media','imports'],'readwrite',tx=>{
      tx.objectStore('stories').clear();tx.objectStore('media').clear();
      tx.objectStore('imports').clear();
      for(const item of collection.imports||[])tx.objectStore('imports').put(item);
      for(const item of collection.media)tx.objectStore('media').put(item);
      for(const story of collection.stories)tx.objectStore('stories').put(story);
    });
  },
  async lastImport(){return transaction(['imports'],'readonly',(tx,set)=>{tx.objectStore('imports').get('last').onsuccess=e=>set(e.target.result);});},
  // One transaction owns all transfers and deletes. Validate against the live collection.
  async saveCollection(changes,media=[],expected={},importSummary){
    let conflict=false;
    await transaction(['stories','media','imports'],'readwrite',tx=>{
      const stories=tx.objectStore('stories'),bytes=tx.objectStore('media');
      const read=stories.getAll();read.onsuccess=()=>{
        const current=new Map(read.result.map(s=>[s.id,s]));
        for(const [id,revision] of Object.entries(expected))if(current.get(id)?.updatedAt!==revision){conflict=true;tx.abort();return;}
        if(importSummary){const known=new Set(read.result.flatMap(s=>s.photos||[]).map(p=>p.fingerprint).filter(Boolean));for(const p of changes.flatMap(s=>s?.photos||[]))if(media.some(m=>m.id===p.id)&&known.has(p.fingerprint)){conflict=true;tx.abort();return;}}
        const before=new Set(read.result.flatMap(s=>[...(s.photos||[]).map(p=>p.id),s.audioId,...(s.audioIds||[])].filter(Boolean)));
        for(const item of media){if(!(item.blob instanceof Blob)||!item.blob.size||(item.kind!=='audio'&&(!(item.thumbnail instanceof Blob)||!item.thumbnail.size))){tx.abort();return;}bytes.put(item);}
        for(const story of changes){if(!story?.id){tx.abort();return;}if(story.deleted){current.delete(story.id);stories.delete(story.id);}else{if(!Array.isArray(story.photos)){tx.abort();return;}const saved={...story,schemaVersion:1,updatedAt:Math.max(Date.now(),(current.get(story.id)?.updatedAt||0)+1)};current.set(story.id,saved);stories.put(saved);}}
        const after=new Set([...current.values()].flatMap(s=>[...(s.photos||[]).map(p=>p.id),s.audioId,...(s.audioIds||[])].filter(Boolean)));
        for(const id of after){const check=bytes.get(id);check.onsuccess=()=>{if(!check.result?.blob?.size)tx.abort();};}
        for(const id of before)if(!after.has(id))bytes.delete(id);
        if(importSummary)tx.objectStore('imports').put({...importSummary,id:'last'});
      };
    }).catch(error=>{if(conflict)throw Error('De verzameling is ondertussen gewijzigd. Open dit venster opnieuw; je bewaarde verhalen zijn behouden.');throw error;});
    return Promise.all(changes.filter(s=>!s.deleted).map(s=>this.story(s.id)));
  },
  async replacePhotoCopies(items) {
    for(const item of items)if(item.kind==='audio'||!(item.blob instanceof Blob)||!item.blob.size||!(item.thumbnail instanceof Blob)||!item.thumbnail.size)throw new Error(t('photoProcessingError'));
    await transaction(['media'],'readwrite',tx=>{
      for(const item of items){const request=tx.objectStore('media').get(item.id);request.onsuccess=()=>{if(!request.result||request.result.kind==='audio')tx.abort();else tx.objectStore('media').put(item);};}
    });
  },
  async commitMedia(story, item) {
    if(!story.id||!item.id||!(item.blob instanceof Blob)||!item.blob.size)throw new Error(t('storageUnavailable'));
    if(item.kind!=='audio'&&(!(item.thumbnail instanceof Blob)||!item.thumbnail.size))throw new Error(t('photoProcessingError'));
    await transaction(['stories','media'],'readwrite',tx=>{
      const references=[...story.photos.map(photo=>photo.id),...(story.audioId?[story.audioId]:[])].filter(id=>id!==item.id);
      for(const id of references){const check=tx.objectStore('media').get(id);check.onsuccess=()=>{if(!check.result?.blob?.size)tx.abort();};}
      const previous=tx.objectStore('stories').get(story.id);
      previous.onsuccess=()=>{
        if(item.kind==='audio'&&previous.result?.audioId&&previous.result.audioId!==item.id)tx.objectStore('media').delete(previous.result.audioId);
        tx.objectStore('media').put(item);
        tx.objectStore('stories').put({...story,schemaVersion:1,updatedAt:Date.now()});
      };
    });
    const saved=await this.media(item.id);
    if(!saved||saved.blob.size!==item.blob.size)throw new Error(t('memoryReadError'));
    return this.story(story.id);
  },
  async story(id) {return transaction(['stories'],'readonly',(tx,set)=>{tx.objectStore('stories').get(id).onsuccess=e=>set(e.target.result);});},
  async stories() {return transaction(['stories'],'readonly',(tx,set)=>{tx.objectStore('stories').getAll().onsuccess=e=>set(e.target.result);});},
  async media(id) {return transaction(['media'],'readonly',(tx,set)=>{tx.objectStore('media').get(id).onsuccess=e=>set(e.target.result);});},
  async putMedia(media) {
    if (!(media.blob instanceof Blob) || !media.blob.size || !(media.thumbnail instanceof Blob)) throw new Error(t('photoProcessingError'));
    await transaction(['media'],'readwrite',tx=>tx.objectStore('media').put(media));
    const saved = await this.media(media.id);
    if (!saved || saved.blob.size !== media.blob.size) throw new Error(t('photoReadError'));
    return saved;
  },
  async save(story) {
    await this.saveCollection([story]);return this.story(story.id);
  },
  async saveEdit(story,media=[],expectedUpdatedAt){
    await this.saveCollection([story],media,{[story.id]:expectedUpdatedAt});return this.story(story.id);
  },
  async delete(id) {await this.saveCollection([{id,deleted:true}]);}

};
