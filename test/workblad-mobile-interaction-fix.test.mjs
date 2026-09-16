import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const storytellingSource = readFileSync(new URL('../xxory-test/src/workblad-storytelling-page.js', import.meta.url), 'utf8');
const wrapperSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker-timeline-publish.js', import.meta.url), 'utf8');

test('new storytelling shell owns the mobile hit plane directly', () => {
  assert.match(storytellingSource, /\.talera-storytelling-shell/);
  assert.match(storytellingSource, /\.talera-storytelling-mic/);
  assert.match(storytellingSource, /\.talera-storytelling-finish/);
  assert.match(storytellingSource, /pointer-events:auto/);
  assert.match(storytellingSource, /touch-action:pan-y/);
});

test('old engine stays mounted offscreen only as the proven functional engine', () => {
  assert.match(storytellingSource, /left:-10000px!important/);
  assert.match(storytellingSource, /> \.work-scroll/);
  assert.match(storytellingSource, /> \.work-actions/);
  assert.match(storytellingSource, /opacity:\.001!important/);
});

test('recording controls yield touch to the photo except for explicit recording controls', () => {
  assert.match(storytellingSource, /\.voice-layer\{/);
  assert.match(storytellingSource, /pointer-events:none!important/);
  assert.match(storytellingSource, /\.voice-bottom/);
  assert.match(storytellingSource, /pointer-events:auto!important/);
});

test('wrapper no longer injects the temporary mobile interaction patch', () => {
  assert.doesNotMatch(wrapperSource, /WORKBLAD_MOBILE_INTERACTION_FIX_STYLE/);
  assert.doesNotMatch(wrapperSource, /WORKBLAD_MOBILE_INTERACTION_FIX_SCRIPT/);
  assert.match(wrapperSource, /WORKBLAD_STORYTELLING_PAGE_STYLE/);
});
