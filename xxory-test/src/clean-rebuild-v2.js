import { CLEAN_STORY_HTML, CLEAN_STORY_PAGE_REV } from './clean-story-page.js';

export const CLEAN_REBUILD_V2_REV = 'clean-story-foundation-20260916-r1';

const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const PHOTO_KEY_PREFIX = 'clean-rebuild/photo/';
const AUDIO_KEY_PREFIX = 'clean-rebuild/audio/';

export async function handleCleanRebuildV2(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if ((path === '/clean' || path === '/clean/') && (request.method === 'GET' || request.method === 'HEAD')) {
    return new Response(request.method === 'HEAD' ? null : CLEAN_STORY_HTML, {
      status: 200,
      headers: htmlHeaders()
    });
  }

  if (path === '/api/clean/revision' && request.method === 'GET') {
    return json({
      ok: true,
      revision: CLEAN_REBUILD_V2_REV,
      pageRevision: CLEAN_STORY_PAGE_REV,
      phase: 'photo-first-story-shell',
      isolated: true,
      legacyWorkbladDependencies: false,
      multiplePhotos: true,
      automaticPhotoViewerMs: 2500,
      directPhotoUpload: true,
      validatedRecorderPattern: 'audio-lab-v2',
      transcriptDrawer: true,
      futureDateBlocked: true
    });
  }

  if (path === '/api/clean/photo' && request.method === 'POST') return uploadMedia(request, env, 'photo');
  if (path === '/api/clean/audio' && request.method === 'POST') return uploadMedia(request, env, 'audio');
  if (path === '/api/clean/date-policy' && request.method === 'POST') return validateDatePolicy(request);

  const photoMatch = path.match(/^\/api\/clean\/photo\/([A-Za-z0-9_-]{20,80})$/);
  if (photoMatch && (request.method === 'GET' || request.method === 'HEAD')) return readMedia(request, env, 'photo', photoMatch[1]);
  if (photoMatch && request.method === 'DELETE') return deleteMedia(env, 'photo', photoMatch[1]);

  const audioMatch = path.match(/^\/api\/clean\/audio\/([A-Za-z0-9_-]{20,80})$/);
  if (audioMatch && (request.method === 'GET' || request.method === 'HEAD')) return readMedia(request, env, 'audio', audioMatch[1]);
  if (audioMatch && request.method === 'DELETE') return deleteMedia(env, 'audio', audioMatch[1]);

  if (path.startsWith('/api/clean/')) return json({ error: 'Niet gevonden.' }, 404);
  return null;
}

async function uploadMedia(request, env, kind) {
  if (!env.MEDIA) return json({ error: 'Media-opslag is niet beschikbaar.' }, 500);

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Het gekozen bestand kon niet worden gelezen.' }, 400);
  }

  const field = kind === 'audio' ? 'audio' : 'photo';
  const file = form.get(field);
  if (!(file instanceof File) || file.size <= 0) return json({ error: kind === 'audio' ? 'Geen geluidsopname ontvangen.' : 'Geen foto ontvangen.' }, 400);

  const type = String(file.type || '').toLowerCase();
  if (kind === 'photo' && !type.startsWith('image/')) return json({ error: 'Het gekozen bestand is geen afbeelding.' }, 415);
  const maxBytes = kind === 'audio' ? MAX_AUDIO_BYTES : MAX_PHOTO_BYTES;
  if (file.size > maxBytes) return json({ error: kind === 'audio' ? 'Deze geluidsopname is groter dan 12 MB.' : 'Deze foto is groter dan 25 MB.' }, 413);

  const bytes = await file.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength !== file.size) return json({ error: 'De mediabytes zijn niet volledig ontvangen.' }, 400);

  const id = randomToken(24);
  const keyPrefix = kind === 'audio' ? AUDIO_KEY_PREFIX : PHOTO_KEY_PREFIX;
  const key = keyPrefix + id;
  const mimeType = String(file.type || 'application/octet-stream');
  const sha256 = await digestHex(bytes);
  const createdAt = new Date().toISOString();

  await env.MEDIA.put(key, bytes, {
    httpMetadata: { contentType: mimeType, cacheControl: 'no-store' },
    customMetadata: {
      kind: kind === 'audio' ? 'clean-story-audio' : 'clean-story-photo',
      revision: CLEAN_REBUILD_V2_REV,
      createdAt,
      originalName: String(file.name || '').slice(0, 160),
      originalBytes: String(bytes.byteLength),
      sha256
    }
  });

  const head = await env.MEDIA.head(key);
  const storedBytes = Number(head?.size || 0);
  const storedSha256 = String(head?.customMetadata?.sha256 || '');
  if (!head || storedBytes !== bytes.byteLength || storedSha256 !== sha256) {
    try { await env.MEDIA.delete(key); } catch {}
    return json({ error: kind === 'audio' ? 'De stemopname kon niet exact worden bevestigd.' : 'De foto kon niet veilig worden bevestigd.' }, 500);
  }

  return json({
    ok: true,
    kind,
    id,
    playbackUrl: '/api/clean/' + kind + '/' + encodeURIComponent(id),
    mimeType: String(head?.httpMetadata?.contentType || mimeType),
    bytes: storedBytes,
    sha256,
    createdAt,
    revision: CLEAN_REBUILD_V2_REV
  }, 201);
}

