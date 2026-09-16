import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  WORKBLAD_STORYTELLING_PAGE_REV,
  WORKBLAD_STORYTELLING_PAGE_STYLE,
  WORKBLAD_STORYTELLING_PAGE_SCRIPT
} from '../xxory-test/src/workblad-storytelling-page.js';

const wrapperSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker-timeline-publish.js', import.meta.url), 'utf8');

test('storytelling workblad makes the photo the memory anchor', () => {
  assert.equal(WORKBLAD_STORYTELLING_PAGE_REV, 'workblad-storytelling-photo-first-20260916-r1');
  assert.match(WORKBLAD_STORYTELLING_PAGE_STYLE, /height:clamp\(340px,52dvh,560px\)/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_STYLE, /object-fit:contain/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /Voeg een foto toe die je helpt herinneren/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /talera-storytelling-dots/);
});

test('photo-by-photo swipe stays inside the same storytelling shell', () => {
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /pointerdown/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /pointermove/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /pointerup/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /touchstart/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /activePhotoIndex \+ 1/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /activePhotoIndex - 1/);
});

test('storytelling page uses a simple microphone and keeps the photo visible while recording', () => {
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /taleraStoryMic/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /startVoice/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_STYLE, /\.voice-layer \.core-wrap/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_STYLE, /display:none!important/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_STYLE, /pointer-events:none!important/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /de foto blijft gewoon zichtbaar/);
});

test('story text comes before supporting title and date metadata', () => {
  const storyAt = WORKBLAD_STORYTELLING_PAGE_SCRIPT.indexOf('id="taleraStoryText"');
  const metaAt = WORKBLAD_STORYTELLING_PAGE_SCRIPT.indexOf('id="taleraStoryMeta"');
  assert.ok(storyAt >= 0);
  assert.ok(metaAt > storyAt);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /Geef deze herinnering een titel/);
  assert.match(WORKBLAD_STORYTELLING_PAGE_SCRIPT, /Wanneer was dit\?/);
});

test('wrapper ships the new storytelling shell instead of the polished form layer', () => {
  assert.match(wrapperSource, /WORKBLAD_STORYTELLING_PAGE_STYLE/);
  assert.match(wrapperSource, /WORKBLAD_STORYTELLING_PAGE_SCRIPT/);
  assert.match(wrapperSource, /storytellingWorkblad: true/);
  assert.match(wrapperSource, /workbladOrbVisible: false/);
  assert.match(wrapperSource, /photoSwipeWhileTelling: true/);
  assert.doesNotMatch(wrapperSource, /WORKBLAD_POLISHED_TEST_PAGE_STYLE/);
  assert.doesNotMatch(wrapperSource, /WORKBLAD_MOBILE_INTERACTION_FIX_STYLE/);
});
