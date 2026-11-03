/* BB63 current-version API. Existing session/entitlement/consent is checked
 * by premiumCloudRoute BEFORE invoking this adapter. D1 existing database,
 * no account ID accepted from client payload. This code is review-only.
 */
import {publishCurrentPremiumVersion,validateCurrentVersion} from './premium-current-version.mjs';
const KINDS=new Set(['media','story','comment_archive']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'content-type':'application/json','cache-control':'private, no-store'}
});
async function limitedJson(request){
 if(!request.body)return null;
 const reader=request.body.getReader();const chunks=[];let count=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;
   count+=value.byteLength;if(count>4096){await reader.cancel();return null}
   chunks.push(value);
  }
 }finally{reader.releaseLock()}
 try{
  const bytes=new Uint8Array(count);let pos=0;
  for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.byteLength}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 }catch{return null}
}
export async function premiumCurrentRoute({request,env,accountId,writeAllowed=false}={}){
 if(!UUID.test(accountId||'')||!env?.DB?.prepare)return json({ok:false,reason:'invalid_session'},403);
 const url=new URL(request.url);
 if(url.pathname!=='/api/premium/cloud/current')return json({ok:false,reason:'not_found'},404);
 if(request.method==='GET'){
  const kind=url.searchParams.get('kind')||'',after=url.searchParams.get('after')||'';
  if(!KINDS.has(kind)||after.length>1024||/[\u0000-\u001f\u007f]/.test(after))
   return json({ok:false,reason:'invalid_cursor'},400);
  const rows=await env.DB.prepare(
   'SELECT kind,source_key,current_id,revision FROM talera_premium_current WHERE account_id=? AND kind=? AND source_key>? ORDER BY source_key ASC LIMIT 501'
  ).bind(accountId,kind,after).all();
  const batch=rows.results||[],items=batch.slice(0,500);
  return json({ok:true,items,next:batch.length>500?items.at(-1).source_key:null});
 }
 if(request.method!=='POST')return json({ok:false,reason:'method_not_allowed'},405);
 if(!writeAllowed)return json({ok:false,reason:'invalid_origin'},403);
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
  return json({ok:false,reason:'invalid_type'},415);
 const body=await limitedJson(request);
 const input={accountId,kind:body?.kind,sourceKey:body?.sourceKey,
   snapshotId:body?.snapshotId,expectedCurrentId:body?.expectedCurrentId??null};
 if(!validateCurrentVersion(input))return json({ok:false,reason:'invalid_current_version'},400);
 let row;
 if(input.kind==='media'){
  row=await env.DB.prepare(
   'SELECT media_id,source_key FROM talera_premium_media WHERE account_id=? AND media_id=?'
  ).bind(accountId,input.snapshotId).first();
  if(!row||row.source_key!==input.sourceKey)
   return json({ok:false,reason:'unregistered_source'},409);
 }else{
  row=await env.DB.prepare(
   'SELECT record_id,kind,object_key,sha256 FROM talera_premium_records WHERE account_id=? AND record_id=?'
  ).bind(accountId,input.snapshotId).first();
  if(!row||row.kind!==input.kind||!env.PREMIUM_PRIVATE?.get)
   return json({ok:false,reason:'unregistered_source'},409);
  // Older story manifests do not store source_key. Confirm it against the
  // already-authenticated, private immutable JSON snapshot before linking.
  const object=await env.PREMIUM_PRIVATE.get(row.object_key);
  if(!object||object.size>1048576)return json({ok:false,reason:'unregistered_source'},409);
  let payload;
  try{payload=JSON.parse(await object.text())}catch{return json({ok:false,reason:'invalid_stored_record'},409)}
  if(payload.schema!=='talera-premium-record/1'||payload.kind!==input.kind||
      payload.sourceKey!==input.sourceKey)
   return json({ok:false,reason:'source_mismatch'},409);
 }
 const result=await publishCurrentPremiumVersion({db:env.DB,...input});
 return json(result,result.ok?200:409);
}
