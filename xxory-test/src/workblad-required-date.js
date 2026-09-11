export const WORKBLAD_REQUIRED_DATE_STYLE = String.raw`
.work-required-missing{outline:2px solid rgba(193,79,69,.55)!important;outline-offset:2px!important;border-radius:10px}
.talera-date-backdrop{position:fixed;inset:0;z-index:80;background:rgba(15,39,71,.20);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;padding:16px 12px max(16px,env(safe-area-inset-bottom))}
.talera-date-sheet{width:min(100%,520px);background:#fffdfa;border-radius:26px;padding:18px;box-shadow:0 22px 70px rgba(15,39,71,.24);color:#0F2747;display:grid;gap:14px}
.talera-date-sheet h2{margin:0;font-size:22px;line-height:1.08;letter-spacing:-.02em}
.talera-date-sheet p{margin:0;color:#5e6b79;font-size:14px;line-height:1.4}
.talera-date-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;background:rgba(220,234,246,.58);padding:4px;border-radius:14px}
.talera-date-tab{border:0;border-radius:11px;min-height:42px;background:transparent;color:#0F2747;font-weight:700}
.talera-date-tab.active{background:white;box-shadow:0 2px 9px rgba(15,39,71,.10)}
.talera-date-panel{display:grid;gap:10px}
.talera-date-panel[hidden]{display:none!important}
.talera-date-sheet label{font-size:12px;font-weight:750;color:#526071;letter-spacing:.02em}
.talera-date-sheet input,.talera-date-sheet select{width:100%;min-height:50px;border:1px solid rgba(15,39,71,.14);border-radius:14px;background:white;color:#0F2747;padding:0 13px;font-size:16px!important}
.talera-date-approx{display:grid;grid-template-columns:1.2fr .8fr;gap:8px}
.talera-date-actions{display:grid;grid-template-columns:auto 1fr;gap:8px;margin-top:2px}
.talera-date-cancel,.talera-date-confirm{border:0;border-radius:15px;min-height:50px;padding:0 18px;font-weight:750;font-size:15px}
.talera-date-cancel{background:rgba(220,234,246,.56);color:#0F2747}
.talera-date-confirm{background:#0F2747;color:#fff}
`;

