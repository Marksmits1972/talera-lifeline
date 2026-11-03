/* TALERA Premium BB63: one current immutable snapshot per logical source.
 * Uses the existing D1 database; the source's Free ID never changes.
 * Atomic compare-and-swap prevents stale devices from silently replacing edits.
 * NOT deployed or wired into current cloud uploads yet.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS=new Set(['media','story','comment_archive']);
const invalid=(value)=>typeof value!=='string'||value.length===0||value.length>1024||/[\u0000-\u001f\u007f]/.test(value);
export function validateCurrentVersion({accountId,kind,sourceKey,snapshotId,expectedCurrentId=null}={}){
 if(!UUID.test(accountId||'')||!UUID.test(snapshotId||'')||!KINDS.has(kind)||
    invalid(sourceKey)||(expectedCurrentId!==null&&!UUID.test(expectedCurrentId)))return false;
 if(kind==='media'&&sourceKey.length>240)return false;
 if(kind==='story'&&!sourceKey.startsWith('story:'))return false;
 if(kind==='comment_archive'&&!sourceKey.startsWith('talera-thread-archive-v1:'))return false;
 return true;
}
const SELECT='SELECT current_id,revision FROM talera_premium_current WHERE account_id=? AND kind=? AND source_key=?';
const INSERT='INSERT OR IGNORE INTO talera_premium_current(account_id,kind,source_key,current_id,revision,updated_at) VALUES(?,?,?,?,1,?)';
const UPDATE='UPDATE talera_premium_current SET current_id=?,revision=revision+1,updated_at=? WHERE account_id=? AND kind=? AND source_key=? AND current_id=? AND revision=?';
const changed=result=>result?.meta?.changes===1;
export async function publishCurrentPremiumVersion({
 db,accountId,kind,sourceKey,snapshotId,expectedCurrentId=null,now=Date.now()
}={}){
 if(!validateCurrentVersion({accountId,kind,sourceKey,snapshotId,expectedCurrentId})||
    !db?.prepare||!Number.isSafeInteger(now)||now<0)throw Error('invalid_current_version');
 const old=await db.prepare(SELECT).bind(accountId,kind,sourceKey).first();
 if(old?.current_id===snapshotId)return {ok:true,reason:'already_current',revision:old.revision};
 if(!old){
  if(expectedCurrentId!==null)return {ok:false,reason:'current_changed'};
  const write=await db.prepare(INSERT).bind(accountId,kind,sourceKey,snapshotId,now).run();
  if(changed(write))return {ok:true,reason:'current_created',revision:1};
  // Concurrent initial creation: only identical data can be idempotent.
  const concurrent=await db.prepare(SELECT).bind(accountId,kind,sourceKey).first();
  return concurrent?.current_id===snapshotId
   ?{ok:true,reason:'already_current',revision:concurrent.revision}
   :{ok:false,reason:'current_changed'};
 }
 if(expectedCurrentId!==old.current_id)return {ok:false,reason:'current_changed'};
 if(!Number.isSafeInteger(old.revision)||old.revision<1)throw Error('invalid_stored_revision');
 const write=await db.prepare(UPDATE).bind(
  snapshotId,now,accountId,kind,sourceKey,expectedCurrentId,old.revision
 ).run();
 if(changed(write))return {ok:true,reason:'current_updated',revision:old.revision+1};
 const concurrent=await db.prepare(SELECT).bind(accountId,kind,sourceKey).first();
 // A simultaneous identical update is safe to retry.
 return concurrent?.current_id===snapshotId
  ?{ok:true,reason:'already_current',revision:concurrent.revision}
  :{ok:false,reason:'current_changed'};
}
export async function readCurrentPremiumVersion({db,accountId,kind,sourceKey}={}){
 if(!validateCurrentVersion({accountId,kind,sourceKey,snapshotId:'00000000-0000-4000-8000-000000000001'})||!db?.prepare)
  throw Error('invalid_current_version');
 const row=await db.prepare(SELECT).bind(accountId,kind,sourceKey).first();
 return row?{snapshotId:row.current_id,revision:row.revision}:null;
}
