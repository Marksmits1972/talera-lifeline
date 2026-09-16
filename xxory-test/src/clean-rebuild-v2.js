import { CLEAN_STORY_V2_HTML, CLEAN_STORY_PAGE_V2_REV } from './clean-story-page-v2.js';

export const CLEAN_REBUILD_V2_REV = 'clean-story-feedback-20260916-r2';

const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const PHOTO_KEY_PREFIX = 'clean-rebuild/photo/';
const AUDIO_KEY_PREFIX = 'clean-rebuild/audio/';
const TIMELINE_ORIGIN = 'https://talera-timeline-prototype.mark-a39.workers.dev/';

export async function handleCleanRebuildV2(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if ((path === '/clean' || path === '/clean/') && (request.method === 'GET' || request.method === 'HEAD')) {
    return new Response(request.method === 'HEAD' ? null : CLEAN_STORY_V2_HTML, {
      status: 200,
      headers: htmlHeaders()
    });
  }

  if (path === '/api/clean/revision' && request.method === 'GET') {
    return json({
      ok: true,
      revision: CLEAN_REBUILD_V2_REV,
      pageRevision: CLEAN_STORY_PAGE_V2_REV,
      phase: 'iphone-feedback-pass',
      isolated: true,
      legacyWorkbladDependencies: false,
      multiplePhotos: true,
      automaticPhotoViewerMs: 5500,
      automaticPhotoViewerOnlyWhileRecording: true,
      liveTranscriptPreview: true,
      draftPlayback: true,
      explicitPhotoDeleteSelection: true,
      explicitTimelinePublish: true,
      futureDateBlocked: true
    });
  }

  if (path === '/api/clean/photo' && request.method === 'POST') return uploadMedia(request, env, 'photo');
  if (path === '/api/clean/audio' && request.method === 'POST') return uploadMedia(request, env, 'audio');
  if (path === '/api/clean/date-policy' && request.method === 'POST') return validateDatePolicy(request);
  if (path === '/api/clean/publish' && request.method === 'POST') return publishStory(request, env);

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
  const result = validateDate(String(body?.date || ''), Number(body?.timezoneOffsetMinutes));
  if (!result.ok) return json({ error: result.error, maxDate: result.maxDate }, result.status);
  return json({ ok: true, date: result.date, maxDate: result.maxDate });
}

async function publishStory(request, env) {
  if (!env.DB || !env.MEDIA) return json({ error: 'Opslag is niet volledig beschikbaar.' }, 500);
  let body = {};
  try { body = await request.json(); } catch { return json({ error: 'De herinnering kon niet worden gelezen.' }, 400); }

  const title = cleanText(body?.title, 140);
  const eventDate = String(body?.eventDate || '').slice(0, 10);
  const text = cleanText(body?.text, 20000);
  const photoIds = cleanIds(body?.photoIds, 12);
  const audioIds = cleanIds(body?.audioIds, 24);
  const dateCheck = validateDate(eventDate, Number(body?.timezoneOffsetMinutes));

  if (!title) return json({ error: 'Geef deze herinnering eerst een titel.' }, 422);
  if (!dateCheck.ok) return json({ error: dateCheck.error, maxDate: dateCheck.maxDate }, dateCheck.status);
  if (!audioIds.length && !text) return json({ error: 'Vertel of schrijf eerst iets bij deze herinnering.' }, 422);

  const photos = [];
  for (const id of photoIds) {
    const asset = await verifiedAsset(env, 'photo', id);
    if (!asset) return json({ error: 'Een foto is niet meer volledig beschikbaar. Voeg deze foto opnieuw toe.' }, 409);
    photos.push(asset);
  }

  const audios = [];
  for (const id of audioIds) {
    const asset = await verifiedAsset(env, 'audio', id);
    if (!asset) return json({ error: 'Een stemopname is niet meer volledig beschikbaar. Neem dit stukje opnieuw op.' }, 409);
    audios.push(asset);
  }

  await ensurePublishSchema(env);
  const storyId = randomToken(16);
  const manageToken = randomToken(32);
  const manageTokenHash = await sha256Text(manageToken);
  const createdAt = new Date().toISOString();
  const primaryAudio = audios[0] || null;
  const startPhoto = photos[0] || null;

  try {
    await env.DB.prepare(`
      INSERT INTO stories (
        id, created_at, audio_object_key, audio_mime_type, audio_size_bytes,
        duration_seconds, display_name, manage_token_hash, parent_story_id,
        parent_share_id, status, deleted_at, title, event_time_text, place_text,
        people_text, event_time_precision, source_mode, start_photo_key, updated_at
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, NULL, NULL, 'active', NULL, ?, ?, '', '', 'exact', 'clean-story', ?, ?)
    `).bind(
      storyId,
      createdAt,
      primaryAudio?.key || '',
      primaryAudio?.mimeType || '',
      primaryAudio?.bytes || 0,
      manageTokenHash,
      title,
      eventDate,
      startPhoto?.key || null,
      createdAt
    ).run();

    if (text) {
      await env.DB.prepare(`INSERT INTO story_texts (story_id, text_content) VALUES (?, ?)`).bind(storyId, text).run();
    }

    for (let index = 0; index < photos.length; index += 1) {
      const item = photos[index];
      await env.DB.prepare(`
        INSERT INTO story_media (id, story_id, object_key, mime_type, size_bytes, media_type, role, created_at)
        VALUES (?, ?, ?, ?, ?, 'image', ?, ?)
      `).bind(randomToken(12), storyId, item.key, item.mimeType, item.bytes, index === 0 ? 'start' : 'extra', item.createdAt || createdAt).run();
    }

    for (let index = 1; index < audios.length; index += 1) {
      const item = audios[index];
      await env.DB.prepare(`
        INSERT INTO story_media (id, story_id, object_key, mime_type, size_bytes, media_type, role, created_at)
        VALUES (?, ?, ?, ?, ?, 'audio', ?, ?)
      `).bind(randomToken(12), storyId, item.key, item.mimeType, item.bytes, 'voice-segment-' + String(index + 1), item.createdAt || createdAt).run();
    }

    const check = await env.DB.prepare(`SELECT id FROM stories WHERE id = ? AND status = 'active' LIMIT 1`).bind(storyId).first();
    if (!check?.id) throw new Error('story-verification-failed');
  } catch (error) {
    try { await env.DB.prepare(`DELETE FROM story_media WHERE story_id = ?`).bind(storyId).run(); } catch {}
    try { await env.DB.prepare(`DELETE FROM story_texts WHERE story_id = ?`).bind(storyId).run(); } catch {}
    try { await env.DB.prepare(`DELETE FROM stories WHERE id = ?`).bind(storyId).run(); } catch {}
    console.error('clean publish failed', error);
    return json({ error: 'De herinnering kon nog niet veilig aan de tijdlijn worden gekoppeld.' }, 500);
  }

  const handoffUrl = TIMELINE_ORIGIN + '?handoff=1#story=' + encodeURIComponent(storyId) + '&token=' + encodeURIComponent(manageToken);
  return json({ ok: true, storyId, manageToken, createdAt, eventAt: eventDate + 'T12:00:00.000Z', photoCount: photos.length, audioSegmentCount: audios.length, handoffUrl }, 201);
}