export const WORKBLAD_REQUIRED_DATE_SCRIPT = String.raw`<script>(function(){
var overlay=null,mode='exact';
function getState(){try{return typeof state!=='undefined'?state:null}catch(e){return null}}
function syncField(){
  var el=document.getElementById('workDate');
  if(!el)return;
  el.placeholder='Wanneer speelde dit verhaal zich af?';
  el.readOnly=true;
  el.setAttribute('aria-haspopup','dialog');
  el.setAttribute('aria-label','Wanneer speelde dit verhaal zich af?');
}
function formatExact(value){
  var d=value?new Date(value+'T12:00:00'):null;
  if(!d||isNaN(d.getTime()))return '';
  return d.toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'});
}
function currentYear(){return new Date().getFullYear()}
function yearOptions(){
  var out='';for(var y=currentYear()+2;y>=1900;y--)out+='<option value="'+y+'">'+y+'</option>';return out;
}
function setMode(next){
  mode=next==='approx'?'approx':'exact';
  if(!overlay)return;
  var exact=overlay.querySelector('#taleraDateExactPanel'),approx=overlay.querySelector('#taleraDateApproxPanel');
  if(exact)exact.hidden=mode!=='exact';if(approx)approx.hidden=mode!=='approx';
  overlay.querySelectorAll('.talera-date-tab').forEach(function(b){b.classList.toggle('active',b.dataset.mode===mode)});
}
function closePicker(){if(overlay){overlay.remove();overlay=null}}
function openPicker(){
  if(overlay)return;
  syncField();
  overlay=document.createElement('div');overlay.className='talera-date-backdrop';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  overlay.innerHTML='<div class="talera-date-sheet"><h2>Wanneer speelde dit verhaal zich af?</h2><p>Deze datum bepaalt waar je herinnering op de tijdlijn komt.</p><div class="talera-date-tabs"><button type="button" class="talera-date-tab active" data-mode="exact">Exacte datum</button><button type="button" class="talera-date-tab" data-mode="approx">Ongeveer</button></div><div id="taleraDateExactPanel" class="talera-date-panel"><label for="taleraExactDate">Kies een datum</label><input id="taleraExactDate" type="date"></div><div id="taleraDateApproxPanel" class="talera-date-panel" hidden><label>Welke periode?</label><div class="talera-date-approx"><select id="taleraApproxPeriod"><option value="jaar">Alleen het jaar</option><option value="lente">Lente</option><option value="zomer" selected>Zomer</option><option value="herfst">Herfst</option><option value="winter">Winter</option></select><select id="taleraApproxYear">'+yearOptions()+'</select></div></div><div class="talera-date-actions"><button type="button" class="talera-date-cancel">Annuleren</button><button type="button" class="talera-date-confirm">Gebruik deze datum</button></div></div>';
  document.body.appendChild(overlay);
  var year=overlay.querySelector('#taleraApproxYear');if(year)year.value=String(currentYear());
  overlay.querySelectorAll('.talera-date-tab').forEach(function(b){b.onclick=function(){setMode(b.dataset.mode)}});
  overlay.querySelector('.talera-date-cancel').onclick=closePicker;
  overlay.addEventListener('click',function(e){if(e.target===overlay)closePicker()});
  overlay.querySelector('.talera-date-confirm').onclick=function(){
    var label='';
    if(mode==='exact'){
      var v=overlay.querySelector('#taleraExactDate').value;label=formatExact(v);
      if(!label){overlay.querySelector('#taleraExactDate').focus();return}
    }else{
      var p=overlay.querySelector('#taleraApproxPeriod').value||'jaar';var y=overlay.querySelector('#taleraApproxYear').value||'';
      if(!y)return;label=p==='jaar'?y:(p+' '+y);
    }
    var s=getState();if(s)s.workDate=label;
    var el=document.getElementById('workDate');if(el){el.value=label;el.classList.remove('work-required-missing');el.dispatchEvent(new Event('input',{bubbles:true}))}
    closePicker();
  };
}
function validateRequired(){
  var title=document.getElementById('workTitle'),date=document.getElementById('workDate');
  if(!title||!date)return true;
  var missingTitle=!String(title.value||'').trim(),missingDate=!String(date.value||'').trim();
  title.classList.toggle('work-required-missing',missingTitle);date.classList.toggle('work-required-missing',missingDate);
  if(!missingTitle&&!missingDate)return true;
  var s=getState();if(s)s.workError=missingTitle&&missingDate?'Vul eerst een titel in en kies wanneer dit verhaal speelde.':(missingTitle?'Vul eerst een titel in.':'Kies eerst wanneer dit verhaal speelde.');
  if(typeof renderWorkblad==='function')renderWorkblad();
  setTimeout(function(){syncField();var t=document.getElementById('workTitle'),d=document.getElementById('workDate');if(missingTitle&&t){t.classList.add('work-required-missing');t.focus()}else if(missingDate&&d){d.classList.add('work-required-missing');openPicker()}},30);
  return false;
}
document.addEventListener('pointerdown',function(e){var el=e.target&&e.target.closest&&e.target.closest('#workDate');if(!el)return;e.preventDefault();e.stopPropagation();openPicker()},true);
document.addEventListener('click',function(e){var el=e.target&&e.target.closest&&e.target.closest('#workFinish');if(!el)return;if(!validateRequired()){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}},true);
document.addEventListener('input',function(e){if(e.target&&e.target.id==='workTitle'&&String(e.target.value||'').trim())e.target.classList.remove('work-required-missing')},true);
var observer=new MutationObserver(syncField);observer.observe(document.documentElement,{childList:true,subtree:true});syncField();
})();</scr`+`ipt>`;
