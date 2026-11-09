// F5 Free — keep the approved local recorder and one presentation player
// unchanged, but isolate its IndexedDB files/stories per verified account.
// No story, photo, audio or cue content is sent to Cloudflare.
const STORE_START=/<script\b[^>]*\bid=(["'])talera-memory-store-v1\1[^>]*>/gi;
const OLD_DB="var DB_NAME='talera-lifeline-dev-local-v1'";
const OLD_BIRTH="'talera-dev-birthyear-v1'";
const OLD_BIRTH_ALT="\"talera-dev-birthyear-v1\"";
function occurrences(source,needle){return source.split(needle).length-1}
export function scopeLocalMemories(html,accountHash){
 if(typeof html!=='string'||!/^[a-f0-9]{64}$/.test(accountHash))
  throw Error('INVALID_PRIVATE_LOCAL_SCOPE');
 const matches=[...html.matchAll(STORE_START)];
 if(matches.length!==1)throw Error('MEMORY_SCRIPT_COUNT_MISMATCH');
 const open=matches[0],start=open.index+open[0].length;
 const end=html.indexOf('</script>',start);
 if(end<0)throw Error('MEMORY_SCRIPT_NOT_CLOSED');
 const script=html.slice(start,end);
 if(occurrences(script,OLD_DB)!==1)throw Error('MEMORY_DB_MARKER_MISMATCH');
 // Hash is generated from the authenticated UUID. It is only a namespace,
 // not an authorization proof; the signed-in account still determines it.
 const dbName='talera-free-local-'+accountHash.slice(0,32)+'-v1';
 // Critical: /tell has THREE independent IndexedDB.open sites. The original
 // TaleraMemories.save/get store, the editor's dbOpen() for drafts/media-ID
 // cue metadata, and the full-delete helper MUST select the SAME database.
 // Previously only DB_NAME inside the first script was rewritten, so save()
 // wrote the scoped story but the editor's cue writer modified an entirely
 // different, shared legacy DB. The immediate readback then failed.
 const oldName='talera-lifeline-dev-local-v1';
 const originalReferences=occurrences(html,oldName);
 if(originalReferences<1||occurrences(script,oldName)!==1)
   throw Error('MEMORY_DB_REFERENCE_MISMATCH');
 let rewritten=html.replaceAll(oldName,dbName);
 if(rewritten.includes(oldName))throw Error('LEGACY_LOCAL_DB_REFERENCE_REMAINED');
 if(!rewritten.includes("var DB_NAME='"+dbName+"'"))
   throw Error('MEMORY_DB_SCOPE_NOT_APPLIED');
 // Independent local birthday readers must never cross account boundaries.
 const birthKey='talera-free-birthyear-'+accountHash.slice(0,32)+'-v1';
 rewritten=rewritten.replaceAll(OLD_BIRTH,"'"+birthKey+"'")
   .replaceAll(OLD_BIRTH_ALT,'"'+birthKey+'"');
 return rewritten;
}
export async function privateAccountScope(accountId){
 if(typeof accountId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId))
  throw Error('INVALID_PRIVATE_ACCOUNT');
 const data=new TextEncoder().encode('TALERA_FREE_BROWSER_MEMORY_V1:'+accountId.toLowerCase());
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',data));
 return [...digest].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
