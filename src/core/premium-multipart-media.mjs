/* TALERA — large private media in the EXISTING EU R2 / D1.
 * Called only after the Core verifies session, manual Premium pilot allowlist,
 * consent, origin and write rate limits. Client never supplies an account ID.
 */
export const PART_BYTES=8*1024*1024;
export const LARGE_MEDIA_MAX=2*1024*1024*1024; // 2 GiB pilot safeguard
const SMALL_LIMIT=25*1024*1024;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA=/^[a-f0-9]{64}$/i;
const TYPES=new Set(['image/jpeg','image/png','image/webp','image/heic','audio/mpeg','audio/mp4','audio/webm','video/mp4','video/webm']);
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
const bad=(reason,status=400)=>json({ok:false,reason},status);
const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
const keyFor=(accountId,mediaId)=>'premium/'+accountId+'/'+mediaId;
const same=(a,b)=>a===b;
export const expectedPartBytes=(length,part)=>Math.min(PART_BYTES,length-(part-1)*PART_BYTES);
export async function multipartFingerprint({byteSize,contentType,parts}){
 const canonical={byteSize,contentType,partSize:PART_BYTES,parts:parts.map(p=>({partNumber:p.part_number,byteSize:p.byte_size,sha256:p.sha256}))};
 return digest(new TextEncoder().encode(JSON.stringify(canonical)));
}
async function readBounded(request,limit){
 const declared=request.headers.get('content-length');
 if(declared!==null&&(!Number.isSafeInteger(Number(declared))||Number(declared)<1||Number(declared)>limit))return null;
 if(!request.body)return null;
 const reader=request.body.getReader(),parts=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();return null}parts.push(value)}}finally{reader.releaseLock()}
 if(size===0||(declared!==null&&size!==Number(declared)))return null;
 const bytes=new Uint8Array(size);let offset=0;
 for(const part of parts){bytes.set(part,offset);offset+=part.byteLength}
 return bytes;
}
const sessionQuery='SELECT * FROM talera_premium_uploads WHERE account_id=? AND media_id=?';
const partQuery='SELECT part_number,sha256,byte_size,etag FROM talera_premium_upload_parts WHERE account_id=? AND media_id=? ORDER BY part_number';
async function getSession(db,accountId,mediaId){return db.prepare(sessionQuery).bind(accountId,mediaId).first()}
async function getParts(db,accountId,mediaId){const r=await db.prepare(partQuery).bind(accountId,mediaId).all();return r.results||[]}
async function cleanup(db,accountId,mediaId){
 await db.prepare('DELETE FROM talera_premium_upload_parts WHERE account_id=? AND media_id=?').bind(accountId,mediaId).run();
 await db.prepare('DELETE FROM talera_premium_uploads WHERE account_id=? AND media_id=?').bind(accountId,mediaId).run();
}
async function saveManifest(env,accountId,mediaId,s,object){
 if(object?.size!==s.byte_size)return bad('object_size_mismatch',409);
 if(object?.customMetadata?.sha256!==s.fingerprint)return bad('object_fingerprint_mismatch',409);
 await env.DB.prepare("INSERT INTO talera_premium_media(account_id,media_id,object_key,content_type,byte_size,sha256,created_at,digest_kind,source_key) VALUES(?,?,?,?,?,?,?,'part-sha256-v1',?) ON CONFLICT(account_id,media_id) DO NOTHING")
  .bind(accountId,mediaId,keyFor(accountId,mediaId),s.content_type,s.byte_size,s.fingerprint,Date.now(),s.source_key||null).run();
 const stored=await env.DB.prepare('SELECT sha256,byte_size,digest_kind,source_key FROM talera_premium_media WHERE account_id=? AND media_id=?').bind(accountId,mediaId).first();
 if(stored?.sha256!==s.fingerprint||stored?.byte_size!==s.byte_size||stored?.digest_kind!=='part-sha256-v1'||(s.source_key&&stored?.source_key!==s.source_key))return bad('manifest_conflict',409);
 await cleanup(env.DB,accountId,mediaId);
 return json({ok:true,reason:'stored',digestKind:'part-sha256-v1',byteSize:s.byte_size});
}
export async function premiumMultipartRoute({request,env,accountId,writeAllowed=false}){
 const {pathname}=new URL(request.url),method=request.method;
 const match=pathname.match(/^\/api\/premium\/cloud\/multipart\/([0-9a-f-]{36})\/(start|status|part\/(\d{1,4})|complete|abort)$/i);
 if(!match)return bad('not_found',404);
 const mediaId=match[1].toLowerCase(),action=match[2].toLowerCase(),partNumber=match[3]?Number(match[3]):null;
 if(!UUID.test(accountId||'')||!UUID.test(mediaId))return bad('invalid_identity');
 if(!writeAllowed&&method!=='GET')return bad('invalid_origin',403);
 const db=env.DB,bucket=env.PREMIUM_PRIVATE,objectKey=keyFor(accountId,mediaId);
 if(action==='start'&&method==='POST'){
  const incoming=await readBounded(request,4096);
  let info;
  try{info=JSON.parse(new TextDecoder().decode(incoming))}catch{return bad('invalid_upload')}
  const size=info?.byteSize,type=info?.contentType,hash=info?.fingerprint,sourceKey=info?.sourceKey??null;
  if(!Number.isSafeInteger(size)||size<=SMALL_LIMIT||size>LARGE_MEDIA_MAX||
    !TYPES.has(type)||!SHA.test(hash||'')||(sourceKey!==null&&(typeof sourceKey!=='string'||!sourceKey||sourceKey.length>240||sourceKey.startsWith('talera-thread-archive-v1:'))))return bad('invalid_upload');
  const count=Math.ceil(size/PART_BYTES);
  const existing=await db.prepare('SELECT sha256,byte_size,digest_kind,source_key FROM talera_premium_media WHERE account_id=? AND media_id=?').bind(accountId,mediaId).first();
  if(existing)return existing.sha256===hash&&existing.byte_size===size&&existing.digest_kind==='part-sha256-v1'&&(!sourceKey||existing.source_key===sourceKey)?
    json({ok:true,reason:'already_stored'}):bad('id_conflict',409);
  // If R2 completed but D1 finalization was interrupted, resume its existing
  // authorized session without overwriting the private object.
  let session=await getSession(db,accountId,mediaId);
  const present=await bucket.head(objectKey);
  if(present){
   if(session&&present.size===size&&present.customMetadata?.sha256===hash&&(!sourceKey||session.source_key===sourceKey))
    return json({ok:true,reason:'resumed',partSize:PART_BYTES,partCount:count});
   return bad('object_exists_unregistered',409);
  }
  if(session&&Date.now()-session.created_at>6*86400000){
   try{await bucket.resumeMultipartUpload(objectKey,session.upload_id).abort()}catch{}
   await cleanup(db,accountId,mediaId);session=null;
  }
  if(session)return same(session.fingerprint,hash)&&same(session.content_type,type)&&session.byte_size===size&&(!sourceKey||session.source_key===sourceKey)?
   json({ok:true,reason:'resumed',partSize:PART_BYTES,partCount:count}):bad('id_conflict',409);
  const uploaded=await bucket.createMultipartUpload(objectKey,{httpMetadata:{contentType:type},customMetadata:{sha256:hash,digestKind:'part-sha256-v1',...(sourceKey?{sourceKey}:{})}});
  try{
   await db.prepare('INSERT INTO talera_premium_uploads(account_id,media_id,upload_id,content_type,byte_size,part_size,part_count,fingerprint,created_at,source_key) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .bind(accountId,mediaId,uploaded.uploadId,type,size,PART_BYTES,count,hash,Date.now(),sourceKey).run();
  }catch(error){try{await uploaded.abort()}catch{};throw error}
  return json({ok:true,reason:'started',partSize:PART_BYTES,partCount:count});
 }
 const session=await getSession(db,accountId,mediaId);
 if(action==='status'&&method==='GET'){
  if(!session)return bad('not_found',404);
  const parts=await getParts(db,accountId,mediaId);
  return json({ok:true,partSize:PART_BYTES,partCount:session.part_count,uploaded:parts.map(p=>({number:p.part_number,sha256:p.sha256}))});
 }
 if(!session)return bad('not_found',404);
 if(action.startsWith('part/')&&method==='PUT'){
  if(!Number.isInteger(partNumber)||partNumber<1||partNumber>session.part_count)return bad('invalid_part');
  const expected=expectedPartBytes(session.byte_size,partNumber);
  const prev=await db.prepare('SELECT sha256,byte_size,etag FROM talera_premium_upload_parts WHERE account_id=? AND media_id=? AND part_number=?').bind(accountId,mediaId,partNumber).first();
  const hash=request.headers.get('x-content-sha256')||'';
  if(!SHA.test(hash))return bad('invalid_digest');
  if(prev)return prev.sha256===hash&&prev.byte_size===expected?
   json({ok:true,reason:'already_stored'}):bad('part_conflict',409);
  const bytes=await readBounded(request,PART_BYTES);
  if(bytes?.byteLength!==expected)return bad('part_size_mismatch',413);
  if(await digest(bytes)!==hash.toLowerCase())return bad('part_digest_mismatch');
  const upload=bucket.resumeMultipartUpload(objectKey,session.upload_id);
  const result=await upload.uploadPart(partNumber,bytes);
  await db.prepare('INSERT INTO talera_premium_upload_parts(account_id,media_id,part_number,sha256,byte_size,etag) VALUES(?,?,?,?,?,?)')
   .bind(accountId,mediaId,partNumber,hash.toLowerCase(),bytes.byteLength,result.etag).run();
  return json({ok:true,reason:'stored',part:partNumber});
 }
 if(action==='complete'&&method==='POST'){
  const parts=await getParts(db,accountId,mediaId);
  if(parts.length!==session.part_count)return bad('parts_missing',409);
  for(let i=0;i<parts.length;i++)if(parts[i].part_number!==i+1||parts[i].byte_size!==expectedPartBytes(session.byte_size,i+1))return bad('part_integrity_failure',409);
  if(await multipartFingerprint({byteSize:session.byte_size,contentType:session.content_type,parts})!==session.fingerprint)return bad('fingerprint_mismatch',409);
  const existingObject=await bucket.head(objectKey);
  if(existingObject)return saveManifest(env,accountId,mediaId,session,existingObject);
  const upload=bucket.resumeMultipartUpload(objectKey,session.upload_id);
  const object=await upload.complete(parts.map(x=>({partNumber:x.part_number,etag:x.etag})));
  return saveManifest(env,accountId,mediaId,session,object);
 }
 if(action==='abort'&&method==='POST'){
  try{await bucket.resumeMultipartUpload(objectKey,session.upload_id).abort()}catch{}
  await cleanup(db,accountId,mediaId);
  return json({ok:true,reason:'aborted'});
 }
 return bad('method_not_allowed',405);
}
