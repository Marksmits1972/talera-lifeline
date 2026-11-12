// TALERA Free: exact-match extraction of previously approved *public, static* JS/CSS.
// Leave ALL HTML, cookies, account-specific changes, API and personal data no-store.
// This runs in Workers and Node, without HTML rewriting by risky regex substitutions
// outside script/style tags.
const TAG=/<(script|style)(\s[^>]*?)?>([\s\S]*?)<\/\1\s*>/gi;
const enc=new TextEncoder();
function hex(buf){return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function fingerprint(content){
 return hex(await crypto.subtle.digest('SHA-256',enc.encode(content)));
}
export function eligible(kind,attributes,body){
 if(body.length<1024||body.length>1_000_000||!body.trim())return false;
 // If a script uses its own URL/location, document.write or module semantics,
 // changing to a src attribute could change behavior. Fail closed.
 if(/\b(?:nonce|integrity|crossorigin|src|async|defer|nomodule|scoped)\s*(?:=|\b)/i.test(attributes))return false;
 if(kind==='script'){
  if(/\btype\s*=/i.test(attributes)&&!/\btype\s*=\s*["'](?:text\/javascript|application\/javascript)["']/i.test(attributes))return false;
  if(/\b(?:document\.currentScript|document\.write|import\.meta|import\s*\(|sourceURL|sourceMappingURL)\b/i.test(body))return false;
  if(/<\/script/i.test(body))return false;
 }else{
  if(/\b(?:media|type|disabled)\s*(?:=|\b)/i.test(attributes))return false;
  // Avoid changed resolution of document-relative URLs after moving CSS.
  if(/url\s*\(|@import\b/i.test(body))return false;
 }
 return true;
}
export async function candidates(html){
 const results=[];
 for(const m of html.matchAll(TAG)){
  const kind=m[1].toLowerCase(),attributes=m[2]||'',body=m[3];
  if(!eligible(kind,attributes,body))continue;
  const sha=await fingerprint(body);
  results.push({kind,sha,attributes,body,bytes:enc.encode(body).length});
 }
 return results;
}
function escapeAttr(value){return value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')}
export async function assetizeHtml(html,allow){
 let offset=0,output='',converted=0,savedBytes=0;
 for(const m of html.matchAll(TAG)){
  const kind=m[1].toLowerCase(),attributes=m[2]||'',body=m[3];
  output+=html.slice(offset,m.index);
  offset=m.index+m[0].length;
  let tag=m[0];
  if(eligible(kind,attributes,body)){
   const sha=await fingerprint(body),key=sha+'.'+(kind==='script'?'js':'css');
   if(allow.has(key)){
    const path='/__talera_free/assets/'+key;
    if(kind==='script'){
     // Normal parser-blocking classic scripts retain document execution order.
     tag='<script'+attributes+' src="'+escapeAttr(path)+'"></script>';
    }else{
     const id=/\bid\s*=\s*(["'])([^"']+)\1/i.exec(attributes);
     tag='<link rel="stylesheet" href="'+escapeAttr(path)+'"'+(id?' id="'+escapeAttr(id[2])+'"':'')+'>';
    }
    converted++;savedBytes+=enc.encode(body).length;
   }
  }
  output+=tag;
 }
 output+=html.slice(offset);
 return {html:output,converted,savedBytes};
}
export const PUBLIC_PATHS=new Set(['/','/mijn-leven','/present','/tell','/account','/instellingen']);
