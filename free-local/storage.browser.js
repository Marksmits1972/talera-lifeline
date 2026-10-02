import {t} from './copy.browser.js';
// Public storage interface. This module never sends network requests.
const DB_NAME = 'talera-free-local-v1';
let opening;
function open() {
  if (!opening) opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('stories', {keyPath:'id'});
      db.createObjectStore('media', {keyPath:'id'});
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
    return transaction(['stories','media'],'readonly',(tx,set)=>{
      const result={stories:[],media:[]};set(result);
      tx.objectStore('stories').getAll().onsuccess=e=>{result.stories=e.target.result;};
      tx.objectStore('media').getAll().onsuccess=e=>{result.media=e.target.result;};
    });
  },
  async restore(collection) {
    const mediaIds=new Set(collection.media.map(item=>item.id));
    if(mediaIds.size!==collection.media.length||new Set(collection.stories.map(item=>item.id)).size!==collection.stories.length)throw new Error(t('backupInvalid'));
    for(const item of collection.media)if(!(item.blob instanceof Blob)||!item.blob.size||(item.kind!=='audio'&&(!(item.thumbnail instanceof Blob)||!item.thumbnail.size)))throw new Error(t('backupInvalid'));
    for(const story of collection.stories)if(!story.id||!Array.isArray(story.photos)||story.photos.some(photo=>!mediaIds.has(photo.id))||(story.audioId&&!mediaIds.has(story.audioId)))throw new Error(t('backupInvalid'));
    // Clear and restore in one transaction; quota errors roll everything back.
    await transaction(['stories','media'],'readwrite',tx=>{
      tx.objectStore('stories').clear();tx.objectStore('media').clear();
      for(const item of collection.media)tx.objectStore('media').put(item);
      for(const story of collection.stories)tx.objectStore('stories').put(story);
    });
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
    if (!story.id || !Array.isArray(story.photos)) throw new Error(t('invalidMemory'));
    // Validate and write within one transaction: no published story can reference missing bytes.
    await transaction(['stories','media'],'readwrite',tx=>{
      const pending = [...story.photos.map(photo=>photo.id),...(story.audioId?[story.audioId]:[])].map(id=>tx.objectStore('media').get(id));
      let remaining = pending.length;
      const commit = () => {
        const previous=tx.objectStore('stories').get(story.id);
        previous.onsuccess=()=>{
          const ids=new Set(story.photos.map(p=>p.id));
          for(const photo of previous.result?.photos||[])if(!ids.has(photo.id))tx.objectStore('media').delete(photo.id);
          if(previous.result?.audioId&&previous.result.audioId!==story.audioId)tx.objectStore('media').delete(previous.result.audioId);
          tx.objectStore('stories').put({...story,schemaVersion:1,updatedAt:Date.now()});
        };
      };
      if (!remaining) commit();
      for (const request of pending) request.onsuccess = () => {
        if (!request.result?.blob?.size) {tx.abort();return;}
        if (!--remaining) commit();
      };
    });
    const saved = await this.story(story.id);
    if (!saved || saved.photos.length !== story.photos.length) throw new Error(t('memoryReadError'));
    return saved;
  },
  async delete(id) {
    await transaction(['stories','media'],'readwrite',tx=>{
      const request=tx.objectStore('stories').get(id);
      request.onsuccess=()=>{for(const photo of request.result?.photos||[])tx.objectStore('media').delete(photo.id);if(request.result?.audioId)tx.objectStore('media').delete(request.result.audioId);tx.objectStore('stories').delete(id);};
    });
  }
};
