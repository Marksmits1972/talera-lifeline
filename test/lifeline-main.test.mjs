import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { DEMO_MEMORIES } from '../experiments/lifeline-main/demo-memories.js';
import { NAV_SLOT, NAVIGATION_STYLE, renderNavigation } from '../experiments/lifeline-main/navigation.js';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const html=read('../experiments/lifeline-main/index.html');
const worker=read('../experiments/lifeline-main/worker.js');
const config=JSON.parse(read('../experiments/lifeline-main/wrangler.jsonc'));

function originalRh19Memories(){
  const out=[];
  for(let i=3;i<=6;i++){
    const raw=read('../src/html/chunk'+i+'.js');
    const part=raw.slice(raw.indexOf('[')+1,raw.lastIndexOf(']')).replace(/,\s*$/,'');
    const lines=JSON.parse('['+part+']');
    for(const line of lines){
      const m=line.trim().match(/^\{id:\s*(\d+),\s*at:("(?:\\.|[^"\\])*"),\s*story:("(?:\\.|[^"\\])*"),\s*fullStory:("(?:\\.|[^"\\])*"),\s*image:("(?:\\.|[^"\\])*")\},?$/);
      if(m)out.push({id:Number(m[1]),at:JSON.parse(m[2]),story:JSON.parse(m[3]),fullStory:JSON.parse(m[4]),image:JSON.parse(m[5])});
    }
  }
  return out.sort((a,b)=>a.id-b.id);
}

test('TALERA: original approved RH19 memories retained with exact dates photos and texts',()=>{
  const original=originalRh19Memories();
  assert.equal(original.length,50);
  assert.equal(DEMO_MEMORIES.length,50);
  for(let i=0;i<50;i++){
    const clone=DEMO_MEMORIES[i];
    for(const key of ['id','at','story','fullStory','image'])assert.equal(clone[key],original[i][key],key+' ID '+(i+1));
    assert.equal(clone.precision,'exact');
    assert.ok(Array.isArray(clone.tags));
  }
});

test('TALERA: embedded main page JavaScript is syntactically valid',()=>{
  const match=html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match,'main app JS must be embedded');
  assert.doesNotThrow(()=>new vm.Script(match[1],{filename:'lifeline-main.js'}));
});

