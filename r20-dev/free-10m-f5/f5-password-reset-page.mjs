import {languageText,languageSpan,languageBootstrap} from './f5-language.mjs';
// TALERA Free — same-origin account recovery views, without a separate app.
// The reset credential is read from a URL fragment, never from HTTP query logs.
// No private memories, IndexedDB, remote scripts or account migrations are touched.
export function passwordResetPage(mode){
 if(mode!=='request'&&mode!=='confirm')throw Error('INVALID_PASSWORD_RESET_PAGE');
 const bytes=crypto.getRandomValues(new Uint8Array(18));
 const nonce=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
 const prefix='reset.'+(mode==='request'?'request':'confirm')+'.';
 const title=languageSpan(prefix+'title'),instructions=languageSpan(prefix+'instructions');
 const fields=mode==='request'
  ?'<label for="email">'+languageSpan('reset.request.email')+'</label><input id="email" name="email" type="email" autocomplete="email" maxlength="254" required>'
  :'<label for="newPassword">'+languageSpan('reset.confirm.password')+'</label><input id="newPassword" name="newPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" required><label for="again">'+languageSpan('reset.confirm.again')+'</label><input id="again" name="again" type="password" autocomplete="new-password" minlength="8" maxlength="128" required>';
 const script=String.raw`(()=> {
 const t=(key,params)=>window.TaleraLanguage.t(key,params);
 const form=document.querySelector('form'),status=document.getElementById('status');
 const mode=document.body.dataset.mode;
 let credential=null;
 if(mode==='confirm'){
  const fragment=new URLSearchParams(location.hash.slice(1));
  credential={email:fragment.get('e'),token:fragment.get('t')};
  history.replaceState(null,'',location.pathname);
  if(!credential.email||!/^[a-f0-9]{64}$/.test(credential.token||'')){
   status.textContent=t('reset.status.invalidFragment');
   form.hidden=true;
  }
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const submit=form.querySelector('[type="submit"]');
  if(submit.disabled)return;
  let payload,route;
  if(mode==='request'){
   payload={email:form.elements.email.value};
   route='/api/password-reset/request';
  }else{
   if(form.elements.newPassword.value!==form.elements.again.value){
    status.textContent=t('reset.status.mismatch');return;
   }
   payload={email:credential.email,token:credential.token,
    newPassword:form.elements.newPassword.value};
   route='/api/password-reset/confirm';
  }
  submit.disabled=true;status.textContent=t('reset.status.checking');
  try{
   const response=await fetch(route,{method:'POST',
    headers:{'content-type':'application/json','accept':'application/json','x-talera-language':window.TaleraLanguage.language},
    credentials:'same-origin',cache:'no-store',body:JSON.stringify(payload)});
   const result=await response.json();
   status.textContent=typeof result.messageKey==='string'&&/^reset\.api\./.test(result.messageKey)?t(result.messageKey):t(response.status===503?'reset.api.unavailable':'reset.status.generic');
   if(response.ok){
    form.hidden=true;
    if(mode==='confirm')status.textContent=t('reset.status.confirmComplete');
   }
  }catch{status.textContent=t('reset.status.network')}
  finally{submit.disabled=false}
 });
})();`;
 const html='<!doctype html><html lang="nl"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
  '<title data-talera-text="'+prefix+'pageTitle">'+languageText(prefix+'pageTitle')+'</title><style nonce="'+nonce+'">'+
  'body{margin:0;min-height:100dvh;background:#071a3d;color:#fff;font:16px/1.5 system-ui,-apple-system,sans-serif;display:grid;place-items:center}'+
  'main{box-sizing:border-box;width:min(92vw,440px);padding:30px 24px;border-radius:20px;background:#23497e}'+
  'h1{font-size:1.55rem;margin:0 0 12px}p{margin:0 0 20px}label{display:block;margin:14px 0 6px;font-weight:600}'+
  'input{box-sizing:border-box;width:100%;padding:14px;font-size:1rem;border:2px solid #dce6f1;border-radius:8px}'+
  'button{width:100%;padding:14px;margin-top:22px;border:0;border-radius:8px;color:#071a3d;background:white;font-size:1rem;font-weight:700}'+
  'button:disabled{opacity:.65}a{color:#fff}#status{margin-top:18px;min-height:1.5em}footer{margin-top:22px}'+
  '</style></head><body data-mode="'+mode+'"><main><h1>'+title+'</h1><p>'+instructions+'</p>'+
  '<form>'+fields+'<button type="submit">'+
  languageSpan(prefix+'submit')+
  '</button></form><p id="status" role="status" aria-live="polite"></p>'+
  '<footer><a href="/mijn-leven">'+languageSpan('reset.page.back')+'</a></footer></main>'+
  '<script nonce="'+nonce+'">'+languageBootstrap(['reset.request.','reset.confirm.','reset.page.','reset.status.','reset.api.'])+script+'</script></body></html>';
 return new Response(html,{status:200,headers:{
  'content-type':'text/html; charset=utf-8','cache-control':'private, no-store',
  'content-security-policy':"default-src 'none'; script-src 'nonce-"+nonce+
    "'; style-src 'nonce-"+nonce+"'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'referrer-policy':'no-referrer','x-frame-options':'DENY',
  'x-content-type-options':'nosniff'
 }});
}
