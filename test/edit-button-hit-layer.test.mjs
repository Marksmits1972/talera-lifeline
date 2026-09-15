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

test('edit action sits in the right-hand story action stack above share and audio', () => {
  assert.match(timelineStyleSource, /\.talera-memory-edit\{[^}]*right:20px!important;[^}]*top:auto!important;[^}]*bottom:220px!important;[^}]*width:46px!important;[^}]*height:46px!important;/s);
  assert.match(timelineStyleSource, /@media\(max-width:430px\)[\s\S]*\.talera-memory-edit\{[^}]*right:18px!important;[^}]*bottom:220px!important;[^}]*width:44px!important;[^}]*height:44px!important;/);
  assert.match(controlsSource, /\.talera-memory-tools\{[^}]*pointer-events:none/);
  assert.match(controlsSource, /\.talera-memory-tool\{[^}]*pointer-events:auto/);
  assert.match(controlsSource, /editButton\.addEventListener\('click'/);
});
