/*
 * TALERA short-path architecture proof (isolated, synthetic data only).
 * NOT connected to production auth, original story players or any real D1/R2.
 *
 * User's normal request path, after login:
 *   authenticated session -> verify signed shard hint -> ONE account data D1
 *
 * No shared directory DB query per normal story request.
 * Directory lookup is performed once when an existing account logs in;
 * new accounts receive their immutable shard placement once.
 *
 * IMPORTANT: Route hints are NOT authentication and NEVER grant permission
 * to read or write anything. Always validate against real account session.
 */
const ACCOUNT=/^[A-Za-z0-9_-]{3,100}$/;
const SHARD=/^[A-Z][A-Z0-9]{0,7}$/;
const REFERENCE=/^[A-Za-z0-9_-]{3,120}$/;
const utf8=new TextEncoder();
const base64url=s=>btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
const unbase64url=s=>atob(s.replace(/-/g,'+').replace(/_/g,'/'));
const bytesToB64=bytes=>base64url(String.fromCharCode(...bytes));
const b64ToBytes=s=>Uint8Array.from(unbase64url(s),c=>c.charCodeAt(0));
export class RouteGuardError extends Error {
 constructor(message){super(message);this.name='RouteGuardError'}
}
function guard(value,re,label){
 if(typeof value!=='string'||!re.test(value))throw new RouteGuardError('invalid '+label);
 return value;
}
export async function importRouteKey(secret){
 if(typeof secret!=='string'||secret.length<40)throw new RouteGuardError('route signing key must be high entropy');
 return crypto.subtle.importKey('raw',utf8.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
async function signObject(value,key){
 const payload=bytesToB64(utf8.encode(JSON.stringify(value)));
 const signature=await crypto.subtle.sign('HMAC',key,utf8.encode(payload));
 return payload+'.'+bytesToB64(new Uint8Array(signature));
}
async function verifyObject(token,key){
 if(typeof token!=='string'||token.length>2048||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/.test(token))
  throw new RouteGuardError('invalid routing hint');
 const [payload,signature]=token.split('.');
 let good=false;
 try{good=await crypto.subtle.verify('HMAC',key,b64ToBytes(signature),utf8.encode(payload))}
 catch{throw new RouteGuardError('invalid routing hint signature')}
 if(!good)throw new RouteGuardError('invalid routing hint signature');
 let parsed;
 try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b64ToBytes(payload)));}
 catch{throw new RouteGuardError('invalid routing hint body')}
 if(!parsed||typeof parsed!=='object')throw new RouteGuardError('invalid routing hint structure');
 return parsed;
}
export async function issueAccountRoute({accountId,shardId,nowMs=Date.now()},key){
 guard(accountId,ACCOUNT,'account ID');guard(shardId,SHARD,'shard ID');
 // Small-lifetime placement cache only. Not an auth session/cookie.
 return signObject({v:1,k:'account',a:accountId,s:shardId,e:nowMs+15*60_000},key);
}
export async function resolveAccountShard({hint,authenticatedAccountId,nowMs=Date.now()},key,dbBindings){
 guard(authenticatedAccountId,ACCOUNT,'authenticated account ID');
 const claim=await verifyObject(hint,key);
 if(claim.v!==1||claim.k!=='account'||claim.a!==authenticatedAccountId||
   typeof claim.e!=='number'||!Number.isFinite(claim.e)||nowMs>=claim.e)
  throw new RouteGuardError('not a valid matching authenticated account route');
 const shard=guard(claim.s,SHARD,'shard ID');
 const binding=dbBindings['DATA_SHARD_'+shard];
 if(!binding)throw new RouteGuardError('assigned shard missing: no fallback to another database');
 return {shardId:shard,db:binding};
}
export async function issueShareLocator({shardId,shareId,nowMs=Date.now()},key){
 guard(shardId,SHARD,'shard ID');guard(shareId,REFERENCE,'share ID');
 // Only a location pointer; actual random share capability and revocation are
 // checked against rows in the SAME shard. Hint never grants read access.
 return signObject({v:1,k:'share',s:shardId,r:shareId},key);
}
export async function resolveShareShard({locator},key,dbBindings){
 const claim=await verifyObject(locator,key);
 if(claim.v!==1||claim.k!=='share')throw new RouteGuardError('wrong type of routing hint');
 const id=guard(claim.s,SHARD,'shard ID');
 guard(claim.r,REFERENCE,'share ID');
 const db=dbBindings['DATA_SHARD_'+id];
 if(!db)throw new RouteGuardError('share shard unavailable; never search arbitrary databases');
 return {shardId:id,shareId:claim.r,db};
}
// Pure in-memory account registry for tests; production uses verified auth
// account DB as authority and persists the immutable assignment.
export class SyntheticAccountDirectory {
 constructor(ids=['A']){
  this.active=new Set(ids);this.accounts=new Map();this.counts=new Map(ids.map(x=>[x,0]));
 }
 addShard(id){
  guard(id,SHARD,'shard ID');
  if(this.active.has(id))throw new RouteGuardError('already active');
  this.active.add(id);this.counts.set(id,0);
 }
 find(accountId){
  guard(accountId,ACCOUNT,'account ID');
  return this.accounts.get(accountId)||null;
 }
 register(accountId){
  guard(accountId,ACCOUNT,'account ID');
  if(this.accounts.has(accountId))return this.accounts.get(accountId);
  const selection=[...this.active].sort((a,b)=>this.counts.get(a)-this.counts.get(b)||a.localeCompare(b));
  if(!selection.length)throw new RouteGuardError('no active shard');
  const shard=selection[0];
  this.accounts.set(accountId,shard);this.counts.set(shard,this.counts.get(shard)+1);
  return shard;
 }
}
