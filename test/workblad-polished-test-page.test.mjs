import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  WORKBLAD_POLISHED_TEST_PAGE_REV,
  WORKBLAD_POLISHED_TEST_PAGE_STYLE,
  WORKBLAD_POLISHED_TEST_PAGE_SCRIPT
} from '../xxory-test/src/workblad-polished-test-page.js';

const wrapperSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker-timeline-publish.js', import.meta.url), 'utf8');

test('polished workblad keeps photo as a large memory anchor', () => {
  assert.equal(WORKBLAD_POLISHED_TEST_PAGE_REV, 'workblad-polished-photo-first-20260916-r1');
  assert.match(WORKBLAD_POLISHED_TEST_PAGE_STYLE, /height:clamp\(290px,43dvh,440px\)/);
  assert.match(WORKBLAD_POLISHED_TEST_PAGE_STYLE, /object-fit:contain!important/);
  assert.match(WORKBLAD_POLISHED_TEST_PAGE_STYLE, /talera-photo-swipe-hint/);
  assert.match(WORKBLAD_POLISHED_TEST_PAGE_STYLE, /Veeg|photo-dots/i);
});

test('polished workblad supports photo-by-photo swipe without leaving the memory', () => {
  assert.match(WORKBLAD_POLISHED_TEST_PAGE_SCRIPT, /__taleraWorkbladV9Read/);
  assert.match(WORKBLAD_POLISHED_TEST_PAGE_SCRIPT, /pointerdown/);
  assert.match(WORKBLAD_POLISHED_TEST_PAGE_SCRIPT, /pointermove/);
  assert.match(WORKBLAD_POLISHED_TEST_PAGE_SCRIPT, /pointerup/);
  assert.match(WORKBLAD_POLISHED_TEST_PAGE_SCRIPT, /activePhotoIndex \+ 1/);
  assert.match(WORKBLAD_POLISHED_TEST_PAGE_SCRIPT, /activePhotoIndex - 1/);
  assert.doesNotMatch(WORKBLAD_POLISHED_TEST_PAGE_SCRIPT, /location\.href\s*=|window\.location\s*=/);
});

test('voice tool and timeline coupling share one calm command dock', () => {
  assert.match(WORKBLAD_POLISHED_TEST_PAGE_SCRIPT, /moveVoiceToDock/);
  assert.match(WORKBLAD_POLISHED_TEST_PAGE_STYLE, /grid-template-columns:minmax\(0,\.82fr\) minmax\(0,1\.18fr\)/);
  assert.match(WORKBLAD_POLISHED_TEST_PAGE_STYLE, /\.work-tool\.voice::before/);
  assert.match(WORKBLAD_POLISHED_TEST_PAGE_STYLE, /\.work-finish/);
});

test('wrapper injects polished layer without replacing timeline handoff or management bridges', () => {
  assert.match(wrapperSource, /WORKBLAD_POLISHED_TEST_PAGE_STYLE/);
  assert.match(wrapperSource, /WORKBLAD_POLISHED_TEST_PAGE_SCRIPT/);
  assert.match(wrapperSource, /WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT/);
  assert.match(wrapperSource, /WORKBLAD_MANAGEMENT_COMPAT_SCRIPT/);
  assert.match(wrapperSource, /WORKBLAD_STORY_MANAGEMENT_SCRIPT/);
  assert.match(wrapperSource, /polishedWorkbladTestPage: true/);
  assert.match(wrapperSource, /photoSwipeWhileTelling: true/);
});
