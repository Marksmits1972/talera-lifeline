import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wrapperSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker-timeline-publish.js', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../xxory-test/src/workblad-storytelling-page.js', import.meta.url), 'utf8');

test('storytelling bridge exposes state without replacing proven recorder and save engine', () => {
  assert.match(wrapperSource, /__taleraStorytellingActions/);
  assert.match(wrapperSource, /snapshot:function/);
  assert.match(wrapperSource, /setTitle:function/);
  assert.match(wrapperSource, /setText:function/);
  assert.match(wrapperSource, /startVoice:function\(\)\{capture\(\);return voiceStart\(\);\}/);
  assert.match(wrapperSource, /finish:function/);
});

test('visible file input adopts selected photos directly into the current memory state', () => {
  assert.match(wrapperSource, /addPhotos:function\(files\)/);
  assert.match(wrapperSource, /Array\.prototype\.slice\.call\(files\|\|\[\]\)/);
  assert.match(wrapperSource, /URL\.createObjectURL\(source\)/);
  assert.match(wrapperSource, /state\.workMedia\.push\(item\)/);
  assert.match(wrapperSource, /state\.newPhotoFiles\.push\(source\)/);
  assert.match(wrapperSource, /Promise\.resolve\(draftSave\(\)\)/);
  const start=wrapperSource.indexOf('addPhotos:function(files)');
  const end=wrapperSource.indexOf('pickPhotos:function()',start);
  assert.doesNotMatch(wrapperSource.slice(start,end), /applyPhotoFiles\(/);
  assert.match(pageSource, /taleraStoryPhotoInput/);
});

test('storytelling bridge supports local and existing photo removal', () => {
  assert.match(wrapperSource, /removePhoto:async function/);
  assert.match(wrapperSource, /\/api\/v9\/story-photo\//);
  assert.match(wrapperSource, /state\.workMedia\.splice\(index,1\)/);
  assert.match(wrapperSource, /state\.newPhotoFiles=state\.newPhotoFiles\.filter/);
  assert.match(wrapperSource, /__taleraPhotoStaging\.stage/);
  assert.match(wrapperSource, /method:'DELETE'/);
});

test('date selection still delegates to proven direct date control', () => {
  assert.match(wrapperSource, /openDate:function/);
  assert.match(wrapperSource, /document\.getElementById\('workDate'\)/);
});

test('photo render is stable between engine polling ticks', () => {
  assert.match(pageSource, /lastRenderedPhotoKey/);
  assert.match(pageSource, /const renderKey=sig\+'#'\+activePhotoIndex/);
  assert.match(pageSource, /renderKey===lastRenderedPhotoKey/);
});

test('wrapper still preserves target-first handoff and management APIs', () => {
  assert.match(wrapperSource, /WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT/);
  assert.match(wrapperSource, /handleV9TimelinePublish/);
  assert.match(wrapperSource, /handleStoryPhotoCleanup/);
  assert.match(wrapperSource, /WORKBLAD_STORY_MANAGEMENT_SCRIPT/);
});
