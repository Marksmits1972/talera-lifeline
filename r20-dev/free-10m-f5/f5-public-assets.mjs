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
   "  function showPhoto(memory,index,manual=false,decoded=false){\n"+
   "    if(manual){photoAutoSerial++;pendingAutoPhoto=null}\n"+
   "    if(!decoded&&memory?._taleraLocal&&Array.isArray(memory.photos)&&memory.photos.length>1&&\n"+
   "       !memory._zeroItems?.some(x=>x.kind==='audio')){\n"+
   "      if(pendingAutoPhoto)return;\n"+
   "      const next=((index%memory.photos.length)+memory.photos.length)%memory.photos.length;\n"+
   "      const src=memory.photos[next],serial=++photoAutoSerial,preload=new Image();\n"+
   "      const pending={serial};pendingAutoPhoto=pending;\n"+
   "      const discard=()=>{if(pendingAutoPhoto===pending)pendingAutoPhoto=null};\n"+
   "      const ready=()=>{\n"+
   "        if(pendingAutoPhoto!==pending||serial!==photoAutoSerial||!preload.naturalWidth||\n"+
   "           runtime.currentMemory()?.id!==memory.id)return;\n"+
   "        clearTimeout(pending.timer);pendingAutoPhoto=null;\n"+
   "        showPhoto(memory,next,true,true); // Commit only a decoded ordinary frame.\n"+
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
 let result=exact(exact(original,show,guarded),schedule,stable);
 // Only the ordinary photo roll owns the automatic timer. The recorded
 // voice/cue engine keeps its exact original code and controls.
 result=exact(result,
   "memory._zeroItems?.some(x=>x.kind==='audio')||memory._zeroFrames?.some(x=>x.kind==='video')",
   "memory._zeroItems?.some(x=>x.kind==='audio')");
 // A native video may run to its natural end, then ordinary photos resume.
 result=exact(result,"    clearAuto();\n    if(window.__taleraBandRolling)return;",
   "    clearAuto();\n    if(window.__taleraBandRolling)return;\n"+
   "    if(memory?._taleraLocal&&memory._zeroFrames?.[memory._photoIndex||0]?.kind==='video')return;");
 // Register interval BEFORE the next frame request: immediate cached
 // preloads can then safely cancel it instead of leaving a second timer.
 result=exact(result,
   "      showPhoto(memory,(memory._photoIndex||0)+1,false);\n      autoInterval=setInterval(",
   "      autoInterval=setInterval(");
 result=exact(result,
   "      },memory?._taleraLocal?2500:AUTO_STEP_MS);\n    },memory?._taleraLocal?2500:AUTO_START_MS);",
   "      },memory?._taleraLocal?2500:AUTO_STEP_MS);\n"+
   "      showPhoto(memory,(memory._photoIndex||0)+1,false);\n"+
   "    },memory?._taleraLocal?2500:AUTO_START_MS);");
 // This is solely the already-existing ORDINARY video callback. All
 // narrated video/cue/voice functions remain byte-for-byte unchanged.
 result=exact(result,
   "      // End of video does not advance the ordinary presentation; only tapping does.",
   "      // Resume ordinary circulation when this original video finishes.\n"+
   "      if(s===taleraInline&&s.phase==='ordinary'&&runtime.currentMemory()?.id===s.memory.id)\n"+
   "        window.__taleraV31SelectPhoto?.(s.memory.id,(s.memory._photoIndex+1)%s.frames.length,true);");
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
  "   const asked=new URLSearchParams(location.search).get('theme');\n"+
  "   const norm=t=>String(t||'').trim().replace(/\\s+/g,' ').toLocaleLowerCase('nl');\n"+
  "   const matching=asked?memories.filter(m=>(m.tags||[]).some(t=>norm(t)===norm(asked))):memories;\n"+
  "   const near=matching.slice().sort((a,b)=>Math.abs(a.ms-center)-Math.abs(b.ms-center)).slice(0,5);\n"+
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
 // The compact iPhone workbench constructs the media tiles synchronously.
 // Previously its video cover was attached only from tileHtml via a deferred
 // animation frame, so the first editor paint could show the stock gray tile.
 // Reuse that SAME native cover immediately once its real tile is in the DOM.
 replace(" tiles.querySelectorAll('.tile').forEach(enableDrag);taleraV9EditorMediaControls(g);",
  " tiles.querySelectorAll('.tile').forEach(enableDrag);taleraV9EditorMediaControls(g);taleraV61AttachNativeCovers();",
  'WORK_TILE_FIRST_MOUNT');
 // The original overview is the other existing location using the same tiles.
 replace("main.querySelectorAll('.tile').forEach(enableDrag);$('addMore').onclick=",
  "main.querySelectorAll('.tile').forEach(enableDrag);taleraV61AttachNativeCovers();$('addMore').onclick=",
  'OVERVIEW_TILE_FIRST_MOUNT');
 // Safari can decode the first frame before a canvas thumbnail has finished.
 // Show that real muted video frame immediately while the original preview
 // worker finishes and refreshPreview swaps in the locally cached JPEG.
 replace("    for(const e of ['loadeddata','seeked','canplay','timeupdate'])\n      v.addEventListener(e,()=>{if(v.readyState>=2)void capture()});",
  "    for(const e of ['loadeddata','seeked','canplay','timeupdate'])\n      v.addEventListener(e,()=>{if(v.readyState>=2){\n        if(v.isConnected&&v.videoWidth&&v.videoHeight){v.pause();v.style.opacity='1';}\n        void capture();\n      }});",
  'SAFARI_FIRST_DECODED_FRAME');
 assert.ok(html.includes("previewBlobs.set(id,image);refreshPreview(id);"),
  'Existing direct video poster selection must remain');
 assert.ok(html.includes("writeFiles([['preview:'+id,image]])"),
  'Local draft poster cache must remain');
 assert.ok(html.includes("key:item.key+':phone-v1'"),
  'Published video poster must preserve original media ID');
 return html;
}
// Derive the original Home cards solely from owner-created story tags.
// No test/sample topic categories, no duplicate stories, no cloud queries.
function showOwnedStoriesOnly(html){
 const start=html.indexOf('id="talera-v17-topics-script"');
 const begin=html.indexOf('async function refresh(){',start);
 const end=html.indexOf('window.__taleraTopics={',begin);
 assert.ok(start>0&&begin>start&&end>begin, 'F5_TOPIC_HOME_SOURCE_MOVED');
 const old=html.slice(begin,end);
 for(const term of ['rows=(await store.list())','sampleRows(cat.name)','grid.replaceChildren()'])
  assert.ok(old.includes(term),'F5_TOPIC_HOME_SOURCE_DRIFT_'+term);
 const replacement="async function refresh(){\n rows=(await store.list()).filter(x=>x&&x.source==='pwa-local');\n const myCards=document.getElementById('myCards');\n const myHeading=document.getElementById('myCount')?.parentElement;\n if(myCards){myCards.style.display=rows.length?'':'none';if(myHeading)myHeading.style.display=rows.length?'':'none';}\n const normalized=s=>String(s||'').trim().replace(/\\s+/g,' ').toLocaleLowerCase('nl');\n const topics=new Map();\n for(const row of rows){\n   for(const raw of Array.isArray(row.tags)?row.tags:[]){\n     const name=String(raw||'').trim().replace(/\\s+/g,' ').slice(0,36);\n     const id=normalized(name);\n     if(!id)continue;\n     if(!topics.has(id))topics.set(id,{name,memories:[]});\n     if(!topics.get(id).memories.includes(row))topics.get(id).memories.push(row);\n   }\n }\n // Retain this presentation's approved two-column tile styling and cover logic.\n const available=[...topics.values()].sort((a,b)=>normalized(a.name).localeCompare(normalized(b.name),'nl'));\n const heading=grid.previousElementSibling,hasTopics=available.length>0;\n // Only an existing account-local photograph may illustrate the one\n // temporary teaser. Never attach the name 'Familie' to a saved memory.\n // createdAt is the original save timestamp, not the date of the event.\n const firstOwnPhoto=!hasTopics?rows.filter(row=>\n   (row.items||[]).some(item=>item.kind==='photo')\n ).sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')))[0]:null;\n if(heading){\n   heading.style.display='';\n   heading.classList.toggle('talera-topic-empty',!hasTopics);\n }\n if(header)header.textContent=hasTopics?'Mijn verhalen over…':'Mijn herinneringen';\n if(small)small.textContent=hasTopics?\n   available.length+' '+(available.length===1?'onderwerp':'onderwerpen'):\n   'Voeg een onderwerp toe aan een herinnering.';\n grid.style.display=(hasTopics||firstOwnPhoto)?'':'none';\n note.style.display='none';\n grid.replaceChildren();escapeUrls();\n // The original six demo tiles remain invisible until local records load.\n grid.classList.add('talera-own-topics-ready');\n if(!hasTopics){\n   if(firstOwnPhoto){\n     const family=cats.find(cat=>normalized(cat.name)==='familie')||\n       {icon:'♡',bg:'linear-gradient(145deg,#718b7d,#214b54)'};\n     const teaser=text('div','talera-topic-card talera-topic-example');\n     teaser.style.background=family.bg;\n     teaser.setAttribute('aria-label','Familie — Voorbeeld van een onderwerptegel');\n     // The existing file URL and account scope are reused. No example data,\n     // media or tags are stored and this tile has no navigation action.\n     imageFor(firstOwnPhoto,teaser);\n     teaser.append(text('span','talera-topic-symbol',family.icon));\n     const info=text('span','talera-topic-info');\n     info.append(text('strong','talera-topic-name','Familie'));\n     info.append(text('small','talera-topic-sub','Voorbeeld'));\n     teaser.append(info);\n     grid.append(teaser);\n   }\n   return {records:rows.length,topics:0,example:!!firstOwnPhoto};\n }\n // A page session survives navigation within the SAME TALERA app, while\n // opening a fresh app session advances a number (never any personal tags).\n const turnKey='talera-free-topic-open-v1',counterKey='talera-free-topic-turn-v1';\n if(window.__taleraTopicTurn==null){\n   let turn=0;\n   try{\n     const previous=sessionStorage.getItem(turnKey);\n     if(previous!==null)turn=Math.max(0,Number(previous)||0);\n     else{\n       turn=Math.max(0,Number(localStorage.getItem(counterKey))||0);\n       localStorage.setItem(counterKey,String((turn+1)%1000000));\n       sessionStorage.setItem(turnKey,String(turn));\n     }\n   }catch(e){}\n   window.__taleraTopicTurn=turn;\n }\n const start=available.length>8?(window.__taleraTopicTurn*8)%available.length:0;\n const visible=Array.from({length:Math.min(8,available.length)},\n   (_,i)=>available[(start+i)%available.length]);\n for(const entry of visible){\n   const cat=cats.find(x=>normalized(x.name)===normalized(entry.name))||\n     {icon:'✦',bg:'linear-gradient(145deg,#6b8194,#354966)'};\n   const tile=text('button','talera-topic-card');\n   tile.type='button';tile.style.background=cat.bg;\n   tile.setAttribute('aria-label',entry.name+' · '+countLabel(entry.memories.length));\n   const ownWithPhoto=entry.memories.filter(row=>(row.items||[]).some(item=>item.kind==='photo'));\n   const cover=pickCover(ownWithPhoto,entry.name,row=>row.id);\n   if(cover)imageFor(cover,tile);\n   tile.append(text('span','talera-topic-symbol',cat.icon));\n   const info=text('span','talera-topic-info');\n   info.append(text('strong','talera-topic-name',entry.name));\n   info.append(text('small','talera-topic-sub',countLabel(entry.memories.length)));\n   tile.append(info);\n   tile.onclick=()=>window.location.assign('/present?theme='+encodeURIComponent(entry.name));\n   grid.append(tile);\n }\n return {records:rows.length,topics:visible.length,available:available.length};\n}\n";
 html=html.slice(0,begin)+replacement+html.slice(end);
 // The ORIGINAL V16 Home boot still appended eight separate sample memory
 // cards to #demoCards after the owned-topic refresh (async IndexedDB load).
 // That made the user see nine tiles: one approved personal-photo example
 // plus eight unrelated reference stories. Preserve those reference records
 // for the original hero/year timeline; remove ONLY their extra Home cards.
 const oldExamples="  examples.forEach(o=>mkCard(o,$('demoCards')));";
 assert.equal(html.split(oldExamples).length,2,'F5_LEGACY_HOME_REFERENCE_APPEND_SOURCE_DRIFT');
 html=html.replace(oldExamples,
  '  // Reference stories remain available in the existing hero/year timeline.');
 // Only 'Mijn verhalen over…' may display this area's photo cards.
 // The legacy 'Mijn herinneringen' gallery reappeared asynchronously after
 // existing local records loaded, even though none had any topic assigned.
 // Keep the original DOM/data and all delete/edit code intact; hide ONLY
 // its redundant Home display and the obsolete trial/example helper note.
 // Safari on supported iPhones understands :has() (the heading precedes #myCards).
 const ownedTopicOnlyStyle='<style id="talera-owned-topic-only-home">'+
  '#myCards,.section-head:has(#myCount),#demoCards ~ p.hint{display:none!important}'+
  '#demoCards:not(.talera-own-topics-ready){display:none!important}'+
  '.section-head.talera-topic-empty{flex-direction:column;align-items:flex-start;gap:4px}'+
  '.section-head.talera-topic-empty small{font-size:14px;line-height:1.45;font-weight:400;color:#587083}'+
  '</style>';
 assert.equal(html.split('</head>').length,2,'F5_HOME_CSS_HEAD_DRIFT');
 html=html.replace('</head>',ownedTopicOnlyStyle+'</head>');
 assert.ok(html.includes('Mijn verhalen over…')&&html.includes('Math.min(8,available.length)'),
  'Only eight owned topic tiles can be visible');
 return html;
}
function shapeOwnStoryTopics(html){
 const exact=(oldValue,newValue,label)=>{
  assert.equal(html.split(oldValue).length,2,'F5_TOPIC_EDITOR_SOURCE_DRIFT_'+label);
  html=html.replace(oldValue,newValue);
 };
 const start=html.indexOf('function setupV20Tags(g,details){');
 const end=html.indexOf('}function setupV10(',start);
 assert.ok(start>0&&end>start,'F5_TOPIC_EDITOR_SOURCE_MOVED');
 let editor=html.slice(start,end+1);
 const editExact=(before,after,label)=>{
  assert.equal(editor.split(before).length,2,'F5_TOPIC_EDITOR_SOURCE_DRIFT_'+label);
  editor=editor.replace(before,after);
 };
 const custom= " const customRow=document.createElement('div');customRow.className='talera-tags-own-input';\n const customName=document.createElement('input');customName.type='text';customName.maxLength=36;\n customName.placeholder='Familie, Sport, Werk…';\n customName.setAttribute('aria-label','Voeg je eigen onderwerp toe');\n const addCustom=document.createElement('button');addCustom.type='button';\n addCustom.textContent='Toevoegen';\n customRow.append(customName,addCustom);\n choices.insertAdjacentElement('afterend',customRow);\n const addOwnName=()=>{\n   const name=clean([customName.value])[0];\n   if(!name)return;\n   if(!openFavorites.some(x=>id(x)===id(name)))openFavorites.push(name);\n   pending.add(id(name));customName.value='';paintChoices();\n };\n addCustom.onclick=addOwnName;\n customName.addEventListener('keydown',e=>{\n   if(e.key==='Enter'){e.preventDefault();addOwnName()}\n });\n";
 editExact(" let pending=new Set(),openFavorites=[];",
  " let pending=new Set(),openFavorites=[];\n"+custom,'CUSTOM_TOPIC_ENTRY');
 editExact("choices.setAttribute('aria-label',text('tag.selected','Mijn favoriete kenmerken'));",
  "choices.setAttribute('aria-label','Mijn onderwerpen');",'HUMAN_CHOICES_LABEL');
 const labelStart=editor.indexOf("  toggle.textContent=");
 const labelEnd=editor.indexOf('\n',labelStart);
 assert.ok(labelStart>0&&labelEnd>labelStart&&editor.slice(labelStart,labelEnd).includes('Kenmerk toevoegen'),
  'F5_TOPIC_EDITOR_SOURCE_DRIFT_HUMAN_PROMPT');
 const humanPrompt="  const lang=String(window.TaleraI18n?.language||'nl').slice(0,2);\n"+
  "  const names={nl:'Waar gaat deze herinnering over?',en:'What is this memory about?',\n"+
  "    de:'Worum geht es in dieser Erinnerung?',fr:'De quoi parle ce souvenir ?',\n"+
  "    es:'¿De qué trata este recuerdo?'};\n"+
  "  toggle.textContent='＋ '+(names[lang]||names.nl);";
 editor=editor.slice(0,labelStart)+humanPrompt+editor.slice(labelEnd);
 editExact('openFavorites=favorites();pending=new Set(',
  'openFavorites=clean([...favorites(),...g.tags]);pending=new Set(','KEEP_EXISTING_TAGS');
 html=html.slice(0,start)+editor+html.slice(end+1);
 const style='<style id="talera-free-own-story-topics-style">'+
  '.talera-tags-v20 .talera-tags-own-input{display:flex;gap:8px;padding:10px 0;align-items:stretch}'+
  '.talera-tags-v20 .talera-tags-own-input input{min-width:0;flex:1;border:1px solid #d1dfe4;border-radius:12px;padding:10px;color:#173550;background:#fff;font-size:15px}'+
  '.talera-tags-v20 .talera-tags-own-input button{border:1px solid #173550;border-radius:12px;padding:10px;color:white;background:#173550;font-size:14px;font-weight:700}'+
  '</style>';
 exact('</head>',style+'</head>','SAME_EDITOR_HEAD');
 assert.ok(html.includes('talera-tags-own-input'),'Editor input must remain within original work screen');
 return html;
}
// Reuse the ORIGINAL RH19 presentation and V3 swipe engine for topic routes.
// Only current authenticated account's local stories may enter these selections.
function filterOwnTopicPresentation(html){
 const one=(before,after,label)=>{
  assert.equal(html.split(before).length,2,'F5_OWNER_TOPIC_PRESENT_SOURCE_DRIFT_'+label);
  html=html.replace(before,after);
 };
 const scope="const taleraMatchesScope = m => taleraMatchesTopic(m.tags) && taleraMatchesDecade(m);";
 one(scope,"const taleraMatchesScope = m => taleraMatchesTopic(m.tags) && taleraMatchesDecade(m) && (!TALERA_ACTIVE_TOPIC || !!m._taleraLocal);",'ACCOUNT_ONLY');
 const before="    const incoming=memories.filter(m=>m&&Number.isFinite(m.ms)&&taleraMatchesScope(m));";
 const after=before+"\n"+
  "    if(TALERA_ACTIVE_TOPIC){\n"+
  "      // The original memories and examples are replaced atomically by\n"+
  "      // the already-authenticated account's own stories with this tag.\n"+
  "      if(!incoming.length){location.replace('/mijn-leven');return 0;}\n"+
  "      MEMORIES.splice(0,MEMORIES.length);\n"+
  "    }";
 one(before,after,'NO_SAMPLES_ON_TOPIC');
 const oldFinish="    MEMORIES.push(...incoming);\n    MEMORIES.sort((a,b)=>a.ms-b.ms);\n    taleraRebuildDensity();\n    return incoming.length;";
 const newFinish="    MEMORIES.push(...incoming);\n    MEMORIES.sort((a,b)=>a.ms-b.ms);\n    taleraRebuildDensity();\n"+
  "    if(TALERA_ACTIVE_TOPIC){\n"+
  "      const selected=MEMORIES[MEMORIES.length-1];\n"+
  "      centerMs=selected.ms;activeMemoryId=selected.id;keepCenterValid();\n"+
  "      writeMemory(selected);draw();\n"+
  "      document.documentElement.classList.remove('talera-topic-loading');\n"+
  "    }\n"+
  "    return incoming.length;";
 one(oldFinish,newFinish,'EXISTING_PRESENTATION_ONLY');
 assert.ok(html.includes('const TALERA_ACTIVE_TOPIC = new URLSearchParams(location.search).get("theme")||"";'),
  'Original tag filter missing; refuse to alter presentation engine');
 one('<head>','<head>'+"<script id=\"talera-topic-visibility-guard\">if(new URLSearchParams(location.search).has('theme'))document.documentElement.classList.add('talera-topic-loading');</script><style id=\"talera-topic-visibility-style\">html.talera-topic-loading #photoStage,html.talera-topic-loading #memoryCaption{visibility:hidden!important}</style>",'ONLY_TOPIC_LOADING_GUARD');
 return html;
}
const refs={};
for(const [route,filename] of Object.entries(routes)){
 let html=readFileSync(path.join(delivery,'generated','reference-'+filename+'.html'),'utf8');
 if(route==='/present')html=fixPhotoOnlyPresentation(html);
 if(route==='/present')html=fixFirstSwipePhotoLoad(html);
 if(route==='/present')html=warmUpFirstSwipePhotoStrip(html);
 if(route==='/present')html=primeFirstOpenLocalStoryCovers(html);
 if(route==='/present')html=filterOwnTopicPresentation(html);
 // Use the ORIGINAL, already approved V61 video preview from the
 // 7-Nov-2026 product-owner-selected version, byte-for-byte. Do not
 // apply later speculative iPhone video-poster modifications.
 if(route==='/mijn-leven')html=showOwnedStoriesOnly(html);
 if(route==='/tell')html=shapeOwnStoryTopics(html);
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
