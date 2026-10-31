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
const passwordHash=async (password,salt)=>Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:te.encode(salt),iterations:100000,hash:'SHA-256'},await crypto.subtle.importKey('raw',te.encode(password),'PBKDF2',false,['deriveBits']),256)),b=>b.toString(16).padStart(2,'0')).join('');
const text=(s,n)=>String(s??'').trim().slice(0,n);
async function body(req){if(Number(req.headers.get('content-length')||0)>16000)throw Error('Te grote aanvraag');const s=await req.text();if(s.length>16000)throw Error('Te grote aanvraag');return JSON.parse(s||'{}')}
async function auth(req,env){const m=(req.headers.get('cookie')||'').match(/(?:^|;\s*)talera_sid=([0-9a-f]{64})(?:;|$)/);if(!m)return null;const h=await sha(m[1]),row=await env.DB.prepare("SELECT a.id,a.email,a.display_name FROM sessions s JOIN accounts a ON s.account_id=a.id WHERE s.id_hash=? AND s.expires_at>? AND a.status='active'").bind(h,Date.now()).first();return row||null}
const cookie=(token,maxAge)=>'talera_sid='+token+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age='+maxAge;
const allowedWrite=req=>req.headers.get('origin')===new URL(req.url).origin;
const page404=()=>new Response('Deze herinnering is niet meer beschikbaar.',{status:404,headers:{...secHeaders,'content-type':'text/plain; charset=utf-8'}});
const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function rateLimit(req,env,category,threshold=12){const name=await sha((req.headers.get('CF-Connecting-IP')||'unknown').slice(0,60)+':'+category);const cutoff=Date.now()-600000;await env.DB.prepare("DELETE FROM auth_attempts WHERE bucket_key=? AND started_at<?").bind(name,cutoff).run();const current=await env.DB.prepare('SELECT hits FROM auth_attempts WHERE bucket_key=?').bind(name).first();if((current?.hits||0)>=threshold)return false;await env.DB.prepare('INSERT INTO auth_attempts(bucket_key,started_at,hits) VALUES(?,?,1) ON CONFLICT(bucket_key) DO UPDATE SET hits=hits+1').bind(name,Date.now()).run();return true}
async function issueSession(account,env){const t=secret();await env.DB.prepare('INSERT INTO sessions(id_hash,account_id,expires_at,created_at) VALUES(?,?,?,?)').bind(await sha(t),account.id,Date.now()+86400000*7,Date.now()).run();const r=json({account:{id:account.id,displayName:account.display_name,email:account.email}});r.headers.set('set-cookie',cookie(t,604800));return r}

