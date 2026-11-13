// Build F5 templates from the user-identified 2026-11-07 design-cleanup candidate. It retains the earlier 5-language + DOB changes; test before any deploy.
// No account, cookie, D1, R2 or live private data is fetched.
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {secureAccountMenuTransitions,connectExistingStorageBackup,removeInactiveAccessibilityMenu,removeInactiveDisplayMenu} from './f5-account-switch-guard.mjs';
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
 const warmPrefetch="  function prefetch(){\n"+
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
 const prime=" // Keep up to five first-frame object URLs, scoped to this page and account.\n // The full existing hydrate() is still responsible for every other frame.\n async function warmFirstPhoto(memory){\n   if(!memory?._taleraLocal||memory._taleraFirstWarm)return;\n   const first=memory._zeroItems?.find(item=>item.kind==='photo'||item.kind==='video');\n   if(!first)return;\n   let url=null;\n   try{\n     if(first.kind==='photo'){\n       url=await (store.displayUrl?store.displayUrl(first.key):store.mediaUrl(first.key));\n     }else{\n       const still=await store.blob(first.key+':phone-v1');\n       if(still instanceof Blob&&still.size&&String(still.type).startsWith('image/'))\n         url=URL.createObjectURL(still);\n       else{\n         url=await taleraClosedMakeCover(memory,{key:first.key,kind:'video',url:null},0,[],true);\n         if(!url)memory.image=videoPoster;\n       }\n     }\n   }catch(e){console.warn('TALERA eerste verhaalbeeld nog niet geladen',e)}\n   if(!url)return;\n   memory._taleraFirstWarm={key:first.key,url};\n   if(!Array.isArray(memory.photos)||!memory.photos.length)memory.image=url;\n"+
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
// The approved standalone social toolbar and PHOTO view pencil are already
// present. Only the two older controls inside the opened reading paper are
// duplicates. Hide them solely while reading without removing their source
// nodes or changing handlers, gestures, narration, media or storage.
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
  between("  let pendingAutoPhoto=null,photoAutoSerial=0;","  /* Photo autoplay belongs to a settled memory, never to the rolling wheel. */","  // Ordinary memory engine. Never reads voice timings or invokes narrator.\n  let ownSerial=0,ordinaryVideo=null,ordinaryVideoUrl=null,\n      ordinaryVideoToken=0,ordinaryVideoOwner='',ordinaryVideoKey='',ordinaryHint=null;\n  const ordinaryMemory=m=>!!(m&&!m._photoLoading&&\n    !m._zeroItems?.some(x=>x.kind==='audio'));\n  function closeOrdinaryVideo(){\n    ordinaryVideoToken++;\n    if(ordinaryHint){ordinaryHint.remove();ordinaryHint=null}\n    if(ordinaryVideo){\n      ordinaryVideo.onended=ordinaryVideo.onerror=ordinaryVideo.onloadedmetadata=null;\n      ordinaryVideo.pause();ordinaryVideo.removeAttribute('src');\n      ordinaryVideo.remove();ordinaryVideo=null;\n    }\n    if(ordinaryVideoUrl){URL.revokeObjectURL(ordinaryVideoUrl);ordinaryVideoUrl=null}\n    ordinaryVideoOwner='';ordinaryVideoKey='';\n  }\n  function playOrdinaryVideo(memory,index){\n    if(!ordinaryMemory(memory)||runtime.currentMemory()?.id!==memory.id)return;\n    const frame=memory._zeroFrames?.[index];\n    if(frame?.kind!=='video'||!frame.key)return;\n    if(ordinaryVideoOwner===memory.id&&ordinaryVideoKey===frame.key)return;\n    closeOrdinaryVideo();\n    const id=memory.id,key=frame.key,token=ordinaryVideoToken;\n    ordinaryVideoOwner=id;ordinaryVideoKey=key;\n    void (async()=>{\n      let url=null;\n      try{\n        const original=await window.TaleraMemories?.blob?.(key);\n        if(!(original instanceof Blob)||!original.size)throw Error('Video ontbreekt bij media-ID');\n        url=URL.createObjectURL(original);\n        if(token!==ordinaryVideoToken||!ordinaryMemory(memory)||\n           runtime.currentMemory()?.id!==id||\n           memory._zeroFrames?.[memory._photoIndex]?.key!==key){\n          URL.revokeObjectURL(url);return;\n        }\n        ordinaryVideoUrl=url;\n        const stage=document.getElementById('photoStage');\n        if(!stage)throw Error('Bestaand presentatiescherm ontbreekt');\n        const video=document.createElement('video');\n        video.className='talera-v61-inline-video';\n        video.playsInline=true;video.setAttribute('playsinline','');\n        video.setAttribute('webkit-playsinline','');\n        video.preload='auto';video.controls=false;\n        video.muted=!window.__taleraAudioControls?.isEnabled?.();\n        video.defaultMuted=video.muted;video.volume=1;\n        if(video.muted)video.setAttribute('muted','');\n        video.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:12;pointer-events:none';\n        (stage.parentElement||stage).appendChild(video);ordinaryVideo=video;\n        const valid=()=>token===ordinaryVideoToken&&ordinaryVideo===video&&\n          ordinaryMemory(memory)&&runtime.currentMemory()?.id===id&&\n          memory._zeroFrames?.[memory._photoIndex]?.key===key;\n        let handledError=false;\n        const fail=()=>{\n          if(handledError||!valid())return;\n          handledError=true;\n          console.warn('TALERA gewoon videoformaat niet afspeelbaar',key);\n          if(memory.photos.length>1)showPhoto(memory,(index+1)%memory.photos.length,false);\n          else closeOrdinaryVideo();\n        };\n        const start=()=>{\n          if(!valid()||!video.paused||video.ended)return;\n          Promise.resolve(video.play()).catch(error=>{\n            if(!valid())return;\n            if(error?.name==='NotSupportedError'){fail();return}\n            if(error?.name!=='NotAllowedError'){console.warn('TALERA video kan niet starten',error);return}\n            if(ordinaryHint)return;\n            const hint=document.createElement('button');\n            hint.className='talera-v61-audio-permission-hint';hint.type='button';\n            hint.textContent='▶ Beluister';\n            hint.style.cssText='position:absolute;left:50%;bottom:22%;transform:translateX(-50%);z-index:65;padding:9px 15px;border:0;border-radius:15px;background:rgba(250,250,247,.94);color:#173d52;font:650 13px system-ui;cursor:pointer';\n            hint.onclick=e=>{e.preventDefault();e.stopPropagation();video.play().then(()=>{hint.remove();if(ordinaryHint===hint)ordinaryHint=null}).catch(()=>{})};\n            (stage.parentElement||stage).appendChild(hint);ordinaryHint=hint;\n          });\n        };\n        video.onloadedmetadata=start;\n        video.onended=()=>{\n          if(!valid())return;\n          if(memory.photos.length>1)showPhoto(memory,(index+1)%memory.photos.length,false);\n        };\n        video.onerror=fail;\n        video.src=url;start();\n      }catch(error){\n        if(url&&url!==ordinaryVideoUrl)URL.revokeObjectURL(url);\n        if(token===ordinaryVideoToken){closeOrdinaryVideo();console.warn('TALERA gewone video niet beschikbaar',error)}\n      }\n    })();\n  }\n  function showPhoto(memory,index,manual=false){\n    if(!ordinaryMemory(memory)||runtime.currentMemory()?.id!==memory.id)return;\n    const own=Array.isArray(memory.photos)?memory.photos:[];\n    if(!own.length)return;\n    const next=((index%own.length)+own.length)%own.length,src=own[next];\n    const frame=memory._zeroFrames?.[next];\n    if(typeof src!=='string'||!src)return;\n    const id=memory.id,token=++ownSerial;\n    const commit=()=>{\n      if(token!==ownSerial||runtime.currentMemory()?.id!==id||\n         !ordinaryMemory(memory)||memory.photos[next]!==src)return;\n      if(frame?.kind!=='video')closeOrdinaryVideo();\n      memory._photoIndex=next;memory.image=src;\n      settleVisiblePhoto(memory);renderDots(memory);\n      if(frame?.kind==='video')playOrdinaryVideo(memory,next);\n      scheduleAuto(memory);\n    };\n    if(frame?.kind==='video'){commit();return}\n    const image=new Image();image.decoding='async';\n    image.onload=()=>{\n      if(typeof image.decode==='function')image.decode().then(commit,()=>{if(image.naturalWidth)commit()});\n      else if(image.naturalWidth)commit();\n    };\n    image.onerror=()=>{if(token===ownSerial)clearAuto()};\n    image.src=src;\n    if(image.complete&&image.naturalWidth)image.onload();\n  }\n  // Explicitly private ordinary entry. The narrator never calls this.\n  window.__taleraOrdinarySelectPhoto=(id,index,manual=false)=>{\n    const memory=currentMemory();\n    if(memory?.id===id&&ordinaryMemory(memory))showPhoto(memory,index,Boolean(manual));\n  };\n  window.__taleraOrdinaryActivate=(memory)=>{\n    if(!ordinaryMemory(memory)||runtime.currentMemory()?.id!==memory.id)return;\n    const index=memory._photoIndex||0;\n    if(memory._zeroFrames?.[index]?.kind==='video')playOrdinaryVideo(memory,index);\n  };\n  // Old voice-facing hook kept inert for voiced memories until phase 2.\n  // It never enters the new ordinary motor.\n  window.__taleraV31SelectPhoto=(id,index,manual=false)=>{\n    const memory=currentMemory();\n    if(memory?.id===id&&!memory._zeroItems?.some(x=>x.kind==='audio'))\n      window.__taleraOrdinarySelectPhoto?.(id,index,manual);\n  };\n  function scheduleAuto(memory){\n    clearAuto();\n    if(!ordinaryMemory(memory)||runtime.currentMemory()?.id!==memory.id||\n       runtime.isMoving()||window.__taleraBandRolling||\n       !Array.isArray(memory.photos)||memory.photos.length<=1||\n       memory._zeroFrames?.[memory._photoIndex||0]?.kind==='video')return;\n    const id=memory.id;\n    autoStartTimer=setTimeout(()=>{\n      if(!ordinaryMemory(memory)||runtime.currentMemory()?.id!==id||\n         runtime.isMoving()||window.__taleraBandRolling){clearAuto();return}\n      showPhoto(memory,(memory._photoIndex||0)+1,false);\n    },memory._taleraLocal?2500:AUTO_START_MS);\n  }\n  window.addEventListener('pagehide',closeOrdinaryVideo,{once:true});\n  document.addEventListener('visibilitychange',()=>{\n    if(document.hidden&&ordinaryVideo)ordinaryVideo.pause();\n  });\n",'ORDINARY_MOTOR');
  between("  runtime.subscribe(memory=>{","  surface.addEventListener('pointerdown'","  runtime.subscribe(memory=>{\n    const changed=!memory||memory.id!==lastWrittenMemoryId;\n    if(changed){ownSerial++;clearAuto();closeOrdinaryVideo();syncTaleraStoryFrame(null)}\n    lastWrittenMemoryId=memory&&memory.id;\n    // Never modify the narrator's cue frame, timer or audio.\n    if(memory?._taleraLocal&&memory._zeroItems?.some(x=>x.kind==='audio')){\n      renderDots(memory);return;\n    }\n    if(changed&&memory&&!memory._photoLoading&&Array.isArray(memory.photos)&&memory.photos.length){\n      memory._photoIndex=0;memory.image=memory.photos[0];\n      settleVisiblePhoto(memory);\n    }\n    syncTaleraStoryFrame(memory);renderDots(memory);\n    if(ordinaryMemory(memory)){\n      window.__taleraOrdinaryActivate(memory);\n      if(changed||!autoStartTimer)scheduleAuto(memory);\n    }else clearAuto();\n  });\n\n",'ONE_SUBSCRIBER');
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
  once("if(owner===memory.id&&shown===src&&!host.hidden){layout();return}\n      if(pendingOwner===memory.id&&pendingSrc===src)return;","if(owner===memory.id&&shown===src&&!host.hidden){layout();return}\n      if(owner!==memory.id&&host)host.hidden=true;\n      if(pendingOwner===memory.id&&pendingSrc===src)return;",'REMOVE_OLD_OVERLAY');
  once("const source=mem.previewImage||mem.thumbnail||mem.image;","const source=mem.thumbnail||mem.previewImage||mem.image;",'PREFETCH_COVER');
  once("window.__taleraV31SelectPhoto?.(memoryId,index,true);","window.__taleraOrdinarySelectPhoto?.(memoryId,index,true);",'ORDINARY_TAP_ENTRY_ONLY');
  once(" function activate(memory){\n   if(!memory||!memory._taleraLocal){disposePresentation();return}\n   if(memory._photoLoading){void hydrate(memory).then(()=>{if(runtime.currentMemory()?.id===memory.id)activate(memory)});return}\n   void present(memory);\n }"," function activate(memory){\n   if(!memory||!memory._taleraLocal){disposePresentation();return}\n   if(memory._photoLoading){void hydrate(memory).then(()=>{if(runtime.currentMemory()?.id===memory.id)activate(memory)});return}\n   // Routing only: the original recorded-voice functions remain untouched.\n   if(!memory._zeroItems?.some(item=>item.kind==='audio')){\n     if(activeId!==null)disposePresentation();\n     window.__taleraOrdinaryActivate?.(memory);\n     return;\n   }\n   void present(memory);\n }",'ONE_ENGINE_ROUTER');
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

