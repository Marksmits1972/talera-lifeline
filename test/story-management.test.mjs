import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const managementSource = readFileSync(new URL('../xxory-test/src/workblad-story-management.js', import.meta.url), 'utf8');
const wrapperSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker-timeline-publish.js', import.meta.url), 'utf8');
const integrationSource = readFileSync(new URL('../xxory-test/src/workblad-integration-api.js', import.meta.url), 'utf8');
const controlsSource = readFileSync(new URL('../src/memory-presentation-controls.js', import.meta.url), 'utf8');

test('whole-story delete stays authenticated and recoverable on the server', () => {
  assert.match(managementSource, /request\.method !== 'DELETE'/);
  assert.match(managementSource, /manage_token_hash/);
  assert.match(managementSource, /sha256Text\(token\)/);
  assert.match(managementSource, /SET status = 'deleted', updated_at = \?/);
  assert.match(managementSource, /softDeleted:true/);
  assert.doesNotMatch(managementSource, /env\.MEDIA\.delete/);
});

test('deleted stories are rejected by the private story reader', () => {
  assert.match(integrationSource, /row\.status === 'deleted'/);
  assert.match(integrationSource, /Verhaal niet gevonden/);
});

test('timeline pencil opens one simple management menu before leaving the timeline', () => {
  assert.match(controlsSource, /talera-memory-manager/);
  assert.match(controlsSource, /Herinnering bewerken/);
  assert.match(controlsSource, /Foto’s beheren/);
  assert.match(controlsSource, /Herinnering verwijderen/);
  assert.match(controlsSource, /editButton\.addEventListener\('click',[^\n]*openManager/);
  assert.match(controlsSource, /navigateManage\('photos'\)/);
  assert.match(controlsSource, /navigateManage\('delete-now'\)/);
});

test('workblad removal uses undo instead of browser confirmation dialogs', () => {
  assert.match(managementSource, /Ongedaan maken/);
  assert.match(managementSource, /UNDO_MS=4600/);
  assert.match(managementSource, /stageStoryDelete/);
  assert.match(managementSource, /stagePhotoDelete/);
  assert.match(managementSource, /mode==='delete-now'/);
  assert.match(managementSource, /Wijzigingen opslaan/);
  assert.doesNotMatch(managementSource, /\bconfirm\s*\(/);
  assert.doesNotMatch(managementSource, /\balert\s*\(/);
  assert.doesNotMatch(managementSource, /location\.reload\s*\(/);
});

test('photo management stays on the same screen and commits only after the undo window', () => {
  assert.match(managementSource, /Verwijder foto/);
  assert.match(managementSource, /talera-manage-photo-remove/);
  assert.match(managementSource, /setTimeout\(\(\)=>\{if\(cancelled\)return;marker\.remove\(\);commitPhotoDelete/);
  assert.match(managementSource, /row\.classList\.add\('is-removing'\)/);
  assert.match(wrapperSource, /handleStoryPhotoCleanup/);
  assert.doesNotMatch(wrapperSource, /WORKBLAD_STORY_PHOTO_CLEANUP_SCRIPT/);
  assert.match(wrapperSource, /WORKBLAD_STORY_MANAGEMENT_SCRIPT/);
});
