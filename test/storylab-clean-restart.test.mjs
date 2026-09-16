import assert from 'node:assert/strict';
import test from 'node:test';
import { handleStoryLabV1, STORYLAB_REV } from '../xxory-test/src/storylab-v1.js';

test('Story Lab is an isolated visual foundation with no legacy workblad stack', async () => {
  const response = await handleStoryLabV1(new Request('https://example.test/storylab'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-talera-storylab'), STORYLAB_REV);
  const html = await response.text();
  assert.match(html, /id="photoInput" type="file" accept="image\/\*"/);
  assert.match(html, /URL\.createObjectURL\(file\)/);
  assert.match(html, /id="dateButton"/);
  assert.match(html, /class="wheels"/);
  assert.match(html, /aria-label="Microfoon — in deze stap alleen visueel"/);
  assert.match(html, /Veeg omhoog voor je verhaal/);
  assert.doesNotMatch(html, /orb-app-v79|workblad-v2|clean-rebuild-v2|__taleraOptimizePhoto|__taleraPhotoStaging/);
});

test('Story Lab exposes explicit phase information and leaves other routes untouched', async () => {
  const revision = await handleStoryLabV1(new Request('https://example.test/api/storylab/revision'));
  const data = await revision.json();
  assert.equal(data.ok, true);
  assert.equal(data.phase, 'visual-foundation-only');
  assert.equal(data.persistentStorage, false);
  assert.equal(data.audioEnabled, false);
  assert.equal(data.timelineEnabled, false);
  const untouched = await handleStoryLabV1(new Request('https://example.test/clean'));
  assert.equal(untouched, null);
});
