/*
 TALERA staging data router -- REAL D1 demo, completely isolated from TALERA.
 Only synthetic "demo-" identities. No real login, memory, R2 or media access.
 NEVER attach this Worker to the working PWA without full integration review.
 */
const demoAccount=/^demo-[a-z0-9_-]{1,64}$/;
const demoStory=/^story-[a-z0-9_-]{1,48}$/;
const shardIdRe=/^[A-Z][A-Z0-9]{0,7}$/;
const json=(payload,status=200)=>Response.json(payload,{status,headers:{
 'cache-control':'no-store','x-content-type-options':'nosniff'}});
const fail=(code,status)=>json({ok:false,error:code},status);
function hash32(value) {
 let h=0x811c9dc5;
 for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,0x01000193);}
 return h>>>0;
}
const primary=db=>db.withSession('first-primary');
async function authorized(req,env){
 if(!env.DEMO_TOKEN||typeof env.DEMO_TOKEN!=='string')return false;
 const value=req.headers.get('authorization')||'';
 if(!value.startsWith('Bearer ')||value.length>150)return false;
 const a=new TextEncoder().encode(value.slice(7));
 const b=new TextEncoder().encode(env.DEMO_TOKEN);
 const [ha,hb]=await Promise.all([crypto.subtle.digest('SHA-256',a),crypto.subtle.digest('SHA-256',b)]);
 const x=new Uint8Array(ha),y=new Uint8Array(hb);
 let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];
 return diff===0;
}
function shardBinding(env,id){
 if(!shardIdRe.test(id))throw new Error('invalid-shard-id');
 const db=env['DATA_SHARD_'+id];
 if(!db?.prepare||!db?.withSession)throw new Error('shard-unavailable');
 return db;
}
async function getShard(accountId,env,provision=false){
 const directory=primary(env.DIRECTORY_DB);
 let record=await directory.prepare(
  'SELECT shard_id FROM account_shard WHERE account_id=?'
 ).bind(accountId).first();
 if(record){
  shardBinding(env,record.shard_id);
  return {id:record.shard_id,created:false};
 }
 if(!provision)return null;
 const found=await directory.prepare(
  "SELECT shard_id FROM shards WHERE state='active' ORDER BY shard_id"
 ).all();
 const active=(found.results||[]).map(x=>x.shard_id);
 if(!active.length)throw new Error('no-active-shards');
 // Check all active bindings BEFORE creating a persistent account assignment.
 for(const id of active)shardBinding(env,id);
 const candidate=active[hash32(accountId)%active.length];
 // Directory INSERT OR IGNORE makes concurrent first provisioning idempotent.
 const result=await env.DIRECTORY_DB.prepare(
  'INSERT OR IGNORE INTO account_shard (account_id,shard_id) VALUES (?,?)'
 ).bind(accountId,candidate).run();
 record=await primary(env.DIRECTORY_DB).prepare(
  'SELECT shard_id FROM account_shard WHERE account_id=?'
 ).bind(accountId).first();
 if(!record)throw new Error('assignment-not-persisted');
 shardBinding(env,record.shard_id);
 return {id:record.shard_id,created:!!result.meta?.changes};
}
async function readPayload(req){
 const bodyLength=Number(req.headers.get('content-length')||0);
 if(bodyLength>4096)throw new Error('body-too-large');
 const raw=await req.text();
 if(raw.length>4096)throw new Error('body-too-large');
 return JSON.parse(raw);
}
export async function handle(req,env){
 const url=new URL(req.url);
 if(req.method==='GET'&&url.pathname==='/health'){
  // Deliberately no database query: public health cannot load the D1 primary.
  return json({ok:true,mode:'isolated-synthetic-d1-router',appIntegration:false});
 }
 if(!url.pathname.startsWith('/_demo/'))return fail('NOT_FOUND',404);
 if(!await authorized(req,env))return fail('UNAUTHORIZED',401);
 if(!env.DIRECTORY_DB?.withSession||!env.DIRECTORY_DB?.prepare)return fail('CONFIGURATION_ERROR',503);
 try{
  if(url.pathname==='/_demo/provision'&&req.method==='POST'){
   const body=await readPayload(req);
   if(!demoAccount.test(body.accountId||''))return fail('SYNTHETIC_ACCOUNT_REQUIRED',400);
   const shard=await getShard(body.accountId,env,true);
   return json({ok:true,shard:shard.id,newAssignment:shard.created});
  }
  if(url.pathname==='/_demo/story'&&req.method==='POST'){
   const body=await readPayload(req);
   if(!demoAccount.test(body.accountId||'')||!demoStory.test(body.storyId||'')||
      typeof body.text!=='string'||body.text.length<1||body.text.length>1000)
    return fail('INVALID_SYNTHETIC_STORY',400);
   const shard=await getShard(body.accountId,env,false);
   if(!shard)return fail('ACCOUNT_NOT_PROVISIONED',404);
   const db=shardBinding(env,shard.id);
   await db.prepare(
    'INSERT INTO demo_stories (account_id,story_id,body_text) VALUES (?,?,?) ON CONFLICT(account_id,story_id) DO UPDATE SET body_text=excluded.body_text,updated_at=CURRENT_TIMESTAMP'
   ).bind(body.accountId,body.storyId,body.text).run();
   return json({ok:true,storedIn:shard.id,accountId:body.accountId,storyId:body.storyId});
  }
  if(url.pathname==='/_demo/story'&&req.method==='GET'){
   const accountId=url.searchParams.get('accountId')||'';
   const storyId=url.searchParams.get('storyId')||'';
   if(!demoAccount.test(accountId)||!demoStory.test(storyId))return fail('INVALID_SYNTHETIC_STORY',400);
   const shard=await getShard(accountId,env,false);
   if(!shard)return fail('ACCOUNT_NOT_PROVISIONED',404);
   const item=await primary(shardBinding(env,shard.id)).prepare(
     'SELECT story_id,body_text FROM demo_stories WHERE account_id=? AND story_id=?'
   ).bind(accountId,storyId).first();
   if(!item)return fail('STORY_NOT_FOUND',404);
   return json({ok:true,shard:shard.id,storyId:item.story_id,text:item.body_text});
  }
  if(url.pathname==='/_demo/status'&&req.method==='GET'){
   const groups=await primary(env.DIRECTORY_DB).prepare(
    'SELECT shard_id,state FROM shards ORDER BY shard_id'
   ).all();
   const counts=await primary(env.DIRECTORY_DB).prepare(
    'SELECT shard_id,COUNT(*) AS accounts FROM account_shard GROUP BY shard_id ORDER BY shard_id'
   ).all();
   return json({ok:true,groups:groups.results,assignments:counts.results});
  }
  return fail('NOT_FOUND',404);
 }catch(err){
  // No SQL, token or account data is reflected in error responses.
  console.warn('TALERA isolated demo storage route failed',String(err?.message||'unknown').slice(0,90));
  return fail('STAGING_STORAGE_UNAVAILABLE',503);
 }
}
export default {fetch:handle};
