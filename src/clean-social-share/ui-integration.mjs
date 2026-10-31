import {SocialController} from './social-controller.mjs';
import {ShareController} from './share-controller.mjs';
const css = '#talera-clean-social{position:fixed;right:18px;bottom:calc(22px + env(safe-area-inset-bottom));z-index:96;display:flex;gap:3px;padding:6px 8px;background:rgba(250,252,255,.20);border:1px solid #ffffffb8;border-radius:22px;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 5px 22px #0003}#talera-clean-social{transition:opacity .13s ease-out,visibility 0s linear,transform .13s ease-out;will-change:opacity}#talera-clean-social[data-motion=moving]{opacity:0!important;visibility:hidden!important;pointer-events:none!important;transform:translateY(13px)!important;transition:opacity .1s ease,transform .1s ease,visibility 0s linear .1s!important}#talera-clean-social[hidden],#talera-clean-overlay[hidden]{display:none!important;pointer-events:none!important}#talera-clean-social button{background:transparent;border:0;color:white;min-width:48px;padding:4px;cursor:pointer;font:600 12px system-ui;display:grid;justify-items:center;gap:1px;text-shadow:0 1px 3px #0007}#talera-clean-social svg{width:23px;height:23px;stroke:currentColor;stroke-width:1.7;fill:none}#talera-clean-social button[aria-pressed=true] svg{fill:white}#talera-clean-overlay{position:fixed;inset:0;z-index:120;display:grid;place-items:end center;background:#0e1f3066}#talera-clean-panel{box-sizing:border-box;width:100%;max-width:700px;max-height:80dvh;overflow:auto;border-radius:28px 28px 0 0;background:#fafaf9;color:#1b3449;padding:22px 20px calc(24px + env(safe-area-inset-bottom));font:15px/1.5 system-ui;box-shadow:0 -9px 33px #0003}#talera-clean-panel h2{font-size:23px;margin:2px 0 14px}#talera-clean-panel button{cursor:pointer;font:inherit;border-radius:12px;padding:11px 14px}#talera-clean-panel .primary{display:block;background:#315f87;color:#fff;border:0;width:100%;font-weight:700;margin:12px 0}#talera-clean-panel .primary:disabled{opacity:.55}#talera-clean-panel .close{float:right;background:transparent;border:0;font-size:21px;padding:2px 10px}#talera-clean-panel label{display:block;font-weight:650;margin:12px 0 5px}#talera-clean-panel select,#talera-clean-panel textarea{box-sizing:border-box;width:100%;padding:11px;border:1px solid #b8c7d0;border-radius:12px;background:#fff;color:inherit;font:inherit}#talera-clean-panel .status{font-size:13px;line-height:1.45;color:#5b6c77;margin:10px 0}#talera-clean-panel .photo-thumb{display:block;width:100%;height:155px;object-fit:cover;border-radius:15px;margin:12px 0;background:#eef2f5}#talera-clean-panel .comment{border-bottom:1px solid #e2e7e9;padding:8px 0}';
const icons = {
 heart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.8c-2-2.1-5.2-2.1-7.3 0L12 6.3l-1.5-1.5c-2.1-2.1-5.3-2.1-7.3 0-2.3 2.2-2.3 5.6 0 7.8L12 21l8.8-8.4c2.2-2.2 2.2-5.6 0-7.8z"/></svg>',
 comment:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.8-.3-4-.9L3 21l1.6-4.8A8.5 8.5 0 1 1 20.5 11.5z"/></svg>',
 share:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m0 0L7 8m5-5 5 5M5 14v6h14v-6"/></svg>'
};
function escapeText(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function stored(id){try{return JSON.parse(localStorage.getItem('talera-clean-local:'+id)||'null')||{hearted:false,heartCount:0,comments:[],commentCount:0}}catch{return {hearted:false,heartCount:0,comments:[],commentCount:0}}}

async function coreRequest(path,options={}){
 const r=await fetch(path,{credentials:'same-origin',cache:'no-store',...options,headers:{'accept':'application/json',...(options.headers||{})}});
 const d=await r.json().catch(()=>null);
 if(!r.ok){const e=Error(d?.error||(r.status===401?'Meld je aan bij TALERA':'TALERA-accountdienst niet beschikbaar'));e.status=r.status;throw e}
 return d;
}
async function findStoryId(localMemoryId){
 try{
  const d=await coreRequest('/api/pwa/memory-link?localMemoryId='+encodeURIComponent(localMemoryId));
  return d.memoryId||null;
 }catch(e){throw e}
}
const socialAdapter={
 findStoryId,
 loadLocal:async()=>{throw Error('Koppel deze herinnering aan je TALERA-account voordat je hartjes of reacties gebruikt.')},
 async fetchSnapshot({storyId}){
  const d=await coreRequest('/api/threads/'+encodeURIComponent(storyId));
  return {hearted:!!d.hearted,heartCount:Number(d.heartCount)||0,commentCount:(d.items||[]).length,comments:(d.items||[]).map(c=>({id:c.id,from:c.display_name,text:c.body,authorId:c.author_id}))};
 },
 async commitLocal(){throw Error('Deze herinnering is nog niet gekoppeld aan je TALERA-account.')},
 async commit({storyId,operation}){
  if(operation.type==='toggle-heart')await coreRequest('/api/threads/'+encodeURIComponent(storyId)+'/like',{method:'POST'});
  else if(operation.type==='comment')await coreRequest('/api/threads/'+encodeURIComponent(storyId)+'/comments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({body:operation.body})});
  else throw Error('Onbekende reactie');
  const d=await coreRequest('/api/threads/'+encodeURIComponent(storyId));
  return {snapshot:{hearted:!!d.hearted,heartCount:d.heartCount,comments:(d.items||[]).map(c=>({id:c.id,from:c.display_name,text:c.body})),commentCount:(d.items||[]).length}};
 }
};

async function previewPhotoBlob(memory){
 const source=String(memory?.image||memory?.previewImage||'').trim();
 if(!source)return null;
 if(!/^(https?:\/\/|blob:|data:image\/)/i.test(source))throw Error('Deze foto kan niet veilig voor WhatsApp worden voorbereid.');
 let res;
 try{res=await fetch(source,{mode:'cors',credentials:'same-origin',cache:'no-store'})}
 catch{throw Error('De foto kan niet worden geladen. Er is nog niets gedeeld.')}
 if(!res.ok)throw Error('De foto is niet beschikbaar. Er is nog niets gedeeld.');
 const original=await res.blob();
 if(!original.type.startsWith('image/'))throw Error('Deze herinnering bevat geen bruikbare foto.');
 const src=URL.createObjectURL(original);
 const photo=new Image();
 try{
  photo.decoding='async';
  await new Promise((resolve,reject)=>{photo.onload=resolve;photo.onerror=()=>reject(Error('De foto kan niet worden gelezen.'));photo.src=src});
  const w=1200,h=630,sw=photo.naturalWidth,sh=photo.naturalHeight;
  if(!sw||!sh)throw Error('De foto heeft geen geldige afmetingen.');
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Foto verwerken lukt niet op dit apparaat.');
  // Eén doorlopende foto, niet de eerdere combinatie van een wazige
  // achtergrond en een tweede afbeelding in het midden (drie stroken).
  // Centre-crop vult het Open Graph kader zonder herhaalde randen.
  const cropWidth=Math.min(sw,sh*w/h),cropHeight=Math.min(sh,sw*h/w);
  const sx=(sw-cropWidth)/2,sy=(sh-cropHeight)/2;
  ctx.drawImage(photo,sx,sy,cropWidth,cropHeight,0,0,w,h);
  let jpeg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.83));
  if(!jpeg||jpeg.size>1500000)jpeg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.64));
  if(!jpeg||jpeg.size>1500000)throw Error('Foto is te groot om veilig via WhatsApp te delen.');
  return jpeg;
 }finally{URL.revokeObjectURL(src)}
}


