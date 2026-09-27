import test from 'node:test';
import assert from 'node:assert/strict';
import {
  audioExtensionForMime,
  cleanText,
  normalizeStoryInput,
  normalizeStoryPatch,
} from '../src/domain.js';


test('normalizeStoryInput requires title, date label and canonical eventAt', () => {
  const story = normalizeStoryInput({
    title: '  Eerste schooldag  ',
    eventTimeText: 'september 1987',
    eventAt: '1987-09-01T12:00:00Z',
    eventTimePrecision: 'month',
    storyText: '  Een mooie herinnering. ',
  });
  assert.equal(story.title, 'Eerste schooldag');
  assert.equal(story.eventAt, '1987-09-01T12:00:00.000Z');
  assert.equal(story.storyText, 'Een mooie herinnering.');
});

test('normalizeStoryPatch rejects empty updates', () => {
  assert.throws(() => normalizeStoryPatch({}), /geen wijzigingen/i);
});

test('cleanText limits user controlled text', () => {
  assert.equal(cleanText(' abcdef ', 3), 'abc');
});

test('iPhone friendly mp4 audio maps to m4a storage extension', () => {
  assert.equal(audioExtensionForMime('audio/mp4'), 'm4a');
});
