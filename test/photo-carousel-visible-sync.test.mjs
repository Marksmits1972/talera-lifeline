import assert from 'node:assert/strict';
import test from 'node:test';
import { liveMemoryIntegrationScript } from '../src/live-memory-integration.js';

test('carousel advances the visible photo together with the active dot', () => {
  assert.match(liveMemoryIntegrationScript, /memory\._photoIndex=\(\(index%count\)\+count\)%count/);
  assert.match(liveMemoryIntegrationScript, /memory\.image=memory\.photos\[memory\._photoIndex\]/);
  assert.match(liveMemoryIntegrationScript, /settleVisiblePhoto\(memory\)/);
  assert.match(liveMemoryIntegrationScript, /renderDots\(memory\)/);
});

test('visible photo surfaces are synchronized instead of leaving an old first frame above them', () => {
  assert.match(liveMemoryIntegrationScript, /function forceLayerPhoto\(layer,src,opacity\)/);
  assert.match(liveMemoryIntegrationScript, /layer\.querySelector\('\.photo-backdrop'\)/);
  assert.match(liveMemoryIntegrationScript, /layer\.querySelector\('\.photo-aligned-blur'\)/);
  assert.match(liveMemoryIntegrationScript, /layer\.querySelector\('\.example-photo'\)/);
  assert.match(liveMemoryIntegrationScript, /document\.getElementById\('photoLayerA'\),src,1/);
  assert.match(liveMemoryIntegrationScript, /document\.getElementById\('photoLayerB'\),src,0/);
});

test('only an already-visible swipe strip is synchronized; controller ownership stays intact', () => {
  assert.match(liveMemoryIntegrationScript, /document\.querySelector\('\.talera-photo-strip\.is-visible'\)/);
  assert.match(liveMemoryIntegrationScript, /querySelectorAll\('\.talera-photo-strip-page'\)/);
  assert.doesNotMatch(liveMemoryIntegrationScript, /stripVisible\s*=/);
  assert.doesNotMatch(liveMemoryIntegrationScript, /\.remove\(\).*talera-photo-strip/);
});
