import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {scopeLocalMemories} from './f5-local-scope.mjs';
import {alignEditedNarrationCueRefs} from './f5-edit-cue-rebind.mjs';
import {retainEditorCanonicalMediaIds} from './f5-editor-canonical-refs.mjs';
import {preserveOriginalMediaIdsOnEdit} from './f5-library-editor-stable-save.mjs';

const html=readFileSync('r20-dev/free-10m-delivery/generated/reference-tell.html','utf8');
const account='a'.repeat(64);
const scoped=scopeLocalMemories(html,account);
const patched=alignEditedNarrationCueRefs(scoped);
assert.ok(patched.includes('talera-free-local-'+account.slice(0,32)+'-v1'));
assert.equal(patched.includes('talera-lifeline-dev-local-v1'),false);
const changedStart=patched.indexOf('if(g.voice&&Array.isArray(g.voiceCues)&&g.voiceCues.length){');
assert.ok(changedStart>0);
const suffix='if(entries.length)await writeFiles(entries);entries.forEach(([id,f])=>assets.set(id,f));';
const end=patched.indexOf(suffix,changedStart);
assert.ok(end>changedStart);
const safelyRebind=patched.slice(changedStart,end);
assert.ok(safelyRebind.includes('source.findIndex(it=>it.key===c.mediaId)'));
assert.ok(safelyRebind.includes('return {...c,index:originalIndex,mediaId:g.media[originalIndex]}'));
const originals=['local-safe-test-001:0','local-safe-test-001:1','local-safe-test-001:2'];
const row={items:[
 {kind:'photo',key:originals[0]},
 {kind:'photo',key:originals[1]},
 {kind:'video',key:originals[2]},
 {kind:'audio',key:'local-safe-test-001:3'}
]};
const copy=()=>({
 voice:'fresh-editor-audio',
 media:['f5-editor-media-uuid-111','f5-editor-media-uuid-222','f5-editor-media-uuid-333'],
 voiceCues:[{t:0,index:0,mediaId:originals[0]},
  {t:1150,index:2,mediaId:originals[2],videoAtMs:300},
  {t:2350,index:1,mediaId:originals[1]}]
});
const g=copy();
vm.runInNewContext(safelyRebind,{g,row});
assert.deepEqual(g.voiceCues.map(c=>c.mediaId),g.media.map((x,i)=>[0,2,1].includes(i)?x:null).filter(Boolean).length===3?
 [g.media[0],g.media[2],g.media[1]]:[]);
assert.deepEqual(g.voiceCues.map(c=>c.t),[0,1150,2350]);
assert.deepEqual(g.voiceCues.map(c=>c.index),[0,2,1]);
assert.equal(g.voiceCues[1].videoAtMs,300);
const missing=copy();missing.voiceCues[1].mediaId='local-missing-elsewhere:3';
assert.throws(()=>vm.runInNewContext(safelyRebind,{g:missing,row}),
 /oorspronkelijke media-ID ontbreekt/);
assert.ok(missing.media.every(x=>x.startsWith('f5-editor-media-uuid-')));
const noVoice=copy();noVoice.voice='';const before=JSON.stringify(noVoice.voiceCues);
vm.runInNewContext(safelyRebind,{g:noVoice,row});
assert.equal(JSON.stringify(noVoice.voiceCues),before);
const editor=[...patched.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
 .map(x=>x[1]).find(x=>x.includes('if(entries.length)await writeFiles(entries)'));
assert.ok(editor,'The original edit boot script must contain the guarded patch');
new vm.Script(editor,{filename:'f5-original-editor-verified.js'});
// The original-to-draft association survives the SAME local draft manifest.
const wired=retainEditorCanonicalMediaIds(patched);
assert.ok(wired.includes('canonicalByDraft:g.canonicalByDraft?{...g.canonicalByDraft}:null'));
assert.equal(wired.split('g.canonicalByDraft=Object.fromEntries(').length-1,1);
const startMap=wired.indexOf('if(g.existing){',changedStart);
const endMap=wired.indexOf(suffix,startMap);
assert.ok(startMap>changedStart&&endMap>startMap);
const mapScript=wired.slice(startMap,endMap);
const oldIds=['local-stable:0','local-stable:1','local-stable:2'];
const existingDraft={existing:'local-stable',media:['draft-0','draft-1'],voice:'draft-2'};
const initialRow={items:oldIds.map(key=>({key}))};
const pairs=[['draft-0',new Blob(['photo'])],['draft-1',new Blob(['video'])],['draft-2',new Blob(['audio'])]];
vm.runInNewContext(mapScript,{g:existingDraft,row:initialRow,entries:pairs});
assert.deepEqual({...existingDraft.canonicalByDraft},{
 'draft-0':'local-stable:0','draft-1':'local-stable:1','draft-2':'local-stable:2'
});
existingDraft.media.reverse();
assert.deepEqual(existingDraft.media.map(key=>existingDraft.canonicalByDraft[key]),['local-stable:1','local-stable:0'],
 'Reordering must not change the identity of the two original photos');
const invalidDraft={existing:'local-stable'};
assert.throws(()=>vm.runInNewContext(mapScript,{
 g:invalidDraft,row:{items:[{key:'old:0'}]},entries:pairs
}),/oorspronkelijke mediaverwijzingen zijn onvolledig/);
const editorCode=[...wired.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
 .map(x=>x[1]).find(x=>x.includes('g.canonicalByDraft=Object.fromEntries('));
assert.ok(editorCode);
new vm.Script(editorCode,{filename:'f5-editor-canonical-media-refs.js'});
// Original media IDs now survive an edit with uploads, including a reorder.
const stable=preserveOriginalMediaIdsOnEdit(wired);
assert.ok(stable.includes('async function save(input,uploads,editId,canonicalIds){'));
assert.ok(stable.includes("if(existing&&canonicalIds===undefined)for(var k=0;"));
assert.ok(stable.includes("if(existing&&canonicalIds!==undefined&&canonicalIds[j])continue;"));
assert.ok(stable.includes("tx.objectStore('files').add(row)"));
assert.ok(stable.includes('canonicalIds);const persisted=await mem.get(row.id);'));
assert.ok(stable.includes('g.canonicalByDraft[id]||null'));
assert.ok(stable.includes("birthYear:Number(input.birthYear)||(existing?.birthYear||null)"));
assert.ok(!stable.includes("const row=await mem.save({title,date:g.date"));
const stableScripts=[...stable.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
 .map(m=>m[1]);
const storeScript=stableScripts.find(src=>src.includes('async function save(input,uploads,editId,canonicalIds)'));
const editScript=stableScripts.find(src=>src.includes('g.canonicalByDraft[id]||null'));
assert.ok(storeScript&&editScript);
new vm.Script(storeScript,{filename:'TALERA_LIBRARY_STABLE_ORIGINAL_STORE.js'});
new vm.Script(editScript,{filename:'TALERA_LIBRARY_STABLE_ORIGINAL_EDITOR.js'});
console.log('TALERA_F5_EDITED_NARRATION_ID_REBIND',JSON.stringify({
 passed:true,syntheticOnly:true,keptOriginalBlobs:true,
 cuesPreserveTimeAndOrder:true,noInvalidCrossAccountIds:true,
 editingUsesFreshDraftIds:true,noVoiceUnchanged:true,editorJsParses:true
}));
