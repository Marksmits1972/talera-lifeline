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
  assert.match(worker,/return reply\(pwaShell\(addBridge\(await r\.text\(\),request\)\)/);
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
 for(const k of ['id="files"','accept="image/*,video/*"','MediaRecorder','id="birthYear"','store.save(','location.replace(','__MEMORY_STORE__'])assert.ok(tell.includes(k),k);
 for(const k of ['id="gallery"','id="audio"','id="text"','store.get(id)','store.mediaUrl(entry.key)','__MEMORY_STORE__'])assert.ok(present.includes(k),k);
 for(const k of ['addLocalMemory(meta,imageUrl)','?local=','meta.items?.some','store.list()','Mijn verhalen'])assert.ok(visualV8.includes(k),k);
 checkScripts(js,'store');checkScripts(tell,'tell');checkScripts(present,'present');
});
test('V8: the existing reference stays untouched and no Cloudflare storage write is exposed',()=>{
 assert.match(worker,/const VERSION="talera-lifeline-v11-free-bulk-import-20261016"/);
 assert.match(worker,/if\(method!=="GET"&&method!=="HEAD"\)/);
 assert.match(worker,/if\(url.searchParams.has\("local"\)\)return reply\(pwaShell\(PRESENT_LOCAL_HTML/);
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
 assert.match(worker,/pwaShell\(PRESENT_LOCAL_HTML/);
 assert.match(worker,/pwaShell\(addBridge/);
 assert.match(worker,/cache-control":"no-store"/);
 assert.match(worker,/start_url:"\/"/);
});


test('V10: media-first storytelling sequence and large visual voice studio',()=>{
 const tell=exportedHtml(tellModule,'TELL_PAGE_HTML');
 const head=tell.indexOf('id="mediaSection"'),voice=tell.indexOf('id="voiceSection"'),detail=tell.indexOf('Maak je herinnering compleet');
 assert.ok(head>=0&&voice>head&&detail>voice,'Media → speech → details order');
 for(const id of ['mediaStage','strip','files','start','studio','studioStage','studioPrev','studioNext','stop','story','datePrecision','save']){
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
 for(const x of ["value=\"exact\"","value=\"month\"","value=\"year\"","value=\"period\"","id=\"dateFrom\"","id=\"dateTo\""])assert.ok(tell.includes(x),x);
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
 const styles=exportedHtml(bulkCode.split('\n')[0]+';','BULK_FREE_STYLE');
 const markup=exportedHtml('export const BULK_FREE_MARKUP = '+bulkCode.split('\n')[1].slice('export const BULK_FREE_MARKUP = '.length),'BULK_FREE_MARKUP');
 const script=exportedHtml('export const BULK_FREE_SCRIPT = '+bulkCode.split('\n')[2].slice('export const BULK_FREE_SCRIPT = '.length),'BULK_FREE_SCRIPT');
 assert.match(worker,/import \{ BULK_FREE_STYLE, BULK_FREE_MARKUP, BULK_FREE_SCRIPT \} from "\.\/bulk-free\.js"/);
 assert.match(worker,/\.replace\('<section class="card" id="mediaSection"',BULK_FREE_MARKUP/);
 assert.match(worker,/\.replace\("<\/body>",BULK_FREE_SCRIPT/);
 for(const id of ['bulkFiles','bulkPanel','bulkGroups','bulkSaveAll','bulkReturn','bulkStudio','bulkStage','bulkRecord','bulkStop'])assert.ok(markup.includes('id="'+id+'"'),id);
 assert.match(markup,/accept="image\/\*"/);
 assert.match(markup,/type="file"[^>]*multiple/);
 assert.match(script,/const mediaLimit=6,batchLimit=25/);
 assert.match(script,/if\(files\.length>batchLimit\)/);
 assert.match(script,/groups\.length\+' herinnering'/);
 assert.match(script,/const day=m\[1\]\+'-'\+m\[2\]/);
 assert.match(script,/0x9003/);
 assert.match(script,/async function capture\(file\)/);
 assert.match(script,/photos\.sort\(/);
 assert.match(script,/g\.date!==p\.date\|\|g\.photos\.length>=mediaLimit/);
 assert.match(script,/function reposition\(d\)/);
 assert.match(script,/if\(src!==dst&&dst\.photos\.length>=mediaLimit\)/);
 assert.match(script,/if\(!src\.photos\.length\)groups=groups\.filter/);
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