async function readMedia(request, env, kind, id) {
  if (!env.MEDIA) return json({ error: 'Media-opslag is niet beschikbaar.' }, 500);
  const key = (kind === 'audio' ? AUDIO_KEY_PREFIX : PHOTO_KEY_PREFIX) + id;

  if (request.method === 'HEAD') {
    const head = await env.MEDIA.head(key);
    if (!head) return new Response(null, { status: 404 });
    return new Response(null, { status: 200, headers: mediaHeaders(head, kind) });
  }

  const object = await env.MEDIA.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, { status: 200, headers: mediaHeaders(object, kind) });
}

async function deleteMedia(env, kind, id) {
  if (!env.MEDIA) return json({ error: 'Media-opslag is niet beschikbaar.' }, 500);
  const key = (kind === 'audio' ? AUDIO_KEY_PREFIX : PHOTO_KEY_PREFIX) + id;
  await env.MEDIA.delete(key);
  return json({ ok: true, kind });
}

async function validateDatePolicy(request) {
  let body = {};
  try { body = await request.json(); } catch { return json({ error: 'Datum kon niet worden gelezen.' }, 400); }
  const date = String(body?.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'Kies een geldige datum.' }, 400);
  const parsed = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return json({ error: 'Kies een geldige datum.' }, 400);

  const offset = Number(body?.timezoneOffsetMinutes);
  const safeOffset = Number.isFinite(offset) && Math.abs(offset) <= 14 * 60 ? offset : 0;
  const localNow = new Date(Date.now() - safeOffset * 60 * 1000);
  const localToday = localNow.toISOString().slice(0, 10);
  if (date > localToday) return json({ error: 'Een herinnering kan niet in de toekomst staan.', maxDate: localToday }, 422);
  return json({ ok: true, date, maxDate: localToday });
}

function mediaHeaders(object, kind) {
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/octet-stream');
  headers.set('content-length', String(object.size || 0));
  headers.set('cache-control', 'no-store, max-age=0');
  headers.set('x-talera-clean-rebuild', CLEAN_REBUILD_V2_REV);
  headers.set('x-talera-clean-media-kind', kind);
  const sha = String(object.customMetadata?.sha256 || '');
  if (sha) headers.set('x-talera-sha256', sha);
  return headers;
}

function htmlHeaders() {
  return {
    'content-type': 'text/html; charset=UTF-8',
    'cache-control': 'no-store, max-age=0',
    'x-talera-clean-rebuild': CLEAN_REBUILD_V2_REV,
    'x-talera-clean-page': CLEAN_STORY_PAGE_REV
  };
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type':'application/json; charset=UTF-8',
      'cache-control':'no-store, max-age=0',
      'x-talera-clean-rebuild': CLEAN_REBUILD_V2_REV
    }
  });
}

function randomToken(bytes = 24) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let text = '';
  for (const value of data) text += String.fromCharCode(value);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function digestHex(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}
