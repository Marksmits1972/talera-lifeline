// TALERA Free Social: PRIVATE prototype of per-memory, EU-compatible Durable Objects.
// Synthetic staging only. No link to the official TALERA social D1 or customer data.
import {DurableObject} from 'cloudflare:workers';
import {saveSnapshotPart,saveSnapshotPoster,completeSnapshotManifest} from './share-snapshot-storage.mjs';
import {compactPreviewPolicy,validCompactPreview,validCompactJPEG} from './guest-preview-policy.mjs';
import {InternalShareStore} from './internal-share-storage.mjs';
const STORY=/^[A-Za-z0-9_-]{8,80}$/;
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH=/^[a-f0-9]{64}$/;
function check(re,value,label){
 if(typeof value!=='string'||!re.test(value))throw Error('INVALID_'+label);
 return value;
}
const now=()=>Date.now();
const response=(ok,details={})=>({ok,...details});
export function verifyStoryId(id){return check(STORY,id,'STORY_ID')}
export function verifyAccountId(id){return check(ID,id,'ACCOUNT_ID')}
export function verifyTokenHash(hash){return check(HASH,hash,'TOKEN_HASH')}

export class FreeSocialMemory extends DurableObject{
 constructor(ctx,env){
  super(ctx,env);
  this.sql=ctx.storage.sql;
  this.sql.exec("CREATE TABLE IF NOT EXISTS owner_meta (story_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL)");
  this.sql.exec("CREATE TABLE IF NOT EXISTS grants (recipient_id TEXT PRIMARY KEY, revoked_at INTEGER)");
  this.sql.exec("CREATE TABLE IF NOT EXISTS shares (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, revoked_at INTEGER)");
  this.sql.exec("CREATE TABLE IF NOT EXISTS reactions (actor_key TEXT PRIMARY KEY, created_at INTEGER NOT NULL)");
  this.sql.exec("CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, actor_key TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL)");
  // Optional, explicitly consented WhatsApp snapshots. The original Free
  // library never leaves the phone. Only the one selected memory is copied
  // into these existing per-memory DO tables, and expires automatically.
  this.sql.exec("CREATE TABLE IF NOT EXISTS share_browser (token_hash TEXT PRIMARY KEY, session_hash TEXT, preview_allowed INTEGER NOT NULL DEFAULT 0)");
  this.sql.exec("CREATE TABLE IF NOT EXISTS share_draft (singleton INTEGER PRIMARY KEY CHECK(singleton=1), title TEXT NOT NULL, story_text TEXT NOT NULL, event_date TEXT NOT NULL, expires_at INTEGER NOT NULL)");
  this.sql.exec("CREATE TABLE IF NOT EXISTS share_snapshot (token_hash TEXT PRIMARY KEY, title TEXT NOT NULL, story_text TEXT NOT NULL, event_date TEXT NOT NULL)");
  this.sql.exec("CREATE TABLE IF NOT EXISTS share_media (token_hash TEXT NOT NULL, kind TEXT NOT NULL, mime TEXT NOT NULL, bytes BLOB NOT NULL, PRIMARY KEY(token_hash,kind))");
  this.sql.exec("CREATE TABLE IF NOT EXISTS share_manifest (token_hash TEXT PRIMARY KEY, document TEXT NOT NULL)");
  this.sql.exec("CREATE TABLE IF NOT EXISTS guest_feedback_hearts (token_hash TEXT NOT NULL, actor_key TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(token_hash,actor_key))");
  this.sql.exec("CREATE TABLE IF NOT EXISTS guest_feedback_comments (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, actor_key TEXT NOT NULL, display_name TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL)");

 }
 async initialize(storyId,actor){
  verifyStoryId(storyId);verifyAccountId(actor);
  const exists=this.sql.exec('SELECT story_id,owner_id FROM owner_meta LIMIT 1').toArray()[0];
  if(exists)return response(exists.story_id===storyId&&exists.owner_id===actor,{alreadyExisted:true});
  this.sql.exec('INSERT INTO owner_meta (story_id,owner_id) VALUES (?,?)',storyId,actor);
  return response(true,{alreadyExisted:false});
 }
 owner(){
  return this.sql.exec('SELECT story_id,owner_id FROM owner_meta LIMIT 1').toArray()[0]||null;
 }
 checkOwner(actor){
  verifyAccountId(actor);
  const row=this.owner();
  if(!row||row.owner_id!==actor)throw Error('OWNER_REQUIRED');
  return row;
 }
 access(actor,tokenHash){
  const row=this.owner();
  if(!row)return false;
  if(actor){
   verifyAccountId(actor);
   if(actor===row.owner_id)return true;
   const grant=this.sql.exec('SELECT revoked_at FROM grants WHERE recipient_id=?',actor).toArray()[0];
   if(grant&&grant.revoked_at===null)return true;
  }
  if(tokenHash){
   verifyTokenHash(tokenHash);
   const share=this.sql.exec('SELECT expires_at,revoked_at FROM shares WHERE token_hash=?',tokenHash).toArray()[0];
   return !!share&&share.revoked_at===null&&share.expires_at>now();
  }
  return false;
 }
 // Internal OWNER-ONLY read model: true DO grants and share expiry,
 // without titles, story bodies, media, or raw capability tokens.
 async ownerOverview(actor){
  this.checkOwner(actor);
  const owner=this.owner();
  if(!owner)throw Error('OWNER_REQUIRED');
  return {
   storyId:owner.story_id,
   shares:this.sql.exec('SELECT token_hash,expires_at,revoked_at FROM shares ORDER BY expires_at DESC LIMIT 1000').toArray(),
   grants:this.sql.exec('SELECT recipient_id,revoked_at FROM grants ORDER BY recipient_id LIMIT 1000').toArray()
  };
 }
 async stageShare(actor,{title,storyText,eventDate}={}){
  this.checkOwner(actor);
  if(typeof title!=='string'||title.length>180||
     typeof storyText!=='string'||storyText.length>12000||
     typeof eventDate!=='string'||!/^\d{0,4}(?:-\d{2}-\d{2})?$/.test(eventDate))
    throw Error('INVALID_SHARE_CONTENT');
  const expires=now()+10*60000;
  this.sql.exec("INSERT INTO share_draft(singleton,title,story_text,event_date,expires_at) VALUES (1,?,?,?,?) ON CONFLICT(singleton) DO UPDATE SET title=excluded.title,story_text=excluded.story_text,event_date=excluded.event_date,expires_at=excluded.expires_at",
   title.trim(),storyText.trim(),eventDate,expires);
  await this.refreshContentAlarm();
  return response(true,{ready:true});
 }
 async readyShare(actor){
  this.checkOwner(actor);
  const d=this.sql.exec("SELECT expires_at FROM share_draft WHERE singleton=1").toArray()[0];
  return response(!!d&&d.expires_at>now(),{ready:!!d&&d.expires_at>now()});
 }
 async startShare(actor,hash,expires){
  this.checkOwner(actor);verifyTokenHash(hash);
  const draft=this.sql.exec("SELECT title,story_text,event_date,expires_at FROM share_draft WHERE singleton=1").toArray()[0];
  if(!draft||draft.expires_at<=now())throw Error('SHARE_DRAFT_EXPIRED');
  // No pointer is published by the caller until this policy is installed.
  // All previously issued shares without this row retain their old policy.
  await this.addShare(actor,hash,expires);
  this.sql.exec("INSERT INTO share_browser(token_hash,session_hash) VALUES (?,NULL)",hash);
  this.sql.exec("INSERT INTO share_snapshot(token_hash,title,story_text,event_date) VALUES (?,?,?,?)",
   hash,draft.title,draft.story_text,draft.event_date);
  await this.refreshContentAlarm();
  return response(true,{expiresAt:expires});
 }
 async saveShareMedia(actor,hash,kind,mime,bytes,previewConsent=false){
  this.checkOwner(actor);verifyTokenHash(hash);
  if(!['photo','photo-full','audio','video','preview'].includes(kind))throw Error('INVALID_MEDIA_KIND');
  if(!({photo:['image/jpeg'],preview:['image/jpeg'], 'photo-full':['image/jpeg'],
      audio:['audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav','audio/x-m4a'],
      video:['video/mp4','video/webm','video/quicktime']}[kind]||[]).includes(mime))
   throw Error('INVALID_MEDIA_TYPE');
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>1800000)
   throw Error('INVALID_MEDIA_SIZE');
  const exists=this.sql.exec("SELECT s.token_hash FROM shares s JOIN share_snapshot c ON c.token_hash=s.token_hash WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?",hash,now()).toArray()[0];
  if(!exists)throw Error('SHARE_NOT_ACTIVE');
  const protectedShare=this.sql.exec("SELECT 1 AS present FROM share_browser WHERE token_hash=?",hash).toArray()[0];
  if(kind==='preview'&&(!protectedShare||previewConsent!==true||!validCompactJPEG(bytes)))throw Error('INVALID_COMPACT_PREVIEW');
  if(protectedShare&&['photo','preview'].includes(kind)&&this.sql.exec("SELECT 1 AS ready FROM share_manifest WHERE token_hash=?",hash).toArray()[0])throw Error('SHARE_ALREADY_COMPLETE');
  this.sql.exec("INSERT INTO share_media(token_hash,kind,mime,bytes) VALUES (?,?,?,?) ON CONFLICT(token_hash,kind) DO UPDATE SET mime=excluded.mime,bytes=excluded.bytes",
   hash,kind,mime,bytes);
  if(protectedShare&&kind==='photo')this.sql.exec("UPDATE share_browser SET preview_allowed=? WHERE token_hash=?",previewConsent===true?1:0,hash);
  return response(true,{stored:true});
 }

 // Exact temporary copy of ONE consented memory. Store the original bytes in
 // bounded parts of the existing, token-scoped social DO, not a new media service.
 async saveSharePart(actor,hash,index,part,mime,bytes){
  this.checkOwner(actor);verifyTokenHash(hash);
  if(!this.access(null,hash))throw Error('SHARE_NOT_ACTIVE');
  return saveSnapshotPart(this.sql,hash,index,part,mime,bytes);
 }

 // Temporary read-only video thumbnails; never album photos or narration entries.
 async saveSharePoster(actor,hash,index,mime,bytes){
  this.checkOwner(actor);verifyTokenHash(hash);
  if(!this.access(null,hash))throw Error('SHARE_NOT_ACTIVE');
  return saveSnapshotPoster(this.sql,hash,index,mime,bytes);
 }
 async completeShareManifest(actor,hash,document){
  this.checkOwner(actor);verifyTokenHash(hash);
  if(!this.access(null,hash))throw Error('SHARE_NOT_ACTIVE');
  const previous=this.sql.exec('SELECT document FROM share_manifest WHERE token_hash=?',hash).toArray()[0]?.document;
  if(previous&&(compactPreviewPolicy(previous)||Object.hasOwn(document||{},'compactPreview'))){
   if(previous===JSON.stringify(document))return response(true,{complete:true,originalItems:document.items.length});
   throw Error('SHARE_ALREADY_COMPLETE');
  }
  if(Object.hasOwn(document||{},'compactPreview')){
   const preview=document.compactPreview;
   if(!validCompactPreview(preview))throw Error('INVALID_COMPACT_PREVIEW');
   if(preview.photo){
    const saved=this.sql.exec("SELECT mime,bytes FROM share_media WHERE token_hash=? AND kind='preview'",hash).toArray()[0];
    if(!saved||saved.mime!=='image/jpeg'||!validCompactJPEG(new Uint8Array(saved.bytes)))throw Error('INVALID_COMPACT_PREVIEW');
   }
  }
  return completeSnapshotManifest(this.sql,hash,document);
 }

 // Internal account shares have NO row in shares/share_browser or guest pointer.
 // These methods are private binding RPCs, not exposed by the public router.
 #internalStore;
 #internal(){return this.#internalStore??=new InternalShareStore(this.ctx.storage)}
 async stageInternalShare(actor,key,metadata,recipients,expiresAt){
  const r=this.#internal().stage(actor,key,metadata,recipients,expiresAt);
  await this.refreshContentAlarm();return r;
 }
 async uploadInternalPart(actor,key,index,part,mime,bytes){return this.#internal().upload(actor,key,index,part,mime,bytes)}
 async uploadInternalPoster(actor,key,index,mime,bytes){return this.#internal().upload(actor,key,index,0,mime,bytes,true)}
 async sealInternalShare(actor,key,document){return this.#internal().seal(actor,key,document)}
 async internalOwnerSummary(actor,key){return this.#internal().ownerSummary(actor,key)}
 async internalRecipientForContact(actor,key,contact){return this.#internal().recipientForContact(actor,key,contact)}
 async internalPendingTargets(actor,key){return this.#internal().pendingTargets(actor,key)}
 async activateInternalShare(actor,key,preparedAccounts){
  const r=this.#internal().activate(actor,key,preparedAccounts);
  await this.refreshContentAlarm();return r;
 }
 async internalShareSummary(actor,key){return this.#internal().summary(actor,key)}
 async internalShareContent(actor,key){return this.#internal().content(actor,key)}
 async internalSharePart(actor,key,index,part){return this.#internal().part(actor,key,index,part)}
 async internalSharePoster(actor,key,index){return this.#internal().part(actor,key,index,0,true)}
 async receiveInternalShare(actor,key,manifestHash){
  const r=this.#internal().received(actor,key,manifestHash);
  await this.refreshContentAlarm();return r;
 }
 async revokeInternalShare(actor,key,recipient=null){
  const r=this.#internal().revoke(actor,key,recipient);
  await this.refreshContentAlarm();return r;
 }

 // Browser possession is independent of the URL. Only a completed share
 // can be claimed. The conditional update is synchronous/atomic in this DO.
 browserAllowed(hash,sessionHash=null){
  if(!this.access(null,hash))return false;
  const row=this.sql.exec('SELECT session_hash FROM share_browser WHERE token_hash=?',hash).toArray()[0];
  return !row||typeof sessionHash==='string'&&HASH.test(sessionHash)&&row.session_hash===sessionHash;
 }
 async browserGate(hash,sessionHash=null,claim=false){
  verifyTokenHash(hash);
  if(sessionHash!==null)verifyTokenHash(sessionHash);
  const active=this.sql.exec('SELECT expires_at,revoked_at FROM shares WHERE token_hash=?',hash).toArray()[0];
  if(!active||active.revoked_at!==null||active.expires_at<=now())return {active:false};
  const row=this.sql.exec('SELECT session_hash FROM share_browser WHERE token_hash=?',hash).toArray()[0];
  if(!row)return {active:true,protected:false,allowed:true,expiresAt:active.expires_at};
  const raw=this.sql.exec('SELECT document FROM share_manifest WHERE token_hash=?',hash).toArray()[0]?.document;
  const ready=!!raw,compact=compactPreviewPolicy(raw);
  if(claim&&ready&&sessionHash!==null){
   this.sql.exec('UPDATE share_browser SET session_hash=? WHERE token_hash=? AND session_hash IS NULL AND EXISTS (SELECT 1 FROM shares WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?)',sessionHash,hash,hash,now());
  }
  const current=this.sql.exec('SELECT session_hash FROM share_browser WHERE token_hash=?',hash).toArray()[0];
  const hasPreview=ready&&(!compact||compact.photo)&&!!this.sql.exec("SELECT 1 AS present FROM share_media m JOIN share_browser b ON b.token_hash=m.token_hash WHERE m.token_hash=? AND m.kind=? AND m.mime='image/jpeg' AND (m.kind='preview' OR b.preview_allowed=1)",hash,compact?'preview':'photo').toArray()[0];
  const previewTitle=compact?.title?String(this.sql.exec('SELECT title FROM share_snapshot WHERE token_hash=?',hash).toArray()[0]?.title||'').trim().slice(0,180):'';
  return {active:true,protected:true,ready,hasPreview,compact:!!compact,previewTitle,claimed:current?.session_hash!==null,
   allowed:ready&&sessionHash!==null&&current?.session_hash===sessionHash,expiresAt:active.expires_at};
 }
 // A specifically consented reduced JPEG is the only public preview.
 // It is intentionally not a claim and never exposes the full media.
 async browserPreview(hash){
  verifyTokenHash(hash);
  if(!this.access(null,hash))return null;
  const raw=this.sql.exec('SELECT document FROM share_manifest WHERE token_hash=?',hash).toArray()[0]?.document;
  if(!raw)return null;
  const compact=compactPreviewPolicy(raw);
  if(compact&&!compact.photo)return null;
  const row=this.sql.exec("SELECT m.mime,m.bytes FROM share_media m JOIN share_browser b ON b.token_hash=m.token_hash WHERE m.token_hash=? AND m.kind=? AND (m.kind='preview' OR b.preview_allowed=1)",hash,compact?'preview':'photo').toArray()[0];
  return row?.mime==='image/jpeg'?{mime:row.mime,bytes:row.bytes}:null;
 }
 async sharedPoster(hash,index,sessionHash=null){
  verifyTokenHash(hash);
  if(!Number.isInteger(index)||index<0||index>=24||!this.browserAllowed(hash,sessionHash))return null;
  const raw=this.sql.exec('SELECT document FROM share_manifest WHERE token_hash=?',
   hash).toArray()[0]?.document;
  if(!raw)return null;
  const meta=JSON.parse(raw).posters?.find(p=>p.mediaIndex===index);
  if(!meta)return null;
  const row=this.sql.exec('SELECT mime,bytes FROM share_media WHERE token_hash=? AND kind=?',
   hash,'poster-'+index).toArray()[0];
  return row&&row.mime===meta.mime&&row.bytes.byteLength===meta.size?
   {mime:row.mime,bytes:row.bytes}:null;
 }
 async sharedPart(hash,index,part,sessionHash=null){
  verifyTokenHash(hash);
  if(!Number.isInteger(index)||index<0||index>=24||
     !Number.isInteger(part)||part<0||part>=96||
     !this.browserAllowed(hash,sessionHash))return null;
  const raw=this.sql.exec('SELECT document FROM share_manifest WHERE token_hash=?',hash).toArray()[0]?.document;
  if(!raw)return null;
  const item=JSON.parse(raw).items?.[index];
  if(!item||part>=item.parts)return null;
  const row=this.sql.exec('SELECT mime,bytes FROM share_media WHERE token_hash=? AND kind=?',
    hash,'asset-'+index+'-'+part).toArray()[0];
  return row&&row.mime===item.mime?{mime:row.mime,bytes:row.bytes}:null;
 }

 async shareContent(hash,sessionHash=null){
  verifyTokenHash(hash);
  if(!this.browserAllowed(hash,sessionHash))return null;
  const info=this.sql.exec("SELECT title,story_text,event_date FROM share_snapshot WHERE token_hash=?",hash).toArray()[0];
  if(!info)return null;
  const media=this.sql.exec("SELECT kind FROM share_media WHERE token_hash=?",hash)
    .toArray().map(r=>r.kind);
  const raw=this.sql.exec('SELECT document FROM share_manifest WHERE token_hash=?',hash).toArray()[0]?.document;
  const manifest=raw?JSON.parse(raw):null;
  if(!info.story_text.trim()&&!(manifest?.items?.length||media.length))return null;
  const has=kind=>manifest?manifest.items.some(x=>x.kind===kind):media.includes(kind);
  return {title:info.title,storyText:info.story_text,eventDate:info.event_date,
   hasPhoto:has('photo'),hasAudio:has('audio'),hasVideo:has('video'),manifest};
 }
 async sharedMedia(hash,kind,sessionHash=null){
  verifyTokenHash(hash);
  if(!['photo','photo-full','audio','video'].includes(kind)||!this.browserAllowed(hash,sessionHash))return null;
  const row=this.sql.exec("SELECT mime,bytes FROM share_media WHERE token_hash=? AND kind=?",hash,kind).toArray()[0];
  return row?{mime:row.mime,bytes:row.bytes}:null;
 }
 async refreshContentAlarm(){
  const draft=this.sql.exec("SELECT expires_at FROM share_draft WHERE singleton=1").toArray()[0];
  const earliest=this.sql.exec("SELECT MIN(s.expires_at) AS next FROM shares s JOIN share_snapshot c ON c.token_hash=s.token_hash WHERE s.expires_at>?",now()).toArray()[0]?.next;
  const clock=now(),internal=this.#internal().nextExpiry();
  const next=[draft?.expires_at,earliest,Number.isSafeInteger(internal)?Math.max(clock+1,internal):null].filter(t=>Number.isSafeInteger(t)&&t>clock).sort((a,b)=>a-b)[0];
  if(next&&this.ctx.storage.setAlarm)await this.ctx.storage.setAlarm(next);
 }
 async alarm(){
  this.sql.exec("DELETE FROM share_draft WHERE expires_at<=?",now());
  this.sql.exec("DELETE FROM share_media WHERE token_hash IN (SELECT token_hash FROM shares WHERE expires_at<=? OR revoked_at IS NOT NULL)",now());
  this.sql.exec("DELETE FROM share_snapshot WHERE token_hash IN (SELECT token_hash FROM shares WHERE expires_at<=? OR revoked_at IS NOT NULL)",now());
  this.sql.exec("DELETE FROM share_manifest WHERE token_hash IN (SELECT token_hash FROM shares WHERE expires_at<=? OR revoked_at IS NOT NULL)",now());
  this.sql.exec("DELETE FROM share_browser WHERE token_hash IN (SELECT token_hash FROM shares WHERE expires_at<=? OR revoked_at IS NOT NULL)",now());
  this.sql.exec("DELETE FROM guest_feedback_hearts WHERE token_hash IN (SELECT token_hash FROM shares WHERE expires_at<=? OR revoked_at IS NOT NULL)",now());
  this.sql.exec("DELETE FROM guest_feedback_comments WHERE token_hash IN (SELECT token_hash FROM shares WHERE expires_at<=? OR revoked_at IS NOT NULL)",now());
  this.#internal().cleanup();
  await this.refreshContentAlarm();
 }
 async grant(actor,recipientId){
  this.checkOwner(actor);verifyAccountId(recipientId);
  this.sql.exec("INSERT INTO grants(recipient_id,revoked_at) VALUES (?,NULL) ON CONFLICT(recipient_id) DO UPDATE SET revoked_at=NULL",recipientId);
  return response(true,{granted:true});
 }
 async revokeGrant(actor,recipientId){
  this.checkOwner(actor);verifyAccountId(recipientId);
  this.sql.exec('UPDATE grants SET revoked_at=? WHERE recipient_id=?',now(),recipientId);
  return response(true,{revoked:true});
 }
 async addShare(actor,tokenHash,expiresAt){
  this.checkOwner(actor);verifyTokenHash(tokenHash);
  if(!Number.isSafeInteger(expiresAt)||expiresAt<=now()||expiresAt>now()+7*86400000)
   throw Error('INVALID_EXPIRY');
  if(this.#internal().exists(tokenHash))throw Error('SHARE_KEY_CONFLICT');
  this.sql.exec('INSERT INTO shares(token_hash,expires_at,revoked_at) VALUES (?,?,NULL)',tokenHash,expiresAt);
  return response(true,{expiresAt});
 }
 async revokeShare(actor,tokenHash){
  this.checkOwner(actor);verifyTokenHash(tokenHash);
  const row=this.sql.exec('SELECT token_hash FROM shares WHERE token_hash=?',tokenHash).toArray()[0];
  if(!row)return response(false,{reason:'NOT_FOUND'});
  this.sql.exec('UPDATE shares SET revoked_at=? WHERE token_hash=?',now(),tokenHash);
  this.sql.exec('DELETE FROM share_media WHERE token_hash=?',tokenHash);
  this.sql.exec('DELETE FROM share_snapshot WHERE token_hash=?',tokenHash);
  this.sql.exec('DELETE FROM share_manifest WHERE token_hash=?',tokenHash);
  this.sql.exec('DELETE FROM share_browser WHERE token_hash=?',tokenHash);
  this.sql.exec('DELETE FROM guest_feedback_hearts WHERE token_hash=?',tokenHash);
  this.sql.exec('DELETE FROM guest_feedback_comments WHERE token_hash=?',tokenHash);
  return response(true,{revoked:true});
 }
 // A browser identity is anonymous and NOT a verified human identity.
 // Server-side per-link and per-browser bounds limit obvious abuse.
 async guestFeedback(tokenHash,{action,guestId,actorId=null,name='',body='',sessionHash=null}={}){
  verifyTokenHash(tokenHash);
  if(!this.browserAllowed(tokenHash,sessionHash))throw Error('ACCESS_DENIED');
  if(!['feedback','heart','comment'].includes(action))throw Error('INVALID_GUEST_ACTION');
  if(actorId)verifyAccountId(actorId);
  if(guestId!=null&&guestId!==''&&!/^[a-f0-9-]{36}$/.test(guestId))
   throw Error('INVALID_GUEST_ID');
  const actorKey=actorId?'account:'+actorId:'browser:'+String(guestId||'');
  if(action!=='feedback'&&!actorId&&!/^[a-f0-9-]{36}$/.test(guestId||''))
   throw Error('INVALID_GUEST_ID');
  if(action==='heart'){
   const total=this.sql.exec('SELECT COUNT(*) AS c FROM guest_feedback_hearts WHERE token_hash=?',tokenHash).toArray()[0].c;
   const exists=this.sql.exec('SELECT actor_key FROM guest_feedback_hearts WHERE token_hash=? AND actor_key=?',tokenHash,actorKey).toArray()[0];
   if(!exists&&total>=200)throw Error('GUEST_FEEDBACK_FULL');
   this.sql.exec('INSERT INTO guest_feedback_hearts(token_hash,actor_key,created_at) VALUES (?,?,?) ON CONFLICT(token_hash,actor_key) DO NOTHING',tokenHash,actorKey,now());
  }
  if(action==='comment'){
   const text=String(body||'').trim(),display=String(name||'').trim();
   if(!text||text.length>1000||/[<>]/.test(text)||
      !/^[\p{L}][\p{L}\p{M} .'-]{0,31}$/u.test(display))
    throw Error('INVALID_GUEST_COMMENT');
   const all=this.sql.exec('SELECT COUNT(*) AS c FROM guest_feedback_comments WHERE token_hash=?',tokenHash).toArray()[0].c;
   if(all>=60)throw Error('GUEST_FEEDBACK_FULL');
   const recent=this.sql.exec('SELECT COUNT(*) AS c,MAX(created_at) AS last FROM guest_feedback_comments WHERE token_hash=? AND actor_key=?',tokenHash,actorKey).toArray()[0];
   if(recent.c>=5||recent.last!=null&&now()-recent.last<30000)
    throw Error('GUEST_RATE_LIMIT');
   this.sql.exec('INSERT INTO guest_feedback_comments(id,token_hash,actor_key,display_name,body,created_at) VALUES (?,?,?,?,?,?)',
    crypto.randomUUID(),tokenHash,actorKey,display,text,now());
  }
  // Guest capability grants access to ONE share only. Never expose messages
  // or reaction counts from the account-only conversation for this memory.
  // Existing account reactions and comments remain untouched and private.
  const guestLikes=this.sql.exec('SELECT COUNT(*) AS c FROM guest_feedback_hearts WHERE token_hash=?',tokenHash).toArray()[0].c;
  const guestComments=this.sql.exec('SELECT id,display_name,body FROM guest_feedback_comments WHERE token_hash=? ORDER BY created_at DESC,id LIMIT 20',tokenHash).toArray()
    .map(c=>({id:c.id,body:c.body,name:c.display_name}));
  const storedComments=this.sql.exec('SELECT COUNT(*) AS c FROM guest_feedback_comments WHERE token_hash=?',tokenHash).toArray()[0].c;
  const reaction=this.sql.exec('SELECT actor_key FROM guest_feedback_hearts WHERE token_hash=? AND actor_key=?',tokenHash,actorKey).toArray()[0];
  return {ok:true,likes:guestLikes,liked:!!reaction,commentCount:storedComments,comments:guestComments,accountName:actorId?name:null};
 }
 async like(actor,tokenHash){
  if(!this.access(actor,tokenHash))throw Error('ACCESS_DENIED');
  const actorKey=actor?'account:'+verifyAccountId(actor):'guest:'+verifyTokenHash(tokenHash);
  this.sql.exec('INSERT INTO reactions(actor_key,created_at) VALUES (?,?) ON CONFLICT(actor_key) DO NOTHING',actorKey,now());
  return response(true,{liked:true});
 }
 async comment(actor,tokenHash,body){
  if(!this.access(actor,tokenHash))throw Error('ACCESS_DENIED');
  if(typeof body!=='string'||body.trim().length<1||body.trim().length>1000)
   throw Error('INVALID_COMMENT');
  const actorKey=actor?'account:'+verifyAccountId(actor):'guest:'+verifyTokenHash(tokenHash);
  const id=crypto.randomUUID();
  this.sql.exec('INSERT INTO comments(id,actor_key,body,created_at) VALUES (?,?,?,?)',id,actorKey,body.trim(),now());
  return response(true,{id});
 }
 async view(actor,tokenHash){
  if(!this.access(actor,tokenHash))throw Error('ACCESS_DENIED');
  const owner=this.owner();
  // A share token grants only a single guest view, NEVER the owner's
  // account-only reaction thread. Authenticated owner/grantees keep the
  // original social view unchanged.
  let accountGranted=false;
  if(actor){
   verifyAccountId(actor);
   accountGranted=actor===owner.owner_id;
   if(!accountGranted){
    const grant=this.sql.exec('SELECT revoked_at FROM grants WHERE recipient_id=?',actor).toArray()[0];
    accountGranted=!!grant&&grant.revoked_at===null;
   }
  }
  if(!accountGranted){
   if(!tokenHash||!this.browserAllowed(tokenHash))throw Error('ACCESS_DENIED');
   const guest=await this.guestFeedback(tokenHash,{action:'feedback'});
   return response(true,{storyId:owner.story_id,likes:guest.likes,
    commentCount:guest.commentCount,comments:guest.comments});
  }
  const likes=this.sql.exec('SELECT COUNT(*) AS total FROM reactions').toArray()[0].total;
  const commentCount=this.sql.exec('SELECT COUNT(*) AS total FROM comments').toArray()[0].total;
  const comments=this.sql.exec('SELECT id,body,created_at FROM comments ORDER BY created_at DESC,id LIMIT 20').toArray();
  return response(true,{storyId:owner.story_id,likes,commentCount,comments});
 }
}
export class FreeSocialSharePointer extends DurableObject{
 async point(storyId,tokenHash,expiresAt){
  verifyStoryId(storyId);verifyTokenHash(tokenHash);
  if(!Number.isSafeInteger(expiresAt)||expiresAt<=now())throw Error('INVALID_EXPIRY');
  return this.ctx.storage.transaction(async txn=>{
   const previous=await txn.get('pointer');
   if(previous)return response(previous.storyId===storyId&&previous.tokenHash===tokenHash,{created:false});
   await txn.put('pointer',{storyId,tokenHash,expiresAt});
   return response(true,{created:true});
  });
 }
 async locate(tokenHash){
  verifyTokenHash(tokenHash);
  const pointer=await this.ctx.storage.get('pointer');
  if(!pointer||pointer.tokenHash!==tokenHash||pointer.expiresAt<=now())return null;
  return pointer.storyId;
 }
}
