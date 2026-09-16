import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const wrapperSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker-timeline-publish.js', import.meta.url), 'utf8');

test('visible iPhone selection is adopted without rerendering the legacy workblad first', () => {
  const addStart = wrapperSource.indexOf('addPhotos:async function(files)');
  const addEnd = wrapperSource.indexOf('pickPhotos:function()', addStart);
  assert.ok(addStart >= 0 && addEnd > addStart, 'storytelling addPhotos action must exist');
  const addBlock = wrapperSource.slice(addStart, addEnd);

  assert.doesNotMatch(addBlock, /applyPhotoFiles\(/, 'visible shell must not delegate back to the legacy rerendering picker pipeline');
  assert.doesNotMatch(addBlock, /renderWorkblad\(/, 'selected photos must be adopted without destroying the active storytelling shell');
  assert.match(addBlock, /URL\.createObjectURL\(prepared\)/);
  assert.match(addBlock, /state\.workMedia\.push/);
  assert.match(addBlock, /state\.newPhotoFiles\.push/);
  assert.match(addBlock, /await draftSave\(\)/);
  assert.match(addBlock, /talera:storytelling-photos-added/);
});

test('iPhone photo adoption tolerates missing MIME and optimizer failures', () => {
  const addStart = wrapperSource.indexOf('addPhotos:async function(files)');
  const addEnd = wrapperSource.indexOf('pickPhotos:function()', addStart);
  const addBlock = wrapperSource.slice(addStart, addEnd);

  assert.match(addBlock, /!type\|\|type\.indexOf\('image\/'\)===0/);
  assert.match(addBlock, /heic\|heif/);
  assert.match(addBlock, /photo optimization fallback/);
  assert.match(addBlock, /prepared=source/);
});
