import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import existingWorker from '../src/timeline-polish-worker.js';
import stagingWorker, { isAnonymousShellRequest } from '../src/free-scale-worker.js';
import { anonymousFreeShell, shellBuildStats } from '../src/generated/free-scale-shell.mjs';

const report = JSON.parse(await readFile(resolve('dist/free-scale-test-manifest.json'), 'utf8'));
const originalResponse = await existingWorker.fetch(new Request('https://talera-free-build.invalid/'), {}, {});
const originalHtml = await originalResponse.text();

test('staging shell retains exact original markup and source order', async () => {
  let restored = anonymousFreeShell;
  for (const {originalTag, replacementTag} of report.entries) {
    assert.ok(restored.includes(replacementTag), 'Expected versioned reference');
    restored = restored.replace(replacementTag, originalTag);
  }
  assert.equal(restored, originalHtml);
  assert.ok(shellBuildStats.extractedAssets > 0);
  assert.ok(shellBuildStats.shellBytes < shellBuildStats.originalBytes);
});

test('fingerprinted files contain precisely the original bytes', async () => {
  for (const entry of report.entries) {
    assert.match(entry.asset, /^\/_talera_free_static\/[a-f0-9]{64}\.(?:js|css)$/);
    const content = await readFile(resolve('dist/free-scale-assets', '.' + entry.asset), 'utf8');
    assert.equal(content, entry.originalTag.replace(/^<(?:script|style)\b[^>]*>/i, '').replace(/<\/(?:script|style)\s*>$/i, ''));
  }
  const rules = await readFile(resolve('dist/free-scale-assets/_headers'), 'utf8');
  assert.match(rules, /max-age=31536000, immutable/);
});

test('private, query, invite, POST and non-root requests bypass the shared shell', () => {
  const root = 'https://talera.free.invalid/';
  assert.equal(isAnonymousShellRequest(new Request(root)), true);
  for (const url of [
    root+'?talera_invite=123',
    root+'?handoff=1',
    root+'?birthdate=1980-01-01',
    root+'mijn-leven',
    root+'api/linked/stories/x'
  ]) assert.equal(isAnonymousShellRequest(new Request(url)), false, url);
  for (const headers of [
    {authorization:'Bearer secret'},
    {cookie:'session=secret'},
    {range:'bytes=0-10'},
    {'if-none-match':'"abc"'}
  ]) assert.equal(isAnonymousShellRequest(new Request(root,{headers})), false);
  assert.equal(isAnonymousShellRequest(new Request(root,{method:'POST'})),false);
});

test('anonymous root serves smaller shell without shared HTML caching', async () => {
  const res = await stagingWorker.fetch(new Request('https://talera.free.invalid/'), {}, {});
  assert.equal(res.status, 200);
  assert.match(res.headers.get('cache-control'), /no-store/);
  assert.equal(res.headers.get('x-talera-free-scale'), 'anonymous-static-shell-staging');
  assert.equal(await res.text(), anonymousFreeShell);
});

test('personal and invitation links delegate to original Worker', async () => {
  for (const request of [
    new Request('https://talera.free.invalid/?handoff=1'),
    new Request('https://talera.free.invalid/',{headers:{cookie:'talera-session=abc'}})
  ]) {
    const result = await stagingWorker.fetch(request, {}, {});
    const baseline = await existingWorker.fetch(request, {}, {});
    assert.equal(result.headers.get('x-talera-free-scale'), null);
    assert.equal(result.headers.get('cache-control'), baseline.headers.get('cache-control'));
    assert.equal(await result.text(), await baseline.text());
  }
});