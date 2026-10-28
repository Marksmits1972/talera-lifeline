
function setupV20Tags(g,details){
 const DEFAULT=["Familie","Vrienden","Vakantie","Jeugd","Baby","Basisschool","Middelbare school","Werk","Liefde","Kinderen","Verjaardag","Reizen","Studie","Sport","Hobby","Feest","Bruiloft","Wonen","Verhuizen","Huisdieren","Natuur","Gezondheid","Grootouders","Bijzondere momenten","Mijlpalen"];
 const FAVORITES=["Familie","Vrienden","Vakantie","Jeugd","Baby","Basisschool","Middelbare school","Werk","Liefde","Kinderen","Verjaardag","Reizen"];
 const CATALOG='talera-kenmerken-catalog-v1',PREF='talera-kenmerken-voorkeuren-v1';
 const tidy=v=>String(v||'').trim().replace(/s+/g,' ').slice(0,36);
 const distinct=a=>{const used=new Set();return (Array.isArray(a)?a:[]).map(tidy).filter(v=>{const id=v.toLocaleLowerCase('nl-NL');if(!v||used.has(id))return false;used.add(id);return true}).slice(0,120)};
 const read=(key,def)=>{try{const text=localStorage.getItem(key);return text===null?def:distinct(JSON.parse(text))}catch(e){return def}};
 const write=(key,values)=>{try{localStorage.setItem(key,JSON.stringify(distinct(values)))}catch(e){console.warn('Kenmerken niet lokaal bewaard',e)}};
 const prefs=()=>read(PREF,FAVORITES);
 const stored=()=>read(CATALOG,[]);
 g.tags=distinct(g.tags).slice(0,16);
 const box=document.createElement('div');
 box.className='talera-tags-v20';
 box.innerHTML='<button type="button" class="talera-tags-toggle" aria-expanded="false">＋ Kenmerk toevoegen</button><div class="talera-tags-selected" aria-live="polite"></div><div class="talera-tags-panel" hidden><div class="talera-tags-choices" role="group" aria-label="Mijn favoriete kenmerken"></div><div class="talera-tags-new"><input type="text" maxlength="36" aria-label="Zelf kenmerk toevoegen" placeholder="Zelf kenmerk toevoegen"><button type="button">Toevoegen</button></div></div>';
 details.appendChild(box);
 const toggle=box.querySelector('.talera-tags-toggle'),selected=box.querySelector('.talera-tags-selected'),panel=box.querySelector('.talera-tags-panel'),choices=box.querySelector('.talera-tags-choices'),input=box.querySelector('input'),add=box.querySelector('.talera-tags-new button');
 const close=()=>{panel.hidden=true;toggle.setAttribute('aria-expanded','false')};
 function paint(){
  selected.replaceChildren();
  for(const tag of g.tags){
   const b=document.createElement('button');b.type='button';b.className='talera-tag-badge';b.setAttribute('aria-label','Verwijder kenmerk '+tag);b.textContent=tag+' ×';
   b.onclick=()=>{g.tags=g.tags.filter(t=>t.toLowerCase()!==tag.toLowerCase());saveDraft();paint()};selected.append(b);
  }
  choices.replaceChildren();
  const activeFavorites=prefs();
  if(!activeFavorites.length){const p=document.createElement('p');p.textContent='Kies je favoriete kenmerken via Meer → Instellingen → Mijn kenmerken.';choices.append(p)}
  for(const tag of activeFavorites){
   const b=document.createElement('button');b.type='button';b.className='talera-tag-choice';
   const active=g.tags.some(x=>x.toLocaleLowerCase('nl-NL')===tag.toLocaleLowerCase('nl-NL'));
   b.setAttribute('aria-pressed',String(active));b.textContent=(active?'✓  ':'')+tag;
   b.onclick=()=>{if(active)g.tags=g.tags.filter(x=>x.toLocaleLowerCase('nl-NL')!==tag.toLocaleLowerCase('nl-NL'));else if(g.tags.length<16)g.tags=distinct([...g.tags,tag]);saveDraft();paint()};
   choices.append(b);
  }
 }
 function addNew(){
  const value=tidy(input.value);if(!value)return;
  const known=distinct([...DEFAULT,...stored(),...groups.flatMap(row=>row.tags||[])]);
  const found=known.find(x=>x.toLocaleLowerCase('nl-NL')===value.toLocaleLowerCase('nl-NL'));
  const label=found||value;
  if(g.tags.length>=16&&!g.tags.some(t=>t.toLowerCase()===label.toLowerCase()))return;
  g.tags=distinct([...g.tags,label]);write(CATALOG,[...stored(),label]);write(PREF,[...prefs(),label]);
  input.value='';saveDraft();paint();close();
 }
 toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)paint()};
 add.onclick=addNew;input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addNew()}else if(e.key==='Escape'){close();toggle.focus()}});
 paint();
}