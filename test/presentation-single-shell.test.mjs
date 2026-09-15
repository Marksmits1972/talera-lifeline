import assert from 'node:assert/strict';
import test from 'node:test';
import { chunk1 } from '../src/html/chunk1.js';
import { chunk2 } from '../src/html/chunk2.js';
import { chunk3 } from '../src/html/chunk3.js';
import { chunk4 } from '../src/html/chunk4.js';
import { chunk5 } from '../src/html/chunk5.js';
import { chunk6 } from '../src/html/chunk6.js';
import { chunk7 } from '../src/html/chunk7.js';
import { chunk8 } from '../src/html/chunk8.js';
import { chunk9 } from '../src/html/chunk9.js';
import { presentationControllerScript } from '../src/presentation-controller.js';
import { shareExperienceScript } from '../src/share-experience.js';

const html = [
  ...chunk1,
  ...chunk2,
  ...chunk3,
  ...chunk4,
  ...chunk5,
  ...chunk6,
  ...chunk7,
  ...chunk8,
  ...chunk9,
].join('\n');

function occurrences(source, needle) {
  return source.split(needle).length - 1;
}

test('the presentation contains exactly one app shell', () => {
  assert.equal(occurrences(html, '<div class="app">'), 1);
  assert.equal(occurrences(html, '<section class="timeline"'), 1);
  assert.equal(occurrences(html, '<nav aria-label="TALERA navigatie">'), 1);
  assert.equal(occurrences(html, 'id="photoStage"'), 1);
  assert.equal(occurrences(html, 'id="memoryStoryScroll"'), 1);
});

test('enhancement scripts never create a second app, timeline or navigation shell', () => {
  const scripts = presentationControllerScript + '\n' + shareExperienceScript;
  assert.doesNotMatch(scripts, /createElement\(['"]nav['"]\)/);
  assert.doesNotMatch(scripts, /createElement\(['"](?:main|section)['"]\)[\s\S]{0,120}(?:app|timeline)/);
  assert.doesNotMatch(scripts, /querySelector\(['"]\.app['"]\)[\s\S]{0,120}cloneNode/);
});
