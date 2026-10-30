// TALERA clean-core stage 2026-10-30. Standalone; never redirects to Cloudflare Access.
const secHeaders={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...secHeaders,'content-type':'application/json; charset=utf-8'}});
const error=(s=400,msg='Ongeldige aanvraag')=>json({error:msg},s);
const te=new TextEncoder();
const sha=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',te.encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
const random=()=>crypto.randomUUID();
const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const emailRule=/^[^\s@]{1,64}@[^\s@]{2,190}$/;
const uuidRule=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const passwordHash=async (password,salt)=>Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:te.encode(salt),iterations:220000,hash:'SHA-256'},await crypto.subtle.importKey('raw',te.encode(password),'PBKDF2',false,['deriveBits']),256)),b=>b.toString(16).padStart(2,'0')).join('');
const text=(s,n)=>String(s??'').trim().slice(0,n);
async function body(req){if(Number(req.headers.get('content-length')||0)>16000)throw Error('Te grote aanvraag');const s=await req.text();if(s.length>16000)throw Error('Te grote aanvraag');return JSON.parse(s||'{}')}
async function auth(req,env){const m=(req.headers.get('cookie')||'').match(/(?:^|;\s*)talera_sid=([0-9a-f]{64})(?:;|$)/);if(!m)return null;const h=await sha(m[1]),row=await env.DB.prepare("SELECT a.id,a.email,a.display_name FROM sessions s JOIN accounts a ON s.account_id=a.id WHERE s.id_hash=? AND s.expires_at>? AND a.status='active'").bind(h,Date.now()).first();return row||null}
const cookie=(token,maxAge)=>'talera_sid='+token+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age='+maxAge;
const allowedWrite=req=>req.headers.get('origin')===new URL(req.url).origin;
const page404=()=>new Response('Deze herinnering is niet meer beschikbaar.',{status:404,headers:{...secHeaders,'content-type':'text/plain; charset=utf-8'}});
const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function rateLimit(req,env,category,threshold=12){const name=await sha((req.headers.get('CF-Connecting-IP')||'unknown').slice(0,60)+':'+category);const cutoff=Date.now()-600000;await env.DB.prepare("DELETE FROM auth_attempts WHERE bucket_key=? AND started_at<?").bind(name,cutoff).run();const current=await env.DB.prepare('SELECT hits FROM auth_attempts WHERE bucket_key=?').bind(name).first();if((current?.hits||0)>=threshold)return false;await env.DB.prepare('INSERT INTO auth_attempts(bucket_key,started_at,hits) VALUES(?,?,1) ON CONFLICT(bucket_key) DO UPDATE SET hits=hits+1').bind(name,Date.now()).run();return true}
async function issueSession(account,env){const t=secret();await env.DB.prepare('INSERT INTO sessions(id_hash,account_id,expires_at,created_at) VALUES(?,?,?,?)').bind(await sha(t),account.id,Date.now()+86400000*7,Date.now()).run();const r=json({account:{id:account.id,displayName:account.display_name}});r.headers.set('set-cookie',cookie(t,604800));return r}
async function handler(req,env){
 const u=new URL(req.url),p=u.pathname,m=req.method;
 if(p==='/__diagnose-crypto'&&m==='GET'){try{const h=await passwordHash('staging-diagnostic-password','test-salt');return json({crypto:'ok',length:h.length})}catch(e){return json({crypto:'failed',name:String(e?.name||''),message:String(e?.message||'').slice(0,100)},500)}}
 if(p==='/__health'&&m==='GET'){const tables=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('accounts','sessions','memories','comments','likes','shares','messages')").all();return json({service:'talera-clean-core',staging:true,ready:(tables.results||[]).length===7,accountProvider:'TALERA',cloudflareLogin:false})}
 if(p.startsWith('/gedeeld/')){
  if(m!=='GET')return error(405);
  const token=p.slice('/gedeeld/'.length);if(!/^[0-9a-f]{64}$/.test(token))return page404();
  const row=await env.DB.prepare("SELECT m.title,m.story_text,m.event_date FROM shares s JOIN memories m ON m.id=s.memory_id AND m.account_id=s.account_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?").bind(await sha(token),Date.now()).first();
  if(!row)return page404();
  return new Response('<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><title>'+escape(row.title)+' · TALERA</title><style>body{margin:0;background:#f4f7f9;color:#223a4c;font:16px/1.6 system-ui}.a{max-width:640px;margin:7vh auto;padding:30px;background:white;border-radius:24px}small{color:#667c8e}p{white-space:pre-wrap}@media(max-width:720px){.a{margin:12px;padding:24px}}</style></head><body><main class="a"><small>TALERA · Persoonlijk met jou gedeeld</small><h1>'+escape(row.title)+'</h1><small>'+escape(row.event_date)+'</small><p>'+escape(row.story_text)+'</p></main></body></html>',{headers:{...secHeaders,'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
 }
 if(m!=='GET'&&!allowedWrite(req))return error(403,'Ongeldige herkomst');
 if(p==='/api/register'&&m==='POST'){
  if(!await rateLimit(req,env,'register',3))return error(429,'Probeer later opnieuw');
  const d=await body(req),email=text(d.email,254).toLowerCase(),display=text(d.displayName,100),password=String(d.password||'');
  if(!emailRule.test(email)||display.length<1||password.length<12||password.length>128)return error(400,'Vul geldige gegevens in (wachtwoord minimaal 12 tekens)');
  const salt=secret(),digest=await passwordHash(password,salt),id=random();
  try{await env.DB.prepare('INSERT INTO accounts(id,email,display_name,password_salt,password_hash,created_at,status) VALUES(?,?,?,?,?,?,?)').bind(id,email,display,salt,digest,Date.now(),'active').run()}catch{return error(409,'Registreren is niet gelukt')}
  return issueSession({id,display_name:display},env);
 }
 if(p==='/api/login'&&m==='POST'){
  if(!await rateLimit(req,env,'login',12))return error(429,'Probeer later opnieuw');
  const d=await body(req),email=text(d.email,254).toLowerCase(),password=String(d.password||'');
  const a=await env.DB.prepare("SELECT id,display_name,password_salt,password_hash FROM accounts WHERE email=? AND status='active'").bind(email).first();
  const comparison=await passwordHash(password.slice(0,128),a?.password_salt||'unknown-salt');
  if(!a||comparison!==a.password_hash)return error(401,'Gegevens niet herkend');
  return issueSession(a,env);
 }
 const user=await auth(req,env);
 if(p==='/api/me'&&m==='GET')return user?json({account:{id:user.id,displayName:user.display_name}}):error(401,'Aanmelden bij TALERA is nodig');
 if(p==='/api/logout'&&m==='POST'){if(user){const c=(req.headers.get('cookie')||'').match(/talera_sid=([0-9a-f]{64})/);if(c)await env.DB.prepare('DELETE FROM sessions WHERE id_hash=?').bind(await sha(c[1])).run()}const x=json({ok:true});x.headers.set('set-cookie',cookie('',0));return x}
 if(!user)return error(401,'Aanmelden bij TALERA is nodig');
 if(p==='/api/memories'&&m==='GET'){const result=await env.DB.prepare('SELECT id,title,story_text,event_date,updated_at FROM memories WHERE account_id=? ORDER BY updated_at DESC LIMIT 200').bind(user.id).all();return json({items:result.results||[]})}
 if(p==='/api/memories'&&m==='POST'){const d=await body(req),title=text(d.title,180),story=text(d.storyText,12000),date=text(d.eventDate,32);if(!title||!story)return error(400,'Titel en verhaal zijn verplicht');const id=random(),now=Date.now();await env.DB.prepare('INSERT INTO memories(id,account_id,title,story_text,event_date,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(id,user.id,title,story,date,now,now).run();return json({id,title,eventDate:date},201)}
 const memory=p.match(/^\/api\/memories\/([0-9a-f-]{36})$/);
 if(memory&&m==='GET'){const row=await env.DB.prepare('SELECT id,title,story_text,event_date FROM memories WHERE id=? AND account_id=?').bind(memory[1],user.id).first();return row?json(row):error(404,'Niet gevonden')}
 const comment=p.match(/^\/api\/memories\/([0-9a-f-]{36})\/comments$/);
 if(comment){const own=await env.DB.prepare('SELECT id FROM memories WHERE id=? AND account_id=?').bind(comment[1],user.id).first();if(!own)return error(404,'Niet gevonden');if(m==='GET'){const rows=await env.DB.prepare('SELECT c.id,c.body,c.parent_id,c.created_at,a.display_name FROM comments c JOIN accounts a ON a.id=c.account_id WHERE c.memory_id=? ORDER BY c.created_at LIMIT 200').bind(comment[1]).all();return json({items:rows.results||[]})}if(m==='POST'){const d=await body(req),bodyText=text(d.body,4000);if(!bodyText)return error(400,'Reactie is leeg');if(d.parentId){const parent=await env.DB.prepare('SELECT id FROM comments WHERE id=? AND memory_id=?').bind(d.parentId,comment[1]).first();if(!parent)return error(404,'Bovenliggende reactie niet gevonden')}const id=random();await env.DB.prepare('INSERT INTO comments(id,memory_id,account_id,parent_id,body,created_at) VALUES(?,?,?,?,?,?)').bind(id,comment[1],user.id,d.parentId||null,bodyText,Date.now()).run();return json({id},201)}}
 const like=p.match(/^\/api\/memories\/([0-9a-f-]{36})\/like$/);
 if(like&&m==='POST'){const own=await env.DB.prepare('SELECT id FROM memories WHERE id=? AND account_id=?').bind(like[1],user.id).first();if(!own)return error(404,'Niet gevonden');const existing=await env.DB.prepare('SELECT 1 AS ok FROM likes WHERE memory_id=? AND account_id=?').bind(like[1],user.id).first();if(existing)await env.DB.prepare('DELETE FROM likes WHERE memory_id=? AND account_id=?').bind(like[1],user.id).run();else await env.DB.prepare('INSERT INTO likes(memory_id,account_id,created_at) VALUES(?,?,?)').bind(like[1],user.id,Date.now()).run();return json({liked:!existing})}
 const share=p.match(/^\/api\/memories\/([0-9a-f-]{36})\/shares$/);
 if(share&&m==='POST'){const own=await env.DB.prepare('SELECT id FROM memories WHERE id=? AND account_id=?').bind(share[1],user.id).first();if(!own)return error(404,'Niet gevonden');const d=await body(req),hours=Number(d.hours);if(![1,24,168,720].includes(hours)||d.consent!==true)return error(400,'Geldigheidsduur en toestemming verplicht');const t=secret(),id=random(),exp=Date.now()+hours*3600000;await env.DB.prepare('INSERT INTO shares(id,account_id,memory_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?,?)').bind(id,user.id,share[1],await sha(t),exp,Date.now()).run();return json({id,link:new URL('/gedeeld/'+t,req.url).href,expiresAt:new Date(exp).toISOString()},201)}
 if(p==='/api/shares'&&m==='GET'){const rows=await env.DB.prepare('SELECT id,memory_id,expires_at,revoked_at FROM shares WHERE account_id=? ORDER BY created_at DESC LIMIT 200').bind(user.id).all();return json({items:rows.results||[]})}
 const revoke=p.match(/^\/api\/shares\/([0-9a-f-]{36})\/revoke$/);
 if(revoke&&m==='POST'){const r=await env.DB.prepare('UPDATE shares SET revoked_at=? WHERE id=? AND account_id=? AND revoked_at IS NULL').bind(Date.now(),revoke[1],user.id).run();return json({revoked:(r.meta?.changes||0)>0})}
 if(p==='/api/messages'&&m==='GET'){const rows=await env.DB.prepare('SELECT id,memory_id,comment_id,kind,read_at,created_at FROM messages WHERE account_id=? ORDER BY created_at DESC LIMIT 100').bind(user.id).all();return json({items:rows.results||[]})}
 return error(404,'Niet gevonden');
}
export default {async fetch(request,env){try{return await handler(request,env)}catch(e){return error(500,'TALERA kon de aanvraag niet verwerken')}}};
