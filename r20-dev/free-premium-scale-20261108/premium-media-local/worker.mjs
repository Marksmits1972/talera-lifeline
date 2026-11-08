/* TALERA Premium realistic-media test Worker. LOCAL-ONLY.
 * Isolated synthetic accounts + SQLite Durable Objects + locally emulated R2.
 * Uses binary PNG, WAV and MP4 test fixtures. NO current TALERA production code.
 * DO NOT DEPLOY as a real authentication or paid Premium implementation.
 */
import {DurableObject} from 'cloudflare:workers';

const enc=new TextEncoder();
const ACCOUNT=/^demo-[a-z0-9-]{1,35}$/;
const STORY=/^story-[a-z0-9-]{1,35}$/;
const MEDIA=/^(photo-[0-5]|audio-0|video-0)$/;
const TYPES={'image/png':5_000_000,'audio/wav':5_000_000,'video/mp4':12_000_000};
const toHex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const json=(v,status=200)=>Response.json(v,{status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
const error=(message,status=400)=>json({ok:false,error:message},status);
function check(regex,value){if(typeof value!=='string'||!regex.test(value))throw Error('BAD_TEST_IDENTIFIER');return value;}
function key(acc,story,media){return 'demo-binary/v1/'+check(ACCOUNT,acc)+'/'+check(STORY,story)+'/'+check(MEDIA,media)}
function dobj(env,id){return env.ACCOUNT_HOME.get(env.ACCOUNT_HOME.idFromName('talera-premium-binary-account-v1:'+check(ACCOUNT,id)))}
function parsePath(uri){const p=uri.pathname.split('/').filter(Boolean);return p.length>=2&&p[0]==='_test'?p:null}

export class BinaryTestAccountHome extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);
  this.sql=ctx.storage.sql;
  this.sql.exec('CREATE TABLE IF NOT EXISTS stories (id TEXT PRIMARY KEY, manifest TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)');
 }
 async putStory(story,manifest){
  check(STORY,story);
  this.sql.exec('INSERT INTO stories(id,manifest) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET manifest=excluded.manifest,updated_at=CURRENT_TIMESTAMP',story,JSON.stringify(manifest));
  return true;
 }
 async getStory(story){
  check(STORY,story);
  const x=this.sql.exec('SELECT manifest FROM stories WHERE id=?',story).toArray()[0];
  return x?JSON.parse(x.manifest):null;
 }
 async stats(){
  return this.sql.exec('SELECT COUNT(*) AS count FROM stories').toArray()[0]?.count??0;
 }
}
async function signedAccount(request,env){
 const auth=request.headers.get('authorization')||'';
 const match=/^Bearer (demo-[a-z0-9-]{1,35})\.([a-f0-9]{64})$/.exec(auth);
 if(!match||typeof env.TEST_TOKEN_SECRET!=='string'||env.TEST_TOKEN_SECRET.length<40)return null;
 const key=await crypto.subtle.importKey('raw',enc.encode(env.TEST_TOKEN_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const sig=Uint8Array.from(match[2].match(/../g),x=>parseInt(x,16));
 const valid=await crypto.subtle.verify('HMAC',key,sig,enc.encode(match[1]));
 return valid?match[1]:null;
}
async function readBody(req,max){
 const length=req.headers.get('content-length');
 if(length!==null&&Number(length)>max)return null;
 const buf=await req.arrayBuffer();
 if(buf.byteLength<1||buf.byteLength>max)return null;
 return buf;
}
async function saveMedia(req,env,account,story,id){
 const type=(req.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
 const max=TYPES[type], hash=(req.headers.get('x-content-sha256')||'').toLowerCase();
 if(!max||!MEDIA.test(id)||!/^[a-f0-9]{64}$/.test(hash))return error('INVALID_MEDIA_METADATA',400);
 if((id.startsWith('photo-')&&type!=='image/png')||(id==='audio-0'&&type!=='audio/wav')||(id==='video-0'&&type!=='video/mp4'))return error('MISMATCHED_MEDIA_TYPE',400);
 const raw=await readBody(req,max);
 if(!raw)return error('MEDIA_TOO_LARGE_OR_EMPTY',413);
 const sig=new Uint8Array(raw);
 if(type==='image/png'&&(sig[0]!==137||sig[1]!==80||sig[2]!==78||sig[3]!==71))return error('INVALID_PNG_SIGNATURE',400);
 if(type==='audio/wav'&&String.fromCharCode(...sig.slice(0,4))!=='RIFF')return error('INVALID_WAV_SIGNATURE',400);
 if(type==='video/mp4'&&String.fromCharCode(...sig.slice(4,8))!=='ftyp')return error('INVALID_MP4_SIGNATURE',400);
 const digest=toHex(await crypto.subtle.digest('SHA-256',raw));
 if(digest!==hash)return error('CHECKSUM_MISMATCH',422);
 await env.MEDIA.put(key(account,story,id),raw,{httpMetadata:{contentType:type},customMetadata:{sha256:hash}});
 return json({ok:true,id,size:raw.byteLength,sha256:hash});
}
async function saveStory(req,env,account){
 const raw=await readBody(req,12000);
 if(!raw)return error('INVALID_STORY_BODY');
 let body;try{body=JSON.parse(new TextDecoder().decode(raw))}catch{return error('INVALID_JSON')}
 if(!STORY.test(body.storyId)||!Array.isArray(body.media)||body.media.length!==8)return error('INVALID_STORY_MANIFEST');
 const ids=body.media.map(x=>x?.id);
 if(new Set(ids).size!==8||!['photo-0','photo-1','photo-2','photo-3','photo-4','photo-5','audio-0','video-0'].every(x=>ids.includes(x)))return error('INVALID_MEDIA_SET');
 if(!Array.isArray(body.cues)||body.cues.length>64)return error('INVALID_MEDIA_CUES');
 for(const cue of body.cues){if(typeof cue?.atMs!=='number'||cue.atMs<0||!ids.includes(cue.mediaId))return error('INVALID_MEDIA_CUES')}
 const media=[];
 for(const item of body.media){
  if(!MEDIA.test(item.id)||!Object.keys(TYPES).includes(item.type)||!/^[a-f0-9]{64}$/.test(item.sha256))return error('INVALID_MEDIA_DESCRIPTOR');
  const obj=await env.MEDIA.head(key(account,body.storyId,item.id));
  if(!obj||obj.customMetadata?.sha256!==item.sha256||obj.size!==item.size)return error('MEDIA_NOT_STORED_OR_CHECKSUM_INVALID',409);
  media.push({id:item.id,type:item.type,size:item.size,sha256:item.sha256});
 }
 const manifest={storyId:body.storyId,text:String(body.text||'').slice(0,1000),media,cues:body.cues,version:1};
 await dobj(env,account).putStory(body.storyId,manifest);
 return json({ok:true,storyId:body.storyId,committed:true,mediaCount:media.length});
}
export default {
 async fetch(req,env){
  const u=new URL(req.url),p=parsePath(u);
  if(req.method==='GET'&&u.pathname==='/health')return json({ok:true,localFixture:true,connectedToProduction:false});
  if(!p)return error('NOT_FOUND',404);
  const account=await signedAccount(req,env);
  if(!account)return error('UNAUTHORIZED',401);
  if(!env.ACCOUNT_HOME?.get||!env.MEDIA?.put)return error('MISSING_TEST_BINDINGS',503);
  try{
   if(p[1]==='media'&&p.length===4){
    const story=check(STORY,p[2]),media=check(MEDIA,p[3]);
    if(req.method==='PUT')return saveMedia(req,env,account,story,media);
    if(req.method==='GET'){
     const manifest=await dobj(env,account).getStory(story);
     if(!manifest?.media.some(m=>m.id===media))return error('MEDIA_NOT_COMMITTED_OR_NOT_OWNED',404);
     const obj=await env.MEDIA.get(key(account,story,media));
     if(!obj)return error('MEDIA_NOT_FOUND',404);
     return new Response(obj.body,{headers:{'content-type':obj.httpMetadata?.contentType||'application/octet-stream',
       'cache-control':'private, no-store','x-test-sha256':obj.customMetadata?.sha256||'',
       'x-content-type-options':'nosniff'}});
    }
   }
   if(p[1]==='story'&&p.length===2&&req.method==='POST')return saveStory(req,env,account);
   if(p[1]==='story'&&p.length===3&&req.method==='GET'){
    const item=await dobj(env,account).getStory(check(STORY,p[2]));
    return item?json({ok:true,story:item}):error('STORY_NOT_FOUND',404);
   }
   if(p[1]==='stats'&&p.length===2&&req.method==='GET')
    return json({ok:true,stories:await dobj(env,account).stats()});
   return error('NOT_FOUND',404);
  }catch(e){
   console.warn('Synthetic media test failure',String(e?.message||'error').slice(0,100));
   if(e?.message==='BAD_TEST_IDENTIFIER')return error('INVALID_TEST_IDENTIFIER',400);
   return error('TEST_STORAGE_UNAVAILABLE',503);
  }
 }
};
