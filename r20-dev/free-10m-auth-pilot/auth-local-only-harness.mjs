// LOCAL TEST HARNESS ONLY. Never use this as a deployed Worker entrypoint.
import pilot from './auth-pilot-worker.mjs';
export {FreeAuthAccount,FreeAuthEmail,FreeAuthHandle,FreeAuthSession,FreeAuthRate} from './auth-objects.mjs';
import {validEmail,namespacedHash,shaHex} from './auth-util.mjs';

export default {
 async fetch(request,env,ctx){
  const u=new URL(request.url);
  if(u.pathname==='/__local-qa/disable'&&request.method==='POST'){
   if(request.headers.get('x-local-qa-only')!=='LOCAL_TEST_NO_PRODUCTION')
    return Response.json({error:'denied'},{status:403});
   const data=await request.json();
   const email=validEmail(data.email);
   const key=await namespacedHash(env.AUTH_NAMESPACE_KEY,'email:'+email);
   const index=env.AUTH_EMAILS.get(env.AUTH_EMAILS.idFromName('talera-free-auth-email-v1:'+key));
   const id=await index.owner();
   const ok=id?await env.AUTH_ACCOUNTS.get(env.AUTH_ACCOUNTS.idFromName('talera-free-account-v1:'+id)).disable():false;
   return Response.json({ok});
  }
  if(u.pathname==='/__local-qa/birthdate'&&request.method==='POST'){
   if(request.headers.get('x-local-qa-only')!=='LOCAL_TEST_NO_PRODUCTION')
    return Response.json({error:'denied'},{status:403});
   const payload=await request.json();
   const key=await namespacedHash(env.AUTH_NAMESPACE_KEY,'email:'+validEmail(payload.email));
   const index=env.AUTH_EMAILS.get(env.AUTH_EMAILS.idFromName('talera-free-auth-email-v1:'+key));
   const id=await index.owner();
   if(!id)return Response.json({error:'missing'},{status:404});
   const acc=env.AUTH_ACCOUNTS.get(env.AUTH_ACCOUNTS.idFromName('talera-free-account-v1:'+id));
   if(payload.birthDate)await acc.setBirthDate(payload.birthDate);
   return Response.json({accountId:id,birthDate:await acc.getBirthDate()});
  }
  if(u.pathname==='/__local-qa/session-object'&&request.method==='GET'){
   if(request.headers.get('x-local-qa-only')!=='LOCAL_TEST_NO_PRODUCTION')
    return Response.json({error:'denied'},{status:403});
   const cookie=request.headers.get('cookie')||'';
   const token=/(?:^|;\s*)talera_sid=([0-9a-f]{64})(?:;|$)/.exec(cookie)?.[1];
   const hash=token?await shaHex(token):null;
   return Response.json({isValidHash:hash!==null,hasNoRawToken:!String(hash||'').includes(token)});
  }
  return pilot.fetch(request,env,ctx);
 }
};