async function presentationPhotoBlob(memory){
 const source=String(memory?.image||memory?.previewImage||'').trim();
 if(!source)return null;
 if(!/^(https?:\/\/|blob:|data:image\/)/i.test(source))throw Error('De foto kan niet veilig worden geladen.');
 let response;
 try{response=await fetch(source,{mode:'cors',credentials:'same-origin',cache:'no-store'})}
 catch{throw Error('De originele foto kan niet worden geladen.')}
 if(!response.ok)throw Error('De originele foto is niet beschikbaar.');
 const blob=await response.blob();
 if(!blob.type.startsWith('image/'))throw Error('Geen bruikbare foto voor de presentatie.');
 const url=URL.createObjectURL(blob),img=new Image();
 try{
  img.decoding='async';
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Foto kan niet worden verwerkt.'));img.src=url});
  const w=img.naturalWidth,h=img.naturalHeight;
  if(!w||!h)throw Error('De afbeelding heeft geen geldige afmetingen.');
  const scale=Math.min(1,1200/w,1800/h);
  const canvas=document.createElement('canvas');canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Fotoverwerking is niet beschikbaar.');
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  let jpg=await new Promise(done=>canvas.toBlob(done,'image/jpeg',.84));
  if(jpg?.size>1500000)jpg=await new Promise(done=>canvas.toBlob(done,'image/jpeg',.67));
  if(!jpg||jpg.size>1500000)throw Error('Foto is te groot om veilig te delen.');
  return jpg;
 }finally{URL.revokeObjectURL(url)}
}

