import {SocialController} from './social-controller.mjs';
import {ShareController} from './share-controller.mjs';
const css = '#talera-clean-social{position:fixed;right:18px;bottom:calc(22px + env(safe-area-inset-bottom));z-index:96;display:flex;gap:3px;padding:6px 8px;background:rgba(250,252,255,.20);border:1px solid #ffffffb8;border-radius:22px;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 5px 22px #0003}#talera-clean-social[hidden],#talera-clean-overlay[hidden]{display:none!important;pointer-events:none!important}#talera-clean-social button{background:transparent;border:0;color:white;min-width:48px;padding:4px;cursor:pointer;font:600 12px system-ui;display:grid;justify-items:center;gap:1px;text-shadow:0 1px 3px #0007}#talera-clean-social svg{width:23px;height:23px;stroke:currentColor;stroke-width:1.7;fill:none}#talera-clean-social button[aria-pressed=true] svg{fill:white}#talera-clean-overlay{position:fixed;inset:0;z-index:120;display:grid;place-items:end center;background:#0e1f3066}#talera-clean-panel{box-sizing:border-box;width:100%;max-width:700px;max-height:80dvh;overflow:auto;border-radius:28px 28px 0 0;background:#fafaf9;color:#1b3449;padding:22px 20px calc(24px + env(safe-area-inset-bottom));font:15px/1.5 system-ui;box-shadow:0 -9px 33px #0003}#talera-clean-panel h2{font-size:23px;margin:2px 0 14px}#talera-clean-panel button{cursor:pointer;font:inherit;border-radius:12px;padding:11px 14px}#talera-clean-panel .primary{display:block;background:#315f87;color:#fff;border:0;width:100%;font-weight:700;margin:12px 0}#talera-clean-panel .primary:disabled{opacity:.55}#talera-clean-panel .close{float:right;background:transparent;border:0;font-size:21px;padding:2px 10px}#talera-clean-panel label{display:block;font-weight:650;margin:12px 0 5px}#talera-clean-panel select,#talera-clean-panel textarea{box-sizing:border-box;width:100%;padding:11px;border:1px solid #b8c7d0;border-radius:12px;background:#fff;color:inherit;font:inherit}#talera-clean-panel .status{font-size:13px;line-height:1.45;color:#5b6c77;margin:10px 0}#talera-clean-panel .comment{border-bottom:1px solid #e2e7e9;padding:8px 0}';
const icons = {
 heart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.8c-2-2.1-5.2-2.1-7.3 0L12 6.3l-1.5-1.5c-2.1-2.1-5.3-2.1-7.3 0-2.3 2.2-2.3 5.6 0 7.8L12 21l8.8-8.4c2.2-2.2 2.2-5.6 0-7.8z"/></svg>',
 comment:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.8-.3-4-.9L3 21l1.6-4.8A8.5 8.5 0 1 1 20.5 11.5z"/></svg>',
 share:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m0 0L7 8m5-5 5 5M5 14v6h14v-6"/></svg>'
};
function escapeText(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function stored(id){try{return JSON.parse(localStorage.getItem('talera-clean-local:'+id)||'null')||{hearted:false,heartCount:0,comments:[],commentCount:0}}catch{return {hearted:false,heartCount:0,comments:[],commentCount:0}}}
async function findStoryId(memoryId){return new Promise(resolve=>{try{const r=indexedDB.open('talera-v43-local-draft',1);r.onerror=()=>resolve(null);r.onupgradeneeded=()=>resolve(null);r.onsuccess=()=>{const db=r.result;if(!db.objectStoreNames.contains('drafts')){db.close();resolve(null);return}const tx=db.transaction('drafts','readonly');const q=tx.objectStore('drafts').get('shared:'+memoryId);q.onsuccess=()=>{const id=q.result?.storyId;db.close();resolve(/^[0-9a-f-]{36}$/i.test(id||'')?id:null)};q.onerror=()=>{db.close();resolve(null)}}}catch{resolve(null)}})}
const socialAdapter={
 findStoryId,
 loadLocal:async id=>stored(id),
 async fetchSnapshot({storyId}){const r=await fetch('/api/account-social/stories/'+encodeURIComponent(storyId)+'/thread',{credentials:'same-origin',cache:'no-store'});if(!r.ok||!(r.headers.get('content-type')||'').includes('application/json'))throw Error('Reacties uit het account zijn nog niet beschikbaar in deze test.');const d=await r.json();return {hearted:!!d.storyLiked,heartCount:Number(d.storyLikes)||0,commentCount:(d.comments||[]).length,comments:(d.comments||[]).map(c=>({id:c.id,from:c.author,text:c.body}))}},
 async commitLocal({memoryId,snapshot}){localStorage.setItem('talera-clean-local:'+memoryId,JSON.stringify(snapshot));return {snapshot}},
 async commit(){throw Error('Reageren op het gedeelde serververhaal wordt nog aangesloten.')}
};
const shareAdapter={
 async publish(){throw Error('Veilige TALERA-eigenaarscontrole en tijdelijke media-publicatie worden nog aangesloten. Er is niets gedeeld.')},
 async createInvite(){throw Error('Gastlinkdienst nog niet gekoppeld.')}
};
function mount(){
 if(document.getElementById('talera-clean-social'))return;
 const runtime=window.__taleraTimelineRuntime;
 if(!runtime?.subscribe||!runtime?.currentMemory){document.documentElement.dataset.cleanSocial='runtime-unavailable';return}
 for(const id of ['talera-v12-reactions-bar','talera-v12-react-overlay','talera-v12-react-sheet'])document.getElementById(id)?.remove();
 document.querySelectorAll('.talera-share-shell').forEach(e=>e.remove());
 const style=document.createElement('style');style.id='talera-clean-style';style.textContent=css;document.head.append(style);
 const bar=document.createElement('nav');bar.id='talera-clean-social';bar.setAttribute('aria-label','Reacties en delen');
 bar.innerHTML='<button data-action="heart" aria-label="Hartje geven" aria-pressed="false">'+icons.heart+'<span class="count">0</span></button><button data-action="comments" aria-label="Berichten openen">'+icons.comment+'<span class="count">0</span></button><button data-action="share" aria-label="Delen">'+icons.share+'<span>Delen</span></button>';
 const overlay=document.createElement('div');overlay.id='talera-clean-overlay';overlay.hidden=true;overlay.innerHTML='<section id="talera-clean-panel" role="dialog" aria-modal="true" tabindex="-1"></section>';
 document.body.append(bar,overlay);
 const panel=overlay.firstElementChild;
 const social=new SocialController(socialAdapter),share=new ShareController(shareAdapter);
 let mode=null,memory=runtime.currentMemory(),focus=null,consent=false;
 function close(){mode=null;overlay.hidden=true;bar.hidden=false;share.close();focus?.focus?.()}
 function open(next){mode=next;focus=document.activeElement;overlay.hidden=false;bar.hidden=true;render();panel.focus()}
 function onMemory(m){if(!m?.id)return;memory=m;social.select(String(m.id));if(mode)close()}
 const unsub=runtime.subscribe(onMemory);onMemory(runtime.currentMemory());
 social.subscribe(v=>{const h=bar.querySelector('[data-action=heart]');h.querySelector('.count').textContent=String(v.data.heartCount);h.setAttribute('aria-pressed',String(v.data.hearted));bar.querySelector('[data-action=comments] .count').textContent=String(v.data.commentCount);if(mode==='comments')render()});
 share.subscribe(()=>{if(mode==='share')render()});
 function render(){if(!mode)return;const closeButton='<button type="button" class="close" data-action="close" aria-label="Sluiten">×</button>';
  if(mode==='comments'){const s=social.current();const list=s.data.comments.map(c=>'<div class="comment"><strong>'+escapeText(c.from||'Gebruiker')+'</strong><p>'+escapeText(c.text||'')+'</p></div>').join('');panel.innerHTML=closeButton+'<h2>Berichten</h2><p class="status">'+(s.status==='loading'?'Reacties worden geladen…':escapeText(s.error||''))+'</p>'+(list||'<p>Nog geen berichten.</p>')+'<form id="talera-clean-comment-form"><label for="clean-comment">Reageren</label><textarea id="clean-comment" rows="2" maxlength="4000" required></textarea><button class="primary" type="submit">Versturen</button></form>';return}
  const v=share.current(),labels={1:'1 uur',24:'1 dag',168:'7 dagen',720:'30 dagen'};
  const options=[1,24,168,720].map(h=>'<option value="'+h+'" '+(v.durationHours===h?'selected':'')+'>'+labels[h]+'</option>').join('');
  panel.innerHTML=closeButton+'<h2>Delen via WhatsApp</h2><p><strong>'+escapeText(memory?.title||memory?.story||'Herinnering')+'</strong></p><p>Alleen deze herinnering wordt gedeeld.</p><label for="talera-clean-expiry">Link geldig voor</label><select id="talera-clean-expiry">'+options+'</select><label style="font-weight:normal"><input id="talera-clean-consent" type="checkbox" '+(consent?'checked':'')+'> Ik geef toestemming deze herinnering tijdelijk te publiceren.</label><p class="status">'+escapeText(v.error||'Beveiligde publicatie staat nog uit in deze integratietest.')+'</p><button type="button" class="primary" data-action="prepare">Uitnodiging voorbereiden</button><button type="button" class="primary" data-action="send" '+(v.state==='ready'?'':'disabled')+'>Verzenden via WhatsApp</button>';
 }
 bar.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(!button)return;const a=button.dataset.action;if(a==='heart')void social.mutate({type:'toggle-heart'});if(a==='comments'){open('comments');social.openComments()}if(a==='share'){consent=false;share.open(String(social.activeMemoryId));open('share')}});
 overlay.addEventListener('click',e=>{if(e.target===overlay){close();return}const a=e.target.closest('[data-action]')?.dataset.action;if(a==='close'){close();return}if(a==='prepare'){consent=!!panel.querySelector('#talera-clean-consent')?.checked;void share.prepare({consent}).catch(error=>{const p=panel.querySelector('.status');if(p)p.textContent=String(error.message||error)});return}if(a==='send'){try{location.assign(share.whatsappUrl())}catch(error){panel.querySelector('.status').textContent=error.message}}});
 overlay.addEventListener('change',e=>{if(e.target.id==='talera-clean-expiry'){share.setDuration(Number(e.target.value));consent=false}else if(e.target.id==='talera-clean-consent')consent=e.target.checked});
 overlay.addEventListener('submit',e=>{if(e.target.id!=='talera-clean-comment-form')return;e.preventDefault();const input=e.target.querySelector('textarea');const body=input.value.trim();if(!body)return;input.disabled=true;void social.mutate({type:'comment',body}).then(r=>{if(r.ok)input.value='';input.disabled=false})});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mode)close()});
 window.__taleraCleanSocial={social,share,open,close,unsub};
 document.documentElement.dataset.cleanSocial='mounted';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
