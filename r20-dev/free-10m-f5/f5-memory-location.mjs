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
 if(!place||!['iptc-location-created','geonames-locality-v2','offline-country-v1'].includes(place.source)||typeof place.country!=='string')return null;
 try{
  const location=normalizeManualLocation({countryCode:place.countryCode,city:place.city},codes);
  if(!location?.countryCode||(place.source==='geonames-locality-v2'&&!location.city)||(place.source==='offline-country-v1'&&location.city)||new Intl.DisplayNames(['nl'],{type:'region',fallback:'none'}).of(location.countryCode)!==place.country)return null;
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
 if(manual&&automatic&&!automatic.city&&manual.city&&(!manual.countryCode||manual.countryCode===automatic.countryCode))return {countryCode:automatic.countryCode,city:manual.city,source:'manual-photo'};
 return automatic;
}
// Legacy v3 and old draft negatives had no proof of whether GPS was read.
 // Never treat them as settled; re-read the original with the current reader.
export function completedDraftLocation(result){
 return !!result&&(result.state==='known'&&!!result.place||result.state==='unknown'&&
  Object.keys(result).sort().join(',')==='reason,state'&&['no-readable-gps','no-country'].includes(result.reason));
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
   else if(result.state==='unknown'&&completedDraftLocation(result))item.capturePlaceChecked=result.reason==='no-country'?'v5-no-country':'v4-no-readable-gps';
  }
  if(Object.hasOwn(input,'manual')){
   const manual=normalizePhotoLocation(input.manual,codes);
   if(!manual)delete item.manualPhotoLocation;
   else if(manual.mode==='correct'||!confirmedPhotoLocation(item.capturePlace,codes)||!item.capturePlace.city&&manual.city&&(!manual.countryCode||manual.countryCode===item.capturePlace.countryCode))item.manualPhotoLocation=manual;
  }
 }
}
export function localPhotoState(item,codes){
 if(confirmedPhotoLocation(item?.capturePlace,codes))return {state:'known',place:confirmedPhotoLocation(item.capturePlace,codes)};
 if(['v4-no-readable-gps','v5-no-country'].includes(item?.capturePlaceChecked))return {state:'unknown',reason:item.capturePlaceChecked.slice(3)};
 return {state:'pending'};
}
export function draftPhotoChanges(g){
 const filtered=Object.fromEntries((g.media||[]).filter(id=>Object.hasOwn(g.photoLocations||{},id)).map(id=>[id,g.photoLocations[id]]));
 const automatic=Object.fromEntries((g.media||[]).map(id=>[id,g.taleraLocationResults?.get(id)??g.photoLocationAutomatic?.[id]]).filter(([,v])=>completedDraftLocation(v)));
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
  if(completedDraftLocation(automatic))entry.automatic=automatic;
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
export function mountMemoryLocationEditor({g,anchor,saveDraft,readStory,getAsset,preview,inspect,lookupDevicePlace,flagPositions,codes}){
 if(!anchor||anchor.parentElement?.querySelector(':scope > .talera-memory-location'))return;
 const doc=anchor.ownerDocument,win=doc.defaultView||window;
 const locale=()=>win.TaleraI18n?.locale||doc.documentElement.lang||'en',t=(key,params)=>win.TaleraI18n.t('core.editor.location.'+key,params);
 const photoIds=()=>g.media.filter(id=>String(getAsset(id)?.type||'').startsWith('image/'));
 if(!photoIds().length)return;
 if(!g.taleraLocationResults)Object.defineProperty(g,'taleraLocationResults',{configurable:true,value:new Map(Object.entries(g.photoLocationAutomatic||{}))});
 const result=g.taleraLocationResults,existing=new Map();let disposed=false,running=false,controller=null,timer=null,serial=0;
 let single=null,singleMode='fill',entry={countryCode:'',city:''};
 let deviceAttempt=null;const deviceStatus=new Map();
 const box=doc.createElement('section');box.className='talera-memory-location';box.dataset.taleraExplicitLanguage='';
 const node=(tag,cls,parent)=>{const x=doc.createElement(tag);if(cls)x.className=cls;if(parent)parent.append(x);return x};
 const button=(cls,parent)=>{const x=node('button',cls,parent);x.type='button';return x};
 const toggle=button('talera-location-toggle',box);
 const pin=node('span','talera-location-pin',toggle);pin.setAttribute('aria-hidden','true');pin.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
 const copy=node('span','talera-location-copy',toggle),title=node('span','talera-location-title',copy);
 const summary=node('span','talera-location-summary',copy);summary.setAttribute('aria-live','polite');
 const chevron=node('span','talera-location-chevron',toggle);chevron.setAttribute('aria-hidden','true');
 const panel=node('div','talera-location-panel',box);panel.id='talera-memory-location-fields';panel.hidden=true;toggle.setAttribute('aria-controls',panel.id);toggle.setAttribute('aria-expanded','false');
 const legacy=node('p','talera-location-status',panel);
 const rows=node('div','talera-location-list',panel);
 const form=node('div','talera-location-form',panel);
 const modeLabel=node('p','talera-location-status',form),reset=button('talera-location-clear',form);
 const deviceHint=node('p','talera-location-status',form),use=button('talera-location-device',form),deviceFeedback=node('p','talera-location-tile-status',form);deviceFeedback.setAttribute('role','status');
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
 const state=id=>{const catalog=localPhotoState(existing.get(id),codes),candidate=result.get(id);return catalog.state!=='pending'?catalog:completedDraftLocation(candidate)?candidate:catalog};
 const manual=id=>{try{return normalizePhotoLocation(Object.hasOwn(g.photoLocations||{},id)?g.photoLocations[id]:existing.get(id)?.manualPhotoLocation??null,codes)}catch(_){return null}};
 const display=id=>selectDisplayedLocation(null,{capturePlace:state(id).place,manualPhotoLocation:manual(id)},codes);
 const photoNumber=id=>g.media.indexOf(id)+1;
 function closeEntry(){deviceAttempt?.controller.abort();deviceAttempt=null;single=null;entry={countryCode:'',city:''}}
 function chooseSingle(id){
  if(single===id){closeEntry();paint();return}
  closeEntry();single=id;const value=display(id);singleMode=value?'correct':'fill';entry=value?{countryCode:value.countryCode,city:value.city}:{countryCode:'',city:''};paint();form.scrollIntoView?.({block:'nearest'});
 }
 function setManual(id,value){g.photoLocations={...(g.photoLocations||{}),[id]:value}}
 // Never rely on selected bulk IDs or filenames; the click confirms one exact
 // photo. The fix is temporary; only the validated country/city is saved as
 // user-confirmed fill, so later original metadata still takes precedence.
 const deviceEligible=id=>!disposed&&!doc.hidden&&!g.taleraLocationPublishing&&photoIds().includes(id)&&state(id).reason==='no-readable-gps'&&!display(id);
 async function confirmDevicePlace(id){
  if(deviceAttempt||!deviceEligible(id))return;
  const original=getAsset(id),attempt={id,controller:new AbortController()};
  if(!original)return;
  deviceAttempt=attempt;deviceStatus.delete(id);paint();
  const signal=attempt.controller.signal;
  try{
   const outcome=await requestConfirmedPhotoPlace({geolocation:win.navigator.geolocation,
    lookup:(gps,activeSignal)=>deviceAttempt===attempt&&deviceEligible(id)&&getAsset(id)===original?lookupDevicePlace(gps,activeSignal):{ok:false},signal});
   if(signal.aborted||deviceAttempt!==attempt||!deviceEligible(id)||getAsset(id)!==original)return;
   const place=outcome.status==='known'?confirmedPhotoLocation(outcome.place,codes):null;
   if(place){setManual(id,{countryCode:place.countryCode,city:place.city,mode:'fill'});deviceStatus.delete(id);saveDraft();single=null;entry={countryCode:'',city:''}}
   else deviceStatus.set(id,outcome.status==='denied'?'deviceDenied':outcome.status==='no-place'?'deviceNoPlace':'deviceUnavailable');
  }catch(_){if(!signal.aborted&&deviceAttempt===attempt&&deviceEligible(id))deviceStatus.set(id,'deviceUnavailable')}
  finally{if(deviceAttempt===attempt){deviceAttempt=null;paint()}}
 }
 function fillEntry(){
  countryLabel.textContent=t('countryLabel');cityLabel.textContent=t('cityLabel');
  countryName.textContent=countryText(entry.countryCode)||t('countryPlaceholder');flag(countryFlag,entry.countryCode);
  city.placeholder=t('cityPlaceholder');if(doc.activeElement!==city)city.value=entry.city;
  apply.textContent=t('applySingle');
  apply.disabled=!single||!entry.countryCode&&!entry.city.trim();
 }
 function tile(id,parent){
  const card=node('div','talera-location-tile',parent);card.dataset.locationMediaId=id;card.dataset.locationState=display(id)?'known':state(id).state;
  const info=node('div','talera-location-row-copy',card);
  const number=node('span','talera-location-photo-number',info);number.textContent=t('photoNumber',{number:photoNumber(id)});
  const value=display(id),label=node('p','talera-location-tile-label',info);
  if(value){const f=node('span','talera-location-flag',label);flag(f,value.countryCode);node('span','',label).textContent=[countryText(value.countryCode),value.city].filter(Boolean).join(' · ')}
  else label.textContent=t(state(id).state==='pending'?'checkingLocation':'locationUnknown');
  const edit=button('talera-location-edit',card);edit.textContent=t(value?'changeLocation':'addLocation');edit.setAttribute('aria-label',t(value?'editPhoto':'addPhotoLocation',{number:photoNumber(id)}));edit.setAttribute('aria-expanded',String(single===id));edit.onclick=()=>chooseSingle(id);
 }
 function paint(){
  if(disposed||!box.isConnected)return;
  const ids=photoIds();
  if(single&&!ids.includes(single))closeEntry();
  const automatic=ids.filter(id=>state(id).state==='known').length,complete=ids.filter(id=>state(id).state!=='pending').length;
  title.textContent=t('heading');
  summary.textContent=complete<ids.length?t('progress',{done:complete,total:ids.length}):t('recognizedSummary',{count:automatic,total:ids.length});
  legacy.hidden=true;
  try{const old=normalizeManualLocation(g.manualLocation??null,codes);if(old){legacy.hidden=false;legacy.textContent=t('legacyNotice',{location:[countryText(old.countryCode),old.city].filter(Boolean).join(' · ')})}}catch(_){}
  rows.replaceChildren();ids.forEach(id=>tile(id,rows));
  form.hidden=!single;
  modeLabel.textContent=single?t('editingPhoto',{number:photoNumber(single)}):'';
  reset.textContent=t('cancelEdit');clear.hidden=!single||!manual(single);clear.textContent=t('clearManual');
  const eligible=!!single&&deviceEligible(single);
  deviceHint.hidden=use.hidden=!eligible;deviceHint.textContent=t('deviceHint');
  use.textContent=t(deviceAttempt?.id===single?'deviceSearching':'deviceConfirm');
  use.disabled=!!deviceAttempt||!eligible;
  const feedback=single&&deviceStatus.get(single);deviceFeedback.hidden=!feedback;deviceFeedback.textContent=feedback?t(feedback):'';
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
    if(completedDraftLocation(value)){result.set(id,value);saveDraft()}
    paint();
   }
  }finally{
   controller=null;running=false;
   if(!disposed&&!doc.hidden&&!g.taleraLocationPublishing&&photoIds().some(id=>!(g.canonicalByDraft||{})[id]&&!completedDraftLocation(result.get(id))))timer=win.setTimeout(scan,60000);
  }
 }
 function wake(){if(timer!==null){win.clearTimeout(timer);timer=null}if(!disposed&&!doc.hidden&&!g.taleraLocationPublishing)void scan()}
 function stop(){controller?.abort();deviceAttempt?.controller.abort();deviceAttempt=null;if(timer!==null){win.clearTimeout(timer);timer=null}}
 toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){paint();wake()}else{closeEntry();paint()}};
 use.onclick=()=>{const id=single;if(id)void confirmDevicePlace(id)};
 country.onclick=()=>{search.value='';renderCountries();dialog.showModal();choices.scrollTop=0};
 close.onclick=closePicker;dialog.addEventListener('cancel',e=>{e.preventDefault();closePicker()});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom||e.clientX<r.left||e.clientX>r.right)closePicker()}});
 search.oninput=renderCountries;
 city.oninput=()=>{city.value=city.value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu,'');entry.city=city.value;fillEntry()};
 apply.onclick=()=>{
  const value=normalizeManualLocation(entry,codes);if(!value)return;
  if(!single||!photoIds().includes(single))return;
  setManual(single,{...value,mode:singleMode});closeEntry();saveDraft();paint();
 };
 clear.onclick=()=>{if(single&&photoIds().includes(single)){setManual(single,null);saveDraft();closeEntry();paint()}};
 reset.onclick=()=>{closeEntry();paint()};
 anchor.insertAdjacentElement('afterend',box);
 const changed=()=>{if(box.isConnected)void refreshExisting();else dispose()};
 const language=()=>{if(box.isConnected)paint();else dispose()};
 const visibility=()=>{if(doc.hidden)stop();else wake()};
 const dispose=()=>{if(disposed)return;disposed=true;stop();observer.disconnect();win.removeEventListener('talera-capture-place-updated',changed);win.removeEventListener('online',wake);win.removeEventListener('pageshow',wake);win.removeEventListener('pagehide',stop);win.removeEventListener('beforeunload',stop);doc.removeEventListener('visibilitychange',visibility);doc.removeEventListener('talera:languagechange',language)};
 const observer=new MutationObserver(()=>{if(!box.isConnected)dispose()});observer.observe(doc.getElementById('main')||anchor.parentElement,{childList:true,subtree:true});
 win.addEventListener('talera-capture-place-updated',changed);win.addEventListener('online',wake);win.addEventListener('pageshow',wake);win.addEventListener('pagehide',stop);win.addEventListener('beforeunload',stop);doc.addEventListener('visibilitychange',visibility);doc.addEventListener('talera:languagechange',language);
 Object.defineProperty(g,'taleraLocationStop',{configurable:true,value:stop});Object.defineProperty(g,'taleraLocationWake',{configurable:true,value:wake});
 paint();wake();return box;
}

