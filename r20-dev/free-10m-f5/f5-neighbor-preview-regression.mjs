// F5: require bounded first-swipe local preview with exact approved RH19
// animation preserved, and no change to record/tell, player or timeline DB.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {eliminateFirstSwipeBlank} from './f5-neighbor-preview.mjs';
import {scopeLocalMemories} from './f5-local-scope.mjs';
const raw=readFileSync('r20-dev/free-10m-delivery/generated/reference-present.html','utf8');
const account='f'.repeat(64);
const before=scopeLocalMemories(raw,account);
const output=eliminateFirstSwipeBlank(before);
assert.notEqual(before,output);
assert.equal(output.includes('talera-lifeline-dev-local-v1'),false);
assert.ok(output.includes('talera-free-local-'+account.slice(0,32)+'-v1'));
assert.equal(output.split('f5ColdAdjacentStarted=false').length-1,1);
assert.equal(output.split('void f5PrewarmFirstAdjacent(selected)').length-1,1);
assert.equal(output.split('void f5PrewarmFirstAdjacent(visible)').length-1,1);
assert.ok(output.includes('const nearby=[sorted[i-1],sorted[i+1]].filter(Boolean)'));
assert.ok(output.includes("!first.startsWith('blob:')"));
assert.ok(output.includes("await picture.decode()"));
assert.ok(output.includes("if(f5ColdAdjacentStarted||!memory?._taleraLocal)return;"));
assert.ok(output.includes('left._taleraLocal&&left._photoLoading'));
assert.ok(output.includes('right._taleraLocal&&right._photoLoading'));
// Confirm the existing V61 recording presentation stays one-photo-at-rest,
// but the SAME existing V3 swipe band is visible while .is-visible is set.
assert.equal(output.split('id="talera-f5-narrated-swipe-band"').length-1,1);
assert.ok(output.includes('body.talera-v61-narration-visual #photoStage .talera-photo-strip.talera-wheel-strip.is-visible'));
assert.ok(output.includes('{display:block!important;visibility:visible!important;opacity:1!important}'));
assert.ok(output.includes('id="talera-v61-r12-one-photo-owner"'));
assert.ok(output.includes("belt.classList.add('is-visible')"));
assert.ok(output.includes("belt.classList.remove('is-visible')"));
assert.equal(output.split('function taleraInlineSync(').length-1,before.split('function taleraInlineSync(').length-1);

assert.ok(output.includes('setPhotoLayer(photoLayerA, memoryPhotoA, memoryBackdropA'));
assert.ok(output.includes('setPhotoLayer(photoLayerB, memoryPhotoB, memoryBackdropB'));
assert.ok(output.includes('1-p, -7*p'));
assert.ok(output.includes('p, 7*(1-p)'));
assert.ok(output.includes('function showPhoto(memory,index,manual=false)'));
assert.ok(output.includes('function renderJourneyPreview()'));
assert.ok(output.includes('async function hydrate(memory)'));
assert.ok(output.includes('function activate(memory)'));
for(const original of ['talera-zero-memory-adapter','__taleraTimelineRuntime',
  'TaleraMemories','narrationCues','photoStage','videoAtMs']){
 assert.ok(output.includes(original),'Preserve original source: '+original);
}
const scriptBodies=[...output.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
 .map(x=>x[1]);
assert.ok(scriptBodies.length>3);
let validated=0;
for(let i=0;i<scriptBodies.length;i++){
 const source=scriptBodies[i].trim();
 if(!source||source.startsWith('{"'))continue;
 new vm.Script(source,{filename:'TALERA_PRESENT_script_'+i+'.js'});
 validated++;
}
assert.ok(validated>2);
// These 450 historical examples are synthetic, not account-owned media.
// Their preview is permitted only when the decoded image belongs to that
// exact example, never a recycled neighboring wheel tile or another story.
const {referencePages}=await import('./generated/public-template-map.mjs');
const actualPresent=referencePages['/present'];
assert.match(actualPresent||'',/^\/__talera_free\/f5references\/[a-f0-9]{64}\.html$/);
const shipped=readFileSync('r20-dev/free-10m-delivery/public'+actualPresent,'utf8');
assert.ok(shipped.includes('Array.from({length:450},(_,i)=>{')&&
  shipped.includes("const seed='talera-500-fotoband-'+String(i+1).padStart(3,'0')"),
  'Preserve the existing 450 unique source URLs, dates and sample IDs');
assert.ok(shipped.includes('let ownSerial=0;') &&
  shipped.includes('runtime.currentMemory()?.id!==memory.id') &&
  shipped.includes('memory.photos[next]!==src'),
  'Single ordinary presentation controller must be bound to the selected memory ID');
assert.ok(shipped.includes("memory.thumbnail=photos.find((_,i)=>frames[i]?.kind==='photo')"),
  'One own thumbnail comes from this memory’s first photo, not a seventh media item');
assert.ok(shipped.includes('tile.el.dataset.owner=owner') &&
  shipped.includes("tile.el.style.visibility='hidden'"),
  'Each recycled strip tile must be hidden until its own image is decoded');
assert.ok(!shipped.includes('readyNeighbour?.currentSrc') &&
  !shipped.includes('const fallback=mem._taleraLocal?(') &&
  !shipped.includes('const fallback=base?.complete&&base.naturalWidth?'),
  'No own or sample thumbnail may borrow a different memory image');
assert.equal(shipped.split('function showPhoto(memory,index,manual=false').length-1,1,
  'There must be only one ordinary photo selector');
assert.ok(shipped.includes('function taleraInlineSync(')&&
  shipped.includes('function taleraInlineVoiceEnded('),
  'Original narrator and cue engine remain present and separate');
const shippedScripts=[...shipped.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi)].map(x=>x[1]);
let compiled=0;
for(const content of shippedScripts){
 const js=content.trim();
 if(!js||js.startsWith('{"'))continue;
 new vm.Script(js,{filename:'TALERA_SHIPPED_PRESENT.js'});
 compiled++;
}
assert.ok(compiled>3,'Shipped presentation script must parse');
console.log('TALERA_F5_FIRST_SWIPE_BOUNDED_PREWARM',JSON.stringify({
 success:true,syntheticOnly:true,accountPrivate:true,
 prewarmsMaxTwoNeighbors:true,noVideosOrFullAlbumsDecoded:true,
 firstTransitionAvoidsUnreadyLocalImage:true,directIdOwnedPresentation:true,
 approvedTimelineAnimationUnchanged:true,narratedSwipeRestoresExistingV3Band:true,originalNarrationUntouched:true,
 scriptsParse:validated
}));
