import assert from 'node:assert/strict';
import test from 'node:test';
import {captureReturnContext,readReturnContext,writeReturnContext,returnPath,returnStorageKey,buttonPosition,returnLabel,decideEditExit,executeEditReturn,pristineDraftRemovalPlan,discardPristineDraftAtomically,patchLibraryAtomicCleanup,ordinaryReturnFrame,patchPencilCapture,mountReturnButton,patchEditorReturn,patchAuthenticatedEditReturn,patchPresentationReturn,patchWorkerSource,buildEditReturnBrowserSources,patchPublicAssetsSource} from './f5-edit-return.mjs';
const scope='a'.repeat(64),other='b'.repeat(64),id='local-memory-12345678',id2='local-memory-87654321';
const memory={_taleraLocal:true,storyId:id,_photoIndex:1,_zeroFrames:[{kind:'photo',key:'original-one'},{kind:'photo',key:'original-two'}]};
const context=captureReturnContext({memory,rect:{top:124,right:375,width:45,height:45},viewport:{width:390,height:844},centerMs:123456,now:100});
const draft={id:'draft-12345678',existing:id,title:'Oorspronkelijke titel',text:'verhaal',date:'2025-01-01',media:['draft-photo-1','draft-photo-2'],voice:'draft-voice-1',voiceCues:[{t:0,index:0,mediaId:'draft-photo-1'}],tags:['Familie'],canonicalByDraft:{'draft-photo-1':'original-a','draft-photo-2':'original-b','draft-voice-1':'original-audio'}};
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};

test('same ID route, no new query parameter, no redirect supplied by the caller',()=>{
 assert.equal(returnPath(id),'/present?memory='+id);
 for(const bad of ['https://other.test','local-abc?redirect=evil','local-ab','../tell'])assert.throws(()=>returnPath(bad));
});
test('capture actual pencil position, exact memory and exact canonical photo',()=>{
 assert.equal(context.id,id);assert.equal(context.index,1);assert.equal(context.mediaKey,'original-two');assert.equal(context.centerMs,123456);
 assert.equal(captureReturnContext({memory:{...memory,_taleraLocal:false},rect:{},viewport:{}}),null);
});
const backRect={left:15,top:65,width:82,height:42},dotsRect={left:330,top:115,width:44,height:44};
const viewport={width:390,height:844};
const headerAnchor=(selector)=>selector.includes('#back')?{getBoundingClientRect:()=>backRect}:
 selector.includes('options-toggle')?{getBoundingClientRect:()=>dotsRect}:null;
test('editor eye uses actual header row and dots column, not the old pencil position',()=>{
 assert.deepEqual(buttonPosition(backRect,dotsRect,viewport),{width:45,height:45,top:63.5,right:15.5});
 assert.deepEqual(buttonPosition({...backRect,top:10},{...dotsRect,left:1040,top:80},{width:1200,height:800}),{width:45,height:45,top:8.5,right:115.5});
 assert.equal(buttonPosition(null,dotsRect,viewport),null);assert.equal(buttonPosition(backRect,null,viewport),null);
 assert.equal(buttonPosition(backRect,{...dotsRect,top:70},viewport),null);
 assert.equal(buttonPosition({...backRect,top:-50},dotsRect,viewport),null);
});
test('transient state is account scoped, rejects wrong ID, malformed and stale values',()=>{
 const s=storage();assert(writeReturnContext(s,scope,context));assert.deepEqual(readReturnContext(s,scope,id,101),context);
 assert.equal(readReturnContext(s,other,id,101),null);assert.equal(readReturnContext(s,scope,id2,101),null);
 assert.equal(readReturnContext(s,scope,id,30*60*1000+101),null);assert.equal(readReturnContext(s,scope,id,99),null);
 s.setItem(returnStorageKey(scope),'{invalid');assert.equal(readReturnContext(s,scope,id,101),null);
});
test('fresh unchanged exits, existing draft and every meaningful edited field preserve',()=>{
 const base={id,baseline:draft,current:structuredClone(draft),fresh:true};
 assert.equal(decideEditExit(base),'pristine');assert.equal(decideEditExit({...base,fresh:false}),'preserve');
 for(const change of [{title:'nieuw'},{text:'gewijzigd'},{date:'2025-01-02'},{media:[...draft.media].reverse()},{voice:'new-voice'},{voiceCues:[]},{tags:[]}])
  assert.equal(decideEditExit({...base,current:{...draft,...change}}),'preserve');
 for(const gate of ['recording','importing','busy'])assert.equal(decideEditExit({...base,[gate]:true}),'blocked');
 assert.equal(decideEditExit({...base,current:{...draft,existing:id2}}),'blocked');
});
test('background location recognition never dirties an unchanged edit; manual edits never disappear',()=>{
 const base={id,baseline:draft,current:draft,fresh:true};
 const automatic={ [draft.media[0]]:{state:'unknown'} };
 assert.equal(decideEditExit({...base,current:{...draft,photoLocationAutomatic:automatic}}),'pristine');
 assert.equal(decideEditExit({...base,current:{...draft,photoLocationAutomatic:automatic,photoLocations:{[draft.media[0]]:{countryCode:'NL',city:'Eindhoven',mode:'fill'}}}}),'preserve');
 const changed={...draft,photoLocationAutomatic:automatic};
 assert.equal(pristineDraftRemovalPlan([changed],draft),null);
 assert.ok(pristineDraftRemovalPlan([changed],changed));
});
test('atomic cleanup PLAN touches only a pristine newly created draft and unshared draft keys',()=>{
 const survivor={id:'draft-87654321',existing:id2,media:['draft-photo-2'],voice:''};
 const original=structuredClone([draft,survivor]);const plan=pristineDraftRemovalPlan(original,draft);
 assert.deepEqual(plan.survivors,[survivor]);assert.deepEqual(original,[draft,survivor]);
 assert.deepEqual(plan.keys,['talera-v4-work:draft-photo-1','talera-v4-work:preview:draft-photo-1','talera-v4-work:draft-voice-1','talera-v4-work:preview:draft-voice-1']);
 assert.equal(pristineDraftRemovalPlan([{...draft,text:'another tab edited'}],draft),null);
 assert.equal(pristineDraftRemovalPlan([draft,draft],draft),null);
 const corrupted={...draft,media:['original-a']};assert.equal(pristineDraftRemovalPlan([corrupted],corrupted),null);
});

