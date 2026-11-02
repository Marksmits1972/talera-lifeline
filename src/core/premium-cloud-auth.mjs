/* TALERA Premium cloud authorization — reusable in existing Clean Core.
 * Caller must derive accountId from verified session, NEVER from request body.
 * No writes or network calls from this module.
 */
export function cloudAccess({sessionAccount,entitlement,consentRow,pilotEnabled=false}={}) {
  if (!sessionAccount?.id) return {allowed:false,reason:'login_required'};
  if (!pilotEnabled) return {allowed:false,reason:'pilot_disabled'};
  if (entitlement?.permissions?.cloud_storage!==true) return {allowed:false,reason:'premium_required'};
  if (entitlement?.available?.cloud_storage!==true) return {allowed:false,reason:'feature_unavailable'};
  if (consentRow?.enabled!==1) return {allowed:false,reason:'consent_required'};
  return {allowed:true,accountId:sessionAccount.id};
}
export function canAcceptCloudConsent({sessionAccount,entitlement,pilotEnabled=false}={}) {
  return Boolean(sessionAccount?.id && pilotEnabled && entitlement?.permissions?.cloud_storage===true);
}
export function cloudConsentDetails(row) {
  return {enabled:row?.enabled===1,grantedAt:row?.granted_at??null};
}
