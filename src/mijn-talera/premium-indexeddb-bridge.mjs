/* TALERA Premium pilot bridge to the EXISTING Free IndexedDB.
 * Read-only access to stories/files. No schema upgrade or modification of Free.
 * The caller must supply server-verified Premium entitlement and consent.
 */
const DATABASE='talera-lifeline-dev-local-v1';
const requestResult=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('indexeddb_request_failed'))});
const validMedia=new Set(['image/jpeg','image/png','image/webp','image/heic','audio/mpeg','audio/mp4','audio/webm','video/mp4','video/webm']);
export async function listLocalPremiumMedia({indexedDB,dbName=DATABASE}={}) {
 if(!indexedDB) throw Error('indexeddb_unavailable');
 const db=await new Promise((resolve,reject)=>{const req=indexedDB.open(dbName,1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('indexeddb_open_failed'));req.onupgradeneeded=()=>{req.transaction.abort();reject(Error('local_archive_missing'))}});
 try {
  if(!db.objectStoreNames.contains('files'))return [];
  const tx=db.transaction('files','readonly');
  const records=await requestResult(tx.objectStore('files').getAll());
  return records.filter(x=>typeof x?.key==='string'&&x.blob instanceof Blob&&validMedia.has(x.blob.type.toLowerCase())).map(x=>({key:x.key,blob:x.blob,mime:x.blob.type,size:x.blob.size}));
 } finally {db.close()}
}
export async function createPremiumManifest(media,{crypto}={}) {
 if(!crypto?.subtle)throw Error('crypto_unavailable');
 if(!(media?.blob instanceof Blob))throw Error('media_blob_required');
 // Content fingerprint prevents same-size edits from sharing an upload identity.
 const contentHash=new Uint8Array(await crypto.subtle.digest('SHA-256',await media.blob.arrayBuffer()));
 const prefix=new TextEncoder().encode(media.key+':'+media.blob.type+':');
 const input=new Uint8Array(prefix.length+contentHash.length);
 input.set(prefix);input.set(contentHash,prefix.length);
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',input));
 const uuid=[...hash.slice(0,16)];uuid[6]=(uuid[6]&15)|64;uuid[8]=(uuid[8]&63)|128;
 const hex=uuid.map(v=>v.toString(16).padStart(2,'0')).join('');
 return {mediaId:[hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-'),key:media.key,mime:media.mime,size:media.blob.size};
}
export async function uploadLocalPremiumMedia({media,manifest,fetcher=fetch,crypto}={}) {
 if(!crypto?.subtle)throw Error('crypto_unavailable');
 const bytes=await media.blob.arrayBuffer();
 const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
 const response=await fetcher('/api/premium/cloud/media/'+manifest.mediaId,{method:'PUT',credentials:'same-origin',headers:{'content-type':media.mime,'x-content-sha256':sha},body:bytes});
 return response.json();
}
