// Optional user-entered memory location. The original per-media capture
// descriptors continue to belong to the existing library and geo enrichment.
export function normalizeManualLocation(value, codes){
 if(value===null)return null;
 if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).sort().join(',')!=='city,countryCode'||
    typeof value.countryCode!=='string'||typeof value.city!=='string')
  throw Error('TALERA_INVALID_MANUAL_LOCATION');
 const countryCode=value.countryCode,city=value.city.trim();
 if(countryCode&&!codes.includes(countryCode)||city.length>120||
    /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(city))
  throw Error('TALERA_INVALID_MANUAL_LOCATION');
 return countryCode||city?{countryCode,city}:null;
}
// Omitting the property is not an instruction to erase a user's choice.
// Explicit null returns to automatic location. No change to any media item.
export function manualLocationPatch(existing,input,codes){
 if(Object.hasOwn(input,'manualLocation'))return {manualLocation:normalizeManualLocation(input.manualLocation,codes)};
 return existing&&Object.hasOwn(existing,'manualLocation')?{manualLocation:existing.manualLocation}:{};
}
export function deriveAutomaticLocation(items,codes){
 const known=[];
 for(const item of items||[]){
  const p=item?.capturePlace;
  if(!['photo','video'].includes(item?.kind)||!['iptc-location-created','geonames-locality-v2'].includes(p?.source)||!p.countryCode||!p.city)continue;
  try{const value=normalizeManualLocation({countryCode:p.countryCode,city:p.city},codes);if(value)known.push(value)}catch(_){}
 }
 const countryCodes=new Set(known.map(x=>x.countryCode));
 const cities=new Set(known.map(x=>x.city.normalize('NFC').toLowerCase()));
 if(!known.length)return {location:null,mixed:false};
 if(countryCodes.size>1)return {location:null,mixed:true};
 if(cities.size>1)return {location:{countryCode:known[0].countryCode,city:''},mixed:true};
 return {location:known[0],mixed:false};
}
// Explicit manual data is the user's chosen memory-level description. It can
// override what is shown without rewriting the original capture descriptors.
export function selectDisplayedLocation(story,item,codes){
 try{const manual=normalizeManualLocation(story?.manualLocation??null,codes);if(manual)return {...manual,source:'manual-memory'}}catch(_){}
 return item?.capturePlace||null;
}
export function localizedCountryRows(codes,locale){
 const names=new Intl.DisplayNames([locale],{type:'region',fallback:'none'});
 return codes.map(code=>({code,name:names.of(code)||code})).sort((a,b)=>a.name.localeCompare(b.name,locale,{sensitivity:'base'}));
}
export function filterCountryRows(rows,query,locale){
 const plain=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase(locale).trim();
 const q=plain(query);return rows.filter(row=>!q||plain(row.name).includes(q)||plain(row.code)===q);
}

