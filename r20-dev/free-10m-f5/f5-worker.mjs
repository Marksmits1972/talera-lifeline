// TALERA Free F5 - ONE continuous Free acceptance candidate, not a public release approval.
// Normal user registration and login control all personal data; no invitation
// code, temporary browser gate, or automatic account creation is required.
// There is intentionally NO TALERA_BASE, D1, R2 or existing customer binding.
import authPilot from '../free-10m-auth-pilot/auth-pilot-worker.mjs';
import {capturePlaceApi} from './f5-geonames.mjs';
import {passwordResetPage} from './f5-password-reset-page.mjs';
import socialPilot from '../free-10m-social-do/social-worker.mjs';
import {
  readSessionCookie,sessionCookie,shaHex,safeEqualHex,json,sameOrigin,body
} from '../free-10m-auth-pilot/auth-util.mjs';
import {validatedDate} from '../free-10m-delivery/free-account-router.mjs';
import {approvedAssets,anonymousShells} from '../free-10m-delivery/generated/approved-assets.mjs';
import {assetizeHtml} from '../free-10m-delivery/rewrite.mjs';
import {personalizeHome,personalizePresent} from '../free-10m-delivery/free-birthdate-worker.mjs';
import {referencePages,guestPages,verifiedPublicScripts,verifiedPublicSupport} from './generated/public-template-map.mjs';
import {privateAccountScope,scopeLocalMemories} from './f5-local-scope.mjs';
import {alignEditedNarrationCueRefs} from './f5-edit-cue-rebind.mjs';
import {retainEditorCanonicalMediaIds} from './f5-editor-canonical-refs.mjs';
import {preserveOriginalMediaIdsOnEdit} from './f5-library-editor-stable-save.mjs';
import {muteEditorOnlyVideo} from './f5-editor-video-mute-guard.mjs';
import {localBackupPage} from './f5-local-backup-page.mjs';
import {renderOriginalTaleraShare,renderTaleraLanding,guestClientScript} from './f5-guest-experience.mjs';

export {
  FreeAuthAccount,FreeAuthEmail,FreeAuthHandle,FreeAuthSession,FreeAuthRate
} from '../free-10m-auth-pilot/auth-objects.mjs';
export {
  FreeSocialMemory,FreeSocialSharePointer
} from '../free-10m-social-do/social-objects.mjs';

// One owner-requested, hard-to-guess action URL on the SAME Home shell.
const OWNER_PURGE_PATH='/mijn-leven/opschonen-cfd3450b58ef9410b64a26cc84c2045c';
const PUBLIC_PAGES=new Set(['/mijn-leven','/meldingen','/present','/tell',OWNER_PURGE_PATH]);
 // Offline provision only from an authenticated SAME TALERA page. The worker
 // checks the HttpOnly account session itself: no identity, media or secret
 // travels in a postMessage or moves into a second library.
 const OFFLINE_PREPARE_SNIPPET="<script id=\"talera-f5-offline-prep-v1\">(function(){if(!('serviceWorker' in navigator))return;function prepare(){navigator.serviceWorker.ready.then(function(r){r.active?.postMessage({type:'TALERA_OFFLINE_PREPARE_V1'})}).catch(function(){})}navigator.serviceWorker.addEventListener('controllerchange',prepare);prepare()})();</script>";
 function scheduleVerifiedOfflineShell(html){
  if(typeof html!=='string'||html.split('</head>').length!==2||
     html.includes('talera-f5-offline-prep-v1'))
   throw Error('TALERA_OFFLINE_VERIFIED_HEAD_CHANGED');
  return html.replace('</head>',OFFLINE_PREPARE_SNIPPET+'</head>');
 }
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
// Prevent the OLD Home photo or narration from remaining painted while iOS
// fetches the ORIGINAL More/menu destination. The earlier destination-only
// guard did not cover this outgoing frame (observed on the real iPhone).
// This touches only the existing #navMore link on /mijn-leven, with exactly
// its approved href. Nothing changes about the regular presentation/player.
function shieldHomeWhileOpeningExistingMenu(html,requestUrl){
 const url=new URL(requestUrl);
 if(url.pathname!=='/mijn-leven'||url.search)return html;
 if(typeof html!=='string'||html.split('<head>').length!==2||
    !html.includes('id="navMore"')||
    !html.includes('/present?talera_menu=hub'))
   throw Error('TALERA_HOME_MORE_OUTGOING_SOURCE_DRIFT');
 const early=String.raw`(function(){
   const target='/present?talera_menu=hub';
   const root=document.documentElement;
   const cssClass='talera-f5-home-leaving-for-original-menu';
   window.addEventListener('pageshow',()=>root.classList.remove(cssClass));
   document.addEventListener('click',event=>{
     if(event.defaultPrevented||event.button!==0||event.metaKey||
        event.ctrlKey||event.shiftKey||event.altKey)return;
     const link=event.target?.closest?.('a#navMore');
     if(!link||link.getAttribute('href')!==target)return;
     // Reuse the SAME approved account menu already mounted on Home.
     // Its original open/render/back/close handlers and local account state
     // remain responsible; never navigate through the presentation engine.
     // Keep the original URL as a safe fallback when its module is unavailable.
     event.preventDefault();
     const native=()=>{
       const controller=window.__taleraMoreMenu;
       if(!controller?.ready||typeof controller.open!=='function'||
          !document.getElementById('talera-more-menu'))return false;
       controller.open('hub');
       return true;
     };
     if(native())return;
     let attempts=0;
     const tryOnceReady=()=>{
       if(native())return;
       if(++attempts<12){setTimeout(tryOnceReady,20);return}
       // The fallback retains the previously iPhone-proven no-photo-flash
       // protection if the approved menu script could not initialize.
       root.classList.add(cssClass);
       let gone=false;
       let fallback;
       const enter=()=>{
         if(gone)return;gone=true;clearTimeout(fallback);
         window.location.assign(target);
       };
       fallback=setTimeout(enter,650);
       requestAnimationFrame(()=>requestAnimationFrame(enter));
     };
     tryOnceReady();
   },true);
 })();`;
 const mask='<style id="talera-f5-home-outgoing-menu-mask">'+
   'html.talera-f5-home-leaving-for-original-menu{background:#f7f5f0!important}'+
   'html.talera-f5-home-leaving-for-original-menu body{visibility:hidden!important}'+
   '</style>';
 const script='<script id="talera-f5-home-outgoing-menu-nav">'+early+'</script>';
 // This is the original /present account-menu module, not a copied menu,
 // player, new route, new app or account binding. ES modules run after HTML
 // parsing, so its existing DOM bootstrap sees the real Home document.
 const nativeMenu='<script id="talera-f5-home-original-menu-module" type="module" src="/__clean/menu-integration.mjs"></script>';
 return html.replace('<head>','<head>'+mask+script+nativeMenu);
}

