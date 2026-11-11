// TALERA Free F5 - ONE continuous Free acceptance candidate, not a public release approval.
// Normal user registration and login control all personal data; no invitation
// code, temporary browser gate, or automatic account creation is required.
// There is intentionally NO TALERA_BASE, D1, R2 or existing customer binding.
import authPilot from '../free-10m-auth-pilot/auth-pilot-worker.mjs';
import socialPilot from '../free-10m-social-do/social-worker.mjs';
import {
  readSessionCookie,sessionCookie,shaHex,safeEqualHex,json,sameOrigin,body
} from '../free-10m-auth-pilot/auth-util.mjs';
import {validatedDate} from '../free-10m-delivery/free-account-router.mjs';
import {approvedAssets,anonymousShells} from '../free-10m-delivery/generated/approved-assets.mjs';
import {assetizeHtml} from '../free-10m-delivery/rewrite.mjs';
import {personalizeHome,personalizePresent} from '../free-10m-delivery/free-birthdate-worker.mjs';
import {referencePages,verifiedPublicScripts,verifiedPublicSupport} from './generated/public-template-map.mjs';
import {privateAccountScope,scopeLocalMemories} from './f5-local-scope.mjs';
import {alignEditedNarrationCueRefs} from './f5-edit-cue-rebind.mjs';
import {muteEditorOnlyVideo} from './f5-editor-video-mute-guard.mjs';
import {localBackupPage} from './f5-local-backup-page.mjs';

export {
  FreeAuthAccount,FreeAuthEmail,FreeAuthHandle,FreeAuthSession,FreeAuthRate
} from '../free-10m-auth-pilot/auth-objects.mjs';
export {
  FreeSocialMemory,FreeSocialSharePointer
} from '../free-10m-social-do/social-objects.mjs';

const PUBLIC_PAGES=new Set(['/mijn-leven','/meldingen','/present','/tell']);
// The approved V25 menu has exactly three visible destinations; the fourth
// "Gedeeld" destination was retired, but the original home grid stayed four
// columns wide. Adjust ONLY the three-column CSS rule, never the nav nodes,
// labels, URLs, visual theme, or the presentation/recording controls.
const OLD_HOME_NAV_GRID='.flow-nav{grid-template-columns:repeat(4,minmax(0,1fr))!important}';
const THREE_HOME_NAV_GRID='.flow-nav{grid-template-columns:repeat(3,minmax(0,1fr))!important}';
function evenlySpaceThreeHomeTabs(html){
  if(typeof html!=='string'||html.split(OLD_HOME_NAV_GRID).length!==2||
     !html.includes('id="navMine"')||!html.includes('id="navShared"')||
     !html.includes('id="navNotifications"')||!html.includes('id="navMore"'))
    throw Error('TALERA_HOME_NAV_SOURCE_DRIFT');
  return html.replace(OLD_HOME_NAV_GRID,THREE_HOME_NAV_GRID);
}