// Technical transaction test-double: requests queue within one transaction;
// abort rolls back ALL writes. This is not a browser or real-user-IDB test.
function transactionLibrary({catalog=[draft],published,failDelete=false}={}){
 const manifest='talera-v4-work:manifest';
 const originals=published||[{id,source:'pwa-local',title:'Original',items:[{key:'original-a'},{key:'original-b'},{key:'original-audio'}]},
 {id:id2,source:'pwa-local',items:[{key:'another-original'}]}];
 const files=new Map([[manifest,{key:manifest,blob:structuredClone(catalog)}],...['original-a','original-b','original-audio','another-original',...draft.media.map(p=>'talera-v4-work:'+p),'talera-v4-work:draft-voice-1','talera-v4-work:preview:draft-photo-1'].map(key=>[key,{key,blob:'bytes:'+key}])]);
 const writes=[];let transactions=0;
 const db={transaction(names,mode){
  transactions++;assert.deepEqual(names,['stories','files']);assert.equal(mode,'readwrite');
  const staged=new Map(structuredClone([...files]));let pending=0,aborted=false,finished=false;
  const tx={abort(){if(aborted||finished)return;aborted=true;queueMicrotask(()=>tx.onabort?.())},objectStore(name){
   const request=fn=>{const req={};pending++;queueMicrotask(()=>{if(aborted)return;try{req.result=structuredClone(fn());req.onsuccess?.()}catch(error){tx.error=error;tx.abort()}finally{pending--;if(!pending&&!aborted&&!finished){finished=true;files.clear();for(const [k,v] of staged)files.set(k,v);tx.oncomplete?.()}}});return req};
   if(name==='stories')return {getAll:()=>request(()=>originals)};
   assert.equal(name,'files');return {get:key=>request(()=>staged.get(key)),put:row=>request(()=>{writes.push(['put',row.key]);staged.set(row.key,row)}),delete:key=>request(()=>{writes.push(['delete',key]);if(failDelete)throw Error('simulated delete failure');staged.delete(key)})};
  }};return tx;
 }};
 return {db,files,writes,manifest,originals,get transactions(){return transactions}};
}
test('real transaction adapter only removes verified temporary manifest and draft keys',async()=>{
 const otherDraft={id:'draft-other-123456',existing:id2,media:['draft-photo-2'],voice:''};
 const lib=transactionLibrary({catalog:[draft,otherDraft]});const originalRows=structuredClone(lib.originals);
 const before=structuredClone([...lib.files]);assert.equal(await discardPristineDraftAtomically(lib.db,draft),true);
 assert.equal(lib.transactions,1);assert.deepEqual(lib.files.get(lib.manifest).blob,[otherDraft]);
 assert.deepEqual(lib.originals,originalRows);
 for(const [key,row] of before.filter(([key])=>!key.startsWith('talera-v4-work:')||key==='talera-v4-work:draft-photo-2'))assert.deepEqual(lib.files.get(key),row);
 assert.equal(lib.files.has('talera-v4-work:draft-photo-1'),false);assert.equal(lib.files.has('talera-v4-work:preview:draft-photo-1'),false);
 assert.equal(lib.writes.some(([_,key])=>!key.startsWith('talera-v4-work:')),false);
});
test('atomic adapter refuses another-tab edits, malformed published aliases and missing original',async()=>{
 for(const lib of [transactionLibrary({catalog:[{...draft,title:'other tab edited'}]}),transactionLibrary({published:[{id,source:'pwa-local',items:[{key:'talera-v4-work:draft-photo-1'}]}]}),transactionLibrary({published:[]})]){
  const before=structuredClone([...lib.files]);assert.equal(await discardPristineDraftAtomically(lib.db,draft),false);assert.deepEqual([...lib.files],before);assert.deepEqual(lib.writes,[]);
 }
});
test('atomic adapter rolls back manifest and every media row on request failure',async()=>{
 const lib=transactionLibrary({failDelete:true}),before=structuredClone([...lib.files]);
 await assert.rejects(discardPristineDraftAtomically(lib.db,draft),/simulated delete failure/);assert.deepEqual([...lib.files],before);
});
test('library patch preserves the verified source anchors and has a valid callback body',()=>{
 const html='<script id="talera-memory-store-v1">(()=>{async function open(){};async function readDraftPayload(manifestKey,prefix){};window.TaleraMemories={save:save,updateCues:setNarrationCuesForStory,draftReadPayload:readDraftPayload,};})();</script>';
 const patched=patchLibraryAtomicCleanup(html);assert.match(patched,/draftDiscardPristineEdit:discardFreshEditConcept/);
 assert.doesNotThrow(()=>new Function(patched.slice(patched.indexOf('>')+1,patched.indexOf('</script>'))));
 assert.throws(()=>patchLibraryAtomicCleanup(patched));assert.throws(()=>patchLibraryAtomicCleanup(html.replace('readDraftPayload(manifestKey,prefix)','readDraftPayload(foo,bar)')));
});
test('clean exit waits for existing queue, removes only fresh draft, returns exact ID without publish',async()=>{
 const calls=[];const result=await executeEditReturn({context,inspect:()=>({baseline:draft,current:draft,fresh:true}),flush:async()=>calls.push('flush'),confirmPreserve:()=>{throw Error('No confirmation for untouched draft')},discardPristine:async g=>{assert.equal(g,draft);calls.push('discard');return true},markReturning:async c=>{assert.equal(c.id,id);assert.equal(c.returning,true);calls.push('mark')},navigate:url=>calls.push(url)});
 assert.equal(result,'returned');assert.deepEqual(calls,['flush','discard','mark',returnPath(id)]);
});
test('changed or older draft is retained, failed or cancelled operations never navigate',async()=>{
 const calls=[];let fresh=false,current=draft,confirmed=false,conflict=false,changeOnFlush=false;
 const adapter={context,inspect:()=>({baseline:draft,current,fresh}),flush:async()=>{calls.push('flush');if(changeOnFlush)current={...draft,text:'changed while waiting'}},confirmPreserve:()=>confirmed,discardPristine:async()=>{calls.push('discard');return !conflict},markReturning:async()=>calls.push('mark'),navigate:url=>calls.push(url)};
 assert.equal(await executeEditReturn(adapter),'cancelled');assert.deepEqual(calls,[]);
 confirmed=true;assert.equal(await executeEditReturn(adapter),'returned');assert.deepEqual(calls,['flush','mark',returnPath(id)]);
 calls.length=0;fresh=true;conflict=true;assert.equal(await executeEditReturn(adapter),'conflict');assert.deepEqual(calls,['flush','discard']);
 calls.length=0;conflict=false;changeOnFlush=true;assert.equal(await executeEditReturn(adapter),'changed');assert.deepEqual(calls,['flush']);
 current=draft;calls.length=0;assert.equal(await executeEditReturn({...adapter,flush:async()=>{throw Error('storage unavailable')}}),'failed');assert.deepEqual(calls,[]);
});
test('never select wrong memory, unhydrated frame, narrator or video through ordinary engine',()=>{
 assert.equal(ordinaryReturnFrame(context,memory),1);
 assert.equal(ordinaryReturnFrame(context,{...memory,storyId:id2}),null);
 assert.equal(ordinaryReturnFrame(context,{...memory,_photoLoading:true}),null);
 assert.equal(ordinaryReturnFrame(context,{...memory,_zeroItems:[{kind:'audio'}]}),null);
 assert.equal(ordinaryReturnFrame(context,{...memory,_zeroFrames:[{kind:'video',key:'original-two'}]}),null);
 assert.equal(ordinaryReturnFrame(context,{...memory,_zeroFrames:[memory._zeroFrames[1],memory._zeroFrames[0]]}),0);
});
test('five localized names, real eye button dimensions and one click until settled',async()=>{
 assert.equal(new Set(['nl','en','de','fr','es'].map(returnLabel)).size,5);
 const callbacks={};const el={style:{},setAttribute(k,v){this[k]=v},addEventListener(k,v){callbacks[k]=v},remove(){this.removed=true}};
 let mounted=null;const doc={getElementById(){return mounted},querySelector:headerAnchor,createElement(){return el},body:{append(n){mounted=n}}};
 const w={innerWidth:390,innerHeight:844,addEventListener(){},removeEventListener(){}};
 let release,count=0;const eye=mountReturnButton({document:doc,window:w,context,language:'nl',onReturn:()=>{count++;return new Promise(r=>release=r)}});
 assert.equal(el['aria-label'],returnLabel('nl'));assert.equal(el.style.top,'63.5px');assert.equal(el.style.right,'15.5px');assert.equal(el.style.background,'transparent');assert.equal(el.style.border,'0');assert.equal(el.style.boxShadow,'none');assert.equal(el.style.visibility,'visible');assert.equal(el.style.width,'45px');assert.match(el.innerHTML,/<svg/);
 const first=callbacks.click();await callbacks.click();assert.equal(count,1);release();await first;assert.equal(el.disabled,false);
 assert.throws(()=>mountReturnButton({document:doc,window:w,context,language:'nl',onReturn:()=>{}}));eye.unmount();assert.equal(el.removed,true);
});
test('measured eye position cancels the editor-specific WebKit viewport offset',()=>{
 const el={style:{},setAttribute(){},addEventListener(){},getBoundingClientRect(){return {top:parseFloat(this.style.top)-26.5,right:390-parseFloat(this.style.right),width:45}},remove(){}};
 const doc={getElementById(){return null},querySelector:headerAnchor,createElement(){return el},body:{append(){}}};
 const w={innerWidth:390,innerHeight:844,addEventListener(){},removeEventListener(){}};
 mountReturnButton({document:doc,window:w,context,language:'nl',onReturn:()=>{}});
 assert.equal(el.getBoundingClientRect().top,63.5);
 assert.equal(el.getBoundingClientRect().right,374.5);
});
test('pencil preparation targets observed original click source and refuses drift',()=>{
 const original=`<script id="talera-v5-pencil-script">(()=>{const rt=window.__taleraTimelineRuntime;const pencil=document.createElement('button');pencil.id='talera-v5-editor-pencil';pencil.addEventListener('click',()=>{const current=rt.currentMemory();const recordId=current.storyId;if(!recordId)return;location.assign('/tell?edit='+encodeURIComponent(recordId));});})();</script>`;
 const edited=patchPencilCapture(original,scope);
 assert.equal(edited.split("location.assign('/tell?edit='+encodeURIComponent(recordId));").length,2);
 assert.match(edited,/sessionStorage\.setItem/);assert.match(edited,/talera-free-edit-return-a{32}/);
 assert.doesNotThrow(()=>new Function(edited.slice(edited.indexOf('>')+1,edited.indexOf('</script>'))));
 assert.throws(()=>patchPencilCapture(original.replace('rt.currentMemory()','rt.other()'),scope));
 assert.throws(()=>patchPencilCapture(original+original,scope));
});

