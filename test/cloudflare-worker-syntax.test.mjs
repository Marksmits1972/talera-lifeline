import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const targets = [
  '../xxory-test/src/workblad-story-management.js',
  '../xxory-test/src/orb-app-v79-worker-timeline-publish.js'
];

for (const target of targets) {
  test(`Cloudflare worker source parses: ${target}`, () => {
    const path = fileURLToPath(new URL(target, import.meta.url));
    const result = spawnSync(process.execPath, ['--check', path], { encoding:'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout || `Syntax check failed for ${target}`);
  });
}
