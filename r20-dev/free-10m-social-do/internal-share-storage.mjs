// Private temporary account delivery packages. No public capability/pointer,
// new DO binding, permanent server archive, or legacy grant.
// Reuse the EXISTING per-memory share_snapshot/media/manifest tables.
import {saveSnapshotPart,saveSnapshotPoster,completeSnapshotManifest} from './share-snapshot-storage.mjs';
const ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const HASH=/^[a-f0-9]{64}$/;
const MEDIA_ID=/^[A-Za-z0-9_.:-]{1,240}$/;
const UPLOAD_WINDOW=30*60000, MAX_STORAGE_WINDOW=7*86400000;
const valid=(re,v)=>typeof v==='string'&&re.test(v);
const requireValue=(re,v)=>{if(!valid(re,v))throw Error('INVALID_INTERNAL_SHARE');return v};
const sha=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',value)),b=>b.toString(16).padStart(2,'0')).join('');
const text=new TextEncoder();
const active=(r,now)=>r&&r.state==='ready'&&r.expires_at>now;
export class InternalShareStore{
 constructor(storage,now=()=>Date.now()){this.storage=storage;this.sql=storage.sql;this.now=now;this.schemaKnown=null}
 hasSchema(){if(this.schemaKnown===null)this.schemaKnown=!!this.sql.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='internal_share_packages'").toArray()[0];return this.schemaKnown}
 ensureSchema(){
  this.sql.exec("CREATE TABLE IF NOT EXISTS internal_share_packages (package_id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, upload_until INTEGER NOT NULL, expires_at INTEGER NOT NULL, state TEXT NOT NULL, manifest_hash TEXT, selection TEXT NOT NULL)");
  this.sql.exec("CREATE TABLE IF NOT EXISTS internal_share_recipients (package_id TEXT NOT NULL, recipient_id TEXT NOT NULL, contact_id TEXT NOT NULL, revoked_at INTEGER, PRIMARY KEY(package_id,recipient_id))");
  this.sql.exec("CREATE TABLE IF NOT EXISTS internal_share_digests (package_id TEXT NOT NULL, kind TEXT NOT NULL, sha256 TEXT NOT NULL, PRIMARY KEY(package_id,kind))");
  this.sql.exec("CREATE TABLE IF NOT EXISTS internal_share_deliveries (package_id TEXT NOT NULL, recipient_id TEXT NOT NULL, delivered_at INTEGER NOT NULL, PRIMARY KEY(package_id,recipient_id))");
  this.schemaKnown=true;
 }
 owner(actor){
  requireValue(ID,actor);
  const row=this.sql.exec('SELECT owner_id FROM owner_meta LIMIT 1').toArray()[0];
  if(!row||row.owner_id!==actor)throw Error('OWNER_REQUIRED');
  return row.owner_id;
 }
 row(key){requireValue(HASH,key);return this.hasSchema()?this.sql.exec('SELECT * FROM internal_share_packages WHERE package_id=?',key).toArray()[0]:null}
 exists(key){return !!this.row(key)}
 targets(key){
  return this.sql.exec('SELECT recipient_id,contact_id,revoked_at FROM internal_share_recipients WHERE package_id=? ORDER BY recipient_id',key).toArray();
 }
 writeAllowed(actor,key){
  this.owner(actor);const row=this.row(key);
  if(!row||row.state!=='draft'||row.upload_until<=this.now()||row.expires_at<=this.now())throw Error('INTERNAL_UPLOAD_UNAVAILABLE');
  return row;
 }
 stage(actor,key,metadata,recipients,expiresAt){
  this.owner(actor);requireValue(HASH,key);
  const now=this.now();
  // Explicit expiry is bounded by the approved seven-day transport limit.
  if(!Number.isSafeInteger(expiresAt)||expiresAt<=now||expiresAt>now+MAX_STORAGE_WINDOW)throw Error('INVALID_INTERNAL_EXPIRY');
  if(!metadata||typeof metadata.title!=='string'||metadata.title.length>180||
     typeof metadata.storyText!=='string'||metadata.storyText.length>12000||
     typeof metadata.eventDate!=='string'||!/^\d{0,4}(?:-\d{2}-\d{2})?$/.test(metadata.eventDate))
   throw Error('INVALID_INTERNAL_CONTENT');
  if(!Array.isArray(recipients)||!recipients.length||recipients.length>1000)throw Error('INVALID_INTERNAL_RECIPIENTS');
  const list=recipients.map(r=>({account:requireValue(ID,r.account),contact:requireValue(ID,r.contact)})).sort((a,b)=>a.account.localeCompare(b.account));
  if(list.some((r,i)=>r.account===actor||(i&&r.account===list[i-1].account))||new Set(list.map(r=>r.contact)).size!==list.length)
   throw Error('INVALID_INTERNAL_RECIPIENTS');
  const selected=JSON.stringify(list);
  this.ensureSchema();
  return this.storage.transactionSync(()=>{
   const old=this.row(key);
   if(old){
    // Request retries may never change recipients or metadata after staging.
    if(old.state==='delivered'&&old.expires_at>now&&old.selection===selected&&old.expires_at===expiresAt)return {ok:true,state:'delivered',expiresAt,uploadUntil:old.upload_until};
    const m=this.sql.exec('SELECT title,story_text,event_date FROM share_snapshot WHERE token_hash=?',key).toArray()[0];
    if(!m||old.state==='revoked'||old.expires_at<=now||
       (old.state!=='ready'&&old.upload_until<=now)||
       old.selection!==selected||old.expires_at!==expiresAt||
       m.title!==metadata.title||m.story_text!==metadata.storyText||m.event_date!==metadata.eventDate)
      throw Error('INTERNAL_SHARE_CONFLICT');
    return {ok:true,state:old.state,expiresAt,uploadUntil:old.upload_until};
   }
   // A private key can never alias a legacy guest share even in the event of
   // a test-injected collision. The guest locator namespace is not touched.
   if(this.sql.exec('SELECT 1 FROM shares WHERE token_hash=?',key).toArray()[0]||
      this.sql.exec('SELECT 1 FROM share_snapshot WHERE token_hash=?',key).toArray()[0])throw Error('INTERNAL_SHARE_CONFLICT');
   const until=Math.min(expiresAt,now+UPLOAD_WINDOW);
   this.sql.exec("INSERT INTO internal_share_packages(package_id,created_at,upload_until,expires_at,state,selection) VALUES (?,?,?,?,'draft',?)",key,now,until,expiresAt,selected);
   this.sql.exec("INSERT INTO share_snapshot(token_hash,title,story_text,event_date) VALUES (?,?,?,?)",key,metadata.title,metadata.storyText,metadata.eventDate);
   for(const r of list)this.sql.exec("INSERT INTO internal_share_recipients(package_id,recipient_id,contact_id) VALUES (?,?,?)",key,r.account,r.contact);
   return {ok:true,state:'draft',expiresAt,uploadUntil:until};
  });
 }
 async upload(actor,key,index,part,mime,bytes,poster=false){
  this.writeAllowed(actor,key);
  // Compute hash per bounded upload, verify again after async hashing.
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>(poster?1500000:1048576))throw Error('INVALID_INTERNAL_BYTES');
  const stable=bytes.slice(),digest=await sha(stable);
  return this.storage.transactionSync(()=>{
   this.writeAllowed(actor,key);
   const result=poster?saveSnapshotPoster(this.sql,key,index,mime,stable):saveSnapshotPart(this.sql,key,index,part,mime,stable);
   const kind=poster?'poster-'+index:'asset-'+index+'-'+part;
   this.sql.exec("INSERT INTO internal_share_digests VALUES (?,?,?) ON CONFLICT(package_id,kind) DO UPDATE SET sha256=excluded.sha256",key,kind,digest);
   return {...result,sha256:digest};
  });
 }
 async seal(actor,key,document){
  this.owner(actor);
  // Internal manifest preserves original media IDs; the guest manifest's
  // visual ordering, original bytes, cue mapping and poster rules stay intact.
  if(!document||!Array.isArray(document.items)||document.items.some(it=>!valid(MEDIA_ID,it?.mediaId)))throw Error('INTERNAL_MEDIA_ID_REQUIRED');
  const raw=JSON.stringify(document);
  if(raw.length>30000)throw Error('SHARE_MANIFEST_TOO_LARGE');
  const digest=await sha(text.encode(raw));
  const old=this.row(key),now=this.now();
  if(!old||old.expires_at<=now||old.state==='revoked'||!['ready','delivered'].includes(old.state)&&old.upload_until<=now)throw Error('INTERNAL_UPLOAD_UNAVAILABLE');
  if(['sealed','ready','delivered'].includes(old.state)){
   if(old.manifest_hash!==digest)throw Error('INTERNAL_SHARE_CONFLICT');
   return {ok:true,state:old.state,complete:true};
  }
  // No changes to a sealing package; interrupted operations can retry only
  // with the same exact manifest. The bounded draft alarm still applies.
  if(old.state==='sealing'&&old.manifest_hash!==digest)throw Error('INTERNAL_SHARE_CONFLICT');
  if(!['draft','sealing'].includes(old.state))throw Error('INTERNAL_UPLOAD_UNAVAILABLE');
  this.sql.exec("UPDATE internal_share_packages SET state='sealing',manifest_hash=? WHERE package_id=?",digest,key);
  try{
   await completeSnapshotManifest(this.sql,key,document,kind=>this.sql.exec('SELECT sha256 FROM internal_share_digests WHERE package_id=? AND kind=?',key,kind).toArray()[0]?.sha256);
   // Reject undeclared uploaded bytes; no hidden extra media in a completed snapshot.
   const expected=document.items.flatMap((it,i)=>Array.from({length:it.parts},(_,part)=>'asset-'+i+'-'+part)).concat((document.posters||[]).map(p=>'poster-'+p.mediaIndex)).sort();
   const actual=this.sql.exec('SELECT kind FROM share_media WHERE token_hash=? ORDER BY kind',key).toArray().map(x=>x.kind);
   if(JSON.stringify(expected)!==JSON.stringify(actual))throw Error('INTERNAL_UNDECLARED_MEDIA');
   const current=this.row(key);
   if(!current||current.manifest_hash!==digest||current.expires_at<=this.now()||current.upload_until<=this.now()||
      !['sealing','sealed'].includes(current.state))throw Error('INTERNAL_UPLOAD_UNAVAILABLE');
   this.sql.exec("UPDATE internal_share_packages SET state='sealed' WHERE package_id=? AND state='sealing'",key);
   return {ok:true,state:'sealed',complete:true};
  }catch(e){
   // Only our own unfinished seal may fall back to draft for a retry.
   if(this.row(key)?.state==='sealing'){
    this.sql.exec('DELETE FROM share_manifest WHERE token_hash=?',key);
    this.sql.exec("UPDATE internal_share_packages SET state='draft',manifest_hash=NULL WHERE package_id=? AND state='sealing'",key);
   }
   throw e;
  }
 }
 ownerSummary(actor,key){
  this.owner(actor);const r=this.row(key);
  if(!r||r.expires_at<=this.now()||!['ready','revoked','delivered'].includes(r.state)&&r.upload_until<=this.now())return null;
  const m=this.sql.exec('SELECT title,event_date FROM share_snapshot WHERE token_hash=?',key).toArray()[0];
  return {state:r.state,expiresAt:r.expires_at,...m?{title:m.title,eventDate:m.event_date}:{},
   recipients:this.targets(key).map(x=>({contact:x.contact_id,revoked:x.revoked_at!==null}))};
 }
 recipientForContact(actor,key,contact){
  this.owner(actor);requireValue(ID,contact);
  return this.row(key)?this.targets(key).find(x=>x.contact_id===contact)?.recipient_id||null:null;
 }
 pendingTargets(actor,key){
  this.owner(actor);const r=this.row(key);
  if(!r||!['sealed','ready'].includes(r.state)||r.expires_at<=this.now()||
     r.state!=='ready'&&r.upload_until<=this.now())throw Error('INTERNAL_SHARE_NOT_SEALED');
  return {state:r.state,expiresAt:r.expires_at,targets:this.targets(key).filter(x=>x.revoked_at===null).map(x=>({account:x.recipient_id,contact:x.contact_id}))};
 }
 // Called only INSIDE the existing Worker, after recipient locators are
 // durably prepared and current recipient authorization has been checked.
 // No browser-facing handler yet: cannot report a sent memory prematurely.
 activate(actor,key,preparedAccountIds){
  this.owner(actor);
  return this.storage.transactionSync(()=>{
   const r=this.row(key);
   if(!r||!['sealed','ready'].includes(r.state)||r.expires_at<=this.now()||
      r.state!=='ready'&&r.upload_until<=this.now())throw Error('INTERNAL_SHARE_NOT_SEALED');
   const intended=this.targets(key).filter(x=>x.revoked_at===null).map(x=>x.recipient_id).sort();
   if(!Array.isArray(preparedAccountIds)||!intended.length||
      JSON.stringify([...preparedAccountIds].sort())!==JSON.stringify(intended))throw Error('INTERNAL_DELIVERY_INCOMPLETE');
   if(!this.sql.exec("SELECT 1 FROM share_manifest WHERE token_hash=?",key).toArray()[0])throw Error('INTERNAL_SHARE_NOT_SEALED');
   this.sql.exec("UPDATE internal_share_packages SET state='ready' WHERE package_id=?",key);
   return {ok:true,state:'ready',expiresAt:r.expires_at,recipients:intended.length};
  });
 }
 // A session/account ID must come from the Worker, never request JSON.
 // Recipient blocks also checked by that Worker on every access.
 authorized(actor,key){
  requireValue(ID,actor);const r=this.row(key);
  return active(r,this.now())&&!!this.sql.exec('SELECT 1 FROM internal_share_recipients r WHERE package_id=? AND recipient_id=? AND revoked_at IS NULL AND NOT EXISTS (SELECT 1 FROM internal_share_deliveries d WHERE d.package_id=r.package_id AND d.recipient_id=r.recipient_id)',key,actor).toArray()[0];
 }
 summary(actor,key){
  if(!this.authorized(actor,key))return null;
  const r=this.row(key),m=this.sql.exec('SELECT title,event_date FROM share_snapshot WHERE token_hash=?',key).toArray()[0];
  return m?{title:m.title,eventDate:m.event_date,expiresAt:r.expires_at}:null;
 }
 content(actor,key){
  if(!this.authorized(actor,key))return null;
  const meta=this.sql.exec('SELECT title,story_text,event_date FROM share_snapshot WHERE token_hash=?',key).toArray()[0];
  const raw=this.sql.exec('SELECT document FROM share_manifest WHERE token_hash=?',key).toArray()[0]?.document;
  if(!meta||!raw)return null;
  const manifest=JSON.parse(raw),has=kind=>manifest.items.some(x=>x.kind===kind);
  return {manifestHash:this.row(key).manifest_hash,title:meta.title,storyText:meta.story_text,eventDate:meta.event_date,hasPhoto:has('photo'),hasVideo:has('video'),hasAudio:has('audio'),manifest};
 }
 part(actor,key,index,part,poster=false){
  if(!this.authorized(actor,key)||!Number.isInteger(index)||index<0||index>=24)return null;
  const manifest=JSON.parse(this.sql.exec('SELECT document FROM share_manifest WHERE token_hash=?',key).toArray()[0]?.document||'null');
  const item=poster?manifest?.posters?.find(x=>x.mediaIndex===index):manifest?.items?.[index];
  if(!item||!poster&&(!Number.isInteger(part)||part<0||part>=item.parts))return null;
  const kind=poster?'poster-'+index:'asset-'+index+'-'+part;
  const row=this.sql.exec('SELECT mime,bytes FROM share_media WHERE token_hash=? AND kind=?',key,kind).toArray()[0];
  if(!row||row.mime!==item.mime)return null;
  const expected=poster?item.size:Math.min(1048576,item.size-part*1048576);
  return row.bytes.byteLength===expected?{mime:row.mime,bytes:row.bytes}:null;
 }
 deleteBytes(key){
  for(const table of ['share_media','share_manifest','share_snapshot'])this.sql.exec('DELETE FROM '+table+' WHERE token_hash=?',key);
  this.sql.exec('DELETE FROM internal_share_digests WHERE package_id=?',key);
 }
 // An authenticated recipient acknowledges their own fully verified, locally
 // committed package. Never infer receipt from a GET, push, or seen flag.
 // Keep only small idempotency/authorization records until the original expiry.
 received(actor,key,manifestHash){
  requireValue(ID,actor);requireValue(HASH,manifestHash);
  const initial=this.row(key);
  if(!initial||!['ready','delivered'].includes(initial.state)||initial.expires_at<=this.now()||initial.manifest_hash!==manifestHash)return {ok:false};
  return this.storage.transactionSync(()=>{
   const r=this.row(key);
   if(!r||!['ready','delivered'].includes(r.state)||r.expires_at<=this.now()||r.manifest_hash!==manifestHash)return {ok:false};
   const target=this.targets(key).find(x=>x.recipient_id===actor);
   if(!target||target.revoked_at!==null)return {ok:false};
   const prior=this.sql.exec('SELECT 1 FROM internal_share_deliveries WHERE package_id=? AND recipient_id=?',key,actor).toArray()[0];
   if(prior)return {ok:true,received:true};
   if(r.state!=='ready')return {ok:false};
   this.sql.exec("INSERT INTO internal_share_deliveries(package_id,recipient_id,delivered_at) VALUES (?,?,?)",key,actor,this.now());
   this.finishIfNoPending(key);
   return {ok:true,received:true};
  });
 }
 finishIfNoPending(key){
  const pending=this.sql.exec("SELECT 1 FROM internal_share_recipients r WHERE r.package_id=? AND r.revoked_at IS NULL AND NOT EXISTS (SELECT 1 FROM internal_share_deliveries d WHERE d.package_id=r.package_id AND d.recipient_id=r.recipient_id) LIMIT 1",key).toArray()[0];
  if(pending)return;
  const any=this.sql.exec("SELECT 1 FROM internal_share_deliveries WHERE package_id=? LIMIT 1",key).toArray()[0];
  this.deleteBytes(key);
  this.sql.exec("UPDATE internal_share_packages SET state=? WHERE package_id=?",any?'delivered':'revoked',key);
 }
 revoke(actor,key,recipient=null){
  this.owner(actor);const r=this.row(key);if(!r)return {ok:false};
  if(recipient!==null)requireValue(ID,recipient);
  return this.storage.transactionSync(()=>{
   if(recipient===null)this.sql.exec('UPDATE internal_share_recipients SET revoked_at=? WHERE package_id=? AND revoked_at IS NULL',this.now(),key);
   else this.sql.exec('UPDATE internal_share_recipients SET revoked_at=? WHERE package_id=? AND recipient_id=? AND revoked_at IS NULL',this.now(),key,recipient);
   this.finishIfNoPending(key);
   return {ok:true};
  });
 }
 nextExpiry(){
  if(!this.hasSchema())return null;
  const row=this.sql.exec("SELECT MIN(CASE WHEN state IN ('ready','revoked','delivered') THEN expires_at ELSE upload_until END) AS next FROM internal_share_packages").toArray()[0];
  return Number.isSafeInteger(row?.next)?row.next:null;
 }
 cleanup(){
  if(!this.hasSchema())return;
  const now=this.now();
  this.storage.transactionSync(()=>{
   const due=this.sql.exec("SELECT package_id FROM internal_share_packages WHERE expires_at<=? OR (state NOT IN ('ready','revoked','delivered') AND upload_until<=?)",now,now).toArray();
   for(const {package_id:key} of due){
    this.deleteBytes(key);
    this.sql.exec('DELETE FROM internal_share_deliveries WHERE package_id=?',key);
    this.sql.exec('DELETE FROM internal_share_recipients WHERE package_id=?',key);
    this.sql.exec('DELETE FROM internal_share_packages WHERE package_id=?',key);
   }
  });
 }
}
