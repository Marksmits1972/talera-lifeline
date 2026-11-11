// Build F5 templates from the user-identified 2026-11-07 design-cleanup candidate. It retains the earlier 5-language + DOB changes; test before any deploy.
// No account, cookie, D1, R2 or live private data is fetched.
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {secureAccountMenuTransitions} from './f5-account-switch-guard.mjs';
import {anonymousShells} from '../free-10m-delivery/generated/approved-assets.mjs';
import {mkdirSync,readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const delivery=path.resolve(here,'../free-10m-delivery');
const publicDir=path.join(delivery,'public');
const generated=path.join(here,'generated');
const origin='https://talera-design-cleanup-fase1-test-20261107.mark-a39.workers.dev';
const routes={'/mijn-leven':'mijn-leven','/present':'present','/tell':'tell'};
const sha=buf=>createHash('sha256').update(buf).digest('hex');
// iOS Home Screen: retain the already approved original three-panel TALERA logo.
// Fetch ONLY the existing approved deep-blue icon files, never user data.
const approvedLogoOrigin='https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev';
const approvedPwaIcons=Object.freeze({
 '/apple-touch-icon.png':180,
 '/pwa-192.png':192,
 '/pwa-512.png':512
});
async function getApprovedLogo(size){
 const url=new URL('/talera-brand-voorstel-d-icon-'+size+'.png',approvedLogoOrigin);
 const response=await fetch(url,{method:'GET',redirect:'error',
   signal:AbortSignal.timeout(25000)});
 assert.equal(response.status,200,'Official TALERA logo unavailable: '+size);
 assert.match(response.headers.get('content-type')||'',/image\/png/i,
   'Official logo must be a PNG: '+size);
 assert.ok(!response.headers.get('set-cookie'),'Reject cookie-bearing logo');
 const bytes=Buffer.from(await response.arrayBuffer());
 assert.ok(bytes.length>80&&bytes.length<2_000_000,'Invalid official logo bytes');
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',
   'Official logo PNG signature invalid');
 assert.equal(bytes.readUInt32BE(16),size,'Official logo PNG width changed');
 assert.equal(bytes.readUInt32BE(20),size,'Official logo PNG height changed');
 return bytes;
}
// Single-app source lock: these are the three exact anonymous app shells
// already packaged and deployed by successful F5 QA run 42782342846.
// The upstream reference site must never silently supply a changed app
// on the same GitHub commit. Stop the build instead of changing TALERA UI.
const approvedShellLock=Object.freeze({
 '/mijn-leven':'/__talera_free/shell/1853d43d20521260078156960e4b9dd92290d5d27c75105380813a8a4e30613e.html',
 '/present':'/__talera_free/shell/25bd6ef18932f6fb5a15a8baa17d9a1e8b5b0236b5c3f11666c3e54110142705.html',
 '/tell':'/__talera_free/shell/9f39f4667819d05edfa35c9ad861f5e6035871c60e02407e3f9eee7362173bfe.html'
});
assert.deepEqual(Object.keys(anonymousShells).sort(),Object.keys(approvedShellLock).sort(),
 'APPROVED_FREE_UI_ROUTE_DRIFT_ABORT');
for(const [route,pinnedAsset] of Object.entries(approvedShellLock)){
 assert.equal(anonymousShells[route],pinnedAsset,
  'APPROVED_FREE_UI_SOURCE_DRIFT_ABORT: '+route);
}

