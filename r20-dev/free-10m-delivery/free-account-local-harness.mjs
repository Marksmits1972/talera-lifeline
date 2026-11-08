/* LOCAL TEST HARNESS ONLY — DO NOT DEPLOY
 * The real Free authentication service is NOT replaced or mocked in production.
 * Here, only explicitly fake demo-* session IDs are accepted in place of the
 * upstream service so the account Durable Objects can be tested in isolation.
 */
import realFreeWorker from './free-worker.mjs';
export {FreeAccountHome} from './free-account-home.mjs';
function testSession(request){
 const cookie=request.headers.get('cookie')||'';
 const m=/(?:^|;\s*)talera_sid=(demo-[a-z0-9-]{1,64})(?:;|$)/.exec(cookie);
 return m?m[1]:null;
}
const HTML='<html lang="nl"><head><title>TALERA fake account storage QA</title></head><body><script>const LIFE_START = new Date(1976,8,6).getTime();</script>FAKE QA PAGE</body></html>';
const fakeBase={
 async fetch(request){
  const url=new URL(request.url),route=url.pathname,accountId=testSession(request);
  if(route==='/health')return Response.json({ok:true,environment:'local-only-fake-accounts'});
  if(route==='/api/me'){
   return accountId?Response.json({account:{id:accountId,username:accountId}}):
    Response.json({error:'not-signed-in'}, {status:401});
  }
  if(route==='/api/register'&&request.method==='POST'){
   const fields=await request.json();
   // Fake account registration used for no-production-data end-to-end tests.
   const id='demo-created-registered';
   if(fields.username!=='demo-created')return Response.json({error:'fake-users-only'},{status:400});
   return Response.json({account:{id,username:fields.username}});
  }
  if(['/','/mijn-leven','/present','/account','/instellingen','/tell'].includes(route)){
   return new Response(HTML,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
  }
  return Response.json({error:'unimplemented-fake-upstream'},{status:404});
 }
};
export default {
 fetch(req,env,ctx){
  // Never accept external bindings or send requests to the real service.
  return realFreeWorker.fetch(req,{...env,TALERA_BASE:fakeBase},ctx);
 }
};
