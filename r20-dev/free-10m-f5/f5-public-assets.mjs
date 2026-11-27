import {installCharacteristicSearchHome,installCharacteristicSearchPresentation} from './f5-topic-search.mjs';
import {localizeEmbeddedPlayer} from './f5-embed-language-build.mjs';
import {centralizeCoreLanguage} from './f5-core-language-build.mjs';
import {installMemoryLocationStore,installMemoryLocationEditor,memoryLocationSharedSource,memoryLocationCountryCodes} from './f5-memory-location-build.mjs';
import {localizeApprovedMenu} from './f5-menu-language-build.mjs';
// Build F5 templates from the user-identified 2026-11-07 design-cleanup candidate. It retains the earlier 5-language + DOB changes; test before any deploy.
// No account, cookie, D1, R2 or live private data is fetched.
import {createHash} from 'node:crypto';
import {installBoundedTimelineSelection} from './f5-timeline-window.mjs';
import {installDesktopHomeLayout} from './f5-desktop-home-layout.mjs';
import {installDesktopPresentationLayout} from './f5-desktop-presentation-layout.mjs';
import {installDesktopMemoryTransition} from './f5-desktop-memory-transition.mjs';
import {buildF5OfflineServiceWorker} from './f5-offline-sw.mjs';
import {buildEditReturnBrowserSources} from './f5-edit-return.mjs';
import {simplifyTellMemoryEditor} from './f5-editor-clean-layout.mjs';
import {completePublishedRemovalOnOtherPage,installOriginalPayloadReader} from './f5-library-editor-stable-save.mjs';
import assert from 'node:assert/strict';
import {secureAccountMenuTransitions,connectExistingStorageBackup,removeInactiveAccessibilityMenu,removeInactiveDisplayMenu,keepOnlyFunctionalFreeMenu} from './f5-account-switch-guard.mjs';
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
for(const name of ['f5-portable-idb.mjs','f5-portable-archive.mjs','f5-library-persistence.mjs','f5-backup-controller.mjs','f5-transfer-controller.mjs','f5-transfer-library.mjs','f5-transfer-transport.mjs','f5-transfer-diagnostic.mjs','f5-transfer-qr.mjs','f5-transfer-scan.mjs','f5-transfer-jsqr.mjs']){
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
 // A new unvoiced story first shows its OWN prepared cover; the previous
 // story must not leave a visible overlay in front of the new one.
 result=exact(result,
   "if(changed&&memory&&Array.isArray(memory.photos)&&memory.photos.length){\n      memory._photoIndex=0;",
   "if(changed&&memory&&Array.isArray(memory.photos)&&memory.photos.length){\n"+
   "      if(memory._taleraLocal&&!memory._zeroItems?.some(x=>x.kind==='audio'))syncTaleraStoryFrame(null);\n"+
   "      memory._photoIndex=0;");
 // One ordinary photo-stage request per memory + media URL. Repeated
 // timeline notifications must not cancel an iPhone image still decoding.
 result=exact(result,
   "let stage=null,host=null,sharp=null,backdrop=null,owner='',shown='',requestNo=0;",
   "let stage=null,host=null,sharp=null,backdrop=null,owner='',shown='',requestNo=0,pendingOwner='',pendingSrc='';");
 result=exact(result,
   "function hide(){requestNo++;owner='';shown='';if(host)host.hidden=true;}",
   "function hide(){requestNo++;owner='';shown='';pendingOwner='';pendingSrc='';if(host)host.hidden=true;}");
 result=exact(result,
   "if(owner===memory.id&&shown===src&&!host.hidden){layout();return}\n      const seq=++requestNo,check=new Image();",
   "if(owner===memory.id&&shown===src&&!host.hidden){layout();return}\n"+
   "      if(pendingOwner===memory.id&&pendingSrc===src)return;\n"+
   "      pendingOwner=memory.id;pendingSrc=src;\n"+
   "      const seq=++requestNo,check=new Image();");
 result=exact(result,
   "owner=memory.id;shown=src;sharp.src=src;backdrop.src=src;host.hidden=false;",
   "owner=memory.id;shown=src;pendingOwner='';pendingSrc='';sharp.src=src;backdrop.src=src;host.hidden=false;");
 result=exact(result,
   "check.onerror=()=>{if(seq===requestNo)console.warn('TALERA Story Player: geselecteerde foto kon niet laden',i)};",
   "check.onerror=()=>{if(seq===requestNo){pendingOwner='';pendingSrc='';console.warn('TALERA Story Player: geselecteerde foto kon niet laden',i)}};");
 // A plain tap (ordinary OR narrated) must not reveal the 11-page wheel.
 // Once a real horizontal swipe starts, both memory types use the SAME
 // existing strip/landing animation; never change narrator timing or media.
 result=exact(result,
   "    window.__taleraBandRolling=true;\n"+
   "    document.dispatchEvent(new CustomEvent('talera:wheel-motion',{detail:{active:true}}));\n"+
   "    open();\n"+
   "    state.drag={id:e.pointerId,",
   "    const ordinaryTap=Boolean(window.__taleraTimelineRuntime?.currentMemory()?._taleraLocal);\n"+
   "    if(!ordinaryTap){\n"+
   "      window.__taleraBandRolling=true;\n"+
   "      document.dispatchEvent(new CustomEvent('talera:wheel-motion',{detail:{active:true}}));\n"+
   "      open();\n"+
   "    }\n"+
   "    state.drag={id:e.pointerId,");
 result=exact(result,
   "lastMove:now,motion:0,old,started:false,usefulV:0,usefulAt:-1,",
   "lastMove:now,motion:0,old,ordinaryTap,started:false,usefulV:0,usefulAt:-1,");
 result=exact(result,
   "    if(Math.abs(e.clientX-d.startX)>=13)d.started=true;\n"+
   "    if(d.started&&d.samples.length>1){",
   "    if(Math.abs(e.clientX-d.startX)>=13)d.started=true;\n"+
   "    if(d.ordinaryTap&&d.started&&!d.wheelOpened){\n"+
   "      d.wheelOpened=true;window.__taleraBandRolling=true;\n"+
   "      document.dispatchEvent(new CustomEvent('talera:wheel-motion',{detail:{active:true}}));\n"+
   "      open();\n"+
   "    }\n"+
   "    if(d.started&&d.samples.length>1){");
 result=exact(result,
   "    book.scrub(state.p);render(now);\n"+
   "    if(e.cancelable)e.preventDefault();",
   "    if(!d.ordinaryTap||d.started){book.scrub(state.p);render(now)}\n"+
   "    if(e.cancelable&&(!d.ordinaryTap||d.started))e.preventDefault();");
 result=exact(result,
   "    state.drag=null;\n"+
   "    beginLanding(direction,v,d.startIndex);\n"+
   "    try{story.releasePointerCapture(e.pointerId)}catch(err){}",
   "    state.drag=null;\n"+
   "    if(d.ordinaryTap&&!d.started){\n"+
   "      state.p=d.startIndex;\n"+
   "      try{story.releasePointerCapture(e.pointerId)}catch(err){}\n"+
   "      return; // Native click advances the ordinary photo; NEVER cover it with the strip.\n"+
   "    }\n"+
   "    beginLanding(direction,v,d.startIndex);\n"+
   "    try{story.releasePointerCapture(e.pointerId)}catch(err){}");
 // The existing 11-page swipe wheel MUST NOT paint its thumbnails at rest.
 // Its children explicitly set visibility:visible, which overrides the
 // parent's visibility:hidden. Hide the entire wheel by display:none
 // outside a genuine swipe; no photo layout, media or narrator is modified.
 result=exact(result,"</head>",
   '<style id="talera-ordinary-wheel-rest-visibility">'+
   '#photoStage .talera-wheel-strip:not(.is-visible){display:none!important}'+
   '</style></head>');
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
 "      // A tile for a different record must not display an old decoded bitmap.",
    "      tile.el.style.visibility=mem._taleraLocal&&tile.sharp.complete&&tile.sharp.naturalWidth?'visible':'hidden';",
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
 // A load event can fire while the 11-page strip is still landing.
 // The original one-shot finish() then returned while state.snap was true,
 // leaving the cover permanently in front of all rotating photos.
 // Retry only closing the wheel once its real movement has ended.
 replace("      if(state.drag||state.snap||Math.abs(state.v)>.01)return;",
   "      if(state.drag||state.snap||Math.abs(state.v)>.01){requestAnimationFrame(finish);return;}",
   'FINISH_AFTER_SWIPE_SETTLES');
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
 const warmPrefetch="  const adjacentOriginals=new Map();\n  function prefetch(){\n"+
   "    const items=all(),c=Math.round(state.p),dir=Math.sign(state.v);\n"+
   "    for(let off=(dir>=0?-3:-9);off<=(dir>=0?9:3);off++){\n"+
   "      const mem=items[c+off];if(!mem||!mem.image)continue;\n"+
   "      // The existing strip warms ONLY approaching local thumbnails.\n"+
   "      if(mem._taleraLocal&&mem._photoLoading)window.__taleraPrewarmLocalCover?.(mem);\n"+
   "      const source=mem.previewImage||mem.thumbnail||mem.image;\n"+
   "      if(cache.get(mem.id)?.src===source)continue;\n"+
   "      const img=new Image();img.decoding='async';img.src=source;\n"+
   "      cache.set(mem.id,img);\n"+
   "      if(cache.size>35)cache.delete(cache.keys().next().value);\n"+
   "    }\n"+
   "    // Exactly one real PHOTO on either side is decoded ahead of a swipe.\n"+
   "    // Existing video stills stay in the thumbnail cache; never read full videos.\n"+
   "    const needed=new Set();\n"+
   "    for(const offset of [-1,1]){\n"+
   "      const m=items[c+offset];\n"+
   "      if(!m||m._photoLoading||m._zeroFrames?.[0]?.kind!=='photo')continue;\n"+
   "      const src=m.photos?.[0];\n"+
   "      if(typeof src!=='string'||!src)continue;\n"+
   "      needed.add(m.id);\n"+
   "      if(adjacentOriginals.get(m.id)?.src===src)continue;\n"+
   "      const image=new Image();image.decoding='async';image.src=src;\n"+
   "      adjacentOriginals.set(m.id,image);\n"+
   "      if(typeof image.decode==='function')void image.decode().catch(()=>{});\n"+
   "    }\n"+
   "    for(const id of adjacentOriginals.keys())if(!needed.has(id))adjacentOriginals.delete(id);\n"+
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
 const newFallback="    // Preserve the already working LOCAL-media loading fallback.\n"+
   "    // Sample memories must never borrow a photo from another story.\n"+
   "    const readyNeighbour=[...cache.values()].find(img=>img.complete&&img.naturalWidth);\n"+
   "    const fallback=mem._taleraLocal?(base?.complete&&base.naturalWidth?(base.currentSrc||base.src):\n"+
   "      (readyNeighbour?.currentSrc||readyNeighbour?.src||null)):null;";
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
 const prime=" // Keep up to five first-frame object URLs, scoped to this page and account.\n // The full existing hydrate() is still responsible for every other frame.\n async function warmFirstPhoto(memory,decodeMissingVideo=true){\n   if(!memory?._taleraLocal||memory._taleraFirstWarm)return;\n   const first=memory._zeroItems?.find(item=>item.kind==='photo'||item.kind==='video');\n   if(!first)return;\n   let url=null;\n   try{\n     if(first.kind==='photo'){\n       url=await (store.displayUrl?store.displayUrl(first.key):store.mediaUrl(first.key));\n     }else{\n       const still=await store.blob(first.key+':phone-v1');\n       if(still instanceof Blob&&still.size&&String(still.type).startsWith('image/'))\n         url=URL.createObjectURL(still);\n       else if(decodeMissingVideo){\n         url=await taleraClosedMakeCover(memory,{key:first.key,kind:'video',url:null},0,[],true);\n         if(!url)memory.image=videoPoster;\n       }\n     }\n   }catch(e){console.warn('TALERA eerste verhaalbeeld nog niet geladen',e)}\n   if(!url)return;\n   memory._taleraFirstWarm={key:first.key,url};\n   if(!Array.isArray(memory.photos)||!memory.photos.length)memory.image=url;\n"+
  "   memory.previewImage=url;\n"+
  " }\n"+
  " // Reuse the SAME local record and wheel: bounded nearby cover prefetch.\n"+
  " const warmCoverPending=new Set();\n"+
  " if(typeof window!=='undefined')window.__taleraPrewarmLocalCover=memory=>{\n"+
  "   if(!memory?._taleraLocal||memory._taleraFirstWarm||warmCoverPending.has(memory.id))return;\n"+
  "   warmCoverPending.add(memory.id);\n"+
  "   void warmFirstPhoto(memory).finally(()=>warmCoverPending.delete(memory.id));\n"+
  " };\n";
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
  "   // Prepare all five REAL nearby photos and already-cached video stills.\n"+
  "   // A newly uploaded video without a stored still must NOT be decoded\n"+
  "   // before registration: its original video motor handles the first frame.\n"+
  "   // This avoids one slow poster blocking every other story on first launch.\n"+
  "   await Promise.all(near.map(m=>warmFirstPhoto(m,false)));\n"+
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
// The original Home shipped 500 demo records EVEN AFTER their photos were
// removed from /present. Its hero and year slider still surfaced synthetic
// titles, years, counts and even a fake "Familie" topic tile. This is
// ONE app with ZERO bundled memories; owner-local records remain untouched.
function removeAllBuiltInHomeExamples(html){
 const start='<script id="talera-reference-catalog">';
 const pos=html.indexOf(start),end=html.indexOf('</script>',pos+start.length);
 assert.ok(pos>0&&end>pos&&html.indexOf(start,pos+1)===-1,
  'F5_HOME_REFERENCE_CATALOG_MARKER_DRIFT');
 const old=html.slice(pos,end);
 assert.ok(old.length>80000&&old.includes('Test 081')&&
  old.includes('isDemo')&&old.includes('talera-500-fotoband-'),
  'F5_HOME_500_BUNDLED_STORIES_SOURCE_DRIFT');
 // Keep the original reference variable for older event handlers. It is
 // deliberately EMPTY; do not seed data or modify account IndexedDB.
 html=html.slice(0,pos)+start+'window.__taleraReferenceMemories=[];'+html.slice(end);
 const one=(before,after,label)=>{
  assert.equal(html.split(before).length,2,'F5_HOME_EMPTY_'+label+'_DRIFT');
  html=html.replace(before,after);
 };
 // Never paint a story title/hero from a template on a newly empty account.
 one('id="heroKind">Jouw herinneringen</small><h1 id="heroTitle">Een leven vol verhalen</h1>',
     'id="heroKind"></small><h1 id="heroTitle"></h1>',
     'STATIC_HERO_TITLE');
 one(" const selectHero=(o)=>{\n   $('heroTitle').textContent=o.title||'';",
     " const selectHero=(o)=>{\n   $('heroCaption').style.display='';\n   $('heroTitle').textContent=o.title||'';",
     'REAL_HERO_VISIBLE');
 one("  selectHero(show.find(x=>x.src)||examples[0]||{title:'Jouw leven',link:'/tell'});",
     "  const ownHero=show.find(x=>x.src)||show[0];\n"+
     "  if(ownHero)selectHero(ownHero);\n"+
     "  else {\n"+
     "    $('heroCaption').style.display='none';\n"+
     "    $('heroImage').removeAttribute('src');\n"+
     "    $('heroImage').classList.remove('ready');\n"+
     "    $('heroNote').textContent='';\n"+
     "  }",
     'NO_FAKE_HERO_FALLBACK');
 one("n.append(bold,document.createTextNode('Voeg je eerste herinnering toe. Tot die tijd kun je de voorbeelden hieronder bekijken.'));",
     "n.append(bold,document.createTextNode('Voeg je eerste herinnering toe.'));",
     'NO_EXAMPLES_EMPTY_TEXT');
 // The native year slider keeps its precise profile-birthdate
 // personalization. Its existing per-year rendering reads ZERO examples.
 one(" image.src=m.src;image.classList.add('ready');title.textContent=m.title;kind.textContent=m.demo?",
     " caption.style.display='';image.src=m.src;image.classList.add('ready');title.textContent=m.title;kind.textContent=m.demo?",
     'PERSONAL_HERO_RESUMES');
 one(" const showingExamples=ownCounts.size===0;\n const densityCounts=showingExamples?referenceCounts:ownCounts;",
     " const showingExamples=false;\n const densityCounts=ownCounts;",
     'NO_SAMPLE_RULER_DENSITY');
 one("tick.title=tick.dataset.years+': '+count+' '+(showingExamples?'voorbeeld':'eigen ')+(count===1?'herinnering':'herinneringen');",
     "tick.title=tick.dataset.years+': '+count+' '+(count===1?'herinnering':'herinneringen');",
     'NO_SAMPLE_RULER_TOOLTIP');
 // The legacy topic refresh also rendered a fake "Familie / Voorbeeld"
 // card using an owner's photo when no real tags existed. Remove only
 // that teaser, preserving topic cards built from actual saved tags.
 const beforePhoto=" const firstOwnPhoto=!hasTopics?rows.filter(row=>";
 const afterPhoto=" if(heading){";
 const a=html.indexOf(beforePhoto),b=html.indexOf(afterPhoto,a);
 assert.ok(a>0&&b>a&&b-a<1100,'F5_HOME_FAKE_FAMILY_SOURCE_DRIFT');
 html=html.slice(0,a)+html.slice(b);
 one("   heading.style.display='';",
     "   heading.style.display=hasTopics?'':'none';",
     'HIDE_EMPTY_TOPIC_HEADING');
 one(" grid.style.display=(hasTopics||firstOwnPhoto)?'':'none';",
     " grid.style.display=hasTopics?'':'none';",
     'ONLY_REAL_TOPIC_TILES');
 const teaserStart=" if(!hasTopics){\n   if(firstOwnPhoto){";
 const teaserStop=" // A page session survives navigation within the SAME TALERA app";
 const i=html.indexOf(teaserStart),j=html.indexOf(teaserStop,i);
 assert.ok(i>0&&j>i&&j-i<2100,'F5_HOME_FAKE_TEASER_SOURCE_DRIFT');
 html=html.slice(0,i)+" if(!hasTopics)return {records:rows.length,topics:0};\n"+html.slice(j);
 // Remove the last static reference labels from pre-hydration HTML.
 one('<small>Voorbeelden</small></div>\n    <div id="demoCards"',
     '<small></small></div>\n    <div id="demoCards"',
     'STATIC_EXAMPLE_COUNT');
 one('<p class="hint">Voorbeelden zijn apart herkenbaar. Je eigen herinneringen worden in deze proefversie op dit toestel bewaard.</p>',
     '<p class="hint"></p>',
     'STATIC_TRIAL_NOTE');
 const css='<style id="talera-f5-true-empty-home">'+
   '.section-head:has(+ #demoCards:not(.talera-own-topics-ready)){display:none!important}'+
   '</style>';
 one('</head>',css+'</head>','NO_PENDING_EXAMPLE_TITLE');
 assert.ok(!html.includes('Test 081')&&!html.includes('talera-500-fotoband-081')&&
   html.includes('window.__taleraReferenceMemories=[];')&&
   html.includes('TaleraMemories.list()')&&
   html.includes("const min=Math.min(...(years.length?years:[1985])),max=Math.max(now,...years);"),
   'F5_HOME_EMPTY_STORY_OR_BIRTHDATE_SOURCE_DRIFT');
 return html;
}


// Owner-approved HOME cover: one random original PHOTO from the year selected
// by the existing V17 indicator. No new player, storage, year-scale or data.
function randomPhotoFromSelectedHomeYear(html){
 const legacy="  const ownHero=show.find(x=>x.src)||show[0];\n"+
   "  if(ownHero)selectHero(ownHero);\n  else {";
 assert.equal(html.split(legacy).length,2,'HOME_LEGACY_HERO_SOURCE_DRIFT');
 html=html.replace(legacy,
   "  const ownHero=show.find(x=>x.src)||show[0];\n"+
   "  if(!ownHero){");
 const open='<script id="talera-flow-v17-time">';
 const a=html.indexOf(open),b=a<0?-1:html.indexOf('</script>',a+open.length);
 assert.ok(a>0&&b>a&&html.indexOf(open,a+1)<0,
   'HOME_YEAR_CONTROLLER_NOT_UNIQUE');
 let script=html.slice(a+open.length,b);
 const once=(before,after,key)=>{
   assert.equal(script.split(before).length,2,'HOME_YEAR_RANDOM_SOURCE_DRIFT_'+key);
   script=script.replace(before,after);
 };
 const feature="let homePhotoRequest=0,activeHomePhotoUrl=null,homeYearChosenByUser=false;\nconst releaseHomePhoto=url=>{\n if(url&&url.startsWith('blob:'))try{URL.revokeObjectURL(url)}catch(e){}\n};\nconst clearHomePhoto=()=>{\n const image=$('heroImage'),caption=$('heroCaption'),note=$('heroNote');\n if(image){image.removeAttribute('src');image.classList.remove('ready')}\n if(caption){caption.style.display='none';caption.dataset.presentHref=''}\n if(note)note.textContent='';\n releaseHomePhoto(activeHomePhotoUrl);activeHomePhotoUrl=null;\n};\nconst randomHomeYearPhoto=async(matches)=>{\n const ticket=++homePhotoRequest,selectedYear=current;\n const choices=[];\n // Read the CURRENT account-local catalog after the year was selected.\n // Original Home can hydrate after its year-preview script; using its old\n // render snapshot would leave newly saved photos invisible here.\n let rows=[];\n try{rows=await window.TaleraMemories?.list?.()||[]}catch(e){}\n if(ticket!==homePhotoRequest||current!==selectedYear)return;\n if(!rows.length)rows=matches.filter(m=>m.record&&!m.demo).map(m=>m.record);\n for(const row of rows){\n  if(row?.source!=='pwa-local'||Number(String(row.date||'').slice(0,4))!==selectedYear)continue;\n  const memory={year:selectedYear,title:String(row.title||''),demo:false,\n   href:'/present?memory='+encodeURIComponent(row.id)};\n  for(const item of row.items||[]){\n   if(item?.kind==='photo'&&typeof item.key==='string'&&item.key)\n    choices.push({memory,key:item.key});\n  }\n }\n if(!choices.length){clearHomePhoto();return}\n const offset=Math.floor(Math.random()*choices.length);\n for(let i=0;i<choices.length;i++){\n  const choice=choices[(offset+i)%choices.length];\n  let src=null;\n  try{src=await window.TaleraMemories?.displayUrl?.(choice.key)}catch(e){}\n  if(ticket!==homePhotoRequest||current!==selectedYear){\n   releaseHomePhoto(src);return;\n  }\n  if(!src)continue;\n  const previous=activeHomePhotoUrl;\n  activeHomePhotoUrl=src;\n  setHero({...choice.memory,src});\n  if(previous!==src)releaseHomePhoto(previous);\n  return;\n }\n clearHomePhoto();\n};\nwindow.addEventListener('pagehide',()=>releaseHomePhoto(activeHomePhotoUrl),{once:true});\n";
 once("const nodes=[];",feature+"const nodes=[];",'ORIGINAL_MEDIA_URL_RELEASE');
 once("const render=(year,moveHero)=>{\n",
   "const render=(year,moveHero)=>{\n homePhotoRequest++;\n",'PENDING_PHOTO_RACE');
 once(" if(moveHero)setHero(matches.find(m=>m.src&&!m.demo)||matches.find(m=>m.src));\n }\n};\nconst drawMarks=",
   " }\n if(moveHero)randomHomeYearPhoto(matches);\n};\nconst drawMarks=",
   'MATCHED_YEAR_ONLY');
 once(" if(choice!==undefined)render(choice,true);"," if(choice!==undefined){homeYearChosenByUser=true;render(choice,true)};",'ARROW_RETAINS_USER_YEAR');
 once("rail.addEventListener('input',()=>render(rail.value,true));",
   "rail.addEventListener('input',()=>{homeYearChosenByUser=true;render(rail.value,false)});\n"+
   "rail.addEventListener('change',()=>{homeYearChosenByUser=true;render(rail.value,true)});",
   'AFTER_SLIDER_RELEASE');
 once(" render(initial,false);"," render(homeYearChosenByUser?current:initial,true);",'RANDOM_ON_OPEN');
 assert.ok(!script.includes('if(moveHero)setHero(matches.find'),
   'Original first-photo selection still active');
 return html.slice(0,a+open.length)+script+html.slice(b);
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
 const replacement="async function refresh(){\n rows=(await store.list()).filter(x=>x&&x.source==='pwa-local');\n const myCards=document.getElementById('myCards');\n const myHeading=document.getElementById('myCount')?.parentElement;\n const normalized=s=>String(s||'').trim().replace(/\\s+/g,' ').toLocaleLowerCase('nl');\n const topics=new Map();\n for(const row of rows){\n   for(const raw of Array.isArray(row.tags)?row.tags:[]){\n     const name=String(raw||'').trim().replace(/\\s+/g,' ').slice(0,36);\n     const id=normalized(name);\n     if(!id)continue;\n     if(!topics.has(id))topics.set(id,{name,memories:[]});\n     if(!topics.get(id).memories.includes(row))topics.get(id).memories.push(row);\n   }\n }\n // Untagged owner stories have no matching topic tile. Show ONLY those\n // original cards in a mixed library; tagged stories keep the approved\n // topic tiles and must not appear twice. No new category or story copy.\n const topicless=rows.filter(row=>!(Array.isArray(row.tags)&&row.tags.some(tag=>normalized(tag))));\n const topiclessIds=new Set(topicless.map(row=>row.id));\n const hasTopics=topics.size>0;\n if(myCards){\n   // The original card renderer loads asynchronously from this same IDB.\n   // Filter its existing links, preserving their click/edit/navigation code.\n   const apply=()=>{for(const card of myCards.children){\n     // The approved Home may wrap a published memory link in its existing\n     // edit/delete card, including AFTER initial rendering. Hide that entire\n     // wrapper, never its edit controls separately or unrelated Home actions.\n     const link=card.matches('a.memory-card[href]')?card:\n       card.querySelector('a.memory-card[href]');\n     if(!link)continue;\n     const href=link.getAttribute('href')||'';\n     let id=null;try{id=new URL(href,location.origin).searchParams.get('memory')}catch(_){}\n     if(link!==card)link.style.display=''; // reset a former direct-card hide\n     card.style.display=hasTopics&&(!id||!topiclessIds.has(id))?'none':'';\n   }};\n   myCards.__taleraApplyTopicCardVisibility=apply;\n   if(!myCards.__taleraTopicCardObserver){\n     const observer=new MutationObserver(()=>myCards.__taleraApplyTopicCardVisibility?.());\n     observer.observe(myCards,{childList:true,subtree:true});\n     myCards.__taleraTopicCardObserver=observer;\n   }\n   apply();\n   myCards.style.display=topicless.length?'':'none';\n   if(myHeading)myHeading.style.display=topicless.length?'':'none';\n }\n // Retain this presentation's approved two-column tile styling and cover logic.\n const available=[...topics.values()].sort((a,b)=>normalized(a.name).localeCompare(normalized(b.name),'nl'));\n const heading=grid.previousElementSibling;\n // Preserve the original personal-memory cards when the account has\n // stored stories but none of them has a topic. No invented topic,\n // new story, media copy, or change to the existing topic grid.\n document.documentElement.classList.toggle('talera-untagged-memory-cards',topicless.length>0);\n // Only an existing account-local photograph may illustrate the one\n // temporary teaser. Never attach the name 'Familie' to a saved memory.\n // createdAt is the original save timestamp, not the date of the event.\n const firstOwnPhoto=!hasTopics?rows.filter(row=>\n   (row.items||[]).some(item=>item.kind==='photo')\n ).sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')))[0]:null;\n if(heading){\n   heading.style.display='';\n   heading.classList.toggle('talera-topic-empty',!hasTopics);\n }\n if(header)header.textContent=hasTopics?'Mijn verhalen over…':'Mijn herinneringen';\n if(small)small.textContent=hasTopics?\n   available.length+' '+(available.length===1?'onderwerp':'onderwerpen'):\n   'Voeg een onderwerp toe aan een herinnering.';\n grid.style.display=(hasTopics||firstOwnPhoto)?'':'none';\n note.style.display='none';\n grid.replaceChildren();escapeUrls();\n // The original six demo tiles remain invisible until local records load.\n grid.classList.add('talera-own-topics-ready');\n if(!hasTopics){\n   if(firstOwnPhoto){\n     const family=cats.find(cat=>normalized(cat.name)==='familie')||\n       {icon:'♡',bg:'linear-gradient(145deg,#718b7d,#214b54)'};\n     const teaser=text('div','talera-topic-card talera-topic-example');\n     teaser.style.background=family.bg;\n     teaser.setAttribute('aria-label','Familie — Voorbeeld van een onderwerptegel');\n     // The existing file URL and account scope are reused. No example data,\n     // media or tags are stored and this tile has no navigation action.\n     imageFor(firstOwnPhoto,teaser);\n     teaser.append(text('span','talera-topic-symbol',family.icon));\n     const info=text('span','talera-topic-info');\n     info.append(text('strong','talera-topic-name','Familie'));\n     info.append(text('small','talera-topic-sub','Voorbeeld'));\n     teaser.append(info);\n     grid.append(teaser);\n   }\n   return {records:rows.length,topics:0,example:!!firstOwnPhoto};\n }\n // A page session survives navigation within the SAME TALERA app, while\n // opening a fresh app session advances a number (never any personal tags).\n const turnKey='talera-free-topic-open-v1',counterKey='talera-free-topic-turn-v1';\n if(window.__taleraTopicTurn==null){\n   let turn=0;\n   try{\n     const previous=sessionStorage.getItem(turnKey);\n     if(previous!==null)turn=Math.max(0,Number(previous)||0);\n     else{\n       turn=Math.max(0,Number(localStorage.getItem(counterKey))||0);\n       localStorage.setItem(counterKey,String((turn+1)%1000000));\n       sessionStorage.setItem(turnKey,String(turn));\n     }\n   }catch(e){}\n   window.__taleraTopicTurn=turn;\n }\n const start=available.length>8?(window.__taleraTopicTurn*8)%available.length:0;\n const visible=Array.from({length:Math.min(8,available.length)},\n   (_,i)=>available[(start+i)%available.length]);\n for(const entry of visible){\n   const cat=cats.find(x=>normalized(x.name)===normalized(entry.name))||\n     {icon:'✦',bg:'linear-gradient(145deg,#6b8194,#354966)'};\n   const tile=text('button','talera-topic-card');\n   tile.type='button';tile.style.background=cat.bg;\n   tile.setAttribute('aria-label',entry.name+' · '+countLabel(entry.memories.length));\n   const ownWithPhoto=entry.memories.filter(row=>(row.items||[]).some(item=>item.kind==='photo'));\n   const cover=pickCover(ownWithPhoto,entry.name,row=>row.id);\n   if(cover)imageFor(cover,tile);\n   tile.append(text('span','talera-topic-symbol',cat.icon));\n   const info=text('span','talera-topic-info');\n   info.append(text('strong','talera-topic-name',entry.name));\n   info.append(text('small','talera-topic-sub',countLabel(entry.memories.length)));\n   tile.append(info);\n   tile.onclick=()=>window.location.assign('/present?theme='+encodeURIComponent(entry.name));\n   grid.append(tile);\n }\n return {records:rows.length,topics:visible.length,available:available.length};\n}\n";
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
  'html.talera-untagged-memory-cards #myCards{display:grid!important}'+
  'html.talera-untagged-memory-cards .section-head:has(#myCount){display:flex!important}'+
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
// TALERA Free /tell: approved spacing and visual hierarchy ONLY.
// Keep the original tag editor instance and every existing click/save handler;
// move its existing DOM node below the already-present native photo tiles.
// Reuse the original fixed WhatsApp sheet; only make its EXISTING
// scrollable body accept native iPhone touch panning. No share API,
 // account, media or invitation changes.
function enableOriginalWhatsAppTouchScroll(html){
 const css='<style id="talera-free-whatsapp-native-touch-only">'+
  '#talera-clean-overlay > :first-child{'+
   'overflow-y:auto!important;'+
   '-webkit-overflow-scrolling:touch!important;'+
   'touch-action:pan-y!important;'+
   'overscroll-behavior-y:contain!important;'+
  '}'+
  '</style>';
 assert.equal(html.split('</head>').length,2,'PRESENT_SHARE_STYLE_INJECTION_SOURCE_DRIFT');
 return html.replace('</head>',css+'</head>');
}
function polishTellEditorLayout(html){
 const start=html.indexOf('function setupV20Tags(g,details){');
 const end=html.indexOf('}function setupV10(',start);
 assert.ok(start>0&&end>start,'TELL_LAYOUT_TAG_OWNER_MOVED');
 let owner=html.slice(start,end+1);
 const before=' details.append(box);';
 assert.equal(owner.split(before).length,2,'TELL_LAYOUT_SINGLE_TAG_CONTAINER_REQUIRED');
 owner=owner.replace(before,
   " details.append(box);\n"+
   " // Reposition the SAME tag container below the original photo grid.\n"+
   " const placeBelowMedia=()=>{\n"+
   "  const media=details.parentElement?.querySelector(':scope > .talera-work-tiles');\n"+
   "  if(media&&box.previousElementSibling!==media)media.insertAdjacentElement('afterend',box);\n"+
   " };\n"+
   " placeBelowMedia();\n"+
   " if(box.parentElement===details)requestAnimationFrame(placeBelowMedia);");
 // The signed-out editor has the original one-line label. Keep its
 // EXISTING tag button, events and tags intact, but present the SAME visible
 // localized question as the authenticated editor. Visual text only.
 const legacyPrompt="  toggle.textContent='＋ '+text('tag.add','Kenmerk toevoegen');";
 if(owner.includes(legacyPrompt)){
  const humanPrompt="  const lang=String(window.TaleraI18n?.language||'nl').slice(0,2);\n"+
    "  const names={nl:'Waar gaat deze herinnering over?',en:'What is this memory about?',\n"+
    "    de:'Worum geht es in dieser Erinnerung?',fr:'De quoi parle ce souvenir ?',\n"+
    "    es:'¿De qué trata este recuerdo?'};\n"+
    "  toggle.textContent='+ '+(names[lang]||names.nl);";
  owner=owner.replace(legacyPrompt,humanPrompt);
 }
 html=html.slice(0,start)+owner+html.slice(end+1);
 // The original native tile grid may be inserted AFTER setupV20Tags runs.
 // Perform the same DOM-only placement when that exact grid is inserted,
 // instead of depending on the order of animation frames.
 const nativeGridInsert="details.insertAdjacentElement('afterend',tiles);";
 assert.equal(html.split(nativeGridInsert).length,2,
   'TELL_LAYOUT_NATIVE_TILE_INSERTION_CHANGED');
 html=html.replace(nativeGridInsert,nativeGridInsert+
   " const topicsBelowPhotos=details.querySelector(':scope > .talera-tags-v20');"+
   " if(topicsBelowPhotos)tiles.insertAdjacentElement('afterend',topicsBelowPhotos);");
 const css=[
  '<style id="talera-free-tell-layout-only">',
  // The light canvas must continue to the bottom of the phone, not stop
  // below the existing action toolbar and leave a contrasting seam.
  'body:has(#app .talera-r16-editor){background:#fff!important;}',
  'body:has(#app .talera-r16-editor) #app{min-height:100dvh!important;background:#fff!important;display:flex!important;flex-direction:column!important;}',
  'body:has(#app .talera-r16-editor) #main{flex:1 0 auto!important;display:flex!important;flex-direction:column!important;background:#fff!important;}',
  '#app #main .work.talera-compact-work.talera-r16-editor{width:100%!important;min-width:0!important;box-sizing:border-box!important;flex:1 0 auto!important;min-height:calc(100dvh - 138px)!important;display:flex!important;flex-direction:column!important;background:#fff!important;}',
  '#app #main .work.talera-compact-work.talera-r16-editor #details{padding:0!important;margin:0!important;background:#fff!important;}',
  '#app #main .work.talera-compact-work.talera-r16-editor .talera-v14-heading{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:4px!important;padding:0 0 3px!important;}',
  '#app #main .work.talera-compact-work.talera-r16-editor .talera-v14-heading #title{padding:2px 0!important;line-height:1.38!important;}',
  '#app #main .work.talera-compact-work.talera-r16-editor .talera-v14-heading #dateToggle{margin:0!important;padding:3px 0!important;line-height:1.42!important;}',
  '#app #main .work.talera-compact-work.talera-r16-editor .talera-work-tiles{margin:0!important;background:#fff!important;}',
  // The original accessible toggle keeps its labels, selection state,
  // expand/collapse logic, and selected tags; only its visual affordance changes.
  '#app #main .work.talera-r16-editor .talera-tags-v20{flex:none;margin:0 0 2px!important;padding:0!important;border:0!important;background:#fff!important;}',
  '#app #main .work.talera-r16-editor .talera-tags-toggle{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;width:100%!important;min-height:48px!important;padding:10px 12px!important;border:1px solid #dbe4ef!important;border-radius:15px!important;background:#f5f8fc!important;color:#224d7c!important;text-align:left!important;font-size:clamp(13px,3.85vw,15px)!important;font-weight:700!important;line-height:1.32!important;white-space:nowrap!important;cursor:pointer!important;}',
  '#app #main .work.talera-r16-editor .talera-tags-toggle::after{content:"";flex:none;width:9px;height:9px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;box-sizing:border-box;transform:rotate(45deg);transform-origin:center;transition:transform .16s ease;margin:0 2px 4px 0;}',
  '#app #main .work.talera-r16-editor .talera-tags-toggle[aria-expanded="true"]::after{transform:rotate(225deg);margin-bottom:0;margin-top:4px;}',
  '#app #main .work.talera-r16-editor .talera-tags-toggle:focus-visible{outline:2px solid #224d7c!important;outline-offset:2px!important;}',
  // Only the expanded CHARACTERISTICS CHOICES scroll. Photo grid, toggle and
  // original recorder/writer/publish controls remain in their existing places.
  '#app #main .work.talera-r16-editor .talera-tags-panel{margin-top:6px!important;border-color:#dbe4ef!important;background:#fff!important;max-height:80px!important;min-height:0!important;overflow-y:auto!important;overscroll-behavior-y:contain!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important;}',
  '#app #main .work.talera-r16-editor .talera-tags-selected:not(:empty){margin-top:6px!important;}',
  // On taller phones use some of the spare vertical area for readable spacing.
  // The footer remains in its original flex position; the choices fill only
  // the room left above it.
  '@media (min-height:760px){#app #main .work.talera-compact-work.talera-r16-editor .talera-v14-heading{gap:9px!important;}#app #main .work.talera-compact-work.talera-r16-editor .talera-v14-heading #title{padding:5px 0!important;}#app #main .work.talera-compact-work.talera-r16-editor .talera-v14-heading #dateToggle{padding:6px 0!important;}#app #main .work.talera-compact-work.talera-r16-editor .talera-work-tiles{margin:10px 0!important;}#app #main .work.talera-r16-editor .talera-tags-v20{margin:8px 0!important;}}',
  '#app #main .work.talera-r16-editor .work-tools.talera-r16-toolbar{margin-top:auto!important;padding-top:16px!important;padding-bottom:16px!important;background:#fff!important;border-top:0!important;}',
  // Reuse the ORIGINAL writing overlay and original image/object URLs:
  // six real photos begin visibly above the original textarea, and both
  // naturally scroll in its EXISTING writer-body as V4 grows the typed text.
  // The previous keyboard rule hid photos on focus. Override it specifically.
  '#taleraWriterOverlay #taleraWriterPhotos:not([hidden]){display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;align-items:start!important;padding:8px 2px 10px!important;margin:0 0 10px!important;}',
  'body.talera-writer-keyboard-open #taleraWriterOverlay #taleraWriterPhotos:not([hidden]){display:grid!important;}',
  '#taleraWriterOverlay #taleraWriterPhotos .talera-writer-thumbnail{aspect-ratio:1!important;max-height:none!important;}',
  '#app>.submit.talera-r16-empty-publish{background:#fff!important;border-top:0!important;box-shadow:none!important;padding:0!important;min-height:0!important;}',
  '</style>'
 ].join('');
// Safari/other mobile browsers have different usable viewport heights.
 // After the ORIGINAL toggle opens, bound ONLY the choices panel to the
 // space above the existing bottom toolbar; no tag click/save handlers change.
 const scrollScript=[
  '<script id="talera-free-tell-topic-scroll-only">',
  '(function(){',
  ' const panelSelector=".work.talera-r16-editor .talera-tags-panel";',
  ' function bound(){',
  '  const p=document.querySelector(panelSelector);if(!p||p.hidden)return;',
  '  const work=p.closest(".work.talera-r16-editor");',
  '  const toolbar=work?.querySelector(".work-tools.talera-r16-toolbar");',
  '  const vv=window.visualViewport;',
  '  const bottom=(vv?vv.offsetTop+vv.height:window.innerHeight);',
  '  const top=p.getBoundingClientRect().top;',
  '  const toolbarHeight=toolbar?.getBoundingClientRect().height||80;',
  '  const available=Math.floor(bottom-top-toolbarHeight-30);',
  // Two complete 44px rows; short viewports reduce by a whole row.
  '  const rows=Math.max(1,Math.min(2,Math.floor((available-13)/44)));',
  '  p.style.setProperty("--talera-tag-visible-height",(rows*44)+"px");',
  ' }',
  ' document.addEventListener("click",function(e){',
  '  if(e.target.closest(".work.talera-r16-editor .talera-tags-toggle"))',
  '    requestAnimationFrame(bound);',
  ' });',
  ' window.addEventListener("resize",bound,{passive:true});',
  ' window.visualViewport?.addEventListener("resize",bound,{passive:true});',
  ' requestAnimationFrame(bound);',
  '})();',
  '</script>'
 ].join('');
 assert.equal(html.split('</head>').length,2,'TELL_LAYOUT_DOCUMENT_HEAD_CHANGED');
 assert.equal(html.split('</body>').length,2,'TELL_LAYOUT_DOCUMENT_BODY_CHANGED');
 return html.replace('</head>',css+'</head>').replace('</body>',scrollScript+'</body>');
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
// The original IndexedDB list is keyed by random stable memory IDs, so
// equal event date/time values could appear in arbitrary swipe order.
// Order ONLY the source rows by their persisted creation timestamps BEFORE
// the existing toMemory() conversion and unchanged native time-axis sort.
// Different event dates and expressly entered event times continue to be
// sorted by the original presentation engine. Never rewrite timestamps,
// media IDs, original data, gestures or the photo/voice/video players.
function orderSameDateOwnerPostsAtReadBoundary(html){
 const before='   const rows=await store.list();\n   const memories=rows.map(toMemory).filter(Boolean);';
 assert.equal(html.split(before).length,2,
   'SAME_DATE_OWNER_READ_BOUNDARY_SOURCE_DRIFT');
 const after="   const rows=(await store.list()).slice().sort((a,b)=>{\n"+
   "     const timestamp=row=>{\n"+
   "       const n=Date.parse(String(row?.createdAt||''));\n"+
   "       return Number.isFinite(n)?n:0;\n"+
   "     };\n"+
   "     return timestamp(a)-timestamp(b);\n"+
   "   });\n"+
   "   const memories=rows.map(toMemory).filter(Boolean);";
 return html.replace(before,after);
}

// Keep the existing RH19 story title and sheet above native inline videos.
// An ordinary video is appended at z=12 above its original reading scroll.
// Lower the existing video's presentation z-index instead of lifting the
// whole scroll above the protected timeline. No media or gesture motor edits.
//
// The existing sheet is still the ONLY vertical reader. Its native scrolling
// remains intact everywhere except its small visible grab area, where pointer
// motion drives the SAME scrollTop one-for-one (no velocity or snap animation).
function clarifyExistingReadingGrip(html){
 for(const required of ['id="memoryStoryScroll"','id="memoryCaption"',
   'id="memoryStory"','class="memory-sheet is-visible"'])
   assert.ok(html.includes(required),'ORIGINAL_READING_SHEET_CHANGED: '+required);
 const marker='id="talera-f5-story-grip-style"';
 assert.ok(!html.includes(marker)&&
   !html.includes('id="talera-f5-story-grip"'),
   'ORIGINAL_READING_GRIP_ALREADY_INSTALLED');
 const css=String.raw`
<style id="talera-f5-story-grip-style">
/* Keep the original timeline and its established story-scroll stacking.
   Move ONLY the existing direct-video elements BEHIND the reading sheet. */
.memory-space > video.talera-v61-inline-video{z-index:6!important}
.memory-space > .talera-v61-first-frame-bridge{z-index:7!important}
.memory-space #memoryStoryScroll{overscroll-behavior-y:contain!important}
.memory-space #memoryCaption::before{display:none!important}
#talera-f5-story-grip{
  /* The 66x43 finger target is invisible. Only the original small arrow
     is drawn, slightly more legible; no rounded button, card or halo. */
  position:absolute!important;top:5px!important;left:4px!important;
  width:66px!important;height:43px!important;min-width:66px!important;
  min-height:43px!important;box-sizing:border-box!important;
  margin:0!important;padding:0!important;
  display:flex!important;align-items:center!important;justify-content:center!important;
  border:0!important;border-radius:0!important;
  background:transparent!important;color:rgba(255,253,248,.94)!important;
  font:600 20px/1 -apple-system,BlinkMacSystemFont,sans-serif!important;
  text-shadow:0 1px 2px rgba(5,19,33,.85),0 0 2px rgba(5,19,33,.5)!important;
  box-shadow:none!important;appearance:none!important;-webkit-appearance:none!important;
  z-index:5!important;touch-action:none!important;
  user-select:none!important;-webkit-user-select:none!important;
  -webkit-tap-highlight-color:transparent!important;cursor:grab!important;
}
#talera-f5-story-grip:active{cursor:grabbing!important}
#talera-f5-story-grip:focus-visible{outline:2px solid #0f2747!important;outline-offset:2px!important}
</style>`;
 const js=String.raw`
<script id="talera-f5-story-grip-script">
(()=>{
 const scroll=document.getElementById('memoryStoryScroll');
 const sheet=document.getElementById('memoryCaption');
 if(!scroll||!sheet||document.getElementById('talera-f5-story-grip'))return;
 const grip=document.createElement('button');
 grip.type='button';grip.id='talera-f5-story-grip';
 grip.textContent='↑';
 grip.setAttribute('aria-label','Sleep omhoog of omlaag om het verhaal te lezen');
 sheet.prepend(grip);
 let drag=null,touchDrag=null;
 const moveReading=(startY,top,y)=>{
   const max=Math.max(0,scroll.scrollHeight-scroll.clientHeight);
   scroll.scrollTop=Math.max(0,Math.min(max,top+startY-y));
 };
 grip.addEventListener('pointerdown',e=>{
   // iPhone touch is handled by the native touch sequence below. Mouse and
   // pen continue using the original pointer-capture grip implementation.
   if(e.pointerType==='touch')return;
   if(e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
   drag={id:e.pointerId,y:e.clientY,top:scroll.scrollTop};
   try{grip.setPointerCapture(e.pointerId)}catch(_){}
   e.stopPropagation();e.preventDefault();
 },{passive:false});
 grip.addEventListener('pointermove',e=>{
   if(!drag||e.pointerId!==drag.id)return;
   moveReading(drag.y,drag.top,e.clientY);
   e.stopPropagation();e.preventDefault();
 },{passive:false});
 const end=e=>{
   if(!drag||e.pointerId!==drag.id)return;
   drag=null;
   try{if(grip.hasPointerCapture(e.pointerId))grip.releasePointerCapture(e.pointerId)}catch(_){}
   e.stopPropagation();
 };
 grip.addEventListener('pointerup',end);
 grip.addEventListener('pointercancel',end);
 // A single Safari touch must control exactly the SAME original scrollTop,
 // even if WebKit cancels captured Pointer Events during an upward pan.
 grip.addEventListener('touchstart',e=>{
   if(e.touches?.length!==1||touchDrag)return;
   const finger=e.touches[0];
   touchDrag={id:finger.identifier,y:finger.clientY,top:scroll.scrollTop};
   e.preventDefault();e.stopPropagation();
 },{passive:false});
 grip.addEventListener('touchmove',e=>{
   if(!touchDrag)return;
   const finger=Array.from(e.touches||[]).find(t=>t.identifier===touchDrag.id);
   if(!finger)return;
   moveReading(touchDrag.y,touchDrag.top,finger.clientY);
   e.preventDefault();e.stopPropagation();
 },{passive:false});
 const endTouch=e=>{
   if(!touchDrag)return;
   if(!Array.from(e.changedTouches||[]).some(t=>t.identifier===touchDrag.id))return;
   touchDrag=null;
   if(e.cancelable)e.preventDefault();
   e.stopPropagation();
 };
 grip.addEventListener('touchend',endTouch,{passive:false});
 grip.addEventListener('touchcancel',endTouch,{passive:false});
 // Keyboard support uses precisely the same existing sheet scroll.
 grip.addEventListener('keydown',e=>{
   if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;
   e.preventDefault();
   scroll.scrollTop+=e.key==='ArrowUp'?96:-96;
 });
})();
</script>`;
 assert.equal(html.split('</head>').length,2,'ORIGINAL_READING_HEAD_CHANGED');
 assert.equal(html.split('</body>').length,2,'ORIGINAL_READING_BODY_CHANGED');
 return html.replace('</head>',css+'</head>')
   .replace('</body>',js+'</body>');
}

function hideDuplicateReadingSheetActions(html){
 const necessary=[
  'id="memoryCaption"',
  'talera-v21-pencil',
  'talera-v18-story-actions',
  'talera-v5-editor-pencil',
  'talera-v26-reading',
  'talera-v18-reading',
  'id="memoryStory"'
 ];
 for(const marker of necessary)
  assert.ok(html.includes(marker),'APPROVED_READING_ACTION_MARKER_MISSING: '+marker);
 const css='<style id="talera-free-reading-actions-only-dedup">'+
  'body.talera-v18-reading #memoryCaption #talera-v18-story-actions,'+
  'body:not(.talera-recipient-presentation) .memory-space.talera-v26-reading #memoryCaption #talera-v18-story-actions,'+
  'body.talera-v18-reading #memoryCaption #talera-v21-pencil,'+
  '.memory-space.talera-v26-reading #memoryCaption #talera-v21-pencil,'+
  'body.talera-v18-reading #talera-v5-editor-pencil{'+
  'display:none!important;visibility:hidden!important;pointer-events:none!important}'+
  'body.talera-v18-reading .memory-space.talera-v26-reading #memoryCaption #memoryStory{'+
  'padding-right:0!important}'+
  '</style>';
 assert.equal(html.split('</head>').length,2,'READING_HEAD_DRIFT');
 assert.ok(!html.includes('talera-free-reading-actions-only-dedup'),'READING_PATCH_DUPLICATE');
 return html.replace('</head>',css+'</head>');
}
// Replace the ordinary controller and wheel thumbnails at build time.
// Only the selected memory ID owns the visible ordinary frame.
function rebuildDirectOrdinaryPresentation(html){
  const between=(a,b,x,k)=>{const i=html.indexOf(a),j=i<0?-1:html.indexOf(b,i+a.length);
    assert.ok(i>=0&&j>i&&html.indexOf(a,i+1)<0,'DIRECT_'+k);
    html=html.slice(0,i)+x+html.slice(j);};
  const once=(a,b,k)=>{assert.equal(html.split(a).length,2,'DIRECT_'+k);html=html.replace(a,b);};
  between("  let pendingAutoPhoto=null,photoAutoSerial=0;","  /* Photo autoplay belongs to a settled memory, never to the rolling wheel. */","  // The ONLY shared mechanism: one persistent audible HTMLMediaElement.\n  // Ordinary images/timers and narrator voice cues NEVER call one another.\n  // It is intentionally not removed/recreated on memory transitions:\n  // Safari can associate its prior audio gesture with the original node.\n  const taleraSharedAudible=(()=>{\n    let media=null,owner=null;\n    const node=()=>{\n      if(!media){\n        media=document.createElement('audio');\n        media.id='talera-f5-shared-audio';\n        media.preload='auto';media.playsInline=true;\n        media.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';\n        document.body.appendChild(media);\n      }\n      return media;\n    };\n    const clear=()=>{if(!media)return;\n      media.pause();\n      media.onplay=media.onpause=media.onended=media.ontimeupdate=\n        media.onloadedmetadata=media.onplaying=media.onseeking=media.onseeked=null;\n      media.removeAttribute('src');media.load();\n    };\n    return {\n      claim(next,src){\n        const audio=node();\n        clear();owner=next;audio.src=src;\n        audio.muted=false;audio.defaultMuted=false;audio.volume=1;\n        audio.removeAttribute('muted');audio.load();\n        return audio;\n      },\n      release(who){if(owner!==who)return;owner=null;clear()},\n      isOwner(who){return owner===who},\n      get(){return node()}\n    };\n  })();\n  // Only this neutral element can be passed to the independent narrator.\n  window.__taleraF5SharedAudible=taleraSharedAudible;\n\n  // Ordinary memory engine. Never reads voice timings or invokes narrator.\n  let ownSerial=0,ordinaryVideo=null,ordinaryVideoUrl=null,\n      ordinaryVideoToken=0,ordinaryVideoOwner='',ordinaryVideoKey='',ordinaryNativeAudioSession=null,ordinaryRecoverSound=null,ordinarySoundOwner=null;\n  const ordinaryMemory=m=>!!(!document.hidden&&m&&!m._photoLoading&&\n    !m._zeroItems?.some(x=>x.kind==='audio'));\n  // Only a REAL Safari audible-play rejection may show this temporary hint.\n  // It never introduces a button, changes gestures or touches the narrator.\n  let ordinaryHintTimer=0;\n  function ordinarySoundHint(show){\n    if(ordinaryHintTimer){clearTimeout(ordinaryHintTimer);ordinaryHintTimer=0}\n    document.getElementById('talera-f5-ordinary-sound-hint')?.remove();\n    if(!show||!window.__taleraAudioControls?.isEnabled?.())return;\n    const hint=document.createElement('div');\n    hint.id='talera-f5-ordinary-sound-hint';\n    window.TaleraI18n.setText(hint,'core.media.ordinarySoundHint');\n    hint.setAttribute('role','status');\n    hint.style.cssText='position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 128px);transform:translateX(-50%);padding:9px 15px;border-radius:20px;background:rgba(7,26,61,.80);color:white;font:500 14px/1.35 -apple-system,BlinkMacSystemFont,sans-serif;white-space:nowrap;max-width:calc(100vw - 32px);text-align:center;pointer-events:none;z-index:40;-webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px)';\n    document.body.appendChild(hint);\n    ordinaryHintTimer=setTimeout(()=>{\n      if(hint.isConnected)hint.remove();\n      ordinaryHintTimer=0;\n    },6500);\n  }\n  function closeOrdinaryVideo(keepElement=false){\n    ordinaryVideoToken++;ordinaryRecoverSound=null;ordinarySoundHint(false);\n    if(ordinarySoundOwner){taleraSharedAudible.release(ordinarySoundOwner);ordinarySoundOwner=null}\n    if(ordinaryVideo){\n      ordinaryVideo.onended=ordinaryVideo.onerror=ordinaryVideo.onloadedmetadata=\n        ordinaryVideo.onplaying=ordinaryVideo.ontimeupdate=null;\n      ordinaryVideo.pause();ordinaryVideo.removeAttribute('src');\n      if(keepElement===true)ordinaryVideo.style.display='none';\n      else {ordinaryVideo.remove();ordinaryVideo=null}\n    }\n    if(ordinaryVideoUrl){URL.revokeObjectURL(ordinaryVideoUrl);ordinaryVideoUrl=null}\n    ordinaryVideoOwner='';ordinaryVideoKey='';\n    // Preserve the native playback session while ordinary memories rotate.\n    // Fully release it on page exit or when the independent narrator takes over.\n    const previous=keepElement===true?null:ordinaryNativeAudioSession;\n    if(keepElement!==true)ordinaryNativeAudioSession=null;\n    if(previous)try{\n      if(previous.native.type==='playback')previous.native.type=previous.type;\n    }catch(error){console.warn('TALERA gewone audio-sessie herstellen niet mogelijk',error)}\n  }\n  function playOrdinaryVideo(memory,index){\n    if(!ordinaryMemory(memory)||runtime.currentMemory()?.id!==memory.id)return;\n    const frame=memory._zeroFrames?.[index];\n    if(frame?.kind!=='video'||!frame.key)return;\n    if(ordinaryVideoOwner===memory.id&&ordinaryVideoKey===frame.key)return;\n    // Keep the SAME video element through the ordinary photo/video rotation.\n    // WebKit's media gesture permission is tied to that element.\n    closeOrdinaryVideo(true);\n    const id=memory.id,key=frame.key,token=ordinaryVideoToken;\n    ordinaryVideoOwner=id;ordinaryVideoKey=key;\n    void (async()=>{\n      let url=null;\n      try{\n        const original=await window.TaleraLibrary?.blob?.(key);\n        if(!(original instanceof Blob)||!original.size)throw Error('Video ontbreekt bij media-ID');\n        url=URL.createObjectURL(original);\n        if(token!==ordinaryVideoToken||!ordinaryMemory(memory)||\n           runtime.currentMemory()?.id!==id||\n           memory._zeroFrames?.[memory._photoIndex]?.key!==key){\n          URL.revokeObjectURL(url);return;\n        }\n        ordinaryVideoUrl=url;\n        const stage=document.getElementById('photoStage');\n        if(!stage)throw Error('Bestaand presentatiescherm ontbreekt');\n        const video=ordinaryVideo||document.createElement('video');\n        video.className='talera-v61-inline-video';\n        video.playsInline=true;video.setAttribute('playsinline','');\n        video.setAttribute('webkit-playsinline','');\n        video.preload='auto';video.controls=false;\n        // Reusing an element must not carry old loop/speed state into a new clip.\n        video.loop=false;video.playbackRate=1;\n        // The picture is ALWAYS muted. The one shared audible element owns\n        // the soundtrack, respecting the existing ordinary Settings switch.\n        const soundEnabled=Boolean(window.__taleraAudioControls?.isEnabled?.());\n        video.muted=true;video.defaultMuted=true;video.volume=1;\n        video.setAttribute('muted','');\n        try{\n          const native=typeof navigator==='undefined'?null:navigator.audioSession;\n          if(soundEnabled&&native&&typeof native.type==='string'&&native.type!=='playback'){\n            ordinaryNativeAudioSession={native,type:native.type};\n            native.type='playback';\n          }\n        }catch(error){console.warn('TALERA gewone video audio-sessie niet beschikbaar',error)}\n        video.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:12;pointer-events:none';\n        // Keep the SAME original player physically within the existing photo\n        // stage, below the original title/reader on iPhone Safari.\n        if(video.parentElement!==stage)stage.appendChild(video);\n        ordinaryVideo=video;\n        // Keep the original Back link tappable above the iPhone video layer.\n        const home=document.getElementById('talera-flow-home');\n        if(home){\n          if(home.getAttribute('href')==='/')home.setAttribute('href','/mijn-leven');\n          home.style.zIndex='999';home.style.pointerEvents='auto';\n        }\n        const valid=()=>token===ordinaryVideoToken&&ordinaryVideo===video&&\n          ordinaryMemory(memory)&&runtime.currentMemory()?.id===id&&\n          memory._zeroFrames?.[memory._photoIndex]?.key===key;\n        let handledError=false,playPending=false;\n        const fail=()=>{\n          if(handledError||!valid())return;\n          handledError=true;\n          console.warn('TALERA gewoon videoformaat niet afspeelbaar',key);\n          if(memory.photos.length>1)showPhoto(memory,(index+1)%memory.photos.length,false);\n          else closeOrdinaryVideo();\n        };\n        // Video remains the original picture clock. One persistent, separate\n        // audio node supplies its soundtrack AND the narrator's voice/videos.\n        let startedSound=false;\n        const syncSound=()=>{\n          const owner=ordinarySoundOwner;\n          if(!owner||!taleraSharedAudible.isOwner(owner)||!valid())return;\n          const audio=taleraSharedAudible.get();\n          if(audio.paused||video.paused||video.seeking||audio.seeking)return;\n          if(video.readyState>=2&&audio.readyState>=1&&\n              Math.abs(audio.currentTime-video.currentTime)>0.40)\n            try{audio.currentTime=Math.max(0,video.currentTime)}catch(error){}\n        };\n        const recoverAudible=()=>{\n          if(!valid()||!soundEnabled||!ordinarySoundOwner||\n             !taleraSharedAudible.isOwner(ordinarySoundOwner))return;\n          ordinaryRecoverSound=null;ordinarySoundHint(false);\n          const audio=taleraSharedAudible.get();\n          try{if(audio.readyState>=1)audio.currentTime=Math.max(0,video.currentTime)}catch(error){}\n          // The real tap invokes play() DIRECTLY inside the gesture handler.\n          Promise.resolve(audio.play()).then(()=>{if(valid())syncSound()}).catch(error=>{\n            if(!valid())return;\n            if(error?.name==='NotAllowedError'){\n              ordinaryRecoverSound=recoverAudible;ordinarySoundHint(true);\n            }else if(error?.name!=='AbortError')\n              console.warn('TALERA gedeeld gewoon videogeluid niet gestart',error);\n          });\n        };\n        const startSound=()=>{\n          if(!valid()||!soundEnabled||startedSound)return;\n          startedSound=true;\n          const owner={id,key,token};\n          ordinarySoundOwner=owner;\n          const audio=taleraSharedAudible.claim(owner,url);\n          audio.onloadedmetadata=()=>{\n            if(valid()&&taleraSharedAudible.isOwner(owner))\n              try{audio.currentTime=Math.max(0,video.currentTime)}catch(error){}\n          };\n          recoverAudible();\n        };\n        const start=()=>{\n          // Only ONE muted-picture play() request; audio starts separately.\n          if(!valid()||!video.paused||video.ended||playPending)return;\n          playPending=true;\n          Promise.resolve(video.play()).then(()=>{\n            if(valid())startSound();\n          }).catch(error=>{\n            if(!valid())return;\n            if(error?.name==='NotSupportedError'){fail();return}\n            if(error?.name!=='AbortError')\n              console.warn('TALERA gewoon gedempt videobeeld niet gestart',error);\n          }).finally(()=>{playPending=false});\n        };\n        video.onplaying=syncSound;\n        video.ontimeupdate=syncSound;\n        video.onloadedmetadata=start;\n        video.onended=()=>{\n          if(!valid())return;\n          if(memory.photos.length>1)showPhoto(memory,(index+1)%memory.photos.length,false);\n        };\n        video.onerror=fail;\n        video.src=url;start();\n      }catch(error){\n        if(url&&url!==ordinaryVideoUrl)URL.revokeObjectURL(url);\n        if(token===ordinaryVideoToken){closeOrdinaryVideo();console.warn('TALERA gewone video niet beschikbaar',error)}\n      }\n    })();\n  }\n  function showPhoto(memory,index,manual=false){\n    if(!ordinaryMemory(memory)||runtime.currentMemory()?.id!==memory.id)return;\n    const own=Array.isArray(memory.photos)?memory.photos:[];\n    if(!own.length)return;\n    const next=((index%own.length)+own.length)%own.length,src=own[next];\n    const frame=memory._zeroFrames?.[next];\n    if(typeof src!=='string'||!src)return;\n    const id=memory.id,token=++ownSerial;\n    const commit=()=>{\n      if(token!==ownSerial||runtime.currentMemory()?.id!==id||\n         !ordinaryMemory(memory)||memory.photos[next]!==src)return;\n      if(frame?.kind!=='video')closeOrdinaryVideo(true);\n      memory._photoIndex=next;memory.image=src;\n      settleVisiblePhoto(memory);renderDots(memory);\n      if(frame?.kind==='video')playOrdinaryVideo(memory,next);\n      scheduleAuto(memory);\n    };\n    if(frame?.kind==='video'){commit();return}\n    const image=new Image();image.decoding='async';\n    image.onload=()=>{\n      if(typeof image.decode==='function')image.decode().then(commit,()=>{if(image.naturalWidth)commit()});\n      else if(image.naturalWidth)commit();\n    };\n    image.onerror=()=>{if(token===ownSerial)clearAuto()};\n    image.src=src;\n    if(image.complete&&image.naturalWidth)image.onload();\n  }\n  // Explicitly private ordinary entry. The narrator never calls this.\n  window.__taleraOrdinarySelectPhoto=(id,index,manual=false)=>{\n    const memory=currentMemory();\n    if(memory?.id===id&&ordinaryMemory(memory))showPhoto(memory,index,Boolean(manual));\n  };\n  window.__taleraOrdinaryActivate=(memory)=>{\n    if(!ordinaryMemory(memory)||runtime.currentMemory()?.id!==memory.id)return;\n    // Keep the exact existing Back link; remove the iOS-unreliable root redirect.\n    const back=document.getElementById('talera-flow-home');\n    if(back?.getAttribute('href')==='/')back.setAttribute('href','/mijn-leven');\n    const index=memory._photoIndex||0;\n    if(memory._zeroFrames?.[index]?.kind==='video')playOrdinaryVideo(memory,index);\n  };\n  // Old voice-facing hook kept inert for voiced memories until phase 2.\n  // It never enters the new ordinary motor.\n  window.__taleraV31SelectPhoto=(id,index,manual=false)=>{\n    const memory=currentMemory();\n    if(memory?.id===id&&!memory._zeroItems?.some(x=>x.kind==='audio'))\n      window.__taleraOrdinarySelectPhoto?.(id,index,manual);\n  };\n  function scheduleAuto(memory){\n    clearAuto();\n    if(!ordinaryMemory(memory)||runtime.currentMemory()?.id!==memory.id||\n       runtime.isMoving()||window.__taleraBandRolling||\n       !Array.isArray(memory.photos)||memory.photos.length<=1||\n       memory._zeroFrames?.[memory._photoIndex||0]?.kind==='video')return;\n    const id=memory.id;\n    autoStartTimer=setTimeout(()=>{\n      if(!ordinaryMemory(memory)||runtime.currentMemory()?.id!==id||\n         runtime.isMoving()||window.__taleraBandRolling){clearAuto();return}\n      showPhoto(memory,(memory._photoIndex||0)+1,false);\n    },memory._taleraLocal?2500:AUTO_START_MS);\n  }\n  // Recovery is confined to the EXISTING media surface, never the document,\n  // Back, menu or narrated layer. No extra 'Beluister' button is created.\n  document.getElementById('memoryStoryScroll')?.addEventListener('click',event=>{\n    if(event.target?.closest?.('a,button,[role=button],input,select,textarea'))return;\n    const retry=ordinaryRecoverSound;\n    if(!retry)return;\n    // Only the first denied-audio recovery tap is consumed.\n    // Do not let the same click advance a photo or memory.\n    event.preventDefault();event.stopImmediatePropagation();\n    retry();\n  },{capture:true});\n  // The saved Settings preference is re-read in playOrdinaryVideo for every clip.\n  // The pagehide event object must NOT count as an explicit keepElement=true.\n  window.addEventListener('pagehide',closeOrdinaryVideo,{once:true});\n  document.addEventListener('visibilitychange',()=>{\n    if(document.hidden){ownSerial++;clearAuto();closeOrdinaryVideo();}\n  });\n",'ORDINARY_MOTOR');
  between("  runtime.subscribe(memory=>{","  surface.addEventListener('pointerdown'","  runtime.subscribe(memory=>{\n    const changed=!memory||memory.id!==lastWrittenMemoryId;\n    if(changed){ownSerial++;clearAuto();\n      // An ordinary-to-ordinary swipe must retain its ONE native media element;\n      // an incoming narrated memory always takes independent ownership.\n      closeOrdinaryVideo(!!memory&&!memory._zeroItems?.some(x=>x.kind==='audio'));\n      syncTaleraStoryFrame(null)}\n    lastWrittenMemoryId=memory&&memory.id;\n    // Never modify the narrator's cue frame, timer or audio.\n    if(memory?._taleraLocal&&memory._zeroItems?.some(x=>x.kind==='audio')){\n      closeOrdinaryVideo();renderDots(memory);return;\n    }\n    if(changed&&memory&&!memory._photoLoading&&Array.isArray(memory.photos)&&memory.photos.length){\n      memory._photoIndex=0;memory.image=memory.photos[0];\n      settleVisiblePhoto(memory);\n    }\n    syncTaleraStoryFrame(memory);renderDots(memory);\n    if(ordinaryMemory(memory)){\n      window.__taleraOrdinaryActivate(memory);\n      if(changed||!autoStartTimer)scheduleAuto(memory);\n    }else clearAuto();\n  });\n\n",'ONE_SUBSCRIBER');
  between("  function assign(tile,index,mem){","  function render(now){","  function assign(tile,index,mem){\n    const url=mem?.thumbnail||mem?.previewImage||mem?.photos?.[0]||mem?.image;\n    const owner=mem==null?'':String(mem.id);\n    if(tile.index===index&&tile.el.dataset.owner===owner&&tile.el.dataset.url===(url||''))return;\n    tile.index=index;tile.el.dataset.owner=owner;tile.el.dataset.url=url||'';\n    tile.el.style.visibility='hidden';\n    if(!mem||!url)return;\n    const cached=cache.get(mem.id),img=cached?.src===url?cached:new Image();\n    if(img!==cached){img.decoding='async';img.src=url;cache.set(mem.id,img);if(cache.size>35)cache.delete(cache.keys().next().value)}\n    const current=()=>tile.index===index&&tile.el.dataset.owner===owner&&tile.el.dataset.url===url;\n    const paint=()=>{\n      if(!current()||!tile.sharp.complete||!tile.sharp.naturalWidth)return;\n      try{fitNode(tile.sharp,tile.blur,dimension(),stage.getBoundingClientRect().height)}catch(e){}\n      if(tile.back&&tile.back.src!==url)tile.back.src=url;\n      if(tile.blur&&tile.blur.src!==url)tile.blur.src=url;\n      tile.el.style.visibility='visible';\n    };\n    const install=()=>{\n      if(!current()||!img.naturalWidth)return;\n      tile.sharp.onload=paint;\n      if(tile.sharp.src!==url)tile.sharp.src=url;\n      if(tile.sharp.complete&&tile.sharp.naturalWidth)paint();\n    };\n    if(img.complete&&img.naturalWidth)install();\n    else img.addEventListener('load',()=>{\n      if(typeof img.decode==='function')img.decode().then(install,()=>{if(img.naturalWidth)install()});\n      else install();\n    },{once:true});\n  }\n",'OWN_THUMBNAIL');
  between("  function forceLayerPhoto(layer,src,opacity){","  // V36: show the active photo directly inside the existing RH19 photo stage.","  function forceLayerPhoto(layer,src,opacity){\n    if(!layer||!src)return;layer.style.opacity=String(opacity);\n    const owner=runtime.currentMemory()?.id;\n    for(const img of [layer.querySelector('.photo-backdrop'),layer.querySelector('.photo-aligned-blur'),layer.querySelector('.example-photo')]){\n      if(!img)continue;\n      const valid=()=>img.src===src&&img.complete&&img.naturalWidth&&runtime.currentMemory()?.id===owner;\n      if(valid()){img.style.visibility='visible';continue}\n      img.style.visibility='hidden';\n      img.onload=()=>{if(valid())img.style.visibility='visible'};\n      img.onerror=()=>{if(img.src===src)img.style.visibility='hidden'};\n      if(img.src!==src)img.src=src;\n      if(valid())img.style.visibility='visible';\n    }\n  }\n",'VISIBLE_IMAGE');
  // Thumbnail always represents the FIRST media item, even when it is video.
  once("       memory._zeroFrames=frames;memory._taleraFrames=frames;","       memory.thumbnail=photos[0]||placeholder;\n       memory._zeroFrames=frames;memory._taleraFrames=frames;",'FIRST_MEDIA_COVER');
  // The existing video-poster fallback captures the genuine first frame
  // from the untouched original video when its :phone-v1 sidecar is absent.
  // A later cue may choose another image; the wheel cover stays media[0].
  once("    urls.push(cover);memory.previewImage=cover;memory.photos[index]=cover;",
    "    urls.push(cover);memory.previewImage=cover;memory.photos[index]=cover;\n    if(index===0)memory.thumbnail=cover;",
    'VIDEO_FIRST_FRAME_THUMBNAIL');
  once("       if(frames[coverIndex]?.kind==='video'&&!frames[coverIndex].url)\n         void taleraClosedMakeCover(memory,frames[coverIndex],coverIndex,urls);",
    "       if(frames[0]?.kind==='video'&&!frames[0].url)\n         void taleraClosedMakeCover(memory,frames[0],0,urls);\n       if(coverIndex!==0&&frames[coverIndex]?.kind==='video'&&!frames[coverIndex].url)\n         void taleraClosedMakeCover(memory,frames[coverIndex],coverIndex,urls);",
    'FIRST_VIDEO_COVER_FALLBACK');
  // Reuse the existing scoped files store: one derived video still, never a video copy.
  once("window.TaleraMemories={save:save,list:list,get:get,blob:blob,mediaUrl:mediaUrl,displayUrl:displayUrl,birthday:birthday,setBirthday:setBirthday,retime:retime,audit:audit,remove:remove,setTags:setTags,localOnly:true};","// Original video files are immutable. Only an optional derived :phone-v1 JPEG\n// may be cached in the SAME account-scoped IndexedDB files store.\nasync function cacheVideoPoster(mediaKey,still){\n const key=String(mediaKey||'');\n if(!/^local-[a-z0-9-]+:\\d+$/i.test(key)||!(still instanceof Blob)||\n    !still.size||still.size>1500000||\n    !String(still.type).startsWith('image/'))return false;\n const storyId=key.slice(0,key.lastIndexOf(':')),row=await get(storyId);\n if(row?.source!=='pwa-local'||!(row.items||[]).some(\n   item=>item.kind==='video'&&item.key===key))return false;\n const posterKey=key+':phone-v1',originalPoster=await blob(posterKey);\n if(originalPoster instanceof Blob&&originalPoster.size&&\n    String(originalPoster.type).startsWith('image/'))return true;\n const db=await open(),tx=db.transaction('files','readwrite'),finished=done(tx);\n tx.objectStore('files').put({key:posterKey,blob:still});\n await finished;\n return true;\n}\nwindow.TaleraMemories={save:save,list:list,get:get,blob:blob,mediaUrl:mediaUrl,displayUrl:displayUrl,birthday:birthday,setBirthday:setBirthday,retime:retime,audit:audit,remove:remove,setTags:setTags,cacheVideoPoster:cacheVideoPoster,localOnly:true};",'CACHE_PREVIEW_SAME_LOCAL_DB');
  once("async function taleraClosedMakeCover(memory,frame,index,urls){","async function taleraClosedMakeCover(memory,frame,index,urls,prewarm=false){",'PREWARM_NATIVE_FRAME');
  once("    if(!blob?.size||!loaded.has(memory.id))return;","    if(!blob?.size||(!loaded.has(memory.id)&&!prewarm))return null;",'PREWARM_BEFORE_REGISTER');
  once("    urls.push(cover);memory.previewImage=cover;memory.photos[index]=cover;\n    if(index===0)memory.thumbnail=cover;","    if(prewarm)memory._taleraFirstWarm={key:frame.key,url:cover};\n    else urls.push(cover);\n    memory.previewImage=cover;\n    if(Array.isArray(memory.photos))memory.photos[index]=cover;\n    if(index===0)memory.thumbnail=cover;",'KEEP_SINGLE_VIDEO_COVER_URL');
  once("      if(runtime.currentMemory()?.id===memory.id)window.__taleraV31SelectPhoto?.(memory.id,index,false);\n    }\n  }catch(e){console.warn('TALERA videostill niet beschikbaar',e)}","      if(!prewarm&&runtime.currentMemory()?.id===memory.id)window.__taleraV31SelectPhoto?.(memory.id,index,false);\n    }\n    try{await store.cacheVideoPoster?.(frame.key,blob)}catch(e){console.warn('TALERA videominiatuur niet bewaard',e)}\n    return cover;\n  }catch(e){console.warn('TALERA videostill niet beschikbaar',e)}",'PERSIST_JPEG_NO_ORIGINAL_MUTATION');
  once("if(owner===memory.id&&shown===src&&!host.hidden){layout();return}\n      if(pendingOwner===memory.id&&pendingSrc===src)return;","if(owner===memory.id&&shown===src&&!host.hidden){layout();return}\n      if(owner!==memory.id&&host)host.hidden=true;\n      if(pendingOwner===memory.id&&pendingSrc===src)return;",'REMOVE_OLD_OVERLAY');
  once("const source=mem.previewImage||mem.thumbnail||mem.image;","const source=mem.thumbnail||mem.previewImage||mem.image;",'PREFETCH_COVER');
  once("window.__taleraV31SelectPhoto?.(memoryId,index,true);","window.__taleraOrdinarySelectPhoto?.(memoryId,index,true);",'ORDINARY_TAP_ENTRY_ONLY');
  once(" function activate(memory){\n   if(!memory||!memory._taleraLocal){disposePresentation();return}\n   if(memory._photoLoading){void hydrate(memory).then(()=>{if(runtime.currentMemory()?.id===memory.id)activate(memory)});return}\n   void present(memory);\n }"," function activate(memory){\n   if(!memory||!memory._taleraLocal){disposePresentation();return}\n   if(memory._photoLoading){void hydrate(memory).then(()=>{if(runtime.currentMemory()?.id===memory.id)activate(memory)});return}\n   // Routing only: the original recorded-voice functions remain untouched.\n   if(!memory._zeroItems?.some(item=>item.kind==='audio')){\n     if(activeId!==null)disposePresentation();\n     window.__taleraOrdinaryActivate?.(memory);\n     return;\n   }\n   void present(memory);\n }",'ONE_ENGINE_ROUTER');

  // Solely ordinary presentation media: reuse the existing cached photo-strip video frame.
  once("  let ownSerial=0,ordinaryVideo=null,ordinaryVideoUrl=null,\n      ordinaryVideoToken=0,ordinaryVideoOwner='',ordinaryVideoKey='',ordinaryNativeAudioSession=null,ordinaryRecoverSound=null,ordinarySoundOwner=null;","  let ownSerial=0,ordinaryVideo=null,ordinaryVideoUrl=null,\n      ordinaryVideoToken=0,ordinaryVideoOwner='',ordinaryVideoKey='',ordinaryNativeAudioSession=null,ordinaryRecoverSound=null,ordinarySoundOwner=null;\n  // Short-lived original-video still only during visual handoff, never persisted.\n  let ordinaryVideoBridge=null;\n  const clearOrdinaryVideoBridge=()=>{\n    if(ordinaryVideoBridge){ordinaryVideoBridge.remove();ordinaryVideoBridge=null}\n  };",'VIDEO_FRAME_HANDOFF_VARIABLE');
  once("    ordinaryVideoToken++;ordinaryRecoverSound=null;ordinarySoundHint(false);","    ordinaryVideoToken++;ordinaryRecoverSound=null;ordinarySoundHint(false);\n    clearOrdinaryVideoBridge();",'VIDEO_FRAME_HANDOFF_CLEANUP');
  once("        ordinaryVideo=video;\n        // Keep the original Back link tappable above the iPhone video layer.","        ordinaryVideo=video;\n        // The existing video still is decoded at ~0.15s. Keep THAT image\n        // above the same muted native video until it reaches the matching frame.\n        // Never seek, rewind, restart playback or change shared audio ownership.\n        const bridgeStill=memory.photos?.[index];\n        if(typeof bridgeStill==='string'&&bridgeStill.startsWith('blob:')){\n          const bridge=new Image();\n          bridge.className='talera-v61-first-frame-bridge';\n          bridge.alt='';bridge.decoding='async';\n          bridge.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:13;pointer-events:none';\n          bridge.onerror=()=>{if(ordinaryVideoBridge===bridge)clearOrdinaryVideoBridge()};\n          ordinaryVideoBridge=bridge;\n          bridge.src=bridgeStill;\n          // The original first-frame bridge must remain in that photo stage.\n          stage.appendChild(bridge);\n        }\n        // Keep the original Back link tappable above the iPhone video layer.",'VIDEO_FRAME_HANDOFF_INSTALL');
  once("        video.onplaying=syncSound;\n        video.ontimeupdate=syncSound;","        // Aim for 0.10s of still VIDEO time, not a blind wall-clock timeout.\n        // The persisted thumbnail came from ~0.15s; blend the last 0.05s\n        // into the already-composited moving video so existing stills stay\n        // unchanged and the native playback clock is never rewound.\n        let bridgeFramePending=false,bridgeFadeStarted=false,bridgeFadeFinished=false;\n        const finishVideoBridge=()=>{\n          const bridge=ordinaryVideoBridge;\n          if(bridgeFadeFinished&&bridge&&valid()&&!video.paused&&\n             !video.seeking&&video.currentTime>=0.14)\n            clearOrdinaryVideoBridge();\n        };\n        const fadeVideoBridge=()=>{\n          const bridge=ordinaryVideoBridge;\n          if(!bridge||bridgeFadeStarted||!valid()||video.paused||\n             video.seeking||video.readyState<2||video.currentTime<0.10)return;\n          bridgeFadeStarted=true;\n          bridge.style.transition='opacity 50ms linear';\n          bridge.addEventListener('transitionend',()=>{\n            bridgeFadeFinished=true;finishVideoBridge();\n          },{once:true});\n          requestAnimationFrame(()=>{\n            if(valid()&&ordinaryVideoBridge===bridge)bridge.style.opacity='0';\n          });\n          // Safari can suppress transitionend while compositing a video.\n          setTimeout(()=>{bridgeFadeFinished=true;finishVideoBridge()},110);\n        };\n        const settleVideoBridge=()=>{\n          const bridge=ordinaryVideoBridge;\n          if(!bridge||!valid())return;\n          if(bridgeFadeStarted){finishVideoBridge();return}\n          if(video.paused||video.seeking||video.readyState<2||\n             bridgeFramePending)return;\n          bridgeFramePending=true;\n          const frameReady=(_at,frameInfo)=>{\n            bridgeFramePending=false;\n            if(!valid()||ordinaryVideoBridge!==bridge)return;\n            const frameTime=typeof frameInfo?.mediaTime==='number'?\n              frameInfo.mediaTime:video.currentTime;\n            if(frameTime>=0.10)fadeVideoBridge();\n            if(!bridgeFadeStarted)settleVideoBridge();\n          };\n          if(typeof video.requestVideoFrameCallback==='function'){\n            try{\n              video.requestVideoFrameCallback(frameReady);\n              // Older WebKit builds can omit this callback. The readyState\n              // check still prevents replacing a still with blank video.\n              setTimeout(()=>{\n                if(bridgeFramePending&&valid()&&ordinaryVideoBridge===bridge){\n                  bridgeFramePending=false;\n                  if(video.currentTime>=0.10)fadeVideoBridge();\n                  else settleVideoBridge();\n                }\n              },160);\n            }catch(error){requestAnimationFrame(frameReady)}\n          }else requestAnimationFrame(frameReady);\n        };\n        video.onplaying=()=>{syncSound();settleVideoBridge()};\n        video.ontimeupdate=()=>{syncSound();settleVideoBridge()};",'VIDEO_FRAME_HANDOFF_MATCH_FRAME');
  once("        video.onended=()=>{\n          if(!valid())return;\n          if(memory.photos.length>1)showPhoto(memory,(index+1)%memory.photos.length,false);\n        };","        video.onended=()=>{\n          if(!valid())return;\n          clearOrdinaryVideoBridge();\n          if(memory.photos.length>1)showPhoto(memory,(index+1)%memory.photos.length,false);\n        };",'VIDEO_FRAME_HANDOFF_ENDING');
  // Keep the proven ordinary video start exactly as tested; no injected
  // blue mask or second decoder load between adjacent memories.
  // First iPhone start: repeated 0.4 s hard seeks made cold audio stutter.
  // Retain the approved shared audio element and a last-resort drift check,
  // never chase each early timeupdate while both decoders are warming.
  once("        let startedSound=false;\n        const syncSound=()=>{",
    "        let startedSound=false,lastSoundSeekAt=Date.now();\n        const syncSound=()=>{",
    'PERSISTENT_AUDIO_COOLDOWN_CLOCK');
  once("          if(video.readyState>=2&&audio.readyState>=1&&\n              Math.abs(audio.currentTime-video.currentTime)>0.40)\n            try{audio.currentTime=Math.max(0,video.currentTime)}catch(error){}",
    "          const now=Date.now();\n          if(now-lastSoundSeekAt<5000||video.readyState<3||audio.readyState<3)return;\n          if(Math.abs(audio.currentTime-video.currentTime)>1.5){\n            lastSoundSeekAt=now;\n            try{audio.currentTime=Math.max(0,video.currentTime)}catch(error){}\n          }",
    'COLD_FIRST_AUDIO_NO_REPEAT_SEEKS');
  once("          try{if(audio.readyState>=1)audio.currentTime=Math.max(0,video.currentTime)}catch(error){}",
    "          // A cold metadata-only audio decoder must not be forced to seek.\n          try{if(video.currentTime>2&&audio.readyState>=3)audio.currentTime=Math.max(0,video.currentTime)}catch(error){}",
    'NO_COLD_RECOVERY_SEEK');
  once("            if(valid()&&taleraSharedAudible.isOwner(owner))\n              try{audio.currentTime=Math.max(0,video.currentTime)}catch(error){}",
    "            if(valid()&&taleraSharedAudible.isOwner(owner)&&video.currentTime>2&&audio.readyState>=3)\n              try{audio.currentTime=Math.max(0,video.currentTime)}catch(error){}",
    'NO_COLD_METADATA_SEEK');
  // Freeze the SAME ordinary picture + shared sound clock, without
  // replacing the player or altering the user-owned original media.
  once("  window.__taleraOrdinaryActivate=(memory)=>{",
    "  window.__taleraOrdinaryPauseForShare=()=>{\n    clearAuto();ownSerial++;closeOrdinaryVideo(true);\n  };\n  window.__taleraOrdinaryActivate=(memory)=>{",
    'WHATSAPP_PAUSE_ORDINARY');
  once("  function playOrdinaryVideo(memory,index){\n    if(!ordinaryMemory",
    "  function playOrdinaryVideo(memory,index){\n    if(window.__taleraSharePauseActive)return;\n    if(!ordinaryMemory",
    'WHATSAPP_VIDEO_SUSPEND');
  once("  function showPhoto(memory,index,manual=false){\n    if(!ordinaryMemory",
    "  function showPhoto(memory,index,manual=false){\n    if(window.__taleraSharePauseActive)return;\n    if(!ordinaryMemory",
    'WHATSAPP_PHOTO_SUSPEND');
  once("  function scheduleAuto(memory){\n    clearAuto();",
    "  function scheduleAuto(memory){\n    clearAuto();\n    if(window.__taleraSharePauseActive)return;",
    'WHATSAPP_TIMER_SUSPEND');
  if(html.includes('readyNeighbour?.currentSrc'))throw Error('Old neighbor bitmap remains');
  if(html.includes('const fallback=mem._taleraLocal?('))throw Error('Old shared bitmap remains');
  return html;
}

// Remove exactly the original fifty reference memories and the four-hundred-
// fifty synthetic photo-band records from the PRESENTATION SOURCE, not just
// from the visible gallery. Personal memories are loaded later from the
// original per-account IndexedDB bridge and remain completely untouched.
// The existing presentation/wheel/narration engines are not replaced.
function removeBuiltInPresentationExamples(original){
 const start='const TALERA_STRESS_MEMORIES = Array.from({length:450},(_,i)=>{';
 const last='const EVENT_OFFSETS = MEMORIES.map(';
 const a=original.indexOf(start),b=original.indexOf(last,a+start.length);
 assert.ok(a>0&&b>a,'F5_PRESENT_EXAMPLE_SOURCE_MOVED');
 const old=original.slice(a,b);
 assert.equal(original.split(start).length,2,'F5_PRESENT_EXAMPLE_SEED_DUPLICATED');
 assert.equal(original.split('const MEMORIES = [').length,2,'F5_PRESENT_REFERENCE_ARRAY_DUPLICATED');
 assert.equal(original.split('TALERA_STRESS_MEMORIES').length,3,
  'F5_PRESENT_REFERENCE_GENERATOR_NEW_USAGE');
 assert.ok(old.includes('const MEMORIES = [')&&
  old.includes('].concat(TALERA_STRESS_MEMORIES).map(')&&
  old.includes('id:1001+i')&&old.includes('id:50,'),
  'F5_PRESENT_REFERENCE_SET_NOT_EXACT_50_PLUS_450');
 let html=original.slice(0,a)+'const MEMORIES = [];\n\n'+original.slice(b);
 const once=(from,to,label)=>{
  assert.equal(html.split(from).length,2,'F5_EMPTY_PRESENT_'+label+'_SOURCE_DRIFT');
  html=html.replace(from,to);
 };
 // The reference-only boot was allowed to assume an example always existed.
 // Guard just these two empty-list paths until the SAME local-store hydration
 // registers the owner's actual saved memories.
 once('function surroundingMemories(ms) {\n  if (ms <= MEMORIES[0].ms)',
  'function surroundingMemories(ms) {\n  if (!MEMORIES.length) return {left:null,right:null,progress:0};\n  if (ms <= MEMORIES[0].ms)',
  'ROLLING_PREVIEW');
 once('writeMemory(nearestMemory(centerMs));\nresize();',
  'const firstOwnMemory=nearestMemory(centerMs);\nif(firstOwnMemory)writeMemory(firstOwnMemory);\nresize();',
  'INITIAL_MEMORY');
 once('id="memoryDate">6 september 2026</div>',
      'id="memoryDate"></div>','STATIC_FAKE_EVENT_DATE');
 once('id="memoryStory">Terugkijken op al die losse momenten die samen langzaam een leven beginnen te vormen.</div>',
      'id="memoryStory"></div>','STATIC_FAKE_EVENT_STORY');
 // Remove the original static template image attributes as well as all
 // generated memory records, before asserting that no sample source remains.
 html=html.replace(/(<img\b[^>]*?)\s(?:src|srcset|poster)=(["'])https:\/\/picsum\.photos\/seed\/talera-(?:v11-clean|500-fotoband)-[^"']*\2/gi,'$1');
 assert.ok(html.includes('const MEMORIES = [];')&&
  !html.includes('TALERA_STRESS_MEMORIES')&&
  !html.includes('talera-500-fotoband-')&&
  !html.includes('https://picsum.photos/seed/talera-v11-clean-001/800/1200'),
  'F5_PRESENT_REFERENCE_PHOTO_STILL_BUNDLED');
 return html;
}

// F5 narration swipe repair: the ORIGINAL V61 resting-mode photo CSS hides
// all photo-strip pages while narration is visible. That is correct at rest,
// but suppresses the ALREADY EXISTING RH19/V13 swipe belt even after the
// original gesture listener activates it. Make ONLY its .is-visible state
// visible, without changing wheel timings, memory selection or player code.
function showExistingNarratedSwipeBand(html){
 const checks=[
   'talera-v61-narration-visual #photoStage .talera-photo-strip',
   "belt.classList.add('is-visible')",
   "belt.classList.remove('is-visible')",
   'id="memoryStoryScroll"'
 ];
 for(const part of checks)
   assert.ok(html.includes(part),'NARRATOR_SWIPE_EXISTING_WHEEL_MISSING: '+part);
 const mark='id="talera-f5-narrated-swipe-band"';
 assert.ok(!html.includes(mark),'NARRATOR_SWIPE_CSS_DUPLICATED');
 const css='<style '+mark+'>'+
   'body.talera-v61-narration-visual #photoStage .talera-photo-strip.talera-wheel-strip.is-visible'+
   '{display:block!important;visibility:visible!important;opacity:1!important}'+
   '</style>';
 return html.replace('</head>',css+'</head>');
}
// Single, compatible read-only gateway over the ORIGINAL local IndexedDB
// owner. No new database, media copy, player, Worker or additional origin.
// Make ONLY original PHOTO uploads independent of Safari's file picker
// backing before the ORIGINAL account-local IndexedDB save transaction.
// This modifies the existing TaleraMemories.save storage input, not any
// presentation, narration, album or timeline code. Files keep their
// original bytes, type, name, lastModified and media IDs (no new schema).
function stabilizeOriginalPhotoStorage(html){
 const pre="var db=await open(),tx=db.transaction(['stories','files'],'readwrite'),finish=done(tx);";
 const original="for(var j=0;j<files.length;j++)tx.objectStore('files').put({key:files[j].key,blob:uploads[j]});";
 assert.equal(html.split(pre).length,2,'PHOTO_STORAGE_SAVE_TRANSACTION_SOURCE_DRIFT');
 assert.equal(html.split(original).length,2,'PHOTO_STORAGE_FILE_WRITE_SOURCE_DRIFT');
 const owned=String.raw`
  // Protect the originals: do not persist a photo File whose bytes still
  // depend on a temporary iOS Photos/Files picker handle.
  var taleraOwnedPhotoUploads=[];
  for(var photoIndex=0;photoIndex<uploads.length;photoIndex++){
   var selected=uploads[photoIndex];
   if(typeOf(selected)!=='photo'){taleraOwnedPhotoUploads.push(selected);continue}
   if(!(selected instanceof Blob)||!selected.size)
    throw Error('De oorspronkelijke foto kan niet worden gelezen.');
   var ownedBytes=new Uint8Array(await selected.arrayBuffer());
   if(ownedBytes.byteLength!==selected.size)
    throw Error('De oorspronkelijke foto is onvolledig; niets opgeslagen.');
   var isCameraFile=typeof File==='function'&&selected instanceof File;
   var ownedOriginal=isCameraFile?
    new File([ownedBytes],selected.name,
      {type:selected.type,lastModified:selected.lastModified}):
    new Blob([ownedBytes],{type:selected.type});
   if(ownedOriginal.size!==selected.size||ownedOriginal.type!==selected.type||
      (isCameraFile&&(ownedOriginal.name!==selected.name||
        ownedOriginal.lastModified!==selected.lastModified)))
    throw Error('De foto kon niet identiek worden opgeslagen.');
   taleraOwnedPhotoUploads.push(ownedOriginal);
  }
`;
 return html.replace(pre,owned+pre).replace(original,
  "for(var j=0;j<files.length;j++)tx.objectStore('files').put({key:files[j].key,blob:taleraOwnedPhotoUploads[j]});");
}

// Store only the verified, derived capture place inside the existing item
// descriptor. The original bytes and the IndexedDB version stay unchanged.
function installCapturePlacePresentation(html){
 const flags=JSON.parse(readFileSync(path.join(here,'f5-capture-flags.json'),'utf8'));
 const sprite=readFileSync(path.join(here,'f5-capture-flags.png')).toString('base64');
 assert.ok(flags.positions.NL&&sprite.startsWith('iVBORw0KGgo'),'CAPTURE_FLAGS_INVALID');
 const css='<style id="talera-capture-place-css">'+
  '#talera-capture-place{display:flex;align-items:center;gap:5px;margin-top:3px;max-width:66%;'+
  'font:500 12px/1.25 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#fff;'+
  'text-shadow:0 1px 3px rgba(0,0,0,.85);pointer-events:none}'+
  '#talera-capture-place[hidden],#memoryCaption.talera-v21-title-tracking #talera-capture-place,'+
  'html.talera-direct-memory-entering #talera-capture-place,body.talera-v18-reading #talera-capture-place{display:none!important}'+
  '#talera-capture-place .talera-capture-flag[hidden]{display:none!important}'+
  '.talera-capture-flag{display:block;flex:0 0 16px;width:16px;height:11px;'+
  'background-repeat:no-repeat;background-image:url(data:image/png;base64,'+sprite+')}'+
  '.talera-capture-label{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
  '</style>';
 const source=readFileSync(path.join(here,'f5-capture-place-presentation.browser.js'),'utf8');
 assert.ok(!source.includes('</script'),'CAPTURE_PLACE_UNSAFE_UI_SOURCE');
 const script='<script id="talera-capture-place-script">'+memoryLocationSharedSource+'\n'+source+
  '\nmountTaleraCapturePlace('+JSON.stringify(flags.positions)+','+JSON.stringify(memoryLocationCountryCodes)+');</script>';
 assert.equal(html.split('</head>').length,2,'CAPTURE_PLACE_HEAD_DRIFT');
 assert.equal(html.split('</body>').length,2,'CAPTURE_PLACE_BODY_DRIFT');
 return html.replace('</head>',()=>css+'</head>').replace('</body>',()=>script+'</body>');
}

function installCapturePlaceCatalog(html,route){
 const raw=readFileSync(path.join(here,'f5-library-access.browser.js'),'utf8');
 const start=raw.indexOf(' async function readJpegCapturePlace(blob,signal){');
 const end=raw.indexOf(' async function readHeifCaptureGps(blob,signal){');
 assert.ok(start>=0&&end>start,'CAPTURE_PLACE_READER_SOURCE_DRIFT');
 const reader=raw.slice(start,end);
 assert.ok(!reader.includes('</script'),'CAPTURE_PLACE_UNSAFE_SOURCE');
 const save='async function save(input,uploads,editId){';
 const item="files.push({key:id+':'+i,kind:kind,name:safeName(f.name||kind),mime:f.type||'',size:f.size});";
 assert.equal(html.split(save).length,2,'CAPTURE_PLACE_SAVE_SOURCE_DRIFT');
 assert.equal(html.split(item).length,2,'CAPTURE_PLACE_ITEM_SOURCE_DRIFT');
 html=html.replace(save,()=>reader+'\n'+save);
 // The later private editor patch still recognises its original item line.
 // No independent transaction, media copy, geocoder or network request.
 html=html.replace(item,()=>item+
  "\n  if(kind==='photo')try{\n"+
  "   const capturePlace=await readCapturePlace(f);\n"+
  "   if(capturePlace)files[files.length-1].capturePlace=capturePlace;\n"+
  "  }catch(_){ /* Optional metadata must never prevent posting. */ }\n");
 // Mount one library-owned enrichment process on every authenticated main
 // screen, using the original local store closure, never a second IndexedDB owner.
 const gpsStart=raw.indexOf(' function parseExifCaptureGps('),gpsEnd=raw.indexOf(' function create(store){');
 assert.ok(gpsStart>=0&&gpsEnd>end,'CAPTURE_GPS_READER_SOURCE_DRIFT');
 const gpsReaders=raw.slice(gpsStart,start)+raw.slice(end,gpsEnd);
 const enrichment=readFileSync(path.join(here,'f5-capture-place-enrichment.mjs'),'utf8').replaceAll('export ','');
 assert.ok(!gpsReaders.includes('</script')&&!enrichment.includes('</script'),'CAPTURE_ENRICHMENT_UNSAFE_SOURCE');
 const matches=[...html.matchAll(/window\.TaleraMemories=\{[^\n;]*localOnly:true\};/g)];
 assert.equal(matches.length,1,'CAPTURE_ENRICHMENT_STORE_MARKER_DRIFT');
 const mount=matches[0],at=mount.index+mount[0].length;
 const install='\n'+gpsReaders+'\n'+enrichment+'\n'+
  "mountCapturePlaceEnrichment({store:window.TaleraMemories,open,done,dbName:DB_NAME,readPlace:readCapturePlace,readGps:async (original,signal)=>{"+
  "if(/^video\\/(?:quicktime|mp4|x-m4v)$/i.test(original.type))return readQuickTimeCaptureGps(original,signal);"+
  "if(/^image\\/(?:heic|heif|heic-sequence|heif-sequence)$/i.test(original.type)||/\\.(?:heic|heif)$/i.test(original.name||''))return readHeifCaptureGps(original,signal);"+
  "return readJpegCaptureGps(original,signal)},enabled:/*TALERA_GEONAMES_ENABLED*/false});\n";
 return html.slice(0,at)+install+html.slice(at);
}

function installReadOnlyLibraryGateway(html){
 const raw=readFileSync(path.join(here,'f5-library-access.browser.js'),'utf8');
 assert.ok(raw.includes('TaleraLibraryFactory')&&!raw.includes('</script'),
   'LIBRARY_GATEWAY_SOURCE_INVALID');
 // Re-route only existing read calls, AFTER every approved source-exact
 // presentation patch. Do this BEFORE injecting the factory itself, so
 // its own calls to the unchanged IndexedDB owner are never rewritten.
 let routed=html;
 for(const name of ['list','get','blob','mediaUrl','displayUrl']){
  const before='store.'+name+'(';
  const hits=routed.split(before).length-1;
  assert.ok(hits<60,'LIBRARY_UNEXPECTED_READ_CALL_COUNT_'+name);
  if(hits)routed=routed.replaceAll(before,'window.TaleraLibrary.'+name+'(');
 }
 const re=/window\.TaleraMemories=\{[^\n;]*localOnly:true\};/g;
 const matches=[...routed.matchAll(re)];
 assert.equal(matches.length,1,'LIBRARY_ORIGINAL_STORE_MARKER_CHANGED');
 assert.ok(!routed.includes('window.TaleraLibrary='),'LIBRARY_GATEWAY_DUPLICATED');
 const m=matches[0],at=m.index+m[0].length;
 const install='\n'+raw+'\n'+
  'window.TaleraLibrary=window.TaleraLibraryFactory.create(window.TaleraMemories);\n';
 const mounted=routed.slice(0,at)+install+routed.slice(at);
 // Only AFTER ALL previously approved source-exact presentation repairs,
 // switch the narrator's read dependency to the library gateway.
 const old='const taleraIndependentNarrator=taleraCreateIndependentNarrator({stage,store,runtime});';
 assert.equal(mounted.split(old).length,2,'LIBRARY_NARRATOR_ROUTER_MARKER_CHANGED');
 return mounted.replace(old,
  'const taleraIndependentNarrator=taleraCreateIndependentNarrator({stage,store:window.TaleraLibrary,runtime});');
}

// Stop the original narrator, ordinary picture and sound when the existing
// WhatsApp dialog opens. Do not resume behind the user's back on closing it.
function pausePresentationDuringWhatsApp(html){
 const reader="const taleraIndependentNarrator=taleraCreateIndependentNarrator({stage,store:window.TaleraLibrary,runtime});";
 const pause=String.raw`
window.__taleraFreePauseForShare=active=>{
 window.__taleraSharePauseActive=Boolean(active);
 if(!active)return;
 window.__taleraOrdinaryPauseForShare?.();
 taleraIndependentNarrator.stop();
 for(const media of document.querySelectorAll('audio,video')){
  try{if(!media.paused)media.pause()}catch(e){}
 }
};
`;
 assert.equal(html.split(reader).length,2,'WHATSAPP_NARRATOR_SOURCE_DRIFT');
 html=html.replace(reader,reader+'\n'+pause);
 const activate=' function activate(memory){\n';
 assert.equal(html.split(activate).length,2,'WHATSAPP_ACTIVATE_SOURCE_DRIFT');
 return html.replace(activate,activate+'   if(window.__taleraSharePauseActive)return;\n');
}

// Each recorded memory is controlled by an entirely separate motor.
// The existing taleraInline ordinary presenter is unchanged and never starts
// for a recorded memory. Only store (original media-ID library), stage (the
// existing visible surface) and runtime.currentMemory (router) cross this edge.
function isolateNarratedMemories(html){
 const own=readFileSync(path.join(here,'f5-independent-narrator.browser.js'),'utf8');
 assert.ok(own.includes('function taleraCreateIndependentNarrator(')&&
   !own.includes('__taleraV31SelectPhoto')&&!own.includes('taleraInline'),
   'NARRATOR_MUST_NOT_IMPORT_PRESENTATION_MOTOR');
 const oldStart="async function present(memory){\n  if(!stage||!memory)return;";
 const newStart=own+"\nconst taleraIndependentNarrator="+
   "taleraCreateIndependentNarrator({stage,store,runtime});\n"+
   "async function present(memory){\n  if(!stage||!memory)return;\n"+
   "  if(memory._zeroItems?.some(item=>item.kind==='audio')){\n"+
   "    if(taleraInline)disposePresentation();\n"+
   "    await taleraIndependentNarrator.open(memory);\n"+
   "    return; // No ordinary presentation functions for voice memories.\n"+
   "  }\n"+
   "  taleraIndependentNarrator.stop();";
 const exact=(before,after,label)=>{
   assert.equal(html.split(before).length,2,'F5_NARRATOR_ROUTER_SOURCE_DRIFT_'+label);
   html=html.replace(before,after);
 };
 exact(oldStart,newStart,'TYPE_ROUTER');
 // A voice record is already dispatched above to the independent narrator.
 // A NON-voice local record must likewise never fall through to the old
 // V61 inline-player. That player can create a white "▶ Beluister" button
 // if Safari refuses play(), even though the approved ordinary motor uses
 // ONE muted video node and a persistent shared audible node instead.
 // This guards direct/reentrant present(memory) calls during rapid swipes.
 exact("  taleraIndependentNarrator.stop();\n  if(activeId===memory.id){",
   "  taleraIndependentNarrator.stop();\n"+
   "  if(memory._taleraLocal){\n"+
   "    if(taleraInline)disposePresentation();\n"+
   "    window.__taleraOrdinaryActivate?.(memory);\n"+
   "    return; // Never enter obsolete V61 audio-permission overlay.\n"+
   "  }\n  if(activeId===memory.id){",
   'BLOCK_LEGACY_PRESENT_ON_LOCAL_MEMORY');
 exact("if(!memory||!memory._taleraLocal){disposePresentation();return}",
  "if(!memory||!memory._taleraLocal){taleraIndependentNarrator.stop();disposePresentation();return}",
  'DEACTIVATION');

 // On a swipe into a memory whose original media are not yet hydrated,
 // stop the previous narrator BEFORE waiting for IndexedDB/media decode.
 // Otherwise the previous voice layer keeps playing over the next photo
 // until async hydrate() completes (or remains stuck after a failed read).
 exact("if(memory._photoLoading){void hydrate(memory).then(",
  "if(memory._photoLoading){taleraIndependentNarrator.stop();void hydrate(memory).then(",
  'STOP_BEFORE_NEXT_MEMORY_HYDRATION');
 exact("window.addEventListener('pagehide',()=>{\n   disposePresentation();",
  "window.addEventListener('pagehide',()=>{\n   taleraIndependentNarrator.stop();\n   disposePresentation();",
  'PAGEHIDE');
 assert.ok(html.includes('return; // No ordinary presentation functions for voice memories.'));
 return html;
}

// Only the visible historical ruler ends at today. The existing timeline
// navigation, zoom, clock, personal birth date, media and photos remain intact.
// In the approved presenter the center is already clamped to LIFE_END, but
// the canvas still drew future years and an endless horizontal axis.
function capVisibleTimelineAtToday(html){
 const one=(before,after,label)=>{
  assert.equal(html.split(before).length,2,'F5_PRESENT_TODAY_'+label+'_SOURCE_DRIFT');
  html=html.replace(before,after);
 };
 one('function tick(x,axisY,major,label="",sub="",strongSub=false) {\n  if(x<-55 || x>canvas.clientWidth+55) return;',
     'function tick(x,axisY,major,label="",sub="",strongSub=false) {\n'+
     '  const [viewStart,viewEnd]=bounds();\n'+
     '  const endX=((LIFE_END-viewStart)/(viewEnd-viewStart))*canvas.clientWidth;\n'+
     '  if(x<-55 || x>canvas.clientWidth+55 || x>endX) return;\n'+
     '  // Avoid drawing half a future-facing label at the end of the life line.\n'+
     '  if(major&&label&&x+Math.max(18,String(label).length*4)>endX){label="";sub="";}',
     'SCALE_TICKS');
 // Preserve all existing age/year spacing except the final partial period.
 // The last complete calendar-year difference is drawn at today's position.
 // No time-position, navigation, swipe, zoom or memory data is changed.
 one('    if(age<0 || age>60) continue;',
     '    const calendarAge=new Date(LIFE_END).getFullYear()-new Date(LIFE_START).getFullYear();\n'+
     '    if(age<0 || age>=calendarAge) continue;',
     'LAST_WHOLE_YEAR');
 one('  drawDensity(level,startMs,endMs,w,axisY);\n'+
     '  drawMemoryBeacons(level,startMs,endMs,w,axisY);\n'+
     '  drawScale(level,startMs,endMs,w,axisY);',
     '  // The selected date and center needle still use the original scale.\n'+
     '  // Only the paintable future part of its canvas is cut off.\n'+
     '  const endX=Math.max(0,Math.min(w,((LIFE_END-startMs)/(endMs-startMs))*w));\n'+
     '  ctx.save();ctx.beginPath();ctx.rect(0,0,endX,h);ctx.clip();\n'+
     '  drawDensity(level,startMs,endMs,w,axisY);\n'+
     '  drawMemoryBeacons(level,startMs,endMs,w,axisY);\n'+
     '  drawScale(level,startMs,endMs,w,axisY);\n'+
     '  ctx.restore();\n'+
     '  if(level===0 && LIFE_END>=startMs && LIFE_END<=endMs){\n'+
     '    const lastYear=new Date(LIFE_END).getFullYear();\n'+
     '    const birthYear=new Date(LIFE_START).getFullYear();\n'+
     '    const calendarAge=Math.max(0,lastYear-birthYear);\n'+
     '    const x=((LIFE_END-startMs)/(endMs-startMs))*w;\n'+
     '    ctx.strokeStyle="rgba(15,39,71,.66)";ctx.lineWidth=1.5;\n'+
     '    ctx.beginPath();ctx.moveTo(x,axisY-11);ctx.lineTo(x,axisY+10);ctx.stroke();\n'+
     '    ctx.textAlign="center";ctx.fillStyle="rgba(15,39,71,.90)";\n'+
     '    ctx.font="700 13px Inter,-apple-system,sans-serif";\n'+
     '    ctx.fillText(calendarAge+" "+(window.TaleraI18n?.t("present.ageUnit")||"jaar"),x,axisY+22);\n'+
     '    ctx.fillStyle="rgba(62,74,89,.58)";\n'+
     '    ctx.font="11px Inter,-apple-system,sans-serif";\n'+
     '    ctx.fillText(String(lastYear),x,axisY+34);\n'+
     '  }',
     'CANVAS_LIMIT');
 assert.ok(html.includes('const endX=Math.max(0,Math.min(w,((LIFE_END-startMs)/(endMs-startMs))*w));'));
 return html;
}

// Restore the original native timeline's drag position after choosing a
// photo-book frame. The V3 book landing previously rewrote centerMs to its
// nearest memory on pointer-up (with one local memory, often today's date).
// Only the timeline release is affected: ordinary photo swipes, zoom gears,
// speed-adaptive scale, player and every media ID use their original code.
function keepNativeTimelineDateAfterPhotoLanding(html){
 const one=(before,after,label)=>{
  assert.equal(html.split(before).length,2,'F5_NATIVE_TIMELINE_'+label+'_SOURCE_DRIFT');
  html=html.replace(before,after);
 };
 one(
   '    centerMs=l.ms+(r.ms-l.ms)*clamp(position-ix,0,1);\n    keepCenterValid();draw();',
   '    const held=window.__taleraNativeTimelineReleaseMs;\n'+
   '    centerMs=Number.isFinite(held)?held:l.ms+(r.ms-l.ms)*clamp(position-ix,0,1);\n'+
   '    keepCenterValid();draw();',
   'SCRUB_ONLY_DURING_TIMELINE_RELEASE');
 one(
   '    centerMs=item.ms;keepCenterValid();\n    if(item.id!==activeMemoryId)',
   '    const held=window.__taleraNativeTimelineReleaseMs;\n'+
   '    window.__taleraNativeTimelineReleaseMs=null;\n'+
   '    centerMs=Number.isFinite(held)?held:item.ms;keepCenterValid();\n'+
   '    if(item.id!==activeMemoryId)',
   'CHOOSE_PRESERVES_FINGER_DATE');
 one(
   '    beginLanding(0,0,Math.round(state.p));\n'+
   '    // Timeline selection also uses the single landing curve.',
   '    // Keep the actual finger-chosen date while the original book settles.\n'+
   '    window.__taleraNativeTimelineReleaseMs=runtime.centerMs();\n'+
   '    beginLanding(0,0,Math.round(state.p));\n'+
   '    // Timeline selection also uses the single landing curve.',
   'END_TIMELINE_DATE');

 // The original photo book has a fractional position for photo-to-photo
 // gestures. It is NOT a real timestamp: interpolating this position during
 // native TIME browsing blends two unrelated memories over the years/hours
 // between their original saved event dates. Time browsing must resolve
 // exactly one unchanged memory ID from the sorted original timestamps.
 one(
   '    return clip(lo+clip((ms-items[lo].ms)/Math.max(1,items[hi].ms-items[lo].ms),0,1),0,n-1);',
   '    return ms-items[lo].ms<=items[hi].ms-ms?lo:hi;',
   'EVENT_TIMESTAMP_NOT_INTERPOLATED');
 // The native ruler already paints the finger-selected date in draw().
 // The photo book must not replace it with a different memory's date upon
 // committing that memory after a native timeline swipe.
 one(
   '    book.choose(i);\n    if(focus){focus.textContent=formatter.format(items[i].ms);state.dateIndex=i;}',
   '    const fromNativeTimeline=Number.isFinite(window.__taleraNativeTimelineReleaseMs);\n'+
   '    book.choose(i);\n'+
   '    if(focus){\n'+
   '      if(!fromNativeTimeline)focus.textContent=formatter.format(items[i].ms);\n'+
   '      state.dateIndex=i;\n'+
   '    }',
   'KEEP_REAL_TIME_RULER_DATE');
 // The original wheel keeps rendering for several frames after the
 // timeline finger is released. It must not re-impose its photo date over
 // the real ruler date while the wheel finishes the original landing.
 one(
   '    if(focus&&!state.timelineTracking)focus.textContent=formatter.format(items[state.dateIndex>=0?state.dateIndex:c].ms);',
   '    if(focus&&!state.timelineTracking&&!state.timelineFocusReleased)focus.textContent=formatter.format(items[state.dateIndex>=0?state.dateIndex:c].ms);',
   'FOCUS_NOT_OVERWRITTEN_BY_WHEEL_FRAME');
 one(
   '    // Keep the actual finger-chosen date while the original book settles.\n'+
   '    window.__taleraNativeTimelineReleaseMs=runtime.centerMs();',
   '    // Keep the actual finger-chosen date while the original book settles.\n'+
   '    state.timelineFocusReleased=true;\n'+
   '    window.__taleraNativeTimelineReleaseMs=runtime.centerMs();',
   'RELEASE_FOCUS_DURING_LANDING');
 one(
   '    state.v=0;state.snap=false;state.landing=null;state.minimumIntentIndex=null;state.intentDirection=0;',
   '    state.timelineFocusReleased=false;\n'+
   '    state.v=0;state.snap=false;state.landing=null;state.minimumIntentIndex=null;state.intentDirection=0;',
   'PHOTO_SWIPE_RETURNS_ORIGINAL_FOCUS');
 one(
   '      belt.classList.remove(\'is-visible\');state.visible=false;window.__taleraBandRolling=false;',
   '      belt.classList.remove(\'is-visible\');state.visible=false;window.__taleraBandRolling=false;\n'+
   '      state.timelineFocusReleased=false;',
   'SETTLED_WHEEL_RELEASES_DATE_GUARD');
 return html;
}

/* A genuine movement of the existing time ruler owns the existing RH19
   photo strip. Stop the old ordinary/narrated playback on the FIRST movement,
   not on a stationary touch. The original engines, saved cues, photos,
   speed-sensitive scale and book landing remain unchanged. */
// Attach the single loupe to the EXISTING native timeline closure.
function installTimelineLoupe(html){
 const one=(before,after,label)=>{
  assert.equal(html.split(before).length,2,'F5_TIMELINE_LOUPE_'+label+'_DRIFT');
  html=html.replace(before,()=>after);
 };
 const source=readFileSync(path.join(here,'f5-timeline-loupe.mjs'),'utf8').replaceAll('export ','');
 assert.ok(!source.includes('</script>'));
 one('let zoomPos=0;','let zoomPos=0;\nlet taleraLoupeHoldId=null,taleraLoupeHoldMs=null;','HOLD_ID');
 // Observe decisive horizontal flicks even while the loupe is waiting for
 // its stationary-hold threshold. The old ruler saw every pointer sample;
 // the loupe's 16px slop now delays the filtered 90ms overview intent.
 // Retain the original .85px/ms strong-overview threshold. A short
 // coherent 24px burst is enough; jitter, vertical motion and a pause
 // are not. Use actual event timestamps instead of a clamped long gap.
 one('let scaleLastX=0,scaleLastT=0,searchVelocity=0;',`let scaleLastX=0,scaleLastT=0,searchVelocity=0;
let quickOverviewX=0,quickOverviewY=0,quickOverviewT=0,quickOverviewDistance=0,quickOverviewDirection=0;
function quickOverviewEventTime(e){
  return Number.isFinite(e.timeStamp)?e.timeStamp:performance.now();
}
function resetQuickOverview(e){
  quickOverviewX=e.clientX;quickOverviewY=e.clientY;quickOverviewT=quickOverviewEventTime(e);
  quickOverviewDistance=0;quickOverviewDirection=0;
}
function observeQuickOverview(e){
  const now=quickOverviewEventTime(e);
  const dx=e.clientX-quickOverviewX,dy=e.clientY-quickOverviewY,dt=now-quickOverviewT;
  quickOverviewX=e.clientX;quickOverviewY=e.clientY;quickOverviewT=now;
  const dir=Math.sign(dx);
  if(dt<0||dt>64||Math.abs(dx)<Math.abs(dy)||Math.abs(dx)/Math.max(8,dt)<.85){
    quickOverviewDistance=0;quickOverviewDirection=0;return false;
  }
  if(dir!==quickOverviewDirection)quickOverviewDistance=0;
  quickOverviewDirection=dir;quickOverviewDistance+=Math.abs(dx);
  return quickOverviewDistance>=24;
}`,'QUICK_OVERVIEW_SAMPLE');
 one('    resetVisualIntent(scaleLastT);\n    gestureUsedPinch=false;',
  '    resetVisualIntent(scaleLastT);\n    resetQuickOverview(e);\n    gestureUsedPinch=false;','QUICK_OVERVIEW_RESET');
 one('    considerVisualScale(searchVelocity,now);',`    // Strong short swipe may bypass the old dwell/gear-hold, but only
    // on the native year/overview ruler, never an explicit deeper pinch.
    if(quickOverview&&visualZoomPos<=VISUAL_AUTO_MAX_ZOOM&&
       (visualZoomPos>0||visualScaleTransitioning&&visualIntentLevel===1)&&
       (!visualScaleTransitioning||visualIntentLevel===1)){
      visualIntentLevel=0;visualIntentSince=now;
      animateVisualScaleTo(0,260);
    }else considerVisualScale(searchVelocity,now);`,'QUICK_OVERVIEW_INTENT');

 // Closing the loupe deliberately leaves the native zoom at level 1. The
 // speed-sensitive visual ruler can subsequently return to level 0 without
 // changing that native value. At both the initial grip and a settled gear
 // change, anchor to the actual painted ruler (not that hidden zoom value).
 one(`function dragSpanForCurrentVisual() {
  // At month scale (and explicit deeper pinch scales) the timeline itself
  // becomes the ruler: one screen-pixel of finger motion equals one
  // screen-pixel of timeline motion. Overview keeps the proven life span.
  return visualZoomPos>=.82?spanForZoom(visualZoomPos):spanForZoom(zoomPos);
}`,`function dragSpanForCurrentVisual() {
  // One pixel of movement equals one pixel on the actual visible ruler.
  return spanForZoom(visualZoomPos);
}`,'VISIBLE_GRIP_SPAN');
 one('        const span=target>=.82?spanForZoom(target):spanForZoom(zoomPos);',
  '        const span=spanForZoom(target);','VISIBLE_GEAR_REANCHOR');

 one('  centerMs=clamp(centerMs,minCenter,LIFE_END);',
  '  centerMs=clamp(centerMs,(surface.dataset.taleraLoupe==="open"||taleraLoupeHoldMs!==null&&centerMs===taleraLoupeHoldMs)?LIFE_START:minCenter,LIFE_END);','LIFE_LIMIT');
 one('  if (!window.__taleraBandRolling) {\n    if (userIsMoving) renderJourneyPreview();',
  '  if (!window.__taleraBandRolling && surface.dataset.taleraLoupe!=="open" && !(taleraLoupeHoldMs!==null&&centerMs===taleraLoupeHoldMs)) {\n    if (userIsMoving) renderJourneyPreview();','EXACT_SELECTION');
 // The existing timeline contrast analyser must never refetch a transient
 // object URL behind an already displayed photo. During rapid swiping or
 // navigation WebKit can release that URL while the analyser is fetching it.
 // Sample the decoded local image directly; retain the original CORS path
 // for remote imagery and the original luminance thresholds/fallback.
 one(`      const response=await fetch(src,{mode:'cors',cache:'force-cache'});
      if(!response.ok)throw new Error('image fetch');
      const blob=await response.blob();
      const bitmap=await createImageBitmap(blob);
      if(token!==runToken){bitmap.close();return;}`,`      // TALERA_TIMELINE_CONTRAST_DECODED_LOCAL_IMAGE
      const local=/^(blob:|data:)/i.test(src);
      let bitmap;
      if(local){
        if(!img.complete||!img.naturalWidth||!img.naturalHeight)return;
        bitmap=img;
      }else{
        const response=await fetch(src,{mode:'cors',cache:'force-cache'});
        if(!response.ok)throw new Error('image fetch');
        const blob=await response.blob();
        bitmap=await createImageBitmap(blob);
      }
      if(token!==runToken){if(!local)bitmap.close();return;}`,'CONTRAST_LOCAL_DECODED');
 one(`      if(!ctx){bitmap.close();return;}

      /* Only the upper photographic zone behind the ruler matters. */
      const sourceH=Math.max(1,Math.round(bitmap.height*.24));
      ctx.drawImage(bitmap,0,0,bitmap.width,sourceH,0,0,sw,sh);
      bitmap.close();`,`      if(!ctx){if(!local)bitmap.close();return;}

      /* Only the upper photographic zone behind the ruler matters. */
      const sourceW=local?img.naturalWidth:bitmap.width;
      const sourceH=Math.max(1,Math.round((local?img.naturalHeight:bitmap.height)*.24));
      ctx.drawImage(bitmap,0,0,sourceW,sourceH,0,0,sw,sh);
      if(!local)bitmap.close();`,'CONTRAST_LOCAL_SAMPLE');
 // Share the original canvas, density-beacons, tick appearance and date badge.
 one('function drawDensity(level,startMs,endMs,w,axisY) {',
  'function drawDensity(level,startMs,endMs,w,axisY,project=null) {','DENSITY_PROJECTION');
 one('    const x=((LIFE_START+mid*MS_DAY-startMs)/(endMs-startMs))*w;',
  '    const x=project?project(LIFE_START+mid*MS_DAY):((LIFE_START+mid*MS_DAY-startMs)/(endMs-startMs))*w;','DENSITY_X');
 one('    const bw=Math.max(level<2?2.2:3.2,bucket/visible*w*.64);',
  '    const bw=Math.max(level<2?2.2:3.2,(project?Math.abs(project(LIFE_START+be*MS_DAY)-project(LIFE_START+bs*MS_DAY)):bucket/visible*w)*.64);','DENSITY_WIDTH');
 one('function drawMemoryBeacons(level,startMs,endMs,w,axisY) {',
  'function drawMemoryBeacons(level,startMs,endMs,w,axisY,project=null) {','BEACON_PROJECTION');
 one('    const x=((m.ms-startMs)/(endMs-startMs))*w;',
  '    const x=project?project(m):((m.ms-startMs)/(endMs-startMs))*w;','BEACON_X');
 one('  if(x<-55 || x>canvas.clientWidth+55 || x>endX) return;',
  '  if(x<-55 || x>canvas.clientWidth+55 || (surface.dataset.taleraLoupe!=="open"&&x>endX)) return;','TICK_CLIP');
 one('  if(major&&label&&x+Math.max(18,String(label).length*4)>endX){label="";sub="";}',
  '  if(surface.dataset.taleraLoupe!=="open"&&major&&label&&x+Math.max(18,String(label).length*4)>endX){label="";sub="";}','TICK_END_LABEL');
 one('  const endX=Math.max(0,Math.min(w,((LIFE_END-startMs)/(endMs-startMs))*w));',
  '  if(surface.dataset.taleraLoupe==="open"){taleraLoupe.paint({ctx,w,h,axisY,drawDensity,drawMemoryBeacons,tick})}else{\n  const endX=Math.max(0,Math.min(w,((LIFE_END-startMs)/(endMs-startMs))*w));','PAINT');
 one('  const localOnTimeline=MEMORIES.find(m=>m.id===activeMemoryId);',
  '  }\n  const localOnTimeline=MEMORIES.find(m=>m.id===activeMemoryId);','PAINT_END');
 const marker='surface.addEventListener("pointerdown",e=>{';
 const bind=`
const taleraLoupe=mountTimelineLoupe({
 surface,lifeStart:LIFE_START,lifeEnd:LIFE_END,locale:()=>window.TaleraI18n?.locale||'nl-NL',
 selection:()=>({id:MEMORIES.find(m=>m.id===activeMemoryId)?.id??null,ms:centerMs}),
 memories:()=>MEMORIES,
 redraw:ms=>{centerMs=ms;taleraLoupeHoldMs=ms;keepCenterValid();draw()},
 openNative:id=>{
  if(pointers.size!==1||!pointers.has(id))return false;
  const band=window.__taleraIntegratedBand?.getState?.();
  if(band?.drag||band?.snap||band?.timelineTracking||band?.active)return false;
  const current=MEMORIES.find(m=>m.id===activeMemoryId);

  pointers.clear();userIsMoving=false;clearTimeout(snapTimer);cancelAnimationFrame(raf);
  clearTimeout(candidateTimer);clearTimeout(storySwitchTimer);pendingMemoryId=null;
  cancelVisualScaleAnimation();searchVelocity=0;
  window.__taleraNativeTimelineReleaseMs=null;
  zoomPos=visualZoomPos=3;
  taleraLoupeHoldId=current?.id??null;taleraLoupeHoldMs=centerMs;
  keepCenterValid();draw();return true;
 },
 closeNative:()=>{
  clearTimeout(snapTimer);cancelAnimationFrame(raf);cancelVisualScaleAnimation();
  zoomPos=visualZoomPos=1;userIsMoving=false;searchVelocity=0;
  taleraLoupeHoldMs=centerMs;resetVisualIntent(performance.now());keepCenterValid();draw();
 },
 select:id=>{
  const index=MEMORIES.findIndex(m=>m.id===activeMemoryId);
  const targetIndex=MEMORIES.findIndex(m=>m.id===id);
  const target=MEMORIES[targetIndex];
  if(!target||!Number.isFinite(target.ms)||target.ms<LIFE_START||target.ms>LIFE_END)return false;
  taleraLoupeHoldId=target.id;taleraLoupeHoldMs=target.ms;
  clearTimeout(candidateTimer);clearTimeout(storySwitchTimer);pendingMemoryId=null;
  // Use the already approved native timeline-motion notification before
  // handing off a different memory. It stops the outgoing engine even if
  // the next ordinary photo is already hydrated; no player changes needed.
  document.dispatchEvent(new Event("talera:timeline-user-motion"));
  return index>=0&&Math.abs(targetIndex-index)===1?window.__taleraPhotoBook.step(targetIndex-index):window.__taleraPhotoBook.choose(targetIndex);
 }
});
function taleraNativeTimelineStart(){
 taleraLoupeHoldId=null;taleraLoupeHoldMs=null;
 userIsMoving=true;window.__taleraIntegratedBand?.beginTimeline?.();
}
`;
 one(marker,source+'\n'+bind+'\n'+marker,'MOUNT');
 one('  if(e.target.closest("button")) return;\n  userIsMoving = true;\n  surface.setPointerCapture(e.pointerId);',
  '  if(taleraLoupe.down(e))return;\n  if(e.target.closest("button")) return;\n  surface.setPointerCapture(e.pointerId);','DOWN');
 one('    window.__taleraIntegratedBand?.beginTimeline?.();\n    reanchorDragAt(e.clientX);',
  '    if(!taleraLoupe.arm(e))taleraNativeTimelineStart();\n    reanchorDragAt(e.clientX);','ARM');
 one('  } else if(pointers.size===2) {\n    markZoomDiscovered();',
  '  } else if(pointers.size===2) {\n    taleraLoupe.cancelPending();taleraNativeTimelineStart();\n    markZoomDiscovered();','PINCH');
 one('surface.addEventListener("pointermove",e=>{\n  if(!pointers.has(e.pointerId)) return;',
  'surface.addEventListener("pointermove",e=>{\n  if(taleraLoupe.move(e))return;\n  if(!pointers.has(e.pointerId)) return;\n  const quickOverview=pointers.size===1&&!gestureUsedPinch&&observeQuickOverview(e);\n  if(taleraLoupe.waiting(e))return;\n  if(!userIsMoving)taleraNativeTimelineStart();','MOVE');
 one('function pointerEnd(e) {\n  if(pointers.has(e.pointerId)) pointers.delete(e.pointerId);',
  'function pointerEnd(e) {\n  if(taleraLoupe.end(e))return;\n  if(taleraLoupe.cancelPending(e.pointerId)){pointers.delete(e.pointerId);userIsMoving=false;return}\n  if(!pointers.has(e.pointerId))return;\n  pointers.delete(e.pointerId);','END');
 one('surface.addEventListener("wheel",e=>{\n  e.preventDefault();\n  userIsMoving = true;',
  'surface.addEventListener("wheel",e=>{\n  e.preventDefault();\n  if(taleraLoupe.wheel(e))return;\n  taleraLoupeHoldId=null;taleraLoupeHoldMs=null;\n  userIsMoving = true;','WHEEL');
 const css='<style id="talera-timeline-loupe-style">'+
 '#surface,#surface *{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;touch-action:none!important}'+
 '#talera-timeline-loupe{position:absolute;top:var(--talera-loupe-top,6px);left:50%;width:66.666667%;height:calc((100% - 50px) * .66666667);transform:translateX(-50%);box-sizing:border-box;border-radius:15px;border:1px solid #ffffffb8;background:rgba(255,254,252,.97);z-index:1;pointer-events:none;overflow:hidden;box-shadow:0 5px 22px #0003}'+
 '#talera-timeline-loupe[hidden]{display:none!important}'+
 '#surface[data-talera-loupe="open"]>#timelineCanvas{opacity:1!important;filter:none!important;transition:none!important}'+
 '#surface[data-talera-loupe="open"]>.center-needle{z-index:4!important;opacity:1!important;top:calc(var(--talera-loupe-top,6px) + 8px)!important;margin-top:0!important;bottom:auto!important;height:calc((100% - 50px) * .66666667 - 11px)!important;min-height:0!important;max-height:none!important}'+
 '</style>';
 one('</head>',css+'</head>','STYLE');
 return html;
}

function stopOldPresentationWhenTimelineMoves(html){
 const one=(before,after,label)=>{
  assert.equal(html.split(before).length,2,'F5_TIMELINE_PRESENTATION_'+label+'_DRIFT');
  html=html.replace(before,after);
 };
 one(
   '    state.timelineTracking=true;state.timelineLastAt=now;',
   '    state.timelineTracking=true;state.timelineMoved=false;state.timelineLastAt=now;',
   'TRACK_ACTUAL_MOTION');
 one(
   '    const now=performance.now(),pos=positionForTimestamp(ms);',
   '    if(!state.timelineMoved){\n'+
   '      state.timelineMoved=true;\n'+
   '      document.dispatchEvent(new Event("talera:timeline-user-motion"));\n'+
   '    }\n'+
   '    const now=performance.now(),pos=positionForTimestamp(ms);',
   'STOP_ON_FIRST_REAL_MOVEMENT');
 one(
   'const taleraIndependentNarrator=taleraCreateIndependentNarrator({stage,store,runtime});',
   'const taleraIndependentNarrator=taleraCreateIndependentNarrator({stage,store,runtime});\n'+
   '// Do not let a recorded voice/video continue behind a moving photo strip.\n'+
   'document.addEventListener("talera:timeline-user-motion",()=>{\n'+
   '  taleraIndependentNarrator.stop();\n'+
   '  if(taleraInline)disposePresentation();\n'+
   '});',
   'STOP_VOICE_AND_ORIGINAL_SOUND');
 one(
   "  window.addEventListener('pagehide',closeOrdinaryVideo,{once:true});",
   '  document.addEventListener("talera:timeline-user-motion",()=>{\n'+
   '    ownSerial++;clearAuto();closeOrdinaryVideo(true);\n'+
   '  });\n'+
   "  window.addEventListener('pagehide',closeOrdinaryVideo,{once:true});",
   'STOP_ORDINARY_PLAYER');
 return html;
}

const refs={};
// Remove the original sample stories' internet-photo addresses from every
// generated entry page. This does NOT touch private IndexedDB, saved media,
// ordinary user URLs, the video engine, or logos.
// The original Tell editor had a hidden importer for a 500-story
// internet-photo demonstration. Remove that special sample importer while
// retaining the same normal user-selected photo import and saved media IDs.
function removeLegacyTellSampleImporter(html){
 const begin="const seed=url.hostname==='picsum.photos'?url.pathname.match(";
 let count=0,start;
 while((start=html.indexOf(begin))>=0){
  const end=html.indexOf('else{',start);
  assert.ok(end>start&&end-start<350,'TELL_LEGACY_SAMPLE_IMPORTER_BRANCH_MOVED');
  const old=html.slice(start,end+5);
  assert.ok(old.includes('talera-500-fotoband-')&&
   /if\(seed\)(?:quick|draft)\.demoSeed=seed;/.test(old),
   'TELL_SAMPLE_ONLY_SOURCE_CHANGED');
  // Keep the ordinary user-photo fetch and its error handling.
  html=html.slice(0,start)+'{'+html.slice(end+5);
  count++;
  assert.ok(count<=8,'TELL_SAMPLE_IMPORTER_UNEXPECTED_DUPLICATES');
 }
 assert.ok(count>0&&!html.includes('talera-500-fotoband-'),
  'TELL_LEGACY_SAMPLE_IMPORTER_LEFTOVER');
 return html;
}
function stripBundledExamplePhotoLinks(html){
 const sampleImage=/https:\/\/picsum\.photos\/seed\/talera-(?:v11-clean|500-fotoband)-[^\s"'<>)]*/gi;
 const sampleImgAttribute=/(<img\b[^>]*?)\s(?:src|srcset|poster)=(["'])https:\/\/picsum\.photos\/seed\/talera-(?:v11-clean|500-fotoband)-[^"']*\2/gi;
 html=html.replace(sampleImgAttribute,'$1').replace(sampleImage,'');
 assert.ok(!/https:\/\/picsum\.photos\/seed\/talera-(?:v11-clean|500-fotoband)-/i.test(html),
  'BUILT_IN_SAMPLE_PHOTO_URL_REMAINED');
 return html;
}
// Existing per-account IndexedDB records live on the owner's iPhone. An
// explicit same-origin Home URL fragment lets that one signed-in owner
// request a confirmed reset without affecting anyone else's account.
// Do not add this to the signed-out guest HTML.
// User-requested account-local reset. Accessible from the REAL Home page,
// not only from a one-time URL fragment or a native browser confirm dialog.
// Keep all original account IDs, menu, presentation and DB code untouched.
// Owner-approved ONE-TIME local deletion. The URL is intentionally explicit:
// ordinary visitors, other accounts and normal app openings are untouched.
// The current phone must open the URL because Free originals are in its IDB.
function installOwnerRequestedClearAllStories(html){
 const js=String.raw`(function(){
  const explicitlyRequested=location.pathname==='/mijn-leven/opschonen-cfd3450b58ef9410b64a26cc84c2045c'||
    (location.pathname==='/mijn-leven'&&
     new URLSearchParams(location.search).get('wis-alle-verhalen')==='nu');
  if(!explicitlyRequested)return;
  // Remove the destructive URL FIRST so Back/refresh cannot wipe new stories.
  history.replaceState(null,'','/mijn-leven');
  async function execute(){
   if(document.readyState==='loading')
    await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
   const status=document.createElement('div');
   status.id='talera-own-reset-progress';
   status.setAttribute('role','status');
   status.style.cssText='position:fixed;z-index:2147483640;inset:0;'+
    'padding:35vh 25px 0;text-align:center;background:#f6f5f2;'+
    'color:#091e43;font:bold 20px/1.5 system-ui;';
   status.textContent='Je herinneringen worden verwijderd…';
   document.body.appendChild(status);
   const onceKey='talera-free-owner-cleanup-cfd3450b58ef9410b64a26cc84c2045c';
   try{
    if(localStorage.getItem(onceKey)==='done'){
     status.textContent='Dit eenmalige wisadres is al gebruikt.';
     location.replace('/mijn-leven');return;
    }
   }catch(_){}
   for(let i=0;i<180;i++){
    const s=window.TaleraMemories;
    if(s?.localOnly===true&&typeof s.list==='function'&&typeof s.remove==='function'){
     const list=await s.list();
     if(!Array.isArray(list)||list.some(item=>
       !item||item.source!=='pwa-local'||typeof item.id!=='string'||
       !/^local-[a-z0-9-]{8,90}$/i.test(item.id)))
      throw Error('De lokale verhalenlijst kon niet veilig worden gecontroleerd.');
     for(const item of list)await s.remove(item.id);
     const still=await s.list();
     if(!Array.isArray(still)||still.length!==0)
      throw Error('Niet alle herinneringen zijn verwijderd.');
     if(list.length)try{localStorage.setItem(onceKey,'done')}catch(_){}
     status.textContent='Je herinneringen zijn verwijderd.';
     location.replace('/mijn-leven');
     return;
    }
    await new Promise(resolve=>setTimeout(resolve,100));
   }
   throw Error('De lokale herinneringenopslag is niet bereikbaar.');
  }
  void execute().catch(error=>{
   const message='Wissen is niet gelukt: '+String(error?.message||error);
   const status=document.getElementById('talera-own-reset-progress');
   if(status)status.textContent=message;
   else alert(message);
  });
 })();`;
 assert.ok(html.includes('window.TaleraMemories=')&&
   html.includes('</body>')&&!html.includes('id="talera-owner-delete-on-request"'),
   'OWNER_CLEAR_EXISTING_SAME_ORIGIN_LOCAL_STORE_MISSING');
 return html.replace('</body>',
  '<script id="talera-owner-delete-on-request">'+js+'</script></body>');
}

// The logged-out app must never surface unscoped legacy memories or save
// personal stories without an account. No original IndexedDB bytes change.
// The existing single-use, same-origin owner cleanup remains available.
function closeAnonymousPersonalLibrary(html){
 const marker=/window\.TaleraMemories=\{[^\n;]*localOnly:true\};/g;
 const matches=[...html.matchAll(marker)];
 assert.equal(matches.length,1,'GUEST_ORIGINAL_MEMORY_OWNER_MARKER_DRIFT');
 const at=matches[0].index+matches[0][0].length;
 const gate="(function(){\n  const purge=location.pathname==='/mijn-leven/opschonen-cfd3450b58ef9410b64a26cc84c2045c'||\n    (location.pathname==='/mijn-leven'&&\n      new URLSearchParams(location.search).get('wis-alle-verhalen')==='nu');\n  if(purge)return; // Preserve the existing, explicitly requested one-off cleanup.\n  const original=window.TaleraMemories;\n  if(!original||original.localOnly!==true)\n    throw Error('TALERA_GUEST_LIBRARY_OWNER_MISSING');\n  const signIn=async()=>{throw Error('Meld je aan om herinneringen op te slaan.')};\n  // Normal guest pages must never read or write the historical unscoped store.\n  // An authenticated reload gets the unmodified account-local library.\n  Object.assign(original,{\n    list:async()=>[],get:async()=>null,blob:async()=>null,\n    mediaUrl:async()=>null,displayUrl:async()=>null,\n    save:signIn,remove:signIn,retime:signIn,setTags:signIn,\n    setBirthday:signIn,birthday:()=>null\n  });\n})();";
 if(html.includes('TALERA_GUEST_LIBRARY_OWNER_MISSING'))
  throw Error('GUEST_LIBRARY_GATE_DUPLICATED');
 return html.slice(0,at)+'\n'+gate+'\n'+html.slice(at);
}

// Build the logged-out entry from the very same zero-example source.
// The old immutable 7-Nov shell held 500 demonstrations and could reappear
// whenever an iPhone session expired. NEVER serve that snapshot as a fallback.
const guestPages={};
const languageAssets=new Set();
function localizeCore(html,route){const result=centralizeCoreLanguage(html,route);writeFileSync(path.join(publicDir,'__talera_free','assets',result.asset),result.engine,'utf8');languageAssets.add(result.asset);return result.html;}
for(const [route,filename] of Object.entries(routes)){
 const raw=readFileSync(path.join(delivery,'generated','reference-'+filename+'.html'),'utf8');
 let guest=raw;
 if(route==='/present'){
   guest=removeBuiltInPresentationExamples(guest);
   // A missing Safari session previously loaded the ORIGINAL, unscoped
   // local story list and the obsolete V61 "▶ Beluister" media controller.
   // Signed-out presentation is an EMPTY login entry, NEVER a back door
   // to old local media or an alternative video player.
   const boot='   const rows=await store.list();\n   const memories=rows.map(toMemory).filter(Boolean);';
   assert.equal(guest.split(boot).length,2,'GUEST_PRESENT_LOCAL_BOOT_SOURCE_DRIFT');
   guest=guest.replace(boot,
     '   const rows=[]; // Login required: no local media read.\n'+
     '   const memories=rows.map(toMemory).filter(Boolean);');
 }
 if(route==='/mijn-leven'){
   guest=removeAllBuiltInHomeExamples(showOwnedStoriesOnly(guest));
   // The owner's iPhone may show legacy local stories without a valid session.
   // Apply the one-time reset only on the explicit reset URL in BOTH shells.
   guest=installOwnerRequestedClearAllStories(guest);
   // No account session: NEVER load or show personal records from an unscoped
   // local library, even if an older iPhone kept stale IndexedDB records.
   const ownRead="rows=(await store.list()).filter(x=>x&&x.source==='pwa-local');";
   assert.equal(guest.split(ownRead).length,2,'GUEST_LOCAL_LIBRARY_READ_SOURCE_DRIFT');
   guest=guest.replace(ownRead,'rows=[];');
 }
 // Guest and authenticated /tell are TWO variants of the SAME original editor.
 // Apply the SAME layout styling to both; leave account/library gates untouched.
 if(route==='/tell')guest=removeLegacyTellSampleImporter(simplifyTellMemoryEditor(polishTellEditorLayout(guest)));
 if(route==='/present')guest=enableOriginalWhatsAppTouchScroll(guest);
 guest=closeAnonymousPersonalLibrary(guest);
 guest=stripBundledExamplePhotoLinks(guest);
 if(route==='/mijn-leven'){
   assert.ok(guest.includes('window.__taleraReferenceMemories=[];')&&
     !guest.includes('Test 081')&&!guest.includes('talera-500-fotoband-081'),
     'GUEST_HOME_STILL_HAS_DEMO_MEMORIES');
 }
 if(route==='/present'){
   assert.ok(guest.includes('const MEMORIES = [];')&&
     !guest.includes('TALERA_STRESS_MEMORIES')&&
     !guest.includes('talera-500-fotoband-'),
     'GUEST_PRESENTATION_STILL_HAS_DEMO_MEMORIES');
 }
 assert.ok(guest.includes('</head>')&&guest.includes('</body>')&&
   (route!=='/mijn-leven'||guest.includes('id="navMore"'))&&
   (route!=='/present'||guest.includes('id="photoStage"')),
   'GUEST_ORIGINAL_ENTRY_DOM_MISSING');
 guest=installDesktopMemoryTransition(installDesktopPresentationLayout(installDesktopHomeLayout(guest,route),route),route);
 guest=localizeCore(guest,route);
 const guestFile=sha(guest)+'.html';
 writeFileSync(path.join(publicDir,'__talera_free','f5references',guestFile),guest,'utf8');
 guestPages[route]='/__talera_free/f5references/'+guestFile;
 let html=raw;
 if(route==='/present')html=removeBuiltInPresentationExamples(html);
 if(route==='/present')html=fixPhotoOnlyPresentation(html);
 if(route==='/present')html=fixFirstSwipePhotoLoad(html);
 if(route==='/present')html=warmUpFirstSwipePhotoStrip(html);
 if(route==='/present')html=primeFirstOpenLocalStoryCovers(html);
 if(route==='/present')html=rebuildDirectOrdinaryPresentation(html);
 if(route==='/present')html=filterOwnTopicPresentation(html);
 if(route==='/present')html=hideDuplicateReadingSheetActions(html);
 if(route==='/present')html=clarifyExistingReadingGrip(html);
 if(route==='/present')html=isolateNarratedMemories(html);
 if(route==='/present')html=showExistingNarratedSwipeBand(html);
 if(route==='/present')html=capVisibleTimelineAtToday(html);
 if(route==='/present')html=keepNativeTimelineDateAfterPhotoLanding(html);
 if(route==='/present')html=stopOldPresentationWhenTimelineMoves(html);
 if(route==='/present')html=installTimelineLoupe(html);
 if(route==='/present')html=installBoundedTimelineSelection(html);
 if(route==='/present')html=orderSameDateOwnerPostsAtReadBoundary(html);
 if(route==='/present')html=installReadOnlyLibraryGateway(html);
 if(route==='/present')html=pausePresentationDuringWhatsApp(html);
 // Use the ORIGINAL, already approved V61 video preview from the
 // 7-Nov-2026 product-owner-selected version, byte-for-byte. Do not
 // apply later speculative iPhone video-poster modifications.
 if(route==='/mijn-leven')html=showOwnedStoriesOnly(html);
 if(route==='/mijn-leven')html=removeAllBuiltInHomeExamples(html);
 if(route==='/mijn-leven')html=randomPhotoFromSelectedHomeYear(html);
 if(route==='/mijn-leven')html=installOwnerRequestedClearAllStories(html);
 if(route==='/tell')html=removeLegacyTellSampleImporter(simplifyTellMemoryEditor(polishTellEditorLayout(html)));
 if(route==='/present')html=enableOriginalWhatsAppTouchScroll(html);
 html=stripBundledExamplePhotoLinks(html);
 // The ONLY new persistent-data change is the original photo File's
 // byte-owned input in the existing account-local file store.
 html=stabilizeOriginalPhotoStorage(html);
 // All authenticated pages use the existing complete-delete algorithm.
 // The signed-out shell is unchanged; /tell uses the same core via its editor adapter.
 if(route!=='/tell')html=completePublishedRemovalOnOtherPage(html,
   readFileSync(path.join(delivery,'generated','reference-tell.html'),'utf8'));
 else html=installOriginalPayloadReader(html);
 html=installCapturePlaceCatalog(html,route);
 html=installMemoryLocationStore(html);
 if(route==='/tell')html=installMemoryLocationEditor(html);
 if(route==='/present')html=installCapturePlacePresentation(html);

 assert.ok(html.length>50000,'Unexpectedly small anonymous reference '+route);
 assert.ok(!/\b(?:talera_sid|set-cookie)\s*=\s*[a-f0-9]{64}/i.test(html),'Refuse session-bearing HTML');
 html=installDesktopMemoryTransition(installDesktopPresentationLayout(installDesktopHomeLayout(html,route),route),route);
 if(route==='/mijn-leven')html=installCharacteristicSearchHome(html);
 if(route==='/present')html=installCharacteristicSearchPresentation(html);
 html=localizeCore(html,route);
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
const approvedPlayerA=localizeEmbeddedPlayer(await fetchApprovedPlayer('present'),'present');
const approvedPlayerB=localizeEmbeddedPlayer(await fetchApprovedPlayer('record'),'record');
// Two separately packaged source copies: changes in recording cannot mutate
// the approved original presentation player, even when both started with
// identical code. Neither copy imports or references the other.
const originalPresentationFile=sha(approvedPlayerA)+'.html';
const independentRecordSource=approvedPlayerB+
  '\n<!-- TALERA_RECORD_ENGINE_ONLY independent source copy -->\n';
const independentRecordFile=sha(independentRecordSource)+'.html';
assert.notEqual(originalPresentationFile,independentRecordFile,
  'Recording and presentation must not use the same bundled asset');
writeFileSync(path.join(publicDir,'__talera_free','f5references',originalPresentationFile),
  approvedPlayerA,'utf8');
writeFileSync(path.join(publicDir,'__talera_free','f5references',independentRecordFile),
  independentRecordSource,'utf8');
refs['/vertelmodus-embed']='/__talera_free/f5references/'+originalPresentationFile;
refs['/vertelmodus-embed-record']='/__talera_free/f5references/'+independentRecordFile;
const scripts={};
const paths=[
 '/__clean/menu-integration.mjs',
 '/__clean/ui-integration.mjs',
 // The ORIGINAL presentation module imports this dependency. Without it,
 // the heart/comment/share toolbar never mounts on /present (including voice).
 '/__clean/social-controller.mjs',
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
 if(name==='/__clean/menu-integration.mjs'){
   writeFileSync(path.join(generated,'approved-menu-original.mjs'),first.body);
   shipped=localizeApprovedMenu(keepOnlyFunctionalFreeMenu(removeInactiveDisplayMenu(removeInactiveAccessibilityMenu(connectExistingStorageBackup(secureAccountMenuTransitions(first.body))))));
 }
 if(name==='/__clean/ui-integration.mjs'){
   // The original author-owned WhatsApp action treats a missing previous
   // server link (normal for a LOCAL Free story) as a fatal error. Only in
   // its original PUBLISH adapter, a 404 means "create the consented link".
   // Keep social hearts, comments, auth and all visual code unchanged.
   const old='  const existing=await findStoryId(memoryId);\n  if(existing)return {storyId:existing};';
   const replacement='  let existing=null;\n  try{existing=await findStoryId(memoryId)}catch(e){if(e.status!==404)throw e}\n  if(existing)return {storyId:existing};';
   assert.equal(shipped.split(old).length,2,'WHATSAPP_ORIGINAL_AUTHOR_ADAPTER_DRIFT');
   shipped=shipped.replace(old,replacement);
   // Photo-only memories are valid originals too. The original editor used
   // to require story text even when the selected memory had a real photo.
   // Preserve fail-closed behavior for an empty memory: a share with neither
   // text nor photo is still denied, and any failed photo upload is revoked.
   const onlyText='if(!title||!storyText)throw Error(';
   const withPhoto="if(!title||(!storyText&&!/^(https?:\\/\\/|blob:|data:image\\/)/i.test(String(item?.image||''))))throw Error(";
   assert.equal(shipped.split(onlyText).length,2,'WHATSAPP_PHOTO_ONLY_CONSENT_SOURCE_DRIFT');
   shipped=shipped.replace(onlyText,withPhoto);
   // A full iPhone original can exceed the bounded DO media limit. The
   // consented preview JPEG is always uploaded and shown by the recipient;
   // do not revoke a valid photo invitation merely because the optional
   // full-resolution *copy* is larger than the temporary share allowance.
   // The actual original photo remains unchanged in the local library.
   const oldFull="if(full)await coreRequest('/api/shares/'+encodeURIComponent(d.id)+'/photo-full'";
   const safeFull="if(full&&full.size<=1800000)await coreRequest('/api/shares/'+encodeURIComponent(d.id)+'/photo-full'";
   assert.equal(shipped.split(oldFull).length,2,'WHATSAPP_OPTIONAL_FULL_PHOTO_SOURCE_DRIFT');
   shipped=shipped.replace(oldFull,safeFull);
   // Free originals live in the one account-local library, not in timeline
   // display URLs (which can be a placeholder, cached poster or expired blob:).
   // Read only the chosen original photo by its permanent media ID. No writes.
   const originalPhotoReader=String.raw`
async function taleraFreeOriginalSharePhoto(memory){
 if(!memory?._taleraLocal)return null;
 const id=String(memory.storyId||'');
 const library=window.TaleraLibrary||window.TaleraMemories;
 if(!id.startsWith('local-')||typeof library?.get!=='function'||
    typeof library?.blob!=='function')
  throw Error('De originele herinnering is niet beschikbaar om te delen.');
 const record=await library.get(id);
 if(!record||record.id!==id||!Array.isArray(record.items))
  throw Error('De gekozen herinnering kon niet uit je bibliotheek worden gelezen.');
 const photos=record.items.filter(f=>f?.kind==='photo'&&typeof f.key==='string');
 if(!photos.length)return null;
 const frame=Array.isArray(memory._zeroFrames)?
  memory._zeroFrames[Math.max(0,Number(memory._photoIndex)||0)]:null;
 const chosen=photos.find(f=>f.key===frame?.key)||photos[0];
 const blob=await library.blob(chosen.key);
 if(!(blob instanceof Blob)||!blob.size||!String(blob.type).startsWith('image/'))
  throw Error('De originele foto ontbreekt in je bibliotheek. Er is niets gedeeld.');
 return blob;
}
`;
   const originalPreviewStart='async function previewPhotoBlob(memory){';
   const previewEnd=' const src=URL.createObjectURL(original);';
   const startPreview=shipped.indexOf(originalPreviewStart);
   const endPreview=shipped.indexOf(previewEnd,startPreview);
   assert.ok(startPreview>=0&&endPreview>startPreview,'WHATSAPP_PREVIEW_SOURCE_DRIFT');
   assert.equal(shipped.split(originalPreviewStart).length,2,'WHATSAPP_PREVIEW_DUPLICATE');
   const previewStart=String.raw`async function previewPhotoBlob(memory){
 const libraryPhoto=await taleraFreeOriginalSharePhoto(memory);
 const source=String(memory?.image||memory?.previewImage||'').trim();
 if(!libraryPhoto&&!source)return null;
 if(!libraryPhoto&&!/^(https?:\/\/|blob:|data:image\/)/i.test(source))
  throw Error('Deze foto kan niet veilig voor WhatsApp worden voorbereid.');
 let original=libraryPhoto;
 if(!original){
  let res;
  try{res=await fetch(source,{mode:'cors',credentials:'same-origin',cache:'no-store'})}
  catch{throw Error('De foto kan niet worden geladen. Er is nog niets gedeeld.')}
  if(!res.ok)throw Error('De foto is niet beschikbaar. Er is nog niets gedeeld.');
  original=await res.blob();
 }
 if(!original.type.startsWith('image/'))
  throw Error('Deze herinnering bevat geen bruikbare foto.');
`;
   shipped=shipped.slice(0,startPreview)+originalPhotoReader+'\n'+previewStart+
     shipped.slice(endPreview);
   const originalFullStart='async function presentationPhotoBlob(memory){';
   const fullEnd=' const url=URL.createObjectURL(blob),img=new Image();';
   const startFull=shipped.indexOf(originalFullStart);
   const endFull=shipped.indexOf(fullEnd,startFull);
   assert.ok(startFull>=0&&endFull>startFull,'WHATSAPP_FULL_PHOTO_SOURCE_DRIFT');
   assert.equal(shipped.split(originalFullStart).length,2,'WHATSAPP_FULL_PHOTO_DUPLICATE');
   const fullStart=String.raw`async function presentationPhotoBlob(memory){
 const libraryPhoto=await taleraFreeOriginalSharePhoto(memory);
 const source=String(memory?.image||memory?.previewImage||'').trim();
 if(!libraryPhoto&&!source)return null;
 if(!libraryPhoto&&!/^(https?:\/\/|blob:|data:image\/)/i.test(source))
  throw Error('De foto kan niet veilig worden geladen.');
 let blob=libraryPhoto;
 if(!blob){
  let response;
  try{response=await fetch(source,{mode:'cors',credentials:'same-origin',cache:'no-store'})}
  catch{throw Error('De originele foto kan niet worden geladen.')}
  if(!response.ok)throw Error('De originele foto is niet beschikbaar.');
  blob=await response.blob();
 }
 if(!blob.type.startsWith('image/'))
  throw Error('Geen bruikbare foto voor de presentatie.');
`;
   shipped=shipped.slice(0,startFull)+fullStart+shipped.slice(endFull);
   const fullCall='  const full=await presentationPhotoBlob(current);';
   assert.equal(shipped.split(fullCall).length,2,'WHATSAPP_OPTIONAL_FULL_PHOTO_CALL_DRIFT');
   shipped=shipped.replace(fullCall,
     '  const full=await presentationPhotoBlob(current).catch(()=>null);');
   // The actual photo-only proof comes from the stored media reference, not
   // from a placeholder image URL that happens to start with data:image/.
   const photoConsent="if(!title||(!storyText&&!/^(https?:\\/\\/|blob:|data:image\\/)/i.test(String(item?.image||''))))throw Error(";
   const photoConsentSafe="if(!title||(!storyText&&!item?._zeroItems?.some(x=>x.kind==='photo')))throw Error(";
   assert.equal(shipped.split(photoConsent).length,2,'WHATSAPP_PHOTO_CONSENT_SOURCE_DRIFT');
   shipped=shipped.replace(photoConsent,photoConsentSafe);
   // The owner's title is optional. Never invent "Herinnering" when
   // the saved memory has no title: retain the exact empty original field.
   const titleBefore="const title=String(item?.title||item?.story||item?.name||'').trim();";
   const titleAfter=titleBefore;
   assert.equal(shipped.split(titleBefore).length,2,'WHATSAPP_OPTIONAL_TITLE_DRIFT');
   shipped=shipped.replace(titleBefore,titleAfter);
   // Empty records remain blocked; text OR existing locally recorded photo,
   // audio, or video is sufficient for a consented temporary invitation.
   const contentBefore="if(!title||(!storyText&&!item?._zeroItems?.some(x=>x.kind==='photo')))throw Error(";
   const contentAfter="if(!storyText&&!item?._zeroItems?.some(x=>['photo','audio','video'].includes(x.kind)))throw Error(";
   assert.equal(shipped.split(contentBefore).length,2,'WHATSAPP_MEDIA_ONLY_DRIFT');
   shipped=shipped.replace(contentBefore,contentAfter);
   const oldOpen="function open(next){if(motion)return;mode=next;focus=document.activeElement;overlay.hidden=false;bar.hidden=true;render();panel.focus();if(next==='share')void verifyShareAuth()}";
   const newOpen="function open(next){if(motion)return;mode=next;focus=document.activeElement;if(next==='share')window.__taleraFreePauseForShare?.(true);overlay.hidden=false;bar.hidden=true;render();panel.focus();if(next==='share')void verifyShareAuth()}";
   const oldClose="function close(){mode=null;overlay.hidden=true;bar.hidden=false;share.close();checkMotion();focus?.focus?.()}";
   const newClose="function close(){const wasShare=mode==='share';mode=null;overlay.hidden=true;bar.hidden=false;share.close();if(wasShare)window.__taleraFreePauseForShare?.(false);checkMotion();focus?.focus?.()}";
   for(const [before,after,where] of [[oldOpen,newOpen,'OPEN'],[oldClose,newClose,'CLOSE']]){
     assert.equal(shipped.split(before).length,2,'WHATSAPP_SHEET_'+where+'_DRIFT');
     shipped=shipped.replace(before,after);
   }
   // Keep the ORIGINAL WhatsApp sheet and its owner/state machine. Only
   // offer two message choices; the personal draft starts completely empty.
   const stylesheet=String.raw`
#talera-clean-panel .talera-share-choices{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:16px 0 12px}
#talera-clean-panel .talera-share-choice{border:1px solid #b8c7d0;background:white;color:#17344a;min-height:55px;font-weight:700}
#talera-clean-panel .talera-share-choice[aria-pressed="true"]{border:2px solid #315f87;background:#e8f1f6}
#talera-clean-panel #talera-clean-personal{min-height:86px;resize:vertical}
#talera-clean-panel .talera-share-progress{display:flex;align-items:center;gap:12px;margin:14px 0;color:#315f87;font-size:14px;font-weight:650}
#talera-clean-panel .talera-share-spinner{display:inline-block;width:20px;height:20px;border:3px solid #cdddea;border-top-color:#315f87;border-radius:50%;animation:talera-share-spin .8s linear infinite;flex:none}
#talera-clean-panel .talera-share-progress progress{width:100%;height:7px;display:block;margin-top:6px}
@keyframes talera-share-spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){#talera-clean-panel .talera-share-spinner{animation:none;border-top-color:#315f87}}
`;
   const stylePoint="const icons = {";
   assert.equal(shipped.split(stylePoint).length,2,'WHATSAPP_MESSAGE_CSS_SOURCE_DRIFT');
   shipped=shipped.replace(stylePoint,
     'const taleraShareAdditionalCss='+JSON.stringify(stylesheet)+';\n'+stylePoint);
   const applyCss='style.textContent=css;document.head.append(style);';
   assert.equal(shipped.split(applyCss).length,2,'WHATSAPP_MESSAGE_CSS_MOUNT_DRIFT');
   shipped=shipped.replace(applyCss,'style.textContent=css+taleraShareAdditionalCss;document.head.append(style);');
   const vars="let mode=null,memory=runtime.currentMemory(),focus=null,consent=false,shareAuth=null,authBusy=false;";
   const addedVars=String.raw`
const taleraStandardText='Hoi! Ik deel graag een persoonlijke herinnering met je via TALERA.';
let messageChoice='standard',personalMessage='',uploadPhase='Uitnodiging voorbereiden…',uploadPercent=null;

let taleraWhatsAppHandoffPending=false;
const taleraWhatsAppReturnKey='talera-wa-handoff-return';
function taleraRememberWhatsAppHandoff(){
 taleraWhatsAppHandoffPending=true;
 try{sessionStorage.setItem(taleraWhatsAppReturnKey,'1')}catch{}
}
function taleraWhatsAppReturnNotice(){
 let remembered=false;
 try{remembered=sessionStorage.getItem(taleraWhatsAppReturnKey)==='1'}catch{}
 if(document.hidden||(!taleraWhatsAppHandoffPending&&!remembered))return;
 taleraWhatsAppHandoffPending=false;
 try{sessionStorage.removeItem(taleraWhatsAppReturnKey)}catch{}
 if(mode==='share'&&!overlay.hidden)close();
 document.getElementById('talera-wa-handoff-status')?.remove();
 const note=document.createElement('p');
 note.id='talera-wa-handoff-status';
 note.setAttribute('role','status');
 note.setAttribute('aria-live','polite');
 note.textContent='Je bent terug in TALERA. Controleer in WhatsApp of je uitnodiging is verzonden.';
 note.style.cssText='position:fixed;left:16px;right:16px;bottom:calc(90px + env(safe-area-inset-bottom));max-width:480px;margin:0 auto;background:#17344a;color:#fff;padding:14px 18px;border-radius:14px;text-align:center;font:600 15px/1.5 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 24px #06192f55;z-index:2147480220;pointer-events:none';
 document.body.appendChild(note);
 window.setTimeout(()=>note.remove(),8500);
}
window.addEventListener('pageshow',taleraWhatsAppReturnNotice);
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden)taleraWhatsAppReturnNotice();
});

function taleraChoiceHtml(){
 const choice=(name,label)=>'<button type="button" class="talera-share-choice" data-action="message-'+name+'" aria-pressed="'+(messageChoice===name)+'">'+label+'</button>';
 return '<div class="talera-share-choices" role="group" aria-label="Bericht bij de uitnodiging">'+
  choice('standard','TALERA-bericht')+choice('personal','Eigen bericht')+'</div>'+
  (messageChoice==='personal'?'<label for="talera-clean-personal">Jouw persoonlijke bericht</label><textarea id="talera-clean-personal" rows="3" maxlength="1200" aria-label="Jouw persoonlijke bericht">'+escapeText(personalMessage)+'</textarea>':'');
}
function taleraShareProgress(phase,data){
 if(mode!=='share'||overlay.hidden)return;
 uploadPhase=String(phase||'Uitnodiging voorbereiden…');
 uploadPercent=data&&Number.isFinite(data.loaded)&&Number.isFinite(data.total)&&data.total>0?
  Math.min(100,Math.round(100*data.loaded/data.total)):null;
 const label=panel.querySelector('#talera-free-progress-label');
 if(label)label.textContent=uploadPhase+(uploadPercent===null?'':': '+uploadPercent+'%');
 const meter=panel.querySelector('#talera-free-progress-meter');
 if(meter){meter.hidden=uploadPercent===null;if(uploadPercent!==null)meter.value=uploadPercent}
}
window.__taleraShareProgress=taleraShareProgress;
`;
   assert.equal(shipped.split(vars).length,2,'WHATSAPP_MESSAGE_DRAFT_SCOPE_DRIFT');
   shipped=shipped.replace(vars,vars+'\n'+addedVars);

   // A single concatenation is the original duration label. Insert the
   // message selector AFTER the current selected photo, BEFORE expiry.
   const choicePoint = `+'<label for="talera-clean-expiry">`;
   assert.equal(shipped.split(choicePoint).length,2,'WHATSAPP_MESSAGE_CHOICE_LOCATION_DRIFT');
   shipped=shipped.replace(choicePoint,'+taleraChoiceHtml()'+choicePoint);
   const buttonPoint = `'<button type="button" class="primary" data-action="send" `;
   assert.equal(shipped.split(buttonPoint).length,2,'WHATSAPP_MESSAGE_SEND_SOURCE_DRIFT');
   // A visible, immediate spinner during all async stages, real percentages
   // ONLY during actual XHR upload bytes. No fictitious overall progress.
   shipped=shipped.replace(buttonPoint,
    "(v.state==='preparing'?'<div class=\"talera-share-progress\" role=\"status\" aria-live=\"polite\"><span class=\"talera-share-spinner\" aria-hidden=\"true\"></span><div><span id=\"talera-free-progress-label\">'+escapeText(uploadPhase)+(uploadPercent===null?'':': '+uploadPercent+'%')+'</span><progress id=\"talera-free-progress-meter\" max=\"100\" value=\"'+(uploadPercent===null?0:uploadPercent)+'\" '+(uploadPercent===null?'hidden':'')+'></progress></div></div>':'')+"+buttonPoint);
   const openShare="if(a==='share'){consent=false;share.open(String(social.activeMemoryId));open('share')}";
   assert.equal(shipped.split(openShare).length,2,'WHATSAPP_DRAFT_NEW_INVITE_DRIFT');
   shipped=shipped.replace(openShare,
    "if(a==='share'){consent=false;messageChoice='standard';personalMessage='';uploadPhase='Uitnodiging voorbereiden…';uploadPercent=null;share.open(String(social.activeMemoryId));open('share')}");
   const clickPart="if(a==='prepare'){if(shareAuth!==true){void verifyShareAuth();return}";
   assert.equal(shipped.split(clickPart).length,2,'WHATSAPP_PERSONAL_PREPARE_DRIFT');
   shipped=shipped.replace(clickPart,
    "if(a==='message-standard'||a==='message-personal'){if(share.current().state==='preparing')return;messageChoice=a==='message-personal'?'personal':'standard';render();return}"+
    "if(a==='prepare'){if(share.current().state==='preparing')return;"+
    "if(messageChoice==='personal'&&!personalMessage.trim()){const el=panel.querySelector('.status');if(el)el.textContent='Schrijf eerst je persoonlijke bericht.';panel.querySelector('#talera-clean-personal')?.focus();return}"+
    "uploadPhase='Uitnodiging voorbereiden…';uploadPercent=null;if(shareAuth!==true){void verifyShareAuth();return}");
   const clickSend="if(a==='send'){try{location.assign(share.whatsappUrl())}catch(error){panel.querySelector('.status').textContent=error.message}}";
   const newClickSend=String.raw`if(a==='send'){
  try{
   const view=share.current();
   if(view.state!=='ready'||!view.invite?.url)
    throw Error('Uitnodiging nog niet gereed');
   const target=new URL(view.invite.url);
   const localOnly=location.protocol==='http:'&&
    (location.hostname==='127.0.0.1'||location.hostname==='localhost')&&
    target.origin===location.origin;
   if((target.protocol!=='https:'&&!localOnly)||
      target.origin!==location.origin||
      !/^\/s\/[A-Za-z0-9_-]{43}$/.test(target.pathname)||
      target.search||target.hash)
    throw Error('Onveilige uitnodigingslink');
   const message=messageChoice==='personal'?personalMessage.trim():taleraStandardText;
   if(!message)throw Error('Schrijf eerst je persoonlijke bericht.');
   const url=target.href;
   const caption=message+'\n'+url;
   const fallback=()=>{taleraRememberWhatsAppHandoff();location.assign('https://wa.me/?text='+encodeURIComponent(caption))};
   const photo=taleraNativeSharePhoto;
   // A native JPEG photo + caption needs the iOS OS share sheet. No file
   // upload or image conversion here: share() MUST start in this tap.
   let capable=false;
   if(photo&&typeof navigator.share==='function'&&typeof navigator.canShare==='function'){
    try{capable=navigator.canShare({files:[photo]})===true}catch(error){}
   }
   if(!capable){fallback();return}
   const status=panel.querySelector('.status');
   if(status)status.textContent='Kies WhatsApp. Controleer de foto, jouw tekst en de link voordat je verzendt.';
   try{
    const task=navigator.share({files:[photo],text:caption});
    Promise.resolve(task).then(()=>{taleraRememberWhatsAppHandoff();taleraWhatsAppReturnNotice()}).catch(error=>{
      // Canceling the iOS share sheet must NEVER send anything by itself.
      if(error?.name==='AbortError')return;
      if(status)status.textContent='Foto delen lukt hier niet. Je kunt de gewone WhatsApp-uitnodiging gebruiken.';
      fallback();
    });
   }catch(error){
    if(error?.name==='AbortError')return;
    fallback();
   }
  }catch(error){panel.querySelector('.status').textContent=error.message}
 }`;

   assert.equal(shipped.split(clickSend).length,2,'WHATSAPP_PERSONAL_SEND_DRIFT');
   shipped=shipped.replace(clickSend,newClickSend);
   const changePoint="overlay.addEventListener('change',e=>{";
   const onInput="overlay.addEventListener('input',e=>{if(e.target.id==='talera-clean-personal'){personalMessage=e.target.value;const can=!!personalMessage.trim(),v=share.current(),prep=panel.querySelector('[data-action=prepare]'),send=panel.querySelector('[data-action=send]');if(prep)prep.disabled=shareAuth!==true||v.state==='preparing'||!can;if(send)send.disabled=shareAuth!==true||v.state!=='ready'||!can}});\n ";
   assert.equal(shipped.split(changePoint).length,2,'WHATSAPP_PERSONAL_INPUT_LOCATION_DRIFT');
   shipped=shipped.replace(changePoint,onInput+changePoint);
   // Don't upload twice from rapid tapping. User changes of duration/draft
   // remain possible without losing the written personal message.
   const preparing="(shareAuth===true?'':'disabled')+'>Uitnodiging voorbereiden</button>'";
   assert.equal(shipped.split(preparing).length,2,'WHATSAPP_PREPARE_BUSY_LOCK_DRIFT');
   shipped=shipped.replace(preparing,
    "(shareAuth===true&&v.state!=='preparing'&&(messageChoice!=='personal'||personalMessage.trim())?'':'disabled')+'>'+(v.state==='preparing'?'Even geduld…':'Uitnodiging voorbereiden')+'</button>'");
   const sendGuard="(shareAuth===true&&v.state==='ready'?'':'disabled')+'>Verzenden via WhatsApp</button>'";
   assert.equal(shipped.split(sendGuard).length,2,'WHATSAPP_PERSONAL_SEND_LOCK_DRIFT');
   shipped=shipped.replace(sendGuard,
    "(shareAuth===true&&v.state==='ready'&&(messageChoice!=='personal'||personalMessage.trim())?'':'disabled')+'>Verzenden via WhatsApp</button>'");
   // The existing account verification can re-render at any time; the
   // message draft is held in memory and never written to local storage.
   // ShareController continues to handle expiration, ready and cancellation.
   const uploader=String.raw`
function taleraUploadMediaProgress(path,blob,label){
 return new Promise((resolve,reject)=>{
  const request=new XMLHttpRequest();
  request.open('POST',path,true);
  request.withCredentials=true;
  request.setRequestHeader('accept','application/json');
  request.setRequestHeader('content-type',blob.type.split(';')[0]);
  window.__taleraShareProgress?.(label,null);
  request.upload.onprogress=e=>{
   window.__taleraShareProgress?.(label,e.lengthComputable?{loaded:e.loaded,total:e.total}:null);
  };
  request.onload=()=>{
   let data;try{data=JSON.parse(request.responseText)}catch{data=null}
   if(request.status<200||request.status>=300){
    const error=Error(data?.error||'Upload niet gelukt. Probeer opnieuw.');
    error.status=request.status;reject(error);return;
   }
   resolve(data);
  };
  request.onerror=()=>reject(Error('Netwerkverbinding tijdens upload onderbroken.'));
  request.onabort=()=>reject(Error('Upload afgebroken.'));
  request.send(blob);
 });
}
`;
   // Web Share MUST be invoked from the user's actual tap; its image File
   // is prepared in advance during the existing consented upload. Both
   // payloads stay in memory; no personal media or message saved elsewhere.
   const nativeSlot="const shareAdapter={";
   assert.equal(shipped.split(nativeSlot).length,2,'WHATSAPP_NATIVE_SLOT_DRIFT');
   shipped=shipped.replace(nativeSlot,
     "let taleraNativeSharePhoto=null;\n"+nativeSlot);
   const previewSource="  const preview=await previewPhotoBlob(current);";
   assert.equal(shipped.split(previewSource).length,2,'WHATSAPP_NATIVE_PREVIEW_DRIFT');
   shipped=shipped.replace(previewSource,
     "  taleraNativeSharePhoto=null;\n"+
     previewSource+"\n"+
     "  if(preview?.size&&preview.type==='image/jpeg'&&typeof File==='function')"+
     "taleraNativeSharePhoto=new File([preview],'talera-herinnering.jpg',{type:'image/jpeg'});");
   const currentOpen="if(a==='share'){consent=false;messageChoice='standard';personalMessage='';uploadPhase='Uitnodiging voorbereiden…';uploadPercent=null;share.open(String(social.activeMemoryId));open('share')}";
   assert.equal(shipped.split(currentOpen).length,2,'WHATSAPP_NATIVE_OPEN_RESET_DRIFT');
   shipped=shipped.replace(currentOpen,
     currentOpen.replace('consent=false;','consent=false;taleraNativeSharePhoto=null;'));
   const currentClose="if(wasShare)window.__taleraFreePauseForShare?.(false);";
   assert.equal(shipped.split(currentClose).length,2,'WHATSAPP_NATIVE_CLOSE_RESET_DRIFT');
   shipped=shipped.replace(currentClose,
     "if(wasShare){taleraNativeSharePhoto=null;window.__taleraFreePauseForShare?.(false)}");

   const fullShareCopy="\nasync function taleraCompleteOriginalMemoryCopy(memory,shareId){\n if(!memory?._taleraLocal||typeof memory.storyId!=='string')\n  throw Error('De gekozen herinnering moet uit jouw lokale TALERA-bibliotheek komen.');\n const library=window.TaleraLibrary||window.TaleraMemories;\n if(typeof library?.get!=='function'||typeof library?.blob!=='function')\n  throw Error('De originele TALERA-bibliotheek is niet beschikbaar.');\n const row=await library.get(memory.storyId);\n if(!row||row.id!==memory.storyId||!Array.isArray(row.items))\n  throw Error('De oorspronkelijke herinnering kon niet worden gecontroleerd.');\n if(row.items.length>24)throw Error('Deze herinnering heeft te veel mediabestanden voor een veilige uitnodiging.');\n const allowed=/^(image\\/(?:jpeg|png|webp|gif|heic|heif)|video\\/(?:mp4|webm|quicktime)|audio\\/(?:mpeg|mp4|webm|ogg|wav|x-m4a|aac|aiff|x-aiff))$/;\n const manifest={version:1,items:[],posters:[],narrationCues:[],narrationDurationMs:\n  Number.isSafeInteger(row.narrationDurationMs)&&row.narrationDurationMs>=0?\n   row.narrationDurationMs:0,\n  datePrecision:String(row.datePrecision||'unknown').slice(0,20),\n  time:String(row.time||'12:00:00').slice(0,20)};\n let total=0,partCount=0;\n const sources=[];\n for(const item of row.items){\n  if(!item||!['photo','video','audio'].includes(item.kind)||\n     typeof item.key!=='string')throw Error('Een oorspronkelijk mediabestand ontbreekt.');\n  const blob=await library.blob(item.key);\n  if(!(blob instanceof Blob)||!blob.size||!allowed.test(blob.type)||\n     !blob.type.startsWith(item.kind==='photo'?'image/':item.kind+'/'))\n   throw Error('Het originele bestand '+(sources.length+1)+' kan niet verliesvrij worden gedeeld.');\n  total+=blob.size;\n  const parts=Math.ceil(blob.size/1048576);\n  partCount+=parts;\n  if(total>96*1048576||parts>96||partCount>192)\n   throw Error('Deze herinnering bevat meer media dan veilig tijdelijk kunnen worden overgedragen. Er is niets verzonden.');\n  sources.push({item,blob,parts});\n  manifest.items.push({kind:item.kind,mime:blob.type,size:blob.size,parts,hashes:[]});\n }\n const visuals=row.items.filter(item=>item.kind==='photo'||item.kind==='video');\n const cues=Array.isArray(row.narrationCues)?row.narrationCues:[];\n if(cues.length>1000)throw Error('De oorspronkelijke vertelmarkeringen zijn te uitgebreid.');\n for(const original of cues){\n  if(!original||!Number.isSafeInteger(original.t)||!Number.isSafeInteger(original.index))\n   throw Error('De vertelmarkeringen zijn onvolledig.');\n  const cue={...original};\n  if(cue.mediaId){\n   const index=row.items.findIndex(item=>item.key===cue.mediaId);\n   if(index<0||!['photo','video'].includes(row.items[index].kind))\n    throw Error('Een vertelmarkering verwijst naar ontbrekende media.');\n   cue.mediaIndex=index;\n   delete cue.mediaId;\n  }\n  manifest.narrationCues.push(cue);\n }\n for(let index=0;index<sources.length;index++){\n  const source=sources[index];\n  for(let part=0;part<source.parts;part++){\n   const blob=source.blob.slice(part*1048576,Math.min((part+1)*1048576,source.blob.size),source.blob.type);\n   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),\n     n=>n.toString(16).padStart(2,'0')).join('');\n   manifest.items[index].hashes.push(hash);\n   await taleraUploadMediaProgress('/api/shares/'+encodeURIComponent(shareId)+\n      '/media/'+index+'/'+part,blob,\n      'Origineel '+(index+1)+'/'+sources.length+' · deel '+(part+1)+'/'+source.parts);\n  }\n }\n // Transfer only EXISTING account-local :phone-v1 thumbnails. Original video\n // blobs, album order, IDs, narration cues and local poster bytes are unchanged.\n let posterBytes=0;\n for(let index=0;index<sources.length;index++){\n  const item=sources[index].item;\n  if(item.kind!=='video')continue;\n  const still=await library.blob(item.key+':phone-v1');\n  if(!(still instanceof Blob)||!still.size||still.size>1500000||\n     !['image/jpeg','image/png','image/webp'].includes(still.type))continue;\n  if(total+posterBytes+still.size>96*1048576)continue;\n  const digest=await crypto.subtle.digest('SHA-256',await still.arrayBuffer());\n  const hex=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');\n  try{\n   await taleraUploadMediaProgress('/api/shares/'+encodeURIComponent(shareId)+\n     '/poster/'+index,still,'Videominiatuur '+(index+1)+'/'+sources.length);\n  }catch(error){continue}\n  posterBytes+=still.size;\n  manifest.posters.push({mediaIndex:index,mime:still.type,size:still.size,sha256:hex});\n }\n // This commit is the publication boundary. No partial photo sequence or\n // dropped narration may be called ready and passed to WhatsApp.\n await coreRequest('/api/shares/'+encodeURIComponent(shareId)+'/manifest',{\n  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(manifest)});\n if(String(window.__taleraTimelineRuntime?.currentMemory?.()?.storyId)!==row.id)\n  throw Error('De gekozen herinnering is tijdens het delen veranderd.');\n return true;\n}\n";

   // Same account-local original bytes. Only the temporary guest copy's
   // content-type can be corrected after checking the actual file header.
   // Safari sometimes preserves iPhone .m4v/.mov clips as video/x-m4v or
   // an untyped Blob even though the original video and poster are intact.
   const originalMimeReader=String.raw`
async function taleraVerifiedGuestShareMime(item,original,position){
 const declared=String(original.type||item.mime||'').split(';')[0].trim().toLowerCase();
 const expected=item.kind==='photo'?'image/':item.kind+'/';
 const major=declared.split('/')[0];
 if(['image','video','audio'].includes(major)&&!declared.startsWith(expected))
  throw Error('Origineel bestand '+position+' heeft een ander mediatype dan de bibliotheek registreert. Er is niets gedeeld.');
 const allowed=/^(image\/(?:jpeg|png|webp|gif|heic|heif)|video\/(?:mp4|webm|quicktime)|audio\/(?:mpeg|mp4|webm|ogg|wav|x-m4a|aac|aiff|x-aiff))$/;
 if(allowed.test(declared)&&declared.startsWith(expected))return declared;
 const head=new Uint8Array(await original.slice(0,256).arrayBuffer());
 const word=(at,n)=>String.fromCharCode(...head.slice(at,at+n));
 const ftyp=head.length>=12&&word(4,4)==='ftyp';
 const brand=ftyp?word(8,4).toLowerCase():'';
 let mime=null;
 if(item.kind==='video'){
  if(ftyp)mime=brand==='qt  '?'video/quicktime':'video/mp4';
  else if(head[0]===26&&head[1]===69&&head[2]===223&&head[3]===163&&
     word(0,head.length).toLowerCase().includes('webm'))mime='video/webm';
 }else if(item.kind==='photo'){
  if(head[0]===255&&head[1]===216&&head[2]===255)mime='image/jpeg';
  else if(head[0]===137&&word(1,3)==='PNG')mime='image/png';
  else if(word(0,4)==='RIFF'&&word(8,4)==='WEBP')mime='image/webp';
  else if(word(0,4)==='GIF8')mime='image/gif';
  else if(ftyp&&['heic','heix','hevc','hevx'].includes(brand))mime='image/heic';
  else if(ftyp&&['mif1','msf1','heif'].includes(brand))mime='image/heif';
 }else if(item.kind==='audio'){
  if(ftyp)mime='audio/mp4';
  else if(word(0,4)==='RIFF'&&word(8,4)==='WAVE')mime='audio/wav';
  else if(word(0,4)==='OggS')mime='audio/ogg';
  else if(word(0,3)==='ID3'||head[0]===255&&(head[1]&224)===224)
   mime='audio/mpeg';
  else if(head[0]===255&&(head[1]&246)===240)mime='audio/aac';
 }
 if(!mime)throw Error('Bestand '+position+' heeft een niet-herkenbaar '+
  'origineel formaat ('+(declared||'zonder formaat')+'). De video blijft '+
  'veilig bewaard; er is niets gedeeld.');
 return mime;
}
`;
   const originalShareChecks=[
    [
     "  if(!(blob instanceof Blob)||!blob.size||!allowed.test(blob.type)||\n     !blob.type.startsWith(item.kind==='photo'?'image/':item.kind+'/'))\n   throw Error('Het originele bestand '+(sources.length+1)+' kan niet verliesvrij worden gedeeld.');",
     "  if(!(blob instanceof Blob)||!blob.size)\n   throw Error('Origineel bestand '+(sources.length+1)+' ontbreekt in de bibliotheek. Er is niets gedeeld.');\n  const mime=await taleraVerifiedGuestShareMime(item,blob,sources.length+1);"
    ],
    [
     "  sources.push({item,blob,parts});",
     "  sources.push({item,blob,parts,mime});"
    ],
    [
     "  manifest.items.push({kind:item.kind,mime:blob.type,size:blob.size,parts,hashes:[]});",
     "  manifest.items.push({kind:item.kind,mime,size:blob.size,parts,hashes:[]});"
    ],
    [
     "const blob=source.blob.slice(part*1048576,Math.min((part+1)*1048576,source.blob.size),source.blob.type);",
     "const blob=source.blob.slice(part*1048576,Math.min((part+1)*1048576,source.blob.size),source.mime);"
    ]
   ];
   let shareWithVerifiedMime=fullShareCopy;
   for(const [before,after] of originalShareChecks){
    assert.equal(shareWithVerifiedMime.split(before).length,2,
      'TALERA_GUEST_MIME_SOURCE_DRIFT_'+before.slice(0,35));
    shareWithVerifiedMime=shareWithVerifiedMime.replace(before,after);
   }
   const adapterPoint="const shareAdapter={";
   assert.equal(shipped.split(adapterPoint).length,2,'WHATSAPP_PROGRESS_ADAPTER_SOURCE_DRIFT');
   shipped=shipped.replace(adapterPoint,uploader+'\n'+adapterPoint);
   shipped=shipped.replace(adapterPoint,originalMimeReader+'\n'+shareWithVerifiedMime+'\n'+adapterPoint);
   for(const [medium,variable,label] of [
      ['photo','preview','Foto uploaden'],
      ['photo-full','full','Volledige foto uploaden'],
      ['audio','sound','Audio uploaden'],
      ['video','movie','Video uploaden']
   ]){
    const start="coreRequest('/api/shares/'+encodeURIComponent(d.id)+'/"+medium+"'";
    assert.equal(shipped.split(start).length,2,'WHATSAPP_REAL_UPLOAD_'+medium+'_START_DRIFT');
    const from=shipped.indexOf(start),end=shipped.indexOf('})',from);
    assert.ok(from>=0&&end>from&&end-from<280,'WHATSAPP_REAL_UPLOAD_'+medium+'_CLOSING_DRIFT');
    const before=shipped.slice(from,end+2);
    assert.ok(before.includes("method:'POST'")&&before.includes('body:'+variable)&&
      before.includes("'content-type'"),'WHATSAPP_REAL_UPLOAD_'+medium+'_BODY_DRIFT');
    const after="taleraUploadMediaProgress('/api/shares/'+encodeURIComponent(d.id)+'/"+medium+"',"+variable+","+JSON.stringify(label)+")";
    shipped=shipped.slice(0,from)+after+shipped.slice(end+2);
   }

   // Legacy standalone audio/video previews are optional. The new immutable
   // original-memory manifest below transfers ALL source bytes in safe chunks.
   // Never let a >1.8MB old preview endpoint reject an otherwise complete share.
   for(const [variable,kind] of [['sound','audio'],['movie','video']]){
    const before="if("+variable+")await taleraUploadMediaProgress('/api/shares/'+encodeURIComponent(d.id)+'/"+kind+"'";
    const after="if("+variable+"&&"+variable+".size<=1800000)await taleraUploadMediaProgress('/api/shares/'+encodeURIComponent(d.id)+'/"+kind+"'";
    assert.equal(shipped.split(before).length,2,'WHATSAPP_LEGACY_LARGE_'+kind+'_GUARD_DRIFT');
    shipped=shipped.replace(before,after);
   }

   const oldCompleteReturn="  return {url:d.link,shareId:d.id,durationHours,expiresAt:d.expiresAt,photo:!!preview,audio:!!sound,video:!!movie};";
   assert.equal(shipped.split(oldCompleteReturn).length,2,'WHATSAPP_ORIGINAL_COMPLETE_RETURN_SOURCE_DRIFT');
   const newCompleteReturn="  try{await taleraCompleteOriginalMemoryCopy(current,d.id)}catch(error){"+
      "await coreRequest('/api/shares/'+encodeURIComponent(d.id)+'/revoke',{method:'POST'}).catch(()=>{});"+
      "throw Error('De volledige herinnering kon niet veilig worden gedeeld. '+error.message)}\n"+
      oldCompleteReturn;
   shipped=shipped.replace(oldCompleteReturn,newCompleteReturn);

   // Avoid mistaken status after a completed invite; the spinner is owned
   // by the existing ShareController.state preparing.

 }
 const filename=sha(shipped)+'.'+ext;
 writeFileSync(path.join(publicDir,'__talera_free','f5scripts',filename),shipped,'utf8');
 scripts[name]='/__talera_free/f5scripts/'+filename;
}
assert.ok(scripts['/__clean/menu-integration.mjs'],
 'Approved account menu script must be present for login UI.');
assert.ok(scripts['/__clean/social-controller.mjs']&&
 scripts['/__clean/ui-integration.mjs']&&scripts['/__clean/share-controller.mjs'],
 'Existing TALERA heart, comments and sharing toolbar imports must all resolve');
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
 if(name==='/sw.js'){
  // Extend only the verified SAME original worker; never cache private HTML
  // unencrypted, or store original photos, audio, video or user stories here.
  // Changed app/worker code gets a different offline cache version.
  // Never reuse a stale encrypted page after a software update.
  const offlinePackageVersion=sha(Buffer.concat([
   Buffer.from(JSON.stringify({referencePages:refs,scripts})),
   readFileSync(path.join(here,'f5-worker.mjs')),
   readFileSync(path.join(here,'f5-edit-return.mjs')) ,
   readFileSync(path.join(here,'f5-editor-clean-layout.mjs')),
   readFileSync(path.join(here,'f5-offline-sw.mjs')),
   readFileSync(path.join(here,'f5-language-catalog.mjs')),
   readFileSync(path.join(here,'f5-language.mjs')),
   readFileSync(path.join(here,'f5-local-backup-page.mjs')),
   readFileSync(path.join(here,'f5-backup-controller.mjs')),
   readFileSync(path.join(here,'f5-transfer-controller.mjs')),
   readFileSync(path.join(here,'f5-transfer-scan.mjs'))
  ])).slice(0,32);
  a=Buffer.from(buildF5OfflineServiceWorker(a.toString('utf8'),offlinePackageVersion),'utf8');
 }
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
writeFileSync(path.join(generated,'f5-edit-return-browser.mjs'),'// Generated with the same TALERA build.\nexport const editReturnBrowserSources=Object.freeze('+JSON.stringify(buildEditReturnBrowserSources())+');\n');
writeFileSync(path.join(generated,'public-template-map.mjs'),
  '// Generated only from current approved anonymous public TALERA source.\n'+
  'export const referencePages = Object.freeze('+JSON.stringify(refs,null,2)+');\n'+
 'export const guestPages = Object.freeze('+JSON.stringify(guestPages,null,2)+');\n'+
  'export const verifiedPublicScripts = Object.freeze('+JSON.stringify(scripts,null,2)+');\n'+
  'export const verifiedPublicSupport = Object.freeze('+JSON.stringify(support,null,2)+');\n'+
 'export const languageAssets = Object.freeze('+JSON.stringify([...languageAssets])+');\n');
const report={result:'BUILT (not browser-certified)',source:origin,
  privateDataRequested:false,customerDatabaseTouched:false,
  referencePages:Object.keys(refs),verifiedScriptRoutes:Object.keys(scripts),
  verifiedPwaSupportRoutes:Object.keys(support),
  stagingOnly:true,fullFreePwaCertified:false};
writeFileSync(path.join(generated,'f5-build-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('TALERA_F5_PUBLIC_REFERENCE_BUILD',JSON.stringify(report));
