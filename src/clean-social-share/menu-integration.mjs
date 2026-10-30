// TALERA: one existing 'Meer' entry, account APIs from the tested clean core.
// Deliberately no second account controller, demo data or new share controller.
(()=>{'use strict';
const trigger=()=>document.querySelector('.more')?.closest('button')||document.getElementById('navMore');
if(window.__taleraMoreMenu?.ready)return;
const css=[
'#talera-more-menu[hidden]{display:none!important}',
'#talera-more-menu{position:fixed;inset:0;z-index:220;display:flex;align-items:flex-end;justify-content:center;background:rgba(6,18,30,.3);font:15px/1.5 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#26384f}',
'#talera-more-menu *{box-sizing:border-box}',
'#talera-more-menu .panel{width:min(100%,560px);height:min(85dvh,800px);background:#faf9f6;border-radius:30px 30px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -14px 45px #0b2e4433}',
'#talera-more-menu header{display:flex;align-items:center;gap:10px;padding:13px 20px;background:#fff;border-bottom:1px solid #e9edef;flex-shrink:0}',
'#talera-more-menu header strong{flex:1;text-align:center;font-size:16px;color:#24495c}',
'#talera-more-menu .headbutton{border:0;background:#eef3f5;border-radius:22px;min-width:40px;height:40px;color:#234a61;font-size:23px;cursor:pointer}',
'#talera-more-menu .body{padding:19px 18px 35px;overflow-y:auto;overscroll-behavior:contain;flex:1}',
'#talera-more-menu h1{font-size:25px;letter-spacing:-.6px;margin:0 0 5px;color:#24475d}',
'#talera-more-menu .intro{font-size:13px;color:#738297;margin:0 0 20px}',
'#talera-more-menu .section-label{font-size:12px;font-weight:750;letter-spacing:.04em;color:#718397;margin:20px 3px 7px}',
'#talera-more-menu .options{background:#fff;border-radius:18px;overflow:hidden;border:1px solid #e7ecee}',
'#talera-more-menu button.option{width:100%;min-height:66px;display:flex;gap:13px;align-items:center;text-align:left;border:0;border-bottom:1px solid #f0f1f3;background:#fff;padding:12px 14px;color:#26384f;cursor:pointer}',
'#talera-more-menu button.option:last-child{border-bottom:0}',
'#talera-more-menu button.option .glyph{width:33px;flex:0 0 33px;display:grid;place-items:center;font-size:22px;color:#46758e}',
'#talera-more-menu button.option span.copy{flex:1}',
'#talera-more-menu button.option strong{display:block;font-size:14px;font-weight:720;color:#2a475b}',
'#talera-more-menu button.option small{display:block;font-size:11px;line-height:1.4;color:#788697;margin-top:3px}',
'#talera-more-menu button.option .arrow{color:#90a0ab;font-size:21px}',
'#talera-more-menu .account-card{width:100%;display:flex;gap:13px;align-items:center;text-align:left;background:linear-gradient(130deg,#fff,#f0f4f6);border:1px solid #e0e9ec;border-radius:20px;padding:14px;cursor:pointer;color:#23465c}',
'#talera-more-menu .avatar{width:52px;height:52px;flex-shrink:0;background:#315b74;color:#fff;border-radius:16px;display:grid;place-items:center;font-weight:750;font-size:20px}',
'#talera-more-menu .account-copy{flex:1}#talera-more-menu .account-copy strong{display:block;font-size:15px}#talera-more-menu .account-copy small{display:block;color:#708398;font-size:12px}',
'#talera-more-menu .info{background:#fff;border:1px solid #e7ebee;border-radius:18px;padding:16px;margin-bottom:16px;overflow-wrap:anywhere}',
'#talera-more-menu .info p{margin:6px 0}#talera-more-menu .info small{color:#718397}',
'#talera-more-menu label{display:block;color:#354d61;font-size:13px;font-weight:650;margin:13px 0}',
'#talera-more-menu input,#talera-more-menu textarea,#talera-more-menu select{width:100%;display:block;border:1px solid #ccd7df;background:#fff;border-radius:11px;padding:12px;color:#223c51;font:inherit;margin-top:5px}',
'#talera-more-menu textarea{min-height:60px;resize:vertical}',
'#talera-more-menu .password-row{position:relative}#talera-more-menu .password-row input{padding-right:55px}#talera-more-menu .eye{position:absolute;right:6px;top:6px;background:#edf2f4;border:0;border-radius:9px;min-width:40px;height:38px;font-size:19px}',
'#talera-more-menu .primary{width:100%;border:0;border-radius:14px;padding:13px;margin:9px 0 0;background:#315d78;color:#fff;font:700 15px system-ui}',
'#talera-more-menu .secondary{width:100%;border:1px solid #dbe6ec;border-radius:13px;padding:11px;margin-top:8px;background:#fff;color:#315d78;font:650 14px system-ui}',
'#talera-more-menu .notice{padding:10px 13px;margin:13px 0;background:#edf3f6;border-radius:10px;font-size:13px;color:#31546c}',
'#talera-more-menu .notice.error{background:#fff0ee;color:#a12e20}',
'#talera-more-menu .switch{display:flex;gap:10px;align-items:center}#talera-more-menu .switch input{width:auto;margin:0}',
'#talera-more-menu .thread-item{padding:11px 13px;background:#fff;border:1px solid #e5ebee;border-radius:12px;margin:9px 0}',
'#talera-more-menu button:focus-visible{outline:2px solid #337cca;outline-offset:2px}',
'@media(prefers-reduced-motion:reduce){#talera-more-menu{scroll-behavior:auto}}'
].join('');
const style=document.createElement('style');style.id='talera-more-style';style.textContent=css;document.head.appendChild(style);
const shell=document.createElement('div');shell.id='talera-more-menu';shell.hidden=true;
shell.innerHTML='<section class="panel" role="dialog" aria-modal="true" aria-label="Meer"><header><button class="headbutton" data-action="back" aria-label="Terug">‹</button><strong>Meer</strong><button class="headbutton" data-action="close" aria-label="Sluiten">×</button></header><div class="body"></div></section>';
document.body.append(shell);
const body=shell.querySelector('.body'),head=shell.querySelector('header strong'),back=shell.querySelector('[data-action="back"]');
const state={view:'hub',history:[],account:null,discovery:null,search:[],query:'',shared:[],messages:[],memories:[],thread:null,threadData:null,notice:'',error:false,busy:false,open:false,intent:null};
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,method='GET',payload){
 const opt={method,credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}};
 if(payload!==undefined){opt.headers['content-type']='application/json';opt.body=JSON.stringify(payload)}
 const res=await fetch(path,opt),data=await res.json().catch(()=>({}));
 if(!res.ok){const e=new Error(data.error||'De aanvraag is niet gelukt');e.status=res.status;throw e}
 return data;
}
function title(t,description){return '<h1>'+esc(t)+'</h1><p class="intro">'+esc(description)+'</p>'}
function option(view,icon,label,sub){return '<button type="button" class="option" data-view="'+view+'"><span class="glyph">'+icon+'</span><span class="copy"><strong>'+esc(label)+'</strong><small>'+esc(sub)+'</small></span><span class="arrow">›</span></button>'}
function action(key,icon,label,sub){return '<button type="button" class="option" data-action="'+key+'"><span class="glyph">'+icon+'</span><span class="copy"><strong>'+esc(label)+'</strong><small>'+esc(sub)+'</small></span><span class="arrow">›</span></button>'}
function options(items){return '<div class="options">'+items+'</div>'}
function section(label,items){return '<p class="section-label">'+esc(label)+'</p>'+options(items)}
function info(t,description){return '<div class="info"><strong>'+esc(t)+'</strong><p>'+esc(description)+'</p></div>'}
function notice(){return state.notice?'<p class="notice'+(state.error?' error':'')+'" role="status">'+esc(state.notice)+'</p>':''}
function passwordField(id,label,autocomplete){return '<label>'+label+'<span class="password-row"><input id="'+id+'" type="password" name="'+id+'" autocomplete="'+autocomplete+'" required><button type="button" class="eye" data-eye="'+id+'" aria-label="Wachtwoord tonen" aria-pressed="false">◉</button></span></label>'}
function render(){
 if(!state.open)return;
 back.hidden=!state.history.length;
 head.textContent=state.view==='hub'?'Meer':({account:'Mijn account',login:'Aanmelden',forgot:'Wachtwoord herstellen',register:'Account aanmaken',privacy:'Privacy',people:'Mijn mensen',shared:'Met mij gedeeld',mine:'Mijn gedeelde herinneringen',messages:'Berichten',thread:'Gesprek',notifications:'Meldingen',settings:'Instellingen',subscription:'Mijn abonnement',help:'Hulp'})[state.view]||'Meer';
 let html='',a=state.account;
 switch(state.view){
 case 'hub':{
  const enabled=!!window.__taleraAudioControls?.isEnabled?.();
  html=title('Meer','Je account, mensen en algemene TALERA-instellingen op één plek.')+
  '<button class="account-card" data-view="account"><span class="avatar">'+esc((a?.displayName||'T').charAt(0).toUpperCase())+'</span><span class="account-copy"><strong>'+esc(a?.displayName||'Mijn TALERA-account')+'</strong><small>'+esc(a?.email||'Account aanmaken of aanmelden')+'</small></span><span>›</span></button>'+
  section('Delen en mensen',option('mine','▣','Mijn gedeelde herinneringen','Eigen herinneringen en gesprekken')+option('people','○','Mijn mensen','Mensen zoeken en uitnodigen')+option('shared','⌁','Met mij gedeeld','Herinneringen die anderen delen')+option('messages','✉','Berichten','Reacties en gesprekken bij herinneringen'))+
  section('Luisteren',action(enabled?'disable-listening':'enable-listening',enabled?'Ⅱ':'▶',enabled?'Luisteren uitschakelen':'Luisteren inschakelen','Geluid bij gesproken herinneringen'))+
  section('Mijn TALERA',option('subscription','◇','Mijn abonnement','Pakket en betalingen')+option('privacy','♢','Privacy en beveiliging','Vindbaarheid en accountprivacy')+option('notifications','•','Meldingen','Nieuwe reacties en updates')+option('settings','⚙','Instellingen','Taal, toegankelijkheid en weergave'))+
  section('Ondersteuning',option('help','?','Hulp en over TALERA','Uitleg, voorwaarden en contact'));
  break;
 }
 case 'account':
  html=title('Mijn account','Je TALERA-account en persoonlijke gegevens.')+(a?
    info(a.displayName,a.email)+
    section('Accountgegevens',option('privacy','♢','Privacy en vindbaarheid',state.discovery?.publicHandle?'@'+state.discovery.publicHandle:'Je privacykeuzes beheren')+option('messages','✉','Mijn berichten','Gesprekken en ongelezen reacties'))+
    '<button class="secondary" data-action="logout">Uitloggen</button>':
    info('Niet aangemeld','Maak een account aan of meld je aan met je bestaande TALERA-account.')+
    '<button class="primary" data-view="login">Aanmelden</button><button class="secondary" data-view="register">Account aanmaken</button>');
  break;
 case 'login':
  html=title('Aanmelden','Gebruik je bestaande TALERA-account.')+
   '<form data-form="login"><label>E-mailadres<input name="email" type="email" autocomplete="email" required></label>'+
   passwordField('login-password','Wachtwoord','current-password')+
   '<button class="primary" type="submit">Aanmelden</button></form>'+
   '<button class="secondary" data-view="register">Account aanmaken</button>'+
   '<button class="secondary" data-view="forgot">Wachtwoord vergeten?</button>';break;
 case 'forgot':
  html=title('Wachtwoord herstellen','Ontvang een veilige herstel-link als je e-mailadres bij TALERA bekend is.')+
  '<form data-form="forgot"><label>E-mailadres<input name="email" type="email" autocomplete="email" required></label><button type="submit" class="primary">Herstelmail aanvragen</button></form>'+
  '<p class="intro">De e-maildienst moet nog worden geactiveerd. Als dat niet is gebeurd, meldt TALERA dit duidelijk.</p>';break;
 case 'register':
  html=title('Account aanmaken','Eén TALERA-account voor je herinneringen en contacten.')+
  '<form data-form="register"><label>Naam<input name="displayName" required maxlength="100" autocomplete="name"></label>'+
  '<label>Unieke gebruikersnaam<input name="username" required minlength="3" maxlength="30" autocomplete="username" placeholder="bijvoorbeeld mark smits"></label>'+
  '<label>E-mailadres<input name="email" type="email" required autocomplete="email"></label>'+
  passwordField('register-password','Wachtwoord (minimaal 8 tekens)','new-password')+
  passwordField('register-confirm','Wachtwoord herhalen','new-password')+
  '<button class="primary" type="submit">Account aanmaken</button></form><button class="secondary" data-view="login">Ik heb al een account</button>';break;
 case 'privacy':
  html=title('Privacy en beveiliging','Jij bepaalt of anderen je binnen TALERA kunnen vinden.')+
  (a?'<form data-form="privacy"><label class="switch"><input name="discoverable" type="checkbox"'+(state.discovery?.discoverable?' checked':'')+'> Mijn account vindbaar maken</label>'+
    '<label>Gebruikersnaam<input name="username" value="'+esc(state.discovery?.publicHandle||'')+'" placeholder="Jouw unieke naam"></label><button class="primary" type="submit">Privacykeuzes opslaan</button></form>':
    info('Aanmelden nodig','Meld je aan om privacykeuzes te beheren.')+'<button class="primary" data-view="login">Aanmelden</button>');break;
 case 'people':
  html=title('Mijn mensen','Zoek mensen die ervoor hebben gekozen vindbaar te zijn.')+
  (a?'<form data-form="search"><label>Zoek naam of gebruikersnaam<input name="q" value="'+esc(state.query)+'" minlength="2" autocomplete="off" placeholder="Zoek binnen TALERA"></label><button class="primary" type="submit">Zoeken</button></form>'+
  (state.search.length?section('Gevonden',state.search.map(p=>'<div class="thread-item"><strong>'+esc(p.name)+'</strong><p>@'+esc(p.handle||'')+'</p></div>').join('')):''):
  info('Aanmelden nodig','Meld je aan om andere TALERA-gebruikers te zoeken.')+'<button class="primary" data-view="login">Aanmelden</button>');break;
 case 'mine':
  html=title('Mijn gedeelde herinneringen','Herinneringen in je TALERA-account.')+(a?
   (state.memories.length?state.memories.map(m=>'<button class="option" data-thread="'+esc(m.id)+'"><span class="copy"><strong>'+esc(m.title)+'</strong><small>'+esc(m.event_date||'Open het gesprek bij deze herinnering')+'</small></span><span>›</span></button>').join(''):info('Nog geen herinneringen in je account','Je eigen herinneringen verschijnen hier nadat je ze hebt opgeslagen.')):
   info('Aanmelden nodig','Meld je aan om je herinneringen te zien.'));break;
 case 'shared':
  html=title('Met mij gedeeld','Herinneringen waartoe je persoonlijk toegang hebt.')+(a?
   (state.shared.length?state.shared.map(m=>'<button class="option" data-thread="'+esc(m.id)+'"><span class="copy"><strong>'+esc(m.title)+'</strong><small>Gedeeld door '+esc(m.owner_name)+'</small></span><span>›</span></button>').join(''):info('Geen gedeelde herinneringen','Nieuwe herinneringen verschijnen hier zodra iemand met je deelt.')):
   info('Aanmelden nodig','Meld je aan om je gedeelde herinneringen te zien.'));break;
 case 'messages':{
  let grouped=new Map();
  for(const m of state.messages){const id=String(m.memory_id);let x=grouped.get(id);if(!x){x={count:0,unread:0};grouped.set(id,x)}x.count++;if(!m.read_at)x.unread++}
  html=title('Berichten','Reacties en gesprekken bij jouw herinneringen.')+(a?
   (grouped.size?[...grouped].map(([id,x])=>'<button class="option" data-thread="'+esc(id)+'"><span class="glyph">✉</span><span class="copy"><strong>Gesprek bij herinnering</strong><small>'+x.count+' meldingen'+(x.unread?' · '+x.unread+' ongelezen':'')+'</small></span><span>›</span></button>').join(''):info('Nog geen berichten','Reacties op gedeelde herinneringen verschijnen hier.')):
   info('Aanmelden nodig','Meld je aan om je gesprekken te lezen.'));break;
 }
 case 'thread':
  html=title('Gesprek','Reacties bij deze herinnering.')+(state.threadData?
   state.threadData.items.map(c=>'<div class="thread-item"><strong>'+esc(c.display_name)+'</strong><p>'+esc(c.body)+'</p></div>').join('')+
   '<form data-form="comment"><label>Reageren<textarea name="body" required maxlength="4000" placeholder="Schrijf een reactie…"></textarea></label><button type="submit" class="primary">Verzenden</button></form>':
   info('Gesprek laden','Even wachten…'));break;
 case 'notifications':
  html=title('Meldingen','Alleen de berichten en gebeurtenissen die je aandacht nodig hebben.')+
  section('Berichten',option('messages','✉','Nieuwe reacties','Gesprekken en ongelezen berichten'))+
  info('Privacy','TALERA geeft geen luistercontrole of meldingen over hoe lang iemand een herinnering bekijkt.');break;
 case 'settings':
  html=title('Instellingen','Je account en de algemene werking van TALERA.')+
  section('Algemeen',option('account','◉','Mijn account','Accountgegevens en aanmelden')+
  option('privacy','♢','Privacy en beveiliging','Vindbaarheid en persoonlijke toegang')+
  option('language','NL','Taal','Nederlands')+
  option('accessibility','Aa','Toegankelijkheid','Tekstgrootte, contrast en bediening')+
  option('display','◐','Weergave','Rust, beweging en visuele voorkeuren'));break;
 case 'subscription':html=title('Mijn abonnement','Pakket en betalingen.')+info('Nog geen abonnement gekoppeld','Je persoonlijke account is onafhankelijk van toekomstige betaalinstellingen.');break;
 case 'language':html=title('Taal','Je taalvoorkeuren.')+info('Nederlands','De bestaande TALERA-taalregeling blijft leidend. Je wijzigt de taal via de bestaande taalkeuze in de PWA.');break;
 case 'accessibility':html=title('Toegankelijkheid','Leesbaarheid en bediening.')+info('Bestaande instellingen','We behouden de huidige instellingen van de PWA en voegen geen tweede bediening toe.');break;
 case 'display':html=title('Weergave','Rust en beweging in TALERA.')+info('Presentatiemodus','De goedgekeurde presentatiemodus en bewegingsregeling blijven behouden.');break;
 case 'help':html=title('Hulp en over TALERA','Uitleg, contact en privacy.')+
 section('Ondersteuning',action('help','?','Hulp bij TALERA','Vragen over vertellen, bewaren en delen')+
 action('privacy-info','§','Privacy','Je bepaalt wie toegang heeft tot herinneringen'));break;
 default:html=title('Meer','TALERA');
 }
 body.innerHTML=html+notice();body.scrollTop=0;
}
function feedback(message,error=false){state.notice=message;state.error=error;render()}
function go(view){if(!state.open)return;state.history.push(state.view);state.view=view;state.notice='';render();void load(view)}
function backOne(){if(!state.history.length){close();return}state.view=state.history.pop();state.notice='';render();void load(state.view)}
function open(view='hub',intent=null){if(state.open){if(view!=='hub'){state.view=view;state.history=[];state.intent=intent;state.notice='';render()}return}state.open=true;state.view=view;state.intent=intent;state.history=[];state.notice='';shell.hidden=false;document.body.dataset.taleraMoreOpen='true';render();void load(view)}
function close(){state.open=false;state.intent=null;shell.hidden=true;delete document.body.dataset.taleraMoreOpen;trigger()?.focus?.()}
async function load(view){
 try{
  if(view==='hub'||view==='account'||view==='settings'||view==='privacy'||view==='people'||view==='shared'||view==='mine'||view==='messages'){
   try{const m=await api('/api/me');state.account=m.account}catch(e){if(e.status===401)state.account=null;else throw e}
   if(state.account&&(view==='hub'||view==='account'||view==='privacy'||view==='settings'))state.discovery=await api('/api/discovery');
  }
  if(!state.account&&(view==='messages'||view==='shared'||view==='mine'||view==='people')){if(state.open&&state.view===view)render();return}
  if(view==='mine')state.memories=(await api('/api/memories')).items||[];
  if(view==='messages')state.messages=(await api('/api/messages')).items||[];
  if(view==='shared')state.shared=(await api('/api/shared-with-me')).items||[];
  if(view==='thread'&&state.thread){const id=state.thread;state.threadData=await api('/api/threads/'+encodeURIComponent(id));await api('/api/messages/memory/'+encodeURIComponent(id)+'/read','POST',{});}
  if(state.open&&state.view===view)render();
 }catch(e){if(state.open&&state.view===view)feedback(e.message,true)}
}
shell.addEventListener('click',e=>{
 if(e.target===shell){close();return}
 const eye=e.target.closest('[data-eye]');
 if(eye){const input=shell.querySelector('#'+eye.dataset.eye);if(input){const visible=input.type==='password';input.type=visible?'text':'password';eye.setAttribute('aria-pressed',String(visible));eye.setAttribute('aria-label',visible?'Wachtwoord verbergen':'Wachtwoord tonen');eye.textContent=visible?'◎':'◉'}return}
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.view){go(button.dataset.view);return}
 if(button.dataset.thread){state.thread=button.dataset.thread;state.threadData=null;go('thread');return}
 switch(button.dataset.action){
 case 'close':close();break;
 case 'back':backOne();break;
 case 'logout':void api('/api/logout','POST',{}).then(()=>{document.documentElement.dataset.taleraAuth='signed-out';state.account=null;state.discovery=null;state.history=[];state.view='hub';feedback('Je bent uitgelogd.');document.dispatchEvent(new CustomEvent('talera:account-changed',{detail:{authenticated:false}}));}).catch(e=>feedback(e.message,true));break;
 case 'enable-listening':if(window.__taleraAudioControls?.enable)window.__taleraAudioControls.enable();else document.dispatchEvent(new CustomEvent('talera:enable-listening'));render();break;
 case 'disable-listening':window.__taleraAudioControls?.disable?.();render();break;
 case 'help':feedback('Gebruik Mijn account voor aanmelden en profiel, Mijn mensen voor contacten en Berichten voor reacties.');break;
 case 'privacy-info':go('privacy');break;
 }
});
shell.addEventListener('submit',e=>{
 e.preventDefault();const form=e.target;if(state.busy)return;
 state.busy=true;const data=Object.fromEntries(new FormData(form).entries());
 const task=(async()=>{
  switch(form.dataset.form){
   case 'forgot':{const result=await api('/api/password/forgot','POST',{email:data.email});return result.message||'Als dit e-mailadres bij TALERA bekend is, ontvang je een herstelmail.'}
   case 'login':{const result=await api('/api/login','POST',{email:data.email,password:data['login-password']});state.account=result.account||null;state.history=[];state.view='account';const intent=state.intent;if(intent)close();else await load('account');document.documentElement.dataset.taleraAuth='signed-in';document.dispatchEvent(new CustomEvent('talera:account-changed',{detail:{intent}}));return 'Je bent aangemeld.'}
   case 'register':{
    if(data['register-password']!==data['register-confirm'])throw Error('De wachtwoorden komen niet overeen.');
    if(String(data['register-password']||'').length<8)throw Error('Gebruik minimaal 8 tekens.');
    const result=await api('/api/register','POST',{displayName:data.displayName,username:data.username,email:data.email,password:data['register-password']});
    state.account=result.account||null;state.history=[];state.view='account';const intent=state.intent;if(intent)close();else await load('account');document.documentElement.dataset.taleraAuth='signed-in';document.dispatchEvent(new CustomEvent('talera:account-changed',{detail:{intent}}));return 'Je account is aangemaakt.'}
   case 'privacy':state.discovery=await api('/api/discovery','POST',{discoverable:form.querySelector('[name="discoverable"]').checked,username:data.username});return 'Je privacykeuzes zijn opgeslagen.';
   case 'search':{state.query=String(data.q||'').trim();state.search=(await api('/api/people/search?q='+encodeURIComponent(state.query))).items||[];return state.search.length?'Gevonden accounts: '+state.search.length:'Geen gebruikers gevonden.'}
   case 'comment':{if(!state.thread)throw Error('Geen gesprek geselecteerd');await api('/api/threads/'+encodeURIComponent(state.thread)+'/comments','POST',{body:data.body});state.threadData=await api('/api/threads/'+encodeURIComponent(state.thread));return 'Reactie verstuurd.'}
  }
  return '';
 })();
 task.then(msg=>{if(state.open)feedback(msg)}).catch(err=>feedback(err.message,true)).finally(()=>{state.busy=false});
});
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('button');if(!btn)return;
 if(btn.querySelector('.more')||btn.id==='navMore'){e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();open()}
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.open){e.preventDefault();backOne()}});
setInterval(()=>{if(state.open&&!document.hidden&&state.view==='thread'&&state.thread)void load('thread')},5000);
if(new URLSearchParams(location.search).get('talera_menu')==='hub')open();
document.addEventListener('talera:open-auth',e=>{const intent=e.detail?.intent||'share';open('login',intent)});
async function checkSession(){
 try{const m=await api('/api/me');state.account=m.account;document.documentElement.dataset.taleraAuth='signed-in';document.dispatchEvent(new CustomEvent('talera:auth-ready',{detail:{authenticated:true}}))}
 catch(e){if(e.status===401){state.account=null;document.documentElement.dataset.taleraAuth='signed-out';document.dispatchEvent(new CustomEvent('talera:auth-ready',{detail:{authenticated:false}}));if(!state.open&&location.pathname==='/present'&&!new URLSearchParams(location.search).has('preview'))open('login','initial')}
 else{document.documentElement.dataset.taleraAuth='error'}}
}
void checkSession();
window.__taleraMoreMenu={ready:true,open,close,state:()=>({open:state.open,view:state.view,accountId:state.account?.id||null})};
document.documentElement.dataset.taleraMoreMenu='mounted';
})();