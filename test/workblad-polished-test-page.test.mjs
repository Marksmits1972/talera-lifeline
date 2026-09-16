import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  WORKBLAD_STORYTELLING_PAGE_REV,
  WORKBLAD_STORYTELLING_PAGE_STYLE,
  WORKBLAD_STORYTELLING_PAGE_SCRIPT
} from '../xxory-test/src/workblad-storytelling-page.js';

const wrapperSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker-timeline-publish.js', import.meta.url), 'utf8');

test('tell page is presentation-like with photo as full visual canvas', () => {
  assert.equal(WORKBLAD_STORYTELLING_PAGE_REV, 'workblad-presentation-like-tell-20260916-r2');
  assert.match(WORKBLAD_STORYTELLING_PAGE_STYLE, /\.talera-storytelling-visual\{/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_STYLE, /inset:0/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_STYLE, /object-fit:contain/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /Kies een foto die je herinnering oproept/);
});

test('title and date live on top of the photo instead of below a form', () => {
  const topAt = WORKBLAD_STORYTELLING_PAGE_SCRIPT.indexOf('talera-storytelling-top');
  const titleAt = WORKBLAD_STORYTELLING_PAGE_SCRIPT.indexOf('id="taleraStoryTitle"');
  const dateAt = WORKBLAD_STORYTELLING_PAGE_SCRIPT.indexOf('id="taleraStoryDate"');
  const transcriptAt = WORKBLAD_STORYTELLING_PAGE_SCRIPT.indexOf('id="taleraStoryTranscript"');
  assert.ok(topAt >= 0);
  assert.ok(titleAt > topAt);
  assert.ok(dateAt > titleAt);
  assert.ok(transcriptAt > dateAt);
});

test('transcript is hidden by default and revealed vertically on request', () => {
  assert.match(WORKBLAD_STORYTELLING_PAGE_STYLE, /transform:translateY\(calc\(100% - 54px\)\)/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_STYLE, /\.talera-storytelling-transcript\.open\{transform:translateY\(0\)\}/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /openTranscript\(true\)/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /dy<0/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /dy>70/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /Tijdens vertellen blijft deze laag uit beeld/);
});

test('horizontal gesture changes photo while vertical gesture opens transcript', () => {
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /Math\.abs\(dy\)>56/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /Math\.abs\(dx\)>42/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /movePhoto\(dx<0\?1:-1\)/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /activePhotoIndex\+direction/);
});

test('simple microphone stays over the photo and ORB core remains hidden', () => {
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /id="taleraStoryMic"/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /startVoice/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_STYLE, /\.voice-layer \.core-wrap\{display:none!important\}/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /swipe gerust door je foto’s/);
});

test('visible shell owns a real image file input for Mobile Safari', () => {
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /id="taleraStoryPhotoInput" type="file" accept="image\/\*" multiple/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /input\.click\(\)/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /Array\.from\(input\.files\|\|\[\]\)/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /actions\(\)\.addPhotos/);
});

test('wrapper declares corrected visual contract without replacing target-first handoff', () => {
  assert.match(wrapperSource, /storytellingVisualModel: 'presentation-like-photo\+voice\+vertical-transcript'/);
  assert.match(wrapperSource, /transcriptHiddenByDefault: true/);
  assert.match(wrapperSource, /verticalTranscriptReveal: true/);
  assert.match(wrapperSource, /shellOwnedPhotoInput: true/);
  assert.match(wrapperSource, /WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT/);
  assert.match(wrapperSource, /photoSwipeWhileTelling: true/);
});
