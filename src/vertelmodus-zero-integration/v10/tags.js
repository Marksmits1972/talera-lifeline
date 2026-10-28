function setupV20Tags(g,details){
 const CANONICAL=['Familie','Vrienden','Vakantie','Jeugd','Baby','Basisschool','Middelbare school','Werk','Liefde','Kinderen','Verjaardag','Reizen','Studie','Sport','Hobby','Feest','Bruiloft','Wonen','Verhuizen','Huisdieren','Natuur','Gezondheid','Grootouders','Bijzondere momenten','Mijlpalen'];
 const KEYS=['family','friends','holiday','childhood','baby','primarySchool','secondarySchool','work','love','children','birthday','travel','study','sport','hobby','party','wedding','home','moving','pets','nature','health','grandparents','specialMoments','milestones'];
 const keyOf=v=>{const i=CANONICAL.findIndex(c=>c.toLocaleLowerCase('nl')===String(v).toLocaleLowerCase('nl'));return i<0?null:'tag.name.'+KEYS[i]};
 const text=(key,fallback)=>window.TaleraI18n?.t(key)||fallback;
 const display=v=>{const key=keyOf(v);return key?text(key,v):v};
 const PREF='talera-kenmerken-voorkeuren-v1';
 const clean=a=>{const seen=new Set();return (Array.isArray(a)?a:[]).map(v=>String(v||'').trim().replace(/\s+/g,' ').slice(0,36)).filter(x=>{const id=x.toLocaleLowerCase('nl');if(!x||seen.has(id))return false;seen.add(id);return true})};
 const favorites=()=>{try{const s=localStorage.getItem(PREF);return clean(s===null?CANONICAL.slice(0,12):JSON.parse(s))}catch(e){return CANONICAL.slice(0,12)}};
 g.tags=clean(g.tags).slice(0,16);
 const box=document.createElement('div');box.className='talera-tags-v20';
 box.innerHTML='<button class="talera-tags-toggle" type="button" aria-expanded="false"></button><div class="talera-tags-selected" aria-live="polite"></div><div class="talera-tags-panel" hidden><div class="talera-tags-choices" role="group"></div><div class="talera-tags-confirm"><button type="button" class="talera-tag-apply"></button><button type="button" class="talera-tag-cancel"></button></div></div>';
 details.append(box);
 const toggle=box.querySelector('.talera-tags-toggle'),chips=box.querySelector('.talera-tags-selected'),panel=box.querySelector('.talera-tags-panel'),choices=box.querySelector('.talera-tags-choices'),apply=box.querySelector('.talera-tag-apply'),cancel=box.querySelector('.talera-tag-cancel');
 let pending=new Set(),openFavorites=[];
 const id=x=>x.toLocaleLowerCase('nl');
 const close=()=>{panel.hidden=true;toggle.setAttribute('aria-expanded','false');pending.clear()};
 function paintChips(){
  chips.replaceChildren();
  for(const tag of g.tags){
   const b=document.createElement('button');b.type='button';b.className='talera-tag-badge';b.textContent=display(tag)+' ×';b.setAttribute('aria-label',text('tag.remove','Verwijder kenmerk')+' '+display(tag));
   b.onclick=()=>{g.tags=g.tags.filter(x=>id(x)!==id(tag));saveDraft();paintChips()};chips.append(b);
  }
 }
 function paintChoices(){
  choices.replaceChildren();
  choices.setAttribute('aria-label',text('tag.selected','Mijn favoriete kenmerken'));
  if(!openFavorites.length){const p=document.createElement('p');p.textContent=text('tag.noFavorites','Kies eerst je favoriete kenmerken via Instellingen.');choices.append(p)}
  for(const tag of openFavorites){
   const b=document.createElement('button');b.className='talera-tag-choice';b.type='button';
   const chosen=pending.has(id(tag));b.setAttribute('aria-pressed',String(chosen));b.textContent=(chosen?'✓  ':'')+display(tag);
   b.onclick=()=>{if(pending.has(id(tag)))pending.delete(id(tag));else pending.add(id(tag));paintChoices()};
   choices.append(b);
  }
 }
 function paintLabels(){
  toggle.textContent='＋ '+text('tag.add','Kenmerk toevoegen');
  apply.textContent=text('common.add','Toevoegen');cancel.textContent=text('common.cancel','Annuleren');
  paintChips();if(!panel.hidden)paintChoices();
 }
 toggle.onclick=()=>{if(!panel.hidden){close();return}openFavorites=favorites();pending=new Set(openFavorites.filter(x=>g.tags.some(t=>id(x)===id(t))).map(id));panel.hidden=false;toggle.setAttribute('aria-expanded','true');paintChoices()};
 apply.onclick=()=>{
  const oldOther=g.tags.filter(x=>!openFavorites.some(f=>id(f)===id(x)));
  const selected=openFavorites.filter(x=>pending.has(id(x)));
  g.tags=clean([...oldOther,...selected]).slice(0,16);
  saveDraft();close();paintLabels();
 };
 cancel.onclick=close;
 box.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();close();toggle.focus()}});
 document.addEventListener('talera:languagechange',paintLabels);
 paintLabels();
}