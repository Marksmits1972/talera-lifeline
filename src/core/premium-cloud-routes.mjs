/* TALERA Premium private-media route adapter — to be mounted in existing Core.
 * No account ID from client input. Caller provides verified session + effective rights.
 * Pilot-only, not active until explicitly wired into the existing Worker.
 */
import {cloudAccess,canAcceptCloudConsent,cloudConsentDetails} from './premium-cloud-auth.mjs';
import {storePremiumObject} from './premium-private-upload.mjs';
import {privateRecordRoute} from './premium-private-records.mjs';
import {premiumMultipartRoute} from './premium-multipart-media.mjs';
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const denied=(reason)=>reply({ok:false,reason},reason==='login_required'?401:403);
export async function premiumCloudRoute({request,env,sessionAccount,entitlement,pilotEnabled=false,writeAllowed=false}) {
  const url=new URL(request.url),path=url.pathname,method=request.method;
  if (!path.startsWith('/api/premium/cloud/')) return null;
  const accountId=sessionAccount?.id;
  if (!accountId) return denied('login_required');
  const consentRow=await env.DB.prepare('SELECT enabled,granted_at FROM talera_premium_cloud_consent WHERE account_id=?').bind(accountId).first();
  if (path==='/api/premium/cloud/consent' && method==='GET') {
    return reply({ok:true,consent:cloudConsentDetails(consentRow)});
  }
  if (path==='/api/premium/cloud/consent' && method==='POST') {
    if (!writeAllowed) return denied('invalid_origin');
    if (!canAcceptCloudConsent({sessionAccount,entitlement,pilotEnabled})) return denied('premium_required_or_pilot_disabled');
    const body=await request.json().catch(()=>null);
    if (body?.agree!==true) return reply({ok:false,reason:'explicit_consent_required'},400);
    const now=Date.now();
    await env.DB.prepare('INSERT INTO talera_premium_cloud_consent(account_id,enabled,granted_at,updated_at) VALUES(?,1,?,?) ON CONFLICT(account_id) DO UPDATE SET enabled=1,granted_at=COALESCE(talera_premium_cloud_consent.granted_at,excluded.granted_at),updated_at=excluded.updated_at').bind(accountId,now,now).run();
    return reply({ok:true,consent:{enabled:true}});
  }
  const access=cloudAccess({sessionAccount,entitlement,consentRow,pilotEnabled});
  if (!access.allowed) return denied(access.reason);
  if (path.startsWith('/api/premium/cloud/multipart/')) return premiumMultipartRoute({request,env,accountId,writeAllowed});
  if (path.startsWith('/api/premium/cloud/records')) return privateRecordRoute({request,env,accountId,writeAllowed});
  if (path==='/api/premium/cloud/media' && method==='GET') {
    const after=url.searchParams.get('after')||'';
    if(after&&!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(after))return reply({ok:false,reason:'invalid_cursor'},400);
    const rows=await env.DB.prepare('SELECT media_id,content_type,byte_size,sha256,digest_kind,created_at FROM talera_premium_media WHERE account_id=? AND media_id>? ORDER BY media_id ASC LIMIT 501').bind(accountId,after).all();
    const batch=rows.results||[],items=batch.slice(0,500);
    return reply({ok:true,items,next:batch.length>500?items[items.length-1].media_id:null});
  }
  const match=path.match(/^\/api\/premium\/cloud\/media\/([0-9a-f-]{36})$/i);
  if (match && method==='GET') {
    const row=await env.DB.prepare('SELECT object_key,content_type,byte_size FROM talera_premium_media WHERE account_id=? AND media_id=?').bind(accountId,match[1]).first();
    if (!row) return reply({ok:false,reason:'not_found'},404);
    const requested=request.headers.get('range');
    let range=null;
    if(requested!==null){
      const matchRange=/^bytes=(\d+)-(\d+)$/.exec(requested);
      if(!matchRange)return reply({ok:false,reason:'invalid_range'},416);
      const start=Number(matchRange[1]),end=Number(matchRange[2]);
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end<start||
        end>=row.byte_size||end-start+1>8*1024*1024)return reply({ok:false,reason:'invalid_range'},416);
      range={offset:start,length:end-start+1};
    }
    const object=await env.PREMIUM_PRIVATE.get(row.object_key,range?{range}:undefined);
    if (!object?.body) return reply({ok:false,reason:'not_found'},404);
    const headers={'content-type':row.content_type,'cache-control':'private, no-store','x-content-type-options':'nosniff'};
    if(range){headers['content-range']='bytes '+range.offset+'-'+(range.offset+range.length-1)+'/'+row.byte_size;headers['accept-ranges']='bytes'}
    return new Response(object.body,{status:range?206:200,headers});
  }
  if (match && method==='PUT') {
    if (!writeAllowed) return denied('invalid_origin');
    const type=(request.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    const rawLength=request.headers.get('content-length');
    const declaredLength=rawLength===null?null:Number(rawLength);
    if (declaredLength!==null&&(!Number.isSafeInteger(declaredLength)||declaredLength<1||declaredLength>25*1024*1024)) return reply({ok:false,reason:'invalid_size'},413);
    // Read with a hard cap even when Transfer-Encoding omits Content-Length.
    if (!request.body) return reply({ok:false,reason:'invalid_size'},400);
    const reader=request.body.getReader();const chunks=[];let total=0;
    try {while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>25*1024*1024){await reader.cancel();return reply({ok:false,reason:'invalid_size'},413)}chunks.push(value)}} finally {reader.releaseLock()}
    if(total===0|| (declaredLength!==null&&total!==declaredLength)) return reply({ok:false,reason:'length_mismatch'},400);
    const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
    const result=await storePremiumObject({bucket:env.PREMIUM_PRIVATE,db:env.DB,accountId,mediaId:match[1],contentType:type,bytes:bytes.buffer,sha256:request.headers.get('x-content-sha256'),entitlement,consent:true});
    return reply(result,result.ok?200:400);
  }
  return reply({ok:false,reason:'not_found'},404);
}
