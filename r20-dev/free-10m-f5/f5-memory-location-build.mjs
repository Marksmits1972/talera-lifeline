import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const moduleSource=readFileSync(new URL('./f5-memory-location.mjs',import.meta.url),'utf8');
const split=moduleSource.indexOf('export function mountMemoryLocationEditor(');
assert.ok(split>0&&!moduleSource.includes('</script'));
const shared=moduleSource.slice(0,split).replaceAll('export function ','function ');
const end=moduleSource.indexOf('// This is an explicit user-confirmed fallback',split);
assert.ok(end>split);
const editor=moduleSource.slice(split,end).replaceAll('export function ','function ');
const flags=JSON.parse(readFileSync(new URL('./f5-capture-flags.json',import.meta.url),'utf8')).positions;
const codes=Object.keys(flags).filter(code=>!['AN','CS'].includes(code)); // obsolete country codes, never offer for new manual selection
export const memoryLocationCountryCodes=Object.freeze(codes);
export const memoryLocationSharedSource=shared;
const exact=(html,a,b,label)=>{assert.equal(html.split(a).length,2,'MEMORY_LOCATION_DRIFT_'+label);return html.replace(a,()=>b)};
export function installMemoryLocationStore(html){
 // Insert before the original save marker, which must remain unchanged for
 // the existing canonical-ID and atomic transaction adapters.
 const save='async function save(input,uploads,editId){';
 html=exact(html,save,shared+'\nconst taleraLocationCountryCodes='+JSON.stringify(codes)+';\n'+save,'SAVE_SOURCE');
 html=exact(html,"place:place||existing.place||'',text:text,tags:tags,","place:place||existing.place||'',text:text,tags:tags,...manualLocationPatch(existing,input,taleraLocationCountryCodes),",'TEXT_SAVE');
 html=exact(html,"place:place,text:text,tags:Array.isArray(input.tags)?","place:place,text:text,...manualLocationPatch(existing,input,taleraLocationCountryCodes),tags:Array.isArray(input.tags)?",'MEDIA_SAVE');
 const anchor=" var precision=['exact','month','year','season','period'].includes(input.datePrecision)?input.datePrecision:'exact';";
 html=exact(html,anchor," applyPhotoLocationInputs(files,input.photoLocations,taleraLocationCountryCodes);\n"+anchor,'PHOTO_INPUTS');
 return html;
}
export function installMemoryLocationEditor(html){
 const hook='function workView(){';
 html=exact(html,hook,shared+'\n'+editor+'\n'+hook,'WORK_VIEW');
 const mount='taleraV16InstallToolbar(g);';
 html=exact(html,mount,mount+"\n mountMemoryLocationEditor({g,anchor:main.querySelector('.talera-tags-v20'),saveDraft,readStory:id=>mem.get(id),getAsset:id=>assets.get(id),inspect:(...args)=>mem.inspectDraftCapturePlace(...args),codes:"+JSON.stringify(codes)+"});",'MOUNT');
 // Optional key absent from existing drafts. Canonical-ID adapter still sees
 // its exact unchanged voiceDurationMs/ existing tail.
 const snapshot='function snapshot(){return groups.map(g=>({tags:';
 html=exact(html,snapshot,"function snapshot(){return groups.map(g=>({...draftPhotoChanges(g),...(Object.hasOwn(g,'manualLocation')?{manualLocation:g.manualLocation}:{}),tags:",'DRAFT');
 const boot='existing:row.id},entries=[];';
 html=exact(html,boot,"existing:row.id,...(Object.hasOwn(row,'manualLocation')?{manualLocation:row.manualLocation}:{})},entries=[];",'LOAD');
 const itemBoot="entries.push([id,file]);if(it.kind==='audio')g.voice=id;else g.media.push(id)";
 html=exact(html,itemBoot,"if(it.kind==='photo'&&it.manualPhotoLocation)g.photoLocations={...(g.photoLocations||{}),[id]:it.manualPhotoLocation};"+itemBoot,'LOAD_PHOTO_MANUAL');
 const move="a.media=a.media.filter(id=>id!==media);";
 html=exact(html,move,"moveDraftPhotoLocation(a,b,media);"+move,'MOVE_PHOTO_LOCATION');
 const write='mem.save({title,date:g.date,time:';
 html=exact(html,write,"mem.save({photoLocations:draftPhotoInputs(g,id=>assets.get(id)),... (Object.hasOwn(g,'manualLocation')?{manualLocation:g.manualLocation}:{}),title,date:g.date,time:",'PUBLISH');
 // A running optional scan cannot modify the draft receipt while publishing.
 const publishing="try{await queue;const uploads=g.media.map(id=>assets.get(id));";
 html=exact(html,publishing,"g.taleraLocationPublishing=true;g.taleraLocationStop?.();"+publishing,'STOP_ON_PUBLISH');
 const failed="catch(e){clearBusy();showError('Nog niet geplaatst: '+e.message);return false}";
 html=exact(html,failed,"catch(e){g.taleraLocationPublishing=false;g.taleraLocationWake?.();clearBusy();showError('Nog niet geplaatst: '+e.message);return false}",'RESUME_ON_PUBLISH_FAILURE');
 return html;
}
