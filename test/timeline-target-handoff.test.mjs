import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { liveMemoryIntegrationScript, liveMemoryIntegrationStyle } from '../src/live-memory-integration.js';

const indexSource = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');

test('handoff requests hide the existing timeline before first paint', () => {
  assert.match(indexSource, /talera-handoff-boot/);
  assert.match(indexSource, /taleraHandoffGate/);
  assert.match(indexSource, /handoff.*!== '1'/s);
  assert.match(indexSource, /visibility:hidden!important/);
});

test('the requested memory is registered and focused before its photos finish loading', () => {
  assert.match(liveMemoryIntegrationScript, /async function landTargetFirst/);
  assert.match(liveMemoryIntegrationScript, /toTimelineMemory\(detail,\[\],token,items\.length>0\)/);
  assert.match(liveMemoryIntegrationScript, /runtime\.registerMemory\(memory\);\s*runtime\.setCenter\(memory\.ms\);\s*runtime\.writeMemory\(memory\);/s);
  assert.match(liveMemoryIntegrationScript, /finishHandoff\(\);\s*\n\s*if\(items\.length\)/s);
});

test('older linked memories load only after the target has landed', () => {
  assert.match(liveMemoryIntegrationScript, /await landTargetFirst\(landingStoryId,creds\[landingStoryId\]\);\s*\n\s*loadOtherMemoriesInBackground/s);
  assert.match(liveMemoryIntegrationScript, /filter\(id=>id!==skipStoryId\)/);
});

test('photo delay is represented inside the target memory instead of showing another story', () => {
  assert.match(liveMemoryIntegrationStyle, /talera-live-loading/);
  assert.match(liveMemoryIntegrationScript, /Foto wordt geladen/);
  assert.match(liveMemoryIntegrationScript, /_photoLoading:Boolean\(photoLoading\)/);
});