mkdirSync(generated,{recursive:true});
mkdirSync(path.join(publicDir,'__talera_free','f5references'),{recursive:true});
mkdirSync(path.join(publicDir,'__talera_free','f5scripts'),{recursive:true});
// Isolated, authenticated F5-only archive modules. Direct public asset URLs
// remain behind Worker-first gate. Never inject into approved TALERA pages.
const backupAssets=path.join(publicDir,'__talera_free','f5backup');
mkdirSync(backupAssets,{recursive:true});
for(const name of ['f5-portable-idb.mjs','f5-portable-archive.mjs','f5-backup-controller.mjs']){
 copyFileSync(path.join(here,name),path.join(backupAssets,name));
}
// Restore the proven ordinary presentation click path for automatic local
// PHOTO-ONLY changes. Decode the next photo BEFORE advancing the visible dot.
// Existing narrated stories, videos, UI and stored memory bytes are untouched.
function fixPhotoOnlyPresentation(original){
 const exact=(s,a,b)=>{
   assert.equal(s.split(a).length,2,'PRESENTATION_PHOTO_AUTOPLAY_SOURCE_DRIFT');
   return s.replace(a,b);
 };
 const show="  function showPhoto(memory,index,manual=false){\n";
 const guarded="  let pendingAutoPhoto=null,photoAutoSerial=0;\n"+
   "  function showPhoto(memory,index,manual=false){\n"+
   "    if(manual){photoAutoSerial++;pendingAutoPhoto=null}\n"+
   "    if(!manual&&memory?._taleraLocal&&Array.isArray(memory.photos)&&memory.photos.length>1&&\n"+
   "       !memory._zeroItems?.some(x=>x.kind==='audio')&&\n"+
   "       !memory._zeroFrames?.some(x=>x.kind==='video')){\n"+
   "      if(pendingAutoPhoto)return;\n"+
   "      const next=((index%memory.photos.length)+memory.photos.length)%memory.photos.length;\n"+
   "      const src=memory.photos[next],serial=++photoAutoSerial,preload=new Image();\n"+
   "      const pending={serial};pendingAutoPhoto=pending;\n"+
   "      const discard=()=>{if(pendingAutoPhoto===pending)pendingAutoPhoto=null};\n"+
   "      const ready=()=>{\n"+
   "        if(pendingAutoPhoto!==pending||serial!==photoAutoSerial||!preload.naturalWidth||\n"+
   "           runtime.currentMemory()?.id!==memory.id)return;\n"+
   "        clearTimeout(pending.timer);pendingAutoPhoto=null;\n"+
   "        showPhoto(memory,next,true); // The original WORKING tap path.\n"+
   "      };\n"+
   "      preload.onload=ready;preload.onerror=discard;\n"+
   "      pending.timer=setTimeout(discard,12000);\n"+
   "      preload.src=src;if(preload.complete&&preload.naturalWidth)ready();\n"+
   "      return;\n"+
   "    }\n";
 const schedule="    lastWrittenMemoryId=memory&&memory.id;\n"+
   "    syncTaleraStoryFrame(memory);\n"+
   "    renderDots(memory);\n"+
   "    scheduleAuto(memory);\n"+
   "  });";
 const stable="    lastWrittenMemoryId=memory&&memory.id;\n"+
   "    if(changed){photoAutoSerial++;pendingAutoPhoto=null}\n"+
   "    syncTaleraStoryFrame(memory);\n"+
   "    renderDots(memory);\n"+
   "    if(changed||(!autoStartTimer&&!autoInterval&&!pendingAutoPhoto))scheduleAuto(memory);\n"+
   "  });";
 const result=exact(exact(original,show,guarded),schedule,stable);
 assert.ok(result.includes('window.__taleraV31SelectPhoto=')&&
   result.includes('function taleraInlineOrdinaryStep('),
   'Ordinary presentation manual photo source changed unexpectedly');
 return result;
}
// V13's REAL 11-page wheel, not the older three-page controller. On the
// first return to a just-saved local photo it hid a page while its Blob was
// still decoding and then forcibly removed the wheel after 1400 ms. Preserve
// the existing wheel, order, velocity, and gesture handlers. Keep an already
// loaded photo painted until the target is ready; never expose a white page.
function fixFirstSwipePhotoLoad(html){
 const replace=(original,replacement,what)=>{
  assert.equal(html.split(original).length,2,'F5_WHEEL_SOURCE_DRIFT_'+what);
  html=html.replace(original,replacement);
 };
 const oldAssign=[
 "  function assign(tile,index,mem){",
 "    if(tile.index===index&&tile.el.dataset.url===(mem?.previewImage||mem?.thumbnail||mem?.image))return;",
 "    tile.index=index;",
 "    if(!mem||!mem.image){tile.el.style.visibility='hidden';return;}",
 "    const url=mem.previewImage||mem.thumbnail||mem.image;",
 "    tile.el.dataset.url=url;tile.el.style.visibility='hidden';",
 "    const onload=()=>{",
 "      if(tile.el.dataset.url!==url)return;",
 "      try{fitNode(tile.sharp,tile.blur,dimension(),stage.getBoundingClientRect().height);}catch(e){}",
 "      tile.el.style.visibility='visible';",
 "    };",
 "    tile.sharp.onload=onload;",
 "    if(tile.back&&tile.back.src!==url)tile.back.src=url;",
 "    if(tile.blur&&tile.blur.src!==url)tile.blur.src=url;",
 "    if(tile.sharp.src!==url)tile.sharp.src=url;",
 "    if(tile.sharp.complete&&tile.sharp.naturalWidth)onload();",
 "  }"
 ].join('\n');
 const newAssign=[
 "  function assign(tile,index,mem){",
 "    if(tile.index===index&&tile.el.dataset.url===(mem?.previewImage||mem?.thumbnail||mem?.image))return;",
 "    tile.index=index;",
 "    if(!mem||!mem.image){tile.el.style.visibility='hidden';return;}",
 "    const url=mem.previewImage||mem.thumbnail||mem.image;",
 "    tile.el.dataset.url=url;",
 "    // An existing painted photo stays visible while the new local Blob decodes.",
 "    // This is only a temporary handoff; no new photo or story is created.",
 "    const base=document.getElementById('memoryPhotoA');",
 "    const fallback=base?.complete&&base.naturalWidth?(base.currentSrc||base.src):null;",
 "    if(tile.sharp.src===url&&tile.sharp.complete&&tile.sharp.naturalWidth){",
 "      try{fitNode(tile.sharp,tile.blur,dimension(),stage.getBoundingClientRect().height);}catch(e){}",
 "      tile.el.style.visibility='visible';return;",
 "    }",
 "    if(fallback){",
 "      if(tile.sharp.src!==fallback)tile.sharp.src=fallback;",
 "      if(tile.back&&tile.back.src!==fallback)tile.back.src=fallback;",
 "      if(tile.blur&&tile.blur.src!==fallback)tile.blur.src=fallback;",
 "      tile.el.style.visibility='visible';",
 "    }else{",
 "      tile.el.style.visibility=tile.sharp.complete&&tile.sharp.naturalWidth?'visible':'hidden';",
 "    }",
 "    const cached=cache.get(mem.id);",
 "    const img=cached?.src===url?cached:new Image();",
 "    if(img!==cached){",
 "      img.decoding='async';img.src=url;cache.set(mem.id,img);",
 "      if(cache.size>35)cache.delete(cache.keys().next().value);",
 "    }",
 "    const install=()=>{",
 "      if(tile.index!==index||tile.el.dataset.url!==url||!img.naturalWidth)return;",
 "      const painted=()=>{",
 "        if(tile.index!==index||tile.el.dataset.url!==url)return;",
 "        try{fitNode(tile.sharp,tile.blur,dimension(),stage.getBoundingClientRect().height);}catch(e){}",
 "        if(tile.back&&tile.back.src!==url)tile.back.src=url;",
 "        if(tile.blur&&tile.blur.src!==url)tile.blur.src=url;",
 "        tile.el.style.visibility='visible';",
 "      };",
 "      tile.sharp.onload=painted;",
 "      if(tile.sharp.src!==url)tile.sharp.src=url;",
 "      if(tile.sharp.complete&&tile.sharp.naturalWidth)painted();",
 "    };",
 "    const decoded=()=>{",
 "      if(typeof img.decode==='function')img.decode().then(install,()=>{if(img.naturalWidth)install()});",
 "      else install();",
 "    };",
 "    if(img.complete&&img.naturalWidth)decoded();",
 "    else img.addEventListener('load',decoded,{once:true});",
 "  }"
 ].join('\n');
 replace(oldAssign,newAssign,'ASSIGN');
 const before="    if(current&&current.complete&&current.naturalWidth)requestAnimationFrame(finish);\n"+
  "    else if(current){current.addEventListener('load',finish,{once:true});setTimeout(finish,1400);}\n"+
  "    else requestAnimationFrame(finish);";
 const after="    // Never expose a white base photo when a freshly saved iPhone image needs\n"+
  "    // longer than 1400 ms to load. The existing wheel remains the painted\n"+
  "    // surface until the actual selected image has loaded.\n"+
  "    if(current&&current.complete&&current.naturalWidth)requestAnimationFrame(finish);\n"+
  "    else if(current)current.addEventListener('load',finish,{once:true});\n"+
  "    else requestAnimationFrame(finish);";
 replace(before,after,'COMMIT');
 assert.ok(html.includes("const N=11,pages=[],cache=new Map()"),
  'Must patch only the already existing 11-page wheel');
 return html;
}
// Original V13 wheel prefetch ran at document bootstrap and then only on
// movement. Private IndexedDB memories are hydrated AFTER bootstrap: before
// the first swipe those original photos were still cold, causing 2-3 blank
// frames. Reuse the EXISTING preload cache immediately on runtime hydration;
// keep identical 11-page wheel, timing, geometry, gesture and selected story.
function warmUpFirstSwipePhotoStrip(html){
 const replace=(oldValue,newValue,label)=>{
   assert.equal(html.split(oldValue).length,2,'F5_COLD_SWIPE_SOURCE_DRIFT_'+label);
   html=html.replace(oldValue,newValue);
 };
 const oldPrefetch="  function prefetch(){\n"+
   "    const items=all(),c=Math.round(state.p),dir=Math.sign(state.v);\n"+
   "    for(let off=(dir>=0?-3:-9);off<=(dir>=0?9:3);off++){\n"+
   "      const mem=items[c+off];if(!mem||!mem.image||cache.has(mem.id))continue;\n"+
   "      const img=new Image();img.decoding='async';img.src=mem.previewImage||mem.thumbnail||mem.image;\n"+
   "      cache.set(mem.id,img);\n"+
   "      if(cache.size>35)cache.delete(cache.keys().next().value);\n"+
   "    }\n"+
   "  }";
 const warmPrefetch="  function prefetch(){\n"+
   "    const items=all(),c=Math.round(state.p),dir=Math.sign(state.v);\n"+
   "    for(let off=(dir>=0?-3:-9);off<=(dir>=0?9:3);off++){\n"+
   "      const mem=items[c+off];if(!mem||!mem.image)continue;\n"+
   "      const source=mem.previewImage||mem.thumbnail||mem.image;\n"+
   "      if(cache.get(mem.id)?.src===source)continue;\n"+
   "      const img=new Image();img.decoding='async';img.src=source;\n"+
   "      cache.set(mem.id,img);\n"+
   "      if(cache.size>35)cache.delete(cache.keys().next().value);\n"+
   "    }\n"+
   "  }";
 replace(oldPrefetch,warmPrefetch,'PREFETCH');
 const oldSub="  if(runtime?.subscribe)runtime.subscribe(()=>{if(state.visible||state.drag||window.__taleraBandRolling)return;state.p=book.state().index;state.center=-1;});";
 const updatedSub="  if(runtime?.subscribe)runtime.subscribe(()=>{\n"+
   "    if(state.visible||state.drag||window.__taleraBandRolling)return;\n"+
   "    state.p=book.state().index;state.center=-1;\n"+
   "    // The owner's local memories arrive after the first PWA render.\n"+
   "    // Warm the SAME 13-photo budget before the first touch, not on swipe.\n"+
   "    prefetch();\n"+
   "  });";
 replace(oldSub,updatedSub,'IDB_HYDRATION');
 const oldFallback="    const fallback=base?.complete&&base.naturalWidth?(base.currentSrc||base.src):null;";
 const newFallback="    // A newly restored base image may be cold; retain any already decoded\n"+
   "    // photo from this account's existing bounded wheel cache instead.\n"+
   "    const readyNeighbour=[...cache.values()].find(img=>img.complete&&img.naturalWidth);\n"+
   "    const fallback=base?.complete&&base.naturalWidth?(base.currentSrc||base.src):\n"+
   "      (readyNeighbour?.currentSrc||readyNeighbour?.src||null);";
 replace(oldFallback,newFallback,'COLD_FALLBACK');
 assert.ok(html.includes("const N=11,pages=[],cache=new Map()"),
   'Only existing V13 photo wheel may change');
 return html;
}
// The ORIGINAL private V8 memory adapter registered all newly discovered
// account-local stories with a 32px blank placeholder; only after registration
// did it asynchronously load the real cover of the selected story. Rapid
// first swipes therefore displayed actual blank records, not merely a cold
// wheel tile. Prime only five nearby LOCAL covers BEFORE publishing records
// to the original timeline, and reuse each Blob URL during normal hydration.
// No new database, no media copy, no album/reordering/narration changes.
function primeFirstOpenLocalStoryCovers(html){
 const exact=(before,after,label)=>{
   assert.equal(html.split(before).length,2,'F5_FIRST_OPEN_ADAPTER_SOURCE_DRIFT_'+label);
   html=html.replace(before,after);
 };
 const hydrateAnchor=" async function hydrate(memory){";
 const prime=" // Keep up to five first-frame object URLs, scoped to this page and account.\n // The full existing hydrate() is still responsible for every other frame.\n async function warmFirstPhoto(memory){\n   if(!memory?._taleraLocal||memory._taleraFirstWarm)return;\n   const first=memory._zeroItems?.find(item=>item.kind==='photo'||item.kind==='video');\n   if(!first)return;\n   let url=null;\n   try{\n     if(first.kind==='photo'){\n       url=await (store.displayUrl?store.displayUrl(first.key):store.mediaUrl(first.key));\n     }else{\n       const still=await store.blob(first.key+':phone-v1');\n       if(still instanceof Blob&&still.size&&String(still.type).startsWith('image/'))\n         url=URL.createObjectURL(still);\n       else memory.image=videoPoster;\n     }\n   }catch(e){console.warn('TALERA eerste verhaalbeeld nog niet geladen',e)}\n   if(!url)return;\n   memory._taleraFirstWarm={key:first.key,url};\n   memory.image=url;memory.previewImage=url;\n }\n";
 exact(hydrateAnchor,prime+hydrateAnchor,'WARM_BEFORE_HYDRATE');
 const beforePhoto="           try{url=await (store.displayUrl?store.displayUrl(item.key):store.mediaUrl(item.key))}catch(e){}";
 const afterPhoto="           try{url=memory._taleraFirstWarm?.key===item.key?memory._taleraFirstWarm.url:\n"+
  "             await (store.displayUrl?store.displayUrl(item.key):store.mediaUrl(item.key))}catch(e){}";
 exact(beforePhoto,afterPhoto,'REUSE_SAME_LOCAL_COVER');
 const beforeVideo="           try{const poster=await store.blob(item.key+':phone-v1');if(poster instanceof Blob&&poster.size&&String(poster.type).startsWith('image/'))url=URL.createObjectURL(poster)}catch(e){}";
 const afterVideo="           try{if(memory._taleraFirstWarm?.key===item.key)url=memory._taleraFirstWarm.url;\n"+
  "             else{const poster=await store.blob(item.key+':phone-v1');if(poster instanceof Blob&&poster.size&&String(poster.type).startsWith('image/'))url=URL.createObjectURL(poster)}}catch(e){}";
 exact(beforeVideo,afterVideo,'REUSE_SAME_VIDEO_STILL');
 const beforeRegistration="   for(const m of memories)map.set(m.id,m);\n"+
  "   runtime.registerMemories(memories);\n"+
  "   const selected=isLocalId(wanted)?map.get('pwa:'+wanted):null;";
 const afterRegistration="   for(const m of memories)map.set(m.id,m);\n"+
  "   const selected=isLocalId(wanted)?map.get('pwa:'+wanted):null;\n"+
  "   // Only a few adjacent covers, never all stories or original files.\n"+
  "   // First real cover and neighbours are ready before swipe can show them.\n"+
  "   const center=selected?.ms??runtime.currentMemory()?.ms??Date.now();\n"+
  "   const near=memories.slice().sort((a,b)=>Math.abs(a.ms-center)-Math.abs(b.ms-center)).slice(0,5);\n"+
  "   await Promise.all(near.map(warmFirstPhoto));\n"+
  "   runtime.registerMemories(memories);";
 exact(beforeRegistration,afterRegistration,'REGISTER_AFTER_REAL_COVERS');
 const beforeRevoke="   for(const urls of loaded.values())for(const url of urls)URL.revokeObjectURL(url);\n"+
  "   loaded.clear();";
 const afterRevoke="   for(const urls of loaded.values())for(const url of urls)URL.revokeObjectURL(url);\n"+
  "   for(const m of map.values()){\n"+
  "     const warm=m._taleraFirstWarm?.url;\n"+
  "     if(warm&&!loaded.has(m.id))URL.revokeObjectURL(warm);\n"+
  "   }\n"+
  "   loaded.clear();";
 exact(beforeRevoke,afterRevoke,'RELEASE_WARM_COVERS');
 assert.ok(html.includes('const selected=isLocalId(wanted)?map.get('),'Original ID selection preserved');
 return html;
}
// Reuse the existing V61 local video poster generator and its IndexedDB
// preview sidecar. On iPhone a hidden 2x2 autoplay video may never present a
// frame; the visible native tile already has a load/seek/canvas fallback, but
// that fallback requires successful autoplay. Keep the SAME original video,
// media ID, photo/video order and poster storage; make the existing fallback
// work when Safari blocks autoplay, and paint the real frame before capture.
function fixVideoFirstFramePreview(html){
 const replace=(a,b,what)=>{
  assert.equal(html.split(a).length,2,'F5_VIDEO_POSTER_SOURCE_DRIFT_'+what);
  html=html.replace(a,b);
 };
 const originalStyle="  video.style.cssText='position:fixed;left:-10px;top:-10px;width:2px;height:2px;opacity:0;pointer-events:none;z-index:-1';";
 const visibleToDecoder="  // A nonzero composited box lets iOS decode even when autoplay is blocked.\n"+
  "  // It stays behind the page and does not change the TALERA layout.\n"+
  "  video.style.cssText='position:fixed;left:0;top:0;width:96px;height:96px;opacity:.001;pointer-events:none;z-index:-1';";
 replace(originalStyle,visibleToDecoder,'DECODER_SURFACE');
 const oldCapture="      pending=true;v.style.opacity='1';v.pause();\n"+
  "      try{\n"+
  "        const image=await drawnPreview(v,v.videoWidth,v.videoHeight);";
 const newCapture="      pending=true;v.style.opacity='1';v.pause();\n"+
  "      try{\n"+
  "        // Let Safari paint the decoded first video frame before canvas reads\n"+
  "        // it. If canvas capture fails the genuine paused video stays visible.\n"+
  "        await new Promise(done=>requestAnimationFrame(()=>done()));\n"+
  "        if(!v.isConnected||!assets.has(id)||previewBlobs.has(id))return;\n"+
  "        const image=await drawnPreview(v,v.videoWidth,v.videoHeight);";
 replace(oldCapture,newCapture,'NATIVE_FRAME_PAINT');
 const oldMeta=[
 "    v.addEventListener('loadedmetadata',()=>{",
 "      if(Number.isFinite(v.duration)&&v.duration>.2){try{v.currentTime=Math.min(.15,v.duration/3)}catch(e){}}",
 "      void v.play().then(()=>setTimeout(()=>{if(v.isConnected){v.pause();void capture()}},250)).catch(()=>{});",
 "    },{once:true});",
 "    for(const e of ['loadeddata','seeked','canplay','timeupdate'])v.addEventListener(e,()=>void capture());"
 ].join('\n');
 const newMeta=[
 "    v.addEventListener('loadedmetadata',()=>{",
 "      if(Number.isFinite(v.duration)&&v.duration>.2){try{v.currentTime=Math.min(.15,v.duration/3)}catch(e){}}",
 "      // Seek and loadeddata can decode a frame without a play gesture.",
 "      // Safari Low Power Mode may reject play(): that is not poster failure.",
 "      void v.play().then(()=>setTimeout(()=>{if(v.isConnected){v.pause();void capture()}},250))",
 "        .catch(()=>{if(v.readyState>=2)void capture()});",
 "    },{once:true});",
 "    for(const e of ['loadeddata','seeked','canplay','timeupdate'])",
 "      v.addEventListener(e,()=>{if(v.readyState>=2)void capture()});"
 ].join('\n');
 replace(oldMeta,newMeta,'SAFARI_AUTOPLAY_BLOCK');
 assert.ok(html.includes("previewBlobs.set(id,image);refreshPreview(id);"),
  'Existing direct video poster selection must remain');
 assert.ok(html.includes("writeFiles([['preview:'+id,image]])"),
  'Local draft poster cache must remain');
 assert.ok(html.includes("key:item.key+':phone-v1'"),
  'Published video poster must preserve original media ID');
 return html;
}
const refs={};
for(const [route,filename] of Object.entries(routes)){
 let html=readFileSync(path.join(delivery,'generated','reference-'+filename+'.html'),'utf8');
 if(route==='/present')html=fixPhotoOnlyPresentation(html);
 if(route==='/present')html=fixFirstSwipePhotoLoad(html);
 if(route==='/present')html=warmUpFirstSwipePhotoStrip(html);
 if(route==='/present')html=primeFirstOpenLocalStoryCovers(html);
 if(route==='/tell')html=fixVideoFirstFramePreview(html);
 assert.ok(html.length>50000,'Unexpectedly small anonymous reference '+route);
 assert.ok(!/\b(?:talera_sid|set-cookie)\s*=\s*[a-f0-9]{64}/i.test(html),'Refuse session-bearing HTML');
 const hash=sha(html),file=hash+'.html';
 writeFileSync(path.join(publicDir,'__talera_free','f5references',file),html,'utf8');
 refs[route]='/__talera_free/f5references/'+file;
}
// The approved /present page creates a SAME-ORIGIN iframe at
// /vertelmodus-embed?mode=present. Its unchanged zero-based video/audio
// player MUST be present or the RH19 dots advance over a frozen base image.
// Package this public, cookie-free upstream player exactly, not a substitute.
async function fetchApprovedPlayer(mode){
 const u=new URL('/vertelmodus-embed?mode='+mode,origin);
 const r=await fetch(u,{method:'GET',headers:{accept:'text/html'},
   redirect:'error',signal:AbortSignal.timeout(25000)});
 assert.equal(r.status,200,'Approved embedded narrator unavailable: '+mode);
 assert.match(r.headers.get('content-type')||'',/text\/html/i,
   'Original player must be delivered as HTML');
 assert.ok(!r.headers.get('set-cookie'),
   'Refuse embedded player emitting customer session cookies');
 const html=await r.text();
 assert.ok(html.length>12000&&html.length<1_500_000,
   'Unexpected original embed size');
 for(const word of ['taleraZero','READY','INIT','VIDEO','voice','postMessage']){
  assert.ok(html.includes(word),'Missing original zero-player marker: '+word);
 }
 return html;
}
const approvedPlayerA=await fetchApprovedPlayer('present');
const approvedPlayerB=await fetchApprovedPlayer('record');
assert.equal(approvedPlayerA,approvedPlayerB,
  'Approved recording and presentation must use IDENTICAL embedded player');
