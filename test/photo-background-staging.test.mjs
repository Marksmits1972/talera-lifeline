import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { WORKBLAD_PHOTO_STAGING_SCRIPT, WORKBLAD_PHOTO_STAGING_REARM_SCRIPT } from '../xxory-test/src/workblad-photo-staging.js';
import { handleV9StagedPhotoLink } from '../xxory-test/src/workblad-v9-staged-photo-link.js';
import worker from '../xxory-test/src/orb-app-v79-worker.js';

const workerSource = readFileSync(new URL('../xxory-test/src/orb-app-v79-worker.js', import.meta.url), 'utf8');

test('optimized photos start verified v9 staging without blocking selection', () => {
  assert.match(WORKBLAD_PHOTO_STAGING_SCRIPT, /window\.__taleraOptimizePhoto = async function/);
  assert.match(WORKBLAD_PHOTO_STAGING_SCRIPT, /stageQuietly\(result\)/);
  assert.match(WORKBLAD_PHOTO_STAGING_SCRIPT, /crypto\.subtle\.digest\('SHA-256'/);
  assert.match(WORKBLAD_PHOTO_STAGING_SCRIPT, /serverBlob\.size !== blob\.size/);
  assert.match(WORKBLAD_PHOTO_STAGING_SCRIPT, /serverSha !== localSha/);
});

test('final save reuses an already staged first photo and keeps normal upload fallback', () => {
  assert.match(WORKBLAD_PHOTO_STAGING_SCRIPT, /url\.pathname === '\/api\/v9\/photo'/);
  assert.match(WORKBLAD_PHOTO_STAGING_SCRIPT, /cache\.has\(photo\)/);
  assert.match(WORKBLAD_PHOTO_STAGING_SCRIPT, /return downstreamFetch\(input, init\)/);
});

test('extra photos use staged server linking before the proven raw upload fallback', () => {
  assert.match(WORKBLAD_PHOTO_STAGING_SCRIPT, /\/api\/v9\/staged-photo-link\//);
  assert.match(WORKBLAD_PHOTO_STAGING_SCRIPT, /\/api\\\/stories\\\/\(\[\^\/\]\+\)\\\/media/);
  assert.match(WORKBLAD_PHOTO_STAGING_REARM_SCRIPT, /rearmFetch/);

  const core = workerSource.indexOf('WORKBLAD_PHOTO_STAGING_SCRIPT+WORKBLAD_V2_EXPOSED_SCRIPT');
  const rearm = workerSource.indexOf('WORKBLAD_RAW_STORAGE_BRIDGE_SCRIPT+WORKBLAD_PHOTO_STAGING_REARM_SCRIPT');
  assert.ok(core >= 0, 'staging must wrap fetch before the v9 bridge captures it');
  assert.ok(rearm >= 0, 'staging must be re-armed outside the raw-storage fallback');
});

test('staged-photo linking is authorization protected', async () => {
  const request = new Request('https://example.test/api/v9/staged-photo-link/story_1234567890/photo_12345678901234567890', { method:'POST' });
  const response = await handleV9StagedPhotoLink(request, { DB:{}, MEDIA:{} });
  assert.equal(response.status, 401);
  const data = await response.json();
  assert.match(data.error, /autorisatie/i);
});

test('workblad worker remains importable with staging injected', () => {
  assert.equal(typeof worker.fetch, 'function');
});