async function verifiedAsset(env, kind, id) {
  const key = (kind === 'audio' ? AUDIO_KEY_PREFIX : PHOTO_KEY_PREFIX) + id;
  const head = await env.MEDIA.head(key);
  if (!head || Number(head.size || 0) <= 0) return null;
  const expectedKind = kind === 'audio' ? 'clean-story-audio' : 'clean-story-photo';
  if (String(head.customMetadata?.kind || '') !== expectedKind) return null;
  return {
    id,
    key,
    bytes: Number(head.size || 0),
    mimeType: String(head.httpMetadata?.contentType || (kind === 'audio' ? 'application/octet-stream' : 'image/jpeg')),
    createdAt: String(head.customMetadata?.createdAt || '')
  };
}

async function ensurePublishSchema(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    audio_object_key TEXT NOT NULL DEFAULT '',
    audio_mime_type TEXT NOT NULL DEFAULT '',
    audio_size_bytes INTEGER NOT NULL DEFAULT 0,
    duration_seconds REAL,
    display_name TEXT,
    manage_token_hash TEXT NOT NULL,
    parent_story_id TEXT,
    parent_share_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    deleted_at TEXT,
    title TEXT,
    event_time_text TEXT,
    place_text TEXT,
    people_text TEXT,
    event_time_precision TEXT,
    source_mode TEXT,
    start_photo_key TEXT,
    updated_at TEXT
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS story_texts (
    story_id TEXT PRIMARY KEY,
    text_content TEXT NOT NULL,
    FOREIGN KEY(story_id) REFERENCES stories(id)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS story_media (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    object_key TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    media_type TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'extra',
    created_at TEXT NOT NULL,
    FOREIGN KEY(story_id) REFERENCES stories(id)
  )`).run();
}

function validateDate(date, offsetValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'Kies eerst wanneer deze herinnering speelde.', status: 422, maxDate: currentLocalToday(offsetValue) };
  const parsed = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return { ok: false, error: 'Kies een geldige datum.', status: 400, maxDate: currentLocalToday(offsetValue) };
  const maxDate = currentLocalToday(offsetValue);
  if (date > maxDate) return { ok: false, error: 'Een herinnering kan niet in de toekomst staan.', status: 422, maxDate };
  return { ok: true, date, maxDate };
}

function currentLocalToday(offsetValue) {
  const safeOffset = Number.isFinite(offsetValue) && Math.abs(offsetValue) <= 14 * 60 ? offsetValue : 0;
  return new Date(Date.now() - safeOffset * 60 * 1000).toISOString().slice(0, 10);
}

function cleanIds(value, max) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of value) {
    const id = String(raw || '');
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

function cleanText(value, max) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
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
    'x-talera-clean-page': CLEAN_STORY_PAGE_V2_REV
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

async function sha256Text(text) {
  return digestHex(new TextEncoder().encode(String(text || '')).buffer);
}
