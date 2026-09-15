import assert from 'node:assert/strict';
import test from 'node:test';
import { WORKBLAD_V9_INTEGRATION_BRIDGE_SCRIPT } from '../xxory-test/src/workblad-v9-integration-bridge.js';
import { WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT } from '../xxory-test/src/workblad-v9-timeline-handoff.js';

test('saving stops at an explicit timeline action', () => {
  assert.match(WORKBLAD_V9_INTEGRATION_BRIDGE_SCRIPT, /Koppelen aan mijn tijdlijn/);
  assert.match(WORKBLAD_V9_INTEGRATION_BRIDGE_SCRIPT, /talera:v9-memory-saved/);
  assert.match(WORKBLAD_V9_INTEGRATION_BRIDGE_SCRIPT, /if \(btn\.dataset\.v9Saved === '1'\) return;/);
  assert.doesNotMatch(WORKBLAD_V9_INTEGRATION_BRIDGE_SCRIPT, /btn\.disabled = saved/);
});

test('timeline publication only starts from a deliberate button click', () => {
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /addEventListener\('click', onFinishClick, true\)/);
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /Open mijn tijdlijn/);
  assert.doesNotMatch(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /setInterval\(check/);
  assert.doesNotMatch(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /setTimeout\(\(\) => goToTimeline/);
});

test('long operations show a familiar progress spinner alongside the text', () => {
  assert.match(WORKBLAD_V9_INTEGRATION_BRIDGE_SCRIPT, /talera-v9-spinner/);
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /talera-v9-spinner/);
});
