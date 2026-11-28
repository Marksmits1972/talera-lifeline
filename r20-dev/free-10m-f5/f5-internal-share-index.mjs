// Only temporary package locators and recipient-local seen status; no media,
// story text, uploaded address book, recipient read receipt or second library.
export const INTERNAL_INDEX_DUE='f5-internal-index-next-v1';
const H=/^[a-f0-9]{64}$/,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const check=(re,v)=>typeof v==='string'&&re.test(v);
const no=()=>({ok:false});
function schema(sql){
 sql.exec("CREATE TABLE IF NOT EXISTS f5_internal_index (direction TEXT NOT NULL, package_id TEXT NOT NULL, story_id TEXT NOT NULL, sender_id TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, seen_at INTEGER, PRIMARY KEY(direction,package_id))");
 sql.exec("CREATE INDEX IF NOT EXISTS f5_internal_index_expiry ON f5_internal_index(expires_at)");
}
function exists(sql){return !!sql.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='f5_internal_index'").toArray()[0]}
async function updateDue(sql,txn){
 const next=sql.exec("SELECT MIN(expires_at) AS next FROM f5_internal_index").toArray()[0]?.next;
 if(Number.isSafeInteger(next))await txn.put(INTERNAL_INDEX_DUE,next);
 else await txn.delete(INTERNAL_INDEX_DUE);
}
const output=r=>({key:r.package_id,story:r.story_id,sender:r.sender_id,expiresAt:r.expires_at,createdAt:r.created_at,unread:r.seen_at===null});
// This function executes only inside the existing account DO transaction,
// after its active-account/epoch check, using the same relationship controls.
export async function internalIndexCommand(storage,txn,actor,cmd,now,canReceive){
 const sql=storage.sql,op=cmd.action,d=cmd.direction;
 if(!['in','out'].includes(d))return no();
 if(op==='internal-index-prepare'){
  if(!check(H,cmd.key)||!check(H,cmd.story)||!check(UUID,cmd.sender)||
     !Number.isSafeInteger(cmd.expiresAt)||cmd.expiresAt<=now||cmd.expiresAt>now+7*86400000)return no();
  if(d==='out'?cmd.sender!==actor:cmd.sender===actor||!await canReceive(cmd.sender))return no();
  schema(sql);
  const old=sql.exec('SELECT * FROM f5_internal_index WHERE direction=? AND package_id=?',d,cmd.key).toArray()[0];
  if(old)return old.story_id===cmd.story&&old.sender_id===cmd.sender&&old.expires_at===cmd.expiresAt?{ok:true}:no();
  sql.exec('INSERT INTO f5_internal_index(direction,package_id,story_id,sender_id,created_at,expires_at) VALUES (?,?,?,?,?,?)',d,cmd.key,cmd.story,cmd.sender,now,cmd.expiresAt);
  await updateDue(sql,txn);return {ok:true,changed:true};
 }
 if(!exists(sql))return op==='internal-index-list'?{ok:true,items:[],next:null}:no();
 if(op==='internal-index-list'){
  if(cmd.after!==null&&!check(H,cmd.after))return no();
  const rows=sql.exec("SELECT * FROM f5_internal_index WHERE direction=? AND package_id>? AND expires_at>? ORDER BY package_id LIMIT 51",d,cmd.after||'',now).toArray();
  const items=[];
  for(const r of rows.slice(0,50))if(d==='out'||await canReceive(r.sender_id))items.push(output(r));
  return {ok:true,items,next:rows.length>50?rows[49].package_id:null};
 }
 if(!check(H,cmd.key))return no();
 const row=sql.exec('SELECT * FROM f5_internal_index WHERE direction=? AND package_id=? AND expires_at>?',d,cmd.key,now).toArray()[0];
 if(!row||d==='in'&&!await canReceive(row.sender_id))return no();
 if(op==='internal-index-get')return {ok:true,item:output(row)};
 if(op==='internal-index-seen'&&d==='in'){
  sql.exec("UPDATE f5_internal_index SET seen_at=COALESCE(seen_at,?) WHERE direction='in' AND package_id=?",now,cmd.key);
  return {ok:true};
 }
 return no();
}
export async function expireInternalIndex(storage,txn,now){
 const due=await txn.get(INTERNAL_INDEX_DUE);
 if(!Number.isSafeInteger(due)||due>now)return;
 const sql=storage.sql;
 if(!exists(sql)){await txn.delete(INTERNAL_INDEX_DUE);return}
 sql.exec('DELETE FROM f5_internal_index WHERE expires_at<=?',now);
 await updateDue(sql,txn);
}
