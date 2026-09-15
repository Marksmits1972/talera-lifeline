import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const managementSource = readFileSync(new URL('../xxory-test/src/workblad-story-management.js', import.meta.url), 'utf8');
const wrapperSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker-timeline-publish.js', import.meta.url), 'utf8');
const integrationSource = readFileSync(new URL('../xxory-test/src/workblad-integration-api.js', import.meta.url), 'utf8');

test('whole-story delete is authenticated and recoverable soft-delete', () => {
  assert.match(managementSource, /request\.method !== 'DELETE'/);
  assert.match(managementSource, /manage_token_hash/);
  assert.match(managementSource, /sha256Text\(token\)/);
  assert.match(managementSource, /SET status = 'deleted', updated_at = \?/);
  assert.match(managementSource, /softDeleted:true/);
  assert.doesNotMatch(managementSource, /env\.MEDIA\.delete/);
});

test('deleted stories are already rejected by the private story reader', () => {
  assert.match(integrationSource, /row\.status === 'deleted'/);
  assert.match(integrationSource, /Verhaal niet gevonden/);
});

test('edit mode exposes large direct management actions instead of the tiny cleanup panel', () => {
  assert.match(managementSource, /Foto’s beheren/);
  assert.match(managementSource, /Verwijder herinnering/);
  assert.match(managementSource, /min-height:46px/);
  assert.match(managementSource, /talera-delete-confirm/);
  assert.match(managementSource, /Wijzigingen opslaan/);
  assert.doesNotMatch(managementSource, /confirm\(/);
});

test('photo cleanup stays available through the proven authenticated API but old tiny injected UI is removed', () => {
  assert.match(managementSource, /\/api\/v9\/story-photo\//);
  assert.match(managementSource, /Verwijder foto/);
  assert.match(managementSource, /min-height:46px/);
  assert.match(wrapperSource, /handleStoryPhotoCleanup/);
  assert.doesNotMatch(wrapperSource, /WORKBLAD_STORY_PHOTO_CLEANUP_SCRIPT/);
  assert.match(wrapperSource, /WORKBLAD_STORY_MANAGEMENT_SCRIPT/);
});
