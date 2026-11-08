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
  return response(true,{revoked:true});
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
