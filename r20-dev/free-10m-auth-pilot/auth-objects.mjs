// Cloudflare Durable Objects: each account, handle, session, IP rate bucket
// lives in its own independently addressable SQLite-backed object.
// All methods are called via internal bindings ONLY, not public HTTP endpoints.
import {DurableObject} from 'cloudflare:workers';
import {validAccountId,validEmail,validHandle,validDisplay,passwordHash,safeEqualHex} from './auth-util.mjs';
import {validatedDate} from '../free-10m-delivery/free-account-router.mjs';

export class FreeAuthAccount extends DurableObject {
 async create(record){
  validAccountId(record?.id);
  if(typeof record?.email!=='string'||!record.email.includes('@')||
      typeof record?.display_name!=='string'||typeof record?.public_handle!=='string'||
      !/^[a-f0-9]{64}$/.test(record?.password_salt||'')||
      !/^[a-f0-9]{64}$/.test(record?.password_hash||''))throw Error('INVALID_ACCOUNT_RECORD');
  return this.ctx.storage.transaction(async txn=>{
   if(await txn.get('account'))return false;
   await txn.put('account',{...record,status:'active',epoch:0,createdAt:Date.now()});
   return true;
  });
 }
 // Migration-only RPC. Not mapped to any public HTTP route.
 // Legacy salts/hashes are transferred unchanged; no plaintext passwords.
 async importLegacy(record){
  const id=validAccountId(record?.id),email=validEmail(record?.email);
  const display=validDisplay(record?.display_name);
  const handle=record.public_handle==null||record.public_handle===''?'':validHandle(record.public_handle);
  if(!['active','disabled'].includes(record?.status))throw Error('INVALID_LEGACY_STATUS');
  if(!/^[a-f0-9]{64}$/.test(record?.password_salt||'')||
     !/^[a-f0-9]{64}$/.test(record?.password_hash||''))throw Error('INVALID_LEGACY_HASH');
  if(!Number.isSafeInteger(record?.created_at)||record.created_at<=0)throw Error('INVALID_LEGACY_DATE');
  return this.ctx.storage.transaction(async txn=>{
   const existing=await txn.get('account');
   if(existing){
    // Idempotent only when immutable identity and password hash match.
    if(existing.id!==id||existing.email!==email||existing.password_hash!==record.password_hash)
     throw Error('LEGACY_ACCOUNT_CONFLICT');
    return {imported:false,verifiedMatchingExisting:true};
   }
   await txn.put('account',{
    id,email,display_name:display,public_handle:handle,
    password_salt:record.password_salt,password_hash:record.password_hash,
    status:record.status,epoch:0,createdAt:record.created_at
   });
   return {imported:true,verifiedMatchingExisting:false};
  });
 }
 async verify(password){
  const row=await this.ctx.storage.get('account');
  // Dummy PBKDF2 work for unknown accounts avoids trivially fast account enumeration.
  const salt=row?.password_salt||'0'.repeat(64);
  const hash=await passwordHash(String(password).slice(0,128),salt);
  if(!row||row.status!=='active'||!safeEqualHex(hash,row.password_hash))return null;
  return {id:row.id,epoch:row.epoch};
 }
 async activeProfile(epoch){
  const a=await this.ctx.storage.get('account');
  if(!a||a.status!=='active'||a.epoch!==epoch)return null;
  return {id:a.id,email:a.email,displayName:a.display_name,publicHandle:a.public_handle,epoch:a.epoch};
 }
 async getProfile(){
  const a=await this.ctx.storage.get('account');
  return a?{id:a.id,email:a.email,displayName:a.display_name,publicHandle:a.public_handle,status:a.status,epoch:a.epoch}:null;
 }
 async setDisplay(name,epoch){
  return this.ctx.storage.transaction(async txn=>{
   const a=await txn.get('account');
   if(!a||a.status!=='active'||a.epoch!==epoch)return null;
   await txn.put('account',{...a,display_name:name});
   return {id:a.id,email:a.email,displayName:name,publicHandle:a.public_handle,epoch:a.epoch};
  });
 }
 // F5 social ownership locator only. The actual grants and capability
 // status remain authoritative in the per-memory SOCIAL_MEMORY Durable Object.
 // No personal story, image, audio, video, title or raw link token is stored.
 async rememberSocialStory(storyId){
  if(typeof storyId!=='string'||!/^[A-Za-z0-9_-]{8,80}$/.test(storyId))
   throw Error('INVALID_SOCIAL_STORY');
  return this.ctx.storage.transaction(async txn=>{
   const entries=await txn.get('f5-social-owned-v1')||[];
   if(entries.includes(storyId))return true;
   if(entries.length>=10000)throw Error('SOCIAL_INDEX_FULL');
   await txn.put('f5-social-owned-v1',[...entries,storyId]);
   return true;
  });
 }
 async socialStoryIds(){
  return await this.ctx.storage.get('f5-social-owned-v1')||[];
 }
 async rememberSocialShare(tokenHash,storyId){
  if(!/^[a-f0-9]{64}$/.test(tokenHash)||typeof storyId!=='string'||
    !/^[A-Za-z0-9_-]{8,80}$/.test(storyId))throw Error('INVALID_SOCIAL_SHARE');
  const key='f5-social-share-v1:'+tokenHash;
  return this.ctx.storage.transaction(async txn=>{
   const previous=await txn.get(key);
   if(previous&&previous!==storyId)throw Error('SOCIAL_SHARE_CONFLICT');
   if(!previous)await txn.put(key,storyId);
   return true;
  });
 }
 async socialShareStory(tokenHash){
  if(!/^[a-f0-9]{64}$/.test(tokenHash))throw Error('INVALID_SOCIAL_SHARE');
  return await this.ctx.storage.get('f5-social-share-v1:'+tokenHash)||null;
 }
 async getBirthDate(){
  const value=await this.ctx.storage.get('birthdate');
  return value===undefined?null:validatedDate(value);
 }
 async setBirthDate(value){
  const date=validatedDate(value);
  await this.ctx.storage.put('birthdate',date);
  return {saved:true,birthDate:date};
 }
 // Not reachable through a public HTTP endpoint.
 async disable(){
  return this.ctx.storage.transaction(async txn=>{
   const a=await txn.get('account');
   if(!a)return false;
   await txn.put('account',{...a,status:'disabled',epoch:a.epoch+1});
   return true;
  });
 }
}

