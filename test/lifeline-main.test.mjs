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
  assert.match(worker,/import HOME_HTML from "\.\/visual-v7-photo-balance\.html"/);
  assert.match(worker,/id="talera-visual-demo-handoff"/);
  assert.match(worker,/const VISUAL_PREVIEW_PHOTO=/);
  assert.match(worker,/return reply\(addBridge\(await r\.text\(\),request\)/);
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
 assert.match(worker,/import HOME_HTML from "\.\/visual-v7-photo-balance\.html"/);
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
 assert.match(worker,/import HOME_HTML from "\.\/visual-v7-photo-balance\.html"/);
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
