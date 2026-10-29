import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import test from 'node:test';
import worker from '../src/index.js';

/**
 * B107 — Parse the JavaScript actually assembled into the Worker HTML.
 * Parsing source modules alone misses syntax errors introduced by
 * interpolation, concatenation or inline HTML-script construction.
 * This is a syntax guard, NOT an iPhone/browser acceptance test.
 */
test('B107: generated page contains valid classic inline JavaScript', async () => {
  const request = new Request('https://talera.test/mijn-leven');
  const response = await worker.fetch(request, {});
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/html/i);

  const html = await response.text();
  assert.ok(html.includes('</html>'), 'Worker must return a complete HTML page');

  const scripts = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let matched = 0;
  let checked = 0;
  let match;

  while ((match = scripts.exec(html)) !== null) {
    matched += 1;
    const [, attributes, source] = match;
    // External scripts have separate source files. Module scripts need
    // module parsing and must not be misclassified as classic scripts.
    if (/\bsrc\s*=/i.test(attributes) || /\btype\s*=\s*["']?module\b/i.test(attributes)) continue;
    if (!source.trim()) continue;
    checked += 1;
    assert.doesNotThrow(
      () => new Script(source, { filename: `generated-page-inline-script-${matched}.js` }),
      `Generated inline script ${matched} contains invalid JavaScript`,
    );
  }

  assert.ok(checked > 0, 'No inline JavaScript was checked: inspect the generated HTML output');
});
