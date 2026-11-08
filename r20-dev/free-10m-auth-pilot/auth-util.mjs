// TALERA Free isolated direct-account authentication pilot.
// No Cloudflare D1, no account directory, no real user identities.
// Compatible PBKDF2 SHA-256 100,000 iterations with legacy TALERA scheme,
// but LIVE user/session migration is deliberately not enabled.
export const AUTH_DAYS=7, COOKIE_NAME='talera_sid';
const TE=new TextEncoder();
const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
export function validEmail(raw){
 const email=String(raw??'').trim().toLowerCase();
 if(!/^[^\s@]{1,64}@[^\s@]{2,190}$/.test(email)||email.length>254)throw Error('INVALID_EMAIL');
 return email;
}
export function validHandle(raw){
 const name=String(raw??'').trim().toLowerCase().replace(/^@/,'').replace(/\s+/g,' ');
 if(!/^[a-z0-9][a-z0-9._ -]{2,29}$/.test(name))throw Error('INVALID_HANDLE');
 return name;
}
export function validDisplay(raw){
 if(typeof raw!=='string'||!raw.trim()||raw.trim().length>100||/[\u0000-\u001f\u007f]/.test(raw))throw Error('INVALID_NAME');
 return raw.trim();
}
export function validPassword(raw){
 if(typeof raw!=='string'||raw.length<8||raw.length>128)throw Error('INVALID_PASSWORD');
 return raw;
}
export function validAccountId(raw){
 if(typeof raw!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw))throw Error('INVALID_ID');
 return raw.toLowerCase();
}
export function freshToken(){
 return hex(crypto.getRandomValues(new Uint8Array(32)));
}
export async function shaHex(value){
 return hex(await crypto.subtle.digest('SHA-256',TE.encode(value)));
}
export async function namespacedHash(secret,value){
 if(typeof secret!=='string'||secret.length<40)throw Error('AUTH_NAMESPACE_KEY_MISSING');
 const k=await crypto.subtle.importKey('raw',TE.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(await crypto.subtle.sign('HMAC',k,TE.encode(value)));
}
export async function passwordHash(password,salt){
 const key=await crypto.subtle.importKey('raw',TE.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:TE.encode(salt),iterations:100_000,hash:'SHA-256'},key,256);
 return hex(bits);
}
export function safeEqualHex(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length!==64||b.length!==64)return false;
 let x=0;
 for(let i=0;i<64;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);
 return x===0;
}
export function readSessionCookie(request){
 const cookie=request.headers.get('cookie')||'';
 const all=[...cookie.matchAll(/(?:^|;\s*)talera_sid=([0-9a-f]{64})(?=;|$)/g)];
 return all.length===1?all[0][1]:null;
}
export function sessionCookie(token,maxAge=604800){
 if(token!==''&&!/^[0-9a-f]{64}$/.test(token))throw Error('INVALID_COOKIE_TOKEN');
 return COOKIE_NAME+'='+token+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age='+maxAge;
}
export function json(data,status=200){
 return new Response(JSON.stringify(data),{status,headers:{
  'content-type':'application/json; charset=utf-8',
  'cache-control':'private, no-store','x-content-type-options':'nosniff'
 }});
}
export function sameOrigin(req){return req.headers.get('origin')===new URL(req.url).origin}
export async function body(req){
 if(Number(req.headers.get('content-length')||0)>16000)throw Error('BODY_TOO_LARGE');
 const text=await req.text();
 if(text.length>16000)throw Error('BODY_TOO_LARGE');
 return JSON.parse(text);
}
