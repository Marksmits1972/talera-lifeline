import {languageCatalog} from './f5-language-catalog.mjs';
import {buildEditorLibraryBrowserSources} from './f5-library-editor-stable-save.mjs';
// Local preparation for the existing TALERA Free edit-return feature.
// No deployment, new route, second player, database or account transition.
// The eventual integration must run after the desktop changes are stable.

export const EDIT_RETURN_ID=/^local-[a-z0-9-]{8,90}$/i;
const SCOPE=/^[a-f0-9]{64}$/;
const DRAFT_ID=/^[a-z0-9-]{8,100}$/i;
const PREFIX='talera-v4-work:';
const MANIFEST=PREFIX+'manifest';
const MAX_AGE=30*60*1000;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function returnPath(id){
 if(typeof id!=='string'||!EDIT_RETURN_ID.test(id))throw Error('Invalid local memory ID');
 return '/present?memory='+encodeURIComponent(id);
}

export function returnStorageKey(scope){
 if(typeof scope!=='string'||!SCOPE.test(scope))throw Error('Invalid edit-return account scope');
 return 'talera-free-edit-return-'+scope.slice(0,32);
}

// Private, same-tab, transient navigation context only; no personal story,
// image, audio, or tokens stored. Position uses the *actual* pencil rectangle.
export function captureReturnContext({memory,rect,viewport,centerMs,now=Date.now()}){
 if(!memory?._taleraLocal||!EDIT_RETURN_ID.test(memory.storyId||''))return null;
 const index=Number.isSafeInteger(memory._photoIndex)&&memory._photoIndex>=0?memory._photoIndex:0;
 const frame=Array.isArray(memory._zeroFrames)?memory._zeroFrames[index]:null;
 const mediaKey=typeof frame?.key==='string'&&frame.key.length<=200?frame.key:null;
 if(!rect||!viewport||![rect.top,rect.right,rect.width,rect.height,viewport.width,viewport.height].every(Number.isFinite)||
    viewport.width<=0||viewport.height<=0||rect.width<=0||rect.height<=0)return null;
 return {version:1,id:memory.storyId,index,mediaKey,top:rect.top,right:viewport.width-rect.right,
  width:rect.width,height:rect.height,viewportWidth:viewport.width,viewportHeight:viewport.height,
  centerMs:Number.isFinite(centerMs)?centerMs:null,at:now,returning:false};
}

export function readReturnContext(storage,scope,id,now=Date.now()){
 if(!EDIT_RETURN_ID.test(id||''))return null;
 try{
  const v=JSON.parse(storage.getItem(returnStorageKey(scope))||'null');
  if(!v||v.version!==1||v.id!==id||!Number.isFinite(v.at)||v.at>now||now-v.at>MAX_AGE||
    !Number.isSafeInteger(v.index)||v.index<0||!Number.isFinite(v.top)||!Number.isFinite(v.right)||
    !Number.isFinite(v.width)||!Number.isFinite(v.height)||v.width<1||v.height<1||v.width>100||v.height>100||
    typeof v.returning!=='boolean')return null;
  return v;
 }catch{return null}
}

export function writeReturnContext(storage,scope,context){
 if(!context||!EDIT_RETURN_ID.test(context.id||''))return false;
 try{storage.setItem(returnStorageKey(scope),JSON.stringify(context));return true}catch{return false}
}

// Position in the actual editor header, independently of the captured
// presentation pencil's coordinates. Never cover the lower editing controls.
export function buttonPosition(back,dots,viewport){
 const size=45;
 if(!back||!dots||![back.top,back.height,back.width,dots.left,dots.width,dots.top,
    viewport.width,viewport.height].every(Number.isFinite)||
    back.height<=0||back.width<=0||dots.width<=0)return null;
 const top=back.top+(back.height-size)/2;
 const right=viewport.width-(dots.left+dots.width/2)-size/2;
 if(top<0||right<0||right+size>viewport.width||top+size>viewport.height||top+size>dots.top)return null;
 return {width:size,height:size,top,right};
}

const LABELS=Object.fromEntries(Object.entries(languageCatalog).map(([l,p])=>[l,p['core.editor.returnTitle']]));
const ARIA_LABELS=Object.fromEntries(Object.entries(languageCatalog).map(([l,p])=>[l,p['core.editor.returnAria']]));
export function returnLabel(language){return LABELS[String(language||'nl').toLowerCase().split('-')[0]]||LABELS.en}

