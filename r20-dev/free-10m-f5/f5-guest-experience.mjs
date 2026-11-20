// TALERA Free: recipient experience for one revocable, same-origin memory.
// No second PWA, private account access, external scripts or new storage.
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const guestCSS=`
:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color-scheme:dark}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#0b2438;color:#fff}button,input,textarea{font:inherit}
button,a{ -webkit-tap-highlight-color:transparent}button{cursor:pointer}
button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #8bcaff;outline-offset:3px}
.stage{height:100dvh;min-height:480px;position:relative;isolation:isolate;overflow:hidden;background:linear-gradient(145deg,#244764,#071b30)}
.cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;filter:brightness(.76)}
.shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,#071a31e8 0%,transparent 30%,#0c263557 53%,#061a2ff5 100%);pointer-events:none}
.top{padding:calc(17px + env(safe-area-inset-top)) 20px 12px;display:flex;align-items:center;gap:10px;justify-content:space-between}
.brand{display:inline-flex;align-items:center;gap:8px;color:#fff;text-decoration:none;font-weight:800;letter-spacing:.08em;font-size:16px}
.brand img{width:34px;height:34px;object-fit:contain}
.single{border:1px solid #ffffff55;border-radius:18px;padding:8px 10px;font-size:11px;color:#e8f1f8;background:#102e49aa}
.hero{position:absolute;bottom:calc(114px + env(safe-area-inset-bottom));padding:10px 22px 14px;left:50%;transform:translateX(-50%);width:100%;max-width:850px}
.eyebrow{margin:0 0 8px;font-size:13px;color:#d4e7f2;font-weight:700}
h1{font-size:clamp(28px,7vw,48px);line-height:1.1;margin:0 0 12px;text-shadow:0 2px 18px #0008;overflow-wrap:anywhere}
.event-date{font-size:13px;color:#dbe9f1;margin:0 0 13px}
.listen{display:block;width:min(100%,310px);height:38px;margin:0 0 12px}
.media-btn,.read-btn{padding:11px 17px;border-radius:17px;border:1px solid #ffffffa8;font-weight:700;min-height:44px}
.media-btn{color:#fff;background:#17344abb;display:block;margin:0 0 10px}
.read-btn{color:#17344a;background:#fff}
.bottom{position:absolute;bottom:calc(14px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:8px;border:1px solid #ffffff6b;border-radius:22px;width:calc(100% - 36px);max-width:520px;background:#16364abf;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.bottom button{border:0;border-radius:15px;color:#fff;background:#ffffff12;padding:13px;min-height:52px;font-size:16px;font-weight:700}
.bottom button[aria-pressed=true]{color:#ffd5dc;background:#a7465866}
.sheet[hidden],.promo[hidden],.video-layer[hidden]{display:none!important}
.sheet,.promo,.video-layer{position:fixed;inset:0;z-index:20;background:#081d30b8;display:flex;justify-content:center;align-items:flex-end}
.sheet-content{width:min(100%,640px);height:min(78dvh,760px);padding:20px 21px calc(30px + env(safe-area-inset-bottom));border-radius:27px 27px 0 0;background:#fbfdff;color:#17344a;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.sheet-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.sheet-head h2{font-size:22px;margin:0}
.close{border:0;border-radius:50%;width:43px;height:43px;background:#e8eff5;color:#17344a;font-size:25px}
.story{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.72;font-size:16px}
.comment-list{max-height:35dvh;overflow:auto;margin:12px 0}
.comment{border-bottom:1px solid #dce6ef;padding:9px 0}.comment strong{display:block}
.muted{color:#566c7c;font-size:14px}
label{display:block;margin:13px 0 5px;font-weight:700;font-size:14px}
input,textarea{display:block;width:100%;padding:12px;border:1px solid #b8cbd9;background:#fff;color:#17344a;border-radius:12px}
textarea{min-height:95px;resize:vertical}
.primary{background:#214c73;color:white;border:0;border-radius:13px;padding:13px 18px;font-weight:750;min-height:46px}
.status{min-height:20px;font-size:13px;color:#566c7c}
.promo{z-index:40;align-items:center;padding:20px}
.promo-card{background:#fff;color:#17344a;padding:26px 22px;border-radius:24px;max-width:410px;width:100%;box-shadow:0 18px 48px #06192f66}
.promo-card h2{margin:0 0 12px;font-size:25px}
.promo-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:17px}
.promo-actions a{background:#214c73;color:#fff;text-decoration:none;padding:13px 16px;border-radius:13px;font-weight:750}
.promo-actions button{background:#e7eef5;color:#17344a;border:0;padding:13px 16px;border-radius:13px;font-weight:750}
.video-layer{z-index:30;align-items:center;padding:calc(20px + env(safe-area-inset-top)) 16px calc(20px + env(safe-area-inset-bottom));flex-direction:column;gap:12px;background:#061625f2}
.video-layer video{width:min(100%,900px);max-height:calc(100dvh - 150px);background:#000}
.video-layer .close-video{align-self:flex-end;color:#17344a;background:#fff;border:0;border-radius:13px;padding:12px 15px}
`;
const landingCSS=`
:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:#17344a}
*{box-sizing:border-box}body{margin:0;background:#f3f7fb}a:focus-visible{outline:3px solid #3571aa;outline-offset:3px}
.wrap{max-width:1050px;margin:auto;padding:22px}
nav{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:5px 0 30px}
.logo{display:inline-flex;gap:10px;align-items:center;text-decoration:none;color:#17344a;font-size:20px;font-weight:850;letter-spacing:.06em}
.logo img{width:42px;height:42px}
.hero{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(0,.88fr);gap:36px;align-items:center;padding:52px 0}
h1{font-size:clamp(37px,6vw,68px);line-height:1.06;margin:0 0 20px;letter-spacing:-.03em}
.lead{font-size:clamp(18px,2.4vw,23px);line-height:1.5;color:#48677e;margin:0 0 22px}
.cta{display:inline-flex;justify-content:center;align-items:center;text-align:center;text-decoration:none;background:#214c73;color:#fff;border-radius:14px;padding:14px 23px;font-weight:800;min-height:50px}
.return{display:inline-block;margin:15px 0 0;color:#214c73;font-weight:750;text-decoration:underline;text-underline-offset:3px}
.visual{height:370px;border-radius:28px;background:linear-gradient(145deg,#122f51,#436e99);padding:29px;color:#fff;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 24px 60px #16395e24}
.vision{font-size:clamp(27px,4vw,39px);font-weight:800;letter-spacing:-.03em;line-height:1.14}
.pill{background:#ffffff2a;border:1px solid #ffffff70;border-radius:19px;padding:10px 15px;width:max-content}
.life-line{height:3px;background:#c5e4f3;position:relative;margin:15px 10px}
.life-line:before,.life-line:after{content:"";position:absolute;top:-7px;width:17px;height:17px;background:#e8f3fc;border-radius:50%}
.life-line:before{left:10%}.life-line:after{right:8%}
.features{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:17px;padding:4px 0 60px}
.features article{background:#fff;border-radius:19px;padding:24px;box-shadow:0 5px 20px #122f5110}
.features h2{font-size:19px;margin:0 0 10px}.features p{color:#526f83;line-height:1.58;margin:0}
footer{padding:24px 0;border-top:1px solid #d9e6ef;color:#668093;font-size:13px}
@media(max-width:730px){.hero{grid-template-columns:1fr;padding:16px 0 30px;gap:24px}.visual{height:250px}.features{grid-template-columns:1fr}.wrap{padding:17px}}
`;
export function renderGuestPresentation({title,storyText,eventDate,hasPhoto,hasAudio,hasVideo},pagePath,openGraph=''){
 if(!/^\/(?:s\/[A-Za-z0-9_-]{43}|__social\/shared\/[a-f0-9]{64})$/.test(pagePath))throw Error('INVALID_GUEST_ROUTE');
 const safeTitle=escapeHtml(title||'Een herinnering voor jou');
 const mediaBase=escapeHtml(pagePath);
 const returnHash=pagePath.slice(1);
 const story=escapeHtml(storyText||'');
 return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer">${openGraph}<title>${safeTitle} – TALERA</title><style>${guestCSS}</style><script defer src="/__f5/guest-ui.js"></script></head>
<body data-talera-page="guest"><main class="stage" aria-label="Gedeelde TALERA-herinnering">
${hasPhoto?'<img class="cover" src="'+mediaBase+'/photo" alt="Foto bij de gedeelde herinnering">':''}
<div class="shade"></div><header class="top"><a class="brand" href="/ontdek-talera#${returnHash}" aria-label="Ontdek TALERA"><img src="/pwa-192.png" alt=""><span>TALERA</span></a><span class="single">Persoonlijk gedeeld · één herinnering</span></header>
<section class="hero"><p class="eyebrow">Een herinnering voor jou</p><h1>${safeTitle}</h1>${eventDate?'<p class="event-date">'+escapeHtml(eventDate)+'</p>':''}
${hasAudio?'<audio class="listen" id="guestAudio" controls playsinline preload="none" src="'+mediaBase+'/audio" aria-label="Luister naar de herinnering"></audio>':''}
${hasVideo?'<button class="media-btn" type="button" id="openGuestVideo">Bekijk video</button>':''}
<button class="read-btn" type="button" id="openGuestStory">Lees het verhaal</button></section>
<div class="bottom" aria-label="Reageren op deze herinnering"><button id="guestHeart" type="button" aria-pressed="false">♡ <span id="heartCount">0</span></button><button id="openGuestComments" type="button">Reacties · <span id="commentCount">0</span></button></div></main>
<section class="sheet" id="storySheet" hidden aria-label="Geschreven herinnering"><div class="sheet-content" role="dialog" aria-modal="true" aria-labelledby="storyHeading"><div class="sheet-head"><h2 id="storyHeading">Het verhaal</h2><button class="close" type="button" data-close="storySheet" aria-label="Sluiten">×</button></div><p class="story">${story}</p></div></section>
<section class="sheet" id="commentSheet" hidden aria-label="Reacties"><div class="sheet-content" role="dialog" aria-modal="true" aria-labelledby="commentHeading"><div class="sheet-head"><h2 id="commentHeading">Reacties</h2><button class="close" type="button" data-close="commentSheet" aria-label="Sluiten">×</button></div><div id="guestComments" class="comment-list"></div><form id="guestCommentForm"><label id="guestNameLabel" for="guestName">Jouw voornaam</label><input id="guestName" name="name" maxlength="32" autocomplete="given-name" required><label for="guestMessage">Jouw reactie</label><textarea id="guestMessage" name="body" maxlength="1000" required></textarea><p class="muted">Je reactie wordt zichtbaar bij deze gedeelde herinnering.</p><button class="primary" type="submit">Reactie plaatsen</button><p class="status" id="guestStatus" role="status"></p></form></div></section>
${hasVideo?'<section class="video-layer" id="guestVideoLayer" hidden aria-label="Video bij de herinnering"><button class="close-video" type="button" id="closeGuestVideo">Sluit video</button><video id="guestVideo" controls playsinline preload="metadata" src="'+mediaBase+'/video"></video></section>':''}
<section class="promo" id="guestPromo" hidden aria-label="Ontdek TALERA"><div class="promo-card" role="dialog" aria-modal="true" aria-labelledby="promoHeading"><h2 id="promoHeading">Bewaar ook jouw verhalen met TALERA</h2><p>Foto's, herinneringen en jouw stem verdienen een eigen plek.</p><div class="promo-actions"><a href="/ontdek-talera#${returnHash}">Ontdek TALERA</a><button type="button" id="dismissGuestPromo">Niet nu</button></div></div></section>
</body></html>`;
}
export function renderTaleraLanding(){
 return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Ontdek TALERA – Bewaar jouw levensverhalen</title><style>${landingCSS}</style><script defer src="/__f5/guest-ui.js"></script></head><body data-talera-page="landing"><div class="wrap"><nav><a class="logo" href="/mijn-leven"><img src="/pwa-192.png" alt="">TALERA</a></nav><main><div class="hero"><section><h1>Jouw leven verdient een verhaal.</h1><p class="lead">Breng jouw foto's, herinneringen en ingesproken verhalen samen in een persoonlijke levenslijn. Bewaar ze op je eigen telefoon en deel bewust wat je wilt delen.</p><a class="cta" href="/mijn-leven">Ontdek TALERA Free</a><div><a class="return" id="returnGuestStory" href="/mijn-leven" hidden>Terug naar jouw herinnering</a></div></section><div class="visual" aria-hidden="true"><span class="pill">Mijn leven</span><div class="vision">Jouw momenten.<br>Jouw stem.<br>Jouw verhaal.</div><div class="life-line"></div><span>Herinneringen die blijven</span></div></div><section class="features" aria-label="Wat TALERA voor jou doet"><article><h2>Foto's en momenten</h2><p>Geef belangrijke momenten een herkenbare plek op jouw tijdlijn.</p></article><article><h2>Vertel het zelf</h2><p>Bewaar het verhaal achter jouw herinneringen, ook met jouw eigen stem.</p></article><article><h2>Deel bewust</h2><p>Laat iemand één gekozen herinnering beleven zonder toegang tot de rest van jouw privéleven.</p></article></section></main><footer>TALERA Free · Jouw herinneringen blijven van jou.</footer></div></body></html>`;
}
export const guestClientScript=String.raw`(()=>{
'use strict';
const $=id=>document.getElementById(id);
const page=document.body.dataset.taleraPage;
if(page==='landing'){
 const target=location.hash.slice(1);
 if(/^(?:s\/[A-Za-z0-9_-]{43}|__social\/shared\/[a-f0-9]{64})$/.test(target)){
  const back=$('returnGuestStory');
  back.href='/'+target;
  back.hidden=false;
 }
 return;
}
if(page!=='guest')return;
const base=location.pathname;
if(!/^\/(?:s\/[A-Za-z0-9_-]{43}|__social\/shared\/[a-f0-9]{64})$/.test(base))return;
function anonymousId(){
 try{
  const key='talera-guest-browser-v1';
  let id=sessionStorage.getItem(key);
  if(!/^[a-f0-9-]{36}$/.test(id||'')){id=crypto.randomUUID();sessionStorage.setItem(key,id)}
  return id;
 }catch{return crypto.randomUUID()}
}
const guestId=anonymousId();
function dismissKey(){
 let hash=2166136261;
 for(let i=0;i<base.length;i++){hash^=base.charCodeAt(i);hash=Math.imul(hash,16777619)}
 return 'talera-promo-seen-v1-'+(hash>>>0).toString(16);
}
function wasDismissed(){try{return localStorage.getItem(dismissKey())==='1'}catch{return false}}
function markDismissed(){try{localStorage.setItem(dismissKey(),'1')}catch{}}
let popupPending=false,popupShown=false,feedback={likes:0,comments:[]};
const audio=$('guestAudio'),video=$('guestVideo'),videoLayer=$('guestVideoLayer');
const playing=()=>[audio,video].some(x=>x&&!x.paused&&!x.ended);
// Once media has started, pausing is not completion. Hold the invite until
// ended or the visitor explicitly closes a video, never mid-story.
const unfinishedMedia=new Set();
const typing=()=>{const el=document.activeElement;return el&&/^(INPUT|TEXTAREA)$/.test(el.tagName)&&el.closest('#commentSheet')};
function popupCheck(){
 if(!popupPending||popupShown||wasDismissed()||playing()||unfinishedMedia.size||typing()||
    (videoLayer&&!videoLayer.hidden))return;
 popupPending=false;popupShown=true;
 $('guestPromo').hidden=false;
}
if(!wasDismissed()){
 setTimeout(()=>{popupPending=true;popupCheck()},10000);
 for(const node of [audio,video].filter(Boolean)){
  node.addEventListener('play',()=>unfinishedMedia.add(node));
  for(const type of ['ended','emptied','error'])
   node.addEventListener(type,()=>{unfinishedMedia.delete(node);popupCheck()});
 }
 document.addEventListener('focusout',()=>setTimeout(popupCheck,0));
}
$('dismissGuestPromo').addEventListener('click',()=>{
 $('guestPromo').hidden=true;popupPending=false;markDismissed();
});
// Following the voluntary invitation counts as seen, too: do not interrupt
// the same shared story again after returning from the introduction.
$('guestPromo').querySelector('a[href^="/ontdek-talera#"]').addEventListener('click',markDismissed);
function openSheet(id){const el=$(id);if(el)el.hidden=false}
function closeSheet(id){const el=$(id);if(el)el.hidden=true;popupCheck()}
$('openGuestStory').addEventListener('click',()=>openSheet('storySheet'));
$('openGuestComments').addEventListener('click',()=>{openSheet('commentSheet');void loadFeedback()});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeSheet(b.dataset.close)));
$('storySheet').addEventListener('click',e=>{if(e.target.id==='storySheet')closeSheet('storySheet')});
$('commentSheet').addEventListener('click',e=>{if(e.target.id==='commentSheet')closeSheet('commentSheet')});
if(videoLayer){
 $('openGuestVideo').addEventListener('click',()=>{
  if(audio&&!audio.paused){audio.pause();unfinishedMedia.delete(audio)}
  videoLayer.hidden=false;
 });
 $('closeGuestVideo').addEventListener('click',()=>{video.pause();unfinishedMedia.delete(video);videoLayer.hidden=true;popupCheck()});
}
async function api(path,method='GET',data){
 const opts={method,credentials:'same-origin',cache:'no-store',headers:{accept:'application/json','x-talera-guest-id':guestId}};
 if(data){opts.headers['content-type']='application/json';opts.body=JSON.stringify(data)}
 const res=await fetch(base+'/'+path,opts);
 const result=await res.json().catch(()=>({}));
 if(!res.ok||result.ok===false)throw Error(result.error||'De reactie is niet gelukt.');
 return result;
}
function renderFeedback(){
 $('heartCount').textContent=String(feedback.likes||0);
 $('commentCount').textContent=String(feedback.commentCount||0);
 $('guestHeart').setAttribute('aria-pressed',String(!!feedback.liked));
 const list=$('guestComments');list.replaceChildren();
 const items=Array.isArray(feedback.comments)?feedback.comments:[];
 if(!items.length){const p=document.createElement('p');p.className='muted';p.textContent='Er zijn nog geen reacties.';list.append(p)}
 for(const item of items){
  const wrap=document.createElement('div');wrap.className='comment';
  const name=document.createElement('strong');name.textContent=item.name||'TALERA-gebruiker';
  const body=document.createElement('p');body.textContent=item.body||'';
  wrap.append(name,body);list.append(wrap);
 }
 const signed=!!feedback.accountName;
 $('guestNameLabel').hidden=signed;
 $('guestName').hidden=signed;
 $('guestName').required=!signed;
}
async function loadFeedback(){
 try{feedback=await api('feedback');renderFeedback()}
 catch(e){$('guestStatus').textContent=e.message}
}
$('guestHeart').addEventListener('click',async()=>{
 const button=$('guestHeart');button.disabled=true;
 try{feedback=await api('heart','POST',{guestId});renderFeedback()}
 catch(e){$('guestStatus').textContent=e.message}
 finally{button.disabled=false}
});
$('guestCommentForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const form=e.currentTarget,button=form.querySelector('button[type=submit]');
 button.disabled=true;$('guestStatus').textContent='';
 try{
  feedback=await api('comment','POST',{guestId,
   firstName:$('guestName').value,body:$('guestMessage').value});
  $('guestMessage').value='';
  renderFeedback();$('guestStatus').textContent='Je reactie is geplaatst.';
 }catch(error){$('guestStatus').textContent=error.message}
 finally{button.disabled=false}
});
void loadFeedback();
})();`;
