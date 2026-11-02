/* TALERA Premium: one-at-a-time upload queue over existing local memory files.
 * No deletion of local content. Call only after session entitlement and consent.
 * Application supplies IndexedDB read/write functions; this module never opens
 * another database or requests per-memory confirmation.
 */
export async function syncPremiumPending({listPending,readMedia,markSynced,upload,allowed,online=()=>true,maxItems=20}={}) {
 if(typeof allowed!=='function'||!(await Promise.resolve().then(allowed).catch(()=>false))) return {phase:'not_enabled',uploaded:0,pending:0};
 if(!online()) return {phase:'offline',uploaded:0,pending:0};
 const items=await listPending();
 let uploaded=0,failed=0,attempted=0;
 for(const item of items.slice(0,maxItems)){
  if(!online()) return {phase:'offline',uploaded,failed,pending:items.length-attempted};
  if(!(await Promise.resolve().then(allowed).catch(()=>false))) return {phase:'not_enabled',uploaded,failed,pending:items.length-attempted};
  attempted++;
  try{
   const data=await readMedia(item);
   if(!data) {failed++;continue}
   const result=await upload(item,data);
   if(result?.ok && ['stored','already_stored'].includes(result.reason)){
    await markSynced(item);uploaded++;
   }else failed++;
  }catch{failed++}
 }
 return {phase:failed?'attention':items.length>attempted?'uploading':'ready',uploaded,failed,pending:items.length-attempted};
}