// Source-contract fixture executes the original observed anchors plus the
// injected controller. Not a demo app: this is a headless Node harness.
const editorFixture=`<script>(function(){
const $=id=>document.getElementById(id),mem=window.mem;
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);
let groups=window.initialGroups,view='start',current='',recorder=null,importsPending=0,queue=Promise.resolve(),savingOriginals=Promise.resolve(),thumbnailQueue=Promise.resolve();
let taleraZeroSession=null;
const active=()=>groups.find(g=>g.id===current);
function snapshot(){return groups.map(g=>({...g}))}
function saveDraft(){window.saved=structuredClone(snapshot());return queue}
function busy(a,b){$('busy').hidden=false;}
function clearBusy(){$('busy').hidden=true}
function showError(s){window.errors.push(s)}
function startView(){}function overview(){}function workView(){}
function open(where,id){view=where;if(id)current=id;if(view==='start')startView();else if(view==='overview')overview();else workView()}
async function boot(){busy('open');try{const row=window.original;if(row){if(groups){const draft=groups.find(g=>g.existing===row.existing);if(draft){open('work',draft.id);return}const g=structuredClone(row);groups.push(g);await saveDraft();open('work',g.id);return}}open(groups.length?'overview':'start');}finally{clearBusy()}}
window.boot=boot();window.editMock=title=>{active().title=title;saveDraft()};window.editView=()=>open('overview');window.importMock=value=>{importsPending=value};
})();</script>`;
async function runEditorFixture({prior=false,fromPencil=true,allow=true}={}){
 const source=patchEditorReturn(editorFixture,scope),s=storage(),nav=[],discard=[],errors=[],confirm=[];const buttons=new Map(),events={};
 const attrs=new Set();const app={hasAttribute:k=>attrs.has(k),setAttribute:k=>attrs.add(k),removeAttribute:k=>attrs.delete(k)};const busy={hidden:true};
 const doc={referrer:fromPencil?'https://talera.test/present':'https://talera.test/mijn-leven',documentElement:{lang:'nl'},getElementById:k=>k==='app'?app:k==='busy'?busy:buttons.get(k)||null,querySelector:headerAnchor,querySelectorAll:()=>[],createElement:()=>({style:{},setAttribute(k,v){this[k]=v},addEventListener(k,v){events[k]=v},remove(){buttons.delete(this.id)}}),body:{append(el){buttons.set(el.id,el)}}};
 const ctx={...context,at:Date.now()};if(fromPencil)writeReturnContext(s,scope,ctx);
 const window={sessionStorage:s,initialGroups:prior?[structuredClone(draft)]:[],original:structuredClone(draft),errors,innerWidth:390,innerHeight:844,addEventListener(){},removeEventListener(){},confirm:t=>{confirm.push(t);return allow},mem:{draftDiscardPristineEdit:async g=>{discard.push(g);return true}}};
 const location={search:'?edit='+id,origin:'https://talera.test',replace:path=>nav.push(path)};
 const js=source.slice(source.indexOf('>')+1,source.indexOf('</script>'));
 new Function('window','document','location','URLSearchParams','crypto','structuredClone',js)(window,doc,location,URLSearchParams,globalThis.crypto,structuredClone);await window.boot;
 return {window,nav,discard,errors,confirm,buttons,events,attrs,s};
}
test('editor source binding mounts eye only for pencil entry; no-op exits directly and retains unrelated originals',async()=>{
 const f=await runEditorFixture();assert.equal(f.buttons.size,1);assert.equal(f.buttons.values().next().value.style.top,'63.5px');
 await f.events.click();assert.deepEqual(f.nav,[returnPath(id)]);assert.equal(f.confirm.length,0);assert.equal(f.discard.length,1);assert.deepEqual(f.discard[0],draft);assert.equal(f.attrs.has('inert'),false);
 assert.equal(readReturnContext(f.s,scope,id)?.returning,true);
 const fromHome=await runEditorFixture({fromPencil:false});assert.equal(fromHome.buttons.size,0);assert.deepEqual(fromHome.nav,[]);
});
test('editor integration retains previous/changed draft, blocks import and removes eye outside work view',async()=>{
 const old=await runEditorFixture({prior:true,allow:false});await old.events.click();assert.equal(old.confirm.length,1);assert.deepEqual(old.nav,[]);assert.deepEqual(old.discard,[]);
 const changed=await runEditorFixture();changed.window.editMock('changed title');await changed.events.click();assert.equal(changed.confirm.length,1);assert.deepEqual(changed.discard,[]);assert.deepEqual(changed.nav,[returnPath(id)]);
 const busy=await runEditorFixture();busy.window.importMock(1);await busy.events.click();assert.deepEqual(busy.nav,[]);assert.deepEqual(busy.discard,[]);assert.equal(busy.errors.length,1);busy.window.editView();assert.equal(busy.buttons.size,0);
});
test('presentation restoration invokes original selector only for matched current canonical photo and consumes context',()=>{
 const original=`<script id="talera-v5-pencil-script">(()=>{const rt=window.__taleraTimelineRuntime;const pencil=document.createElement('button');pencil.id='talera-v5-editor-pencil';pencil.addEventListener('click',()=>{const current=rt.currentMemory();const recordId=current.storyId;if(!recordId)return;location.assign('/tell?edit='+encodeURIComponent(recordId));});})();</script><script>window.__taleraOrdinarySelectPhoto=()=>{};</script></body>`;
 const patched=patchPresentationReturn(original,scope);const marker='<script id="talera-f5-edit-return-frame">';const start=patched.indexOf(marker)+marker.length,js=patched.slice(start,patched.indexOf('</script>',start));
 const s=storage();writeReturnContext(s,scope,{...context,at:Date.now(),returning:true});const calls=[];const window={__taleraTimelineRuntime:{currentMemory:()=>({...memory,id:'runtime-id',_photoIndex:0})},__taleraOrdinarySelectPhoto:(...a)=>calls.push(a),addEventListener(){}};
 const document={addEventListener(){},removeEventListener(){}};const location={search:'?memory='+id};const run=new Function('window','document','location','sessionStorage',js);run(window,document,location,s);assert.deepEqual(calls,[['runtime-id',1,false]]);assert.equal(readReturnContext(s,scope,id),null);run(window,document,location,s);assert.equal(calls.length,1);
});
test('worker route integration remains strictly authenticated and preserves all other pages',()=>{
 assert.equal(patchAuthenticatedEditReturn('unchanged','/mijn-leven',scope),'unchanged');assert.equal(patchAuthenticatedEditReturn('unchanged','/shared',scope),'unchanged');
 const worker="import {muteEditorOnlyVideo} from './f5-editor-video-mute-guard.mjs';\nlet scoped=scopeLocalMemories(privateHtml,await privateAccountScope(actor.id));\nconst threeTabHome=homeScreen?evenlySpaceThreeHomeTabs(silenced):silenced;";
 const patched=patchWorkerSource(worker);assert.match(patched,/patchAuthenticatedEditReturn\(silenced,pathname,editReturnAccountScope,editReturnBrowserSources\)/);assert.throws(()=>patchWorkerSource(worker.replace('const threeTabHome','const wrong')));
 assert.throws(()=>patchEditorReturn(editorFixture.replace('async function boot()','async function bootChanged()'),scope));
});
test('base build produces stable lexical browser code before Worker bundling',()=>{
 const sources=JSON.parse(JSON.stringify(buildEditReturnBrowserSources()));
 assert.equal(patchEditorReturn(editorFixture,scope,sources),patchEditorReturn(editorFixture,scope));
 assert.doesNotMatch(sources.presentation,/mountReturnButton/);assert.doesNotMatch(sources.capture,/<\/script>/);
 const assets="import {buildF5OfflineServiceWorker} from './f5-offline-sw.mjs';\n[readFileSync(path.join(here,'f5-worker.mjs')),];\nwriteFileSync(path.join(generated,'public-template-map.mjs'),'x');";
 const patched=patchPublicAssetsSource(assets);assert.match(patched,/f5-edit-return-browser\.mjs/);assert.match(patched,/JSON.stringify\(buildEditReturnBrowserSources\(\)\)/);assert.match(patched,/readFileSync\(path.join\(here,'f5-edit-return.mjs'\)\)/);assert.throws(()=>patchPublicAssetsSource(assets.replace('public-template-map','other')));
});

