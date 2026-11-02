/* TALERA Clean Core Premium cloud integration adapter.
 * Call only AFTER the existing Core Worker has verified its session.
 * Reuse existing premiumGrantView, allowedWrite and rateLimit functions.
 * This does not install a separate login service or modify Free routes.
 */
import {premiumCloudPilotAllowed,premiumCloudPilotRights} from './premium-cloud-pilot.mjs';
import {premiumCloudRoute} from './premium-cloud-routes.mjs';
const denied=(status,reason)=>new Response(JSON.stringify({ok:false,reason}),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function handleCorePremiumCloud({request,env,user,getRights,allowedWrite,rateLimit}={}){
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/api/premium/cloud/'))return null;
 if(!user?.id)return denied(401,'login_required');
 if(typeof getRights!=='function'||typeof allowedWrite!=='function'||typeof rateLimit!=='function')return denied(503,'core_integration_unavailable');
 // Feature remains closed unless an existing manual Premium grant and explicit allowlist agree.
 const base=await getRights(env,user.id);
 const pilotEnabled=premiumCloudPilotAllowed({env,accountId:user.id,rights:base});
 if(!pilotEnabled)return denied(403,'pilot_disabled');
 const rights=premiumCloudPilotRights({env,accountId:user.id,rights:base});
 if(!['GET','POST','PUT'].includes(request.method))return denied(405,'method_not_allowed');
 if(request.method!=='GET'){
  if(!allowedWrite(request))return denied(403,'invalid_origin');
  // Large video parts are separately bounded to this verified account.
  // Ordinary TALERA and Premium consent writes keep their original 30/10min cap.
  const isPart=/^\/api\/premium\/cloud\/multipart\/[0-9a-f-]{36}\/part\/\d{1,4}$/i.test(path);
  const category=isPart?'premium-cloud-part:'+user.id:'premium-cloud-write';
  if(!await rateLimit(request,env,category,isPart?600:30))return denied(429,'rate_limited');
 }
 return premiumCloudRoute({request,env,sessionAccount:user,entitlement:rights,pilotEnabled,writeAllowed:request.method==='GET'||allowedWrite(request)});
}
