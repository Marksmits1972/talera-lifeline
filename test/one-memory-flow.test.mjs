import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RecordingClock, CaptureTimeline, buildMemoryManifest, resolveFrame,
  OnePresentation, upgradeLegacyCues,
} from '../src/one-memory-flow.js';

const makeMedia = () => [
  ...Array.from({ length: 6 }, (_, i) => ({ mediaId: `photo-${i + 1}`, storageKey: `original/photo-${i + 1}`, type: 'photo' })),
  { mediaId: 'video-1', storageKey: 'original/video-1', type: 'video', videoDurationMs: 11000 },
  { mediaId: 'video-2', storageKey: 'original/video-2', type: 'video', videoDurationMs: 7000 },
];
const validate = { verifyMedia: async () => true, verifyAudio: async () => true };
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
const makeManifest = (overrides = {}) => buildMemoryManifest({
  memoryId: 'memory-one', media: makeMedia(), audio: { storageKey: 'original/myvoice' },
  narrationDurationMs: 20000,
  cues: [
    { mediaId: 'photo-1', audioTimeMs: 0 },
    { mediaId: 'photo-2', audioTimeMs: 6000 },
    { mediaId: 'photo-1', audioTimeMs: 9000 },
    { mediaId: 'video-1', audioTimeMs: 13000 },
  ],
  ...validate, ...overrides,
});
function audioStub() {
  return {
    currentTime: 0, ended: false, playing: false,
    async play() { this.playing = true; },
    pause() { this.playing = false; },
  };
}

test('one audio clock: completed swipes, revisits and pauses', () => {
  let now = 1000;
  const clock = new RecordingClock({ nowMs: () => now });
  const capture = new CaptureTimeline({ memoryId: 'memory-one', media: makeMedia(), clock });
  capture.start('photo-1');
  assert.deepEqual(capture.cues, [{ mediaId: 'photo-1', audioTimeMs: 0 }]);
  now += 6000;
  assert.equal(capture.confirmedVisible('photo-2'), true);
  assert.equal(capture.confirmedVisible('photo-2'), false);
  capture.pause();
  now += 9000;
  assert.equal(capture.confirmedVisible('photo-3'), false);
  capture.resume();
  now += 3000;
  capture.confirmedVisible('photo-1');
  now += 4000;
  capture.confirmedVisible('video-1');
  now += 7000;
  const done = capture.finish();
  assert.equal(done.measuredDurationMs, 20000);
  assert.deepEqual(done.cues.map(c => [c.audioTimeMs, c.mediaId]), [
    [0, 'photo-1'], [6000, 'photo-2'], [9000, 'photo-1'], [13000, 'video-1'],
  ]);
});

test('manifest keeps all 8 originals, finishes active video, and appends unseen items in order', async () => {
  const visited = [];
  const manifest = await makeManifest({ verifyMedia: async m => { visited.push(m.storageKey); return true; } });
  assert.equal(manifest.media.length, 8);
  assert.equal(new Set(manifest.media.map(m => m.storageKey)).size, 8);
  assert.equal(visited.length, 8);
  assert.deepEqual(manifest.tail, [
    { mediaId: 'video-1', startMs: 0, durationMs: 4000, videoStartMs: 7000 },
    { mediaId: 'photo-3', startMs: 4000, durationMs: 4000 },
    { mediaId: 'photo-4', startMs: 8000, durationMs: 4000 },
    { mediaId: 'photo-5', startMs: 12000, durationMs: 4000 },
    { mediaId: 'photo-6', startMs: 16000, durationMs: 4000 },
    { mediaId: 'video-2', startMs: 20000, durationMs: 7000, videoStartMs: 0 },
  ]);
  assert.equal(manifest.tailDurationMs, 27000);
  assert.equal(manifest.narrationDurationMs + manifest.tailDurationMs, 47000);
});

test('one continuous narration-to-tail timeline, including full muted video duration', async () => {
  const m = await makeManifest();
  assert.deepEqual([0, 5999, 6000, 8999, 9000, 12999, 13000, 19999, 20000, 23999, 24000, 43999, 46999, 47000]
    .map(t => [t, resolveFrame(m, t).mediaId, resolveFrame(m, t).segment]), [
    [0, 'photo-1', 'narration'], [5999, 'photo-1', 'narration'],
    [6000, 'photo-2', 'narration'], [8999, 'photo-2', 'narration'],
    [9000, 'photo-1', 'narration'], [12999, 'photo-1', 'narration'],
    [13000, 'video-1', 'narration'], [19999, 'video-1', 'narration'],
    [20000, 'video-1', 'tail'], [23999, 'video-1', 'tail'],
    [24000, 'photo-3', 'tail'], [43999, 'video-2', 'tail'],
    [46999, 'video-2', 'tail'], [47000, 'video-2', 'ended'],
  ]);
  assert.equal(resolveFrame(m, 19999).videoPositionMs, 6999);
  assert.equal(resolveFrame(m, 20000).videoPositionMs, 7000);
  assert.equal(resolveFrame(m, 23999).videoPositionMs, 10999);
});

test('last video that already finished is never duplicated', async () => {
  const m = await makeManifest({ cues: [{ mediaId: 'video-2', audioTimeMs: 0 }] });
  assert.equal(m.tail.some(t => t.mediaId === 'video-2'), false);
  assert.equal(m.tail.length, 7);
});

