const TIMELINE_ORIGIN_RE=/^https:\/\/talera-timeline-prototype\.[a-z0-9-]+\.workers\.dev$/i;

export async function handleWorkbladAudioHead(request,env){
  if(request.method!=='HEAD')return null;
  const url=new URL(request.url);
  const match=url.pathname.match(/^\/api\/integration\/stories\/([^/]+)\/audio$/);
  if(!match)return null;
  const storyId=decodeURIComponent(match[1]);
  const token=bearerToken(request);
  if(!token)return withCors(request,new Response(null,{status:401,headers:{'cache-control':'no-store'}}));

  const row=await env.DB.prepare(`
    SELECT id, manage_token_hash, status, audio_object_key, audio_mime_type, audio_size_bytes
    FROM stories WHERE id = ? LIMIT 1
  `).bind(storyId).first();
  if(!row||row.status==='deleted')return withCors(request,new Response(null,{status:404,headers:{'cache-control':'no-store'}}));
  if(!(await secureHashMatch(token,row.manage_token_hash)))return withCors(request,new Response(null,{status:403,headers:{'cache-control':'no-store'}}));
  if(!row.audio_object_key)return withCors(request,new Response(null,{status:404,headers:{'cache-control':'no-store'}}));

  const object=await env.MEDIA.head(row.audio_object_key);
  if(!object)return withCors(request,new Response(null,{status:404,headers:{'cache-control':'no-store'}}));
  const headers=new Headers();
  headers.set('content-type',row.audio_mime_type||object.httpMetadata?.contentType||'application/octet-stream');
  headers.set('content-length',String(Number(object.size||row.audio_size_bytes||0)));
  headers.set('cache-control','no-store');
  headers.set('accept-ranges','bytes');
  headers.set('x-talera-audio-object','verified');
  if(object.httpEtag)headers.set('etag',object.httpEtag);
  return withCors(request,new Response(null,{status:200,headers}));
}

function withCors(request,response){
  const origin=request.headers.get('origin')||'';
  const headers=new Headers(response.headers);
  if(TIMELINE_ORIGIN_RE.test(origin)){
    headers.set('access-control-allow-origin',origin);
    headers.set('vary','Origin');
    headers.set('access-control-allow-methods','GET,HEAD,PUT,OPTIONS');
    headers.set('access-control-allow-headers','authorization,content-type');
  }
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
function bearerToken(request){const value=request.headers.get('authorization')||'';return value.toLowerCase().startsWith('bearer ')?value.slice(7).trim():null}
async function sha256(value){const data=new TextEncoder().encode(value);const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',data));return [...digest].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function secureHashMatch(token,expectedHash){const actualHash=await sha256(token);if(!expectedHash||actualHash.length!==expectedHash.length)return false;let difference=0;for(let i=0;i<actualHash.length;i++)difference|=actualHash.charCodeAt(i)^expectedHash.charCodeAt(i);return difference===0}