// Direct memory deep-links originally painted the built-in reference frame
// (memory 50) before R19 selected ?memory=3 or IndexedDB hydrated ?memory=local-*.
// Avoid that unrelated first frame. Only a direct, valid ONE-story selection is
// gated; all ordinary timelines, topic filters, voice, swipe and photos stay
// exactly as before. No image/media copy, URL change or persistent state.
function hideUnselectedEntryPhoto(html,requestUrl){
 const url=new URL(requestUrl);
 if(url.pathname!=='/present'||url.searchParams.size!==1||
    !url.searchParams.has('memory')||!allowedLocalUiSearch(url))return html;
 const id=url.searchParams.get('memory');
 // R19 handles original IDs 1..50. Do not gate unsupported numeric navigation.
 const existingRef=/^\d+$/.test(id)&&((Number(id)>=1&&Number(id)<=50)||
   (Number(id)>=1001&&Number(id)<=1450));
 const covered=LOCAL_STORY_ID.test(id)||existingRef;
 if(!covered)return html;
 // The APPROVED Home already links to numeric sample #1031, but its old
 // R19 bridge rejected all IDs >50 and briefly displayed reference #50.
 // Select only an actual existing 450-series reference; no new story or demo.
 if(Number(id)>=1001&&Number(id)<=1450){
   const oldBridge='if(!Number.isInteger(id)||id<1||id>50)return;';
   const updatedBridge='if(!Number.isInteger(id)||!((id>=1&&id<=50)||(id>=1001&&id<=1450)))return;';
   if(html.split(oldBridge).length!==2)
     throw Error('TALERA_EXISTING_REFERENCE_DEEP_LINK_SOURCE_DRIFT');
   html=html.replace(oldBridge,updatedBridge);
 }
 if(typeof html!=='string'||html.split('<head>').length!==2||
    !html.includes('id="photoStage"')||
    !html.includes('id="memoryPhotoA"')||
    !html.includes('id="memoryCaption"')||
    !html.includes('talera-lifeline-r19-bridge')||
    !html.includes('talera-zero-memory-adapter'))
   throw Error('TALERA_DIRECT_MEMORY_ENTRY_SOURCE_DRIFT');
 const js=String.raw`(function(){
   const requested=${JSON.stringify(id)};
   const root=document.documentElement;
   root.classList.add('talera-direct-memory-entering');
   // A gallery tile carries its stable media ID in a local session hand-off.
   // The parent story remains in the URL for the existing one-screen player.
   const galleryKey='talera-f5-gallery-photo-return-v1';
   let gallery=null,selected=false,watch=0;
   const started=Date.now();
   try{
     const data=JSON.parse(sessionStorage.getItem(galleryKey)||'null');
     if(data?.v===1&&data.phase==='open'&&data.story===requested&&
        typeof data.media==='string'&&data.media.length>0&&
        Number.isFinite(data.at)&&Date.now()-data.at<43200000)gallery=data;
   }catch(e){}
   const isTarget=m=>m&&(
     String(m.storyId||'')===requested ||
     String(m.id)==='pwa:'+requested ||
     String(m.id)===requested
   );
   let poll=0,settling=false;
   const selectGalleryPhoto=m=>{
     if(!gallery)return true;
     if(m._photoLoading||!Array.isArray(m._zeroItems)||
        !Array.isArray(m._zeroFrames)||!m._zeroFrames.length)return false;
     const frames=m._zeroItems.filter(x=>x&&(x.kind==='photo'||x.kind==='video'));
     const target=frames.findIndex(x=>x.key===gallery.media);
     if(target<0||target>=m._zeroFrames.length){
       if(Date.now()-started>20000){
         try{sessionStorage.removeItem(galleryKey)}catch(e){}
         gallery=null;return true;
       }
       return false;
     }
     if(m._photoIndex!==target){
       if(typeof window.__taleraV31SelectPhoto!=='function')return false;
       window.__taleraV31SelectPhoto(m.id,target,true);
       return false;
     }
     if(!selected){
       selected=true;gallery.phase='active';
       try{sessionStorage.setItem(galleryKey,JSON.stringify(gallery))}catch(e){}
     }
     return true;
   };
   const photoReady=m=>{
     if(m._photoLoading||!selectGalleryPhoto(m))return false;
     const items=m._zeroItems||[];
     const isTextOnly=!!m._taleraLocal&&!items.some(x=>x.kind==='photo'||x.kind==='video');
     if(isTextOnly)return true;
     const front=document.getElementById('memoryPhotoA');
     if(!front||!m.image)return false;
     return front.getAttribute('src')===m.image &&front.complete&&front.naturalWidth>0;
   };
   const reveal=()=>{
     const m=window.__taleraTimelineRuntime?.currentMemory?.();
     if(!isTarget(m)||!photoReady(m))return;
     root.classList.remove('talera-direct-memory-entering');
     clearInterval(poll);
     if(gallery&&!watch){
       watch=setInterval(()=>{
         const current=window.__taleraTimelineRuntime?.currentMemory?.();
         // An actual story swipe ends gallery return; photo changes do not.
         if(current&&!isTarget(current)){
           try{sessionStorage.removeItem(galleryKey)}catch(e){}
           gallery=null;clearInterval(watch);watch=0;
         }
       },100);
     }
   };
   const tick=()=>{
     const m=window.__taleraTimelineRuntime?.currentMemory?.();
     if(!isTarget(m)||!photoReady(m)||settling)return;
     settling=true;
     // The normal photo layer and synced foreground have two frames to
     // settle; do not display the earlier default during navigation.
     requestAnimationFrame(()=>requestAnimationFrame(()=>{
       settling=false;
       reveal();
     }));
   };
   // Only override the existing back arrow for a genuine gallery entry.
   document.addEventListener('click',event=>{
     const node=event.target?.closest?.(
       '#talera-flow-home, a[href="/"], a[href="/mijn-leven"]');
     if(!gallery||!node)return;
     const current=window.__taleraTimelineRuntime?.currentMemory?.();
     if(!isTarget(current))return;
     event.preventDefault();event.stopImmediatePropagation();
     gallery.phase='return';
     try{sessionStorage.setItem(galleryKey,JSON.stringify(gallery))}catch(e){}
     window.location.assign('/mijn-leven');
   },true);
   poll=setInterval(tick,40);
   tick();
   window.addEventListener('pagehide',()=>{
     clearInterval(poll);if(watch)clearInterval(watch);
   },{once:true});
 })();`;
 const markup='<script id="talera-direct-memory-entry-guard">'+js+'</script>'+
  '<style id="talera-direct-memory-entry-style">'+
  'html.talera-direct-memory-entering #photoStage,'+
  'html.talera-direct-memory-entering #memoryCaption{visibility:hidden!important}'+
  '</style>';
 return html.replace('<head>','<head>'+markup);
}

