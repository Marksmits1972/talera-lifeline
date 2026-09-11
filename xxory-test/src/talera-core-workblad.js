export const TALERA_CORE_WORKBLAD_PRELUDE = String.raw`<script>(function(){
try{
  var u=new URL(location.href);
  if(u.searchParams.get('new')==='1'&&u.searchParams.has('at')){
    try{sessionStorage.setItem('talera-new-story-suggested-at',u.searchParams.get('at')||'')}catch(e){}
    u.searchParams.delete('at');
    history.replaceState(null,'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash);
  }
}catch(e){}
})();</scr`+`ipt>`;

export const TALERA_CORE_WORKBLAD_STYLE = String.raw`
/* TALERA Core Workblad — one UX owner. Voice first, text secondary, photos supportive. */
.work-top,.work-kicker,.work-hint{display:none!important}
.work-stage{grid-template-rows:minmax(0,1fr) auto 60px!important;gap:8px!important;padding:max(8px,env(safe-area-inset-top)) 10px 0!important;background:radial-gradient(circle at 50% 4%,#fff 0,#fbfaf7 44%,#f2eee7 100%)!important}
.work-scroll{overflow:hidden!important;padding:0!important}
.work-sheet{height:100%;min-height:0!important;overflow:hidden!important;padding:15px 15px 12px!important;border-radius:25px!important;gap:9px!important;justify-content:flex-start!important}
.work-title{order:1;font-size:clamp(22px,6vw,28px)!important;line-height:1.05!important;min-height:32px!important}
.work-date-row{order:2;min-height:28px!important;gap:8px!important}
.work-date{font-size:16px!important;cursor:pointer}
.talera-core-voice-intro{order:3;display:grid;gap:3px;padding:7px 1px 0}
.talera-core-voice-intro strong{font-size:17px;line-height:1.15;letter-spacing:-.01em;color:#0F2747}
.talera-core-voice-intro span{font-size:12px;line-height:1.35;color:rgba(62,74,89,.62)}
.work-tools{order:4;margin:0!important;padding:0!important}
.work-tool.voice{min-height:62px!important;border-radius:19px!important;font-size:16px!important;letter-spacing:0!important;box-shadow:0 11px 26px rgba(15,39,71,.18)!important}
.work-voice-note{order:5;padding:9px 11px!important;border-radius:15px!important}
.work-photo-section{order:6;gap:6px!important;min-height:0}
.work-photo{background:linear-gradient(145deg,rgba(220,234,246,.50),rgba(247,244,239,.86))!important}
.work-photo:not(.has-photo){min-height:72px!important;border-radius:17px!important}
.work-photo.has-photo{min-height:clamp(190px,28dvh,260px)!important;background:linear-gradient(145deg,#eef3f6,#f5f1ea)!important;touch-action:pan-y}
.work-photo img{height:clamp(190px,28dvh,260px)!important;min-height:0!important;max-height:none!important;object-fit:contain!important;background:transparent!important}
.work-photo-empty{grid-template-columns:auto 1fr!important;display:grid!important;text-align:left!important;justify-items:start!important;padding:12px 15px!important;gap:10px!important}
.work-photo-plus{width:36px!important;height:36px!important;font-size:22px!important}
.work-photo-change{padding:8px 11px!important;font-size:11px!important}
.work-photo-strip{overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch;scrollbar-width:none;min-height:30px!important;gap:6px!important}
.work-photo-strip::-webkit-scrollbar{display:none}
.work-photo-thumb{width:30px!important;height:30px!important;border-radius:8px!important;cursor:pointer}
.work-photo-count.is-single,.work-photo-strip.is-single{display:none!important}
.work-story{order:7;min-height:112px!important;max-height:18dvh!important;flex:1 1 auto!important;font-size:16px!important;line-height:1.48!important;overflow:auto!important;-webkit-overflow-scrolling:touch;border-top:1px solid rgba(15,39,71,.055)!important;padding-top:11px!important}
.work-error{order:8}
.talera-core-validation{order:8;border-radius:14px;background:#fff1ef;color:#8f3a31;padding:10px 12px;font-size:13px;line-height:1.35}
.work-stage input,.work-stage textarea{font-size:16px!important}
.work-required-missing{outline:2px solid rgba(193,79,69,.52)!important;outline-offset:2px!important;border-radius:10px}
.work-actions{grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;margin-top:0!important}
.work-draft{font-size:10px!important}
.work-finish{min-height:49px!important;border-radius:16px!important}

.talera-date-backdrop{position:fixed;inset:0;z-index:85;background:rgba(15,39,71,.20);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;padding:16px 12px max(16px,env(safe-area-inset-bottom))}
.talera-date-sheet{width:min(100%,520px);background:#fffdfa;border-radius:26px;padding:18px;box-shadow:0 22px 70px rgba(15,39,71,.24);color:#0F2747;display:grid;gap:14px}
.talera-date-sheet h2{margin:0;font-size:22px;line-height:1.08;letter-spacing:-.02em}
.talera-date-sheet p{margin:0;color:#5e6b79;font-size:14px;line-height:1.4}
.talera-date-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;background:rgba(220,234,246,.58);padding:4px;border-radius:14px}
.talera-date-tab{border:0;border-radius:11px;min-height:42px;background:transparent;color:#0F2747;font-weight:700}
.talera-date-tab.active{background:white;box-shadow:0 2px 9px rgba(15,39,71,.10)}
.talera-date-panel{display:grid;gap:10px}.talera-date-panel[hidden]{display:none!important}
.talera-date-sheet label{font-size:12px;font-weight:750;color:#526071;letter-spacing:.02em}
.talera-date-sheet input,.talera-date-sheet select{width:100%;min-height:50px;border:1px solid rgba(15,39,71,.14);border-radius:14px;background:white;color:#0F2747;padding:0 13px;font-size:16px!important}
.talera-date-approx{display:grid;grid-template-columns:1.2fr .8fr;gap:8px}
.talera-date-actions{display:grid;grid-template-columns:auto 1fr;gap:8px;margin-top:2px}
.talera-date-cancel,.talera-date-confirm{border:0;border-radius:15px;min-height:50px;padding:0 18px;font-weight:750;font-size:15px}
.talera-date-cancel{background:rgba(220,234,246,.56);color:#0F2747}.talera-date-confirm{background:#0F2747;color:#fff}

@media(max-width:600px) and (max-height:740px){
  .work-stage{grid-template-rows:minmax(0,1fr) auto 58px!important;gap:5px!important;padding:max(6px,env(safe-area-inset-top)) 8px 0!important}
  .work-sheet{padding:10px 12px!important;gap:6px!important}
  .work-title{font-size:21px!important;min-height:28px!important}
  .talera-core-voice-intro{padding-top:3px}.talera-core-voice-intro strong{font-size:15px}.talera-core-voice-intro span{font-size:11px}
  .work-tool.voice{min-height:52px!important;font-size:15px!important}
  .work-photo.has-photo{min-height:160px!important}.work-photo img{height:160px!important}
  .work-story{min-height:82px!important;max-height:14dvh!important}
  .work-finish{min-height:44px!important}
}
`;

