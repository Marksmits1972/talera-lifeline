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
.return{display:inline-flex;align-items:center;justify-content:center;margin:0;background:#214c73;color:#fff;padding:14px 21px;border-radius:14px;min-height:50px;font-weight:800;text-decoration:none}
.return[hidden]{display:none!important}
.guest-landing-actions{display:flex;align-items:flex-start;flex-direction:column;gap:14px}
body.talera-returning-guest .guest-landing-actions .cta{background:#e1edf6;color:#214c73}
@media(max-width:730px){.guest-landing-actions>a{max-width:100%;width:auto;min-width:220px}}
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
 return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Ontdek TALERA – Bewaar jouw levensverhalen</title><style>${landingCSS}</style><script defer src="/__f5/guest-ui.js"></script></head><body data-talera-page="landing"><div class="wrap"><nav><a class="logo" href="/mijn-leven"><img src="/pwa-192.png" alt="">TALERA</a></nav><main><div class="hero"><section><h1>Jouw leven verdient een verhaal.</h1><p class="lead">Breng jouw foto's, herinneringen en ingesproken verhalen samen in een persoonlijke levenslijn. Bewaar ze op je eigen telefoon en deel bewust wat je wilt delen.</p><div class="guest-landing-actions"><a class="return" id="returnGuestStory" href="/mijn-leven" hidden>← Terug naar jouw herinnering</a><a class="cta" href="/mijn-leven">Ontdek TALERA Free</a></div></section><div class="visual" aria-hidden="true"><span class="pill">Mijn leven</span><div class="vision">Jouw momenten.<br>Jouw stem.<br>Jouw verhaal.</div><div class="life-line"></div><span>Herinneringen die blijven</span></div></div><section class="features" aria-label="Wat TALERA voor jou doet"><article><h2>Foto's en momenten</h2><p>Geef belangrijke momenten een herkenbare plek op jouw tijdlijn.</p></article><article><h2>Vertel het zelf</h2><p>Bewaar het verhaal achter jouw herinneringen, ook met jouw eigen stem.</p></article><article><h2>Deel bewust</h2><p>Laat iemand één gekozen herinnering beleven zonder toegang tot de rest van jouw privéleven.</p></article></section></main><footer>TALERA Free · Jouw herinneringen blijven van jou.</footer></div></body></html>`;
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
  document.body.classList.add('talera-returning-guest');
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


// The actual original /present is the sole presentation motor. This adapter
// supplies ONLY one authorized share, without IndexedDB/account access.
export function renderOriginalTaleraShare(original,share,pagePath,tokenHex,openGraph=''){
 if(!/^\/(?:s\/[A-Za-z0-9_-]{43}|__social\/shared\/[a-f0-9]{64})$/.test(pagePath)||
    !/^[a-f0-9]{64}$/.test(tokenHex))throw Error('INVALID_GUEST_CAPABILITY');
 if(typeof original!=='string'||!original.includes('id="photoStage"')||
    !original.includes('id="memoryStoryScroll"')||
    !original.includes('TaleraLibraryFactory.create(')||
    original.includes('TALERA_STRESS_MEMORIES'))
  throw Error('ORIGINAL_TALERA_PRESENTER_NOT_VERIFIED');
 const marker=/window\.TaleraMemories=\{[^\n;]*localOnly:true\};/g;
 const matched=[...original.matchAll(marker)];
 if(matched.length!==1)throw Error('ORIGINAL_LIBRARY_BRIDGE_MARKER_DRIFT');
 const id='local-'+tokenHex.slice(0,32);
 const media=[];
 if(share.manifest?.version===1){
  for(const [index,item] of share.manifest.items.entries()){
   media.push({key:id+':'+index,kind:item.kind,mime:item.mime,
    path:pagePath+'/media/'+index,parts:item.parts,size:item.size,
    hashes:item.hashes});
  }
 }else{
  for(const kind of ['photo','video','audio']){
   if(share['has'+kind[0].toUpperCase()+kind.slice(1)])
    media.push({key:id+':'+media.length,kind,path:pagePath+'/'+kind});
  }
 }

 const originalMedia=media.slice();
 const posters=Array.isArray(share.manifest?.posters)?share.manifest.posters:[];
 const posterLinks=Object.fromEntries(posters.map(p=>[
   String(p.mediaIndex),pagePath+'/poster/'+p.mediaIndex
 ]));
 for(const p of posters)media.push({
  key:id+':'+p.mediaIndex+':phone-v1',kind:'photo',
  mime:p.mime,path:pagePath+'/poster/'+p.mediaIndex,posterSha256:p.sha256
 });
 if(!originalMedia.length&&!String(share.storyText||'').trim())throw Error('EMPTY_GUEST_SHARE');
 const date=String(share.eventDate||'');
 const exact=/^\d{4}-\d{2}-\d{2}$/.test(date),year=/^\d{4}$/.test(date);
 const manifest=share.manifest?.version===1?share.manifest:null;
 const cues=(manifest?.narrationCues||[]).map(cue=>{
  const restored={...cue};
  if(Object.hasOwn(restored,'mediaIndex')){
   restored.mediaId=media[restored.mediaIndex].key;
   delete restored.mediaIndex;
  }
  return restored;
 });
 const row={id,source:'pwa-local',title:String(share.title||''),
  text:String(share.storyText||''),date:exact?date:year?date+'-01-01':new Date().toISOString().slice(0,10),
  datePrecision:manifest?.datePrecision||(exact?'exact':year?'year':'unknown'),
  time:manifest?.time||'12:00:00',
  narrationCues:cues,narrationDurationMs:manifest?.narrationDurationMs||0,
  items:originalMedia.map(x=>({key:x.key,kind:x.kind}))};
 const safe=x=>JSON.stringify(x).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
  .replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const bridge=[
  ';(function(){',
  "'use strict';",
  'const row=__GUEST_ROW__,items=__GUEST_MEDIA__,cache=new Map(),objectUrls=new Set();',
  "const deny=async()=>{throw Error('Alleen lezen: deze herinnering is persoonlijk gedeeld.')};",
  "const list=async()=>[{...row,items:row.items.map(x=>({...x}))}];",
  "const get=async id=>id===row.id?(await list())[0]:null;",
  'const blob=async key=>{',
  ' const item=items.find(x=>x.key===key);if(!item)return null;',
  ' if(cache.has(key))return cache.get(key);',
  ' let data;',
  ' if(item.parts){',
  '  const blobs=[];let total=0;',
  '  for(let part=0;part<item.parts;part++){',
  "   const r=await fetch(item.path+'/'+part,{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});",
  '   if(!r.ok||r.headers.get("content-type")!==item.mime)return null;',
  '   const bytes=await r.arrayBuffer();if(!bytes.byteLength||bytes.byteLength>1048576)return null;',
  '   if(!crypto.subtle)return null;',
  '   const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");',
  '   if(hash!==item.hashes[part])return null;',
  '   total+=bytes.byteLength;if(total>96*1048576)return null;blobs.push(bytes);',
  '  }',
  '  if(total!==item.size)return null;',
  '  data=new Blob(blobs,{type:item.mime});',
  ' }else{',
  "  const r=await fetch(item.path,{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});",
  '  if(!r.ok)return null;data=await r.blob();',
  ' }',
  ' if(!data.size||data.size>96*1048576||!data.type.startsWith(item.kind===\'photo\'?\'image/\':item.kind+\'/\'))return null;',
  ' if(item.posterSha256){',
 '  const digest=await crypto.subtle.digest("SHA-256",await data.arrayBuffer());',
 '  const hex=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");',
 '  if(hex!==item.posterSha256)return null;',
 ' }',
 ' cache.set(key,data);return data;',
  '};',
  'const mediaUrl=async key=>{const b=await blob(key);if(!b)return null;',
  ' const url=URL.createObjectURL(b);objectUrls.add(url);return url;};',
  'const memories=window.TaleraMemories;',
  "if(!memories||memories.localOnly!==true)throw Error('UNSEALED_PRIVATE_LIBRARY');",
  'Object.assign(memories,{list,get,blob,mediaUrl,displayUrl:mediaUrl,',
  ' save:deny,remove:deny,retime:deny,setTags:deny,setBirthday:deny,birthday:()=>null,audit:deny});',
  'window.TaleraGuestOneMemory={list,get};',
  "window.addEventListener('pagehide',()=>{for(const url of objectUrls)URL.revokeObjectURL(url);}, {once:true});",
  '})();'
 ].join('\n').replace('__GUEST_ROW__',safe(row)).replace('__GUEST_MEDIA__',safe(media));
 let html=original.slice(0,matched[0].index+matched[0][0].length)+'\n'+bridge+'\n'+
  original.slice(matched[0].index+matched[0][0].length);
 // Do not mount a separate photo stage, story sheet, player or timeline.
 // The original TALERA DOM retains its own iPhone lift-to-read gesture.
 const guestUi=[
 '<style id="talera-native-guest-style">',
 '#talera-clean-social [data-action="share"]{display:none!important}',
 '#talera-v5-editor-pencil,#talera-v21-pencil{display:none!important;visibility:hidden!important;pointer-events:none!important}',
 'body[data-talera-guest="one-memory"] #memoryCaption{z-index:81!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}',
 'body[data-talera-guest="one-memory"] #memoryStoryScroll{z-index:80!important;pointer-events:auto!important}',
 'body[data-talera-guest="one-memory"] #talera-flow-home{z-index:95!important;pointer-events:auto!important}',
 'body[data-talera-guest="one-memory"] #photoStage img[src^="data:image/svg+xml"],body[data-talera-guest="one-memory"] #photoStage img[src^="data:image/svg%2Bxml"]{visibility:hidden!important}',
 'html.talera-guest-video-fallback #photoStage{background-image:var(--talera-guest-poster,url("'+(share.hasPhoto?escapeHtml(pagePath)+'/photo':'')+'"));background-position:center;background-size:cover}',
 'html.talera-guest-video-fallback #photoStage img,html.talera-guest-video-fallback #memoryPhotoA,html.talera-guest-video-fallback #memoryPhotoB{visibility:hidden!important}',
 'html.talera-guest-video-fallback .talera-v61-first-frame-bridge{visibility:hidden!important}',
 '#talera-clean-panel input#taleraGuestFirstName{box-sizing:border-box;width:100%;padding:11px;border:1px solid #b8c7d0;border-radius:12px;background:#fff;color:inherit;font:inherit}',
 '#taleraNativeInvite[hidden]{display:none!important}#taleraNativeInvite{position:fixed;inset:0;z-index:2147480200;background:#06192fc9;display:flex;align-items:center;justify-content:center;padding:20px;font:15px -apple-system,sans-serif}',
 '#taleraNativeInvite .inner{background:#fff;color:#304653;border-radius:20px;max-width:390px;padding:25px 20px}',
 '#taleraNativeInvite button{background:#304653;color:white;border:0;border-radius:12px;padding:12px 15px}',
 '#taleraNativeInvite a{color:#304653;font-weight:750}',
 '</style>',
 '<section id="taleraNativeInvite" hidden><div class="inner"><h2>Ontdek TALERA</h2>',
 '<p>Bewaar ook jouw persoonlijke herinneringen.</p>',
 '<p><a id="taleraNativeIntroLink" href="/ontdek-talera#'+escapeHtml(pagePath.slice(1))+'">Ontdek TALERA</a></p>',
 '<button id="taleraNativeInviteClose" type="button">Niet nu</button></div></section>'
 ].join('');
 const social=[
  ";(function(){",
  "'use strict';",
  "const $=id=>document.getElementById(id),base=location.pathname;",
  "let initialized=false;",
  "function start(){",
  "if(initialized)return;",
  "let social,overlay,panel;",
  "const syncNodes=()=>{social=$('talera-clean-social');overlay=$('talera-clean-overlay');panel=$('talera-clean-panel')};",
  "syncNodes();",
  "if(!social||!overlay||!panel)return;",
  "initialized=true;window.__taleraGuestUsesOriginalCommentSheet=true;",
  "const key='talera-guest-browser-v1';",
  "let guestId;",
  "try{guestId=sessionStorage.getItem(key);",
  " if(!/^[a-f0-9-]{36}$/.test(guestId||'')){guestId=crypto.randomUUID();sessionStorage.setItem(key,guestId)}",
  "}catch{guestId=crypto.randomUUID()}",
  "const req=async(action,method='GET',payload)=>{",
  " const opt={method,credentials:'omit',cache:'no-store',headers:{",
  "  accept:'application/json','x-talera-guest-id':guestId}};",
  " if(payload){opt.headers['content-type']='application/json';opt.body=JSON.stringify(payload)}",
  " const r=await fetch(base+'/'+action,opt),data=await r.json().catch(()=>({}));",
  " if(!r.ok||data.ok===false)throw Error(data.error||'Reactie mislukt');",
  " return data;",
  "};",
  "const status=()=>{syncNodes();return panel?.querySelector('[data-guest-status]')};",
  "const tell=message=>{const el=status();if(el)el.textContent=message||''};",
  "const show=data=>{syncNodes();if(!social||!panel)return;",
  " const heart=social.querySelector('[data-action=heart]');",
  " const comments=social.querySelector('[data-action=comments]');",
  " if(heart){const n=heart.querySelector('.count');if(n)n.textContent=String(data.likes||0);",
  "  heart.setAttribute('aria-pressed',String(!!data.liked))}",
  " if(comments){const n=comments.querySelector('.count');if(n)n.textContent=String(data.commentCount||0)}",
  " const list=$('taleraNativeCommentList');if(!list)return;list.replaceChildren();",
  " if(!data.comments?.length){const p=document.createElement('p');p.textContent='Nog geen berichten.';list.append(p)}",
  " for(const c of data.comments||[]){",
  "  const entry=document.createElement('div'),name=document.createElement('strong'),body=document.createElement('p');",
  "  entry.className='comment';name.textContent=c.name||'Gebruiker';body.textContent=c.body||'';",
  "  entry.append(name,body);list.append(entry);",
  " }",
  " const field=$('taleraGuestFirstName');",
  " if(field){field.hidden=!!data.accountName;field.required=!data.accountName;",
  "  const label=panel.querySelector('label[for=taleraGuestFirstName]');",
  "  if(label)label.hidden=!!data.accountName}",
  "};",
  "const load=async()=>{try{show(await req('feedback'))}catch(e){tell(e.message)}};",
  "function openComments(){",
  " syncNodes();if(!social||!overlay||!panel)return;",
  " if(!overlay.hidden&&$('taleraGuestFirstName'))return;",
  " // The exact original TALERA overlay, paper, header, close icon and form.",
  " // One extra first-name field is required for the anonymous recipient.",
  " panel.innerHTML=[",
  "  '<button type=\"button\" class=\"close\" data-action=\"close\" aria-label=\"Sluiten\">×</button>',",
  "  '<h2>Berichten</h2>',",
  "  '<p class=\"status\" data-guest-feedback-status></p>',",
  "  '<div id=\"taleraNativeCommentList\"><p>Nog geen berichten.</p></div>',",
  "  '<p class=\"status\" id=\"taleraGuestResponseStatus\" data-guest-status></p>',",
  "  '<form id=\"talera-clean-comment-form\">',",
  "  '<label for=\"taleraGuestFirstName\">Voornaam</label>',",
  "  '<input id=\"taleraGuestFirstName\" maxlength=\"32\" autocomplete=\"given-name\" required>',",
  "  '<label for=\"clean-comment\">Reageren</label>',",
  "  '<textarea id=\"clean-comment\" rows=\"2\" maxlength=\"1000\" required></textarea>',",
  "  '<button class=\"primary\" type=\"submit\">Versturen</button>',",
  "  '</form>'",
  " ].join('');",
  " overlay.hidden=false;social.hidden=true;panel.focus();void load();",
  "}",
  "function closeComments(){syncNodes();if(!overlay||!social)return;overlay.hidden=true;social.hidden=false;checkPromo()}",
  "async function heart(){syncNodes();if(!social)return;",
  " const button=social.querySelector('[data-action=heart]');if(button)button.disabled=true;",
  " try{show(await req('heart','POST',{guestId}))}",
  " catch(e){tell(e.message)}finally{if(button)button.disabled=false}",
  "}",
  "// Stop ALL original media when a recipient leaves the link or hides Safari.",
  "// The original narrator and ordinary player keep their private app behaviour.",
  "const stopGuestMedia=()=>{",
  " window.__taleraFreePauseForShare?.(true);",
  " window.__taleraSharePauseActive=true;",
  " for(const media of document.querySelectorAll('audio,video'))",
  "  try{media.pause()}catch{}",
  " const audio=document.getElementById('talera-f5-shared-audio');",
  " if(audio)try{audio.pause()}catch{}",
  "};",
  "window.addEventListener('pagehide',stopGuestMedia,{once:true});",
  "document.addEventListener('visibilitychange',()=>{if(document.hidden)stopGuestMedia()});",
  "// Hide the old giant VIDEO placeholder only when a real frame is not",
  "// available yet. The existing full-screen video remains untouched.",
  "const guestPosterUrls="+JSON.stringify(posterLinks)+";",
  "const refreshVideoFallback=()=>{",
  " const memory=window.__taleraTimelineRuntime?.currentMemory?.();",
  " const index=memory?._photoIndex||0,frame=memory?._zeroFrames?.[index];",
  " const native=[...document.querySelectorAll('video.talera-v61-inline-video')].find(v=>",
  "  v.isConnected&&v.videoWidth>0&&v.videoHeight>0&&v.readyState>=2);",
  " const src=frame?.kind==='video'?guestPosterUrls[String(index)]:null;",
  " const stage=$('photoStage');",
  " if(src&&stage)stage.style.setProperty('--talera-guest-poster','url(\\\"'+src+'\\\")');",
  " else stage?.style.removeProperty('--talera-guest-poster');",
  " const missing=frame?.kind==='video'&&!native;",
  " document.documentElement.classList.toggle('talera-guest-video-fallback',!!missing);",
  "};",
  "refreshVideoFallback();",
  "const coverWatch=setInterval(refreshVideoFallback,120);",
  "// The native motor may replace the original image src before the next",
  "// polling interval. Match the VIDEO fall-back in the same microtask.",
  "const posterStage=$('photoStage');",
  "const posterObserver=new MutationObserver(refreshVideoFallback);",
  "if(posterStage)posterObserver.observe(posterStage,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});",
  "window.addEventListener('pagehide',()=>posterObserver.disconnect(),{once:true});",
  "const entryCover=$('taleraGuestEntryCover');",
  "let coverReady=false,queuedVideo=null,waitingForPhoto=false;",
  "const revealOriginal=()=>{if(coverReady)return;coverReady=true;",
  " if(entryCover){entryCover.style.transition='opacity 130ms ease-out';",
  "  requestAnimationFrame(()=>{entryCover.style.opacity='0'});",
  "  setTimeout(()=>entryCover.remove(),165);}",
  " document.documentElement.classList.remove('talera-guest-first-frame-pending')};",
  "const stillSelected=(kind,index)=>{const m=window.__taleraTimelineRuntime?.currentMemory?.();",
  " return !!(m&&!m._photoLoading&&m._zeroFrames?.[m._photoIndex||0]?.kind===kind&&",
  "   (m._photoIndex||0)===index)};",
  "const afterPaint=check=>requestAnimationFrame(()=>requestAnimationFrame(()=>{",
  " if(!coverReady&&check())revealOriginal();",
  "}));",
  "const refreshFirstFrame=()=>{if(coverReady||!entryCover)return;",
  " const m=window.__taleraTimelineRuntime?.currentMemory?.();",
  " if(!m||m._photoLoading||!Array.isArray(m._zeroFrames))return;",
  " const i=m._photoIndex||0,kind=m._zeroFrames[i]?.kind;",
  " if(kind==='video'){",
  "  const native=[...document.querySelectorAll('video.talera-v61-inline-video')].find(v=>",
  "   v.isConnected&&v.videoWidth>0&&v.videoHeight>0&&v.readyState>=2&&",
  "   getComputedStyle(v).display!=='none');",
  "  if(!native)return;",
  "  const same=()=>stillSelected('video',i)&&native.isConnected&&",
  "   native.readyState>=2&&native.videoWidth>0&&getComputedStyle(native).display!=='none';",
  "  // A decoded metadata frame is not always a COMPOSITED frame on iOS.",
  "  // When available, wait for the original player's video-frame callback.",
  "  if(typeof native.requestVideoFrameCallback==='function'&&queuedVideo!==native){",
  "   queuedVideo=native;",
  "   try{native.requestVideoFrameCallback(()=>afterPaint(same))}catch{}",
  "  }",
  "  // WebKit can omit the callback. A moving, decoded frame plus two actual",
  "  // browser paints is a bounded fallback; never alter or seek the player.",
  "  if(native.currentTime>0.12&&native.readyState>=3)afterPaint(same);",
  " }else if(kind==='photo'){",
  "  const selected=m.photos?.[i];",
  "  const image=[...document.querySelectorAll('#photoStage img')].find(img=>",
  "   img.currentSrc===selected&&img.complete&&img.naturalWidth>0);",
  "  if(!waitingForPhoto&&typeof selected==='string'&&selected.startsWith('blob:')&&image){",
  "   waitingForPhoto=true;",
  "   afterPaint(()=>stillSelected('photo',i)&&image.isConnected&&",
  "    image.complete&&image.naturalWidth>0&&image.currentSrc===selected);",
  "  }",
  " }else if(!kind)afterPaint(()=>!window.__taleraTimelineRuntime?.currentMemory?.()?._zeroFrames?.length);",
  "};",
  "const frameWatch=setInterval(refreshFirstFrame,80);",
  "window.addEventListener('pagehide',()=>clearInterval(frameWatch),{once:true});",
  "refreshFirstFrame();",
  "window.addEventListener('pagehide',()=>clearInterval(coverWatch),{once:true});",
  "const nativeLogo=()=>{",
  " const a=$('talera-flow-home');if(!a)return;",
  " // Keep the ORIGINAL logo, but raise it outside the story-scroll",
  " // stacking context in guest mode only. No duplicate TALERA control.",
  " if(a.parentElement!==document.body)document.body.appendChild(a);",
  " a.style.setProperty('z-index','2147480190','important');",
  " const href='/ontdek-talera#'+base.slice(1);",
  " if(a.getAttribute('href')!==href)a.setAttribute('href',href);",
  " a.setAttribute('aria-label','Ontdek TALERA');",
  "};",
  "nativeLogo();",
  "document.addEventListener('DOMContentLoaded',nativeLogo,{once:true});",
  "const logoObserver=new MutationObserver(nativeLogo);",
  "logoObserver.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});",
  "window.addEventListener('pagehide',()=>logoObserver.disconnect(),{once:true});",
  "document.addEventListener('click',e=>{syncNodes();",
  " const logo=e.target.closest?.('#talera-flow-home');",
  " const forbidden=e.target.closest?.('#talera-v5-editor-pencil,#talera-v21-pencil,a[href^=\"/tell\"],button[data-action=edit]');",
  " if(forbidden){e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();return}",
  " if(logo){e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();",
  "  stopGuestMedia();markPromoSeen();location.assign('/ontdek-talera#'+base.slice(1));return}",
  " const close=e.target.closest?.('#talera-clean-overlay [data-action=close]');",
  " if(close&&!overlay.hidden){e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();",
  "  closeComments();return}",
  " const btn=e.target.closest?.('#talera-clean-social button[data-action]');",
  " if(!btn)return;",
  " const action=btn.dataset.action;",
  " if(!['heart','comments','share'].includes(action))return;",
  " e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();",
  " if(action==='heart')void heart();",
  " if(action==='comments')openComments();",
  "},true);",
  "document.addEventListener('submit',async e=>{syncNodes();",
  " const form=e.target;",
  " if(form.id!=='talera-clean-comment-form'||overlay.hidden)return;",
  " e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();",
  " const button=form.querySelector('[type=submit]');if(button)button.disabled=true;",
  " tell('');",
  " try{show(await req('comment','POST',{guestId,",
  "  firstName:$('taleraGuestFirstName')?.value||'',body:$('clean-comment')?.value||''}));",
  "  $('clean-comment').value='';tell('Je reactie is geplaatst.')",
  " }catch(error){tell(error.message)}finally{if(button)button.disabled=false}",
  "},true);",
  "const promo=$('taleraNativeInvite');let promoDue=false;",
  "const promoKey=()=>{let hash=2166136261;",
  " for(let i=0;i<base.length;i++){hash^=base.charCodeAt(i);hash=Math.imul(hash,16777619)}",
  " return 'talera-promo-seen-v1-'+(hash>>>0).toString(16);",
  "};",
  "const promoSeen=()=>{try{return localStorage.getItem(promoKey())==='1'}catch{return false}};",
  "const markPromoSeen=()=>{try{localStorage.setItem(promoKey(),'1')}catch{}};",
  "const unfinished=new Set();",
  "const activeMedia=()=>[...document.querySelectorAll('audio,video')].some(m=>!m.paused&&!m.ended);",
  "const raised=()=>document.body.classList.contains('talera-v18-reading')||",
  " !!document.querySelector('.memory-space.talera-v26-reading');",
  "const typing=()=>!!document.activeElement?.closest?.('input,textarea,[contenteditable=true]');",
  "function checkPromo(){syncNodes();if(!overlay)return;",
  " if(!promoDue||promoSeen()||activeMedia()||unfinished.size||raised()||typing()||!overlay.hidden)return;",
  " promoDue=false;promo.hidden=false;",
  "}",
  "document.addEventListener('play',e=>{if(e.target.matches?.('audio,video'))unfinished.add(e.target)},true);",
  "for(const name of ['ended','error','emptied'])",
  " document.addEventListener(name,e=>{unfinished.delete(e.target);checkPromo()},true);",
  "document.addEventListener('click',()=>{if(promoDue)setTimeout(checkPromo,0)},true);",
  "document.addEventListener('focusout',()=>{if(promoDue)setTimeout(checkPromo,0)},true);",
  "$('taleraNativeInviteClose').addEventListener('click',()=>{markPromoSeen();promo.hidden=true});",
  "$('taleraNativeIntroLink').addEventListener('click',()=>{stopGuestMedia();markPromoSeen()});",
  "if(!promoSeen())setTimeout(()=>{promoDue=true;checkPromo()},10000);",
  "void load();",
  "}",
  "start();",
  "if(!initialized){",
  " const observer=new MutationObserver(()=>{start();if(initialized)observer.disconnect()});",
  " observer.observe(document.documentElement,{childList:true,subtree:true});",
  " document.addEventListener('DOMContentLoaded',start,{once:true});",
  "}",
  "})();"
 ].join('\n');
 // Only the selected guest capability receives a first-frame visual handoff.
 // The approved TALERA video and narration motors are untouched.
 const firstVisualIndex=share.manifest?.items?.findIndex(item=>
  item.kind==='photo'||item.kind==='video')??-1;
 const firstPoster=posters.find(p=>p.mediaIndex===firstVisualIndex);
 const firstFrameImage=firstPoster?escapeHtml(pagePath)+'/poster/'+firstPoster.mediaIndex:
  (share.hasPhoto?escapeHtml(pagePath)+'/photo':null);
 const hasVisual=!!(share.hasPhoto||share.hasVideo);
 const bootstrap='<style id="talera-guest-first-frame-bootstrap">'+
  'html,html body{background:#17344a!important}'+
  '#taleraGuestEntryCover{position:fixed;inset:0;z-index:2147480180;pointer-events:none;overflow:hidden;background:#17344a}'+
  '#taleraGuestEntryCover img{display:block;width:100%;height:100%;object-fit:cover}'+
  '</style>'+
  (firstFrameImage?'<link rel="preload" as="image" href="'+firstFrameImage+'">':'');
 if(!html.includes('</head>')||!/<body\b[^>]*>/i.test(html))
  throw Error('GUEST_NATIVE_DOCUMENT_FRAME_BOOTSTRAP_DRIFT');
 // Bootstrap paint MUST be present at the start of <head>, before the first
 // original style or script can make a white/default VIDEO frame visible.
 if(html.split('<head>').length!==2)throw Error('GUEST_FIRST_FRAME_HEAD_DRIFT');
 html=html.replace('<head>','<head>'+bootstrap);
 html=html.replace(/<body\b[^>]*>/i,tag=>tag.slice(0,-1)+
  ' data-talera-guest="one-memory">'+
  (hasVisual?'<div id="taleraGuestEntryCover" aria-hidden="true">'+
    (firstFrameImage?'<img src="'+firstFrameImage+'" alt="">':'')+
    '</div>':''));

 html=html.replace('</head>','<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta name="referrer" content="no-referrer">'+openGraph+'</head>');
 html=html.replace('</body>',guestUi+'<script id="talera-native-guest-social">'+social+'</script></body>');
 if(!html.includes('window.TaleraGuestOneMemory={list,get}')||
    !html.includes('id="memoryStoryScroll"')||!html.includes('id="photoStage"'))
  throw Error('GUEST_NATIVE_PRESENTATION_NOT_PRESERVED');
 return html;
}