const AUTH_PATHS=new Set(['/api/register','/api/login','/api/logout','/api/me','/api/profile']);
// iOS fetches install icons independently of the browser login cookie.
// These four static install resources are public. Account data remains private.
const PUBLIC_INSTALL_ICON_PATHS=new Set([
 '/apple-touch-icon.png','/pwa-192.png','/pwa-512.png',
 '/manifest.webmanifest'
]);
// Separate opt-in QA page, not linked into original approved TALERA interface.
const BACKUP_MODULES=Object.freeze({
 '/__f5/f5-portable-idb.mjs':'f5-portable-idb.mjs',
 '/__f5/f5-portable-archive.mjs':'f5-portable-archive.mjs',
 '/__f5/backup-controller.mjs':'f5-backup-controller.mjs'
});
const HEX64=/^[a-f0-9]{64}$/;
const LOCAL_STORY_ID=/^local-[a-z0-9-]{8,90}$/i;
// Verbatim CURRENT value from the two original approved home/present pages.
// The CI integration test compares both frozen public source snapshots to this.
const APPROVED_UI_VERSION='talera-storage-v37-20261022';
function allowedVersionCheck(url,method){
  if(method!=='GET'||url.pathname!=='/api/version')return false;
  const pairs=[...url.searchParams.entries()];
  return pairs.length===1&&pairs[0][0]==='check'&&/^\d{13}$/.test(pairs[0][1]);
}
function allowedLocalUiSearch(url){
  if(!PUBLIC_PAGES.has(url.pathname))return false;
  const pairs=[...url.searchParams.entries()];
  if(pairs.length!==1)return false;
  const [key,id]=pairs[0];
  // The approved Mijn leven bottom-bar "Meer" points to exactly this
  // SAME-ORIGIN original presentation/menu. It was incorrectly rejected
  // by F5's local-memory-only query filter (real iPhone 404). Permit only
  // the literal original hub entry, with no extra parameters or redirects.
  if(url.pathname==='/present'&&key==='talera_menu'&&id==='hub')return true;
  // The already-approved home has shortcut URLs for year browsing and its
  // original sample memories. Do not invent a new timeline or open any API:
  // validate ONLY those literal existing first-party presentation selectors.
  if(url.pathname==='/present'&&key==='year')
    return /^\d{4}$/.test(id)&&Number(id)>=1900&&Number(id)<=new Date().getFullYear();
  if(url.pathname==='/present'&&key==='decade')
    return /^\d{4}$/.test(id)&&Number(id)>=1900&&Number(id)<=new Date().getFullYear()&&Number(id)%10===0;
  // Personal story topics are short user-entered labels, never code or an API route.
  if(url.pathname==='/present'&&key==='theme')
    return id.length>0&&id.length<=36&&id===id.trim()&&
      !/[\u0000-\u001f\u007f<>\\]/.test(id);
  if(url.pathname==='/present'&&key==='memory'&&/^\d{1,6}$/.test(id))
    return Number(id)>=1&&Number(id)<=100000;
  // The original local memory and editing routes retain their strict IDs.
  return ((url.pathname==='/mijn-leven'&&key==='published')||
      (url.pathname==='/tell'&&key==='edit')||
      (url.pathname==='/present'&&key==='memory'))&&LOCAL_STORY_ID.test(id);
}
// iPhone/embedded browsers may append passive link-open parameters.
// Canonicalize ONLY GETs for already-existing app pages; NEVER carry extra
// parameters into the signed-in page, account APIs, backup, or share routes.
// A functional page parameter must still pass the original exact route check.
function canonicalReferralUiPath(url,method){
  if(method!=='GET'||!PUBLIC_PAGES.has(url.pathname)||
     url.search.length>1536)return null;
  const pairs=[...url.searchParams.entries()];
  if(!pairs.length||pairs.length>12)return null;
  let functional=null,passive=0;
  const functionKeys=new Set(['talera_menu','published','edit','memory','year','decade','theme']);
  const reserved=/^(?:account|user|db|database|scope|story|file|redirect|return|return_url|next|url|token|code|key|auth|session|password|email|birthDate|state|callback|target|share|origin|id|path)$/i;
  for(const [key,value] of pairs){
    if(key.length>64||value.length>256||/[\u0000-\u001f\u007f]/.test(key+value))
      return null;
    if(functionKeys.has(key)){
      if(functional)return null; // No duplicates, no conflicting modes.
      functional=[key,value];
    }else{
      // Strip untrusted referral tags from the address before rendering.
      // Sensitive selectors are NOT permitted even when ignored by the UI.
      if(!/^[a-z_][a-z0-9_-]*$/i.test(key)||reserved.test(key)||
         key.startsWith('__'))return null;
      passive++;
    }
  }
  if(!passive)return null;
  if(!functional)return url.pathname;
  const canonical=new URL(url.pathname,url.origin);
  canonical.searchParams.set(functional[0],functional[1]);
  return allowedLocalUiSearch(canonical)?canonical.pathname+canonical.search:null;
}
const F5_BROWSER_CSP=[
  "default-src 'self' blob: data:",
  "base-uri 'self'","object-src 'none'","frame-ancestors 'none'",
  // Local IndexedDB media previews can use fetch(blob:...), never Cloudflare.
  "connect-src 'self' blob:","form-action 'self'",
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
// A normal Safari form POST may omit the Origin header. Protect its
// entry with a signed same-origin form challenge instead of relying on Origin
// always being present. Keep rejecting an explicitly foreign Origin.
const ENTRY_COOKIE='talera_f5_entry';
async function qaEntry(env){
  const expiry=String(Date.now()+10*60000);
  const nonce=Array.from(crypto.getRandomValues(new Uint8Array(16)),
    b=>b.toString(16).padStart(2,'0')).join('');
  const signed=expiry+'.'+nonce;
  const ticket=signed+'.'+await qaSignature(env,'qa-entry:'+signed);
  const html='<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>TALERA Free besloten test</title><body style="max-width:480px;margin:12vh auto;padding:24px;font-family:system-ui">'+
    '<h1>TALERA Free — beveiligde ontwikkeltoegang</h1><p>Deze ene Free-app is nog niet openbaar vrijgegeven. Registratie en aanmelden gebruiken het bestaande Free-accountsysteem.</p>'+
    '<form action="/__f5/entry" method="post">'+
    '<input type="hidden" name="csrf" value="'+ticket+'">'+
    '<label>Testtoegang <input type="password" name="key" autocomplete="off" required maxlength="64" style="display:block;width:100%;padding:12px;margin:12px 0"></label>'+
    '<button type="submit" style="padding:12px 20px">Open testversie</button></form></body></html>';
  return new Response(html,{status:200,headers:{
    'content-type':'text/html; charset=utf-8','cache-control':'private, no-store',
    'set-cookie':ENTRY_COOKIE+'='+ticket+
      '; HttpOnly; Secure; SameSite=Strict; Path=/__f5/entry; Max-Age=600',
    'x-content-type-options':'nosniff','referrer-policy':'no-referrer',
    'content-security-policy':F5_BROWSER_CSP
  }});
}
async function authorizeQaBrowser(request,env){
  // An explicitly foreign Origin/Fetch-Site is always rejected. Browser
  // privacy modes can omit Origin on a native HTML form; the signed
  // double-submit ticket independently prevents cross-site form forgery.
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)
    return deny(403,'Ongeldige herkomst');
  const fetchSite=request.headers.get('sec-fetch-site');
  if(fetchSite&&!['same-origin','none'].includes(fetchSite))
    return deny(403,'Ongeldige herkomst');
  const len=Number(request.headers.get('content-length')||0);
  if(len>1024)return deny(400,'Ongeldige testaanvraag');
  let form;
  try{form=await request.formData()}catch{return deny(400,'Ongeldige testaanvraag')}
  const ticket=form.get('csrf');
  const cookies=request.headers.get('cookie')||'';
  const matched=[...cookies.matchAll(/(?:^|;\s*)talera_f5_entry=(\d{13})\.([a-f0-9]{32})\.([a-f0-9]{64})(?=;|$)/g)];
  if(matched.length!==1||typeof ticket!=='string')
    return deny(403,'Open de testpagina opnieuw en probeer het nog eens');
  const [,expiry,nonce,signature]=matched[0];
  const expected=expiry+'.'+nonce+'.'+signature;
  const expires=Number(expiry),now=Date.now();
  if(!Number.isSafeInteger(expires)||expires<=now||expires>now+10*60000||
     ticket!==expected||
     !safeEqualHex(signature,await qaSignature(env,'qa-entry:'+expiry+'.'+nonce)))
    return deny(403,'Open de testpagina opnieuw en probeer het nog eens');
  const secret=form.get('key');
  if(!safeEqualHex(typeof secret==='string'?secret:'',env.STAGING_F5_KEY))
    return deny(403,'Toegangscode niet herkend. Controleer of deze in Cloudflare is opgeslagen.');
  const sessionExpiry=String(Date.now()+30*60000);
  const sessionNonce=[...crypto.getRandomValues(new Uint8Array(16))]
    .map(b=>b.toString(16).padStart(2,'0')).join('');
  const proof=await qaSignature(env,sessionExpiry+'.'+sessionNonce);
  const cookie=QA_COOKIE+'='+sessionExpiry+'.'+sessionNonce+'.'+proof+
    '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1800';
  const headers=new Headers({
    location:'/mijn-leven','cache-control':'private, no-store'
  });
  headers.append('set-cookie',cookie);
  headers.append('set-cookie',ENTRY_COOKIE+'=; HttpOnly; Secure; SameSite=Strict; Path=/__f5/entry; Max-Age=0');
  return new Response(null,{status:303,headers});
}
// One-click, short-lived *synthetic-only* access for the final iPhone test.
// The actual 256-bit invite is NOT in GitHub or the Worker. Only its SHA256
// fingerprint is configured. The URL uses a #fragment, so browser HTTP
// requests, referrers and Cloudflare logs never receive the invite from GET.
function easyEntryPage(){
  const html=`<!doctype html><html lang="nl"><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>TALERA Free – directe test</title>
  <body style="font:16px system-ui;max-width:500px;margin:12vh auto;padding:24px">
  <h2>TALERA Free</h2><p id="status" role="status">De beveiligde app wordt geopend…</p>
  <script>
  (async()=>{
    const status=document.getElementById('status');
    const invite=location.hash.slice(1);
    history.replaceState(null,'','/__f5/start');
    if(!/^[a-f0-9]{64}$/.test(invite)){
      status.textContent='Deze testlink is niet compleet. Open de volledige link uit de chat.';return;
    }
    try{
      const r=await fetch('/__f5/start',{method:'POST',
        credentials:'same-origin',cache:'no-store',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({invite})});
      const data=await r.json();
      if(!r.ok||!data.ok)throw Error(data.error||'De testversie kan niet worden geopend');
      location.replace('/mijn-leven');
    }catch(e){status.textContent=String(e.message||e)+
      '. Je hoeft niets in Cloudflare te wijzigen.';}
  })();
  </script></body></html>`;
  return new Response(html,{status:200,headers:{
    'content-type':'text/html; charset=utf-8','cache-control':'no-store',
    'x-content-type-options':'nosniff',
    'referrer-policy':'no-referrer',
    'content-security-policy':F5_BROWSER_CSP
  }});
}
async function easyStart(request,env){
  const expected=env.F5_EASY_INVITE_SHA256||'';
  const deadline=Number(env.F5_EASY_INVITE_EXPIRES||0);
  if(!HEX64.test(expected)||!Number.isSafeInteger(deadline)||Date.now()>deadline)
    return deny(410,'Deze tijdelijke testlink is verlopen');
  const source=new URL(request.url).origin;
  const origin=request.headers.get('origin');
  if(origin&&origin!==source)return deny(403,'Ongeldige herkomst');
  const site=request.headers.get('sec-fetch-site');
  if(site&&site!=='same-origin'&&site!=='none')
    return deny(403,'Ongeldige herkomst');
  if(!/application\/json/i.test(request.headers.get('content-type')||''))
    return deny(415,'Verkeerd berichtformaat');
  if(Number(request.headers.get('content-length')||0)>300)
    return deny(413,'Aanvraag te groot');
  let provided;
  try{provided=(await body(request.clone())).invite}catch{return deny(400,'Ongeldige aanvraag')}
  if(!HEX64.test(provided)||!safeEqualHex(await shaHex(provided),expected))
    return deny(403,'Deze testlink is niet geldig');
  // Access invitation is NOT identity registration. It must never create a
  // fictitious account or replace an existing real/synthetic session.
  // A signed-out owner can now use the original registration/login UI and
  // the SAME Free AUTH_ACCOUNTS/EMAILS/HANDLES/SESSIONS namespaces.
  const existing=await sessionAccount(request,env);
  const expiry=String(Date.now()+30*60000);
  const nonce=Array.from(crypto.getRandomValues(new Uint8Array(16)),
    b=>b.toString(16).padStart(2,'0')).join('');
  const signature=await qaSignature(env,expiry+'.'+nonce);
  const cookie=QA_COOKIE+'='+expiry+'.'+nonce+'.'+signature+
    '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1800';
  const resultHeaders=new Headers({
    'content-type':'application/json; charset=utf-8','cache-control':'no-store',
    'x-content-type-options':'nosniff'
  });
  resultHeaders.append('set-cookie',cookie);
  return new Response(JSON.stringify({ok:true,next:'/mijn-leven',
    accessGranted:true,reusedExistingSession:!!existing,
    accountCreated:false}),{status:200,headers:resultHeaders});
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
// The original 'Mijn TALERA' menu always loads /api/discovery after sign-in.
// Read-only identity metadata is required just to open the account/settings
// screen. We must not falsely enable discoverability before search and privacy
// permissions are actually backed by a verified account index.
async function discoveryApi(request,env){
  const actor=await sessionAccount(request,env);
  if(!actor)return deny(401,'Aanmelden vereist');
  if(request.method!=='GET')
    return deny(409,'Vindbaarheid is nog niet beschikbaar in deze Free-test');
  return json({publicHandle:actor.publicHandle||'',discoverable:false});
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
  const response=await socialPilot.fetch(new Request(request,{headers}),env);
  // Every successful social mutation is first authorized and persisted by
  // SOCIAL_MEMORY. Index only metadata after success in the EXISTING owner DO.
  // Re-read the social DO for actual grants/revocation when listing.
  if(actor&&request.method==='POST'&&response.ok){
    const match=/^\/__social\/memory\/([A-Za-z0-9_-]{8,80})\/(init|share)$/
      .exec(new URL(request.url).pathname);
    if(match){
      const [,storyId,operation]=match,account=accountHome(env,actor.id);
      if(operation==='init'){
        await account.rememberSocialStory(storyId);
      }else{
        const data=await response.clone().json();
        const token=/^\/__social\/shared\/([a-f0-9]{64})$/.exec(data.link||'')?.[1];
        if(!token)throw Error('INVALID_SOCIAL_SHARE_RESPONSE');
        const hash=await shaHex(token);
        try{await account.rememberSocialStory(storyId);
          await account.rememberSocialShare(hash,storyId)}
        catch(e){
          // No successful-looking unindexed link may remain active after
          // partial index failure; attempt to withdraw this synthetic link.
          try{await socialMemoryHome(env,storyId).revokeShare(actor.id,hash)}catch{}
          throw e;
        }
      }
    }
  }
  return response;
}
// The social index stores only story IDs inside the same account DO; it is
// NOT a second story database and is never the authority for access rights.
function socialMemoryHome(env,storyId){
  if(!/^[A-Za-z0-9_-]{8,80}$/.test(storyId))
    throw Error('INVALID_SOCIAL_STORY');
  const binding=env.SOCIAL_MEMORY;
  if(!binding?.get||!binding?.idFromName)throw Error('MISSING_SOCIAL_NAMESPACE');
  const place=env.SOCIAL_STORAGE_JURISDICTION==='eu'?binding.jurisdiction('eu'):
    env.SOCIAL_STORAGE_JURISDICTION==='local-test'?binding:null;
  if(!place)throw Error('SOCIAL_JURISDICTION_NOT_EXPLICIT');
  return place.get(place.idFromName('talera-free-social-v1:'+storyId));
}
async function accountSocialLists(request,env){
  if(request.method!=='GET')return deny(405,'Methode niet toegestaan');
  const actor=await sessionAccount(request,env);
  if(!actor)return deny(401,'Aanmelden vereist');
  const p=new URL(request.url).pathname;
  const ids=await accountHome(env,actor.id).socialStoryIds();
  if(!Array.isArray(ids)||ids.length>10000)throw Error('INVALID_SOCIAL_OWNER_INDEX');
  const result=[];
  // Bound fan-out: one social DO per actual shared story, no global index.
  for(let start=0;start<ids.length;start+=20){
    const overviews=await Promise.all(ids.slice(start,start+20).map(
      id=>socialMemoryHome(env,id).ownerOverview(actor.id)));
    for(const info of overviews){
      if(p==='/api/shares'){
        for(const entry of info.shares)result.push({
          id:entry.token_hash,memory_id:info.storyId,
          expires_at:Number(entry.expires_at),
          revoked_at:entry.revoked_at===null?null:Number(entry.revoked_at)
        });
      }else{
        for(const entry of info.grants){
          if(entry.revoked_at!==null)continue;
          const profile=await accountHome(env,entry.recipient_id).getProfile();
          result.push({memory_id:info.storyId,
            recipient_account_id:entry.recipient_id,
            recipient_name:profile?.displayName||'een gebruiker'});
        }
      }
    }
  }
  return json({items:result});
}
async function revokeAccountShare(request,env,shareHash){
  if(request.method!=='POST'&&request.method!=='DELETE')
    return deny(405,'Methode niet toegestaan');
  if(!sameOrigin(request))return deny(403,'Ongeldige herkomst');
  const actor=await sessionAccount(request,env);
  if(!actor)return deny(401,'Aanmelden vereist');
  const home=accountHome(env,actor.id),storyId=await home.socialShareStory(shareHash);
  if(!storyId)return deny(404,'Deze deellink is niet van dit account');
  const result=await socialMemoryHome(env,storyId).revokeShare(actor.id,shareHash);
  return json(result,result.ok?200:404);
}
// Revoking an EXISTING direct grant is safe and does not publish local
// photos/stories. Creating cross-device access remains deliberately gated
// until its actual recipient media flow can be proven end-to-end.
async function revokeAccountGrant(request,env,storyId,recipientId){
  if(request.method!=='POST')return deny(405,'Methode niet toegestaan');
  if(!sameOrigin(request))return deny(403,'Ongeldige herkomst');
  const actor=await sessionAccount(request,env);
  if(!actor)return deny(401,'Aanmelden vereist');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipientId||''))
    return deny(400,'Ongeldige ontvanger');
  const ids=await accountHome(env,actor.id).socialStoryIds();
  if(!ids.includes(storyId))return deny(404,'Deze herinnering hoort niet bij dit account');
  if(Number(request.headers.get('content-length')||0)>4096)
    return deny(413,'Aanvraag te groot');
  // The original approved menu posts {} and puts the recipient in the path.
  // No new grant or cloud media is created by this revocation.
  const result=await socialMemoryHome(env,storyId).revokeGrant(actor.id,recipientId);
  return json(result,result.ok?200:409);
}
async function publicPage(request,env){
  const pathname=new URL(request.url).pathname,origin=new URL(request.url).origin;
  // Notifications is an existing tab in the approved Home markup/CSS.
  // Reuse its EXACT Home shell; the original route-aware JS selects the tab.
  const homeScreen=pathname==='/mijn-leven'||pathname==='/meldingen';
  const sourcePath=pathname==='/meldingen'?'/mijn-leven':pathname;
  if(!env.ASSETS)return deny(503,'PWA-bestanden niet beschikbaar');
  const sessionToken=readSessionCookie(request);
  const actor=sessionToken?await sessionAccount(request,env):null;
  if(actor){
    // Only a verified current account may load its private date and local
    // account-scoped storage. An expired cookie instead gets the sign-in UI.
    const date=await accountHome(env,actor.id).getBirthDate();
    if((homeScreen||pathname==='/present')&&!date)
      return deny(503,'Geboortedatum ontbreekt; persoonlijke tijdlijn kan niet worden getoond');
    const originalRef=referencePages[sourcePath];
    if(!originalRef)return deny(503,'Originele PWA-bron ontbreekt');
    const response=await env.ASSETS.fetch(new Request(new URL(originalRef,origin)));
    if(!response.ok)return deny(503,'PWA-bron niet bereikbaar');
    const original=await response.text();
    const privateHtml=homeScreen?personalizeHome(original,date):
      pathname==='/present'?personalizePresent(original,date):original;
    // Refuse to show a wrong or default timeline if source markers changed.
    if((homeScreen||pathname==='/present')&&privateHtml===original)
      return deny(503,'De persoonlijke tijdlijn kon niet veilig worden gemaakt');
    // Isolate *local* originals, audio, video, photo and cue records by
    // verified account, without changing recorder, swipe or presentation logic.
    // If the upstream memory-store script ever changes, fail closed.
    const scoped=scopeLocalMemories(privateHtml,await privateAccountScope(actor.id));
    // Locked WhatsApp design-cleanup baseline: no visible UI or presentation
    // amendments. Only server-verified private local storage and saved cue
    // media-ID reconciliation may rewrite the original approved markup.
    const stableEditedCues=pathname==='/tell'?alignEditedNarrationCueRefs(scoped):scoped;
    // Keep the editor's preview silent from the FIRST frame, even before
    // the record panel is visible. The original present/player video round
    // with sound after narration is untouched.
    const silenced=pathname==='/tell'?muteEditorOnlyVideo(stableEditedCues):stableEditedCues;
    const threeTabHome=homeScreen?evenlySpaceThreeHomeTabs(silenced):silenced;
    const converted=await assetizeHtml(threeTabHome,new Set(approvedAssets));
    const storyEntryHtml=hideUnselectedEntryPhoto(converted.html,request.url);
    return new Response(storyEntryHtml,{
      status:200,headers:{
        'content-type':'text/html; charset=utf-8','cache-control':'private, no-store',
        'x-content-type-options':'nosniff','x-talera-free-f5':'personalized-durable-account',
        'content-security-policy':F5_BROWSER_CSP
      }
    });
  }
  const asset=anonymousShells[sourcePath];
  if(!asset)return deny(503,'Anonieme PWA-shell ontbreekt');
  const r=await env.ASSETS.fetch(new Request(new URL(asset,origin)));
  if(!r.ok)return deny(503,'Anonieme PWA-shell is niet beschikbaar');
  const headers=new Headers(r.headers);
  for(const key of ['content-length','etag','content-encoding','cf-cache-status','age'])headers.delete(key);
  headers.set('cache-control','private, no-store');
  headers.set('x-talera-free-f5','anonymous-snapshot-only');
  headers.set('content-security-policy',F5_BROWSER_CSP);
  headers.set('x-content-type-options','nosniff');
  if(sessionToken&&!actor)headers.set('set-cookie',sessionCookie('',0));
  if(homeScreen){
    // Logged-out Home and its existing Notifications tab share the same bar.
    return new Response(evenlySpaceThreeHomeTabs(await r.text()),{status:200,headers});
  }
  if(pathname==='/present')
    return new Response(hideUnselectedEntryPhoto(await r.text(),request.url),{status:200,headers});
  return new Response(r.body,{status:200,headers});
}
// Strictly session-bound, same-origin, NO personal-media network endpoint.
// This is opt-in and separate from every approved TALERA screen. It is built
// only in the isolated branch; do not deploy to existing F5 QA without approval.
async function privateBackupPage(request,env){
 const actor=await sessionAccount(request,env);
 if(!actor)return deny(401,'Aanmelden vereist voor lokale back-up');
 const scope=await privateAccountScope(actor.id);
 const name='talera-free-local-'+scope.slice(0,32)+'-v1';
 return new Response(localBackupPage(name),{status:200,headers:{
  'content-type':'text/html; charset=utf-8',
  'cache-control':'private, no-store','x-content-type-options':'nosniff',
  'referrer-policy':'no-referrer','content-security-policy':F5_BROWSER_CSP
 }});
}
async function privateBackupModule(request,env,pathname){
 const actor=await sessionAccount(request,env);
 if(!actor)return deny(401,'Aanmelden vereist voor back-upcode');
 if(!env.ASSETS)return deny(503,'Back-upcode niet beschikbaar');
 const asset='/__talera_free/f5backup/'+BACKUP_MODULES[pathname];
 const res=await env.ASSETS.fetch(new Request(new URL(asset,request.url)));
 if(!res.ok)return deny(503,'Back-upcode ontbreekt');
 return new Response(res.body,{status:200,headers:{
  'content-type':'text/javascript; charset=utf-8',
  'cache-control':'private, no-store','x-content-type-options':'nosniff',
  'referrer-policy':'no-referrer','content-security-policy':F5_BROWSER_CSP
 }});
}
// The original narrator/video player is an isolated SAME-ORIGIN iframe,
// not another photo stage. Both /tell and /present reference this URL.
// Authentication, QA, MIME and framing are explicit; DO/media never leaves
// the account's own browser; absolutely no live TALERA backend fallback.
async function privateEmbeddedPlayer(request,env){
  const url=new URL(request.url);
  const params=[...url.searchParams.entries()];
  if(request.method!=='GET'||params.length!==1||
    params[0][0]!=='mode'||!['present','record'].includes(params[0][1]))
    return deny(404,'Ongeldige afspeelroute');
  const actor=await sessionAccount(request,env);
  if(!actor)return deny(401,'Sessie verlopen; meld je opnieuw aan');
  const reference=referencePages['/vertelmodus-embed'];
  if(!reference||!env.ASSETS)return deny(503,'Originele afspeelfunctie ontbreekt');
  const r=await env.ASSETS.fetch(new Request(new URL(reference,url.origin)));
  if(!r.ok)return deny(503,'Originele afspeelfunctie niet bereikbaar');
  const source=await r.text();
  if(!source.includes('taleraZero')||!source.includes('postMessage'))
    return deny(503,'Originele afspeelbron niet geverifieerd');
  // The top-level app pages are unframeable; this ONE authenticated
  // same-origin player MUST permit framing or iPhone keeps its first image.
  const csp=F5_BROWSER_CSP.replace("frame-ancestors 'none'",
    "frame-ancestors 'self'");
  return new Response(source,{status:200,headers:{
    'content-type':'text/html; charset=utf-8',
    'cache-control':'private, no-store',
    'x-content-type-options':'nosniff',
    'x-frame-options':'SAMEORIGIN',
    'referrer-policy':'same-origin',
    'content-security-policy':csp,
    'x-talera-free-f5':'original-iframe-zero-player'
  }});
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
      return json({ok:true,stage:'Free-continuous-acceptance',closedQa:false,
        personalRegistrationPilot:true,realAccountsCertified:false,
        officialTaleraConnected:false,loggedInPwaCertified:false,tenMillionProven:false});
    // Internal backing bindings remain private; only normal account sessions
    // authorize personal content. Retain missing-secret fail-closed checks.
    if(!HEX64.test(env.STAGING_F5_KEY||'')||
       !HEX64.test(env.STAGING_ACCESS_KEY||'')||
       !HEX64.test(env.STAGING_SOCIAL_KEY||'')||
       typeof env.AUTH_NAMESPACE_KEY!=='string'||env.AUTH_NAMESPACE_KEY.length<40||
       typeof env.DEMO_IDENTITY_KEY!=='string'||env.DEMO_IDENTITY_KEY.length<40)
      return deny(503,'F5-testomgeving niet correct ingericht');
    // Legacy private invitation paths are retired, not another app/version.
    // Users arrive by the single normal app URL and authenticate themselves.
    if(p==='/__f5/start'||p==='/__f5/entry'){
      if(m!=='GET')return deny(410,'Deze tijdelijke uitnodiging wordt niet meer gebruikt');
      return new Response(null,{status:302,headers:{
        location:'/mijn-leven','cache-control':'no-store'
      }});
    }
    if(m==='GET'&&PUBLIC_INSTALL_ICON_PATHS.has(p))
      return publicPwaSupport(request,env);
    // Preserve the ALREADY iPhone-approved 9-November original back route.
    // It must never regress when the separate local-backup branch is merged.
    if(p==='/'&&m==='GET'&&!url.search)
      return new Response(null,{status:302,headers:{
        location:'/mijn-leven','cache-control':'private, no-store',
        'x-content-type-options':'nosniff'
      }});
    // Private pages, memories and backup require the real account session.
    // Some iPhone in-app browsers append harmless link-opening query tags.
    // They must not prevent the standalone backup page from opening. Ignore
    // such tags: the private database name is ALWAYS derived from session
    // identity, never from the URL. Explicit data selectors still fail closed.
    if(p==='/__f5/backup'&&m==='GET'){
      if(url.search.length>2048||
         [...url.searchParams.keys()].some(k=>/^(?:db|database|scope|account|user|target|story|file|redirect|url|token)$/i.test(k)))
        return deny(404,'Niet gevonden');
      return privateBackupPage(request,env);
    }
    if(Object.hasOwn(BACKUP_MODULES,p)&&m==='GET'&&!url.search)
      return privateBackupModule(request,env,p);
    // Exact original embedded player route is allowed before the normal
    // strict search-param gate, which intentionally covers only top pages.
    if(p==='/vertelmodus-embed')return privateEmbeddedPlayer(request,env);
    if(url.search&&!allowedLocalUiSearch(url)&&!allowedVersionCheck(url,m)){
      const canonical=canonicalReferralUiPath(url,m);
      if(!canonical)return deny(404,'Niet gevonden');
      return new Response(null,{status:302,headers:{
        location:canonical,'cache-control':'private, no-store',
        'x-content-type-options':'nosniff','referrer-policy':'no-referrer'
      }});
    }
    try{
      // Original app periodically asks for its own version. Answer on this
      // isolated origin; never proxy to the old customer/production Worker.
      if(p==='/api/version'&&m==='GET')return json({version:APPROVED_UI_VERSION});
      if(AUTH_PATHS.has(p))return accountApi(request,env);
      if(p==='/api/profile/birthdate')return birthdateApi(request,env);
      if(p==='/api/discovery')return discoveryApi(request,env);
      // The original menu consumes local IndexedDB for /api/memories;
      // a network request can never retrieve Free originals from this Worker.
      if(p==='/api/memories'){
        const actor=await sessionAccount(request,env);
        return actor?deny(409,'Herinneringen staan alleen lokaal op je telefoon'):
          deny(401,'Aanmelden vereist');
      }
      if(p==='/api/shares'||p==='/api/my-grants')
        return accountSocialLists(request,env);
      const revoke=/^\/api\/shares\/([a-f0-9]{64})(?:\/revoke)?$/.exec(p);
      if(revoke)return revokeAccountShare(request,env,revoke[1]);
      const grantRevoke=/^\/api\/memories\/([A-Za-z0-9_-]{8,80})\/grants\/([0-9a-fA-F-]{36})\/revoke$/.exec(p);
      if(grantRevoke)return revokeAccountGrant(request,env,grantRevoke[1],grantRevoke[2]);
      if(p.startsWith('/__social/'))return socialApi(request,env);
      // The original decade shortcut linked to ?decade=N, but the existing
      // presentation only has a working ?year=N selector. Reuse that approved
      // year navigation at the centre of the chosen decade; no second player.
      if(p==='/present'&&m==='GET'&&url.searchParams.size===1&&
         url.searchParams.has('decade')&&allowedLocalUiSearch(url)){
        const year=Math.min(Number(url.searchParams.get('decade'))+5,new Date().getFullYear());
        return new Response(null,{status:302,headers:{
          location:'/present?year='+year,'cache-control':'private, no-store'
        }});
      }
      // The V25 design retired Gedeeld in favor of the existing Meldingen tab.
      if(p==='/gedeeld'&&m==='GET'&&!url.search)
        return new Response(null,{status:302,headers:{location:'/meldingen','cache-control':'no-store'}});
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
