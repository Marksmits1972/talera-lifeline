/* One deliberate integration into the EXISTING Core worker.
 * Guarded source patch; preserve all existing routes and return fallback version on failure.
 */
export function patchPremiumCloudCore(source){
 const importMarker='// TALERA clean-core stage 2026-10-30.';
 const authMarker=' const user=await auth(req,env);';
 const rightsMarker='return json({rights,canManageTests:admin,commercialBillingActive:false});';
 if(!source.startsWith(importMarker)||source.split(authMarker).length!==2||source.split(rightsMarker).length!==2||source.includes('handleCorePremiumCloud('))
  throw Error('core_source_not_expected');
 const imports="import {handleCorePremiumCloud} from './premium-cloud-core-adapter.mjs';\nimport {premiumCloudPilotRights} from './premium-cloud-pilot.mjs';\n";
 let out=imports+source;
 out=out.replace(authMarker,authMarker+"\n const privateCloud=await handleCorePremiumCloud({request:req,env,user,getRights:premiumGrantView,allowedWrite,rateLimit});\n if(privateCloud)return privateCloud;");
 out=out.replace(rightsMarker,"return json({rights:premiumCloudPilotRights({env,accountId:user.id,rights}),canManageTests:admin,commercialBillingActive:false});");
 if(out.split('handleCorePremiumCloud(').length!==2||out.split('premiumCloudPilotRights({').length!==2)
  throw Error('core_patch_validation_failed');
 return out;
}