import {publishedDraftPairs,verifyPublishedDraftBytes} from './f5-edit-return.mjs';
import {savedDraftReceipt,writeSavedDraftReceipt,readEditorDraftPayload} from './f5-library-editor-stable-save.mjs';
import {retainEditorCanonicalMediaIds} from './f5-editor-canonical-refs.mjs';
import {restoreEditorVideoCover} from './f5-editor-video-mute-guard.mjs';

const completedDraft={...draft,voiceDurationMs:2000,precision:'exact',season:'',dateSource:'photo',dateConfirmed:true,voiceWave:[]};
const completedStory={id,source:'pwa-local',title:draft.title,text:draft.text,date:draft.date,tags:draft.tags,datePrecision:'exact',seasonLabel:null,
 items:[{key:'original-a',kind:'photo',mime:'image/png',size:3},{key:'original-b',kind:'video',mime:'video/mp4',size:3},
 {key:'original-audio',kind:'audio',mime:'audio/wav',size:3}],
 narrationCues:[{t:0,index:0,mediaId:'original-a'}],narrationDurationMs:2000};
test('completed draft proof compares all editable fields, exact ID order and canonical cue IDs',()=>{
 const pairs=publishedDraftPairs(completedDraft,completedStory);
 assert.equal(pairs.length,3);
 for(const change of [
  {existing:''},{existing:id2},{title:'unsaved title'},{text:'unsaved text'},
  {date:'2025-02-01'},{tags:[]},{media:[...draft.media].reverse()},{voice:''},
  {voiceCues:[]},{precision:'year'},{season:'lente'},{dateConfirmed:'true'},{voiceWave:[.5]},{voiceDurationMs:1999},{canonicalByDraft:null},{futureEditableField:'unknown'}
 ])assert.equal(publishedDraftPairs({...completedDraft,...change},completedStory),null);
 assert.equal(publishedDraftPairs(completedDraft,{...completedStory,narrationCues:[{t:1,index:0,mediaId:'original-a'}]}),null);
});
test('completed concept retains reasoned photo recognition and safely handles older negative markers',()=>{
 const photoId=completedDraft.media[0];
 for(const reason of ['no-readable-gps','no-place']){
  const draft={...completedDraft,photoLocationAutomatic:{[photoId]:{state:'unknown',reason}}};
  const story=structuredClone(completedStory);story.items[0].capturePlaceChecked='v4-'+reason;
  assert.equal(publishedDraftPairs(draft,story)?.length,3);
  story.items[0].capturePlaceChecked='v3';assert.equal(publishedDraftPairs(draft,story),null);
 }
 const legacy={...completedDraft,photoLocationAutomatic:{[photoId]:{state:'unknown'}}},story=structuredClone(completedStory);
 story.items[0].capturePlaceChecked='v3';assert.equal(publishedDraftPairs(legacy,story)?.length,3);
 story.items[0].capturePlace={countryCode:'NL',city:'Boxtel'};
 assert.equal(publishedDraftPairs({...legacy,photoLocationAutomatic:{[photoId]:{state:'unknown',reason:'invalid'}}},story),null);
});
test('verified content compares full bytes and metadata; absent or changed media keeps concept',async()=>{
 const pairs=publishedDraftPairs(completedDraft,completedStory);
 const rows=new Map();
 for(const pair of pairs){
  const f=new File([Uint8Array.of(1,2,3)],pair.original,{type:pair.mime,lastModified:123});
  rows.set(pair.draft,f);rows.set(pair.original,f);
 }
 assert.equal(await verifyPublishedDraftBytes(pairs,k=>rows.get(k)),true);
 const key=pairs[1].draft,original=rows.get(key);
 for(const changed of [
  undefined,new File([Uint8Array.of(1,2,4)],original.name,{type:original.type,lastModified:original.lastModified}),
  new File([original],'different-name',{type:original.type,lastModified:original.lastModified})
 ]){rows.set(key,changed);assert.equal(await verifyPublishedDraftBytes(pairs,k=>rows.get(k)),false)}
});
test('saved-draft receipt binds a newly placed draft to the real stored story without deleting metadata or other concepts',()=>{
 const fresh={...completedDraft,existing:'',canonicalByDraft:null};
 const other={id:'draft-other-123456',existing:'',media:[]};
 const catalog=[fresh,other],result=savedDraftReceipt(catalog,fresh,completedStory,completedStory.items);
 assert.deepEqual(result,[completedDraft,other]);
 assert.equal(catalog[0].existing,'');
 assert.equal(savedDraftReceipt([{...fresh,title:'concurrent edit'},other],fresh,completedStory,completedStory.items),null);
 assert.equal(savedDraftReceipt(catalog,fresh,completedStory,[...completedStory.items].reverse()),null);
 assert.equal(savedDraftReceipt(catalog,fresh,completedStory,completedStory.items.slice(0,2)),null);
});
test('reopening mixed photo/video uses the existing poster under the exact canonical video ID',async()=>{
 const source=`talera-memory-store-v1
const file=new File([f],it.name||'herinnering',{type:it.mime||f.type}),id=uid();
if(entries.length)await writeFiles(entries);entries.forEach(([id,f])=>assets.set(id,f));
voiceDurationMs:g.voiceDurationMs||0,existing:g.existing||''}))`;
 const changed=retainEditorCanonicalMediaIds(source);
 const injected=changed.slice(changed.indexOf('if(g.existing)'),changed.indexOf('voiceDurationMs:'));
 const run=new Function('g','row','entries','writeFiles','assets','mem','previewBlobs','Image','return (async()=>{'+injected+'})()');
 const photo=new File(['photo'],'photo.png',{type:'image/png',lastModified:1});
 const video=new File(['video'],'video.mp4',{type:'video/mp4',lastModified:1});
 const poster=new Blob(['thumbnail'],{type:'image/jpeg'}),entries=[['draft-photo',photo],['draft-video',video]];
 const row={items:[{key:'original-photo',kind:'photo'},{key:'original-video',kind:'video'}]};
 const broken=new Blob(['invalid'],{type:'image/jpeg'});
 for(const derived of [poster,null,new Blob(['invalid'],{type:'video/mp4'}),broken]){
  const g={existing:id},previews=new Map(),assets=new Map(),reads=[],writes=[];
  class ImageDouble{removeAttribute(){}set src(v){queueMicrotask(()=>{if(derived===poster){this.naturalWidth=128;this.naturalHeight=96;this.onload?.()}else this.onerror?.()})}}
  await run(g,row,entries,async rows=>writes.push(rows),assets,{blob:async k=>{reads.push(k);return derived}},previews,ImageDouble);
  assert.deepEqual(reads,['original-video:phone-v1']);
  assert.deepEqual(g.canonicalByDraft,{'draft-photo':'original-photo','draft-video':'original-video'});
  assert.strictEqual(assets.get('draft-video'),video);
  assert.strictEqual(assets.get('draft-photo'),photo);
  assert.equal(previews.has('draft-video'),derived===poster);
  assert.equal(writes.length,derived===poster?2:1);
  if(derived===poster)assert.deepEqual(writes[1],[['preview:draft-video',poster]]);
 }
 assert.throws(()=>retainEditorCanonicalMediaIds(source.replace('entries.length','other.length')));
});
test('video native-cover correction is scoped to the existing editor anchors and fails on source drift',()=>{
 const source=` tiles.querySelectorAll('.tile').forEach(enableDrag);taleraV9EditorMediaControls(g);
main.querySelectorAll('.tile').forEach(enableDrag);$('addMore').onclick=
void v.play().then(()=>setTimeout(()=>{if(v.isConnected){v.pause();void capture()}},250)).catch(()=>{});
      pending=true;v.style.opacity='1';v.pause();
      try{
        const image=await drawnPreview(v,v.videoWidth,v.videoHeight);
    for(const e of ['loadeddata','seeked','canplay','timeupdate'])v.addEventListener(e,()=>void capture());`;
 const changed=restoreEditorVideoCover(source);
 assert.equal(changed.split('taleraV61AttachNativeCovers()').length-1,2);
 assert.match(changed,/if\(v.isConnected&&v.readyState>=2\)void capture/);
 assert.match(changed,/requestAnimationFrame/);
 assert.throws(()=>restoreEditorVideoCover(source.replace('v.play()','v.other()')));
});