// The APPROVED Home "Meer" navigates to /present?talera_menu=hub.
// Before the original account menu mounts, the original presentation may
// briefly paint a selected photo/video/narrator. Mask ONLY that intermediate
// first paint, never the menu or the ordinary /present engine. Preserve the
// same original menu DOM, route, click handlers, account and local media.
function preventHomeMenuPresentationFlash(html,requestUrl){
 const url=new URL(requestUrl);
 if(url.pathname!=='/present'||url.search!=='?talera_menu=hub')return html;
 if(typeof html!=='string'||html.split('<head>').length!==2||
    !html.includes('id="photoStage"')||!html.includes('</head>'))
   throw Error('TALERA_ORIGINAL_HOME_MENU_ENTRY_SOURCE_DRIFT');
 const early=String.raw`(function(){
   const root=document.documentElement;
   root.classList.add('talera-hub-menu-booting');
   let observer=null;
   const finish=()=>{
     root.classList.remove('talera-hub-menu-booting');
     if(observer)observer.disconnect();
     clearTimeout(fallback);
   };
   const check=()=>{
     const menu=document.getElementById('talera-more-menu');
     // The ORIGINAL menu now owns the screen; reveal body and preserve its
     // existing close/back behavior, without touching the presentation.
     if(menu&&!menu.hidden&&menu.getBoundingClientRect().width>0)finish();
   };
   observer=new MutationObserver(check);
   observer.observe(document,{childList:true,subtree:true,attributes:true,
     attributeFilter:['hidden','class','style']});
   const fallback=setTimeout(finish,8000); // Never strand the app if menu fails.
   document.addEventListener('DOMContentLoaded',check,{once:true});
   check();
   window.addEventListener('pagehide',()=>{observer.disconnect();clearTimeout(fallback)},
     {once:true});
 })();`;
 const markup='<script id="talera-f5-menu-entry-before-paint">'+early+'</script>'+
  '<style id="talera-f5-menu-entry-no-presentation-flash">'+
  'html.talera-hub-menu-booting{background:#f7f5f0!important}'+
  'html.talera-hub-menu-booting body{visibility:hidden!important}'+
  '</style>';
 return html.replace('<head>','<head>'+markup);
}

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
   const isTarget=m=>m&&(
     String(m.storyId||'')===requested ||
     String(m.id)==='pwa:'+requested ||
     String(m.id)===requested
   );
   let poll=0,settling=false;
   const photoReady=m=>{
     if(m._photoLoading)return false;
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
   };
   const tick=()=>{
     const m=window.__taleraTimelineRuntime?.currentMemory?.();
     if(!isTarget(m)||!photoReady(m)||settling)return;
     settling=true;
     // Retain the original two-frame anti-flash handoff. On WebKit, a
     // first local video may start while the nested rAF callback is delayed
     // or suppressed, leaving a fully loaded own image/video HIDDEN.
     // Fallback only after isTarget + decoded photoReady have succeeded.
     const finish=()=>{
       settling=false;
       reveal();
     };
     requestAnimationFrame(()=>requestAnimationFrame(finish));
     setTimeout(finish,180);
   };
   poll=setInterval(tick,40);
   tick();
   window.addEventListener('pagehide',()=>clearInterval(poll),{once:true});
 })();`;
 const markup='<script id="talera-direct-memory-entry-guard">'+js+'</script>'+
  '<style id="talera-direct-memory-entry-style">'+
  'html.talera-direct-memory-entering #photoStage,'+
  'html.talera-direct-memory-entering #memoryCaption{visibility:hidden!important}'+
  '</style>';
 return html.replace('<head>','<head>'+markup);
}

const AUTH_PATHS=new Set(['/api/register','/api/login','/api/logout','/api/me','/api/profile',
 '/api/password-reset/request','/api/password-reset/confirm']);
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
 '/__f5/f5-library-persistence.mjs':'f5-library-persistence.mjs',
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
  // Owner explicitly chose to purge locally saved stories on the SAME device.
  // No ordinary page request is destructive. The account store is never
  // selected by URL: only the browser's existing local TaleraMemories store.
  if(url.pathname==='/mijn-leven'&&key==='wis-alle-verhalen'&&id==='nu')return true;

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
// The original, iPhone-approved WhatsApp sheet already calls these exact
// routes. Implement them within the SAME authenticated F5 Worker using the
// EXISTING EU per-memory social DO, never another app or global story store.
// The local Free library and original media never leave the device except
// for a specific, consented, short-lived share snapshot.
const FREE_SHARE_ID=/^[A-Za-z0-9_.:-]{8,160}$/;
const FREE_SHARE_TOKEN=/^[a-f0-9]{64}$/;
async function scopedShareId(accountId,localMemoryId){
 if(!FREE_SHARE_ID.test(localMemoryId||''))throw Error('INVALID_LOCAL_SHARE_ID');
 return shaHex('talera-free-whatsapp-v1:'+accountId+':'+localMemoryId);
}
// Reversible compact spelling of the EXISTING cryptographically-random
// 256-bit share token. No shortened capability, no database, no new origin.
// Old /__social/shared/<hex> URLs continue to work and revoke unchanged.
function compactWhatsAppToken(hex){
 if(!/^[a-f0-9]{64}$/.test(hex))throw Error('INVALID_SHARE_TOKEN');
 const binary=String.fromCharCode(...(hex.match(/../g)||[]).map(h=>parseInt(h,16)));
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function expandWhatsAppToken(short){
 if(!/^[A-Za-z0-9_-]{43}$/.test(short||''))return null;
 try{
  const binary=atob(short.replace(/-/g,'+').replace(/_/g,'/')+'=');
  const hex=Array.from(binary,c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('');
  return compactWhatsAppToken(hex)===short?hex:null;
 }catch{return null}
}
async function legacyShareApi(request,env){
 const u=new URL(request.url),p=u.pathname,m=request.method;
 const actor=await sessionAccount(request,env);
 if(!actor)return deny(401,'Aanmelden vereist');
 if(m!=='GET'&&!sameOrigin(request))return deny(403,'Ongeldige herkomst');
 const link=/^\/api\/pwa\/memory-link$/.test(p);
 if(link){
  let local;
  if(m==='GET'){
   if(u.searchParams.size!==1)return deny(400,'Ongeldige zoekopdracht');
   local=u.searchParams.get('localMemoryId');
   if(!FREE_SHARE_ID.test(local||''))return deny(400,'Ongeldige herinnering');
   const id=await scopedShareId(actor.id,local);
   try{
    const state=await socialMemoryHome(env,id).readyShare(actor.id);
    return state.ready?json({memoryId:id}):deny(404,'Niet gevonden');
   }catch{return deny(404,'Niet gevonden')}
  }
  if(m!=='POST')return deny(405,'Methode niet toegestaan');
  if(Number(request.headers.get('content-length')||0)>16500)
   return deny(413,'Herinnering te groot om te delen');
  const raw=await request.text();
  if(raw.length>16500)return deny(413,'Herinnering te groot om te delen');
  let info;
  try{info=JSON.parse(raw)}catch{return deny(400,'Ongeldige aanvraag')}
  if(!info||info.consent!==true||!FREE_SHARE_ID.test(info.localMemoryId||''))
   return deny(400,'Toestemming of herinnering ontbreekt');
  local=info.localMemoryId;
  const id=await scopedShareId(actor.id,local);
  const home=socialMemoryHome(env,id);
  const initial=await home.initialize(id,actor.id);
  if(!initial.ok)return deny(409,'Herinnering is niet van dit account');
  try{
   await home.stageShare(actor.id,{title:info.title,storyText:info.storyText,
     eventDate:info.eventDate||''});
  }catch{return deny(400,'Deeltekst of datum is niet geldig')}
  await accountHome(env,actor.id).rememberSocialStory(id);
  return json({memoryId:id});
 }
 const create=/^\/api\/memories\/([a-f0-9]{64})\/shares$/.exec(p);
 if(create){
  if(m!=='POST')return deny(405,'Methode niet toegestaan');
  if(Number(request.headers.get('content-length')||0)>1000)
   return deny(413,'Aanvraag te groot');
  let payload;
  try{const raw=await request.text();if(raw.length>1000)throw Error();
    payload=JSON.parse(raw)}catch{return deny(400,'Ongeldige aanvraag')}
  if(!payload||payload.consent!==true||![1,24,168,720].includes(Number(payload.hours)))
   return deny(400,'Toestemming of geldigheidsduur ontbreekt');
  const home=socialMemoryHome(env,create[1]);
  let ready;
  try{ready=await home.readyShare(actor.id)}catch{return deny(403,'Geen eigendom van herinnering')}
  if(!ready.ready)return deny(409,'Deelvoorbereiding verlopen; probeer opnieuw');
  const forward=new URL('/__social/memory/'+create[1]+'/share',u);
  const headers=new Headers(request.headers);
  headers.set('content-type','application/json');
  const forwarded=new Request(forward,{method:'POST',headers,
    body:JSON.stringify({mode:'whatsapp',hours:Number(payload.hours)})});
  const response=await socialApi(forwarded,env);
  if(!response.ok)return response;
  const d=await response.json();
  const token=/^\/__social\/shared\/([a-f0-9]{64})$/.exec(d.link||'')?.[1];
  if(!token)return deny(503,'Deellink kon niet veilig worden aangemaakt');
  return json({id:token,link:u.origin+'/s/'+compactWhatsAppToken(token),expiresAt:d.expiresAt});
 }
 const upload=/^\/api\/shares\/([a-f0-9]{64})\/(photo|photo-full|audio|video)$/.exec(p);
 if(upload){
  if(m!=='POST')return deny(405,'Methode niet toegestaan');
  const bytesHint=Number(request.headers.get('content-length')||0);
  if(bytesHint>1800000)return deny(413,'Media te groot voor veilige tijdelijke deelopslag');
  const hash=await shaHex(upload[1]);
  const storyId=await accountHome(env,actor.id).socialShareStory(hash);
  if(!storyId)return deny(403,'Deze deellink hoort niet bij dit account');
  const bytes=new Uint8Array(await request.arrayBuffer());
  if(!bytes.byteLength||bytes.byteLength>1800000)
   return deny(413,'Media te groot voor veilige tijdelijke deelopslag');
  const mime=(request.headers.get('content-type')||'').split(';')[0].toLowerCase();
  try{await socialMemoryHome(env,storyId).saveShareMedia(actor.id,hash,upload[2],mime,bytes)}
  catch{return deny(400,'Dit type of formaat media kan niet veilig worden gedeeld')}
  return json({ok:true});
 }


 const posterUpload=/^\/api\/shares\/([a-f0-9]{64})\/poster\/(\d{1,2})$/.exec(p);
 if(posterUpload){
  if(m!=='POST')return deny(405,'Methode niet toegestaan');
  if(Number(request.headers.get('content-length')||0)>1500000)
   return deny(413,'Video-miniatuur is te groot');
  const hash=await shaHex(posterUpload[1]);
  const storyId=await accountHome(env,actor.id).socialShareStory(hash);
  if(!storyId)return deny(403,'Deze miniatuur hoort niet bij dit account');
  const bytes=new Uint8Array(await request.arrayBuffer());
  const mime=(request.headers.get('content-type')||'').split(';')[0].toLowerCase();
  try{await socialMemoryHome(env,storyId).saveSharePoster(actor.id,hash,
    Number(posterUpload[2]),mime,bytes)}
  catch{return deny(400,'De miniatuur kan niet veilig worden gedeeld')}
  return json({ok:true});
 }
 const partUpload=/^\/api\/shares\/([a-f0-9]{64})\/media\/(\d{1,2})\/(\d{1,2})$/.exec(p);
 if(partUpload){
  if(m!=='POST')return deny(405,'Methode niet toegestaan');
  if(Number(request.headers.get('content-length')||0)>1048576)
   return deny(413,'Een onderdeel is te groot');
  const hash=await shaHex(partUpload[1]);
  const storyId=await accountHome(env,actor.id).socialShareStory(hash);
  if(!storyId)return deny(403,'Dit deelbestand hoort niet bij dit account');
  const bytes=new Uint8Array(await request.arrayBuffer());
  const mime=(request.headers.get('content-type')||'').split(';')[0].toLowerCase();
  try{
   await socialMemoryHome(env,storyId).saveSharePart(actor.id,hash,
    Number(partUpload[2]),Number(partUpload[3]),mime,bytes);
  }catch{return deny(400,'Dit originele mediadeel kon niet veilig worden opgeslagen')}
  return json({ok:true});
 }
 const finalize=/^\/api\/shares\/([a-f0-9]{64})\/manifest$/.exec(p);
 if(finalize){
  if(m!=='POST')return deny(405,'Methode niet toegestaan');
  if(Number(request.headers.get('content-length')||0)>30000)
   return deny(413,'Deeloverzicht te groot');
  const raw=await request.text();
  if(raw.length>30000)return deny(413,'Deeloverzicht te groot');
  const hash=await shaHex(finalize[1]);
  const storyId=await accountHome(env,actor.id).socialShareStory(hash);
  if(!storyId)return deny(403,'Dit deeloverzicht hoort niet bij dit account');
  let document;
  try{document=JSON.parse(raw)}catch{return deny(400,'Ongeldig deeloverzicht')}
  try{await socialMemoryHome(env,storyId).completeShareManifest(actor.id,hash,document)}
  catch{return deny(409,'De volledige herinnering is nog niet veilig overgebracht')}
  return json({ok:true,complete:true});
 }

 const revoke=/^\/api\/shares\/([a-f0-9]{64})\/revoke$/.exec(p);
 if(revoke){
  if(m!=='POST')return deny(405,'Methode niet toegestaan');
  const rawHash=await shaHex(revoke[1]);
  const ownerShare=await accountHome(env,actor.id).socialShareStory(rawHash);
  if(!ownerShare)return revokeAccountShare(request,env,revoke[1]);
  const revoked=await socialMemoryHome(env,ownerShare).revokeShare(actor.id,rawHash);
  return json(revoked,revoked.ok?200:404);
 }
 return deny(404,'Niet gevonden');
}
function safeShareHtml(value){
 return String(value??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 }[c]));
}
async function publicWhatsAppMemory(request,env){
 const u=new URL(request.url);
 const legacy=/^\/__social\/shared\/([a-f0-9]{64})(?:\/(photo|photo-full|audio|video|poster\/\d{1,2}|media\/\d{1,2}\/\d{1,2}))?$/.exec(u.pathname);
 const short=/^\/s\/([A-Za-z0-9_-]{43})(?:\/(photo|photo-full|audio|video|poster\/\d{1,2}|media\/\d{1,2}\/\d{1,2}))?$/.exec(u.pathname);
 const decoded=short?expandWhatsAppToken(short[1]):null;
 const m=legacy||(decoded?[short[0],decoded,short[2]]:null);
 if(!m||!(request.method==='GET'||request.method==='HEAD'&&!!m[2]))
  return deny(404,'Link niet gevonden');
 // Only the random token grants access. Never expose the owner's private
 // library, account ID, other stories or originals via this public route.
 const target=new URL('/__social/shared/'+m[1],u);
 const lookup=await socialApi(new Request(target,{method:'GET',
  headers:request.headers}),env);
 if(!lookup.ok)return deny(404,'Deze deellink is verlopen of ingetrokken');
 const data=await lookup.json();
 if(!data.ok||!FREE_SHARE_ID.test(data.storyId||''))
  return deny(404,'Deze deellink is verlopen of ingetrokken');
 const home=socialMemoryHome(env,data.storyId);
 const hash=await shaHex(m[1]);


 if(m[2]&&/^poster\/\d{1,2}$/.test(m[2])){
  const stored=await home.sharedPoster(hash,Number(m[2].slice(7)));
  if(!stored)return deny(404,'Deze miniatuur is niet beschikbaar');
  return new Response(request.method==='HEAD'?null:stored.bytes,{
   status:200,headers:{
    'content-type':stored.mime,
    'content-length':String(stored.bytes.byteLength),
    'cache-control':'private, no-store',
    'x-content-type-options':'nosniff',
    'referrer-policy':'no-referrer',
    'cross-origin-resource-policy':'same-origin'
   }
  });
 }
 if(m[2]&&/^media\/\d{1,2}\/\d{1,2}$/.test(m[2])){
  const [_,asset,part]=m[2].split('/');
  const stored=await home.sharedPart(hash,Number(asset),Number(part));
  if(!stored)return deny(404,'Dit deelbestand is niet beschikbaar');
  return new Response(request.method==='HEAD'?null:stored.bytes,{
   status:200,headers:{
    'content-type':stored.mime,'content-length':String(stored.bytes.byteLength),
    'cache-control':'private, no-store','x-content-type-options':'nosniff',
    'referrer-policy':'no-referrer','cross-origin-resource-policy':'same-origin'
   }
  });
 }
 if(m[2]){
  const media=await home.sharedMedia(hash,m[2]);
  if(!media)return deny(404,'Foto of media niet gevonden');
  const length=media.bytes.byteLength;
  const isStream=m[2]==='video'||m[2]==='audio';
  const headers=new Headers({
   'content-type':media.mime,
   'cache-control':'private, no-store',
   'x-content-type-options':'nosniff',
   'referrer-policy':'no-referrer',
   'cross-origin-resource-policy':'same-origin'
  });
  if(isStream)headers.set('accept-ranges','bytes');
  const range=isStream?request.headers.get('range'):null;
  if(range){
   // iPhone Safari may ask for 0-1 bytes to detect a video, then seek.
   // Only one explicit byte range is supported, never multipart or negative spans.
   const match=/^bytes=(\d*)-(\d*)$/.exec(range);
   const startRaw=match?.[1],endRaw=match?.[2];
   let first=NaN,last=NaN;
   if(match&&(startRaw||endRaw)){
    if(startRaw){
     first=Number(startRaw);
     // RFC 9110: a requested final byte beyond EOF is clipped, not 416.
     const wantedEnd=endRaw?Number(endRaw):length-1;
     last=Number.isSafeInteger(wantedEnd)?Math.min(wantedEnd,length-1):NaN;
    }else{
     const suffix=Number(endRaw);
     if(Number.isSafeInteger(suffix)&&suffix>0){
      first=Math.max(0,length-suffix);
      last=length-1;
     }
    }
   }
   if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||
      first<0||first>=length||last<first||last>=length){
    headers.set('content-range','bytes */'+length);
    headers.set('content-length','0');
    return new Response(null,{status:416,headers});
   }
   headers.set('content-range','bytes '+first+'-'+last+'/'+length);
   headers.set('content-length',String(last-first+1));
   return new Response(request.method==='HEAD'?null:media.bytes.slice(first,last+1),
    {status:206,headers});
  }
  headers.set('content-length',String(length));
  return new Response(request.method==='HEAD'?null:media.bytes,{status:200,headers});
 }
 const content=await home.shareContent(hash);
 if(!content)return deny(404,'Deze deellink is verlopen of ingetrokken');
 const title=safeShareHtml(content.title),story=safeShareHtml(content.storyText);
 const date=safeShareHtml(content.eventDate);
 const photo=content.hasPhoto?'<img src="'+u.pathname+'/photo" alt="Foto bij deze herinnering">':'';
 const video=content.hasVideo?'<video controls playsinline preload="none" src="'+u.pathname+'/video"></video>':'';
 const audio=content.hasAudio?'<audio controls preload="none" src="'+u.pathname+'/audio"></audio>':'';
 const previewMeta='<meta property="og:type" content="article">'+
  '<meta property="og:site_name" content="TALERA">'+
  '<meta property="og:title" content="Een persoonlijke herinnering via TALERA">'+
  '<meta property="og:description" content="Tik om deze herinnering te bekijken.">'+
  '<meta name="twitter:card" content="summary_large_image">'+
  '<meta property="og:url" content="'+safeShareHtml(u.href)+'">'+
  (content.hasPhoto?'<meta property="og:image" content="'+
    safeShareHtml(u.origin+u.pathname+'/photo')+'">':'');
 // Use the SAME packaged original TALERA presenter as authenticated /present.
 // Never modify its timeline, story lift gesture, original player or narrator.
 // Only this one /s/<capability> response receives an anonymous read adapter.
 const asset=referencePages['/present'];
 if(!asset||!env.ASSETS)return deny(503,'Originele TALERA-presentatie ontbreekt');
 const original=await env.ASSETS.fetch(new Request(new URL(asset,u.origin)));
 if(!original.ok)return deny(503,'Originele TALERA-presentatie niet bereikbaar');
 const guest=renderOriginalTaleraShare(await original.text(),content,u.pathname,m[1],previewMeta);
 const prepared=await assetizeHtml(guest,new Set(approvedAssets));
 return new Response(prepared.html,{status:200,headers:{
  'content-type':'text/html; charset=utf-8',
  'cache-control':'private, no-store','referrer-policy':'no-referrer',
  'x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow',
  'content-security-policy':F5_BROWSER_CSP,
  'x-talera-free-f5':'original-presentation-one-memory-capability'
 }});

}
// One revocable token, one existing social Durable Object, no separate account
// or outside destination. Social actions cannot query another memory.
async function publicGuestFeedback(request,env){
 const u=new URL(request.url),path=u.pathname,method=request.method;
 const route=/^\/(s\/[A-Za-z0-9_-]{43}|__social\/shared\/[a-f0-9]{64})\/(feedback|heart|comment)$/.exec(path);
 if(!route||u.search)return deny(404,'Niet gevonden');
 const action=route[2];
 if(method!==(action==='feedback'?'GET':'POST'))
  return deny(405,'Methode niet toegestaan');
 const encoded=route[1].split('/')[1];
 const token=route[1].startsWith('s/')?expandWhatsAppToken(encoded):encoded;
 if(!token)return deny(404,'Deze deellink is verlopen of ingetrokken');
 if(action!=='feedback'&&
    (!sameOrigin(request)||!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json')))
  return deny(403,'Ongeldige aanvraag');
 const forwarded=new URL('/__social/shared/'+token,u);
 const lookup=await socialApi(new Request(forwarded,{method:'GET',headers:request.headers}),env);
 if(!lookup.ok)return deny(404,'Deze deellink is verlopen of ingetrokken');
 const data=await lookup.json();
 if(!data.ok||!FREE_SHARE_ID.test(data.storyId||''))
  return deny(404,'Deze deellink is verlopen of ingetrokken');
 const hash=await shaHex(token);
 let payload={};
 if(action!=='feedback'){
  if(Number(request.headers.get('content-length')||0)>2400)return deny(413,'Reactie te groot');
  const raw=await request.text();
  if(raw.length>2400)return deny(413,'Reactie te groot');
  try{payload=JSON.parse(raw)}catch{return deny(400,'Ongeldige reactie')}
  if(!payload||typeof payload!=='object'||Array.isArray(payload))
   return deny(400,'Ongeldige reactie');
 }
 const actor=await sessionAccount(request,env);
 const guestId=action==='feedback'?request.headers.get('x-talera-guest-id'):payload.guestId;
 try{
  const result=await socialMemoryHome(env,data.storyId).guestFeedback(hash,{
   action,guestId,actorId:actor?.id||null,
   name:actor?.displayName||payload.firstName||'',body:payload.body||''
  });
  return json(result);
 }catch(e){
  const code=String(e?.message||'');
  if(code.startsWith('INVALID_'))return deny(400,'Controleer jouw voornaam en reactie');
  if(code==='GUEST_RATE_LIMIT')return deny(429,'Er zijn te snel reacties geplaatst. Probeer later opnieuw.');
  if(code==='GUEST_FEEDBACK_FULL')return deny(429,'Deze herinnering kan momenteel geen nieuwe reacties ontvangen.');
  if(code==='ACCESS_DENIED')return deny(404,'Deze deellink is verlopen of ingetrokken');
  return deny(503,'Reacties tijdelijk niet beschikbaar');
 }
}
async function publicPage(request,env){
  const pathname=new URL(request.url).pathname,origin=new URL(request.url).origin;
  // Notifications is an existing tab in the approved Home markup/CSS.
  // Reuse its EXACT Home shell; the original route-aware JS selects the tab.
  const homeScreen=pathname==='/mijn-leven'||pathname==='/meldingen'||pathname===OWNER_PURGE_PATH;
  const sourcePath=pathname==='/meldingen'||pathname===OWNER_PURGE_PATH?'/mijn-leven':pathname;
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
    const stableEditedCues=pathname==='/tell'?preserveOriginalMediaIdsOnEdit(retainEditorCanonicalMediaIds(alignEditedNarrationCueRefs(scoped))):scoped;
    // Keep the editor's preview silent from the FIRST frame, even before
    // the record panel is visible. The original present/player video round
    // with sound after narration is untouched.
    const silenced=pathname==='/tell'?muteEditorOnlyVideo(stableEditedCues):stableEditedCues;
    const threeTabHome=homeScreen?evenlySpaceThreeHomeTabs(silenced):silenced;
    const converted=await assetizeHtml(threeTabHome,new Set(approvedAssets));
    const storyEntryHtml=hideUnselectedEntryPhoto(converted.html,request.url);
    const menuEntryHtml=preventHomeMenuPresentationFlash(storyEntryHtml,request.url);
    const outgoingHomeHtml=shieldHomeWhileOpeningExistingMenu(menuEntryHtml,request.url);
    return new Response(scheduleVerifiedOfflineShell(outgoingHomeHtml),{
      status:200,headers:{
        'content-type':'text/html; charset=utf-8','cache-control':'private, no-store',
        'x-content-type-options':'nosniff','x-talera-free-f5':'personalized-durable-account',
        'x-talera-offline-account':actor.id,
        'content-security-policy':F5_BROWSER_CSP
      }
    });
  }
  // No session must NEVER return the old 7-Nov anonymous shell containing
  // bundled example memories. Use the zero-example guest variant of the
  // SAME TALERA page; real account records are not read without sign-in.
  const asset=guestPages[sourcePath];
  if(!asset)return deny(503,'Lege anonieme PWA-shell ontbreekt');
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
    return new Response(shieldHomeWhileOpeningExistingMenu(
      evenlySpaceThreeHomeTabs(await r.text()),request.url),{status:200,headers});
  }
  if(pathname==='/present'){
    const entry=hideUnselectedEntryPhoto(await r.text(),request.url);
    return new Response(preventHomeMenuPresentationFlash(entry,request.url),{status:200,headers});
  }
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
 return new Response(scheduleVerifiedOfflineShell(localBackupPage(name)),{status:200,headers:{
  'content-type':'text/html; charset=utf-8',
  'cache-control':'private, no-store','x-content-type-options':'nosniff',
  'referrer-policy':'no-referrer','content-security-policy':F5_BROWSER_CSP,
  'x-talera-offline-account':actor.id
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
  const reference=referencePages[params[0][1]==='record'?
    '/vertelmodus-embed-record':'/vertelmodus-embed'];
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
    'x-talera-free-f5':'original-iframe-zero-player',
    'x-talera-offline-account':actor.id
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
    if(m==='GET'&&!url.search&&(p==='/wachtwoord-vergeten'||p==='/wachtwoord-instellen'))
      return passwordResetPage(p==='/wachtwoord-vergeten'?'request':'confirm');
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
    const exactLegacyShareLookup=p==='/api/pwa/memory-link'&&m==='GET'&&
      url.searchParams.size===1&&url.searchParams.has('localMemoryId')&&
      FREE_SHARE_ID.test(url.searchParams.get('localMemoryId')||'');
    if(url.search&&!exactLegacyShareLookup&&!allowedLocalUiSearch(url)&&!allowedVersionCheck(url,m)){
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
      if(p==='/api/capture-place')return capturePlaceApi(request,env,{getAccount:()=>sessionAccount(request,env),getScope:privateAccountScope});
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
      if(p==='/api/pwa/memory-link'||/^\/api\/memories\/[a-f0-9]{64}\/shares$/.test(p)||
         /^\/api\/shares\/[a-f0-9]{64}\/(?:photo|photo-full|audio|video|revoke|manifest|poster\/\d{1,2}|media\/\d{1,2}\/\d{1,2})$/.test(p))
        return legacyShareApi(request,env);
      if(p==='/api/shares'||p==='/api/my-grants')
        return accountSocialLists(request,env);
      const revoke=/^\/api\/shares\/([a-f0-9]{64})(?:\/revoke)?$/.exec(p);
      if(revoke)return revokeAccountShare(request,env,revoke[1]);
      const grantRevoke=/^\/api\/memories\/([A-Za-z0-9_-]{8,80})\/grants\/([0-9a-fA-F-]{36})\/revoke$/.exec(p);
      if(grantRevoke)return revokeAccountGrant(request,env,grantRevoke[1],grantRevoke[2]);
      if((m==='GET'||m==='HEAD')&&/^\/__social\/shared\/[a-f0-9]{64}(?:\/(?:photo|photo-full|audio|video|poster\/\d{1,2}|media\/\d{1,2}\/\d{1,2}))?$/.test(p)&&
         (p.endsWith('/photo')||p.endsWith('/photo-full')||p.endsWith('/audio')||
          p.endsWith('/video')||/\/poster\/\d{1,2}$/.test(p)||/\/media\/\d{1,2}\/\d{1,2}$/.test(p)||(request.headers.get('accept')||'').includes('text/html')))
        return publicWhatsAppMemory(request,env);
      if((m==='GET'||m==='HEAD')&&/^\/s\/[A-Za-z0-9_-]{43}(?:\/(?:photo|photo-full|audio|video|poster\/\d{1,2}|media\/\d{1,2}\/\d{1,2}))?$/.test(p))
        return publicWhatsAppMemory(request,env);
      if(m==='GET'&&p==='/ontdek-talera'&&!url.search)
        return new Response(renderTaleraLanding(),{status:200,headers:{
         'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=300',
         'referrer-policy':'no-referrer','x-content-type-options':'nosniff',
         'content-security-policy':"default-src 'none'; img-src 'self'; script-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
        }});
      if(m==='GET'&&p==='/__f5/guest-ui.js'&&!url.search)
        return new Response(guestClientScript,{status:200,headers:{
         'content-type':'text/javascript; charset=utf-8',
         'cache-control':'public, max-age=300','x-content-type-options':'nosniff'
        }});
      if(/^\/(?:s\/[A-Za-z0-9_-]{43}|__social\/shared\/[a-f0-9]{64})\/(?:feedback|heart|comment)$/.test(p))
        return publicGuestFeedback(request,env);
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
