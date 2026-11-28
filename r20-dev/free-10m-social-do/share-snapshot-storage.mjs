// Common byte/manifest contract. ONLY call after corresponding server-side authority is verified.
const response=(ok,details={})=>({ok,...details});

export function saveSnapshotPart(sql,hash,index,part,mime,bytes){
  if(!Number.isInteger(index)||index<0||index>=24||
     !Number.isInteger(part)||part<0||part>=96)
   throw Error('INVALID_SHARE_PART');
  if(typeof mime!=='string'||!/^(image\/(?:jpeg|png|webp|gif|heic|heif)|video\/(?:mp4|webm|quicktime)|audio\/(?:mpeg|mp4|webm|ogg|wav|x-m4a|aac|aiff|x-aiff))$/.test(mime))
   throw Error('INVALID_SHARE_MIME');
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>1048576)
   throw Error('INVALID_SHARE_PART_SIZE');
  const kind='asset-'+index+'-'+part;
  const previous=sql.exec('SELECT length(bytes) AS n FROM share_media WHERE token_hash=? AND kind=?',hash,kind).toArray()[0]?.n||0;
  const total=sql.exec('SELECT COALESCE(SUM(length(bytes)),0) AS n FROM share_media WHERE token_hash=?',hash).toArray()[0]?.n||0;
  if(total-previous+bytes.byteLength>96*1048576)throw Error('SHARE_TOTAL_SIZE_LIMIT');
  sql.exec('INSERT INTO share_media(token_hash,kind,mime,bytes) VALUES (?,?,?,?) ON CONFLICT(token_hash,kind) DO UPDATE SET mime=excluded.mime,bytes=excluded.bytes',
   hash,kind,mime,bytes);
  return response(true,{stored:true});
}

