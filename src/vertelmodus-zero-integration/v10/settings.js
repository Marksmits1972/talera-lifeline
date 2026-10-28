function tagNameV10(value){
 const ids=['family','friends','holiday','childhood','baby','primarySchool','secondarySchool','work','love','children','birthday','travel','study','sport','hobby','party','wedding','home','moving','pets','nature','health','grandparents','specialMoments','milestones'];
 const i=TAG_DEFAULTS.findIndex(t=>t.toLocaleLowerCase('nl')===String(value).toLocaleLowerCase('nl'));
 return i<0?value:(window.TaleraI18n?.t('tag.name.'+ids[i])||value);
}
const tagT=key=>window.TaleraI18n?.t(key)||key;
function renderTagPreferences(){
 const selected=new Set(tagRead(TAG_PREF_KEY,TAG_START).map(x=>x.toLocaleLowerCase('nl')));
 const all=uniqueTags([...TAG_DEFAULTS,...tagRead(TAG_CATALOG_KEY)]);
 return title(tagT('tag.preferencesTitle'),tagT('tag.preferencesHelp'))+
 '<p class="talera-share-section-label">'+tagT('tag.favoritesHeading')+' <span id="talera-tag-pref-count">'+selected.size+'</span> '+tagT('tag.selectedCount')+'</p>'+
 '<div class="talera-tag-pref-list">'+all.map(tag=>'<label class="talera-tag-pref-row"><input type="checkbox" data-tag-pref="'+escapeHtml(tag)+'" '+(selected.has(tag.toLocaleLowerCase('nl'))?'checked':'')+'><span>'+escapeHtml(tagNameV10(tag))+'</span></label>').join('')+'</div>'+
 '<p class="talera-share-section-label">'+tagT('tag.makeOwn')+'</p>'+
 '<div class="talera-tag-pref-add"><input id="talera-tag-pref-new" aria-label="'+escapeHtml(tagT('tag.ownLabel'))+'" type="text" maxlength="36" placeholder="'+escapeHtml(tagT('tag.ownExample'))+'"><button type="button" data-action="add-custom-tag">'+tagT('common.add')+'</button></div>'+
 '<p class="talera-tag-pref-help">'+tagT('tag.keepOld')+'</p>';
}