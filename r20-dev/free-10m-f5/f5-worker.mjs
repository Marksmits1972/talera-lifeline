// TALERA Free F5 - ONE ISOLATED INTEGRATION GATEWAY, synthetic test accounts ONLY.
// There is intentionally NO TALERA_BASE, D1, R2 or existing customer service binding.
// Auth/DO and social/DO are assembled at ONE origin, not promoted to official PWA.
import authPilot from '../free-10m-auth-pilot/auth-pilot-worker.mjs';
import socialPilot from '../free-10m-social-do/social-worker.mjs';
import {
  readSessionCookie,shaHex,safeEqualHex,json,sameOrigin,body
} from '../free-10m-auth-pilot/auth-util.mjs';
import {validatedDate} from '../free-10m-delivery/free-account-router.mjs';
import {approvedAssets,anonymousShells} from '../free-10m-delivery/generated/approved-assets.mjs';
import {assetizeHtml} from '../free-10m-delivery/rewrite.mjs';
import {personalizeHome,personalizePresent} from '../free-10m-delivery/free-birthdate-worker.mjs';
import {referencePages,verifiedPublicScripts,verifiedPublicSupport} from './generated/public-template-map.mjs';
import {privateAccountScope,scopeLocalMemories} from './f5-local-scope.mjs';

export {
  FreeAuthAccount,FreeAuthEmail,FreeAuthHandle,FreeAuthSession,FreeAuthRate
} from '../free-10m-auth-pilot/auth-objects.mjs';
export {
  FreeSocialMemory,FreeSocialSharePointer
} from '../free-10m-social-do/social-objects.mjs';

