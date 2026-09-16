import assert from 'node:assert/strict';
import test from 'node:test';
import { WORKBLAD_MANAGEMENT_COMPAT_SCRIPT } from '../xxory-test/src/workblad-management-compat.js';

test('visible photo buttons use direct native inputs with browser-displayable image formats', () => {
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /makeNativePhotoLabel/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /input\.type='file'/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /NATIVE_ACCEPT='image\/jpeg,image\/png,image\/webp'/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /input\.accept=NATIVE_ACCEPT/);
  assert.doesNotMatch(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /input\.accept='image\/\*'/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /input\.multiple=true/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /input\.style\.inset='0'/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /input\.style\.pointerEvents='auto'/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /source\.replaceWith\(label\)/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /api\.addPhotos\(files\)/);
});

test('selected iPhone files stay attached while background preparation is pending', () => {
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /result&&result\.pending/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /taleraSelectionHeld='1'/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /input\.addEventListener\('click'/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /input\.value=''/);
  const acceptStart = WORKBLAD_MANAGEMENT_COMPAT_SCRIPT.indexOf('async function acceptNativePhotoInput');
  const labelStart = WORKBLAD_MANAGEMENT_COMPAT_SCRIPT.indexOf('function makeNativePhotoLabel', acceptStart);
  const acceptBlock = WORKBLAD_MANAGEMENT_COMPAT_SCRIPT.slice(acceptStart, labelStart);
  assert.doesNotMatch(acceptBlock, /finally\s*\{[^}]*input\.value=''/s, 'successful pending selection must not be cleared in finally');
});

test('legacy hidden proxy input is disabled once native inputs are installed', () => {
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /legacy\.disabled=true/);
  assert.match(WORKBLAD_MANAGEMENT_COMPAT_SCRIPT, /data-talera-disabled-proxy/);
});