test('TALERA: years months seven stories marker and synchronization exist',()=>{
  for(const id of ['yearGear','monthGear','storyGear','centerReadout','needle','previewImage','openStory','filterOptions','undoButton']){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.match(html,/centerI-3/);
  assert.match(html,/centerI\+3/);
  assert.match(html,/fromYearFloat\(yearFloat/);
  assert.match(html,/fromMonthFloat\(monthFloat/);
  assert.match(html,/msAtIndex\(/);
  assert.match(html,/focusAt\(m\.virtualMs/);
});

test('TALERA: date precision and matching tags are not invented by navigation',()=>{
  assert.match(html,/p==='year'/);
  assert.match(html,/p==='season'/);
  assert.match(html,/p==='month'/);
  assert.match(html,/if\(s==='winter'\)return \[midnight\(y-1,11,1\),midnight\(y,2,1\)\]/);
  assert.match(html,/group\.length\+1/);
  assert.match(html,/m\.tags\.some\(t=>filters\.has\(t\)\)/);
  assert.doesNotMatch(html,/filters\.every/);
});

test('TALERA: drag editing has month selection ordering undo and local persistence',()=>{
  assert.match(html,/setPointerCapture/);
  assert.match(html,/startDrag\(g\.storyId/);
  assert.match(html,/pointerMonth\(y,drag\.monthReference\)/);
  assert.match(html,/current\.enteredMonth/);
  assert.match(html,/m\.precision='month'/);
  assert.match(html,/m\.manualMs=placed/);
  assert.match(html,/showUndo\(\)/);
  assert.match(html,/localStorage\.setItem\(STORAGE/);
  assert.match(html,/drag\.raf=requestAnimationFrame\(autoScrollDrag\)/);
});

test('TALERA: new Worker uses RH19 untouched and disallows writes',()=>{
  assert.equal(config.name,'talera-r19-lifeline-main-dev');
  assert.equal(config.main,'worker.js');
  assert.ok(!('d1_databases' in config));
  assert.ok(!('r2_buckets' in config));
  assert.match(worker,/import r19Worker from "\.\.\/\.\.\/src\/reference-r19h2-carousel-combined-worker\.js"/);
  assert.match(worker,/if\(path==="\/present"/);
  assert.match(worker,/if\(path==="\/tell"/);
  assert.match(worker,/if\(method!=="GET"&&method!=="HEAD"\)/);
});

test('Three routes keep native RH19, all reuse one TALERA footer',()=>{
 assert.match(html,/<a id="preview" href="\/present"/);
 assert.match(html,/\$\('preview'\)\.href='\/present\?memory='/);
 assert.match(html,/\$\('preview'\)\.addEventListener\('click',rememberFocus\)/);
 assert.match(html,/<nav class="bottom-nav"[^>]*>.*href="\/tell".*href="\/present"/);
 assert.match(worker,/import \{ NAVIGATION_STYLE, NAV_SLOT, renderNavigation \} from "\.\/navigation\.js"/);
 assert.match(worker,/renderNavigation\("present"\)/);
 assert.match(worker,/renderNavigation\('tell'\)/);
 assert.match(worker,/renderNavigation\("timeline"\)/);
 assert.ok(visualV8.includes(NAV_SLOT));
 assert.match(NAVIGATION_STYLE,/body nav\[aria-label="TALERA navigatie"\]\{visibility:hidden!important\}/);
});

const visualV3=read('../experiments/lifeline-main/visual-v3.html');
test('Approved visual layout is retained, while RH19 reference photos are shared by ID',()=>{
 for(const id of ['class="ages"','class="detail"','class="preview"'])assert.ok(visualV3.includes(id),id);
 assert.match(worker,/import HOME_HTML from "\.\/visual-v8-photo-space\.html"/);
 assert.match(worker,/REFERENCE_CATALOG_SCRIPT/);
 assert.match(worker,/JSON\.stringify\(DEMO_MEMORIES\)/);
 assert.match(visualV8,/window\.__taleraReferenceMemories/);
 assert.match(visualV8,/example\('ref-'\+record\.id/);
 assert.match(visualV8,/item\.fullStory=record\.fullStory/);
 assert.doesNotMatch(worker,/VISUAL_PREVIEW_PHOTO|lifelineSessionBridge|talera-visual-demo-handoff|id:51001/);
 assert.match(worker,/return reply\(pwaShell\(presentation\)/);
});

const visualV4=read('../experiments/lifeline-main/visual-v4.html');
test('The historical gesture design stays intact, without the old session handoff in the Worker',()=>{
 for(const c of ['class="ages"','class="detail"','class="preview"'])assert.ok(visualV4.includes(c),c);
 for(const k of ["installGesture(ageLane,'year')","installGesture(monthLane,'month')","installGesture(storyLane,'story')","state.filter.add(tag)","const img=new Image()"])assert.ok(visualV4.includes(k),k);
 assert.match(worker,/bridge\+memoryNavigation/);
 assert.match(worker,/talera-memory-id-navigation/);
 assert.doesNotMatch(worker,/lifelineSessionBridge|talera-lifeline-session-handoff/);
 const script=visualV4.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(script);
 assert.doesNotThrow(()=>new vm.Script(script[1],{filename:'visual-v4.js'}));
});

const visualV5=read('../experiments/lifeline-main/visual-v6-swipe-stable.html');
test('Fullscreen TALERA PWA fills the real viewport and preserves the interactive life design',()=>{
 assert.match(visualV5,/\.viewport\{position:relative;width:100%;max-width:none;height:100vh;height:100svh;height:100dvh;min-height:0/);
 assert.doesNotMatch(visualV5,/width:min\(100%,430px\)/);
 assert.doesNotMatch(visualV5,/height:min\(850px,calc\(100vh - 40px\)\)/);
 for(const item of ['class="ages"','class="detail"','class="preview"',"installGesture(ageLane,'year')","installGesture(monthLane,'month')","installGesture(storyLane,'story')","state.filter.add(tag)"])assert.ok(visualV5.includes(item),item);
 for(const key of ['rel="manifest"','apple-mobile-web-app-capable','safe-area-inset-top','safe-area-inset-bottom','navigator.serviceWorker.register'])assert.ok(visualV5.includes(key),key);
 const matches=[...visualV5.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.ok(matches.length>=2);
 for(const m of matches)assert.doesNotThrow(()=>new vm.Script(m[1]));
 assert.match(worker,/import HOME_HTML from "\.\/visual-v8-photo-space\.html"/);
 assert.match(worker,/path==="\/manifest\.webmanifest"/);
 assert.match(worker,/path==="\/sw\.js"/);
 assert.match(worker,/apple-touch-icon/);
});

const visualV6=read('../experiments/lifeline-main/visual-v6-swipe-stable.html');
test('iPhone swipes navigate inside TALERA instead of scrolling the main document',()=>{
 assert.match(visualV6,/body\{display:block;position:fixed;inset:0;overscroll-behavior:none;touch-action:pan-x pinch-zoom\}/);
 assert.match(visualV6,/\.viewport\{[^}]*overscroll-behavior:none;touch-action:pan-x pinch-zoom\}/);
 assert.match(visualV6,/\.ages,\.months,\.story-list\{overscroll-behavior:contain;touch-action:pan-x pinch-zoom\}/);
 assert.match(visualV6,/node\.style\.touchAction='pan-x pinch-zoom'/);
 assert.match(visualV6,/screenRoot\.addEventListener\('touchmove',[\s\S]*?ev\.preventDefault\(\);[\s\S]*?passive:false/);
 assert.match(visualV6,/if\(!touchOrigin\|\|ev\.touches\.length!==1\|\|!ev\.cancelable\)return/);
 assert.match(visualV6,/node\.addEventListener\('pointercancel',ev=>\{/);
 for(const lane of ["installGesture(ageLane,'year')","installGesture(monthLane,'month')","installGesture(storyLane,'story')"])assert.ok(visualV6.includes(lane),lane);
 const scripts=[...visualV6.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.ok(scripts.length>=2);
 for(const script of scripts)assert.doesNotThrow(()=>new vm.Script(script[1]));
 assert.match(worker,/import HOME_HTML from "\.\/visual-v8-photo-space\.html"/);
});

const visualV7=read('../experiments/lifeline-main/visual-v7-photo-balance.html');
test('V7: photos take priority, calendar and mini-stories no longer overlap',()=>{
 assert.match(visualV7,/\.ages\{width:31\.5%;flex:0 0 31\.5%\}/);
 assert.match(visualV7,/\.story-list\{left:74px;right:6px;top:28px/);
 assert.match(visualV7,/\.detail-list\{flex:0 0 clamp\(235px,40%,325px\)/);
 assert.match(visualV7,/\.story-name\{display:-webkit-box;-webkit-line-clamp:2/);
 assert.match(visualV7,/\.preview-description\{min-height:0/);
 assert.match(visualV7,/\.preview-meta\{display:flex;flex-wrap:wrap/);
 assert.match(visualV7,/\.month-mark\.active\{color:#0866d5/);
 assert.match(visualV7,/\.preview-image\{object-fit:cover/);
});
test('V7: fluid month movement and calmer gesture, compatible with RH19 handoff',()=>{
 assert.match(visualV7,/continuousMonth=state\.monthIndex/);
 assert.match(visualV7,/mi-continuousMonth/);
 assert.match(visualV7,/storySuppressClickUntil/);
 assert.match(visualV7,/\>54\)\{scrollStories/);
 assert.match(visualV7,/const units=was\.v\/measure\(\)\*10/);
 for(const x of ["installGesture(ageLane,'year')","installGesture(monthLane,'month')","installGesture(storyLane,'story')",'taleraVisualMemoryHandoff'])assert.ok(visualV7.includes(x),x);
 const scripts=[...visualV7.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>=1);
 for(const m of scripts)assert.doesNotThrow(()=>new vm.Script(m[1],{filename:'visual-v7.js'}));
});


const visualV8=read('../experiments/lifeline-main/visual-v8-photo-space.html');
const bridgeModule=read('../experiments/lifeline-main/memory-store.js');
const tellModule=read('../experiments/lifeline-main/tell-local-page.js');
const adapterModule=read('../experiments/lifeline-main/local-rh19-adapter.js');
function exportedHtml(code,name){
 const start='export const '+name+' = ';
 assert.ok(code.startsWith(start),name);
 return JSON.parse(code.slice(start.length).trim().replace(/;$/,''));
}
function checkScripts(html,name){
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>=1,name+' has script');
 for(const m of scripts)assert.doesNotThrow(()=>new vm.Script(m[1],{filename:name}));
}
test('V8: bigger lifetime photographs with unobstructed month and photo preview',()=>{
 assert.match(visualV8,/\.age-info small\{display:none\}/);
 assert.match(visualV8,/\.age-photo\{display:block;flex:1 1 auto;width:auto;max-width:none/);
 assert.match(visualV8,/object-position:50% 40%/);
 assert.match(visualV8,/\.story-list\{left:74px;right:6px;top:28px/);
 for(const lane of ["installGesture(ageLane,'year')","installGesture(monthLane,'month')","installGesture(storyLane,'story')"])assert.ok(visualV8.includes(lane),lane);
 checkScripts(visualV8,'visual-v8');
});
test('V8: private media store feeds one RH19 presentation adapter',()=>{
 const js=exportedHtml(bridgeModule,'MEMORY_STORE_SCRIPT');
 const tell=exportedHtml(tellModule,'TELL_PAGE_HTML');
 const adapter=exportedHtml(adapterModule,'LOCAL_RH19_ADAPTER');
 for(const k of ["indexedDB.open","objectStoreNames.contains('stories')","objectStoreNames.contains('files')","kind:kind","async function save","async function list","async function mediaUrl"])assert.ok(js.includes(k),k);
 for(const k of ['id="files"','accept="image/*,video/*"','MediaRecorder','id="moment"','store.save(','location.replace(','__MEMORY_STORE__'])assert.ok(tell.includes(k),k);
 for(const k of ['store.list()','runtime.registerMemories(memories)','store.mediaUrl(item.key)'])assert.ok(adapter.includes(k),k);
 for(const k of ['addLocalMemories(rows)','?memory=','meta.items?.some','store.list()','Mijn verhalen'])assert.ok(visualV8.includes(k),k);
 checkScripts(js,'store');checkScripts(tell,'tell');checkScripts(adapter,'unified-adapter');
});
test('V8: RH19 reference is unchanged and only a safe local adapter is wired',()=>{
 assert.match(worker,/const VERSION="talera-lifeline-v13-phone-display-unified-nav-20261016-r4"/);
 assert.match(worker,/if\(method!=="GET"&&method!=="HEAD"\)/);
 assert.match(worker,/presentation=presentation.replace\("<\/body>",MEMORY_STORE_SCRIPT\+LOCAL_RH19_ADAPTER/);
 assert.match(worker,/TELL_PAGE_HTML/);
 assert.match(worker,/MEMORY_STORE_SCRIPT/);
 assert.ok(!('d1_databases' in config)&&!('r2_buckets' in config));
 assert.match(worker,/import r19Worker from "\.\.\/\.\.\/src\/reference-r19h2-carousel-combined-worker\.js"/);
});


const brandSource=read('../experiments/lifeline-main/pwa-brand.js');
const updateSource=read('../experiments/lifeline-main/pwa-update.js');
test('V9: approved 179×174 TALERA logo from Drive is unchanged and available to iOS',()=>{
 const marker='export const BRAND_PNG_BASE64=';
 const start=brandSource.indexOf(marker);
 assert.ok(start>=0);
 const part=brandSource.slice(start+marker.length).split(';\n')[0];
 const b64=JSON.parse(part),png=Buffer.from(b64,'base64');
 assert.equal(png.length,30371);
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(png.readUInt32BE(16),179);
 assert.equal(png.readUInt32BE(20),174);
 assert.match(brandSource,/BRAND_ICON_SVG/);
 assert.match(worker,/path==="\/talera-brand-v9\.png"/);
 assert.match(worker,/path==="\/apple-touch-icon\.png"/);
 assert.match(worker,/path==="\/talera-brand-v9\.svg"/);
 assert.match(worker,/rel="apple-touch-icon" href="\/talera-brand-v9\.png"/);
 assert.match(worker,/src:"\/talera-brand-v9\.svg"/);
});
test('V9: network-first update watcher refreshes only safe timeline and retains private data',()=>{
 const code=exportedHtml(updateSource,'PWA_UPDATE_SCRIPT');
 assert.match(code,/fetch\('\/api\/version\?check='/);
 assert.match(code,/visibilitychange/);
 assert.match(code,/pageshow/);
 assert.match(code,/document\.visibilityState==='visible'/);
 assert.match(code,/const safeHome=\(location\.pathname==='\/'/);
 assert.match(code,/sessionStorage\.setItem\(repeatKey/);
 assert.match(code,/location\.reload\(\)/);
 assert.doesNotMatch(code,/indexedDB\.deleteDatabase|localStorage\.clear|sessionStorage\.clear|caches\.delete|unregister\(/);
 checkScripts(code,'pwa-update');
 assert.match(worker,/if\(path==="\/api\/version"\)/);
 assert.match(worker,/localOnly:true/);
 assert.match(worker,/function pwaShell\(html\)/);
 assert.match(worker,/pwaShell\(String\(HOME_HTML\)/);
 assert.match(worker,/pwaShell\(tell\)/);
 assert.match(worker,/MEMORY_STORE_SCRIPT\+LOCAL_RH19_ADAPTER/);
 assert.match(worker,/pwaShell\(presentation/);
 assert.match(worker,/cache-control":"no-store"/);
 assert.match(worker,/start_url:"\/"/);
});


test('V10: media-first storytelling sequence and large visual voice studio',()=>{
 const tell=exportedHtml(tellModule,'TELL_PAGE_HTML');
 const head=tell.indexOf('id="mediaSection"'),voice=tell.indexOf('id="voiceSection"'),detail=tell.indexOf('data-i18n="tell.completeHeading"');
 assert.ok(head>=0&&voice>head&&detail>voice,'Media → speech → details order');
 for(const id of ['mediaStage','strip','files','start','studio','studioStage','studioPrev','studioNext','stop','story','moment','save']){
  assert.ok(tell.includes('id="'+id+'"'),'missing '+id);
 }
 assert.match(tell,/grid-template-rows:auto minmax\(0,1fr\) auto/);
 assert.match(tell,/#studio\{position:fixed/);
 assert.match(tell,/height:100dvh/);
 assert.match(tell,/recording\.start\(1000\)/);
 assert.match(tell,/if\(recording&&recording\.state==='recording'\)/);
 assert.match(tell,/function jump\(n\)/);
 assert.match(tell,/setStudio\(true,true\)/);
 assert.match(tell,/touchend/);
 assert.match(tell,/const maxMedia=6/);
 assert.match(tell,/crypto\.subtle/);
 assert.match(tell,/digest\('SHA-256'/);
 assert.match(tell,/URL\.revokeObjectURL/);
 assert.match(tell,/setPointerCapture/);
 assert.match(tell,/elementFromPoint/);
 assert.match(tell,/media\.splice\(from,1\)/);
 assert.match(tell,/if\(voice\)uploads\.push\(voice\)/);
 assert.match(tell,/media\.map\(x=>x\.file\)/);
 assert.match(tell,/if\(e\.data\?\.size\)chunks\.push/);
 assert.match(tell,/audio\/mp4/);
});
test('V11 Free: microphone, user-authored text and no automatic AI or recognition',()=>{
 const tell=exportedHtml(tellModule,'TELL_PAGE_HTML');
 assert.doesNotMatch(tell,/id="autoTranscribe"|SpeechRecognition|webkitSpeechRecognition|recognizer/);
 assert.match(tell,/\$\('story'\)\.value=data\.text/);
 assert.match(tell,/async function openForEditing\(\)/);
 assert.match(tell,/getUserMedia\(\{audio:true\}\)/);
 assert.doesNotMatch(tell,/id="aiTitle"/);
 assert.doesNotMatch(tell,/fetch\(['"]\/api\/ai/);
 assert.match(tell,/data-i18n="tell.audioNote"/);
 const dutchCatalog=read('../experiments/lifeline-main/locales/nl.js');
 assert.match(dutchCatalog,/De geluidsopname wordt apart bewaard/);
 assert.match(dutchCatalog,/In Free schrijven we je woorden niet automatisch over/);
});
test('V10: date precision remains in local storage and timeline, never migrated',()=>{
 const store=exportedHtml(bridgeModule,'MEMORY_STORE_SCRIPT');
 const tell=exportedHtml(tellModule,'TELL_PAGE_HTML');
 const adapter=exportedHtml(adapterModule,'LOCAL_RH19_ADAPTER');
 assert.match(store,/datePrecision:precision/);
 assert.match(store,/dateEnd:precision==='period'\?dateEnd:null/);
 assert.match(store,/mediaUploads\.length>6/);
 assert.match(store,/voiceUploads\.length>1/);
 for(const x of ['id="moment"','function parsedMoment(value)','const seasons=','localToday()'])assert.ok(tell.includes(x),x);
 assert.match(tell,/datePrecision:time\.datePrecision,dateEnd:time\.dateEnd/);
 assert.match(visualV8,/m\.datePrecision=meta\.datePrecision/);
 assert.match(visualV8,/m\.dateEnd=meta\.dateEnd/);
 assert.match(visualV8,/if\(m\.datePrecision==='year'\)/);
 assert.match(visualV8,/if\(m\.datePrecision==='month'\)/);
 assert.match(adapter,/const at=row\.date\+'T'/);
 assert.match(adapter,/storyId:row\.id/);
 assert.match(tell,/item===cover\(\)/);
 checkScripts(tell,'v10-tell');checkScripts(adapter,'v10-adapter');checkScripts(store,'v10-storage');checkScripts(visualV8,'v10-timeline');
});


const bulkCode=read('../experiments/lifeline-main/bulk-free.js');
test('V11 Free: bulk import can select twenty-five photos and shows separated memory cards in Tell',()=>{
 const [styleLine,markupLine,scriptLine]=bulkCode.trim().split('\n');
 const styles=exportedHtml(styleLine,'BULK_FREE_STYLE');
 const markup=exportedHtml(markupLine,'BULK_FREE_MARKUP');
 const script=exportedHtml(scriptLine,'BULK_FREE_SCRIPT');
 assert.match(worker,/import \{ BULK_FREE_STYLE, BULK_FREE_MARKUP, BULK_FREE_SCRIPT \} from "\.\/bulk-free\.js"/);
 assert.match(worker,/\.replace\("<!--TALERA_TELL_BULK-->",BULK_FREE_MARKUP\)/);
 assert.match(worker,/\.replace\("<!--TALERA_TELL_END-->",BULK_FREE_SCRIPT/);
 for(const id of ['bulkFiles','bulkPanel','bulkGroups','bulkSaveAll','bulkReturn','bulkStudio','bulkStage','bulkRecord','bulkStop'])assert.ok(markup.includes('id="'+id+'"'),id);
 assert.match(markup,/accept="image\/\*,video\/\*"/);
 assert.match(markup,/type="file"[^>]*multiple/);
 assert.match(script,/const mediaLimit=6,batchLimit=25/);
 assert.match(script,/files\.slice\(0,batchLimit\)/);
 assert.match(script,/groups\.length\+' herinnering'/);
 assert.match(script,/const day=m\[1\]\+'-'\+m\[2\]/);
 assert.match(script,/0x9003/);
 assert.match(script,/async function capture\(file\)/);
 assert.match(script,/photos\.sort\(/);
 assert.match(script,/photos\.length>mediaLimit&&g\.date!==p\.date/);
 assert.match(script,/function reposition\(d\)/);
 assert.match(script,/if\(src!==dst&&dst\.photos\.length>=mediaLimit\)/);
 assert.match(script,/if\(!src\.photos\.length&&!src\.voice&&/);
 assert.match(script,/setPointerCapture/);
 assert.match(script,/elementFromPoint/);
 assert.match(script,/getUserMedia\(\{audio:true\}\)/);
 assert.match(script,/if\(g\.voice\)uploads\.push\(g\.voice\)/);
 assert.match(script,/store\.save\(/);
 assert.match(script,/\/tell\?edit=/);
 assert.doesNotMatch(script,/fetch\(|SpeechRecognition|openai|anthropic|AI-titel/);
 assert.match(styles,/#bulkStudio\{position:fixed/);
 checkScripts(script,'bulk-free-v11');
});
test('V11 Free: local storage can safely reopen an existing memory without losing originals',()=>{
 const store=exportedHtml(bridgeModule,'MEMORY_STORE_SCRIPT');
 const tell=exportedHtml(tellModule,'TELL_PAGE_HTML');
 assert.match(store,/async function save\(input,uploads,editId\)/);
 assert.match(store,/var existing=editId\?await get\(editId\):null/);
 assert.match(store,/createdAt:existing\?existing\.createdAt/);
 assert.match(store,/if\(existing\)for\(var k=0;k</);
 assert.match(store,/tx\.objectStore\('files'\)\.delete/);
 assert.match(tell,/store\.blob\(item\.key\)/);
 assert.match(tell,/uploads,editId\|\|undefined/);
 assert.match(tell,/const maxMedia=6/);
});


test('V11 Free: actual date/time sorting splits twelve photos into two six-photo groups',()=>{
 const bulk=exportedHtml(bulkCode.trim().split('\n')[2],'BULK_FREE_SCRIPT');
 const script=bulk.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
 const logic=script.slice(script.indexOf('function organize(photos){'),script.indexOf('function tile('));
 const arrange=new Function('photos',`let groups=[],nextId=1;const mediaLimit=6;const uniqueId=()=>String(nextId++);${logic};organize(photos);return groups`);
 const twelve=Array.from({length:12},(_,i)=>({id:'p'+i,date:'2001-04-02',time:String(19-i).padStart(2,'0')+':00:00',originalIndex:i}));
 const g=arrange(twelve);
 assert.equal(g.length,2);assert.equal(g[0].photos.length,6);assert.equal(g[1].photos.length,6);
 assert.deepEqual(g[0].photos.map(p=>p.time),['08:00:00','09:00:00','10:00:00','11:00:00','12:00:00','13:00:00']);
 const many=Array.from({length:25},(_,i)=>({id:String(i),date:'2000-01-'+String(i+1).padStart(2,'0'),time:'10:00:00',originalIndex:i}));
 const single=arrange(many);assert.equal(single.length,25);assert.ok(single.every(group=>group.photos.length===1));
});
test('V11 Free: no-day photos stay undated instead of acquiring a made-up date',()=>{
 const bulk=exportedHtml(bulkCode.trim().split('\n')[2],'BULK_FREE_SCRIPT');
 const script=bulk.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
 const logic=script.slice(script.indexOf('function organize(photos){'),script.indexOf('function tile('));
 const arrange=new Function('photos',`let groups=[],nextId=1;const mediaLimit=6;const uniqueId=()=>String(nextId++);${logic};organize(photos);return groups`);
 const group=arrange(Array.from({length:7},(_,i)=>({id:String(i),date:null,time:null,originalIndex:i})));
 assert.equal(group.length,2);assert.ok(group.every(x=>x.date===null));
 assert.deepEqual(group.map(x=>x.photos.length),[6,1]);
});

test('V12: all six photos stay on screen in one full-screen grid, with confirm and rollback',()=>{
 const bulk=exportedHtml(bulkCode.trim().split('\n')[2],'BULK_FREE_SCRIPT');
 const css=exportedHtml(bulkCode.trim().split('\n')[0],'BULK_FREE_STYLE');
 const markup=exportedHtml(bulkCode.trim().split('\n')[1],'BULK_FREE_MARKUP');
 assert.match(css,/#bulkEditorGrid\{min-height:0;flex:1;display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);grid-template-rows:repeat\(2,minmax\(0,1fr\)\)/);
 for(const id of ['bulkEditor','bulkEditorGrid','bulkEditorCancel','bulkEditorOK','bulkEditorTargets','bulkEditorAdd','bulkBusy','bulkSpinner'])assert.match(markup,new RegExp('id="'+id+'"'));
 assert.match(bulk,/function openEditor\(id\)/);
 assert.match(bulk,/function editorStop\(cancel\)/);
 assert.match(bulk,/function finishEditor\(ok\)/);
 assert.match(bulk,/elementFromPoint/);
 assert.match(bulk,/setPointerCapture/);
 assert.match(bulk,/if\(source!==dest&&dest\.photos\.length>=6\)/);
 assert.match(bulk,/g\.photos\.splice\(i,1\)/);
 assert.match(bulk,/g\.photos\.forEach\(\(item,i\)=>strip\.appendChild\(tile/);
 assert.match(bulk,/setBusy\(true/);
 assert.match(bulk,/De microfoon staat uit/);
 checkScripts(bulk,'v12-free-bulk');
});
test('V12: persistent on-device retime changes date, precision and time without preserving stale date',()=>{
 const store=exportedHtml(bridgeModule,'MEMORY_STORE_SCRIPT');
 assert.match(store,/async function retime\(id,change\)/);
 assert.match(store,/updated=\{\.\.\.old,date:date,time:time,datePrecision:precision,dateEnd:null/);
 assert.match(store,/tx\.objectStore\('stories'\)\.put\(updated\)/);
 assert.match(store,/validDate\(date\)/);
 assert.match(store,/day<=localToday\(\)/);
 assert.match(visualV8,/strong\.textContent=String\(yearAt\)/);
 assert.doesNotMatch(visualV8,/strong\.textContent=String\(age\)/);
 assert.match(visualV8,/maxYear=new Date\(\)\.getFullYear\(\)/);
});
test('V12: year/month/story drag remains isolated from RH19 presentation',()=>{
 const drag=read('../experiments/lifeline-main/timeline-reposition.js');
 const code=exportedHtml(drag,'TIMELINE_REPOSITION_SCRIPT');
 assert.match(code,/store\.retime\(/);
 assert.match(code,/pointerdown/);
 assert.match(code,/pointermove/);
 assert.match(code,/pointerup/);
 checkScripts(code,'TIMELINE_REPOSITION_SCRIPT');
 assert.match(worker,/TIMELINE_REPOSITION_SCRIPT/);
 assert.doesNotMatch(worker,/PRESENTATION_REPOSITION_SCRIPT|PRESENT_LOCAL_HTML/);
});

test('V13: direct route uses unmodified RH19 renderer and only one adapter',()=>{
 const code=exportedHtml(adapterModule,'LOCAL_RH19_ADAPTER');
 assert.match(worker,/LOCAL_RH19_ADAPTER/);
 assert.doesNotMatch(worker,/LOCAL_PRESENTATION_HANDOFF/);
 assert.match(code,/runtime\.registerMemories\(memories\)/);
 assert.match(code,/runtime\.setCenter\(selected\.ms\)/);
 assert.match(code,/runtime\.writeMemory\(selected\)/);
 assert.doesNotMatch(code,/talera-local-controls|Vorig verhaal|Volgend verhaal|book\.state=function|book\.step=function/);
 checkScripts(code,'unified-rh19');
});
test('V13 Free: photo import visibly previews all six and merges user-chosen groups',()=>{
 const style=exportedHtml(bulkCode.trim().split('\n')[0],'BULK_FREE_STYLE');
 const markup=exportedHtml(bulkCode.trim().split('\n')[1],'BULK_FREE_MARKUP');
 const js=exportedHtml(bulkCode.trim().split('\n')[2],'BULK_FREE_SCRIPT');
 assert.match(markup,/id="bulkTopCounter"/);
 assert.match(style,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(js,/merge.hidden=!eligible.length/);
 assert.match(js,/t\.photos\.push\(\.\.\.g\.photos\)/);
 assert.match(js,/photos\.length<=mediaLimit&&groups\.length===1/);
 checkScripts(js,'bulk-v13');
 const source=js.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
 const logic=source.slice(source.indexOf('function organize(photos){'),source.indexOf('function tile('));
 const organize=new Function('photos',`let groups=[],nextId=1;const mediaLimit=6;const uniqueId=()=>String(nextId++);${logic};organize(photos);return groups`);
 const groups=organize(Array.from({length:5},(_,i)=>({id:String(i),date:'2000-01-'+String(i+1).padStart(2,'0'),time:null,originalIndex:i})));
 assert.equal(groups.length,1);assert.equal(groups[0].date,null);assert.equal(groups[0].photos.length,5);
});
test('V13 Free: simple date choices are wired and valid JavaScript',()=>{
 const picker=exportedHtml(read('../experiments/lifeline-main/free-date-picker.js'),'FREE_DATE_PICKER');
 for(const key of ['date.exact','date.monthYear','date.yearOnly','date.seasonYear'])assert.ok(picker.includes('data-i18n="'+key+'"'),key);
 assert.match(picker,/type='date'/);
 assert.match(picker,/date\.max=maxYear/);
 assert.match(worker,/FREE_DATE_PICKER/);
 checkScripts(picker,'date-picker-v13');
});
test('V13: local browser data remains private and never cleared for an update',()=>{
 const code=exportedHtml(bridgeModule,'MEMORY_STORE_SCRIPT');
 assert.match(code,/indexedDB.open/);
 assert.doesNotMatch(worker,/indexedDB.deleteDatabase|localStorage.clear|caches.delete/);
 assert.ok(!('d1_databases' in config)&&!('r2_buckets' in config));
});


test('V13: local photos are records in native RH19 rather than custom carousel',()=>{
 const style=read('../experiments/lifeline-main/free-tell-polish.js');
 const adapter=exportedHtml(adapterModule,'LOCAL_RH19_ADAPTER');
 assert.match(style,/FREE_TELL_POLISH_STYLE/);
 assert.doesNotMatch(style,/LOCAL_PRESENTATION_HANDOFF/);
 assert.match(worker,/MEMORY_STORE_SCRIPT\+LOCAL_RH19_ADAPTER/);
 assert.match(adapter,/id:'pwa:'\+row\.id/);
 assert.match(adapter,/storyId:row\.id/);
 assert.match(adapter,/runtime\.registerMemories\(memories\)/);
 assert.match(adapter,/runtime\.setCenter\(selected\.ms\)/);
 assert.match(adapter,/MAX_LOADED=10/);
 assert.match(adapter,/URL\.revokeObjectURL/);
 assert.doesNotMatch(adapter,/restrictToMemory|gallery|__taleraLocalAdvance/);
 assert.doesNotMatch(adapter,/indexedDB\.deleteDatabase|localStorage\.clear|sessionStorage\.clear/);
 checkScripts(adapter,'rh19-adapter');
});
test('V13 iPhone corrections: one visual overview, conditional merging, compact editor and visible microphone',()=>{
 const css=exportedHtml(bulkCode.trim().split('\n')[0],'BULK_FREE_STYLE');
 const js=exportedHtml(bulkCode.trim().split('\n')[2],'BULK_FREE_SCRIPT');
 assert.match(js,/eligible=groups.filter\(t=>t.id!==g.id&&t.photos.length\+g.photos.length<=mediaLimit/);
 assert.match(js,/merge.hidden=!eligible.length/);
 assert.match(js,/details.append\(actions,tit,txt\)/);
 assert.match(js,/cell.onclick=\(\)=>openEditor\(g.id\)/);
 assert.match(js,/split.textContent='＋ Splits herinnering'/);
 assert.match(css,/#bulkEditorGrid\{flex:0 0 auto!important;height:min\(33dvh,256px\)/);
 assert.match(css,/#bulkStudio\{top:0!important;bottom:calc\(70px/);
 assert.match(css,/#bulkStop\{background:#c44655/);
 assert.match(js,/recorder.start\(1000\)/);
 checkScripts(js,'bulk-polish-v13');
});
test('V13: RH19 preserves original fitting, gesture engine and native tap logic',()=>{
 const code=read('../src/presentation-controller.js');
 const live=read('../src/live-memory-integration.js');
 assert.match(code,/const targetH=Math.min\(boxH,Math.max\(containH,boxH\*\.68\)\)/);
 assert.match(code,/const zoom=Math.min\(1\.82,Math.max\(1,targetH\/containH\)\)/);
 assert.match(code,/function prepareStrip\(/);
 assert.match(code,/const moved=book\.step\(direction\)/);
 assert.match(live,/if\(memory\._taleraLocal&&window\.__taleraLocalFrameChanged\)/);
 assert.match(live,/if\(!memory\|\|memory\._taleraLocal\|\|memory\._photoLoading/);
 assert.doesNotMatch(live,/__taleraLocalAdvance/);
});



test('V13: 50, 100 and 1,000 distinct local memories load in one RH19 batch with lazy photos',async()=>{
 const adapter=exportedHtml(adapterModule,'LOCAL_RH19_ADAPTER');
 const embedded=adapter.match(/<script[^>]*>([\s\S]*?)<\/script>/);
 assert.ok(embedded);
 const script=embedded[1];
 for(const n of [50,100,1000]){
  const rows=Array.from({length:n},(_,i)=>({
   id:'local-test-'+i,title:'Vakantie '+i,date:'2000-07-'+String(i%28+1).padStart(2,'0'),
   time:'12:00:00',text:'Herinnering '+i,
   items:[{kind:'photo',key:'file-'+i}]
  }));
  let batch=[],mediaReads=0,selected=null;
  const handlers=[];
  const store={list:async()=>rows,mediaUrl:async key=>{mediaReads++;return 'blob:'+key}};
  const runtime={
   registerMemories:items=>{batch=items;return items.length},
   currentMemory:()=>selected,
   setCenter(){},
   writeMemory:m=>{selected=m;for(const h of handlers)h(m)},
   draw(){},
   subscribe:fn=>handlers.push(fn)
  };
  const w={TaleraMemories:store,__taleraTimelineRuntime:runtime,addEventListener(){}};
  const context={window:w,location:{search:n===1000?'?memory=local-test-987':''},URLSearchParams,
   URL:{revokeObjectURL(){}},document:{getElementById(){return null}},console,encodeURIComponent};
  await vm.runInNewContext(script,context);
  assert.equal(batch.length,n,'memory count '+n);
  assert.equal(new Set(batch.map(m=>m.id)).size,n,'unique identity '+n);
  assert.ok(batch.every(m=>m.storyId.startsWith('local-test-')));
  assert.ok(batch.every(m=>m.id.startsWith('pwa:local-test-')));
  assert.equal(mediaReads,n===1000?1:0,'only selected media is requested');
  if(n===1000){assert.equal(selected.storyId,'local-test-987');assert.equal(selected.photos[0],'blob:file-987');}
 }
});

test('One memory identity travels Tell -> Timeline -> original RH19 -> Timeline',()=>{
 const tell=exportedHtml(tellModule,'TELL_PAGE_HTML');
 const adapter=exportedHtml(adapterModule,'LOCAL_RH19_ADAPTER');
 const store=exportedHtml(bridgeModule,'MEMORY_STORE_SCRIPT');
 assert.match(tell,/location\.replace\('\/\?memory='\+encodeURIComponent\(saved\.id\)\)/);
 assert.match(visualV8,/previewLink\.href='\/present\?memory='\+encodeURIComponent\(m\.localId\|\|m\.refId\)/);
 assert.match(visualV8,/const focusedId=new URLSearchParams\(location\.search\)\.get\('memory'\)/);
 assert.match(visualV8,/const focus=search\.get\('memory'\)\|\|search\.get\('local'\)/);
 assert.match(adapter,/const routeId=route\.get\('memory'\)/);
 assert.match(adapter,/const currentId=routeId\?\.startsWith\('local-'\)\?routeId:route\.get\('local'\)/);
 assert.match(adapter,/const selected=currentId\?byId\.get\('pwa:'\+currentId\):null/);
 assert.match(worker,/const id=Number\(new URLSearchParams\(location\.search\)\.get\('memory'\)\)/);
 assert.match(worker,/this\.href='\/\?memory='\+encodeURIComponent\(id\)/);
 assert.match(worker,/this\.href='\/tell\?edit='\+encodeURIComponent\(m\.storyId\)/);
 assert.match(store,/window\.TaleraMemories=\{save:save,list:list,get:get,blob:blob,mediaUrl:mediaUrl/);
 assert.doesNotMatch(visualV8,/sessionStorage\.setItem\('taleraVisualMemoryHandoff'/);
 assert.doesNotMatch(worker,/sessionStorage\.getItem\('taleraVisualMemoryHandoff'/);
 assert.doesNotMatch(worker,/PRESENT_LOCAL_HTML|PRESENTATION_REPOSITION_SCRIPT|LOCAL_PRESENTATION_HANDOFF/);
 assert.doesNotMatch(worker,/indexedDB\.deleteDatabase|localStorage\.clear|sessionStorage\.clear/);
});

test('Original 50 RH19 records retain their full white-sheet story and exact photo identity',()=>{
 const original=originalRh19Memories();
 const ids=new Set(original.map(x=>String(x.id)));
 assert.equal(ids.size,50);
 assert.deepEqual([...ids].slice(0,3),['1','2','3']);
 assert.ok(original.every(m=>m.fullStory.startsWith(m.story)));
 assert.ok(DEMO_MEMORIES.every((m,i)=>m.id===original[i].id&&m.image===original[i].image&&m.fullStory===original[i].fullStory));
 const mark=read('../src/html/chunk2.js');
 assert.match(mark,/memory-story-scroll/);
 assert.match(mark,/memory-sheet is-visible/);
 assert.match(mark,/memoryCaption/);
 assert.match(mark,/memoryStoryScroll/);
 const doc=read('../src/html/chunk7.js');
 assert.match(doc,/memoryStoryMore\.textContent = remainder/);
 assert.match(doc,/memoryStoryScroll\.scrollTop = 0/);
});

test('iPhone navigation keeps approved icons and readable footer without HTML scraping',()=>{
 assert.doesNotMatch(worker,/ORIGINAL_TIMELINE_NAV|unifiedFooter/);
 assert.match(worker,/NAVIGATION_STYLE\+renderNavigation\("present"\)/);
 assert.match(NAVIGATION_STYLE,/#taleraPageNav\.bottom-nav,#taleraTellNav\.bottom-nav/);
 assert.match(NAVIGATION_STYLE,/background:#fff!important/);
 assert.match(NAVIGATION_STYLE,/backdrop-filter:none!important;-webkit-backdrop-filter:none!important/);
 assert.match(NAVIGATION_STYLE,/#taleraPageNav \.nav-item\.selected::before/);
 assert.match(NAVIGATION_STYLE,/background:#e6f1fd!important/);
 assert.match(NAVIGATION_STYLE,/safe-area-inset-bottom/);
 assert.match(NAVIGATION_STYLE,/body nav\[aria-label="TALERA navigatie"\]\{visibility:hidden!important\}/);
 assert.doesNotMatch(worker,/PRESENTATION_REPOSITION_SCRIPT|LOCAL_PRESENTATION_HANDOFF/);
});

test('Phone display variant preserves original photos for later full-resolution TV use',()=>{
 const store=exportedHtml(bridgeModule,'MEMORY_STORE_SCRIPT');
 const adapter=exportedHtml(adapterModule,'LOCAL_RH19_ADAPTER');
 assert.match(store,/var PHONE_EDGE=1440,PHONE_JPEG_QUALITY=\.78,PHONE_VARIANT=':phone-v1'/);
 assert.match(store,/ctx\.drawImage\(image,0,0,canvas\.width,canvas\.height\)/);
 assert.match(store,/canvas\.toBlob\(resolve,'image\/jpeg',PHONE_JPEG_QUALITY\)/);
 assert.match(store,/async function displayUrl\(key\)/);
 assert.match(store,/tx\.objectStore\('files'\)\.put\(\{key:files\[j\]\.key,blob:uploads\[j\]\}\)/);
 assert.match(store,/key:files\[k\]\.key\+PHONE_VARIANT,blob:phoneCopies\[k\]/);
 assert.match(store,/window\.TaleraMemories=\{save:save,list:list,get:get,blob:blob,mediaUrl:mediaUrl,displayUrl:displayUrl/);
 assert.match(adapter,/store\.displayUrl\?store\.displayUrl\(item\.key\):store\.mediaUrl\(item\.key\)/);
 assert.match(visualV8,/store\.displayUrl\?store\.displayUrl\(photo\.key\):store\.mediaUrl\(photo\.key\)/);
 assert.doesNotMatch(store,/deleteDatabase\(|localStorage\.clear\(/);
 checkScripts(store,'mobile-renditions');
});
test('One pure navigation component renders same tabs on all three pages',()=>{
 const navigators=['tell','timeline','present'].map(renderNavigation);
 for(const h of navigators){
  assert.match(h,/data-i18n="nav.tell"/);
  assert.match(h,/data-i18n="nav.timeline"/);
  assert.match(h,/data-i18n="nav.presentation"/);
  assert.match(h,/class="nav-icon"/);
  assert.equal((h.match(/aria-current="page"/g)||[]).length,1);
  assert.equal((h.match(/<a href=/g)||[]).length,3);
  assert.ok(h.indexOf('nav.tell')<h.indexOf('nav.timeline')&&h.indexOf('nav.timeline')<h.indexOf('nav.presentation'));
 }
 assert.match(navigators[0],/id="taleraTellNav"/);
 assert.match(navigators[2],/id="taleraPageNav"/);
 const body=read('../experiments/lifeline-main/visual-v8-photo-space.html');
 const tell=exportedHtml(tellModule,'TELL_PAGE_HTML');
 assert.equal((body.match(/<!--TALERA_SHARED_NAV-->/g)||[]).length,1);
 assert.equal((tell.match(/<!--TALERA_SHARED_NAV-->/g)||[]).length,1);
 assert.doesNotMatch(worker,/String\(HOME_HTML\)\.match\(\/.*bottom-nav/);
});
