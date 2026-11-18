// TALERA FREE ACCOUNT/AUTH pilot — ISOLATED, NO CUSTOMER MIGRATION.
// The existing TALERA login and D1 remain the source of truth until explicit
// verified migration/cutover. Do NOT proxy real requests into this pilot.
import {
 AUTH_DAYS,validEmail,validHandle,validDisplay,validPassword,
 validAccountId,freshToken,shaHex,namespacedHash,passwordHash,
 readSessionCookie,sessionCookie,safeEqualHex,json,sameOrigin,body
} from './auth-util.mjs';
export {FreeAuthAccount,FreeAuthEmail,FreeAuthHandle,FreeAuthSession,FreeAuthRate} from './auth-objects.mjs';

const err=(status,message)=>json({error:message},status);
const LIMIT_WINDOW=600000;
const RESET_EXPIRES_MS=15*60000;
const RESET_PATHS=['/api/password-reset/request','/api/password-reset/confirm'];
const routeKey=async(env,type,value)=>namespacedHash(env.AUTH_NAMESPACE_KEY,type+':'+value);
function ns(env,name){
 const base=env[name];
 if(!base?.get||!base?.idFromName)throw Error('AUTH_NAMESPACE_MISSING');
 if(env.AUTH_STORAGE_JURISDICTION==='eu'){
  if(typeof base.jurisdiction!=='function')throw Error('EU_JURISDICTION_UNAVAILABLE');
  return base.jurisdiction('eu');
 }
 if(env.AUTH_STORAGE_JURISDICTION==='local-test')return base;
 throw Error('AUTH_JURISDICTION_NOT_EXPLICIT');
}
function accountStub(env,id){
 const home=ns(env,'AUTH_ACCOUNTS');return home.get(home.idFromName('talera-free-account-v1:'+validAccountId(id)));
}
function emailStub(env,key){
 const home=ns(env,'AUTH_EMAILS');return home.get(home.idFromName('talera-free-auth-email-v1:'+key));
}
function handleStub(env,key){
 const home=ns(env,'AUTH_HANDLES');return home.get(home.idFromName('talera-free-auth-handle-v1:'+key));
}
function sessionStub(env,hash){
 const home=ns(env,'AUTH_SESSIONS');return home.get(home.idFromName('talera-free-auth-session-v1:'+hash));
}
function rateStub(env,key){
 const home=ns(env,'AUTH_RATES');return home.get(home.idFromName('talera-free-auth-rate-v1:'+key));
}
async function accountForEmail(env,email){
 const hash=await routeKey(env,'email',validEmail(email));
 return {key:hash,index:emailStub(env,hash)};
}
async function limit(env,req,category,max,identity=''){
 // Cloudflare overwrites CF-Connecting-IP on incoming public HTTPS requests.
 // Fail closed if absent: never share a single "unknown" IP bucket worldwide.
 const ip=req.headers.get('cf-connecting-ip');
 if(!ip||ip.length>80)throw Error('TRUSTED_IP_MISSING');
 const key=await routeKey(env,'rate',category+':'+(identity||ip));
 return rateStub(env,key).hit({limit:max,windowMs:LIMIT_WINDOW});
}
async function sessionForRequest(env,req){
 const token=readSessionCookie(req);
 if(!token)return null;
 const hash=await shaHex(token);
 const profile=await sessionStub(env,hash).check();
 return profile?{token,hash,profile}:null;
}
async function issueSession(env,row){
 const token=freshToken(),hash=await shaHex(token);
 const item=await sessionStub(env,hash).open({
  accountId:validAccountId(row.id),epoch:row.epoch,
  expires:Date.now()+AUTH_DAYS*86400000
 });
 if(!item)throw Error('SESSION_ALREADY_EXISTS');
 const response=json({account:{id:row.id,displayName:row.displayName,email:row.email,username:row.username}},200);
 response.headers.set('set-cookie',sessionCookie(token));
 return response;
}
async function signup(req,env){
 if(!sameOrigin(req))return err(403,'Ongeldige herkomst');
 if(!await limit(env,req,'register-ip',4))return err(429,'Probeer later opnieuw');
 let input;try{input=await body(req)}catch{return err(400,'Ongeldige aanvraag')}
 let email,handle,display,password;
 try{
  email=validEmail(input.email);
  handle=validHandle(input.username);
  display=validDisplay(input.displayName);
  password=validPassword(input.password);
 }catch{return err(400,'Vul geldige accountgegevens in')}
 const accountId=crypto.randomUUID().toLowerCase();
 const emailRoute=await accountForEmail(env,email);
 const usernameRoute=await routeKey(env,'handle',handle);
 const usernameHome=handleStub(env,usernameRoute);
 const emailReserved=await emailRoute.index.reserve(accountId);
 if(!emailReserved)return err(409,'Registreren is niet gelukt');
 const reserved=await usernameHome.reserve(accountId);
 if(!reserved){await emailRoute.index.release(accountId);return err(409,'Deze gebruikersnaam is niet beschikbaar')}
 let created=false;
 try{
  const salt=freshToken(),digest=await passwordHash(password,salt);
  created=await accountStub(env,accountId).create({
   id:accountId,email,display_name:display,public_handle:handle,
   password_salt:salt,password_hash:digest
  });
  if(!created){
   await Promise.all([usernameHome.release(accountId),emailRoute.index.release(accountId)]);
   return err(409,'Registreren is niet gelukt');
  }
  const activated=await usernameHome.activate(accountId);
  const emailActivated=await emailRoute.index.activate(accountId);
  if(!activated||!emailActivated){
   // Crash-safe staging rule: do not issue sessions against unfinalized
   // handles. A reconciliation run is required for an interrupted activation.
   return err(503,'Registratie vereist herstelcontrole');
  }
  return issueSession(env,{id:accountId,epoch:0,email,displayName:display,username:handle});
 }catch(error){
  // Only release an uncommitted reservation; never recycle a committed handle.
  if(!created)await Promise.allSettled([usernameHome.release(accountId),emailRoute.index.release(accountId)]);
  throw error;
 }
}
async function signin(req,env){
 if(!sameOrigin(req))return err(403,'Ongeldige herkomst');
 if(!await limit(env,req,'login-ip',12))return err(429,'Probeer later opnieuw');
 let input;try{input=await body(req)}catch{return err(400,'Ongeldige aanvraag')}
 let email;
 try{email=validEmail(input.email)}catch{return err(401,'Gegevens niet herkend')}
 if(!await limit(env,req,'login-email',15,email))return err(429,'Probeer later opnieuw');
 const account=await accountForEmail(env,email);
 const password=typeof input.password==='string'?input.password:'';
 const id=await account.index.owner();
 if(!id){await passwordHash(password.slice(0,128),'0'.repeat(64));return err(401,'Gegevens niet herkend')}
 const home=accountStub(env,id);
 const authenticated=await home.verify(password);
 if(!authenticated)return err(401,'Gegevens niet herkend');
 const publicProfile=await home.activeProfile(authenticated.epoch);
 if(!publicProfile)return err(401,'Gegevens niet herkend');
 return issueSession(env,{...publicProfile,username:publicProfile.publicHandle});
}
// Public response never confirms whether the e-mail address has an account.
const resetAcknowledgment=()=>json({ok:true,
 message:'Als dit e-mailadres bij een TALERA-account hoort en verzending mogelijk is, ontvang je een herstellink.'},200);
