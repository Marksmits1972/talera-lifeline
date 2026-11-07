/* TALERA context-key localization — isolated test worker.
 * Reads the current BEST TALERA Worker by service binding, augments ONLY its
 * existing language dictionary and attaches explicit context keys to UI nodes.
 * No modifications to recorder, accounts, database, media, timelines, CSS or handlers.
 */
import { CONTEXT_WORDS } from './context-register.mjs';
import { BINDER_JS } from './context-binder.mjs';

const LANGS=['nl','en','de','fr','es'];
const ELIGIBLE=new Set(['/','/index.html','/mijn-leven','/present','/tell','/gedeeld','/meldingen']);
const OPEN='<script id="talera-v23-i18n">';
const PACK_START='const PACKS=';
const PACK_END=';\nconst LANGS=';

function localizeHtml(original){
 const open=original.indexOf(OPEN);
 if(open<0)return {html:original,status:'no-language-registry'};
 const sourceStart=open+OPEN.length;
 const end=original.indexOf('</script>',sourceStart);
 if(end<0)return {html:original,status:'missing-script-end'};
 const before=original.slice(sourceStart,end);
 const left=before.indexOf(PACK_START);
 if(left<0)return {html:original,status:'missing-pack-start'};
 const jsonStart=left+PACK_START.length;
 const jsonEnd=before.indexOf(PACK_END,jsonStart);
 if(jsonEnd<0)return {html:original,status:'missing-pack-end'};
 let packs;
 try{packs=JSON.parse(before.slice(jsonStart,jsonEnd));}
 catch{return {html:original,status:'invalid-existing-packs'};}
 if(!LANGS.every(l=>packs[l]&&typeof packs[l]==='object'))return {html:original,status:'missing-language'};
 for(const [key,translations] of Object.entries(CONTEXT_WORDS)){
  if(!LANGS.every(l=>typeof translations[l]==='string'&&translations[l].trim()))return {html:original,status:'incomplete-context-key'};
  // Never silently overwrite an existing translation key.
  if(LANGS.some(l=>Object.prototype.hasOwnProperty.call(packs[l],key)))return {html:original,status:'colliding-context-key'};
  for(const l of LANGS)packs[l][key]=translations[l];
 }
 const changedScript=before.slice(0,jsonStart)+JSON.stringify(packs)+before.slice(jsonEnd);
 let html=original.slice(0,sourceStart)+changedScript+original.slice(end);
 if(!html.includes('id="talera-context-key-binder"')){
  const safe=BINDER_JS.replace(/<\/script/gi,'<\\/script');
  html=html.replace('</head>','<script id="talera-context-key-binder">'+safe+'</script></head>');
 }
 return {html,status:'context-keys-loaded'};
}
export default{
 async fetch(request,env){
  const path=new URL(request.url).pathname;
  if(request.method!=='GET'||!ELIGIBLE.has(path))return env.TALERA_BASE.fetch(request);
  const upstream=await env.TALERA_BASE.fetch(request);
  if(!upstream.ok||!(upstream.headers.get('content-type')||'').includes('text/html'))return upstream;
  const {html,status}=localizeHtml(await upstream.text());
  const headers=new Headers(upstream.headers);
  for(const h of ['content-length','content-encoding','etag'])headers.delete(h);
  headers.set('cache-control','no-store');
  headers.set('x-talera-i18n-context',status);
  return new Response(html,{status:upstream.status,statusText:upstream.statusText,headers});
 }
};
