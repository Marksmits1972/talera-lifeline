/**
 * Isolated, authentic Cloudflare performance comparison.
 * The EXACT same Worker serves all modes and all photo bytes come from ONE
 * specifically created EU R2 test bucket. No TALERA service binding exists.
 *
 * Authentication here is a single test-only bearer token, not TALERA login.
 */
import {DurableObject} from 'cloudflare:workers';
const validAccount=/^demo-perf-[a-z0-9_-]{1,48}$/;
const validPhoto=/^photo-(?:0[1-9]|1[0-2])$/;
const keyOf=(id)=>'photoband/v1/'+id+'.png';
const resp=(val,status=200,headers={})=>Response.json(val,{status,headers:{
 'cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
const err=(code,status=400)=>resp({ok:false,error:code},status);
function acct(id){
 if(typeof id!=='string'||!validAccount.test(id))throw Error('BAD_SYNTHETIC_ACCOUNT');
 return id;
}
function photo(id){
 if(typeof id!=='string'||!validPhoto.test(id))throw Error('BAD_PHOTO');
 return id;
}
function modeOf(mode){
 if(mode!=='d1'&&mode!=='do'&&mode!=='r2')throw Error('BAD_MODE');
 return mode;
}
function getHome(env,id){
 const eu=env.BENCH_HOME.jurisdiction('eu');
 return eu.get(eu.idFromName('talera-photo-bench-v1:'+acct(id)));
}
export class PhotoStripBenchHome extends DurableObject{
 constructor(ctx,env){
  super(ctx,env);
  this.sql=ctx.storage.sql;
  this.sql.exec('CREATE TABLE IF NOT EXISTS photo_manifest ('+
   'photo_id TEXT PRIMARY KEY, object_key TEXT NOT NULL, display_order INTEGER NOT NULL)');
 }
 async seed(photos){
  for(const item of photos)this.sql.exec(
   'INSERT INTO photo_manifest(photo_id,object_key,display_order) VALUES (?,?,?) '+
   'ON CONFLICT(photo_id) DO UPDATE SET object_key=excluded.object_key,display_order=excluded.display_order',
   item.photo_id,item.object_key,item.display_order
  );
  return {count:photos.length};
 }
 async catalog(){
  return this.sql.exec(
   'SELECT photo_id,object_key,display_order FROM photo_manifest ORDER BY display_order'
  ).toArray();
 }
 async find(photoId){
  return this.sql.exec(
   'SELECT object_key FROM photo_manifest WHERE photo_id=?',
   photoId
  ).toArray()[0]||null;
 }
}
async function checkToken(req,env){
 const token=req.headers.get('authorization')||'';
 if(!token.startsWith('Bearer ')||token.length>200||typeof env.BENCH_TOKEN!=='string'||env.BENCH_TOKEN.length<40)return false;
 const a=new TextEncoder().encode(token.slice(7)),b=new TextEncoder().encode(env.BENCH_TOKEN);
 const [x,y]=await Promise.all([crypto.subtle.digest('SHA-256',a),crypto.subtle.digest('SHA-256',b)]);
 const u=new Uint8Array(x),v=new Uint8Array(y);let diff=0;
 for(let i=0;i<u.length;i++)diff|=u[i]^v[i];
 return diff===0;
}
async function catalog(env,mode,id){
 if(mode==='d1'){
  const rows=await env.BENCH_D1.prepare(
   'SELECT photo_id,object_key,display_order FROM photo_manifest '+
   'WHERE account_id=? ORDER BY display_order'
  ).bind(id).all();
  return rows.results||[];
 }
 return getHome(env,id).catalog();
}
async function findPhoto(env,mode,id,photoId){
 if(mode==='d1')return env.BENCH_D1.prepare(
  'SELECT object_key FROM photo_manifest WHERE account_id=? AND photo_id=?'
 ).bind(id,photoId).first();
 return getHome(env,id).find(photoId);
}
async function requestJson(req){
 const length=Number(req.headers.get('content-length')||0);
 if(length>3500)return null;
 const text=await req.text();if(text.length>3500)return null;
 try{return JSON.parse(text)}catch{return null;}
}
export default{
 async fetch(req,env){
  const url=new URL(req.url),path=url.pathname;
  if(path==='/health'&&req.method==='GET')return resp({ok:true,isolated:true,photoStrip:true,realTaleraConnected:false});
  if(!path.startsWith('/_bench/'))return err('NOT_FOUND',404);
  if(!await checkToken(req,env))return err('UNAUTHORIZED',401);
  try{
   if(path==='/_bench/fixture'&&req.method==='POST'){
    const photoId=photo(url.searchParams.get('photoId'));
    const length=Number(req.headers.get('content-length')||0);
    if(length<10000||length>240000)return err('PHOTO_SIZE_UNEXPECTED',413);
    const png=await req.arrayBuffer();
    if(png.byteLength!==length)return err('PHOTO_SIZE_MISMATCH');
    const magic=new Uint8Array(png.slice(0,8));
    if(magic.join(',')!=='137,80,78,71,13,10,26,10')return err('INVALID_PNG');
    await env.BENCH_PHOTOS.put(keyOf(photoId),png,{httpMetadata:{contentType:'image/png'}});
    return resp({ok:true,size:png.byteLength,photoId});
   }
   if(path==='/_bench/seed'&&req.method==='POST'){
    const data=await requestJson(req);
    if(!data)return err('BAD_JSON');
    const id=acct(data.accountId),mode=modeOf(data.mode);
    if(mode==='r2')return err('BAD_SEED_MODE');
    const photos=Array.from({length:12},(_,i)=>{
     const photo_id='photo-'+String(i+1).padStart(2,'0');
     return {photo_id,object_key:keyOf(photo_id),display_order:i};
    });
    for(const entry of photos)if(!await env.BENCH_PHOTOS.head(entry.object_key))
     return err('TEST_FIXTURE_NOT_READY',409);
    if(mode==='d1'){
     const statements=photos.map(p=>env.BENCH_D1.prepare(
      'INSERT INTO photo_manifest(account_id,photo_id,object_key,display_order) VALUES (?,?,?,?) '+
      'ON CONFLICT(account_id,photo_id) DO UPDATE SET object_key=excluded.object_key,'+
      'display_order=excluded.display_order'
     ).bind(id,p.photo_id,p.object_key,p.display_order));
     await env.BENCH_D1.batch(statements);
    }else await getHome(env,id).seed(photos);
    return resp({ok:true,mode,accountId:id,count:photos.length});
   }
   if(path==='/_bench/catalog'&&req.method==='GET'){
    const id=acct(url.searchParams.get('accountId'));
    const mode=modeOf(url.searchParams.get('mode'));
    if(mode==='r2')return err('MODE_NEEDS_SQL');
    const t0=performance.now();
    const photos=await catalog(env,mode,id);
    const dur=performance.now()-t0;
    if(photos.length!==12)return err('NOT_SEEDED',409);
    // No raw storage IDs or private media tokens exposed.
    return resp({ok:true,mode,photos:photos.map(x=>({id:x.photo_id,order:x.display_order}))},
     200,{'server-timing':'db;dur='+dur.toFixed(3),'x-bench-db-ms':dur.toFixed(3)});
   }
   if(path==='/_bench/photo'&&req.method==='GET'){
    const id=acct(url.searchParams.get('accountId'));
    const photoId=photo(url.searchParams.get('photoId'));
    const mode=modeOf(url.searchParams.get('mode'));
    const t0=performance.now();
    const record=mode==='r2'?{object_key:keyOf(photoId)}:await findPhoto(env,mode,id,photoId);
    const dbMs=performance.now()-t0;
    if(!record)return err('PHOTO_NOT_IN_ACCOUNT',404);
    const r2start=performance.now();
    const obj=await env.BENCH_PHOTOS.get(record.object_key);
    const r2ms=performance.now()-r2start;
    if(!obj)return err('PHOTO_NOT_IN_R2',404);
    return new Response(obj.body,{status:200,headers:{
     'content-type':'image/png',
     // Private fixture, not a production/public photo cache policy.
     'cache-control':'private,no-store',
     'content-length':String(obj.size),
     'x-bench-db-ms':dbMs.toFixed(3),
     'x-bench-r2-ms':r2ms.toFixed(3),
     'server-timing':'db;dur='+dbMs.toFixed(3)+',r2;dur='+r2ms.toFixed(3),
     'x-content-type-options':'nosniff'
    }});
   }
   return err('NOT_FOUND',404);
  }catch(e){
   if(/^BAD_(SYNTHETIC_ACCOUNT|PHOTO|MODE)$/.test(String(e?.message||'')))return err('BAD_SYNTHETIC_QUERY',400);
   console.warn('Benchmark backend unavailable',String(e?.message||'unknown').slice(0,120));
   return err('TEST_STORAGE_UNAVAILABLE',503);
  }
 }
};