// This component is mounted only inside the original work view. The callback
// writes the existing draft, not its own database, and publishing remains the
// sole route to modifying the published story.
export function mountMemoryLocationEditor({g,anchor,saveDraft,readStory,flagPositions,codes}){
 if(!anchor||anchor.parentElement?.querySelector(':scope > .talera-memory-location'))return;
 const doc=anchor.ownerDocument,win=doc.defaultView||window;
 const locale=()=>win.TaleraI18n?.locale||doc.documentElement.lang||'en';
 const t=key=>win.TaleraI18n.t('core.editor.location.'+key);
 const box=doc.createElement('section');box.className='talera-memory-location';box.dataset.taleraExplicitLanguage='';
 const node=(tag,cls,parent)=>{const x=doc.createElement(tag);if(cls)x.className=cls;if(parent)parent.append(x);return x};
 const button=(cls,parent)=>{const x=node('button',cls,parent);x.type='button';return x};
 const toggle=button('talera-location-toggle',box);
 const pin=node('span','talera-location-pin',toggle);pin.setAttribute('aria-hidden','true');pin.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
 const title=node('span','talera-location-title',toggle),chevron=node('span','talera-location-chevron',toggle);chevron.setAttribute('aria-hidden','true');
 const panel=node('div','talera-location-panel',box);panel.id='talera-memory-location-fields';panel.hidden=true;toggle.setAttribute('aria-controls',panel.id);toggle.setAttribute('aria-expanded','false');
 const countryLabel=node('label','talera-location-label',panel);countryLabel.htmlFor='talera-memory-country';
 const country=button('talera-location-country',panel);country.id=countryLabel.htmlFor;country.setAttribute('aria-haspopup','dialog');
 const countryFlag=node('span','talera-location-flag',country);countryFlag.setAttribute('aria-hidden','true');
 const countryName=node('span','talera-location-country-name',country),countryArrow=node('span','talera-location-chevron',country);countryArrow.setAttribute('aria-hidden','true');
 const cityLabel=node('label','talera-location-label',panel);cityLabel.htmlFor='talera-memory-city';
 const city=node('input','talera-location-city',panel);city.id=cityLabel.htmlFor;city.type='text';city.maxLength=120;city.autocomplete='off';city.setAttribute('autocapitalize','words');
 const status=node('p','talera-location-status',panel);status.setAttribute('aria-live','polite');
 const clear=button('talera-location-clear',panel);clear.hidden=true;
 const dialog=node('dialog','talera-location-dialog',box);dialog.setAttribute('aria-labelledby','talera-location-dialog-title');
 const grip=node('div','talera-location-grip',dialog);grip.setAttribute('aria-hidden','true');
 const header=node('div','talera-location-dialog-header',dialog);
 const heading=node('h2','',header);heading.id='talera-location-dialog-title';
 const close=button('talera-location-close',header);close.textContent='×';
 const search=node('input','talera-location-search',dialog);search.type='search';search.autocomplete='off';
 const choices=node('div','talera-location-choices',dialog);
 let auto={location:null,mixed:false},stored=null,serial=0;
 const manual=()=>{try{return normalizeManualLocation(Object.hasOwn(g,'manualLocation')?g.manualLocation:stored,codes)}catch(_){return null}};
 const choice=()=>manual()||auto.location||{countryCode:'',city:''};
 const flag=(element,code)=>{
  const xy=flagPositions[code];element.hidden=!xy;if(xy)element.style.backgroundPosition=xy[0]+'px '+xy[1]+'px';
 };
 function countryText(code){return code?new Intl.DisplayNames([locale()],{type:'region',fallback:'none'}).of(code)||code:t('countryPlaceholder')}
 function paint(keepInput=false){
  const selected=choice();
  title.textContent=t('heading');countryLabel.textContent=t('countryLabel');cityLabel.textContent=t('cityLabel');
  countryName.textContent=countryText(selected.countryCode);country.classList.toggle('empty',!selected.countryCode);flag(countryFlag,selected.countryCode);
  city.placeholder=t('cityPlaceholder');if(!keepInput)city.value=selected.city||'';
  status.textContent=t(manual()?'manualStatus':auto.mixed?'mixedStatus':auto.location?'autoStatus':'emptyStatus');
  clear.textContent=t('clearManual');clear.hidden=!manual();
  heading.textContent=t('pickerHeading');close.setAttribute('aria-label',t('pickerClose'));
  search.placeholder=t('pickerSearch');search.setAttribute('aria-label',t('pickerSearchAria'));
  if(dialog.open)renderCountries();
 }
 const update=value=>{
  const next=normalizeManualLocation(value,codes);
  g.manualLocation=next;
  stored=null;
  saveDraft();return next;
 };
 function closePicker(){if(dialog.open)dialog.close();country.focus()}
 function renderCountries(){
  const rows=filterCountryRows(localizedCountryRows(codes,locale()),search.value,locale());
  choices.replaceChildren();
  const add=(code,name)=>{
   const b=button('talera-location-choice',choices),f=node('span','talera-location-flag',b);f.setAttribute('aria-hidden','true');flag(f,code);node('span','',b).textContent=name;
   b.setAttribute('aria-pressed',String(choice().countryCode===code));
   b.onclick=()=>{const previous=choice();if(previous.countryCode!==code)update({countryCode:code,city:previous.countryCode&&code&&previous.countryCode!==code?'':previous.city});closePicker();paint()};
  };
  if(!search.value.trim())add('',t('noCountry'));
  for(const row of rows)add(row.code,row.name);
  if(!rows.length)node('p','talera-location-no-results',choices).textContent=t('noResults');
 }
 async function refreshAuto(){
  const own=++serial;if(!g.existing)return;
  let row;try{row=await readStory(g.existing)}catch(_){return}
  if(own!==serial||!box.isConnected||row?.id!==g.existing)return;
  try{stored=normalizeManualLocation(row.manualLocation??null,codes)}catch(_){stored=null}
  const canonical=g.taleraSavedReceipt?.canonicalByDraft||g.canonicalByDraft||{};
  const selected=new Set((g.media||[]).map(id=>canonical[id]).filter(Boolean));
  auto=deriveAutomaticLocation((row.items||[]).filter(item=>selected.has(item.key)),codes);
  paint(doc.activeElement===city);
 }
 toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)void refreshAuto()};
 country.onclick=()=>{search.value='';renderCountries();dialog.showModal();choices.scrollTop=0};
 close.onclick=closePicker;dialog.addEventListener('cancel',e=>{e.preventDefault();closePicker()});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom||e.clientX<r.left||e.clientX>r.right)closePicker()}});
 search.oninput=renderCountries;
 city.oninput=()=>{
  city.value=city.value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu,'');
  update({countryCode:choice().countryCode,city:city.value});paint(true);
 };
 city.onblur=()=>paint();clear.onclick=()=>{update(null);paint()};
 anchor.insertAdjacentElement('afterend',box);
 const changed=()=>{if(box.isConnected)void refreshAuto();else dispose()};
 const language=()=>{if(box.isConnected)paint(doc.activeElement===city);else dispose()};
 const dispose=()=>{win.removeEventListener('talera-capture-place-updated',changed);doc.removeEventListener('talera:languagechange',language);observer.disconnect()};
 const observer=new MutationObserver(()=>{if(!box.isConnected)dispose()});observer.observe(doc.getElementById('main')||anchor.parentElement,{childList:true,subtree:true});
 // Work-view replacement can remove the parent itself; event listeners also
 // self-dispose before touching stale drafts.
 win.addEventListener('talera-capture-place-updated',changed);doc.addEventListener('talera:languagechange',language);
 paint();void refreshAuto();
 return box;
}
