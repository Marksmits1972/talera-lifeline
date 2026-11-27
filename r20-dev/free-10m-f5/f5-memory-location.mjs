// Keep the legacy memory-level value readable, but never use it as a photo's
// capture location. The existing account-local item is the unit of editing.
export function normalizeManualLocation(value,codes){
 if(value===null)return null;
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='city,countryCode'||typeof value.countryCode!=='string'||typeof value.city!=='string')throw Error('TALERA_INVALID_MANUAL_LOCATION');
 const countryCode=value.countryCode,city=value.city.trim();
 if(countryCode&&!codes.includes(countryCode)||city.length>120||/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(city))throw Error('TALERA_INVALID_MANUAL_LOCATION');
 return countryCode||city?{countryCode,city}:null;
}
export function manualLocationPatch(existing,input,codes){
 if(Object.hasOwn(input,'manualLocation'))return {manualLocation:normalizeManualLocation(input.manualLocation,codes)};
 return existing&&Object.hasOwn(existing,'manualLocation')?{manualLocation:existing.manualLocation}:{};
}
export function confirmedPhotoLocation(place,codes){
 if(!place||!['iptc-location-created','geonames-locality-v2'].includes(place.source)||typeof place.country!=='string')return null;
 try{
  const location=normalizeManualLocation({countryCode:place.countryCode,city:place.city},codes);
  if(!location?.countryCode||!location.city||new Intl.DisplayNames(['nl'],{type:'region',fallback:'none'}).of(location.countryCode)!==place.country)return null;
  return {...location,country:place.country,source:place.source};
 }catch(_){return null}
}
export function normalizePhotoLocation(value,codes){
 if(value===null)return null;
 if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).sort().join(',')!=='city,countryCode,mode'||!['fill','correct'].includes(value.mode))throw Error('TALERA_INVALID_PHOTO_LOCATION');
 const normalized=normalizeManualLocation({countryCode:value.countryCode,city:value.city},codes);
 if(!normalized)throw Error('TALERA_INVALID_PHOTO_LOCATION');
 return {...normalized,mode:value.mode};
}
export function selectDisplayedLocation(story,item,codes){
 const automatic=confirmedPhotoLocation(item?.capturePlace,codes);
 let manual=null;try{manual=normalizePhotoLocation(item?.manualPhotoLocation??null,codes)}catch(_){}
 if(manual&&(manual.mode==='correct'||!automatic))return {countryCode:manual.countryCode,city:manual.city,source:'manual-photo'};
 return automatic;
}
// Called only for the existing save's ordered uploads, after original metadata
// was retained/read. Explicit single correction is distinct from bulk fill.
export function applyPhotoLocationInputs(items,inputs,codes){
 if(inputs===undefined)return;
 if(!Array.isArray(inputs)||inputs.length!==items.length)throw Error('TALERA_INVALID_PHOTO_LOCATION_INPUTS');
 for(let i=0;i<items.length;i++){
  const item=items[i],input=inputs[i];
  if(input==null)continue;
  if(item.kind!=='photo'||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['automatic','manual'].includes(k)))throw Error('TALERA_INVALID_PHOTO_LOCATION_INPUT');
  if(!confirmedPhotoLocation(item.capturePlace,codes)&&input.automatic){
   const result=input.automatic,place=confirmedPhotoLocation(result.place,codes);
   if(result.state==='known'&&place){item.capturePlace=place;delete item.capturePlaceChecked}
   else if(result.state==='unknown'&&Object.keys(result).length===1)item.capturePlaceChecked='v3';
  }
  if(Object.hasOwn(input,'manual')){
   const manual=normalizePhotoLocation(input.manual,codes);
   if(!manual)delete item.manualPhotoLocation;
   else if(manual.mode==='correct'||!confirmedPhotoLocation(item.capturePlace,codes))item.manualPhotoLocation=manual;
  }
 }
}
export function localPhotoState(item,codes){
 if(confirmedPhotoLocation(item?.capturePlace,codes))return {state:'known',place:confirmedPhotoLocation(item.capturePlace,codes)};
 if(item?.capturePlaceChecked==='v3')return {state:'unknown'};
 return {state:'pending'};
}
export function draftPhotoChanges(g){
 const filtered=Object.fromEntries((g.media||[]).filter(id=>Object.hasOwn(g.photoLocations||{},id)).map(id=>[id,g.photoLocations[id]]));
 const automatic=Object.fromEntries((g.media||[]).map(id=>[id,g.taleraLocationResults?.get(id)??g.photoLocationAutomatic?.[id]]).filter(([,v])=>v&&['known','unknown'].includes(v.state)));
 return {...(Object.keys(filtered).length?{photoLocations:filtered}:{}),...(Object.keys(automatic).length?{photoLocationAutomatic:automatic}:{})};
}
export function moveDraftPhotoLocation(source,target,id){
 if(source===target)return;
 for(const key of ['photoLocations','photoLocationAutomatic']){
  if(Object.hasOwn(source[key]||{},id)){target[key]={...(target[key]||{}),[id]:source[key][id]};delete source[key][id]}
 }
 if(source.taleraLocationResults?.has(id)){
  if(!target.taleraLocationResults)Object.defineProperty(target,'taleraLocationResults',{configurable:true,value:new Map(Object.entries(target.photoLocationAutomatic||{}))});
  target.taleraLocationResults.set(id,source.taleraLocationResults.get(id));source.taleraLocationResults.delete(id);
 }
}
export function draftPhotoInputs(g,assets){
 return [...g.media,...(g.voice?[g.voice]:[])].map(id=>{
  const file=assets(id);if(!file||!String(file.type||'').startsWith('image/'))return null;
  const entry={};const automatic=g.taleraLocationResults?.get(id)??g.photoLocationAutomatic?.[id];
  if(automatic&&['known','unknown'].includes(automatic.state))entry.automatic=automatic;
  if(Object.hasOwn(g.photoLocations||{},id))entry.manual=g.photoLocations[id];
  return Object.keys(entry).length?entry:null;
 });
}
export function localizedCountryRows(codes,locale){
 const names=new Intl.DisplayNames([locale],{type:'region',fallback:'none'});
 return codes.map(code=>({code,name:names.of(code)||code})).sort((a,b)=>a.name.localeCompare(b.name,locale,{sensitivity:'base'}));
}
export function filterCountryRows(rows,query,locale){
 const plain=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase(locale).trim();
 const q=plain(query);return rows.filter(row=>!q||plain(row.name).includes(q)||plain(row.code)===q);
}
// Mounted inside the existing editor whether or not its optional panel is open.
// All selections are draft IDs, not array positions; reordering cannot retarget.
export function mountMemoryLocationEditor({g,anchor,saveDraft,readStory,getAsset,preview,inspect,flagPositions,codes}){
 if(!anchor||anchor.parentElement?.querySelector(':scope > .talera-memory-location'))return;
 const doc=anchor.ownerDocument,win=doc.defaultView||window;
 const locale=()=>win.TaleraI18n?.locale||doc.documentElement.lang||'en',t=(key,params)=>win.TaleraI18n.t('core.editor.location.'+key,params);
 const photoIds=()=>g.media.filter(id=>String(getAsset(id)?.type||'').startsWith('image/'));
 if(!photoIds().length)return;
 if(!g.taleraLocationResults)Object.defineProperty(g,'taleraLocationResults',{configurable:true,value:new Map(Object.entries(g.photoLocationAutomatic||{}))});
 const result=g.taleraLocationResults,existing=new Map();let disposed=false,running=false,controller=null,timer=null,serial=0;
 let selected=new Set(),seenUnknown=new Set(),single=null,entry={countryCode:'',city:''};
 const box=doc.createElement('section');box.className='talera-memory-location';box.dataset.taleraExplicitLanguage='';
 const node=(tag,cls,parent)=>{const x=doc.createElement(tag);if(cls)x.className=cls;if(parent)parent.append(x);return x};
 const button=(cls,parent)=>{const x=node('button',cls,parent);x.type='button';return x};
 const toggle=button('talera-location-toggle',box);
 const pin=node('span','talera-location-pin',toggle);pin.setAttribute('aria-hidden','true');pin.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
 const title=node('span','talera-location-title',toggle),chevron=node('span','talera-location-chevron',toggle);chevron.setAttribute('aria-hidden','true');
 const summary=node('p','talera-location-summary',box);summary.setAttribute('aria-live','polite');
 const panel=node('div','talera-location-panel',box);panel.id='talera-memory-location-fields';panel.hidden=true;toggle.setAttribute('aria-controls',panel.id);toggle.setAttribute('aria-expanded','false');
 const legacy=node('p','talera-location-status',panel);
 const recognizedHeading=node('h3','talera-location-label',panel),recognized=node('div','talera-location-grid',panel);
 const unknownHeading=node('h3','talera-location-label',panel),unknown=node('div','talera-location-grid',panel);
 const pendingHeading=node('h3','talera-location-label',panel),pending=node('div','talera-location-grid',panel);
 const form=node('div','talera-location-form',panel);
 const modeLabel=node('p','talera-location-status',form),reset=button('talera-location-clear',form);
 const countryLabel=node('label','talera-location-label',form);countryLabel.htmlFor='talera-memory-country';
 const country=button('talera-location-country',form);country.id=countryLabel.htmlFor;country.setAttribute('aria-haspopup','dialog');
 const countryFlag=node('span','talera-location-flag',country);countryFlag.setAttribute('aria-hidden','true');
 const countryName=node('span','talera-location-country-name',country),countryArrow=node('span','talera-location-chevron',country);countryArrow.setAttribute('aria-hidden','true');
 const cityLabel=node('label','talera-location-label',form);cityLabel.htmlFor='talera-memory-city';
 const city=node('input','talera-location-city',form);city.id=cityLabel.htmlFor;city.type='text';city.maxLength=120;city.autocomplete='off';city.setAttribute('autocapitalize','words');
 const apply=button('talera-location-apply',form),clear=button('talera-location-clear',form);
 const dialog=node('dialog','talera-location-dialog',box);dialog.setAttribute('aria-labelledby','talera-location-dialog-title');
 node('div','talera-location-grip',dialog);
 const header=node('div','talera-location-dialog-header',dialog),heading=node('h2','',header);heading.id='talera-location-dialog-title';
 const close=button('talera-location-close',header);close.textContent='×';
 const search=node('input','talera-location-search',dialog);search.type='search';search.autocomplete='off';
 const choices=node('div','talera-location-choices',dialog);
 const flag=(el,code)=>{const xy=flagPositions[code];el.hidden=!xy;if(xy)el.style.backgroundPosition=xy[0]+'px '+xy[1]+'px'};
 const countryText=code=>code?new Intl.DisplayNames([locale()],{type:'region',fallback:'none'}).of(code)||code:'';
 const state=id=>{const catalog=localPhotoState(existing.get(id),codes);return catalog.state!=='pending'?catalog:result.get(id)||catalog};
 const manual=id=>{try{return normalizePhotoLocation(Object.hasOwn(g.photoLocations||{},id)?g.photoLocations[id]:existing.get(id)?.manualPhotoLocation??null,codes)}catch(_){return null}};
 const display=id=>selectDisplayedLocation(null,{capturePlace:state(id).place,manualPhotoLocation:manual(id)},codes);
 const unknownIds=()=>photoIds().filter(id=>state(id).state==='unknown'&&!display(id));
 function chooseSingle(id){
  single=id;const value=display(id);entry=value?{countryCode:value.countryCode,city:value.city}:{countryCode:'',city:''};paint();
 }
 function setManual(id,value){g.photoLocations={...(g.photoLocations||{}),[id]:value}}
 function fillEntry(){
  countryLabel.textContent=t('countryLabel');cityLabel.textContent=t('cityLabel');
  countryName.textContent=countryText(entry.countryCode)||t('countryPlaceholder');flag(countryFlag,entry.countryCode);
  city.placeholder=t('cityPlaceholder');if(doc.activeElement!==city)city.value=entry.city;
  const count=single?1:[...selected].filter(id=>unknownIds().includes(id)).length;
  apply.textContent=single?t('applySingle'):t(count===1?'applyOne':'applyMany',{count});
  apply.disabled=!count||!entry.countryCode&&!entry.city.trim();
 }
 function tile(id,index,parent,status){
  const card=node('div','talera-location-tile',parent);card.dataset.locationMediaId=id;
  const image=node('img','talera-location-thumb',card);image.alt='';image.src=preview(id);
  const value=display(id);const label=node('p','talera-location-tile-label',card);
  if(value){const f=node('span','talera-location-flag',label);flag(f,value.countryCode);node('span','',label).textContent=[countryText(value.countryCode),value.city].filter(Boolean).join(' · ')}
  else label.textContent=t(status==='pending'?'photoPending':'photoUnknown',{number:index+1});
  if(status==='unknown'&&!value){
   const pick=node('label','talera-location-check',card),check=node('input','',pick);check.type='checkbox';check.checked=selected.has(id);
   node('span','',pick).textContent=t('selectPhoto',{number:index+1});
   check.onchange=()=>{single=null;if(check.checked)selected.add(id);else selected.delete(id);fillEntry();paint()};
  }else if(value){
   const info=node('p','talera-location-tile-status',card);info.textContent=t(value.source==='manual-photo'?'photoManualStatus':'photoAutoStatus');
   const edit=button('talera-location-edit',card);edit.textContent=t('editPhoto',{number:index+1});edit.onclick=()=>chooseSingle(id);
  }
 }
 function paint(){
  if(disposed||!box.isConnected)return;
  const ids=photoIds(),unknownNow=new Set(unknownIds());
  for(const id of unknownNow)if(!seenUnknown.has(id)){seenUnknown.add(id);selected.add(id)}
  for(const id of selected)if(!unknownNow.has(id))selected.delete(id);
  if(single&&!ids.includes(single))single=null;
  const automatic=ids.filter(id=>state(id).state==='known').length,complete=ids.filter(id=>state(id).state!=='pending').length;
  title.textContent=t('heading');
  summary.textContent=complete<ids.length?t('progress',{done:complete,total:ids.length}):t('recognizedSummary',{count:automatic,total:ids.length});
  legacy.hidden=true;
  try{const old=normalizeManualLocation(g.manualLocation??null,codes);if(old){legacy.hidden=false;legacy.textContent=t('legacyNotice',{location:[countryText(old.countryCode),old.city].filter(Boolean).join(' · ')})}}catch(_){}
  recognizedHeading.textContent=t('recognizedHeading');unknownHeading.textContent=t('unknownHeading');pendingHeading.textContent=t('pendingHeading');
  recognized.replaceChildren();unknown.replaceChildren();pending.replaceChildren();
  ids.forEach((id,i)=>{const value=display(id),s=state(id).state;tile(id,i,value?recognized:s==='unknown'?unknown:pending,s)});
  recognizedHeading.hidden=recognized.hidden=!recognized.childElementCount;unknownHeading.hidden=unknown.hidden=!unknown.childElementCount;pendingHeading.hidden=pending.hidden=!pending.childElementCount;
  form.hidden=!single&&!unknownNow.size;
  modeLabel.textContent=single?t('editingPhoto',{number:ids.indexOf(single)+1}):t('bulkHint');
  reset.hidden=!single;reset.textContent=t('backToBulk');
  clear.hidden=!single||!manual(single);clear.textContent=t('clearManual');
  fillEntry();heading.textContent=t('pickerHeading');close.setAttribute('aria-label',t('pickerClose'));search.placeholder=t('pickerSearch');search.setAttribute('aria-label',t('pickerSearchAria'));
  if(dialog.open)renderCountries();
 }
 function closePicker(){if(dialog.open)dialog.close();country.focus()}
 function renderCountries(){
  const rows=filterCountryRows(localizedCountryRows(codes,locale()),search.value,locale());choices.replaceChildren();
  const add=(code,name)=>{
   const b=button('talera-location-choice',choices),f=node('span','talera-location-flag',b);flag(f,code);node('span','',b).textContent=name;b.setAttribute('aria-pressed',String(entry.countryCode===code));
   b.onclick=()=>{if(entry.countryCode&&code&&entry.countryCode!==code)entry.city='';entry.countryCode=code;closePicker();fillEntry()};
  };
  if(!search.value.trim())add('',t('noCountry'));for(const row of rows)add(row.code,row.name);if(!rows.length)node('p','talera-location-no-results',choices).textContent=t('noResults');
 }
 async function refreshExisting(){
  const own=++serial;if(!g.existing)return;
  let row;try{row=await readStory(g.existing)}catch(_){return}
  if(disposed||own!==serial||row?.id!==g.existing)return;
  const canonical=g.taleraSavedReceipt?.canonicalByDraft||g.canonicalByDraft||{};
  existing.clear();for(const id of photoIds()){const key=canonical[id];const item=row.items?.find(x=>x.key===key&&x.kind==='photo');if(item)existing.set(id,item)}
  paint();
 }
 async function scan(){
  if(running||disposed||doc.hidden||g.taleraLocationPublishing)return;
  running=true;controller=new AbortController();const signal=controller.signal;
  try{
   await refreshExisting();if(signal.aborted||disposed)return;
   const canonical=g.taleraSavedReceipt?.canonicalByDraft||g.canonicalByDraft||{};
   for(const localOnly of [true,false])for(const id of photoIds()){
    if(signal.aborted||disposed||g.taleraLocationPublishing)return;
    if(state(id).state!=='pending'||canonical[id]&&!localOnly)continue;
    const original=getAsset(id);if(!original)continue;
    let value;try{value=await inspect(original,'photo',signal,localOnly)}catch(_){value={state:'pending'}}
    if(signal.aborted||disposed||g.taleraLocationPublishing)return;
    if(!photoIds().includes(id)||getAsset(id)!==original)continue;
    if(['known','unknown'].includes(value?.state)){result.set(id,value);saveDraft()}
    paint();
   }
  }finally{
   controller=null;running=false;
   if(!disposed&&!doc.hidden&&!g.taleraLocationPublishing&&photoIds().some(id=>!(g.canonicalByDraft||{})[id]&&!['known','unknown'].includes(result.get(id)?.state))&&win.navigator.onLine!==false)timer=win.setTimeout(scan,60000);
  }
 }
 function wake(){if(timer!==null){win.clearTimeout(timer);timer=null}if(!disposed&&!doc.hidden&&!g.taleraLocationPublishing)void scan()}
 function stop(){controller?.abort();if(timer!==null){win.clearTimeout(timer);timer=null}}
 toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){paint();wake()}};
 country.onclick=()=>{search.value='';renderCountries();dialog.showModal();choices.scrollTop=0};
 close.onclick=closePicker;dialog.addEventListener('cancel',e=>{e.preventDefault();closePicker()});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom||e.clientX<r.left||e.clientX>r.right)closePicker()}});
 search.oninput=renderCountries;
 city.oninput=()=>{city.value=city.value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu,'');entry.city=city.value;fillEntry()};
 apply.onclick=()=>{
  const value=normalizeManualLocation(entry,codes);if(!value)return;
  if(single&&photoIds().includes(single)){setManual(single,{...value,mode:'correct'});single=null}
  else for(const id of unknownIds())if(selected.has(id)){setManual(id,{...value,mode:'fill'});selected.delete(id)}
  entry={countryCode:'',city:''};saveDraft();paint();
 };
 clear.onclick=()=>{if(single&&photoIds().includes(single)){setManual(single,null);saveDraft();single=null;entry={countryCode:'',city:''};paint()}};
 reset.onclick=()=>{single=null;entry={countryCode:'',city:''};paint()};
 anchor.insertAdjacentElement('afterend',box);
 try{const old=normalizeManualLocation(g.manualLocation??null,codes);if(old)entry=old}catch(_){}
 const changed=()=>{if(box.isConnected)void refreshExisting();else dispose()};
 const language=()=>{if(box.isConnected)paint();else dispose()};
 const visibility=()=>{if(doc.hidden)stop();else wake()};
 const dispose=()=>{if(disposed)return;disposed=true;stop();observer.disconnect();win.removeEventListener('talera-capture-place-updated',changed);win.removeEventListener('online',wake);win.removeEventListener('pageshow',wake);win.removeEventListener('pagehide',stop);win.removeEventListener('beforeunload',stop);doc.removeEventListener('visibilitychange',visibility);doc.removeEventListener('talera:languagechange',language)};
 const observer=new MutationObserver(()=>{if(!box.isConnected)dispose()});observer.observe(doc.getElementById('main')||anchor.parentElement,{childList:true,subtree:true});
 win.addEventListener('talera-capture-place-updated',changed);win.addEventListener('online',wake);win.addEventListener('pageshow',wake);win.addEventListener('pagehide',stop);win.addEventListener('beforeunload',stop);doc.addEventListener('visibilitychange',visibility);doc.addEventListener('talera:languagechange',language);
 Object.defineProperty(g,'taleraLocationStop',{configurable:true,value:stop});Object.defineProperty(g,'taleraLocationWake',{configurable:true,value:wake});
 paint();wake();return box;
}
