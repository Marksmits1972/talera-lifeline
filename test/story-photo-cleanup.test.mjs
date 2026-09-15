import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { WORKBLAD_STORY_PHOTO_CLEANUP_SCRIPT } from '../xxory-test/src/workblad-story-photo-cleanup.js';

const cleanupSource = readFileSync(new URL('../xxory-test/src/workblad-story-photo-cleanup.js', import.meta.url), 'utf8');
const wrapperSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker-timeline-publish.js', import.meta.url), 'utf8');

test('photo cleanup is authenticated and limited to image media belonging to the story', () => {
  assert.match(cleanupSource, /Bearer\\s\+\(\.\+\)/);
  assert.match(cleanupSource, /manage_token_hash/);
  assert.match(cleanupSource, /WHERE id = \? AND story_id = \? LIMIT 1/);
  assert.match(cleanupSource, /media\.media_type !== 'image'/);
});

test('removing the cover promotes the next image or clears the cover safely', () => {
  assert.match(cleanupSource, /media\.role === 'start'/);
  assert.match(cleanupSource, /UPDATE story_media SET role = 'start'/);
  assert.match(cleanupSource, /UPDATE stories SET start_photo_key = \?, updated_at = \?/);
  assert.match(cleanupSource, /UPDATE stories SET start_photo_key = NULL, updated_at = \?/);
});

test('cleanup controls exist only in edit context and reload the same story after removal', () => {
  assert.match(WORKBLAD_STORY_PHOTO_CLEANUP_SCRIPT, /q\.get\('edit'\)/);
  assert.match(WORKBLAD_STORY_PHOTO_CLEANUP_SCRIPT, /Deze foto uit deze herinnering verwijderen\?/);
  assert.match(WORKBLAD_STORY_PHOTO_CLEANUP_SCRIPT, /method:'DELETE'/);
  assert.match(WORKBLAD_STORY_PHOTO_CLEANUP_SCRIPT, /location\.reload\(\)/);
});

test('wrapper exposes cleanup without changing timeline publish or staged photo handlers', () => {
  assert.match(wrapperSource, /handleStoryPhotoCleanup/);
  assert.match(wrapperSource, /handleV9StagedPhotoLink/);
  assert.match(wrapperSource, /handleV9TimelinePublish/);
  assert.match(wrapperSource, /WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT \+ WORKBLAD_STORY_PHOTO_CLEANUP_SCRIPT/);
});