export function saveSnapshotPoster(sql,hash,index,mime,bytes){
  if(!Number.isInteger(index)||index<0||index>=24||
     !['image/jpeg','image/png','image/webp'].includes(mime)||
     !(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>1500000)
   throw Error('INVALID_SHARE_POSTER');
  const kind='poster-'+index;
  const previous=sql.exec('SELECT length(bytes) AS n FROM share_media WHERE token_hash=? AND kind=?',
   hash,kind).toArray()[0]?.n||0;
  const total=sql.exec('SELECT COALESCE(SUM(length(bytes)),0) AS n FROM share_media WHERE token_hash=?',
   hash).toArray()[0]?.n||0;
  if(total-previous+bytes.byteLength>96*1048576)throw Error('SHARE_TOTAL_SIZE_LIMIT');
  sql.exec('INSERT INTO share_media(token_hash,kind,mime,bytes) VALUES (?,?,?,?) ON CONFLICT(token_hash,kind) DO UPDATE SET mime=excluded.mime,bytes=excluded.bytes',
   hash,kind,mime,bytes);
  return response(true,{stored:true});
}

export async function completeSnapshotManifest(sql,hash,document,verifiedHashes=null){
  if(!document||document.version!==1||!Array.isArray(document.items)||
    document.items.length>24||!Array.isArray(document.narrationCues)||
    document.narrationCues.length>1000||
    !Number.isSafeInteger(document.narrationDurationMs)||
    document.narrationDurationMs<0||document.narrationDurationMs>86400000)
   throw Error('INVALID_SHARE_MANIFEST');
  const metadata=sql.exec('SELECT story_text FROM share_snapshot WHERE token_hash=?',hash).toArray()[0];
  if(!metadata||(!document.items.length&&!metadata.story_text.trim()))
   throw Error('EMPTY_SHARE');
  let total=0,partsTotal=0;
  for(let index=0;index<document.items.length;index++){
   const item=document.items[index];
   if(!item||!['photo','video','audio'].includes(item.kind)||
      typeof item.mime!=='string'||
      !/^(image\/(?:jpeg|png|webp|gif|heic|heif)|video\/(?:mp4|webm|quicktime)|audio\/(?:mpeg|mp4|webm|ogg|wav|x-m4a|aac|aiff|x-aiff))$/.test(item.mime)||
      !item.mime.startsWith(item.kind==='photo'?'image/':item.kind+'/')||
      !Number.isSafeInteger(item.size)||item.size<1||
      !Number.isSafeInteger(item.parts)||item.parts<1||item.parts>96||
      item.parts!==Math.ceil(item.size/1048576)||
      !Array.isArray(item.hashes)||item.hashes.length!==item.parts||
      !item.hashes.every(h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h)))
    throw Error('INVALID_SHARE_MEDIA_MANIFEST');
   total+=item.size;partsTotal+=item.parts;
   if(total>96*1048576||partsTotal>192)throw Error('SHARE_TOTAL_SIZE_LIMIT');
   let actual=0;
   for(let part=0;part<item.parts;part++){
    const stored=sql.exec('SELECT mime,length(bytes) AS n FROM share_media WHERE token_hash=? AND kind=?',
      hash,'asset-'+index+'-'+part).toArray()[0];
    if(!stored||stored.mime!==item.mime||stored.n<1||
       stored.n>1048576||(part<item.parts-1&&stored.n!==1048576))
     throw Error('INCOMPLETE_SHARE_MEDIA');
    if(verifiedHashes&&verifiedHashes('asset-'+index+'-'+part)!==item.hashes[part])throw Error('SHARE_PART_HASH_MISMATCH');
    actual+=stored.n;
   }
   if(actual!==item.size)throw Error('SHARE_MEDIA_LENGTH_MISMATCH');
  }

  // Sidecars are separate from the complete source manifest and preserve its order.
  const posters=document.posters===undefined?[]:document.posters;
  if(!Array.isArray(posters)||posters.length>document.items.length)
   throw Error('INVALID_SHARE_POSTER_MANIFEST');
  const posterIndices=new Set();
  for(const poster of posters){
   if(!poster||!Number.isInteger(poster.mediaIndex)||
      poster.mediaIndex<0||poster.mediaIndex>=document.items.length||
      document.items[poster.mediaIndex]?.kind!=='video'||
      posterIndices.has(poster.mediaIndex)||
      !['image/jpeg','image/png','image/webp'].includes(poster.mime)||
      !Number.isSafeInteger(poster.size)||poster.size<1||poster.size>1500000||
      typeof poster.sha256!=='string'||!/^[a-f0-9]{64}$/.test(poster.sha256))
    throw Error('INVALID_SHARE_POSTER_MANIFEST');
   posterIndices.add(poster.mediaIndex);
   const saved=sql.exec('SELECT mime,bytes FROM share_media WHERE token_hash=? AND kind=?',
    hash,'poster-'+poster.mediaIndex).toArray()[0];
   if(!saved||saved.mime!==poster.mime||saved.bytes.byteLength!==poster.size)
    throw Error('INCOMPLETE_SHARE_POSTER');
   const hex=verifiedHashes?verifiedHashes('poster-'+poster.mediaIndex):
    Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',saved.bytes)),b=>b.toString(16).padStart(2,'0')).join('');
   if(hex!==poster.sha256)throw Error('SHARE_POSTER_HASH_MISMATCH');
  }
  const visual=document.items.map((item,index)=>
    ['photo','video'].includes(item.kind)?index:null).filter(x=>x!==null);
  for(const cue of document.narrationCues){
   if(!cue||typeof cue!=='object'||Array.isArray(cue)||
      !Number.isSafeInteger(cue.t)||cue.t<0||cue.t>86400000||
      !Number.isSafeInteger(cue.index)||cue.index<0||cue.index>=Math.max(1,visual.length)||
      Object.hasOwn(cue,'mediaId')||
      (cue.mediaIndex!==undefined&&
        (!Number.isInteger(cue.mediaIndex)||!visual.includes(cue.mediaIndex)))||
      (cue.videoAtMs!==undefined&&
       (!Number.isSafeInteger(cue.videoAtMs)||cue.videoAtMs<0)))
    throw Error('INVALID_SHARE_VOICE_CUE');
  }
  const raw=JSON.stringify(document);
  if(raw.length>30000)throw Error('SHARE_MANIFEST_TOO_LARGE');
  sql.exec('INSERT INTO share_manifest(token_hash,document) VALUES (?,?) ON CONFLICT(token_hash) DO UPDATE SET document=excluded.document',
   hash,raw);
  return response(true,{complete:true,originalItems:document.items.length});
}