test('original media/audio missing or bad cue refuses publish', async () => {
  await assert.rejects(makeManifest({ verifyMedia: async m => m.mediaId !== 'photo-4' }), /Original media missing/);
  await assert.rejects(makeManifest({ verifyAudio: async () => false }), /Original audio missing/);
  await assert.rejects(makeManifest({ cues: [{ mediaId: 'ghost', audioTimeMs: 0 }] }), /absent media/);
  await assert.rejects(makeManifest({ cues: [{ mediaId: 'photo-1', audioTimeMs: 3000 }] }), /First cue/);
  await assert.rejects(makeManifest({ verifyMedia: undefined }), /verifyMedia/);
});

test('no audio means tail covers all media; no imaginary voice', async () => {
  const m = await buildMemoryManifest({ memoryId: 'silent', media: makeMedia(), audio: null, narrationDurationMs: 0, cues: [], verifyMedia: async () => true });
  assert.equal(m.tail.length, 8);
  assert.equal(resolveFrame(m, 0).mediaId, 'photo-1');
  assert.equal(resolveFrame(m, 0).segment, 'tail');
  assert.equal(resolveFrame(m, 24000).mediaId, 'video-1');
});

test('old index cues resolve once to stable media IDs', () => {
  assert.deepEqual(upgradeLegacyCues([{ t: 0, index: 0 }, { t: 2.5, index: 6 }], makeMedia()), [
    { audioTimeMs: 0, mediaId: 'photo-1' }, { audioTimeMs: 2500, mediaId: 'video-1' },
  ]);
  assert.throws(() => upgradeLegacyCues([{ t: 1, index: 9 }], makeMedia()), /absent media/);
});

test('dot follows actual painted item, never pending or stale load', async () => {
  const manifest = await makeManifest();
  const audio = audioStub();
  let now = 0;
  const painted = new Map();
  const dots = [];
  const p = new OnePresentation({
    manifest, audioElement: audio, nowMs: () => now,
    showMedia: id => new Promise(resolve => painted.set(id, resolve)),
    setIndicator: id => dots.push(id),
  });
  p.tick();
  await flush();
  assert.equal(p.state.visibleMediaId, null);
  assert.deepEqual(dots, []);
  p.seek(6000);
  await flush();
  assert.equal(p.state.visibleMediaId, null);
  painted.get('photo-1')('photo-1');
  await flush();
  assert.equal(p.state.visibleMediaId, null);
  painted.get('photo-2')('photo-2');
  await flush();
  assert.equal(p.state.visibleMediaId, 'photo-2');
  assert.deepEqual(dots, ['photo-2']);
});

test('audio finishes and tail continues in SAME presentation, video always muted', async () => {
  const manifest = await makeManifest();
  const audio = audioStub();
  let now = 1000;
  let finished = 0;
  const videoStates = [];
  const dots = [];
  const p = new OnePresentation({
    manifest, audioElement: audio, nowMs: () => now,
    showMedia: async id => id, setIndicator: id => dots.push(id),
    syncVideo: state => videoStates.push(state), onEnded: () => finished++,
  });
  await p.play();
  await flush();
  audio.currentTime = 13;
  p.tick();
  await flush();
  assert.equal(p.state.visibleMediaId, 'video-1');
  assert.ok(videoStates.some(s => s.mediaId === 'video-1' && s.muted === true && s.playing === true));
  audio.currentTime = 20;
  audio.ended = true;
  now += 20000;
  p.tick();
  await flush();
  assert.equal(p.state.segment, 'tail');
  assert.equal(p.state.playState, 'playing');
  assert.equal(p.state.positionMs, 20000);
  now += 4000;
  p.tick();
  await flush();
  assert.equal(p.state.visibleMediaId, 'photo-3');
  now += 23000;
  p.tick();
  assert.equal(p.state.segment, 'ended');
  assert.equal(p.state.playState, 'ended');
  assert.equal(finished, 1);
  p.seek(0);
  await flush();
  assert.equal(p.state.positionMs, 0);
  assert.equal(p.state.segment, 'narration');
  assert.equal(p.state.visibleMediaId, 'photo-1');
  assert.equal(dots.at(-1), 'photo-1');
});

test('load error keeps previous photo + dot; manual retry possible', async () => {
  const manifest = await makeManifest();
  const dots = [];
  let fail = true;
  const failures = [];
  const p = new OnePresentation({
    manifest, audioElement: audioStub(),
    showMedia: async id => { if (id === 'photo-2' && fail) throw new Error('missing image'); return id; },
    setIndicator: id => dots.push(id), onError: err => failures.push(err.message),
  });
  p.tick();
  await flush();
  p.seek(6000);
  await flush();
  assert.equal(p.state.visibleMediaId, 'photo-1');
  assert.deepEqual(dots, ['photo-1']);
  assert.deepEqual(failures, ['missing image']);
  fail = false;
  p.retryMedia();
  await flush();
  assert.equal(p.state.visibleMediaId, 'photo-2');
  assert.deepEqual(dots, ['photo-1', 'photo-2']);
});

test('autoplay denial remains paused and reports error', async () => {
  const manifest = await makeManifest();
  const audio = audioStub();
  audio.play = async () => { throw new Error('autoplay denied'); };
  const errors = [];
  const p = new OnePresentation({ manifest, audioElement: audio, showMedia: async id => id, onError: e => errors.push(e.message) });
  assert.equal(await p.play(), false);
  assert.equal(p.state.playState, 'paused');
  assert.deepEqual(errors, ['autoplay denied']);
});
