import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wrapperSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker-timeline-publish.js', import.meta.url), 'utf8');

test('storytelling bridge exposes state without replacing the proven recorder and save engine', () => {
  assert.match(wrapperSource, /__taleraStorytellingActions/);
  assert.match(wrapperSource, /snapshot:function/);
  assert.match(wrapperSource, /setTitle:function/);
  assert.match(wrapperSource, /setText:function/);
  assert.match(wrapperSource, /startVoice:function\(\)\{capture\(\);return voiceStart\(\);\}/);
  assert.match(wrapperSource, /finish:function/);
});

test('storytelling bridge supports local and existing photo removal', () => {
  assert.match(wrapperSource, /removePhoto:async function/);
  assert.match(wrapperSource, /\/api\/v9\/story-photo\//);
  assert.match(wrapperSource, /state\.workMedia\.splice\(index,1\)/);
  assert.match(wrapperSource, /state\.newPhotoFiles=state\.newPhotoFiles\.filter/);
  assert.match(wrapperSource, /__taleraPhotoStaging\.stage/);
  assert.match(wrapperSource, /method:'DELETE'/);
});

test('storytelling bridge keeps date and photo picking on the existing proven controls', () => {
  assert.match(wrapperSource, /pickPhotos:function\(\)\{capture\(\);photoPick\(\);return true;\}/);
  assert.match(wrapperSource, /openDate:function/);
  assert.match(wrapperSource, /document\.getElementById\('workDate'\)/);
});

test('photo DOM is only rebuilt when media or active photo changes', () => {
  assert.match(wrapperSource, /stableStorytellingScript/);
  assert.match(wrapperSource, /lastRenderedPhotoKey/);
  assert.match(wrapperSource, /const renderKey = sig \+ '#' \+ activePhotoIndex/);
  assert.match(wrapperSource, /renderKey === lastRenderedPhotoKey/);
});

test('wrapper still preserves target-first handoff and management APIs', () => {
  assert.match(wrapperSource, /WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT/);
  assert.match(wrapperSource, /handleV9TimelinePublish/);
  assert.match(wrapperSource, /handleStoryPhotoCleanup/);
  assert.match(wrapperSource, /WORKBLAD_STORY_MANAGEMENT_SCRIPT/);
});
