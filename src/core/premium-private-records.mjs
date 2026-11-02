/* TALERA Premium: immutable private Free-story/comment archives in existing EU R2 + D1.
 * Store source records as inert JSON: no social posting, no Free writes.
 * The existing Core auth, account allowlist, explicit consent and same-origin
 * rate limit must be checked before calling this module.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA=/^[0-9a-f]{64}$/i;
const KINDS=new Set(['story','comment_archive']);
export const PREMIUM_RECORD_LIMIT=1048576;
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
export function validatePrivateRecord({accountId,id,kind,payload,bytes,sha256}={}){
 if(!UUID.test(accountId||'')||!UUID.test(id||'')||!KINDS.has(kind))return 'invalid_identity';
 if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<1||bytes.byteLength>PREMIUM_RECORD_LIMIT)return 'invalid_size';
 if(!SHA.test(sha256||''))return 'invalid_digest';
 if(payload?.schema!=='talera-premium-record/1'||payload.kind!==kind||
   typeof payload.sourceKey!=='string'||payload.sourceKey.length<1||payload.sourceKey.length>1024||
   !payload.record||typeof payload.record!=='object'||Array.isArray(payload.record))return 'invalid_record';
 if(kind==='story'&&
   (typeof payload.record.id!=='string'||!payload.record.id||
   payload.record.id.length>192||!Array.isArray(payload.record.items)))return 'invalid_story';
 if(kind==='comment_archive'&&
   (typeof payload.record.localId!=='string'||!payload.record.localId||
   payload.record.localId.length>192||typeof payload.record.comment?.id!=='string'||
   typeof payload.record.comment?.body!=='string'))return 'invalid_comment';
 return null;
}
export async function privateRecordRoute({request,env,accountId,writeAllowed=false}){
 const url=new URL(request.url),path=url.pathname,method=request.method;
 if(path==='/api/premium/cloud/records'&&method==='GET'){
  const after=url.searchParams.get('after')||'';
  if(after&&!UUID.test(after))return reply({ok:false,reason:'invalid_cursor'},400);
  const rows=await env.DB.prepare('SELECT record_id,kind,sha256,byte_size,created_at FROM talera_premium_records WHERE account_id=? AND record_id>? ORDER BY record_id ASC LIMIT 501').bind(accountId,after).all();
  const batch=rows.results||[],items=batch.slice(0,500);
  return reply({ok:true,items,next:batch.length>500?items[items.length-1].record_id:null});
 }
 const m=path.match(/^\/api\/premium\/cloud\/records\/(story|comment_archive)\/([0-9a-f-]{36})$/i);
 if(!m)return reply({ok:false,reason:'not_found'},404);
 const kind=m[1].toLowerCase(),id=m[2].toLowerCase();
 if(!UUID.test(id))return reply({ok:false,reason:'invalid_identity'},400);
 const row=await env.DB.prepare('SELECT object_key,sha256,kind FROM talera_premium_records WHERE account_id=? AND record_id=?').bind(accountId,id).first();
 if(method==='GET'){
  if(!row||row.kind!==kind)return reply({ok:false,reason:'not_found'},404);
  const obj=await env.PREMIUM_PRIVATE.get(row.object_key);
  if(!obj)return reply({ok:false,reason:'storage_missing'},503);
  return new Response(obj.body,{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
 }
 if(method!=='PUT')return reply({ok:false,reason:'method_not_allowed'},405);
 if(!writeAllowed)return reply({ok:false,reason:'invalid_origin'},403);
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return reply({ok:false,reason:'invalid_type'},415);
 const declared=request.headers.get('content-length');
 if(declared!==null&&(!Number.isSafeInteger(Number(declared))||Number(declared)<1||Number(declared)>PREMIUM_RECORD_LIMIT))return reply({ok:false,reason:'invalid_size'},413);
 if(!request.body)return reply({ok:false,reason:'invalid_size'},400);
 const reader=request.body.getReader(),parts=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>PREMIUM_RECORD_LIMIT){await reader.cancel();return reply({ok:false,reason:'invalid_size'},413)}parts.push(value)}}finally{reader.releaseLock()}
 if(!total||declared!==null&&Number(declared)!==total)return reply({ok:false,reason:'length_mismatch'},400);
 const bytes=new Uint8Array(total);let offset=0;
 for(const chunk of parts){bytes.set(chunk,offset);offset+=chunk.byteLength}
 let payload;
 try{payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{return reply({ok:false,reason:'invalid_json'},400)}
 const given=request.headers.get('x-content-sha256')||'';
 const issue=validatePrivateRecord({accountId,id,kind,payload,bytes:bytes.buffer,sha256:given});
 if(issue)return reply({ok:false,reason:issue},400);
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(digest!==given.toLowerCase())return reply({ok:false,reason:'digest_mismatch'},400);
 if(row)return reply({ok:row.sha256===digest&&row.kind===kind,reason:row.sha256===digest&&row.kind===kind?'already_stored':'id_conflict'},row.sha256===digest&&row.kind===kind?200:409);
 const key='premium/'+accountId+'/records/'+kind+'/'+id+'.json';
 const stored=await env.PREMIUM_PRIVATE.put(key,bytes.buffer,{onlyIf:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'},customMetadata:{sha256:digest}});
 if(!stored)return reply({ok:false,reason:'concurrent_upload_retry'},409);
 await env.DB.prepare('INSERT INTO talera_premium_records(account_id,record_id,kind,object_key,sha256,byte_size,created_at) VALUES(?,?,?,?,?,?,?)')
  .bind(accountId,id,kind,key,digest,total,Date.now()).run();
 return reply({ok:true,reason:'stored'});
}
