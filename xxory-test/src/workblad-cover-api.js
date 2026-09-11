export async function handleWorkbladCoverApi(request,env){
  const url=new URL(request.url);
  const match=url.pathname.match(/^\/api\/integration\/stories\/([^/]+)\/cover$/);
  if(!match)return null;
  if(request.method==='OPTIONS')return withCors(request,new Response(null,{status:204}));
  if(request.method!=='PUT')return withCors(request,json({error:'Niet ondersteund.'},405));

  const storyId=match[1];
  const token=bearerToken(request);
  if(!token)return withCors(request,json({error:'Beheer-token ontbreekt.'},401));
  const story=await env.DB.prepare(`SELECT id,manage_token_hash,status FROM stories WHERE id=? LIMIT 1`).bind(storyId).first();
  if(!story||story.status!=='active')return withCors(request,json({error:'Verhaal niet gevonden.'},404));
  if(!(await secureHashMatch(token,story.manage_token_hash)))return withCors(request,json({error:'Geen toegang.'},403));

  let payload={};
  try{payload=await request.json()}catch{return withCors(request,json({error:'Ongeldige gegevens.'},400))}
  const mediaId=String(payload.mediaId||'').trim();
  if(!mediaId)return withCors(request,json({error:'Foto ontbreekt.'},400));
  const media=await env.DB.prepare(`SELECT id,object_key,media_type FROM story_media WHERE id=? AND story_id=? LIMIT 1`).bind(mediaId,storyId).first();
  if(!media||media.media_type!=='image')return withCors(request,json({error:'Foto niet gevonden.'},404));

  const updatedAt=new Date().toISOString();
  await env.DB.prepare(`UPDATE story_media SET role='extra' WHERE story_id=? AND media_type='image'`).bind(storyId).run();
  await env.DB.prepare(`UPDATE story_media SET role='start' WHERE id=? AND story_id=?`).bind(mediaId,storyId).run();
  await env.DB.prepare(`UPDATE stories SET start_photo_key=?,updated_at=? WHERE id=?`).bind(media.object_key,updatedAt,storyId).run();
  return withCors(request,json({ok:true,storyId,mediaId,updatedAt}));
}

function bearerToken(request){const value=request.headers.get('authorization')||'';return value.toLowerCase().startsWith('bearer ')?value.slice(7).trim():null}
async function sha256(value){const data=new TextEncoder().encode(value);const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',data));return [...digest].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function secureHashMatch(token,expectedHash){const actualHash=await sha256(token);if(!expectedHash||actualHash.length!==expectedHash.length)return false;let difference=0;for(let i=0;i<actualHash.length;i++)difference|=actualHash.charCodeAt(i)^expectedHash.charCodeAt(i);return difference===0}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function withCors(request,response){const origin=request.headers.get('origin')||'';const headers=new Headers(response.headers);if(/^https:\/\/talera-timeline-prototype\.[a-z0-9-]+\.workers\.dev$/i.test(origin)){headers.set('access-control-allow-origin',origin);headers.set('vary','Origin');headers.set('access-control-allow-methods','PUT,OPTIONS');headers.set('access-control-allow-headers','authorization,content-type')}return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}
