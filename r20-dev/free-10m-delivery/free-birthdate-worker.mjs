import {getAccountBirthDate,putAccountBirthDate} from './free-account-router.mjs';
/* TALERA | account birth date + timeline anchors, test-only Worker.
 * Service proxy preserves the entire approved TALERA implementation unchanged.
 * Sole persistent new data: private account_id -> ISO birth_date in dedicated D1.
 */
const HOME_TAG = '<script id="talera-flow-v17-time">';
const PRESENT_START = 'const LIFE_START = new Date(1976,8,6).getTime();';
const JS_UI = String.raw`(()=>{
 'use strict';
 if(window.__taleraBirthdateUi)return;
 window.__taleraBirthdateUi=true;
 const root=()=>document.querySelector('#talera-more-menu');
 const isAccountTitle=s=>/^(mijn account|my account)$/i.test((s||'').trim());
 function dobLabel(){
  const label=document.createElement('label');
  label.className='talera-date-of-birth-label';
  label.textContent='Geboortedatum';
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
   if(status&&current)status.textContent='Geboortedatum opgeslagen bij je account.';
  }catch{}
 }
 function decorateAccount(shell){
  const body=shell.querySelector('.body');
  if(!body||!isAccountTitle(body.querySelector('h1')?.textContent))return;
  if(!body.querySelector('[data-action="logout"]'))return;
  if(body.querySelector('#talera-private-birthdate'))return;
  const section=document.createElement('section');
  section.id='talera-private-birthdate';
  const title=document.createElement('h2');
  title.textContent='Mijn geboortedatum';
  const sub=document.createElement('p');
  sub.textContent='Alleen voor je eigen tijdlijnen. Niet zichtbaar voor andere gebruikers.';
  const form=document.createElement('form');
  form.id='talera-birthdate-profile';
  const label=dobLabel();
  const save=document.createElement('button');
  save.type='submit';save.className='secondary';
  save.textContent='Geboortedatum bewaren';
  const status=document.createElement('p');
  status.setAttribute('role','status');
  form.append(label,save,status);
  form.addEventListener('submit',async ev=>{
   ev.preventDefault();ev.stopPropagation();
   if(save.disabled)return;
   save.disabled=true;
   status.textContent='';
   try{
    const date=label.querySelector('input').value;
    const res=await fetch('/api/profile/birthdate',{
      method:'POST',credentials:'same-origin',
      headers:{'content-type':'application/json',accept:'application/json'},
      body:JSON.stringify({birthDate:date})
    });
    const data=await res.json();
    if(!res.ok)throw Error(data.error||'Opslaan is niet gelukt.');
    status.textContent='Geboortedatum bewaard. Bij het opnieuw openen gebruiken beide tijdlijnen deze datum.';
   }catch(e){status.textContent=e.message||'Opslaan is niet gelukt.'}
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
 return getAccountBirthDate(env,String(accountId));
}
async function writeBirth(accountId,birthDate,env){
 await putAccountBirthDate(env,String(accountId),birthDate);
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
 try{await writeBirth(result.account.id,birthDate,env)}
 catch{return json({error:'Account aangemaakt, maar de geboortedatum is nog niet opgeslagen. Meld je aan en vul deze in bij Mijn account.'},503)}
 result.account.birthDate=birthDate;
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
 if(!acc)return json({error:'Meld je aan bij TALERA.'},401);
 if(req.method==='GET')return json({birthDate:await readBirth(acc.id,env)});
 if(req.method!=='POST')return json({error:'Methode niet toegestaan.'},405);
 if(!sameOrigin(req))return json({error:'Ongeldige herkomst.'},403);
 let data;try{data=await readBody(req)}catch{return json({error:'Ongeldige aanvraag.'},400)}
 const dob=checkBirthDate(data.birthDate);
 if(!dob)return json({error:'Vul een geldige geboortedatum in.'},400);
 try{await writeBirth(acc.id,dob,env)}
 catch{return json({error:'De geboortedatum kon niet worden bewaard.'},503)}
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
 if(path==='/mijn-leven'||path==='/present'){
  const acc=await sessionAccount(req,env);
  const dob=acc?await readBirth(acc.id,env):null;
  if(dob)html=path==='/present'?personalizePresent(html,dob):personalizeHome(html,dob);
 }
 // Account enhancement is independent of the recorder, player and all other UI.
 if(html.includes('</head>')&&!html.includes('id="talera-birthdate-ui"')){
  html=html.replace('</head>','<script id="talera-birthdate-ui">'+JS_UI+'</script></head>');
 }
 const headers=new Headers(upstream.headers);
 for(const k of ['content-length','content-encoding','etag'])headers.delete(k);
 headers.set('cache-control','no-store');
 headers.set('x-talera-birthdate-test','isolated');
 return new Response(html,{status:upstream.status,statusText:upstream.statusText,headers});
}
// Preserve the original account UI and handlers, changing exactly one registration payload.
async function patchedMenuIntegration(req,env){
 const upstream=await env.TALERA_BASE.fetch(req);
 if(!upstream.ok)return upstream;
 const original=await upstream.text();
 const needle="const result=await api('/api/register','POST',{displayName:data.displayName,username:data.username,email:data.email,password:data['register-password']});";
 const patched="const result=await api('/api/register','POST',{displayName:data.displayName,username:data.username,birthDate:data.birthDate,email:data.email,password:data['register-password']});";
 if(original.split(needle).length!==2){
  return new Response('TALERA registratie-update tijdelijk niet beschikbaar.',{status:503,headers:{'cache-control':'no-store','content-type':'text/plain; charset=utf-8'}});
 }
 const headers=new Headers(upstream.headers);
 for(const h of ['content-length','content-encoding','etag'])headers.delete(h);
 headers.set('cache-control','no-store');
 return new Response(original.replace(needle,patched),{status:upstream.status,statusText:upstream.statusText,headers});
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),path=url.pathname;
  if(path==='/__clean/menu-integration.mjs'&&request.method==='GET')return patchedMenuIntegration(request,env);
  if(path==='/api/register'&&request.method==='POST')return register(request,env);
  if(path==='/api/me'&&request.method==='GET')return me(request,env);
  if(path==='/api/profile/birthdate')return birthProfile(request,env);
  if(request.method==='GET'&&['/','/mijn-leven','/present','/instellingen','/account'].includes(path))
    return page(request,env);
  return env.TALERA_BASE.fetch(request);
 }
};
