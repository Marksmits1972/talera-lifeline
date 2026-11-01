/* TALERA Premium TEST entitlements — existing Clean Core / DB only.
 * This module is injected in the existing Worker; no second account system.
 * These are temporary rights, NOT a payment or working cloud migration.
 */
const premiumPolicy=Object.freeze({
 free:{profiles:1,cloud_storage:false,cloud_sync:false,ai_tags:false,ai_titles:false,tv_pairing:false,family_members:false},
 individual:{profiles:1,cloud_storage:true,cloud_sync:true,ai_tags:true,ai_titles:true,tv_pairing:true,family_members:false},
 family_light:{profiles:3,cloud_storage:true,cloud_sync:true,ai_tags:true,ai_titles:true,tv_pairing:true,family_members:true},
 family:{profiles:5,cloud_storage:true,cloud_sync:true,ai_tags:true,ai_titles:true,tv_pairing:true,family_members:true},
 family_heavy:{profiles:5,cloud_storage:true,cloud_sync:true,ai_tags:true,ai_titles:true,tv_pairing:true,family_members:true}
});
const premiumCode=/^(individual|family_light|family|family_heavy)$/;
const premiumIsUuid=id=>typeof id==='string'&&uuidRule.test(id);
const premiumGrantView=async(env,accountId,now=Date.now())=>{
 const g=await env.DB.prepare(
  'SELECT plan_code,expires_at,updated_at FROM talera_premium_test_grants WHERE account_id=? AND expires_at>?'
 ).bind(accountId,now).first();
 const plan=g&&Object.prototype.hasOwnProperty.call(premiumPolicy,g.plan_code)?g.plan_code:'free';
 return {plan,source:plan==='free'?'free':'manual_test',expiresAt:plan==='free'?null:g.expires_at,
  permissions:{...premiumPolicy[plan]},
  // Explicit capability status: premium rights do not imply working services.
  available:{cloud_storage:false,cloud_sync:false,ai_tags:false,ai_titles:false,tv_pairing:false,family_members:false}
 };
};
const premiumOperator=async(env,actorId)=>
 !!(await env.DB.prepare(
  'SELECT account_id FROM talera_premium_admins WHERE account_id=? AND enabled=1'
 ).bind(actorId).first());
const premiumRecentLogin=async(req,env,actorId)=>{
 const match=(req.headers.get('cookie')||'').match(/(?:^|;\s*)talera_sid=([0-9a-f]{64})(?:;|$)/);
 if(!match)return false;
 const row=await env.DB.prepare(
  'SELECT s.account_id FROM sessions s WHERE s.id_hash=? AND s.account_id=? AND s.expires_at>? AND s.created_at>?'
 ).bind(await sha(match[1]),actorId,Date.now(),Date.now()-15*60000).first();
 return !!row;
};
const premiumAdminGuard=async(req,env,user)=>{
 if(!user)return error(401,'Aanmelden bij TALERA is nodig');
 if(!await premiumOperator(env,user.id))return error(403,'Geen beheerdersrecht');
 if(!await premiumRecentLogin(req,env,user.id))return error(403,'Meld je opnieuw aan om testrechten te wijzigen');
 return null;
};
async function premiumRoutes(req,env,user,p,m,u){
 if(p==='/api/me/entitlements'&&m==='GET'){
  if(!user)return error(401,'Aanmelden bij TALERA is nodig');
  const [rights,admin]=await Promise.all([premiumGrantView(env,user.id),premiumOperator(env,user.id)]);
  return json({rights,canManageTests:admin,commercialBillingActive:false});
 }
 if(!p.startsWith('/api/admin/premium/'))return null;
 if(!user)return error(401,'Aanmelden bij TALERA is nodig');
 if(!await premiumOperator(env,user.id))return error(403,'Geen beheerdersrecht');
 if(p==='/api/admin/premium/account'&&m==='GET'){
  const email=String(u.searchParams.get('email')||'').trim().toLowerCase();
  if(!emailRule.test(email))return error(400,'Vul één geldig e-mailadres in');
  if(!await rateLimit(req,env,'premium-account-lookup',20))return error(429,'Probeer later opnieuw');
  const target=await env.DB.prepare(
   "SELECT id,display_name,email FROM accounts WHERE email=? AND status='active'"
  ).bind(email).first();
  if(!target)return error(404,'Geen actief TALERA-account gevonden');
  return json({account:{id:target.id,displayName:target.display_name,email:target.email},
   rights:await premiumGrantView(env,target.id)});
 }
 if(p==='/api/admin/premium/audit'&&m==='GET'){
  const id=String(u.searchParams.get('accountId')||'');
  if(!premiumIsUuid(id))return error(400,'Ongeldig account');
  const records=await env.DB.prepare(
   'SELECT id,action,previous_plan,new_plan,expires_at,created_at FROM talera_premium_test_audit WHERE target_account_id=? ORDER BY created_at DESC LIMIT 20'
  ).bind(id).all();
  return json({events:records.results||[]});
 }
 if(m!=='POST'||!['/api/admin/premium/grant','/api/admin/premium/revoke'].includes(p))return error(404,'Niet gevonden');
 const guard=await premiumAdminGuard(req,env,user);
 if(guard)return guard;
 if(!allowedWrite(req))return error(403,'Ongeldige herkomst');
 if(!await rateLimit(req,env,'premium-manual-rights',8))return error(429,'Te veel wijzigingen. Probeer later opnieuw');
 const input=await body(req),targetId=String(input.accountId||'');
 if(!premiumIsUuid(targetId))return error(400,'Ongeldig account');
 if(targetId===user.id)return error(400,'Wijzig je eigen beheerdersaccount niet');
 const person=await env.DB.prepare("SELECT id FROM accounts WHERE id=? AND status='active'").bind(targetId).first();
 if(!person)return error(404,'Geen actief account gevonden');
 const old=await env.DB.prepare(
  'SELECT plan_code FROM talera_premium_test_grants WHERE account_id=? AND expires_at>?'
 ).bind(targetId,Date.now()).first();
 const previous=old?.plan_code||'free',now=Date.now();
 if(p==='/api/admin/premium/grant'){
  const plan=String(input.plan||''),days=Number(input.days);
  if(!premiumCode.test(plan)||![7,30,90].includes(days))return error(400,'Ongeldig testpakket of duur');
  const expiry=now+days*86400000,id=random();
  await env.DB.batch([
   env.DB.prepare('INSERT INTO talera_premium_test_grants(account_id,plan_code,expires_at,updated_at,updated_by) VALUES(?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET plan_code=excluded.plan_code,expires_at=excluded.expires_at,updated_at=excluded.updated_at,updated_by=excluded.updated_by')
    .bind(targetId,plan,expiry,now,user.id),
   env.DB.prepare('INSERT INTO talera_premium_test_audit(id,actor_account_id,target_account_id,action,previous_plan,new_plan,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?)')
    .bind(id,user.id,targetId,'grant',previous,plan,expiry,now)
  ]);
  return json({ok:true,rights:await premiumGrantView(env,targetId)});
 }
 await env.DB.batch([
  env.DB.prepare('DELETE FROM talera_premium_test_grants WHERE account_id=?').bind(targetId),
  env.DB.prepare('INSERT INTO talera_premium_test_audit(id,actor_account_id,target_account_id,action,previous_plan,new_plan,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?)')
   .bind(random(),user.id,targetId,'revoke',previous,'free',null,now)
 ]);
 return json({ok:true,rights:await premiumGrantView(env,targetId)});
}
