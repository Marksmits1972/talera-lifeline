import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { WORKBLAD_UNIFIED_EXPERIENCE_STYLE } from '../xxory-test/src/workblad-unified-experience.js';

const workerSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker.js', import.meta.url), 'utf8');
const wrapperSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker-timeline-publish.js', import.meta.url), 'utf8');

test('/v9 renders the full workblad instead of the retired technical V9 form', () => {
  assert.match(workerSource, /incomingUrl\.pathname==='\/v9'/);
  assert.match(workerSource, /incomingUrl\.pathname='\/'/);
  assert.match(workerSource, /canonicalWorkbladRoute:'\/v9'/);
  assert.match(workerSource, /technicalV9FormRetired:true/);
});

test('the unified TALERA visual layer is loaded after the existing workblad layers', () => {
  assert.match(workerSource, /WORKBLAD_UNIFIED_EXPERIENCE_STYLE/);
  assert.match(workerSource, /WORKBLAD_DATE_FLOW_STYLE\+WORKBLAD_UNIFIED_EXPERIENCE_STYLE/);
  assert.match(WORKBLAD_UNIFIED_EXPERIENCE_STYLE, /\.work-sheet\{/);
  assert.match(WORKBLAD_UNIFIED_EXPERIENCE_STYLE, /background:transparent!important/);
  assert.match(WORKBLAD_UNIFIED_EXPERIENCE_STYLE, /\.work-photo,\n\.work-photo\.has-photo/);
  assert.match(WORKBLAD_UNIFIED_EXPERIENCE_STYLE, /min-height:clamp\(250px,40dvh,390px\)/);
  assert.match(WORKBLAD_UNIFIED_EXPERIENCE_STYLE, /\.work-actions::before/);
  assert.match(WORKBLAD_UNIFIED_EXPERIENCE_STYLE, /backdrop-filter:blur\(16px\) saturate\(1\.08\)/);
});

test('timeline publish and one-click handoff remain active on /v9', () => {
  assert.match(wrapperSource, /url\.pathname === '\/v9'/);
  assert.match(wrapperSource, /WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT/);
  assert.match(wrapperSource, /canonicalWorkbladRoute: '\/v9'/);
});
