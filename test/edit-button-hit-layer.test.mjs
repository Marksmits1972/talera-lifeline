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
  const desktop = timelineStyleSource.match(/\.talera-memory-edit\{([^}]*)\}/s)?.[1] || '';
  assert.match(desktop, /right:20px!important/);
  assert.match(desktop, /top:auto!important/);
  assert.match(desktop, /bottom:220px!important/);
  assert.match(desktop, /width:46px!important/);
  assert.match(desktop, /height:46px!important/);
  const mobile = timelineStyleSource.match(/@media\(max-width:430px\)\{\s*\.talera-memory-edit\{([^}]*)\}/s)?.[1] || '';
  assert.match(mobile, /right:18px!important/);
  assert.match(mobile, /bottom:220px!important/);
  assert.match(mobile, /width:44px!important/);
  assert.match(mobile, /height:44px!important/);
  assert.match(controlsSource, /\.talera-memory-tools\{[^}]*pointer-events:none/);
  assert.match(controlsSource, /\.talera-memory-tool\{[^}]*pointer-events:auto/);
  assert.match(controlsSource, /editButton\.addEventListener\('click'/);
});
