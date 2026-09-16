import assert from 'node:assert/strict';
import test from 'node:test';
import { handleStoryLabFresh, STORYLAB_FRESH_REV } from '../xxory-test/src/storylab-fresh.js';

test('fresh Story Lab serves the approved screenshot composition without legacy stack', async () => {
  const response = await handleStoryLabFresh(new Request('https://example.test/storylab'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-talera-storylab-fresh'), STORYLAB_FRESH_REV);
  const html = await response.text();
  assert.match(html, /Kies een foto die je herinnering oproept/);
  assert.match(html, /Daarna kun je gewoon naar de foto kijken en je verhaal vertellen\./);
  assert.match(html, /Je vertelt nu · swipe gerust door je foto’s/);
  assert.match(html, /Veeg omlaag om terug te gaan naar je foto/);
  assert.match(html, /class="micHalo"/);
  assert.match(html, /class="micRing"/);
  assert.match(html, /class="photoButton">\+ foto/);
  assert.match(html, /class="wheels"/);
  assert.doesNotMatch(html, /handleStoryLabV1|storylab-page-v1|clean-rebuild-v2|orb-app-v79|workblad-v2|__taleraOptimizePhoto|__taleraPhotoStaging/);
});

test('fresh Story Lab reports an intentionally visual-only first phase', async () => {
  const response = await handleStoryLabFresh(new Request('https://example.test/api/storylab/revision'));
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.builtFromBlank, true);
  assert.equal(data.phase, 'visual-shell-only');
  assert.equal(data.audioEnabled, false);
  assert.equal(data.persistentPhotoStorage, false);
  assert.equal(data.timelineEnabled, false);
});