// Build a single accessible eye button. The integration owns the activation
// gate: mount only in the existing work view for the exact pencil-opened ID.
export function mountReturnButton({document,window,context,language,onReturn}){
 if(!context||typeof onReturn!=='function')throw Error('Missing edit-return context');
 const id='talera-f5-edit-return-eye';
 if(document.getElementById(id))throw Error('Duplicate edit return button');
 const button=document.createElement('button');
 button.id=id;button.type='button';button.title=returnLabel(language);
 button.setAttribute('aria-label',ARIA_LABELS[String(language||'nl').toLowerCase().split('-')[0]]||ARIA_LABELS.en);
 // The eye uses the same bare header treatment as the original options
 // button. The transparent 45px hit area retains accessible touch/focus.
 button.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>';
 Object.assign(button.style,{position:'fixed',zIndex:'63',display:'grid',placeItems:'center',padding:'0',margin:'0',boxSizing:'border-box',transform:'none',borderRadius:'50%',border:'0',background:'transparent',color:'#476376',boxShadow:'none',touchAction:'manipulation',cursor:'pointer',visibility:'hidden'});
 const position=()=>{
  const back=document.querySelector?.('#app header.top #back');
  const dots=document.querySelector?.('#app .talera-editor-memory-options-toggle');
  const p=buttonPosition(back?.getBoundingClientRect(),dots?.getBoundingClientRect(),{width:window.innerWidth,height:window.innerHeight});
  if(!p){button.style.visibility='hidden';return}
  for(const [key,value] of Object.entries(p))button.style[key]=value+'px';
  // Match the rendered anchors even with editor-specific fixed-position
  // viewport/body offsets (notably WebKit).
  const r=button.getBoundingClientRect?.();
  if(r&&Number.isFinite(r.top)&&Number.isFinite(r.right)&&r.width>0){
   button.style.top=(p.top+(p.top-r.top))+'px';
   button.style.right=(p.right+(r.right-(window.innerWidth-p.right)))+'px';
  }
  button.style.visibility='visible';
 };
 // Header and options may reflow or be recreated by the existing editor.
 // Observe only its original DOM; the eye itself is outside the app.
 let frame=null;
 const schedule=()=>{
  if(frame!==null)return;
  if(typeof window.requestAnimationFrame!=='function'){position();return}
  frame=window.requestAnimationFrame(()=>{frame=null;position()});
 };
 const app=document.getElementById('app');
 const mutations=app&&window.MutationObserver?new window.MutationObserver(schedule):null;
 mutations?.observe(app,{childList:true,subtree:true});
 const layout=app&&window.ResizeObserver?new window.ResizeObserver(schedule):null;
 if(layout){layout.observe(app);const header=document.querySelector?.('#app header.top');if(header)layout.observe(header)}
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('scroll',schedule,{passive:true,capture:true});
 window.visualViewport?.addEventListener('resize',schedule,{passive:true});
 window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
 let pending=false;
 button.addEventListener('click',async()=>{if(pending)return;pending=true;button.disabled=true;try{await onReturn()}finally{pending=false;button.disabled=false}});
 document.body.append(button);position();
 return {button,unmount(){
  window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);
  window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);
  mutations?.disconnect();layout?.disconnect();if(frame!==null)window.cancelAnimationFrame(frame);
  button.remove();
 }};
}

// Only a new draft explicitly created by *this* opening may be pristine.
// Use the editor's actual snapshot() values rather than the DOM, so edits
// via the writer, tags, date, recording, or drag/drop are detected as well.
export function decideEditExit({id,baseline,current,fresh,recording,importing,busy}){
 if(!EDIT_RETURN_ID.test(id||'')||!current||current.existing!==id||recording||importing||busy)return 'blocked';
 if(!fresh||!baseline||baseline.id!==current.id||baseline.existing!==id)return 'preserve';
 // Recognition is derived from the unchanged originals, not a user edit.
 // Only this one machine-owned field is excluded from the dirty decision;
 // the cleanup transaction still compares the entire exact persisted draft.
 const {photoLocationAutomatic:beforeAutomatic,...before}=baseline;
 const {photoLocationAutomatic:afterAutomatic,...after}=current;
 return same(before,after)?'pristine':'preserve';
}

// Local orchestration for the real editor closure. Its adapter is required
// to read current snapshot(), await the existing save/import queue and use
// an atomic library-owned compare-and-remove for a newly created draft.
// This controller never calls mem.save/publish, and never removes an old
// concept or an existing memory; unknown/failed conditions remain editable.
export async function executeEditReturn({context,inspect,flush,confirmPreserve,discardPristine,markReturning,navigate}){
 if(!context||!EDIT_RETURN_ID.test(context.id||''))return 'blocked';
 const inspectDecision=()=>{const v=inspect();return{...v,decision:decideEditExit({...v,id:context.id})}};
 let v=inspectDecision();
 if(v.decision==='blocked')return 'blocked';
 try{
  if(v.decision==='preserve'&&!await confirmPreserve())return 'cancelled';
  await flush();
  const latest=inspectDecision();
  if(latest.decision==='blocked')return 'blocked';
  // A previously untouched edit may have changed while asynchronous imports
  // or writes finished. Do not discard it without a new deliberate choice.
  if(v.decision==='pristine'&&latest.decision==='preserve')return 'changed';
  if(v.decision==='pristine'&&latest.decision==='pristine'&&!await discardPristine(latest.current))return 'conflict';
  // Even if the browser refuses transient navigation metadata after a clean
  // exit, the validated exact-ID route is still the safe fallback.
  try{await markReturning({...context,returning:true,at:Date.now()})}catch{}
  navigate(returnPath(context.id));
  return 'returned';
 }catch{return 'failed'}
}