// Callback transaction simulator: all staged writes roll back on abort.
// Uses setImmediate so async byte reads can settle between key-only pings.
// This executes product functions, not a claim about Safari itself.
function atomicStoreDouble(fileEntries,storyRows=[],failRead=null){
 const files=new Map(fileEntries),stories=new Map(storyRows.map(row=>[row.id,row]));
 let active=0,commits=0,aborts=0;
 const db={transaction(names,mode){
  active++;
  const stage={files:new Map(files),stories:new Map(stories)};
  let pending=0,aborted=false,finished=false;
  const tx={abort(){if(aborted||finished)return;aborted=true;aborts++;setImmediate(()=>tx.onabort?.())},
   objectStore(name){
    assert.ok([].concat(names).includes(name));const map=stage[name];
    function request(fn,key=null){
     const q={};pending++;
     setImmediate(()=>{
      if(aborted||finished)return;
      try{
       if(failRead!==null&&key===failRead)throw Error('simulated read failure');
       q.result=fn();q.onsuccess?.();
      }catch(e){q.error=e;tx.error=e;q.onerror?.();tx.abort()}
      finally{
       if(!--pending&&!aborted&&!finished){
        finished=true;commits++;
        if(mode==='readwrite'){files.clear();for(const [k,v] of stage.files)files.set(k,v);stories.clear();for(const [k,v] of stage.stories)stories.set(k,v)}
        tx.oncomplete?.();
       }
      }
     });
     return q;
    }
    return {get:key=>request(()=>map.get(key),key),
     getKey:key=>request(()=>map.has(key)?key:undefined,key),
     getAll:()=>request(()=>[...map.values()]),
     put:row=>request(()=>{assert.equal(mode,'readwrite');map.set(name==='files'?row.key:row.id,row)}),
     delete:key=>request(()=>{assert.equal(mode,'readwrite');map.delete(key)})};
   }};
  return tx;
 }};
 return {db,files,stories,get active(){return active},get commits(){return commits},get aborts(){return aborts}};
}
test('draft loader reads a coherent manifest and all original IDs, optional missing/corrupt previews do not erase media',async()=>{
 const manifest='talera-v4-work:manifest',prefix='talera-v4-work:';
 const g={id:'valid-draft',media:['file-1','file-2'],voice:'voice-1'};
 const photo=new File(['photo'],'same.png',{type:'image/png',lastModified:3});
 const video=new File(['video'],'same.mp4',{type:'video/mp4',lastModified:3});
 const voice=new Blob(['voice'],{type:'audio/mp4'});
 const records=[[manifest,{key:manifest,blob:[g]}],
  [prefix+'file-1',{key:prefix+'file-1',blob:photo}],
  [prefix+'file-2',{key:prefix+'file-2',blob:video}],
  [prefix+'voice-1',{key:prefix+'voice-1',blob:voice}],
  [prefix+'preview:file-2',{key:prefix+'preview:file-2',broken:true}]];
 const decode=row=>{if(row?.broken)throw Error('bad preview');return row};
 const lib=atomicStoreDouble(records);
 const result=await readEditorDraftPayload(lib.db,manifest,prefix,decode);
 assert.deepEqual(result.catalog,[g]);assert.deepEqual(result.originals,[['file-1',photo],['file-2',video],['voice-1',voice]]);
 assert.equal(lib.active,1);assert.equal(lib.commits,1);assert.equal(result.previews.every(([,p])=>p===null),true);
 assert.deepEqual([...lib.files],records);
});
test('draft loader rejects missing originals, read errors and malformed manifests without replacing the manifest',async()=>{
 const manifest='talera-v4-work:manifest',prefix='talera-v4-work:';
 const group={id:'valid-draft',media:['file-1'],voice:''};
 for(const [rows,fail] of [
  [[[manifest,{key:manifest,blob:[group]}]],null],
  [[[manifest,{key:manifest,blob:{unknown:true}}]],null],
  [[[manifest,{key:manifest,blob:[group,group]}]],null],
  [[[manifest,{key:manifest,blob:[group]}],[prefix+'file-1',{key:prefix+'file-1',blob:new Blob([])}]],null],
  [[[manifest,{key:manifest,blob:[group]}]],manifest]
 ]){
  const lib=atomicStoreDouble(rows,[],fail);
  await assert.rejects(readEditorDraftPayload(lib.db,manifest,prefix,row=>row));
  assert.deepEqual([...lib.files],rows);assert.equal(lib.commits,0);
 }
 const empty=atomicStoreDouble([]);
 assert.deepEqual(await readEditorDraftPayload(empty.db,manifest,prefix,row=>row),{catalog:[],originals:[],previews:[]});
});
test('placement receipt aborts the whole story/media transaction on concurrently changed or missing draft metadata',async()=>{
 const manifest='talera-v4-work:manifest',fresh={...completedDraft,existing:'',canonicalByDraft:null};
 for(const row of [undefined,{key:manifest,blob:[{...fresh,title:'concurrent edit'}]}]){
  const lib=atomicStoreDouble(row?[[manifest,row]]:[]);
  const tx=lib.db.transaction(['stories','files'],'readwrite');
  const stop=new Promise(resolve=>{tx.onabort=resolve});
  tx.objectStore('stories').put(completedStory);
  tx.objectStore('files').put({key:'new-original',blob:new Blob(['new'])});
  await assert.rejects(writeSavedDraftReceipt(tx,fresh,completedStory,completedStory.items),/Concept is gewijzigd/);
  await stop;
  assert.equal(lib.aborts,1);assert.equal(lib.commits,0);
  assert.equal(lib.stories.size,0);assert.equal(lib.files.has('new-original'),false);
  assert.deepEqual(lib.files.get(manifest),row);
 }
 const row={key:manifest,blob:[fresh,{id:'unrelated',media:[],voice:''}]};
 const lib=atomicStoreDouble([[manifest,row]]);
 const tx=lib.db.transaction(['stories','files'],'readwrite');
 const done=new Promise(resolve=>{tx.oncomplete=resolve});
 tx.objectStore('stories').put(completedStory);
 await writeSavedDraftReceipt(tx,fresh,completedStory,completedStory.items);
 await done;
 assert.deepEqual(lib.files.get(manifest).blob,[completedDraft,row.blob[1]]);
 assert.deepEqual(lib.stories.get(id),completedStory);assert.equal(lib.commits,1);
});
test('completed draft cleanup runs actual byte checks inside one transaction and preserves changed/missing copies',async()=>{
 const manifest='talera-v4-work:manifest',pairs=publishedDraftPairs(completedDraft,completedStory);
 const keep={id:'unrelated',media:[],voice:''};
 for(const damaged of [false,true]){
  const rows=[[manifest,{key:manifest,blob:[completedDraft,keep]}]];
  for(const pair of pairs){
   const f=new File([Uint8Array.of(1,2,3)],pair.original,{type:pair.mime,lastModified:1});
   rows.push([pair.original,{key:pair.original,blob:f}],
    [pair.draft,{key:pair.draft,blob:damaged&&pair===pairs[1]?new File([Uint8Array.of(1,2,4)],f.name,{type:f.type,lastModified:1}):f}]);
  }
  const lib=atomicStoreDouble(rows,[completedStory]);
  const read=(store,key,ok,fail)=>{const q=store.get(key);q.onsuccess=()=>ok(q.result);q.onerror=()=>fail(q.error)};
  assert.equal(await discardPristineDraftAtomically(lib.db,completedDraft,read),!damaged);
  assert.deepEqual(lib.files.get(manifest).blob,damaged?[completedDraft,keep]:[keep]);
  for(const pair of pairs){assert.equal(lib.files.has(pair.original),true);assert.equal(lib.files.has(pair.draft),damaged)}
  assert.equal(lib.stories.get(id),completedStory);
 }
});

