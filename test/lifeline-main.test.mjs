import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { DEMO_MEMORIES } from '../experiments/lifeline-main/demo-memories.js';

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

test('Three independently routed pages and direct photo-to-presentation navigation',()=>{
  assert.match(html,/<a id="preview" href="\/present"/);
  assert.match(html,/\$\('preview'\)\.href='\/present\?memory='/);
  assert.match(html,/\$\('preview'\)\.addEventListener\('click',rememberFocus\)/);
  assert.match(html,/<nav class="bottom-nav"[^>]*>.*href="\/tell".*href="\/present"/);
  assert.match(worker,/id="taleraPageNav"/);
  assert.match(worker,/id="taleraTellNav"/);
  assert.match(worker,/body nav\[aria-label="TALERA navigatie"\]\{visibility:hidden!important\}/);
});

const visualV3=read('../experiments/lifeline-main/visual-v3.html');
test('Approved visual layout retained and connected to all three TALERA pages',()=>{
  assert.match(visualV3,/class="ages"/);
  assert.match(visualV3,/class="detail"/);
  assert.match(visualV3,/class="preview"/);
  assert.match(visualV3,/class="preview-image-wrap" href="\/present\?visual=weekend-amsterdam"/);
  assert.match(visualV3,/<a href="\/tell" class="nav-item">/);
  assert.match(visualV3,/<a href="\/" class="nav-item selected" aria-current="page">/);
  assert.match(visualV3,/<a href="\/present\?visual=weekend-amsterdam" class="nav-item">/);
  assert.match(worker,/import HOME_HTML from "\.\/visual-v8-photo-space\.html"/);
  assert.match(worker,/id="talera-visual-demo-handoff"/);
  assert.match(worker,/const VISUAL_PREVIEW_PHOTO=/);
  assert.match(worker,/return reply\(pwaShell\(presentation\)/);
});

const visualV4=read('../experiments/lifeline-main/visual-v4.html');
test('The approved lifeline now has synchronized year, month, story and tag interactions',()=>{
 for(const c of ['class="ages"','class="detail"','class="preview"'])assert.ok(visualV4.includes(c),c);
 for(const k of ["installGesture(ageLane,'year')","installGesture(monthLane,'month')","installGesture(storyLane,'story')","state.filter.add(tag)","taleraVisualMemoryHandoff","const img=new Image()"])assert.ok(visualV4.includes(k),k);
 assert.match(worker,/id="talera-lifeline-session-handoff"/);
 assert.match(worker,/bridge\+lifelineSessionBridge/);
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
const presentModule=read('../experiments/lifeline-main/present-local-page.js');
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
test('V8: each media belongs to one private on-device memory and one timeline date',()=>{
 const js=exportedHtml(bridgeModule,'MEMORY_STORE_SCRIPT');
 const tell=exportedHtml(tellModule,'TELL_PAGE_HTML');
 const present=exportedHtml(presentModule,'PRESENT_LOCAL_HTML');
 for(const k of ["indexedDB.open","objectStoreNames.contains('stories')","objectStoreNames.contains('files')","kind:kind","async function save","async function list","async function mediaUrl"])assert.ok(js.includes(k),k);
 for(const k of ['id="files"','accept="image/*,video/*"','MediaRecorder','id="moment"','store.save(','location.replace(','__MEMORY_STORE__'])assert.ok(tell.includes(k),k);
 for(const k of ['id="gallery"','id="audio"','id="text"','store.get(id)','store.mediaUrl(entry.key)','__MEMORY_STORE__'])assert.ok(present.includes(k),k);
 for(const k of ['addLocalMemory(meta,imageUrl)','?local=','meta.items?.some','store.list()','Mijn verhalen'])assert.ok(visualV8.includes(k),k);
 checkScripts(js,'store');checkScripts(tell,'tell');checkScripts(present,'present');
});
test('V8: the existing reference stays untouched and no Cloudflare storage write is exposed',()=>{
 assert.match(worker,/const VERSION="talera-lifeline-v13-nine-corrections-20261016-iphone-polish-r1"/);
 assert.match(worker,/if\(method!=="GET"&&method!=="HEAD"\)/);
 assert.match(worker,/if\(url.searchParams.has\("local"\)\)presentation=presentation.replace/);
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
 assert.match(worker,/MEMORY_STORE_SCRIPT\+LOCAL_PRESENTATION_HANDOFF/);
 assert.match(worker,/pwaShell\(presentation/);
 assert.match(worker,/cache-control":"no-store"/);
 assert.match(worker,/start_url:"\/"/);
});


test('V10: media-first storytelling sequence and large visual voice studio',()=>{
 const tell=exportedHtml(tellModule,'TELL_PAGE_HTML');
 const head=tell.indexOf('id="mediaSection"'),voice=tell.indexOf('id="voiceSection"'),detail=tell.indexOf('Maak je herinnering compleet');
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
 assert.match(tell,/De geluidsopname wordt apart bewaard/);
 assert.match(tell,/In Free schrijven we je woorden niet automatisch over/);
});
test('V10: date precision roundtrips through local storage, timeline and presentation',()=>{
 const store=exportedHtml(bridgeModule,'MEMORY_STORE_SCRIPT');
 const tell=exportedHtml(tellModule,'TELL_PAGE_HTML');
 const present=exportedHtml(presentModule,'PRESENT_LOCAL_HTML');
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
 assert.match(present,/data\.datePrecision==='year'/);
 assert.match(present,/data\.datePrecision==='period'/);
 assert.match(present,/items\.findIndex\(item=>item\.kind==='photo'\)/);
 assert.match(tell,/item===cover\(\)/);
 checkScripts(tell,'v10-tell');checkScripts(present,'v10-presentation');checkScripts(store,'v10-storage');checkScripts(visualV8,'v10-timeline');
});


const bulkCode=read('../experiments/lifeline-main/bulk-free.js');
test('V11 Free: bulk import can select twenty-five photos and shows separated memory cards in Tell',()=>{
 const [styleLine,markupLine,scriptLine]=bulkCode.trim().split('\n');
 const styles=exportedHtml(styleLine,'BULK_FREE_STYLE');
 const markup=exportedHtml(markupLine,'BULK_FREE_MARKUP');
 const script=exportedHtml(scriptLine,'BULK_FREE_SCRIPT');
 assert.match(worker,/import \{ BULK_FREE_STYLE, BULK_FREE_MARKUP, BULK_FREE_SCRIPT \} from "\.\/bulk-free\.js"/);
 assert.match(worker,/\.replace\('<section class="card" id="mediaSection"',BULK_FREE_MARKUP/);
 assert.match(worker,/\.replace\("<\/body>",BULK_FREE_SCRIPT/);
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
test('V12: year/month/story drag and presentation memory drag compile and call retime',()=>{
 const drag=read('../experiments/lifeline-main/timeline-reposition.js');
 const presentDrag=read('../experiments/lifeline-main/presentation-reposition.js');
 for(const [raw,key] of [[drag,'TIMELINE_REPOSITION_SCRIPT'],[presentDrag,'PRESENTATION_REPOSITION_SCRIPT']]){
  const code=exportedHtml(raw,key);
  assert.match(code,/store\.retime\(/);
  assert.match(code,/pointerdown/);
  assert.match(code,/pointermove/);
  assert.match(code,/pointerup/);
  checkScripts(code,key);
 }
 assert.match(worker,/TIMELINE_REPOSITION_SCRIPT/);
 assert.match(worker,/PRESENTATION_REPOSITION_SCRIPT/);
});

test('V13 Free: directly entering presentation, persistent gestures and clear navigation',()=>{
 const src=read('../experiments/lifeline-main/presentation-reposition.js');
 const code=exportedHtml(src,'PRESENTATION_REPOSITION_SCRIPT');
 assert.match(code,/touch-action:none/);
 assert.match(code,/gallery.addEventListener\('pointerdown'/);
 assert.match(code,/document.getElementById\(dx<0\?'next':'prev'\)/);
 assert.match(code,/store.retime\(currentId/);
 assert.match(code,/-webkit-touch-callout:none/);
 assert.match(code,/z-index:20000/);
 assert.match(worker,/talera-photo-route-v13/);
 checkScripts(code,'presentation-v13');
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
 for(const name of ['Exacte datum','Maand + jaar','Alleen jaartal','Seizoen + jaar'])assert.ok(picker.includes(name),name);
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


test('V13 iPhone corrections: local memories open in the native RH19 presentation, not the dark detail page',()=>{
 const source=read('../experiments/lifeline-main/iphone-v13-corrections.js');
 const module={exports:{}};
 const result={};
 const context=vm.createContext({...result});
 vm.runInContext(source.replaceAll('export const ','const ')+String.fromCharCode(10)+
  'this.__polish={FREE_TELL_POLISH_STYLE,LOCAL_PRESENTATION_HANDOFF}',context);
 const css=context.__polish.FREE_TELL_POLISH_STYLE;
 const handoff=context.__polish.LOCAL_PRESENTATION_HANDOFF;
 assert.match(worker,/LOCAL_PRESENTATION_HANDOFF/);
 assert.match(worker,/MEMORY_STORE_SCRIPT\+LOCAL_PRESENTATION_HANDOFF/);
 assert.doesNotMatch(worker,/if\(url.searchParams.has\("local"\)\)return reply\(pwaShell\(PRESENT_LOCAL_HTML/);
 assert.match(handoff,/runtime.restrictToMemory\(memory\)/);
 assert.match(handoff,/await store.get\(id\)/);
 assert.match(handoff,/await store.mediaUrl\(item.key\)/);
 assert.match(handoff,/book.state=function/);
 assert.match(handoff,/book.step=function/);
 assert.match(handoff,/frame.kind==='photo'/);
 assert.match(handoff,/createElement\('video'\)/);
 assert.match(css,/\.intro\{display:none/);
 const client=handoff.match(/<script[^>]*>([\s\S]*?)<\/script>/);
 assert.ok(client);
 assert.doesNotThrow(()=>new vm.Script(client[1]));
 assert.doesNotMatch(handoff,/indexedDB.deleteDatabase|localStorage.clear|sessionStorage.clear/);
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
test('V13 presentation: preserve native RH19 photo fitting and three-page swipe engine',()=>{
 const code=read('../src/presentation-controller.js');
 assert.match(code,/const targetH=Math.min\(boxH,Math.max\(containH,boxH\*\.68\)\)/);
 assert.match(code,/const zoom=Math.min\(1\.82,Math.max\(1,targetH\/containH\)\)/);
 const local=read('../experiments/lifeline-main/iphone-v13-corrections.js');
 assert.match(local,/const nativeState=book.state.bind\(book\)/);
 assert.match(local,/const nativeStep=book.step.bind\(book\)/);
 assert.match(local,/runtime.writeMemory\(m\)/);
 assert.match(local,/_photoIndex=i/);
 assert.match(local,/if\(hasVideo\)\{/);
 assert.doesNotMatch(local,/document.addEventListener\('touchend'/);
});


test('V13 native photo-book handoff offers correct neighboring local photographs without a second viewer',()=>{
 const correction=read('../experiments/lifeline-main/iphone-v13-corrections.js');
 const context=vm.createContext({});
 vm.runInContext(correction.replaceAll('export const ','const ')+String.fromCharCode(10)+
  'this.handoff=LOCAL_PRESENTATION_HANDOFF',context);
 const embedded=context.handoff.match(/<script[^>]*>([\\s\\S]*?)<\\/script>/);
 assert.ok(embedded);
 const script=embedded[1];
 const nativeSnippet=script.slice(script.indexOf('const nativeState=book.state.bind(book);'),
    script.indexOf('document.body.classList.add(',script.indexOf('const nativeState=book.state.bind(book);')));
 assert.ok(nativeSnippet.includes('previous:i>0?{image:m.photos[i-1]}:null'));
 assert.ok(nativeSnippet.includes('next:i<m.photos.length-1?{image:m.photos[i+1]}:null'));
 assert.ok(nativeSnippet.includes('runtime.writeMemory(m)'));
 const memory={id:51001,_taleraLocal:true,_taleraHasVideo:false,_photoIndex:0,photos:['foto-1','foto-2','foto-3'],image:'foto-1'};
 let writes=0,draws=0;
 const runtime={currentMemory:()=>memory,writeMemory:()=>{writes++},draw:()=>{draws++}};
 const book={state(){return {index:7,current:null}},step(){return false}};
 vm.runInNewContext('(()=>{'+nativeSnippet+'})()', {book,runtime,Math});
 assert.equal(book.state().current.image,'foto-1');
 assert.equal(book.state().previous,null);
 assert.equal(book.state().next.image,'foto-2');
 assert.equal(book.step(1),true);
 assert.equal(memory.image,'foto-2');
 assert.equal(book.state().previous.image,'foto-1');
 assert.equal(book.state().next.image,'foto-3');
 assert.equal(book.step(1),true);
 assert.equal(memory.image,'foto-3');
 assert.equal(book.step(1),false);
 assert.equal(book.step(-1),true);
 assert.equal(memory.image,'foto-2');
 assert.equal(writes,3);
 assert.equal(draws,3);
});
