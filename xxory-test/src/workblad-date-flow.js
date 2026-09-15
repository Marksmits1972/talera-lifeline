export const WORKBLAD_DATE_FLOW_STYLE = String.raw`
.work-title{margin-bottom:12px!important}
.work-date-row{margin-top:2px!important;margin-bottom:18px!important}
.talera-date-choice-backdrop{position:fixed;inset:0;z-index:190;display:flex;align-items:flex-end;justify-content:center;padding:12px 10px max(12px,env(safe-area-inset-bottom));background:rgba(15,39,71,.22);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
.talera-date-choice-sheet{width:min(100%,560px);border-radius:26px;background:#fffdfa;color:#0F2747;box-shadow:0 24px 70px rgba(15,39,71,.24);padding:18px}
.talera-date-choice-sheet h2{margin:0 0 6px;font:780 20px/1.15 -apple-system,BlinkMacSystemFont,system-ui,sans-serif}
.talera-date-choice-sheet p{margin:0 0 16px;color:#647181;font:520 13px/1.4 -apple-system,BlinkMacSystemFont,system-ui,sans-serif}
.talera-date-choice-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.talera-date-choice,.talera-date-cancel2,.talera-date-confirm2{position:relative;min-height:54px;border:0;border-radius:17px;padding:0 14px;font:760 14px/1.1 -apple-system,BlinkMacSystemFont,system-ui,sans-serif}
.talera-date-choice{display:flex;align-items:center;justify-content:center;background:#DCEAF6;color:#0F2747;overflow:hidden}
.talera-date-choice.exact input{position:absolute;inset:0;width:100%;height:100%;opacity:.001;cursor:pointer}
.talera-date-choice.approx{background:#F7F4EF;box-shadow:inset 0 0 0 1px rgba(15,39,71,.10)}
.talera-date-approx-panel2{display:grid;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(15,39,71,.08)}
.talera-date-approx-row2{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.talera-date-approx-row2 select{width:100%;min-height:50px;border:1px solid rgba(15,39,71,.12);border-radius:15px;background:white;color:#0F2747;padding:0 10px;font:650 14px system-ui}
.talera-date-actions2{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.talera-date-cancel2{background:#F7F4EF;color:#526071}
.talera-date-confirm2{background:#0F2747;color:#fff}
.talera-date-error2{min-height:18px;color:#923d35;font:650 12px/1.35 system-ui}
@media(max-width:390px){.talera-date-choice-grid,.talera-date-actions2{grid-template-columns:1fr}.talera-date-approx-row2{grid-template-columns:1fr 1fr}}
`;

export const WORKBLAD_DATE_FLOW_SCRIPT = String.raw`<script id="talera-workblad-date-flow">
(()=>{
  const ROOT_ID='talera-date-choice-root';
  function pad(n){return String(n).padStart(2,'0')}
  function todayIso(){const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
  function currentYear(){return new Date().getFullYear()}
  function formatExact(value){const d=value?new Date(value+'T12:00:00'):null;if(!d||Number.isNaN(d.getTime()))return '';return d.toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'})}
  function yearOptions(){let out='';for(let y=currentYear();y>=1900;y--)out+='<option value="'+y+'">'+y+'</option>';return out}
  function close(){document.getElementById(ROOT_ID)?.remove();document.querySelector('.talera-date-backdrop')?.remove()}
  function persist(label){
    if(typeof window.__taleraWorkbladV9SetDate==='function')window.__taleraWorkbladV9SetDate(label);
    else{const field=document.getElementById('workDate');if(field){field.value=label;field.classList.remove('work-required-missing')}}
  }
  function open(){
    close();
    const root=document.createElement('div');root.id=ROOT_ID;root.className='talera-date-choice-backdrop';root.innerHTML='<section class="talera-date-choice-sheet" role="dialog" aria-modal="true"><h2>Wanneer speelde dit verhaal zich af?</h2><p>Kies exact als je de datum weet, of ongeveer als je alleen de periode weet.</p><div class="talera-date-choice-grid"><label class="talera-date-choice exact"><span>Exacte datum</span><input id="taleraDirectExactDate" type="date" max="'+todayIso()+'" aria-label="Exacte datum"></label><button type="button" class="talera-date-choice approx">Ongeveer</button></div><div class="talera-date-approx-panel2" hidden><div class="talera-date-approx-row2"><select id="taleraApproxPeriod2"><option value="jaar">Alleen het jaar</option><option value="lente">Lente</option><option value="zomer" selected>Zomer</option><option value="herfst">Herfst</option><option value="winter">Winter</option></select><select id="taleraApproxYear2">'+yearOptions()+'</select></div><div class="talera-date-error2"></div><div class="talera-date-actions2"><button type="button" class="talera-date-cancel2">Annuleren</button><button type="button" class="talera-date-confirm2">Gebruik deze periode</button></div></div></section>';
    document.body.appendChild(root);
    const exact=root.querySelector('#taleraDirectExactDate');
    exact.addEventListener('change',()=>{const value=String(exact.value||'');if(!value)return;if(value>todayIso()){exact.value='';root.querySelector('.talera-date-error2').textContent='Een herinnering kan niet in de toekomst worden geplaatst.';return}const label=formatExact(value);if(label){persist(label);close()}});
    root.querySelector('.approx').addEventListener('click',()=>{root.querySelector('.talera-date-choice-grid').hidden=true;root.querySelector('.talera-date-approx-panel2').hidden=false});
    root.querySelector('.talera-date-cancel2').addEventListener('click',close);
    root.querySelector('.talera-date-confirm2').addEventListener('click',()=>{const p=root.querySelector('#taleraApproxPeriod2').value||'jaar';const y=Number(root.querySelector('#taleraApproxYear2').value||0);if(!y||y>currentYear()){root.querySelector('.talera-date-error2').textContent='Kies vandaag of een periode in het verleden.';return}persist(p==='jaar'?String(y):(p+' '+y));close()});
    root.addEventListener('click',e=>{if(e.target===root)close()});
  }
  document.addEventListener('click',e=>{const field=e.target&&e.target.closest?e.target.closest('#workDate'):null;if(!field)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();open()},true);
})();
</script>`;