const PUBLIC_PAGES=new Set(['/mijn-leven','/present','/tell']);
const AUTH_PATHS=new Set(['/api/register','/api/login','/api/logout','/api/me','/api/profile']);
const HEX64=/^[a-f0-9]{64}$/;
const F5_BROWSER_CSP=[
  "default-src 'self' blob: data:",
  "base-uri 'self'","object-src 'none'","frame-ancestors 'none'",
  "connect-src 'self'","form-action 'self'",
  "img-src 'self' https: blob: data:",
  "media-src 'self' blob: data: https:",
  "font-src 'self' https: data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' blob:",
  "worker-src 'self' blob:"
].join('; ');
const encoder=new TextEncoder();
function deny(status=403,message='Deze testomgeving is niet toegankelijk'){
  return json({ok:false,error:message},status);
}
const QA_COOKIE='talera_f5_access';
async function qaSignature(env,text){
  const key=await crypto.subtle.importKey('raw',encoder.encode(env.STAGING_F5_KEY),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',key,encoder.encode(text));
  return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function hasQaAccess(request,env){
  // CLI/CI uses a staging-only request header; browsers use a short-lived
  // signed HttpOnly cookie and need NEVER expose secrets to front-end scripts.
  if(safeEqualHex(request.headers.get('x-talera-f5-key')||'',env.STAGING_F5_KEY))
    return true;
  const cookie=request.headers.get('cookie')||'';
  const tokens=[...cookie.matchAll(/(?:^|;\s*)talera_f5_access=(\d{13})\.([a-f0-9]{32})\.([a-f0-9]{64})(?=;|$)/g)];
  if(tokens.length!==1)return false;
  const [,expiry,nonce,signature]=tokens[0],now=Date.now(),expires=Number(expiry);
  if(!Number.isSafeInteger(expires)||expires<=now||expires>now+30*60000)return false;
  return safeEqualHex(signature,await qaSignature(env,expiry+'.'+nonce));
}
function qaEntry(){
  const html='<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>TALERA Free besloten test</title><body style="max-width:480px;margin:12vh auto;padding:24px;font-family:system-ui">'+
    '<h1>TALERA Free — testversie</h1><p>Alleen voor de afgesloten test. Geen echte accounts gebruiken.</p>'+
    '<form action="/__f5/entry" method="post"><label>Testtoegang <input type="password" name="key" autocomplete="off" required maxlength="64" style="display:block;width:100%;padding:12px;margin:12px 0"></label>'+
    '<button type="submit" style="padding:12px 20px">Open testversie</button></form></body></html>';
  return new Response(html,{status:200,headers:{
    'content-type':'text/html; charset=utf-8','cache-control':'private, no-store',
    'x-content-type-options':'nosniff','referrer-policy':'no-referrer',
    'content-security-policy':F5_BROWSER_CSP
  }});
}
async function authorizeQaBrowser(request,env){
  if(!sameOrigin(request))return deny(403,'Ongeldige herkomst');
  const len=Number(request.headers.get('content-length')||0);
  if(len>1024)return deny(400,'Ongeldige testaanvraag');
  let form;
  try{form=await request.formData()}catch{return deny(400,'Ongeldige testaanvraag')}
  const secret=form.get('key');
  if(!safeEqualHex(typeof secret==='string'?secret:'',env.STAGING_F5_KEY))
    return deny(403,'Geen toegang');
  const expiry=String(Date.now()+30*60000);
  const nonce=[...crypto.getRandomValues(new Uint8Array(16))]
    .map(b=>b.toString(16).padStart(2,'0')).join('');
  const proof=await qaSignature(env,expiry+'.'+nonce);
  const cookie=QA_COOKIE+'='+expiry+'.'+nonce+'.'+proof+
    '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1800';
  return new Response(null,{status:303,headers:{
    location:'/mijn-leven','set-cookie':cookie,'cache-control':'private, no-store'
  }});
}
function ns(env,name){
  const b=env[name];
  if(!b?.get||!b?.idFromName)throw Error('F5_AUTH_BINDING_MISSING');
  if(env.AUTH_STORAGE_JURISDICTION==='eu')return b.jurisdiction('eu');
  if(env.AUTH_STORAGE_JURISDICTION==='local-test')return b;
  throw Error('F5_AUTH_JURISDICTION_NOT_EXPLICIT');
}
function accountHome(env,id){
  const b=ns(env,'AUTH_ACCOUNTS');
  return b.get(b.idFromName('talera-free-account-v1:'+id));
}
async function sessionAccount(request,env){
  const token=readSessionCookie(request);
  if(!token)return null;
  const hash=await shaHex(token),b=ns(env,'AUTH_SESSIONS');
  const account=await b.get(b.idFromName('talera-free-auth-session-v1:'+hash)).check();
  return account?.id?account:null;
}
async function signActor(key,actor){
  const secret=await crypto.subtle.importKey(
    'raw',encoder.encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign(
    'HMAC',secret,encoder.encode(actor))),b=>b.toString(16).padStart(2,'0')).join('');
}
function delegatedRequest(request,name,key){
  const h=new Headers(request.headers);
  // Reject user-supplied internal identities and keys: the gateway owns them.
  for(const k of ['x-qa-account','x-qa-signature','x-qa-staging-key','x-talera-staging-key'])
    h.delete(k);
  h.set(name,key);
  return new Request(request,{headers:h});
}
async function accountApi(request,env){
  const path=new URL(request.url).pathname;
  if(path==='/api/register'&&request.method==='POST'){
    // Registration must carry the private DOB from the approved TALERA form.
    let input;
    try{input=await body(request.clone());validatedDate(input.birthDate)}
    catch{return deny(400,'Vul een geldige geboortedatum in')}
    const result=await authPilot.fetch(
      delegatedRequest(request,'x-talera-staging-key',env.STAGING_ACCESS_KEY),env);
    if(!result.ok)return result;
    let data;
    try{data=await result.clone().json()}
    catch{return deny(503,'Registratiecontrole ontbreekt')}
    if(!data?.account?.id)return deny(503,'Account-ID ontbreekt');
    try{await accountHome(env,data.account.id).setBirthDate(input.birthDate)}
    catch{return deny(503,'Testaccount gemaakt; geboortedatum nog niet opgeslagen')}
    data.account.birthDate=input.birthDate;
    const headers=new Headers(result.headers);
    headers.delete('content-length');headers.delete('content-encoding');
    headers.set('cache-control','private, no-store');
    return new Response(JSON.stringify(data),{status:result.status,headers});
  }
  const response=await authPilot.fetch(
    delegatedRequest(request,'x-talera-staging-key',env.STAGING_ACCESS_KEY),env);
  if(path!=='/api/me'||request.method!=='GET'||!response.ok)return response;
  const data=await response.clone().json();
  if(!data?.account?.id)return deny(503,'Ongeldig accountantwoord');
  data.account.birthDate=await accountHome(env,data.account.id).getBirthDate();
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');
  headers.set('cache-control','private, no-store');
  return new Response(JSON.stringify(data),{status:response.status,headers});
}
async function birthdateApi(request,env){
  if(!['GET','POST'].includes(request.method))return deny(405,'Methode niet toegestaan');
  const actor=await sessionAccount(request,env);
  if(!actor)return deny(401,'Aanmelden vereist');
  const home=accountHome(env,actor.id);
  if(request.method==='GET')return json({birthDate:await home.getBirthDate()});
  if(!sameOrigin(request))return deny(403,'Ongeldige herkomst');
  let value;
  try{value=validatedDate((await body(request)).birthDate)}
  catch{return deny(400,'Ongeldige geboortedatum')}
  return json(await home.setBirthDate(value));
}
async function socialApi(request,env){
  // DO social code retains its own authorization, pointer and revocation checks.
  // The browser can NEVER claim an actor ID or provide its own HMAC signature.
  const actor=await sessionAccount(request,env);
  const headers=new Headers(request.headers);
  for(const k of ['x-qa-account','x-qa-signature','x-qa-staging-key','x-talera-staging-key'])
    headers.delete(k);
  headers.set('x-qa-staging-key',env.STAGING_SOCIAL_KEY);
  if(actor){
    headers.set('x-qa-account',actor.id);
    headers.set('x-qa-signature',await signActor(env.DEMO_IDENTITY_KEY,actor.id));
  }
  return socialPilot.fetch(new Request(request,{headers}),env);
}
async function publicPage(request,env){
  const pathname=new URL(request.url).pathname,origin=new URL(request.url).origin;
  if(!env.ASSETS)return deny(503,'PWA-bestanden niet beschikbaar');
  const sessionToken=readSessionCookie(request);
  if(sessionToken||request.headers.has('authorization')){
    // A signed-in page must use the server-verified account and its PRIVATE DOB.
    const actor=await sessionAccount(request,env);
    if(!actor)return deny(401,'Sessie verlopen; meld je opnieuw aan');
    const date=await accountHome(env,actor.id).getBirthDate();
    if((pathname==='/mijn-leven'||pathname==='/present')&&!date)
      return deny(503,'Geboortedatum ontbreekt; persoonlijke tijdlijn kan niet worden getoond');
    const originalRef=referencePages[pathname];
    if(!originalRef)return deny(503,'Originele PWA-bron ontbreekt');
    const response=await env.ASSETS.fetch(new Request(new URL(originalRef,origin)));
    if(!response.ok)return deny(503,'PWA-bron niet bereikbaar');
    const original=await response.text();
    const privateHtml=pathname==='/mijn-leven'?personalizeHome(original,date):
      pathname==='/present'?personalizePresent(original,date):original;
    // Refuse to show a wrong or default timeline if source markers changed.
    if((pathname==='/mijn-leven'||pathname==='/present')&&privateHtml===original)
      return deny(503,'De persoonlijke tijdlijn kon niet veilig worden gemaakt');
    // Isolate *local* originals, audio, video, photo and cue records by
    // verified account, without changing recorder, swipe or presentation logic.
    // If the upstream memory-store script ever changes, fail closed.
    const scoped=scopeLocalMemories(privateHtml,await privateAccountScope(actor.id));
    const converted=await assetizeHtml(scoped,new Set(approvedAssets));
    return new Response(converted.html,{
      status:200,headers:{
        'content-type':'text/html; charset=utf-8','cache-control':'private, no-store',
        'x-content-type-options':'nosniff','x-talera-free-f5':'personalized-durable-account',
        'content-security-policy':F5_BROWSER_CSP
      }
    });
  }
  const asset=anonymousShells[pathname];
  if(!asset)return deny(503,'Anonieme PWA-shell ontbreekt');
  const r=await env.ASSETS.fetch(new Request(new URL(asset,origin)));
  if(!r.ok)return deny(503,'Anonieme PWA-shell is niet beschikbaar');
  const headers=new Headers(r.headers);
  for(const key of ['content-length','etag','content-encoding','cf-cache-status','age'])headers.delete(key);
  headers.set('cache-control','private, no-store');
  headers.set('x-talera-free-f5','anonymous-snapshot-only');
  headers.set('content-security-policy',F5_BROWSER_CSP);
  headers.set('x-content-type-options','nosniff');
  return new Response(r.body,{status:200,headers});
}
async function publicPwaSupport(request,env){
 const pathname=new URL(request.url).pathname;
 const asset=verifiedPublicSupport[pathname];
 if(!asset||request.method!=='GET'||!env.ASSETS)return deny(404,'PWA-onderdeel niet beschikbaar');
 const source=await env.ASSETS.fetch(new Request(new URL(asset,new URL(request.url).origin)));
 if(!source.ok)return deny(503,'PWA-onderdeel kan niet worden geladen');
 const contentType=pathname==='/sw.js'?'text/javascript; charset=utf-8':
   pathname==='/manifest.webmanifest'?'application/manifest+json; charset=utf-8':
   pathname.endsWith('.svg')?'image/svg+xml':'image/png';
 const headers=new Headers({
   'content-type':contentType,'cache-control':'private, no-store',
   'x-content-type-options':'nosniff'
 });
 if(pathname==='/sw.js')headers.set('service-worker-allowed','/');
 return new Response(source.body,{status:200,headers});
}
async function publicScript(request,env){
  const pathname=new URL(request.url).pathname;
  const file=verifiedPublicScripts[pathname];
  if(!file||request.method!=='GET'||!env.ASSETS)
    return deny(404,'Dit statische PWA-script is niet beschikbaar');
  const r=await env.ASSETS.fetch(new Request(new URL(file,new URL(request.url).origin)));
  if(!r.ok)return deny(503,'Gecontroleerd PWA-script niet bereikbaar');
  return new Response(r.body,{status:200,headers:{
    'content-type':'text/javascript; charset=utf-8','cache-control':'private, no-store',
    'x-content-type-options':'nosniff'
  }});
}
export default {
  async fetch(request,env){
    const url=new URL(request.url),p=url.pathname,m=request.method;
    if(p==='/__f5/health'&&m==='GET')
      return json({ok:true,stage:'F5-isolated-integration',syntheticOnly:true,
        officialTaleraConnected:false,loggedInPwaCertified:false,tenMillionProven:false});
    // Closed pilot. Cloudflare Access/browser access requires separate acceptance.
    if(!HEX64.test(env.STAGING_F5_KEY||'')||
       !HEX64.test(env.STAGING_ACCESS_KEY||'')||
       !HEX64.test(env.STAGING_SOCIAL_KEY||'')||
       typeof env.AUTH_NAMESPACE_KEY!=='string'||env.AUTH_NAMESPACE_KEY.length<40||
       typeof env.DEMO_IDENTITY_KEY!=='string'||env.DEMO_IDENTITY_KEY.length<40)
      return deny(503,'F5-testomgeving niet correct ingericht');
    if(p==='/__f5/entry'&&m==='GET')return qaEntry();
    if(p==='/__f5/entry'&&m==='POST')return authorizeQaBrowser(request,env);
    if(!await hasQaAccess(request,env))return deny();
    if(url.search)return deny(404,'Niet gevonden');
    try{
      if(AUTH_PATHS.has(p))return accountApi(request,env);
      if(p==='/api/profile/birthdate')return birthdateApi(request,env);
      if(p.startsWith('/__social/'))return socialApi(request,env);
      if(m==='GET'&&PUBLIC_PAGES.has(p))return publicPage(request,env);
      if(p.startsWith('/__clean/'))return publicScript(request,env);
      if(Object.hasOwn(verifiedPublicSupport,p))return publicPwaSupport(request,env);
      // No fallback to the live TALERA services; unported routes fail closed.
      return deny(404,'Niet beschikbaar in deze geïsoleerde test');
    }catch(error){
      // Never log cookies, account names, passwords, signatures or tokens.
      console.error('TALERA_F5_INTERNAL_FAILURE');
      return deny(503,'F5-testservice tijdelijk onbereikbaar');
    }
  }
};
