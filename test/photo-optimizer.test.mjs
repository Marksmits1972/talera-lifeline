import assert from 'node:assert/strict';
import test from 'node:test';
import { WORKBLAD_PHOTO_OPTIMIZER_SCRIPT } from '../xxory-test/src/workblad-photo-optimizer.js';
import { WORKBLAD_V2_SCRIPT } from '../xxory-test/src/workblad-v2-client.js';
import { WORKBLAD_V9_INTEGRATION_BRIDGE_SCRIPT } from '../xxory-test/src/workblad-v9-integration-bridge.js';
import worker from '../xxory-test/src/orb-app-v79-worker.js';

test('photo policy keeps a 4K long edge without enlarging smaller photos', () => {
  assert.match(WORKBLAD_PHOTO_OPTIMIZER_SCRIPT, /MAX_LONG_EDGE = 3840/);
  assert.match(WORKBLAD_PHOTO_OPTIMIZER_SCRIPT, /Math\.min\(1, MAX_LONG_EDGE \/ longEdge\)/);
});

test('photo policy produces an adaptive JPEG around the agreed storage target', () => {
  assert.match(WORKBLAD_PHOTO_OPTIMIZER_SCRIPT, /image\/jpeg/);
  assert.match(WORKBLAD_PHOTO_OPTIMIZER_SCRIPT, /JPEG_QUALITIES = \[0\.86, 0\.82, 0\.78, 0\.74\]/);
  assert.match(WORKBLAD_PHOTO_OPTIMIZER_SCRIPT, /TARGET_BYTES = 3\.2 \* 1024 \* 1024/);
});

test('both selection and the proven v9 save path optimize photos', () => {
  assert.match(WORKBLAD_V2_SCRIPT, /await window\.__taleraOptimizePhoto\(source\)/);
  assert.match(WORKBLAD_V9_INTEGRATION_BRIDGE_SCRIPT, /await window\.__taleraOptimizePhoto\(source\)/);
});

test('worker can still be imported after optimizer injection', () => {
  assert.equal(typeof worker.fetch, 'function');
});
