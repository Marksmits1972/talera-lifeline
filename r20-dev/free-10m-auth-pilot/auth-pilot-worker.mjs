// TALERA FREE ACCOUNT/AUTH pilot — ISOLATED, NO CUSTOMER MIGRATION.
// The existing TALERA login and D1 remain the source of truth until explicit
// verified migration/cutover. Do NOT proxy real requests into this pilot.
import {
 AUTH_DAYS,validEmail,validHandle,validDisplay,validPassword,
 validAccountId,freshToken,shaHex,namespacedHash,passwordHash,
 readSessionCookie,sessionCookie,json,sameOrigin,body
} from './auth-util.mjs';
export {FreeAuthAccount,FreeAuthEmail,FreeAuthHandle,FreeAuthSession,FreeAuthRate} from './auth-objects.mjs';

const err=(status,message)=>json({error:message},status);
const LIMIT_WINDOW=600000;
const routeKey=async(env,type,value)=>namespacedHash(env.AUTH_NAMESPACE_KEY,type+':'+value);
function accountStub(env,id){
 return env.AUTH_ACCOUNTS.get(env.AUTH_ACCOUNTS.idFromName('talera-free-account-v1:'+validAccountId(id)));
}
function emailStub(env,key){
 return env.AUTH_EMAILS.get(env.AUTH_EMAILS.idFromName('talera-free-auth-email-v1:'+key));
}
function handleStub(env,key){
 return env.AUTH_HANDLES.get(env.AUTH_HANDLES.idFromName('talera-free-auth-handle-v1:'+key));
}
function sessionStub(env,hash){
 return env.AUTH_SESSIONS.get(env.AUTH_SESSIONS.idFromName('talera-free-auth-session-v1:'+hash));
}
function rateStub(env,key){
 return env.AUTH_RATES.get(env.AUTH_RATES.idFromName('talera-free-auth-rate-v1:'+key));
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
  if(!env.AUTH_NAMESPACE_KEY||!env.AUTH_ACCOUNTS?.get||!env.AUTH_EMAILS?.get||!env.AUTH_HANDLES?.get||
     !env.AUTH_SESSIONS?.get||!env.AUTH_RATES?.get)return err(503,'Auth testomgeving niet ingericht');
  if(u.search||!['/api/register','/api/login','/api/logout','/api/me','/api/profile'].includes(p))
   return err(404,'Niet beschikbaar in deze testomgeving');
  try{
   if(m==='POST'&&p==='/api/register')return signup(req,env);
   if(m==='POST'&&p==='/api/login')return signin(req,env);
   if(m==='POST'&&p==='/api/logout')return logout(req,env);
   if(m==='GET'&&p==='/api/me')return me(req,env);
   if(m==='POST'&&p==='/api/profile')return profile(req,env);
   return err(405,'Methode niet toegestaan');
  }catch(error){
   // No user input, credentials, cookies, salts or hashes in logs.
   console.error('FREE_AUTH_PILOT_INTERNAL_ERROR',error?.message==='TRUSTED_IP_MISSING'?'TRUSTED_IP_MISSING':'INTERNAL');
   return err(503,'De test-accountservice is tijdelijk niet beschikbaar');
  }
 }
};
