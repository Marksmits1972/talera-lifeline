// TALERA Free Social: PRIVATE prototype of per-memory, EU-compatible Durable Objects.
// Synthetic staging only. No link to the official TALERA social D1 or customer data.
import {DurableObject} from 'cloudflare:workers';
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
  await this.addShare(actor,hash,expires);
  this.sql.exec("INSERT INTO share_snapshot(token_hash,title,story_text,event_date) VALUES (?,?,?,?)",
   hash,draft.title,draft.story_text,draft.event_date);
  await this.refreshContentAlarm();
  return response(true,{expiresAt:expires});
 }
 async saveShareMedia(actor,hash,kind,mime,bytes){
  this.checkOwner(actor);verifyTokenHash(hash);
  if(!['photo','photo-full','audio','video'].includes(kind))throw Error('INVALID_MEDIA_KIND');
  if(!({photo:['image/jpeg'], 'photo-full':['image/jpeg'],
      audio:['audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav','audio/x-m4a'],
      video:['video/mp4','video/webm','video/quicktime']}[kind]||[]).includes(mime))
   throw Error('INVALID_MEDIA_TYPE');
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>1800000)
   throw Error('INVALID_MEDIA_SIZE');
  const exists=this.sql.exec("SELECT s.token_hash FROM shares s JOIN share_snapshot c ON c.token_hash=s.token_hash WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?",hash,now()).toArray()[0];
  if(!exists)throw Error('SHARE_NOT_ACTIVE');
  this.sql.exec("INSERT INTO share_media(token_hash,kind,mime,bytes) VALUES (?,?,?,?) ON CONFLICT(token_hash,kind) DO UPDATE SET mime=excluded.mime,bytes=excluded.bytes",
   hash,kind,mime,bytes);
  return response(true,{stored:true});
 }

 // Exact temporary copy of ONE consented memory. Store the original bytes in
 // bounded parts of the existing, token-scoped social DO, not a new media service.
 async saveSharePart(actor,hash,index,part,mime,bytes){
  this.checkOwner(actor);verifyTokenHash(hash);
  if(!Number.isInteger(index)||index<0||index>=24||
     !Number.isInteger(part)||part<0||part>=96)
   throw Error('INVALID_SHARE_PART');
  if(typeof mime!=='string'||!/^(image\/(?:jpeg|png|webp|gif|heic|heif)|video\/(?:mp4|webm|quicktime)|audio\/(?:mpeg|mp4|webm|ogg|wav|x-m4a|aac|aiff|x-aiff))$/.test(mime))
   throw Error('INVALID_SHARE_MIME');
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>1048576)
   throw Error('INVALID_SHARE_PART_SIZE');
  if(!this.access(null,hash))throw Error('SHARE_NOT_ACTIVE');
  const kind='asset-'+index+'-'+part;
  const previous=this.sql.exec('SELECT length(bytes) AS n FROM share_media WHERE token_hash=? AND kind=?',hash,kind).toArray()[0]?.n||0;
  const total=this.sql.exec('SELECT COALESCE(SUM(length(bytes)),0) AS n FROM share_media WHERE token_hash=?',hash).toArray()[0]?.n||0;
  if(total-previous+bytes.byteLength>96*1048576)throw Error('SHARE_TOTAL_SIZE_LIMIT');
  this.sql.exec('INSERT INTO share_media(token_hash,kind,mime,bytes) VALUES (?,?,?,?) ON CONFLICT(token_hash,kind) DO UPDATE SET mime=excluded.mime,bytes=excluded.bytes',
   hash,kind,mime,bytes);
  return response(true,{stored:true});
 }

 // Temporary read-only video thumbnails; never album photos or narration entries.
 async saveSharePoster(actor,hash,index,mime,bytes){
  this.checkOwner(actor);verifyTokenHash(hash);
  if(!Number.isInteger(index)||index<0||index>=24||
     !['image/jpeg','image/png','image/webp'].includes(mime)||
     !(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>1500000)
   throw Error('INVALID_SHARE_POSTER');
  if(!this.access(null,hash))throw Error('SHARE_NOT_ACTIVE');
  const kind='poster-'+index;
  const previous=this.sql.exec('SELECT length(bytes) AS n FROM share_media WHERE token_hash=? AND kind=?',
   hash,kind).toArray()[0]?.n||0;
  const total=this.sql.exec('SELECT COALESCE(SUM(length(bytes)),0) AS n FROM share_media WHERE token_hash=?',
   hash).toArray()[0]?.n||0;
  if(total-previous+bytes.byteLength>96*1048576)throw Error('SHARE_TOTAL_SIZE_LIMIT');
  this.sql.exec('INSERT INTO share_media(token_hash,kind,mime,bytes) VALUES (?,?,?,?) ON CONFLICT(token_hash,kind) DO UPDATE SET mime=excluded.mime,bytes=excluded.bytes',
   hash,kind,mime,bytes);
  return response(true,{stored:true});
 }
 async completeShareManifest(actor,hash,document){
  this.checkOwner(actor);verifyTokenHash(hash);
  if(!this.access(null,hash))throw Error('SHARE_NOT_ACTIVE');
  if(!document||document.version!==1||!Array.isArray(document.items)||
    document.items.length>24||!Array.isArray(document.narrationCues)||
    document.narrationCues.length>1000||
    !Number.isSafeInteger(document.narrationDurationMs)||
    document.narrationDurationMs<0||document.narrationDurationMs>86400000)
   throw Error('INVALID_SHARE_MANIFEST');
  const metadata=this.sql.exec('SELECT story_text FROM share_snapshot WHERE token_hash=?',hash).toArray()[0];
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
    const stored=this.sql.exec('SELECT mime,length(bytes) AS n FROM share_media WHERE token_hash=? AND kind=?',
      hash,'asset-'+index+'-'+part).toArray()[0];
    if(!stored||stored.mime!==item.mime||stored.n<1||
       stored.n>1048576||(part<item.parts-1&&stored.n!==1048576))
     throw Error('INCOMPLETE_SHARE_MEDIA');
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
   const saved=this.sql.exec('SELECT mime,bytes FROM share_media WHERE token_hash=? AND kind=?',
    hash,'poster-'+poster.mediaIndex).toArray()[0];
   if(!saved||saved.mime!==poster.mime||saved.bytes.byteLength!==poster.size)
    throw Error('INCOMPLETE_SHARE_POSTER');
   const digest=await crypto.subtle.digest('SHA-256',saved.bytes);
   const hex=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
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
  this.sql.exec('INSERT INTO share_manifest(token_hash,document) VALUES (?,?) ON CONFLICT(token_hash) DO UPDATE SET document=excluded.document',
   hash,raw);
  return response(true,{complete:true,originalItems:document.items.length});
 }

 async sharedPoster(hash,index){
  verifyTokenHash(hash);
  if(!Number.isInteger(index)||index<0||index>=24||!this.access(null,hash))return null;
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
 async sharedPart(hash,index,part){
  verifyTokenHash(hash);
  if(!Number.isInteger(index)||index<0||index>=24||
     !Number.isInteger(part)||part<0||part>=96||
     !this.access(null,hash))return null;
  const raw=this.sql.exec('SELECT document FROM share_manifest WHERE token_hash=?',hash).toArray()[0]?.document;
  if(!raw)return null;
  const item=JSON.parse(raw).items?.[index];
  if(!item||part>=item.parts)return null;
  const row=this.sql.exec('SELECT mime,bytes FROM share_media WHERE token_hash=? AND kind=?',
    hash,'asset-'+index+'-'+part).toArray()[0];
  return row&&row.mime===item.mime?{mime:row.mime,bytes:row.bytes}:null;
 }

 async shareContent(hash){
  verifyTokenHash(hash);
  if(!this.access(null,hash))return null;
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
 async sharedMedia(hash,kind){
  verifyTokenHash(hash);
  if(!['photo','photo-full','audio','video'].includes(kind)||!this.access(null,hash))return null;
  const row=this.sql.exec("SELECT mime,bytes FROM share_media WHERE token_hash=? AND kind=?",hash,kind).toArray()[0];
  return row?{mime:row.mime,bytes:row.bytes}:null;
 }
 async refreshContentAlarm(){
  const draft=this.sql.exec("SELECT expires_at FROM share_draft WHERE singleton=1").toArray()[0];
  const earliest=this.sql.exec("SELECT MIN(s.expires_at) AS next FROM shares s JOIN share_snapshot c ON c.token_hash=s.token_hash WHERE s.expires_at>?",now()).toArray()[0]?.next;
  const next=[draft?.expires_at,earliest].filter(t=>Number.isSafeInteger(t)&&t>now()).sort((a,b)=>a-b)[0];
  if(next&&this.ctx.storage.setAlarm)await this.ctx.storage.setAlarm(next);
 }
 async alarm(){
  this.sql.exec("DELETE FROM share_draft WHERE expires_at<=?",now());
  this.sql.exec("DELETE FROM share_media WHERE token_hash IN (SELECT token_hash FROM shares WHERE expires_at<=? OR revoked_at IS NOT NULL)",now());
  this.sql.exec("DELETE FROM share_snapshot WHERE token_hash IN (SELECT token_hash FROM shares WHERE expires_at<=? OR revoked_at IS NOT NULL)",now());
  this.sql.exec("DELETE FROM share_manifest WHERE token_hash IN (SELECT token_hash FROM shares WHERE expires_at<=? OR revoked_at IS NOT NULL)",now());
  this.sql.exec("DELETE FROM guest_feedback_hearts WHERE token_hash IN (SELECT token_hash FROM shares WHERE expires_at<=? OR revoked_at IS NOT NULL)",now());
  this.sql.exec("DELETE FROM guest_feedback_comments WHERE token_hash IN (SELECT token_hash FROM shares WHERE expires_at<=? OR revoked_at IS NOT NULL)",now());
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
  if(!Number.isSafeInteger(expiresAt)||expiresAt<=now()||expiresAt>now()+30*86400000)
   throw Error('INVALID_EXPIRY');
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
  this.sql.exec('DELETE FROM guest_feedback_hearts WHERE token_hash=?',tokenHash);
  this.sql.exec('DELETE FROM guest_feedback_comments WHERE token_hash=?',tokenHash);
  return response(true,{revoked:true});
 }
 // A browser identity is anonymous and NOT a verified human identity.
 // Server-side per-link and per-browser bounds limit obvious abuse.
 async guestFeedback(tokenHash,{action,guestId,actorId=null,name='',body=''}={}){
  verifyTokenHash(tokenHash);
  if(!this.access(null,tokenHash))throw Error('ACCESS_DENIED');
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
   if(!tokenHash||!this.access(null,tokenHash))throw Error('ACCESS_DENIED');
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
