import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const tvPath = fileURLToPath(new URL('../xxory-test/src/tv-player.js', import.meta.url));
const routerPath = fileURLToPath(new URL('../xxory-test/src/clean-router-worker.js', import.meta.url));
const tvSource = readFileSync(tvPath, 'utf8');
const routerSource = readFileSync(routerPath, 'utf8');

test('TV Player source parses as Cloudflare-compatible JavaScript', () => {
  const result = spawnSync(process.execPath, ['--check', tvPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout || 'TV Player syntax check failed');
});

test('TV Player is wired before the legacy router fallback', () => {
  assert.match(routerSource, /import \{ handleTVPlayer \} from '\.\/tv-player\.js';/);
  const tvIndex = routerSource.indexOf('await handleTVPlayer(request, env)');
  const legacyIndex = routerSource.indexOf('return legacyWorker.fetch(request, env, ctx)');
  assert.ok(tvIndex >= 0, 'TV Player handler is not called');
  assert.ok(legacyIndex > tvIndex, 'TV Player must run before the legacy fallback');
});

test('TV Player exposes desktop route, secure pairing and controller commands', () => {
  assert.match(tvSource, /url\.pathname === '\/tv'/);
  assert.match(tvSource, /url\.pathname === '\/tv\/pair'/);
  assert.match(tvSource, /url\.pathname === '\/api\/tv\/session'/);
  assert.match(tvSource, /\/pair\$/);
  assert.match(tvSource, /\/command\$/);
  assert.match(tvSource, /pair_token_hash TEXT NOT NULL/);
  assert.match(tvSource, /player_token_hash TEXT NOT NULL/);
  assert.match(tvSource, /controller_token_hash TEXT/);
  assert.match(tvSource, /await sha256\(pairToken\)/);
  assert.match(tvSource, /await sha256\(playerToken\)/);
  assert.match(tvSource, /authorization:'Bearer '/);
});

test('TV Player keeps QR pairing local to the browser', () => {
  assert.match(tvSource, /qrcodejs\/1\.0\.0\/qrcode\.min\.js/);
  assert.match(tvSource, /new QRCode\(qr,\{text:url/);
  assert.doesNotMatch(tvSource, /api\.qrserver\.com|quickchart\.io\/qr|chart\.googleapis\.com/);
});