// Pure plan for the original account-local library's future atomic manifest
// transaction. NEVER touches the published story, its canonical media keys,
// the previous edit draft, or any other draft. Revalidate against the current
// manifest inside the very same readwrite transaction before executing.
export function pristineDraftRemovalPlan(catalog,expected){
 if(!Array.isArray(catalog)||!expected||!DRAFT_ID.test(expected.id||'')||
    !EDIT_RETURN_ID.test(expected.existing||'')||!Array.isArray(expected.media))return null;
 const matches=catalog.filter(g=>g?.id===expected.id);
 if(matches.length!==1||!same(matches[0],expected))return null;
 const survivors=catalog.filter(g=>g?.id!==expected.id);
 if(survivors.some(g=>!g||typeof g.id!=='string'||!Array.isArray(g.media)))return null;
 const shared=new Set(survivors.flatMap(g=>[...(Array.isArray(g?.media)?g.media:[]),g?.voice].filter(Boolean)));
 const ids=[...new Set([...expected.media,expected.voice].filter(Boolean))];
 if(ids.some(id=>typeof id!=='string'||!DRAFT_ID.test(id)))return null;
 // A canonical ID is never a draft key even when the contents agree.
 if(ids.some(id=>Object.values(expected.canonicalByDraft||{}).includes(id)))return null;
 if(ids.some(id=>typeof expected.canonicalByDraft?.[id]!=='string'||!expected.canonicalByDraft[id]))return null;
 return {survivors,keys:ids.filter(id=>!shared.has(id)).flatMap(id=>[PREFIX+id,PREFIX+'preview:'+id])};
}

// Compare all known editable fields with the exact linked published memory.
// A resemblance in title/date/photos, missing attachment or unknown field
// is never sufficient. Unlinked older drafts remain editable.
export function publishedDraftPairs(draft,story){
 const allowed=new Set(['id','title','text','date','media','voice','voiceCues','tags','voiceDurationMs','existing','canonicalByDraft','precision','season','dateSource','dateConfirmed','voiceWave','manualLocation','photoLocations','photoLocationAutomatic']);
 if(!draft||!story||story.id!==draft.existing||story.source!=='pwa-local'||
    Object.keys(draft).some(k=>!allowed.has(k))||
    typeof draft.title!=='string'||typeof draft.text!=='string'||typeof draft.date!=='string'||
    draft.title!==story.title||draft.text!==story.text||draft.date!==story.date||
    !Array.isArray(draft.tags)||!Array.isArray(draft.media)||!Array.isArray(story.items)||
    !same(draft.tags,story.tags??[])||!same(draft.manualLocation??null,story.manualLocation??null)||!draft.canonicalByDraft||
    typeof draft.canonicalByDraft!=='object'||Array.isArray(draft.canonicalByDraft)||
    typeof draft.voice!=='string'||!Array.isArray(draft.voiceCues)||
    !Number.isSafeInteger(draft.voiceDurationMs)||draft.voiceDurationMs<0)return null;
 // The real workbench snapshot also contains date precision and transient
 // input/recording UI fields. Check all durable date semantics and refuse
 // an unknown or nonempty waveform rather than deleting unique draft data.
 if(Object.hasOwn(draft,'precision')?
    !['exact','month','year','season'].includes(draft.precision)||story.datePrecision!==draft.precision:
    story.datePrecision!=null)return null;
 if(Object.hasOwn(draft,'season')?(typeof draft.season!=='string'||draft.season!==(story.seasonLabel||'')):
    !!story.seasonLabel)return null;
 if(Object.hasOwn(draft,'dateSource')&&typeof draft.dateSource!=='string')return null;
 if(Object.hasOwn(draft,'dateConfirmed')&&typeof draft.dateConfirmed!=='boolean')return null;
 if(Object.hasOwn(draft,'voiceWave')&&(!Array.isArray(draft.voiceWave)||draft.voiceWave.length!==0))return null;
 const ids=[...draft.media,...(draft.voice?[draft.voice]:[])];
 if(ids.length!==story.items.length||new Set(ids).size!==ids.length||
    Object.keys(draft.canonicalByDraft).length!==ids.length)return null;
 const changes=draft.photoLocations,automatic=draft.photoLocationAutomatic;
 if(automatic!==undefined&&(!automatic||Array.isArray(automatic)||typeof automatic!=='object'||Object.keys(automatic).some(id=>!draft.media.includes(id))||Object.values(automatic).some(v=>!v||!['known','unknown'].includes(v.state))))return null;
 if(changes!==undefined&&(!changes||Array.isArray(changes)||typeof changes!=='object'||Object.keys(changes).some(id=>!draft.media.includes(id))))return null;
 const pairs=[];
 for(let i=0;i<ids.length;i++){
  const item=story.items[i],draftId=ids[i];
  if(!DRAFT_ID.test(draftId||'')||!item||draft.canonicalByDraft[draftId]!==item.key||
     typeof item.key!=='string'||!Number.isSafeInteger(item.size)||item.size<1||
     typeof item.mime!=='string'||(i<draft.media.length?!['photo','video'].includes(item.kind):item.kind!=='audio'))return null;
  if(automatic&&Object.hasOwn(automatic,draftId)){const v=automatic[draftId];if(v.state==='known'&&!same(v.place,item.capturePlace)||v.state==='unknown'&&!item.capturePlace&&item.capturePlaceChecked!=='v3')return null;}
  if(changes&&Object.hasOwn(changes,draftId)&&!same(changes[draftId],item.manualPhotoLocation??null))return null;
  pairs.push({draft:PREFIX+draftId,original:item.key,size:item.size,mime:item.mime});
 }
 if(draft.voiceDurationMs!==(story.narrationDurationMs??0))return null;
 const mapped=[];
 for(const cue of draft.voiceCues){
  if(!cue||!Number.isSafeInteger(cue.index)||cue.index<0||cue.index>=draft.media.length||
     !Number.isSafeInteger(cue.t)||cue.mediaId!==draft.media[cue.index])return null;
  mapped.push({...cue,mediaId:draft.canonicalByDraft[cue.mediaId]});
 }
 if(!same(mapped,story.narrationCues??[]))return null;
 return pairs;
}

