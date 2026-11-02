/* TALERA Premium private cloud storage — staging integration module.
 * No public object URLs. Connect to existing Core Worker only after D1 migration and
 * authenticated, consent-controlled route integration have been verified.
 */
export const PREMIUM_UPLOAD_LIMIT = 25 * 1024 * 1024;
export const PREMIUM_MEDIA_TYPES = new Set(['image/jpeg','image/png','image/webp','image/heic','audio/mpeg','audio/mp4','audio/webm','video/mp4','video/webm']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hexHash = /^[a-f0-9]{64}$/i;
export function validatePremiumUpload({accountId, mediaId, contentType, byteLength, sha256, entitlement, consent} = {}) {
  if (!uuid.test(String(accountId||'')) || !uuid.test(String(mediaId||''))) return {ok:false,reason:'invalid_identity'};
  if (!entitlement?.permissions?.cloud_storage || entitlement?.available?.cloud_storage !== true) return {ok:false,reason:'not_enabled'};
  if (consent !== true) return {ok:false,reason:'consent_required'};
  if (!PREMIUM_MEDIA_TYPES.has(String(contentType||'').toLowerCase())) return {ok:false,reason:'unsupported_type'};
  if (!Number.isSafeInteger(byteLength) || byteLength < 1 || byteLength > PREMIUM_UPLOAD_LIMIT) return {ok:false,reason:'invalid_size'};
  if (!hexHash.test(String(sha256||''))) return {ok:false,reason:'invalid_digest'};
  return {ok:true,objectKey:'premium/'+accountId+'/'+mediaId};
}
export async function storePremiumObject({bucket,db,accountId,mediaId,contentType,bytes,sha256,entitlement,consent,now=Date.now()}) {
  const buffer = bytes instanceof ArrayBuffer ? bytes : null;
  const validation=validatePremiumUpload({accountId,mediaId,contentType,byteLength:buffer?.byteLength,sha256,entitlement,consent});
  if (!validation.ok) return validation;
  if (!bucket?.put || !db?.prepare || !globalThis.crypto?.subtle) return {ok:false,reason:'storage_unavailable'};
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))).map(x=>x.toString(16).padStart(2,'0')).join('');
  if (digest!==sha256.toLowerCase()) return {ok:false,reason:'digest_mismatch'};
  const exists=await db.prepare('SELECT media_id,sha256 FROM talera_premium_media WHERE account_id=? AND media_id=?').bind(accountId,mediaId).first();
  if (exists) return {ok:exists.sha256===digest,reason:exists.sha256===digest?'already_stored':'id_conflict',objectKey:validation.objectKey};
  const stored=await bucket.put(validation.objectKey,buffer,{onlyIf:{etagDoesNotMatch:'*'},httpMetadata:{contentType},customMetadata:{sha256:digest}});
  if (!stored) return {ok:false,reason:'concurrent_upload_retry'};
  try {
    await db.prepare('INSERT INTO talera_premium_media(account_id,media_id,object_key,content_type,byte_size,sha256,created_at) VALUES(?,?,?,?,?,?,?)')
      .bind(accountId,mediaId,validation.objectKey,contentType,buffer.byteLength,digest,now).run();
  } catch(err) {
    // Preserve the cloud object for safe reconciliation after concurrent uploads.
    throw err;
  }
  return {ok:true,reason:'stored',objectKey:validation.objectKey};
}