async function requestPasswordReset(req,env){
 if(!sameOrigin(req))return err(403,'Ongeldige herkomst');
 // A verified sender is essential. Never claim a mail was sent without it.
 if(typeof env.EMAIL?.send!=='function'||typeof env.TALERA_RESET_FROM!=='string')
  return err(503,'Wachtwoordherstel is tijdelijk niet beschikbaar');
 let from;
 try{from=validEmail(env.TALERA_RESET_FROM)}
 catch{return err(503,'Wachtwoordherstel is tijdelijk niet beschikbaar')}
 if(!await limit(env,req,'reset-request-ip',5))return err(429,'Probeer later opnieuw');
 let payload,email;
 try{payload=await body(req);email=validEmail(payload.email)}
 catch{return err(400,'Vul een geldig e-mailadres in')}
 if(!await limit(env,req,'reset-request-email',3,email))
  return err(429,'Probeer later opnieuw');
 const address=await accountForEmail(env,email);
 const id=await address.index.owner();
 if(!id)return resetAcknowledgment();
 const home=accountStub(env,id);
 const profile=await home.getProfile();
 if(!profile||profile.status!=='active'||profile.email!==email)
  return resetAcknowledgment();
 const token=freshToken(),tokenHash=await shaHex(token);
 if(!await home.beginPasswordReset(tokenHash,Date.now()+RESET_EXPIRES_MS))
  return resetAcknowledgment();
 const destination=new URL('/wachtwoord-instellen',new URL(req.url).origin);
 // Fragment never goes to the Worker or a proxy in an HTTP request.
 destination.hash='e='+encodeURIComponent(email)+'&t='+token;
 try{
  await env.EMAIL.send({from,to:email,subject:'TALERA — wachtwoord herstellen',
   text:'Je hebt een nieuw wachtwoord voor TALERA aangevraagd.\n\n'+
    'Open deze persoonlijke link (15 minuten geldig, eenmalig):\n'+destination.href+
    '\n\nNiet aangevraagd? Negeer dan deze e-mail. Je huidige wachtwoord blijft werken.'});
 }catch{
  await home.cancelPasswordReset(tokenHash);
  // Same generic response for existing and absent account: no enumeration.
  return resetAcknowledgment();
 }
 return resetAcknowledgment();
}
async function confirmPasswordReset(req,env){
 if(!sameOrigin(req))return err(403,'Ongeldige herkomst');
 if(!await limit(env,req,'reset-confirm-ip',10))return err(429,'Probeer later opnieuw');
 let input,email,password,token;
 try{
  input=await body(req);
  email=validEmail(input.email);
  password=validPassword(input.newPassword);
  token=input.token;
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))
   throw Error('INVALID_TOKEN');
 }catch{return err(400,'Ongeldige of onvolledige herstelgegevens')}
 if(!await limit(env,req,'reset-confirm-email',10,email))
  return err(429,'Probeer later opnieuw');
 const index=await accountForEmail(env,email),id=await index.index.owner();
 if(!id)return err(400,'Deze herstellink is ongeldig of verlopen');
 const salt=freshToken(),hash=await passwordHash(password,salt);
 const success=await accountStub(env,id).completePasswordReset(await shaHex(token),salt,hash);
 if(!success)return err(400,'Deze herstellink is ongeldig of verlopen');
 // Epoch bump in the account DO invalidates ALL prior login sessions.
 return json({ok:true,message:'Je wachtwoord is gewijzigd. Meld je opnieuw aan.'});
}
async function me(req,env){
 const session=await sessionForRequest(env,req);
 if(!session)return err(401,'Aanmelden bij TALERA is nodig');
 const p=session.profile;
 return json({account:{id:p.id,email:p.email,displayName:p.displayName,username:p.publicHandle}});
}
async function logout(req,env){
 if(!sameOrigin(req))return err(403,'Ongeldige herkomst');
 const token=readSessionCookie(req);
 if(token)await sessionStub(env,await shaHex(token)).revoke();
 const result=json({ok:true});
 result.headers.set('set-cookie',sessionCookie('',0));
 return result;
}
async function profile(req,env){
 if(!sameOrigin(req))return err(403,'Ongeldige herkomst');
 const authenticated=await sessionForRequest(env,req);
 if(!authenticated)return err(401,'Aanmelden bij TALERA is nodig');
 if(!await limit(env,req,'profile-ip',20))return err(429,'Probeer later opnieuw');
 let payload;try{payload=await body(req)}catch{return err(400,'Ongeldige aanvraag')}
 let display;try{display=validDisplay(payload.displayName)}catch{return err(400,'Vul een geldige naam in')}
 const updated=await accountStub(env,authenticated.profile.id).setDisplay(display,authenticated.profile.epoch);
 if(!updated)return err(401,'Meld je opnieuw aan');
 return json({account:{id:updated.id,email:updated.email,displayName:updated.displayName,username:updated.publicHandle}});
}

