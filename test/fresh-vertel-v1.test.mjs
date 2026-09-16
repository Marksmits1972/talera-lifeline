import assert from 'node:assert/strict';
import test from 'node:test';
import { FRESH_VERTEL_REV, handleFreshVertelV1 } from '../xxory-test/src/fresh-vertel-v1.js';

test('fresh vertel v1 is an isolated photo-first shell', async () => {
  const response = await handleFreshVertelV1(new Request('https://example.test/fresh'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-talera-fresh-vertel'), FRESH_VERTEL_REV);
  const html = await response.text();
  assert.match(html, /Titel van deze herinnering/);
  assert.match(html, /Wanneer was dit\?/);
  assert.match(html, /id="firstInput" type="file" accept="image\/\*" multiple/);
  assert.match(html, /id="addInput" type="file" accept="image\/\*" multiple/);
  assert.match(html, /id="mic" class="mic"/);
  assert.match(html, /Veeg omhoog voor je verhaal/);
  assert.match(html, /URL\.createObjectURL\(file\)/);
  assert.match(html, /pointerdown/);
  assert.match(html, /pointerup/);
  assert.doesNotMatch(html, /__taleraOptimizePhoto|__taleraPhotoStaging|orb-app-v79|workblad-v2|clean-story/);
});

test('fresh vertel v1 leaves all other routes alone', async () => {
  const response = await handleFreshVertelV1(new Request('https://example.test/clean'));
  assert.equal(response, null);
});
