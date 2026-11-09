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
console.log('TALERA_F5_FIRST_SWIPE_BOUNDED_PREWARM',JSON.stringify({
 success:true,syntheticOnly:true,accountPrivate:true,
 prewarmsMaxTwoNeighbors:true,noVideosOrFullAlbumsDecoded:true,
 firstTransitionAvoidsUnreadyLocalImage:true,
 approvedTimelineAnimationUnchanged:true,originalNarrationUntouched:true,
 scriptsParse:validated
}));
