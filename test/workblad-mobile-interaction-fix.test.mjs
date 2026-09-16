import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const fixSource = readFileSync(new URL('../xxory-test/src/workblad-mobile-interaction-fix.js', import.meta.url), 'utf8');
const wrapperSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker-timeline-publish.js', import.meta.url), 'utf8');

test('mobile interaction guard restores the real workblad hit plane', () => {
  assert.match(fixSource, /talera-workblad-interaction-ready/);
  assert.match(fixSource, /\.work-title/);
  assert.match(fixSource, /\.work-date/);
  assert.match(fixSource, /\.work-photo/);
  assert.match(fixSource, /\.work-story/);
  assert.match(fixSource, /\.work-finish/);
  assert.match(fixSource, /pointer-events:auto!important/);
  assert.match(fixSource, /touch-action:manipulation!important/);
  assert.match(fixSource, /user-select:text!important/);
});

test('interaction guard yields to save, voice, date and management overlays', () => {
  assert.match(fixSource, /\.work-saving/);
  assert.match(fixSource, /\.voice-layer/);
  assert.match(fixSource, /\.talera-date-choice-backdrop/);
  assert.match(fixSource, /\.talera-manage-backdrop/);
  assert.match(fixSource, /!blocked/);
});

test('wrapper ships the interaction fix after the polished test page', () => {
  assert.match(wrapperSource, /WORKBLAD_MOBILE_INTERACTION_FIX_STYLE/);
  assert.match(wrapperSource, /WORKBLAD_POLISHED_TEST_PAGE_STYLE \+ WORKBLAD_MOBILE_INTERACTION_FIX_STYLE/);
  assert.match(wrapperSource, /WORKBLAD_POLISHED_TEST_PAGE_SCRIPT \+\s*WORKBLAD_MOBILE_INTERACTION_FIX_SCRIPT/);
  assert.match(wrapperSource, /mobileInteractionFix: true/);
});
