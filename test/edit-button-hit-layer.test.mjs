import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const timelineStyleSource = readFileSync(new URL('../src/timeline-glass-layer.js', import.meta.url), 'utf8');
const controlsSource = readFileSync(new URL('../src/memory-presentation-controls.js', import.meta.url), 'utf8');

function zIndex(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(escaped + '\\s*\\{[^}]*z-index:(\\d+)!important', 's'));
  return match ? Number(match[1]) : NaN;
}

test('memory action layer stays above the timeline hit surface', () => {
  const timelineZ = zIndex(timelineStyleSource, '.timeline');
  const toolsZ = zIndex(timelineStyleSource, '.talera-memory-tools');
  assert.ok(Number.isFinite(timelineZ), 'timeline z-index should be explicit');
  assert.ok(Number.isFinite(toolsZ), 'memory tools z-index override should be explicit');
  assert.ok(toolsZ > timelineZ, `memory tools (${toolsZ}) must be above timeline (${timelineZ})`);
});

test('only real memory buttons catch taps while the tools wrapper stays transparent', () => {
  assert.match(controlsSource, /\.talera-memory-tools\{[^}]*pointer-events:none/);
  assert.match(controlsSource, /\.talera-memory-tool\{[^}]*pointer-events:auto/);
  assert.match(controlsSource, /editButton\.addEventListener\('click'/);
});