test('successful placement retires only its receipt and unshared draft files, using the exact final verified story',async()=>{
 const other={id:'draft-survivor-123456',existing:id2,media:[draft.media[1]],voice:''};
 const lib=transactionLibrary({catalog:[completedDraft,other],published:[completedStory]});
 const originalFiles=[...lib.files].filter(([key])=>!key.startsWith('talera-v4-work:'));
 assert.equal(await discardPristineDraftAtomically(lib.db,completedDraft,null,completedStory),true);
 assert.deepEqual(lib.files.get(lib.manifest).blob,[other]);
 assert.equal(lib.files.has('talera-v4-work:'+draft.media[0]),false);
 assert.equal(lib.files.has('talera-v4-work:'+draft.media[1]),true);
 assert.deepEqual([...lib.files].filter(([key])=>!key.startsWith('talera-v4-work:')),originalFiles);
 assert.deepEqual(lib.originals,[completedStory]);
});
test('immediate retirement refuses altered receipt, newer story, mismatched original ordering and rolls back on deletion failure',async()=>{
 for(const [catalog,published] of [
  [[{...completedDraft,text:'new unsaved text'}],[completedStory]],
  [[completedDraft],[{...completedStory,title:'edited after placement'}]],
  [[completedDraft],[{...completedStory,items:[...completedStory.items].reverse()}]]
 ]){
  const lib=transactionLibrary({catalog,published}),before=structuredClone([...lib.files]);
  assert.equal(await discardPristineDraftAtomically(lib.db,completedDraft,null,completedStory),false);
  assert.deepEqual([...lib.files],before);assert.deepEqual(lib.writes,[]);
 }
 const shuffled={...completedStory,items:[...completedStory.items].reverse()};
 const mismatch=transactionLibrary({catalog:[completedDraft],published:[shuffled]});
 assert.equal(await discardPristineDraftAtomically(mismatch.db,completedDraft,null,shuffled),false);
 const abort=transactionLibrary({catalog:[completedDraft],published:[completedStory],failDelete:true}),before=structuredClone([...abort.files]);
 await assert.rejects(discardPristineDraftAtomically(abort.db,completedDraft,null,completedStory),/simulated delete failure/);
 assert.deepEqual([...abort.files],before);
});
test('historical receipt accepts only the original save normalization of title and text, never discarded substantive text',()=>{
 assert.equal(publishedDraftPairs({...completedDraft,title:' '+completedDraft.title+' ',text:'\n'+completedDraft.text+'\n'},completedStory)?.length,3);
 assert.equal(publishedDraftPairs({...completedDraft,text:completedDraft.text+' something new'},completedStory),null);
});

