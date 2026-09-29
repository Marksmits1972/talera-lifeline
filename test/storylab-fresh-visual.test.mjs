import assert from 'node:assert/strict';
import test from 'node:test';
import { handleStoryLabFresh, STORYLAB_FRESH_REV } from '../xxory-test/src/storylab-fresh.js';

test('fresh Story Lab serves the current photo-first interaction shell without legacy stack', async () => {
  const response = await handleStoryLabFresh(new Request('https://example.test/storylab'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-talera-storylab-fresh'), STORYLAB_FRESH_REV);
  const html = await response.text();
  assert.match(html, /class="recordOrb"/);
  assert.match(html, /class="addPhoto"/);
  assert.match(html, /id="photoStage"/);
  assert.match(html, /id="photoCard"/);
  assert.match(html, /id="storySheet"/);
  assert.match(html, /id="storyText"/);
  assert.match(html, /data-record-button/);
  assert.match(html, /data-photo-button/);
  assert.match(html, /talera:storylab-photos/);
  assert.match(html, /talera:storylab-record-toggle/);
  assert.doesNotMatch(html, /handleStoryLabV1|storylab-page-v1|clean-rebuild-v2|orb-app-v79|workblad-v2|__taleraOptimizePhoto|__taleraPhotoStaging/);
});

test('fresh Story Lab reports the current visual interaction phase', async () => {
  const response = await handleStoryLabFresh(new Request('https://example.test/api/storylab/revision'));
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.builtFromBlank, true);
  assert.equal(data.phase, 'visual-interaction-shell');
  assert.equal(data.photoCarousel, true);
  assert.equal(data.verticalTextSheet, true);
  assert.equal(data.editableFinalText, true);
  assert.equal(data.audioEnabled, false);
  assert.equal(data.persistentPhotoStorage, false);
  assert.equal(data.timelineEnabled, false);
});
