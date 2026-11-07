/* TALERA | account birth date + timeline anchors, test-only Worker.
 * Service proxy preserves the entire approved TALERA implementation unchanged.
 * Sole persistent new data: private account_id -> ISO birth_date in dedicated D1.
 */
// Audited extension to the existing five PACKS; initialize before TaleraI18n reads its dictionary.
const AUDIT_BIRTH_LANG_PACKS={"nl":{"account.birth.label":"Geboortedatum","account.birth.title":"Mijn geboortedatum","account.birth.privacy":"Alleen voor je eigen tijdlijnen. Niet zichtbaar voor andere gebruikers.","account.birth.save":"Geboortedatum bewaren","account.birth.currentSaved":"Geboortedatum opgeslagen bij je account.","account.birth.saved":"Geboortedatum bewaard. Open de tijdlijnen opnieuw om de nieuwe begindatum te zien.","account.birth.saveFailed":"De geboortedatum kon niet worden opgeslagen. Probeer het opnieuw.","account.birth.invalid":"Vul een geldige geboortedatum in.","account.birth.signIn":"Meld je aan bij TALERA.","account.birth.createdPending":"Je account is aangemaakt. De geboortedatum is nog niet opgeslagen; vul deze in bij Mijn account.","account.password.minimum":"Wachtwoord (minimaal 8 tekens)"},"en":{"account.birth.label":"Date of birth","account.birth.title":"My date of birth","account.birth.privacy":"Only for your own timelines. Not visible to other users.","account.birth.save":"Save date of birth","account.birth.currentSaved":"Date of birth saved to your account.","account.birth.saved":"Date of birth saved. Reopen the timelines to see the new starting date.","account.birth.saveFailed":"Your date of birth could not be saved. Please try again.","account.birth.invalid":"Enter a valid date of birth.","account.birth.signIn":"Sign in to TALERA.","account.birth.createdPending":"Your account was created, but your date of birth was not saved. Add it under My account.","account.password.minimum":"Password (at least 8 characters)"},"de":{"account.birth.label":"Geburtsdatum","account.birth.title":"Mein Geburtsdatum","account.birth.privacy":"Nur für deine Zeitleisten. Für andere Nutzer nicht sichtbar.","account.birth.save":"Geburtsdatum speichern","account.birth.currentSaved":"Geburtsdatum in deinem Konto gespeichert.","account.birth.saved":"Geburtsdatum gespeichert. Öffne die Zeitleisten erneut, um den neuen Anfang zu sehen.","account.birth.saveFailed":"Das Geburtsdatum konnte nicht gespeichert werden. Bitte versuche es erneut.","account.birth.invalid":"Bitte gib ein gültiges Geburtsdatum ein.","account.birth.signIn":"Melde dich bei TALERA an.","account.birth.createdPending":"Dein Konto wurde erstellt, aber dein Geburtsdatum wurde nicht gespeichert. Trage es unter Mein Konto ein.","account.password.minimum":"Passwort (mindestens 8 Zeichen)"},"fr":{"account.birth.label":"Date de naissance","account.birth.title":"Ma date de naissance","account.birth.privacy":"Uniquement pour vos frises chronologiques. Invisible pour les autres utilisateurs.","account.birth.save":"Enregistrer la date de naissance","account.birth.currentSaved":"Date de naissance enregistrée dans votre compte.","account.birth.saved":"Date de naissance enregistrée. Rouvrez les frises pour voir la nouvelle date de début.","account.birth.saveFailed":"Impossible d’enregistrer votre date de naissance. Veuillez réessayer.","account.birth.invalid":"Saisissez une date de naissance valide.","account.birth.signIn":"Connectez-vous à TALERA.","account.birth.createdPending":"Votre compte a été créé, mais votre date de naissance n’a pas été enregistrée. Ajoutez-la dans Mon compte.","account.password.minimum":"Mot de passe (au moins 8 caractères)"},"es":{"account.birth.label":"Fecha de nacimiento","account.birth.title":"Mi fecha de nacimiento","account.birth.privacy":"Solo para tus líneas de tiempo. No es visible para otros usuarios.","account.birth.save":"Guardar fecha de nacimiento","account.birth.currentSaved":"Fecha de nacimiento guardada en tu cuenta.","account.birth.saved":"Fecha de nacimiento guardada. Vuelve a abrir las líneas de tiempo para ver la nueva fecha de inicio.","account.birth.saveFailed":"No se pudo guardar tu fecha de nacimiento. Inténtalo de nuevo.","account.birth.invalid":"Introduce una fecha de nacimiento válida.","account.birth.signIn":"Inicia sesión en TALERA.","account.birth.createdPending":"Tu cuenta se ha creado, pero no se guardó tu fecha de nacimiento. Añádela en Mi cuenta.","account.password.minimum":"Contraseña (mínimo 8 caracteres)"}};
function patchLangPacks(html){
 const marker='<script id="talera-v23-i18n">';
 const i=html.indexOf(marker);
 if(i<0)return {html,applied:false};
 const start=i+marker.length,end=html.indexOf('</script>',start);
 if(end<0)return {html,applied:false};
 let code=html.slice(start,end);
 const anchor="const LANGS=['nl','en','de','fr','es'];";
 if(code.split(anchor).length!==2)return {html,applied:false};
 const injection='const TALERA_AUDIT_EXTRA_PACKS='+JSON.stringify(AUDIT_BIRTH_LANG_PACKS)+';\n' +
  'for(const [locale,phrases] of Object.entries(TALERA_AUDIT_EXTRA_PACKS))Object.assign(PACKS[locale],phrases);\n';
 code=code.replace(anchor,injection+anchor);
 return {html:html.slice(0,start)+code+html.slice(end),applied:true};
}
// Design-only cleanup: retire the superseded 34px hitbox override while preserving
// the sole surviving 50% border-radius on the later 45px accessible hitbox rule.
function tidyPresentationButtons(html){
 const marker='<style id="talera-deepblue-menu-content">';
 const i=html.indexOf(marker);
 if(i<0)return {html,applied:false};
 const start=i+marker.length,end=html.indexOf('</style>',start);
 if(end<0)return {html,applied:false};
 let css=html.slice(start,end);
 const oldStart='/* TALERA round control geometry: shrink CIRCLES 25%, not the existing arrow/pencil artwork. */';
 const nextStart='/* TALERA touch repair: restore original 45px interactive hitboxes, retain 34px visible circles. */';
 const a=css.indexOf(oldStart),b=css.indexOf(nextStart);
 if(a<0||b<=a||css.indexOf(oldStart,a+1)>=0)return {html,applied:false};
 const old=css.slice(a,b);
 if(!old.includes(' width:34px!important;')||!old.includes(' top:121.5px!important;')||!old.includes(' border-radius:50%!important;'))return {html,applied:false};
 css=css.slice(0,a)+css.slice(b);
 const activeAnchor=' max-height:45px!important;\n top:116px!important;';
 if(css.split(activeAnchor).length!==2)return {html,applied:false};
 css=css.replace(activeAnchor,' max-height:45px!important;\n border-radius:50%!important;\n top:116px!important;');
 return {html:html.slice(0,start)+css+html.slice(end),applied:true};
}
const HOME_TAG = '<script id="talera-flow-v17-time">';
const PRESENT_START = 'const LIFE_START = new Date(1976,8,6).getTime();';
const JS_UI = String.raw`(()=>{
 'use strict';
 if(window.__taleraBirthdateUi)return;
 window.__taleraBirthdateUi=true;
 const root=()=>document.querySelector('#talera-more-menu');
 const say=k=>window.TaleraI18n?.t?.(k)||k;
 const showMessage=(el,k)=>{el.setAttribute('data-i18n',k);el.textContent=say(k)};
 const fallbackError=e=>String(e?.message||'').startsWith('account.birth.')?e.message:'account.birth.saveFailed';
 function dobLabel(){
  const label=document.createElement('label');
  label.className='talera-date-of-birth-label';
  label.setAttribute('data-i18n','account.birth.label');label.textContent=say('account.birth.label');
  const input=document.createElement('input');
  input.type='date';input.name='birthDate';input.required=true;
  input.autocomplete='bday';input.max=new Date().toISOString().slice(0,10);
  label.append(input);
  return label;
 }
 function decorateRegister(shell){
  const form=shell.querySelector('form[data-form="register"]');
  if(!form||form.querySelector('[name="birthDate"]'))return;
  const field=dobLabel();
  const username=form.querySelector('[name="username"]');
  const password=form.querySelector('[name="register-password"]');
  const anchor=username?.closest('label');
  if(anchor)anchor.after(field);
  else if(password?.closest('label'))password.closest('label').before(field);
  else form.prepend(field);
 }
 async function displayPrivateDate(box){
  try{
   const res=await fetch('/api/me',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
   if(!res.ok)return;
   const obj=await res.json();
   if(!box.isConnected)return;
   const current=obj.account?.birthDate||'';
   const input=box.querySelector('[name="birthDate"]');
   if(input)input.value=current;
   const status=box.querySelector('[role="status"]');
   if(status&&current)showMessage(status,'account.birth.currentSaved');
  }catch{}
 }
 function decorateAccount(shell){
  const body=shell.querySelector('.body');
  if(!body)return; // Real account heading is in the menu header, not in .body.
  if(!body.querySelector('[data-action="logout"]'))return;
  if(body.querySelector('#talera-private-birthdate'))return;
  const section=document.createElement('section');
  section.id='talera-private-birthdate';
  const title=document.createElement('h2');
  title.setAttribute('data-i18n','account.birth.title');title.textContent=say('account.birth.title');
  const sub=document.createElement('p');
  sub.setAttribute('data-i18n','account.birth.privacy');sub.textContent=say('account.birth.privacy');
  const form=document.createElement('form');
  form.id='talera-birthdate-profile';
  const label=dobLabel();
  const save=document.createElement('button');
  save.type='submit';save.className='secondary';
  save.setAttribute('data-i18n','account.birth.save');save.textContent=say('account.birth.save');
  const status=document.createElement('p');
  status.setAttribute('role','status');
  form.append(label,save,status);
  form.addEventListener('submit',async ev=>{
   ev.preventDefault();ev.stopPropagation();
   if(save.disabled)return;
   save.disabled=true;
   status.removeAttribute('data-i18n');status.textContent='';
   try{
    const date=label.querySelector('input').value;
    const res=await fetch('/api/profile/birthdate',{
      method:'POST',credentials:'same-origin',
      headers:{'content-type':'application/json',accept:'application/json'},
      body:JSON.stringify({birthDate:date})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw Error(data.code==='AUTH_REQUIRED'?'account.birth.signIn':
     data.code==='INVALID_BIRTH_DATE'?'account.birth.invalid':'account.birth.saveFailed');
    showMessage(status,'account.birth.saved');
   }catch(e){showMessage(status,fallbackError(e))}
   finally{save.disabled=false}
  });
  section.append(title,sub,form);
  body.append(section);
  void displayPrivateDate(section);
 }
 let pending=false;
 function scan(){
  pending=false;
  const shell=root();
  if(!shell)return;
  decorateRegister(shell);
  decorateAccount(shell);
 }
 function queue(){
  if(pending)return;
  pending=true;
  requestAnimationFrame(scan);
 }
 const css=document.createElement('style');
 css.id='talera-birthdate-form-styles';
 css.textContent='#talera-more-menu .talera-date-of-birth-label{display:block;margin-top:12px}'+
 '#talera-more-menu .talera-date-of-birth-label input{display:block;width:100%;min-height:44px;margin-top:6px;border-radius:12px}'+
 '#talera-private-birthdate{margin-top:22px;padding-top:15px;border-top:1px solid rgba(85,121,169,.23)}'+
 '#talera-private-birthdate h2{font-size:17px;margin:0 0 6px}'+
 '#talera-private-birthdate p{font-size:13px;margin:0 0 9px}'+
 '#talera-private-birthdate [role=status]{margin-top:9px}';
 document.head.append(css);
 new MutationObserver(queue).observe(document.documentElement,{subtree:true,childList:true});
 document.addEventListener('DOMContentLoaded',queue,{once:true});
 queue();
})();`;
function checkBirthDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const [y,m,d]=value.split('-').map(Number);
 if(y<1900||y>new Date().getUTCFullYear()||m<1||m>12||d<1||d>31)return null;
 const when=new Date(Date.UTC(y,m-1,d));
 if(when.getUTCFullYear()!==y||when.getUTCMonth()!==m-1||when.getUTCDate()!==d)return null;
 if(value>new Date().toISOString().slice(0,10))return null;
 return value;
}
function json(data,status=200){
 return new Response(JSON.stringify(data),{status,headers:{
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store','x-content-type-options':'nosniff'
 }});
}
async function sessionAccount(req,env){
 if(!/(?:^|;\s*)talera_sid=/.test(req.headers.get('cookie')||''))return null;
 const url=new URL(req.url);url.pathname='/api/me';url.search='';
 const auth=new Request(url.toString(),{
  method:'GET',headers:{
   cookie:req.headers.get('cookie')||'',
   accept:'application/json'
  }
 });
 try{
  const r=await env.TALERA_BASE.fetch(auth);
  if(!r.ok)return null;
  const data=await r.json();
  return data?.account?.id?data.account:null;
 }catch{return null}
}
async function readBirth(accountId,env){
 if(!accountId)return null;
 try{
  const row=await env.BIRTH_DB.prepare('SELECT birth_date FROM account_birthdates WHERE account_id=?')
   .bind(String(accountId)).first();
  return checkBirthDate(row?.birth_date)||null;
 }catch{return null}
}
async function writeBirth(accountId,birthDate,env){
 await env.BIRTH_DB.prepare('INSERT INTO account_birthdates(account_id,birth_date,updated_at) VALUES(?,?,?) ON CONFLICT(account_id) DO UPDATE SET birth_date=excluded.birth_date,updated_at=excluded.updated_at')
  .bind(String(accountId),birthDate,Date.now()).run();
}
function sameOrigin(req){
 return req.headers.get('origin')===new URL(req.url).origin;
}
async function readBody(req){
 const size=Number(req.headers.get('content-length')||0);
 if(size>16000)throw Error('too-large');
 const txt=await req.text();
 if(txt.length>16000)throw Error('too-large');
 return JSON.parse(txt);
}
async function register(req,env){
 if(!sameOrigin(req))return json({error:'Ongeldige herkomst.'},403);
 let data;try{data=await readBody(req)}catch{return json({error:'Ongeldige aanvraag.'},400)}
 const birthDate=checkBirthDate(data.birthDate);
 if(!birthDate)return json({error:'Vul een geldige geboortedatum in.'},400);
 const originalFields={displayName:data.displayName,username:data.username,email:data.email,password:data.password};
 const headers=new Headers(req.headers);
 headers.set('content-type','application/json');
 headers.delete('content-length');
 const upstreamReq=new Request(req.url,{method:'POST',headers,body:JSON.stringify(originalFields),redirect:'manual'});
 const upstream=await env.TALERA_BASE.fetch(upstreamReq);
 if(!upstream.ok)return upstream;
 let result;try{result=await upstream.clone().json()}catch{return json({error:'De registratie is niet afgerond. Probeer aan te melden.'},502)}
 if(!result?.account?.id)return json({error:'Account-ID ontbreekt na registratie.'},502);
 // Account creation may succeed even when the separate DOB store is unavailable.
 // Preserve the login cookie and report a recoverable partial result.
 let dateSaved=false;
 try{await writeBirth(result.account.id,birthDate,env);dateSaved=true}
 catch(e){console.warn('TALERA private birthday write unavailable')}
 result.account.birthDate=dateSaved?birthDate:null;
 if(!dateSaved)result.birthDatePending=true;
 const headersOut=new Headers(upstream.headers);
 headersOut.delete('content-length');headersOut.delete('content-encoding');headersOut.delete('etag');
 headersOut.set('content-type','application/json; charset=utf-8');
 headersOut.set('cache-control','no-store');
 return new Response(JSON.stringify(result),{status:upstream.status,headers:headersOut});
}
async function me(req,env){
 const upstream=await env.TALERA_BASE.fetch(req);
 if(!upstream.ok)return upstream;
 let data;try{data=await upstream.clone().json()}catch{return upstream}
 if(data?.account?.id)data.account.birthDate=await readBirth(data.account.id,env);
 const headers=new Headers(upstream.headers);
 for(const k of ['content-length','content-encoding','etag'])headers.delete(k);
 headers.set('cache-control','no-store');
 return new Response(JSON.stringify(data),{status:upstream.status,headers});
}
async function birthProfile(req,env){
 const acc=await sessionAccount(req,env);
 if(!acc)return json({code:'AUTH_REQUIRED',error:'Meld je aan bij TALERA.'},401);
 if(req.method==='GET')return json({birthDate:await readBirth(acc.id,env)});
 if(req.method!=='POST')return json({error:'Methode niet toegestaan.'},405);
 if(!sameOrigin(req))return json({code:'INVALID_ORIGIN',error:'Ongeldige herkomst.'},403);
 let data;try{data=await readBody(req)}catch{return json({code:'INVALID_REQUEST',error:'Ongeldige aanvraag.'},400)}
 const dob=checkBirthDate(data.birthDate);
 if(!dob)return json({code:'INVALID_BIRTH_DATE',error:'Vul een geldige geboortedatum in.'},400);
 try{await writeBirth(acc.id,dob,env)}
 catch{return json({code:'STORAGE_ERROR',error:'De geboortedatum kon niet worden bewaard.'},503)}
 return json({birthDate:dob,saved:true});
}
function changeOne(source,oldToken,newToken){
 const i=source.indexOf(oldToken);
 if(i<0||source.indexOf(oldToken,i+1)>=0)throw Error('Timeline source marker mismatch');
 return source.replace(oldToken,newToken);
}
function personalizeHome(html,birthDate){
 const born=Number(birthDate.slice(0,4));
 const open=html.indexOf(HOME_TAG);
 if(open<0)return html;
 const start=open+HOME_TAG.length,end=html.indexOf('</script>',start);
 if(end<0)return html;
 let script=html.slice(start,end);
 try{
  script=changeOne(script,'year<1985','year<'+born);
  script=changeOne(script,'let current=1985;','let current='+born+';');
  script=changeOne(script,'Number(year)||1985','Number(year)||'+born);
  script=changeOne(script,'const min=Math.min(...(years.length?years:[1985])),max=Math.max(now,...years);',
   'const min='+born+',max=Math.max(now,...years,'+born+');');
 }catch{return html}
 return html.slice(0,start)+script+html.slice(end);
}
function personalizePresent(html,birthDate){
 const parts=birthDate.split('-').map(Number);
 const out='const LIFE_START = new Date('+parts[0]+','+(parts[1]-1)+','+parts[2]+').getTime();';
 try{return changeOne(html,PRESENT_START,out)}
 catch{return html}
}
async function page(req,env){
 const upstream=await env.TALERA_BASE.fetch(req);
 if(!upstream.ok||!(upstream.headers.get('content-type')||'').includes('text/html'))return upstream;
 let html=await upstream.text();
 const path=new URL(req.url).pathname;
 let anchorStatus='demo';
 if(path==='/mijn-leven'||path==='/present'){
  const account=await sessionAccount(req,env);
  const dob=account?await readBirth(account.id,env):null;
  if(dob){
   const adjusted=path==='/present'?personalizePresent(html,dob):personalizeHome(html,dob);
   anchorStatus=adjusted!==html?'applied':'missing';
   if(anchorStatus==='missing')console.warn('TALERA birthday anchor needs review: '+path);
   html=adjusted;
  }
 }
 const languageUpdate=patchLangPacks(html);
 html=languageUpdate.html;
 let visualUpdate={applied:false};
 if(path==='/present'){visualUpdate=tidyPresentationButtons(html);html=visualUpdate.html;}
 if(html.includes('</head>')&&!html.includes('id="talera-birthdate-ui"')){
  html=html.replace('</head>','<script id="talera-birthdate-ui">'+JS_UI+'</script></head>');
 }
  const headers=new Headers(upstream.headers);
 for(const k of ['content-length','content-encoding','etag'])headers.delete(k);
 headers.set('cache-control','no-store');
 headers.set('x-talera-birthdate-test','isolated');
 headers.set('x-talera-anchor-status',anchorStatus);
 headers.set('x-talera-i18n-extension',languageUpdate.applied?'applied':'missing');
 if(path==='/present')headers.set('x-talera-css-cleanup',visualUpdate.applied?'applied':'missing');
 return new Response(html,{status:upstream.status,statusText:upstream.statusText,headers});
}
// Preserve the original account UI and handlers, changing exactly one registration payload.
async function patchedMenuIntegration(req,env){
 const upstream=await env.TALERA_BASE.fetch(req);
 if(!upstream.ok)return upstream;
 const original=await upstream.text();
 const needle="const result=await api('/api/register','POST',{displayName:data.displayName,username:data.username,email:data.email,password:data['register-password']});";
 const patched="const result=await api('/api/register','POST',{displayName:data.displayName,username:data.username,birthDate:data.birthDate,email:data.email,password:data['register-password']});";
 const successToken="document.dispatchEvent(new CustomEvent('talera:account-changed',{detail:{intent}}));return 'Je account is aangemaakt.'";
 const successReplacement="document.dispatchEvent(new CustomEvent('talera:account-changed',{detail:{intent}}));return result.birthDatePending?(window.TaleraI18n?.t('account.birth.createdPending')||'Je account is aangemaakt. Vul je geboortedatum in bij Mijn account.'):'Je account is aangemaakt.'";
 if(original.split(needle).length!==2||original.split(successToken).length!==2){
  return new Response('TALERA registratie-update tijdelijk niet beschikbaar.',{status:503,headers:{'cache-control':'no-store','content-type':'text/plain; charset=utf-8'}});
 }
 const headers=new Headers(upstream.headers);
 for(const h of ['content-length','content-encoding','etag'])headers.delete(h);
 headers.set('cache-control','no-store');
 return new Response(original.replace(needle,patched).replace(successToken,successReplacement),{status:upstream.status,statusText:upstream.statusText,headers});
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),path=url.pathname;
  if(path==='/__clean/menu-integration.mjs'&&request.method==='GET')return patchedMenuIntegration(request,env);
  if(path==='/api/register'&&request.method==='POST')return register(request,env);
  if(path==='/api/me'&&request.method==='GET')return me(request,env);
  if(path==='/api/profile/birthdate')return birthProfile(request,env);
  if(request.method==='GET'&&['/','/mijn-leven','/present','/tell','/gedeeld','/meldingen','/instellingen','/account'].includes(path))
    return page(request,env);
  return env.TALERA_BASE.fetch(request);
 }
};