test('actual patched editor retires a successful receipt, without a whole-manifest save or separate delete',async()=>{
 const {readFileSync}=await import('node:fs');
 const {scopeLocalMemories}=await import('./f5-local-scope.mjs');
 const {alignEditedNarrationCueRefs}=await import('./f5-edit-cue-rebind.mjs');
 const {preserveOriginalMediaIdsOnEdit}=await import('./f5-library-editor-stable-save.mjs');
 const raw=readFileSync(new URL('../free-10m-delivery/generated/reference-tell.html',import.meta.url),'utf8');
 const html=preserveOriginalMediaIdsOnEdit(retainEditorCanonicalMediaIds(alignEditedNarrationCueRefs(scopeLocalMemories(raw,scope))));
 const start=html.indexOf('// The story and its linked receipt have already committed.');
 const end=html.indexOf("location.assign('/mijn-leven?published='",start);
 assert.ok(start>0&&end>start);
 const cleanup=html.slice(start,end);
 assert.doesNotMatch(cleanup,/\b(?:saveDraft|deleteFiles)\(/);
 const run=new Function('g','groups','editorDraft','verifiedStory','persistedMatchesPlacement','mem','assets','previewBlobs','snapshot','revoke','console',
  'return (async()=>{let queue=Promise.resolve(),savingOriginals=Promise.resolve(),taleraRetirement=null;'+cleanup+';return {groups,assets,previewBlobs}})()');
 const receipt={existing:completedDraft.existing,canonicalByDraft:completedDraft.canonicalByDraft};
 const initial={...completedDraft,existing:'',canonicalByDraft:null};
 const other={id:'other-concept',media:[completedDraft.media[1]],voice:''};
 for(const mode of ['success','conflict','abort','changed']){
  const g={...completedDraft,taleraSavedReceipt:receipt},assets=new Map(completedDraft.media.map(id=>[id,'asset'])),previews=new Map(assets),revoked=[];
  let calls=0;
  const result=await run(g,[g,other],initial,completedStory,true,{draftDiscardSavedEdit:async(d,s)=>{
   calls++;assert.deepEqual(d,completedDraft);assert.deepEqual(s,completedStory);
   if(mode==='abort')throw Error('test abort');return mode==='success';
  }},assets,previews,()=>[mode==='changed'?{...completedDraft,title:'new edit'}:completedDraft,other],id=>revoked.push(id),{warn(){}});
  assert.equal(calls,mode==='changed'?0:1);
  assert.deepEqual(result.groups,mode==='success'?[other]:[g,other]);
  assert.equal(assets.has(draft.media[0]),mode!=='success');assert.equal(assets.has(draft.media[1]),true);
  assert.equal(previews.has(draft.media[0]),mode!=='success');
  assert.equal(revoked.includes(draft.media[0]),mode==='success');
 }
});
