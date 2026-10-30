/** Verify one existing TALERA Core owner capability without Cloudflare Access. */
const STORY_ID=/^[A-Za-z0-9_-]{10,80}$/;
const encoder=new TextEncoder();
export async function hashOwnerToken(token){
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(token))),x=>x.toString(16).padStart(2,'0')).join('');
}
function constantEqual(left,right){
 if(typeof left!=='string'||typeof right!=='string')return false;
 let difference=left.length^right.length;
 for(let i=0;i<Math.max(left.length,right.length);i++)difference|=(left.charCodeAt(i)||0)^(right.charCodeAt(i)||0);
 return difference===0;
}
export async function verifyOwnerCapability({request,db,storyId}){
 if(!STORY_ID.test(String(storyId||''))||!db?.prepare)return null;
 const value=request.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9_-]{30,256}$/.test(value))return null;
 const candidateHash=await hashOwnerToken(value.slice(7));
 const result=await db.prepare("SELECT token_hash,scope FROM core_story_capabilities WHERE story_id=? AND revoked_at IS NULL AND scope='owner'").bind(storyId).all();
 for(const row of result.results||[]){if(row.scope==='owner'&&constantEqual(candidateHash,row.token_hash))return {storyId,capabilityVerified:true}}
 return null;
}