export default {
 async fetch(req,env){
  const u=new URL(req.url),p=u.pathname,m=req.method;
  if(p==='/__free-auth/health'&&m==='GET')
   return json({ok:true,product:'TALERA Free',pilot:true,realTaleraAccountsMigrated:false,sharedD1Bound:false});
  // Pilot is intentionally closed to the public, even after Cloudflare deploy.
  // Missing secret FAILS CLOSED; only the CI runner has a temporary QA key.
  if(!/^[0-9a-f]{64}$/.test(env.STAGING_ACCESS_KEY||''))return err(503,'Testomgeving gesloten');
  if(!safeEqualHex(req.headers.get('x-talera-staging-key')||'',env.STAGING_ACCESS_KEY))
   return err(403,'Testomgeving niet toegankelijk');
  // Test-only diagnostic behind secret gate: bindings present? NEVER values.
  if(p==='/__free-auth/diagnostic'&&m==='GET')return json({
   secretAvailable:typeof env.AUTH_NAMESPACE_KEY==='string'&&env.AUTH_NAMESPACE_KEY.length>=40,
   namespaces:['AUTH_ACCOUNTS','AUTH_EMAILS','AUTH_HANDLES','AUTH_SESSIONS','AUTH_RATES']
     .map(name=>({name,hasGet:typeof env[name]?.get==='function',hasId:typeof env[name]?.idFromName==='function'})),
   euJurisdictionConfigured:env.AUTH_STORAGE_JURISDICTION==='eu'
  });
  if(!env.AUTH_NAMESPACE_KEY||!env.AUTH_ACCOUNTS?.get||!env.AUTH_EMAILS?.get||!env.AUTH_HANDLES?.get||
     !env.AUTH_SESSIONS?.get||!env.AUTH_RATES?.get)return err(503,'Auth testomgeving niet ingericht');
  if(u.search||!['/api/register','/api/login','/api/logout','/api/me','/api/profile',...RESET_PATHS].includes(p))
   return err(404,'Niet beschikbaar in deze testomgeving');
  try{
   if(m==='POST'&&p==='/api/register')return signup(req,env);
   if(m==='POST'&&p==='/api/login')return signin(req,env);
   if(m==='POST'&&p==='/api/logout')return logout(req,env);
   if(m==='GET'&&p==='/api/me')return me(req,env);
   if(m==='POST'&&p==='/api/profile')return profile(req,env);
   if(m==='POST'&&p==='/api/password-reset/request')return requestPasswordReset(req,env);
   if(m==='POST'&&p==='/api/password-reset/confirm')return confirmPasswordReset(req,env);
   return err(405,'Methode niet toegestaan');
  }catch(error){
   // No user input, credentials, cookies, salts or hashes in logs.
   console.error('FREE_AUTH_PILOT_INTERNAL_ERROR',error?.message==='TRUSTED_IP_MISSING'?'TRUSTED_IP_MISSING':'INTERNAL');
   return err(503,'De test-accountservice is tijdelijk niet beschikbaar');
  }
 }
};