export async function verifyPublishedDraftBytes(pairs,read){
 if(!pairs)return false;
 for(const pair of pairs){
  try{
   const [a,b]=await Promise.all([read(pair.draft),read(pair.original)]);
   if(!(a instanceof Blob)||!(b instanceof Blob)||
      a.size!==pair.size||b.size!==pair.size||a.type!==pair.mime||b.type!==pair.mime)return false;
   const af=a instanceof File,bf=b instanceof File;
   if(af!==bf||(af&&(a.name!==b.name||a.lastModified!==b.lastModified)))return false;
   const chunk=4*1024*1024;
   for(let offset=0;offset<a.size;offset+=chunk){
    const end=Math.min(offset+chunk,a.size);
    const x=new Uint8Array(await a.slice(offset,end).arrayBuffer());
    const y=new Uint8Array(await b.slice(offset,end).arrayBuffer());
    if(x.length!==end-offset||x.length!==y.length)return false;
    for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;
   }
  }catch{return false}
 }
 return true;
}

// The original editor writes this exact non-Blob manifest shape through
// TaleraMemories.draftWriteRows. The original encodeInline() returns a
// non-Blob row unchanged, so no new codec/database/schema is introduced.
// Lock files AND stories together while reading, but never write stories.
// All actual writes occur inside the same IDB callback/transaction.
export function discardPristineDraftAtomically(db,expected,readLogical){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['stories','files'],'readwrite');
  const files=tx.objectStore('files'),stories=tx.objectStore('stories');
  let removed=false,problem=null,stored=null,allStories=null,ready=0;
  const fail=err=>{problem=err;try{tx.abort()}catch{reject(err)}};
  tx.oncomplete=()=>resolve(removed);
  tx.onabort=()=>reject(problem||tx.error||Error('Draft transaction aborted'));
  const reconcile=()=>{
   if(++ready!==2)return;
   try{
    if(!stored||stored.key!==MANIFEST||Object.keys(stored).sort().join(',')!=='blob,key'||!Array.isArray(stored.blob)||!Array.isArray(allStories))return;
    const plan=pristineDraftRemovalPlan(stored.blob,expected);
    if(!plan)return;
    const original=allStories.find(row=>row?.id===expected.existing&&row.source==='pwa-local');
    // Do not leave an editor for a missing or structurally invalid memory.
    if(!original||!Array.isArray(original.items))return;
    const claimed=new Set();
    for(const row of allStories){
     if(!row||!Array.isArray(row.items))return;
     for(const item of row.items){if(!item||typeof item.key!=='string'||!item.key)return;claimed.add(item.key);claimed.add(item.key+':phone-v1')}
    }
    // A malformed legacy record that points into a draft namespace cannot
    // make this action delete the published media it references.
    if(plan.keys.some(key=>claimed.has(key)))return;
    const remove=()=>{
     files.put({key:MANIFEST,blob:plan.survivors});
     for(const key of plan.keys)files.delete(key);
     removed=true;
    };
    if(!readLogical){remove();return}
    // Historical drafts require exact published content, including bytes.
    // The same transaction protects the manifest and all compared originals.
    const pairs=publishedDraftPairs(expected,original);
    if(!pairs)return;
    const read=key=>new Promise((resolve,reject)=>readLogical(files,key,row=>resolve(row?.blob),reject));
    let index=0;
    // Schedule each new pair from a native IDB callback, not from an async
    // continuation where WebKit might mark the transaction inactive.
    const checkNext=()=>{
     if(index===pairs.length){remove();return}
     let settled=false,equal=false;
     verifyPublishedDraftBytes([pairs[index++]],read).then(v=>{equal=v;settled=true},()=>{settled=true});
     const pulse=()=>{
      const ping=files.getKey(MANIFEST);
      ping.onerror=()=>fail(ping.error||Error('Draft comparison interrupted'));
      ping.onsuccess=()=>{
       try{
        if(!settled){pulse();return}
        if(equal&&ping.result===MANIFEST)checkNext();
       }catch(e){fail(e)}
      };
     };
     pulse();
    };
    checkNext();
   }catch(e){fail(e)}
  };
  try{
   const m=files.get(MANIFEST),s=stories.getAll();
   m.onsuccess=()=>{stored=m.result;reconcile()};
   s.onsuccess=()=>{allStories=s.result;reconcile()};
   // IDB request errors are intentionally not prevented: native abort and
   // rollback reject the promise and no partially updated catalog survives.
  }catch(e){fail(e)}
 });
}

