/* TALERA FREE - isolated scale-ready shared-code delivery candidate.
 * Uses the EXACT protected account/birthdate Worker as backend.
 * It changes ONLY how verified public static code is delivered.
 * Does not cache HTML, API, birth dates, account data or media.
 */
import currentTalera from '../account-birthdate-test/account-birthdate-worker.mjs';
import {assetizeHtml,PUBLIC_PATHS} from './rewrite.mjs';
import {approvedAssets,anonymousShells} from './generated/approved-assets.mjs';
const allowed=new Set(approvedAssets);
const ASSET_PREFIX='/__talera_free/assets/';
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/__talera_free/')){
   if(!url.pathname.startsWith(ASSET_PREFIX))return new Response('Niet gevonden.',{status:404});
   // Normally Cloudflare Static Assets serves this BEFORE invoking this Worker.
   // This fallback preserves native asset validation and caching behavior.
   return env.ASSETS?env.ASSETS.fetch(request):new Response('Assets niet gekoppeld.',{status:503});
  }
  // A byte-identical, verified ANONYMOUS shell can come from the Cloudflare
  // static edge, without asking the account Worker or any database at all.
  // Cookies, Authorization, query parameters and every non-page route bypass it.
  // User-specific HTML is never cached; the browser-facing response is no-store.
  if(request.method==='GET'&&PUBLIC_PATHS.has(url.pathname)&&!url.search&&
     !request.headers.has('cookie')&&!request.headers.has('authorization')&&
     Object.hasOwn(anonymousShells,url.pathname)&&env.ASSETS){
   const shellUrl=new URL(anonymousShells[url.pathname],url.origin);
   const cached=await env.ASSETS.fetch(new Request(shellUrl,{method:'GET'}));
   if(cached.ok){
    const headers=new Headers(cached.headers);
    for(const k of ['etag','content-length','content-encoding','age','cf-cache-status'])headers.delete(k);
    headers.set('cache-control','private, no-store');
    headers.set('x-talera-free-shared-code','edge-anonymous-shell');
    headers.set('x-content-type-options','nosniff');
    return new Response(cached.body,{status:200,headers});
   }
   // Fail safe: a missing public asset falls back to the approved TALERA Worker.
  }
  // Never optimize POST, logged-in APIs, media, etc. Existing app is authoritative.
  if(request.method!=='GET'||!PUBLIC_PATHS.has(url.pathname))
   return currentTalera.fetch(request,env,ctx);
  const response=await currentTalera.fetch(request,env,ctx);
  if(response.status!==200||!(response.headers.get('content-type')||'').toLowerCase().includes('text/html'))
   return response;
  const original=await response.text();
  const converted=await assetizeHtml(original,allowed);
  const headers=new Headers(response.headers);
  for(const k of ['content-length','content-encoding','etag'])headers.delete(k);
  headers.set('cache-control','private, no-store');
  headers.set('x-talera-free-shared-code',converted.converted>0?'exact-match':'fallback');
  headers.set('x-content-type-options','nosniff');
  return new Response(converted.html,{status:200,statusText:response.statusText,headers});
 }
};