export const TALERA_CORE_WORKBLAD_SCRIPT = String.raw`<script>(function(){
var resetDone=false,dateOverlay=null,dateMode='exact',swipeBlockUntil=0;
function s(){try{return typeof state!=='undefined'?state:null}catch(e){return null}}
function fmt(v){v=Math.max(0,Math.round(Number(v)||0));return Math.floor(v/60)+':'+String(v%60).padStart(2,'0')}
function isNew(){try{var q=new URLSearchParams(location.search);return q.get('new')==='1'&&!q.get('edit')}catch(e){return false}}
async function clearDraft(){
  try{localStorage.removeItem('talera-workblad-text-v2')}catch(e){}
  try{
    var db=await new Promise(function(ok,no){var r=indexedDB.open('talera-workblad-v2',1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)};r.onupgradeneeded=function(){if(!r.result.objectStoreNames.contains('drafts'))r.result.createObjectStore('drafts',{keyPath:'id'})}});
    await new Promise(function(ok,no){var tx=db.transaction('drafts','readwrite');tx.oncomplete=ok;tx.onerror=function(){no(tx.error)};tx.objectStore('drafts').delete('current')});db.close();
  }catch(e){}
}
function resetFreshStory(){
  if(resetDone||!isNew())return;resetDone=true;
  var st=s();if(st){
    st.workTitle='';st.workDate='';st.workText='';st.workError='';st.audioBlob=null;st.duration=0;st.liveTranscript='';st.hasExistingAudio=false;st.workMedia=[];st.newPhotoFiles=[];st.workPhotoIndex=0;
  }
  clearDraft();
  try{if(typeof renderEntry==='function')renderEntry()}catch(e){}
}
function voiceExists(){var st=s();return Boolean(st&&(st.audioBlob||st.hasExistingAudio))}
function decorate(){
  var sheet=document.querySelector('.work-sheet');if(!sheet)return;
  var title=document.getElementById('workTitle');if(title)title.placeholder='Titel van je verhaal';
  var date=document.getElementById('workDate');if(date){date.placeholder='Wanneer speelde dit verhaal zich af?';date.readOnly=true;date.setAttribute('aria-haspopup','dialog')}
  var story=document.getElementById('workText');if(story)story.placeholder='Je woorden verschijnen hier vanzelf. Liever typen? Dat kan ook.';
  var tools=sheet.querySelector('.work-tools');
  var intro=sheet.querySelector('.talera-core-voice-intro');
  if(!intro&&tools){intro=document.createElement('div');intro.className='talera-core-voice-intro';sheet.insertBefore(intro,tools)}
  if(intro)intro.innerHTML=voiceExists()?'<strong>Je verhaal is opgenomen</strong><span>Je stem blijft onderdeel van deze herinnering. Je kunt hem opnieuw inspreken als je wilt.</span>':'<strong>Vertel wat er gebeurde</strong><span>Je stem wordt bewaard. Terwijl je praat, ontstaan de woorden vanzelf.</span>';
  var b=document.getElementById('workVoice');if(b){b.textContent=voiceExists()?'Opnieuw inspreken':'Vertel je verhaal';b.setAttribute('aria-label',voiceExists()?'Vervang de gesproken opname':'Start met het vertellen van je verhaal')}
  var note=sheet.querySelector('.work-voice-note');if(note){var strong=note.querySelector('strong'),small=note.querySelector('.work-voice-copy span');if(strong)strong.textContent='Je stem is bewaard';if(small){var st=s();small.textContent=fmt(st&&st.duration||0)+' · deze opname hoort bij dit verhaal'}}
  var empty=sheet.querySelector('.work-photo-empty span:last-child');if(empty)empty.textContent='Foto’s toevoegen';
  var change=sheet.querySelector('.work-photo-change');if(change)change.textContent='Foto’s toevoegen';
  var strip=sheet.querySelector('.work-photo-strip'),count=sheet.querySelector('.work-photo-count');if(strip){var n=strip.querySelectorAll('.work-photo-thumb').length;strip.classList.toggle('is-single',n<=1);if(count)count.classList.toggle('is-single',n<=1)}
  bindPhotoUi();
}
function photoItems(){var st=s();return st&&Array.isArray(st.workMedia)?st.workMedia:[]}
function photoIndex(){var st=s(),n=photoItems().length;if(!st||!n)return 0;if(typeof st.workPhotoIndex!=='number'||!isFinite(st.workPhotoIndex))st.workPhotoIndex=0;st.workPhotoIndex=Math.max(0,Math.min(n-1,st.workPhotoIndex));return st.workPhotoIndex}
function showPhoto(i,scroll){
  var st=s(),items=photoItems();if(!st||items.length<=1)return;st.workPhotoIndex=((i%items.length)+items.length)%items.length;var idx=photoIndex(),hero=document.querySelector('#workPhoto img');if(hero&&items[idx]&&items[idx].localUrl)hero.src=items[idx].localUrl;
  var thumbs=[].slice.call(document.querySelectorAll('.work-photo-thumb'));thumbs.forEach(function(t,k){t.classList.toggle('active',k===idx)});var count=document.querySelector('.work-photo-count');if(count)count.textContent=(idx+1)+' / '+items.length;if(scroll&&thumbs[idx]&&thumbs[idx].scrollIntoView)try{thumbs[idx].scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})}catch(e){}
}
function bindPhotoUi(){
  var thumbs=[].slice.call(document.querySelectorAll('.work-photo-thumb'));thumbs.forEach(function(t,i){if(t.dataset.corePhoto==='1')return;t.dataset.corePhoto='1';t.setAttribute('role','button');t.tabIndex=0;t.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();showPhoto(i,true)})});
  var hero=document.getElementById('workPhoto');if(!hero||photoItems().length<=1||hero.dataset.coreSwipe==='1')return;hero.dataset.coreSwipe='1';var sx=0,sy=0,armed=false;hero.addEventListener('touchstart',function(e){if(!e.touches||e.touches.length!==1)return;sx=e.touches[0].clientX;sy=e.touches[0].clientY;armed=true},{passive:true});hero.addEventListener('touchend',function(e){if(!armed)return;armed=false;var t=e.changedTouches&&e.changedTouches[0];if(!t)return;var dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)>=44&&Math.abs(dx)>Math.abs(dy)*1.2){if(e.cancelable)e.preventDefault();swipeBlockUntil=Date.now()+320;showPhoto(photoIndex()+(dx<0?1:-1),true)}},{passive:false});hero.addEventListener('click',function(e){if(Date.now()<swipeBlockUntil){e.preventDefault();e.stopImmediatePropagation()}},true)
}
function prepareCover(){var st=s(),items=photoItems(),idx=photoIndex();if(!st||items.length<=1||idx<=0||st.editingStoryId)return;var chosen=items[idx];st.workMedia=[chosen].concat(items.slice(0,idx),items.slice(idx+1));st.newPhotoFiles=st.workMedia.filter(function(m){return m&&m.kind==='local'&&m.file}).map(function(m){return m.file});st.workPhotoIndex=0}
function currentYear(){return new Date().getFullYear()}
function yearOptions(){var out='';for(var y=currentYear()+2;y>=1900;y--)out+='<option value="'+y+'">'+y+'</option>';return out}
function setDateMode(next){dateMode=next==='approx'?'approx':'exact';if(!dateOverlay)return;var a=dateOverlay.querySelector('#taleraDateExactPanel'),b=dateOverlay.querySelector('#taleraDateApproxPanel');if(a)a.hidden=dateMode!=='exact';if(b)b.hidden=dateMode!=='approx';dateOverlay.querySelectorAll('.talera-date-tab').forEach(function(x){x.classList.toggle('active',x.dataset.mode===dateMode)})}
function closeDate(){if(dateOverlay){dateOverlay.remove();dateOverlay=null}}
function openDate(){
  if(dateOverlay)return;dateMode='exact';dateOverlay=document.createElement('div');dateOverlay.className='talera-date-backdrop';dateOverlay.setAttribute('role','dialog');dateOverlay.setAttribute('aria-modal','true');dateOverlay.innerHTML='<div class="talera-date-sheet"><h2>Wanneer speelde dit verhaal zich af?</h2><p>Deze datum bepaalt waar je verhaal op je tijdlijn komt.</p><div class="talera-date-tabs"><button type="button" class="talera-date-tab active" data-mode="exact">Exacte datum</button><button type="button" class="talera-date-tab" data-mode="approx">Ongeveer</button></div><div id="taleraDateExactPanel" class="talera-date-panel"><label for="taleraExactDate">Kies een datum</label><input id="taleraExactDate" type="date"></div><div id="taleraDateApproxPanel" class="talera-date-panel" hidden><label>Welke periode?</label><div class="talera-date-approx"><select id="taleraApproxPeriod"><option value="jaar">Alleen het jaar</option><option value="lente">Lente</option><option value="zomer" selected>Zomer</option><option value="herfst">Herfst</option><option value="winter">Winter</option></select><select id="taleraApproxYear">'+yearOptions()+'</select></div></div><div class="talera-date-actions"><button type="button" class="talera-date-cancel">Annuleren</button><button type="button" class="talera-date-confirm">Gebruik deze datum</button></div></div>';document.body.appendChild(dateOverlay);var yr=dateOverlay.querySelector('#taleraApproxYear');if(yr)yr.value=String(currentYear());dateOverlay.querySelectorAll('.talera-date-tab').forEach(function(x){x.onclick=function(){setDateMode(x.dataset.mode)}});dateOverlay.querySelector('.talera-date-cancel').onclick=closeDate;dateOverlay.addEventListener('click',function(e){if(e.target===dateOverlay)closeDate()});dateOverlay.querySelector('.talera-date-confirm').onclick=function(){var label='';if(dateMode==='exact'){var v=dateOverlay.querySelector('#taleraExactDate').value;if(v){var d=new Date(v+'T12:00:00');if(!isNaN(d.getTime()))label=d.toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'})}}else{var p=dateOverlay.querySelector('#taleraApproxPeriod').value||'jaar',y=dateOverlay.querySelector('#taleraApproxYear').value||'';if(y)label=p==='jaar'?y:(p+' '+y)}if(!label)return;var st=s();if(st)st.workDate=label;var el=document.getElementById('workDate');if(el){el.value=label;el.classList.remove('work-required-missing');el.dispatchEvent(new Event('input',{bubbles:true}))}closeDate()}
}
function clearValidation(){var x=document.querySelector('.talera-core-validation');if(x)x.remove()}
function showValidation(msg){clearValidation();var sheet=document.querySelector('.work-sheet'),tools=document.querySelector('.work-tools');if(!sheet)return;var x=document.createElement('div');x.className='talera-core-validation';x.textContent=msg;if(tools)sheet.insertBefore(x,tools);else sheet.appendChild(x)}
function validate(){var title=document.getElementById('workTitle'),date=document.getElementById('workDate'),mt=!title||!String(title.value||'').trim(),md=!date||!String(date.value||'').trim();if(title)title.classList.toggle('work-required-missing',mt);if(date)date.classList.toggle('work-required-missing',md);if(!mt&&!md){clearValidation();return true}showValidation(mt&&md?'Geef je verhaal eerst een titel en kies wanneer het speelde.':(mt?'Geef je verhaal eerst een titel.':'Kies eerst wanneer dit verhaal speelde.'));if(mt&&title)title.focus();else if(md)openDate();return false}
document.addEventListener('pointerdown',function(e){var el=e.target&&e.target.closest&&e.target.closest('#workDate');if(!el)return;e.preventDefault();e.stopPropagation();openDate()},true);
document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('#workFinish');if(!b)return;if(!validate()){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();return}prepareCover()},true);
document.addEventListener('input',function(e){if(e.target&&e.target.id==='workTitle'&&String(e.target.value||'').trim())e.target.classList.remove('work-required-missing')},true);
var root=document.getElementById('app')||document.documentElement;var observer=new MutationObserver(function(){decorate()});observer.observe(root,{childList:true,subtree:true});
resetFreshStory();decorate();
})();</scr`+`ipt>`;