// Prepare this patch for the authenticated /tell source *after* the
// existing preserveOriginalMediaIdsOnEdit() adds its draft library API.
// Scope to the one original library script; refuse altered source markers.
export function patchLibraryAtomicCleanup(html,serialized=buildEditReturnBrowserSources()){
 const blocks=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>m[1].includes('talera-memory-store-v1'));
 if(blocks.length!==1)throw Error('EDIT_RETURN_LIBRARY_SCRIPT_DRIFT');
 const block=blocks[0],source=block[2];
 const anchor='window.TaleraMemories={save:save,updateCues:setNarrationCuesForStory,';
 const api='draftReadPayload:readDraftPayload,';
 if(source.split(anchor).length!==2||source.split(api).length!==2||!source.includes('async function readDraftPayload(manifestKey,prefix)')||source.includes('draftDiscardPristineEdit:'))throw Error('EDIT_RETURN_LIBRARY_ANCHOR_DRIFT');
 const cleanupSource=serialized.cleanup;
 const next=source.replace(anchor,()=>cleanupSource+anchor).replace(api,()=>api+'draftDiscardPristineEdit:discardFreshEditConcept,draftDiscardCompletedEdit:discardCompletedEditConcept,');
 return html.slice(0,block.index)+block[0].replace(source,()=>next)+html.slice(block.index+block[0].length);
}

// Existing ordinary frame selector may be called only after exact local ID
// and hydrated canonical frame match. Narrated/video playback remains with
// its own engine; never fall through to the ordinary engine for those.
export function ordinaryReturnFrame(context,memory){
 if(!context||!memory?._taleraLocal||memory.storyId!==context.id||memory._photoLoading||
    !Array.isArray(memory._zeroFrames)||!context.mediaKey||
    memory._zeroItems?.some(x=>x.kind==='audio')||memory._zeroFrames.some(f=>f.kind!=='photo'))return null;
 const index=memory._zeroFrames.findIndex(f=>f.key===context.mediaKey);
 return index>=0?index:null;
}

// Source-guarded pencil hook preparation. Existing click handler already
// validates active local memory and navigates to /tell?edit=<ID>. Preserve
// the exact handler and insert only a scoped capture before that navigation.
export function patchPencilCapture(html,scope,serialized=buildEditReturnBrowserSources()){
 returnStorageKey(scope);
 const marker="location.assign('/tell?edit='+encodeURIComponent(recordId));";
 const scriptStart='<script id="talera-v5-pencil-script">';
 const start=html.indexOf(scriptStart),end=html.indexOf('</script>',start+scriptStart.length);
 if(start<0||end<0||html.split(scriptStart).length!==2)throw Error('PENCIL_SOURCE_DRIFT');
 const script=html.slice(start,end);
 if(script.split(marker).length!==2||!script.includes("pencil.id='talera-v5-editor-pencil';")||!script.includes('rt.currentMemory()'))throw Error('PENCIL_SOURCE_DRIFT');
 const init="pencil.id='talera-v5-editor-pencil';";
 const touchCapture="let taleraEditTouch=null;pencil.addEventListener('pointerdown',()=>{taleraEditTouch={rect:pencil.getBoundingClientRect(),at:Date.now()};},{capture:true,passive:true});";
 const insertion=`try{const rect=taleraEditTouch&&Date.now()-taleraEditTouch.at<1500?taleraEditTouch.rect:pencil.getBoundingClientRect();const capture=(${serialized.capture})({memory:current,rect,viewport:{width:window.innerWidth,height:window.innerHeight},centerMs:rt.centerMs?.()});if(capture)sessionStorage.setItem(${JSON.stringify(returnStorageKey(scope))},JSON.stringify(capture));}catch(_){}\n      `;
 // captureReturnContext uses only this lexical constant and its arguments.
 const bound=insertion.replace('try{const rect=','try{const EDIT_RETURN_ID='+EDIT_RETURN_ID.toString()+';const rect=');
 return html.slice(0,start)+script.replace(init,init+touchCapture).replace(marker,bound+marker)+html.slice(end);
}

