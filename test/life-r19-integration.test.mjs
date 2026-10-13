import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const lifeHtml = read('../experiments/life-space/index.html');
const worker = read('../experiments/life-space/integration-worker.js');
const config = JSON.parse(read('../experiments/life-space/wrangler.integration.jsonc'));

const memoriesStart = lifeHtml.indexOf('const MEMORIES=') + 'const MEMORIES='.length;
const memoriesEnd = lifeHtml.indexOf(';', memoriesStart);
const lifeMemories = JSON.parse(lifeHtml.slice(memoriesStart, memoriesEnd));

const r19Html = Array.from({length:9}, (_,i) => {
  const file = read('../src/html/chunk'+(i+1)+'.js');
  const list = file.slice(file.indexOf('['), file.lastIndexOf(']')+1).replace(/,\s*\]$/,']');
  return JSON.parse(list).join('\n');
}).join('\n');

test('integration uses only the original 50 Life Space test memories', () => {
  assert.equal(lifeMemories.length, 50);
  assert.match(lifeHtml, /const TARGET_TOTAL_MEMORIES=50;/);
});

test('each Life Space memory maps exactly to the original r19h2 memory', () => {
  const matches = [...r19Html.matchAll(/\{id:(\d+),\s*at:"([^"]+)",\s*story:"((?:\\.|[^"\\])*)",\s*fullStory:"((?:\\.|[^"\\])*)",\s*image:"([^"]+)"/g)];
  assert.equal(matches.length, 50);
  const r19Memories = new Map(matches.map(m => [Number(m[1]), {
    at:m[2], story:m[3], image:m[5]
  }]));
  for(const m of lifeMemories) {
    const corresponding = r19Memories.get(m.id);
    assert.ok(corresponding, 'missing matching r19h2 memory '+m.id);
    assert.equal(m.at,corresponding.at, 'date mismatch: '+m.id);
    assert.equal(m.story,corresponding.story, 'story mismatch: '+m.id);
    assert.equal(m.image,corresponding.image, 'photo mismatch: '+m.id);
  }
});

test('combined prototype has its own Cloudflare worker name', () => {
  assert.equal(config.name, 'talera-life-r19-combined-dev');
  assert.equal(config.main, 'integration-worker.js');
  assert.ok(config.rules.some(r=>r.type==='Text'&&r.globs.includes('**/*.html')));
  // Do not attach the frozen r19 reference D1 and R2 data stores.
  assert.ok(!('d1_databases' in config));
  assert.ok(!('r2_buckets' in config));
});

test('integration routes the approved screens and blocks writes', () => {
  assert.match(worker, /import r19Worker from/);
  assert.match(worker, /import LIFE_HTML from/);
  assert.match(worker, /window\.openStorySmooth=function/);
  assert.match(worker, /runtime\.findMemory/);
  assert.match(worker, /runtime\.writeMemory/);
  assert.match(worker, /opslaan is nog niet aangesloten/);
  assert.match(worker, /path==='\/present'/);
});