const approvedPlayerFile=sha(approvedPlayerA)+'.html';
writeFileSync(path.join(publicDir,'__talera_free','f5references',approvedPlayerFile),
  approvedPlayerA,'utf8');
refs['/vertelmodus-embed']='/__talera_free/f5references/'+approvedPlayerFile;
const scripts={};
const paths=[
 '/__clean/menu-integration.mjs',
 '/__clean/ui-integration.mjs',
 '/__clean/share-controller.mjs',
 '/__clean/guest-presentation-v55.js'
];
async function getPublic(name){
 const u=new URL(name,origin);
 assert.equal(u.origin,origin);
 const r=await fetch(u,{headers:{accept:'text/javascript,application/javascript'},
   redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!r.ok)return {status:r.status};
 assert.ok(!r.headers.get('set-cookie'),'Refuse cookie issuing script '+name);
 assert.match(r.headers.get('content-type')||'',/(?:javascript|text\/plain)/i,
   'Expected JavaScript response type '+name);
 const text=await r.text();
 assert.ok(text.length>100&&text.length<2000000,'Unexpected public JavaScript size '+name);
 return {status:200,body:text};
}
for(const name of paths){
 const first=await getPublic(name),second=await getPublic(name);
 // Optional older public scripts are not needed until a real page references them.
 if(first.status===404&&second.status===404)continue;
 assert.equal(first.status,200,'F5 public script must exist: '+name);
 assert.equal(second.status,200,'F5 public script repeat must exist: '+name);
 assert.equal(first.body,second.body,'Unstable/possibly personalized public JS: '+name);
 const ext=name.endsWith('.mjs')?'mjs':'js';
 let shipped=first.body;
 // The original menu signs in/out IN PLACE, leaving the already loaded
 // account-scoped IndexedDB code bound to the PREVIOUS person. Reopen the
 // exact SAME URL only after a successful auth transition; no UI changes.
 if(name==='/__clean/menu-integration.mjs'){
   writeFileSync(path.join(generated,'approved-menu-original.mjs'),first.body);
   shipped=secureAccountMenuTransitions(first.body);
 }
 const filename=sha(shipped)+'.'+ext;
 writeFileSync(path.join(publicDir,'__talera_free','f5scripts',filename),shipped,'utf8');
 scripts[name]='/__talera_free/f5scripts/'+filename;
}
assert.ok(scripts['/__clean/menu-integration.mjs'],
 'Approved account menu script must be present for login UI.');
// Reuse the APPROVED, anonymous installable-PWA shell resources verbatim.
const supportNames=['/sw.js','/manifest.webmanifest','/pwa-192.png',
  '/pwa-512.png','/apple-touch-icon.png','/favicon.png','/talera-brand-v9.svg'];
const support={};
mkdirSync(path.join(publicDir,'__talera_free','f5support'),{recursive:true});
for(const name of supportNames){
 const url=new URL(name,origin);
 async function get(){
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(18000)});
  if(response.status===404)return null;
  assert.equal(response.status,200,'PWA resource unavailable '+name);
  assert.ok(!response.headers.get('set-cookie'),'Never package cookie-bearing PWA resource');
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.length>30&&bytes.length<2_000_000,'PWA file unexpectedly sized '+name);
  return bytes;
 }
 const iconSize=approvedPwaIcons[name];
 let a=iconSize?await getApprovedLogo(iconSize):await get();
 const b=iconSize?await getApprovedLogo(iconSize):await get();
 if(!a&&!b)continue;
 assert.ok(a&&b&&a.equals(b),'Unstable public PWA resource '+name);
 if(name==='/manifest.webmanifest'){
  // Preserve original PWA identity, start URL, display and all non-icon settings.
  const manifest=JSON.parse(a.toString('utf8'));
  assert.ok(manifest&&typeof manifest==='object'&&Array.isArray(manifest.icons),
    'Original installable manifest must have icons');
  manifest.icons=[
   {src:'/pwa-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
   {src:'/pwa-512.png',sizes:'512x512',type:'image/png',purpose:'any'}
  ];
  a=Buffer.from(JSON.stringify(manifest),'utf8');
 }
 const ext=name.split('.').pop(),filename=sha(a)+'.'+ext;
 writeFileSync(path.join(publicDir,'__talera_free','f5support',filename),a);
 support[name]='/__talera_free/f5support/'+filename;
}
for(const mandatory of ['/sw.js','/manifest.webmanifest'])
 assert.ok(support[mandatory],'Missing mandatory original PWA resource '+mandatory);
writeFileSync(path.join(generated,'public-template-map.mjs'),
  '// Generated only from current approved anonymous public TALERA source.\n'+
  'export const referencePages = Object.freeze('+JSON.stringify(refs,null,2)+');\n'+
  'export const verifiedPublicScripts = Object.freeze('+JSON.stringify(scripts,null,2)+');\n'+
  'export const verifiedPublicSupport = Object.freeze('+JSON.stringify(support,null,2)+');\n');
const report={result:'BUILT (not browser-certified)',source:origin,
  privateDataRequested:false,customerDatabaseTouched:false,
  referencePages:Object.keys(refs),verifiedScriptRoutes:Object.keys(scripts),
  verifiedPwaSupportRoutes:Object.keys(support),
  stagingOnly:true,fullFreePwaCertified:false};
writeFileSync(path.join(generated,'f5-build-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('TALERA_F5_PUBLIC_REFERENCE_BUILD',JSON.stringify(report));