// Standalone lexical declarations for the browser script. Construct from
// source functions at build/test time; the actual Worker packaging must
// verify that the serialized browser function names survive its bundler.
function browserReturnCore(editor){
 const shared=`const EDIT_RETURN_ID=${EDIT_RETURN_ID},SCOPE=${SCOPE},MAX_AGE=${MAX_AGE};\n`+[returnStorageKey,readReturnContext].map(fn=>fn.toString()).join('\n')+'\n';
 if(!editor)return shared+ordinaryReturnFrame.toString();
 return shared+`const same=${same.toString()},LABELS=${JSON.stringify(LABELS)},ARIA_LABELS=${JSON.stringify(ARIA_LABELS)};\n`+
 [returnPath,writeReturnContext,buttonPosition,returnLabel,mountReturnButton,decideEditExit,executeEditReturn].map(fn=>fn.toString()).join('\n');
}

// Run by the SAME existing public-assets build before Wrangler bundles the
// Worker; all browser declarations then arrive as immutable strings, so a
// bundler's variable renaming cannot break lexical dependencies.
export function buildEditReturnBrowserSources(){
 const cleanup=`async function discardFreshEditConcept(expected){return discardEditConcept(expected,false);}\nasync function discardCompletedEditConcept(expected){return discardEditConcept(expected,true);}\nasync function discardEditConcept(expected,verify){const db=await open();return (function(){const EDIT_RETURN_ID=${EDIT_RETURN_ID},DRAFT_ID=${DRAFT_ID},PREFIX=${JSON.stringify(PREFIX)},MANIFEST=${JSON.stringify(MANIFEST)};const same=${same.toString()};${pristineDraftRemovalPlan.toString()}\n${publishedDraftPairs.toString()}\n${verifyPublishedDraftBytes.toString()}\n${discardPristineDraftAtomically.toString()}\nreturn discardPristineDraftAtomically(db,expected,verify?taleraPayload.read:null);})();}\n`;
 return Object.freeze({capture:captureReturnContext.toString(),cleanup,editor:browserReturnCore(true),presentation:browserReturnCore(false),editorLibrary:buildEditorLibraryBrowserSources()});
}

