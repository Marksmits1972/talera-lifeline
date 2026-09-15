import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { WORKBLAD_V9_INTEGRATION_BRIDGE_SCRIPT } from '../xxory-test/src/workblad-v9-integration-bridge.js';
import { WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT } from '../xxory-test/src/workblad-v9-timeline-handoff.js';

const publishSource = readFileSync(new URL('../xxory-test/src/workblad-v9-timeline-publish.js', import.meta.url), 'utf8');

test('the deliberate final action continues from safe save into timeline coupling', () => {
  assert.match(WORKBLAD_V9_INTEGRATION_BRIDGE_SCRIPT, /talera:v9-memory-saved/);
  assert.match(WORKBLAD_V9_INTEGRATION_BRIDGE_SCRIPT, /We zetten hem nu op je tijdlijn/);
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /publish\(memoryId\)/);
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /await goToTimeline\(data\.handoffUrl\)/);
  assert.doesNotMatch(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /Open mijn tijdlijn/);
});

test('a failed publish is retried with the same coupling button instead of a second screen', () => {
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /Tik nogmaals op Koppelen/);
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /readyMemoryId/);
  assert.doesNotMatch(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /addRetryButton/);
});

test('edit mode returns to presentation from one click after the proven save path succeeds', () => {
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /Naar presentatie/);
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /originalHandler\.call\(btn\)/);
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /document\.querySelector\('\.work-saved-sheet'\)/);
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /\?handoff=1#story=/);
});

test('long operations retain a familiar progress spinner', () => {
  assert.match(WORKBLAD_V9_INTEGRATION_BRIDGE_SCRIPT, /talera-v9-spinner/);
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /talera-v9-spinner/);
});

test('timeline publication uses a targeted first-frame handoff URL', () => {
  assert.match(publishSource, /\?handoff=1#story=/);
});
