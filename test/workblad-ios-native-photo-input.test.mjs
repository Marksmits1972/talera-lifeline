import assert from 'node:assert/strict';
import test from 'node:test';
import { WORKBLAD_MANAGEMENT_COMPAT_SCRIPT } from '../xxory-test/src/workblad-management-compat.js';

test('visible photo buttons use real native file inputs instead of proxy clicks', () => {
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /makeNativePhotoLabel/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /input\.type='file'/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /input\.accept='image\/\*'/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /input\.multiple=true/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /input\.style\.inset='0'/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /input\.style\.pointerEvents='auto'/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /source\.replaceWith\(label\)/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /api\.addPhotos\(files\)/);
});

test('legacy hidden proxy input is disabled once native inputs are installed', () => {
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /legacy\.disabled=true/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /data-talera-disabled-proxy/);
});