// Bind into the ORIGINAL /tell closure, not a second editor or event system.
// The exact original code was read from the pinned anonymous source page.
export function patchEditorReturn(html,scope,serialized=buildEditReturnBrowserSources()){
 returnStorageKey(scope);
 const blocks=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>m[2].includes('const uid=()=>crypto.randomUUID?')&&m[2].includes('async function boot(){')&&m[2].includes('function open(where,id)'));
 if(blocks.length!==1)throw Error('EDIT_RETURN_EDITOR_SCRIPT_DRIFT');
 const block=blocks[0];let source=block[2];
 const exact=(a,b,label)=>{if(source.split(a).length!==2)throw Error('EDIT_RETURN_EDITOR_'+label+'_DRIFT');source=source.replace(a,()=>b)};
 const uid="const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);";
 const openTail="if(view==='start')startView();else if(view==='overview')overview();else workView()}";
 const fresh="groups.push(g);await saveDraft();open('work',g.id);return}}open(groups.length?'overview':'start');";
 if(!source.includes("function busy(a,b){$('busy').hidden=false;")||!source.includes('function snapshot(){return groups.map(')||!source.includes('let taleraZeroSession=null;')||source.includes('const taleraEditReturn='))throw Error('EDIT_RETURN_EDITOR_CONTRACT_DRIFT');
 const bind=`\nconst taleraEditReturn=(()=>{\n${serialized.editor}\nconst scope=${JSON.stringify(scope)};
 const editId=new URLSearchParams(location.search).get('edit');
 let context=null,eye=null,freshId=null,persistedBaseline=null,visibleBaseline=null;
 try{context=readReturnContext(window.sessionStorage,scope,editId)}catch(_){}
 // If session storage is restricted, a same-origin presentation referrer
 // still gives an exact-ID exit; actual measured position is unavailable.
 if((!context||context.returning)&&EDIT_RETURN_ID.test(editId||''))try{
  const ref=new URL(document.referrer);if(ref.origin===location.origin&&ref.pathname==='/present')context={version:1,id:editId,index:0,mediaKey:null,top:116,right:15,width:45,height:45,at:Date.now(),returning:false};
 }catch(_){}
 if(context?.returning)context=null;
 const clone=v=>v?JSON.parse(JSON.stringify(v)):null;
 const selectedSnapshot=()=>clone(snapshot().find(g=>g.id===current));
 const lang=()=>String(document.documentElement.lang||'nl').toLowerCase().split('-')[0];
 const messages={nl:['Dit bewerkconcept bewaren en terugkeren naar de herinnering?','De bewerking kan nu niet veilig worden gesloten. Probeer opnieuw nadat alles is opgeslagen.'],en:['Keep this edit draft and return to the memory?','The edit cannot safely be closed yet. Try again after saving finishes.'],de:['Diesen Entwurf behalten und zur Erinnerung zurückkehren?','Die Bearbeitung kann noch nicht sicher geschlossen werden. Bitte nach dem Speichern erneut versuchen.'],fr:['Conserver ce brouillon et revenir au souvenir ?','La modification ne peut pas encore être fermée en toute sécurité. Réessayez après l’enregistrement.'],es:['¿Guardar este borrador y volver al recuerdo?','Todavía no se puede cerrar la edición de forma segura. Vuelve a intentarlo cuando se guarde.']};
 const inspect=()=>({fresh:!!freshId&&current===freshId,baseline:visibleBaseline,current:view==='work'?selectedSnapshot():null,recording:!!taleraZeroSession||!!(recorder&&recorder.state!=='inactive'),importing:importsPending>0,busy:!$('busy')?.hidden||!!document.getElementById('taleraWriterOverlay')?.getClientRects().length||[...document.querySelectorAll('[role="dialog"]:not([hidden])')].some(el=>el.getClientRects().length)});
 async function close(){
  const app=$('app'),wasInert=app?.hasAttribute('inert');
  // Only the existing editor behind the button is briefly inert. This
  // blocks a second edit/save action while the atomic comparison runs.
  if(app)app.setAttribute('inert','');
  const group=active();let returning=false;
  if(group?.taleraLocationStop){group.taleraLocationPublishing=true;group.taleraLocationStop()}
  try{
   const result=await executeEditReturn({context,inspect,flush:async()=>{await queue;await savingOriginals;await thumbnailQueue;await queue;},
    confirmPreserve:()=>window.confirm((messages[lang()]||messages.nl)[0]),
    discardPristine:async g=>{
     if(g.id!==freshId||!persistedBaseline||typeof mem.draftDiscardPristineEdit!=='function')return false;
     let ok=await mem.draftDiscardPristineEdit(persistedBaseline);
     if(!ok&&!same(persistedBaseline,g))ok=await mem.draftDiscardPristineEdit(g);
     if(ok)groups=groups.filter(row=>row.id!==freshId); // never rewrite other stored drafts
     return ok;
    },markReturning:c=>writeReturnContext(window.sessionStorage,scope,c),navigate:path=>location.replace(path)});
   returning=result==='returned';
   if(result!=='returned'&&result!=='cancelled'){
    if(view==='work'&&!active())open(groups.length?'overview':'start');
    showError((messages[lang()]||messages.nl)[1]);
   }
  }finally{if(group?.taleraLocationStop&&!returning){group.taleraLocationPublishing=false;group.taleraLocationWake?.()}if(app&&!wasInert)app.removeAttribute('inert')}
 }
 return {beforeOpen(g){if(context?.id===g.existing){freshId=g.id;persistedBaseline=clone(snapshot().find(row=>row.id===g.id));}},afterOpen(g){if(freshId===g.id&&context?.id===g.existing)visibleBaseline=selectedSnapshot();},sync(){
  const show=!!context&&view==='work'&&active()?.existing===context.id;
  if(!show&&eye){eye.unmount();eye=null;}
  if(show&&!eye)eye=mountReturnButton({document,window,context,language:lang(),onReturn:close});
 }};
})();\n`;
 exact(uid,uid+bind,'INIT');
 exact(openTail,"if(view==='start')startView();else if(view==='overview')overview();else workView();taleraEditReturn.sync()}",'OPEN');
 exact(fresh,"groups.push(g);await saveDraft();taleraEditReturn.beforeOpen(g);open('work',g.id);taleraEditReturn.afterOpen(g);return}}open(groups.length?'overview':'start');",'FRESH');
 return html.slice(0,block.index)+block[0].replace(block[2],()=>source)+html.slice(block.index+block[0].length);
}

