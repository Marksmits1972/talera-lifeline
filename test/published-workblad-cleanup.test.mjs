import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT } from '../xxory-test/src/workblad-v9-timeline-handoff.js';

const workerSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker.js', import.meta.url), 'utf8');

test('published workblad exposes a hard reset that clears old media and draft state', () => {
  assert.match(workerSource, /__taleraWorkbladV9ResetAfterPublish=async function/);
  assert.match(workerSource, /clearStateForNew\(\)/);
  assert.match(workerSource, /await draftClear\(\)/);
  assert.match(workerSource, /if\(renderFresh\)renderWorkblad\(\)/);
});

test('successful timeline publication drops pending media before the workblad can be reused', () => {
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /window\.__taleraPendingV9Photos = \[\]/);
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /window\.__taleraExpectedV9PhotoCount = 0/);
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /await resetPublishedWorkblad\(false\)/);
});

test('Safari back-forward restoration renders a fresh workblad instead of stale photos', () => {
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /event\.persisted && publishedMemoryId/);
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /resetPublishedWorkblad\(true\)/);
  assert.match(WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT, /window\.__taleraLastV9MemoryId = ''/);
});