// A single handle can have only one owner; separate handles never contend.
class FreeAuthIdentityIndex extends DurableObject {
 async reserve(accountId){
  validAccountId(accountId);
  return this.ctx.storage.transaction(async txn=>{
   const prior=await txn.get('claim'),now=Date.now();
   if(prior?.state==='active')return prior.id===accountId;
   if(prior?.state==='reserved'&&prior.until>now&&prior.id!==accountId)return false;
   await txn.put('claim',{id:accountId,state:'reserved',until:now+120000});
   return true;
  });
 }
 async activate(accountId){
  return this.ctx.storage.transaction(async txn=>{
   const c=await txn.get('claim');
   if(c?.state==='active')return c.id===accountId;
   if(!c||c.id!==accountId||c.state!=='reserved'||c.until<Date.now())return false;
   await txn.put('claim',{id:accountId,state:'active',until:0});
   return true;
  });
 }
 async release(accountId){
  return this.ctx.storage.transaction(async txn=>{
   const c=await txn.get('claim');
   if(c?.id!==accountId||c.state!=='reserved')return false;
   await txn.delete('claim');
   return true;
  });
 }
 async owner(){
  const c=await this.ctx.storage.get('claim');
  return c?.state==='active'?c.id:null;
 }
}

// Separate hashed identity locators. Only account UUIDs are stored in indices.
export class FreeAuthHandle extends FreeAuthIdentityIndex {}
export class FreeAuthEmail extends FreeAuthIdentityIndex {}

// Session key is SHA-256(random 256-bit token); never raw cookie.
export class FreeAuthSession extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.env=env}
 async open(row){
  validAccountId(row?.accountId);
  if(!Number.isInteger(row?.epoch)||row.epoch<0||
      !Number.isSafeInteger(row?.expires)||row.expires<=Date.now())throw Error('INVALID_SESSION');
  return this.ctx.storage.transaction(async txn=>{
   if(await txn.get('session'))return false;
   await txn.put('session',{...row,revoked:false});
   return true;
  });
 }
 // Migration-only: source D1 contains SHA256(token), not the raw cookie.
 // A session DO selected by that hash can be seeded without recovering tokens.
 async importLegacy(row){
  validAccountId(row?.accountId);
  if(!Number.isSafeInteger(row?.expires)||row.expires<=Date.now())return false;
  return this.ctx.storage.transaction(async txn=>{
   const existing=await txn.get('session');
   if(existing){
    if(existing.accountId!==row.accountId||existing.expires!==row.expires)
     throw Error('LEGACY_SESSION_CONFLICT');
    return true;
   }
   await txn.put('session',{
    accountId:row.accountId,epoch:0,expires:row.expires,revoked:false
   });
   return true;
  });
 }
 async check(){
  const s=await this.ctx.storage.get('session');
  if(!s||s.revoked||s.expires<=Date.now())return null;
  const binding=this.env.AUTH_ACCOUNTS;
  const home=this.env.AUTH_STORAGE_JURISDICTION==='eu'?binding.jurisdiction('eu'):
   this.env.AUTH_STORAGE_JURISDICTION==='local-test'?binding:null;
  if(!home)throw Error('AUTH_JURISDICTION_NOT_EXPLICIT');
  const account=await home.get(home.idFromName('talera-free-account-v1:'+s.accountId)).activeProfile(s.epoch);
  if(!account||account.id!==s.accountId)return null;
  return account;
 }
 async revoke(){
  return this.ctx.storage.transaction(async txn=>{
   const s=await txn.get('session');
   if(!s)return false;
   await txn.put('session',{...s,revoked:true});
   return true;
  });
 }
}

// No global D1 table for high-frequency authentication rate control.
// Each client/category (HMAC of Cloudflare trusted IP) has independent DO.
export class FreeAuthRate extends DurableObject {
 async hit({limit,windowMs}){
  if(!Number.isInteger(limit)||limit<1||limit>1000||
      !Number.isInteger(windowMs)||windowMs<1000||windowMs>3600000)throw Error('INVALID_LIMIT');
  return this.ctx.storage.transaction(async txn=>{
   const now=Date.now(),x=await txn.get('window');
   if(!x||x.start+windowMs<=now){
    await txn.put('window',{start:now,hits:1});return true;
   }
   if(x.hits>=limit)return false;
   await txn.put('window',{...x,hits:x.hits+1});return true;
  });
 }
}