const guestPageTemplate="<!doctype html>\n<html lang=\"nl\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n<meta name=\"robots\" content=\"noindex,nofollow,noarchive\">\n<meta name=\"referrer\" content=\"no-referrer\">\n<title>__TITLE__ · TALERA</title>\n__OG_META__\n<style>\n:root{font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",system-ui,sans-serif;color-scheme:dark}\n*{box-sizing:border-box}\nhtml,body{margin:0;background:#0e2638;color:#fff;min-height:100%;overscroll-behavior-x:none}\nbutton,input,textarea{font:inherit}button{cursor:pointer}\nbutton:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #72b5e8;outline-offset:2px}\n.stage{position:relative;width:100%;height:100dvh;min-height:540px;overflow:hidden;isolation:isolate;background:linear-gradient(155deg,#193b52,#092031)}\n.photo{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;filter:brightness(.84);z-index:-2}\n.shade{position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(180deg,rgba(5,18,29,.62) 0%,transparent 25%,rgba(6,20,32,.14) 51%,rgba(4,17,29,.90) 100%)}\n.header{padding:calc(20px + env(safe-area-inset-top)) 20px 12px;display:flex;align-items:center;gap:10px;max-width:1080px;margin:auto}\n.mark{font-weight:850;letter-spacing:.06em;font-size:17px;text-shadow:0 2px 8px #0006}\n.single{font-size:12px;line-height:1.25;opacity:.9;margin-left:auto;padding:7px 12px;border-radius:18px;border:1px solid #fff6;background:#132c3e88}\n.cover-copy{position:absolute;bottom:calc(118px + env(safe-area-inset-bottom));width:100%;max-width:1080px;padding:15px 22px 0;left:50%;transform:translateX(-50%)}\n.kicker{font-weight:700;color:#e3ebf0;font-size:13px;letter-spacing:.03em;margin:0 0 9px}\n.cover-copy h1{font-weight:800;font-size:clamp(29px,7.5vw,53px);letter-spacing:-.025em;line-height:1.12;margin:0 0 14px;text-shadow:0 2px 18px #0008}\n.date{font-size:14px;opacity:.88;margin:0 0 16px}\n.story-open{background:#fff;border:0;border-radius:22px;padding:12px 18px;color:#173951;font-weight:750}\n.listen{display:inline-flex;margin:0 0 13px;max-width:100%;align-items:center;gap:10px}\n.listen audio{max-width:min(75vw,320px);height:37px}\n.controls{position:absolute;bottom:calc(19px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:calc(100% - 38px);max-width:530px;display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:9px;border-radius:23px;border:1px solid #ffffff66;background:#183b50bb;backdrop-filter:blur(17px);-webkit-backdrop-filter:blur(17px)}\n.control{display:flex;justify-content:center;align-items:center;gap:8px;border:0;border-radius:17px;background:#ffffff10;color:white;min-height:53px;font-weight:750;font-size:16px}\n.control svg{width:26px;height:26px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}\n.control[aria-pressed=true]{color:#f7bbc1;background:#7a3a5370}\n.control .count{font-size:13px;font-weight:700;opacity:.9}\n.sheet[hidden]{display:none!important}\n.sheet{position:fixed;z-index:10;inset:0;display:flex;align-items:flex-end;justify-content:center;background:#061722aa}\n.sheet-wrap{height:min(80dvh,790px);width:min(100%,640px);border-radius:27px 27px 0 0;background:#fbfcfd;color:#243b4c;display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom);box-shadow:0 -10px 36px #0003}\n.sheet-head{display:flex;align-items:center;gap:10px;padding:13px 17px;border-bottom:1px solid #e2e9ed;flex-shrink:0}\n.sheet-head h2{margin:0;font-size:17px;text-align:center;flex:1}\n.close{background:#eaf0f3;color:#24495e;border:0;border-radius:50%;width:43px;height:43px;font-size:24px}\n.sheet-body{overflow-y:auto;overscroll-behavior:contain;flex:1;padding:19px 23px 40px}\n.sheet-body h3{font-size:25px;line-height:1.19;margin:0 0 15px}\n.story{white-space:pre-wrap;line-height:1.75;font-size:16px;margin:17px 0}\n.comment{padding:13px 0;border-bottom:1px solid #e2e9ed}\n.comment strong{display:block;margin-bottom:5px}\n.comment p{margin:0;white-space:pre-wrap;line-height:1.48}\n.muted{color:#687d8e;font-size:14px}\n.notice{background:#ebf2f6;padding:12px;border-radius:13px;margin:12px 0;color:#34516b}\n.notice.error{background:#ffeae8;color:#9e2d25}\nform label{display:block;margin:12px 0 5px;font-size:14px;font-weight:700}\ninput,textarea{border:1px solid #b8c9d4;border-radius:11px;padding:12px 13px;width:100%;background:#fff;color:#18364a}\ntextarea{min-height:90px;resize:vertical}\n.primary{border:0;background:#315f7e;color:#fff;font-weight:750;border-radius:13px;padding:13px 18px;min-height:47px;margin:10px 0;width:100%}\n.secondary{border:1px solid #d9e6eb;color:#315f7e;background:#fff;border-radius:13px;padding:12px 18px;margin-top:8px;width:100%}\nbody.dialog-open{overflow:hidden}\n@media(min-width:780px){.stage{height:100dvh}.photo{object-fit:contain;background:#17374b}.cover-copy{padding-bottom:8px}}\n</style>\n</head>\n<body>\n<main class=\"stage\" aria-label=\"Gedeelde TALERA-herinnering\">\n__PHOTO__\n<div class=\"shade\"></div>\n<header class=\"header\"><span class=\"mark\">TALERA</span><span class=\"single\">Persoonlijk gedeeld · één herinnering</span></header>\n<div class=\"cover-copy\">\n<p class=\"kicker\">Een herinnering voor jou</p>\n<h1>__TITLE__</h1>\n<p class=\"date\">__DATE__</p>\n__AUDIO__\n<button class=\"story-open\" id=\"readStory\" type=\"button\">Lees het verhaal</button>\n</div>\n<div class=\"controls\" aria-label=\"Reageren op deze herinnering\">\n<button class=\"control\" id=\"heart\" type=\"button\" aria-pressed=\"false\" aria-label=\"Hartje geven\">\n<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M20.8 4.8c-2-2.1-5.2-2.1-7.3 0L12 6.3l-1.5-1.5c-2.1-2.1-5.3-2.1-7.3 0-2.3 2.2-2.3 5.6 0 7.8L12 21l8.8-8.4c2.2-2.2 2.2-5.6 0-7.8z\"/></svg>\n<span class=\"count\" id=\"heartCount\">0</span>\n</button>\n<button class=\"control\" id=\"replies\" type=\"button\" aria-label=\"Reacties bekijken\">\n<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M20.5 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.8-.3-4-.9L3 21l1.6-4.8A8.5 8.5 0 1 1 20.5 11.5z\"/></svg>\n<span class=\"count\" id=\"replyCount\">0</span>\n</button>\n</div>\n</main>\n<section class=\"sheet\" id=\"sheet\" hidden aria-label=\"TALERA-herinnering\">\n<div class=\"sheet-wrap\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"sheetTitle\" tabindex=\"-1\">\n<div class=\"sheet-head\"><button class=\"close\" id=\"close\" type=\"button\" aria-label=\"Sluiten\">×</button><h2 id=\"sheetTitle\">Herinnering</h2><span style=\"width:43px\"></span></div>\n<div class=\"sheet-body\" id=\"sheetBody\"></div>\n</div>\n</section>\n<script>\n(()=>{\n'use strict';\nconst title=__TITLE_JSON__,story=__STORY_JSON__,date=__DATE_JSON__;\nconst token=location.pathname.split('/')[2];\nconst $=id=>document.getElementById(id);\nconst panel=$('sheet'),body=$('sheetBody');\nconst signed={account:null,intent:null};\nlet mode='story',thread={items:[],heartCount:0,hearted:false},busy=false,loading=false;\nconst api=async(path,method='GET',data)=>{\n const opts={method,credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}};\n if(data!==undefined){opts.headers['content-type']='application/json';opts.body=JSON.stringify(data)}\n const res=await fetch(path,opts),json=await res.json().catch(()=>({}));\n if(!res.ok){const err=new Error(json.error||'De aanvraag is niet gelukt');err.status=res.status;throw err}\n return json;\n};\nconst base='/api/guest/threads/'+encodeURIComponent(token);\nfunction create(tag,text,cls){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x}\nfunction clear(){body.replaceChildren()}\nfunction alertText(text,error){const n=create('p',text,'notice'+(error?' error':''));body.prepend(n)}\nfunction field(label,type,name,auto){\n const wrap=create('label',label);\n const input=create('input');input.type=type;input.name=name;input.required=true;input.autocomplete=auto;\n if(type==='password')input.minLength=8;\n wrap.append(input);return wrap;\n}\nfunction button(text,fn,cls='primary'){\n const n=create('button',text,cls);n.type='button';n.addEventListener('click',fn);return n;\n}\nfunction formButton(text){const b=create('button',text,'primary');b.type='submit';return b}\nfunction open(next){\n mode=next;panel.hidden=false;document.body.classList.add('dialog-open');\n render();panel.querySelector('.sheet-wrap').focus({preventScroll:true});\n}\nfunction close(){panel.hidden=true;document.body.classList.remove('dialog-open')}\nfunction formatComments(){\n const list=create('div');\n if(!thread.items.length)list.append(create('p','Er zijn nog geen reacties.','muted'));\n for(const c of thread.items){\n  const row=create('div',undefined,'comment');\n  row.append(create('strong',c.display_name||'TALERA-gebruiker'),create('p',c.body||''));\n  list.append(row);\n }\n return list;\n}\nfunction render(){\n $('sheetTitle').textContent=({story:'Het verhaal',comments:'Reacties',login:'Aanmelden',register:'Account aanmaken'})[mode]||'TALERA';\n clear();\n if(mode==='story'){\n  body.append(create('h3',title),create('p',date,'muted'),create('p',story,'story'));\n  return;\n }\n if(mode==='comments'){\n  body.append(formatComments());\n  if(!signed.account){\n   body.append(create('p','Meld je met je TALERA-account aan om een hartje of reactie achter te laten.','notice'));\n   body.append(button('Aanmelden om te reageren',()=>{signed.intent='comments';open('login')}));\n   body.append(button('Account aanmaken',()=>{signed.intent='comments';open('register')},'secondary'));\n  }else{\n   const form=create('form');\n   const label=create('label','Jouw reactie'),input=create('textarea');\n   input.name='body';input.required=true;input.maxLength=4000;label.append(input);\n   form.append(label,formButton('Reactie plaatsen'));\n   form.addEventListener('submit',async e=>{\n    e.preventDefault();if(busy)return;busy=true;\n    try{await api(base+'/comments','POST',{body:input.value});await refresh();render()}\n    catch(err){if(err.status===401){signed.account=null;signed.intent='comments';open('login')}else alertText(err.message,true)}\n    finally{busy=false}\n   });\n   body.append(form);\n  }\n  return;\n }\n const registering=mode==='register',form=create('form');\n body.append(create('p','Gebruik jouw TALERA-account. Na aanmelden keer je terug naar dezelfde herinnering.','muted'));\n if(registering){\n  form.append(field('Naam','text','displayName','name'),field('Unieke gebruikersnaam','text','username','username'));\n }\n form.append(field('E-mailadres','email','email','email'),field('Wachtwoord','password','password',registering?'new-password':'current-password'));\n form.append(formButton(registering?'Account aanmaken':'Aanmelden'));\n form.addEventListener('submit',async e=>{\n  e.preventDefault();if(busy)return;busy=true;\n  const data=Object.fromEntries(new FormData(form).entries());\n  try{\n   const r=await api(registering?'/api/register':'/api/login','POST',data);\n   signed.account=r.account;await refresh();const intention=signed.intent;\n   if(intention==='heart'){signed.intent=null;busy=false;await toggleHeart();close()}\n   else{signed.intent=null;open('comments')}\n  }catch(err){alertText(err.message,true)}finally{busy=false}\n });\n body.append(form);\n body.append(button(registering?'Ik heb al een account':'Account aanmaken',()=>open(registering?'login':'register'),'secondary'));\n}\nfunction syncCounts(){\n $('heartCount').textContent=String(thread.heartCount||0);\n $('replyCount').textContent=String(thread.items?.length||0);\n $('heart').setAttribute('aria-pressed',String(!!thread.hearted));\n}\nasync function refresh(){\n if(loading)return;loading=true;\n try{\n  const result=await api(base);\n  thread=result;signed.account=result.account||null;syncCounts();\n  if(mode==='comments'&&!panel.hidden)render();\n }catch(err){if(err.status===404){$('readStory').textContent='Deze deellink is verlopen';$('readStory').disabled=true;close()}}\n finally{loading=false}\n}\nasync function toggleHeart(){\n if(busy)return;\n busy=true;\n try{\n  await api(base+'/like','POST',{});\n  await refresh();\n }catch(err){\n  if(err.status===401){signed.account=null;signed.intent='heart';open('login')}\n  else{open('comments');alertText(err.message,true)}\n }finally{busy=false}\n}\n$('readStory').addEventListener('click',()=>open('story'));\n$('replies').addEventListener('click',()=>{open('comments');void refresh()});\n$('heart').addEventListener('click',()=>{if(!signed.account){signed.intent='heart';open('login')}else void toggleHeart()});\n$('close').addEventListener('click',close);\npanel.addEventListener('click',e=>{if(e.target===panel)close()});\ndocument.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)close()});\nvoid refresh();\nsetInterval(()=>{if(!document.hidden)void refresh()},8000);\n})();\n</script>\n</body>\n</html>";
const safeScriptJSON=x=>JSON.stringify(String(x??'')).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
async function threadSnapshot(env,memoryId,viewerId){
 const comments=await env.DB.prepare('SELECT c.id,c.body,c.parent_id,c.created_at,c.account_id AS author_id,a.display_name FROM comments c JOIN accounts a ON a.id=c.account_id WHERE c.memory_id=? ORDER BY c.created_at LIMIT 200').bind(memoryId).all();
 const hearts=await env.DB.prepare('SELECT COUNT(*) AS n FROM likes WHERE memory_id=?').bind(memoryId).first();
 const own=viewerId?await env.DB.prepare('SELECT 1 AS yes FROM likes WHERE memory_id=? AND account_id=?').bind(memoryId,viewerId).first():null;
 return {items:comments.results||[],heartCount:hearts?.n||0,hearted:!!own};
}
async function addThreadComment(env,memoryId,authorId,bodyText){
 const id=random(),now=Date.now();
 await env.DB.prepare('INSERT INTO comments(id,memory_id,account_id,parent_id,body,created_at) VALUES(?,?,?,?,?,?)').bind(id,memoryId,authorId,null,bodyText,now).run();
 const receivers=await env.DB.prepare('SELECT owner_account_id AS id FROM memory_grants WHERE memory_id=? AND revoked_at IS NULL UNION SELECT recipient_account_id AS id FROM memory_grants WHERE memory_id=? AND revoked_at IS NULL UNION SELECT account_id AS id FROM memories WHERE id=?').bind(memoryId,memoryId,memoryId).all();
 for(const receiver of receivers.results||[]){if(receiver.id!==authorId)await env.DB.prepare('INSERT INTO messages(id,account_id,memory_id,comment_id,kind,created_at) VALUES(?,?,?,?,?,?)').bind(random(),receiver.id,memoryId,id,'comment',now).run()}
 return id;
}
async function toggleThreadHeart(env,memoryId,authorId,ownerId){
 const found=await env.DB.prepare('SELECT 1 AS yes FROM likes WHERE memory_id=? AND account_id=?').bind(memoryId,authorId).first();
 if(found)await env.DB.prepare('DELETE FROM likes WHERE memory_id=? AND account_id=?').bind(memoryId,authorId).run();
 else{
  await env.DB.prepare('INSERT INTO likes(memory_id,account_id,created_at) VALUES(?,?,?)').bind(memoryId,authorId,Date.now()).run();
  if(ownerId!==authorId)await env.DB.prepare('INSERT INTO messages(id,account_id,memory_id,comment_id,kind,created_at) VALUES(?,?,?,?,?,?)').bind(random(),ownerId,memoryId,null,'like',Date.now()).run();
 }
 return !found;
}

async function handler(req,env){
 const u=new URL(req.url),p=u.pathname,m=req.method;
 if(p==='/__health'&&m==='GET'){const tables=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('accounts','sessions','memories','comments','likes','shares','messages')").all();return json({service:'talera-clean-core',staging:true,ready:(tables.results||[]).length===7,accountProvider:'TALERA',cloudflareLogin:false})}


 const guestThread=p.match(/^\/api\/guest\/threads\/([0-9a-f]{64})(\/(?:comments|like))?$/);
 if(guestThread){
  if(m!=='GET'&&m!=='POST')return error(405);
  if(m==='POST'&&!allowedWrite(req))return error(403,'Ongeldige herkomst');
  const share=await env.DB.prepare("SELECT m.id AS memory_id,m.account_id AS owner_id FROM shares s JOIN memories m ON m.id=s.memory_id AND m.account_id=s.account_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?").bind(await sha(guestThread[1]),Date.now()).first();
  if(!share)return error(404,'Deze deellink is verlopen of ingetrokken');
  const viewer=await auth(req,env);
  if(!guestThread[2]&&m==='GET')return json({...await threadSnapshot(env,share.memory_id,viewer?.id),account:viewer?{id:viewer.id,displayName:viewer.display_name}:null});
  if(m!=='POST'||!guestThread[2])return error(405);
  if(!viewer)return error(401,'Meld je aan bij TALERA om te reageren');
  if(!await rateLimit(req,env,'guest-social',80))return error(429,'Probeer het later opnieuw');
  if(guestThread[2]==='/like')return json({hearted:await toggleThreadHeart(env,share.memory_id,viewer.id,share.owner_id)});
  const data=await body(req),comment=text(data.body,4000);
  if(!comment)return error(400,'Schrijf eerst een reactie');
  const id=await addThreadComment(env,share.memory_id,viewer.id,comment);
  return json({id},201);
 }
 const guestMedia=p.match(/^\/gedeeld\/([0-9a-f]{64})\/(foto|foto-volledig|geluid)$/);
 if(guestMedia&&(m==='GET'||m==='HEAD')){
  const row=await env.DB.prepare("SELECT s.id FROM shares s JOIN memories m ON m.id=s.memory_id AND m.account_id=s.account_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?").bind(await sha(guestMedia[1]),Date.now()).first();
  if(!row||!env.SHARE_MEDIA)return page404();
  const name=guestMedia[2],isAudio=name==='geluid';
  const key=(name==='foto'?'guest-previews/':name==='foto-volledig'?'guest-full/':'guest-audio/')+row.id+(isAudio?'.mp3':'.jpg');
  const obj=await env.SHARE_MEDIA.get(key);
  if(!obj)return page404();
  const headers={...secHeaders,'content-type':isAudio?'audio/mpeg':'image/jpeg','x-robots-tag':'noindex,nofollow','cross-origin-resource-policy':'cross-origin'};
  return new Response(m==='HEAD'?null:obj.body,{headers});
 }
 if(p.startsWith('/gedeeld/')){
  if(m!=='GET'&&m!=='HEAD')return error(405);
  const token=p.slice('/gedeeld/'.length);
  if(!/^[0-9a-f]{64}$/.test(token))return page404();
  const row=await env.DB.prepare("SELECT s.id,m.title,m.story_text,m.event_date FROM shares s JOIN memories m ON m.id=s.memory_id AND m.account_id=s.account_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?").bind(await sha(token),Date.now()).first();
  if(!row)return page404();
  const imageUrl=new URL('/gedeeld/'+token+'/foto',req.url).href;
  const fullUrl=new URL('/gedeeld/'+token+'/foto-volledig',req.url).href;
  const soundUrl=new URL('/gedeeld/'+token+'/geluid',req.url).href;
  const pageUrl=new URL('/gedeeld/'+token,req.url).href;
  const hasImage=!!(env.SHARE_MEDIA&&await env.SHARE_MEDIA.head('guest-previews/'+row.id+'.jpg'));
  const hasFull=!!(env.SHARE_MEDIA&&await env.SHARE_MEDIA.head('guest-full/'+row.id+'.jpg'));
  const hasSound=!!(env.SHARE_MEDIA&&await env.SHARE_MEDIA.head('guest-audio/'+row.id+'.mp3'));
  const story=String(row.story_text||'').trim(),storyTitle=String(row.title||'').trim();
  const trimmed=story.slice(0,storyTitle.length).toLowerCase()===storyTitle.toLowerCase()?story.slice(storyTitle.length).replace(/^[\s.:·—–-]+/,'').trim():story;
  const caption=(trimmed||'Een persoonlijke herinnering voor jou.').slice(0,145);
  const meta='<meta property="og:type" content="article"><meta property="og:site_name" content="TALERA"><meta property="og:title" content="'+escape(row.title)+' · TALERA"><meta property="og:description" content="'+escape(caption)+'"><meta property="og:url" content="'+escape(pageUrl)+'">'+(hasImage?'<meta property="og:image" content="'+escape(imageUrl)+'"><meta property="og:image:secure_url" content="'+escape(imageUrl)+'"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">':'');
  const photo=hasImage?'<img class="photo" src="'+escape(hasFull?fullUrl:imageUrl)+'" alt="Foto bij de gedeelde herinnering">':'';
  const audio=hasSound?'<div class="listen"><span>Geluid</span><audio controls preload="none" src="'+escape(soundUrl)+'">Audio afspelen</audio></div>':'';
  const html=guestPageTemplate.replaceAll('__TITLE__',escape(row.title)).replaceAll('__STORY_JSON__',safeScriptJSON(row.story_text)).replaceAll('__TITLE_JSON__',safeScriptJSON(row.title)).replaceAll('__DATE_JSON__',safeScriptJSON(row.event_date)).replaceAll('__DATE__',escape(row.event_date)).replaceAll('__OG_META__',meta).replaceAll('__PHOTO__',photo).replaceAll('__AUDIO__',audio);
  return new Response(m==='HEAD'?null:html,{headers:{...secHeaders,'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; img-src 'self'; media-src 'self'; connect-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"}});
 }
 if(m!=='GET'&&!allowedWrite(req))return error(403,'Ongeldige herkomst');
 if(p==='/api/register'&&m==='POST'){
  if(!await rateLimit(req,env,'register',3))return error(429,'Probeer later opnieuw');
  const d=await body(req),email=text(d.email,254).toLowerCase(),display=text(d.displayName,100),password=String(d.password||''),handle=String(d.username||'').trim().toLowerCase().replace(/^@/,'').replace(/\s+/g,' ');
  if(!emailRule.test(email)||display.length<1||password.length<8||password.length>128||!/^[a-z0-9][a-z0-9._ -]{2,29}$/.test(handle))return error(400,'Vul geldige gegevens in (wachtwoord minimaal 8 tekens)');
  const salt=secret(),digest=await passwordHash(password,salt),id=random();
  try{await env.DB.prepare('INSERT INTO accounts(id,email,display_name,password_salt,password_hash,created_at,status,public_handle) VALUES(?,?,?,?,?,?,?,?)').bind(id,email,display,salt,digest,Date.now(),'active',handle).run()}catch{return error(409,'Registreren is niet gelukt')}
  return issueSession({id,display_name:display,email},env);
 }
 if(p==='/api/login'&&m==='POST'){
  if(!await rateLimit(req,env,'login',12))return error(429,'Probeer later opnieuw');
  const d=await body(req),email=text(d.email,254).toLowerCase(),password=String(d.password||'');
  const a=await env.DB.prepare("SELECT id,email,display_name,password_salt,password_hash FROM accounts WHERE email=? AND status='active'").bind(email).first();
  const comparison=await passwordHash(password.slice(0,128),a?.password_salt||'unknown-salt');
  if(!a||comparison!==a.password_hash)return error(401,'Gegevens niet herkend');
  return issueSession(a,env);
 }

 if(p==='/api/password/forgot'&&m==='POST'){
  if(!env.RESEND_API_KEY||!env.RESET_FROM)return error(503,'Wachtwoordherstel wordt nog ingericht. Probeer later opnieuw.');
  if(!await rateLimit(req,env,'password-reset-request',5))return error(429,'Probeer later opnieuw');
  const d=await body(req),email=text(d.email,254).toLowerCase();
  const generic=json({message:'Als dit e-mailadres bij TALERA bekend is, ontvang je een herstelmail.'});
  if(!emailRule.test(email))return generic;
  const account=await env.DB.prepare("SELECT id,email FROM accounts WHERE email=? AND status='active'").bind(email).first();
  if(!account)return generic;
  const t=secret(),h=await sha(t),now=Date.now();
  await env.DB.prepare('DELETE FROM password_resets WHERE account_id=?').bind(account.id).run();
  await env.DB.prepare('INSERT INTO password_resets(token_hash,account_id,created_at,expires_at) VALUES(?,?,?,?)').bind(h,account.id,now,now+15*60*1000).run();
  const origin=new URL(req.url).origin,link=origin+'/wachtwoord-herstellen?code='+t;
  let sent=false;
  try{
   const resp=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'authorization':'Bearer '+env.RESEND_API_KEY,'content-type':'application/json'},body:JSON.stringify({from:env.RESET_FROM,to:[email],subject:'Herstel je TALERA-wachtwoord',text:'Je hebt een wachtwoordherstel aangevraagd voor TALERA.\n\nGebruik deze link binnen 15 minuten:\n'+link+'\n\nHeb jij dit niet aangevraagd? Negeer dit bericht.'})});
   sent=resp.ok;
  }catch{}
  if(!sent){await env.DB.prepare('DELETE FROM password_resets WHERE token_hash=?').bind(h).run();return error(503,'Herstelmail kan momenteel niet worden verzonden. Probeer later opnieuw.')}
  return generic;
 }
 if(p==='/api/password/reset'&&m==='POST'){
  if(!await rateLimit(req,env,'password-reset-confirm',10))return error(429,'Probeer later opnieuw');
  const d=await body(req),token=String(d.code||''),password=String(d.password||'');
  if(!/^[0-9a-f]{64}$/.test(token)||password.length<8||password.length>128)return error(400,'Ongeldige of verlopen link of wachtwoord');
  const tokenHash=await sha(token),now=Date.now();
  const record=await env.DB.prepare('SELECT account_id FROM password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at>?').bind(tokenHash,now).first();
  if(!record)return error(400,'De herstellink is ongeldig, verlopen of al gebruikt.');
  const salt=secret(),digest=await passwordHash(password,salt);
  const upd=await env.DB.prepare('UPDATE password_resets SET used_at=? WHERE token_hash=? AND used_at IS NULL AND expires_at>?').bind(now,tokenHash,now).run();
  if(upd.meta?.changes!==1)return error(400,'De herstellink is al gebruikt.');
  await env.DB.batch([env.DB.prepare('UPDATE accounts SET password_salt=?,password_hash=? WHERE id=?').bind(salt,digest,record.account_id),env.DB.prepare('DELETE FROM sessions WHERE account_id=?').bind(record.account_id),env.DB.prepare('DELETE FROM password_resets WHERE account_id=? AND token_hash<>?').bind(record.account_id,tokenHash)]);
  const r=json({ok:true,message:'Je wachtwoord is gewijzigd. Meld je opnieuw aan.'});r.headers.set('set-cookie',cookie('',0));return r;
 }
 const user=await auth(req,env);
 if(p==='/api/me'&&m==='GET')return user?json({account:{id:user.id,displayName:user.display_name,email:user.email}}):error(401,'Aanmelden bij TALERA is nodig');
 if(p==='/api/logout'&&m==='POST'){if(user){const c=(req.headers.get('cookie')||'').match(/talera_sid=([0-9a-f]{64})/);if(c)await env.DB.prepare('DELETE FROM sessions WHERE id_hash=?').bind(await sha(c[1])).run()}const x=json({ok:true});x.headers.set('set-cookie',cookie('',0));return x}
 if(!user)return error(401,'Aanmelden bij TALERA is nodig');


 if(p==='/api/discovery'&&m==='GET'){
  const a=await env.DB.prepare("SELECT discoverable,public_handle FROM accounts WHERE id=?").bind(user.id).first();
  return json({discoverable:!!a?.discoverable,publicHandle:a?.public_handle||null});
 }
 if(p==='/api/discovery'&&m==='POST'){
  const d=await body(req),enabled=d.discoverable===true;
  const handle=String(d.username||'').trim().toLowerCase().replace(/^@/,'').replace(/\s+/g,' ');
  if(handle&&!/^[a-z0-9][a-z0-9._ -]{2,29}$/.test(handle))return error(400,'Gebruikersnaam moet 3 tot 30 tekens hebben');
  try{await env.DB.prepare("UPDATE accounts SET discoverable=?,public_handle=CASE WHEN ?<>'' THEN ? ELSE public_handle END WHERE id=?").bind(enabled?1:0,handle,handle,user.id).run()}catch{return error(409,'Deze gebruikersnaam is al in gebruik')}
  return json({discoverable:enabled,publicHandle:handle||user.public_handle||null});
 }
 if(p==='/api/people/search'&&m==='GET'){
  if(!await rateLimit(req,env,'people-search',60))return error(429,'Te veel zoekopdrachten');
  const q=text(u.searchParams.get('q'),70).trim();
  if(q.length<2)return json({items:[]});
  const term='%'+q.replace(/[%_\\]/g,'')+'%';
  const r=await env.DB.prepare("SELECT id,display_name,public_handle FROM accounts WHERE discoverable=1 AND status='active' AND id<>? AND (lower(display_name) LIKE lower(?) OR lower(public_handle) LIKE lower(?)) ORDER BY display_name LIMIT 12").bind(user.id,term,term).all();
  return json({items:(r.results||[]).map(x=>({id:x.id,name:x.display_name,handle:x.public_handle}))});
 }
 if(p==='/api/people'&&m==='GET'){
  const q=text(u.searchParams.get('email'),254).toLowerCase();
  if(!emailRule.test(q))return json({items:[]});
  const rows=await env.DB.prepare("SELECT id,display_name FROM accounts WHERE email=? AND id<>? AND status='active'").bind(q,user.id).all();
  return json({items:rows.results||[]});
 }
 if(p==='/api/shared-with-me'&&m==='GET'){
  const rows=await env.DB.prepare("SELECT m.id,m.title,m.story_text,m.event_date,a.display_name AS owner_name FROM memory_grants g JOIN memories m ON g.memory_id=m.id JOIN accounts a ON a.id=m.account_id WHERE g.recipient_account_id=? AND g.revoked_at IS NULL ORDER BY g.created_at DESC LIMIT 200").bind(user.id).all();return json({items:rows.results||[]});
 }
 const grant=p.match(/^\/api\/memories\/([0-9a-f-]{36})\/grant$/);
 if(grant&&m==='POST'){
  const d=await body(req),recipientId=String(d.recipientId||'');
  if(!uuidRule.test(recipientId))return error(400,'Kies eerst een TALERA-gebruiker uit de zoekresultaten');
  const own=await env.DB.prepare('SELECT id,title FROM memories WHERE id=? AND account_id=?').bind(grant[1],user.id).first();
  if(!own)return error(404,'Herinnering niet gevonden');
  const recipient=await env.DB.prepare("SELECT id,display_name FROM accounts WHERE id=? AND discoverable=1 AND status='active'").bind(recipientId).first();
  if(!recipient||recipient.id===user.id)return error(404,'Deze gebruiker is niet beschikbaar om mee te delen');
  const now=Date.now();await env.DB.prepare('INSERT INTO memory_grants(memory_id,recipient_account_id,owner_account_id,created_at,revoked_at) VALUES(?,?,?,?,NULL) ON CONFLICT(memory_id,recipient_account_id) DO UPDATE SET revoked_at=NULL,created_at=excluded.created_at').bind(grant[1],recipient.id,user.id,now).run();
  await env.DB.prepare('INSERT INTO messages(id,account_id,memory_id,kind,created_at) VALUES(?,?,?,?,?)').bind(random(),recipient.id,grant[1],'shared',now).run();
  return json({ok:true,recipientName:recipient.display_name},201);
 }
 const accessible=async id=>env.DB.prepare('SELECT m.id,m.account_id FROM memories m LEFT JOIN memory_grants g ON g.memory_id=m.id AND g.recipient_account_id=? AND g.revoked_at IS NULL WHERE m.id=? AND (m.account_id=? OR g.recipient_account_id IS NOT NULL)').bind(user.id,id,user.id).first();
 const thread=p.match(/^\/api\/threads\/([0-9a-f-]{36})$/);
 if(thread&&m==='GET'){
  if(!await accessible(thread[1]))return error(404,'Herinnering niet gevonden');
  return json(await threadSnapshot(env,thread[1],user.id));
 }
 const threadPost=p.match(/^\/api\/threads\/([0-9a-f-]{36})\/comments$/);
 if(threadPost&&m==='POST'){
  const memory=await accessible(threadPost[1]);if(!memory)return error(404,'Herinnering niet gevonden');
  const d=await body(req),bodyText=text(d.body,4000);if(!bodyText)return error(400,'Reactie is leeg');
  const id=await addThreadComment(env,threadPost[1],user.id,bodyText);
  return json({id},201);
 }
 const threadLike=p.match(/^\/api\/threads\/([0-9a-f-]{36})\/like$/);
 if(threadLike&&m==='POST'){
  const memory=await accessible(threadLike[1]);if(!memory)return error(404,'Herinnering niet gevonden');
  return json({hearted:await toggleThreadHeart(env,threadLike[1],user.id,memory.account_id)});
 }

 if(p==='/api/pwa/memory-link'&&m==='GET'){
  const localId=String(u.searchParams.get('localMemoryId')||'');
  if(!localId||localId.length>128)return error(400,'Ongeldige herinnering');
  const row=await env.DB.prepare('SELECT memory_id FROM pwa_memory_links WHERE account_id=? AND local_memory_id=?').bind(user.id,localId).first();
  return json({memoryId:row?.memory_id||null});
 }
 if(p==='/api/pwa/memory-link'&&m==='POST'){
  const d=await body(req),localId=String(d.localMemoryId||''),title=text(d.title,180),storyText=text(d.storyText,12000),eventDate=text(d.eventDate,32);
  if(d.consent!==true)return error(403,'Publiceren vereist uitdrukkelijke toestemming');
  if(!localId||localId.length>128||!title||!storyText)return error(400,'Ongeldige herinnering');
  const existing=await env.DB.prepare('SELECT memory_id FROM pwa_memory_links WHERE account_id=? AND local_memory_id=?').bind(user.id,localId).first();
  if(existing)return json({memoryId:existing.memory_id,alreadyLinked:true});
  const id=random(),now=Date.now();
  try{
   await env.DB.batch([
    env.DB.prepare('INSERT INTO memories(id,account_id,title,story_text,event_date,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(id,user.id,title,storyText,eventDate,now,now),
    env.DB.prepare('INSERT INTO pwa_memory_links(account_id,local_memory_id,memory_id,created_at) VALUES(?,?,?,?)').bind(user.id,localId,id,now)
   ]);
  }catch(e){return error(409,'Herinnering kon niet eenduidig worden gekoppeld')}
  return json({memoryId:id,alreadyLinked:false},201);
 }
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

 const uploadPhoto=p.match(/^\/api\/shares\/([0-9a-f-]{36})\/photo$/);
 if(uploadPhoto&&m==='POST'){
  const share=await env.DB.prepare("SELECT s.id FROM shares s JOIN memories mem ON mem.id=s.memory_id AND mem.account_id=s.account_id WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>?").bind(uploadPhoto[1],user.id,Date.now()).first();
  if(!share)return error(404,'Uitnodiging niet gevonden');
  if(!env.SHARE_MEDIA)return error(503,'Veilige foto-opslag nog niet beschikbaar');
  const ctype=(req.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  if(ctype!=='image/jpeg')return error(415,'Stuur alleen een JPEG-foto');
  if(Number(req.headers.get('content-length')||0)>1500000)return error(413,'Foto te groot');
  const bytes=await req.arrayBuffer();
  if(bytes.byteLength<80||bytes.byteLength>1500000)return error(413,'Foto moet kleiner zijn dan 1,5 MB');
  const magic=new Uint8Array(bytes);
  if(magic[0]!==255||magic[1]!==216||magic[2]!==255)return error(415,'Geen geldige JPEG');
  await env.SHARE_MEDIA.put('guest-previews/'+share.id+'.jpg',bytes,{httpMetadata:{contentType:'image/jpeg'}});
  return json({ok:true,photo:true});
 }
 const revoke=p.match(/^\/api\/shares\/([0-9a-f-]{36})\/revoke$/);
 if(revoke&&m==='POST'){const r=await env.DB.prepare('UPDATE shares SET revoked_at=? WHERE id=? AND account_id=? AND revoked_at IS NULL').bind(Date.now(),revoke[1],user.id).run();const revoked=(r.meta?.changes||0)>0;if(revoked&&env.SHARE_MEDIA)await env.SHARE_MEDIA.delete('guest-previews/'+revoke[1]+'.jpg');return json({revoked})}
 const readThread=p.match(/^\/api\/messages\/memory\/([0-9a-f-]{36})\/read$/);
 if(readThread&&m==='POST'){const exists=await accessible(readThread[1]);if(!exists)return error(404,'Herinnering niet gevonden');await env.DB.prepare('UPDATE messages SET read_at=COALESCE(read_at,?) WHERE account_id=? AND memory_id=? AND read_at IS NULL').bind(Date.now(),user.id,readThread[1]).run();return json({ok:true})}
 if(p==='/api/messages/unread-count'&&m==='GET'){const row=await env.DB.prepare('SELECT COUNT(*) AS total FROM messages WHERE account_id=? AND read_at IS NULL').bind(user.id).first();return json({unread:row?.total||0})}
 const markRead=p.match(/^\/api\/messages\/([0-9a-f-]{36})\/read$/);
 if(markRead&&m==='POST'){const r=await env.DB.prepare('UPDATE messages SET read_at=COALESCE(read_at,?) WHERE id=? AND account_id=?').bind(Date.now(),markRead[1],user.id).run();return json({ok:(r.meta?.changes||0)>0})}
 if(p==='/api/messages'&&m==='GET'){const rows=await env.DB.prepare('SELECT id,memory_id,comment_id,kind,read_at,created_at FROM messages WHERE account_id=? ORDER BY created_at DESC LIMIT 100').bind(user.id).all();return json({items:rows.results||[]})}
 return error(404,'Niet gevonden');
}
export default {async fetch(request,env){try{return await handler(request,env)}catch(e){return error(500,'TALERA kon de aanvraag niet verwerken')}}};
