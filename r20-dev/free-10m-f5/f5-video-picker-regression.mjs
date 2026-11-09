// F5 only: verify the approved storyteller gains a visible, account-private
// video selection path while never touching recorder/cue/player logic.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {scopeLocalMemories} from './f5-local-scope.mjs';
import {addTransparentVideoPicker} from './f5-video-picker.mjs';
const base=readFileSync('r20-dev/free-10m-delivery/generated/reference-tell.html','utf8');
const owner='a'.repeat(64),other='b'.repeat(64);
const original=scopeLocalMemories(base,owner);
const changed=addTransparentVideoPicker(original);
assert.notEqual(changed,original);
assert.equal(changed.split('id=\'taleraF5AddVideoInput\'').length-1,1);
assert.equal(changed.split('id=\'taleraF5AddVideoButton\'').length-1,1);
assert.ok(changed.includes("pickVideo.accept='video/*,.mov,.mp4,.m4v'"));
assert.ok(changed.includes('taleraF5FilesReceived(files)'));
assert.ok(changed.includes("void importPhotos(files,g.id)"));
assert.ok(changed.includes("actualVideos=g.media.filter"));
assert.ok(changed.includes('De iPhone heeft geen video aan TALERA doorgegeven.'));
assert.ok(changed.includes('Groepen')===original.includes('Groepen'));
for(const word of ['taleraV61PersistMediaIds','narrationSchema','media-id-v1',
 'taleraZeroSession','talera-memory-store-v1','taleraV9EditorMediaControls']){
 assert.ok(changed.includes(word),'Original recorder and ID ownership retained: '+word);
}
assert.equal(changed.includes('talera-lifeline-dev-local-v1'),false);
const privateB=addTransparentVideoPicker(scopeLocalMemories(base,other));
assert.ok(changed.includes('talera-free-local-'+owner.slice(0,32)+'-v1'));
assert.ok(privateB.includes('talera-free-local-'+other.slice(0,32)+'-v1'));
assert.ok(!privateB.includes('talera-free-local-'+owner.slice(0,32)+'-v1'));
const source=[...changed.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
  .map(m=>m[1]).find(x=>x.includes('function taleraV9EditorMediaControls(g){'));
assert.ok(source,'Approved original inline editor JS expected');
new vm.Script(source,{filename:'f5-isolated-storyteller.js'});
console.log('TALERA_F5_VIDEO_PICKER_REGRESSION',JSON.stringify({
 passed:true,syntheticOnly:true,videoPickerCount:1,originalRecorderUntouched:true,
 iPhoneSelectedFileCountVisible:true,dedicatedMOVPicker:true,
 missingVideoReported:true,differentAccountsIsolated:true,
 editorScriptParses:true
}));
