import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const timelineStyleSource = readFileSync(new URL('../src/timeline-glass-layer.js', import.meta.url), 'utf8');
const controlsSource = readFileSync(new URL('../src/memory-presentation-controls.js', import.meta.url), 'utf8');

test('timeline keeps its own uninterrupted interaction plane', () => {
  assert.match(timelineStyleSource, /\.timeline\{[^}]*z-index:20!important/s);
  assert.match(timelineStyleSource, /\.timeline::after\{[^}]*pointer-events:auto!important/s);
  assert.doesNotMatch(timelineStyleSource, /\.talera-memory-tools\{[^}]*z-index:24!important/s);
});

test('edit action is positioned down in the story plane instead of over the timeline edge', () => {
  assert.match(timelineStyleSource, /\.talera-memory-edit\{\s*top:72px!important;\s*\}/s);
  assert.match(timelineStyleSource, /@media\(max-width:430px\)[\s\S]*\.talera-memory-edit\{top:64px!important\}/);
  assert.match(controlsSource, /\.talera-memory-tools\{[^}]*pointer-events:none/);
  assert.match(controlsSource, /\.talera-memory-tool\{[^}]*pointer-events:auto/);
  assert.match(controlsSource, /editButton\.addEventListener\('click'/);
});
