/* TALERA Premium cloud pilot access: Core Worker ONLY.
 * Inputs come from trusted env bindings, verified Core session and D1 entitlement.
 * Never enable cloud capabilities for all Premium subscribers during pilot.
 */
export function premiumCloudPilotAllowed({env,accountId,rights}={}){
 if(env?.PREMIUM_CLOUD_PILOT_ENABLED!=='true')return false;
 if(!/^[0-9a-f-]{36}$/i.test(accountId||''))return false;
 const ids=String(env?.PREMIUM_CLOUD_PILOT_ACCOUNT_IDS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!ids.includes(accountId.toLowerCase()))return false;
 return rights?.source==='manual_test'&&rights?.permissions?.cloud_storage===true;
}
export function premiumCloudPilotRights({env,accountId,rights}={}){
 const pilot=premiumCloudPilotAllowed({env,accountId,rights});
 return {
  permissions:{...rights?.permissions},
  available:{...rights?.available,cloud_storage:pilot,cloud_sync:pilot}
 };
}
