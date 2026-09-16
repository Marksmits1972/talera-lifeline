import assert from 'node:assert/strict';
import test from 'node:test';
import { handleStoryLabV1, STORYLAB_REV } from '../xxory-test/src/storylab-v1.js';

test('Story Lab is an isolated screenshot-locked visual foundation with no legacy stack', async () => {
  const response = await handleStoryLabV1(new Request('https://example.test/storylab'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-talera-storylab'), STORYLAB_REV);
  const html = await response.text();
  assert.match(html, /id="photoInput" type="file" accept="image\/\*"/);
  assert.match(html, /URL\.createObjectURL\(file\)/);
  assert.match(html, /Titel van deze herinnering/);
  assert.match(html, /Wanneer was dit\?/);
  assert.match(html, /Kies een foto die je herinnering oproept/);
  assert.match(html, /Daarna kun je gewoon naar de foto kijken en je verhaal vertellen\./);
  assert.match(html, /class="micHalo"/);
  assert.match(html, /background:rgba\(47,111,159,.97\)/);
  assert.match(html, /Je vertelt nu · swipe gerust door je foto’s/);
  assert.match(html, /Veeg omhoog voor je verhaal/);
  assert.match(html, /class="wheelFrame"/);
  assert.doesNotMatch(html, /STORY LAB · VISUELE BASIS|phaseTag/);
  assert.doesNotMatch(html, /orb-app-v79|workblad-v2|clean-rebuild-v2|__taleraOptimizePhoto|__taleraPhotoStaging/);
});

test('Story Lab exposes screenshot-locked phase information and leaves other routes untouched', async () => {
  const revision = await handleStoryLabV1(new Request('https://example.test/api/storylab/revision'));
  const data = await revision.json();
  assert.equal(data.ok, true);
  assert.equal(data.phase, 'screenshot-locked-visual-foundation');
  assert.equal(data.persistentStorage, false);
  assert.equal(data.audioEnabled, false);
  assert.equal(data.timelineEnabled, false);
  const untouched = await handleStoryLabV1(new Request('https://example.test/clean'));
  assert.equal(untouched, null);
});
