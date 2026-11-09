// Fail closed: only two original /tell editor mute tokens may change.
// Narrator iframe /present and all post-narration soundtrack code stay byte exact.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scopeLocalMemories} from './f5-local-scope.mjs';
import {alignEditedNarrationCueRefs} from './f5-edit-cue-rebind.mjs';
import {muteEditorOnlyVideo,undoEditorOnlyMute} from './f5-editor-video-mute-guard.mjs';
const original=readFileSync('r20-dev/free-10m-delivery/generated/reference-tell.html','utf8');
const scoped=scopeLocalMemories(original,'a'.repeat(64));
const before=alignEditedNarrationCueRefs(scoped);
const changed=muteEditorOnlyVideo(before);
assert.notEqual(changed,before);
assert.equal(undoEditorOnlyMute(changed),before,'No other original JS/CSS/HTML may change');
const delta=changed.length-before.length;
assert.equal(delta,'muted '.length-('const mute=!!(panel&&!panel.hidden)'.length-'const mute=true'.length));
assert.match(changed,/const mute=true/);
assert.match(changed,/muted controls playsinline preload="metadata"><\/video>/);
assert.ok(changed.includes('function taleraV61MakeVideoPreview(file)'),
  'Original thumbnail generator must remain intact');
assert.ok(changed.includes('taleraV61AttachNativeCovers()'),
  'Original iPhone native video cover fallback must remain intact');
assert.ok(changed.includes('function frameInner(g)'),
  'Original editor preview and controls must remain intact');
assert.ok(changed.includes('taleraZeroSession'),
  'Original narrator and timing must remain intact');
assert.throws(()=>muteEditorOnlyVideo('changed source'),/F5_EDITOR_VIDEO_MUTE_SOURCE_CHANGED/);
assert.equal(original.includes('const mute=true'),false,
 'Original approved code should remain untouched');
console.log('TALERA_F5_EDITOR_AUDIO_GUARD_EXACT_SOURCE_PASS',JSON.stringify({
  exactTwoSourceAnchors:true,undoRestoresOriginal100Percent:true,
  thumbnailGeneratorUnchanged:true,nativeSafariFallbackUnchanged:true,
  videoInsideEditorMutedFromFirstFrame:true,storyPresentPlayerUnchanged:true,
  originalApprovedSourceUnmodified:true,realIphoneStillRequiresAcceptance:true
}));
