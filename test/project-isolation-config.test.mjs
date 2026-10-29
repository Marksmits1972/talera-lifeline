import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const file = fileURLToPath(new URL('../wrangler.jsonc', import.meta.url));
const source = readFileSync(file, 'utf8');
const config = JSON.parse(source.replace(/^\s*\/\/.*$/gm, ''));

test('ISO-001 TALERA worker uses its own project name', () => {
  assert.match(config.name, /^talera-/i);
});

test('ISO-001 TALERA deployment contains no other brand references', () => {
  assert.doesNotMatch(source, /swimm(?:point)?/i);
});

test('ISO-001 R2 resources must be explicitly reviewed', () => {
  const external = (config.r2_buckets || []).filter(b => !/^talera-/i.test(b.bucket_name || ''));
  assert.deepEqual(external, [], 'Review cross-project R2 resources before a deployment');
});

test('ISO-001 D1 resources must be explicitly reviewed', () => {
  const external = (config.d1_databases || []).filter(d => !/^talera-/i.test(d.database_name || ''));
  assert.deepEqual(external, [], 'Review cross-project D1 resources before a deployment');
});