const refs={};
for(const [route,filename] of Object.entries(routes)){
 let html=readFileSync(path.join(delivery,'generated','reference-'+filename+'.html'),'utf8');
 if(route==='/present')html=removeBuiltInPresentationExamples(html);
 if(route==='/present')html=fixPhotoOnlyPresentation(html);
 if(route==='/present')html=fixFirstSwipePhotoLoad(html);
 if(route==='/present')html=warmUpFirstSwipePhotoStrip(html);
 if(route==='/present')html=primeFirstOpenLocalStoryCovers(html);
 if(route==='/present')html=rebuildDirectOrdinaryPresentation(html);
 if(route==='/present')html=filterOwnTopicPresentation(html);
 if(route==='/present')html=hideDuplicateReadingSheetActions(html);
 if(route==='/present')html=isolateNarratedMemories(html);
 if(route==='/present')html=showExistingNarratedSwipeBand(html);
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
 // The original menu signs in/out IN PLACE, leaving the already loaded
 // account-scoped IndexedDB code bound to the PREVIOUS person. Reopen the
 // exact SAME URL only after a successful auth transition. The existing
 // Storage and back-up panel alone also links to the authenticated archive.
 if(name==='/__clean/menu-integration.mjs'){
   writeFileSync(path.join(generated,'approved-menu-original.mjs'),first.body);
   shipped=removeInactiveDisplayMenu(removeInactiveAccessibilityMenu(connectExistingStorageBackup(secureAccountMenuTransitions(first.body))));
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
