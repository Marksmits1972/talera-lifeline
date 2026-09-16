import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const wrapperSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker-timeline-publish.js', import.meta.url), 'utf8');
const compatSource = readFileSync(new URL('../xxory-test/src/workblad-management-compat.js', import.meta.url), 'utf8');

function addBlock(){
  const start = wrapperSource.indexOf('addPhotos:function(files)');
  const end = wrapperSource.indexOf('pickPhotos:function()', start);
  assert.ok(start >= 0 && end > start, 'storytelling addPhotos action must exist');
  return wrapperSource.slice(start, end);
}

test('selected iPhone photos enter memory state before optimization can block', () => {
  const block = addBlock();
  const adopt = block.indexOf('state.workMedia.push(item)');
  const optimize = block.indexOf('__taleraOptimizePhoto');
  const selectedEvent = block.indexOf("phase:'selected'");

  assert.ok(adopt >= 0, 'selected blob must enter workMedia immediately');
  assert.ok(selectedEvent > adopt, 'selected event must fire after immediate adoption');
  assert.ok(optimize > selectedEvent, 'optimization must start only after the visible photo is already adopted');
  assert.doesNotMatch(block.slice(0, optimize), /await\s+window\.__taleraOptimizePhoto/);
  assert.match(block, /URL\.createObjectURL\(source\)/);
  assert.match(block, /state\.newPhotoFiles\.push\(source\)/);
  assert.match(block, /pending:true/);
});

test('photo preparation continues in the background without legacy rerendering', () => {
  const block = addBlock();
  assert.doesNotMatch(block, /applyPhotoFiles\(/);
  assert.doesNotMatch(block, /renderWorkblad\(/);
  assert.match(block, /Promise\.allSettled\(jobs\)/);
  assert.match(block, /photo optimization deferred/);
  assert.match(block, /state\.workMedia\.indexOf\(item\)<0/);
  assert.match(block, /state\.newPhotoFiles\[at\]=prepared/);
  assert.match(block, /talera:storytelling-photos-prepared/);
});

test('iPhone selection still tolerates missing MIME and HEIC/HEIF files', () => {
  const block = addBlock();
  assert.match(block, /!type\|\|type\.indexOf\('image\/'\)===0/);
  assert.match(block, /heic\|heif/);
});

test('visible storytelling shell refreshes on both selected and prepared photo events', () => {
  assert.match(compatSource, /talera:storytelling-photos-added/);
  assert.match(compatSource, /talera:storytelling-photos-prepared/);
  assert.match(compatSource, /refreshStorytelling/);
  assert.match(compatSource, /__taleraStorytellingPage\?\.refresh\?\.\(true\)/);
});
