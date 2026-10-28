
  const TAG_DEFAULTS=["Familie","Vrienden","Vakantie","Jeugd","Baby","Basisschool","Middelbare school","Werk","Liefde","Kinderen","Verjaardag","Reizen","Studie","Sport","Hobby","Feest","Bruiloft","Wonen","Verhuizen","Huisdieren","Natuur","Gezondheid","Grootouders","Bijzondere momenten","Mijlpalen"],TAG_START=["Familie","Vrienden","Vakantie","Jeugd","Baby","Basisschool","Middelbare school","Werk","Liefde","Kinderen","Verjaardag","Reizen"];
  const TAG_PREF_KEY='talera-kenmerken-voorkeuren-v1',TAG_CATALOG_KEY='talera-kenmerken-catalog-v1';
  const tidyTag=value=>String(value||'').trim().replace(/s+/g,' ').slice(0,36);
  function uniqueTags(arr){const seen=new Set();return (Array.isArray(arr)?arr:[]).map(tidyTag).filter(v=>{const k=v.toLocaleLowerCase('nl-NL');if(!v||seen.has(k))return false;seen.add(k);return true}).slice(0,120)}
  function tagRead(key,fallback=[]){try{const raw=localStorage.getItem(key);return raw===null?fallback:uniqueTags(JSON.parse(raw))}catch(e){return fallback}}
  function tagWrite(key,arr){try{localStorage.setItem(key,JSON.stringify(uniqueTags(arr)));return true}catch(e){showToast('Kon voorkeur niet bewaren op dit toestel.');return false}}
  function renderTagPreferences(){
    const selected=new Set(tagRead(TAG_PREF_KEY,TAG_START).map(x=>x.toLocaleLowerCase('nl-NL')));
    const all=uniqueTags([...TAG_DEFAULTS,...tagRead(TAG_CATALOG_KEY)]);
    return title('Mijn kenmerken','Vink de kenmerken aan die je standaard wilt zien wanneer je een herinnering bewerkt.')+
     '<p class="talera-share-section-label">Mijn favoriete kenmerken <span id="talera-tag-pref-count">'+selected.size+'</span> geselecteerd</p>'+
     '<div class="talera-tag-pref-list">'+all.map((tag,i)=>'<label class="talera-tag-pref-row"><input type="checkbox" data-tag-pref="'+escapeHtml(tag)+'" '+(selected.has(tag.toLocaleLowerCase('nl-NL'))?'checked':'')+'><span>'+escapeHtml(tag)+'</span></label>').join('')+'</div>'+
     '<p class="talera-share-section-label">Zelf een kenmerk toevoegen</p>'+
     '<div class="talera-tag-pref-add"><input id="talera-tag-pref-new" aria-label="Nieuw eigen kenmerk" type="text" maxlength="36" placeholder="Bijvoorbeeld: Mijn mooiste reis"><button type="button" data-action="add-custom-tag">Toevoegen</button></div>'+
     '<p class="talera-tag-pref-help">Bestaande herinneringen behouden hun kenmerken, ook als je ze hier uitvinkt.</p>';
  }
