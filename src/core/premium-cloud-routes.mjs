/* TALERA Premium private-media route adapter — to be mounted in existing Core.
 * No account ID from client input. Caller provides verified session + effective rights.
 * Pilot-only, not active until explicitly wired into the existing Worker.
 */
import {cloudAccess,canAcceptCloudConsent,cloudConsentDetails} from './premium-cloud-auth.mjs';
import {storePremiumObject} from './premium-private-upload.mjs';
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
  if (path==='/api/premium/cloud/media' && method==='GET') {
    const rows=await env.DB.prepare('SELECT media_id,content_type,byte_size,created_at FROM talera_premium_media WHERE account_id=? ORDER BY created_at DESC LIMIT 200').bind(accountId).all();
    return reply({ok:true,items:rows.results||[]});
  }
  const match=path.match(/^\/api\/premium\/cloud\/media\/([0-9a-f-]{36})$/i);
  if (match && method==='GET') {
    const row=await env.DB.prepare('SELECT object_key,content_type FROM talera_premium_media WHERE account_id=? AND media_id=?').bind(accountId,match[1]).first();
    if (!row) return reply({ok:false,reason:'not_found'},404);
    const object=await env.PREMIUM_PRIVATE.get(row.object_key);
    if (!object) return reply({ok:false,reason:'not_found'},404);
    return new Response(object.body,{headers:{'content-type':row.content_type,'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
  }
  if (match && method==='PUT') {
    if (!writeAllowed) return denied('invalid_origin');
    const type=(request.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    const declaredLength=Number(request.headers.get('content-length'));
    if (!Number.isSafeInteger(declaredLength)||declaredLength<1||declaredLength>25*1024*1024) return reply({ok:false,reason:'invalid_size'},413);
    const bytes=await request.arrayBuffer();
    const result=await storePremiumObject({bucket:env.PREMIUM_PRIVATE,db:env.DB,accountId,mediaId:match[1],contentType:type,bytes,sha256:request.headers.get('x-content-sha256'),entitlement,consent:true});
    return reply(result,result.ok?200:400);
  }
  return reply({ok:false,reason:'not_found'},404);
}
