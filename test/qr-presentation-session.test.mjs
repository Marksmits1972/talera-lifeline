import assert from 'node:assert/strict';
import test from 'node:test';
import { applyPresentationUpdate } from '../experiments/qr-server-pairing/src/presentation-session.js';
import { PairSession } from '../experiments/qr-server-pairing/src/worker.js';

const cursor = {
  seq: 1,
  storyId: 'abc_DEF-123',
  timestampMs: Date.UTC(1996, 1, 15),
  mediaIndex: 2,
  mode: 'photo',
  playback: 'paused'
};

test('reference-only presentation cursor has no uploaded content or bearer tokens', () => {
  const result = applyPresentationUpdate({ connected: true }, {
    ...cursor,
    title: 'PRIVATE STORY',
    mediaUrl: 'https://private.example/photo.jpg',
    bearerToken: 'PRIVATE TOKEN'
  });
  assert.equal(result.ok, true);
  assert.equal(result.session.presentation.storyId, 'abc_DEF-123');
  assert.equal(result.session.presentation.mediaIndex, 2);
  assert.equal(result.session.presentation.revision, 1);
  const stored = JSON.stringify(result.session);
  for (const secret of ['PRIVATE STORY', 'private.example', 'PRIVATE TOKEN']) {
    assert.equal(stored.includes(secret), false);
  }
});

test('out-of-order updates never move the screen backwards', () => {
  const first = applyPresentationUpdate({ connected: true }, cursor);
  const later = applyPresentationUpdate(first.session, { ...cursor, seq: 3, mediaIndex: 4 });
  const delayed = applyPresentationUpdate(later.session, { ...cursor, seq: 2, mediaIndex: 3 });
  assert.equal(delayed.ok, true);
  assert.equal(delayed.replayed, true);
  assert.equal(delayed.session.presentation.mediaIndex, 4);
  assert.equal(delayed.session.presentationVersion, 2);
});

test('reject malformed positions, unauthorized session state and malformed types', () => {
  for (const input of [
    { ...cursor, seq: -1 },
    { ...cursor, seq: 2.5 },
    { ...cursor, storyId: '../secret' },
    { ...cursor, mode: 'edit' },
    { ...cursor, playback: 'recording' },
    { ...cursor, timestampMs: '1996' },
    { ...cursor, mediaIndex: -1 },
    { ...cursor, mediaIndex: 1000 },
    { ...cursor, storyId: '' }
  ]) {
    assert.equal(applyPresentationUpdate({ connected: true }, input).status, 400);
  }
  assert.equal(applyPresentationUpdate({ connected: false }, cursor).status, 409);
  assert.equal(applyPresentationUpdate(null, cursor).status, 409);
  assert.equal(applyPresentationUpdate({ connected: true }, {
    ...cursor, storyId: '', mode: 'timeline'
  }).ok, true);
});

test('QR Player can read but only paired phone can change a real-memory cursor', async () => {
  const storage = new Map();
  const pair = new PairSession({ storage: {
    get: async key => storage.get(key),
    put: async (key, value) => { storage.set(key, value); }
  } }, {});
  const request = (path, method = 'GET', body, secret) => new Request('https://internal' + path, {
    method,
    headers: {
      ...(secret ? { 'x-pair-secret': secret } : {}),
      ...(body ? { 'content-type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const init = await pair.fetch(request('/init', 'POST', { player: 'player-secret', code: 'once-only-code' }));
  assert.equal(init.status, 200);

  const unauthorized = await pair.fetch(request('/state'));
  assert.equal(unauthorized.status, 403);
  const denied = await pair.fetch(request('/presentation', 'POST', cursor, 'player-secret'));
  assert.equal(denied.status, 403);

  const claimResponse = await pair.fetch(request('/claim', 'POST', { code: 'once-only-code' }));
  assert.equal(claimResponse.status, 200);
  const { secret: phoneSecret } = await claimResponse.json();
  assert.equal((await pair.fetch(request('/claim', 'POST', { code: 'once-only-code' }))).status, 410);

  const write = await pair.fetch(request('/presentation', 'POST', cursor, phoneSecret));
  assert.equal(write.status, 200);
  assert.deepEqual(await write.json(), { ok: true, replayed: false, revision: 1 });

  const playerState = await pair.fetch(request('/state', 'GET', null, 'player-secret'));
  assert.equal(playerState.status, 200);
  const state = await playerState.json();
  assert.equal(state.connected, true);
  assert.equal(state.photo, 0); // Existing four-photo demo has not changed.
  assert.equal(state.presentation.storyId, cursor.storyId);
  assert.equal(state.presentationVersion, 1);
  const replay = await pair.fetch(request('/presentation', 'POST', cursor, phoneSecret));
  assert.equal((await replay.json()).replayed, true);

  const disconnect = await pair.fetch(request('/disconnect', 'POST', {}, phoneSecret));
  assert.equal(disconnect.status, 200);
  assert.equal((await pair.fetch(request('/presentation', 'POST', { ...cursor, seq: 2 }, phoneSecret))).status, 403);
});
