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
 assert.deepEqual(buttonPosition(context,{width:390,height:844}),{width:45,height:45,top:124,right:15});
 assert.equal(captureReturnContext({memory:{...memory,_taleraLocal:false},rect:{},viewport:{}}),null);
 assert.equal(buttonPosition(context,{width:390,height:130}).top,85);
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
 let mounted=null;const doc={getElementById(){return mounted},createElement(){return el},body:{append(n){mounted=n}}};
 const w={innerWidth:390,innerHeight:844,addEventListener(){},removeEventListener(){}};
 let release,count=0;const eye=mountReturnButton({document:doc,window:w,context,language:'nl',onReturn:()=>{count++;return new Promise(r=>release=r)}});
 assert.equal(el['aria-label'],returnLabel('nl'));assert.equal(el.style.top,'124px');assert.equal(el.style.right,'15px');assert.equal(el.style.width,'45px');assert.match(el.innerHTML,/<svg/);
 const first=callbacks.click();await callbacks.click();assert.equal(count,1);release();await first;assert.equal(el.disabled,false);
 assert.throws(()=>mountReturnButton({document:doc,window:w,context,language:'nl',onReturn:()=>{}}));eye.unmount();assert.equal(el.removed,true);
});
test('measured eye position cancels the editor-specific WebKit viewport offset',()=>{
 const el={style:{},setAttribute(){},addEventListener(){},getBoundingClientRect(){return {top:parseFloat(this.style.top)-26.5,right:390-parseFloat(this.style.right),width:45}},remove(){}};
 const doc={getElementById(){return null},createElement(){return el},body:{append(){}}};
 const w={innerWidth:390,innerHeight:844,addEventListener(){},removeEventListener(){}};
 mountReturnButton({document:doc,window:w,context,language:'nl',onReturn:()=>{}});
 assert.equal(el.getBoundingClientRect().top,124);
 assert.equal(el.getBoundingClientRect().right,375);
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
 const doc={referrer:fromPencil?'https://talera.test/present':'https://talera.test/mijn-leven',documentElement:{lang:'nl'},getElementById:k=>k==='app'?app:k==='busy'?busy:buttons.get(k)||null,querySelectorAll:()=>[],createElement:()=>({style:{},setAttribute(k,v){this[k]=v},addEventListener(k,v){events[k]=v},remove(){buttons.delete(this.id)}}),body:{append(el){buttons.set(el.id,el)}}};
 const ctx={...context,at:Date.now()};if(fromPencil)writeReturnContext(s,scope,ctx);
 const window={sessionStorage:s,initialGroups:prior?[structuredClone(draft)]:[],original:structuredClone(draft),errors,innerWidth:390,innerHeight:844,addEventListener(){},removeEventListener(){},confirm:t=>{confirm.push(t);return allow},mem:{draftDiscardPristineEdit:async g=>{discard.push(g);return true}}};
 const location={search:'?edit='+id,origin:'https://talera.test',replace:path=>nav.push(path)};
 const js=source.slice(source.indexOf('>')+1,source.indexOf('</script>'));
 new Function('window','document','location','URLSearchParams','crypto','structuredClone',js)(window,doc,location,URLSearchParams,globalThis.crypto,structuredClone);await window.boot;
 return {window,nav,discard,errors,confirm,buttons,events,attrs,s};
}
test('editor source binding mounts eye only for pencil entry; no-op exits directly and retains unrelated originals',async()=>{
 const f=await runEditorFixture();assert.equal(f.buttons.size,1);assert.equal(f.buttons.values().next().value.style.top,'124px');
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