// Restore a hydrated ordinary photo only through the original presentation
// selector, not an alternate player. User input cancels the pending recall.
export function patchPresentationReturn(html,scope,serialized=buildEditReturnBrowserSources()){
 const patched=patchPencilCapture(html,scope,serialized);
 if(patched.split('</body>').length!==2||!patched.includes('__taleraOrdinarySelectPhoto')||!patched.includes('__taleraTimelineRuntime'))throw Error('EDIT_RETURN_PRESENTATION_BRIDGE_DRIFT');
 const script=`<script id="talera-f5-edit-return-frame">(()=>{\n${serialized.presentation}\nconst scope=${JSON.stringify(scope)};const id=new URLSearchParams(location.search).get('memory');let ctx;try{ctx=readReturnContext(sessionStorage,scope,id)}catch(_){}if(!ctx?.returning)return;
 let timer=null,done=false;const start=Date.now();
 function stop(){if(done)return;done=true;clearTimeout(timer);document.removeEventListener('pointerdown',stop,true);document.removeEventListener('talera:timeline-user-motion',stop);try{sessionStorage.removeItem(returnStorageKey(scope))}catch(_){}}
 function restore(){if(done)return;const rt=window.__taleraTimelineRuntime,memory=rt?.currentMemory?.();
  if(memory?.storyId===id&&!memory._photoLoading&&Array.isArray(memory._zeroFrames)&&(!ctx.mediaKey||memory._zeroFrames.length>0)&&typeof window.__taleraOrdinarySelectPhoto==='function'){
   const index=ordinaryReturnFrame(ctx,memory);stop();if(index!==null&&memory._photoIndex!==index)window.__taleraOrdinarySelectPhoto(memory.id,index,false);return;
  }if(Date.now()-start>10000){stop();return;}timer=setTimeout(restore,50);
 }
 document.addEventListener('pointerdown',stop,true);document.addEventListener('talera:timeline-user-motion',stop);window.addEventListener('pagehide',stop,{once:true});restore();
})();</script>`;
 return patched.replace('</body>',()=>script+'</body>');
}

// Local Worker integration candidate: only authenticated original /tell and
// /present; all Home/guest/shared routes and the original query allowlist stay.
export function patchAuthenticatedEditReturn(html,pathname,scope,serialized){
 if(pathname==='/tell')return patchEditorReturn(patchLibraryAtomicCleanup(html,serialized),scope,serialized);
 if(pathname==='/present')return patchPresentationReturn(html,scope,serialized);
 return html;
}

// Generate the minimal future shared Worker integration from the actual
// checked source. The caller must not push this while desktop is active.
export function patchWorkerSource(source){
 const exact=(a,b,label)=>{if(source.split(a).length!==2)throw Error('EDIT_RETURN_WORKER_'+label+'_DRIFT');source=source.replace(a,()=>b)};
 const oldImport="import {muteEditorOnlyVideo} from './f5-editor-video-mute-guard.mjs';";
 exact(oldImport,oldImport+"\nimport {patchAuthenticatedEditReturn} from './f5-edit-return.mjs';\nimport {editReturnBrowserSources} from './generated/f5-edit-return-browser.mjs';",'IMPORT');
 const oldScope='let scoped=scopeLocalMemories(privateHtml,await privateAccountScope(actor.id));';
 exact(oldScope,'const editReturnAccountScope=await privateAccountScope(actor.id);\n    let scoped=scopeLocalMemories(privateHtml,editReturnAccountScope);','ACCOUNT_SCOPE');
 const oldTiming='const threeTabHome=homeScreen?evenlySpaceThreeHomeTabs(silenced):silenced;';
 exact(oldTiming,'const editReturnHtml=patchAuthenticatedEditReturn(silenced,pathname,editReturnAccountScope,editReturnBrowserSources);\n    const threeTabHome=homeScreen?evenlySpaceThreeHomeTabs(editReturnHtml):editReturnHtml;','AUTHENTICATED_ROUTE');
 return source;
}

// One generated constant module in the existing build output (not a new
// app or runtime), generated by the product's normal asset bundling step.
export function patchPublicAssetsSource(source){
 const exact=(a,b,label)=>{if(source.split(a).length!==2)throw Error('EDIT_RETURN_ASSETS_'+label+'_DRIFT');source=source.replace(a,()=>b)};
 const oldImport="import {buildF5OfflineServiceWorker} from './f5-offline-sw.mjs';";
 exact(oldImport,oldImport+"\nimport {buildEditReturnBrowserSources} from './f5-edit-return.mjs';",'IMPORT');
 const oldWrite="writeFileSync(path.join(generated,'public-template-map.mjs'),";
 exact(oldWrite,"writeFileSync(path.join(generated,'f5-edit-return-browser.mjs'),'// Generated with the same TALERA build.\\nexport const editReturnBrowserSources=Object.freeze('+JSON.stringify(buildEditReturnBrowserSources())+');\\n');\n"+oldWrite,'BUILD');
 // The existing offline package version already fingerprints Worker code.
 // Include this new module too, so ordinary future feature fixes invalidate
 // only the existing protected offline shell, not the storage schema.
 const oldDigest="readFileSync(path.join(here,'f5-worker.mjs')),";
 exact(oldDigest,oldDigest+"\n   readFileSync(path.join(here,'f5-edit-return.mjs')) ,",'OFFLINE_DIGEST');
 return source;
}