async function memoryAudioBlob(memory){
 const source=memory?.audioUrl||memory?.recordingUrl||memory?.voiceUrl||memory?.narrationAudioUrl||memory?.audioSrc||memory?.audio?.src||memory?.audio?.url||null;
 if(!source)return null;
 let blob;
 if(source instanceof Blob)blob=source;
 else{
  if(typeof source!=='string'||!/^(https?:\/\/|blob:|data:audio\/)/i.test(source))throw Error('De geluidsopname is niet beschikbaar om te delen.');
  let response;
  try{response=await fetch(source,{mode:'cors',credentials:'same-origin',cache:'no-store'})}
  catch{throw Error('De geluidsopname kan niet worden geladen.')}
  if(!response.ok)throw Error('De geluidsopname is niet beschikbaar.');
  blob=await response.blob();
 }
 const type=String(blob.type||'').split(';')[0].toLowerCase();
 if(!['audio/mpeg','audio/mp4','audio/aac','audio/x-m4a','audio/wav','audio/ogg','audio/webm'].includes(type))throw Error('Dit geluidsbestand kan nog niet veilig worden gedeeld.');
 if(blob.size<100||blob.size>12000000)throw Error('De geluidsopname moet kleiner zijn dan 12 MB.');
 return blob;
}
async function memoryVideoBlob(memory){
 const source=memory?.videoUrl||memory?.videoSrc||memory?.clipUrl||memory?.video?.src||memory?.video?.url||memory?.media?.videoUrl||null;
 if(!source)return null;
 let blob;
 if(source instanceof Blob)blob=source;
 else{
  if(typeof source!=='string'||!/^(https?:\/\/|blob:|data:video\/)/i.test(source))throw Error('De video is niet beschikbaar om te delen.');
  let response;
  try{response=await fetch(source,{mode:'cors',credentials:'same-origin',cache:'no-store'})}
  catch{throw Error('De video kan niet worden geladen.')}
  if(!response.ok)throw Error('De video is niet beschikbaar.');
  blob=await response.blob();
 }
 const type=String(blob.type||'').split(';')[0].trim().toLowerCase();
 if(!['video/mp4','video/quicktime','video/webm'].includes(type))throw Error('Dit videoformaat kan nog niet veilig worden gedeeld.');
 if(blob.size<100||blob.size>25000000)throw Error('De video moet kleiner zijn dan 25 MB.');
 return blob;
}
const shareAdapter={
 async publish({memoryId,consent}){
  if(!consent)throw Error('Toestemming ontbreekt');
  const item=window.__taleraTimelineRuntime?.currentMemory?.();
  if(String(item?.id)!==String(memoryId))throw Error('De gekozen herinnering is veranderd');
  const existing=await findStoryId(memoryId);
  if(existing)return {storyId:existing};
  const storyText=String(item?.fullStory||item?.storyText||item?.description||item?.text||item?.story||'').trim();
  const title=String(item?.title||item?.story||item?.name||'').trim();
  const eventDate=item?.at&&Number.isFinite(new Date(item.at).getTime())?new Date(item.at).toISOString().slice(0,10):'';
  if(!title||!storyText)throw Error('Deze herinnering heeft nog geen tekst. Voeg een titel en een verhaal toe voordat je deelt.');
  const d=await coreRequest('/api/pwa/memory-link',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({localMemoryId:memoryId,title,storyText,eventDate,consent:true})});
  return {storyId:d.memoryId};
 },
 async createInvite({memoryId,storyId,durationHours}){
  const current=window.__taleraTimelineRuntime?.currentMemory?.();
  if(String(current?.id)!==String(memoryId))throw Error('De gekozen herinnering is veranderd. Probeer opnieuw.');
  // Prepare the approved image before creating an invitation; never send a
  // text-only link when a selected photo failed to upload.
  const preview=await previewPhotoBlob(current);
  const full=await presentationPhotoBlob(current);
  const sound=await memoryAudioBlob(current);
  const video=await memoryVideoBlob(current);
  const d=await coreRequest('/api/memories/'+encodeURIComponent(storyId)+'/shares',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({hours:durationHours,consent:true})});
  if(preview||full||sound||video){
   try{
    if(preview)await coreRequest('/api/shares/'+encodeURIComponent(d.id)+'/photo',{method:'POST',headers:{'content-type':'image/jpeg'},body:preview});
    if(full)await coreRequest('/api/shares/'+encodeURIComponent(d.id)+'/photo-full',{method:'POST',headers:{'content-type':'image/jpeg'},body:full});
    if(sound)await coreRequest('/api/shares/'+encodeURIComponent(d.id)+'/audio',{method:'POST',headers:{'content-type':sound.type.split(';')[0]},body:sound});
    if(video)await coreRequest('/api/shares/'+encodeURIComponent(d.id)+'/video',{method:'POST',headers:{'content-type':video.type.split(';')[0]},body:video});
   }catch(e){
    await coreRequest('/api/shares/'+encodeURIComponent(d.id)+'/revoke',{method:'POST'}).catch(()=>{});
    throw Error('De herinnering kon niet compleet worden gedeeld. De link is niet verzonden: '+e.message);
   }
  }
  return {url:d.link,shareId:d.id,durationHours,expiresAt:d.expiresAt,photo:!!preview,audio:!!sound,video:!!video};
 },
 async revokeInvite({shareId}){
  return coreRequest('/api/shares/'+encodeURIComponent(shareId)+'/revoke',{method:'POST'});
 }
};
function mount(){
 if(document.getElementById('talera-clean-social'))return;
 const runtime=window.__taleraTimelineRuntime;
 if(!runtime?.subscribe||!runtime?.currentMemory){document.documentElement.dataset.cleanSocial='runtime-unavailable';return}
 for(const id of ['talera-v12-reactions-bar','talera-v12-react-overlay','talera-v12-react-sheet'])document.getElementById(id)?.remove();
 document.querySelectorAll('.talera-share-shell').forEach(e=>e.remove());
 const style=document.createElement('style');style.id='talera-clean-style';style.textContent=css;document.head.append(style);
 const bar=document.createElement('div');bar.id='talera-clean-social';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Reacties en delen');
 bar.innerHTML='<button data-action="heart" aria-label="Hartje geven" aria-pressed="false">'+icons.heart+'<span class="count">0</span></button><button data-action="comments" aria-label="Berichten openen">'+icons.comment+'<span class="count">0</span></button><button data-action="share" aria-label="Delen">'+icons.share+'<span>Delen</span></button>';
 const overlay=document.createElement('div');overlay.id='talera-clean-overlay';overlay.hidden=true;overlay.innerHTML='<section id="talera-clean-panel" role="dialog" aria-modal="true" tabindex="-1"></section>';
 document.body.append(bar,overlay);
 const panel=overlay.firstElementChild;
 const social=new SocialController(socialAdapter),share=new ShareController(shareAdapter);
 let mode=null,memory=runtime.currentMemory(),focus=null,consent=false,shareAuth=null,authBusy=false;
 // Follow the established V32 band motion rules. Do not read social data for
 // transient memories while swiping: only select the settled photo/memory.
 let motion=true,forcedMotion=false,stableSince=0,settledMemoryId=null;
 const QUIET_MS=340;
 function setMotion(next){
  if(motion===next)return;
  motion=next;bar.dataset.motion=next?'moving':'settled';
 }
 bar.dataset.motion='moving';
 function bandMoving(){
  const band=window.__taleraIntegratedBand?.getState?.();
  const velocity=Math.abs(Number(band?.v)||0);
  const movement=!!(band?.drag||band?.snap||band?.timelineTracking||velocity>.02);
  const p=Number(band?.p);
  const visualSettled=!!(band&&band.titleMode==='idle'&&!movement&&Number.isFinite(p)&&Math.abs(p-Math.round(p))<.002);
  return forcedMotion||movement||!!((window.__taleraBandRolling||band?.active)&&!visualSettled)||!!runtime.isMoving?.();
 }
 function checkMotion(){
  if(document.hidden){setMotion(true);stableSince=0;return}
  const next=runtime.currentMemory?.();
  if(next?.id!=null&&String(next.id)!==String(memory?.id))onMemory(next);
  if(bandMoving()){stableSince=0;setMotion(true);return}
  if(!stableSince)stableSince=performance.now();
  if(performance.now()-stableSince<QUIET_MS){setMotion(true);return}
  const current=runtime.currentMemory?.()||memory;
  if(!current?.id){setMotion(true);return}
  const id=String(current.id);
  if(settledMemoryId!==id){
   memory=current;settledMemoryId=id;social.select(id);
   bar.dataset.memoryId=id;
  }
  setMotion(false);
 }
 function close(){mode=null;overlay.hidden=true;bar.hidden=false;share.close();checkMotion();focus?.focus?.()}
 async function verifyShareAuth(){
   if(authBusy)return;
   authBusy=true;shareAuth=null;
   if(mode==='share')render();
   try{const me=await coreRequest('/api/me');shareAuth=!!me.account}
   catch(e){shareAuth=e.status===401?false:'error'}
   finally{authBusy=false;if(mode==='share'&&!overlay.hidden)render()}
 }
 function open(next){if(motion)return;mode=next;focus=document.activeElement;overlay.hidden=false;bar.hidden=true;render();panel.focus();if(next==='share')void verifyShareAuth()}
 function onMemory(m){
  if(!m?.id)return;
  const changed=String(m.id)!==String(memory?.id);
  memory=m;
  if(changed){stableSince=0;setMotion(true);if(mode)close()}
  checkMotion();
 }
 const unsub=runtime.subscribe(onMemory);
 document.addEventListener('talera:wheel-motion',event=>{
  forcedMotion=event.detail?.active===true;
  stableSince=0;
  if(forcedMotion)setMotion(true);
  else checkMotion();
 });
 document.addEventListener('visibilitychange',()=>{stableSince=0;checkMotion()});
 const motionTimer=setInterval(checkMotion,75);
 onMemory(runtime.currentMemory());
 social.subscribe(v=>{const h=bar.querySelector('[data-action=heart]');h.querySelector('.count').textContent=String(v.data.heartCount);h.setAttribute('aria-pressed',String(v.data.hearted));bar.querySelector('[data-action=comments] .count').textContent=String(v.data.commentCount);if(mode==='comments')render()});
 share.subscribe(()=>{if(mode==='share')render()});
 function render(){if(!mode)return;const closeButton='<button type="button" class="close" data-action="close" aria-label="Sluiten">×</button>';
  if(mode==='comments'){const s=social.current();const list=s.data.comments.map(c=>'<div class="comment"><strong>'+escapeText(c.from||'Gebruiker')+'</strong><p>'+escapeText(c.text||'')+'</p></div>').join('');panel.innerHTML=closeButton+'<h2>Berichten</h2><p class="status">'+(s.status==='loading'?'Reacties worden geladen…':escapeText(s.error||(!s.storyId?'Nog niet gekoppeld aan je TALERA-account.':'')))+'</p>'+(list||'<p>Nog geen berichten.</p>')+'<p class="status">'+(/aanmelden/i.test(s.error||'')?'<button type="button" class="primary" data-action="signin-comments">Aanmelden om te reageren</button>':'')+'</p><form id="talera-clean-comment-form"><label for="clean-comment">Reageren</label><textarea id="clean-comment" rows="2" maxlength="4000" required></textarea><button class="primary" type="submit">Versturen</button></form>';return}
  const v=share.current(),labels={1:'1 uur',24:'1 dag',168:'7 dagen',720:'30 dagen'};
  const options=[1,24,168,720].map(h=>'<option value="'+h+'" '+(v.durationHours===h?'selected':'')+'>'+labels[h]+'</option>').join('');
  panel.innerHTML=closeButton+'<h2>Delen via WhatsApp</h2><p><strong>'+escapeText(memory?.title||memory?.story||'Herinnering')+'</strong></p><p>Alleen deze herinnering wordt gedeeld.</p>'+(memory?.image&&/^(https?:\/\/|blob:|data:image\/)/i.test(String(memory.image))?'<img class="photo-thumb" src="'+escapeText(memory.image)+'" alt="Foto die bij de uitnodiging wordt getoond">':'')+'<label for="talera-clean-expiry">Link geldig voor</label><select id="talera-clean-expiry">'+options+'</select><label style="font-weight:normal"><input id="talera-clean-consent" type="checkbox" '+(consent?'checked':'')+'> Ik geef toestemming deze herinnering tijdelijk te publiceren.</label><p class="status">'+escapeText(shareAuth===false?'Meld je één keer aan om een persoonlijke deel-link te maken.':shareAuth===null?'TALERA controleert je aanmelding…':shareAuth==='error'?'Aanmeldstatus kon niet worden gecontroleerd. Probeer het opnieuw.':v.error||'Kies een geldigheidsduur en geef toestemming om deze herinnering te delen.')+'</p>'+
   (shareAuth===false?'<button type="button" class="primary" data-action="signin">Aanmelden om te delen</button>':
    '<button type="button" class="primary" data-action="prepare" '+(shareAuth===true?'':'disabled')+'>Uitnodiging voorbereiden</button>')+
   '<button type="button" class="primary" data-action="send" '+(shareAuth===true&&v.state==='ready'?'':'disabled')+'>Verzenden via WhatsApp</button>'+
   (v.state==='ready'?'<p class="status">'+(v.invite?.photo?'De foto is toegevoegd aan de persoonlijke link. WhatsApp kan deze als voorbeeld tonen.':'Dit verhaal heeft geen foto; alleen de tekst wordt gedeeld.')+'</p>':'');
 }
 bar.addEventListener('click',e=>{if(motion)return;const button=e.target.closest('[data-action]');if(!button)return;const a=button.dataset.action;if(a==='heart')void social.mutate({type:'toggle-heart'});if(a==='comments'){open('comments');social.openComments()}if(a==='share'){consent=false;share.open(String(social.activeMemoryId));open('share')}});
 overlay.addEventListener('click',e=>{if(e.target===overlay){close();return}const a=e.target.closest('[data-action]')?.dataset.action;if(a==='close'){close();return}if(a==='signin'||a==='signin-comments'){overlay.hidden=true;document.dispatchEvent(new CustomEvent('talera:open-auth',{detail:{intent:a==='signin'?'share':'comments'}}));return}
 if(a==='prepare'){if(shareAuth!==true){void verifyShareAuth();return}consent=!!panel.querySelector('#talera-clean-consent')?.checked;void share.prepare({consent}).catch(error=>{const p=panel.querySelector('.status');if(p)p.textContent=String(error.message||error)});return}if(a==='send'){try{location.assign(share.whatsappUrl())}catch(error){panel.querySelector('.status').textContent=error.message}}});
 overlay.addEventListener('change',e=>{if(e.target.id==='talera-clean-expiry'){share.setDuration(Number(e.target.value));consent=false}else if(e.target.id==='talera-clean-consent')consent=e.target.checked});
 overlay.addEventListener('submit',e=>{if(e.target.id!=='talera-clean-comment-form')return;e.preventDefault();const input=e.target.querySelector('textarea');const body=input.value.trim();if(!body)return;input.disabled=true;void social.mutate({type:'comment',body}).then(r=>{if(r.ok)input.value='';else{const status=panel.querySelector('.status');if(status)status.textContent=r.error||'Reactie niet opgeslagen'}input.disabled=false})});
 document.addEventListener('talera:account-changed',e=>{
  const intent=e.detail?.intent;
  shareAuth=null;authBusy=false;
  const id=social.activeMemoryId;
  if(id){social.invalidate(id);void social.load(id)}
  if(intent==='share'&&mode==='share'&&memory?.id!=null){
    overlay.hidden=false;bar.hidden=true;
    const duration=share.current().durationHours;
    share.open(String(memory.id));share.setDuration(duration);
    render();void verifyShareAuth();panel.focus();
  }else if(intent==='comments'&&mode==='comments'){overlay.hidden=false;bar.hidden=true;render();panel.focus()}
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mode)close()});
 window.__taleraCleanSocial={social,share,open,close,unsub,motionState:()=>({moving:motion,settledMemoryId,pendingMemoryId:memory?.id,forcedMotion}),stopMotionMonitor:()=>clearInterval(motionTimer)};
 document.documentElement.dataset.cleanSocial='mounted';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
