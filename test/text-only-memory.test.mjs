import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const bridgeSource = readFileSync(new URL('../xxory-test/src/workblad-v9-integration-bridge.js', import.meta.url), 'utf8');
const textMemorySource = readFileSync(new URL('../xxory-test/src/workblad-v9-text-memory.js', import.meta.url), 'utf8');
const publishSource = readFileSync(new URL('../xxory-test/src/workblad-v9-timeline-publish.js', import.meta.url), 'utf8');
const wrapperSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker-timeline-publish.js', import.meta.url), 'utf8');
const workbladSource = readFileSync(new URL('../xxory-test/src/workblad-v2-client.js', import.meta.url), 'utf8');

test('existing-story edits stay owned by the proven edit path instead of V9 create', () => {
  assert.match(bridgeSource, /const isEditMode = \(\) => Boolean\(new URLSearchParams\(location\.search\)\.get\('edit'\)\)/);
  assert.match(bridgeSource, /if \(isEditMode\(\)\) return;/);
  assert.match(workbladSource, /if\(state\.editingStoryId&&state\.editingToken\)/);
  assert.match(workbladSource, /saveEditedAudio/);
  assert.match(workbladSource, /\/content/);
  assert.match(workbladSource, /saveMetadata/);
});

test('V9 create bridge accepts text or photos without requiring a recording', () => {
  assert.doesNotMatch(bridgeSource, /Geen geluidsopname gevonden in het huidige werkblad/);
  assert.match(bridgeSource, /const hasAudio = audio instanceof Blob && audio\.size > 0/);
  assert.match(bridgeSource, /const audioData = hasAudio \? await uploadAudio\(audio\) : null/);
  assert.match(bridgeSource, /audioId:audioData\?\.id \|\| null/);
  assert.match(bridgeSource, /Voeg eerst tekst, een foto of een gesproken verhaal toe/);
});

test('text-photo V9 route stores an explicit no-audio representation without schema migration', () => {
  assert.match(textMemorySource, /if \(cleanId\(payload\.audioId\)\) return null/);
  assert.match(textMemorySource, /'', '', '', 0, ''/);
  assert.match(textMemorySource, /hasAudio:false/);
  assert.match(textMemorySource, /if \(!storyText && !photoId\)/);
  assert.match(wrapperSource, /handleV9TextMemory/);
  assert.match(wrapperSource, /audioRequiredForTimeline: false/);
});

test('timeline publication verifies audio only when a memory actually has audio', () => {
  assert.match(publishSource, /const hasAudio = Boolean/);
  assert.match(publishSource, /if \(hasAudio\) \{/);
  assert.match(publishSource, /hasAudio \? row\.audio_key : ''/);
  assert.match(publishSource, /hasAudio \? Number\(audioHead\?\.size \|\| row\.audio_size_bytes \|\| 0\) : 0/);
  assert.match(publishSource, /const audioMatches = hasAudio/);
});
