import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const files = {
  unified: fileURLToPath(new URL('../xxory-test/src/unified-webapp.js', import.meta.url)),
  router: fileURLToPath(new URL('../xxory-test/src/clean-router-worker.js', import.meta.url)),
  v9Publish: fileURLToPath(new URL('../xxory-test/src/workblad-v9-timeline-publish.js', import.meta.url)),
  v9Handoff: fileURLToPath(new URL('../xxory-test/src/workblad-v9-timeline-handoff.js', import.meta.url)),
  nav: fileURLToPath(new URL('../xxory-test/src/workblad-universal-nav.js', import.meta.url)),
  live: fileURLToPath(new URL('../src/live-memory-integration.js', import.meta.url)),
  controls: fileURLToPath(new URL('../src/memory-presentation-controls.js', import.meta.url))
};

const source = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, readFileSync(path, 'utf8')]));

for (const [name, path] of Object.entries(files)) {
  test('phase 2/3 source parses: ' + name, () => {
    const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout || name + ' syntax check failed');
  });
}

test('unified webapp exposes app and timeline while router owns the current tell surface', () => {
  assert.match(source.unified, /url\.pathname === '\/app'/);
  assert.match(source.unified, /url\.pathname === '\/timeline'/);
  assert.match(source.router, /unifiedTellUrl\.pathname === '\/tell'/);
  assert.match(source.router, /rewritten\.pathname = '\/storylab-clean'/);
  assert.match(source.unified, /sameOriginLinkedMemoryApi: true/);
  assert.match(source.unified, /desktopPrimaryTimelinePresentation: true/);
  assert.match(source.unified, /phonePrimaryCreation: true/);
});

test('clean router gives unified webapp first chance before TV and legacy fallbacks', () => {
  assert.match(source.router, /handleUnifiedWebapp/);
  const unified = source.router.indexOf('await handleUnifiedWebapp');
  const tv = source.router.indexOf('await handleTVPlayer');
  const legacy = source.router.lastIndexOf('return legacyWorker.fetch');
  assert.ok(unified >= 0);
  assert.ok(tv > unified);
  assert.ok(legacy > tv);
});

test('new memory handoff remains on the same TALERA origin', () => {
  assert.match(source.router, /url\.origin\}\/timeline\?handoff=1/);
  assert.match(source.v9Publish, /origin\}\/timeline\?handoff=1/);
  assert.doesNotMatch(source.v9Publish, /talera-timeline-prototype\.mark-a39\.workers\.dev/);
});

test('workblad and timeline navigation use same-origin routes in unified mode', () => {
  assert.match(source.v9Handoff, /location\.origin \+ '\/timeline'/);
  assert.match(source.nav, /location\.origin\+'\/timeline'/);
  assert.match(source.live, /TELL_ROUTE=UNIFIED_TIMELINE\?'\/tell':'\/'/);
  assert.match(source.controls, /TELL_ROUTE=UNIFIED_TIMELINE\?'\/tell':'\/'/);
});

test('timeline linked-memory transport is local in unified webapp', () => {
  assert.match(source.unified, /pathname\.replace\(\/\^\\\/api\\\/linked\//);
  assert.match(source.unified, /'\/api\/integration'/);
  assert.match(source.unified, /x-talera-linked-mode', 'same-origin'/);
});

test('desktop timeline has responsive large-screen rules while tell stays phone-primary', () => {
  assert.match(source.unified, /@media \(min-width:900px\)/);
  assert.match(source.unified, /width:min\(1440px,100%\)/);
  assert.match(source.router, /tell-phone-primary-responsive/);
  assert.match(source.router, /rewritten\.pathname = '\/storylab-clean'/);
  assert.match(source.router, /editMode = unifiedTellUrl\.searchParams\.has\('edit'\)/);
  assert.match(source.unified, /timeline-desktop-responsive/);
});

test('StoryLab Clean receives timeline date context for new memories', () => {
  const storylab = readFileSync(fileURLToPath(new URL('../xxory-test/src/storylab-clean-page.js', import.meta.url)), 'utf8');
  assert.match(storylab, /const requestedAt=/);
  assert.match(storylab, /const seededDate=!state\.date&&requestedAt/);
  assert.match(storylab, /if\(seededDate\)await saveState\(\)/);
});
