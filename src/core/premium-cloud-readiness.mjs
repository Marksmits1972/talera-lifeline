/* TALERA Premium cloud readiness policy.
 * Pure decisions only: no network, database writes, migration, or upload side effects.
 * Premium rights become active on verified payment; cloud/QR readiness is separate.
 */
export function premiumCloudState({paid=false, entitled=false, consent=false, online=true, pending=0, failed=0, ready=0}={}) {
  if (!paid && !entitled) return {phase:'free',uploadAllowed:false,qrReady:false};
  if (!entitled) return {phase:'awaiting_entitlement',uploadAllowed:false,qrReady:false};
  if (!consent) return {phase:'consent_required',uploadAllowed:false,qrReady:false};
  if (!online) return {phase:'offline',uploadAllowed:false,qrReady:false};
  if (failed>0) return {phase:'attention',uploadAllowed:true,qrReady:ready>0};
  if (pending>0) return {phase:'uploading',uploadAllowed:true,qrReady:ready>0};
  return {phase:ready>0?'ready':'empty',uploadAllowed:true,qrReady:ready>0};
}
export function qrItemReady({owned=false,uploaded=false,processed=false,authorized=false}={}) {
  return Boolean(owned && uploaded && processed && authorized);
}
export const cloudStatusText=Object.freeze({
  free:'TALERA Free bewaart herinneringen lokaal.',
  awaiting_entitlement:'Premium-rechten worden gecontroleerd.',
  consent_required:'Geef eenmalig toestemming om je herinneringen veilig in de cloud op te slaan.',
  offline:'Wachten op internetverbinding. Je herinneringen blijven lokaal beschikbaar.',
  attention:'Niet alle herinneringen konden worden overgezet. TALERA probeert dit opnieuw.',
  uploading:'Je herinneringen worden veilig overgezet. Veel foto’s en video’s kunnen extra tijd kosten.',
  ready:'Klaar om samen te kijken via de QR-code.',
  empty:'Er staan nog geen herinneringen klaar om te bekijken.'
});
