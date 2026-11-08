/*
 * Synthetic account-local database proof on Cloudflare Durable Objects.
 * No existing TALERA D1, login, Premium, production media or PWA binding.
 * Only protected DEMO_TOKEN and demo-* fake account names can use it.
 * The test token is DEMO-wide, not production per-account authentication!
 */
import {DurableObject} from 'cloudflare:workers';
import {objectStub,mediaKey,accountId,storyId,mediaId} from './identity.mjs';

export class SyntheticAccountHome extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);
  this.sql=ctx.storage.sql;
  // Every named Durable Object owns a separate strongly consistent SQLite DB.
  this.sql.exec('CREATE TABLE IF NOT EXISTS synthetic_stories ('+
    'story_id TEXT PRIMARY KEY, story_text TEXT NOT NULL,'+
    'media_key TEXT,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');
 }
 async putStory(id,text,key){
  storyId(id);
  if(typeof text!=='string'||text.length<1||text.length>1000)throw new Error('INVALID_STORY_TEXT');
  if(key!==null&&(typeof key!=='string'||key.length>260))throw new Error('INVALID_MEDIA_KEY');
  this.sql.exec(
   'INSERT INTO synthetic_stories(story_id,story_text,media_key) VALUES (?,?,?)'+
   ' ON CONFLICT(story_id) DO UPDATE SET story_text=excluded.story_text,'+
   ' media_key=excluded.media_key, updated_at=CURRENT_TIMESTAMP',
   id,text,key
  );
  return {ok:true,storyId:id};
 }
 async getStory(id){
  storyId(id);
  return this.sql.exec(
   'SELECT story_id,story_text,media_key FROM synthetic_stories WHERE story_id=?',
   id
  ).toArray()[0]??null;
 }
 async stats(){
  const row=this.sql.exec('SELECT COUNT(*) AS stories FROM synthetic_stories').toArray()[0];
  return {stories:row?.stories||0,bytes:this.ctx.storage.sql.databaseSize};
 }
}
const json=(value,status=200)=>Response.json(value,{
 status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}
});
const fail=(reason,status=400)=>json({ok:false,error:reason},status);
async function authorize(request,env){
 const secret=env.DEMO_TOKEN;
 const auth=request.headers.get('authorization')||'';
 if(typeof secret!=='string'||secret.length<40||!auth.startsWith('Bearer ')||auth.length>200)return false;
 const supplied=auth.slice(7);
 const [a,b]=await Promise.all([
  crypto.subtle.digest('SHA-256',new TextEncoder().encode(supplied)),
  crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret))
 ]);
 const x=new Uint8Array(a),y=new Uint8Array(b);
 let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];
 return diff===0;
}
async function body(request){
 const size=Number(request.headers.get('content-length')||0);
 if(size>4096)return null;
 const raw=await request.text();
 if(raw.length>4096)return null;
 try{return JSON.parse(raw)}catch{return null}
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname==='/health')
   return json({ok:true,mode:'isolated-eu-one-durable-object-per-synthetic-account',connectedToTalera:false});
  if(!url.pathname.startsWith('/_demo/'))return fail('NOT_FOUND',404);
  if(!await authorize(request,env))return fail('UNAUTHORIZED',401);
  if(!env.ACCOUNT_HOME?.jurisdiction||!env.MEDIA?.put)return fail('MISSING_ISOLATED_BINDING',503);
  try{
   if(url.pathname==='/_demo/media'&&request.method==='POST'){
    const data=await body(request);
    if(!data)return fail('INVALID_BODY');
    const key=mediaKey(data.accountId,data.storyId,data.mediaId);
    if(typeof data.text!=='string'||data.text.length<1||data.text.length>200)
     return fail('INVALID_SYNTHETIC_MEDIA');
    await env.MEDIA.put(key,new TextEncoder().encode(data.text),{
     httpMetadata:{contentType:'text/plain;charset=utf-8'}
    });
    return json({ok:true,stored:true,mediaId:data.mediaId,mediaBytes:new TextEncoder().encode(data.text).length});
   }
   if(url.pathname==='/_demo/story'&&request.method==='POST'){
    const data=await body(request);
    if(!data)return fail('INVALID_BODY');
    const aid=accountId(data.accountId),sid=storyId(data.storyId);
    if(typeof data.text!=='string'||data.text.length<1||data.text.length>1000)
     return fail('INVALID_STORY_TEXT');
    let mediaRef=null;
    if(data.mediaId!==undefined&&data.mediaId!==null){
     mediaRef=mediaKey(aid,sid,mediaId(data.mediaId));
     const obj=await env.MEDIA.head(mediaRef);
     if(!obj)return fail('MEDIA_MUST_EXIST_BEFORE_STORY_COMMIT',409);
    }
    const result=await objectStub(env,aid).putStory(sid,data.text,mediaRef);
    return json({...result,accountId:aid,storage:'one-own-sqlite-object'});
   }
   if(url.pathname==='/_demo/story'&&request.method==='GET'){
    const aid=accountId(url.searchParams.get('accountId'));
    const sid=storyId(url.searchParams.get('storyId'));
    const item=await objectStub(env,aid).getStory(sid);
    if(!item)return fail('NOT_FOUND',404);
    return json({ok:true,accountId:aid,storyId:item.story_id,text:item.story_text,
      hasMedia:!!item.media_key,mediaId:item.media_key?.split('/').at(-1).replace(/\.txt$/,'')||null});
   }
   if(url.pathname==='/_demo/media'&&request.method==='GET'){
    const key=mediaKey(
     accountId(url.searchParams.get('accountId')),
     storyId(url.searchParams.get('storyId')),
     mediaId(url.searchParams.get('mediaId'))
    );
    const obj=await env.MEDIA.get(key);
    if(!obj)return fail('MEDIA_NOT_FOUND',404);
    const content=await obj.text();
    return json({ok:true,text:content,mediaBytes:obj.size});
   }
   if(url.pathname==='/_demo/stats'&&request.method==='GET'){
    const result=await objectStub(env,accountId(url.searchParams.get('accountId'))).stats();
    return json({ok:true,stories:result.stories,sqlBytes:result.bytes});
   }
   return fail('NOT_FOUND',404);
  }catch(error){
   if(/^INVALID_(ACCOUNT|STORY|MEDIA)$/.test(error?.message||''))return fail('INVALID_SYNTHETIC_ID',400);
   console.warn('DO staging synthetic request failed',String(error?.message||'unknown').slice(0,110));
   return fail('SYNTHETIC_STORAGE_UNAVAILABLE',503);
  }
 }
};