// This is an explicit user-confirmed fallback, never a photo-source inference.
// Native iOS file-picker results do not reliably prove which option was used.
// A fresh, adequately accurate fix may be used only for the exact confirmed photo.
export async function requestConfirmedPhotoPlace({geolocation,lookup,signal,now=Date.now}){
 const stopped=()=>signal?.aborted;
 if(stopped())return {status:'aborted'};
 if(typeof geolocation?.getCurrentPosition!=='function'||typeof lookup!=='function')return {status:'unavailable'};
 const start=now();
 const fix=await new Promise(resolve=>{
  let finished=false,timer;
  const finish=value=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);resolve(value)};
  const abort=()=>finish({status:'aborted'});
  signal?.addEventListener('abort',abort,{once:true});
  if(stopped()){abort();return}
  timer=setTimeout(()=>finish({status:'unavailable'}),20000);
  try{
   geolocation.getCurrentPosition(position=>{
    const c=position?.coords,at=position?.timestamp,time=now();
    if(!c||![c.latitude,c.longitude,c.accuracy,at].every(Number.isFinite)||
      Math.abs(c.latitude)>90||Math.abs(c.longitude)>180||c.accuracy<0||c.accuracy>250||
      at<start-1000||at>time+1000||time-at>10000){finish({status:'unavailable'});return}
    finish({status:'fix',latitude:c.latitude,longitude:c.longitude});
   },error=>finish({status:error?.code===1?'denied':'unavailable'}),
   {enableHighAccuracy:true,maximumAge:0,timeout:12000});
  }catch(_){finish({status:'unavailable'})}
 });
 if(stopped())return {status:'aborted'};
 if(fix.status!=='fix')return fix;
 let result;try{result=await lookup({latitude:fix.latitude,longitude:fix.longitude},signal)}catch(_){return {status:stopped()?'aborted':'unavailable'}}
 if(stopped())return {status:'aborted'};
 return result?.ok?(result.place?{status:'known',place:result.place}:{status:'no-place'}):{status:'unavailable'};
}
